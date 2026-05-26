# Tradesmen Uber — Technical Architecture & Database Schema

**Deliverable 2 of 4** · References Deliverable 1 (MVP Product Strategy)
*Stack: Expo (React Native) + TypeScript + Supabase (Postgres / Auth / Realtime / Storage / Edge Functions) + Stripe Connect + Twilio + Expo Push*

---

## 1. Architecture at a glance

```
┌──────────────────────────────────────────────────────────────────────┐
│                            iOS APP (Expo / RN)                       │
│  TypeScript · Zustand · TanStack Query · Expo Router · Expo Push     │
│  React Native Reanimated · Expo Haptics · Expo Image · Expo Camera   │
└─────────────────┬─────────────────────────────────┬──────────────────┘
                  │ HTTPS (PostgREST + RPC)         │ WebSocket (CDC)
                  ▼                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                              SUPABASE                                │
│  ┌────────────┐  ┌────────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │  Postgres  │  │  Realtime  │  │ Storage  │  │ Edge Functions   │  │
│  │  + RLS     │  │  (CDC)     │  │ (S3)     │  │ (Deno)           │  │
│  └────────────┘  └────────────┘  └──────────┘  └──────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Auth (email, Apple, Google) + JWT session                      │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──┬──────────────┬───────────────┬──────────────┬────────────────────┘
   │              │               │              │
   ▼              ▼               ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐
│  Stripe  │  │  Twilio  │  │  Expo    │  │  Sentry      │
│  Connect │  │  Verify  │  │  Push    │  │  PostHog     │
│  + UK    │  │  + SMS   │  │  Service │  │  Resend      │
└──────────┘  └──────────┘  └──────────┘  └──────────────┘
```

