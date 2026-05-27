-- ============================================================
-- Allow project participants to read each other's push tokens.
-- Tradesman needs customer tokens to fire a push when an update is sent.
-- (For MVP. V1 should move sending to an Edge Function with service role.)
-- ============================================================

create policy "push_tokens_select_counterparty" on push_tokens
  for select
  to authenticated
  using (
    exists (
      select 1 from projects p
      where (p.tradesman_id = auth.uid() and p.customer_id = push_tokens.user_id)
         or (p.customer_id  = auth.uid() and p.tradesman_id = push_tokens.user_id)
    )
  );
