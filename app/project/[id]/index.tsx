import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MediaThumbs } from '@/components/MediaThumbs';
import { Milestone } from '@/components/Milestone';
import { ProjectHero } from '@/components/ProjectHero';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { logLeaveSite } from '@/services/location';
import { fireLeaveSiteNudge } from '@/services/notifications';
import {
  currentAndNextMilestone,
  dayOfProject,
  fetchMilestones,
  fetchProject,
  fetchProjectUpdates,
  formatEta,
  relativeTime,
  setMilestoneStatus,
  statusHeadline,
} from '@/services/projects';
import { useAuthStore } from '@/stores/auth';
import { lightTheme } from '@/theme/light';
import type { ProjectStatus } from '@/theme/tokens';

export default function ProjectDetailScreen() {
  const t = lightTheme;
  const { id } = useLocalSearchParams<{ id: string }>();
  const role = useAuthStore((s) => s.profile?.role);
  const queryClient = useQueryClient();

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

  const milestonesQuery = useQuery({
    queryKey: ['milestones', id],
    queryFn: () => fetchMilestones(id!),
    enabled: !!id,
  });

  const setStatusMutation = useMutation({
    mutationFn: (args: {
      milestone_id: string;
      current_status: any;
      new_status: any;
      title: string;
    }) =>
      setMilestoneStatus({
        milestone_id: args.milestone_id,
        project_id: id!,
        current_status: args.current_status,
        new_status: args.new_status,
        title: args.title,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', id] });
      queryClient.invalidateQueries({ queryKey: ['updates', id] });
      queryClient.invalidateQueries({ queryKey: ['my-current-project'] });
    },
    onError: (e) => Alert.alert("Couldn't update milestone", (e as Error).message),
  });

  /** Show an action sheet with the next-state options for a given milestone. */
  function onMilestoneTap(milestone_id: string, current_status: string, title: string) {
    const options: { text: string; new_status?: string; style?: 'cancel' | 'destructive' }[] = [];

    if (current_status !== 'in_progress') options.push({ text: 'Mark in progress', new_status: 'in_progress' });
    if (current_status !== 'completed') options.push({ text: 'Mark complete', new_status: 'completed' });
    if (current_status !== 'pending') options.push({ text: 'Reset to not started', new_status: 'pending', style: 'destructive' });
    options.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert(
      title,
      undefined,
      options.map((o) => ({
        text: o.text,
        style: o.style,
        onPress: o.new_status
          ? () =>
              setStatusMutation.mutate({
                milestone_id,
                current_status,
                new_status: o.new_status,
                title,
              })
          : undefined,
      }))
    );
  }

  const isLoading = projectQuery.isLoading || updatesQuery.isLoading;
  const error = projectQuery.error || updatesQuery.error;
  const isTradesman = role === 'tradesman';

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
          milestones={milestonesQuery.data ?? []}
          isTradesman={isTradesman}
          onCompose={() => router.push({ pathname: '/project/[id]/compose', params: { id: id! } })}
          onEndOfDay={async () => {
            // Fire the leave-site nudge: logs the event, fires a local notification.
            // Tapping the notification opens the EoD card. In production the geofence
            // does this trigger automatically; the button is the in-app manual fallback.
            try {
              await logLeaveSite(id!);
              const customerFirst =
                projectQuery.data?.customer?.full_name?.split(' ')[0] ??
                projectQuery.data?.pending_customer_name?.split(' ')[0] ??
                'your customer';
              await fireLeaveSiteNudge({ project_id: id!, customer_first_name: customerFirst });
            } catch (e) {
              Alert.alert("Couldn't end day", (e as Error).message);
            }
          }}
          onManageMilestones={() => router.push({ pathname: '/project/[id]/milestones', params: { id: id! } })}
          onChangeStatus={() => router.push({ pathname: '/project/[id]/status', params: { id: id! } })}
          onMilestoneTap={onMilestoneTap}
        />
      )}
    </SafeAreaView>
  );
}

function Content({
  project,
  updates,
  milestones,
  isTradesman,
  onCompose,
  onEndOfDay,
  onManageMilestones,
  onChangeStatus,
  onMilestoneTap,
}: {
  project: NonNullable<Awaited<ReturnType<typeof fetchProject>>>;
  updates: Awaited<ReturnType<typeof fetchProjectUpdates>>;
  milestones: Awaited<ReturnType<typeof fetchMilestones>>;
  isTradesman: boolean;
  onCompose: () => void;
  onEndOfDay: () => void;
  onManageMilestones: () => void;
  onChangeStatus: () => void;
  onMilestoneTap: (milestone_id: string, current_status: string, title: string) => void;
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

  const { current, next } = currentAndNextMilestone(milestones);

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
        onStatusPress={isTradesman ? onChangeStatus : undefined}
      />

      {/* Today / Next */}
      <Card>
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
      </Card>

      {/* Address */}
      <Card>
        <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>Site address</Text>
        <Text style={[t.type.bodyLg, { color: t.colors.text.primary, marginTop: 4 }]}>
          {[project.address_line_1, project.city, project.postcode].filter(Boolean).join(', ') || '—'}
        </Text>
      </Card>

      {/* Milestones */}
      <View style={styles.sectionHeader}>
        <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>
          Milestones · {milestones.length}
        </Text>
        {isTradesman && (
          <Pressable onPress={onManageMilestones} hitSlop={8}>
            <Text style={[t.type.footnote, { color: t.colors.text.link }]}>Manage</Text>
          </Pressable>
        )}
      </View>

      {milestones.length === 0 ? (
        <Card>
          <Text style={[t.type.body, { color: t.colors.text.tertiary }]}>
            {isTradesman ? 'No milestones yet — tap Manage to add some.' : 'No milestones set yet.'}
          </Text>
        </Card>
      ) : (
        <Card>
          {milestones.map((m, i) => (
            <View
              key={m.id}
              style={{
                borderBottomWidth: i < milestones.length - 1 ? 1 : 0,
                borderBottomColor: t.colors.border.subtle,
              }}
            >
              <Milestone
                title={m.title}
                status={m.status}
                expectedDate={m.expected_date}
                onPress={
                  isTradesman ? () => onMilestoneTap(m.id, m.status, m.title) : undefined
                }
              />
            </View>
          ))}
        </Card>
      )}

      {/* Tradesman CTAs: end-of-day primary, quick-post as ghost link */}
      {isTradesman && (
        <View style={{ gap: t.space[2], alignItems: 'center' }}>
          <View style={{ alignSelf: 'stretch' }}>
            <PrimaryButton title="End my day" onPress={onEndOfDay} />
          </View>
          <Pressable
            onPress={onCompose}
            hitSlop={8}
            style={{ paddingVertical: t.space[2] }}
          >
            <Text style={[t.type.body, { color: t.colors.text.link }]}>
              Or post a quick update
            </Text>
          </Pressable>
        </View>
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
            {u.media && u.media.length > 0 && (
              <View style={{ marginTop: t.space[3] }}>
                <MediaThumbs media={u.media} />
              </View>
            )}
            {u.type === 'eta' && u.eta_at && (
              <View
                style={{
                  marginTop: t.space[3],
                  paddingTop: t.space[3],
                  borderTopWidth: 1,
                  borderTopColor: t.colors.border.subtle,
                }}
              >
                <Text style={[t.type.footnote, { color: t.colors.text.secondary }]}>
                  ⏰ {formatEta(u.eta_at)}
                </Text>
              </View>
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  updateHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
