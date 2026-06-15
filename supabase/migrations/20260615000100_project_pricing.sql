-- ============================================================
-- Project pricing + change requests (Sprint 51).
--
-- Phase's wedge promise: "we'll never leave you wondering".
-- Surprise bills are the #1 wonder moment in UK home-improvement
-- projects. This adds a simple, transparent pricing system:
--
--   * projects.quoted_amount = the live agreed price
--   * project_price_changes  = every proposed change, with status
--                              (pending/approved/rejected) and a
--                              required reason from the tradesman
--
-- Customer must approve before the live quoted_amount moves.
-- All changes — accepted or rejected — stay in the audit log.
-- ============================================================

-- 1. Live quoted amount on the project itself.
alter table projects
  add column if not exists quoted_amount numeric(12, 2),
  add column if not exists quoted_amount_set_at timestamptz;

-- 2. Audit log + pending request table.
create table if not exists project_price_changes (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  proposed_by     uuid not null references profiles(id) on delete cascade,
  previous_amount numeric(12, 2),
  proposed_amount numeric(12, 2) not null,
  reason          text not null,
  status          text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  responded_by    uuid references profiles(id) on delete set null,
  responded_at    timestamptz,
  response_note   text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_price_changes_project
  on project_price_changes (project_id, created_at desc);
create index if not exists idx_price_changes_pending
  on project_price_changes (project_id) where status = 'pending';

-- 3. RLS — project participants (customer + lead + crew) can read;
--    lead can propose; customer can approve / reject.
alter table project_price_changes enable row level security;

drop policy if exists price_changes_read on project_price_changes;
create policy price_changes_read on project_price_changes
  for select using (
    exists (
      select 1 from projects p
       where p.id = project_price_changes.project_id
         and (
           p.customer_id = auth.uid()
           or p.tradesman_id = auth.uid()
           or exists (
             select 1 from project_crew pc
              where pc.project_id = p.id and pc.user_id = auth.uid()
           )
         )
    )
  );

drop policy if exists price_changes_lead_propose on project_price_changes;
create policy price_changes_lead_propose on project_price_changes
  for insert with check (
    proposed_by = auth.uid()
    and exists (
      select 1 from projects p
       where p.id = project_price_changes.project_id
         and p.tradesman_id = auth.uid()
    )
  );

drop policy if exists price_changes_customer_respond on project_price_changes;
create policy price_changes_customer_respond on project_price_changes
  for update using (
    exists (
      select 1 from projects p
       where p.id = project_price_changes.project_id
         and p.customer_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from projects p
       where p.id = project_price_changes.project_id
         and p.customer_id = auth.uid()
    )
  );

-- Lead can withdraw their own pending proposal (typo, changed mind).
drop policy if exists price_changes_lead_withdraw on project_price_changes;
create policy price_changes_lead_withdraw on project_price_changes
  for update using (
    proposed_by = auth.uid() and status = 'pending'
  ) with check (
    proposed_by = auth.uid()
  );

-- 4. When a change is approved, sync the projects.quoted_amount.
--    Trigger fires on UPDATE to status, so withdraw/reject are no-ops.
create or replace function public.apply_approved_price_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.status = 'approved' and OLD.status = 'pending' then
    update projects
       set quoted_amount = NEW.proposed_amount,
           quoted_amount_set_at = now()
     where id = NEW.project_id;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_apply_approved_price_change on project_price_changes;
create trigger trg_apply_approved_price_change
  after update on project_price_changes
  for each row execute function public.apply_approved_price_change();

-- 5. Realtime — both parties see decisions land live without refresh.
alter publication supabase_realtime add table project_price_changes;
