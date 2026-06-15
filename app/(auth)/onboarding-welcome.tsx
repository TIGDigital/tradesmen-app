import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PhaseLogo } from '@/components/PhaseLogo';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useAuthStore } from '@/stores/auth';
import { lightTheme } from '@/theme/light';

/**
 * Personalised "Hi [Name]!" moment shown ONCE after a user signs up
 * and picks their role, before the tour fires.
 *
 * The carousel tour explains *what* Phase does. The onboarding checklist
 * shows *what to do first*. This screen is the warm human moment in
 * between — "we see you, you're welcome here, here's what's coming up."
 *
 * Persistence: marks `onboardingWelcomeSeen` in the auth store (backed
 * by AsyncStorage so it doesn't re-fire on cold launch). Existing users
 * who installed before this screen existed see it once on their next
 * launch — one tap dismisses it permanently.
 */
export default function OnboardingWelcomeScreen() {
  const t = lightTheme;
  const profile = useAuthStore((s) => s.profile);
  const tourSeen = useAuthStore((s) => s.tourSeen);
  const markOnboardingWelcomeSeen = useAuthStore((s) => s.markOnboardingWelcomeSeen);

  const firstName =
    profile?.full_name?.trim().split(' ')[0] || 'there';

  // Pop the headline cluster in on mount — quick warmth.
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  async function onContinue() {
    await markOnboardingWelcomeSeen();
    // If the user hasn't seen the tour yet, route there next; otherwise
    // skip straight to home (AuthGate would do this anyway, but explicit
    // is friendlier — no half-tick where they see Jobs flash then
    // route away to the tour).
    if (tourSeen === false) {
      router.replace('/tour');
    } else {
      router.replace('/');
    }
  }

  const role = profile?.role ?? 'tradesman';
  const roleLabel =
    role === 'customer'
      ? 'customer'
      : role === 'apprentice'
        ? 'crew'
        : 'tradesman';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { padding: t.space[6] }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Skip — quiet escape for power users / repeat installs. */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => void onContinue()}
            hitSlop={12}
            style={{ paddingVertical: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Skip welcome"
          >
            <Text style={[t.type.body, { color: t.colors.text.tertiary }]}>
              Skip
            </Text>
          </Pressable>
        </View>

        {/* Brand stamp */}
        <View style={{ alignItems: 'center', marginTop: t.space[2] }}>
          <PhaseLogo size={44} />
        </View>

        {/* Greeting cluster — animated in */}
        <Animated.View
          style={[
            styles.cluster,
            { opacity, transform: [{ translateY }] },
          ]}
        >
          <Text
            style={[
              t.type.caption,
              {
                color: t.colors.brand.primary,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
              },
            ]}
          >
            Welcome
          </Text>
          <Text
            style={[
              t.type.title1,
              {
                color: t.colors.text.primary,
                marginTop: t.space[2],
                fontSize: 36,
                lineHeight: 40,
              },
            ]}
          >
            Hi {firstName} 👋
          </Text>
          <Text
            style={[
              t.type.bodyLg,
              {
                color: t.colors.text.secondary,
                marginTop: t.space[3],
                lineHeight: 26,
              },
            ]}
          >
            We're glad you're here. Phase is built so {roleLabel}s like you can stay in sync with the people you're working with — without the WhatsApp chase.
          </Text>
        </Animated.View>

        {/* What's coming up */}
        <View style={{ marginTop: t.space[8], gap: t.space[3] }}>
          <Text
            style={[
              t.type.caption,
              {
                color: t.colors.text.tertiary,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
              },
            ]}
          >
            What's next
          </Text>
          {(role === 'customer' ? CUSTOMER_STEPS : TRADESMAN_STEPS).map(
            (s, i) => (
              <Step key={s.title} n={i + 1} title={s.title} body={s.body} />
            ),
          )}
        </View>

        <View style={{ marginTop: t.space[10] }}>
          <PrimaryButton title="Let's get started" onPress={() => void onContinue()} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** The five-step previews shown under "What's next". Tuned to mirror the
 *  Get-started checklist the user will land in afterwards, so they can
 *  see the runway end-to-end before tapping continue. */
const TRADESMAN_STEPS = [
  {
    title: 'Quick tour',
    body: "Five screens, 45 seconds. Explains how Phase fits in your day.",
  },
  {
    title: 'Create your first project',
    body: "We'll pre-fill milestones for your trade so you're not staring at a blank page.",
  },
  {
    title: 'Invite your customer',
    body: "One tap to send them a code — they join via SMS, no chasing.",
  },
  {
    title: 'Post your first update',
    body: "A photo and a sentence is enough. They see it instantly.",
  },
  {
    title: "Lock in the price",
    body: "Set the agreed quote. Any change after that needs their OK — no surprise bills.",
  },
];

const CUSTOMER_STEPS = [
  {
    title: 'Quick tour',
    body: "Four screens, 30 seconds. Explains what Phase will show you.",
  },
  {
    title: 'Join your project',
    body: "Enter the code your tradesman sent and you're in.",
  },
  {
    title: 'React to an update',
    body: 'Tap 👏 ❤️ or 💪 so your tradesman knows the message landed.',
  },
  {
    title: 'Ask questions any time',
    body: "Built-in chat — replies stay logged so nobody forgets what was agreed.",
  },
  {
    title: 'Approve every price change',
    body: "If the price needs to move, you get the request first. Approve or reject.",
  },
];

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  const t = lightTheme;
  return (
    <View
      style={[
        styles.stepRow,
        { backgroundColor: t.colors.bg.surface, borderColor: t.colors.border.subtle },
      ]}
    >
      <View style={[styles.stepNumber, { backgroundColor: t.colors.brand.tint }]}>
        <Text
          style={[t.type.bodyLgEmphasis, { color: t.colors.brand.primary }]}
        >
          {n}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
          {title}
        </Text>
        <Text
          style={[
            t.type.body,
            { color: t.colors.text.secondary, marginTop: 2, lineHeight: 20 },
          ]}
        >
          {body}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={t.colors.text.tertiary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
  },
  cluster: {
    marginTop: 36,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
