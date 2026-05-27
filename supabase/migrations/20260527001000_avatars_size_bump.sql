-- Bump avatars bucket file size cap from 2MB to 5MB.
-- Even compressed avatars can exceed 2MB on modern phones (12MP camera, etc.).
update storage.buckets set file_size_limit = 5242880 where id = 'avatars';
