import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PhotoStrip } from '@/components/PhotoStrip';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { type PickedPhoto, pickPhotos } from '@/services/media';
import { createSnag } from '@/services/snags';
import { lightTheme } from '@/theme/light';

const DESCRIPTION_MAX = 2000;
const LOCATION_MAX = 200;
const TITLE_MAX = 200;
const MAX_PHOTOS = 3;

/**
 * Flag a snag on a project. Both roles can use this; the OTHER party gets
 * a push + inbox row when it lands.
 */
export default function NewSnagScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [locationHint, setLocationHint] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);

  const mutation = useMutation({
    mutationFn: () =>
      createSnag({
        project_id: id!,
        title,
        location_hint: locationHint || null,
        description: description || null,
        photos,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['snags', id] });
      router.back();
    },
    onError: (e) => Alert.alert("Couldn't send", (e as Error).message),
  });

  async function onAddPhoto() {
    try {
      const remaining = MAX_PHOTOS - photos.length;
      if (remaining <= 0) return;
      const picked = await pickPhotos(remaining);
      if (picked.length > 0) setPhotos((prev) => [...prev, ...picked]);
    } catch (e) {
      Alert.alert("Couldn't add photo", (e as Error).message);
    }
  }

  function onRemovePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  const canSubmit = title.trim().length > 0 && !mutation.isPending;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['bottom']}>
      <View style={[styles.navBar, { paddingTop: insets.top, height: 44 + insets.top }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[t.type.bodyLg, { color: t.colors.text.link }]}>Cancel</Text>
        </Pressable>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
          New snag
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: t.space[5], gap: t.space[4] }}
          keyboardShouldPersistTaps="handled"
        >
          <InputField
            label="What's the issue?"
            value={title}
            onChangeText={(v) => v.length <= TITLE_MAX && setTitle(v)}
            autoCapitalize="sentences"
            placeholder="Grout uneven behind toilet"
          />

          <InputField
            label="Where? (optional)"
            value={locationHint}
            onChangeText={(v) => v.length <= LOCATION_MAX && setLocationHint(v)}
            autoCapitalize="sentences"
            placeholder="Upstairs bathroom"
            helper="Helps the other party find it faster."
          />

          <View>
            <Text style={[t.type.footnote, { color: t.colors.text.secondary, marginBottom: 6 }]}>
              More detail (optional)
            </Text>
            <TextInput
              value={description}
              onChangeText={(v) => v.length <= DESCRIPTION_MAX && setDescription(v)}
              multiline
              placeholder="Anything you'd want them to know."
              placeholderTextColor={t.colors.text.tertiary}
              style={[
                t.type.bodyLg,
                {
                  color: t.colors.text.primary,
                  backgroundColor: t.colors.bg.surface2,
                  borderColor: t.colors.border.strong,
                  borderWidth: 1,
                  borderRadius: t.radius.md,
                  padding: t.space[4],
                  minHeight: 110,
                  textAlignVertical: 'top',
                },
              ]}
            />
            <Text
              style={[
                t.type.footnote,
                { color: t.colors.text.tertiary, marginTop: 6, textAlign: 'right' },
              ]}
            >
              {description.length}/{DESCRIPTION_MAX}
            </Text>
          </View>

          <View>
            <Text style={[t.type.footnote, { color: t.colors.text.secondary, marginBottom: 6 }]}>
              Photos (up to {MAX_PHOTOS})
            </Text>
            <PhotoStrip
              uris={photos.map((p) => p.uri)}
              max={MAX_PHOTOS}
              onAdd={onAddPhoto}
              onRemove={onRemovePhoto}
            />
          </View>
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
            title="Flag snag"
            onPress={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!canSubmit}
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
