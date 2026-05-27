-- ============================================================
-- Storage bucket for update photos + RLS policies on storage.objects.
-- File path convention: {auth.uid()}/{update_id}/{n}.jpg
-- ============================================================

-- Create the bucket (private, 10MB per-file cap).
insert into storage.buckets (id, name, public, file_size_limit)
values ('project-media', 'project-media', false, 10485760)
on conflict (id) do nothing;

-- INSERT: a user can upload into their own top-level folder only.
-- (storage.foldername returns the path split by '/'; [1] is the first segment.)
create policy "media_insert_own" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'project-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- SELECT (own files): users can always read what they uploaded themselves.
create policy "media_select_own" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'project-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- SELECT (participants): once a file is linked to a project_update_media row,
-- anyone participating in that project can read it.
create policy "media_select_participants" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'project-media'
    and exists (
      select 1
      from public.project_update_media m
      join public.project_updates u on u.id = m.update_id
      where m.storage_path = storage.objects.name
        and public.is_project_participant(u.project_id)
    )
  );

-- DELETE: users can clean up their own uploads.
create policy "media_delete_own" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'project-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
