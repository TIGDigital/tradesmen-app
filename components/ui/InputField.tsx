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
 *   - 10px radius (default control), surface-card background sitting
 *     directly on the paper canvas
 *   - 1px hairline border in border-default; focus elevates to brand
 *     blue with a 3px brand-tinted glow (the DS `--ring`)
 *   - Error state recolours border + helper text in brick (Phase's
 *     warm red, never neon)
 *   - Label uses Geist Mono uppercase via the caption token — the
 *     stamped tool register for field titles
 */
export const InputField = forwardRef<TextInput, Props>(
  ({ label, helper, error, onFocus, onBlur, ...rest }, ref) => {
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
        <View
          style={[
            // Focus ring — a soft 3px halo in brand blue at low opacity,
            // sits behind the input. Only visible when focused.
            focused && !error
              ? {
                  shadowColor: '#1B4DD9',
                  shadowOpacity: 0.18,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 0 },
                }
              : undefined,
          ]}
        >
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
                borderWidth: 1,
                borderRadius: t.radius.md,
                height: 50,
                paddingHorizontal: t.space[4],
                color: t.colors.text.primary,
              },
              rest.style,
            ]}
          />
        </View>
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
