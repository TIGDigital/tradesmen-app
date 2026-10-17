import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';

import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/auth';

/**
 * DEV ONLY — deep-link account switcher for simulator demo captures:
 *   xcrun simctl openurl booted "exp://localhost:8081/--/dev-login?email=x&pw=y"
 * Compiles to a no-op screen in release builds (__DEV__ is false), and the
 * credentials it accepts only exist as seeded demo rows in the dev database.
 */
export default function DevLogin() {
  const { email, pw } = useLocalSearchParams<{ email?: string; pw?: string }>();

  useEffect(() => {
    if (!__DEV__ || !email || !pw) return;
    void (async () => {
      // No signOut first and no manual redirect — signInWithPassword replaces
      // any existing session, and AuthGate routes on the SIGNED_IN event.
      // (A signOut here raced AsyncStorage and stranded the app signed out.)
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) console.warn('[dev-login] failed:', error.message);
      else console.log('[dev-login] signed in as', email);
      // Skip the first-run gates so demo deep links land directly.
      const store = useAuthStore.getState();
      store.markWelcomeShown();
      await store.markTourSeen();
      await store.markOnboardingWelcomeSeen();
    })();
  }, [email, pw]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>{__DEV__ ? 'dev login…' : ''}</Text>
    </View>
  );
}
