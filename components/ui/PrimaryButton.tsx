import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';

import { lightTheme } from '@/theme/light';

type Props = {
  title: string;
  onPress?: (e: GestureResponderEvent) => void;
  loading?: boolean;
  disabled?: boolean;
  size?: 'regular' | 'large';
};

export function PrimaryButton({ title, onPress, loading, disabled, size = 'large' }: Props) {
  const t = lightTheme;
  const [pressed, setPressed] = useState(false);

  const isDisabled = disabled || loading;
  const bg = pressed && !isDisabled ? t.colors.brand.primaryPressed : t.colors.brand.primary;

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={isDisabled}
      style={[
        styles.btn,
        size === 'large' ? styles.lg : styles.reg,
        {
          backgroundColor: bg,
          borderRadius: t.radius.md,
          paddingHorizontal: t.space[5],
          opacity: isDisabled && !loading ? 0.4 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.96 : 1 }],
        },
      ]}
    >
      {loading && (
        <View style={styles.spinner}>
          <ActivityIndicator color={t.colors.text.inverse} />
        </View>
      )}
      <Text
        style={[
          t.type.bodyLgEmphasis,
          { color: t.colors.text.inverse, opacity: loading ? 0.4 : 1 },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  lg: { height: 52 },
  reg: { height: 44 },
  spinner: { position: 'absolute', left: 16 },
});
