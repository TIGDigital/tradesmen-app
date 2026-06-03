import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
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
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      )}

      {!isLoading && (projects?.length ?? 0) === 0 && (
        <View style={styles.center}>
          <Text style={[t.type.body, { color: t.colors.text.tertiary, textAlign: 'center' }]}>
            No conversations yet.{'\n'}Create a project and invite a customer to start chatting.
          </Text>
        </View>
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
