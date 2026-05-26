-- Projects ecosystem — from 02_Technical_Architecture_and_DB_Schema.md §2.3
-- projects, milestones, milestone templates, project_crew membership.

-- projects
create table projects (
  id uuid primary key default gen_random_uuid(),
  tradesman_id uuid not null references profiles(id),
  customer_id uuid references profiles(id),         -- null until customer accepts invite

  -- Pending customer (used before they sign up)
  pending_customer_name text,
  pending_customer_phone text,                      -- E.164

  title text not null,
  trade_type trade_type not null,
  address_line_1 text,
  address_line_2 text,
  city text,
  postcode text,
  what3words text,                                  -- optional, nice UX touch later

  status project_status not null default 'quote_sent',
  status_reason text,                               -- free-text shown to customer
  delay_reason delay_reason,
  delay_resolved_eta date,

  expected_start_date date,
  expected_end_date date,
  actual_start_date date,
  actual_end_date date,

  cover_photo_url text,
  invite_code text unique,                          -- short code for SMS deep link
  invite_sent_at timestamptz,
  invite_accepted_at timestamptz,

  archived_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint customer_or_pending check (
    customer_id is not null or pending_customer_phone is not null
  )
);

create index on projects (tradesman_id, archived_at);
create index on projects (customer_id, archived_at);
create index on projects (status);
create unique index on projects (invite_code) where invite_code is not null;

-- project_milestones
create table project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  sort_order int not null,                          -- display order, 0-indexed
  status milestone_status not null default 'pending',
  expected_date date,
  completed_at timestamptz,
  requires_customer_approval boolean default false,
  approved_by_customer_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (project_id, sort_order)
);

create index on project_milestones (project_id, sort_order);

-- milestone_templates — preset templates per trade
create table milestone_templates (
  id uuid primary key default gen_random_uuid(),
  trade_type trade_type not null,
  template_name text not null,                      -- e.g. 'Full kitchen install'
  milestones jsonb not null,                        -- ordered array of {title, requires_approval}
  is_default boolean default false,
  created_at timestamptz default now()
);

create index on milestone_templates (trade_type);

-- project_crew — links tradesmen/apprentices to projects they work on
-- The lead tradesman is always auto-inserted on project creation with role_on_project = 'lead'.
create table project_crew (
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role_on_project text not null,                       -- 'lead' | 'apprentice' | 'helper'
  assigned_at timestamptz default now(),
  removed_at timestamptz,
  primary key (project_id, user_id)
);

create index on project_crew (user_id) where removed_at is null;
create index on project_crew (project_id) where removed_at is null;
