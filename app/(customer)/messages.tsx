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
import { fetchMyCurrentProject } from '@/services/projects';
import { lightTheme } from '@/theme/light';

/**
 * Customer "Messages" tab. In the invite-only single-project model a customer
 * has exactly one active conversation — with their tradesman. We render it as
 * a list of one row so the affordance reads like a real inbox; tapping the
 * row opens the existing per-project chat screen.
 */
export default function CustomerMessagesScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();

  const { data: project, isLoading } = useQuery({
    queryKey: ['my-current-project'],
    queryFn: fetchMyCurrentProject,
  });

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[t.type.title1, { color: t.colors.text.primary }]}>Messages</Text>
      </View>

      {isLoading && (
        <View style={{ padding: t.space[5], gap: t.space[3] }}>
          <Card>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Skeleton width={44} height={44} borderRadius={999} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton width="55%" height={16} />
                <Skeleton width="35%" height={12} />
              </View>
            </View>
          </Card>
        </View>
      )}

      {!isLoading && !project && (
        <ErrorState
          tone="empty"
          title="No conversations yet"
          message="They'll appear here once a tradesman invites you."
        />
      )}

      {project && (
        <ScrollView contentContainerStyle={{ padding: t.space[5], gap: t.space[3] }}>
          <Card>
            <Pressable
              onPress={() =>
                router.push({ pathname: '/project/[id]/chat', params: { id: project.id } })
              }
              style={styles.row}
            >
              <View style={[styles.avatar, { backgroundColor: t.colors.bg.surface2 }]}>
                <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.secondary }]}>
                  {(project.tradesman?.full_name ?? '?')[0]?.toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]} numberOfLines={1}>
                  {project.tradesman?.full_name ?? 'Your tradesman'}
                </Text>
                <Text style={[t.type.footnote, { color: t.colors.text.tertiary, marginTop: 2 }]} numberOfLines={1}>
                  {project.title}
                </Text>
              </View>
              <Text style={[t.type.bodyLg, { color: t.colors.text.tertiary }]}>›</Text>
            </Pressable>
          </Card>
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
