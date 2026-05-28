import { supabase } from '@/services/supabase';
import type { Database } from '@/types/db';

type Role = Database['public']['Enums']['user_role'];

export type MessageRow = Pick<
  Database['public']['Tables']['messages']['Row'],
  'id' | 'project_id' | 'sender_id' | 'body' | 'type' | 'created_at' | 'read_at'
> & { sender_role: Role | null };

export async function fetchMessages(project_id: string): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, project_id, sender_id, body, type, created_at, read_at, sender_role')
    .eq('project_id', project_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as MessageRow[];
}

/** Send a text message. Stamps sender_role at send time so the chat can
 *  distinguish role-vs-role even in single-account dev (where both sides
 *  of a project share auth.uid). */
export async function sendMessage(project_id: string, body: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  // Look up current role at send time. Stale-on-flip is fine — the user
  // wouldn't role-switch mid-message normally.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const { data, error } = await supabase
    .from('messages')
    .insert({
      project_id,
      sender_id: user.id,
      body,
      type: 'text',
      sender_role: profile?.role ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markChatRead(project_id: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('project_id', project_id)
    .neq('sender_id', user.id)
    .is('read_at', null);
  if (error) throw error;
}
