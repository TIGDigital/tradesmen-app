import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PhaseLogo } from '@/components/PhaseLogo';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { signInWithEmail } from '@/services/auth';
import { lightTheme } from '@/theme/light';

export default function SignInScreen() {
  const t = lightTheme;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    if (!email.trim() || !password) {
      Alert.alert('Missing something', 'Email and password please.');
      return;
    }
    setSubmitting(true);
    try {
      await signInWithEmail(email.trim(), password);
      // Root layout handles redirect on auth state change.
    } catch (e) {
      Alert.alert("Couldn't sign in", (e as Error).message);
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
          {/* Brand cluster — same cadence as the welcome screen. */}
          <View style={{ alignItems: 'center', marginTop: t.space[4] }}>
            <PhaseLogo size={44} />
            <Text style={[t.type.caption, { color: t.colors.text.tertiary, marginTop: t.space[3] }]}>
              Phase
            </Text>
          </View>

          {/* Hero */}
          <View style={{ marginTop: t.space[10] }}>
            <Text style={[t.type.caption, { color: t.colors.brand.primary, marginBottom: t.space[3] }]}>
              Sign in
            </Text>
            <Text style={[t.type.title1, { color: t.colors.text.primary }]}>
              Welcome back
            </Text>
            <Text style={[t.type.body, { color: t.colors.text.secondary, marginTop: t.space[2], lineHeight: 22 }]}>
              Pick up where you left off.
            </Text>
          </View>

          <View style={{ gap: t.space[4], marginTop: t.space[8] }}>
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
            <InputField
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={onSubmit}
            />
          </View>

          <Pressable
            onPress={() => router.push('/(auth)/forgot-password')}
            hitSlop={12}
            style={{ alignItems: 'flex-end', paddingVertical: t.space[2], marginTop: t.space[2] }}
            accessibilityRole="button"
            accessibilityLabel="Forgot password"
          >
            <Text style={[t.type.body, { color: t.colors.text.link, fontWeight: '500' }]}>
              Forgot password?
            </Text>
          </Pressable>

          <View style={{ marginTop: t.space[6] }}>
            <PrimaryButton title="Sign in" onPress={onSubmit} loading={submitting} />
          </View>

          <Pressable
            onPress={() => router.replace('/(auth)/sign-up')}
            hitSlop={12}
            style={{ alignItems: 'center', paddingVertical: t.space[4], marginTop: t.space[2] }}
          >
            <Text style={[t.type.body, { color: t.colors.text.secondary }]}>
              New here?{' '}
              <Text style={{ color: t.colors.text.link, fontWeight: '600' }}>Create an account</Text>
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
