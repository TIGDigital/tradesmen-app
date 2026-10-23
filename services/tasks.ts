import { supabase } from '@/services/supabase';

/**
 * The lead's job list for the crew (23 Oct). Internal to the trade side:
 * customers never see it (RLS: lead + active crew only). The lead manages
 * the list; the assignee can tick their own tasks off.
 */

export type ProjectTask = {
  id: string;
  project_id: string;
  assigned_to: string | null;
  title: string;
  done_at: string | null;
  sort_order: number;
  created_at: string;
  assignee: { id: string; full_name: string | null } | null;
};

const TASK_SELECT = `
  id, project_id, assigned_to, title, done_at, sort_order, created_at,
  assignee:profiles!project_tasks_assigned_to_fkey ( id, full_name )
`;

/** Open tasks first (by sort/created), done ones after. */
export async function fetchProjectTasks(project_id: string): Promise<ProjectTask[]> {
  const { data, error } = await supabase
    .from('project_tasks')
    .select(TASK_SELECT)
    .eq('project_id', project_id)
    .order('done_at', { ascending: true, nullsFirst: true })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as unknown as ProjectTask[]) ?? [];
}

export async function createTask(args: {
  project_id: string;
  title: string;
  assigned_to?: string | null;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const title = args.title.trim();
  if (!title) throw new Error('Give the task a name');
  const { error } = await supabase.from('project_tasks').insert({
    project_id: args.project_id,
    title,
    assigned_to: args.assigned_to ?? null,
    created_by: user.id,
  });
  if (error) throw error;
}

/** Tick or untick. RLS: the lead or the task's assignee. */
export async function setTaskDone(task_id: string, done: boolean): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase
    .from('project_tasks')
    .update(
      done
        ? { done_at: new Date().toISOString(), done_by: user.id }
        : { done_at: null, done_by: null },
    )
    .eq('id', task_id);
  if (error) throw error;
}

export async function deleteTask(task_id: string): Promise<void> {
  const { error } = await supabase.from('project_tasks').delete().eq('id', task_id);
  if (error) throw error;
}
