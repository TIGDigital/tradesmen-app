import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '@/services/supabase';

/**
 * Subscribe to changes on the signed-in user's notifications row set.
 * On any insert/update, invalidate the ['notifications', userId] query
 * so the inbox screen + the unread badge stay in sync.
 *
 * Same StrictMode-safe channel-name pattern as the other realtime hooks.
 * Pass null for user_id to disable (e.g. before sign-in).
 */
export function useRealtimeNotifications(user_id: string | null | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user_id) return;

    const channelName = `notifications:${user_id}:${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user_id}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['notifications', user_id] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user_id, queryClient]);
}
