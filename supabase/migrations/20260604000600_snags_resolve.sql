-- ============================================================
-- Snag resolve + sign-off (Sprint 33, part 2 of the snag feature).
--
-- Adds:
--   - project_snags.confirmed_at / confirmed_by — customer's acknowledgement
--     that the resolution is acceptable. Status stays 'resolved' but the
--     confirmation timestamp closes the loop.
--   - project_snag_photos.kind — distinguishes the original reported
--     photos from proof-of-fix photos so the detail screen can show both
--     sections cleanly. Defaults to 'report' so existing rows are correct.
-- ============================================================

alter table project_snags
  add column if not exists confirmed_at timestamptz,
  add column if not exists confirmed_by uuid references profiles(id) on delete set null;

alter table project_snag_photos
  add column if not exists kind text not null default 'report';

-- Constraint added separately so the check can be added without dropping
-- the column when it's already present.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'project_snag_photos_kind_check'
  ) then
    alter table project_snag_photos
      add constraint project_snag_photos_kind_check
      check (kind in ('report', 'resolution'));
  end if;
end$$;

create index if not exists idx_project_snag_photos_kind
  on project_snag_photos (snag_id, kind);
