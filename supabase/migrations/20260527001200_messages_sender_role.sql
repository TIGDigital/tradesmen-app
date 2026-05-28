-- ============================================================
-- Add sender_role to messages so the chat can distinguish "from tradesman"
-- vs "from customer" without relying on sender_id alone. Lets dev-mode
-- role-switching (same auth.uid on both sides of a project) render bubbles
-- correctly. In prod where each user has one role this is just metadata.
-- ============================================================

alter table messages
  add column if not exists sender_role user_role;

-- Backfill: any existing message gets the sender's CURRENT role.
update messages m
set sender_role = p.role
from profiles p
where p.id = m.sender_id
  and m.sender_role is null;
