import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

import { PhaseLogo } from '@/components/PhaseLogo';

/**
 * Branded loading indicator — the Phase ring, spinning. The pale fourth
 * arc reads as the "gap" a native spinner has, so the mark doubles as a
 * loader without redrawing anything. Drop-in replacement for
 * ActivityIndicator.
 *
 * Props:
 *   size  — outer width/height in px (default 28, ~ActivityIndicator large)
 *   white — all-white variant for dark or brand-blue backgrounds.
 */
export function PhaseSpinner({ size = 28, white = false }: { size?: number; white?: boolean }) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={{ width: size, height: size, transform: [{ rotate }] }}>
      <PhaseLogo size={size} white={white} />
    </Animated.View>
  );
}
