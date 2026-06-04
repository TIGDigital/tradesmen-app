import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { switchMyRole } from '@/services/auth';
import { fireLocalTest } from '@/services/notifications';
import { fetchMyProjects } from '@/services/projects';
import { useLocationConsentNudge } from '@/hooks/useLocationConsentNudge';
import { useAuthStore } from '@/stores/auth';
import { lightTheme } from '@/theme/light';
import type { ProjectStatus } from '@/theme/tokens';

export default function JobsScreen() {
  const t = lightTheme;
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  // First-ever visit: warm-prompt the tradesman for location, then iOS asks.
  useLocationConsentNudge();

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['my-projects', profile?.id],
    queryFn: fetchMyProjects,
    enabled: !!profile && profile.role === 'tradesman',
  });

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

  // If the role flipped to customer (e.g. via the dev switch), bounce out.
  // All hooks above this line so React's hook ordering stays stable.
  if (profile && profile.role !== 'tradesman') {
    return <Redirect href="/" />;
  }

  const firstName = (profile?.full_name ?? '').split(' ')[0] || 'there';
  const greeting = getGreeting();
  const needsAttention = stats.counts.needs_update + stats.counts.delayed;
  const summary =
    stats.counts.all === 0
      ? 'No active jobs yet.'
      : `${stats.counts.all} active job${stats.counts.all === 1 ? '' : 's'}${
          needsAttention > 0 ? ` · ${needsAttention} need${needsAttention === 1 ? 's' : ''} your attention` : ''
        }`;

  function onMenu() {
    Alert.alert('Menu', undefined, [
      {
        text: 'Settings',
        onPress: () => router.push('/settings'),
      },
      {
        text: 'Switch to customer view (dev)',
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['top']}>
      <View style={styles.navBar}>
        <Pressable onPress={onMenu} hitSlop={12} style={styles.navIconBox}>
          <Text style={{ fontSize: 22, color: t.colors.text.primary }}>≡</Text>
        </Pressable>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>Jobs</Text>
        <Pressable
          onPress={() => router.push('/project/new')}
          hitSlop={12}
          style={styles.navIconBox}
          accessibilityLabel="Create new project"
        >
          <Ionicons name="add-circle" size={28} color={t.colors.text.link} />
        </Pressable>
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

      {!isLoading && !error && (
        <ScrollView
          contentContainerStyle={{ padding: t.space[5], gap: t.space[3], paddingBottom: t.space[16] }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
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
              <Chip label="Needs update" count={stats.counts.needs_update} active={filter === 'needs_update'} onPress={() => setFilter('needs_update')} accent="red" />
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
              <View style={{ marginTop: t.space[6], alignSelf: 'stretch' }}>
                <PrimaryButton
                  title="Create new project"
                  onPress={() => router.push('/project/new')}
                />
              </View>
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
