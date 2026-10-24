import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { fetchMyOpenTasks, fetchMyRecentPosts } from '@/services/crew-home';
import { fetchMyProjects } from '@/services/projects';
import { setTaskDone } from '@/services/tasks';
import { useAuthStore } from '@/stores/auth';
import { lightTheme } from '@/theme/light';
import type { ProjectStatus } from '@/theme/tokens';

/**
 * Crew home — "Today". The day's job up top with the three things crew
 * actually do (post, tick the job list, open the project), then their
 * open tasks, their posts waiting on the lead, and the rest of their
 * projects. Deliberately NO useLocationConsentNudge — the leave-site
 * nudge is the lead's tool; crew never get the location warm prompt.
 */
export default function CrewTodayScreen() {
  const t = lightTheme;
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();

  const projectsQuery = useQuery({
    queryKey: ['my-projects', profile?.id],
    queryFn: fetchMyProjects,
    enabled: !!profile,
  });
  const tasksQuery = useQuery({
    queryKey: ['my-open-tasks', profile?.id],
    queryFn: fetchMyOpenTasks,
    enabled: !!profile,
  });
  const postsQuery = useQuery({
    queryKey: ['my-recent-posts', profile?.id],
    queryFn: fetchMyRecentPosts,
    enabled: !!profile,
  });

  // Re-pull everything when Today regains focus — the user may have
  // posted, ticked a task, or been added to a project on a child screen.
  // Deps are the STABLE refetch functions only (see the jobs.tsx note on
  // the July "Maximum update depth" crash).
  const { refetch: refetchProjects } = projectsQuery;
  const { refetch: refetchTasks } = tasksQuery;
  const { refetch: refetchPosts } = postsQuery;
  useFocusEffect(
    useCallback(() => {
      void refetchProjects();
      void refetchTasks();
      void refetchPosts();
    }, [refetchProjects, refetchTasks, refetchPosts]),
  );

  const tickTask = useMutation({
    mutationFn: (taskId: string) => setTaskDone(taskId, true),
    onSuccess: (_data, taskId) => {
      void queryClient.invalidateQueries({ queryKey: ['my-open-tasks'] });
      // Keep the per-project job list in step too.
      const task = (tasksQuery.data ?? []).find((task) => task.id === taskId);
      if (task) {
        void queryClient.invalidateQueries({ queryKey: ['project-tasks', task.project_id] });
      }
    },
  });

  const projects = projectsQuery.data ?? [];
  const todayJob = projects[0];
  const otherProjects = projects.slice(1);
  const tasks = tasksQuery.data ?? [];
  const awaiting = (postsQuery.data ?? []).filter(
    (p) => p.approval_status === 'pending' || p.approval_status === 'rejected',
  );

  const isLoading = projectsQuery.isLoading;
  const error = projectsQuery.error;

  // Date stamp — same stamped-tool register as the other role homes.
  const dateStamp = new Date()
    .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    .toUpperCase()
    .replace(',', ' ·');

  function openInMaps(job: { address_line_1: string | null; city: string | null }) {
    const address = [job.address_line_1, job.city].filter(Boolean).join(', ');
    if (!address) return;
    void Linking.openURL('http://maps.apple.com/?q=' + encodeURIComponent(address));
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['top']}>
      <View style={{ alignItems: 'center', paddingTop: 6 }}>
        <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>{dateStamp}</Text>
      </View>
      <View style={styles.navBar}>
        <View style={styles.navIconBox} />
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>Today</Text>
        <View style={styles.navIconBox} />
      </View>

      {isLoading && (
        <View style={{ padding: t.space[5], gap: t.space[3] }}>
          {[0, 1].map((i) => (
            <Card key={i}>
              <View style={{ gap: 8 }}>
                <Skeleton width="70%" height={18} />
                <Skeleton width="50%" height={12} />
                <Skeleton width="100%" height={40} borderRadius={10} />
              </View>
            </Card>
          ))}
        </View>
      )}

      {!!error && (
        <ErrorState
          message={(error as Error).message}
          onRetry={() => void refetchProjects()}
        />
      )}

      {!isLoading && !error && projects.length === 0 && (
        <View style={styles.empty}>
          <Text style={[t.type.title2, { color: t.colors.text.primary, textAlign: 'center' }]}>
            No jobs yet
          </Text>
          <Text
            style={[
              t.type.body,
              { color: t.colors.text.secondary, textAlign: 'center', marginTop: 8, maxWidth: 280 },
            ]}
          >
            Ask your lead for a crew invite code — it puts their job on this screen.
          </Text>
          <View style={{ marginTop: t.space[6], alignSelf: 'stretch' }}>
            <PrimaryButton title="Enter invite code" onPress={() => router.push('/crew-code-entry')} />
          </View>
        </View>
      )}

      {!isLoading && !error && todayJob && (
        <ScrollView
          contentContainerStyle={{ padding: t.space[5], gap: t.space[3], paddingBottom: t.space[16] }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              tintColor={t.colors.brand.primary}
              refreshing={projectsQuery.isRefetching}
              onRefresh={() => {
                void refetchProjects();
                void refetchTasks();
                void refetchPosts();
              }}
            />
          }
        >
          {/* ── Day's job ─────────────────────────────────────────── */}
          <SectionLabel text="Today's job" />
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, paddingRight: t.space[3] }}>
                <Text style={[t.type.title3, { color: t.colors.text.primary }]} numberOfLines={2}>
                  {todayJob.title}
                </Text>
                {(todayJob.address_line_1 || todayJob.city) && (
                  <Pressable
                    onPress={() => openInMaps(todayJob)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Open the site address in Maps"
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}
                  >
                    <Ionicons name="location-outline" size={14} color={t.colors.text.link} />
                    <Text style={[t.type.footnote, { color: t.colors.text.link }]} numberOfLines={1}>
                      {[todayJob.address_line_1, todayJob.city].filter(Boolean).join(', ')}
                    </Text>
                  </Pressable>
                )}
              </View>
              <StatusBadge status={todayJob.status as ProjectStatus} size="sm" />
            </View>

            <View style={{ flexDirection: 'row', gap: t.space[2], marginTop: t.space[4] }}>
              <JobAction
                label="Post update"
                icon="camera-outline"
                primary
                onPress={() =>
                  router.push({ pathname: '/project/[id]/compose', params: { id: todayJob.id } })
                }
              />
              <JobAction
                label="Job list"
                icon="checkbox-outline"
                onPress={() =>
                  router.push({ pathname: '/project/[id]/tasks', params: { id: todayJob.id } })
                }
              />
              <JobAction
                label="Open project"
                icon="arrow-forward-outline"
                onPress={() =>
                  router.push({ pathname: '/project/[id]', params: { id: todayJob.id } })
                }
              />
            </View>
          </Card>

          {/* ── My jobs (open tasks across projects) ───────────────── */}
          {tasks.length > 0 && (
            <>
              <SectionLabel text="My jobs" style={{ marginTop: t.space[3] }} />
              <Card>
                <View style={{ gap: 2 }}>
                  {tasks.map((task, i) => (
                    <Pressable
                      key={task.id}
                      onPress={() => tickTask.mutate(task.id)}
                      disabled={tickTask.isPending}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: false }}
                      accessibilityLabel={`Mark ${task.title} done`}
                      style={[
                        styles.taskRow,
                        i > 0 && { borderTopWidth: 1, borderTopColor: t.colors.border.subtle },
                      ]}
                    >
                      <Ionicons
                        name="square-outline"
                        size={22}
                        color={t.colors.text.tertiary}
                        style={{ marginTop: 1 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[t.type.body, { color: t.colors.text.primary }]}>
                          {task.title}
                        </Text>
                        {task.project?.title && (
                          <Text
                            style={[t.type.footnote, { color: t.colors.text.tertiary, marginTop: 2 }]}
                            numberOfLines={1}
                          >
                            {task.project.title}
                          </Text>
                        )}
                      </View>
                    </Pressable>
                  ))}
                </View>
              </Card>
            </>
          )}

          {/* ── Waiting for approval ───────────────────────────────── */}
          {awaiting.length > 0 && (
            <>
              <SectionLabel text="Waiting for approval" style={{ marginTop: t.space[3] }} />
              <Card>
                <View style={{ gap: 2 }}>
                  {awaiting.map((post, i) => {
                    const rejected = post.approval_status === 'rejected';
                    return (
                      <Pressable
                        key={post.id}
                        onPress={() =>
                          router.push({
                            pathname: '/comments/[update_id]',
                            params: { update_id: post.id },
                          })
                        }
                        style={[
                          styles.taskRow,
                          i > 0 && { borderTopWidth: 1, borderTopColor: t.colors.border.subtle },
                        ]}
                      >
                        <Ionicons
                          name={rejected ? 'alert-circle-outline' : 'hourglass-outline'}
                          size={20}
                          color={rejected ? '#C0392B' : t.colors.text.tertiary}
                          style={{ marginTop: 1 }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[t.type.body, { color: t.colors.text.primary }]}
                            numberOfLines={2}
                          >
                            {post.body || 'Photo update'}
                          </Text>
                          <Text
                            style={[
                              t.type.footnote,
                              {
                                color: rejected ? '#C0392B' : t.colors.text.tertiary,
                                marginTop: 2,
                              },
                            ]}
                            numberOfLines={2}
                          >
                            {rejected
                              ? `Needs another go — ${post.rejection_reason ?? 'no reason given'}`
                              : "With your lead for approval"}
                          </Text>
                        </View>
                        <Text style={[t.type.bodyLg, { color: t.colors.text.tertiary }]}>›</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Card>
            </>
          )}

          {/* ── Your projects ──────────────────────────────────────── */}
          {otherProjects.length > 0 && (
            <>
              <SectionLabel text="Your projects" style={{ marginTop: t.space[3] }} />
              {otherProjects.map((p) => (
                <Card
                  key={p.id}
                  onPress={() => router.push({ pathname: '/project/[id]', params: { id: p.id } })}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, paddingRight: t.space[3] }}>
                      <Text
                        style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}
                        numberOfLines={1}
                      >
                        {p.title}
                      </Text>
                      <Text
                        style={[t.type.footnote, { color: t.colors.text.tertiary, marginTop: 2 }]}
                        numberOfLines={1}
                      >
                        {p.city ?? '—'}
                      </Text>
                    </View>
                    <StatusBadge status={p.status as ProjectStatus} size="sm" />
                  </View>
                </Card>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

/** Stamped uppercase section label — the Phase caption register. */
function SectionLabel({ text, style }: { text: string; style?: object }) {
  const t = lightTheme;
  return (
    <Text
      style={[
        t.type.caption,
        { color: t.colors.text.tertiary, letterSpacing: 1.4, textTransform: 'uppercase' },
        style,
      ]}
    >
      {text}
    </Text>
  );
}

/** One of the three equal actions on the day's job card. */
function JobAction({
  label,
  icon,
  onPress,
  primary = false,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  primary?: boolean;
}) {
  const t = lightTheme;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.jobAction,
        {
          backgroundColor: primary ? t.colors.brand.primary : t.colors.brand.tint,
          borderRadius: t.radius.md,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={18}
        color={primary ? t.colors.text.inverse : t.colors.text.link}
      />
      <Text
        style={[
          t.type.footnote,
          {
            color: primary ? t.colors.text.inverse : t.colors.text.link,
            fontWeight: '600',
            textAlign: 'center',
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
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
  navIconBox: { width: 32, height: 32 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
  },
  jobAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
});
