import { StyleSheet, Text, View } from 'react-native';

import { lightTheme } from '@/theme/light';
import type { ProjectStatus } from '@/theme/tokens';

type Props = {
  status: ProjectStatus;
  size?: 'sm' | 'md';
  withDot?: boolean;
  label?: string;
};

export function StatusBadge({ status, size = 'md', withDot = true, label }: Props) {
  const t = lightTheme;
  const palette = t.status[status];
  const text = label ?? t.statusLabels[status];

  return (
    <View
      style={[
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor: palette.bg, borderRadius: t.radius.sm },
      ]}
    >
      {withDot && <View style={[styles.dot, { backgroundColor: palette.text }]} />}
      <Text
        style={[
          t.type.caption,
          { color: palette.text },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
  },
  sm: { paddingVertical: 3, paddingHorizontal: 8 },
  md: { paddingVertical: 6, paddingHorizontal: 12 },
  dot: { width: 6, height: 6, borderRadius: 9999 },
});
