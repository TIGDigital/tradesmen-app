import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
      Alert.alert('Check your details', 'Email and password please.');
      return;
    }
    setSubmitting(true);
    try {
      await signInWithEmail(email.trim(), password);
      // Root layout handles redirect on auth state change.
    } catch (e) {
      Alert.alert('Sign in failed', (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.content, { padding: t.space[5] }]} keyboardShouldPersistTaps="handled">
          <Text style={[t.type.title1, { color: t.colors.text.primary }]}>
            Welcome back
          </Text>

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

          <View style={{ marginTop: t.space[8] }}>
            <PrimaryButton title="Sign in" onPress={onSubmit} loading={submitting} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
});