**Why this shape (solo-founder bias):** the client talks directly to Postgres via PostgREST (Supabase's auto-API) for 90% of reads/writes, secured by RLS. Custom logic (SMS invites, Stripe webhooks, push fan-out, **geofence event handling, leave-site nudges**, weekly digests) lives in Edge Functions. No bespoke backend server to maintain, no Docker, no infra costs until Supabase Pro tier kicks in (~£20/month, billed in USD).

**Location handling (added in this revision):** location is on-device first. `expo-location` registers project geofences locally on the iOS device — iOS fires `arrived` / `left` callbacks even when the app is backgrounded. The app posts these as `location_events` to Supabase via a thin Edge Function. We never poll GPS continuously; we never store a continuous breadcrumb trail. The only location data at rest is **events** (entered/left a known geofence) and **geofence definitions** (project address + radius).

**Scaling expectation:** this architecture is comfortable to ~5,000 DAUs / ~10,000 active projects. Beyond that, move heavy reads to a read replica and consider a thin BFF layer in Node/Bun if RLS performance becomes a bottleneck.

---

## 2. Database schema (Postgres 15+)

### 2.1 Naming conventions
- Tables: `snake_case`, plural (`projects`, `project_updates`)
- Columns: `snake_case`
- Primary keys: `id uuid primary key default gen_random_uuid()`
- Foreign keys: `<table_singular>_id` (e.g. `project_id`)
- Timestamps: every table has `created_at timestamptz default now()` and `updated_at timestamptz default now()` (managed by trigger)
- Soft-delete: `deleted_at timestamptz null` where audit-relevant; hard-delete for everything else

### 2.2 Enums

```sql
create type user_role as enum ('customer', 'tradesman', 'apprentice', 'admin');

create type trade_type as enum (
  'builder', 'kitchen_fitter', 'bathroom_fitter', 'electrician',
  'plumber', 'roofer', 'plasterer', 'painter_decorator',
  'landscaper', 'tiler', 'carpenter', 'flooring', 'hvac', 'general', 'other'
);

create type project_status as enum (
  'quote_sent',          -- Awaiting customer approval of quote
  'scheduled',           -- Approved, start date set, not started
  'materials_ordered',   -- Materials lead time blocking start
  'in_progress',         -- Active work happening
  'delayed',             -- Off track with a reason recorded
  'awaiting_approval',   -- Tradesman needs customer sign-off (e.g. milestone)
  'awaiting_inspection', -- Pending third-party inspection (Building Control etc.)
  'completed'            -- Final invoice paid, review prompted
);

create type milestone_status as enum (
  'pending', 'in_progress', 'awaiting_approval', 'completed', 'skipped'
);

create type update_type as enum (
  'progress',     -- standard "here's what happened today" update
  'milestone',    -- auto-generated when a milestone changes state
  'status',       -- auto-generated when project status changes
  'eta',          -- "on my way" / arrival update
  'delay',        -- delay notification with reason
  'system'        -- system messages e.g. "Customer joined the project"
);

create type message_type as enum ('text', 'photo', 'voice', 'system');

create type invoice_status as enum (
  'draft', 'sent', 'approved', 'paid', 'overdue', 'void', 'refunded'
);

create type invoice_kind as enum ('quote', 'deposit', 'milestone', 'final');

create type notification_kind as enum (
  'new_update', 'new_message', 'status_change', 'milestone_complete',
  'eta_arrival', 'invoice_sent', 'invoice_paid', 'review_requested',
  'project_invite', 'nudge',
  'arrived_at_site',          -- tradesman/apprentice entered a project geofence
  'left_site',                -- they left it
  'leave_site_nudge',         -- prompt to send End-of-Day update
  'apprentice_update_pending' -- apprentice update awaiting lead approval
);

create type location_event_kind as enum (
  'arrived_at_site',
  'left_site',
  'home_geofence_set',         -- diagnostic: customer's home anchor created
  'manual_on_my_way'           -- fallback when geofence misses (signal/battery)
);

create type consent_purpose as enum (
  'location_geofence',         -- arrival/left events on project sites
  'location_home_anchor',      -- customer's home address geofence
  'push_notifications',
  'analytics',
  'marketing_email'
);

create type consent_status as enum ('granted', 'denied', 'revoked');

create type delay_reason as enum (
  'weather', 'materials', 'other_trade', 'customer_change',
  'illness', 'inspection', 'other'
);

create type reaction_kind as enum ('thumbs_up', 'question', 'heart');
```

### 2.3 Core tables

#### `profiles` — extends Supabase's `auth.users`
```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  full_name text not null,
  avatar_url text,
  phone text,                       -- E.164, verified separately
  phone_verified_at timestamptz,
  email text,                       -- denormalised from auth.users for query convenience
  marketing_opt_in boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on profiles (role);
```

#### `tradesman_profiles` — 1:1 with `profiles` where role = tradesman
```sql
create table tradesman_profiles (
  id uuid primary key references profiles(id) on delete cascade,
  business_name text not null,
  primary_trade trade_type not null,
  secondary_trades trade_type[] default '{}',
  years_trading int,
  service_postcodes text[] default '{}',  -- e.g. ['SW1','SE1','SE15']
  bio text,
  logo_url text,
  website text,

  -- UK verification fields (manual review in MVP, automated in V1)
  gas_safe_number text,
  niceic_number text,
  cscs_card_number text,
  insurance_provider text,
  insurance_expiry date,
  vat_number text,                  -- only if VAT-registered
  utr_number text,                  -- HMRC Unique Taxpayer Reference

  verified_at timestamptz,          -- founder/admin sets after manual review
  verified_by uuid references profiles(id),

  -- Stripe Connect
  stripe_account_id text unique,
  stripe_charges_enabled boolean default false,
  stripe_payouts_enabled boolean default false,

  -- Subscription (kicks in V1)
  subscription_tier text default 'free',     -- 'free' | 'pro' | 'team'
  subscription_status text,                  -- 'active' | 'past_due' | 'canceled'
  subscription_period_end timestamptz,

  -- Derived stats (updated by triggers / cron)
  total_projects int default 0,
  completed_projects int default 0,
  avg_rating numeric(2,1),
  total_reviews int default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on tradesman_profiles (primary_trade);
create index on tradesman_profiles using gin (service_postcodes);
create index on tradesman_profiles (verified_at) where verified_at is not null;
```

#### `customer_profiles` — 1:1 where role = customer
```sql
create table customer_profiles (
  id uuid primary key references profiles(id) on delete cascade,
  notification_preferences jsonb default '{
    "push_updates": true,
    "push_messages": true,
    "push_eta": true,
    "push_arrival": true,
    "email_digest": true
  }'::jsonb,
  -- Home address (used for the home-anchor geofence, optional)
  home_address_line_1 text,
  home_address_line_2 text,
  home_city text,
  home_postcode text,
  home_geofence_consent boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

#### `apprentice_profiles` — 1:1 where role = apprentice
```sql
create table apprentice_profiles (
  id uuid primary key references profiles(id) on delete cascade,
  lead_tradesman_id uuid references profiles(id),     -- the employer / lead they report to
  employer_code text,                                  -- short code from lead during onboarding
  trade_focus trade_type,                              -- what they're learning
  start_date date,
  hourly_rate_pence int,                               -- optional, for V1 payroll-proof feature
  -- Consent + visibility (apprentice can toggle)
  share_location_with_lead boolean default true,
  share_shift_logs boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on apprentice_profiles (lead_tradesman_id);
create unique index on apprentice_profiles (employer_code) where employer_code is not null;
```

#### `projects`
```sql
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
```

#### `project_milestones`
```sql
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
```

#### `milestone_templates` — preset templates per trade
```sql
create table milestone_templates (
  id uuid primary key default gen_random_uuid(),
  trade_type trade_type not null,
  template_name text not null,                      -- e.g. 'Full kitchen install'
  milestones jsonb not null,                        -- ordered array of {title, requires_approval}
  is_default boolean default false,
  created_at timestamptz default now()
);

create index on milestone_templates (trade_type);
```

#### `project_updates` — the timeline feed
```sql
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
```

#### `project_update_media`
```sql
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
```

#### `project_update_reactions`
```sql
create table project_update_reactions (
  update_id uuid not null references project_updates(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  kind reaction_kind not null,
  created_at timestamptz default now(),
  primary key (update_id, user_id)
);
```

#### `project_update_comments`
```sql
create table project_update_comments (
  id uuid primary key default gen_random_uuid(),
  update_id uuid not null references project_updates(id) on delete cascade,
  author_id uuid not null references profiles(id),
  body text not null,
  deleted_at timestamptz,
  created_at timestamptz default now()
);

create index on project_update_comments (update_id, created_at);
```

#### `messages` — 1:1 chat per project
```sql
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
```

#### `invoices`
```sql
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
```

#### `invoice_line_items`
```sql
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
```

#### `reviews`
```sql
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
```

#### `notifications`
```sql
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
```

#### `push_tokens`
```sql
create table push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  token text unique not null,                       -- Expo push token
  device_id text,
  platform text,                                    -- 'ios' | 'android'
  app_version text,
  last_used_at timestamptz default now(),
  created_at timestamptz default now()
);

create index on push_tokens (user_id);
```

#### `project_crew` — links tradesmen/apprentices to projects they work on

```sql
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
```

> The lead tradesman is always auto-inserted on project creation with `role_on_project = 'lead'`. Apprentices are added by the lead. `project_crew` is what drives "who can see this project's geofence events," "who is on shift today," and the apprentice's Crew tab scoping.

#### `site_geofences` — one per project (and customer home anchor)

```sql
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
```

> Only the **anchor + radius** is stored. We do not store continuous location traces. iOS evaluates the geofence on-device and only sends a discrete event when the boundary is crossed.

#### `location_events` — discrete arrival/leave events

```sql
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
```

> Retention policy: `location_events` older than 90 days are aggregated to daily summaries and the row deleted. GDPR data-export endpoint returns the user's full event history.

#### `nudges` — scheduled or fired prompts to a user

```sql
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
```

#### `consent_records` — append-only consent log (GDPR-defensible)

```sql
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
```

> Consent is **append-only**. A user revoking location consent does not delete prior consent rows; it adds a new row with `status='revoked'`. This gives us a defensible audit trail for ICO inquiries.

#### `apprentice_update_approvals` — lead-tradesman approval queue

```sql
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
```

> When an apprentice composes an update destined for the customer, it lands here as a draft until the lead approves it. `project_updates.deleted_at` stays set until approval; on approval the update becomes visible to the customer.

#### `events` — product analytics + audit
```sql
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
```

> **Note:** events table is for audit + low-volume analytics. Heavy product analytics go to PostHog directly from the client. The `events` table is for things you need transactionally consistent with the DB (e.g. "was project invite sent?").

---

## 3. Row Level Security (RLS) — the security model

**Principle:** the iOS app uses the user's JWT directly. There is no service-role usage from the client. Every table has RLS enabled. If a query would leak data, RLS blocks it.

### 3.1 Helper functions
```sql
-- Is the current user a participant in this project?
create or replace function is_project_participant(p_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from projects
    where id = p_id
    and (tradesman_id = auth.uid() or customer_id = auth.uid())
  );
$$;

-- Is the current user the tradesman on this project?
create or replace function is_project_tradesman(p_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from projects
    where id = p_id and tradesman_id = auth.uid()
  );
$$;

-- Is the current user an admin?
create or replace function is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;
```

### 3.2 Policies (representative — full file in repo)

```sql
alter table profiles enable row level security;

-- Anyone can read their own profile
create policy profiles_select_own on profiles
  for select using (id = auth.uid());

-- A customer/tradesman can read the OTHER party's profile on a shared project
create policy profiles_select_counterparty on profiles
  for select using (
    exists (
      select 1 from projects p
      where (p.tradesman_id = auth.uid() and p.customer_id = profiles.id)
         or (p.customer_id = auth.uid() and p.tradesman_id = profiles.id)
    )
  );

-- Public tradesman profile read (for trust pages)
create policy profiles_select_public_tradesman on profiles
  for select using (
    role = 'tradesman' and exists (
      select 1 from tradesman_profiles t where t.id = profiles.id and t.verified_at is not null
    )
  );

create policy profiles_update_own on profiles
  for update using (id = auth.uid());
```

```sql
alter table projects enable row level security;

create policy projects_select_participant on projects
  for select using (
    tradesman_id = auth.uid() or customer_id = auth.uid()
  );

create policy projects_insert_tradesman on projects
  for insert with check (
    tradesman_id = auth.uid() and
    (select role from profiles where id = auth.uid()) = 'tradesman'
  );

create policy projects_update_participant on projects
  for update using (
    tradesman_id = auth.uid() or customer_id = auth.uid()
  ) with check (
    -- customer cannot change tradesman_id, status, etc.; enforced in trigger
    tradesman_id = auth.uid() or customer_id = auth.uid()
  );
```

```sql
alter table project_updates enable row level security;

create policy updates_select on project_updates
  for select using (is_project_participant(project_id));

create policy updates_insert on project_updates
  for insert with check (
    is_project_participant(project_id) and author_id = auth.uid()
  );

create policy updates_update_own on project_updates
  for update using (author_id = auth.uid());
```

```sql
alter table messages enable row level security;

create policy messages_select on messages
  for select using (is_project_participant(project_id));

create policy messages_insert on messages
  for insert with check (
    is_project_participant(project_id) and sender_id = auth.uid()
  );

create policy messages_update_read on messages
  for update using (
    is_project_participant(project_id) and sender_id <> auth.uid()
  );
```

```sql
alter table invoices enable row level security;

create policy invoices_select on invoices
  for select using (
    tradesman_id = auth.uid() or customer_id = auth.uid()
  );

create policy invoices_insert on invoices
  for insert with check (tradesman_id = auth.uid());

create policy invoices_update_tradesman on invoices
  for update using (tradesman_id = auth.uid());
```

```sql
alter table reviews enable row level security;

create policy reviews_select_public on reviews
  for select using (is_public);

create policy reviews_select_participant on reviews
  for select using (
    tradesman_id = auth.uid() or customer_id = auth.uid()
  );

create policy reviews_insert_customer on reviews
  for insert with check (
    customer_id = auth.uid() and
    exists (
      select 1 from projects p
      where p.id = project_id
      and p.customer_id = auth.uid()
      and p.status = 'completed'
    )
  );

create policy reviews_update_response on reviews
  for update using (tradesman_id = auth.uid())
  with check (tradesman_id = auth.uid());
```

```sql
-- Helper: is the current user crew (lead or apprentice) on this project?
create or replace function is_project_crew(p_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from project_crew
    where project_id = p_id
      and user_id = auth.uid()
      and removed_at is null
  );
$$;

alter table site_geofences enable row level security;

-- Crew can read project site geofences for their projects
create policy geofences_select_crew on site_geofences
  for select using (
    (kind = 'project_site' and is_project_crew(project_id)) or
    (kind = 'customer_home' and customer_id = auth.uid())
  );

-- Only the project lead tradesman writes the project geofence
create policy geofences_insert_lead on site_geofences
  for insert with check (
    (kind = 'project_site' and is_project_tradesman(project_id)) or
    (kind = 'customer_home' and customer_id = auth.uid())
  );

create policy geofences_update_lead on site_geofences
  for update using (
    (kind = 'project_site' and is_project_tradesman(project_id)) or
    (kind = 'customer_home' and customer_id = auth.uid())
  );
```

```sql
alter table location_events enable row level security;

-- A user can read their own location events
create policy events_select_own on location_events
  for select using (user_id = auth.uid());

-- The lead tradesman on a project can read crew events for that project
create policy events_select_lead on location_events
  for select using (
    project_id is not null and is_project_tradesman(project_id)
  );

-- The customer on a project sees only ARRIVAL/LEFT events (never raw),
-- and only events whose `is_confirmed` flag is true
create policy events_select_customer on location_events
  for select using (
    is_confirmed = true and
    kind in ('arrived_at_site', 'left_site', 'manual_on_my_way') and
    exists (
      select 1 from projects p
      where p.id = project_id and p.customer_id = auth.uid()
    )
  );

-- Only the user (or an Edge Function via service role) can insert
create policy events_insert_own on location_events
  for insert with check (user_id = auth.uid());
```

```sql
alter table consent_records enable row level security;

create policy consent_select_own on consent_records
  for select using (user_id = auth.uid());

create policy consent_insert_own on consent_records
  for insert with check (user_id = auth.uid());

-- Consent is APPEND-ONLY — no policy for update or delete (deliberate)
```

```sql
alter table nudges enable row level security;

create policy nudges_select_own on nudges
  for select using (user_id = auth.uid());

create policy nudges_update_own on nudges
  for update using (user_id = auth.uid());
```

```sql
alter table apprentice_update_approvals enable row level security;

create policy approvals_select_participant on apprentice_update_approvals
  for select using (
    apprentice_id = auth.uid() or lead_id = auth.uid()
  );

create policy approvals_update_lead on apprentice_update_approvals
  for update using (lead_id = auth.uid());
```

> Similar policies are written for every other table (milestones, media, reactions, comments, notifications, push_tokens, project_crew). The pattern is consistent: scope by `is_project_participant()` or `is_project_crew()` for project-attached resources, scope by `user_id = auth.uid()` for user-owned resources.

### 3.3 What never goes via RLS / client
Anything that:
- Requires writing to multiple tables transactionally with elevated privileges
- Calls third-party APIs (Twilio, Stripe, Expo Push)
- Needs to bypass RLS for legitimate reasons (analytics, admin)

→ goes through **Edge Functions** that use the service role internally.

---

## 4. Edge Functions (custom server-side logic)

Edge Functions run in Deno on Supabase's edge network. Each function below has a single responsibility.

### 4.1 `create-project-with-invite`
**Trigger:** client (tradesman) calls RPC
**Why:** atomic: create project + milestones (from template) + send SMS invite + log event in one transaction

```ts
// POST /functions/v1/create-project-with-invite
// Body: { title, trade_type, address, customer_name, customer_phone,
//         expected_start_date, expected_end_date, template_id }
// Returns: { project_id, invite_link }
```

Steps:
1. Verify caller is tradesman (decode JWT)
2. Generate `invite_code` (6-char nanoid, collision-checked)
3. `insert into projects (...)` returning id
4. Copy milestone template into `project_milestones`
5. Call Twilio Verify / Twilio SMS with deep link: `https://tradesmenapp.uk/invite/{invite_code}`
6. Set `invite_sent_at = now()`
7. Insert event `project_created`

### 4.2 `accept-invite`
**Trigger:** customer signs up via deep link
**Why:** binds the new `customer_id` to the existing project and marks invite accepted

```ts
// POST /functions/v1/accept-invite
// Body: { invite_code }
// Auth: customer JWT
// Returns: { project_id }
```

Steps:
1. Verify caller is customer
2. Look up project by `invite_code` (must be unaccepted, < 30 days old)
3. Optional: verify the customer's phone matches `pending_customer_phone`
4. Update project: `customer_id = auth.uid(), invite_accepted_at = now()`
5. Clear `pending_customer_name`, `pending_customer_phone`
6. Create `customer_profiles` row if missing
7. Push notification to tradesman: "Sarah joined your project"

### 4.3 `post-update-and-notify`
**Trigger:** tradesman posts an update
**Why:** insert update + fan-out push notification to customer in one call

```ts
// POST /functions/v1/post-update
// Body: { project_id, type, body, media_paths[], milestone_id?, eta_minutes? }
```

Steps:
1. Verify caller is participant
2. Insert `project_updates` row
3. Insert `project_update_media` rows
4. If `type = 'milestone'`, update milestone status
5. If `type = 'eta'`, also create notification with computed arrival time
6. Send Expo Push to opposite party
7. Insert `notifications` row
8. Insert `events` (event_name: `update_posted`)

> Could be a Postgres trigger + pg_net, but keeping it in an Edge Function makes the logic visible and testable. For MVP, simpler.

### 4.4 `send-message-and-notify`
Same pattern as update, but for `messages` table.

### 4.5 `stripe-onboard-tradesman`
**Trigger:** tradesman taps "Set up payments"
**Returns:** Stripe Connect onboarding link

Steps:
1. Verify caller is tradesman
2. If no `stripe_account_id`: create Connect Express account (country: GB)
3. Create AccountLink with `return_url` deep-linking back into the app
4. Return URL

### 4.6 `stripe-create-checkout`
**Trigger:** customer taps "Pay deposit/invoice"
**Returns:** Stripe Checkout URL (or PaymentIntent client secret for in-app PaymentSheet)

Steps:
1. Verify caller is customer on this project
2. Load invoice
3. Create PaymentIntent with `application_fee_amount` (your platform take) and `transfer_data: { destination: tradesman.stripe_account_id }`
4. Return `client_secret`

### 4.7 `stripe-webhook`
Receives Stripe events. Endpoint secret in env.

Handles:
- `payment_intent.succeeded` → mark invoice paid, push to tradesman
- `account.updated` → update `stripe_charges_enabled` / `stripe_payouts_enabled`
- `payout.paid` → optional notification

### 4.8 `cron-nudge-stale-projects`
**Trigger:** Supabase Cron, daily at 09:00 UK time
**Why:** if a project has had no updates in 3 days, push the tradesman: *"It's been 3 days since you updated [Sarah's kitchen]. A 30-second post keeps her informed."*

### 4.9 `cron-weekly-digest`
**Trigger:** weekly cron
**Why:** email digest for customers who haven't opened the app (anti-churn safety net)

### 4.10 `transcribe-voice-note`
**Trigger:** client uploads voice note, Edge Function called
**Why:** uses OpenAI Whisper (or AssemblyAI) to transcribe; updates `voice_note_transcript`
> MVP fallback: rely on iOS native speech-to-text in the client. Edge Function is only needed if we move transcription server-side.

### 4.11 `ingest-location-event`
**Trigger:** iOS app posts a geofence transition (entered/left)
**Why:** writes to `location_events`, applies debounce, schedules the nudge

```ts
// POST /functions/v1/ingest-location-event
// Body: { project_id, geofence_id, kind, occurred_at, app_state, device_id }
// Auth: user JWT
```

Steps:
1. Verify caller is crew on this project (`is_project_crew`)
2. Insert `location_events` row with `is_confirmed = false`
3. If `kind = 'left_site'`: schedule a confirmation worker at `occurred_at + 90s`
   - If no opposite event (`arrived_at_site` on the same geofence) arrives in 90s, set `is_confirmed = true` and schedule the leave-site nudge
   - If the user re-enters within 90s, mark both events with `superseded_by` and no nudge fires
4. If `kind = 'arrived_at_site'`: confirm immediately, emit `arrived` notification to customer (respecting their `push_arrival` preference)
5. Insert event row in `events` table for analytics

### 4.12 `schedule-leave-site-nudge`
**Trigger:** internal cron (every 30 seconds), or invoked inline from `ingest-location-event`
**Why:** materialises `nudges` from confirmed `left_site` events and sends the push

```ts
// Internal scheduler — no public endpoint
```

Steps:
1. Find confirmed `left_site` events from the last 5 minutes with no existing `nudges` row
2. For each: insert `nudges` row with `kind = 'leave_site'`, `scheduled_for = now()`
3. Look up the user's `push_tokens` and active project
4. Build the End-of-Day card deep link: `tradesmenapp.uk/eod/{nudge_id}?project={project_id}`
5. Send Expo Push: *"Heading home? {Customer first name} is waiting on an update. 20 seconds."*
6. If the apprentice flag is on the user → send the apprentice variant routed to `apprentice_update_approvals` flow

### 4.13 `submit-eod-update`
**Trigger:** user taps Post on the End-of-Day card
**Why:** atomic write of the update + nudge resolution

Steps:
1. Verify caller is crew on project
2. Insert `project_updates` row (type = `progress`, with EoD metadata in `properties`)
3. If caller is apprentice → create `apprentice_update_approvals` row, mark update `deleted_at = now()` (hidden from customer until approved)
4. Else → fan out push to customer via `post-update-and-notify` flow
5. Update `nudges` row: `acted_at`, `result_update_id`

### 4.14 `approve-apprentice-update`
**Trigger:** lead tradesman taps Approve / Edit / Reject
**Why:** publishes the apprentice's update (or returns it for edits)

Steps:
1. Verify caller is the lead on the approval row
2. If approved: clear `project_updates.deleted_at`, fan out push to customer, set approval `status = 'approved'`
3. If edited: update body / media on the underlying `project_updates`, then approve
4. If rejected: leave update hidden, notify apprentice with notes

---

## 5. API surface — what the client actually calls

The client uses the **Supabase JS SDK** which auto-generates a PostgREST API from the schema. So 90% of operations are direct table queries protected by RLS.

### Standard patterns

```ts
// Read all my projects (uses RLS — only mine come back)
supabase
  .from('projects')
  .select(`
    *,
    tradesman:profiles!projects_tradesman_id_fkey(id, full_name, avatar_url),
    latest_update:project_updates(id, body, type, created_at)
  `)
  .order('updated_at', { ascending: false })
  .limit(1, { foreignTable: 'latest_update' })

// Project detail with everything
supabase
  .from('projects')
  .select(`
    *,
    milestones:project_milestones(*),
    updates:project_updates(*, media:project_update_media(*), reactions:project_update_reactions(*)),
    invoices(*)
  `)
  .eq('id', projectId)
  .single()

// Post a message (RLS validates participant)
supabase.from('messages').insert({
  project_id, sender_id: user.id, type: 'text', body
})
```

### Custom endpoints (Edge Functions)

| Endpoint | Method | Used by |
|---|---|---|
| `/functions/v1/create-project-with-invite` | POST | Tradesman |
| `/functions/v1/accept-invite` | POST | Customer |
| `/functions/v1/post-update` | POST | Tradesman / Apprentice |
| `/functions/v1/send-message` | POST | Any participant |
| `/functions/v1/stripe-onboard-tradesman` | POST | Tradesman |
| `/functions/v1/stripe-create-checkout` | POST | Customer |
| `/functions/v1/stripe-webhook` | POST | Stripe |
| `/functions/v1/transcribe-voice` | POST | Tradesman / Apprentice |
| `/functions/v1/ingest-location-event` | POST | Tradesman / Apprentice (auto, from `expo-location`) |
| `/functions/v1/submit-eod-update` | POST | Tradesman / Apprentice (from EoD card) |
| `/functions/v1/approve-apprentice-update` | POST | Lead tradesman |

### Auth endpoints (Supabase native)
- `POST /auth/v1/signup` (email)
- `POST /auth/v1/token?grant_type=password`
- `POST /auth/v1/token?grant_type=id_token` (Apple, Google)
- `POST /auth/v1/otp` (magic link / SMS — Twilio-backed)

---

## 6. Realtime architecture

Supabase Realtime broadcasts Postgres CDC events over WebSocket. Used for:

| Channel | What it powers |
|---|---|
| `project:{id}:updates` | New timeline updates appear instantly |
| `project:{id}:messages` | Chat messages appear instantly |
| `project:{id}:status` | Project status badge updates live |
| `project:{id}:milestones` | Milestone tick-offs animate in real time |
| `user:{id}:notifications` | In-app notification bell badge |

### Client subscription pattern

```ts
useEffect(() => {
  const channel = supabase
    .channel(`project:${projectId}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public',
      table: 'project_updates', filter: `project_id=eq.${projectId}`
    }, (payload) => {
      queryClient.setQueryData(['updates', projectId], (old) =>
        [payload.new, ...(old ?? [])]
      )
    })
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public',
      table: 'projects', filter: `id=eq.${projectId}`
    }, (payload) => {
      queryClient.setQueryData(['project', projectId], payload.new)
    })
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [projectId])
```

### Scaling note
Supabase Realtime is solid to 2M messages/month / 200 concurrent connections on Pro tier. Beyond that, consider partitioning by project or moving to a dedicated realtime layer (Ably, Pusher).

---

## 7. File storage layout

Supabase Storage bucket structure (all buckets private; signed URLs issued on read):

```
project-media/
  {project_id}/
    updates/
      {update_id}/
        original/{uuid}.jpg
        large/{uuid}.jpg          # 1920w, generated by image_transformer Edge Function on upload
        thumb/{uuid}.jpg          # 400w
    voice/
      {update_id}/{uuid}.m4a
    messages/
      {message_id}/{uuid}.jpg

