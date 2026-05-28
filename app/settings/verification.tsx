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
import { getMyTradesmanProfile, updateTradesmanProfile } from '@/services/tradesman';
import { lightTheme } from '@/theme/light';

export default function VerificationSettingsScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['tradesman-profile'],
    queryFn: getMyTradesmanProfile,
  });

  const [gasSafe, setGasSafe] = useState('');
  const [niceic, setNiceic] = useState('');
  const [cscs, setCscs] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insuranceExpiry, setInsuranceExpiry] = useState<Date | null>(null);
  const [vat, setVat] = useState('');
  const [utr, setUtr] = useState('');

  useEffect(() => {
    if (!profile) return;
    setGasSafe(profile.gas_safe_number ?? '');
    setNiceic(profile.niceic_number ?? '');
    setCscs(profile.cscs_card_number ?? '');
    setInsuranceProvider(profile.insurance_provider ?? '');
    setInsuranceExpiry(profile.insurance_expiry ? new Date(profile.insurance_expiry) : null);
    setVat(profile.vat_number ?? '');
    setUtr(profile.utr_number ?? '');
  }, [profile]);

  const mutation = useMutation({
    mutationFn: () =>
      updateTradesmanProfile({
        gas_safe_number: gasSafe.trim() || null,
        niceic_number: niceic.trim() || null,
        cscs_card_number: cscs.trim() || null,
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
          Verification
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: t.space[5], gap: t.space[4] }}
          keyboardShouldPersistTaps="handled"
        >
          {isLoading && (
            <Text style={[t.type.body, { color: t.colors.text.tertiary }]}>Loading…</Text>
          )}

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
              {verified ? '✓ Verified by Tradesmen' : 'Not verified yet'}
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
                : 'Fill in what you have. We review manually within 24 hours and add the verified badge to your public profile.'}
            </Text>
          </View>

          <InputField
            label="Gas Safe number"
            value={gasSafe}
            onChangeText={setGasSafe}
            autoCapitalize="characters"
            placeholder="123456"
            helper="Look it up at gassaferegister.co.uk"
          />

          <InputField
            label="NICEIC number"
            value={niceic}
            onChangeText={setNiceic}
            autoCapitalize="characters"
            placeholder="ABC1234"
            helper="For electrical work — niceic.com"
          />

          <InputField
            label="CSCS card number"
            value={cscs}
            onChangeText={setCscs}
            autoCapitalize="characters"
            placeholder="JIB / Gold / Black"
            helper="Construction Skills Certification Scheme."
          />

          <InputField
            label="Insurance provider"
            value={insuranceProvider}
            onChangeText={setInsuranceProvider}
            autoCapitalize="words"
            placeholder="Direct Line, Hiscox, etc."
            helper="Public liability + employers' liability."
          />

          <View>
            <Text style={[t.type.footnote, { color: t.colors.text.secondary, marginBottom: 6 }]}>
              Insurance expiry
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: t.colors.bg.surface2,
                borderColor: t.colors.border.strong,
                borderWidth: 1,
                borderRadius: t.radius.md,
                paddingHorizontal: t.space[4],
                height: 52,
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

          <InputField
            label="VAT number (optional)"
            value={vat}
            onChangeText={setVat}
            autoCapitalize="characters"
            placeholder="GB123456789"
            helper="Only if VAT-registered."
          />

          <InputField
            label="UTR number (optional)"
            value={utr}
            onChangeText={setUtr}
            keyboardType="number-pad"
            placeholder="1234567890"
            helper="HMRC Unique Taxpayer Reference. Tax purposes only — never shown to customers."
          />
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
            title="Save"
            onPress={() => mutation.mutate()}
            loading={mutation.isPending}
          />
        </View>
      </KeyboardAvoidingView>
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
});
