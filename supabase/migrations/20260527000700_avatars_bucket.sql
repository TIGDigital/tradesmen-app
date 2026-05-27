-- ============================================================
-- Avatars bucket: public-read, owner-only write.
-- Path convention: {user_id}/avatar.{ext}
-- Public read lets us render via direct URL (no signed URL round-trip) —
-- avatars are intentionally non-sensitive.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('avatars', 'avatars', true, 2097152) -- 2MB cap
on conflict (id) do nothing;

-- Public bucket gives anonymous SELECT — explicit policy not required for read.
-- We still need write policies scoped to the owner.

create policy "avatars_insert_own" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_update_own" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_delete_own" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
