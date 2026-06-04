import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuthStore } from '@/stores/auth';
import { lightTheme } from '@/theme/light';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthGate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tradesman)" />
            <Stack.Screen name="project/new" options={{ presentation: 'card' }} />
            <Stack.Screen name="consent/location" options={{ presentation: 'card' }} />
            <Stack.Screen name="project/[id]/index" options={{ presentation: 'card' }} />
            <Stack.Screen
              name="project/[id]/compose"
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name="project/[id]/milestones"
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name="project/[id]/status"
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name="project/[id]/end-of-day"
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name="invite/[code]"
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name="photo/[update_id]"
              options={{ presentation: 'fullScreenModal', animation: 'fade' }}
            />
            <Stack.Screen name="settings/index" options={{ presentation: 'card' }} />
            <Stack.Screen name="settings/edit-name" options={{ presentation: 'card' }} />
            <Stack.Screen name="settings/business" options={{ presentation: 'card' }} />
            <Stack.Screen name="settings/verification" options={{ presentation: 'card' }} />
            <Stack.Screen name="project/[id]/chat" options={{ presentation: 'card' }} />
            <Stack.Screen name="project/[id]/photos" options={{ presentation: 'card' }} />
            <Stack.Screen name="project/[id]/documents" options={{ presentation: 'card' }} />
            <Stack.Screen
              name="document/[id]"
              options={{ presentation: 'fullScreenModal', animation: 'fade' }}
            />
            <Stack.Screen name="comments/[update_id]" options={{ presentation: 'card' }} />
            <Stack.Screen name="tradesman/[id]" options={{ presentation: 'card' }} />
          </Stack>
        </AuthGate>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

/**
 * Watches the auth store and redirects the navigator to the right "zone":
 *   - no session              → /(auth)/welcome
 *   - session but no role yet → /(auth)/role-select
 *   - signed in with a role   → / (home)
 *
 * Renders a spinner while the initial session is being loaded from AsyncStorage.
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const t = lightTheme;
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const initialising = useAuthStore((s) => s.initialising);
  const initialise = useAuthStore((s) => s.initialise);
  const router = useRouter();
  const segments = useSegments();

  // Wire up the supabase listener once.
  useEffect(() => {
    const unsubscribe = initialise();
    return unsubscribe;
  }, [initialise]);

  // Notification tap → deep-link based on the payload.
  // - action='end_of_day' → open the EoD card directly (leave-site nudge)
  // - else if project_id present → open project detail
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data ?? {};
      const projectId = typeof data.project_id === 'string' ? data.project_id : null;
      if (!projectId) return;
      if (data.action === 'end_of_day') {
        router.push({ pathname: '/project/[id]/end-of-day', params: { id: projectId } });
      } else {
        router.push({ pathname: '/project/[id]', params: { id: projectId } });
      }
    });
    return () => sub.remove();
  }, [router]);

  // Route based on auth state any time it changes.
  useEffect(() => {
    if (initialising) return;

    const inAuthZone = segments[0] === '(auth)';

    if (!session) {
      if (!inAuthZone) router.replace('/(auth)/welcome');
      return;
    }

    // Session exists. If no profile/role yet, force role-select.
    // (Profile may briefly be null between sign-up + trigger fire.)
    if (!profile?.role || profile.role === 'admin') {
      if (segments.at(1) !== 'role-select') router.replace('/(auth)/role-select');
      return;
    }

    // Signed in with a role — push out of the auth zone if we're stuck there.
    // Exception: stay on role-select if the user is explicitly there (post-signup
    // confirmation step; the default 'customer' role from the DB trigger shouldn't
    // count as a confirmed choice).
    if (inAuthZone && segments.at(1) !== 'role-select') router.replace('/');
  }, [session, profile?.role, initialising, segments, router]);

  if (initialising) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.bg.canvas }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <>{children}</>;
}
