import { StyleSheet, Text, View } from 'react-native';

import { lightTheme } from '@/theme/light';

export type EventPillKind = 'arrival' | 'left' | 'milestone';

type Props = {
  kind: EventPillKind;
  title: string;
  timestamp: string;
};

const kindColors = {
  arrival: '#197A4D',
  left: '#8B8A85',
  milestone: '#1B4DD9',
} as const;

export function EventPill({ kind, title, timestamp }: Props) {
  const t = lightTheme;
  const accent = kindColors[kind];

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: t.colors.bg.surface,
          borderColor: t.colors.border.subtle,
          borderRadius: t.radius.lg,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: accent + '1A' }]}>
        <View style={[styles.iconDot, { backgroundColor: accent }]} />
      </View>
      <View style={styles.body}>
        <Text style={[t.type.body, { color: t.colors.text.primary }]}>{title}</Text>
        <Text style={[t.type.footnote, { color: t.colors.text.tertiary, marginTop: 2 }]}>
          {timestamp}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    gap: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDot: { width: 10, height: 10, borderRadius: 9999 },
  body: { flex: 1 },
});
