-- ============================================================
-- 23 Oct beta, crew round 2:
-- 1. Documents were tradesman/customer-only at the RLS layer — crew
--    could not upload or even list them. All policies move to the
--    is_project_participant() helper (lead + customer + active crew).
-- 2. project_tasks: the lead's job list for the crew. Internal tool —
--    customers never see it. Lead manages; the assignee can tick off.
-- ============================================================

-- ---- 1. Documents open to all participants ------------------
drop policy if exists project_documents_select on project_documents;
create policy project_documents_select on project_documents
  for select using (is_project_participant(project_id));

drop policy if exists project_documents_insert on project_documents;
create policy project_documents_insert on project_documents
  for insert with check (
    uploader_id = auth.uid() and is_project_participant(project_id)
  );

drop policy if exists documents_insert_participants on storage.objects;
create policy documents_insert_participants on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and exists (
      select 1 from projects p
       where name like p.id::text || '/%'
         and is_project_participant(p.id)
    )
  );

drop policy if exists documents_select_participants on storage.objects;
create policy documents_select_participants on storage.objects
  for select using (
    bucket_id = 'documents'
    and exists (
      select 1 from projects p
       where name like p.id::text || '/%'
         and is_project_participant(p.id)
    )
  );

-- ---- 2. Job list ---------------------------------------------
create table if not exists project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  assigned_to uuid references profiles(id) on delete set null,
  created_by uuid not null references profiles(id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  done_at timestamptz,
  done_by uuid references profiles(id),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_project_tasks_project
  on project_tasks (project_id, done_at, sort_order);

alter table project_tasks enable row level security;

-- Lead + crew read; customers never see the internal job list.
create policy tasks_select_crew on project_tasks
  for select using (
    is_project_tradesman(project_id) or is_project_crew(project_id)
  );

-- Lead manages the list.
create policy tasks_write_lead on project_tasks
  for all using (is_project_tradesman(project_id))
  with check (is_project_tradesman(project_id));

-- The assignee can update their own task (ticking it done).
create policy tasks_update_assignee on project_tasks
  for update using (assigned_to = auth.uid())
  with check (assigned_to = auth.uid());
