import { useEffect, useRef } from 'react';
import { Animated, type ViewStyle } from 'react-native';

import { lightTheme } from '@/theme/light';

/**
 * Animated grey block that gently pulses while content is loading.
 * Combine several to build a "skeleton card" — much friendlier than a
 * spinner because the user can already see the shape of what's coming.
 *
 * No native driver here because we're animating backgroundColor (which
 * isn't supported by the native animation driver). Cheap on iOS for the
 * handful of blocks we use per screen.
 */
export function Skeleton({
  width,
  height,
  borderRadius = 8,
  style,
}: {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}) {
  const t = lightTheme;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const bg = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [t.colors.bg.surface2, '#E2E5EB'],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: bg,
        },
        style,
      ]}
    />
  );
}
