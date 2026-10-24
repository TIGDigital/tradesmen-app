-- ============================================================
-- Sim re-test findings (24 Oct): two RLS holes with the same root
-- cause — policies that only know the tradesman/customer pair.
--
-- 1. notifications INSERT only allowed the lead or customer to
--    write rows for other users, so a crew member's "update waiting
--    for your approval" row for the lead silently failed
--    ([recordNotification] failed ... row-level security).
--
-- 2. push_tokens upsert (onConflict: token) failed for the SECOND
--    account to sign in on a device: the existing row belongs to the
--    first user, and the update policy (user_id = auth.uid()) blocks
--    reassigning it. Result: pushes for the new user keep landing on
--    whoever registered the device first — the "snag notification
--    went to the customer on the crew account's phone" bug.
-- ============================================================

-- ---- Two-arg membership helper -------------------------------
-- The existing helpers (is_project_participant etc.) hardcode
-- auth.uid(); notification rows need the same question asked about
-- the RECIPIENT, so this takes the user explicitly.
create or replace function public.is_project_member(p_project_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from projects p
     where p.id = p_project_id
       and (p.tradesman_id = p_user_id or p.customer_id = p_user_id)
  )
  or exists (
    select 1 from project_crew c
     where c.project_id = p_project_id
       and c.user_id = p_user_id
       and c.removed_at is null
  );
$$;

revoke all on function public.is_project_member(uuid, uuid) from public;
grant execute on function public.is_project_member(uuid, uuid) to authenticated;

-- ---- notifications: any member may notify any fellow member ---
drop policy if exists notifications_insert_participants on public.notifications;
create policy notifications_insert_participants on public.notifications
  for insert to authenticated
  with check (
    user_id = auth.uid()
    or (
      project_id is not null
      and public.is_project_member(project_id, auth.uid())  -- sender is on the project
      and public.is_project_member(project_id, user_id)     -- recipient is too
    )
  );

-- ---- project_updates: the lead moderates the feed --------------
-- Sim re-test: Dave tapping Approve on Laura's pending update hit
-- "Cannot coerce the result to a single JSON object" — the only
-- UPDATE policy was updates_update_own (author_id = auth.uid()),
-- so the approve/reject UPDATE matched zero rows for the lead.
-- The approval loop shipped without the policy that powers it.
create policy updates_update_lead on public.project_updates
  for update to authenticated
  using (public.is_project_tradesman(project_id))
  with check (public.is_project_tradesman(project_id));

-- ---- push_tokens: the signed-in user owns the device ----------
-- A push token identifies a DEVICE, not an account. When a new
-- account signs in on a device, the upsert's UPDATE path must be
-- able to take the token row over from the previous user. Tokens
-- are high-entropy values only the device itself knows, so letting
-- an authenticated caller claim a row for a token they can present
-- is safe; WITH CHECK still forces the row onto their own user_id.
drop policy if exists push_tokens_update_claim_device on public.push_tokens;
create policy push_tokens_update_claim_device on public.push_tokens
  for update to authenticated
  using (true)
  with check (user_id = auth.uid());