avatars/
  {user_id}/{uuid}.jpg

business-logos/
  {tradesman_id}/{uuid}.png

invoice-pdfs/
  {invoice_id}.pdf
```

### Storage policies
```sql
-- Only project participants can read project-media
create policy storage_project_media_read on storage.objects for select
  using (
    bucket_id = 'project-media' and
    is_project_participant(
      (string_to_array(name, '/'))[1]::uuid    -- extract project_id from path
    )
  );

create policy storage_project_media_write on storage.objects for insert
  with check (
    bucket_id = 'project-media' and
    is_project_participant((string_to_array(name, '/'))[1]::uuid)
  );
```

### Image processing
On upload, an Edge Function (or PG trigger calling pg_net) generates:
- `large/` (1920w max, quality 80) — feed display
- `thumb/` (400w, quality 70) — list/grid views

Lazy strategy: don't pre-process at upload. Use Supabase Image Transformations on read (Pro plan). Simpler.

---

## 8. Authentication flows

### 8.1 Tradesman signup
1. App: Apple/Google/Email signup → Supabase Auth returns JWT
2. App: prompts SMS verification — call Twilio Verify via Edge Function
3. App: insert `profiles` row with `role='tradesman'`
4. App: 4-step onboarding screens write to `tradesman_profiles`
5. App: optional Stripe Connect onboarding

### 8.2 Customer signup (via invite)
1. Customer receives SMS with link `https://tradesmenapp.uk/invite/{code}`
2. App detects deep link via Universal Links (no app yet → App Store → universal link on first open)
3. Customer signs up (Apple/Google/Email — defaults to Apple on iOS for friction reduction)
4. App calls `accept-invite` Edge Function with the code
5. Project binds, push notification fires to tradesman
6. Customer lands directly on project screen

