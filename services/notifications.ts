import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/services/supabase';
import { devLog } from '@/utils/log';

/**
 * Set the foreground behaviour: show banner + play sound when a push arrives
 * while the app is open. Default is silent — bad UX for a comms app.
 * Safe to call at module load.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const PROJECT_ID =
  Constants.expoConfig?.extra?.eas?.projectId ??
  (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;

/**
 * Request permission, get an Expo push token, upsert into push_tokens for the
 * currently-signed-in user. No-op on web / unsupported platforms / no project ID.
 * Errors are logged + swallowed so a notification hiccup never blocks the app.
 */
export async function registerForPush(): Promise<string | null> {
  devLog('[notifications] registerForPush called');
  try {
    if (Platform.OS === 'web') return null;
    if (!PROJECT_ID) {
      console.warn('[notifications] no EAS projectId in app.json — skipping push registration');
      return null;
    }

    const perm = await Notifications.getPermissionsAsync();
    devLog('[notifications] current permission status:', perm.status);
    let status = perm.status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      devLog('[notifications] requested permission, new status:', req.status);
      status = req.status;
    }
    if (status !== 'granted') {
      devLog('[notifications] permission denied');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
    const token = tokenData.data;
    devLog('[notifications] got token:', token);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      devLog('[notifications] no user, skipping upsert');
      return token;
    }

    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: user.id,
          token,
          platform: Platform.OS,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: 'token' }
      );
    if (error) console.warn('[notifications] upsert failed', error.message);
    else devLog('[notifications] upserted token for user', user.id);

    return token;
  } catch (e) {
    console.warn('[notifications] registerForPush failed', e);
    return null;
  }
}

/**
 * Send a push to a list of Expo push tokens via the public Expo Push API.
 * Bulks them into a single POST. Errors are logged + swallowed.
 *
 * `data` becomes `notification.request.content.data` on the recipient — use it
 * for deep-link payloads e.g. { project_id }.
 */
export async function sendPush(args: {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  if (args.tokens.length === 0) return;

  const messages = args.tokens.map((to) => ({
    to,
    title: args.title,
    body: args.body,
    data: args.data ?? {},
    sound: 'default',
  }));

  try {
    devLog('[sendPush] POST', messages.length, 'messages');
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'accept-encoding': 'gzip, deflate',
        'content-type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    const text = await res.text();
    devLog('[sendPush] response', res.status, text);
    if (!res.ok) {
      console.warn('[notifications] push API non-ok', res.status, text);
    }
  } catch (e) {
    console.warn('[notifications] push send failed', e);
  }
}

/** Fire a local notification immediately (used by the dev test button). */
export async function fireLocalTest(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Test from Phase',
      body: 'If you see this, the JS notification pipeline works.',
      data: { local_test: true },
      sound: 'default',
    },
    trigger: null,
  });
}

/**
 * Fire the leave-site nudge: a local notification that, when tapped, opens
 * the End-of-Day card for the given project. In production the geofence
 * handler fires this ~5min after a confirmed left_site event; for MVP it's
 * fired by the manual "I'm leaving site" CTA.
 */
export async function fireLeaveSiteNudge(args: {
  project_id: string;
  customer_first_name: string;
}): Promise<void> {
  const title = `End your day for ${args.customer_first_name}?`;
  const body = 'Tap to send a quick update before you leave.';
  const data = { project_id: args.project_id, action: 'end_of_day' };

  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: 'default' },
    trigger: null,
  });

  // Self-targeted inbox entry so the tradesman can find the nudge later
  // if they missed the push.
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await recordNotification({
      user_id: user.id,
      kind: 'leave_site_nudge',
      project_id: args.project_id,
      title,
      body,
      data,
    });
  }
}

// ============================================================
// Inbox API (Sprint 27)
//
// The /notifications tab reads the same `notifications` table that the
// push pipeline writes to. RLS already scopes select/update to your own
// rows. Insert is project-participant-scoped (migration 20260604000300).
// ============================================================

export type NotificationRow = {
  id: string;
  user_id: string;
  kind: string;
  project_id: string | null;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

/** Fetch the signed-in user's notifications, newest-first, capped at 100. */
export async function fetchMyNotifications(): Promise<NotificationRow[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('id, user_id, kind, project_id, title, body, data, read_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data as NotificationRow[]) ?? [];
}

/** Mark one notification as read. RLS enforces ownership. */
export async function markNotificationRead(id: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/** Mark every unread notification for the signed-in user as read. */
export async function markAllNotificationsRead() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null);
  if (error) throw error;
}

/**
 * Persist a notification row for a recipient. Called alongside the push
 * pipeline so an inbox entry exists whether or not the push was delivered.
 * Errors are swallowed — same philosophy as sendPush; missing inbox row
 * shouldn't block the underlying action.
 */
export async function recordNotification(args: {
  user_id: string;
  kind: string;
  project_id?: string | null;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: args.user_id,
      kind: args.kind as any,
      project_id: args.project_id ?? null,
      title: args.title,
      body: args.body,
      data: (args.data ?? {}) as never, // jsonb column accepts any JSON; cast appeases the generated types
    });
    if (error) console.warn('[recordNotification] failed', error.message);
  } catch (e) {
    console.warn('[recordNotification] threw', e);
  }
}
