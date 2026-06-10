import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PhaseLogo } from '@/components/PhaseLogo';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { lightTheme } from '@/theme/light';

/**
 * Pre-auth crew-code entry. The friend was told "tap 'I have a crew invite'
 * on the welcome screen, then type the code I sent you". Lands here, types
 * the 6-character code → we push them into /crew-invite/[code] which shows
 * the invite preview + Create-account / Sign-in CTAs.
 *
 * Kept deliberately minimal: one input, one button. The screen exists so
 * the crew flow has a discoverable entry point without us showing
 * "apprentice" as a sign-up role.
 */
export default function CrewCodeEntryScreen() {
  const t = lightTheme;
  const [code, setCode] = useState('');
  const trimmed = code.trim().toUpperCase();
  const canContinue = trimmed.length >= 4;

  function onContinue() {
    if (!canContinue) {
      Alert.alert('Enter your code', 'The tradesman sent you a 6-character invite code.');
      return;
    }
    router.push({ pathname: '/crew-invite/[code]', params: { code: trimmed } });
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
        <View style={[styles.content, { padding: t.space[6] }]}>
          {/* Brand cluster — matches the welcome + sign-up cadence. */}
          <View style={{ alignItems: 'center', marginTop: t.space[4] }}>
            <PhaseLogo size={44} />
            <Text style={[t.type.caption, { color: t.colors.text.tertiary, marginTop: t.space[3] }]}>
              Phase
            </Text>
          </View>

          {/* Hero */}
          <View style={{ marginTop: t.space[10] }}>
            <Text style={[t.type.caption, { color: t.colors.brand.primary, marginBottom: t.space[3] }]}>
              Crew invite
            </Text>
            <Text style={[t.type.title1, { color: t.colors.text.primary }]}>
              Got a code?
            </Text>
            <Text
              style={[
                t.type.body,
                { color: t.colors.text.secondary, marginTop: t.space[2], lineHeight: 22 },
              ]}
            >
              Enter the code your tradesman sent you. It's six characters — letters and numbers, no I, O, 0, or 1.
            </Text>
          </View>

          <View style={{ marginTop: t.space[8] }}>
            <InputField
              label="Invite code"
              value={code}
              onChangeText={(s) => setCode(s.toUpperCase())}
              placeholder="e.g. A3K7QM"
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              returnKeyType="go"
              onSubmitEditing={onContinue}
            />
          </View>

          <View style={{ marginTop: t.space[8] }}>
            <PrimaryButton title="Continue" onPress={onContinue} disabled={!canContinue} />
          </View>

          <View style={{ flex: 1 }} />

          <Text
            style={[
              t.type.footnote,
              {
                color: t.colors.text.tertiary,
                textAlign: 'center',
                marginBottom: t.space[2],
              },
            ]}
          >
            Codes are case-insensitive and expire after a few days.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  backBtn: { paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'flex-start' },
});
