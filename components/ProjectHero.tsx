import { StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '@/components/ui/StatusBadge';
import { lightTheme } from '@/theme/light';
import type { ProjectStatus } from '@/theme/tokens';

type Props = {
  status: ProjectStatus;
  headline: string;
  subhead: string;
  progressPct: number;
  /** If provided, the StatusBadge becomes pressable (used by tradesman). */
  onStatusPress?: () => void;
};

export function ProjectHero({ status, headline, subhead, progressPct, onStatusPress }: Props) {
  const t = lightTheme;

  return (
    <View
      style={[
        styles.card,
        t.elevation[2],
        {
          backgroundColor: t.colors.bg.surface,
          borderRadius: t.radius['2xl'],
          padding: t.space[5],
        },
      ]}
    >
      <View style={styles.left}>
        <StatusBadge status={status} onPress={onStatusPress} />
        <Text style={[t.type.title2, { color: t.colors.text.primary, marginTop: t.space[2] }]}>
          {headline}
        </Text>
        <Text style={[t.type.body, { color: t.colors.text.secondary, marginTop: 2 }]}>
          {subhead}
        </Text>
      </View>
      <ProgressRing pct={progressPct} />
    </View>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const t = lightTheme;
  return (
    <View
      style={[
        styles.ring,
        {
          borderColor: t.colors.border.subtle,
          borderTopColor: t.colors.brand.primary,
          borderRightColor: pct > 25 ? t.colors.brand.primary : t.colors.border.subtle,
          borderBottomColor: pct > 50 ? t.colors.brand.primary : t.colors.border.subtle,
          borderLeftColor: pct > 75 ? t.colors.brand.primary : t.colors.border.subtle,
        },
      ]}
    >
      <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
        {pct}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  left: { flex: 1 },
  ring: {
    width: 64,
    height: 64,
    borderRadius: 9999,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
