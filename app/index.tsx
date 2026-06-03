import { Redirect } from 'expo-router';

import { useAuthStore } from '@/stores/auth';

/**
 * Root redirect. AuthGate in _layout.tsx already handles unauthenticated +
 * no-role cases (→ /(auth)/welcome or /(auth)/role-select), so by the time
 * this file runs the user has a real role. We bounce them into the right
 * tab group so they see the bottom nav immediately.
 *
 * Apprentice persona is not shipped — fall through to the customer home so
 * the route doesn't 404.
 */
export default function Index() {
  const role = useAuthStore((s) => s.profile?.role);

  if (role === 'tradesman') return <Redirect href="/(tradesman)/jobs" />;
  // customer (and any other role that slipped through) gets the customer tabs.
  return <Redirect href="/(customer)" />;
}
