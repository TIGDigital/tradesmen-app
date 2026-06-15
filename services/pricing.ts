/**
 * Project pricing — change requests + audit log.
 *
 * Phase's "no surprise bills" promise lives here. Tradesman proposes
 * a change → customer must approve before it sticks → every step is
 * logged forever.
 *
 * Source of truth:
 *  - projects.quoted_amount        = the live agreed price
 *  - project_price_changes (rows)  = full history, each with status
 *
 * The DB trigger apply_approved_price_change keeps the two in sync —
 * the only way to move quoted_amount after the initial set is to get
 * a change row approved.
 *
 * Until the next types regeneration (`supabase gen types typescript
 * --linked`) the project_price_changes table is missing from
 * types/db.ts. Same `client = supabase as any` pattern we used for
 * project_reminders in services/reminders.ts.
 */

import { notifyCounterparty } from '@/services/projects';
import { supabase } from '@/services/supabase';

export type PriceChangeStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';

export type PriceChange = {
  id: string;
  project_id: string;
  proposed_by: string;
  proposed_by_name: string | null;
  previous_amount: number | null;
  proposed_amount: number;
  reason: string;
  status: PriceChangeStatus;
  responded_by: string | null;
  responded_at: string | null;
  response_note: string | null;
  created_at: string;
};

/** Format a numeric pence/pound value as GBP. Handles null. */
export function formatGbp(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Set the initial agreed quote. No customer approval needed — this
 * captures what was already agreed off-platform during quoting.
 * After this fires, all changes must go through the request flow.
 *
 * Returns the new quoted_amount; throws if the project already has one.
 */
export async function setInitialQuote(args: {
  project_id: string;
  amount: number;
}): Promise<number> {
  if (args.amount < 0) throw new Error('Amount must be 0 or more');

  // Fetch current to enforce "initial only" — a wrong-on-day-one fix
  // still goes via the change-request flow so the customer sees it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projectsClient = supabase as any;
  const { data: existing, error: fetchErr } = await projectsClient
    .from('projects')
    .select('quoted_amount')
    .eq('id', args.project_id)
    .single();
  if (fetchErr) throw fetchErr;
  if (existing?.quoted_amount != null) {
    throw new Error(
      'Initial quote is already set. Use the change-request flow to update it.',
    );
  }

  const { error } = await projectsClient
    .from('projects')
    .update({
      quoted_amount: args.amount,
      quoted_amount_set_at: new Date().toISOString(),
    })
    .eq('id', args.project_id);
  if (error) throw error;
  return args.amount;
}

/**
 * Lead proposes a change to the agreed price. Customer gets a push
 * and an in-app notification, and the change shows as Pending in the
 * audit log until they respond.
 */
export async function proposePriceChange(args: {
  project_id: string;
  new_amount: number;
  reason: string;
}): Promise<PriceChange> {
  const trimmed = args.reason.trim();
  if (!trimmed) throw new Error('Reason is required so the customer understands the change.');
  if (args.new_amount < 0) throw new Error('Amount must be 0 or more');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  // Capture the current live amount as the "previous_amount" so the
  // history row makes sense even if later changes happen.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projectsClient = supabase as any;
  const { data: project, error: pErr } = await projectsClient
    .from('projects')
    .select('quoted_amount, title')
    .eq('id', args.project_id)
    .single();
  if (pErr) throw pErr;

  // Reject if there's already a pending change — keep the queue simple.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;
  const { data: pending } = await client
    .from('project_price_changes')
    .select('id')
    .eq('project_id', args.project_id)
    .eq('status', 'pending')
    .maybeSingle();
  if (pending) {
    throw new Error(
      'There is already a pending price change. Withdraw it first if you want to send a different one.',
    );
  }

  const { data, error } = await client
    .from('project_price_changes')
    .insert({
      project_id: args.project_id,
      proposed_by: user.id,
      previous_amount: project?.quoted_amount ?? null,
      proposed_amount: args.new_amount,
      reason: trimmed,
      status: 'pending',
    })
    .select()
    .single();
  if (error) throw error;

  // Notify the customer — this is the "no surprises" moment.
  const delta =
    project?.quoted_amount != null
      ? args.new_amount - project.quoted_amount
      : null;
  const direction =
    delta == null ? '' : delta > 0 ? 'increase' : delta < 0 ? 'reduction' : 'change';

  void notifyCounterparty({
    project_id: args.project_id,
    sender_id: user.id,
    title: 'Price change requested',
    body: direction
      ? `Tap to review the ${direction} on ${project?.title ?? 'your project'}.`
      : `Tap to review the proposed change on ${project?.title ?? 'your project'}.`,
  });

  return data as PriceChange;
}

/**
 * Customer approves or rejects a pending change. Approving fires the
 * DB trigger that updates projects.quoted_amount. Either way, the row
 * stays in the audit log.
 */
export async function respondToPriceChange(args: {
  change_id: string;
  decision: 'approved' | 'rejected';
  note?: string;
}): Promise<PriceChange> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;
  const { data, error } = await client
    .from('project_price_changes')
    .update({
      status: args.decision,
      responded_by: user.id,
      responded_at: new Date().toISOString(),
      response_note: args.note?.trim() || null,
    })
    .eq('id', args.change_id)
    .eq('status', 'pending') // race protection
    .select()
    .single();
  if (error) throw error;

  // Notify the lead.
  const { data: project } = await supabase
    .from('projects')
    .select('title')
    .eq('id', (data as PriceChange).project_id)
    .single();

  void notifyCounterparty({
    project_id: (data as PriceChange).project_id,
    sender_id: user.id,
    title:
      args.decision === 'approved'
        ? 'Price change approved'
        : 'Price change rejected',
    body:
      args.decision === 'approved'
        ? `${project?.title ?? 'Your customer'} accepted the new price.`
        : `${project?.title ?? 'Your customer'} declined the proposed change.`,
  });

  return data as PriceChange;
}

/** Lead withdraws their own pending proposal (typo, changed mind). */
export async function withdrawPriceChange(change_id: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;
  const { error } = await client
    .from('project_price_changes')
    .update({ status: 'withdrawn' })
    .eq('id', change_id)
    .eq('status', 'pending');
  if (error) throw error;
}

/** Full history for the audit log view, newest first. */
export async function fetchPriceHistory(project_id: string): Promise<PriceChange[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;
  const { data, error } = await client
    .from('project_price_changes')
    .select(
      `
      id, project_id, proposed_by, previous_amount, proposed_amount,
      reason, status, responded_by, responded_at, response_note, created_at,
      profiles:proposed_by ( full_name )
    `,
    )
    .eq('project_id', project_id)
    .order('created_at', { ascending: false });
  if (error) throw error;

  // Flatten the join into a `proposed_by_name` field.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    ...row,
    proposed_by_name: row.profiles?.full_name ?? null,
  }));
}

/** The current pending change if any — for banners + the approve UI. */
export async function fetchPendingChange(
  project_id: string,
): Promise<PriceChange | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;
  const { data, error } = await client
    .from('project_price_changes')
    .select(
      `
      id, project_id, proposed_by, previous_amount, proposed_amount,
      reason, status, responded_by, responded_at, response_note, created_at,
      profiles:proposed_by ( full_name )
    `,
    )
    .eq('project_id', project_id)
    .eq('status', 'pending')
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    proposed_by_name: (data as any).profiles?.full_name ?? null,
  };
}
