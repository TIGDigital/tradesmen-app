import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { lightTheme } from '@/theme/light';

/**
 * Friendly fallback for query / mutation errors. Used everywhere we'd
 * otherwise dump raw error.message into a Text node.
 *
 * Distinguishes between "nothing to show" and "something went wrong"
 * via the `tone` prop; default is the error tone.
 */
export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  tone = 'error',
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  tone?: 'error' | 'empty';
}) {
  const t = lightTheme;
  const iconName = tone === 'error' ? 'alert-circle-outline' : 'sparkles-outline';
  const iconColor = tone === 'error' ? '#C0392B' : t.colors.text.tertiary;

  return (
    <View style={styles.wrap}>
      <Ionicons name={iconName} size={56} color={iconColor} />
      <Text style={[t.type.title2, { color: t.colors.text.primary, textAlign: 'center', marginTop: 12 }]}>
        {title}
      </Text>
      {message && (
        <Text
          style={[
            t.type.body,
            { color: t.colors.text.secondary, textAlign: 'center', marginTop: 8, maxWidth: 320 },
          ]}
        >
          {message}
        </Text>
      )}
      {onRetry && (
        <Pressable onPress={onRetry} style={[styles.retry, { borderColor: t.colors.border.subtle }]} hitSlop={6}>
          <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.link }]}>
            Try again
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  retry: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderRadius: 999,
  },
});
