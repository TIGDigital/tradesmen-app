-- ============================================================
-- Pushes are sent client-side, so the ACTING user must be able to
-- read the recipient's push tokens. The old counterparty policy only
-- covered the tradesman<->customer pair: crew actions could never
-- push anyone (23 Oct beta: "tradesman still not receiving push").
-- New rule: any active participant on a shared project (lead,
-- customer, active crew) can read fellow participants' tokens.
-- ============================================================

drop policy if exists push_tokens_select_counterparty on push_tokens;

create policy push_tokens_select_participants on push_tokens
  for select using (
    exists (
      select 1
        from projects p
       where (
               p.tradesman_id = auth.uid()
            or p.customer_id = auth.uid()
            or exists (
                 select 1 from project_crew c
                  where c.project_id = p.id
                    and c.user_id = auth.uid()
                    and c.removed_at is null
               )
             )
         and (
               p.tradesman_id = push_tokens.user_id
            or p.customer_id = push_tokens.user_id
            or exists (
                 select 1 from project_crew c2
                  where c2.project_id = p.id
                    and c2.user_id = push_tokens.user_id
                    and c2.removed_at is null
               )
             )
    )
  );
