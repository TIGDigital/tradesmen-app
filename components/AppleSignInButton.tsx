import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';

import { signInWithApple } from '@/services/social-auth';
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

  if (!available) return null;

  async function onPress() {
    try {
      const res = await signInWithApple();
      if (!res) return; // user cancelled the Apple sheet
      if (res.isNewUser) router.push('/(auth)/role-select');
    } catch (e) {
      Alert.alert("Couldn't sign in with Apple", (e as Error).message);
    }
  }

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: t.colors.border.subtle }} />
        <Text style={[t.type.footnote, { color: t.colors.text.tertiary }]}>or</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: t.colors.border.subtle }} />
      </View>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={12}
        style={{ height: 50 }}
        onPress={() => void onPress()}
      />
    </View>
  );
}
