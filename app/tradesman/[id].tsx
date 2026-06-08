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
import {
  CERTIFICATE_LABELS,
  daysUntilExpiry,
  getPublicTradesmanProfile,
  type TradesmanCertificate,
} from '@/services/tradesman';
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

  // Multi-certificate list — replaces the old flat gas_safe/niceic/cscs
  // columns. Each card has its own expiry; we hide expired ones from
  // public view (customer doesn't need to see a stale Gas Safe number).
  const liveCertificates = (data?.certificates ?? []).filter((c) => {
    const days = daysUntilExpiry(c.expires_at);
    return days == null || days >= 0;
  });

  // Insurance is still flat — it's not multi-valued.
  const insurance = tradesman?.insurance_provider
    ? { provider: tradesman.insurance_provider, expiry: tradesman.insurance_expiry }
    : null;

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

          {/* Verification cards — list of certs + insurance */}
          {(liveCertificates.length > 0 || insurance) && (
            <View>
              <Text
                style={[
                  t.type.caption,
                  { color: t.colors.text.tertiary, marginBottom: t.space[3] },
                ]}
              >
                Cards on file
              </Text>
              <View style={{ gap: t.space[2] }}>
                {liveCertificates.map((c) => (
                  <PublicCertRow key={c.id} cert={c} />
                ))}
                {insurance && (
                  <View
                    style={[
                      styles.certRow,
                      {
                        backgroundColor: t.colors.bg.surface,
                        borderColor: t.colors.border.subtle,
                        borderRadius: t.radius.md,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <View style={[styles.checkCircle, { backgroundColor: t.colors.brand.primary }]}>
                      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>✓</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
                        Public liability insurance
                      </Text>
                      <Text style={[t.type.footnote, { color: t.colors.text.tertiary }]}>
                        {insurance.provider}
                      </Text>
                    </View>
                  </View>
                )}
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

          {liveCertificates.length === 0 && !insurance && !tradesman?.bio && (
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

/**
 * Single certificate row on the public profile. Phase voice: nudges
 * gently with a soft amber chip when expiry is within 30 days,
 * neutral grey for the routine "still valid for ages" case. No red.
 */
function PublicCertRow({ cert }: { cert: TradesmanCertificate }) {
  const t = lightTheme;
  const label = cert.kind === 'other' ? cert.custom_name ?? 'Other' : CERTIFICATE_LABELS[cert.kind];
  const days = daysUntilExpiry(cert.expires_at);
  const expiringSoon = days != null && days >= 0 && days <= 30;

  return (
    <View
      style={[
        styles.certRow,
        {
          backgroundColor: t.colors.bg.surface,
          borderColor: t.colors.border.subtle,
          borderRadius: t.radius.md,
          borderWidth: 1,
        },
      ]}
    >
      <View style={[styles.checkCircle, { backgroundColor: t.colors.brand.primary }]}>
        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>✓</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
          {label}
        </Text>
        {cert.number && (
          <Text style={[t.type.footnote, { color: t.colors.text.tertiary }]}>
            {cert.number}
          </Text>
        )}
      </View>
      {expiringSoon && (
        <View style={{ backgroundColor: '#FBEED2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
          <Text style={[t.type.caption, { color: '#8A6A1C' }]}>{`Expires in ${days}d`}</Text>
        </View>
      )}
    </View>
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
