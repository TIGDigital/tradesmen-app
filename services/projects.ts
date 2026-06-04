import { type PickedPhoto, uploadPhoto, uploadVoice } from '@/services/media';
import { recordNotification, sendPush } from '@/services/notifications';
import { supabase } from '@/services/supabase';
import type { Database } from '@/types/db';
import { devLog } from '@/utils/log';

type TradeType = Database['public']['Enums']['trade_type'];
type UpdateType = Database['public']['Enums']['update_type'];
type ProjectStatus = Database['public']['Enums']['project_status'];
type MilestoneStatus = Database['public']['Enums']['milestone_status'];
type DelayReason = Database['public']['Enums']['delay_reason'];

/**
 * Fetch the most recently-updated project the signed-in user participates in.
 * Explicit `or` filter on tradesman_id/customer_id — don't rely on RLS alone,
 * because the invite-preview policy (Sprint 9) makes pending-invite projects
 * readable to any signed-in user, which would leak unrelated projects here.
 */
export async function fetchMyCurrentProject(id?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let q = supabase
    .from('projects')
    .select(`
      id,
      title,
      status,
      expected_start_date,
      expected_end_date,
      actual_start_date,
      tradesman:profiles!projects_tradesman_id_fkey ( id, full_name ),
      updates:project_updates (
        id, body, created_at, author_id, deleted_at, type, eta_at,
        media:project_update_media ( id, storage_path, sort_order, media_type ),
        reactions:project_update_reactions ( kind, user_id ),
        comments:project_update_comments ( id )
      ),
      milestones:project_milestones ( id, title, status, sort_order, expected_date, completed_at )
    `)
    .or(`tradesman_id.eq.${user.id},customer_id.eq.${user.id}`)
    .is('archived_at', null);

  // If a specific project is requested, target it. Otherwise default to
  // the most-recently-updated one (the existing "current project" semantic).
  const { data, error } = id
    ? await q.eq('id', id).maybeSingle()
    : await q.order('updated_at', { ascending: false }).limit(1).maybeSingle();

  if (error) throw error;
  return data;
}

/** Fetch all non-archived projects the signed-in user owns or participates in. */
export async function fetchMyProjects() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('projects')
    .select(`
      id, title, status, trade_type, city, postcode,
      expected_start_date, expected_end_date, actual_start_date,
      created_at, last_update_at, pending_customer_name, customer_id
    `)
    .or(`tradesman_id.eq.${user.id},customer_id.eq.${user.id}`)
    .is('archived_at', null)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** Fetch one project + its tradesman + customer (milestones fetched separately). */
