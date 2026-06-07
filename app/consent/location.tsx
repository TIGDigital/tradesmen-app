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
  getLocationPermissionStatus,
  requestLocationPermission,
} from '@/services/location';
import { lightTheme } from '@/theme/light';

/**
 * Warm pre-prompt for "When in Use" location permission. Shown once on the
 * tradesman's first visit to Jobs (or any time they explicitly enter the
 * flow from Settings later).
 *
 * The explainer reads as "we need this to do the leave-site nudge for you,
 * and your phone is never streaming location." Tapping Continue triggers
 * the iOS dialog. If iOS has already shown the dialog once and the user
 * said no, we can't re-prompt — point them at Settings instead.
 */
export default function LocationConsentScreen() {
  const t = lightTheme;
  const [busy, setBusy] = useState(false);

  async function onContinue() {
    setBusy(true);
    try {
      const current = await getLocationPermissionStatus();
      if (current === 'denied') {
        // iOS won't re-prompt — open Settings so they can flip it manually.
        Alert.alert(
          'Already denied',
          'iOS will only ask once. Open Phase in Settings and turn on Location to enable the leave-site nudge.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }
      await requestLocationPermission();
      // Regardless of grant/deny, leave the consent screen — the user has
      // made their choice and the dialog state lives in iOS now.
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
            <Ionicons name="location" size={56} color={t.colors.brand.primary} />
          </View>
        </View>

        <Text style={[t.type.title1, styles.headline, { color: t.colors.text.primary }]}>
          Let us remind you on the way home
        </Text>
        <Text
          style={[
            t.type.bodyLg,
            styles.subhead,
            { color: t.colors.text.secondary },
          ]}
        >
          Location is the magic behind the end-of-day nudge. Here&apos;s exactly
          what we do — and what we don&apos;t.
        </Text>

        <View style={{ gap: 16, marginTop: 8 }}>
          <Row
            icon="checkmark-circle"
            color="#1F9C56"
            title="Only when you leave a site"
            body="We check whether you've stepped outside a project's address — nothing more."
          />
          <Row
            icon="checkmark-circle"
            color="#1F9C56"
            title="Your phone never streams your location"
            body="No live map. No tracking. Just one event when the geofence trips, then we forget."
          />
          <Row
            icon="checkmark-circle"
            color="#1F9C56"
            title="Off when you're not on a project"
            body="No active job means no geofence. The app stays quiet."
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: t.colors.border.subtle }]}>
        <PrimaryButton
          title="Continue"
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