### 8.3 Session management
- JWT lifetime: 1 hour
- Refresh token: 30 days, auto-rotated
- Stored in Expo SecureStore (iOS Keychain)
- Logout clears SecureStore + revokes session

---

## 9. Push notification pipeline

### 9.1 Registration
1. App requests permission on first app open after signup
2. `expo-notifications` returns Expo Push Token
3. App writes token to `push_tokens` table

### 9.2 Sending
- Server-side: Edge Function calls `https://exp.host/--/api/v2/push/send`
- Batch when possible (Expo accepts arrays)
- Payload includes `data.deep_link` for tap routing
- Insert into `notifications` table for in-app history

### 9.3 Triggers (full list)
| Event | Recipient | Title | Example body |
|---|---|---|---|
| New update posted | Customer | "{Tradesman} posted an update" | "Plastering complete — 3 photos" |
| Status changed | Customer | "{Project} status: {new status}" | "On track — back tomorrow 8am" |
| Delay notified | Customer | "Quick update on your project" | "Materials delayed, new ETA Wed" |
| Milestone complete | Customer | "Milestone complete ✓" | "Electrics first-fix done" |
| Arrived at site | Customer | "{Tradesman} arrived" | "Dave's on site, 8:14am" |
| Left site | Customer | "{Tradesman} wrapped up for the day" | "Back tomorrow ~8am (Dave will confirm)" |
| ETA / On my way (manual) | Customer | "{Tradesman} is on the way" | "Arriving around 8:30am" |
| **Leave-site nudge** | Tradesman / Apprentice | "Heading home?" | "{Customer first name} is waiting on an update. 20 seconds." |
| Apprentice update pending | Lead tradesman | "Jamie wants to send an update" | "Tap to approve, edit, or reject" |
| New message | Both | "{Sender}" | "{first 100 chars}" |
| Invoice sent | Customer | "Invoice from {Tradesman}" | "£250 deposit — tap to view" |
| Invoice paid | Tradesman | "You've been paid" | "£250 deposit from {Customer}" |
| Review requested | Customer | "How was your project?" | "Leave a review for {Tradesman}" |
| 3-day silence nudge (cron) | Tradesman | "Quick update?" | "It's been 3 days since you posted on {project}" |

