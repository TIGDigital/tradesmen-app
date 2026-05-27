import { useMutation } from '@tanstack/react-query';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { updateProfile } from '@/services/auth';
import { useAuthStore } from '@/stores/auth';
import { lightTheme } from '@/theme/light';

export default function EditNameScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const [name, setName] = useState(profile?.full_name ?? '');

  const mutation = useMutation({
    mutationFn: () => updateProfile({ full_name: name.trim() }),
    onSuccess: async () => {
      await refreshProfile();
      router.back();
    },
    onError: (e) => Alert.alert("Couldn't save", (e as Error).message),
  });

  function onSave() {
    if (!name.trim()) {
      Alert.alert('Name required');
      return;
    }
    mutation.mutate();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['bottom']}>
      <View style={[styles.navBar, { paddingTop: insets.top, height: 44 + insets.top }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[t.type.bodyLg, { color: t.colors.text.link }]}>Cancel</Text>
        </Pressable>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>Edit name</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: t.space[5], gap: t.space[4] }}>
          <InputField
            label="Full name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={onSave}
          />
        </ScrollView>

        <View
          style={{
            padding: t.space[5],
            borderTopWidth: 1,
            borderTopColor: t.colors.border.subtle,
            backgroundColor: t.colors.bg.canvas,
          }}
        >
          <PrimaryButton
            title="Save"
            onPress={onSave}
            loading={mutation.isPending}
            disabled={!name.trim() || name.trim() === profile?.full_name}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 44,
  },
});
