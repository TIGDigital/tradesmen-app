-- ============================================================
-- Row Level Security — ported from 02_Technical_Architecture_and_DB_Schema.md §3
-- Every table gets RLS enabled. If a query would leak data, RLS blocks it.
-- The iOS app uses the user's JWT directly — no service-role from the client.
-- ============================================================

-- ---- §3.1 Helper functions ----

create or replace function public.is_project_participant(p_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.projects
    where id = p_id
      and (tradesman_id = auth.uid() or customer_id = auth.uid())
  );
$$;

create or replace function public.is_project_tradesman(p_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.projects
    where id = p_id and tradesman_id = auth.uid()
  );
$$;

create or replace function public.is_project_crew(p_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.project_crew
    where project_id = p_id
      and user_id = auth.uid()
      and removed_at is null
  );
$$;

create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ---- profiles ----

alter table profiles enable row level security;

create policy profiles_select_own on profiles
  for select using (id = auth.uid());

-- A customer/tradesman can read the OTHER party's profile on a shared project.
create policy profiles_select_counterparty on profiles
  for select using (
    exists (
      select 1 from projects p
      where (p.tradesman_id = auth.uid() and p.customer_id = profiles.id)
         or (p.customer_id = auth.uid() and p.tradesman_id = profiles.id)
    )
  );

create policy profiles_select_public_tradesman on profiles
  for select using (
    role = 'tradesman' and exists (
      select 1 from tradesman_profiles t where t.id = profiles.id and t.verified_at is not null
    )
  );

create policy profiles_update_own on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Insert is handled by the on_auth_user_created trigger (security definer);
-- no policy needed for inserts from the client.

-- ---- tradesman_profiles / customer_profiles / apprentice_profiles ----

alter table tradesman_profiles enable row level security;

create policy tradesman_profiles_select_own on tradesman_profiles
  for select using (id = auth.uid());

create policy tradesman_profiles_select_counterparty on tradesman_profiles
  for select using (
    exists (
      select 1 from projects p
      where p.tradesman_id = tradesman_profiles.id and p.customer_id = auth.uid()
    )
  );

create policy tradesman_profiles_select_public on tradesman_profiles
  for select using (verified_at is not null);

create policy tradesman_profiles_upsert_own on tradesman_profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

alter table customer_profiles enable row level security;

create policy customer_profiles_select_own on customer_profiles
  for select using (id = auth.uid());

create policy customer_profiles_upsert_own on customer_profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

alter table apprentice_profiles enable row level security;

create policy apprentice_profiles_select_own on apprentice_profiles
  for select using (id = auth.uid());

create policy apprentice_profiles_select_lead on apprentice_profiles
  for select using (lead_tradesman_id = auth.uid());

create policy apprentice_profiles_upsert_own on apprentice_profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- ---- push_tokens (each user manages their own) ----

alter table push_tokens enable row level security;

create policy push_tokens_all_own on push_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- projects ----

alter table projects enable row level security;

create policy projects_select_participant on projects
  for select using (
    tradesman_id = auth.uid() or customer_id = auth.uid()
  );

create policy projects_insert_tradesman on projects
  for insert with check (
    tradesman_id = auth.uid()
    and (select role from profiles where id = auth.uid()) = 'tradesman'
  );

create policy projects_update_participant on projects
  for update using (
    tradesman_id = auth.uid() or customer_id = auth.uid()
  ) with check (
    tradesman_id = auth.uid() or customer_id = auth.uid()
  );

-- ---- project_milestones / project_crew / milestone_templates ----

alter table project_milestones enable row level security;

create policy milestones_select_participant on project_milestones
  for select using (is_project_participant(project_id));

create policy milestones_write_tradesman on project_milestones
  for all using (is_project_tradesman(project_id)) with check (is_project_tradesman(project_id));

alter table project_crew enable row level security;

create policy crew_select_crew on project_crew
  for select using (is_project_crew(project_id));

create policy crew_select_customer on project_crew
  for select using (
    exists (select 1 from projects p where p.id = project_id and p.customer_id = auth.uid())
  );

create policy crew_write_lead on project_crew
  for all using (is_project_tradesman(project_id)) with check (is_project_tradesman(project_id));

-- Milestone templates are public read for now (small static data set).
alter table milestone_templates enable row level security;

create policy templates_select_all on milestone_templates
  for select using (true);

-- ---- project_updates / media / reactions / comments ----

alter table project_updates enable row level security;

create policy updates_select on project_updates
  for select using (is_project_participant(project_id));

create policy updates_insert on project_updates
  for insert with check (
    is_project_participant(project_id) and author_id = auth.uid()
  );

create policy updates_update_own on project_updates
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());

alter table project_update_media enable row level security;

create policy media_select on project_update_media
  for select using (
    exists (
      select 1 from project_updates u
      where u.id = update_id and is_project_participant(u.project_id)
    )
  );

create policy media_insert on project_update_media
  for insert with check (
    exists (
      select 1 from project_updates u
      where u.id = update_id and u.author_id = auth.uid()
    )
  );

