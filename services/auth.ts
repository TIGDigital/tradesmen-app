import { supabase } from '@/services/supabase';
import type { Database } from '@/types/db';

type Role = Database['public']['Enums']['user_role'];

/** Email + password sign-up. Role + full_name go into user_metadata
 *  so the on_auth_user_created trigger can populate `profiles`. */
export async function signUpWithEmail(args: {
  email: string;
  password: string;
  full_name: string;
  role: Role;
}) {
  const { data, error } = await supabase.auth.signUp({
    email: args.email,
    password: args.password,
    options: {
      data: {
        full_name: args.full_name,
        role: args.role,
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Send a password-reset email. Supabase emails a link with a recovery
 *  token; tapping it lands the user on a hosted reset page. For now we
 *  don't deep-link the recovery flow back into the app — the hosted page
 *  is good enough for MVP and avoids the URL-handling surface area. */
export async function resetPasswordForEmail(email: string) {
  const trimmed = email.trim();
  if (!trimmed) throw new Error('Enter your email first');
  const { error } = await supabase.auth.resetPasswordForEmail(trimmed);
  if (error) throw error;
}

/** Permanently delete the signed-in user's account.
 *
 *  Calls the delete-my-account Edge Function (which has the service-role
 *  key needed to remove rows from auth.users). The function deletes any
 *  projects the user owns (tradesman case) then deletes auth.users — the
 *  cascade takes profiles + push_tokens + notifications + anything else
 *  keyed on the user_id.
 *
 *  After this resolves the session is invalid. Caller should immediately
 *  call signOut() and navigate to /(auth)/welcome.
 *
 *  Required by App Store guideline 5.1.1(v) — apps that let users create
 *  accounts must also let them delete those accounts in-app. */
export async function deleteMyAccount() {
  const { data, error } = await supabase.functions.invoke<{
    success?: boolean;
    error?: string;
  }>('delete-my-account');
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (!data?.success) throw new Error('Account deletion did not complete');
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

/** Fetch the signed-in user's profile row (role + name + avatar). */
export async function getMyProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, avatar_url, email')
    .eq('id', user.id)
    .single();

  if (error) throw error;
  return data;
}

/** Update the current user's role (used by the role-select screen). */
export async function setMyRole(role: Role) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase.from('profiles').update({ role }).eq('id', user.id);
  if (error) throw error;
}

/** Update fields on the current user's profile (name, avatar_url, etc.). */
export async function updateProfile(patch: {
  full_name?: string;
  avatar_url?: string | null;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
  if (error) throw error;
}

/**
 * Dev helper: flip the current user's role without re-signing-up.
 * Removes the need to keep two test accounts.
 * In prod, role is set-once at sign-up via role-select.
 */
export async function switchMyRole() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data: current } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const next: Role = current?.role === 'tradesman' ? 'customer' : 'tradesman';
  const { error } = await supabase.from('profiles').update({ role: next }).eq('id', user.id);
  if (error) throw error;
  return next;
}
