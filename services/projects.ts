import { supabase } from '@/services/supabase';
import type { Database } from '@/types/db';

type TradeType = Database['public']['Enums']['trade_type'];
type UpdateType = Database['public']['Enums']['update_type'];

/**
 * Fetch the most recently-updated project the signed-in user participates in
 * (either as customer or tradesman). Returns null if there are no projects.
 * RLS already restricts the query to projects the user can see.
 */
export async function fetchMyCurrentProject() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('projects')
    .select(`
      id,
      title,
      status,
      expected_start_date,
      expected_end_date,
      actual_start_date,
      tradesman:profiles!projects_tradesman_id_fkey ( id, full_name ),
      updates:project_updates ( id, body, created_at, author_id, deleted_at )
    `)
    .is('archived_at', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** Fetch all non-archived projects the signed-in user owns or participates in. */
export async function fetchMyProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      id, title, status, trade_type, city, postcode,
      expected_start_date, expected_end_date, actual_start_date,
      created_at, pending_customer_name, customer_id
    `)
    .is('archived_at', null)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** Fetch one project + its tradesman + customer + ALL updates (no truncation). */
export async function fetchProject(projectId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      id, title, status, trade_type,
      address_line_1, address_line_2, city, postcode,
      expected_start_date, expected_end_date, actual_start_date, actual_end_date,
      pending_customer_name, pending_customer_phone,
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
      id, body, type, created_at, author_id,
      author:profiles!project_updates_author_id_fkey ( id, full_name )
    `)
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
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

  // Add self to project_crew as lead. (Doc 02 §2.3 notes this is auto-inserted on create.)
  const { error: crewError } = await supabase.from('project_crew').insert({
    project_id: project.id,
    user_id: user.id,
    role_on_project: 'lead',
  });
  if (crewError) throw crewError;

  return project;
}

/** Post a new update to the timeline. */
export async function postUpdate(args: {
  project_id: string;
  body: string;
  type?: UpdateType;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase
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
  return data;
}

// ---- formatting helpers (unchanged from earlier sprint) ----

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
