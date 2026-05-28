-- ============================================================
-- Auto-create a tradesman_profiles row when a profile's role becomes
-- 'tradesman'. Without this row the business/verification UI can't UPDATE
-- anything.
--
-- Fires on both INSERT (signup via setMyRole) and UPDATE (later role flip).
-- Idempotent via on conflict do nothing.
-- ============================================================

create or replace function public.handle_tradesman_profile_create()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'tradesman' then
    insert into public.tradesman_profiles (id, business_name, primary_trade)
    values (new.id, coalesce(new.full_name, 'My business'), 'general')
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_role_tradesman on profiles;

create trigger on_profile_role_tradesman
  after insert or update of role on profiles
  for each row execute function public.handle_tradesman_profile_create();

-- Backfill: any existing tradesman without a row gets one now.
insert into tradesman_profiles (id, business_name, primary_trade)
select p.id, coalesce(p.full_name, 'My business'), 'general'
from profiles p
where p.role = 'tradesman'
  and not exists (select 1 from tradesman_profiles t where t.id = p.id)
on conflict (id) do nothing;
