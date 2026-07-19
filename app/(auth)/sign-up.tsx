import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
// Pressable + Text + Alert already imported above; bottom cross-link to sign-in.
import { SafeAreaView } from 'react-native-safe-area-context';

import { PhaseLogo } from '@/components/PhaseLogo';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { signUpWithEmail } from '@/services/auth';
import { lightTheme } from '@/theme/light';

export default function SignUpScreen() {
  const t = lightTheme;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // iOS 26 keyboard-teardown crash guard (see onSubmit): the password
  // TextInput is conditionally rendered so we can unmount it explicitly
  // before any navigation.
  const [showPasswordField, setShowPasswordField] = useState(true);

  async function onSubmit() {
    if (!fullName.trim() || !email.trim() || password.length < 6) {
      Alert.alert('Missing something', 'Name, email, and a 6+ character password please.');
      return;
    }
    // iOS 26 crash guard. iOS 26.5 aborts (confirmed via .ips crash log:
    // SIGABRT in `_UIKeyboardStateManager _teardownExistingDelegate`) if
    // a focused TextInput's native view is torn down while the keyboard's
    // suggestion machinery is mid-teardown — exactly what a router
    // navigation does to a just-submitted form. So sequence the teardown
    // deterministically: blur → unmount the password field → wait →
    // network call → wait → `push` (not `replace`, so this screen stays
    // mounted and nothing gets torn down at nav time).
    Keyboard.dismiss();
    setShowPasswordField(false);
    await new Promise((resolve) => setTimeout(resolve, 400));
    setSubmitting(true);
    try {
      // Default role on signup is 'customer'; role-select screen lets them change it next.
      await signUpWithEmail({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        role: 'customer',
      });
      await new Promise((resolve) => setTimeout(resolve, 300));
      router.push('/(auth)/role-select');
    } catch (e) {
      // Stay here on error — re-mount the password field for retry.
      setShowPasswordField(true);
      Alert.alert("Couldn't sign up", (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['top', 'bottom']}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        style={styles.backBtn}
        accessibilityLabel="Back"
      >
        <Ionicons name="chevron-back" size={26} color={t.colors.text.primary} />
      </Pressable>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.content, { padding: t.space[6] }]} keyboardShouldPersistTaps="handled">
          {/* Brand cluster — matches the welcome + sign-in cadence. */}
          <View style={{ alignItems: 'center', marginTop: t.space[4] }}>
            <PhaseLogo size={44} />
            <Text style={[t.type.caption, { color: t.colors.text.tertiary, marginTop: t.space[3] }]}>
              Phase
            </Text>
          </View>

          {/* Hero */}
          <View style={{ marginTop: t.space[10] }}>
            <Text style={[t.type.caption, { color: t.colors.brand.primary, marginBottom: t.space[3] }]}>
              Create account
            </Text>
            <Text style={[t.type.title1, { color: t.colors.text.primary }]}>
              Start your project
            </Text>
            <Text style={[t.type.body, { color: t.colors.text.secondary, marginTop: t.space[2], lineHeight: 22 }]}>
              One account, one project workspace.
            </Text>
          </View>

          <View style={{ gap: t.space[4], marginTop: t.space[8] }}>
            <InputField
              label="Full name"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
            />
            <InputField
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
            />
            {showPasswordField ? (
              <InputField
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                // v4: intentionally NO autoComplete/textContentType.
                // Setting textContentType="newPassword" triggers iOS's
                // strong-password suggestion overlay, which is the
                // specific native UI that crashes on iOS 26.5 during
                // teardown. Trading off Keychain auto-suggest for a
                // signup that doesn't crash the app.
                helper="At least 6 characters."
                returnKeyType="done"
                onSubmitEditing={onSubmit}
              />
            ) : (
              // Placeholder keeps layout stable while the real TextInput
              // is unmounted during the iOS 26 keyboard-teardown window.
              <View style={{ height: 78 }} />
            )}
          </View>

          <View style={{ marginTop: t.space[8] }}>
            <PrimaryButton title="Create account" onPress={onSubmit} loading={submitting} />
          </View>

          <Pressable
            onPress={() => {
              // Same iOS 26 guard: blur before replace unmounts this screen.
              Keyboard.dismiss();
              setTimeout(() => router.replace('/(auth)/sign-in'), 150);
            }}
            hitSlop={12}
            style={{ alignItems: 'center', paddingVertical: t.space[4], marginTop: t.space[2] }}
          >
            <Text style={[t.type.body, { color: t.colors.text.secondary }]}>
              Already have an account?{' '}
              <Text style={{ color: t.colors.text.link, fontWeight: '600' }}>Sign in</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
  backBtn: { paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'flex-start' },
});
