import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { MediaThumbs } from '@/components/MediaThumbs';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  approveUpdate,
  listPendingApprovals,
  rejectUpdate,
  relativeTime,
} from '@/services/projects';
import { lightTheme } from '@/theme/light';

/**
 * Approvals queue for a lead tradesman. Lists every apprentice update
 * sitting in 'pending'. Approve flips it to the customer feed; Reject
 * needs a written reason and bumps the apprentice with an explanation.
 */
export default function ApprovalsScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['pending-approvals', id],
    queryFn: () => listPendingApprovals(id!),
    enabled: !!id,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['pending-approvals', id] });
    queryClient.invalidateQueries({ queryKey: ['updates', id] });
    queryClient.invalidateQueries({ queryKey: ['my-current-project'] });
  }

  const approveMutation = useMutation({
    mutationFn: (updateId: string) => approveUpdate(updateId),
    onSuccess: invalidate,
    onError: (e) => Alert.alert("Couldn't approve", (e as Error).message),
  });

  const rejectMutation = useMutation({
    mutationFn: (updateId: string) => rejectUpdate({ id: updateId, reason }),
    onSuccess: () => {
      setRejectingId(null);
      setReason('');
      invalidate();
    },
    onError: (e) => Alert.alert("Couldn't reject", (e as Error).message),
  });

  const items = data ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['bottom']}>
      <View style={[styles.navBar, { paddingTop: insets.top, height: 44 + insets.top }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[t.type.bodyLg, { color: t.colors.text.link }]}>Done</Text>
        </Pressable>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
          Approvals
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {isLoading && (
        <View style={{ padding: 20, gap: 12 }}>
          {[0, 1].map((i) => (
            <Card key={i}>
              <Skeleton width="50%" height={16} />
              <View style={{ height: 8 }} />
              <Skeleton width="100%" height={14} />
              <View style={{ height: 6 }} />
              <Skeleton width="80%" height={14} />
            </Card>
          ))}
        </View>
      )}

      {error && (
        <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />
      )}

      {!isLoading && !error && items.length === 0 && (
        <ErrorState
          tone="empty"
          title="No updates waiting"
          message="When your apprentices post, their updates will queue here for sign-off before reaching the customer."
        />
      )}

      {items.length > 0 && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={{ padding: 20, gap: 12 }}
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          >
            {items.map((u) => (
              <Card key={u.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[styles.badge, { backgroundColor: '#FFF3D6' }]}>
                    <Text style={[t.type.footnote, { color: '#8A5A00', fontWeight: '600' }]}>
                      Pending
                    </Text>
                  </View>
                  <Text style={[t.type.footnote, { color: t.colors.text.tertiary }]}>
                    {u.author?.full_name ?? 'Apprentice'} · {relativeTime(u.created_at!)}
                  </Text>
                </View>

                {u.body && (
                  <Text
                    style={[t.type.body, { color: t.colors.text.primary, marginTop: 10, lineHeight: 22 }]}
                  >
                    {u.body}
                  </Text>
                )}

                {u.media && u.media.length > 0 && (
                  <View style={{ marginTop: 10 }}>
                    <MediaThumbs update_id={u.id} media={u.media} />
                  </View>
                )}

                {rejectingId === u.id ? (
                  <View style={{ marginTop: 12 }}>
                    <Text style={[t.type.footnote, { color: t.colors.text.secondary, marginBottom: 4 }]}>
                      Why are you rejecting this?
                    </Text>
                    <TextInput
                      value={reason}
                      onChangeText={setReason}
                      placeholder="The customer hasn't approved this milestone yet."
                      placeholderTextColor={t.colors.text.tertiary}
                      multiline
                      style={[
                        t.type.body,
                        {
                          color: t.colors.text.primary,
                          backgroundColor: t.colors.bg.surface2,
                          borderColor: t.colors.border.strong,
                          borderWidth: 1,
                          borderRadius: 10,
                          padding: 10,
                          minHeight: 70,
                          textAlignVertical: 'top',
                        },
                      ]}
                    />
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                      <View style={{ flex: 1 }}>
                        <PrimaryButton
                          title="Send rejection"
                          onPress={() => rejectMutation.mutate(u.id)}
                          loading={rejectMutation.isPending}
                          disabled={!reason.trim()}
                        />
                      </View>
                      <Pressable
                        onPress={() => {
                          setRejectingId(null);
                          setReason('');
                        }}
                        hitSlop={6}
                        style={{ alignSelf: 'center', paddingHorizontal: 8 }}
                      >
                        <Text style={[t.type.body, { color: t.colors.text.link }]}>Cancel</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                    <Pressable
                      onPress={() => approveMutation.mutate(u.id)}
                      disabled={approveMutation.isPending}
                      style={[styles.actionBtn, { backgroundColor: '#E2F5EA' }]}
                    >
                      <Ionicons name="checkmark-circle" size={18} color="#197A4D" />
                      <Text style={[t.type.bodyLgEmphasis, { color: '#197A4D' }]}>
                        Approve
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setRejectingId(u.id);
                        setReason('');
                      }}
                      style={[styles.actionBtn, { backgroundColor: '#FCEAE7' }]}
                    >
                      <Ionicons name="close-circle" size={18} color="#C0392B" />
                      <Text style={[t.type.bodyLgEmphasis, { color: '#C0392B' }]}>
                        Reject…
                      </Text>
                    </Pressable>
                  </View>
                )}
              </Card>
            ))}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
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
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
});
