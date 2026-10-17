-- ============================================================
-- Beta backlog batch (Todd, 17 Oct): snag severity + fix-by dates,
-- and customer read receipts on updates.
--
-- 1. project_snags.severity — low / normal / urgent. Urgent snags also
--    push to the crew, not just the counterparty (client-side routing).
--    project_snags.due_date — the trade side's "fix by" commitment.
-- 2. project_updates.customer_seen_at — set once, by the customer,
--    through the mark_updates_seen RPC (no raw column UPDATE policy, so
--    nobody can unsee or forge it). Tradesman UI shows "Seen ✓".
-- ============================================================

alter table project_snags
  add column if not exists severity text not null default 'normal'
    check (severity in ('low', 'normal', 'urgent'));

alter table project_snags
  add column if not exists due_date date;

alter table project_updates
  add column if not exists customer_seen_at timestamptz;

create or replace function public.mark_updates_seen(p_project_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update project_updates
     set customer_seen_at = now()
   where project_id = p_project_id
     and customer_seen_at is null
     and deleted_at is null
     and exists (
       select 1 from projects p
        where p.id = p_project_id and p.customer_id = auth.uid()
     );
$$;

revoke all on function public.mark_updates_seen(uuid) from public;
grant execute on function public.mark_updates_seen(uuid) to authenticated;
