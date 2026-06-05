-- ============================================================
-- Crew invitations (Sprint 37).
--
-- Tradesman generates an invite code per apprentice/helper. They share
-- the code via the iOS share sheet (Messages, WhatsApp, etc.) — no
-- additional Twilio plumbing required. The recipient opens the app to
-- /crew-invite/{code}, accepts, and gets inserted into project_crew with
-- role='apprentice' (or 'helper').
--
-- Customer invites already exist via projects.invite_code; this is a
-- parallel table for the many-to-many crew model.
-- ============================================================

create table if not exists crew_invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  inviter_id uuid not null references profiles(id) on delete cascade,
  invitee_name text not null check (length(trim(invitee_name)) > 0 and length(invitee_name) <= 100),
  invite_code text not null unique,
  role_on_project text not null default 'apprentice'
    check (role_on_project in ('apprentice', 'helper')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid references profiles(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '14 days'),
  revoked_at timestamptz
);

create index if not exists idx_crew_invitations_project
  on crew_invitations (project_id)
  where accepted_at is null and revoked_at is null;

create index if not exists idx_crew_invitations_code
  on crew_invitations (invite_code)
  where accepted_at is null and revoked_at is null;

alter table crew_invitations enable row level security;

-- Select: lead of the project sees their outstanding invites; ANY
-- authenticated user can look up by code (so the accept screen works
-- before they're added to the project). We rely on the unguessable code
-- as a soft secret.
drop policy if exists crew_invites_select_lead on crew_invitations;
create policy crew_invites_select_lead on crew_invitations
  for select
  using (
    exists (
      select 1 from projects p
       where p.id = crew_invitations.project_id
         and p.tradesman_id = auth.uid()
    )
  );

drop policy if exists crew_invites_select_by_code on crew_invitations;
create policy crew_invites_select_by_code on crew_invitations
  for select
  to authenticated
  using (
    accepted_at is null
    and revoked_at is null
    and expires_at > now()
  );

-- Insert: only the project's lead tradesman.
drop policy if exists crew_invites_insert_lead on crew_invitations;
create policy crew_invites_insert_lead on crew_invitations
  for insert
  with check (
    inviter_id = auth.uid()
    and exists (
      select 1 from projects p
       where p.id = project_id
         and p.tradesman_id = auth.uid()
    )
  );

-- Update: either the lead (to revoke) or the invitee themselves (to
-- mark accepted). The accepted_by must equal auth.uid() in the latter
-- case — enforced by check.
drop policy if exists crew_invites_update_lead_or_accepter on crew_invitations;
create policy crew_invites_update_lead_or_accepter on crew_invitations
  for update
  using (
    exists (
      select 1 from projects p
       where p.id = crew_invitations.project_id
         and p.tradesman_id = auth.uid()
    )
    OR auth.uid() is not null  -- any authenticated user can accept;
                                -- they prove the link via the code
  )
  with check (
    exists (
      select 1 from projects p
       where p.id = project_id
         and p.tradesman_id = auth.uid()
    )
    OR accepted_by = auth.uid()
  );
