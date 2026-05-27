-- ============================================================
-- Allow customers to preview + accept a project invite by invite_code.
-- For MVP: any authenticated user can read pending-invite projects (customer_id null)
-- and can update one to set themselves as the customer.
-- V1 hardening: move acceptance to an Edge Function with service-role to remove
-- the open-read window on pending invites.
-- ============================================================

-- Preview: any signed-in user can SELECT a project that's awaiting a customer.
-- Client filters by invite_code so they only see the one they typed.
create policy "projects_select_by_invite" on projects
  for select
  to authenticated
  using (
    invite_code is not null
    and customer_id is null
  );

-- Acceptance: signed-in user can claim a pending-invite project by setting
-- customer_id to themselves. Their role must be 'customer'.
create policy "projects_update_accept_invite" on projects
  for update
  to authenticated
  using (
    invite_code is not null
    and customer_id is null
    and (select role from profiles where id = auth.uid()) = 'customer'
  )
  with check (
    customer_id = auth.uid()
  );

-- Read tradesman profile for preview (they're not yet a counterparty).
create policy "profiles_select_tradesman_for_invite" on profiles
  for select
  to authenticated
  using (
    role = 'tradesman'
    and exists (
      select 1 from projects p
      where p.tradesman_id = profiles.id
        and p.invite_code is not null
        and p.customer_id is null
    )
  );
