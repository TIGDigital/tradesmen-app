-- ============================================================
-- Itemised quotes (beta feedback 16 Oct, design agreed with Todd:
-- itemised builder + optional PDF attach, one VAT toggle, in-app
-- customer approval).
--
-- Model: a quote is composed and SENT in one step (no draft state).
-- The customer approves or declines in-app. Approval is an atomic
-- SECURITY DEFINER RPC (lesson from the crew-invite bug — no
-- cross-table client-side mutations):
--   * first approved quote sets projects.quoted_amount (the agreed
--     price the rest of the app already uses)
--   * approving when a price already exists also writes an approved
--     project_price_changes row, so the "no surprise bills" audit
--     trail stays complete.
-- ============================================================

create table if not exists project_quotes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  created_by uuid not null references profiles(id),
  status text not null default 'sent'
    check (status in ('sent', 'approved', 'rejected', 'withdrawn')),
  vat_registered boolean not null default false,
  vat_rate numeric not null default 20,
  discount_amount numeric not null default 0 check (discount_amount >= 0),
  notes text,
  pdf_document_id uuid references project_documents(id) on delete set null,
  subtotal numeric not null default 0,
  vat_amount numeric not null default 0,
  total numeric not null default 0 check (total >= 0),
  decided_by uuid references profiles(id),
  decided_at timestamptz,
  response_note text,
  created_at timestamptz not null default now()
);

create table if not exists project_quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references project_quotes(id) on delete cascade,
  description text not null,
  qty numeric not null default 1 check (qty > 0),
  unit_price numeric not null default 0 check (unit_price >= 0),
  sort_order int not null default 0
);

create index if not exists project_quotes_project_idx on project_quotes (project_id, created_at desc);
create index if not exists project_quote_items_quote_idx on project_quote_items (quote_id, sort_order);

alter table project_quotes enable row level security;
alter table project_quote_items enable row level security;

-- Participants (lead, customer, live crew) can read quotes.
drop policy if exists quotes_select_participants on project_quotes;
create policy quotes_select_participants on project_quotes
  for select using (
    is_project_tradesman(project_id)
    or is_project_crew(project_id)
    or exists (
      select 1 from projects p
       where p.id = project_quotes.project_id and p.customer_id = auth.uid()
    )
  );

-- Only the lead creates or withdraws quotes. Customer decisions go
-- through the decide_quote RPC, never direct updates.
drop policy if exists quotes_insert_lead on project_quotes;
create policy quotes_insert_lead on project_quotes
  for insert with check (is_project_tradesman(project_id) and created_by = auth.uid());

drop policy if exists quotes_update_lead on project_quotes;
create policy quotes_update_lead on project_quotes
  for update using (is_project_tradesman(project_id))
  with check (is_project_tradesman(project_id));

drop policy if exists quote_items_select_participants on project_quote_items;
create policy quote_items_select_participants on project_quote_items
  for select using (
    exists (select 1 from project_quotes q where q.id = quote_id)
  );

drop policy if exists quote_items_insert_lead on project_quote_items;
create policy quote_items_insert_lead on project_quote_items
  for insert with check (
    exists (
      select 1 from project_quotes q
       where q.id = quote_id and is_project_tradesman(q.project_id)
    )
  );

-- Customer decision: atomic, race-safe, keeps the price audit honest.
create or replace function public.decide_quote(
  p_quote_id uuid,
  p_approve boolean,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote project_quotes%rowtype;
  v_uid uuid := auth.uid();
  v_prev numeric;
begin
  if v_uid is null then
    raise exception 'Not signed in';
  end if;

  select * into v_quote from project_quotes where id = p_quote_id for update;
  if not found then
    raise exception 'Quote not found';
  end if;

  if not exists (
    select 1 from projects p
     where p.id = v_quote.project_id and p.customer_id = v_uid
  ) then
    raise exception 'Only the customer on this project can decide a quote';
  end if;

  if v_quote.status <> 'sent' then
    raise exception 'This quote has already been %', v_quote.status;
  end if;

  update project_quotes
     set status = case when p_approve then 'approved' else 'rejected' end,
         decided_by = v_uid,
         decided_at = now(),
         response_note = p_note
   where id = p_quote_id;

  if p_approve then
    select quoted_amount into v_prev from projects where id = v_quote.project_id for update;

    if v_prev is not null and v_prev <> v_quote.total then
      -- Price already existed: record the move in the audit log, pre-approved
      -- because the customer just approved the quote that carries it.
      insert into project_price_changes
        (project_id, proposed_by, previous_amount, proposed_amount, reason,
         status, responded_by, responded_at)
      values
        (v_quote.project_id, v_quote.created_by, v_prev, v_quote.total,
         'Itemised quote approved', 'approved', v_uid, now());
    end if;

    update projects
       set quoted_amount = v_quote.total,
           quoted_amount_set_at = coalesce(quoted_amount_set_at, now())
     where id = v_quote.project_id;
  end if;
end;
$$;

revoke all on function public.decide_quote(uuid, boolean, text) from public;
grant execute on function public.decide_quote(uuid, boolean, text) to authenticated;
