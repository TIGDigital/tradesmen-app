import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { lightTheme } from '@/theme/light';

export type ChecklistItem = {
  /** Short imperative — "Create your first project". */
  title: string;
  /** Optional one-liner under the title shown only while pending. */
  subtitle?: string;
  /** True if the underlying action has already been taken. Done items
   *  show as struck-through with a filled check; untappable. */
  done: boolean;
  /** Where to send the user when they tap. Omit for items that have
   *  no actionable destination (rare). */
  onPress?: () => void;
};

interface Props {
  /** Caption above the progress line. Defaults to "GET STARTED". */
  title?: string;
  items: ChecklistItem[];
  /** Optional dismiss handler — renders the × in the top right. */
  onDismiss?: () => void;
}

/**
 * Progressive onboarding card.
 *
 * Renders a Phase-branded "Get started" panel with N checklist rows.
 * Each row reflects an action the user has or hasn't taken — completion
 * is derived from data (services/onboarding.ts), not stored separately,
 * so the state can't drift.
 *
 * Returns null when all items are done so the card silently disappears
 * once onboarding is complete. Parent screens can keep `<OnboardingChecklist />`
 * mounted unconditionally and trust it to hide itself.
 */
export function OnboardingChecklist({
  title = 'Get started',
  items,
  onDismiss,
}: Props) {
  const t = lightTheme;
  const doneCount = items.filter((i) => i.done).length;
  const total = items.length;

  // Hide when fully complete — silent victory.
  if (doneCount === total) return null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: t.colors.bg.surface,
          borderColor: t.colors.border.subtle,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              t.type.caption,
              {
                color: t.colors.brand.primary,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
              },
            ]}
          >
            {title}
          </Text>
          <Text
            style={[
              t.type.body,
              { color: t.colors.text.secondary, marginTop: 4 },
            ]}
          >
            {doneCount} of {total} done
          </Text>
        </View>
        {onDismiss && (
          <Pressable
            onPress={onDismiss}
            hitSlop={12}
            accessibilityLabel="Hide get-started checklist"
          >
            <Ionicons name="close" size={20} color={t.colors.text.tertiary} />
          </Pressable>
        )}
      </View>

      {/* Items */}
      <View style={{ marginTop: 12 }}>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const tappable = !item.done && !!item.onPress;
          return (
            <Pressable
              key={item.title}
              onPress={tappable ? item.onPress : undefined}
              disabled={!tappable}
              style={({ pressed }) => [
                styles.row,
                !isLast && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: t.colors.border.subtle,
                },
                pressed && tappable && { backgroundColor: t.colors.bg.canvas },
              ]}
              accessibilityRole={tappable ? 'button' : 'text'}
              accessibilityState={{ disabled: !tappable, checked: item.done }}
              accessibilityLabel={`${item.title}${item.done ? ', done' : ''}`}
            >
              {/* Indicator */}
              {item.done ? (
                <View
                  style={[
                    styles.indicator,
                    { backgroundColor: t.colors.brand.primary },
                  ]}
                >
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                </View>
              ) : (
                <View
                  style={[
                    styles.indicator,
                    styles.indicatorEmpty,
                    { borderColor: t.colors.border.strong },
                  ]}
                />
              )}

              {/* Text */}
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    t.type.bodyLg,
                    {
                      color: item.done
                        ? t.colors.text.tertiary
                        : t.colors.text.primary,
                      textDecorationLine: item.done ? 'line-through' : 'none',
                      fontWeight: '500',
                    },
                  ]}
                >
                  {item.title}
                </Text>
                {item.subtitle && !item.done && (
                  <Text
                    style={[
                      t.type.footnote,
                      { color: t.colors.text.secondary, marginTop: 2 },
                    ]}
                  >
                    {item.subtitle}
                  </Text>
                )}
              </View>

              {/* Chevron — only when there's somewhere to go. */}
              {tappable && (
                <Text
                  style={[t.type.bodyLg, { color: t.colors.text.tertiary }]}
                >
                  ›
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  indicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorEmpty: {
    borderWidth: 2,
  },
});
