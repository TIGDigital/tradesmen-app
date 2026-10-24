import { Redirect } from 'expo-router';

import { useAuthStore } from '@/stores/auth';

/**
 * Root redirect. AuthGate in _layout.tsx already handles unauthenticated +
 * no-role cases (→ /(auth)/welcome or /(auth)/role-select), so by the time
 * this file runs the user has a real role. We bounce them into the right
 * tab group so they see the bottom nav immediately.
 */
export default function Index() {
  const role = useAuthStore((s) => s.profile?.role);

  if (role === 'tradesman') {
    return <Redirect href="/(tradesman)/jobs" />;
  }
  if (role === 'apprentice') {
    // Crew (apprentices + helpers) get the dedicated crew shell —
    // persona plan section B. The tradesman shell is the lead's cockpit.
    return <Redirect href="/(crew)/today" />;
  }
  // customer (and any other role that slipped through) gets the customer tabs.
  return <Redirect href="/(customer)" />;
}
