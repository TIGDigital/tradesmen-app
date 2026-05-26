import { supabase } from '@/services/supabase';

/**
 * The demo project's hard-coded ID — matches the seed migration.
 * Replace with the real-current-project lookup once auth lands.
 */
export const DEMO_PROJECT_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

/**
 * Fetch the project + its tradesman + its latest non-deleted update + author name.
 * One round-trip via Supabase's nested-select syntax.
 */
export async function fetchProjectDetail(projectId: string) {
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
    .eq('id', projectId)
    .single();

  if (error) throw error;
  return data;
}

/** Day N of M based on start/end dates. */
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

/** Rough "2 hours ago" / "yesterday" / "3 days ago" formatter. */
export function relativeTime(iso: string): string {
  const diffSec = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minutes ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
  const days = Math.floor(diffSec / 86400);
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

/** Map project_status enum to the customer-facing headline + subhead per spec D.1. */
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
