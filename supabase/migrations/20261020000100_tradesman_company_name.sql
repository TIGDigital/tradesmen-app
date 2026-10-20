-- Registered company name (Companies House), distinct from the trading
-- business_name customers see. Lives beside company_number; both are the
-- tradesman's own row (existing self-scoped RLS covers it).
alter table public.tradesman_profiles
  add column if not exists company_name text;
