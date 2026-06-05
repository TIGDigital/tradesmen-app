-- ============================================================
-- Visual Gantt needs a start AND end per milestone. We already have
-- expected_date (acting as the deadline / end-of-window) and
-- completed_at — this adds an explicit start so a milestone has
-- [expected_start_date, expected_date] for the chart.
--
-- Existing rows stay nullable; when start is null the schedule UI
-- treats it as a single-day milestone landing on expected_date.
-- ============================================================

alter table project_milestones
  add column if not exists expected_start_date date;
