-- ============================================================
-- DEV SEED — fake users + 1 demo project for the home-screen.
-- DELETE THIS MIGRATION (and the data it creates) before going live.
-- ============================================================
-- Tracked via fixed UUIDs so the seed is idempotent and the app can hard-reference them.

-- ---- auth.users (Supabase auth schema) ----
-- Minimal viable rows. We never actually sign in as these users — they're stand-ins
-- so foreign keys from profiles → auth.users(id) are satisfied.

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'dave@example.test',
    '$2a$10$DEV.SEED.NEVER.MATCH.NO.LOGIN.POSSIBLE.aaaaaaaaaaaaaaaaaa',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'alex@example.test',
    '$2a$10$DEV.SEED.NEVER.MATCH.NO.LOGIN.POSSIBLE.aaaaaaaaaaaaaaaaaa',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  )
on conflict (id) do nothing;

-- ---- profiles ----
insert into profiles (id, role, full_name, avatar_url, phone, email)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'tradesman', 'Dave Smith', null, '+447700900001', 'dave@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'customer',  'Alex Customer', null, '+447700900002', 'alex@example.test')
on conflict (id) do nothing;

-- ---- tradesman_profiles ----
insert into tradesman_profiles (id, business_name, primary_trade, years_trading, service_postcodes, bio)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Smith & Sons Kitchens', 'kitchen_fitter', 12, '{SW19,SW18,SW15}', 'Family-run kitchen fitters, 12 years in South London.')
on conflict (id) do nothing;

-- ---- customer_profiles ----
insert into customer_profiles (id)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
on conflict (id) do nothing;

-- ---- projects ----
insert into projects (
  id, tradesman_id, customer_id, title, trade_type,
  address_line_1, city, postcode,
  status, expected_start_date, expected_end_date, actual_start_date,
  invite_code, invite_accepted_at, created_at
)
values
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Kitchen extension',
    'kitchen_fitter',
    '23 Beech Road',
    'London',
    'SW19 4QP',
    'in_progress',
    current_date - interval '2 days',
    current_date + interval '9 days',
    current_date - interval '2 days',
    'KITCH-DEMO',
    now() - interval '3 days',
    now() - interval '3 days'
  )
on conflict (id) do nothing;

-- ---- project_crew (lead auto-link) ----
insert into project_crew (project_id, user_id, role_on_project)
values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'lead')
on conflict (project_id, user_id) do nothing;

-- ---- one project_update (so the "latest update" card has content) ----
insert into project_updates (project_id, author_id, type, body, created_at)
values
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'progress',
    'First-fix electrics done, plasterer in tomorrow morning ✓',
    now() - interval '2 hours'
  );
