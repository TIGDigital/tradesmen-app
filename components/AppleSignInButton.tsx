import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';

import { isGoogleSignInAvailable, signInWithApple, signInWithGoogle } from '@/services/social-auth';
import { lightTheme } from '@/theme/light';

/**
 * "or · Sign in with Apple" block for the auth screens (Sprint 54).
 * Renders nothing on non-iOS or where Apple auth is unavailable
 * (e.g. a simulator with no Apple ID signed in still shows the button;
 * availability covers device capability, not account state).
 *
 * New Apple users are routed to role-select, matching the email
 * sign-up flow; returning users are routed by AuthGate on the
 * SIGNED_IN event.
 */
export function AppleSignInButton() {
  const t = lightTheme;
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    void AppleAuthentication.isAvailableAsync().then(setAvailable);
  }, []);

  const googleAvailable = isGoogleSignInAvailable();
  if (!available && !googleAvailable) return null;

  async function onApple() {
    try {
      const res = await signInWithApple();
      if (!res) return; // user cancelled the Apple sheet
      if (res.isNewUser) router.push('/(auth)/role-select');
    } catch (e) {
      Alert.alert("Couldn't sign in with Apple", (e as Error).message);
    }
  }

  async function onGoogle() {
    try {
      const res = await signInWithGoogle();
      if (!res) return; // cancelled
      if (res.isNewUser) router.push('/(auth)/role-select');
    } catch (e) {
      Alert.alert("Couldn't sign in with Google", (e as Error).message);
    }
  }

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: t.colors.border.subtle }} />
        <Text style={[t.type.footnote, { color: t.colors.text.tertiary }]}>or</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: t.colors.border.subtle }} />
      </View>
      {available && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={12}
          style={{ height: 50 }}
          onPress={() => void onApple()}
        />
      )}
      {googleAvailable && (
        <Pressable
          onPress={() => void onGoogle()}
          style={({ pressed }) => ({
            height: 50,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: t.colors.border.strong,
            backgroundColor: pressed ? t.colors.bg.surface2 : t.colors.bg.surface,
            alignItems: 'center',
            justifyContent: 'center',
          })}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
        >
          <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
            Continue with Google
          </Text>
        </Pressable>
      )}
    </View>
  );
}
