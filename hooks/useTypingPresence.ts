import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '@/services/supabase';

type Typer = { user_id: string; name?: string };

/**
 * Supabase Realtime Presence for "X is typing…" indicators in chat.
 *
 * Each participant joins a presence-enabled channel keyed by the project,
 * and broadcasts a tiny `{ typing: boolean }` payload. We snapshot whoever
 * else is currently typing (excluding ourselves) so the chat screen can
 * render an indicator.
 *
 * Why a stable channel name (no random suffix this time): presence depends
 * on the channel name being the same across participants — that's the
 * whole "this is one shared room" concept. Each user joins via their own
 * `presence.key = my_user_id` so duplicates are handled per-user, not
 * per-mount. React StrictMode's double-effect is OK because each remount
 * re-tracks the same key.
 *
 * Returns:
 *   - `whoIsTyping`: array of others currently typing
 *   - `setMyTyping(bool)`: tell the channel I started/stopped typing
 */
export function useTypingPresence(
  project_id: string | null | undefined,
  my_user_id: string | null | undefined,
  my_name: string | null | undefined,
) {
  const [whoIsTyping, setWhoIsTyping] = useState<Typer[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!project_id || !my_user_id) return;

    const channel = supabase.channel(`typing:${project_id}`, {
      config: { presence: { key: my_user_id } },
    });
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as Record<
          string,
          Array<{ typing?: boolean; name?: string }>
        >;
        const others: Typer[] = [];
        for (const [key, presences] of Object.entries(state)) {
          if (key === my_user_id) continue;
          for (const p of presences) {
            if (p.typing) others.push({ user_id: key, name: p.name });
          }
        }
        setWhoIsTyping(others);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Initial track: not typing yet, but we want our presence row to
          // exist so the other side knows we're online in this channel.
          await channel.track({ typing: false, name: my_name ?? '' });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [project_id, my_user_id, my_name]);

  const setMyTyping = useCallback(
    async (typing: boolean) => {
      if (!channelRef.current) return;
      await channelRef.current.track({ typing, name: my_name ?? '' });
    },
    [my_name],
  );

  return { whoIsTyping, setMyTyping };
}
