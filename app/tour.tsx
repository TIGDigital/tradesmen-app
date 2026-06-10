import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useAuthStore } from '@/stores/auth';
import { lightTheme } from '@/theme/light';

/**
 * Phase tour — first-run onboarding walkthrough.
 *
 * Four full-screen slides explaining what Phase does, with page dots at
 * the bottom, a Skip in the top right, and a primary CTA that says "Next"
 * until the final slide (where it becomes "Get started").
 *
 * The tour is generic — same content for tradesman, customer, and
 * apprentice. Role-specific tours felt like a distraction at MVP; we can
 * branch later if data shows different roles get stuck in different places.
 *
 * Persistence: tapping Skip or Get started flips `tourSeen` to true in
 * AsyncStorage via the auth store, and AuthGate stops routing to /tour
 * from that point on. Re-watchable from Settings → "See the tour again".
 */

type Slide = {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  eyebrow: string;
  title: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    icon: 'home',
    iconBg: '#E6F0FE',
    iconColor: '#1B4DD9',
    eyebrow: 'Your project',
    title: 'Everything in one place',
    body: "Updates, photos, messages, schedule. No more chasing your tradesman through WhatsApp threads.",
  },
  {
    icon: 'notifications',
    iconBg: '#E6F0FE',
    iconColor: '#1B4DD9',
    eyebrow: 'Stay aligned',
    title: "We'll never leave you wondering",
    body: "End-of-day notes, photos as they happen, and a heads-up when your tradesman heads home for the day.",
  },
  {
    icon: 'chatbubbles',
    iconBg: '#E6F0FE',
    iconColor: '#1B4DD9',
    eyebrow: 'Talk it through',
    title: 'Ask anything, anytime',
    body: "Two-way chat built in. Questions get answered fast. Decisions get logged so nobody forgets what was agreed.",
  },
  {
    icon: 'checkmark-circle',
    iconBg: '#E6F0FE',
    iconColor: '#1B4DD9',
    eyebrow: 'Track progress',
    title: 'Watch every step land',
    body: 'From first-fix to handover, see what\'s done and what\'s next. Milestones, schedule, and snags — all in one feed.',
  },
];

export default function TourScreen() {
  const t = lightTheme;
  const markTourSeen = useAuthStore((s) => s.markTourSeen);

  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  // FlatList page width = screen width. Recompute on rotation just in case.
  const [width, setWidth] = useState(Dimensions.get('window').width);

  const isLast = index === SLIDES.length - 1;

  async function finish() {
    await markTourSeen();
    // AuthGate sees tourSeen=true → routes to home (/), which resolves to
    // the role-aware shell.
    router.replace('/');
  }

  function next() {
    if (isLast) {
      void finish();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  }

  function skip() {
    void finish();
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}
      edges={['top', 'bottom']}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {/* Top bar — Skip lives top-right. */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={skip}
          hitSlop={12}
          style={{ paddingVertical: 8, paddingHorizontal: 16 }}
          accessibilityRole="button"
          accessibilityLabel="Skip the tour"
        >
          <Text style={[t.type.body, { color: t.colors.text.link, fontWeight: '500' }]}>
            Skip
          </Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.title}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          setIndex(i);
        }}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width, paddingHorizontal: 32 }]}>
            <View style={[styles.iconCircle, { backgroundColor: item.iconBg }]}>
              <Ionicons name={item.icon} size={64} color={item.iconColor} />
            </View>

            <Text
              style={[
                t.type.caption,
                {
                  color: t.colors.brand.primary,
                  marginTop: 28,
                  textAlign: 'center',
                  letterSpacing: 1.4,
                  textTransform: 'uppercase',
                },
              ]}
            >
              {item.eyebrow}
            </Text>
            <Text
              style={[
                t.type.title1,
                {
                  color: t.colors.text.primary,
                  marginTop: 8,
                  textAlign: 'center',
                  paddingHorizontal: 8,
                },
              ]}
            >
              {item.title}
            </Text>
            <Text
              style={[
                t.type.bodyLg,
                {
                  color: t.colors.text.secondary,
                  textAlign: 'center',
                  marginTop: 14,
                  lineHeight: 26,
                  maxWidth: 360,
                },
              ]}
            >
              {item.body}
            </Text>
          </View>
        )}
      />

      {/* Page dots + CTA */}
      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View
              key={s.title}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === index ? t.colors.brand.primary : t.colors.border.subtle,
                  width: i === index ? 22 : 8,
                },
              ]}
            />
          ))}
        </View>

        <PrimaryButton
          title={isLast ? 'Get started' : 'Next'}
          onPress={next}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 128,
    height: 128,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 20,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    height: 12,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
