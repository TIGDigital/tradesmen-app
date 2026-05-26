import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProjectHero } from '@/components/ProjectHero';
import { EventPill } from '@/components/ui/EventPill';
import { signOut } from '@/services/auth';
import {
  dayOfProject,
  fetchMyCurrentProject,
  relativeTime,
  statusHeadline,
} from '@/services/projects';
import { useAuthStore } from '@/stores/auth';
import { lightTheme } from '@/theme/light';
import type { ProjectStatus } from '@/theme/tokens';

export default function HomeScreen() {
  const t = lightTheme;
  const profile = useAuthStore((s) => s.profile);

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-current-project', profile?.id],
    queryFn: fetchMyCurrentProject,
    enabled: !!profile,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['top']}>
      <View style={styles.navBar}>
        <Pressable
          onPress={() =>
            Alert.alert('Sign out?', 'You can sign back in any time.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
            ])
          }
          hitSlop={12}
          style={styles.navIconBox}
        >
          <Text style={{ fontSize: 22, color: t.colors.text.primary }}>≡</Text>
        </Pressable>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]} numberOfLines={1}>
          {data?.title ?? (isLoading ? 'Loading…' : 'No project yet')}
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
            Couldn't load.{'\n'}{(error as Error).message}
          </Text>
        </View>
      )}

      {!isLoading && !error && !data && <EmptyState role={profile?.role} />}

      {data && <ProjectContent data={data} />}
    </SafeAreaView>
  );
}

function EmptyState({ role }: { role: string | null | undefined }) {
  const t = lightTheme;
  return (
    <View style={styles.center}>
      <Text style={[t.type.title2, { color: t.colors.text.primary, textAlign: 'center' }]}>
        No project yet
      </Text>
      <Text
        style={[
          t.type.body,
          { color: t.colors.text.secondary, textAlign: 'center', marginTop: 8, maxWidth: 280 },
        ]}
      >
        {role === 'tradesman'
          ? 'Create a project and invite your customer to get started. (Coming next sprint.)'
          : 'Your tradesman will invite you when your project is ready. Watch this space.'}
      </Text>
    </View>
  );
}

function ProjectContent({ data }: { data: NonNullable<Awaited<ReturnType<typeof fetchMyCurrentProject>>> }) {
  const t = lightTheme;

  const range = dayOfProject(data.actual_start_date ?? data.expected_start_date, data.expected_end_date);
  const { headline, subhead } = statusHeadline(data.status, {
    endDate: data.expected_end_date,
    day: range?.day,
    total: range?.total,
  });
  const progressPct = range ? Math.round((range.day / range.total) * 100) : 0;

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
