-- ============================================================
-- SECURITY HARDENING — findings from the 18 Oct full RLS audit.
-- Six holes, all server-side fixes, no client changes needed.
--
-- H1 profiles: users could UPDATE their own role to 'admin'
--    (role self-selection between the three public roles is by
--    design; admin escalation is not). → trigger guard.
-- H2 messages: the read-receipt policy let a participant UPDATE
--    the OTHER party's message rows with no column limit — you
--    could rewrite what your counterparty said. → column-level
--    privilege: UPDATE is granted on read_at only.
-- H3 projects: customers could UPDATE any project column,
--    including quoted_amount — bypassing the entire "no surprise
--    bills" audit trail. → participant update becomes lead-only;
--    customers keep only the accept-invite transition.
-- H4 crew_invitations: the update policy's USING had
--    "OR auth.uid() IS NOT NULL" — ANY signed-in user could
--    claim/kill ANY invitation. Acceptance moved to the
--    accept_crew_invite RPC on 16 Oct, so the accepter leg is
--    obsolete. → lead-only.
-- H5 project_quotes: the lead could UPDATE a sent quote's status
--    to 'approved' (faking customer approval in the UI) or edit
--    its totals. → lead updates must land status='withdrawn'
--    (the only legitimate lead write; decisions go through the
--    decide_quote RPC).
-- H6 storage.avatars: a leftover 'avatars_write_authenticated_DEBUG'
--    policy let any user write/delete ANY avatar. → scoped to the
--    uploader's own folder ({user_id}/avatar.ext).
-- M7 project_updates: authors could UPDATE their own
--    approval_status — an apprentice could self-approve a pending
--    update, bypassing the lead's approval queue. → trigger: only
--    the project lead may change approval fields.
-- ============================================================

-- H1 ─ no self-service admin.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
as $$
begin
  if new.role = 'admin' and old.role is distinct from 'admin'
     and current_user not in ('postgres', 'supabase_admin', 'supabase_auth_admin', 'service_role') then
    raise exception 'The admin role cannot be self-assigned';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_profile_role on profiles;
create trigger trg_guard_profile_role
  before update of role on profiles
  for each row execute function public.guard_profile_role();

-- H2 ─ messages: UPDATE allowed on read_at only.
revoke update on table public.messages from authenticated;
grant update (read_at) on table public.messages to authenticated;

-- H3 ─ projects: general updates are the lead's; customers keep the
--      accept-invite transition policy only.
drop policy if exists projects_update_participant on projects;
create policy projects_update_lead on projects
  for update
  using (tradesman_id = auth.uid())
  with check (tradesman_id = auth.uid());

-- H4 ─ crew invitations: lead-only updates (revoke/extend). Acceptance
--      happens inside the accept_crew_invite SECURITY DEFINER RPC.
drop policy if exists crew_invites_update_lead_or_accepter on crew_invitations;
create policy crew_invites_update_lead on crew_invitations
  for update
  using (
    exists (
      select 1 from projects p
       where p.id = crew_invitations.project_id and p.tradesman_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from projects p
       where p.id = crew_invitations.project_id and p.tradesman_id = auth.uid()
    )
  );

-- H5 ─ quotes: the only direct lead write is a withdrawal.
drop policy if exists quotes_update_lead on project_quotes;
create policy quotes_update_lead_withdraw on project_quotes
  for update
  using (is_project_tradesman(project_id))
  with check (is_project_tradesman(project_id) and status = 'withdrawn');

-- H6 ─ avatars: scoped write replaces the DEBUG policy.
drop policy if exists "avatars_write_authenticated_DEBUG" on storage.objects;
drop policy if exists avatars_write_own on storage.objects;
create policy avatars_write_own on storage.objects
  for all
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

-- M7 ─ approval fields change only under the project lead's hand.
create or replace function public.guard_update_approval()
returns trigger
language plpgsql
as $$
begin
  if (new.approval_status is distinct from old.approval_status
      or new.approval_decided_at is distinct from old.approval_decided_at
      or new.rejection_reason is distinct from old.rejection_reason)
     and current_user not in ('postgres', 'supabase_admin', 'service_role')
     and not is_project_tradesman(new.project_id) then
    raise exception 'Only the project lead can change approval status';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_update_approval on project_updates;
create trigger trg_guard_update_approval
  before update on project_updates
  for each row execute function public.guard_update_approval();
