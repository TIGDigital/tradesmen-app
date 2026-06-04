import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { lightTheme } from '@/theme/light';

/**
 * iMessage-style three-dot bubble shown when the other person is typing.
 * Each dot bobs on a staggered loop. Lives on the left side of the
 * conversation, just like a real incoming bubble.
 */
export function TypingIndicator() {
  const t = lightTheme;
  const a = useRef(new Animated.Value(0)).current;
  const b = useRef(new Animated.Value(0)).current;
  const c = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    function bob(v: Animated.Value, delay: number) {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: -3, duration: 240, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 240, useNativeDriver: true }),
          Animated.delay(360),
        ]),
      );
    }
    const l1 = bob(a, 0);
    const l2 = bob(b, 120);
    const l3 = bob(c, 240);
    l1.start();
    l2.start();
    l3.start();
    return () => {
      l1.stop();
      l2.stop();
      l3.stop();
    };
  }, [a, b, c]);

  return (
    <View style={[styles.bubble, { backgroundColor: t.colors.bg.surface2 }]}>
      <Animated.View
        style={[styles.dot, { backgroundColor: t.colors.text.secondary, transform: [{ translateY: a }] }]}
      />
      <Animated.View
        style={[styles.dot, { backgroundColor: t.colors.text.secondary, transform: [{ translateY: b }] }]}
      />
      <Animated.View
        style={[styles.dot, { backgroundColor: t.colors.text.secondary, transform: [{ translateY: c }] }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    marginHorizontal: 12,
    marginVertical: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
});
