/**
 * Onboarding-progress queries.
 *
 * The Sprint 46 checklist card on Jobs (tradesman) and Project (customer)
 * reads from these. Each query returns a flat shape of booleans the UI
 * can render directly, plus a `first_project_id` so list items can deep-
 * link to the relevant screen.
 *
 * We don't persist the checklist state itself — it's derived from
 * existing data so the user can't "fake" completion, and a fresh device
 * sees the truthful state immediately on sign-in. The only persisted bit
 * is the dismiss flag on stores/auth.ts.
 */

import { supabase } from '@/services/supabase';

/** Tradesman checklist — progressing through their first project workflow. */
export type TradesmanOnboarding = {
  /** Earliest project the tradesman owns. Powers deep-links from later
   *  list items (post update, end of day) so they land on the right
   *  project even when they have several. */
  first_project_id: string | null;
  has_project: boolean;
  has_sent_invite: boolean;
  has_posted_update: boolean;
  has_ended_day: boolean;
};

/** Customer checklist — engaging with their project for the first time. */
export type CustomerOnboarding = {
  first_project_id: string | null;
  has_joined: boolean;
  has_reacted: boolean;
  has_messaged: boolean;
};

export async function fetchTradesmanOnboarding(): Promise<TradesmanOnboarding> {
  const empty: TradesmanOnboarding = {
    first_project_id: null,
    has_project: false,
    has_sent_invite: false,
    has_posted_update: false,
    has_ended_day: false,
  };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;

  // Four small queries in parallel — count-only where we can to keep the
  // payload tiny. The first query also returns the project id we need for
  // deep-links so we don't pay for a second roundtrip.
  const [firstProject, sentInvite, postedUpdate, etaUpdate] = await Promise.all([
    supabase
      .from('projects')
      .select('id')
      .eq('tradesman_id', user.id)
      .is('archived_at', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('projects')
      .select('id', { head: true, count: 'exact' })
      .eq('tradesman_id', user.id)
      .not('invite_sent_at', 'is', null),
    supabase
      .from('project_updates')
      .select('id', { head: true, count: 'exact' })
      .eq('author_id', user.id)
      .is('deleted_at', null)
      // System-emitted rows (milestone ticks, status flips) shouldn't count
      // as "their first update" — those happen as side effects, not deliberate
      // posts.
      .eq('type', 'progress'),
    supabase
      .from('project_updates')
      .select('id', { head: true, count: 'exact' })
      .eq('author_id', user.id)
      .is('deleted_at', null)
      .eq('type', 'eta'),
  ]);

  return {
    first_project_id: firstProject.data?.id ?? null,
    has_project: !!firstProject.data,
    has_sent_invite: (sentInvite.count ?? 0) > 0,
    has_posted_update: (postedUpdate.count ?? 0) > 0,
    has_ended_day: (etaUpdate.count ?? 0) > 0,
  };
}

export async function fetchCustomerOnboarding(): Promise<CustomerOnboarding> {
  const empty: CustomerOnboarding = {
    first_project_id: null,
    has_joined: false,
    has_reacted: false,
    has_messaged: false,
  };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;

  const [firstProject, reacted, messaged] = await Promise.all([
    supabase
      .from('projects')
      .select('id')
      .eq('customer_id', user.id)
      .is('archived_at', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('project_update_reactions')
      .select('user_id', { head: true, count: 'exact' })
      .eq('user_id', user.id),
    supabase
      .from('messages')
      .select('id', { head: true, count: 'exact' })
      .eq('sender_id', user.id),
  ]);

  return {
    first_project_id: firstProject.data?.id ?? null,
    has_joined: !!firstProject.data,
    has_reacted: (reacted.count ?? 0) > 0,
    has_messaged: (messaged.count ?? 0) > 0,
  };
}