### 9.4 Notification copy rules
- Always specific (no "You have a new notification")
- Reassuring tone for customer-facing
- Lead with the project or person, never the system
- Use proper case, never SHOUTING
- No marketing pushes ever (kills trust)

---

## 10. SMS / Twilio integration

### Twilio Verify (phone verification)
- Used at tradesman signup (mandatory)
- Used at customer signup if not using Apple/Google (optional)
- UK A2P 10DLC not required (UK), but register sender ID

### Twilio Programmable SMS
- Used for project invites only
- Sender: short alphanumeric ID (e.g. "TradesApp")
- Cost: ~£0.04/message in UK; budget £0.20 per onboarded customer (5 SMS max)
- Template (pre-approved):
  > Hi {first_name}, {tradesman_name} at {business_name} has set up your {trade} project on Tradesmen App. See live updates: https://tradesmenapp.uk/i/{code}

### Cost protection
- Rate-limit invites: max 5/day per tradesman in MVP (prevents abuse)
- Block if `pending_customer_phone` already has an unaccepted invite < 24h old

---

## 10A. Location & geofencing architecture (added in this revision)

### 10A.1 Permission model

- iOS permission requested: **`NSLocationWhenInUseUsageDescription`** only.
- `NSLocationAlwaysAndWhenInUseUsageDescription` is **not** requested in MVP. We deliberately stop at WhenInUse to:
  - Avoid the App Store "always-on tracking" review heat
  - Avoid the second iOS dialog that scares users
  - Stay defensible under UK GDPR data-minimisation
