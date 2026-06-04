import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '@/services/supabase';

/**
 * Subscribe to live changes on project_update_comments for one update.
 * On any insert/update/delete, invalidate the ['comments', update_id]
 * query so the thread re-renders without a manual refresh.
 *
 * Channel name has a random suffix per mount — same StrictMode trick as
 * useRealtimeProject. Pass `null` to disable (e.g. while the param is
 * loading).
 */
export function useRealtimeComments(update_id: string | null | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!update_id) return;

    const channelName = `comments:${update_id}:${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_update_comments',
          filter: `update_id=eq.${update_id}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['comments', update_id] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [update_id, queryClient]);
}
