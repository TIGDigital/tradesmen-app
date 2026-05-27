-- ============================================================
-- Add tables to the supabase_realtime publication so client subscriptions
-- via supabase.channel('...').on('postgres_changes', ...) receive events.
-- ============================================================
-- alter publication ... add table — Postgres errors if the table is already
-- in the publication. We guard with a DO block.

do $$
begin
  -- project_updates: new updates appear live in the feed
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'project_updates'
  ) then
    alter publication supabase_realtime add table project_updates;
  end if;

  -- reactions: live count updates as people react
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'project_update_reactions'
  ) then
    alter publication supabase_realtime add table project_update_reactions;
  end if;

  -- media: photos appearing after the row is uploaded
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'project_update_media'
  ) then
    alter publication supabase_realtime add table project_update_media;
  end if;
end$$;
