import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import {
  getNotificationPermissionStatus,
  registerForPush,
  requestNotificationPermission,
} from '@/services/notifications';
import { lightTheme } from '@/theme/light';

/**
 * Warm pre-prompt for iOS push notifications. Mirrors the location consent
 * pattern: friendly explainer of what we send (and what we don't), then
 * one tap triggers the system dialog. If the user already said no, iOS
 * won't re-prompt, so we open Settings instead.
 *
 * Entry points (in order of preference):
 *   - Settings → Notifications (manual, anytime)
 *   - First-run trigger on the (apprentice/tradesman/customer) shell
 *     (added in a follow-up sprint — keep this screen tap-only for now)
 *
 * On grant we kick off registerForPush so the token lands in push_tokens
 * before the user does anything else — no "first notification missed"
 * window.
 */
export default function NotificationsConsentScreen() {
  const t = lightTheme;
  const [busy, setBusy] = useState(false);

  async function onContinue() {
    setBusy(true);
    try {
      const current = await getNotificationPermissionStatus();
      if (current === 'denied') {
        // iOS only prompts once. The user has to flip it in Settings.
        Alert.alert(
          'Already denied',
          "iOS only asks once. Open Phase in Settings and turn on Notifications so we can let you know when there's an update.",
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }
      const result = await requestNotificationPermission();
      if (result === 'granted') {
        // Kick off token registration — no need to await; it's fire-and-forget
        // by design (see services/notifications.ts).
        void registerForPush();
      }
      // Whether they granted or denied, leave the screen — the user made
      // their choice and the dialog state lives in iOS now.
      router.back();
    } finally {
      setBusy(false);
    }
  }

  function onSkip() {
    router.back();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.iconWrap}>
          <View style={[styles.iconCircle, { backgroundColor: '#E6F0FE' }]}>
            <Ionicons name="notifications" size={56} color={t.colors.brand.primary} />
          </View>
        </View>

        <Text style={[t.type.title1, styles.headline, { color: t.colors.text.primary }]}>
          Never miss what matters
        </Text>
        <Text
          style={[
            t.type.bodyLg,
            styles.subhead,
            { color: t.colors.text.secondary },
          ]}
        >
          A quick ping when there&apos;s something you actually need to know —
          and nothing else.
        </Text>

        <View style={{ gap: 16, marginTop: 8 }}>
          <Row
            icon="checkmark-circle"
            color="#1F9C56"
            title="New updates from the people you're working with"
            body="An end-of-day note, a photo from site, a question that needs an answer — straight to your lock screen."
          />
          <Row
            icon="checkmark-circle"
            color="#1F9C56"
            title="Only when there's a real reason"
            body="No marketing pushes, no nudges to come back. If your phone buzzes, someone on your project did something."
          />
          <Row
            icon="checkmark-circle"
            color="#1F9C56"
            title="Tap the alert, land on the update"
            body="No hunting through screens — taps deep-link to the project or message that needs you."
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: t.colors.border.subtle }]}>
        <PrimaryButton
          title="Enable notifications"
          onPress={onContinue}
          loading={busy}
        />
        <Pressable
          onPress={onSkip}
          hitSlop={8}
          style={{ paddingVertical: 12, alignItems: 'center' }}
        >
          <Text style={[t.type.body, { color: t.colors.text.link }]}>Not now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Row({
  icon,
  color,
  title,
  body,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  body: string;
}) {
  const t = lightTheme;
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={24} color={color} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
          {title}
        </Text>
        <Text style={[t.type.body, { color: t.colors.text.secondary, marginTop: 2 }]}>
          {body}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 24,
    paddingTop: 32,
    paddingBottom: 16,
    gap: 16,
  },
  iconWrap: { alignItems: 'center', marginBottom: 8 },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: { textAlign: 'center' },
  subhead: { textAlign: 'center', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 8,
  },
});
