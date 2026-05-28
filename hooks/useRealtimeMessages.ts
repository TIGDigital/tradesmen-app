import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '@/services/supabase';

/**
 * Subscribe to Supabase Realtime changes on the messages table for a project.
 * On any change, invalidates the ['messages', project_id] query so the chat
 * re-renders with new content. Cleans up on unmount.
 */
export function useRealtimeMessages(project_id: string | null | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!project_id) return;

    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: ['messages', project_id] });
    };

    // Unique channel name per mount — see useRealtimeProject for the long
    // explanation. Short version: React StrictMode + async removeChannel
    // = duplicate-name collisions in dev. Random suffix avoids it.
    const channelName = `messages:${project_id}:${Math.random().toString(36).slice(2, 9)}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `project_id=eq.${project_id}`,
        },
        invalidate
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [project_id, queryClient]);
}
