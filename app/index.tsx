import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProjectHero } from '@/components/ProjectHero';
import { EventPill } from '@/components/ui/EventPill';
import { lightTheme } from '@/theme/light';

export default function CustomerProjectScreen() {
  const t = lightTheme;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['top']}>
      <View style={styles.navBar}>
        <View style={styles.navIconBox}>
          <Text style={{ fontSize: 22, color: t.colors.text.primary }}>≡</Text>
        </View>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
          Kitchen extension
        </Text>
        <View style={styles.navIconBox}>
          <Text style={{ fontSize: 22, color: t.colors.text.primary }}>💬</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: t.space[5], gap: t.space[4] }}
        showsVerticalScrollIndicator={false}
      >
        <ProjectHero
          status="in_progress"
          headline="On track for Friday"
          subhead="Day 3 of 12"
          progressPct={25}
        />

        <EventPill kind="arrival" title="Dave is on site" timestamp="Arrived 8:14 AM" />

        <View
          style={[
            styles.metaCard,
            {
              backgroundColor: t.colors.bg.surface,
              borderColor: t.colors.border.subtle,
              borderRadius: t.radius.lg,
              padding: t.space[4],
            },
          ]}
        >
          <View style={styles.metaRow}>
            <Text style={[t.type.body, { color: t.colors.text.secondary }]}>Today</Text>
            <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
              First-fix electrics
            </Text>
          </View>
          <View style={[styles.metaRow, { marginTop: t.space[3] }]}>
            <Text style={[t.type.body, { color: t.colors.text.secondary }]}>Next</Text>
            <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
              Worktops · Wed
            </Text>
          </View>
        </View>

        <Text style={[t.type.caption, { color: t.colors.text.tertiary, marginTop: t.space[2] }]}>
          Latest update
        </Text>

        <View
          style={[
            styles.updateCard,
            t.elevation[1],
            {
              backgroundColor: t.colors.bg.surface,
              borderRadius: t.radius.lg,
              padding: t.space[4],
            },
          ]}
        >
          <View style={styles.updateHead}>
            <View style={[styles.avatar, { backgroundColor: '#A04A1C' }]}>
              <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>D</Text>
            </View>
            <View>
              <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
                Dave Smith
              </Text>
              <Text style={[t.type.footnote, { color: t.colors.text.tertiary }]}>
                2 hours ago
              </Text>
            </View>
          </View>
          <Text
            style={[
              t.type.body,
              { color: t.colors.text.primary, marginTop: t.space[3] },
            ]}
          >
            First-fix electrics done, plasterer in tomorrow morning ✓
          </Text>
          <View style={[styles.photos, { marginTop: t.space[3] }]}>
            <View style={[styles.photoBox, { backgroundColor: '#D8D5CE' }]} />
            <View style={[styles.photoBox, { backgroundColor: '#ECEAE4' }]} />
            <View style={[styles.photoBox, { backgroundColor: '#F4F2EE' }]} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 44,
  },
  navIconBox: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  metaCard: { borderWidth: 1 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  updateCard: {},
  updateHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photos: { flexDirection: 'row', gap: 8 },
  photoBox: { flex: 1, height: 60, borderRadius: 12 },
});
