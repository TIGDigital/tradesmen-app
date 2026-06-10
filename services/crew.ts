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

/** A distinct user the signed-in tradesman has worked with as crew on
 *  past projects. Drives the auto-enroll picker on create-project. */
export type PastCrewMember = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  /** The role they had on their MOST RECENT project. Carried forward to
   *  the new project so the lead doesn't have to re-pick it. */
  role_on_project: 'apprentice' | 'helper';
  last_assigned_at: string | null;
};

/**
 * Distinct list of crew members the signed-in lead has worked with
 * across all their projects. Excludes the lead themselves + soft-removed
 * rows. Deduped by user_id, keeping the most-recent role assignment.
 *
 * Used by the create-project "Bring your crew?" section to offer
 * one-tap re-enrollment for repeat work.
 */
export async function listMyPastCrew(): Promise<PastCrewMember[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Step 1: my projects (as the lead tradesman).
  const { data: myProjects, error: projErr } = await supabase
    .from('projects')
    .select('id')
    .eq('tradesman_id', user.id);
  if (projErr) throw projErr;
  const ids = (myProjects ?? []).map((p) => p.id);
  if (ids.length === 0) return [];

  // Step 2: all active non-lead crew rows across those projects, newest
  // assignment first so dedup keeps the latest role.
  const { data, error } = await supabase
    .from('project_crew')
    .select(`
      user_id, role_on_project, assigned_at,
      user:profiles!project_crew_user_id_fkey ( id, full_name, avatar_url )
    `)
    .in('project_id', ids)
    .neq('role_on_project', 'lead')
    .is('removed_at', null)
    .order('assigned_at', { ascending: false });
  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[];
  const seen = new Set<string>();
  const out: PastCrewMember[] = [];
  for (const r of rows) {
    if (seen.has(r.user_id)) continue;
    seen.add(r.user_id);
    out.push({
      user_id: r.user_id,
      full_name: r.user?.full_name ?? null,
      avatar_url: r.user?.avatar_url ?? null,
      role_on_project: r.role_on_project,
      last_assigned_at: r.assigned_at,
    });
  }
  return out;
}

/**
 * Bulk enroll a set of past crew members onto a project. Upsert on
 * (project_id, user_id) so it's safe to call when some members are
 * already on the project (no-op for those rows; soft-removed rows get
 * reactivated by clearing removed_at).
 *
 * Caller is responsible for being the lead of the target project —
 * RLS (crew_write_lead) enforces this server-side too.
 */
export async function enrollCrew(args: {
  project_id: string;
  members: { user_id: string; role_on_project: 'apprentice' | 'helper' }[];
}) {
  if (args.members.length === 0) return;
  const rows = args.members.map((m) => ({
    project_id: args.project_id,
    user_id: m.user_id,
    role_on_project: m.role_on_project,
    removed_at: null,
  }));
  const { error } = await supabase
    .from('project_crew')
    .upsert(rows, { onConflict: 'project_id,user_id' });
  if (error) throw error;
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

// ============================================================
// Sprint 37: invite + accept
// ============================================================

export type CrewInvite = {
  id: string;
  project_id: string;
  inviter_id: string;
  invitee_name: string;
  invite_code: string;
  role_on_project: 'apprentice' | 'helper';
  created_at: string;
  accepted_at: string | null;
  expires_at: string;
  /** Denormalised at insert time so signed-out recipients can render
   *  the preview without crossing RLS into projects / profiles. */
  project_title: string | null;
  inviter_name: string | null;
  /** Optional joined data — present on createCrewInvite (the inviter is
   *  signed in and has RLS access) but absent on fetchCrewInviteByCode
   *  (the recipient may not). Use project_title / inviter_name first. */
  project: { id: string; title: string } | null;
  inviter: { id: string; full_name: string | null } | null;
};

/** Generate a short, human-friendly invite code. Avoids easily-mistyped chars. */
function generateCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

/**
 * Create an outstanding crew invite for one apprentice / helper.
 * Returns the inserted row so the UI can display + share the code.
 */
export async function createCrewInvite(args: {
  project_id: string;
  invitee_name: string;
  role_on_project?: 'apprentice' | 'helper';
}): Promise<CrewInvite> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const trimmed = args.invitee_name.trim();
  if (!trimmed) throw new Error("Invitee's name is required");

  // Retry up to 3 times on the rare code collision.
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateCode();
    const { data, error } = await supabase
      .from('crew_invitations')
      .insert({
        project_id: args.project_id,
        inviter_id: user.id,
        invitee_name: trimmed,
        invite_code: code,
        role_on_project: args.role_on_project ?? 'apprentice',
      })
      .select(`
        id, project_id, inviter_id, invitee_name, invite_code,
        role_on_project, created_at, accepted_at, expires_at,
        project_title, inviter_name,
        project:projects!crew_invitations_project_id_fkey ( id, title ),
        inviter:profiles!crew_invitations_inviter_id_fkey ( id, full_name )
      `)
      .single();

    if (!error && data) return data as unknown as CrewInvite;
    // Unique-violation? retry; else throw.
    if (error && error.code !== '23505') throw error;
  }
  throw new Error('Could not generate a unique invite code — try again.');
}

