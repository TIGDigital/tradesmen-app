import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  createCrewInvite,
  listPendingCrewInvites,
  listProjectCrew,
  removeCrewMember,
  revokeCrewInvite,
  updateCrewRole,
  type CrewInvite,
  type CrewMember,
} from '@/services/crew';
import { APP_DOWNLOAD_URL } from '@/constants/links';
import { relativeTime } from '@/services/projects';
import { useAuthStore } from '@/stores/auth';
import { lightTheme } from '@/theme/light';

/**
 * Per-project crew screen. Lead can invite + remove non-lead members;
 * everyone else sees the list read-only.
 *
 * Invite flow: tap + → inline form → enter invitee name → Generate.
 * The screen flips to a "code ready" state with the 6-character code +
 * an iOS Share button. No Twilio needed — tradesman picks WhatsApp /
 * Messages / Email from the system share sheet.
 */
export default function ProjectCrewScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.profile?.role);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['project-crew', id],
    queryFn: () => listProjectCrew(id!),
    enabled: !!id,
  });

  const pendingQuery = useQuery({
    queryKey: ['project-crew-pending', id],
    queryFn: () => listPendingCrewInvites(id!),
    enabled: !!id,
  });
  const pendingInvites = pendingQuery.data ?? [];

  const removeMutation = useMutation({
    mutationFn: (user_id: string) =>
      removeCrewMember({ project_id: id!, user_id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project-crew', id] }),
    onError: (e) => Alert.alert("Couldn't remove", (e as Error).message),
  });

  const roleMutation = useMutation({
    mutationFn: (args: { user_id: string; role: 'apprentice' | 'helper' }) =>
      updateCrewRole({ project_id: id!, user_id: args.user_id, role_on_project: args.role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project-crew', id] }),
    onError: (e) => Alert.alert("Couldn't change their role", (e as Error).message),
  });

  function onChangeRole(member: CrewMember) {
    const other = member.role_on_project === 'apprentice' ? 'helper' : 'apprentice';
    Alert.alert(
      `Make ${member.user?.full_name?.split(' ')[0] ?? 'them'} a ${other}?`,
      other === 'helper'
        ? 'Helpers post straight to the customer, no approval queue.'
        : 'Apprentice posts wait in your approval queue first.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Make ${other}`,
          onPress: () => roleMutation.mutate({ user_id: member.user_id, role: other }),
        },
      ],
    );
  }

  const revokeMutation = useMutation({
    mutationFn: (invite_id: string) => revokeCrewInvite(invite_id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project-crew-pending', id] }),
    onError: (e) => Alert.alert("Couldn't cancel the invite", (e as Error).message),
  });

  function confirmRevoke(inv: { id: string; invitee_name: string }) {
    Alert.alert(
      'Cancel this invite?',
      `${inv.invitee_name}'s code stops working. You can always send a new one.`,
      [
        { text: 'Keep it', style: 'cancel' },
        { text: 'Cancel invite', style: 'destructive', onPress: () => revokeMutation.mutate(inv.id) },
      ],
    );
  }

  // Invite UI state: 'idle' (no form), 'form' (entering name), 'ready' (showing code + share).
  const [inviteState, setInviteState] = useState<'idle' | 'form' | 'ready'>('idle');
  const [inviteeName, setInviteeName] = useState('');
  const [inviteRole, setInviteRole] = useState<'apprentice' | 'helper'>('apprentice');
  const [generatedInvite, setGeneratedInvite] = useState<CrewInvite | null>(null);

  const inviteMutation = useMutation({
    mutationFn: () =>
      createCrewInvite({ project_id: id!, invitee_name: inviteeName, role_on_project: inviteRole }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['project-crew-pending', id] }),
    onSuccess: (row) => {
      setGeneratedInvite(row);
      setInviteState('ready');
      setInviteeName('');
    },
    onError: (e) => Alert.alert("Couldn't create invite", (e as Error).message),
  });

  async function onShareInvite() {
    if (!generatedInvite) return;
    const projectTitle = generatedInvite.project?.title ?? 'a project';
    const inviterName = generatedInvite.inviter?.full_name ?? 'your lead';
    const message =
      `${inviterName} has invited you to join ${projectTitle} on Phase.\n\n` +
      `Your crew code: ${generatedInvite.invite_code}\n\n` +
      `https://getphase.co.uk/crew/${generatedInvite.invite_code}\n\n` +
      `Expires in 14 days.`;
    try {
      await Share.share({ message });
    } catch {
      // user cancelled
    }
  }

  function confirmRemove(member: CrewMember) {
    Alert.alert(
      'Remove from crew?',
      `${member.user?.full_name ?? 'This member'} won't see this project any more.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeMutation.mutate(member.user_id),
        },
      ],
    );
  }

  const items = data ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['bottom']}>
      <View style={[styles.navBar, { paddingTop: insets.top, height: 44 + insets.top }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[t.type.bodyLg, { color: t.colors.text.link }]}>Done</Text>
        </Pressable>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>Crew</Text>
        {/* Inviting crew is the tradesman's job — customers see the list read-only. */}
        {role === 'tradesman' ? (
          <Pressable
            onPress={() => {
              setGeneratedInvite(null);
              setInviteeName('');
              setInviteState('form');
            }}
            hitSlop={12}
            accessibilityLabel="Invite crew"
          >
            <Ionicons name="add-circle" size={28} color={t.colors.text.link} />
          </Pressable>
        ) : (
          <View style={{ width: 28 }} />
        )}
      </View>

      {isLoading && (
        <View style={{ padding: 20, gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <Skeleton width={44} height={44} borderRadius={999} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Skeleton width="50%" height={16} />
                  <Skeleton width="30%" height={12} />
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}

      {error && (
        <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />
      )}

      {!isLoading && !error && items.length === 0 && pendingInvites.length === 0 && (
        <ErrorState
          tone="empty"
          title="No crew yet"
          message="The lead tradesman is shown here. Add an apprentice in Sprint 37."
        />
      )}

      {/* Invite form / generated-code panel sit ABOVE the crew list when active. */}
      {inviteState === 'form' && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ padding: 20 }}>
            <Card>
              <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>Invitee name</Text>
              <TextInput
                value={inviteeName}
                onChangeText={setInviteeName}
                placeholder="Sam Watkins"
                placeholderTextColor={t.colors.text.tertiary}
                autoCapitalize="words"
                style={[
                  t.type.bodyLg,
                  {
                    color: t.colors.text.primary,
                    backgroundColor: t.colors.bg.surface2,
                    borderColor: t.colors.border.strong,
                    borderWidth: 1,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    marginTop: 6,
                  },
                ]}
              />
              <Text style={[t.type.caption, { color: t.colors.text.tertiary, marginTop: 14 }]}>
                Their role
              </Text>
              <View style={{ gap: 8, marginTop: 8 }}>
                {([
                  { value: 'apprentice', label: 'Apprentice', hint: 'Their posts wait in your approval queue. Right for subcontractors too.' },
                  { value: 'helper', label: 'Helper', hint: 'Trusted crew: posts go straight to the customer.' },
                ] as const).map((o) => {
                  const active = inviteRole === o.value;
                  return (
                    <Pressable
                      key={o.value}
                      onPress={() => setInviteRole(o.value)}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: active ? t.colors.brand.primary : t.colors.border.subtle,
                        backgroundColor: active ? t.colors.brand.tint : t.colors.bg.surface,
                      }}
                    >
                      <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
                        {o.label}
                      </Text>
                      <Text style={[t.type.footnote, { color: t.colors.text.secondary, marginTop: 2 }]}>
                        {o.hint}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ gap: 8, marginTop: 14 }}>
                <PrimaryButton
                  title="Generate invite code"
                  onPress={() => inviteMutation.mutate()}
                  loading={inviteMutation.isPending}
                  disabled={!inviteeName.trim()}
                />
                <Pressable
                  onPress={() => setInviteState('idle')}
                  hitSlop={6}
                  style={{ alignItems: 'center', paddingVertical: 8 }}
                >
                  <Text style={[t.type.body, { color: t.colors.text.link }]}>Cancel</Text>
                </Pressable>
              </View>
            </Card>
          </View>
        </KeyboardAvoidingView>
      )}

      {inviteState === 'ready' && generatedInvite && (
        <View style={{ padding: 20 }}>
          <Card>
            <Text style={[t.type.caption, { color: t.colors.text.tertiary, marginBottom: 6 }]}>
              Share with {generatedInvite.invitee_name}
            </Text>
            <Text
              selectable
              style={[
                t.type.title1,
                {
                  color: t.colors.text.primary,
                  letterSpacing: 4,
                  textAlign: 'center',
                  paddingVertical: 16,
                  backgroundColor: t.colors.bg.surface2,
                  borderRadius: 12,
                },
              ]}
            >
              {generatedInvite.invite_code}
            </Text>
            <Text
              style={[t.type.footnote, { color: t.colors.text.tertiary, marginTop: 6, textAlign: 'center' }]}
            >
              Long-press the code to copy · expires in 14 days
            </Text>
            <View style={{ gap: 8, marginTop: 14 }}>
              <PrimaryButton title="Share via…" onPress={onShareInvite} />
              <Pressable
                onPress={() => setInviteState('idle')}
                hitSlop={6}
                style={{ alignItems: 'center', paddingVertical: 8 }}
              >
                <Text style={[t.type.body, { color: t.colors.text.link }]}>Done</Text>
              </Pressable>
            </View>
          </Card>
        </View>
      )}

      {(items.length > 0 || pendingInvites.length > 0) && (
        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 12 }}
          refreshControl={<RefreshControl tintColor={t.colors.brand.primary} refreshing={isRefetching} onRefresh={refetch} />}
        >
          {items.map((m) => (
            <Card key={m.user_id}>
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/tradesman/[id]', params: { id: m.user_id } })
                }
                style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}
              >
                <View style={[styles.avatar, { backgroundColor: t.colors.bg.surface2 }]}>
                  {m.user?.avatar_url ? (
                    <Image
                      source={{ uri: m.user.avatar_url }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  ) : (
                    <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.secondary }]}>
                      {(m.user?.full_name ?? '?')[0]?.toUpperCase() ?? '?'}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}
                    numberOfLines={1}
                  >
                    {m.user?.full_name ?? 'Crew member'}
                  </Text>
                  {m.role_on_project !== 'lead' ? (
                    <Pressable onPress={() => onChangeRole(m)} hitSlop={6}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <RolePill role={m.role_on_project} />
                        <Ionicons name="swap-horizontal" size={14} color={t.colors.text.link} />
                      </View>
                    </Pressable>
                  ) : (
                    <RolePill role={m.role_on_project} />
                  )}
                </View>
                {m.role_on_project !== 'lead' && (
                  <Pressable
                    onPress={() => confirmRemove(m)}
                    hitSlop={6}
                    style={{ padding: 6 }}
                    disabled={removeMutation.isPending}
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={22}
                      color={t.colors.destructive.text}
                    />
                  </Pressable>
                )}
              </Pressable>
            </Card>
          ))}

          {/* ── Outstanding invites — sent but not yet accepted ── */}
          {pendingInvites.length > 0 && (
            <>
              <Text
                style={[
                  t.type.caption,
                  { color: t.colors.text.tertiary, marginTop: items.length > 0 ? 8 : 0 },
                ]}
              >
                Waiting to join
              </Text>
              {pendingInvites.map((inv) => (
                <Card key={inv.id}>
                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <View style={[styles.avatar, { backgroundColor: t.colors.bg.surface2 }]}>
                      <Ionicons name="hourglass-outline" size={18} color={t.colors.text.tertiary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}
                        numberOfLines={1}
                      >
                        {inv.invitee_name}
                      </Text>
                      <Text style={[t.type.footnote, { color: t.colors.text.tertiary }]}>
                        Invited {relativeTime(inv.created_at)} · code {inv.invite_code}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() =>
                        void Share.share({
                          message:
                            `You've been invited to join a project on Phase.\n\n` +
                            `Your crew code: ${inv.invite_code}\n\n` +
                            `https://getphase.co.uk/crew/${inv.invite_code}`,
                        })
                      }
                      hitSlop={6}
                      style={{ padding: 6 }}
                      accessibilityLabel="Re-share invite"
                    >
                      <Ionicons name="share-outline" size={20} color={t.colors.text.link} />
                    </Pressable>
                    <Pressable
                      onPress={() => confirmRevoke(inv)}
                      hitSlop={6}
                      style={{ padding: 6 }}
                      disabled={revokeMutation.isPending}
                      accessibilityLabel="Cancel invite"
                    >
                      <Ionicons name="close-circle-outline" size={20} color={t.colors.destructive.text} />
                    </Pressable>
                  </View>
                </Card>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function RolePill({ role }: { role: 'lead' | 'apprentice' | 'helper' }) {
  const t = lightTheme;
  const { bg, fg, label } =
    role === 'lead'
      ? { bg: '#E2ECFF', fg: '#1B4DD9', label: 'Lead' }
      : role === 'apprentice'
        ? { bg: '#FFF3D6', fg: '#8A5A00', label: 'Apprentice' }
        : { bg: '#E2F5EA', fg: '#197A4D', label: 'Helper' };
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderRadius: 999,
        backgroundColor: bg,
        marginTop: 4,
      }}
    >
      <Text style={[t.type.footnote, { color: fg, fontWeight: '600' }]}>{label}</Text>
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