- We still receive background geofence transitions with WhenInUse permission, because iOS's `CLCircularRegion` callbacks fire system-wide once registered. This is the whole reason we built on geofences and not continuous polling.

### 10A.2 Purpose strings (Info.plist)

```
NSLocationWhenInUseUsageDescription =
  "We use your location only to notify your customer when you arrive at and leave their
   project. Your live location is never shared, never shown on a map, and never stored."
```

### 10A.3 Consent flow (per-persona)

| Persona | When asked | What we explain |
|---|---|---|
| Tradesman (lead) | First app open after onboarding | "Lets us automatically tell your customers when you arrive and leave the site. You can turn this off at any time — falls back to manual 'On my way'." |
| Apprentice | First app open after onboarding | "Lets {lead_name} see you're on site and proves your hours. You can turn this off — falls back to manual clock-in." |
| Customer | At invite acceptance, optional | "Lets us mark your home as the project location so events like 'arrived' are accurate. Nothing else is tracked." |

Every Yes/No answer writes a `consent_records` row with the privacy-policy version.

### 10A.4 Client-side geofence registration

```ts
// On project create / accept invite, register the geofence locally
import * as Location from 'expo-location'

await Location.startGeofencingAsync('project-geofences', [
  {
    identifier: project.id,
    latitude: geofence.latitude,
    longitude: geofence.longitude,
    radius: geofence.radius_meters,
    notifyOnEnter: true,
    notifyOnExit: true,
  }
])

// TaskManager handler — fires even when app is backgrounded
TaskManager.defineTask('project-geofences', ({ data, error }) => {
  if (error || !data) return
  const { eventType, region } = data
  postLocationEvent({
    project_id: region.identifier,
    kind: eventType === Location.GeofencingEventType.Enter
      ? 'arrived_at_site' : 'left_site',
    occurred_at: new Date().toISOString(),
    app_state: AppState.currentState,
  })
})
```

