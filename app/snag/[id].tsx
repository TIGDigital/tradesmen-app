import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
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
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { getSignedUrl, pickPhotos, type PickedPhoto } from '@/services/media';
import { relativeTime } from '@/services/projects';
import {
  fetchSnag,
  markSnagInProgress,
  reopenSnag,
  resolveSnag,
  signOffSnag,
  type SnagStatus,
} from '@/services/snags';
import { useAuthStore } from '@/stores/auth';
import { lightTheme } from '@/theme/light';

const RESOLUTION_NOTE_MAX = 1000;
const REOPEN_REASON_MAX = 500;
const MAX_PROOF_PHOTOS = 3;

/**
 * Snag detail + actions. Both parties can resolve / mark in progress; the
 * customer (well, anyone who isn't the actor) sees Sign off + Re-open
 * when the snag is in 'resolved' state.
 */
export default function SnagDetailScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const myId = useAuthStore((s) => s.profile?.id);
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<'view' | 'resolve' | 'reopen'>('view');
  const [note, setNote] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [proofPhotos, setProofPhotos] = useState<PickedPhoto[]>([]);

  const snagQuery = useQuery({
    queryKey: ['snag', id],
    queryFn: () => fetchSnag(id!),
    enabled: !!id,
  });
  const snag = snagQuery.data;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['snag', id] });
    if (snag) queryClient.invalidateQueries({ queryKey: ['snags', snag.project_id] });
  }

  const inProgressMutation = useMutation({
    mutationFn: () => markSnagInProgress({ id: id!, project_id: snag!.project_id }),
    onSuccess: invalidate,
    onError: (e) => Alert.alert("Couldn't update", (e as Error).message),
  });

  const resolveMutation = useMutation({
    mutationFn: () =>
      resolveSnag({
        id: id!,
        project_id: snag!.project_id,
        note: note || null,
        photos: proofPhotos,
      }),
    onSuccess: () => {
      setMode('view');
      setNote('');
      setProofPhotos([]);
      invalidate();
    },
    onError: (e) => Alert.alert("Couldn't resolve", (e as Error).message),
  });

  const signOffMutation = useMutation({
    mutationFn: () => signOffSnag({ id: id!, project_id: snag!.project_id }),
    onSuccess: invalidate,
    onError: (e) => Alert.alert("Couldn't sign off", (e as Error).message),
  });

  const reopenMutation = useMutation({
    mutationFn: () =>
      reopenSnag({ id: id!, project_id: snag!.project_id, reason: reopenReason }),
    onSuccess: () => {
      setMode('view');
      setReopenReason('');
      invalidate();
    },
    onError: (e) => Alert.alert("Couldn't re-open", (e as Error).message),
  });

  async function onAddProofPhoto() {
    try {
      const remaining = MAX_PROOF_PHOTOS - proofPhotos.length;
      if (remaining <= 0) return;
      const picked = await pickPhotos(remaining);
      if (picked.length > 0) setProofPhotos((prev) => [...prev, ...picked]);
    } catch (e) {
      Alert.alert("Couldn't add photo", (e as Error).message);
    }
  }

  const reportedPhotos = snag?.photos.filter((p) => p.kind !== 'resolution') ?? [];
  const proofExisting = snag?.photos.filter((p) => p.kind === 'resolution') ?? [];

  // Sign-off / re-open are actions for the OTHER party — usually customer.
  // We just require it's not the person who resolved it.
  const canSignOff =
    !!snag && snag.status === 'resolved' && !snag.confirmed_at && snag.resolved_by !== myId;
  const canReopen =
    !!snag && snag.status === 'resolved' && snag.resolved_by !== myId;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['bottom']}>
      <View style={[styles.navBar, { paddingTop: insets.top, height: 44 + insets.top }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[t.type.bodyLg, { color: t.colors.text.link }]}>Done</Text>
        </Pressable>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
          Snag
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {snagQuery.isLoading && (
        <View style={{ padding: t.space[5], gap: t.space[3] }}>
          <Skeleton width="60%" height={22} />
          <Skeleton width="100%" height={120} borderRadius={8} />
        </View>
      )}

      {snagQuery.error && (
        <ErrorState
          message={(snagQuery.error as Error).message}
          onRetry={() => void snagQuery.refetch()}
        />
      )}

      {!snagQuery.isLoading && !snagQuery.error && !snag && (
        <ErrorState tone="empty" title="Snag not found" />
      )}

      {snag && (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={{ padding: t.space[5], gap: t.space[4] }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[t.type.title2, { color: t.colors.text.primary }]}>
                  {snag.title}
                </Text>
                {snag.location_hint && (
                  <Text style={[t.type.body, { color: t.colors.text.secondary, marginTop: 4 }]}>
                    📍 {snag.location_hint}
                  </Text>
                )}
                <Text style={[t.type.footnote, { color: t.colors.text.tertiary, marginTop: 6 }]}>
                  Flagged by {snag.reporter?.full_name ?? 'someone'} ·{' '}
                  {relativeTime(snag.created_at)}
                </Text>
              </View>
              <StatusPill status={snag.status} />
            </View>

            {snag.description && (
              <Card>
                <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>Details</Text>
                <Text
                  style={[t.type.body, { color: t.colors.text.primary, marginTop: 6, lineHeight: 22 }]}
                >
                  {snag.description}
                </Text>
              </Card>
            )}

            {/* Reported photos */}
            {reportedPhotos.length > 0 && (
              <View>
                <Text style={[t.type.caption, { color: t.colors.text.tertiary, marginBottom: 8 }]}>
                  Reported
                </Text>
                <PhotoStripFromPaths paths={reportedPhotos.map((p) => p.storage_path)} />
              </View>
            )}

            {/* Resolution details (only when resolved) */}
            {snag.status === 'resolved' && (
              <Card>
                <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>Resolution</Text>
                {snag.resolution_note && (
                  <Text
                    style={[t.type.body, { color: t.colors.text.primary, marginTop: 6, lineHeight: 22 }]}
                  >
                    {snag.resolution_note}
                  </Text>
                )}
                {!snag.resolution_note && (
                  <Text style={[t.type.body, { color: t.colors.text.tertiary, marginTop: 6 }]}>
                    No note was added.
                  </Text>
                )}
                {snag.resolved_at && (
                  <Text style={[t.type.footnote, { color: t.colors.text.tertiary, marginTop: 8 }]}>
                    Resolved {relativeTime(snag.resolved_at)}
                  </Text>
                )}
                {snag.confirmed_at && (
                  <Text style={[t.type.footnote, { color: '#197A4D', marginTop: 4, fontWeight: '600' }]}>
                    ✓ Signed off {relativeTime(snag.confirmed_at)}
                  </Text>
                )}
                {proofExisting.length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <Text
                      style={[t.type.footnote, { color: t.colors.text.secondary, marginBottom: 6 }]}
                    >
                      Proof of fix
                    </Text>
                    <PhotoStripFromPaths paths={proofExisting.map((p) => p.storage_path)} />
                  </View>
                )}
              </Card>
            )}

            {/* Action sub-forms */}
            {mode === 'resolve' && (
              <Card>
                <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>How did you fix it?</Text>
                <TextInput
                  value={note}
                  onChangeText={(v) => v.length <= RESOLUTION_NOTE_MAX && setNote(v)}
                  multiline
                  placeholder="Re-grouted, sealed, dried overnight."
                  placeholderTextColor={t.colors.text.tertiary}
                  style={[
                    t.type.body,
                    {
                      color: t.colors.text.primary,
                      backgroundColor: t.colors.bg.surface2,
                      borderColor: t.colors.border.strong,
                      borderWidth: 1,
                      borderRadius: t.radius.md,
                      padding: t.space[3],
                      minHeight: 90,
                      marginTop: 8,
                      textAlignVertical: 'top',
                    },
                  ]}
                />
                <Text
                  style={[t.type.footnote, { color: t.colors.text.tertiary, marginTop: 6, textAlign: 'right' }]}
                >
                  {note.length}/{RESOLUTION_NOTE_MAX}
                </Text>
                <Text
                  style={[t.type.footnote, { color: t.colors.text.secondary, marginTop: 12, marginBottom: 6 }]}
                >
                  Proof photos (up to {MAX_PROOF_PHOTOS})
                </Text>
                <PhotoStrip
                  uris={proofPhotos.map((p) => p.uri)}
                  max={MAX_PROOF_PHOTOS}
                  onAdd={onAddProofPhoto}
                  onRemove={(i) => setProofPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                />
                <View style={{ marginTop: 16, gap: 8 }}>
                  <PrimaryButton
                    title="Mark resolved"
                    onPress={() => resolveMutation.mutate()}
                    loading={resolveMutation.isPending}
                  />
                  <Pressable onPress={() => setMode('view')} hitSlop={6} style={{ alignItems: 'center', paddingVertical: 8 }}>
                    <Text style={[t.type.body, { color: t.colors.text.link }]}>Cancel</Text>
                  </Pressable>
                </View>
              </Card>
            )}

            {mode === 'reopen' && (
              <Card>
                <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>
                  What's still wrong?
                </Text>
                <TextInput
                  value={reopenReason}
                  onChangeText={(v) => v.length <= REOPEN_REASON_MAX && setReopenReason(v)}
                  multiline
                  placeholder="Still leaking from the same spot."
                  placeholderTextColor={t.colors.text.tertiary}
                  style={[
                    t.type.body,
                    {
                      color: t.colors.text.primary,
                      backgroundColor: t.colors.bg.surface2,
                      borderColor: t.colors.border.strong,
                      borderWidth: 1,
                      borderRadius: t.radius.md,
                      padding: t.space[3],
                      minHeight: 80,
                      marginTop: 8,
                      textAlignVertical: 'top',
                    },
                  ]}
                />
                <View style={{ marginTop: 16, gap: 8 }}>
                  <PrimaryButton
                    title="Re-open snag"
                    onPress={() => reopenMutation.mutate()}
                    loading={reopenMutation.isPending}
                  />
                  <Pressable onPress={() => setMode('view')} hitSlop={6} style={{ alignItems: 'center', paddingVertical: 8 }}>
                    <Text style={[t.type.body, { color: t.colors.text.link }]}>Cancel</Text>
                  </Pressable>
                </View>
              </Card>
            )}
          </ScrollView>

          {/* Sticky action bar (hidden while a sub-form is showing) */}
          {mode === 'view' && (
            <View
              style={{
                padding: t.space[5],
                borderTopWidth: 1,
                borderTopColor: t.colors.border.subtle,
                backgroundColor: t.colors.bg.canvas,
                gap: 8,
              }}
            >
              {snag.status === 'open' && (
                <PrimaryButton
                  title="Mark in progress"
                  onPress={() => inProgressMutation.mutate()}
                  loading={inProgressMutation.isPending}
                />
              )}
              {(snag.status === 'open' || snag.status === 'in_progress') && (
                <PrimaryButton title="Mark resolved with proof…" onPress={() => setMode('resolve')} />
              )}
              {canSignOff && (
                <PrimaryButton
                  title="Sign off — fix is good"
                  onPress={() => signOffMutation.mutate()}
                  loading={signOffMutation.isPending}
                />
              )}
              {canReopen && (
                <Pressable
                  onPress={() => setMode('reopen')}
                  hitSlop={6}
                  style={{ alignItems: 'center', paddingVertical: 10 }}
                >
                  <Text style={[t.type.bodyLgEmphasis, { color: t.colors.destructive.text }]}>
                    Re-open
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

function StatusPill({ status }: { status: SnagStatus }) {
  const t = lightTheme;
  const { bg, fg, label } =
    status === 'resolved'
      ? { bg: '#E2F5EA', fg: '#197A4D', label: 'Resolved' }
      : status === 'in_progress'
        ? { bg: '#FFF3D6', fg: '#8A5A00', label: 'In progress' }
        : { bg: '#FCEAE7', fg: '#C0392B', label: 'Open' };
  return (
    <View style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: bg }}>
      <Text style={[t.type.footnote, { color: fg, fontWeight: '600' }]}>{label}</Text>
    </View>
  );
}

function PhotoStripFromPaths({ paths }: { paths: string[] }) {
  const { data: urls } = useQuery({
    queryKey: ['snag-photo-urls', paths.join('|')],
    queryFn: () => Promise.all(paths.map((p) => getSignedUrl(p))),
    enabled: paths.length > 0,
    staleTime: 50 * 60 * 1000,
  });
  if (paths.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
      {paths.map((p, i) => {
        const uri = urls?.[i];
        return (
          <View
            key={p}
            style={{ width: 110, height: 110, borderRadius: 8, overflow: 'hidden', backgroundColor: '#EEE' }}
          >
            {uri && <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />}
          </View>
        );
      })}
    </ScrollView>
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
