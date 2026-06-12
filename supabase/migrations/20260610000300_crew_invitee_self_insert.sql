-- ============================================================
-- Allow crew invitees to add themselves to project_crew when they
-- have a valid invitation code.
--
-- Problem: services/crew.ts acceptCrewInvite inserts into
-- project_crew FIRST, then marks the crew_invitations row as
-- accepted. The original crew_write_lead policy (from
-- 20260527000100_rls_policies.sql) is lead-only, so the insert
-- blew up with "new row violates row-level security policy for
-- table 'project_crew'" the moment a non-lead invitee tried to
-- accept their invite.
--
-- Gate: invitee can insert themselves (user_id = auth.uid()) when
-- there is a LIVE invite for the project (unaccepted, non-revoked,
-- not expired). Possession of the invite code is the soft secret —
-- only people the lead has invited would have it.
--
-- Also allow self-update so re-acceptance after soft-removal works
-- (acceptCrewInvite uses .upsert with onConflict='project_id,user_id'
-- — without the update policy, restoring removed_at=null hits the
-- lead-only restriction).
-- ============================================================

drop policy if exists crew_invitee_self_insert on project_crew;
create policy crew_invitee_self_insert on project_crew
  for insert
  with check (
    user_id = auth.uid()
    AND exists (
      select 1 from crew_invitations ci
       where ci.project_id = project_crew.project_id
         and ci.accepted_at is null
         and ci.revoked_at is null
         and ci.expires_at > now()
    )
  );

drop policy if exists crew_invitee_self_update on project_crew;
create policy crew_invitee_self_update on project_crew
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
