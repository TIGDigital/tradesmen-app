-- Updates, reactions, comments, messages, apprentice approval queue.
-- From 02_Technical_Architecture_and_DB_Schema.md §2.3

-- project_updates — the timeline feed
create table project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  author_id uuid not null references profiles(id),
  type update_type not null default 'progress',
  body text,                                        -- text, optional if media-only
  voice_note_url text,
  voice_note_transcript text,
  milestone_id uuid references project_milestones(id),

  -- ETA-specific
  eta_minutes int,                                  -- for type='eta'
  eta_at timestamptz,

  -- Delay-specific
  delay_reason delay_reason,
  delay_new_eta date,

  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz default now()
);

create index on project_updates (project_id, created_at desc);
create index on project_updates (project_id) where deleted_at is null;

-- project_update_media
create table project_update_media (
  id uuid primary key default gen_random_uuid(),
  update_id uuid not null references project_updates(id) on delete cascade,
  storage_path text not null,                       -- Supabase Storage path
  media_type text not null,                         -- 'photo' (MVP) / 'video' (V1)
  width int,
  height int,
  bytes int,
  blurhash text,                                    -- for skeleton loading
  sort_order int not null default 0,
  created_at timestamptz default now()
);

create index on project_update_media (update_id, sort_order);

-- project_update_reactions
create table project_update_reactions (
  update_id uuid not null references project_updates(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  kind reaction_kind not null,
  created_at timestamptz default now(),
  primary key (update_id, user_id)
);

-- project_update_comments
create table project_update_comments (
  id uuid primary key default gen_random_uuid(),
  update_id uuid not null references project_updates(id) on delete cascade,
  author_id uuid not null references profiles(id),
  body text not null,
  deleted_at timestamptz,
  created_at timestamptz default now()
);

create index on project_update_comments (update_id, created_at);

-- messages — 1:1 chat per project
create table messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  type message_type not null default 'text',
  body text,
  attachment_url text,                              -- for photo/voice
  attachment_duration_ms int,                       -- for voice
  read_at timestamptz,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz default now()
);

create index on messages (project_id, created_at desc);
create index on messages (project_id, read_at) where read_at is null;

-- apprentice_update_approvals — lead-tradesman approval queue
-- When an apprentice composes an update, it lands here as a draft until the lead approves.
create table apprentice_update_approvals (
  id uuid primary key default gen_random_uuid(),
  draft_update_id uuid not null references project_updates(id) on delete cascade,
  apprentice_id uuid not null references profiles(id),
  lead_id uuid not null references profiles(id),
  project_id uuid not null references projects(id) on delete cascade,
  status text not null default 'pending',              -- 'pending' | 'approved' | 'rejected' | 'edited'
  reviewed_at timestamptz,
  reviewer_notes text,
  created_at timestamptz default now()
);

create index on apprentice_update_approvals (lead_id, status) where status = 'pending';
