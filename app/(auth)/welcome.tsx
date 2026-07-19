import Constants from 'expo-constants';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PhaseLogo } from '@/components/PhaseLogo';
import { useAuthStore } from '@/stores/auth';
import { lightTheme } from '@/theme/light';

/**
 * Welcome / promise — Phase's homepage.
 *
 * Per the design system 01-PROMISE spec + product additions:
 *   - Full-bleed Phase blue canvas
 *   - App-icon plate centered with the white ring mark
 *   - Phase wordmark — brand recognition before the headline lands
 *   - White headline "We'll never leave you wondering."
 *   - Softer-white body line
 *   - Geist Mono stamp underneath the cluster
 *   - White pill button "Start your phase" — single CTA that reads the
 *     same for new (start signing up) and returning (open the workspace)
 *     users alike
 *   - Signed-out users get a quiet "I have an account" affordance under
 *     the button so anyone who actually has credentials can swap to
 *     sign-in without going through the sign-up form
 */
export default function WelcomeScreen() {
  const session = useAuthStore((s) => s.session);
  const markWelcomeShown = useAuthStore((s) => s.markWelcomeShown);
  const isSignedIn = !!session;

  function onPrimary() {
    markWelcomeShown();
    if (isSignedIn) {
      router.replace('/');
    } else {
      router.push('/(auth)/sign-up');
    }
  }

  function onSignIn() {
    markWelcomeShown();
    router.push('/(auth)/sign-in');
  }

  function onCrewCode() {
    // Crew invitees jump straight into the code-entry flow. We DON'T flip
    // welcomeShown here — that flag is for users entering the main app
    // shell. The crew flow lives outside the auth zone and handles its own
    // navigation post-acceptance.
    router.push('/crew-code-entry');
  }

  return (
    <View style={{ flex: 1, backgroundColor: PHASE_BLUE }}>
      {/* Force light status bar over the dark canvas. */}
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.outer}>
          {/* ── Promise cluster — vertically centered ─────────── */}
          <View style={styles.cluster}>
            <View style={styles.plate}>
              <PhaseLogo size={48} reversed />
            </View>

            <Text style={styles.wordmark}>Phase</Text>

            <Text style={styles.headline}>
              We'll never leave{'\n'}you wondering.
            </Text>

            <Text style={styles.body}>
              The shared workspace where tradespeople and their customers stay aligned — from contract to handover.
            </Text>

            <Text style={styles.stamp}>
              Phase · Built in the UK
            </Text>
          </View>

          {/* ── CTA cluster — bottom anchored ──────────────────── */}
          <View style={styles.ctaBox}>
            <Pressable
              onPress={onPrimary}
              style={({ pressed }) => [
                styles.button,
                { opacity: pressed ? 0.85 : 1 },
              ]}
              accessibilityLabel="Start your phase"
            >
              <Text style={styles.buttonLabel}>Start your phase</Text>
            </Pressable>

            {!isSignedIn && (
              <>
                <Pressable
                  onPress={onSignIn}
                  hitSlop={12}
                  style={styles.linkBox}
                  accessibilityLabel="I have an account"
                >
                  <Text style={styles.linkLabel}>I have an account</Text>
                </Pressable>
                <Pressable
                  onPress={onCrewCode}
                  hitSlop={12}
                  style={styles.linkBox}
                  accessibilityLabel="I have a crew invite code"
                >
                  <Text style={styles.linkLabelSubtle}>I have a crew invite</Text>
                </Pressable>
              </>
            )}
            {/* Beta build stamp — native version (build) + which JS
                update is running. "embedded" = no OTA applied yet;
                8-char id = that OTA is live. Lets testers verify an
                update actually landed without force-close guesswork. */}
            <Text style={styles.buildStamp}>
              v{Constants.expoConfig?.version ?? '?'} · js {Updates.updateId ? Updates.updateId.slice(0, 8) : 'embedded'}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const PHASE_BLUE = lightTheme.colors.brand.primary; // #1B4DD9

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    paddingHorizontal: 28,
    // Cluster occupies the middle, CTA box anchors the bottom — empty
    // top space lets the brand breathe and prevents the layout from
    // feeling cramped on shorter devices.
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 24,
  },

  // ── Centerpiece cluster ──────────────────────────────────────
  cluster: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  plate: {
    width: 96,
    height: 96,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
  },

  wordmark: {
    fontFamily: 'Geist_700Bold',
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginTop: 16,
  },

  headline: {
    fontFamily: 'Geist_700Bold',
    fontSize: 38,
    lineHeight: 42,
    letterSpacing: -0.6,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 28,
  },

  body: {
    fontFamily: 'Geist_400Regular',
    fontSize: 17,
    lineHeight: 25,
    color: 'rgba(255, 255, 255, 0.82)',
    textAlign: 'center',
    marginTop: 16,
    maxWidth: 360,
  },

  stamp: {
    fontFamily: 'GeistMono_500Medium',
    fontSize: 11,
    letterSpacing: 1.6,
    color: 'rgba(255, 255, 255, 0.55)',
    textTransform: 'uppercase',
    marginTop: 22,
  },

  // ── CTA cluster ──────────────────────────────────────────────
  ctaBox: {
    gap: 12,
  },

  button: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },

  buttonLabel: {
    fontFamily: 'Geist_600SemiBold',
    fontSize: 17,
    color: PHASE_BLUE,
    letterSpacing: -0.2,
  },

  linkBox: {
    alignItems: 'center',
    paddingVertical: 8,
  },

  linkLabel: {
    fontFamily: 'Geist_500Medium',
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
  },

  // Quieter than "I have an account" — secondary affordance for the
  // smaller crew-invite audience.
  linkLabelSubtle: {
    fontFamily: 'Geist_500Medium',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.65)',
  },

  // Beta build stamp — barely-there mono footer for OTA verification.
  buildStamp: {
    fontFamily: 'GeistMono_500Medium',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    marginTop: 10,
  },
});
