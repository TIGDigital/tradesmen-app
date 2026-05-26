import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProjectHero } from '@/components/ProjectHero';
import { EventPill } from '@/components/ui/EventPill';
import {
  DEMO_PROJECT_ID,
  dayOfProject,
  fetchProjectDetail,
  relativeTime,
  statusHeadline,
} from '@/services/projects';
import { lightTheme } from '@/theme/light';
import type { ProjectStatus } from '@/theme/tokens';

export default function CustomerProjectScreen() {
  const t = lightTheme;

  const { data, isLoading, error } = useQuery({
    queryKey: ['project', DEMO_PROJECT_ID],
    queryFn: () => fetchProjectDetail(DEMO_PROJECT_ID),
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['top']}>
      <View style={styles.navBar}>
        <View style={styles.navIconBox}>
          <Text style={{ fontSize: 22, color: t.colors.text.primary }}>≡</Text>
        </View>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]} numberOfLines={1}>
          {data?.title ?? 'Loading…'}
        </Text>
        <View style={styles.navIconBox}>
          <Text style={{ fontSize: 22, color: t.colors.text.primary }}>💬</Text>
        </View>
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      )}

      {error && (
        <View style={styles.center}>
          <Text style={[t.type.body, { color: t.colors.destructive.text, textAlign: 'center' }]}>
            Couldn't load project.{'\n'}{(error as Error).message}
          </Text>
        </View>
      )}

      {data && <ProjectContent data={data} />}
    </SafeAreaView>
  );
}

function ProjectContent({ data }: { data: NonNullable<Awaited<ReturnType<typeof fetchProjectDetail>>> }) {
  const t = lightTheme;

  const range = dayOfProject(data.actual_start_date ?? data.expected_start_date, data.expected_end_date);
  const { headline, subhead } = statusHeadline(data.status, {
    endDate: data.expected_end_date,
    day: range?.day,
    total: range?.total,
  });
  const progressPct = range ? Math.round((range.day / range.total) * 100) : 0;

  // pick latest non-deleted update
  const latestUpdate = (data.updates ?? [])
    .filter((u) => !u.deleted_at)
    .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())[0];

  const tradesmanName = data.tradesman?.full_name ?? 'your tradesman';
  const tradesmanFirst = tradesmanName.split(' ')[0];

  return (
    <ScrollView
      contentContainerStyle={{ padding: t.space[5], gap: t.space[4] }}
      showsVerticalScrollIndicator={false}
    >
      <ProjectHero
        status={data.status as ProjectStatus}
        headline={headline}
        subhead={subhead}
        progressPct={progressPct}
      />

      <EventPill
        kind="arrival"
        title={`${tradesmanFirst} is on site`}
        timestamp="Arrived 8:14 AM"
      />

      <View
        style={[
          styles.metaCard,
          {
            backgroundColor: t.colors.bg.surface,
            borderColor: t.colors.border.subtle,
            borderRadius: t.radius.lg,
            padding: t.space[4],
          },
        ]}
      >
        <View style={styles.metaRow}>
          <Text style={[t.type.body, { color: t.colors.text.secondary }]}>Today</Text>
          <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
            First-fix electrics
          </Text>
        </View>
        <View style={[styles.metaRow, { marginTop: t.space[3] }]}>
          <Text style={[t.type.body, { color: t.colors.text.secondary }]}>Next</Text>
          <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
            Worktops · Wed
          </Text>
        </View>
      </View>

      <Text style={[t.type.caption, { color: t.colors.text.tertiary, marginTop: t.space[2] }]}>
        Latest update
      </Text>

      {latestUpdate ? (
        <View
          style={[
            styles.updateCard,
            t.elevation[1],
            {
              backgroundColor: t.colors.bg.surface,
              borderRadius: t.radius.lg,
              padding: t.space[4],
            },
          ]}
        >
          <View style={styles.updateHead}>
            <View style={[styles.avatar, { backgroundColor: '#A04A1C' }]}>
              <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
                {tradesmanFirst[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <View>
              <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
                {tradesmanName}
              </Text>
              <Text style={[t.type.footnote, { color: t.colors.text.tertiary }]}>
                {relativeTime(latestUpdate.created_at!)}
              </Text>
            </View>
          </View>
          <Text style={[t.type.body, { color: t.colors.text.primary, marginTop: t.space[3] }]}>
            {latestUpdate.body}
          </Text>
          <View style={[styles.photos, { marginTop: t.space[3] }]}>
            <View style={[styles.photoBox, { backgroundColor: '#D8D5CE' }]} />
            <View style={[styles.photoBox, { backgroundColor: '#ECEAE4' }]} />
            <View style={[styles.photoBox, { backgroundColor: '#F4F2EE' }]} />
          </View>
        </View>
      ) : (
        <Text style={[t.type.body, { color: t.colors.text.tertiary }]}>
          No updates yet.
        </Text>
      )}
    </ScrollView>
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
  navIconBox: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  metaCard: { borderWidth: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  updateCard: {},
  updateHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photos: { flexDirection: 'row', gap: 8 },
  photoBox: { flex: 1, height: 60, borderRadius: 12 },
});
