import { forwardRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { lightTheme } from '@/theme/light';

type Props = TextInputProps & {
  label?: string;
  helper?: string;
  error?: string;
};

/**
 * InputField — Phase DS treatment.
 *
 *   - 10px radius (default control), white surface sitting directly on
 *     the paper canvas
 *   - 1px hairline border in border-strong; focus elevates to brand
 *     blue
 *   - Error state recolours border + helper text in brick (Phase's
 *     warm red, never neon)
 *   - Label uses Geist Mono uppercase via the caption token — the
 *     stamped tool register for field titles
 *
 * No wrapper around the TextInput — keep the focus glow off because it
 * was wrapping the TextInput and confusing the touch target on iOS,
 * making typing feel unresponsive. Border colour shift carries the
 * focus state cleanly enough.
 */
export const InputField = forwardRef<TextInput, Props>(
  ({ label, helper, error, onFocus, onBlur, style, ...rest }, ref) => {
    const t = lightTheme;
    const [focused, setFocused] = useState(false);

    const borderColor = error
      ? t.colors.destructive.text
      : focused
        ? t.colors.brand.primary
        : t.colors.border.strong;

    return (
      <View style={styles.wrap}>
        {label && (
          <Text style={[t.type.caption, { color: t.colors.text.tertiary, marginBottom: 8 }]}>
            {label}
          </Text>
        )}
        <TextInput
          ref={ref}
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          placeholderTextColor={t.colors.text.tertiary}
          style={[
            t.type.bodyLg,
            {
              backgroundColor: t.colors.bg.surface,
              borderColor,
              borderWidth: focused || error ? 1.5 : 1,
              borderRadius: t.radius.md,
              height: 50,
              paddingHorizontal: t.space[4],
              color: t.colors.text.primary,
            },
            style,
          ]}
        />
        {(error || helper) && (
          <Text
            style={[
              t.type.footnote,
              {
                color: error ? t.colors.destructive.text : t.colors.text.tertiary,
                marginTop: 6,
              },
            ]}
          >
            {error ?? helper}
          </Text>
        )}
      </View>
    );
  }
);
InputField.displayName = 'InputField';

const styles = StyleSheet.create({
  wrap: { width: '100%' },
});
