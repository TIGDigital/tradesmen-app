-- ============================================================
-- Project documents: PDFs + images attached to a project (quotes,
-- certificates, plans, invoices). Storage path is keyed by project_id
-- so RLS on storage.objects can scope reads/writes by participation.
-- Soft delete via deleted_at — same pattern as comments.
-- ============================================================

create table if not exists project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  uploader_id uuid not null references profiles(id) on delete cascade,
  file_name text not null check (length(file_name) > 0 and length(file_name) <= 200),
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_project_documents_project
  on project_documents (project_id, created_at desc)
  where deleted_at is null;

create index if not exists idx_project_documents_uploader
  on project_documents (uploader_id);

alter table project_documents enable row level security;

-- Select: project participants only.
drop policy if exists project_documents_select on project_documents;
create policy project_documents_select on project_documents
  for select
  using (
    exists (
      select 1
        from projects p
       where p.id = project_documents.project_id
         and (p.tradesman_id = auth.uid() or p.customer_id = auth.uid())
    )
  );

-- Insert: project participants only, uploader_id = self.
drop policy if exists project_documents_insert on project_documents;
create policy project_documents_insert on project_documents
  for insert
  with check (
    uploader_id = auth.uid()
    and exists (
      select 1
        from projects p
       where p.id = project_id
         and (p.tradesman_id = auth.uid() or p.customer_id = auth.uid())
    )
  );

-- Update: own only (used for soft delete via deleted_at).
drop policy if exists project_documents_update on project_documents;
create policy project_documents_update on project_documents
  for update
  using (uploader_id = auth.uid())
  with check (uploader_id = auth.uid());

-- ============================================================
-- Storage bucket: 'documents' — private, 20MB cap, PDF + image only.
-- File path convention: <project_id>/<random>-<file_name>
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  20 * 1024 * 1024,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/heic',
    'image/heif',
    'image/webp'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Bucket RLS — gate reads + writes on the participant being on the
-- project whose id is the first folder segment of the storage path.
drop policy if exists documents_select_participants on storage.objects;
create policy documents_select_participants on storage.objects
  for select
  using (
    bucket_id = 'documents'
    and exists (
      select 1
        from projects p
       where (p.tradesman_id = auth.uid() or p.customer_id = auth.uid())
         and name like p.id::text || '/%'
    )
  );

drop policy if exists documents_insert_participants on storage.objects;
create policy documents_insert_participants on storage.objects
  for insert
  with check (
    bucket_id = 'documents'
    and exists (
      select 1
        from projects p
       where (p.tradesman_id = auth.uid() or p.customer_id = auth.uid())
         and name like p.id::text || '/%'
    )
  );

drop policy if exists documents_delete_uploader on storage.objects;
create policy documents_delete_uploader on storage.objects
  for delete
  using (
    bucket_id = 'documents'
    and owner = auth.uid()
  );
