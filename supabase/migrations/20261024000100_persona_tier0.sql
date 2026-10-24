-- ============================================================
-- Persona audit Tier 0 (24 Oct) — server-side fixes from the
-- three-persona review. See 14_Persona_Optimisation_Plan.md.
--
-- 1. Customers only ever read APPROVED updates. The author always
--    sees their own posts (incl. rejected + reason); the lead sees
--    everything on their project.
-- 2. mark_updates_seen stamps only approved rows, so a post can't
--    arrive "already seen".
-- 3. Snags open to all project participants (crew could neither
--    see nor flag them).
-- 4. Participants on a shared project can read each other's
--    profiles (names showed as "Someone" for crew).
-- ============================================================

-- ---- 1. Updates read scope --------------------------------
drop policy if exists updates_select on project_updates;
create policy updates_select on project_updates
  for select using (
    is_project_participant(project_id)
    and (
      approval_status = 'approved'
      or author_id = auth.uid()
      or is_project_tradesman(project_id)
    )
  );

-- ---- 2. Seen stamps: approved only -------------------------
create or replace function public.mark_updates_seen(p_project_id uuid)
returns void
language sql
security definer
set search_path to 'public'
as $$
  update project_updates
     set customer_seen_at = now()
   where project_id = p_project_id
     and customer_seen_at is null
     and deleted_at is null
     and approval_status = 'approved'
     and exists (
       select 1 from projects p
        where p.id = p_project_id and p.customer_id = auth.uid()
     );
$$;

-- ---- 3. Snags for every participant ------------------------
drop policy if exists project_snags_select on project_snags;
create policy project_snags_select on project_snags
  for select using (is_project_participant(project_id));

drop policy if exists project_snags_insert on project_snags;
create policy project_snags_insert on project_snags
  for insert with check (
    reporter_id = auth.uid() and is_project_participant(project_id)
  );

drop policy if exists project_snags_update on project_snags;
create policy project_snags_update on project_snags
  for update using (is_project_participant(project_id))
  with check (is_project_participant(project_id));

-- ---- 4. Participants read each other's profiles ------------
create or replace function public.shares_project_with(p_other uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
      from projects p
     where (
             p.tradesman_id = p_other or p.customer_id = p_other
          or exists (
               select 1 from project_crew c
                where c.project_id = p.id and c.user_id = p_other
                  and c.removed_at is null
             )
           )
       and (
             p.tradesman_id = auth.uid() or p.customer_id = auth.uid()
          or exists (
               select 1 from project_crew c2
                where c2.project_id = p.id and c2.user_id = auth.uid()
                  and c2.removed_at is null
             )
           )
  );
$$;

drop policy if exists profiles_select_coparticipants on profiles;
create policy profiles_select_coparticipants on profiles
  for select using (shares_project_with(id));
