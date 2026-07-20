import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MenuSheet, type MenuItem } from '@/components/MenuSheet';
import { OnboardingChecklist, type ChecklistItem } from '@/components/OnboardingChecklist';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { signOut, switchMyRole } from '@/services/auth';
import { fireLocalTest } from '@/services/notifications';
import { fetchTradesmanOnboarding } from '@/services/onboarding';
import { fetchMyProjects } from '@/services/projects';
import { useLocationConsentNudge } from '@/hooks/useLocationConsentNudge';
import { useAuthStore } from '@/stores/auth';
import { lightTheme } from '@/theme/light';
import type { ProjectStatus } from '@/theme/tokens';

export default function JobsScreen() {
  const t = lightTheme;
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const onboardingDismissed = useAuthStore((s) => s.onboardingDismissed);
  const dismissOnboarding = useAuthStore((s) => s.dismissOnboarding);
  const [menuOpen, setMenuOpen] = useState(false);

  // First-ever visit: warm-prompt the tradesman for location, then iOS asks.
  useLocationConsentNudge();

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['my-projects', profile?.id],
    queryFn: fetchMyProjects,
    enabled: !!profile && profile.role === 'tradesman',
  });

  // Onboarding progress — derived from existing data on every screen
  // mount. Stays stale-while-revalidate so the checklist doesn't lag a
  // beat behind after the user creates a project, sends an invite, etc.
  const onboardingQuery = useQuery({
    queryKey: ['onboarding', 'tradesman', profile?.id],
    queryFn: fetchTradesmanOnboarding,
    enabled: !!profile && profile.role === 'tradesman' && onboardingDismissed === false,
    staleTime: 0,
  });
  const ob = onboardingQuery.data;

  // Re-derive checklist state every time Jobs comes into focus — the
  // user may have posted an update, sent an invite, or ended their day
  // on a child screen, and the bullets should tick off without a manual
  // pull-to-refresh.
  // CRITICAL: dep on the STABLE refetch function, never on the query
  // result object — `onboardingQuery` has a new identity every render,
  // which made this callback recreate every render, which made
  // useFocusEffect re-fire every render, which called refetch(), which
  // re-rendered… the "Maximum update depth exceeded" crash that took
  // down every signup + signed-in boot from 4–19 Jul (native builds
  // #9–#15). TanStack guarantees refetch identity is stable.
  const { refetch: refetchOnboarding } = onboardingQuery;
  useFocusEffect(
    useCallback(() => {
      void refetchOnboarding();
      void refetch();
    }, [refetchOnboarding, refetch]),
  );

  // The checklist items only render if there's at least one outstanding
  // step. We still build the array unconditionally so item.done state
  // reflects truth — the component hides itself when 100% complete.
  const checklistItems: ChecklistItem[] = ob
    ? [
        {
          title: 'Create your first project',
          subtitle: "We'll set up starter milestones for your trade.",
          done: ob.has_project,
          onPress: () => router.push('/project/new'),
        },
        {
          title: 'Send your customer the invite code',
          subtitle: 'Share via SMS or copy the code from the project.',
          done: ob.has_sent_invite,
          onPress: ob.first_project_id
            ? () =>
                router.push({
                  pathname: '/project/[id]',
                  params: { id: ob.first_project_id! },
                })
            : () => router.push('/project/new'),
        },
        {
          title: 'Post your first update',
          subtitle: 'A photo and a sentence is enough — the customer sees it instantly.',
          done: ob.has_posted_update,
          onPress: ob.first_project_id
            ? () =>
                router.push({
                  pathname: '/project/[id]/compose',
                  params: { id: ob.first_project_id! },
                })
            : () => router.push('/project/new'),
        },
        {
          title: 'Try end-of-day',
          subtitle: 'Wrap up the day in one tap — the wedge feature.',
          done: ob.has_ended_day,
          onPress: ob.first_project_id
            ? () =>
                router.push({
                  pathname: '/project/[id]/end-of-day',
                  params: { id: ob.first_project_id! },
                })
            : () => router.push('/project/new'),
        },
        {
          title: 'Set the agreed price',
          subtitle: 'Capture what you and your customer agreed. Future changes need their OK.',
          done: ob.has_set_price,
          onPress: ob.first_project_id
            ? () =>
                router.push({
                  pathname: '/project/[id]/pricing',
                  params: { id: ob.first_project_id! },
                })
            : () => router.push('/project/new'),
        },
      ]
    : [];

  type Filter = 'all' | 'on_track' | 'delayed' | 'needs_update';
  const [filter, setFilter] = useState<Filter>('all');

  // Greeting + filtering rely on `data` so they must be inside useMemo, not
  // computed at the top level (else they'd re-eval on every render). All
  // hooks come BEFORE the role-redirect so hook order stays stable.
  const stats = useMemo(() => {
    const list = data ?? [];
    // "Active" = anything not completed. (No 'cancelled' status in the enum.)
    const isActive = (p: (typeof list)[number]) => p.status !== 'completed';
    // "On track" = active and not flagged as delayed.
    const isOnTrack = (p: (typeof list)[number]) =>
      isActive(p) && p.status !== 'delayed';
    const isStale = (p: (typeof list)[number]) => {
      if (!isActive(p)) return false;
      if (!p.last_update_at) return true; // no update ever posted
      const days =
        (Date.now() - new Date(p.last_update_at).getTime()) / 86_400_000;
      return days > 3;
    };
    return {
      list,
      isStale,
      counts: {
        all: list.filter(isActive).length,
        on_track: list.filter(isOnTrack).length,
        delayed: list.filter((p) => p.status === 'delayed').length,
        needs_update: list.filter(isStale).length,
      },
    };
  }, [data]);

  const filtered = useMemo(() => {
    const list = stats.list;
    if (filter === 'all') return list.filter((p) => p.status !== 'completed');
    if (filter === 'needs_update') return list.filter(stats.isStale);
    if (filter === 'on_track') {
      return list.filter((p) => p.status !== 'completed' && p.status !== 'delayed');
    }
    // delayed
    return list.filter((p) => p.status === 'delayed');
  }, [stats, filter]);

  // Apprentices share these screens — they see the projects they're on as
  // crew, but can't create new ones. Anyone else (customer) gets bounced.
  if (profile && profile.role !== 'tradesman' && profile.role !== 'apprentice') {
    return <Redirect href="/" />;
  }
  const isApprentice = profile?.role === 'apprentice';

  const firstName = (profile?.full_name ?? '').split(' ')[0] || 'there';
  const greeting = getGreeting();
  const needsAttention = stats.counts.needs_update + stats.counts.delayed;
  const summary =
    stats.counts.all === 0
      ? 'No active jobs yet.'
      : `${stats.counts.all} active job${stats.counts.all === 1 ? '' : 's'}${
          needsAttention > 0 ? ` · ${needsAttention} need${needsAttention === 1 ? 's' : ''} your attention` : ''
        }`;

  // Menu items shown in the ≡ sheet for the tradesman role. Production
  // items are listed first; dev-only escape hatches (role switch, test
  // notification) only render when __DEV__ is true so they never reach a
  // real user's build. The "Sign out" row gets the brand tint so it reads
  // as the meaningful affordance at the bottom of the list.
  const menuItems: MenuItem[] = [
    { label: 'Projects', icon: 'briefcase-outline', onPress: () => router.push('/jobs') },
    { label: 'Updates', icon: 'pulse-outline', onPress: () => router.push('/notifications') },
    { label: 'Inbox', icon: 'chatbubble-outline', onPress: () => router.push('/messages') },
    { label: 'Account', icon: 'person-outline', onPress: () => router.push('/account') },
    { label: 'Settings', icon: 'settings-outline', onPress: () => router.push('/settings') },
    ...(__DEV__
      ? ([
          {
            label: 'Switch to customer view (dev)',
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
  // Renders e.g. "MON · 8 JUN" via Geist Mono with wide tracking. Same
  // register as the customer dashboard so Phase reads consistently from
  // any role's home.
  const now = new Date();
  const dateStamp = now
    .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    .toUpperCase()
    .replace(',', ' ·');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['top']}>
      <View style={{ alignItems: 'center', paddingTop: 6 }}>
        <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>
          {dateStamp}
        </Text>
      </View>
      <View style={styles.navBar}>
        <Pressable onPress={() => setMenuOpen(true)} hitSlop={12} style={styles.navIconBox}>
          <Text style={{ fontSize: 22, color: t.colors.text.primary }}>≡</Text>
        </Pressable>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>Jobs</Text>
        {isApprentice ? (
          <View style={styles.navIconBox} />
        ) : (
          <Pressable
            onPress={() => router.push('/project/new')}
            hitSlop={12}
            style={styles.navIconBox}
            accessibilityLabel="Create new project"
          >
            <Ionicons name="add-circle" size={28} color={t.colors.text.link} />
          </Pressable>
        )}
      </View>

      {isLoading && (
        <View style={{ padding: t.space[5], gap: t.space[3] }}>
          {/* Three pretend project cards so the page already has shape. */}
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Skeleton width="70%" height={18} />
                  <Skeleton width="50%" height={12} />
                </View>
                <Skeleton width={64} height={20} borderRadius={999} />
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

      {!isLoading && !error && (
        <ScrollView
          contentContainerStyle={{ padding: t.space[5], gap: t.space[3], paddingBottom: t.space[16] }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl tintColor={t.colors.brand.primary} refreshing={isRefetching} onRefresh={refetch} />}
        >
          {/* Greeting */}
          <View style={{ marginBottom: t.space[2] }}>
            <Text style={[t.type.title1, { color: t.colors.text.primary }]}>
              {greeting}, {firstName}
            </Text>
            <Text
              style={[t.type.body, { color: t.colors.text.secondary, marginTop: 4 }]}
              numberOfLines={2}
            >
              {summary}
            </Text>
          </View>

          {/* Onboarding checklist — auto-hides when all items are done or
              after the user has explicitly dismissed via ×. Reads from
              the onboarding query so it stays truthful. */}
          {ob && checklistItems.length > 0 && (
            <View style={{ marginBottom: t.space[3] }}>
              <OnboardingChecklist
                items={checklistItems}
                onDismiss={() => void dismissOnboarding()}
              />
            </View>
          )}

          {/* Filter chips — hidden when there are no projects at all */}
          {stats.list.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: t.space[2], paddingVertical: 4 }}
            >
              <Chip label="All" count={stats.counts.all} active={filter === 'all'} onPress={() => setFilter('all')} />
              <Chip label="On track" count={stats.counts.on_track} active={filter === 'on_track'} onPress={() => setFilter('on_track')} />
              <Chip label="Delayed" count={stats.counts.delayed} active={filter === 'delayed'} onPress={() => setFilter('delayed')} accent="amber" />
              <Chip label="Quiet a while" count={stats.counts.needs_update} active={filter === 'needs_update'} onPress={() => setFilter('needs_update')} accent="red" />
            </ScrollView>
          )}

          {/* Project cards (filtered) */}
          {stats.list.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: t.space[12] }}>
              <Text style={[t.type.title2, { color: t.colors.text.primary, textAlign: 'center' }]}>
                No jobs yet
              </Text>
              <Text
                style={[
                  t.type.body,
                  {
                    color: t.colors.text.secondary,
                    textAlign: 'center',
                    marginTop: 8,
                    maxWidth: 280,
                  },
                ]}
              >
                Create your first project to get started.
              </Text>
              {!isApprentice && (
                <View style={{ marginTop: t.space[6], alignSelf: 'stretch' }}>
                  <PrimaryButton
                    title="Create new project"
                    onPress={() => router.push('/project/new')}
                  />
                </View>
              )}
            </View>
          ) : filtered.length === 0 ? (
            <View style={{ paddingVertical: t.space[8], alignItems: 'center' }}>
              <Text style={[t.type.body, { color: t.colors.text.tertiary }]}>
                No jobs in this filter.
              </Text>
            </View>
          ) : (
            filtered.map((p) => {
              const stale = stats.isStale(p);
              return (
                <Card key={p.id} onPress={() => router.push({ pathname: '/project/[id]', params: { id: p.id } })}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, paddingRight: t.space[3] }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {stale && <View style={styles.staleDot} />}
                        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary, flexShrink: 1 }]} numberOfLines={1}>
                          {p.title}
                        </Text>
                      </View>
                      <Text
                        style={[t.type.footnote, { color: t.colors.text.tertiary, marginTop: 2 }]}
                        numberOfLines={1}
                      >
                        {p.pending_customer_name ?? 'Customer joined'} · {p.city ?? '—'}
                      </Text>
                      {stale && (
                        <Text style={[t.type.footnote, { color: '#C0392B', marginTop: 4 }]}>
                          Needs an update
                        </Text>
                      )}
                    </View>
                    <StatusBadge status={p.status as ProjectStatus} size="sm" />
                  </View>
                </Card>
              );
            })
          )}
        </ScrollView>
      )}

      {/* The ≡ menu — Phase-styled bottom sheet. Renders outside the
          main column so it can overlay everything when open. */}
      <MenuSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={menuItems}
      />
    </SafeAreaView>
  );
}

function Chip({
  label,
  count,
  active,
  onPress,
  accent,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
  accent?: 'amber' | 'red';
}) {
  const t = lightTheme;
  // Active chip uses the brand color; inactive shows a quiet surface with the
  // accent colour reserved for the count badge (so "Delayed (2)" still
  // catches your eye even when not selected).
  const bg = active
    ? t.colors.brand.primary
    : accent === 'red'
      ? '#FCEAE7'
      : accent === 'amber'
        ? '#FFF3D6'
        : t.colors.bg.surface2;
  const labelColor = active
    ? t.colors.text.inverse
    : accent === 'red'
      ? '#C0392B'
      : accent === 'amber'
        ? '#8A5A00'
        : t.colors.text.primary;
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: bg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <Text style={[t.type.footnote, { color: labelColor, fontWeight: '600' }]}>
        {label}
      </Text>
      <Text style={[t.type.footnote, { color: labelColor, opacity: 0.85 }]}>
        {count}
      </Text>
    </Pressable>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 18) return 'Afternoon';
  return 'Evening';
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
  staleDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: '#C0392B' },
});
