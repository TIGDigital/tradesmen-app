import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MediaThumbs } from '@/components/MediaThumbs';
import { Reactions } from '@/components/Reactions';
import { VoicePlayer } from '@/components/VoicePlayer';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRealtimeProject } from '@/hooks/useRealtimeProject';
import {
  fetchMyCurrentProject,
  fetchProjectUpdates,
  formatEta,
  relativeTime,
} from '@/services/projects';
import { lightTheme } from '@/theme/light';

/**
 * Customer "Updates" tab — full timeline feed for the current project.
 * The Project tab keeps the hero + Today/Next + latest-update teaser; this
 * tab is purely the chronological feed. Realtime keeps it live in parallel
 * with the Project tab.
 */
export default function CustomerUpdatesScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();

  const projectQuery = useQuery({
    queryKey: ['my-current-project'],
    queryFn: fetchMyCurrentProject,
  });
  const projectId = projectQuery.data?.id ?? null;

  useRealtimeProject(projectId);

  const updatesQuery = useQuery({
    queryKey: ['updates', projectId],
    queryFn: () => fetchProjectUpdates(projectId!),
    enabled: !!projectId,
  });

  const updates = updatesQuery.data ?? [];
  const isRefreshing = projectQuery.isRefetching || updatesQuery.isRefetching;
  const refresh = () => {
    void projectQuery.refetch();
    void updatesQuery.refetch();
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[t.type.title1, { color: t.colors.text.primary }]}>Updates</Text>
      </View>

      {projectQuery.isLoading && (
        <View style={{ padding: t.space[5], gap: t.space[3] }}>
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <Skeleton width={32} height={32} borderRadius={999} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Skeleton width="40%" height={14} />
                  <Skeleton width="25%" height={10} />
                </View>
              </View>
              <View style={{ height: 12 }} />
              <Skeleton width="100%" height={12} />
              <View style={{ height: 6 }} />
              <Skeleton width="80%" height={12} />
            </Card>
          ))}
        </View>
      )}

      {projectQuery.error && (
        <ErrorState
          message={(projectQuery.error as Error).message}
          onRetry={() => void projectQuery.refetch()}
        />
      )}

      {!projectQuery.isLoading && !projectQuery.error && !projectQuery.data && (
        <ErrorState
          tone="empty"
          title="No project yet"
          message="Updates will land here when your tradesman posts them."
        />
      )}

      {projectQuery.data && (
        <ScrollView
          contentContainerStyle={{ padding: t.space[5], gap: t.space[3], paddingBottom: t.space[16] }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
        >
          {updates.length === 0 ? (
            <Text style={[t.type.body, { color: t.colors.text.tertiary }]}>
              No updates yet.
            </Text>
          ) : (
            updates.map((u) => (
              <Pressable
                key={u.id}
                onPress={() =>
                  router.push({
                    pathname: '/project/[id]',
                    params: { id: projectId! },
                  })
                }
              >
                <Card>
                  <View style={styles.updateHead}>
                    <View style={[styles.avatar, { backgroundColor: '#A04A1C' }]}>
                      <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
                        {(u.author?.full_name ?? '?')[0]?.toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
                        {u.author?.full_name ?? 'Someone'}
                      </Text>
                      <Text style={[t.type.footnote, { color: t.colors.text.tertiary }]}>
                        {relativeTime(u.created_at!)}
                      </Text>
                    </View>
                  </View>
                  {u.body && (
                    <Text style={[t.type.body, { color: t.colors.text.primary, marginTop: t.space[3] }]}>
                      {u.body}
                    </Text>
                  )}
                  {u.media && u.media.length > 0 && (
                    <View style={{ marginTop: t.space[3] }}>
                      <MediaThumbs update_id={u.id} media={u.media} />
                    </View>
                  )}
                  {u.media?.find((m) => m.media_type === 'voice') && (
                    <View style={{ marginTop: t.space[3] }}>
                      <VoicePlayer
                        storage_path={u.media.find((m) => m.media_type === 'voice')!.storage_path}
                      />
                    </View>
                  )}
                  {u.type === 'eta' && u.eta_at && (
                    <View
                      style={{
                        marginTop: t.space[3],
                        paddingTop: t.space[3],
                        borderTopWidth: 1,
                        borderTopColor: t.colors.border.subtle,
                      }}
                    >
                      <Text style={[t.type.footnote, { color: t.colors.text.secondary }]}>
                        ⏰ {formatEta(u.eta_at)}
                      </Text>
                    </View>
                  )}
                  <Reactions update_id={u.id} project_id={projectId!} reactions={u.reactions} />
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/comments/[update_id]',
                        params: { update_id: u.id },
                      })
                    }
                    hitSlop={6}
                    style={{ paddingVertical: 8, marginTop: 4 }}
                  >
                    <Text style={[t.type.footnote, { color: t.colors.text.link }]}>
                      {(u.comments?.length ?? 0) === 0
                        ? 'Add a comment'
                        : `View ${u.comments!.length} comment${u.comments!.length === 1 ? '' : 's'} →`}
                    </Text>
                  </Pressable>
                </Card>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  updateHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
