import { notifyCounterparty } from '@/services/projects';
import { supabase } from '@/services/supabase';

export type Comment = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  author: { id: string; full_name: string | null; avatar_url: string | null } | null;
};

/** Fetch non-deleted comments for one update, oldest-first (chat-style). */
export async function fetchComments(update_id: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('project_update_comments')
    .select(
      `id, body, created_at, author_id,
       author:profiles!project_update_comments_author_id_fkey ( id, full_name, avatar_url )`,
    )
    .eq('update_id', update_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data as unknown as Comment[]) ?? [];
}

/** Insert a new comment authored by the signed-in user. */
export async function addComment(args: { update_id: string; body: string }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const trimmed = args.body.trim();
  if (!trimmed) throw new Error('Comment is empty');

  const { error } = await supabase.from('project_update_comments').insert({
    update_id: args.update_id,
    author_id: user.id,
    body: trimmed,
  });
  if (error) throw error;

  // Tell the other side — comments were landing silently (23 Oct beta).
  // Tap routes to the comment thread via update_id in the payload.
  const { data: update } = await supabase
    .from('project_updates')
    .select('project_id')
    .eq('id', args.update_id)
    .single();
  if (update) {
    void notifyCounterparty({
      project_id: update.project_id,
      sender_id: user.id,
      title: 'New comment',
      body: trimmed.length > 80 ? trimmed.slice(0, 77) + '…' : trimmed,
      data: { update_id: args.update_id },
    });
  }
}

/** Soft delete (only the author can do this — RLS enforced). */
export async function softDeleteComment(id: string) {
  const { error } = await supabase
    .from('project_update_comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
