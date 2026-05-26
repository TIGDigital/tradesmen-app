-- Profiles ecosystem — from 02_Technical_Architecture_and_DB_Schema.md §2.3
-- All four role-specific profile tables plus push_tokens.
-- Foreign keys cascade from auth.users so deleting a user removes their profiles.

-- profiles — extends Supabase's auth.users
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

-- tradesman_profiles — 1:1 with profiles where role = tradesman
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

-- customer_profiles — 1:1 where role = customer
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

-- apprentice_profiles — 1:1 where role = apprentice
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

-- push_tokens — Expo push tokens per device per user
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
