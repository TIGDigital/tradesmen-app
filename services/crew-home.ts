import { supabase } from '@/services/supabase';

/**
 * Queries behind the crew Today screen (persona plan, section B).
 * Everything here is scoped to the signed-in crew member — their open
 * tasks and their own posts — across every project they're on. RLS does
 * the real enforcement; the explicit filters keep the queries honest.
 */

export type MyOpenTask = {
  id: string;
  project_id: string;
  title: string;
  done_at: string | null;
  created_at: string;
  project: { id: string; title: string } | null;
};

/** Open tasks assigned to me, oldest first, with the project title. */
export async function fetchMyOpenTasks(): Promise<MyOpenTask[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('project_tasks')
    .select(`
      id, project_id, title, done_at, created_at,
      project:projects!project_tasks_project_id_fkey ( id, title )
    `)
    .eq('assigned_to', user.id)
    .is('done_at', null)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as unknown as MyOpenTask[]) ?? [];
}

export type MyRecentPost = {
  id: string;
  project_id: string;
  body: string | null;
  created_at: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
};

/** My last 10 posts across projects — drives "Waiting for approval". */
export async function fetchMyRecentPosts(): Promise<MyRecentPost[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('project_updates')
    .select('id, project_id, body, created_at, approval_status, rejection_reason')
    .eq('author_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data as unknown as MyRecentPost[]) ?? [];
}
