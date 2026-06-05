import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { fetchMilestones, fetchProject } from '@/services/projects';
import { lightTheme } from '@/theme/light';

/**
 * Read-only Gantt-style view of milestones across the project's time
 * window. Each milestone gets a row with the title on the left and a
 * coloured bar on a shared time axis on the right. A vertical red line
 * marks today (if today falls in the window).
 *
 * Bar colour by status:
 *   completed → green, in_progress → blue, pending → grey,
 *   awaiting_approval → amber, skipped → muted grey strike.
 *
 * Drag-to-reschedule + status edits ship in Sprint 35.
 */
export default function ScheduleScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width: screenWidth } = useWindowDimensions();

  const projectQuery = useQuery({
    queryKey: ['project', id],
    queryFn: () => fetchProject(id!),
    enabled: !!id,
  });

  const milestonesQuery = useQuery({
    queryKey: ['milestones', id],
    queryFn: () => fetchMilestones(id!),
    enabled: !!id,
  });

  const project = projectQuery.data;
  const milestones = milestonesQuery.data ?? [];

  // Compute the global window. We prefer expected_start..expected_end at
  // project level, then fall back to min/max across milestone start+end.
  const range = computeRange(project, milestones);

  // Layout numbers.
  const SIDE_PAD = 16;
  const LABEL_WIDTH = 130; // left column width
  const ROW_HEIGHT = 36;
  const BAR_HEIGHT = 16;
  const trackWidth = Math.max(160, screenWidth - SIDE_PAD * 2 - LABEL_WIDTH - 8);

  const isLoading = projectQuery.isLoading || milestonesQuery.isLoading;
  const error = projectQuery.error || milestonesQuery.error;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['bottom']}>
      <View style={[styles.navBar, { paddingTop: insets.top, height: 44 + insets.top }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[t.type.bodyLg, { color: t.colors.text.link }]}>Done</Text>
        </Pressable>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>Schedule</Text>
        <View style={{ width: 60 }} />
      </View>

      {isLoading && (
        <View style={{ padding: 16, gap: 8 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
              <Skeleton width={LABEL_WIDTH} height={20} />
              <Skeleton width={trackWidth} height={20} />
            </View>
          ))}
        </View>
      )}

      {error && (
        <ErrorState
          message={(error as Error).message}
          onRetry={() => {
            void projectQuery.refetch();
            void milestonesQuery.refetch();
          }}
        />
      )}

      {!isLoading && !error && milestones.length === 0 && (
        <ErrorState
          tone="empty"
          title="No milestones yet"
          message="Add milestones to the project to see the schedule."
        />
      )}

      {!isLoading && !error && milestones.length > 0 && range && (
        <ScrollView contentContainerStyle={{ padding: SIDE_PAD, paddingBottom: 32 }}>
          {/* Header strip with the start/end dates */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 8,
              paddingBottom: 6,
              borderBottomWidth: 1,
              borderBottomColor: t.colors.border.subtle,
            }}
          >
            <View style={{ width: LABEL_WIDTH }}>
              <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>Milestone</Text>
            </View>
            <View style={{ width: trackWidth, marginLeft: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[t.type.footnote, { color: t.colors.text.tertiary }]}>
                {formatShortDate(range.start)}
              </Text>
              <Text style={[t.type.footnote, { color: t.colors.text.tertiary }]}>
                {formatShortDate(range.end)}
              </Text>
            </View>
          </View>

          {/* Rows */}
          <View style={{ position: 'relative' }}>
            {/* "Today" vertical line, drawn behind the bars */}
            {range.todayInRange && (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: LABEL_WIDTH + 8 + range.todayOffset * trackWidth - 1,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  backgroundColor: '#C0392B',
                  opacity: 0.4,
                  zIndex: 1,
                }}
              />
            )}

            {milestones.map((m) => {
              const bar = barFor(m, range);
              const tone = colorFor(m.status);
              return (
                <Pressable
                  key={m.id}
                  onPress={() =>
                    router.push({ pathname: '/milestone/[id]', params: { id: m.id } })
                  }
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    height: ROW_HEIGHT,
                  }}
                >
                  <View style={{ width: LABEL_WIDTH, paddingRight: 6 }}>
                    <Text
                      style={[t.type.footnote, { color: t.colors.text.primary, fontWeight: '600' }]}
                      numberOfLines={1}
                    >
                      {m.title}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: trackWidth,
                      marginLeft: 8,
                      height: ROW_HEIGHT,
                      justifyContent: 'center',
                    }}
                  >
                    {/* Faint track background */}
                    <View
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        height: 2,
                        backgroundColor: t.colors.border.subtle,
                      }}
                    />
                    {/* The bar itself */}
                    <View
                      style={{
                        position: 'absolute',
                        left: bar.left * trackWidth,
                        width: Math.max(6, bar.width * trackWidth),
                        height: BAR_HEIGHT,
                        borderRadius: 4,
                        backgroundColor: tone.bg,
                        borderWidth: m.status === 'skipped' ? 1 : 0,
                        borderColor: tone.fg,
                        zIndex: 2,
                      }}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Legend */}
          <View style={{ marginTop: 24, gap: 8 }}>
            <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>Legend</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <Swatch color="#1F9C56" label="Completed" />
              <Swatch color="#1B4DD9" label="In progress" />
              <Swatch color="#8A5A00" label="Awaiting approval" />
              <Swatch color="#9AA0AA" label="Pending" />
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Swatch({ color, label }: { color: string; label: string }) {
  const t = lightTheme;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: color }} />
      <Text style={[t.type.footnote, { color: t.colors.text.secondary }]}>{label}</Text>
    </View>
  );
}

