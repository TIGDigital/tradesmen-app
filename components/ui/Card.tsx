import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';

import { lightTheme } from '@/theme/light';

type Props = ViewProps & {
  onPress?: () => void;
  elevation?: 1 | 2 | 3;
};

/**
 * Card per spec C.5: bg/surface, radius/lg, optional shadow, padding/4–5.
 * If `onPress` is provided, the whole card becomes pressable with subtle scale.
 */
export function Card({ children, style, onPress, elevation = 1, ...rest }: Props) {
  const t = lightTheme;
  const base = [
    styles.card,
    t.elevation[elevation],
    {
      backgroundColor: t.colors.bg.surface,
      borderRadius: t.radius.lg,
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
