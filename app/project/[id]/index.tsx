import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProjectHero } from '@/components/ProjectHero';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import {
  dayOfProject,
  fetchProject,
  fetchProjectUpdates,
  relativeTime,
  statusHeadline,
} from '@/services/projects';
import { useAuthStore } from '@/stores/auth';
import { lightTheme } from '@/theme/light';
import type { ProjectStatus } from '@/theme/tokens';

export default function ProjectDetailScreen() {
  const t = lightTheme;
  const { id } = useLocalSearchParams<{ id: string }>();
  const role = useAuthStore((s) => s.profile?.role);

  const projectQuery = useQuery({
    queryKey: ['project', id],
    queryFn: () => fetchProject(id!),
    enabled: !!id,
  });

  const updatesQuery = useQuery({
    queryKey: ['updates', id],
    queryFn: () => fetchProjectUpdates(id!),
    enabled: !!id,
  });

  const isLoading = projectQuery.isLoading || updatesQuery.isLoading;
  const error = projectQuery.error || updatesQuery.error;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.navBar}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          hitSlop={12}
          style={styles.navIconBox}
        >
          <Text style={{ fontSize: 22, color: t.colors.text.primary }}>‹</Text>
        </Pressable>
        <Text
          style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary, flex: 1, textAlign: 'center' }]}
          numberOfLines={1}
        >
          {projectQuery.data?.title ?? 'Loading…'}
        </Text>
        <View style={styles.navIconBox} />
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      )}

      {error && (
        <View style={styles.center}>
          <Text style={[t.type.body, { color: t.colors.destructive.text, textAlign: 'center' }]}>
            {(error as Error).message}
          </Text>
        </View>
      )}

      {projectQuery.data && (
        <Content
          project={projectQuery.data}
          updates={updatesQuery.data ?? []}
          canCompose={role === 'tradesman'}
          onCompose={() => router.push({ pathname: '/project/[id]/compose', params: { id: id! } })}
        />
      )}
    </SafeAreaView>
  );
}

function Content({
  project,
  updates,
  canCompose,
  onCompose,
}: {
  project: NonNullable<Awaited<ReturnType<typeof fetchProject>>>;
  updates: Awaited<ReturnType<typeof fetchProjectUpdates>>;
  canCompose: boolean;
  onCompose: () => void;
}) {
  const t = lightTheme;

  const range = dayOfProject(
    project.actual_start_date ?? project.expected_start_date,
    project.expected_end_date
  );
  const { headline, subhead } = statusHeadline(project.status, {
    endDate: project.expected_end_date,
    day: range?.day,
    total: range?.total,
  });
  const progressPct = range ? Math.round((range.day / range.total) * 100) : 0;

  return (
    <ScrollView
      contentContainerStyle={{ padding: t.space[5], gap: t.space[4], paddingBottom: t.space[16] }}
      showsVerticalScrollIndicator={false}
    >
      <ProjectHero
        status={project.status as ProjectStatus}
        headline={headline}
        subhead={subhead}
        progressPct={progressPct}
      />

      {/* Address */}
      <Card>
        <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>Site address</Text>
        <Text style={[t.type.bodyLg, { color: t.colors.text.primary, marginTop: 4 }]}>
          {[project.address_line_1, project.city, project.postcode].filter(Boolean).join(', ') || '—'}
        </Text>
      </Card>

      {/* Compose CTA for tradesman */}
      {canCompose && (
        <PrimaryButton title="Post an update" onPress={onCompose} />
      )}

      {/* Updates feed */}
      <Text style={[t.type.caption, { color: t.colors.text.tertiary, marginTop: t.space[2] }]}>
        Updates · {updates.length}
      </Text>

      {updates.length === 0 ? (
        <Text style={[t.type.body, { color: t.colors.text.tertiary }]}>
          No updates yet.
        </Text>
      ) : (
        updates.map((u) => (
          <Card key={u.id}>
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
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 44,
  },
  navIconBox: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  updateHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