export async function fetchProject(projectId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      id, title, status, trade_type,
      address_line_1, address_line_2, city, postcode,
      expected_start_date, expected_end_date, actual_start_date, actual_end_date,
      pending_customer_name, pending_customer_phone,
      customer_id, invite_code, invite_sent_at, invite_accepted_at,
      tradesman:profiles!projects_tradesman_id_fkey ( id, full_name, avatar_url ),
      customer:profiles!projects_customer_id_fkey ( id, full_name, avatar_url )
    `)
    .eq('id', projectId)
    .single();
  if (error) throw error;
  return data;
}

/** Fetch the timeline feed for a project, newest first. */
export async function fetchProjectUpdates(projectId: string) {
  const { data, error } = await supabase
    .from('project_updates')
    .select(`
      id, body, type, created_at, author_id, eta_at,
      author:profiles!project_updates_author_id_fkey ( id, full_name ),
      media:project_update_media ( id, storage_path, sort_order, media_type ),
      reactions:project_update_reactions ( kind, user_id ),
      comments:project_update_comments ( id )
    `)
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Format an eta_at ISO string as "tomorrow at 8:00 AM" / "today at 8:00 AM". */
export function formatEta(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isTomorrow =
    d.getDate() === now.getDate() + 1 &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const time = d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
  if (isTomorrow) return `Back tomorrow at ${time}`;
  if (isToday) return `Back today at ${time}`;
  const day = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  return `Back ${day} at ${time}`;
}

/** Fetch milestones for a project, ordered by sort_order. */
export async function fetchMilestones(projectId: string) {
  const { data, error } = await supabase
    .from('project_milestones')
    .select('id, title, description, status, sort_order, expected_date, completed_at')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Insert a new project (signed-in user becomes the lead tradesman). */
export async function createProject(args: {
  title: string;
  trade_type: TradeType;
  address_line_1: string;
  city: string;
  postcode: string;
  pending_customer_name: string;
  pending_customer_phone: string;
  expected_start_date?: string;
  expected_end_date?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      tradesman_id: user.id,
      title: args.title,
      trade_type: args.trade_type,
      address_line_1: args.address_line_1,
      city: args.city,
      postcode: args.postcode,
      pending_customer_name: args.pending_customer_name,
      pending_customer_phone: args.pending_customer_phone,
      expected_start_date: args.expected_start_date,
      expected_end_date: args.expected_end_date,
      status: 'scheduled',
    })
    .select()
    .single();
  if (error) throw error;

  const { error: crewError } = await supabase.from('project_crew').insert({
    project_id: project.id,
    user_id: user.id,
    role_on_project: 'lead',
  });
  if (crewError) throw crewError;

  // Auto-apply the default milestone template for this trade (silent — empty is fine).
  await applyDefaultTemplate(project.id, args.trade_type).catch((e) => {
    console.warn('[createProject] applyDefaultTemplate failed', e);
  });

  return project;
}

/**
 * Look up the default milestone template for a trade and insert its milestones
 * on the project. Idempotent in spirit: if there are already milestones, we skip.
 */
export async function applyDefaultTemplate(project_id: string, trade_type: TradeType) {
  // If project already has milestones, don't double-apply.
  const { data: existing } = await supabase
    .from('project_milestones')
    .select('id')
    .eq('project_id', project_id)
    .limit(1);
  if (existing && existing.length > 0) return;

  const { data: template } = await supabase
    .from('milestone_templates')
    .select('milestones')
    .eq('trade_type', trade_type)
    .eq('is_default', true)
    .maybeSingle();
  if (!template) return;

  const items = (template.milestones ?? []) as Array<{
    title: string;
    requires_approval?: boolean;
  }>;
  if (items.length === 0) return;

  const rows = items.map((item, i) => ({
    project_id,
    title: item.title,
    sort_order: i,
    status: 'pending' as MilestoneStatus,
    requires_customer_approval: item.requires_approval ?? false,
  }));

  const { error } = await supabase.from('project_milestones').insert(rows);
  if (error) throw error;
}

/**
 * Post a new update + (optionally) attach photos.
 * Flow: insert update -> upload each photo -> insert project_update_media rows.
 * A partial failure (some photos uploaded, some not) leaves the update with the
 * photos that succeeded; not transactional but acceptable for MVP.
 */
export async function postUpdate(args: {
  project_id: string;
  body: string;
  type?: UpdateType;
  photos?: PickedPhoto[];
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data: update, error } = await supabase
    .from('project_updates')
    .insert({
      project_id: args.project_id,
      author_id: user.id,
      body: args.body,
      type: args.type ?? 'progress',
    })
    .select()
    .single();
  if (error) throw error;

  if (args.photos && args.photos.length > 0) {
    await attachPhotos({ update_id: update.id, user_id: user.id, photos: args.photos });
  }

  // Fire-and-forget push to the counterparty. System updates (milestone/status)
  // don't push — too noisy when a tradesman is ticking off milestones quickly.
  if ((args.type ?? 'progress') === 'progress') {
    const preview = args.body.length > 100 ? args.body.slice(0, 97) + '…' : args.body;
    void notifyCounterparty({
      project_id: args.project_id,
      sender_id: user.id,
      title: 'New update',
      body: preview,
    });
  }

  return update;
}

/**
 * Post an End-of-Day update (type='eta', with eta_at + optional photos).
 * If notify_customer is true, fires a push to the customer.
 */
export async function postEndOfDay(args: {
  project_id: string;
  body: string;
  eta_at: string | null;
  notify_customer: boolean;
  photos?: PickedPhoto[];
  voice?: { uri: string; durationMs: number } | null;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data: update, error } = await supabase
    .from('project_updates')
    .insert({
      project_id: args.project_id,
      author_id: user.id,
      body: args.body,
      type: 'eta',
      eta_at: args.eta_at,
    })
    .select()
    .single();
  if (error) throw error;

  if (args.photos && args.photos.length > 0) {
    await attachPhotos({ update_id: update.id, user_id: user.id, photos: args.photos });
  }

  if (args.voice) {
    const path = await uploadVoice({
      uri: args.voice.uri,
      user_id: user.id,
      update_id: update.id,
    });
    const { error: voiceError } = await supabase.from('project_update_media').insert({
      update_id: update.id,
      storage_path: path,
      media_type: 'voice',
      sort_order: 99, // after photos
    });
    if (voiceError) throw voiceError;
    // Also stamp the update with the voice URL for direct access without joining media
    await supabase.from('project_updates').update({ voice_note_url: path }).eq('id', update.id);
  }

  if (args.notify_customer) {
    const preview = args.body.length > 100 ? args.body.slice(0, 97) + '…' : args.body;
    void notifyCounterparty({
      project_id: args.project_id,
      sender_id: user.id,
      title: 'Update from your tradesman',
      body: preview,
    });
  }

  return update;
}

/**
 * Internal: send a push to the OTHER party on the project (sender does not push to self).
 * Reads the recipient's push_tokens via RLS (counterparty policy added in Sprint 7).
 * Fully non-blocking — any failure is logged inside sendPush; caller does not await.
 */
async function notifyCounterparty(args: {
  project_id: string;
  sender_id: string;
  title: string;
  body: string;
}) {
  devLog('[notify] start', { project_id: args.project_id, sender: args.sender_id });
  try {
    const { data: project } = await supabase
      .from('projects')
      .select('tradesman_id, customer_id')
      .eq('id', args.project_id)
      .single();
    if (!project) {
      devLog('[notify] project not found');
      return;
    }
    devLog('[notify] project', project);

    const recipient_id =
      project.tradesman_id === args.sender_id ? project.customer_id : project.tradesman_id;

    const target_user_id = recipient_id && recipient_id !== args.sender_id ? recipient_id : args.sender_id;
    const isSelfTest = target_user_id === args.sender_id;
    devLog('[notify] target_user_id', target_user_id, 'isSelfTest', isSelfTest);

    // Persist an inbox row regardless of whether the push goes out — Expo
    // Go on simulator can't deliver pushes but we still want the recipient
    // to see this in their /notifications tab.
    await recordNotification({
      user_id: target_user_id,
      kind: 'new_update',
      project_id: args.project_id,
      title: args.title,
      body: args.body,
      data: { project_id: args.project_id },
    });

    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', target_user_id);
    devLog('[notify] tokens found:', tokens?.length ?? 0);
    if (!tokens || tokens.length === 0) return;

    await sendPush({
      tokens: tokens.map((t) => t.token),
      title: isSelfTest ? `[Self-test] ${args.title}` : args.title,
      body: args.body,
      data: { project_id: args.project_id },
    });
    devLog('[notify] sendPush returned');
  } catch (e) {
    console.warn('[notifyCounterparty] failed', e);
  }
}

/** Internal: upload each picked photo, then insert one project_update_media row each. */
async function attachPhotos(args: {
  update_id: string;
  user_id: string;
  photos: PickedPhoto[];
}) {
  for (let i = 0; i < args.photos.length; i++) {
    const photo = args.photos[i];
    const storage_path = await uploadPhoto({
      photo,
      user_id: args.user_id,
      update_id: args.update_id,
      index: i,
    });
    const { error } = await supabase.from('project_update_media').insert({
      update_id: args.update_id,
      storage_path,
      media_type: 'photo',
      sort_order: i,
    });
    if (error) throw error;
  }
}

/**
 * Build a sensible default body for the End-of-Day card based on milestones.
 * Tradesman edits inline — this is just the starting point.
 */
export function suggestEodBody(
  milestones: Array<{ title: string; status: MilestoneStatus; sort_order: number }>
): string {
  const { current, next } = currentAndNextMilestone(milestones);
  const lines: string[] = ['Wrapped up for today.'];
  if (current) lines.push(`Today: ${current}.`);
  if (next) lines.push(`Tomorrow: ${next}.`);
  return lines.join(' ');
}

/**
 * Parse a loose time string ("8:00 AM", "08:00", "8am") into tomorrow at that hour.
 * Returns ISO string or null on bad input.
 */
export function parseEtaTomorrow(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  // Match patterns like "8", "8:30", "8am", "8:30 am", "08:00"
  const m = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;

  let hours = parseInt(m[1], 10);
  const minutes = m[2] ? parseInt(m[2], 10) : 0;
  const ampm = m[3];

  if (ampm === 'pm' && hours < 12) hours += 12;
  if (ampm === 'am' && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return null;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(hours, minutes, 0, 0);
  return tomorrow.toISOString();
}

// ============================================================
// Milestones
// ============================================================

/** Append a new milestone at the end of the list (sort_order = max + 1). */
export async function createMilestone(args: {
  project_id: string;
  title: string;
  expected_date?: string;
}) {
  // Find the current max sort_order to append.
  const { data: existing } = await supabase
    .from('project_milestones')
    .select('sort_order')
    .eq('project_id', args.project_id)
    .order('sort_order', { ascending: false })
    .limit(1);
  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from('project_milestones')
    .insert({
      project_id: args.project_id,
      title: args.title,
      sort_order: nextOrder,
      expected_date: args.expected_date,
      status: 'pending',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Set a milestone's status explicitly (forward OR back — supports undo).
 * Posts a system update when entering in_progress or completed (not on revert).
 */
export async function setMilestoneStatus(args: {
  milestone_id: string;
  project_id: string;
  current_status: MilestoneStatus;
  new_status: MilestoneStatus;
  title: string;
}) {
  if (args.new_status === args.current_status) return null;

  const isRevert =
    (args.current_status === 'completed' && args.new_status !== 'completed') ||
    (args.current_status === 'in_progress' && args.new_status === 'pending');

  const update: { status: MilestoneStatus; completed_at?: string | null } = {
    status: args.new_status,
  };
  if (args.new_status === 'completed') update.completed_at = new Date().toISOString();
  if (args.current_status === 'completed' && args.new_status !== 'completed') {
    update.completed_at = null;
  }

  const { data, error } = await supabase
    .from('project_milestones')
    .update(update)
    .eq('id', args.milestone_id)
    .select()
    .single();
  if (error) throw error;

  // Auto-post a system milestone update on forward motion only (not on revert).
  if (!isRevert) {
    if (args.new_status === 'completed') {
      await postUpdate({
        project_id: args.project_id,
        body: `Milestone complete — ${args.title}`,
        type: 'milestone',
      });
    } else if (args.new_status === 'in_progress') {
      await postUpdate({
        project_id: args.project_id,
        body: `Started on ${args.title}`,
        type: 'milestone',
      });
    }
  }

  return data;
}

/** Delete a milestone. (No reorder of remaining sort_orders — gaps are fine.) */
export async function deleteMilestone(milestone_id: string) {
  const { error } = await supabase
    .from('project_milestones')
    .delete()
    .eq('id', milestone_id);
  if (error) throw error;
}

/** Pure helper — given an ordered milestones list, return current (in_progress) + next (pending). */
export function currentAndNextMilestone(
  milestones: Array<{ title: string; status: MilestoneStatus; sort_order: number }>
): { current: string | null; next: string | null } {
  const sorted = [...milestones].sort((a, b) => a.sort_order - b.sort_order);
  const current = sorted.find((m) => m.status === 'in_progress')?.title ?? null;
  const next = sorted.find((m) => m.status === 'pending')?.title ?? null;
  return { current, next };
}

// ============================================================
// Project status
// ============================================================

/** Change project status. If delayed, requires a reason. Auto-posts a system update. */
export async function updateProjectStatus(args: {
  project_id: string;
  new_status: ProjectStatus;
  delay_reason?: DelayReason;
  current_status: ProjectStatus;
}) {
  if (args.new_status === args.current_status) return null;

  const update: {
    status: ProjectStatus;
    delay_reason?: DelayReason | null;
    actual_start_date?: string | null;
    actual_end_date?: string | null;
  } = { status: args.new_status };

  // Clear delay reason if moving away from delayed
  if (args.current_status === 'delayed' && args.new_status !== 'delayed') {
    update.delay_reason = null;
  }
  if (args.new_status === 'delayed') {
    if (!args.delay_reason) throw new Error('A delay reason is required.');
    update.delay_reason = args.delay_reason;
  }

  // Convenience: mark actual_start_date when moving into in_progress for the first time
  if (args.new_status === 'in_progress') {
    update.actual_start_date = new Date().toISOString().slice(0, 10);
  }
  if (args.new_status === 'completed') {
    update.actual_end_date = new Date().toISOString().slice(0, 10);
  }

  const { data, error } = await supabase
    .from('projects')
    .update(update)
    .eq('id', args.project_id)
    .select()
    .single();
  if (error) throw error;

  // Auto-post a system status update.
  const statusBody = STATUS_LABELS[args.new_status] ?? args.new_status;
  await postUpdate({
    project_id: args.project_id,
    body: args.new_status === 'delayed'
      ? `Status: ${statusBody} — ${DELAY_REASON_LABELS[args.delay_reason!]}`
      : `Status: ${statusBody}`,
    type: 'status',
  });

  return data;
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  quote_sent: 'Quote sent',
  scheduled: 'Scheduled',
  materials_ordered: 'Materials ordered',
  in_progress: 'In progress',
  delayed: 'Delayed',
  awaiting_approval: 'Awaiting approval',
  awaiting_inspection: 'Awaiting inspection',
  completed: 'Completed',
};

export const DELAY_REASON_LABELS: Record<DelayReason, string> = {
  weather: 'Weather',
  materials: 'Waiting on materials',
  other_trade: 'Waiting on another trade',
  customer_change: 'Customer changed something',
  illness: 'Illness',
  inspection: 'Waiting on inspection',
  other: 'Other',
};

// ============================================================
// Formatting helpers
// ============================================================

export function dayOfProject(start?: string | null, end?: string | null): { day: number; total: number } | null {
  if (!start || !end) return null;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const now = Date.now();
  const dayMs = 86400000;
  const total = Math.max(1, Math.round((e - s) / dayMs) + 1);
  const day = Math.min(total, Math.max(1, Math.floor((now - s) / dayMs) + 1));
  return { day, total };
}

export function relativeTime(iso: string): string {
  const diffSec = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minutes ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
  const days = Math.floor(diffSec / 86400);
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

export function statusHeadline(
  status: string,
  ctx: { endDate?: string | null; day?: number; total?: number }
): { headline: string; subhead: string } {
  switch (status) {
    case 'in_progress':
      return {
        headline: ctx.endDate ? `On track for ${formatDay(ctx.endDate)}` : 'On track',
        subhead: ctx.day && ctx.total ? `Day ${ctx.day} of ${ctx.total}` : '',
      };
    case 'scheduled':
      return { headline: 'Booked', subhead: ctx.endDate ? `Starts ${formatDay(ctx.endDate)}` : '' };
    case 'materials_ordered':
      return { headline: 'Materials on order', subhead: 'Expected back on site soon' };
    case 'delayed':
      return { headline: 'Slight delay, still on track', subhead: '' };
    case 'awaiting_approval':
      return { headline: 'Needs your approval', subhead: 'Tap to review' };
    case 'awaiting_inspection':
      return { headline: 'Awaiting inspection', subhead: '' };
    case 'completed':
      return { headline: 'All done', subhead: 'Tap to leave a review' };
    case 'quote_sent':
    default:
      return { headline: 'Quote ready for you', subhead: 'Tap to review' };
  }
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'long' });
}
