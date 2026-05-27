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

  // Notification tap → deep-link into the project the push came from.
  // Also handles the case where the app was launched by tapping a notification.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const projectId = response.notification.request.content.data?.project_id;
      if (typeof projectId === 'string') {
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
    if (inAuthZone) router.replace('/');
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