// ============================================================
// Pure layout helpers — kept colocated since they're only used here.
// ============================================================

type Range = {
  start: Date;
  end: Date;
  totalMs: number;
  todayInRange: boolean;
  todayOffset: number; // 0..1
};

function computeRange(
  project: Awaited<ReturnType<typeof fetchProject>> | undefined,
  milestones: Awaited<ReturnType<typeof fetchMilestones>>,
): Range | null {
  const candidates: Date[] = [];
  const push = (s: string | null | undefined) => {
    if (!s) return;
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) candidates.push(d);
  };
  push(project?.expected_start_date);
  push(project?.expected_end_date);
  for (const m of milestones) {
    push(m.expected_start_date as string | null | undefined);
    push(m.expected_date);
    push(m.completed_at);
  }
  if (candidates.length === 0) return null;

  let start = candidates[0];
  let end = candidates[0];
  for (const d of candidates) {
    if (d < start) start = d;
    if (d > end) end = d;
  }
  // Guard against same-day range — give it a 1-day cushion so bars
  // don't collapse to width zero.
  if (end.getTime() === start.getTime()) {
    end = new Date(start.getTime() + 86_400_000);
  }
  const totalMs = end.getTime() - start.getTime();
  const now = new Date();
  const todayInRange = now >= start && now <= end;
  const todayOffset = todayInRange ? (now.getTime() - start.getTime()) / totalMs : 0;
  return { start, end, totalMs, todayInRange, todayOffset };
}

function barFor(
  m: Awaited<ReturnType<typeof fetchMilestones>>[number],
  range: Range,
): { left: number; width: number } {
  // Prefer expected_start..expected_date; fall back to completed_at as a
  // point if neither is set.
  const startStr = (m as { expected_start_date?: string | null }).expected_start_date;
  const endStr = m.expected_date ?? m.completed_at;
  const startMs = startStr ? new Date(startStr).getTime() : null;
  const endMs = endStr ? new Date(endStr).getTime() : null;

  if (!startMs && !endMs) return { left: 0, width: 0 };

  // Single-point milestone → small fixed-width pill at the date.
  if (!startMs || !endMs || startMs === endMs) {
    const pointMs = endMs ?? startMs!;
    const offset = (pointMs - range.start.getTime()) / range.totalMs;
    return { left: Math.max(0, Math.min(0.95, offset)), width: 0.06 };
  }

  const left = (startMs - range.start.getTime()) / range.totalMs;
  const width = (endMs - startMs) / range.totalMs;
  return {
    left: Math.max(0, Math.min(1, left)),
    width: Math.max(0.01, Math.min(1 - left, width)),
  };
}

function colorFor(status: string): { bg: string; fg: string } {
  switch (status) {
    case 'completed':
      return { bg: '#1F9C56', fg: '#0F5F33' };
    case 'in_progress':
      return { bg: '#1B4DD9', fg: '#0F2F8A' };
    case 'awaiting_approval':
      return { bg: '#FFC447', fg: '#8A5A00' };
    case 'skipped':
      return { bg: '#E5E7EB', fg: '#9AA0AA' };
    default:
      return { bg: '#9AA0AA', fg: '#5A6068' };
  }
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 44,
  },
});
