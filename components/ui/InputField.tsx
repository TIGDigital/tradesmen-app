import { forwardRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { lightTheme } from '@/theme/light';

type Props = TextInputProps & {
  label?: string;
  helper?: string;
  error?: string;
};

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
          <Text style={[t.type.footnote, { color: t.colors.text.secondary, marginBottom: 6 }]}>
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
              backgroundColor: t.colors.bg.surface2,
              borderColor,
              borderWidth: 1,
              borderRadius: t.radius.md,
              height: 52,
              paddingHorizontal: t.space[4],
              color: t.colors.text.primary,
            },
            rest.style,
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
