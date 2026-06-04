-- ============================================================
-- Comments on a single project_update.
--
-- Anyone on the project (tradesman or customer) can read + write. Soft
-- delete via deleted_at so we keep an audit trail. Realtime publication
-- so the thread screen updates without a manual refresh.
--
-- Scope is intentionally NOT widened to project_crew yet — when the crew
-- layer ships we'll extend the RLS to include lead/apprentice members.
-- ============================================================

create table if not exists project_update_comments (
  id uuid primary key default gen_random_uuid(),
  update_id uuid not null references project_updates(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null check (length(trim(body)) > 0 and length(body) <= 2000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_project_update_comments_update
  on project_update_comments (update_id, created_at)
  where deleted_at is null;

create index if not exists idx_project_update_comments_author
  on project_update_comments (author_id);

alter table project_update_comments enable row level security;

-- Read: project participants only.
drop policy if exists comments_select on project_update_comments;
create policy comments_select on project_update_comments
  for select
  using (
    exists (
      select 1
        from project_updates pu
        join projects p on p.id = pu.project_id
       where pu.id = project_update_comments.update_id
         and (p.tradesman_id = auth.uid() or p.customer_id = auth.uid())
    )
  );

-- Insert: project participants, author_id = self.
drop policy if exists comments_insert on project_update_comments;
create policy comments_insert on project_update_comments
  for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1
        from project_updates pu
        join projects p on p.id = pu.project_id
       where pu.id = update_id
         and (p.tradesman_id = auth.uid() or p.customer_id = auth.uid())
    )
  );

-- Update: own only (used for soft delete via deleted_at).
drop policy if exists comments_update on project_update_comments;
create policy comments_update on project_update_comments
  for update
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

-- Hard delete: own only.
drop policy if exists comments_delete on project_update_comments;
create policy comments_delete on project_update_comments
  for delete
  using (author_id = auth.uid());

-- Realtime: thread screen subscribes to live changes.
alter publication supabase_realtime add table project_update_comments;
