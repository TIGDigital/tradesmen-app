import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PhaseLogo } from '@/components/PhaseLogo';
import { lightTheme } from '@/theme/light';

/**
 * Empty / error states — Phase DS register.
 *
 *   - Empty tone leans on a faded Phase ring rather than a generic
 *     sparkles icon — the brand mark IS the empty-state visual.
 *   - Error tone uses an alert-circle in brick (Phase's muted warm red).
 *   - Eyebrow caption above the title gives the stamped-label register
 *     ("NOTHING HERE YET" / "SOMETHING'S OFF").
 *   - Retry sits as a soft Phase-tint pill — quiet, primary blue text.
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

  const eyebrow = tone === 'error' ? "Something's off" : 'Nothing here yet';

  return (
    <View style={styles.wrap}>
      {tone === 'empty' ? (
        <View style={{ opacity: 0.35 }}>
          <PhaseLogo size={56} />
        </View>
      ) : (
        <Ionicons name="alert-circle-outline" size={48} color="#A13A23" />
      )}
      <Text style={[t.type.caption, { color: t.colors.text.tertiary, marginTop: 16 }]}>
        {eyebrow}
      </Text>
      <Text
        style={[
          t.type.title3,
          { color: t.colors.text.primary, textAlign: 'center', marginTop: 4 },
        ]}
      >
        {title}
      </Text>
      {message && (
        <Text
          style={[
            t.type.body,
            {
              color: t.colors.text.secondary,
              textAlign: 'center',
              marginTop: 6,
              maxWidth: 320,
              lineHeight: 22,
            },
          ]}
        >
          {message}
        </Text>
      )}
      {onRetry && (
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retry,
            { backgroundColor: t.colors.brand.tint, opacity: pressed ? 0.7 : 1 },
          ]}
          hitSlop={6}
        >
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
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
});
