import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
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
import { EventPill } from '@/components/ui/EventPill';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRealtimeProject } from '@/hooks/useRealtimeProject';
import {
  markUpdatesSeen,
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

  const queryClient = useQueryClient();
  const projectQuery = useQuery({
    queryKey: ['my-current-project'],
    queryFn: () => fetchMyCurrentProject(),
  });
  const projectId = projectQuery.data?.id ?? null;

  useRealtimeProject(projectId);

  const updatesQuery = useQuery({
    queryKey: ['updates', projectId],
    queryFn: () => fetchProjectUpdates(projectId!),
    enabled: !!projectId,
  });

  // Which updates were UNSEEN when the feed opened — snapshot those, show
  // a NEW pill on them, THEN send the read receipt (the receipt used to
  // fire first, so nothing ever looked new — beta feedback 23 Oct).
  //
  // The snapshot re-arms every time the screen regains FOCUS (not just
  // once per mount, as before): tab screens stay mounted, so updates that
  // arrived while you were elsewhere never got pills and never got marked
  // seen until a full relaunch.
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const needsSnapshot = useRef(true);

  const { refetch: refetchUpdates } = updatesQuery;
  useFocusEffect(
    useCallback(() => {
      needsSnapshot.current = true;
      void refetchUpdates();
    }, [refetchUpdates]),
  );

  useEffect(() => {
    if (!updatesQuery.data || !projectId) return;
    const unseen = updatesQuery.data
      .filter((u) => !(u as { customer_seen_at?: string | null }).customer_seen_at)
      .map((u) => u.id);
    if (needsSnapshot.current) {
      // Fresh focus: pills reflect exactly what's new since last visit.
      needsSnapshot.current = false;
      setNewIds(new Set(unseen));
    } else if (unseen.length > 0) {
      // Realtime arrival while already focused: add to the pills.
      setNewIds((prev) => new Set([...prev, ...unseen]));
    }
    if (unseen.length > 0) {
      void markUpdatesSeen(projectId);
      queryClient.invalidateQueries({ queryKey: ['unseen-updates'] });
    }
  }, [updatesQuery.data, projectId, queryClient]);

  // Customers only see approved updates — pending ones are hidden until
  // the lead signs off (Sprint 38 approval queue).
  const updates = (updatesQuery.data ?? []).filter(
    (u) => (u as { approval_status?: string }).approval_status !== 'pending'
       && (u as { approval_status?: string }).approval_status !== 'rejected',
  );
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
          refreshControl={<RefreshControl tintColor={t.colors.brand.primary} refreshing={isRefreshing} onRefresh={refresh} />}
        >
          {updates.length === 0 ? (
            <Text style={[t.type.body, { color: t.colors.text.tertiary }]}>
              No updates yet.
            </Text>
          ) : (
            updates.map((u) => {
              // System rows (status flips, milestone ticks) render as quiet
              // event pills, not full author cards — nobody "wrote" them.
              if (u.type === 'status' || u.type === 'milestone') {
                return (
                  <Pressable
                    key={u.id}
                    onPress={() =>
                      router.push({
                        pathname: '/comments/[update_id]',
                        params: { update_id: u.id },
                      })
                    }
                  >
                    <EventPill
                      kind={u.type === 'milestone' ? 'milestone' : 'left'}
                      title={(u.body ?? '').replace(/^Status:\s*/, '')}
                      timestamp={relativeTime(u.created_at!)}
                    />
                  </Pressable>
                );
              }
              return (
              <Pressable
                key={u.id}
                onPress={() =>
                  router.push({
                    pathname: '/comments/[update_id]',
                    params: { update_id: u.id },
                  })
                }
              >
                <Card>
                  {newIds.has(u.id) && (
                    <View
                      style={{
                        alignSelf: 'flex-start',
                        paddingVertical: 3,
                        paddingHorizontal: 9,
                        borderRadius: 999,
                        backgroundColor: '#EAF0FF',
                        marginBottom: 8,
                      }}
                    >
                      <Text style={{ color: '#1B4DD9', fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>
                        NEW
                      </Text>
                    </View>
                  )}
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
              );
            })
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
