import { supabase } from '@/services/supabase';

export type CrewRoleOnProject = 'lead' | 'apprentice' | 'helper';

export type CrewMember = {
  project_id: string;
  user_id: string;
  role_on_project: CrewRoleOnProject;
  assigned_at: string | null;
  user: { id: string; full_name: string | null; avatar_url: string | null; role: string | null } | null;
  project: { id: string; title: string } | null;
};

/** Crew list for one project, excluding soft-removed rows. */
export async function listProjectCrew(project_id: string): Promise<CrewMember[]> {
  const { data, error } = await supabase
    .from('project_crew')
    .select(`
      project_id, user_id, role_on_project, assigned_at,
      user:profiles!project_crew_user_id_fkey ( id, full_name, avatar_url, role ),
      project:projects!project_crew_project_id_fkey ( id, title )
    `)
    .eq('project_id', project_id)
    .is('removed_at', null)
    .order('role_on_project', { ascending: true });
  if (error) throw error;
  return (data as unknown as CrewMember[]) ?? [];
}

/**
 * Every active crew row across every project the signed-in user leads.
 * Used by the tradesman Crew tab. Excludes the user themselves (lead row)
 * since they don't need to see "you" listed in their own crew.
 */
export async function listMyCrew(): Promise<CrewMember[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Step 1: which projects am I the tradesman on?
  const { data: myProjects, error: projErr } = await supabase
    .from('projects')
    .select('id')
    .eq('tradesman_id', user.id)
    .is('archived_at', null);
  if (projErr) throw projErr;
  const ids = (myProjects ?? []).map((p) => p.id);
  if (ids.length === 0) return [];

  // Step 2: pull all active crew rows for those projects (excluding me).
  const { data, error } = await supabase
    .from('project_crew')
    .select(`
      project_id, user_id, role_on_project, assigned_at,
      user:profiles!project_crew_user_id_fkey ( id, full_name, avatar_url, role ),
      project:projects!project_crew_project_id_fkey ( id, title )
    `)
    .in('project_id', ids)
    .is('removed_at', null)
    .neq('user_id', user.id)
    .order('assigned_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as CrewMember[]) ?? [];
}

/**
 * Soft-remove a crew member from a project. RLS already scopes write
 * access to the lead tradesman (crew_write_lead policy).
 */
export async function removeCrewMember(args: { project_id: string; user_id: string }) {
  const { error } = await supabase
    .from('project_crew')
    .update({ removed_at: new Date().toISOString() })
    .eq('project_id', args.project_id)
    .eq('user_id', args.user_id);
  if (error) throw error;
}
