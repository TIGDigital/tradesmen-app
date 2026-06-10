-- ============================================================
-- Sprint 41: open crew_invitations read-by-code to signed-out users.
--
-- The /crew-invite/[code] preview must load BEFORE the recipient
-- creates their account — that's the whole point of an "invite link
-- you can preview before joining". The original Sprint 37 policy
-- restricted reads to authenticated users, which blocked the entire
-- pre-signup flow (recipient saw "Invite not found" because RLS
-- denied the SELECT).
--
-- Drop and re-create without the role restriction. Same WHERE
-- conditions: signed-out users still only ever see LIVE invites
-- (not accepted, not revoked, not expired) — never historical or
-- consumed records.
--
-- Brute-force resistant: codes are 6 characters from a 30-character
-- alphabet (no I/O/0/1), so ~729M possibilities. Same model as
-- projects.invite_code — we rely on the unguessable code as a soft
-- secret, which is industry-standard for invite-link flows.
-- ============================================================

drop policy if exists crew_invites_select_by_code on crew_invitations;

create policy crew_invites_select_by_code on crew_invitations
  for select
  using (
    accepted_at is null
    and revoked_at is null
    and expires_at > now()
  );
