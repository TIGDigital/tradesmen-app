import { Pressable, StyleSheet, Text, View } from 'react-native';

import { lightTheme } from '@/theme/light';
import type { ProjectStatus } from '@/theme/tokens';

type Props = {
  status: ProjectStatus;
  size?: 'sm' | 'md';
  withDot?: boolean;
  label?: string;
  /** If provided, wraps the badge in a Pressable. Used by tradesman on the project hero. */
  onPress?: () => void;
};

export function StatusBadge({ status, size = 'md', withDot = true, label, onPress }: Props) {
  const t = lightTheme;
  const palette = t.status[status];
  const text = label ?? t.statusLabels[status];

  const inner = (
    <>
      {withDot && <View style={[styles.dot, { backgroundColor: palette.text }]} />}
      <Text style={[t.type.caption, { color: palette.text }]}>{text}</Text>
    </>
  );

  // Phase DS: pill-shaped status reads as a "stamped tool label".
  // The caption type token already supplies uppercase Geist Mono + the
  // 0.12em tracked spacing — so the look comes for free here.
  const baseStyle = [
    styles.base,
    size === 'sm' ? styles.sm : styles.md,
    { backgroundColor: palette.bg, borderRadius: t.radius.full },
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        hitSlop={6}
        style={({ pressed }) => [
          ...baseStyle,
          pressed && { transform: [{ scale: 0.96 }], opacity: 0.85 },
        ]}
      >
        {inner}
      </Pressable>
    );
  }

  return <View style={baseStyle}>{inner}</View>;
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
