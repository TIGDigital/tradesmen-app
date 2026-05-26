-- ============================================================
-- Auto-create a profiles row when a new auth.users row is inserted.
-- Role and full_name are pulled from raw_user_meta_data, set by the sign-up form.
-- ============================================================
-- The role-select screen calls update on profiles to set role after sign-up if it
-- wasn't known at sign-up time. We default to 'customer' so the foreign key never
-- fails — the role-select screen always runs immediately after sign-up.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, email)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'customer'),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Drop and recreate so re-running the migration is safe.
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
