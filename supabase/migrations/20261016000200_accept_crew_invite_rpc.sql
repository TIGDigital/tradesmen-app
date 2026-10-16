-- ============================================================
-- Crew invite acceptance moves into a SECURITY DEFINER RPC.
--
-- Why (found live in beta, 16 Oct):
-- 1. BUG — the client upsert into project_crew failed with "new row
--    violates row-level security" for every invitee. Reproduced: the
--    crew_invitee_self_insert policy passes for a plain INSERT but
--    fails under any INSERT ... ON CONFLICT form (speculative-insert
--    path + correlated-EXISTS policy), which is exactly what the
--    client's .upsert() sends. Crew signup was fully broken on device.
-- 2. SECURITY — crew_invitee_self_insert only required that SOME live
--    invite existed for the project, not that the joiner held the
--    code. Any signed-in user could add themselves to any project
--    with an outstanding invite. crew_invitee_self_update let a crew
--    member update their own row, including promoting role_on_project
--    to 'lead'.
--
-- The RPC validates the CODE (the real capability), inserts/restores
-- the crew row, marks the invite accepted, and promotes the profile
-- role — one atomic, race-safe (FOR UPDATE) transaction. Both broken
-- policies are dropped.
-- ============================================================

create or replace function public.accept_crew_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite crew_invitations%rowtype;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'You need to sign in to accept this invite';
  end if;

  select * into v_invite
    from crew_invitations
   where invite_code = upper(trim(p_code))
     and accepted_at is null
     and revoked_at is null
     and expires_at > now()
   for update;

  if not found then
    raise exception 'Invite is expired, revoked, or already used';
  end if;

  insert into project_crew (project_id, user_id, role_on_project, removed_at)
  values (v_invite.project_id, v_uid, v_invite.role_on_project, null)
  on conflict (project_id, user_id)
    do update set removed_at = null, role_on_project = excluded.role_on_project;

  update crew_invitations
     set accepted_at = now(), accepted_by = v_uid
   where id = v_invite.id;

  update profiles
     set role = 'apprentice'
   where id = v_uid
     and (role is null or role = 'customer');

  return v_invite.project_id;
end;
$$;

revoke all on function public.accept_crew_invite(text) from public;
grant execute on function public.accept_crew_invite(text) to authenticated;

drop policy if exists crew_invitee_self_insert on project_crew;
drop policy if exists crew_invitee_self_update on project_crew;
