import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { customerFirstName, fetchProject } from '@/services/projects';
import { createSnag, type SnagSeverity } from '@/services/snags';
import { useAuthStore } from '@/stores/auth';
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
  const myId = useAuthStore((s) => s.profile?.id);

  // Fire-and-forget fetch so the confirmation can name who's been told.
  // Shares the project screen's cache key + shape, so it's usually free.
  const { data: project } = useQuery({
    queryKey: ['project', id],
    queryFn: () => fetchProject(id!),
    enabled: !!id,
  });

  const [title, setTitle] = useState('');
  const [locationHint, setLocationHint] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [severity, setSeverity] = useState<SnagSeverity>('normal');

  const mutation = useMutation({
    mutationFn: () =>
      createSnag({
        project_id: id!,
        title,
        location_hint: locationHint || null,
        description: description || null,
        photos,
        severity,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['snags', id] });
      router.back();
      // Close the loop in plain English: who, exactly, now knows about
      // this. The snag's push goes to the OTHER party, so name them.
      const isLead = !!project?.tradesman && project.tradesman.id === myId;
      const told = isLead
        ? customerFirstName(project?.customer?.full_name) ?? 'Your customer'
        : project?.tradesman?.full_name?.split(' ')[0] ?? 'Your tradesman';
      Alert.alert('Reported', `${told}'s been told.`);
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

          <View>
            <Text style={[t.type.footnote, { color: t.colors.text.secondary, marginBottom: 6 }]}>
              How serious is it?
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(
                [
                  { value: 'low', label: 'Low' },
                  { value: 'normal', label: 'Needs attention' },
                  { value: 'urgent', label: 'Urgent' },
                ] as const
              ).map((o) => {
                const active = severity === o.value;
                return (
                  <Pressable
                    key={o.value}
                    onPress={() => setSeverity(o.value)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: active ? t.colors.brand.primary : t.colors.border.subtle,
                      backgroundColor: active ? t.colors.brand.tint : t.colors.bg.surface,
                    }}
                  >
                    <Text
                      style={[
                        t.type.body,
                        { color: active ? t.colors.brand.primary : t.colors.text.secondary },
                      ]}
                    >
                      {o.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {severity === 'urgent' && (
              <Text style={[t.type.footnote, { color: t.colors.text.tertiary, marginTop: 6 }]}>
                Urgent snags alert the whole crew as well.
              </Text>
            )}
          </View>

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
