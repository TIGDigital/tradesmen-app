import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { acceptCrewInvite, fetchCrewInviteByCode } from '@/services/crew';
import { useAuthStore } from '@/stores/auth';
import { lightTheme } from '@/theme/light';

/**
 * Crew invite acceptance screen. The recipient lands here from a shared
 * code (entered manually for now; a deep link arrives in a later sprint).
 *
 * If signed in → accept in place + bounce to the project detail.
 * If not → push to sign-in with a hint that the code is waiting.
 */
export default function CrewInviteAcceptScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();
  const { code } = useLocalSearchParams<{ code: string }>();
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const inviteQuery = useQuery({
    queryKey: ['crew-invite', code],
    queryFn: () => fetchCrewInviteByCode(code!),
    enabled: !!code,
  });

  const acceptMutation = useMutation({
    mutationFn: () => acceptCrewInvite(code!),
    onSuccess: async ({ project_id }) => {
      await queryClient.invalidateQueries({ queryKey: ['my-projects'] });
      await queryClient.invalidateQueries({ queryKey: ['project-crew', project_id] });
      await refreshProfile();
      router.replace({ pathname: '/project/[id]', params: { id: project_id } });
    },
    onError: (e) => Alert.alert("Couldn't accept", (e as Error).message),
  });

  const invite = inviteQuery.data;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['bottom']}>
      <View style={[styles.navBar, { paddingTop: insets.top, height: 44 + insets.top }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[t.type.bodyLg, { color: t.colors.text.link }]}>Cancel</Text>
        </Pressable>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>Crew invite</Text>
        <View style={{ width: 60 }} />
      </View>

      {inviteQuery.isLoading && (
        <View style={{ padding: 20, gap: 12 }}>
          <Skeleton width="60%" height={20} />
          <Skeleton width="100%" height={120} borderRadius={8} />
        </View>
      )}

      {inviteQuery.error && (
        <ErrorState message={(inviteQuery.error as Error).message} />
      )}

      {!inviteQuery.isLoading && !inviteQuery.error && !invite && (
        <ErrorState
          tone="empty"
          title="Invite not found"
          message="That code may be expired, used, or revoked. Ask the tradesman for a new one."
        />
      )}

      {invite && (() => {
        // Prefer the denormalised fields stored on the invite row — they're
        // populated by a trigger at insert time and don't need cross-table
        // RLS to read. Fall back to the joined relations for invites
        // generated before the denormalise migration.
        const projectTitle =
          invite.project_title ?? invite.project?.title ?? 'this project';
        const inviterName =
          invite.inviter_name ?? invite.inviter?.full_name ?? 'Your tradesman';
        return (
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
          <Card>
            <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>
              You've been invited to
            </Text>
            <Text style={[t.type.title2, { color: t.colors.text.primary, marginTop: 4 }]}>
              {projectTitle}
            </Text>
            <Text style={[t.type.body, { color: t.colors.text.secondary, marginTop: 12 }]}>
              {inviterName} added you to the crew.
            </Text>
            <Text style={[t.type.footnote, { color: t.colors.text.tertiary, marginTop: 12 }]}>
              Code: {invite.invite_code}
            </Text>
          </Card>

          {!session ? (
            <Card>
              <Text style={[t.type.body, { color: t.colors.text.primary }]}>
                Create a Phase account to accept, or sign in if you've used Phase before.
              </Text>
              <View style={{ marginTop: 12, gap: 10 }}>
                <PrimaryButton
                  title="Create account"
                  onPress={() =>
                    router.push({
                      pathname: '/crew-signup/[code]',
                      params: { code: code! },
                    })
                  }
                />
                <Pressable
                  onPress={() => router.push('/(auth)/sign-in')}
                  hitSlop={8}
                  style={{ alignItems: 'center', paddingVertical: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="I already have a Phase account"
                >
                  <Text style={[t.type.body, { color: t.colors.text.link, fontWeight: '600' }]}>
                    I already have an account
                  </Text>
                </Pressable>
              </View>
            </Card>
          ) : (
            <PrimaryButton
              title="Accept invite"
              onPress={() => acceptMutation.mutate()}
              loading={acceptMutation.isPending}
            />
          )}
        </ScrollView>
        );
      })()}
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
