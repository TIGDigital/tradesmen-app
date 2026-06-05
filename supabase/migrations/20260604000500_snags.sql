-- ============================================================
-- Snag list: customer-flagged issues on a project ("the grout is uneven
-- behind the toilet"). One snag has many photos. Tradesman receives a
-- push + inbox row when one is created. Part 1 covers creation + listing
-- only; the resolve / sign-off flow ships in part 2 (Sprint 33).
--
-- Photo storage reuses the existing `project-media` bucket — we just
-- extend its select RLS to also grant participants access to files
-- referenced by project_snag_photos rows.
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'snag_status') then
    create type snag_status as enum ('open', 'in_progress', 'resolved');
  end if;
end$$;

create table if not exists project_snags (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  reporter_id uuid not null references profiles(id) on delete cascade,
  title text not null check (length(trim(title)) > 0 and length(title) <= 200),
  description text check (description is null or length(description) <= 2000),
  location_hint text check (location_hint is null or length(location_hint) <= 200),
  status snag_status not null default 'open',
  resolved_at timestamptz,
  resolved_by uuid references profiles(id) on delete set null,
  resolution_note text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_project_snags_project
  on project_snags (project_id, created_at desc)
  where deleted_at is null;

create index if not exists idx_project_snags_open
  on project_snags (project_id)
  where status = 'open' and deleted_at is null;

create table if not exists project_snag_photos (
  id uuid primary key default gen_random_uuid(),
  snag_id uuid not null references project_snags(id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_project_snag_photos_snag
  on project_snag_photos (snag_id, sort_order);

alter table project_snags enable row level security;
alter table project_snag_photos enable row level security;

-- ---- project_snags RLS ----
drop policy if exists project_snags_select on project_snags;
create policy project_snags_select on project_snags
  for select
  using (
    exists (
      select 1
        from projects p
       where p.id = project_snags.project_id
         and (p.tradesman_id = auth.uid() or p.customer_id = auth.uid())
    )
  );

drop policy if exists project_snags_insert on project_snags;
create policy project_snags_insert on project_snags
  for insert
  with check (
    reporter_id = auth.uid()
    and exists (
      select 1
        from projects p
       where p.id = project_id
         and (p.tradesman_id = auth.uid() or p.customer_id = auth.uid())
    )
  );

-- Both parties can flip status (open ↔ in_progress ↔ resolved) — that's
-- part 2's job, but allowing it in part 1 simplifies the part 2 ship.
drop policy if exists project_snags_update on project_snags;
create policy project_snags_update on project_snags
  for update
  using (
    exists (
      select 1
        from projects p
       where p.id = project_snags.project_id
         and (p.tradesman_id = auth.uid() or p.customer_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1
        from projects p
       where p.id = project_id
         and (p.tradesman_id = auth.uid() or p.customer_id = auth.uid())
    )
  );

-- ---- project_snag_photos RLS ----
drop policy if exists project_snag_photos_select on project_snag_photos;
create policy project_snag_photos_select on project_snag_photos
  for select
  using (
    exists (
      select 1
        from project_snags ps
        join projects p on p.id = ps.project_id
       where ps.id = project_snag_photos.snag_id
         and (p.tradesman_id = auth.uid() or p.customer_id = auth.uid())
    )
  );

drop policy if exists project_snag_photos_insert on project_snag_photos;
create policy project_snag_photos_insert on project_snag_photos
  for insert
  with check (
    exists (
      select 1
        from project_snags ps
        join projects p on p.id = ps.project_id
       where ps.id = snag_id
         and (p.tradesman_id = auth.uid() or p.customer_id = auth.uid())
    )
  );

-- ---- Storage: extend project-media bucket select policy ----
-- Existing policies cover own-files + update-photo participants. Add a
-- parallel one for snag photos so any project participant can read them.
drop policy if exists "media_select_snag_participants" on storage.objects;
create policy "media_select_snag_participants" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'project-media'
    and exists (
      select 1
        from public.project_snag_photos sp
        join public.project_snags ps on ps.id = sp.snag_id
       where sp.storage_path = storage.objects.name
         and public.is_project_participant(ps.project_id)
    )
  );

-- ---- Realtime ----
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'project_snags'
  ) then
    alter publication supabase_realtime add table project_snags;
  end if;
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'project_snag_photos'
  ) then
    alter publication supabase_realtime add table project_snag_photos;
  end if;
end$$;
