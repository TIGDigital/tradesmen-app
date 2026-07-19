import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Screen options for this group's children live HERE, not in the
          root layout — root-level declarations of nested names are
          invalid ("No route named ... exists in nested children") and
          made '/(auth)/onboarding-welcome' unroutable, which is what
          looped AuthGate's redirect and crashed every signup and
          signed-in boot from 4–19 Jul. */}
      <Stack.Screen name="onboarding-welcome" options={{ gestureEnabled: false }} />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
