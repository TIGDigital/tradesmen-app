import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { getLocationPermissionStatus } from '@/services/location';

const STORAGE_KEY = 'consent.location.shown';

/**
 * Show the warm location-permission pre-prompt the first time a tradesman
 * lands on Jobs without having decided on location yet. We push the consent
 * screen exactly once per install — after that the user can re-enter it
 * from Settings if/when we add that link.
 *
 * Skips the push if:
 *  - We've already shown it (AsyncStorage flag set), or
 *  - The user has already granted or denied (status !== 'undetermined').
 *
 * A ref guards against React StrictMode's double-mount in dev so we don't
 * double-push the screen.
 */
export function useLocationConsentNudge() {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    void (async () => {
      try {
        const already = await AsyncStorage.getItem(STORAGE_KEY);
        if (already) return;

        const status = await getLocationPermissionStatus();
        if (status !== 'undetermined') return;

        await AsyncStorage.setItem(STORAGE_KEY, '1');
        router.push('/consent/location');
      } catch {
        // best-effort — if AsyncStorage or expo-location explodes we just
        // skip the nudge; the user can grant later via the project flow.
      }
    })();
  }, []);
}
