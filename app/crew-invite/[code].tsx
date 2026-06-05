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

      {invite && (
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
          <Card>
            <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>
              You've been invited to
            </Text>
            <Text style={[t.type.title2, { color: t.colors.text.primary, marginTop: 4 }]}>
              {invite.project?.title ?? 'a project'}
            </Text>
            <Text style={[t.type.body, { color: t.colors.text.secondary, marginTop: 12 }]}>
              {invite.inviter?.full_name ?? 'The lead tradesman'} added you as the{' '}
              <Text style={{ fontWeight: '700' }}>{invite.role_on_project}</Text>.
            </Text>
            <Text style={[t.type.footnote, { color: t.colors.text.tertiary, marginTop: 12 }]}>
              Code: {invite.invite_code}
            </Text>
          </Card>

          {!session ? (
            <Card>
              <Text style={[t.type.body, { color: t.colors.text.primary }]}>
                Sign in or create an account to accept this invite.
              </Text>
              <View style={{ marginTop: 12 }}>
                <PrimaryButton
                  title="Sign in"
                  onPress={() => router.push('/(auth)/sign-in')}
                />
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
});
