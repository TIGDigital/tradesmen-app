import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PhaseLogo } from '@/components/PhaseLogo';
import { useAuthStore } from '@/stores/auth';
import { lightTheme } from '@/theme/light';

/**
 * Welcome / promise — Phase's homepage.
 *
 * Per the design system 01-PROMISE spec:
 *   - Full-bleed Phase blue canvas
 *   - App-icon plate centered (slightly brighter blue, soft shadow)
 *   - White ring mark inside the plate
 *   - White headline "We'll never leave you wondering."
 *   - Softer-white body line
 *   - Geist Mono stamp at the bottom of the cluster: PHASE · BUILT IN THE UK
 *
 * No visible CTAs — the whole canvas is tappable. Tap routes onwards
 * based on auth state. Sign-in / sign-up cross-link from the sign-up
 * screen handles the "I already have an account" case for cold-launch
 * users who hit the promise screen with no session.
 */
export default function WelcomeScreen() {
  const session = useAuthStore((s) => s.session);
  const markWelcomeShown = useAuthStore((s) => s.markWelcomeShown);
  const isSignedIn = !!session;

  function onTap() {
    markWelcomeShown();
    if (isSignedIn) {
      router.replace('/');
    } else {
      router.push('/(auth)/sign-up');
    }
  }

  return (
    <Pressable
      onPress={onTap}
      style={{ flex: 1, backgroundColor: PHASE_BLUE }}
      accessibilityLabel="Open Phase"
    >
      {/* Force light status bar over the dark canvas. */}
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.center}>
          {/* App-icon plate — slightly lighter than the background, soft shadow. */}
          <View style={styles.plate}>
            <PhaseLogo size={48} reversed />
          </View>

          <Text style={styles.headline}>
            We'll never leave{'\n'}you wondering.
          </Text>

          <Text style={styles.body}>
            The calm, shared workspace for your home-improvement project — from contract to handover.
          </Text>

          <Text style={styles.stamp}>
            Phase · Built in the UK
          </Text>
        </View>
      </SafeAreaView>
    </Pressable>
  );
}

const PHASE_BLUE = lightTheme.colors.brand.primary; // #1B4DD9

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  // Plate sits slightly lighter than the canvas. Subtle shadow gives it
  // a tiny lift without breaking the calm.
  plate: {
    width: 96,
    height: 96,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
  },

  headline: {
    fontFamily: 'Geist_700Bold',
    fontSize: 38,
    lineHeight: 42,
    letterSpacing: -0.6,
    color: '#FFFFFF',
    textAlign: 'center',
  },

  body: {
    fontFamily: 'Geist_400Regular',
    fontSize: 17,
    lineHeight: 25,
    color: 'rgba(255, 255, 255, 0.82)',
    textAlign: 'center',
    marginTop: 18,
    maxWidth: 360,
  },

  stamp: {
    fontFamily: 'GeistMono_500Medium',
    fontSize: 11,
    letterSpacing: 1.6,
    color: 'rgba(255, 255, 255, 0.55)',
    textTransform: 'uppercase',
    marginTop: 24,
  },
});
