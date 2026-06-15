import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import {
  CERTIFICATE_LABELS,
  daysUntilExpiry,
  fetchMyCertificates,
  getMyTradesmanProfile,
  updateTradesmanProfile,
  type TradesmanCertificate,
} from '@/services/tradesman';
import { lightTheme } from '@/theme/light';

/**
 * Verification screen — Phase tradesman side.
 *
 * Certificates live on their own table (`tradesman_certificates`) so a
 * single tradesman can carry many cards across trades, each with its
 * own expiry. The list-with-add pattern matches every real-world
 * verification tool I've used (driver licence apps, Gas Safe Register).
 *
 * Insurance + tax info stay flat on `tradesman_profiles` — they're not
 * multi-valued in real life.
 */
export default function VerificationSettingsScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['tradesman-profile'],
    queryFn: getMyTradesmanProfile,
  });

  const certsQuery = useQuery({
    queryKey: ['my-certificates'],
    queryFn: fetchMyCertificates,
  });
  const certificates = certsQuery.data ?? [];

  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insuranceExpiry, setInsuranceExpiry] = useState<Date | null>(null);
  const [vat, setVat] = useState('');
  const [utr, setUtr] = useState('');

  useEffect(() => {
    if (!profile) return;
    setInsuranceProvider(profile.insurance_provider ?? '');
    setInsuranceExpiry(profile.insurance_expiry ? new Date(profile.insurance_expiry) : null);
    setVat(profile.vat_number ?? '');
    setUtr(profile.utr_number ?? '');
  }, [profile]);

  const mutation = useMutation({
    mutationFn: () =>
      updateTradesmanProfile({
        insurance_provider: insuranceProvider.trim() || null,
        insurance_expiry: insuranceExpiry ? insuranceExpiry.toISOString().slice(0, 10) : null,
        vat_number: vat.trim() || null,
        utr_number: utr.trim() || null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tradesman-profile'] });
      router.back();
    },
    onError: (e) => Alert.alert("Couldn't save", (e as Error).message),
  });

  const verified = !!profile?.verified_at;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['bottom']}>
      <View style={[styles.navBar, { paddingTop: insets.top, height: 44 + insets.top }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[t.type.bodyLg, { color: t.colors.text.link }]}>Cancel</Text>
        </Pressable>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
          Cards & Certificates
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: t.space[5], gap: t.space[5] }}
          keyboardShouldPersistTaps="handled"
        >
          {isLoading && (
            <Text style={[t.type.body, { color: t.colors.text.tertiary }]}>Loading…</Text>
          )}

          {/* ── Verification status banner ────────────────────── */}
          <View
            style={{
              backgroundColor: verified ? '#E2F5EA' : t.colors.bg.surface2,
              borderRadius: t.radius.md,
              padding: t.space[4],
            }}
          >
            <Text
              style={[
                t.type.bodyLgEmphasis,
                { color: verified ? '#197A4D' : t.colors.text.primary },
              ]}
            >
              {verified ? '✓ Verified by Phase' : 'Not verified yet'}
            </Text>
            <Text
              style={[
                t.type.footnote,
                {
                  color: verified ? '#197A4D' : t.colors.text.secondary,
                  marginTop: 4,
                },
              ]}
            >
              {verified
                ? 'Customers see a blue tick next to your business name.'
                : 'Add your cards below. We review them manually within 24 hours and add the verified badge to your public profile.'}
            </Text>
          </View>

          {/* ── Certificates ───────────────────────────────────── */}
          <View style={{ gap: t.space[3] }}>
            <View style={styles.sectionHead}>
              <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>
                Your cards & certificates
              </Text>
            </View>

            {certsQuery.isLoading && (
              <Text style={[t.type.footnote, { color: t.colors.text.tertiary }]}>Loading…</Text>
            )}

            {certificates.length === 0 && !certsQuery.isLoading && (
              <Text style={[t.type.body, { color: t.colors.text.tertiary }]}>
                None added yet. Add the cards you carry on a typical job — Gas Safe, CSCS, Part P, anything else.
              </Text>
            )}

            {certificates.map((c) => (
              <CertRow
                key={c.id}
                cert={c}
                onPress={() =>
                  router.push({ pathname: '/settings/certificate/[id]', params: { id: c.id } })
                }
              />
            ))}

            <Pressable
              onPress={() =>
                router.push({ pathname: '/settings/certificate/[id]', params: { id: 'new' } })
              }
              style={({ pressed }) => [
                styles.addBtn,
                {
                  borderColor: t.colors.border.strong,
                  backgroundColor: pressed ? t.colors.bg.surface2 : t.colors.bg.surface,
                },
              ]}
            >
              <Ionicons name="add" size={20} color={t.colors.text.link} />
              <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.link }]}>
                Add a card
              </Text>
            </Pressable>
          </View>

          {/* ── Insurance ──────────────────────────────────────── */}
          <View style={{ gap: t.space[3] }}>
            <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>
              Public liability insurance
            </Text>

            <InputField
              label="Provider"
              value={insuranceProvider}
              onChangeText={setInsuranceProvider}
              autoCapitalize="words"
              placeholder="Direct Line, Hiscox, etc."
              helper="Public liability + employers' liability."
            />

            <View>
              <Text style={[t.type.caption, { color: t.colors.text.tertiary, marginBottom: 8 }]}>
                Expiry
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: t.colors.bg.surface,
                  borderColor: t.colors.border.strong,
                  borderWidth: 1,
                  borderRadius: t.radius.md,
                  paddingHorizontal: t.space[4],
                  height: 50,
                }}
              >
                <Text style={[t.type.bodyLg, { color: t.colors.text.primary }]}>
                  {insuranceExpiry
                    ? insuranceExpiry.toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Not set'}
                </Text>
                <DateTimePicker
                  value={insuranceExpiry ?? new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'compact' : 'default'}
                  minimumDate={new Date()}
                  onChange={(_e: DateTimePickerEvent, d?: Date) => {
                    if (d) setInsuranceExpiry(d);
                  }}
                />
              </View>
            </View>
          </View>

          {/* ── Tax info (private) ─────────────────────────────── */}
          <View style={{ gap: t.space[3] }}>
            <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>
              Tax info (private)
            </Text>

            <InputField
              label="VAT number"
              value={vat}
              onChangeText={setVat}
              autoCapitalize="characters"
              placeholder="GB123456789"
              helper="Only if VAT-registered."
            />

            <InputField
              label="UTR number"
              value={utr}
              onChangeText={setUtr}
              keyboardType="number-pad"
              placeholder="1234567890"
              helper="HMRC Unique Taxpayer Reference. Never shown to customers."
            />
          </View>
        </ScrollView>

        <View
          style={{
            padding: t.space[5],
            borderTopWidth: 1,
            borderTopColor: t.colors.border.subtle,
            backgroundColor: t.colors.bg.canvas,
          }}
        >
          <PrimaryButton
            title="Save insurance + tax"
            onPress={() => mutation.mutate()}
            loading={mutation.isPending}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Certificate row ──────────────────────────────────────────────
function CertRow({ cert, onPress }: { cert: TradesmanCertificate; onPress: () => void }) {
  const t = lightTheme;
  const label = cert.kind === 'other' ? cert.custom_name ?? 'Other' : CERTIFICATE_LABELS[cert.kind];
  const days = daysUntilExpiry(cert.expires_at);
  const chip = expiryChip(days);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.certRow,
        {
          backgroundColor: pressed ? t.colors.bg.surface2 : t.colors.bg.surface,
          borderColor: t.colors.border.subtle,
          borderRadius: t.radius.md,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
          {label}
        </Text>
        {cert.number && (
          <Text style={[t.type.footnote, { color: t.colors.text.tertiary, marginTop: 2 }]}>
            {cert.number}
          </Text>
        )}
      </View>
      {chip && (
        <View style={[styles.chip, { backgroundColor: chip.bg }]}>
          <Text style={[t.type.caption, { color: chip.fg }]}>{chip.text}</Text>
        </View>
      )}
      <Text style={{ color: t.colors.text.tertiary, fontSize: 18, marginLeft: 6 }}>›</Text>
    </Pressable>
  );
}

/**
 * Calm-tone expiry chip. Phase doesn't shout: amber for "expires soon",
 * neutral grey for "expired" (it's a fact, not an emergency), and
 * nothing at all when there's no date or when there's plenty of time.
 */
function expiryChip(
  days: number | null,
): { text: string; bg: string; fg: string } | null {
  if (days == null) return { text: 'No expiry set', bg: '#F2EFE9', fg: '#6E6A60' };
  if (days < 0) return { text: 'Expired', bg: '#EAE6DE', fg: '#5C5851' };
  if (days <= 30) return { text: `Expires in ${days}d`, bg: '#FBEED2', fg: '#8A6A1C' };
  if (days <= 90) return { text: `Expires in ${days}d`, bg: '#F2EFE9', fg: '#6E6A60' };
  return null;
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 44,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  certRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});
