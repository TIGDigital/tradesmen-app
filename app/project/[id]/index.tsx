import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MediaThumbs } from '@/components/MediaThumbs';
import { Milestone } from '@/components/Milestone';
import { ProjectHero } from '@/components/ProjectHero';
import { Reactions } from '@/components/Reactions';
import { VoicePlayer } from '@/components/VoicePlayer';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useRealtimeProject } from '@/hooks/useRealtimeProject';
import { sendInviteSms } from '@/services/invites';
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

  // Live updates: new posts, reactions, photos appear without manual reload.
  useRealtimeProject(id ?? null);

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
    // Optimistic: flip the milestone in the local cache immediately so the tap
    // feels instant. Snapshot the previous list; on error we roll back.
    onMutate: async (args) => {
      const key = ['milestones', id];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<any[]>(key);
      if (previous) {
        const next = previous.map((m: any) =>
          m.id === args.milestone_id
            ? {
                ...m,
                status: args.new_status,
                completed_at: args.new_status === 'completed' ? new Date().toISOString() : null,
              }
            : m
        );
        queryClient.setQueryData(key, next);
      }
      return { previous };
    },
    onError: (e, _args, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['milestones', id], ctx.previous);
      Alert.alert("Couldn't update milestone", (e as Error).message);
    },
    onSettled: () => {
      // Refetch authoritative state + side effects (auto-posted feed update).
      queryClient.invalidateQueries({ queryKey: ['milestones', id] });
      queryClient.invalidateQueries({ queryKey: ['updates', id] });
      queryClient.invalidateQueries({ queryKey: ['my-current-project'] });
    },
  });

  /** Show an action sheet with the next-state options + an "Edit details…"
   *  escape hatch that opens the full milestone editor (dates, notes, etc.). */
  function onMilestoneTap(milestone_id: string, current_status: string, title: string) {
    const options: {
      text: string;
      new_status?: string;
      edit?: boolean;
      style?: 'cancel' | 'destructive';
    }[] = [];

    if (current_status !== 'in_progress') options.push({ text: 'Mark in progress', new_status: 'in_progress' });
    if (current_status !== 'completed') options.push({ text: 'Mark complete', new_status: 'completed' });
    if (current_status !== 'pending') options.push({ text: 'Reset to not started', new_status: 'pending', style: 'destructive' });
    options.push({ text: 'Edit details…', edit: true });
    options.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert(
      title,
      undefined,
      options.map((o) => ({
        text: o.text,
        style: o.style,
        onPress: o.edit
          ? () =>
              router.push({
                pathname: '/milestone/[id]',
                params: { id: milestone_id },
              })
          : o.new_status
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
  const isRefreshing =
    projectQuery.isRefetching || updatesQuery.isRefetching || milestonesQuery.isRefetching;
  const refreshAll = () => {
    void projectQuery.refetch();
    void updatesQuery.refetch();
    void milestonesQuery.refetch();
  };

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
        <Pressable
          onPress={() => router.push({ pathname: '/project/[id]/chat', params: { id: id! } })}
          hitSlop={12}
          style={styles.navIconBox}
        >
          <Text style={{ fontSize: 22, color: t.colors.text.primary }}>💬</Text>
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

      {projectQuery.data && (
        <Content
          project={projectQuery.data}
          updates={updatesQuery.data ?? []}
          milestones={milestonesQuery.data ?? []}
          isTradesman={isTradesman}
          refreshing={isRefreshing}
          onRefresh={refreshAll}
          onCompose={() => router.push({ pathname: '/project/[id]/compose', params: { id: id! } })}
          onEndOfDay={async () => {
            // Fire the leave-site nudge in the background — logs the event
            // + sends a local notification matching what the real geofence
            // would do. Swallow any failure (notification permission
            // denied, simulator, etc.) and continue — the user tapped
            // "End my day" and they want the modal, not just a side-effect.
            try {
              await logLeaveSite(id!);
              const customerFirst =
                projectQuery.data?.customer?.full_name?.split(' ')[0] ??
                projectQuery.data?.pending_customer_name?.split(' ')[0] ??
                'your customer';
              await fireLeaveSiteNudge({
                project_id: id!,
                customer_first_name: customerFirst,
              });
            } catch (e) {
              console.warn('[EndMyDay] nudge failed', e);
            }
            // Open the EoD card directly so the user always gets immediate
            // feedback. On a real phone with notifications enabled, both
            // happen (nudge fires AND modal opens) — harmless redundancy.
            // On simulator / with notifications denied / when the app is
            // foregrounded, this is the only thing that actually works.
            router.push({
              pathname: '/project/[id]/end-of-day',
              params: { id: id! },
            });
          }}
          onManageMilestones={() => router.push({ pathname: '/project/[id]/milestones', params: { id: id! } })}
          onSetReminder={() => router.push({ pathname: '/project/[id]/reminders', params: { id: id! } })}
          onChangeStatus={() => router.push({ pathname: '/project/[id]/status', params: { id: id! } })}
          onMilestoneTap={onMilestoneTap}
          onSendInviteSms={async () => {
            try {
              const res = await sendInviteSms(id!);
              queryClient.invalidateQueries({ queryKey: ['project', id] });
              Alert.alert('SMS sent', `Customer will get a text with code ${res.invite_code}.`);
            } catch (e) {
              Alert.alert("Couldn't send SMS", (e as Error).message);
            }
          }}
          onShareInvite={async (code) => {
            try {
              await Share.share({
                message: `Your project invite code: ${code}\n\nOpen the Phase app and enter it on the home screen.`,
              });
            } catch {
              // user cancelled
            }
          }}
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
  refreshing,
  onRefresh,
  onCompose,
  onEndOfDay,
  onManageMilestones,
  onSetReminder,
  onChangeStatus,
  onMilestoneTap,
  onSendInviteSms,
  onShareInvite,
}: {
  project: NonNullable<Awaited<ReturnType<typeof fetchProject>>>;
  updates: Awaited<ReturnType<typeof fetchProjectUpdates>>;
  milestones: Awaited<ReturnType<typeof fetchMilestones>>;
  isTradesman: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onCompose: () => void;
  onEndOfDay: () => void;
  onManageMilestones: () => void;
  onSetReminder: () => void;
  onChangeStatus: () => void;
  onMilestoneTap: (milestone_id: string, current_status: string, title: string) => void;
  onSendInviteSms: () => void;
  onShareInvite: (code: string) => void;
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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

      {/* Your tradesman — customer view only. Tap to see the public profile. */}
      {!isTradesman && project.tradesman && (
        <Card>
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/tradesman/[id]',
                params: { id: project.tradesman!.id },
              })
            }
            style={styles.metaRow}
          >
            <View>
              <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>Your tradesman</Text>
              <Text style={[t.type.bodyLg, { color: t.colors.text.primary, marginTop: 4 }]}>
                {project.tradesman.full_name ?? '—'}
              </Text>
            </View>
            <Text style={[t.type.bodyLg, { color: t.colors.text.tertiary }]}>›</Text>
          </Pressable>
        </Card>
      )}

      {/* Invite card — tradesman only, only while customer hasn't joined */}
      {isTradesman && !project.customer_id && (
        <Card>
          <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>
            Invite {project.pending_customer_name ?? 'customer'}
          </Text>
          {project.invite_code ? (
            <>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: t.space[2],
                  gap: t.space[3],
                }}
              >
                <Text
                  style={[
                    t.type.title2,
                    { color: t.colors.text.primary, letterSpacing: 2, flex: 1 },
                  ]}
                >
                  {project.invite_code}
                </Text>
                <Pressable
                  onPress={() => onShareInvite(project.invite_code!)}
                  hitSlop={8}
                >
                  <Text style={[t.type.footnote, { color: t.colors.text.link }]}>Share</Text>
                </Pressable>
              </View>
              <Text
                style={[
                  t.type.footnote,
                  { color: t.colors.text.tertiary, marginTop: t.space[1] },
                ]}
              >
                {project.invite_sent_at
                  ? `SMS sent ${relativeTime(project.invite_sent_at)}`
                  : 'Not sent yet'}
              </Text>
            </>
          ) : (
            <Text
              style={[
                t.type.body,
                { color: t.colors.text.secondary, marginTop: t.space[2] },
              ]}
            >
              No code yet — tap below to generate + send.
            </Text>
          )}
          <View style={{ marginTop: t.space[3] }}>
            <PrimaryButton
              title={project.invite_code ? 'Re-send SMS' : 'Send SMS invite'}
              onPress={onSendInviteSms}
            />
          </View>
        </Card>
      )}

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
          <Pressable
            onPress={onSetReminder}
            hitSlop={8}
            style={{ paddingVertical: t.space[2] }}
            accessibilityRole="button"
            accessibilityLabel="Configure daily end-of-day reminder for this project"
          >
            <Text style={[t.type.footnote, { color: t.colors.text.secondary }]}>
              Set up daily reminder
            </Text>
          </Pressable>
        </View>
      )}

      {/* Photos gallery entry — counts every non-voice attachment across all
          updates. Hidden when zero so the project detail stays clean for
          brand-new projects. */}
      {(() => {
        const photoCount = updates.reduce(
          (n, u) => n + (u.media ?? []).filter((m) => m.media_type !== 'voice').length,
          0,
        );
        if (photoCount === 0) return null;
        return (
          <Card>
            <Pressable
              onPress={() =>
                router.push({ pathname: '/project/[id]/photos', params: { id: project.id } })
              }
              style={styles.metaRow}
            >
              <View>
                <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>Photos</Text>
                <Text style={[t.type.bodyLg, { color: t.colors.text.primary, marginTop: 4 }]}>
                  {photoCount} photo{photoCount === 1 ? '' : 's'}
                </Text>
              </View>
              <Text style={[t.type.bodyLg, { color: t.colors.text.tertiary }]}>›</Text>
            </Pressable>
          </Card>
        );
      })()}

      {/* Schedule — only rendered when there's at least one milestone so the
          empty case isn't misleading. */}
      {milestones.length > 0 && (
        <Card>
          <Pressable
            onPress={() =>
              router.push({ pathname: '/project/[id]/schedule', params: { id: project.id } })
            }
            style={styles.metaRow}
          >
            <View>
              <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>Schedule</Text>
              <Text style={[t.type.bodyLg, { color: t.colors.text.primary, marginTop: 4 }]}>
                Visual milestone timeline
              </Text>
            </View>
            <Text style={[t.type.bodyLg, { color: t.colors.text.tertiary }]}>›</Text>
          </Pressable>
        </Card>
      )}

      {/* Documents — always visible so the upload affordance is one tap from
          the project detail, even when zero docs exist. */}
      <Card>
        <Pressable
          onPress={() =>
            router.push({ pathname: '/project/[id]/documents', params: { id: project.id } })
          }
          style={styles.metaRow}
        >
          <View>
            <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>Documents</Text>
            <Text style={[t.type.bodyLg, { color: t.colors.text.primary, marginTop: 4 }]}>
              Quotes, certificates, plans
            </Text>
          </View>
          <Text style={[t.type.bodyLg, { color: t.colors.text.tertiary }]}>›</Text>
        </Pressable>
      </Card>

      {/* Approvals card — only visible to the lead when there's pending
          work to review. Apprentice updates queue here before reaching
          the customer. */}
      {isTradesman && (() => {
        const pending = updates.filter(
          (u) => (u as { approval_status?: string }).approval_status === 'pending',
        ).length;
        if (pending === 0) return null;
        return (
          <Card>
            <Pressable
              onPress={() =>
                router.push({ pathname: '/project/[id]/approvals', params: { id: project.id } })
              }
              style={styles.metaRow}
            >
              <View>
                <Text style={[t.type.caption, { color: '#8A5A00' }]}>Approvals</Text>
                <Text style={[t.type.bodyLg, { color: t.colors.text.primary, marginTop: 4 }]}>
                  {pending} update{pending === 1 ? '' : 's'} need your sign-off
                </Text>
              </View>
              <Text style={[t.type.bodyLg, { color: t.colors.text.tertiary }]}>›</Text>
            </Pressable>
          </Card>
        );
      })()}

      {/* Crew — visible for everyone; the list screen handles empty state.
          Lead can remove non-lead members from inside the screen. */}
      <Card>
        <Pressable
          onPress={() =>
            router.push({ pathname: '/project/[id]/crew', params: { id: project.id } })
          }
          style={styles.metaRow}
        >
          <View>
            <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>Crew</Text>
            <Text style={[t.type.bodyLg, { color: t.colors.text.primary, marginTop: 4 }]}>
              Lead, apprentices, helpers
            </Text>
          </View>
          <Text style={[t.type.bodyLg, { color: t.colors.text.tertiary }]}>›</Text>
        </Pressable>
      </Card>

      {/* Snags — always visible. The list screen itself handles empty state. */}
      <Card>
        <Pressable
          onPress={() =>
            router.push({ pathname: '/project/[id]/snags', params: { id: project.id } })
          }
          style={styles.metaRow}
        >
          <View>
            <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>Snags</Text>
            <Text style={[t.type.bodyLg, { color: t.colors.text.primary, marginTop: 4 }]}>
              Flag an issue
            </Text>
          </View>
          <Text style={[t.type.bodyLg, { color: t.colors.text.tertiary }]}>›</Text>
        </Pressable>
      </Card>

      {/* Updates feed — customer view hides pending + rejected. Lead +
          author both see them; pending get a badge in the card. */}
      <Text style={[t.type.caption, { color: t.colors.text.tertiary, marginTop: t.space[2] }]}>
        Updates · {updates.filter((u) => {
          const s = (u as { approval_status?: string }).approval_status;
          if (s === 'rejected') return false;
          if (s === 'pending') return isTradesman;
          return true;
        }).length}
      </Text>

      {updates.length === 0 ? (
        <Text style={[t.type.body, { color: t.colors.text.tertiary }]}>
          No updates yet.
        </Text>
      ) : (
        updates
          .filter((u) => {
            const s = (u as { approval_status?: string }).approval_status;
            if (s === 'rejected') return false;
            if (s === 'pending') return isTradesman; // hide from non-lead
            return true;
          })
          .map((u) => (
          <Card key={u.id}>
            {(u as { approval_status?: string }).approval_status === 'pending' && (
              <View
                style={{
                  alignSelf: 'flex-start',
                  paddingVertical: 4,
                  paddingHorizontal: 10,
                  borderRadius: 999,
                  backgroundColor: '#FFF3D6',
                  marginBottom: 8,
                }}
              >
                <Text style={[t.type.footnote, { color: '#8A5A00', fontWeight: '600' }]}>
                  Awaiting approval
                </Text>
              </View>
            )}
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
                <MediaThumbs update_id={u.id} media={u.media} />
              </View>
            )}
            {u.media?.find((m) => m.media_type === 'voice') && (
              <View style={{ marginTop: t.space[3] }}>
                <VoicePlayer
                  storage_path={u.media.find((m) => m.media_type === 'voice')!.storage_path}
                />
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
            <Reactions update_id={u.id} project_id={project.id} reactions={u.reactions} />
            <Pressable
              onPress={() =>
                router.push({ pathname: '/comments/[update_id]', params: { update_id: u.id } })
              }
              hitSlop={6}
              style={{ paddingVertical: 8, marginTop: 4 }}
            >
              <Text style={[t.type.footnote, { color: t.colors.text.link }]}>
                {(u.comments?.length ?? 0) === 0
                  ? 'Add a comment'
                  : `View ${u.comments!.length} comment${u.comments!.length === 1 ? '' : 's'} →`}
              </Text>
            </Pressable>
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
