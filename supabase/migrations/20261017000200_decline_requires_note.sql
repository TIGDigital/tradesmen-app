-- ============================================================
-- Declining a quote requires a reason (Todd, 17 Oct). The client
-- prompts for it; this enforces it server-side too, so no client
-- path can record a silent decline. Replaces decide_quote from
-- 20261017000100 with one added guard.
-- ============================================================

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

  if not p_approve and (p_note is null or length(trim(p_note)) = 0) then
    raise exception 'Please add a note saying why you are declining';
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
