import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';

import { lightTheme } from '@/theme/light';

type Props = ViewProps & {
  onPress?: () => void;
  elevation?: 1 | 2 | 3;
};

/**
 * Card — Phase DS:
 *   - surface-card (white) on the warm Stone page
 *   - 1px subtle warm border (Phase: the structural hairline that does
 *     most of the work)
 *   - 14px radius
 *   - soft warm-tinted shadow at elevation 1
 *   - padding 16
 * If `onPress` is provided, the whole card becomes pressable with a
 * subtle lift on press.
 */
export function Card({ children, style, onPress, elevation = 1, ...rest }: Props) {
  const t = lightTheme;
  const base = [
    styles.card,
    t.elevation[elevation],
    {
      backgroundColor: t.colors.bg.surface,
      borderRadius: t.radius.lg,
      borderWidth: 1,
      borderColor: t.colors.border.subtle,
      padding: t.space[4],
    },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [...base, pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 }]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={base} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {},
});
