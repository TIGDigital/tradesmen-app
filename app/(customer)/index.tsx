import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useState } from 'react';

import { MediaThumbs } from '@/components/MediaThumbs';
import { ProjectHero } from '@/components/ProjectHero';
import { Reactions } from '@/components/Reactions';
import { VoicePlayer } from '@/components/VoicePlayer';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { EventPill } from '@/components/ui/EventPill';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRealtimeProject } from '@/hooks/useRealtimeProject';
import { switchMyRole } from '@/services/auth';
import { fireLocalTest } from '@/services/notifications';
import {
  currentAndNextMilestone,
  dayOfProject,
  fetchMyCurrentProject,
  fetchMyProjects,
  formatEta,
  relativeTime,
  statusHeadline,
} from '@/services/projects';
import { useAuthStore } from '@/stores/auth';
import { lightTheme } from '@/theme/light';
import type { ProjectStatus } from '@/theme/tokens';

export default function HomeScreen() {
  const t = lightTheme;
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  // All hooks must run on every render — put the query before any conditional return.
  const isCustomer = profile?.role !== 'tradesman';

  // Lightweight list query just for the picker. Cheap fields only — same
  // query is shared with other tabs and with the picker action sheet.
  const projectsQuery = useQuery({
    queryKey: ['my-projects', profile?.id],
    queryFn: fetchMyProjects,
    enabled: !!profile && isCustomer,
  });
  const projects = projectsQuery.data ?? [];
  const isMulti = projects.length > 1;

  // Selected project — null means "default to most recent". Once the list
  // loads we render its title in the header.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const effectiveSelectedId = selectedId ?? projects[0]?.id ?? null;

  // Live updates for the customer's project — invalidates the home query so
  // the Latest update card refreshes without reload. Subscription is keyed
  // on the project id once data loads.
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['my-current-project', profile?.id, effectiveSelectedId],
    queryFn: () => fetchMyCurrentProject(effectiveSelectedId ?? undefined),
    enabled: !!profile && isCustomer,
  });

  // Subscribe to realtime changes for the loaded project. All hooks must run
  // before any conditional return — pass null if data isn't loaded yet.
  useRealtimeProject(data?.id ?? null);

  function onSwitchProject() {
    if (!isMulti) return;
    Alert.alert('Switch project', undefined, [
      ...projects.map((p) => ({
        text: p.title,
        onPress: () => setSelectedId(p.id),
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }

  // Role-based redirects live in `app/index.tsx`. By the time we're inside
  // the (customer) tab group, the user is a customer — no guard needed.

  function onMenu() {
    Alert.alert('Menu', undefined, [
      {
        text: 'Settings',
        onPress: () => router.push('/settings'),
      },
      {
        text: 'Switch to tradesman view (dev)',
        onPress: async () => {
          try {
            await switchMyRole();
            await refreshProfile();
          } catch (e) {
            Alert.alert('Failed', (e as Error).message);
          }
        },
      },
      {
        text: 'Send test notification (dev)',
        onPress: () => fireLocalTest(),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  // Date stamp — UK English, uppercase, like a tool brand stamping its name.
  // Renders e.g. "MON · 8 JUN" via Geist Mono with wide tracking.
  const now = new Date();
  const dateStamp = now
    .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    .toUpperCase()
    .replace(',', ' ·');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['top']}>
      {/* Date stamp strip — the Fluke instrument register, top of every
          customer session. Reads as part of the chrome, not as content. */}
      <View style={{ alignItems: 'center', paddingTop: 6 }}>
        <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>
          {dateStamp}
        </Text>
      </View>
      <View style={styles.navBar}>
        <Pressable onPress={onMenu} hitSlop={12} style={styles.navIconBox}>
          <Text style={{ fontSize: 22, color: t.colors.text.primary }}>≡</Text>
        </Pressable>
        {isMulti ? (
          <Pressable
            onPress={onSwitchProject}
            hitSlop={8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}
            accessibilityLabel="Switch project"
          >
            <Text
              style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}
              numberOfLines={1}
            >
              {data?.title ?? (isLoading ? 'Loading…' : 'No project yet')}
            </Text>
            <Text style={{ color: t.colors.text.tertiary, fontSize: 14 }}>▼</Text>
          </Pressable>
        ) : (
          <Text
            style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}
            numberOfLines={1}
          >
            {data?.title ?? (isLoading ? 'Loading…' : 'No project yet')}
          </Text>
        )}
        {data ? (
          <Pressable
            onPress={() =>
              router.push({ pathname: '/project/[id]/chat', params: { id: data.id } })
            }
            hitSlop={12}
            style={styles.navIconBox}
          >
            <Text style={{ fontSize: 22, color: t.colors.text.primary }}>💬</Text>
          </Pressable>
        ) : (
          <View style={styles.navIconBox} />
        )}
      </View>

      {isLoading && (
        <View style={{ padding: t.space[5], gap: t.space[3] }}>
          {/* Hero skeleton */}
          <Card>
            <Skeleton width="60%" height={20} />
            <View style={{ height: 12 }} />
            <Skeleton width="90%" height={14} />
            <View style={{ height: 16 }} />
            <Skeleton width="100%" height={8} borderRadius={999} />
          </Card>
          {/* Today/Next skeleton */}
          <Card>
            <Skeleton width="40%" height={14} />
            <View style={{ height: 8 }} />
            <Skeleton width="70%" height={18} />
          </Card>
          {/* Latest update skeleton */}
          <Card>
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
        </View>
      )}

      {error && (
        <ErrorState
          message={(error as Error).message}
          onRetry={() => void refetch()}
        />
      )}

      {!isLoading && !error && !data && <EmptyState />}

      {data && (
        <ProjectContent
          data={data}
          onOpen={() => router.push({ pathname: '/project/[id]', params: { id: data.id } })}
          onRefresh={refetch}
          refreshing={isRefetching}
        />
      )}
    </SafeAreaView>
  );
}

function EmptyState() {
  const t = lightTheme;
  const [code, setCode] = useState('');

  return (
    <View style={[styles.center, { gap: t.space[4] }]}>
      <View>
        <Text style={[t.type.title2, { color: t.colors.text.primary, textAlign: 'center' }]}>
          No project yet
        </Text>
        <Text
          style={[
            t.type.body,
            {
              color: t.colors.text.secondary,
              textAlign: 'center',
              marginTop: 8,
              maxWidth: 320,
            },
          ]}
        >
          Got an invite code from your tradesman? Enter it below.
        </Text>
      </View>

      <View style={{ width: '100%', maxWidth: 320, gap: t.space[3] }}>
        <InputField
          value={code}
          onChangeText={setCode}
          placeholder="ABC123"
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={() => {
            const c = code.trim();
            if (c) router.push({ pathname: '/invite/[code]', params: { code: c } });
          }}
        />
        <PrimaryButton
          title="Join project"
          onPress={() =>
            router.push({ pathname: '/invite/[code]', params: { code: code.trim() } })
          }
          disabled={!code.trim()}
        />
      </View>

      <Text
        style={[
          t.type.footnote,
          { color: t.colors.text.tertiary, textAlign: 'center', marginTop: t.space[2] },
        ]}
      >
        Or wait for your tradesman to send you one.
      </Text>
    </View>
  );
}

function ProjectContent({
  data,
  onOpen,
  onRefresh,
  refreshing,
}: {
  data: NonNullable<Awaited<ReturnType<typeof fetchMyCurrentProject>>>;
  onOpen: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
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

  const { current, next } = currentAndNextMilestone(data.milestones ?? []);

  const tradesmanName = data.tradesman?.full_name ?? 'your tradesman';
  const tradesmanFirst = tradesmanName.split(' ')[0];

  return (
    <ScrollView
      contentContainerStyle={{ padding: t.space[5], gap: t.space[4] }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Pressable onPress={onOpen}>
        <ProjectHero
          status={data.status as ProjectStatus}
          headline={headline}
          subhead={subhead}
          progressPct={progressPct}
        />
      </Pressable>

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
            {current ?? '—'}
          </Text>
        </View>
        <View style={[styles.metaRow, { marginTop: t.space[3] }]}>
          <Text style={[t.type.body, { color: t.colors.text.secondary }]}>Next</Text>
          <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
            {next ?? '—'}
          </Text>
        </View>
      </View>

      <Text style={[t.type.caption, { color: t.colors.text.tertiary, marginTop: t.space[2] }]}>
        Latest update
      </Text>

      {latestUpdate ? (
        <Pressable onPress={onOpen}>
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
            {latestUpdate.media && latestUpdate.media.length > 0 && (
              <View style={{ marginTop: t.space[3] }}>
                <MediaThumbs update_id={latestUpdate.id} media={latestUpdate.media} />
              </View>
            )}
            {latestUpdate.media?.find((m) => m.media_type === 'voice') && (
              <View style={{ marginTop: t.space[3] }}>
                <VoicePlayer
                  storage_path={
                    latestUpdate.media.find((m) => m.media_type === 'voice')!.storage_path
                  }
                />
              </View>
            )}
            {latestUpdate.type === 'eta' && latestUpdate.eta_at && (
              <View
                style={{
                  marginTop: t.space[3],
                  paddingTop: t.space[3],
                  borderTopWidth: 1,
                  borderTopColor: t.colors.border.subtle,
                }}
              >
                <Text style={[t.type.footnote, { color: t.colors.text.secondary }]}>
                  ⏰ {formatEta(latestUpdate.eta_at)}
                </Text>
              </View>
            )}
            <Reactions
              update_id={latestUpdate.id}
              project_id={data.id}
              reactions={latestUpdate.reactions}
            />
          </View>
        </Pressable>
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
});
