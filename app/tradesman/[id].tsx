import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { getPublicTradesmanProfile } from '@/services/tradesman';
import { lightTheme } from '@/theme/light';

const TRADE_LABELS: Record<string, string> = {
  builder: 'Builder',
  kitchen_fitter: 'Kitchen fitter',
  bathroom_fitter: 'Bathroom fitter',
  electrician: 'Electrician',
  plumber: 'Plumber',
  roofer: 'Roofer',
  plasterer: 'Plasterer',
  painter_decorator: 'Painter/Decorator',
  landscaper: 'Landscaper',
  tiler: 'Tiler',
  carpenter: 'Carpenter',
  flooring: 'Flooring',
  hvac: 'HVAC',
  general: 'General',
  other: 'Other',
};

export default function TradesmanProfileScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-tradesman', id],
    queryFn: () => getPublicTradesmanProfile(id!),
    enabled: !!id,
  });

  const profile = data?.profile;
  const tradesman = data?.tradesman;
  const verified = !!tradesman?.verified_at;

  const initials = (profile?.full_name ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const certificates = tradesman
    ? [
        { key: 'gas_safe', label: 'Gas Safe', value: tradesman.gas_safe_number },
        { key: 'niceic', label: 'NICEIC', value: tradesman.niceic_number },
        { key: 'cscs', label: 'CSCS', value: tradesman.cscs_card_number },
        {
          key: 'insurance',
          label: 'Public liability insurance',
          value: tradesman.insurance_provider,
        },
      ].filter((c) => c.value)
    : [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['bottom']}>
      <View style={[styles.navBar, { paddingTop: insets.top, height: 44 + insets.top }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          hitSlop={12}
          style={{ width: 60 }}
        >
          <Text style={[t.type.bodyLg, { color: t.colors.text.link }]}>‹ Back</Text>
        </Pressable>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary, flex: 1, textAlign: 'center' }]} numberOfLines={1}>
          Profile
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      )}

      {error && (
        <View style={styles.center}>
          <Text style={[t.type.body, { color: t.colors.destructive.text, textAlign: 'center' }]}>
            {(error as Error).message}
          </Text>
        </View>
      )}

      {profile && (
        <ScrollView contentContainerStyle={{ padding: t.space[5], gap: t.space[4] }}>
          {/* Hero card */}
          <View style={{ alignItems: 'center', gap: t.space[3] }}>
            <View style={[styles.avatar, { backgroundColor: t.colors.bg.surface2 }]}>
              {profile.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} contentFit="cover" />
              ) : (
                <Text style={[t.type.title1, { color: t.colors.text.secondary }]}>{initials}</Text>
              )}
            </View>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[t.type.title2, { color: t.colors.text.primary }]}>
                  {tradesman?.business_name ?? profile.full_name}
                </Text>
                {verified && (
                  <View style={[styles.verifiedBadge, { backgroundColor: t.colors.brand.primary }]}>
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>✓</Text>
                  </View>
                )}
              </View>
              {tradesman?.primary_trade && (
                <Text style={[t.type.body, { color: t.colors.text.secondary }]}>
                  {TRADE_LABELS[tradesman.primary_trade] ?? tradesman.primary_trade}
                  {tradesman.years_trading
                    ? ` · ${tradesman.years_trading} years trading`
                    : ''}
                </Text>
              )}
              {(tradesman?.total_reviews ?? 0) > 0 && (
                <Text style={[t.type.body, { color: t.colors.text.secondary }]}>
                  ★ {tradesman?.avg_rating?.toFixed(1) ?? '—'} ({tradesman?.total_reviews} reviews)
                </Text>
              )}
            </View>
          </View>

          {/* Bio */}
          {tradesman?.bio && (
            <Card>
              <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>About</Text>
              <Text
                style={[
                  t.type.body,
                  { color: t.colors.text.primary, marginTop: t.space[2], lineHeight: 22 },
                ]}
              >
                {tradesman.bio}
              </Text>
            </Card>
          )}

          {/* Service area */}
          {tradesman?.service_postcodes && tradesman.service_postcodes.length > 0 && (
            <Card>
              <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>Service area</Text>
              <Text
                style={[
                  t.type.body,
                  { color: t.colors.text.primary, marginTop: t.space[2] },
                ]}
              >
                {tradesman.service_postcodes.join(' · ')}
              </Text>
            </Card>
          )}

          {/* Verification cards */}
          {certificates.length > 0 && (
            <View>
              <Text
                style={[
                  t.type.caption,
                  { color: t.colors.text.tertiary, marginBottom: t.space[3] },
                ]}
              >
                Verified credentials
              </Text>
              <View style={{ gap: t.space[2] }}>
                {certificates.map((c) => (
                  <View
                    key={c.key}
                    style={[
                      styles.certRow,
                      {
                        backgroundColor: '#E2F5EA',
                        borderRadius: t.radius.md,
                      },
                    ]}
                  >
                    <View style={[styles.checkCircle, { backgroundColor: '#197A4D' }]}>
                      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>✓</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[t.type.bodyLgEmphasis, { color: '#197A4D' }]}>
                        {c.label}
                      </Text>
                      <Text style={[t.type.footnote, { color: '#197A4D', opacity: 0.85 }]}>
                        {c.value}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
              {!verified && (
                <Text
                  style={[
                    t.type.footnote,
                    {
                      color: t.colors.text.tertiary,
                      marginTop: t.space[3],
                      textAlign: 'center',
                    },
                  ]}
                >
                  Self-reported. Phase verifies these manually before issuing the blue tick.
                </Text>
              )}
            </View>
          )}

          {certificates.length === 0 && !tradesman?.bio && (
            <Card>
              <Text style={[t.type.body, { color: t.colors.text.tertiary, textAlign: 'center' }]}>
                This tradesman hasn't filled in their profile yet.
              </Text>
            </Card>
          )}

          {tradesman?.website && (
            <Card>
              <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>Website</Text>
              <Text
                style={[
                  t.type.bodyLg,
                  { color: t.colors.text.link, marginTop: t.space[2] },
                ]}
              >
                {tradesman.website}
              </Text>
            </Card>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 44,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  certRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
