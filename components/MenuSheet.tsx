import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { lightTheme } from '@/theme/light';

/**
 * Visual treatment for a row.
 *
 *   - `default`  — Phase ink text on stone canvas (most rows)
 *   - `brand`    — Phase blue text (the "Sign out" affordance — meaningful
 *                  but not destructive enough for red)
 */
export type MenuItemTint = 'default' | 'brand';

export interface MenuItem {
  label: string;
  /** Optional Ionicons name — renders left of the label if set. */
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  tint?: MenuItemTint;
}

interface MenuSheetProps {
  visible: boolean;
  onClose: () => void;
  items: MenuItem[];
  /** Optional title at the top — defaults to no title (clean look). */
  title?: string;
}

/**
 * Phase-styled bottom action sheet.
 *
 * The default iOS `Alert.alert` action sheet only offers `default`,
 * `cancel`, and `destructive` button styles — no way to render a row in
 * Phase blue specifically. So we build our own: a translucent backdrop, a
 * Stone-canvas card sliding up from the bottom, hairline separators
 * between rows, and a tinted "Sign out" affordance per the brand.
 *
 * Tapping a row closes the sheet *then* fires the action — so the next
 * screen pushes onto a clean stack instead of behind a half-dismissed
 * modal.
 */
export function MenuSheet({ visible, onClose, items, title }: MenuSheetProps) {
  const t = lightTheme;
  const translateY = useRef(new Animated.Value(400)).current;
  const fade = useRef(new Animated.Value(0)).current;

  // Animate in on open / out on close.
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fade, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // No-op — Modal unmounts itself when visible becomes false.
      translateY.setValue(400);
      fade.setValue(0);
    }
  }, [visible, translateY, fade]);

  function handleItemPress(item: MenuItem) {
    // Close first, then fire — keeps navigation stack clean.
    onClose();
    // Tiny delay so the close animation can begin before the next screen
    // mounts. Without this the next push lands behind a still-visible sheet.
    setTimeout(item.onPress, 80);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop — fades in. Tap to dismiss. */}
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Sheet card — slides up. */}
      <View style={styles.anchor} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: t.colors.bg.surface,
              transform: [{ translateY }],
            },
          ]}
        >
          <SafeAreaView edges={['bottom']}>
            {title ? (
              <View style={styles.titleBox}>
                <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>
                  {title}
                </Text>
              </View>
            ) : (
              // Compact grab handle — a Stone hairline pill at the top of the
              // card. Signals "this drags / dismisses" without shouting.
              <View style={styles.handleBox}>
                <View style={[styles.handle, { backgroundColor: t.colors.border.subtle }]} />
              </View>
            )}

            {items.map((item, idx) => {
              const isLast = idx === items.length - 1;
              const tintColor =
                item.tint === 'brand'
                  ? t.colors.brand.primary
                  : t.colors.text.primary;
              return (
                <Pressable
                  key={`${item.label}-${idx}`}
                  onPress={() => handleItemPress(item)}
                  style={({ pressed }) => [
                    styles.row,
                    !isLast && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: t.colors.border.subtle,
                    },
                    pressed && { backgroundColor: t.colors.bg.canvas },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                >
                  {item.icon ? (
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={tintColor}
                      style={{ marginRight: 14 }}
                    />
                  ) : null}
                  <Text
                    style={[
                      t.type.bodyLg,
                      {
                        color: tintColor,
                        fontWeight: item.tint === 'brand' ? '600' : '500',
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  anchor: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 6,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 },
  },
  handleBox: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 6,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  titleBox: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 56,
  },
});
