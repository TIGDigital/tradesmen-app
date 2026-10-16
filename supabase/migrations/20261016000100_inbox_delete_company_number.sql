-- ============================================================
-- Beta feedback batch, 16 Oct 2026 (Todd's tradesman test pass)
--
-- 1. DELETE policy on notifications — the inbox gains per-row dismiss
--    and "Clear all", which need row deletion. Users may only delete
--    their own rows.
-- 2. tradesman_profiles.company_number — Companies House number, shown
--    above the VAT number on the business details screen.
--
-- Idempotent.
-- ============================================================

drop policy if exists notifications_delete_own on notifications;
create policy notifications_delete_own on notifications
  for delete
  using (user_id = auth.uid());

alter table tradesman_profiles add column if not exists company_number text;
