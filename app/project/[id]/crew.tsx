import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { listProjectCrew, removeCrewMember, type CrewMember } from '@/services/crew';
import { lightTheme } from '@/theme/light';

/**
 * Per-project crew screen. Lead can remove non-lead members; everyone
 * else sees the list read-only.
 *
 * Adding members ships in Sprint 37 (SMS invite flow) — for now the +
 * button shows a "coming soon" alert that points to the invite flow.
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
          onPress={() =>
            Alert.alert(
              'Coming next sprint',
              'SMS-invite an apprentice ships in Sprint 37.',
            )
          }
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

      {items.length > 0 && (
        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 12 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
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
