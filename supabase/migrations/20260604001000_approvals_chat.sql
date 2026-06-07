-- ============================================================
-- Sprint 38 — final sprint.
--
-- 1) Approval queue: apprentices' updates land as 'pending'; the lead
--    can approve or reject. Customer feeds only show approved.
-- 2) Group chat widening: extend is_project_participant() to include
--    active project_crew rows so apprentices/helpers are in the chat
--    automatically.
-- ============================================================

-- ---- 1) Approval enum + columns + trigger ----
do $$
begin
  if not exists (select 1 from pg_type where typname = 'update_approval_status') then
    create type update_approval_status as enum ('pending', 'approved', 'rejected');
  end if;
end$$;

alter table project_updates
  add column if not exists approval_status update_approval_status not null default 'approved',
  add column if not exists approval_decided_at timestamptz,
  add column if not exists approval_decided_by uuid references profiles(id) on delete set null,
  add column if not exists rejection_reason text;

create index if not exists idx_project_updates_pending
  on project_updates (project_id)
  where approval_status = 'pending' and deleted_at is null;

-- BEFORE INSERT trigger: if the author is an active apprentice on this
-- project, force the status to 'pending'. Lead + customer posts stay
-- 'approved' (the column default).
create or replace function public.tag_apprentice_update_pending()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.approval_status = 'approved' then
    if exists (
      select 1
        from public.project_crew
       where project_id = new.project_id
         and user_id = new.author_id
         and role_on_project = 'apprentice'
         and removed_at is null
    ) then
      new.approval_status := 'pending';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_project_update_tag_pending on project_updates;
create trigger on_project_update_tag_pending
  before insert on project_updates
  for each row execute function public.tag_apprentice_update_pending();

-- ---- 2) Group-chat / crew-inclusive participant helper ----
-- is_project_participant() currently checks tradesman_id + customer_id
-- only. Widen it to also accept any active crew row. This automatically
-- gives apprentices + helpers chat access, message read tracking, etc.
create or replace function public.is_project_participant(p_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.projects
     where id = p_id
       and (tradesman_id = auth.uid() or customer_id = auth.uid())
  )
  or exists (
    select 1 from public.project_crew
     where project_id = p_id
       and user_id = auth.uid()
       and removed_at is null
  );
$$;
