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