### 10A.5 Limits & guard rails

- **iOS hard limit:** 20 simultaneous geofences per app. A tradesman with 20+ active projects: we register only the next 20 by `expected_start_date` and rotate.
- **Working-hours suppression:** `arrived_at_site` events between 22:00–06:00 are still stored but do not trigger a customer push. The 06:30 morning event is what reaches the customer.
- **Debounce:** `left_site` is buffered for 90 seconds; rapid in/out cycles (van trip) collapse into nothing.
- **Battery audit:** target < 2% additional daily battery vs baseline. Measure in beta.

### 10A.6 Data retention

- `location_events` retained 90 days raw, then aggregated to daily site summaries.
- `consent_records` retained indefinitely (legal audit trail, GDPR-defensible).
- GDPR subject access endpoint (`/functions/v1/gdpr-export`) returns the user's full event + consent history.

---

## 11. Deep linking

### Universal Links (iOS)
- Domain: `tradesmenapp.uk`
- Apple App Site Association file at `/.well-known/apple-app-site-association`
- Paths: `/invite/*`, `/project/*`, `/i/*` (short)

### Deferred deep linking
- Use Branch.io or build minimal Postback:
  - First-time user clicks `tradesmenapp.uk/i/abc123` → no app → redirects to App Store with `?invite=abc123` in URL
  - After install, app reads the `invite` param on first launch (via Branch SDK or AppsFlyer free tier)
- For solo founder: start with Branch.io free tier (10k events/month free)

---

## 12. Triggers & functions (Postgres-level automation)

### Auto-update `updated_at`
```sql
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_projects_updated before update on projects
  for each row execute function set_updated_at();
-- (same trigger on every table with updated_at)
```

### Auto-generate timeline entries on status change
```sql
create or replace function on_project_status_change()
returns trigger language plpgsql security definer as $$
begin
  if new.status is distinct from old.status then
    insert into project_updates (project_id, author_id, type, body)
    values (new.id, new.tradesman_id, 'status',
            'Status changed to ' || new.status::text);
  end if;
  return new;
end;
$$;

create trigger trg_project_status after update on projects
  for each row execute function on_project_status_change();
```

### Auto-update tradesman stats on review
```sql
create or replace function on_review_insert()
returns trigger language plpgsql security definer as $$
begin
  update tradesman_profiles
  set total_reviews = total_reviews + 1,
      avg_rating = (
        select avg(rating)::numeric(2,1) from reviews
        where tradesman_id = new.tradesman_id and is_public
      )
  where id = new.tradesman_id;
  return new;
end;
$$;
```

---

## 13. Environments & infrastructure

### Environments
- **Local dev:** Supabase local stack (`supabase start`), pointed at a `.env.local`
- **Staging:** Free-tier Supabase project; TestFlight build
- **Production:** Pro-tier Supabase (~£25/mo), App Store build

### Domains
- `tradesmenapp.uk` — marketing site + universal links
- `app.tradesmenapp.uk` — Supabase custom domain (optional, ~£8/month, billed in USD)
- `api.tradesmenapp.uk` — points to Edge Functions

