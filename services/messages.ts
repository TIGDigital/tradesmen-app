import { notifyCounterparty } from '@/services/projects';
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

  // Fire-and-forget push to the counterparty so they actually know a
  // message landed. Without this the message sits silently in the
  // tradesman's Messages tab until they happen to refresh — the original
  // sendMessage skipped the notify hop, which is the bug Todd hit today.
  // Truncate body to a polite 80 chars so the lock-screen preview reads
  // cleanly without leaking too much context.
  const preview = body.length > 80 ? body.slice(0, 77) + '…' : body;
  void notifyCounterparty({
    project_id,
    sender_id: user.id,
    title: profile?.role === 'customer' ? 'Message from your customer' : 'New message',
    body: preview,
  });

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
