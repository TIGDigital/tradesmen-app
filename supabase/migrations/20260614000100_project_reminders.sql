-- ============================================================
-- Per-project recurring EoD reminders (Sprint 49).
--
-- A tradesman can configure a daily "time to wrap up" prompt for
-- each of their active projects. The reminder fires as a local
-- notification on their phone at the chosen time on the chosen
-- weekdays; tapping it opens the end-of-day modal for that project
-- (uses the existing action='end_of_day' deep-link handler).
--
-- One row per (project_id, user_id) — primary key composite so each
-- crew member could conceivably set their own reminder on the same
-- project. For MVP only the lead tradesman gets the UI exposed.
--
-- Scheduling happens client-side via expo-notifications. The DB row
-- is the source of truth that the app reads on launch to re-schedule
-- (covers re-installs + device wipes).
-- ============================================================

create table if not exists project_reminders (
  project_id uuid not null references projects(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,

  -- 24-hour local time, "HH:MM" e.g. "17:30". Stored as text rather
  -- than the time type because timezone semantics on time-of-day are
  -- a footgun — we just want "5:30pm in the tradesman's local time."
  time_of_day text not null,

  -- ISO weekday convention: 1=Mon, 2=Tue, ..., 7=Sun. Empty array =
  -- enabled but with no days = effectively off, but we still respect
  -- enabled.
  days_of_week int[] not null default '{1,2,3,4,5}',

  enabled    boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  primary key (project_id, user_id)
);

create index if not exists idx_project_reminders_user
  on project_reminders (user_id)
  where enabled = true;

-- RLS: a user can only see / write their own reminder rows. Even
-- crew members on the project can set their own reminder, but they
-- can't read or modify someone else's.
alter table project_reminders enable row level security;

drop policy if exists reminders_owner_all on project_reminders;
create policy reminders_owner_all on project_reminders
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
