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
  // v3 crash workaround: conditionally-render the password TextInput so
  // we can explicitly UNMOUNT it (React → native view removal) BEFORE
  // navigating. That guarantees UIKit tears down its
  // password-suggestion delegate on its own timeline, not in a race
  // with router.replace's screen unmount. See onSubmit for the
  // sequencing.
  const [showPasswordField, setShowPasswordField] = useState(true);

  async function onSubmit() {
    if (!fullName.trim() || !email.trim() || password.length < 6) {
      Alert.alert('Missing something', 'Name, email, and a 6+ character password please.');
      return;
    }
    // iOS 26 signup-crash workaround, v3.
    //
    // Root cause (confirmed via .ips): iOS 26.5's `_UIKeyboardStateManager
    // _teardownExistingDelegate` hits an assertion if a `secureTextEntry`
    // TextInput is still first-responder when its host view unmounts.
    // v1 (Keyboard.dismiss) and v2 (+250ms wait) weren't enough on Todd's
    // tester's device — Expo Updates then hit its rollback threshold and
    // itself crashed on startup, bricking the app.
    //
    // v3 sequences the teardown explicitly rather than praying to iOS:
    //   1. Blur (Keyboard.dismiss) - releases first-responder
    //   2. Unmount password TextInput (setShowPasswordField(false)) -
    //      React removes the native view, UIKit tears down its
    //      password-suggestion delegate BEFORE any navigation
    //   3. Wait 400ms so tear-down animation + XPC round-trips finish
    //   4. Do the network signup
    //   5. Wait 300ms more so iOS has fully quiesced
    //   6. Now safe to router.replace
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
      // Second guard-wait before nav.
      await new Promise((resolve) => setTimeout(resolve, 300));
      // v4: use `push` instead of `replace` so the sign-up screen stays
      // MOUNTED in the stack. router.replace unmounts the current
      // screen, and iOS 26 crashes on any TextInput unmount even after
      // v1/v2/v3 workarounds. With push the TextInput's native view
      // stays alive — UIKit's keyboard-state machine has nothing to
      // race with. The user only ever moves forward through the stack.
      router.push('/(auth)/role-select');
    } catch (e) {
      // On error we stay on this screen — re-mount the password field
      // so the user can correct + retry.
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
            onPress={() => router.replace('/(auth)/sign-in')}
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
