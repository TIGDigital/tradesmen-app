-- ============================================================
-- Sprint 39 — Multi-certificate verification model.
--
-- The current model stores Gas Safe / NICEIC / CSCS as flat text
-- columns on tradesman_profiles. Real tradesmen carry multiple cards
-- per trade, every card expires, and proof-photos matter.
--
-- This replaces that with a proper child table. Old columns are kept
-- in place for now so the existing screen + public profile keep
-- working through the migration window; they can be dropped in a
-- follow-up once every tradesman has migrated.
-- ============================================================

-- ---- 1) Enum for card kind ----
do $$
begin
  if not exists (select 1 from pg_type where typname = 'certificate_kind') then
    create type certificate_kind as enum (
      'gas_safe',
      'niceic',
      'cscs',
      'part_p',
      'asbestos_awareness',
      'ipaf',
      'first_aid',
      'scaffolding',
      'sssts',
      'smsts',
      'pasma',
      'other'
    );
  end if;
end$$;

-- ---- 2) Certificates table ----
create table if not exists tradesman_certificates (
  id uuid primary key default gen_random_uuid(),
  tradesman_id uuid not null references profiles(id) on delete cascade,
  kind certificate_kind not null,
  -- Only used when kind = 'other'. Lets tradesmen surface niche cards
  -- (IPAF Cherrypicker, Confined Spaces, etc.) without us building enum
  -- breadth before talking to enough real users.
  custom_name text,
  number text,
  issued_at date,
  expires_at date,
  photo_path text,                       -- storage key in `certificates` bucket
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tradesman_certificates_tradesman
  on tradesman_certificates (tradesman_id);

-- Touch updated_at on every UPDATE.
create or replace function public.touch_tradesman_certificate_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists on_tradesman_certificate_touch on tradesman_certificates;
create trigger on_tradesman_certificate_touch
  before update on tradesman_certificates
  for each row execute function public.touch_tradesman_certificate_updated_at();

-- ---- 3) RLS ----
alter table tradesman_certificates enable row level security;

-- Tradesman: full CRUD on their own rows.
drop policy if exists "tradesman manages own certificates" on tradesman_certificates;
create policy "tradesman manages own certificates"
  on tradesman_certificates
  for all
  to authenticated
  using (tradesman_id = auth.uid())
  with check (tradesman_id = auth.uid());

-- Project participants: read-only access to any tradesman they share a
-- project with. Mirrors how the public profile screen is reached today
-- (you only land there from a project you're already in).
drop policy if exists "participants read counterparty certificates"
  on tradesman_certificates;
create policy "participants read counterparty certificates"
  on tradesman_certificates
  for select
  to authenticated
  using (
    exists (
      select 1 from public.projects p
        where p.tradesman_id = tradesman_certificates.tradesman_id
          and (
            p.customer_id = auth.uid()
            or exists (
              select 1 from public.project_crew pc
               where pc.project_id = p.id
                 and pc.user_id = auth.uid()
                 and pc.removed_at is null
            )
          )
    )
  );

-- ---- 4) Storage bucket for photo evidence ----
-- The `certificates` bucket holds proof photos (card front, card back).
-- Paths follow {tradesman_id}/{certificate_id}.jpg so RLS can check
-- ownership from the path's first segment.
insert into storage.buckets (id, name, public)
values ('certificates', 'certificates', false)
on conflict (id) do nothing;

drop policy if exists "tradesman uploads own cert photos" on storage.objects;
create policy "tradesman uploads own cert photos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'certificates'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "tradesman updates own cert photos" on storage.objects;
create policy "tradesman updates own cert photos"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'certificates'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "tradesman deletes own cert photos" on storage.objects;
create policy "tradesman deletes own cert photos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'certificates'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "participants read cert photos" on storage.objects;
create policy "participants read cert photos"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'certificates'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.projects p
          where p.tradesman_id::text = (storage.foldername(name))[1]
            and (
              p.customer_id = auth.uid()
              or exists (
                select 1 from public.project_crew pc
                 where pc.project_id = p.id
                   and pc.user_id = auth.uid()
                   and pc.removed_at is null
              )
            )
      )
    )
  );
