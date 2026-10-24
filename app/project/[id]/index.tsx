import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
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
import { PhaseSpinner } from '@/components/ui/PhaseSpinner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useRealtimeProject } from '@/hooks/useRealtimeProject';
import { ensureInviteCode, inviteShareMessage, markInviteShared } from '@/services/invites';
import {
  currentAndNextMilestone,
  dayOfProject,
  customerFirstName,
  fetchMilestones,
  fetchProject,
  fetchProjectUpdates,
  formatEta,
  relativeTime,
  setMilestoneStatus,
  softDeleteUpdate,
  statusHeadline,
} from '@/services/projects';
import { useProjectRole } from '@/hooks/useProjectRole';
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
  // Relationship to THIS project, not account role — a tradesman crewing
  // on someone else's job is crew here (persona audit, 24 Oct).
  const { isLead, isCrew, isTradeSide } = useProjectRole(id);
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
          <PhaseSpinner size={36} />
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
          isLead={isLead}
          isCrew={isCrew}
          isTradeSide={isTradeSide}
          refreshing={isRefreshing}
          onRefresh={refreshAll}
          onCompose={() => router.push({ pathname: '/project/[id]/compose', params: { id: id! } })}
          onEndOfDay={() => {
            // Straight to the EoD card. A manual tap must NOT log a
            // confirmed left_site event or self-notify (persona audit H12:
            // false location audit trail + polluted Activity badge). The
            // real geofence logs its own events when it ships.
            router.push({
              pathname: '/project/[id]/end-of-day',
              params: { id: id! },
            });
          }}
          onManageMilestones={() => router.push({ pathname: '/project/[id]/milestones', params: { id: id! } })}
          onSetReminder={() => router.push({ pathname: '/project/[id]/reminders', params: { id: id! } })}
          onChangeStatus={() => router.push({ pathname: '/project/[id]/status', params: { id: id! } })}
          onMilestoneTap={onMilestoneTap}
          currentUserId={useAuthStore.getState().profile?.id ?? null}
          onDeleteUpdate={(update_id) => {
            Alert.alert('Delete this update?', 'It disappears from the timeline for everyone.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await softDeleteUpdate(update_id);
                    queryClient.invalidateQueries({ queryKey: ['project-updates', id] });
                    updatesQuery.refetch();
                  } catch (e) {
                    Alert.alert("Couldn't delete", (e as Error).message);
                  }
                },
              },
            ]);
          }}
          onShareInvite={async () => {
            try {
              const code = await ensureInviteCode(id!);
              const result = await Share.share({
                message: inviteShareMessage(code, projectQuery.data?.pending_customer_name),
              });
              if (result.action === Share.sharedAction) {
                await markInviteShared(id!);
              }
              queryClient.invalidateQueries({ queryKey: ['project', id] });
            } catch (e) {
              Alert.alert("Couldn't share invite", (e as Error).message);
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
  isLead,
  isCrew,
  isTradeSide,
  refreshing,
  onRefresh,
  onCompose,
  onEndOfDay,
  onManageMilestones,
  onSetReminder,
  onChangeStatus,
  onMilestoneTap,
  onShareInvite,
  onDeleteUpdate,
  currentUserId,
}: {
  project: NonNullable<Awaited<ReturnType<typeof fetchProject>>>;
  updates: Awaited<ReturnType<typeof fetchProjectUpdates>>;
  milestones: Awaited<ReturnType<typeof fetchMilestones>>;
  isLead: boolean;
  isCrew: boolean;
  isTradeSide: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onCompose: () => void;
  onEndOfDay: () => void;
  onManageMilestones: () => void;
  onSetReminder: () => void;
  onChangeStatus: () => void;
  onMilestoneTap: (milestone_id: string, current_status: string, title: string) => void;
  onShareInvite: () => void;
  onDeleteUpdate: (update_id: string) => void;
  currentUserId: string | null;
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
      refreshControl={<RefreshControl tintColor={t.colors.brand.primary} refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ProjectHero
        status={project.status as ProjectStatus}
        headline={headline}
        subhead={subhead}
        progressPct={progressPct}
        onStatusPress={isLead ? onChangeStatus : undefined}
      />

      {/* Today / Next */}
      <Card>
        <View style={styles.metaRow}>
          <Text style={[t.type.body, { color: t.colors.text.secondary }]}>Trade</Text>
          <Pressable onPress={isLead ? onChangeStatus : undefined} disabled={!isLead} hitSlop={6}>
            <Text
              style={[
                t.type.bodyLgEmphasis,
                { color: isLead ? t.colors.text.link : t.colors.text.primary },
              ]}
            >
              {formatTradeLabel(project.trade_type)}
            </Text>
          </Pressable>
        </View>
        <View style={[styles.metaRow, { marginTop: t.space[3] }]}>
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
      {!isTradeSide && project.tradesman && (
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
                {project.tradesman.business?.business_name ?? project.tradesman.full_name ?? '—'}
              </Text>
              {project.tradesman.business?.business_name && project.tradesman.full_name && (
                <Text style={[t.type.footnote, { color: t.colors.text.tertiary, marginTop: 2 }]}>
                  {project.tradesman.full_name}
                </Text>
              )}
            </View>
            <Text style={[t.type.bodyLg, { color: t.colors.text.tertiary }]}>›</Text>
          </Pressable>
        </Card>
      )}

      {/* Invite card — tradesman only, only while customer hasn't joined */}
      {isLead && !project.customer_id && (
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
                <Pressable onPress={onShareInvite} hitSlop={8}>
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
                  ? `Shared ${relativeTime(project.invite_sent_at)}`
                  : 'Not shared yet'}
              </Text>
            </>
          ) : (
            <Text
              style={[
                t.type.body,
                { color: t.colors.text.secondary, marginTop: t.space[2] },
              ]}
            >
              Tap below to create their invite and send it over WhatsApp, text or email.
            </Text>
          )}
          <View style={{ marginTop: t.space[3] }}>
            <PrimaryButton
              title={project.invite_code ? 'Share invite' : 'Create + share invite'}
              onPress={onShareInvite}
            />
          </View>
        </Card>
      )}

      {/* Milestones */}
      <View style={styles.sectionHeader}>
        <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>
          Milestones · {milestones.length}
        </Text>
        {isLead && (
          <Pressable onPress={onManageMilestones} hitSlop={8}>
            <Text style={[t.type.footnote, { color: t.colors.text.link }]}>Manage</Text>
          </Pressable>
        )}
      </View>

      {milestones.length === 0 ? (
        <Card>
          <Text style={[t.type.body, { color: t.colors.text.tertiary }]}>
            {isLead ? 'No milestones yet — tap Manage to add some.' : 'No milestones set yet.'}
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
                expectedStartDate={m.expected_start_date}
                onPress={
                  isLead ? () => onMilestoneTap(m.id, m.status, m.title) : undefined
                }
              />
            </View>
          ))}
        </Card>
      )}

      {/* Trade-side CTAs: lead gets End my day; crew get Post update as
          the primary (they previously could not post at all — audit H1). */}
      {isCrew && (
        <View style={{ alignSelf: 'stretch' }}>
          <PrimaryButton title="Post a photo update" onPress={onCompose} />
        </View>
      )}
      {isLead && (
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
              Contracts, certificates, plans
            </Text>
          </View>
          <Text style={[t.type.bodyLg, { color: t.colors.text.tertiary }]}>›</Text>
        </Pressable>
      </Card>

      {/* Job list — trade side only (lead + crew); customers never see it. */}
      {isTradeSide && (
        <Card>
          <Pressable
            onPress={() =>
              router.push({ pathname: '/project/[id]/tasks', params: { id: project.id } })
            }
            style={styles.metaRow}
          >
            <View>
              <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>Job list</Text>
              <Text style={[t.type.bodyLg, { color: t.colors.text.primary, marginTop: 4 }]}>
                {isLead ? 'Set the crew their jobs' : 'Your jobs for this project'}
              </Text>
            </View>
            <Text style={[t.type.bodyLg, { color: t.colors.text.tertiary }]}>›</Text>
          </Pressable>
        </Card>
      )}

      {/* Pricing — lead and customer only; crew never see the money
          (audit M2/M16). The price changes here
          are the "no surprise bills" wedge: every change is logged,
          customer must approve. quoted_amount isn't in this query's
          select list, so read it through a widened cast. */}
      {(() => {
        const quotedAmount = (project as { quoted_amount?: number | null })
          .quoted_amount;
        return (
          <Card>
            <Pressable
              onPress={() =>
                router.push({ pathname: '/project/[id]/pricing', params: { id: project.id } })
              }
              style={styles.metaRow}
            >
              <View>
                <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>
                  Quotes & price
                </Text>
                <Text style={[t.type.bodyLg, { color: t.colors.text.primary, marginTop: 4 }]}>
                  {quotedAmount != null
                    ? new Intl.NumberFormat('en-GB', {
                        style: 'currency',
                        currency: 'GBP',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      }).format(quotedAmount)
                    : isLead
                      ? 'Send a quote or set the agreed price'
                      : 'No quote set yet'}
                </Text>
              </View>
              <Text style={[t.type.bodyLg, { color: t.colors.text.tertiary }]}>›</Text>
            </Pressable>
          </Card>
        );
      })()}

      {/* Approvals card — only visible to the lead when there's pending
          work to review. Apprentice updates queue here before reaching
          the customer. */}
      {isLead && (() => {
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

      {/* Updates feed — RLS already hides pending/rejected from customers.
          The lead sees all; an author always sees their own, including
          rejected with the reason (audit H2 crew). */}
      <Text style={[t.type.caption, { color: t.colors.text.tertiary, marginTop: t.space[2] }]}>
        Updates · {updates.filter((u) => {
          const s = (u as { approval_status?: string }).approval_status;
          if (s === 'pending' || s === 'rejected') return isLead || u.author_id === currentUserId;
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
            if (s === 'pending' || s === 'rejected') return isLead || u.author_id === currentUserId;
            return true;
          })
          .map((u) => (
          <Card key={u.id}>
            {/* The whole card opens the update's comment thread — the small
                link below stays as the labelled affordance (23 Oct). */}
            <Pressable
              onPress={() =>
                router.push({ pathname: '/comments/[update_id]', params: { update_id: u.id } })
              }
              onLongPress={
                u.author_id === currentUserId ? () => onDeleteUpdate(u.id) : undefined
              }
              delayLongPress={450}
            >
            {(u as { approval_status?: string; rejection_reason?: string | null }).approval_status === 'rejected' && (
              <View
                style={{
                  alignSelf: 'flex-start',
                  paddingVertical: 4,
                  paddingHorizontal: 10,
                  borderRadius: 999,
                  backgroundColor: '#FDEBEA',
                  marginBottom: 8,
                }}
              >
                <Text style={[t.type.footnote, { color: '#C0392B', fontWeight: '600' }]}>
                  {'Not approved' +
                    ((u as { rejection_reason?: string | null }).rejection_reason
                      ? ` — ${(u as { rejection_reason?: string | null }).rejection_reason}`
                      : '')}
                </Text>
              </View>
            )}
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
                  {isLead && (u as { customer_seen_at?: string | null }).customer_seen_at
                    ? ' · Seen ✓'
                    : ''}
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
            </Pressable>
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

/** 'kitchen_fitter' → 'Kitchen fitter' — display label for the trade enum. */
function formatTradeLabel(trade: string): string {
  const label = trade.replace(/_/g, ' ');
  return label.charAt(0).toUpperCase() + label.slice(1);
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