### CI/CD
- **App:** EAS Build for iOS, EAS Submit for App Store
- **DB:** Supabase migrations checked into Git, applied via `supabase db push` from GitHub Action
- **Edge Functions:** Deployed via `supabase functions deploy` from GitHub Action on merge to main

### Secrets (env vars)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` — client
- `SUPABASE_SERVICE_ROLE_KEY` — Edge Functions only, never client
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SID`, `TWILIO_FROM`
- `EXPO_PUSH_ACCESS_TOKEN` (Expo enhanced security mode)
- `SENTRY_DSN`, `POSTHOG_KEY`
- `RESEND_API_KEY`

---

## 14. Observability & monitoring

| What | Tool | Notes |
|---|---|---|
| Crashes & errors (app) | Sentry | RN integration, source maps via EAS |
| Edge Function errors | Sentry + Supabase logs | |
| Product analytics | PostHog | Self-host on Hetzner £6/mo or PostHog Cloud free tier |
| Uptime | UptimeRobot (free) | Pings Supabase + Edge Functions |
| Logs | Supabase native log explorer | Sufficient until scale |
| Billing alerts | Stripe + Supabase + Twilio | Set spend caps day 1 |

### Critical alerts (PagerDuty later, email for MVP)
- Stripe webhook failures > 0 in 5 min
- Edge function p95 > 3s
- Supabase DB CPU > 80% sustained
- Push delivery rate < 95%
- Twilio SMS error rate > 5%

---

## 15. Security checklist (MVP launch gate)

- [ ] RLS enabled on every table
- [ ] No service role key in the iOS bundle (verify via APK/IPA inspection)
- [ ] Storage buckets all private
- [ ] Stripe webhook signature verified
- [ ] All Edge Functions validate JWT
- [ ] SQL injection impossible (PostgREST + parameterised queries)
- [ ] HTTPS everywhere (cert via Cloudflare)
- [ ] Sensitive PII (phone, address) — encrypted at rest (Postgres TDE on Pro)
- [ ] GDPR: user data export endpoint + delete endpoint (`/functions/v1/gdpr-export`, `/gdpr-delete`)
- [ ] Privacy policy + ToS published before invite-only beta
- [ ] App Store: ATT prompt only if using IDFA (we don't); Privacy Manifest in Xcode
- [ ] Push tokens regenerated on logout
- [ ] No PII in Sentry breadcrumbs (scrub middleware)
- [ ] Rate limiting on Edge Functions (Supabase has basic; add stricter for SMS endpoints)
- [ ] **Location:** `WhenInUse` permission only — no `Always`. Verified in Info.plist + at runtime.
- [ ] **Location:** purpose string accurately describes what we use the data for (Apple privacy review trigger if mismatched)
- [ ] **Location:** `consent_records` row exists for every active user with `purpose='location_geofence'` before any geofence is registered
- [ ] **Location:** customer never sees raw lat/lng — only event labels ("Arrived 8:14am")
- [ ] **Location:** apprentice can toggle `share_location_with_lead` from settings; toggle writes a `consent_records` revoke row
- [ ] **App Store Privacy Manifest:** declares "Location — Coarse" + "Location — Precise" with purposes ["App Functionality"] (NOT "Tracking")
- [ ] **No customer search infrastructure shipped.** Confirmed: no `/search`, no public tradesman directory endpoint, no full-text index on `tradesman_profiles`

---

## 16. Scaling considerations (when you exceed MVP)

| Bottleneck | Symptom | Fix |
|---|---|---|
| RLS on big joins | Slow project list with many updates | Materialised view `project_summary` refreshed on update |
| Realtime concurrent connections | Hit Supabase Pro 200-conn ceiling | Bump to Team plan, or shard subscriptions per project |
| Storage egress | Big bill from photo serves | CDN cache (Cloudflare in front of Supabase) |
| Edge Function cold starts | p99 > 3s | Pre-warm, or move hot paths to Postgres functions |
| Push fan-out latency | > 5s end-to-end | Move from inline to Postgres queue (`pgmq`) + worker |
| SMS spend | Surprise bill | Daily cap per tradesman; weekly cap per platform |

**Not your problem until you have 1k+ tradesmen.** Don't optimise prematurely.

---

## 17. What's deliberately NOT in this architecture

| Not building | Why |
|---|---|
| Custom microservices (Node/Go/Rust) | One person can't operate it; Supabase covers 95% |
| GraphQL gateway | PostgREST is enough |
| Redis | Postgres caches well; no real cache hot path yet |
| **ElasticSearch / any search infrastructure** | **No customer-facing search, ever.** Documented strategic position (see 01 §5). No tradesman discovery endpoint, no full-text index on profiles. |
| Continuous GPS / map view / live tracking dot | Out of MVP scope (see 10A). Geofence events only. |
| Kubernetes | No |
| WebRTC video calls | Out of scope |
| Service mesh | Lol |
| Multi-region failover | UK-only MVP; eu-west-2 single region |

---

## 18. Open questions to resolve before week 1

1. **Domain registration** — `tradesmenapp.uk` available? If not, pick alternative now. Affects universal links + Twilio template.
2. **Trade taxonomy** — confirm the 14 trades in the enum match how UK trades self-identify. Validate with 3 design-partner tradesmen.
3. **VAT handling** — does the tradesman pay platform fees from their gross or net invoice total? Get an accountant's view before writing Stripe logic.
4. **Privacy policy** — needed before TestFlight. Use a template service (Iubenda or TermsFeed) for MVP, lawyer review at V1.
5. **Universal link entitlements** — Apple Developer Account needs the associated-domains capability configured early; takes 2–3 days to propagate.

---

*Next deliverable: 03 — Design System & Hero Screen Specs. Will reference the entities and status states defined here.*
