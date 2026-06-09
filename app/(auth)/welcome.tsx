import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PhaseLogo } from '@/components/PhaseLogo';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useAuthStore } from '@/stores/auth';
import { lightTheme } from '@/theme/light';

/**
 * Welcome screen — Phase DS treatment.
 *
 * Layout follows the "marketing hero" hierarchy from the design system:
 *   1. Brand cluster up top: ring mark + the PHASE tool-stamp caption.
 *   2. Hero headline + supporting body, anchored mid-screen with
 *      generous breathing room.
 *   3. Sticky bottom: primary CTA + the "I have an account" affordance,
 *      with a mono micro-stamp underneath ("V1 · JUN 2026") that gives
 *      the page its Fluke-instrument signature.
 *
 * The screen sits on the warm Stone paper canvas. No gradients or
 * decorative chrome — the brand promise carries the weight.
 */
export default function WelcomeScreen() {
  const t = lightTheme;
  const session = useAuthStore((s) => s.session);
  const markWelcomeShown = useAuthStore((s) => s.markWelcomeShown);
  const isSignedIn = !!session;

  // Every CTA marks the welcome screen as passed for this app session so the
  // AuthGate stops routing the user back here on subsequent navigations.
  function onOpen() {
    markWelcomeShown();
    router.replace('/');
  }
  function onSignUp() {
    markWelcomeShown();
    router.push('/(auth)/sign-up');
  }
  function onSignIn() {
    markWelcomeShown();
    router.push('/(auth)/sign-in');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['top', 'bottom']}>
      <View style={[styles.container, { padding: t.space[6] }]}>
        {/* ── Brand cluster ───────────────────────────────────────── */}
        <View style={{ alignItems: 'center', marginTop: t.space[6] }}>
          <PhaseLogo size={56} />
          <Text
            style={[
              t.type.caption,
              { color: t.colors.text.tertiary, marginTop: t.space[3] },
            ]}
          >
            Phase
          </Text>
        </View>

        {/* ── Hero ────────────────────────────────────────────────── */}
        <View>
          <Text
            style={[
              t.type.caption,
              { color: t.colors.brand.primary, marginBottom: t.space[3] },
            ]}
          >
            For the life of a build
          </Text>
          <Text
            style={[
              t.type.display,
              { color: t.colors.text.primary },
            ]}
          >
            We'll never{'\n'}leave you{'\n'}wondering.
          </Text>
          <Text
            style={[
              t.type.bodyLg,
              {
                color: t.colors.text.secondary,
                marginTop: t.space[4],
                maxWidth: 320,
                lineHeight: 26,
              },
            ]}
          >
            The shared workspace for tradespeople and their customers — updates,
            photos, schedule and snags, all in one place.
          </Text>
        </View>

        {/* ── Actions ─────────────────────────────────────────────── */}
        <View style={{ gap: t.space[2] }}>
          {isSignedIn ? (
            // Already-signed-in user landing on welcome as cold-launch homepage.
            // One CTA — the promise has been read, now open the workspace.
            <PrimaryButton title="Open Phase" onPress={onOpen} />
          ) : (
            <>
              <PrimaryButton title="Sign up" onPress={onSignUp} />
              <Pressable
                onPress={onSignIn}
                hitSlop={12}
                style={{ alignItems: 'center', paddingVertical: t.space[3] }}
              >
                <Text style={[t.type.bodyLg, { color: t.colors.text.link, fontWeight: '600' }]}>
                  I have an account
                </Text>
              </Pressable>
            </>
          )}
          <Text
            style={[
              t.type.caption,
              { color: t.colors.text.tertiary, textAlign: 'center', marginTop: t.space[2] },
            ]}
          >
            V1 · Jun 2026
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Three-section vertical layout — brand cluster, hero, actions.
    justifyContent: 'space-between',
  },
});
