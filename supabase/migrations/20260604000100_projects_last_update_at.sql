-- ============================================================
-- Denormalised last_update_at on projects.
--
-- The Jobs dashboard wants to highlight projects that haven't had an update
-- in 3+ days ("Needs update" filter). Doing that client-side requires
-- knowing the most recent project_updates.created_at per project — which
-- means an N+1 query or a join. Cheap to denormalise instead: stamp the
-- column on the parent each time a child update arrives.
--
-- Triggered AFTER INSERT on project_updates. SECURITY DEFINER so the
-- trigger can UPDATE projects regardless of who posted the update.
-- ============================================================

alter table projects
  add column if not exists last_update_at timestamptz;

-- Backfill existing rows from the freshest matching project_update.
update projects p
   set last_update_at = sub.max_created_at
  from (
    select project_id, max(created_at) as max_created_at
      from project_updates
     where deleted_at is null
     group by project_id
  ) sub
 where p.id = sub.project_id;

create or replace function public.bump_project_last_update_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update projects
     set last_update_at = new.created_at
   where id = new.project_id;
  return new;
end;
$$;

drop trigger if exists on_project_update_bump_last_update_at on project_updates;

create trigger on_project_update_bump_last_update_at
  after insert on project_updates
  for each row execute function public.bump_project_last_update_at();
