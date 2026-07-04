import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
  useFonts,
} from '@expo-google-fonts/geist';
import { GeistMono_500Medium } from '@expo-google-fonts/geist-mono';
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
  const [fontsLoaded] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    GeistMono_500Medium,
  });

  // Hold the whole app until Geist + Geist Mono are resolved — without
  // them, the type tokens reference families that don't exist yet and
  // text renders in the system default for a beat.
  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: lightTheme.colors.bg.canvas,
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

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
            <Stack.Screen name="consent/notifications" options={{ presentation: 'card' }} />
            <Stack.Screen name="(auth)/forgot-password" options={{ presentation: 'card' }} />
            <Stack.Screen name="(auth)/onboarding-welcome" options={{ presentation: 'card', gestureEnabled: false }} />
            <Stack.Screen name="tour" options={{ presentation: 'card', gestureEnabled: false }} />
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
              name="project/[id]/reminders"
              options={{ presentation: 'card' }}
            />
            <Stack.Screen
              name="project/[id]/pricing"
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
            <Stack.Screen name="settings/delete-account" options={{ presentation: 'card' }} />
            <Stack.Screen name="settings/business" options={{ presentation: 'card' }} />
            <Stack.Screen name="settings/verification" options={{ presentation: 'card' }} />
            <Stack.Screen name="settings/certificate/[id]" options={{ presentation: 'card' }} />
            <Stack.Screen name="project/[id]/chat" options={{ presentation: 'card' }} />
            <Stack.Screen name="project/[id]/photos" options={{ presentation: 'card' }} />
            <Stack.Screen name="project/[id]/documents" options={{ presentation: 'card' }} />
            <Stack.Screen name="project/[id]/snags" options={{ presentation: 'card' }} />
            <Stack.Screen name="project/[id]/snags/new" options={{ presentation: 'card' }} />
            <Stack.Screen name="project/[id]/schedule" options={{ presentation: 'card' }} />
            <Stack.Screen name="milestone/[id]" options={{ presentation: 'card' }} />
            <Stack.Screen name="project/[id]/crew" options={{ presentation: 'card' }} />
            <Stack.Screen name="crew-invite/[code]" options={{ presentation: 'card' }} />
            <Stack.Screen name="crew-signup/[code]" options={{ presentation: 'card' }} />
            <Stack.Screen name="crew-code-entry" options={{ presentation: 'card' }} />
            <Stack.Screen name="project/[id]/approvals" options={{ presentation: 'card' }} />
            <Stack.Screen name="snag/[id]" options={{ presentation: 'card' }} />
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
  const welcomeShown = useAuthStore((s) => s.welcomeShown);
  const tourSeen = useAuthStore((s) => s.tourSeen);
  const onboardingWelcomeSeen = useAuthStore((s) => s.onboardingWelcomeSeen);
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
    const onWelcome = inAuthZone && segments.at(1) === 'welcome';
    // Crew flow is invite-only and lives outside the auth zone — but the
    // recipient may be signed-out (entering a code) OR mid-sign-up
    // (account created, role + crew membership being attached). In all
    // those states, do NOT bounce them to welcome / role-select; the
    // flow handles its own navigation on success.
    const inCrewFlow =
      segments[0] === 'crew-invite' ||
      segments[0] === 'crew-signup' ||
      segments[0] === 'crew-code-entry';

    if (!session) {
      if (!inAuthZone && !inCrewFlow) router.replace('/(auth)/welcome');
      return;
    }

    // Session exists. If no profile/role yet, force role-select.
    // (Profile may briefly be null between sign-up + trigger fire.)
    if (!profile?.role || profile.role === 'admin') {
      if (segments.at(1) !== 'role-select' && !inCrewFlow) {
        router.replace('/(auth)/role-select');
      }
      return;
    }

    // Signed in with a role. The welcome / promise screen is the homepage —
    // every cold app launch routes here first, regardless of session state.
    // The screen sets welcomeShown=true on any CTA tap, after which we bounce
    // out of the auth zone like a normal app.
    if (!welcomeShown) {
      if (!onWelcome && !inCrewFlow) router.replace('/(auth)/welcome');
      return;
    }

    // Role-select whitelist. The sign-up form defaults role to 'customer'
    // in the DB (via the profile-autocreate trigger) and then explicitly
    // navigates to /(auth)/role-select so the new user can pick their
    // real role. Because profile.role is already set, none of the
    // "!profile.role → role-select" checks fire, so if we didn't skip
    // the onboarding-welcome + tour blocks below, they'd bounce the
    // user straight off role-select onto Hi-[Name] before they had a
    // chance to pick. Role-select onContinue navigates to '/', letting
    // AuthGate resume normal routing (welcome → onboarding-welcome →
    // tour → home).
    const onRoleSelect = inAuthZone && segments.at(1) === 'role-select';

    // Personalised "Hi [Name]!" onboarding welcome screen. Fires once
    // per device after sign-up + role-select. Comes BEFORE the tour so
    // the user sees a warm human moment first, then the feature
    // overview. Existing users who installed before this screen existed
    // will see it once on their next launch — one tap dismisses forever.
    const onOnboardingWelcome =
      inAuthZone && segments.at(1) === 'onboarding-welcome';
    if (
      onboardingWelcomeSeen === false &&
      !onOnboardingWelcome &&
      !onRoleSelect &&
      !inCrewFlow
    ) {
      router.replace('/(auth)/onboarding-welcome');
      return;
    }

    // First-run tour. Persisted to AsyncStorage so it only shows once per
    // device. tourSeen=null means we haven't loaded the flag yet — don't
    // route in that window (causes a flash). Crew-flow paths are exempt
    // so an invite acceptance can finish before the tutorial runs.
    const onTour = segments[0] === 'tour';
    if (tourSeen === false && !onTour && !onRoleSelect && !inCrewFlow) {
      router.replace('/tour');
      return;
    }

    // Welcome already passed this session — push out of the auth zone if we're
    // stuck there. Exception: stay on role-select if the user is explicitly
    // there (post-signup confirmation step).
    if (inAuthZone && segments.at(1) !== 'role-select') router.replace('/');
  }, [session, profile?.role, initialising, welcomeShown, tourSeen, onboardingWelcomeSeen, segments, router]);

  if (initialising) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.bg.canvas }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <>{children}</>;
}
