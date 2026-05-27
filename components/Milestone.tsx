import { Pressable, StyleSheet, Text, View } from 'react-native';

import { lightTheme } from '@/theme/light';
import type { Database } from '@/types/db';

type MilestoneStatus = Database['public']['Enums']['milestone_status'];

type Props = {
  title: string;
  status: MilestoneStatus;
  expectedDate?: string | null;
  /** If provided, the whole row is pressable — used by tradesman to advance status. */
  onPress?: () => void;
  /** Long-press for delete (tradesman, on the manage screen). */
  onLongPress?: () => void;
};

export function Milestone({ title, status, expectedDate, onPress, onLongPress }: Props) {
  const t = lightTheme;

  const indicator = INDICATORS[status];
  const titleColor = status === 'completed' ? t.colors.text.tertiary : t.colors.text.primary;
  const titleDecoration = status === 'completed' ? ('line-through' as const) : ('none' as const);

  const row = (
    <View style={styles.row}>
      <View
        style={[
          styles.indicator,
          {
            backgroundColor: indicator.bg,
            borderColor: indicator.border,
          },
        ]}
      >
        <Text style={{ color: indicator.fg, fontSize: 14, fontWeight: '700' }}>
          {indicator.glyph}
        </Text>
      </View>
      <View style={styles.body}>
        <Text
          style={[
            t.type.bodyLg,
            { color: titleColor, textDecorationLine: titleDecoration },
          ]}
        >
          {title}
        </Text>
        {expectedDate && (
          <Text style={[t.type.footnote, { color: t.colors.text.tertiary, marginTop: 2 }]}>
            {formatDate(expectedDate)}
          </Text>
        )}
      </View>
    </View>
  );

  if (onPress || onLongPress) {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={400}
        style={({ pressed }) => [pressed && { opacity: 0.7 }]}
      >
        {row}
      </Pressable>
    );
  }

  return row;
}

const INDICATORS: Record<
  MilestoneStatus,
  { bg: string; border: string; fg: string; glyph: string }
> = {
  pending: { bg: '#FFFFFF', border: '#D8D5CE', fg: '#8B8A85', glyph: '○' },
  in_progress: { bg: '#EAF0FF', border: '#1B4DD9', fg: '#1B4DD9', glyph: '●' },
  awaiting_approval: { bg: '#FBF3DC', border: '#8B6F2A', fg: '#8B6F2A', glyph: '?' },
  completed: { bg: '#E2F5EA', border: '#197A4D', fg: '#197A4D', glyph: '✓' },
  skipped: { bg: '#F4F2EE', border: '#D8D5CE', fg: '#8B8A85', glyph: '—' },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  indicator: {
    width: 28,
    height: 28,
    borderRadius: 9999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
});
