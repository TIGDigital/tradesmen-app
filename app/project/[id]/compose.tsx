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

import { PhotoStrip } from '@/components/PhotoStrip';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { pickPhotos, type PickedPhoto } from '@/services/media';
import { postUpdate } from '@/services/projects';
import { lightTheme } from '@/theme/light';

const MAX_PHOTOS = 3;

export default function ComposeUpdateScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);

  const mutation = useMutation({
    mutationFn: () => postUpdate({ project_id: id!, body: body.trim(), photos }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['updates', id] });
      queryClient.invalidateQueries({ queryKey: ['my-current-project'] });
      router.back();
    },
    onError: (e) => {
      Alert.alert("Couldn't post update", (e as Error).message);
    },
  });

  function onSend() {
    if (!body.trim() && photos.length === 0) {
      Alert.alert('Add a note or photo', 'At least something for your customer.');
      return;
    }
    mutation.mutate();
  }

  async function onAddPhoto() {
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;
    const picked = await pickPhotos(remaining);
    if (picked.length > 0) {
      setPhotos((prev) => [...prev, ...picked].slice(0, MAX_PHOTOS));
    }
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

          <View style={{ marginTop: t.space[4] }}>
            <PhotoStrip
              uris={photos.map((p) => p.uri)}
              max={MAX_PHOTOS}
              onAdd={onAddPhoto}
              onRemove={(i) => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
            />
          </View>

          <Text style={[t.type.footnote, { color: t.colors.text.tertiary, marginTop: t.space[2] }]}>
            Customer sees this on their Updates tab.
          </Text>

          <View style={{ flex: 1 }} />

          <PrimaryButton
            title={photos.length > 0 ? `Send (${photos.length} photo${photos.length > 1 ? 's' : ''})` : 'Send'}
            onPress={onSend}
            loading={mutation.isPending}
            disabled={!body.trim() && photos.length === 0}
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
