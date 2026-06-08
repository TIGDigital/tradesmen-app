import { StyleSheet, Text, View } from 'react-native';

import { PhaseProgressRing } from '@/components/PhaseProgressRing';
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

/**
 * Project hero — the showpiece card on the customer + tradesman home.
 *
 * Phase DS treatment: white surface card on warm Stone, 14px radius, 1px
 * warm hairline border, soft warm shadow. The right-hand progress ring
 * IS the brand mark — its four arcs light clockwise as the project
 * completes, so at 100% the card resolves to the Phase logo itself.
 */
export function ProjectHero({ status, headline, subhead, progressPct, onStatusPress }: Props) {
  const t = lightTheme;

  return (
    <View
      style={[
        styles.card,
        t.elevation[1],
        {
          backgroundColor: t.colors.bg.surface,
          borderRadius: t.radius.lg,
          borderWidth: 1,
          borderColor: t.colors.border.subtle,
          padding: t.space[5],
        },
      ]}
    >
      <View style={styles.left}>
        <StatusBadge status={status} onPress={onStatusPress} />
        <Text style={[t.type.title2, { color: t.colors.text.primary, marginTop: t.space[3] }]}>
          {headline}
        </Text>
        <Text style={[t.type.body, { color: t.colors.text.secondary, marginTop: 4, lineHeight: 22 }]}>
          {subhead}
        </Text>
      </View>
      <PhaseProgressRing pct={progressPct} size={72} />
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
});