/** Look up an invite by code. Returns null if not found / revoked / accepted / expired.
 *
 *  Reads denormalised project_title + inviter_name — the joined `project` and
 *  `inviter` are intentionally NOT requested here because signed-out recipients
 *  fail those joins under RLS, which would have returned null preview fields.
 *
 *  Note: project_title + inviter_name aren't in types/db.ts yet — they land
 *  in the next `supabase gen types typescript --linked` regeneration after
 *  the 20260610000200 migration is pushed. Cast through `any` until then. */
export async function fetchCrewInviteByCode(code: string): Promise<CrewInvite | null> {
  const { data, error } = await supabase
    .from('crew_invitations')
    .select(`
      id, project_id, inviter_id, invitee_name, invite_code,
      role_on_project, created_at, accepted_at, expires_at,
      project_title, inviter_name
    ` as string)
    .eq('invite_code', code.toUpperCase())
    .is('accepted_at', null)
    .is('revoked_at', null)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: any = data;
  if (new Date(row.expires_at as string) < new Date()) return null;
  // Normalise to the CrewInvite shape with project + inviter as null —
  // the recipient screen reads project_title / inviter_name directly.
  return { ...row, project: null, inviter: null } as unknown as CrewInvite;
}

/**
 * Accept an invite by code: insert into project_crew with the invite's
 * role + flip the invitation row to accepted. Both operations are kept
 * close together; if the project_crew insert fails (e.g. duplicate, RLS),
 * we don't mark the invite accepted.
 *
 * Also bumps the signed-in user's role to 'apprentice' if they had no
 * role set or were a 'customer' before.
 */
export async function acceptCrewInvite(code: string): Promise<{ project_id: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You need to sign in to accept this invite');

  const invite = await fetchCrewInviteByCode(code);
  if (!invite) throw new Error('Invite is expired, revoked, or already used');

  // 1. Insert (or reactivate) the crew row.
  const { error: insertErr } = await supabase
    .from('project_crew')
    .upsert(
      {
        project_id: invite.project_id,
        user_id: user.id,
        role_on_project: invite.role_on_project,
        removed_at: null,
      },
      { onConflict: 'project_id,user_id' },
    );
  if (insertErr) throw insertErr;

  // 2. Mark the invite accepted.
  const { error: updateErr } = await supabase
    .from('crew_invitations')
    .update({ accepted_at: new Date().toISOString(), accepted_by: user.id })
    .eq('id', invite.id);
  if (updateErr) {
    // Best-effort — the crew row is already in place. Log but don't fail.
    console.warn('[acceptCrewInvite] could not flip invite to accepted', updateErr);
  }

  // 3. Promote the signed-in user to 'apprentice' role if needed.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profile && (profile.role === 'customer' || !profile.role)) {
    await supabase.from('profiles').update({ role: 'apprentice' }).eq('id', user.id);
  }

  return { project_id: invite.project_id };
}