alter table project_update_reactions enable row level security;

create policy reactions_select on project_update_reactions
  for select using (
    exists (
      select 1 from project_updates u
      where u.id = update_id and is_project_participant(u.project_id)
    )
  );

create policy reactions_write_own on project_update_reactions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table project_update_comments enable row level security;

create policy comments_select on project_update_comments
  for select using (
    exists (
      select 1 from project_updates u
      where u.id = update_id and is_project_participant(u.project_id)
    )
  );

create policy comments_insert on project_update_comments
  for insert with check (
    author_id = auth.uid() and exists (
      select 1 from project_updates u
      where u.id = update_id and is_project_participant(u.project_id)
    )
  );

create policy comments_update_own on project_update_comments
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());

-- ---- messages ----

alter table messages enable row level security;

create policy messages_select on messages
  for select using (is_project_participant(project_id));

create policy messages_insert on messages
  for insert with check (
    is_project_participant(project_id) and sender_id = auth.uid()
  );

-- Mark-as-read by the recipient (sender_id <> auth.uid)
create policy messages_update_read on messages
  for update using (
    is_project_participant(project_id) and sender_id <> auth.uid()
  );

-- ---- apprentice_update_approvals ----

alter table apprentice_update_approvals enable row level security;

create policy approvals_select_participants on apprentice_update_approvals
  for select using (apprentice_id = auth.uid() or lead_id = auth.uid());

create policy approvals_insert_apprentice on apprentice_update_approvals
  for insert with check (apprentice_id = auth.uid());

create policy approvals_update_lead on apprentice_update_approvals
  for update using (lead_id = auth.uid()) with check (lead_id = auth.uid());

-- ---- invoices / invoice_line_items ----

alter table invoices enable row level security;

create policy invoices_select on invoices
  for select using (tradesman_id = auth.uid() or customer_id = auth.uid());

create policy invoices_insert on invoices
  for insert with check (tradesman_id = auth.uid());

create policy invoices_update_tradesman on invoices
  for update using (tradesman_id = auth.uid()) with check (tradesman_id = auth.uid());

alter table invoice_line_items enable row level security;

create policy line_items_select on invoice_line_items
  for select using (
    exists (
      select 1 from invoices i
      where i.id = invoice_id and (i.tradesman_id = auth.uid() or i.customer_id = auth.uid())
    )
  );

create policy line_items_write on invoice_line_items
  for all using (
    exists (
      select 1 from invoices i where i.id = invoice_id and i.tradesman_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from invoices i where i.id = invoice_id and i.tradesman_id = auth.uid()
    )
  );

-- ---- reviews ----

alter table reviews enable row level security;

create policy reviews_select_public on reviews
  for select using (is_public);

create policy reviews_select_participant on reviews
  for select using (tradesman_id = auth.uid() or customer_id = auth.uid());

create policy reviews_insert_customer on reviews
  for insert with check (
    customer_id = auth.uid() and
    exists (
      select 1 from projects p
      where p.id = project_id and p.customer_id = auth.uid() and p.status = 'completed'
    )
  );

create policy reviews_update_response on reviews
  for update using (tradesman_id = auth.uid()) with check (tradesman_id = auth.uid());

-- ---- notifications ----

alter table notifications enable row level security;

create policy notifications_select_own on notifications
  for select using (user_id = auth.uid());

create policy notifications_update_own on notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- site_geofences ----

alter table site_geofences enable row level security;

create policy geofences_select_crew on site_geofences
  for select using (
    (kind = 'project_site' and is_project_crew(project_id)) or
    (kind = 'customer_home' and customer_id = auth.uid())
  );

create policy geofences_insert_lead on site_geofences
  for insert with check (
    (kind = 'project_site' and is_project_tradesman(project_id)) or
    (kind = 'customer_home' and customer_id = auth.uid())
  );

create policy geofences_update_lead on site_geofences
  for update using (
    (kind = 'project_site' and is_project_tradesman(project_id)) or
    (kind = 'customer_home' and customer_id = auth.uid())
  );

-- ---- location_events ----

alter table location_events enable row level security;

-- A user can see their own events, and a participant can see events for their project.
create policy location_events_select_own on location_events
  for select using (user_id = auth.uid());

create policy location_events_select_participant on location_events
  for select using (project_id is not null and is_project_participant(project_id));

create policy location_events_insert_own on location_events
  for insert with check (user_id = auth.uid());

-- ---- nudges ----

alter table nudges enable row level security;

create policy nudges_select_own on nudges
  for select using (user_id = auth.uid());

create policy nudges_update_own on nudges
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- consent_records (append-only; user owns their own log) ----

alter table consent_records enable row level security;

create policy consent_select_own on consent_records
  for select using (user_id = auth.uid());

create policy consent_insert_own on consent_records
  for insert with check (user_id = auth.uid());

-- ---- events (audit; users can write their own, read their own) ----

alter table events enable row level security;

create policy events_select_own on events
  for select using (user_id = auth.uid());

create policy events_insert_own on events
  for insert with check (user_id = auth.uid());
