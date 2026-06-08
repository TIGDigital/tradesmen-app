import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActionSheetIOS,
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
import { pickPhotos, type PickedPhoto } from '@/services/media';
import {
  CERTIFICATE_LABELS,
  type CertificateKind,
  addCertificate,
  deleteCertificate,
  fetchMyCertificates,
  getCertificatePhotoUrl,
  updateCertificate,
} from '@/services/tradesman';
import { lightTheme } from '@/theme/light';

/**
 * Add or edit a single certificate. Route param `id` is either a UUID
 * (edit existing) or the literal string 'new' (create).
 *
 * Photo evidence is optional but encouraged — Phase will use it to
 * verify the card before issuing the blue tick.
 */
export default function CertificateEditScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';

  // Load list to find this cert when editing — cheaper than a per-row
  // fetch and the list is already cached from the verification screen.
  const certsQuery = useQuery({
    queryKey: ['my-certificates'],
    queryFn: fetchMyCertificates,
    enabled: !isNew,
  });
  const existing = !isNew ? certsQuery.data?.find((c) => c.id === id) : undefined;

  const [kind, setKind] = useState<CertificateKind>('gas_safe');
  const [customName, setCustomName] = useState('');
  const [number, setNumber] = useState('');
  const [issued, setIssued] = useState<Date | null>(null);
  const [expires, setExpires] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');
  // Photo: either an unsaved picked photo OR an already-saved signed URL.
  const [pickedPhoto, setPickedPhoto] = useState<PickedPhoto | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!existing) return;
    setKind(existing.kind);
    setCustomName(existing.custom_name ?? '');
    setNumber(existing.number ?? '');
    setIssued(existing.issued_at ? new Date(existing.issued_at) : null);
    setExpires(existing.expires_at ? new Date(existing.expires_at) : null);
    setNotes(existing.notes ?? '');
    if (existing.photo_path) {
      getCertificatePhotoUrl(existing.photo_path).then(setExistingPhotoUrl);
    }
  }, [existing]);

  const addMutation = useMutation({
    mutationFn: () =>
      addCertificate({
        kind,
        custom_name: kind === 'other' ? customName : null,
        number: number || null,
        issued_at: issued ? issued.toISOString().slice(0, 10) : null,
        expires_at: expires ? expires.toISOString().slice(0, 10) : null,
        notes: notes || null,
        photo_uri: pickedPhoto?.uri ?? null,
        photo_mime_type: pickedPhoto?.mimeType,
        photo_ext: pickedPhoto?.ext,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-certificates'] });
      router.back();
    },
    onError: (e) => Alert.alert("Couldn't save", (e as Error).message),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateCertificate(id, {
        kind,
        custom_name: kind === 'other' ? customName : null,
        number: number || null,
        issued_at: issued ? issued.toISOString().slice(0, 10) : null,
        expires_at: expires ? expires.toISOString().slice(0, 10) : null,
        notes: notes || null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-certificates'] });
      router.back();
    },
    onError: (e) => Alert.alert("Couldn't save", (e as Error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCertificate(id, existing?.photo_path),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-certificates'] });
      router.back();
    },
    onError: (e) => Alert.alert("Couldn't delete", (e as Error).message),
  });

  function onPickKind() {
    // ActionSheetIOS — taps-outside dismisses, scrolls naturally for the
    // 12 card kinds. Alert.alert with this many buttons is unmanageable.
    // On Android (no production target yet) fall back to a basic Alert.
    const kinds = Object.keys(CERTIFICATE_LABELS) as CertificateKind[];
    const labels = kinds.map((k) => CERTIFICATE_LABELS[k]);

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: 'Which card?',
          options: [...labels, 'Cancel'],
          cancelButtonIndex: labels.length,
        },
        (selected) => {
          if (selected !== undefined && selected < kinds.length) {
            setKind(kinds[selected]);
          }
        },
      );
    } else {
      Alert.alert('Which card?', undefined, [
        ...kinds.map((k) => ({ text: CERTIFICATE_LABELS[k], onPress: () => setKind(k) })),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  }

  async function onPickPhoto() {
    const photos = await pickPhotos(1);
    if (photos[0]) setPickedPhoto(photos[0]);
  }

  function onDelete() {
    Alert.alert(
      'Remove this card?',
      "It'll disappear from your public profile. You can add it back any time.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => deleteMutation.mutate() },
      ],
    );
  }

  const photoUriToShow = pickedPhoto?.uri ?? existingPhotoUrl;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['bottom']}>
      <View style={[styles.navBar, { paddingTop: insets.top, height: 44 + insets.top }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[t.type.bodyLg, { color: t.colors.text.link }]}>Cancel</Text>
        </Pressable>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
          {isNew ? 'Add card' : 'Edit card'}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: t.space[5], gap: t.space[4] }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Kind */}
          <View>
            <Text style={[t.type.caption, { color: t.colors.text.tertiary, marginBottom: 8 }]}>
              Card type
            </Text>
            <Pressable
              onPress={onPickKind}
              style={({ pressed }) => [
                styles.pickerBtn,
                {
                  borderColor: t.colors.border.strong,
                  backgroundColor: pressed ? t.colors.bg.surface2 : t.colors.bg.surface,
                },
              ]}
            >
              <Text style={[t.type.bodyLg, { color: t.colors.text.primary }]}>
                {kind === 'other' ? 'Other' : CERTIFICATE_LABELS[kind]}
              </Text>
              <Text style={{ color: t.colors.text.tertiary, fontSize: 14 }}>▼</Text>
            </Pressable>
          </View>

          {kind === 'other' && (
            <InputField
              label="Card name"
              value={customName}
              onChangeText={setCustomName}
              autoCapitalize="words"
              placeholder="e.g. IPAF Cherrypicker, Confined Spaces"
            />
          )}

          {/* Number */}
          <InputField
            label="Card number / reference"
            value={number}
            onChangeText={setNumber}
            autoCapitalize="characters"
            placeholder="123456"
          />

          {/* Dates */}
          <DateField
            label="Issued"
            value={issued}
            onChange={setIssued}
            onClear={() => setIssued(null)}
          />
          <DateField
            label="Expires"
            value={expires}
            onChange={setExpires}
            onClear={() => setExpires(null)}
          />

          {/* Photo evidence */}
          <View>
            <Text style={[t.type.caption, { color: t.colors.text.tertiary, marginBottom: 8 }]}>
              Photo of the card (optional)
            </Text>
            <Pressable
              onPress={onPickPhoto}
              style={({ pressed }) => [
                styles.photoPicker,
                {
                  borderColor: t.colors.border.strong,
                  backgroundColor: pressed ? t.colors.bg.surface2 : t.colors.bg.surface,
                },
              ]}
            >
              {photoUriToShow ? (
                <Image source={{ uri: photoUriToShow }} style={styles.photoPreview} contentFit="cover" />
              ) : (
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <Ionicons name="camera-outline" size={28} color={t.colors.text.tertiary} />
                  <Text style={[t.type.body, { color: t.colors.text.tertiary }]}>
                    Tap to add a photo
                  </Text>
                </View>
              )}
            </Pressable>
            <Text style={[t.type.footnote, { color: t.colors.text.tertiary, marginTop: 6 }]}>
              Helps us verify faster. Only Phase + your project participants ever see it.
            </Text>
          </View>

          {/* Notes */}
          <InputField
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Anything Phase should know"
            multiline
            numberOfLines={3}
          />

          {!isNew && (
            <Pressable
              onPress={onDelete}
              style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[t.type.bodyLgEmphasis, { color: t.colors.destructive.text }]}>
                Remove this card
              </Text>
            </Pressable>
          )}
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
            onPress={() => (isNew ? addMutation.mutate() : updateMutation.mutate())}
            loading={addMutation.isPending || updateMutation.isPending}
            disabled={kind === 'other' && !customName.trim()}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Small date row primitive ───────────────────────────────────
function DateField({
  label,
  value,
  onChange,
  onClear,
}: {
  label: string;
  value: Date | null;
  onChange: (d: Date) => void;
  onClear: () => void;
}) {
  const t = lightTheme;
  return (
    <View>
      <Text style={[t.type.caption, { color: t.colors.text.tertiary, marginBottom: 8 }]}>
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: t.colors.bg.surface,
          borderColor: t.colors.border.strong,
          borderWidth: 1,
          borderRadius: t.radius.md,
          paddingHorizontal: t.space[4],
          height: 50,
        }}
      >
        <Text style={[t.type.bodyLg, { color: t.colors.text.primary }]}>
          {value
            ? value.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : 'Not set'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {value && (
            <Pressable onPress={onClear} hitSlop={6}>
              <Text style={[t.type.footnote, { color: t.colors.text.tertiary }]}>Clear</Text>
            </Pressable>
          )}
          <DateTimePicker
            value={value ?? new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'compact' : 'default'}
            onChange={(_e: DateTimePickerEvent, d?: Date) => {
              if (d) onChange(d);
            }}
          />
        </View>
      </View>
    </View>
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
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
  },
  photoPicker: {
    height: 180,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoPreview: { width: '100%', height: '100%' },
  deleteBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
});
