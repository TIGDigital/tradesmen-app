-- ============================================================
-- DEBUG: maximally permissive avatars policy.
-- If this works, the path-vs-auth.uid() check was the problem and we can
-- tighten it again. If this STILL fails, there's something else wrong
-- (bucket missing, schema issue, etc.).
-- ============================================================

drop policy if exists "avatars_insert_own" on storage.objects;
drop policy if exists "avatars_update_own" on storage.objects;
drop policy if exists "avatars_delete_own" on storage.objects;

-- Open write: any authenticated user can write to the avatars bucket.
-- TODO: tighten this back to owner-only once we confirm uploads work.
create policy "avatars_write_authenticated_DEBUG" on storage.objects
  for all
  to authenticated
  using (bucket_id = 'avatars')
  with check (bucket_id = 'avatars');
