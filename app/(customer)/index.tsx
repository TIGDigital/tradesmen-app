import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useState } from 'react';

import { MediaThumbs } from '@/components/MediaThumbs';
import { MenuSheet, type MenuItem } from '@/components/MenuSheet';
import { PhaseProgressRing } from '@/components/PhaseProgressRing';
import { Reactions } from '@/components/Reactions';
import { VoicePlayer } from '@/components/VoicePlayer';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRealtimeProject } from '@/hooks/useRealtimeProject';
import { signOut, switchMyRole } from '@/services/auth';
import { fireLocalTest } from '@/services/notifications';
import {
  dayOfProject,
  fetchMyCurrentProject,
  fetchMyProjects,
  formatEta,
  relativeTime,
} from '@/services/projects';
import { useAuthStore } from '@/stores/auth';
import { lightTheme } from '@/theme/light';
import type { ProjectStatus } from '@/theme/tokens';

export default function HomeScreen() {
  const t = lightTheme;
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const [menuOpen, setMenuOpen] = useState(false);

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
    Alert.alert('Your projects', undefined, [
      ...projects.map((p) => ({
        text: p.title,
        onPress: () => setSelectedId(p.id),
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }

  // Role-based redirects live in `app/index.tsx`. By the time we're inside
  // the (customer) tab group, the user is a customer — no guard needed.

  // Menu items shown in the ≡ sheet for the customer role. Production
  // items first; dev-only escape hatches (role switch, test notification)
  // only render when __DEV__ is true so they never reach a real user's
  // build. "Sign out" gets the brand tint as the final, meaningful row.
  const menuItems: MenuItem[] = [
    { label: 'Projects', icon: 'briefcase-outline', onPress: () => router.push('/') },
    { label: 'Updates', icon: 'pulse-outline', onPress: () => router.push('/updates') },
    { label: 'Inbox', icon: 'chatbubble-outline', onPress: () => router.push('/messages') },
    { label: 'Account', icon: 'person-outline', onPress: () => router.push('/account') },
    { label: 'Settings', icon: 'settings-outline', onPress: () => router.push('/settings') },
    ...(__DEV__
      ? ([
          {
            label: 'Switch to tradesman view (dev)',
            icon: 'swap-horizontal-outline',
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
            label: 'Send test notification (dev)',
            icon: 'notifications-outline',
            onPress: () => fireLocalTest(),
          },
        ] as MenuItem[])
      : []),
    {
      label: 'Sign out',
      icon: 'log-out-outline',
      tint: 'brand',
      onPress: async () => {
        try {
          await signOut();
          // Auth listener in stores/auth.ts handles redirect to welcome.
        } catch (e) {
          Alert.alert("Couldn't sign out", (e as Error).message);
        }
      },
    },
  ];

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
        <Pressable onPress={() => setMenuOpen(true)} hitSlop={12} style={styles.navIconBox}>
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
          firstName={profile?.full_name?.split(' ')[0] ?? 'there'}
          onOpen={() => router.push({ pathname: '/project/[id]', params: { id: data.id } })}
          onRefresh={refetch}
          refreshing={isRefetching}
        />
      )}

      {/* The ≡ menu — Phase-styled bottom sheet. */}
      <MenuSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={menuItems}
      />
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
          No project yet — got a code?
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
          Pop in the invite code your tradesman sent and you'll be straight in.
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
  firstName,
  onOpen,
  onRefresh,
  refreshing,
}: {
  data: NonNullable<Awaited<ReturnType<typeof fetchMyCurrentProject>>>;
  firstName: string;
  onOpen: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const t = lightTheme;

  // ─── Project metrics ─────────────────────────────────────────────
  // Day count: prefer actual start → expected start. When the tradesman
  // hasn't set an end date yet, we still want to surface "Day 3" so the
  // hero card never feels empty. Only when there's NO start at all do
  // we fall back to a soft "Just started" line.
  const startIso = data.actual_start_date ?? data.expected_start_date;
  const range = dayOfProject(startIso, data.expected_end_date);
  const dayOnly = !range && startIso
    ? Math.max(1, Math.floor((Date.now() - new Date(startIso).getTime()) / 86_400_000) + 1)
    : null;
  const progressPct = range ? Math.round((range.day / range.total) * 100) : 0;

  const updates = (data.updates ?? []).filter((u) => !u.deleted_at);
  const latestUpdate = updates
    .slice()
    .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())[0];

  // ─── "This week" instrument readouts ─────────────────────────────
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - weekMs;
  const recentUpdates = updates.filter(
    (u) => u.created_at && new Date(u.created_at).getTime() >= cutoff,
  );
  const photosThisWeek = recentUpdates.reduce(
    (n, u) => n + (u.media?.filter((m) => m.media_type !== 'voice').length ?? 0),
    0,
  );
  const updatesThisWeek = recentUpdates.length;
  const daysLeft = data.expected_end_date
    ? Math.max(
        0,
        Math.ceil((new Date(data.expected_end_date).getTime() - Date.now()) / 86_400_000),
      )
    : null;

  const tradesmanName = data.tradesman?.full_name ?? 'your tradesman';
  const tradesmanFirst = tradesmanName.split(' ')[0];

  // Status copy lives next to the ring.
  const statusText = t.statusLabels[data.status as ProjectStatus] ?? 'In progress';

  return (
    <ScrollView
      contentContainerStyle={{ padding: t.space[5], gap: t.space[5], paddingBottom: t.space[10] }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* ── Greeting ─────────────────────────────────────────────── */}
      <Text style={[t.type.title1, { color: t.colors.text.primary }]}>
        Hello, {firstName}
      </Text>

      {/* ── Hero card: ring + status + project + day stamp ──────── */}
      <Pressable onPress={onOpen}>
        <View
          style={[
            t.elevation[1],
            {
              backgroundColor: t.colors.bg.surface,
              borderColor: t.colors.border.subtle,
              borderWidth: 1,
              borderRadius: t.radius.lg,
              padding: t.space[5],
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.space[4],
            },
          ]}
        >
          <PhaseProgressRing pct={progressPct} size={84} />
          <View style={{ flex: 1 }}>
            <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>
              Your project
            </Text>
            <Text
              style={[t.type.title2, { color: t.colors.text.primary, marginTop: 4 }]}
              numberOfLines={1}
            >
              {data.title}
            </Text>
            <Text style={[t.type.body, { color: t.colors.text.secondary, marginTop: 4 }]}>
              {statusText}
            </Text>
            {range ? (
              <Text
                style={[
                  t.type.caption,
                  { color: t.colors.text.tertiary, marginTop: t.space[3] },
                ]}
              >
                Day {range.day} of {range.total}
              </Text>
            ) : dayOnly ? (
              <Text
                style={[
                  t.type.caption,
                  { color: t.colors.text.tertiary, marginTop: t.space[3] },
                ]}
              >
                Day {dayOnly}
              </Text>
            ) : (
              <Text
                style={[
                  t.type.caption,
                  { color: t.colors.text.tertiary, marginTop: t.space[3] },
                ]}
              >
                Just started
              </Text>
            )}
          </View>
        </View>
      </Pressable>

      {/* ── This week — three instrument readouts ──────────────── */}
      <View>
        <Text
          style={[
            t.type.caption,
            { color: t.colors.text.tertiary, marginBottom: t.space[3] },
          ]}
        >
          This week
        </Text>
        <View style={{ flexDirection: 'row', gap: t.space[3] }}>
          <Stat label="Photos" value={photosThisWeek.toString()} />
          <Stat label="Updates" value={updatesThisWeek.toString()} />
          <Stat
            label="Days left"
            value={daysLeft != null ? daysLeft.toString() : '—'}
          />
        </View>
      </View>

      {/* ── Latest update — quiet preview ──────────────────────── */}
      <View>
        <Text
          style={[
            t.type.caption,
            { color: t.colors.text.tertiary, marginBottom: t.space[3] },
          ]}
        >
          Latest from {tradesmanFirst}
        </Text>
        {latestUpdate ? (
          <Pressable onPress={onOpen}>
            <View
              style={[
                t.elevation[1],
                {
                  backgroundColor: t.colors.bg.surface,
                  borderColor: t.colors.border.subtle,
                  borderWidth: 1,
                  borderRadius: t.radius.lg,
                  padding: t.space[4],
                },
              ]}
            >
              <View style={styles.updateHead}>
                <View style={[styles.avatar, { backgroundColor: t.colors.brand.primary }]}>
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
              {latestUpdate.body && (
                <Text
                  style={[
                    t.type.body,
                    { color: t.colors.text.primary, marginTop: t.space[3], lineHeight: 22 },
                  ]}
                  numberOfLines={3}
                >
                  {latestUpdate.body}
                </Text>
              )}
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
          <View
            style={{
              backgroundColor: t.colors.bg.surface,
              borderColor: t.colors.border.subtle,
              borderWidth: 1,
              borderRadius: t.radius.lg,
              padding: t.space[4],
            }}
          >
            <Text style={[t.type.body, { color: t.colors.text.tertiary }]}>
              No updates yet — they'll land here when {tradesmanFirst} posts.
            </Text>
          </View>
        )}
      </View>

      {/* ── Quick actions ───────────────────────────────────────── */}
      <View>
        <Text
          style={[
            t.type.caption,
            { color: t.colors.text.tertiary, marginBottom: t.space[3] },
          ]}
        >
          Jump to
        </Text>
        <View
          style={[
            t.elevation[1],
            {
              backgroundColor: t.colors.bg.surface,
              borderColor: t.colors.border.subtle,
              borderWidth: 1,
              borderRadius: t.radius.lg,
              overflow: 'hidden',
            },
          ]}
        >
          <QuickRow
            label="See full project"
            onPress={onOpen}
            divider
          />
          <QuickRow
            label="Open chat"
            onPress={() =>
              router.push({ pathname: '/project/[id]/chat', params: { id: data.id } })
            }
            divider
          />
          <QuickRow
            label="View schedule"
            onPress={() =>
              router.push({ pathname: '/project/[id]/schedule', params: { id: data.id } })
            }
          />
        </View>
      </View>
    </ScrollView>
  );
}

// ── Small dashboard primitives ─────────────────────────────────────
function Stat({ label, value }: { label: string; value: string }) {
  const t = lightTheme;
  return (
    <View
      style={[
        t.elevation[1],
        {
          flex: 1,
          backgroundColor: t.colors.bg.surface,
          borderColor: t.colors.border.subtle,
          borderWidth: 1,
          borderRadius: t.radius.lg,
          padding: t.space[4],
        },
      ]}
    >
      <Text
        style={{
          fontFamily: 'GeistMono_500Medium',
          fontSize: 28,
          color: t.colors.text.primary,
          letterSpacing: -0.5,
        }}
      >
        {value}
      </Text>
      <Text style={[t.type.caption, { color: t.colors.text.tertiary, marginTop: 4 }]}>
        {label}
      </Text>
    </View>
  );
}

function QuickRow({
  label,
  onPress,
  divider,
}: {
  label: string;
  onPress: () => void;
  divider?: boolean;
}) {
  const t = lightTheme;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: t.space[4],
        paddingHorizontal: t.space[4],
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: t.colors.border.subtle,
        backgroundColor: pressed ? t.colors.bg.surface2 : 'transparent',
      })}
    >
      <Text style={[t.type.bodyLg, { color: t.colors.text.primary }]}>{label}</Text>
      <Text style={[t.type.bodyLg, { color: t.colors.text.tertiary }]}>›</Text>
    </Pressable>
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
