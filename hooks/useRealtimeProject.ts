import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '@/services/supabase';

/**
 * Subscribes to Supabase Realtime changes affecting a project's feed:
 *   - INSERT/UPDATE/DELETE on project_updates filtered by project_id
 *   - INSERT/DELETE on project_update_reactions (filtered server-side by table only;
 *     we can't filter by project_id without a join, so we invalidate per-event and
 *     let TanStack re-fetch — over-fetch is fine, this isn't hot-path).
 *   - INSERT/DELETE on project_update_media (same caveat).
 *
 * Invalidates the relevant queries so feed re-renders without a manual reload.
 * Returns nothing — purely a side-effect hook. Pass `null` to disable.
 */
export function useRealtimeProject(projectId: string | null | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId) return;

    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: ['updates', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['my-current-project'] });
    };

    const channel = supabase
      .channel(`project:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_updates',
          filter: `project_id=eq.${projectId}`,
        },
        invalidate
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_update_reactions' },
        invalidate
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_update_media' },
        invalidate
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, queryClient]);
}
