-- ============================================================
-- Security (persona audit, 24 Oct): both invite lookups were open
-- SELECT policies, so any client could ENUMERATE every live code —
-- crew codes joined any project; customer invite rows exposed
-- pending_customer_phone and the full address. Each lookup becomes
-- a SECURITY DEFINER RPC that answers one code with safe fields,
-- and the listing policies are dropped.
-- ============================================================

-- ---- Crew invite preview ------------------------------------
create or replace function public.lookup_crew_invite(p_code text)
returns table (
  id uuid,
  project_id uuid,
  inviter_id uuid,
  invitee_name text,
  invite_code text,
  role_on_project text,
  created_at timestamptz,
  accepted_at timestamptz,
  expires_at timestamptz,
  project_title text,
  inviter_name text
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select ci.id, ci.project_id, ci.inviter_id, ci.invitee_name,
         ci.invite_code, ci.role_on_project, ci.created_at,
         ci.accepted_at, ci.expires_at, ci.project_title, ci.inviter_name
    from crew_invitations ci
   where ci.invite_code = upper(trim(p_code))
     and ci.accepted_at is null
     and ci.revoked_at is null
     and ci.expires_at > now()
   limit 1;
$$;

revoke all on function public.lookup_crew_invite(text) from public;
grant execute on function public.lookup_crew_invite(text) to anon, authenticated;

-- NOTE: the legacy select policies are dropped in a FOLLOW-UP migration
-- once build 54+ (which calls these RPCs) is in testers' hands — dropping
-- now would break invite previews on installed builds.

-- ---- Customer invite preview --------------------------------
-- Safe fields only: no phone number, no street address or postcode.
create or replace function public.lookup_project_invite(p_code text)
returns table (
  id uuid,
  title text,
  trade_type text,
  city text,
  pending_customer_name text,
  tradesman_name text
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select p.id, p.title, p.trade_type::text, p.city,
         p.pending_customer_name, pr.full_name as tradesman_name
    from projects p
    left join profiles pr on pr.id = p.tradesman_id
   where p.invite_code = upper(trim(p_code))
     and p.customer_id is null
   limit 1;
$$;

revoke all on function public.lookup_project_invite(text) from public;
grant execute on function public.lookup_project_invite(text) to authenticated;

