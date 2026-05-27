import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { setMyRole } from '@/services/auth';
import { useAuthStore } from '@/stores/auth';
import { lightTheme } from '@/theme/light';
import type { Database } from '@/types/db';

type Role = Database['public']['Enums']['user_role'];

const choices: { value: Exclude<Role, 'admin' | 'apprentice'>; title: string; sub: string }[] = [
  { value: 'customer', title: "I'm a customer", sub: 'I have work I want done at my home.' },
  { value: 'tradesman', title: "I'm a tradesman", sub: 'I run a business doing the work.' },
];

export default function RoleSelectScreen() {
  const t = lightTheme;
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const [selected, setSelected] = useState<Role | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onContinue() {
    if (!selected) return;
    setSubmitting(true);
    try {
      await setMyRole(selected);
      await refreshProfile();
      // AuthGate whitelists role-select (so the default trigger role doesn't bounce
      // the user past this screen), so we explicitly navigate home on confirm.
      router.replace('/');
    } catch (e) {
      Alert.alert("Couldn't save your role", (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['top', 'bottom']}>
      <View style={[styles.container, { padding: t.space[5] }]}>
        <View>
          <Text style={[t.type.title1, { color: t.colors.text.primary }]}>
            Which describes you?
          </Text>
          <Text style={[t.type.body, { color: t.colors.text.secondary, marginTop: t.space[2] }]}>
            We'll set up the right home screen for you.
          </Text>
        </View>

        <View style={{ gap: t.space[3], marginTop: t.space[8] }}>
          {choices.map((c) => {
            const isSelected = selected === c.value;
            return (
              <Pressable
                key={c.value}
                onPress={() => setSelected(c.value)}
                style={[
                  styles.choice,
                  {
                    backgroundColor: isSelected ? t.colors.brand.tint : t.colors.bg.surface,
                    borderColor: isSelected ? t.colors.brand.primary : t.colors.border.subtle,
                    borderRadius: t.radius.lg,
                    padding: t.space[5],
                  },
                ]}
              >
                <Text style={[t.type.title3, { color: t.colors.text.primary }]}>{c.title}</Text>
                <Text
                  style={[
                    t.type.body,
                    { color: t.colors.text.secondary, marginTop: 4 },
                  ]}
                >
                  {c.sub}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flex: 1 }} />

        <PrimaryButton
          title="Continue"
          onPress={onContinue}
          loading={submitting}
          disabled={!selected}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  choice: { borderWidth: 1.5 },
});
