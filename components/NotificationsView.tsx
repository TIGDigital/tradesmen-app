import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import {
  fetchMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRow,
} from '@/services/notifications';
import { relativeTime } from '@/services/projects';
import { useAuthStore } from '@/stores/auth';
import { lightTheme } from '@/theme/light';

/**
 * Shared body for the Notifications tab. Both (customer)/notifications and
 * (tradesman)/notifications render this — same UI for both roles.
 *
 * Unread rows get a left-side blue dot. Tapping a row marks it read and
 * deep-links into the project (if the row has a project_id).
 */
export function NotificationsView() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.profile?.id) ?? null;
  const queryClient = useQueryClient();

  useRealtimeNotifications(userId);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: fetchMyNotifications,
    enabled: !!userId,
  });

  const items = data ?? [];
  const unreadCount = items.filter((n) => !n.read_at).length;

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  });

  function onItemPress(n: NotificationRow) {
    if (!n.read_at) {
      // Fire-and-forget — UI will refresh via realtime + invalidation.
      void markNotificationRead(n.id);
    }
    if (n.project_id) {
      router.push({ pathname: '/project/[id]', params: { id: n.project_id } });
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[t.type.title1, { color: t.colors.text.primary }]}>Inbox</Text>
        {unreadCount > 0 && (
          <Pressable onPress={() => markAllMutation.mutate()} hitSlop={6}>
            <Text style={[t.type.bodyLg, { color: t.colors.text.link }]}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {isLoading && (
        <View style={{ padding: t.space[5], gap: t.space[3] }}>
          {[0, 1, 2, 3].map((i) => (
            <Card key={i}>
              <View style={{ gap: 6 }}>
                <Skeleton width="60%" height={16} />
                <Skeleton width="90%" height={14} />
                <Skeleton width="20%" height={10} />
              </View>
            </Card>
          ))}
        </View>
      )}

      {error && (
        <ErrorState
          message={(error as Error).message}
          onRetry={() => void refetch()}
        />
      )}

      {!isLoading && !error && items.length === 0 && (
        <ErrorState
          tone="empty"
          title="You're all caught up"
          message="New notifications will land here when something happens on a project."
        />
      )}

      {items.length > 0 && (
        <ScrollView
          contentContainerStyle={{ padding: t.space[5], gap: t.space[3] }}
          refreshControl={<RefreshControl tintColor={t.colors.brand.primary} refreshing={isRefetching} onRefresh={refetch} />}
        >
          {items.map((n) => (
            <Card key={n.id}>
              <Pressable onPress={() => onItemPress(n)} style={styles.row}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: n.read_at ? 'transparent' : t.colors.brand.primary },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      t.type.bodyLgEmphasis,
                      { color: t.colors.text.primary },
                    ]}
                    numberOfLines={1}
                  >
                    {n.title}
                  </Text>
                  {n.body && (
                    <Text
                      style={[t.type.body, { color: t.colors.text.secondary, marginTop: 2 }]}
                      numberOfLines={2}
                    >
                      {n.body}
                    </Text>
                  )}
                  <Text style={[t.type.footnote, { color: t.colors.text.tertiary, marginTop: 4 }]}>
                    {relativeTime(n.created_at)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={t.colors.text.tertiary} />
              </Pressable>
            </Card>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginTop: 8,
  },
});
