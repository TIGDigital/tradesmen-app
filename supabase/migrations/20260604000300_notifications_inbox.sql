-- ============================================================
-- Notifications inbox plumbing.
--
-- The `notifications` table + select/update-own RLS were created in the
-- initial schema. This migration adds:
--   1. INSERT policy so a project participant can persist a notification
--      addressed to the OTHER participant — which is how every push lands
--      in the recipient's inbox once we extend the client to write here
--      alongside the push.
--   2. Realtime publication entry so the inbox screen updates live.
--
-- Idempotent (drop+create on the policy, add table guarded by if not in pub).
-- ============================================================

drop policy if exists notifications_insert_participants on notifications;
create policy notifications_insert_participants on notifications
  for insert
  with check (
    -- You can insert one addressed to yourself (system-style self-notes).
    user_id = auth.uid()
    OR
    -- Or addressed to anyone, as long as YOU are a participant on the
    -- referenced project (so a tradesman can ping their customer, and
    -- vice versa). Without a project_id we refuse — the inbox is meant
    -- for project-scoped events.
    (
      project_id IS NOT NULL
      AND EXISTS (
        SELECT 1
          FROM projects p
         WHERE p.id = project_id
           AND (p.tradesman_id = auth.uid() OR p.customer_id = auth.uid())
      )
    )
  );

-- Realtime publication. The `add table` statement errors if the table is
-- already a member, so wrap it in a DO block that checks first.
do $$
begin
  if not exists (
    select 1
      from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table notifications;
  end if;
end$$;
