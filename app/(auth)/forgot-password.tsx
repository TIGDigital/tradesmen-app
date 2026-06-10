import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PhaseLogo } from '@/components/PhaseLogo';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { resetPasswordForEmail } from '@/services/auth';
import { lightTheme } from '@/theme/light';

/**
 * Forgot-password screen. Single email field → Supabase emails a recovery
 * link → user taps it on their phone → reset happens on Supabase's hosted
 * page. We don't deep-link the recovery back into the app — keeps the URL
 * handling surface tiny for MVP.
 *
 * On success, swap to a confirmation panel and offer "Back to sign in".
 * Don't bounce automatically — users need to see the "check your email"
 * message before navigating.
 */
export default function ForgotPasswordScreen() {
  const t = lightTheme;
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit() {
    if (!email.trim()) {
      Alert.alert('Missing email', 'Enter the email you signed up with.');
      return;
    }
    setSubmitting(true);
    try {
      await resetPasswordForEmail(email);
      setSent(true);
    } catch (e) {
      Alert.alert("Couldn't send reset", (e as Error).message);
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { padding: t.space[6] }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand cluster — matches the rest of the auth flow. */}
          <View style={{ alignItems: 'center', marginTop: t.space[4] }}>
            <PhaseLogo size={44} />
            <Text style={[t.type.caption, { color: t.colors.text.tertiary, marginTop: t.space[3] }]}>
              Phase
            </Text>
          </View>

          {sent ? (
            <View style={{ marginTop: t.space[10] }}>
              <Text style={[t.type.caption, { color: t.colors.brand.primary, marginBottom: t.space[3] }]}>
                Almost there
              </Text>
              <Text style={[t.type.title1, { color: t.colors.text.primary }]}>
                Check your email
              </Text>
              <Text
                style={[
                  t.type.body,
                  { color: t.colors.text.secondary, marginTop: t.space[2], lineHeight: 22 },
                ]}
              >
                We've sent a reset link to{' '}
                <Text style={{ color: t.colors.text.primary, fontWeight: '600' }}>
                  {email.trim()}
                </Text>
                . Tap it on your phone to set a new password, then come back here
                and sign in.
              </Text>
              <Text
                style={[
                  t.type.footnote,
                  { color: t.colors.text.tertiary, marginTop: t.space[4], lineHeight: 18 },
                ]}
              >
                Didn't get it? Check spam, or double-check the email address and try
                again.
              </Text>

              <View style={{ marginTop: t.space[8] }}>
                <PrimaryButton
                  title="Back to sign in"
                  onPress={() => router.replace('/(auth)/sign-in')}
                />
              </View>

              <Pressable
                onPress={() => setSent(false)}
                hitSlop={12}
                style={{
                  alignItems: 'center',
                  paddingVertical: t.space[4],
                  marginTop: t.space[2],
                }}
              >
                <Text style={[t.type.body, { color: t.colors.text.link, fontWeight: '500' }]}>
                  Try a different email
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={{ marginTop: t.space[10] }}>
                <Text style={[t.type.caption, { color: t.colors.brand.primary, marginBottom: t.space[3] }]}>
                  Forgot password
                </Text>
                <Text style={[t.type.title1, { color: t.colors.text.primary }]}>
                  Reset it by email
                </Text>
                <Text
                  style={[
                    t.type.body,
                    { color: t.colors.text.secondary, marginTop: t.space[2], lineHeight: 22 },
                  ]}
                >
                  Enter the email you signed up with. We'll send you a link to set a
                  new password.
                </Text>
              </View>

              <View style={{ marginTop: t.space[8] }}>
                <InputField
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType="send"
                  onSubmitEditing={onSubmit}
                />
              </View>

              <View style={{ marginTop: t.space[8] }}>
                <PrimaryButton
                  title="Send reset link"
                  onPress={onSubmit}
                  loading={submitting}
                />
              </View>

              <Pressable
                onPress={() => router.replace('/(auth)/sign-in')}
                hitSlop={12}
                style={{
                  alignItems: 'center',
                  paddingVertical: t.space[4],
                  marginTop: t.space[2],
                }}
              >
                <Text style={[t.type.body, { color: t.colors.text.secondary }]}>
                  Remembered it?{' '}
                  <Text style={{ color: t.colors.text.link, fontWeight: '600' }}>Sign in</Text>
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
  backBtn: { paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'flex-start' },
});
