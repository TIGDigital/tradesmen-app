-- Invoices, reviews, notifications, geofences, location events, nudges, consent, audit events.
-- From 02_Technical_Architecture_and_DB_Schema.md §2.3

-- invoices
create table invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  tradesman_id uuid not null references profiles(id),
  customer_id uuid references profiles(id),

  kind invoice_kind not null,
  status invoice_status not null default 'draft',

  -- Money (pence to avoid float)
  subtotal_pence int not null,                      -- before VAT
  vat_rate numeric(4,3) default 0.200,              -- UK standard 20%, 0% if not VAT-registered
  vat_pence int not null,
  total_pence int not null,
  currency char(3) not null default 'GBP',

  -- Stripe
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  paid_at timestamptz,

  due_date date,
  sent_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references profiles(id),
  notes text,
  pdf_url text,                                     -- generated PDF in storage

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on invoices (project_id, kind);
create index on invoices (tradesman_id, status);
create index on invoices (customer_id, status);

-- invoice_line_items
create table invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price_pence int not null,
  total_pence int not null,
  sort_order int not null default 0
);

create index on invoice_line_items (invoice_id, sort_order);

-- reviews
create table reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade unique,
  tradesman_id uuid not null references profiles(id),
  customer_id uuid not null references profiles(id),
  rating int not null check (rating between 1 and 5),
  body text,
  tradesman_response text,
  tradesman_responded_at timestamptz,
  is_public boolean default true,
  created_at timestamptz default now()
);

create index on reviews (tradesman_id, is_public, created_at desc);

-- notifications
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind notification_kind not null,
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  body text not null,
  data jsonb default '{}'::jsonb,                   -- deep-link payload for tap
  read_at timestamptz,
  sent_at timestamptz,                              -- when push was delivered
  created_at timestamptz default now()
);

create index on notifications (user_id, created_at desc);
create index on notifications (user_id, read_at) where read_at is null;

-- site_geofences — one per project (and customer home anchor)
-- Only the anchor + radius is stored. No continuous location traces.
create table site_geofences (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  customer_id uuid references profiles(id) on delete cascade,    -- for home-anchor type
  kind text not null,                                  -- 'project_site' | 'customer_home'
  -- Anchor
  latitude numeric(9,6) not null,
  longitude numeric(9,6) not null,
  radius_meters int not null default 80,
  -- For audit + display
  address_label text,                                  -- "23 Beech Road, SW19 4QP"
  -- Expected working window (used to suppress events outside this)
  working_hours_start time default '06:30',
  working_hours_end time default '20:00',
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint project_or_customer check (
    (project_id is not null and customer_id is null and kind = 'project_site') or
    (project_id is null and customer_id is not null and kind = 'customer_home')
  )
);

create index on site_geofences (project_id) where active and kind = 'project_site';
create index on site_geofences (customer_id) where active and kind = 'customer_home';

-- location_events — discrete arrival/leave events
-- Retention policy: rows older than 90 days are aggregated to daily summaries and deleted.
create table location_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  geofence_id uuid references site_geofences(id) on delete set null,
  kind location_event_kind not null,
  occurred_at timestamptz not null default now(),
  -- iOS context (for diagnostics, not surveillance)
  device_id text,
  app_state text,                                      -- 'foreground' | 'background' | 'killed'
  -- Debounce / quality
  is_confirmed boolean default false,                  -- set true after 90s debounce passes
  superseded_by uuid references location_events(id),   -- if a quick reversal cancels this event
  created_at timestamptz default now()
);

create index on location_events (user_id, occurred_at desc);
create index on location_events (project_id, occurred_at desc) where project_id is not null;
create index on location_events (project_id, kind, occurred_at desc);

-- nudges — scheduled or fired prompts to a user
create table nudges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  trigger_event_id uuid references location_events(id),     -- e.g. the left_site event
  kind text not null,                                  -- 'leave_site' | 'no_update_3d' | 'apprentice_eod'
  scheduled_for timestamptz not null,
  fired_at timestamptz,
  dismissed_at timestamptz,
  acted_at timestamptz,                                -- they actually sent the update
  result_update_id uuid references project_updates(id),
  created_at timestamptz default now()
);

create index on nudges (user_id, scheduled_for) where fired_at is null;
create index on nudges (project_id, kind, fired_at desc);

-- consent_records — append-only consent log (GDPR-defensible)
-- A user revoking consent does not delete prior rows; it adds a new row with status='revoked'.
create table consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  purpose consent_purpose not null,
  status consent_status not null,
  granted_at timestamptz,
  revoked_at timestamptz,
  -- Audit context
  source text,                                         -- 'onboarding' | 'settings' | 'admin'
  ios_permission_state text,                           -- 'whenInUse' | 'denied' | 'restricted' etc.
  privacy_policy_version text,                         -- the version they agreed to
  created_at timestamptz default now()
);

create index on consent_records (user_id, purpose, created_at desc);

-- events — product analytics + audit (low-volume; heavy analytics go to PostHog)
create table events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  project_id uuid references projects(id) on delete cascade,
  event_name text not null,
  properties jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index on events (event_name, created_at desc);
create index on events (user_id, created_at desc);
create index on events (project_id, created_at desc);
