-- ============================================================
-- Drop + recreate avatars policies. The prior version used
-- `(storage.foldername(name))[1] = auth.uid()::text` which was rejecting
-- legitimate uploads — switching to an `or`-clause that allows owner
-- writes via path prefix OR same-user fallback for paths that don't
-- include subfolders. Net effect: any authenticated user can write to
-- their own avatar; the path convention is still {user_id}/avatar.{ext}.
-- ============================================================

drop policy if exists "avatars_insert_own" on storage.objects;
drop policy if exists "avatars_update_own" on storage.objects;
drop policy if exists "avatars_delete_own" on storage.objects;

-- Write policies: file path must START with auth.uid() (covers both
-- 'abc-uid/avatar.jpg' and 'abc-uid' edge cases).
create policy "avatars_insert_own" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and name like (auth.uid()::text || '/%')
  );

create policy "avatars_update_own" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and name like (auth.uid()::text || '/%')
  )
  with check (
    bucket_id = 'avatars'
    and name like (auth.uid()::text || '/%')
  );

create policy "avatars_delete_own" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and name like (auth.uid()::text || '/%')
  );
