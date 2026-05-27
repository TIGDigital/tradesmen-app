import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/services/supabase';

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
  console.log('[notifications] registerForPush called');
  try {
    if (Platform.OS === 'web') return null;
    if (!PROJECT_ID) {
      console.warn('[notifications] no EAS projectId in app.json — skipping push registration');
      return null;
    }

    const perm = await Notifications.getPermissionsAsync();
    console.log('[notifications] current permission status:', perm.status);
    let status = perm.status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      console.log('[notifications] requested permission, new status:', req.status);
      status = req.status;
    }
    if (status !== 'granted') {
      console.log('[notifications] permission denied');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
    const token = tokenData.data;
    console.log('[notifications] got token:', token);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('[notifications] no user, skipping upsert');
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
    else console.log('[notifications] upserted token for user', user.id);

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
    console.log('[sendPush] POST', messages.length, 'messages');
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
    console.log('[sendPush] response', res.status, text);
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
      title: 'Test from Tradesmen',
      body: 'If you see this, the JS notification pipeline works.',
      data: { local_test: true },
      sound: 'default',
    },
    trigger: null,
  });
}
