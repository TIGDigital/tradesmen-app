import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { postUpdate } from '@/services/projects';
import { lightTheme } from '@/theme/light';

export default function ComposeUpdateScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');

  const mutation = useMutation({
    mutationFn: () => postUpdate({ project_id: id!, body: body.trim() }),
    onSuccess: () => {
      // refresh the feed on the project detail screen behind this modal
      queryClient.invalidateQueries({ queryKey: ['updates', id] });
      queryClient.invalidateQueries({ queryKey: ['my-current-project'] });
      router.back();
    },
    onError: (e) => {
      Alert.alert("Couldn't post update", (e as Error).message);
    },
  });

  function onSend() {
    if (!body.trim()) {
      Alert.alert('Add a note', 'Even a short one.');
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
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
          Post an update
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.content, { padding: t.space[5] }]}>
          <Text style={[t.type.caption, { color: t.colors.text.tertiary, marginBottom: t.space[2] }]}>
            What happened today?
          </Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="e.g. First-fix electrics done, plasterer in tomorrow morning"
            placeholderTextColor={t.colors.text.tertiary}
            multiline
            autoFocus
            style={[
              t.type.bodyLg,
              {
                color: t.colors.text.primary,
                backgroundColor: t.colors.bg.surface2,
                borderRadius: t.radius.md,
                padding: t.space[4],
                minHeight: 160,
                textAlignVertical: 'top',
              },
            ]}
          />
          <Text style={[t.type.footnote, { color: t.colors.text.tertiary, marginTop: t.space[2] }]}>
            Customer sees this on their Updates tab. Photos and voice notes come later.
          </Text>

          <View style={{ flex: 1 }} />

          <PrimaryButton
            title="Send"
            onPress={onSend}
            loading={mutation.isPending}
            disabled={!body.trim()}
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
  content: { flex: 1 },
});
