import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '@/services/supabase';

/**
 * Live updates for a project's snag list — fires on any insert/update/
 * delete on project_snags filtered by project_id. Photos aren't
 * subscribed to directly (they only appear bundled with a new snag).
 *
 * StrictMode-safe channel naming pattern, same as the other realtime
 * hooks.
 */
export function useRealtimeSnags(project_id: string | null | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!project_id) return;

    const channelName = `snags:${project_id}:${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_snags',
          filter: `project_id=eq.${project_id}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['snags', project_id] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [project_id, queryClient]);
}
