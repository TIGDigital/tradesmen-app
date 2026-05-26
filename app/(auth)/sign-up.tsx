import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

  async function onSubmit() {
    if (!fullName.trim() || !email.trim() || password.length < 6) {
      Alert.alert('Check your details', 'Name, email, and a 6+ character password please.');
      return;
    }
    setSubmitting(true);
    try {
      // Default role on signup is 'customer'; role-select screen lets them change it next.
      await signUpWithEmail({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        role: 'customer',
      });
      // On success, the auth store picks up the new session and root layout redirects.
      router.replace('/(auth)/role-select');
    } catch (e) {
      Alert.alert('Sign up failed', (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.content, { padding: t.space[5] }]} keyboardShouldPersistTaps="handled">
          <Text style={[t.type.title1, { color: t.colors.text.primary }]}>
            Create your account
          </Text>
          <Text style={[t.type.body, { color: t.colors.text.secondary, marginTop: t.space[2] }]}>
            One account, one project workspace.
          </Text>

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
            <InputField
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password-new"
              textContentType="newPassword"
              helper="At least 6 characters."
              returnKeyType="done"
              onSubmitEditing={onSubmit}
            />
          </View>

          <View style={{ marginTop: t.space[8] }}>
            <PrimaryButton title="Create account" onPress={onSubmit} loading={submitting} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
});
