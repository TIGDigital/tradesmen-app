-- ============================================================
-- Accepting a crew invite is idempotent for the person who already
-- accepted it (23 Oct beta: a retry after a successful join — double
-- tap, app restart, re-entering the code — threw "already used" at
-- someone who was already in). Replaces accept_crew_invite from
-- 20261016000200; only the not-found branch changes.
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
    -- Same person retrying a code they already used: succeed again
    -- instead of erroring, and make sure their crew row is active.
    select * into v_invite
      from crew_invitations
     where invite_code = upper(trim(p_code))
       and accepted_by = v_uid
       and revoked_at is null;
    if found then
      insert into project_crew (project_id, user_id, role_on_project, removed_at)
      values (v_invite.project_id, v_uid, v_invite.role_on_project, null)
      on conflict (project_id, user_id)
        do update set removed_at = null, role_on_project = excluded.role_on_project;
      return v_invite.project_id;
    end if;
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
