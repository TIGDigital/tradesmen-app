import { Ionicons } from '@expo/vector-icons';
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
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import {
  getMyTradesmanProfile,
  lookupCompany,
  searchCompanies,
  updateTradesmanProfile,
} from '@/services/tradesman';
import { lightTheme } from '@/theme/light';
import type { Database } from '@/types/db';

type TradeType = Database['public']['Enums']['trade_type'];

const TRADES: { value: TradeType; label: string }[] = [
  { value: 'builder', label: 'Builder' },
  { value: 'kitchen_fitter', label: 'Kitchen fitter' },
  { value: 'bathroom_fitter', label: 'Bathroom fitter' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'plumber', label: 'Plumber' },
  { value: 'roofer', label: 'Roofer' },
  { value: 'plasterer', label: 'Plasterer' },
  { value: 'painter_decorator', label: 'Painter/Decorator' },
  { value: 'landscaper', label: 'Landscaper' },
  { value: 'tiler', label: 'Tiler' },
  { value: 'carpenter', label: 'Carpenter' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'general', label: 'General' },
  { value: 'other', label: 'Other' },
];

const BIO_MAX = 200;

export default function BusinessSettingsScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['tradesman-profile'],
    queryFn: getMyTradesmanProfile,
  });

  const [businessName, setBusinessName] = useState('');
  const [bio, setBio] = useState('');
  const [primaryTrade, setPrimaryTrade] = useState<TradeType>('general');
  const [yearsTrading, setYearsTrading] = useState('');
  const [postcodesText, setPostcodesText] = useState('');
  const [website, setWebsite] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyNumber, setCompanyNumber] = useState('');

  // Hydrate the form once when profile loads.
  useEffect(() => {
    if (!profile) return;
    setBusinessName(profile.business_name ?? '');
    setBio(profile.bio ?? '');
    setPrimaryTrade(profile.primary_trade);
    setYearsTrading(profile.years_trading?.toString() ?? '');
    setPostcodesText((profile.service_postcodes ?? []).join(', '));
    setWebsite(profile.website ?? '');
    setCompanyName(profile.company_name ?? '');
    setCompanyNumber(profile.company_number ?? '');
  }, [profile]);

  const lookupMutation = useMutation({
    mutationFn: (num: string) => lookupCompany(num),
    onSuccess: (c) => {
      setCompanyName(c.company_name);
      setCompanyNumber(c.company_number);
      // Most sole traders-turned-ltd use the registered name as the
      // trading name too — prefill it only when it's empty.
      if (!businessName.trim()) setBusinessName(c.company_name);
      if (c.company_status !== 'active') {
        Alert.alert(
          'Check the register',
          `Companies House lists ${c.company_name} as "${c.company_status}". You can still save it, but customers may notice.`,
        );
      }
    },
    onError: (e) => Alert.alert('Not found', (e as Error).message),
  });

  const searchMutation = useMutation({
    mutationFn: (query: string) => searchCompanies(query),
    onSuccess: (matches) => {
      if (matches.length === 0) {
        Alert.alert('No companies found', 'Try the exact registered name, or enter your company number instead.');
        return;
      }
      Alert.alert(
        'Select your company',
        'Top matches from the register:',
        [
          ...matches.slice(0, 3).map((m) => ({
            text: `${m.company_name} (${m.company_number})`,
            onPress: () => lookupMutation.mutate(m.company_number),
          })),
          { text: 'Cancel', style: 'cancel' as const },
        ],
      );
    },
    onError: (e) => Alert.alert("Couldn't search", (e as Error).message),
  });

  function onSearchRegister() {
    Alert.prompt(
      'Search Companies House',
      'Type your company name or company number.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Search',
          onPress: (input?: string) => {
            const q = (input ?? '').trim();
            if (!q) return;
            // A number (with optional 2-letter prefix like SC/NI) goes
            // straight to the profile lookup; anything else is a name search.
            const compact = q.replace(/\s/g, '').toUpperCase();
            if (/^[A-Z]{0,2}\d{5,8}$/.test(compact)) {
              lookupMutation.mutate(compact);
            } else if (q.length >= 3) {
              searchMutation.mutate(q);
            }
          },
        },
      ],
      'plain-text',
      companyName || companyNumber || undefined,
    );
  }

  const mutation = useMutation({
    mutationFn: () => {
      const postcodes = postcodesText
        .split(/[,\n]/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      const years = parseInt(yearsTrading, 10);
      return updateTradesmanProfile({
        business_name: businessName.trim(),
        primary_trade: primaryTrade,
        years_trading: Number.isFinite(years) ? years : null,
        service_postcodes: postcodes,
        bio: bio.trim() || null,
        website: website.trim() || null,
        company_name: companyName.trim() || null,
        company_number: companyNumber.trim() || null,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tradesman-profile'] });
      router.back();
    },
    onError: (e) => Alert.alert("Couldn't save", (e as Error).message),
  });

  function onSave() {
    if (!businessName.trim()) {
      Alert.alert('Business name required');
      return;
    }
    mutation.mutate();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['bottom']}>
      <View style={[styles.navBar, { paddingTop: insets.top, height: 44 + insets.top }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[t.type.bodyLg, { color: t.colors.text.link }]}>Cancel</Text>
        </Pressable>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
          Business
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

          <InputField
            label="Business name"
            value={businessName}
            onChangeText={setBusinessName}
            autoCapitalize="words"
            placeholder="Smith & Sons Plumbing"
          />

          <View>
            <Text style={[t.type.footnote, { color: t.colors.text.secondary, marginBottom: 6 }]}>
              Bio
            </Text>
            <TextInput
              value={bio}
              onChangeText={(v) => v.length <= BIO_MAX && setBio(v)}
              multiline
              placeholder="Family-run, 12 years in South London. We do kitchens, bathrooms, and extensions."
              placeholderTextColor={t.colors.text.tertiary}
              style={[
                t.type.bodyLg,
                {
                  color: t.colors.text.primary,
                  backgroundColor: t.colors.bg.surface2,
                  borderColor: t.colors.border.strong,
                  borderWidth: 1,
                  borderRadius: t.radius.md,
                  padding: t.space[4],
                  minHeight: 110,
                  textAlignVertical: 'top',
                },
              ]}
            />
            <Text
              style={[
                t.type.footnote,
                { color: t.colors.text.tertiary, marginTop: 6, textAlign: 'right' },
              ]}
            >
              {bio.length}/{BIO_MAX}
            </Text>
          </View>

          <View>
            <Text style={[t.type.footnote, { color: t.colors.text.secondary, marginBottom: 6 }]}>
              Primary trade
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: t.space[2], paddingVertical: 4 }}
            >
              {TRADES.map((tr) => {
                const selected = primaryTrade === tr.value;
                return (
                  <Pressable
                    key={tr.value}
                    onPress={() => setPrimaryTrade(tr.value)}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      borderRadius: t.radius.sm,
                      backgroundColor: selected ? t.colors.brand.primary : t.colors.bg.surface2,
                    }}
                  >
                    <Text
                      style={[
                        t.type.body,
                        {
                          color: selected ? t.colors.text.inverse : t.colors.text.primary,
                          fontWeight: '500',
                        },
                      ]}
                    >
                      {tr.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <InputField
            label="Years trading"
            value={yearsTrading}
            onChangeText={setYearsTrading}
            keyboardType="number-pad"
            placeholder="12"
            helper="Just a number, e.g. 12"
          />

          <InputField
            label="Service postcodes"
            value={postcodesText}
            onChangeText={setPostcodesText}
            autoCapitalize="characters"
            placeholder="SW19, SW18, SE26"
            helper="Comma-separated UK postcode districts you cover."
          />

          <InputField
            label="Website"
            value={website}
            onChangeText={setWebsite}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="https://yourbusiness.co.uk"
          />

          {/* ── Limited company ─────────────────────────────────── */}
          <View style={{ gap: t.space[3], marginTop: t.space[2] }}>
            <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>
              Limited company
            </Text>

            <InputField
              label="Company name"
              value={companyName}
              onChangeText={setCompanyName}
              autoCapitalize="words"
              placeholder="Smith & Sons Plumbing Ltd"
              helper="Your registered name at Companies House, if you trade as a limited company."
            />

            <InputField
              label="Company number"
              value={companyNumber}
              onChangeText={setCompanyNumber}
              autoCapitalize="characters"
              placeholder="12345678"
            />

            <Pressable
              onPress={onSearchRegister}
              disabled={lookupMutation.isPending || searchMutation.isPending}
              hitSlop={6}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Ionicons name="search" size={16} color={t.colors.text.link} />
              <Text style={[t.type.body, { color: t.colors.text.link }]}>
                {lookupMutation.isPending || searchMutation.isPending
                  ? 'Checking the register…'
                  : 'Search Companies House, name or number'}
              </Text>
            </Pressable>
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
            title="Save"
            onPress={onSave}
            loading={mutation.isPending}
            disabled={!businessName.trim()}
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
