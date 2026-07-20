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
  listProjectCrew,
  removeCrewMember,
  type CrewInvite,
  type CrewMember,
} from '@/services/crew';
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

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['project-crew', id],
    queryFn: () => listProjectCrew(id!),
    enabled: !!id,
  });

  const removeMutation = useMutation({
    mutationFn: (user_id: string) =>
      removeCrewMember({ project_id: id!, user_id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project-crew', id] }),
    onError: (e) => Alert.alert("Couldn't remove", (e as Error).message),
  });

  // Invite UI state: 'idle' (no form), 'form' (entering name), 'ready' (showing code + share).
  const [inviteState, setInviteState] = useState<'idle' | 'form' | 'ready'>('idle');
  const [inviteeName, setInviteeName] = useState('');
  const [generatedInvite, setGeneratedInvite] = useState<CrewInvite | null>(null);

  const inviteMutation = useMutation({
    mutationFn: () =>
      createCrewInvite({ project_id: id!, invitee_name: inviteeName }),
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
      `Open the app and enter this code:\n${generatedInvite.invite_code}\n\n` +
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

      {!isLoading && !error && items.length === 0 && (
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

      {items.length > 0 && (
        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 12 }}
          refreshControl={<RefreshControl tintColor={t.colors.brand.primary} refreshing={isRefetching} onRefresh={refetch} />}
        >
          {items.map((m) => (
            <Card key={m.user_id}>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
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
                  <RolePill role={m.role_on_project} />
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
              </View>
            </Card>
          ))}
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
