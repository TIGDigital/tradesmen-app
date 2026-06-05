import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
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
import { listMyCrew, type CrewMember } from '@/services/crew';
import { lightTheme } from '@/theme/light';

/**
 * Tradesman Crew tab — every active crew row across every project I
 * lead, EXCLUDING me. Grouped by user so an apprentice on multiple
 * projects shows up once with their projects listed underneath.
 *
 * Tap a row to open that project's crew screen for management.
 */
export default function TradesmanCrewScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['my-crew'],
    queryFn: listMyCrew,
  });

  const grouped = groupByUser(data ?? []);

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[t.type.title1, { color: t.colors.text.primary }]}>Crew</Text>
      </View>

      {isLoading && (
        <View style={{ padding: 20, gap: 12 }}>
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

      {error && <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />}

      {!isLoading && !error && grouped.length === 0 && (
        <ErrorState
          tone="empty"
          title="No crew yet"
          message="Open a project and tap the Crew card to add apprentices in the next sprint."
        />
      )}

      {grouped.length > 0 && (
        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 12 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
          {grouped.map((g) => (
            <Card key={g.user_id}>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <View style={[styles.avatar, { backgroundColor: t.colors.bg.surface2 }]}>
                  {g.avatar_url ? (
                    <Image source={{ uri: g.avatar_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  ) : (
                    <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.secondary }]}>
                      {(g.full_name ?? '?')[0]?.toUpperCase() ?? '?'}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]} numberOfLines={1}>
                    {g.full_name ?? 'Crew member'}
                  </Text>
                  <Text style={[t.type.footnote, { color: t.colors.text.tertiary, marginTop: 2 }]}>
                    {g.projects.length} project{g.projects.length === 1 ? '' : 's'}
                  </Text>
                </View>
              </View>
              <View style={{ marginTop: 10, gap: 6 }}>
                {g.projects.map((p) => (
                  <Pressable
                    key={p.project_id}
                    onPress={() =>
                      router.push({ pathname: '/project/[id]/crew', params: { id: p.project_id } })
                    }
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      backgroundColor: t.colors.bg.surface2,
                      borderRadius: 8,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={[t.type.body, { color: t.colors.text.primary, flex: 1 }]} numberOfLines={1}>
                      {p.title}
                    </Text>
                    <Text style={[t.type.footnote, { color: t.colors.text.tertiary }]}>
                      {p.role}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Card>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

type Group = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  projects: { project_id: string; title: string; role: string }[];
};

function groupByUser(rows: CrewMember[]): Group[] {
  const map = new Map<string, Group>();
  for (const r of rows) {
    const key = r.user_id;
    if (!map.has(key)) {
      map.set(key, {
        user_id: key,
        full_name: r.user?.full_name ?? null,
        avatar_url: r.user?.avatar_url ?? null,
        projects: [],
      });
    }
    map.get(key)!.projects.push({
      project_id: r.project_id,
      title: r.project?.title ?? 'Project',
      role: r.role_on_project,
    });
  }
  return [...map.values()];
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
