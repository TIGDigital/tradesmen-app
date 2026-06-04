import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { fetchMyProjects } from '@/services/projects';
import { lightTheme } from '@/theme/light';

/**
 * Tradesman "Messages" inbox. Lists every active project with a row per
 * conversation. Tapping a row opens that project's existing chat screen.
 * For now there's no last-message preview / unread badge — that's a fast
 * follow that'd require either a denormalised column on `projects` or an N+1
 * fetch of the latest `messages` row per project.
 */
export default function TradesmanMessagesScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();

  const { data: projects, isLoading } = useQuery({
    queryKey: ['my-projects'],
    queryFn: fetchMyProjects,
  });

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[t.type.title1, { color: t.colors.text.primary }]}>Messages</Text>
      </View>

      {isLoading && (
        <View style={{ padding: t.space[5], gap: t.space[3] }}>
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <Skeleton width={44} height={44} borderRadius={999} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Skeleton width="55%" height={16} />
                  <Skeleton width="35%" height={12} />
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}

      {!isLoading && (projects?.length ?? 0) === 0 && (
        <ErrorState
          tone="empty"
          title="No conversations yet"
          message="Create a project and invite a customer to start chatting."
        />
      )}

      {projects && projects.length > 0 && (
        <ScrollView contentContainerStyle={{ padding: t.space[5], gap: t.space[3] }}>
          {projects.map((p) => {
            const name = p.pending_customer_name ?? 'Customer';
            return (
              <Card key={p.id}>
                <Pressable
                  onPress={() =>
                    router.push({ pathname: '/project/[id]/chat', params: { id: p.id } })
                  }
                  style={styles.row}
                >
                  <View style={[styles.avatar, { backgroundColor: t.colors.bg.surface2 }]}>
                    <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.secondary }]}>
                      {name[0]?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]} numberOfLines={1}>
                      {name}
                    </Text>
                    <Text style={[t.type.footnote, { color: t.colors.text.tertiary, marginTop: 2 }]} numberOfLines={1}>
                      {p.title}
                    </Text>
                  </View>
                  <Text style={[t.type.bodyLg, { color: t.colors.text.tertiary }]}>›</Text>
                </Pressable>
              </Card>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
