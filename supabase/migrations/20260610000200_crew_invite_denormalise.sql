-- ============================================================
-- Sprint 41: denormalise project_title + inviter_name onto crew_invitations.
--
-- Problem: the /crew-invite/[code] preview screen joined projects +
-- profiles to show "You've been invited to {project title} — {inviter
-- name} added you". But signed-out recipients can't read those tables
-- under their RLS (they're not project participants yet, and the
-- public read we added in 20260610000100 was scoped to crew_invitations
-- only). Result: every preview fell back to "a project" / "The lead
-- tradesman".
--
-- Solution: stash the project title + inviter's display name on the
-- crew_invitations row at insert time, via a BEFORE INSERT trigger
-- running SECURITY DEFINER so it can read across tables regardless of
-- the inviter's RLS context. Backfill existing rows once.
--
-- Trade-off: if the project is renamed or the inviter changes their
-- display name AFTER the invite is created, the recipient still sees
-- the original. Acceptable — invite previews are usually consumed
-- within hours, not weeks.
-- ============================================================

-- 1. Add the columns.
alter table crew_invitations
  add column if not exists project_title text,
  add column if not exists inviter_name text;

-- 2. Trigger function: populate the denorms if not already set.
create or replace function populate_crew_invite_denorms()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.project_title is null then
    select title into new.project_title
      from projects
     where id = new.project_id;
  end if;
  if new.inviter_name is null then
    select full_name into new.inviter_name
      from profiles
     where id = new.inviter_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_crew_invite_denorm on crew_invitations;
create trigger trg_crew_invite_denorm
  before insert on crew_invitations
  for each row
  execute function populate_crew_invite_denorms();

-- 3. Backfill existing invites so old codes (like the ones Todd just
--    generated while testing) start showing the real names too.
update crew_invitations ci
   set project_title = p.title,
       inviter_name  = pr.full_name
  from projects p,
       profiles pr
 where ci.project_id = p.id
   and ci.inviter_id = pr.id
   and (ci.project_title is null or ci.inviter_name is null);
