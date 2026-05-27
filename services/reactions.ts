import { supabase } from '@/services/supabase';
import type { Database } from '@/types/db';

export type ReactionKind = Database['public']['Enums']['reaction_kind'];

/**
 * Toggle the signed-in user's reaction on an update.
 *
 *   - No existing reaction → INSERT this kind
 *   - Existing reaction of a different kind → UPDATE to this kind
 *   - Existing reaction of THIS kind → DELETE (tap-again-to-unreact)
 *
 * RLS (Sprint 2 `reactions_write_own`) enforces user_id = auth.uid().
 */
export async function toggleReaction(update_id: string, kind: ReactionKind) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  // PK is (update_id, user_id) so there's at most one row.
  const { data: existing } = await supabase
    .from('project_update_reactions')
    .select('kind')
    .eq('update_id', update_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    if (existing.kind === kind) {
      const { error } = await supabase
        .from('project_update_reactions')
        .delete()
        .eq('update_id', update_id)
        .eq('user_id', user.id);
      if (error) throw error;
      return null;
    }
    const { error } = await supabase
      .from('project_update_reactions')
      .update({ kind })
      .eq('update_id', update_id)
      .eq('user_id', user.id);
    if (error) throw error;
    return kind;
  }

  const { error } = await supabase
    .from('project_update_reactions')
    .insert({ update_id, user_id: user.id, kind });
  if (error) throw error;
  return kind;
}
