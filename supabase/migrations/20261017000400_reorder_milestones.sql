-- ============================================================
-- Atomic milestone reorder for drag-and-drop (Todd, 17 Oct).
-- One RPC call persists the whole new order instead of N row
-- updates racing each other. Lead-only; ids outside the project
-- are ignored by the join.
-- ============================================================

create or replace function public.reorder_milestones(
  p_project_id uuid,
  p_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from projects p
     where p.id = p_project_id and p.tradesman_id = auth.uid()
  ) then
    raise exception 'Only the project lead can reorder milestones';
  end if;

  -- Two-phase write: (project_id, sort_order) is UNIQUE, and a single
  -- UPDATE checks the constraint per row — the naive version collides
  -- mid-statement. Park every row far out of range first, then land
  -- the final order. Atomic inside this function's transaction.
  update project_milestones
     set sort_order = sort_order + 100000
   where project_id = p_project_id;

  update project_milestones m
     set sort_order = u.ord
    from (
      select id, ordinality - 1 as ord
        from unnest(p_ids) with ordinality as t(id, ordinality)
    ) u
   where m.id = u.id
     and m.project_id = p_project_id;
end;
$$;

revoke all on function public.reorder_milestones(uuid, uuid[]) from public;
grant execute on function public.reorder_milestones(uuid, uuid[]) to authenticated;
