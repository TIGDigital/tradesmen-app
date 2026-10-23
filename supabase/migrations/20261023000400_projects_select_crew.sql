-- ============================================================
-- Crew can read the projects they're on (23 Oct beta: an apprentice
-- joined successfully but their home showed no project — the projects
-- read policies only covered tradesman_id/customer_id). Uses the
-- SECURITY DEFINER helper is_project_crew() rather than querying
-- project_crew inline: the inline form recurses (project_crew's own
-- policies reference projects).
-- ============================================================

drop policy if exists projects_select_crew on projects;
create policy projects_select_crew on projects
  for select using (is_project_crew(id));
