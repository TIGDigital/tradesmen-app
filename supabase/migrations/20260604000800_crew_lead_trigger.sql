-- ============================================================
-- Crew data layer (Sprint 36).
--
-- The original schema commented "lead is always auto-inserted on project
-- creation" but never shipped the trigger. This migration adds it,
-- backfills every existing project, and adds project_crew to the
-- realtime publication so the Crew tab updates live.
--
-- Lead = the tradesman_id on the project. Apprentices + helpers come in
-- Sprint 37 (via SMS invite). This trigger only handles the lead row.
-- ============================================================

create or replace function public.ensure_project_lead()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into project_crew (project_id, user_id, role_on_project)
  values (new.id, new.tradesman_id, 'lead')
  on conflict (project_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_project_insert_lead on projects;
create trigger on_project_insert_lead
  after insert on projects
  for each row execute function public.ensure_project_lead();

-- Backfill: every existing project gets a lead row if missing.
insert into project_crew (project_id, user_id, role_on_project)
select p.id, p.tradesman_id, 'lead'
  from projects p
 where p.tradesman_id is not null
on conflict (project_id, user_id) do nothing;

-- Realtime publication for live Crew tab updates.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'project_crew'
  ) then
    alter publication supabase_realtime add table project_crew;
  end if;
end$$;
