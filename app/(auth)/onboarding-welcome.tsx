import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PhaseLogo } from '@/components/PhaseLogo';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { InputField } from '@/components/ui/InputField';
import { lookupCompany, searchCompanies, updateTradesmanProfile } from '@/services/tradesman';
import { useAuthStore } from '@/stores/auth';
import { lightTheme } from '@/theme/light';

/**
 * Personalised "Hi [Name]!" moment shown ONCE after a user signs up
 * and picks their role, before the tour fires.
 *
 * The carousel tour explains *what* Phase does. The onboarding checklist
 * shows *what to do first*. This screen is the warm human moment in
 * between — "we see you, you're welcome here, here's what's coming up."
 *
 * Persistence: marks `onboardingWelcomeSeen` in the auth store (backed
 * by AsyncStorage so it doesn't re-fire on cold launch). Existing users
 * who installed before this screen existed see it once on their next
 * launch — one tap dismisses it permanently.
 */
export default function OnboardingWelcomeScreen() {
  const t = lightTheme;
  const profile = useAuthStore((s) => s.profile);
  const tourSeen = useAuthStore((s) => s.tourSeen);
  const markOnboardingWelcomeSeen = useAuthStore((s) => s.markOnboardingWelcomeSeen);

  const firstName =
    profile?.full_name?.trim().split(' ')[0] || 'there';

  // Pop the headline cluster in on mount — quick warmth.
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  const [businessName, setBusinessName] = useState('');
  const [bio, setBio] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyNumber, setCompanyNumber] = useState('');
  const [saving, setSaving] = useState(false);

  // Business setup is the tradesman's FIRST screen (Todd, 23 Oct): the
  // profile fronts everything their customer sees, so it exists before
  // the app does. Customers and crew keep the light welcome.
  const isTradesman = (profile?.role ?? 'tradesman') === 'tradesman';
  const setupComplete =
    businessName.trim().length > 0 &&
    bio.trim().length > 0 &&
    companyName.trim().length > 0 &&
    companyNumber.trim().length > 0;

  const lookupMutation = useMutation({
    mutationFn: (num: string) => lookupCompany(num),
    onSuccess: (c) => {
      setCompanyName(c.company_name);
      setCompanyNumber(c.company_number);
      if (!businessName.trim()) setBusinessName(c.company_name);
      if (c.company_status !== 'active') {
        Alert.alert(
          'Check the register',
          `Companies House lists ${c.company_name} as "${c.company_status}".`,
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
      companyName || undefined,
    );
  }

  async function onContinue() {
    // Tradesman: the business profile saves as one blocking write — this
    // screen IS the setup, so a failure must surface, not slip past.
    if (isTradesman) {
      setSaving(true);
      try {
        await updateTradesmanProfile({
          business_name: businessName.trim(),
          bio: bio.trim(),
          company_name: companyName.trim(),
          company_number: companyNumber.trim(),
        });
      } catch (e) {
        setSaving(false);
        Alert.alert("Couldn't save your business", (e as Error).message);
        return;
      }
      setSaving(false);
    }
    await markOnboardingWelcomeSeen();
    // If the user hasn't seen the tour yet, route there next; otherwise
    // skip straight to home (AuthGate would do this anyway, but explicit
    // is friendlier — no half-tick where they see Jobs flash then
    // route away to the tour).
    if (tourSeen === false) {
      router.replace('/tour');
    } else {
      router.replace('/');
    }
  }

  const role = profile?.role ?? 'tradesman';
  // Role-voiced welcome line. Crew gets its own sentence — templating
  // "{roleLabel}s like you" used to render the awkward "crews like you".
  const welcomeBody =
    role === 'apprentice'
      ? "We're glad you're here. Phase keeps you and your lead on the same page — today's job, your job list, and updates straight from site."
      : "We're glad you're here. Phase is built so customers like you can stay in sync with the people you're working with, without the WhatsApp chase.";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView
        contentContainerStyle={[styles.scroll, { padding: t.space[6] }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Skip — quiet escape for customers/crew. The tradesman can't
            skip: this screen is their business setup. */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }} />
          {!isTradesman && (
            <Pressable
              onPress={() => void onContinue()}
              hitSlop={12}
              style={{ paddingVertical: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Skip welcome"
            >
              <Text style={[t.type.body, { color: t.colors.text.tertiary }]}>
                Skip
              </Text>
            </Pressable>
          )}
        </View>

        {/* Brand stamp */}
        <View style={{ alignItems: 'center', marginTop: t.space[2] }}>
          <PhaseLogo size={44} />
        </View>

        {/* Greeting cluster — animated in */}
        <Animated.View
          style={[
            styles.cluster,
            { opacity, transform: [{ translateY }] },
          ]}
        >
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
            Welcome
          </Text>
          <Text
            style={[
              t.type.title1,
              {
                color: t.colors.text.primary,
                marginTop: t.space[2],
                fontSize: 36,
                lineHeight: 40,
              },
            ]}
          >
            Hi {firstName} 👋
          </Text>
          <Text
            style={[
              t.type.bodyLg,
              {
                color: t.colors.text.secondary,
                marginTop: t.space[3],
                lineHeight: 26,
              },
            ]}
          >
            {isTradesman
              ? "We're glad you're here. First, set up the business your customers will see — every update, quote and invite carries it."
              : welcomeBody}
          </Text>
        </Animated.View>

        {/* What's coming up — customers and crew only; the tradesman's
            first screen is the business setup below. */}
        {!isTradesman && (
          <View style={{ marginTop: t.space[8], gap: t.space[3] }}>
            <Text
              style={[
                t.type.caption,
                {
                  color: t.colors.text.tertiary,
                  letterSpacing: 1.4,
                  textTransform: 'uppercase',
                },
              ]}
            >
              What's next
            </Text>
            {(role === 'customer'
              ? CUSTOMER_STEPS
              : role === 'apprentice'
                ? CREW_STEPS
                : TRADESMAN_STEPS
            ).map((s, i) => (
              <Step key={s.title} n={i + 1} title={s.title} body={s.body} />
            ))}
          </View>
        )}

        {isTradesman && (
          <View style={{ marginTop: t.space[8], gap: t.space[4] }}>
            {/* Register search leads: one search fills the company fields
                and the business name (Todd, 23 Oct). */}
            <Pressable
              onPress={onSearchRegister}
              disabled={lookupMutation.isPending || searchMutation.isPending}
              hitSlop={6}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                padding: t.space[4],
                borderWidth: 1,
                borderStyle: 'dashed',
                borderRadius: t.radius.md,
                borderColor: t.colors.brand.primary,
                backgroundColor: t.colors.brand.tint,
              }}
            >
              <Ionicons name="search" size={18} color={t.colors.brand.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
                  {lookupMutation.isPending || searchMutation.isPending
                    ? 'Checking the register…'
                    : 'Find your company on Companies House'}
                </Text>
                <Text style={[t.type.footnote, { color: t.colors.text.secondary, marginTop: 2 }]}>
                  Search by name or number and the details below fill themselves.
                </Text>
              </View>
            </Pressable>

            <InputField
              label="Company name (Companies House)"
              value={companyName}
              onChangeText={setCompanyName}
              autoCapitalize="words"
              placeholder="Smith & Sons Plumbing Ltd"
            />
            <InputField
              label="Company number"
              value={companyNumber}
              onChangeText={setCompanyNumber}
              autoCapitalize="characters"
              placeholder="12345678"
            />

            <InputField
              label="Business name"
              value={businessName}
              onChangeText={setBusinessName}
              autoCapitalize="words"
              placeholder="e.g. Daly Building Co"
              helper="The name your customers see."
            />

            <View>
              <Text style={[t.type.footnote, { color: t.colors.text.secondary, marginBottom: 6 }]}>
                A line about your business
              </Text>
              <TextInput
                value={bio}
                onChangeText={(v) => v.length <= 200 && setBio(v)}
                multiline
                placeholder="Family-run, 12 years in South London. Kitchens, bathrooms and extensions."
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
                    minHeight: 88,
                    textAlignVertical: 'top',
                  },
                ]}
              />
            </View>
          </View>
        )}

        <View style={{ marginTop: t.space[10] }}>
          {isTradesman && !setupComplete && (
            <Text
              style={[
                t.type.footnote,
                { color: t.colors.text.secondary, marginBottom: 10, textAlign: 'center' },
              ]}
            >
              Still needed:{' '}
              {[
                !businessName.trim() && 'business name',
                !bio.trim() && 'a line about your business',
                (!companyName.trim() || !companyNumber.trim()) && 'Companies House details',
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          )}
          <PrimaryButton
            title={isTradesman ? 'Save and continue' : "Let's get started"}
            onPress={() => void onContinue()}
            loading={saving}
            disabled={isTradesman && !setupComplete}
          />
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** The five-step previews shown under "What's next". Tuned to mirror the
 *  Get-started checklist the user will land in afterwards, so they can
 *  see the runway end-to-end before tapping continue. */
const TRADESMAN_STEPS = [
  {
    title: 'Quick tour',
    body: "Five screens, 45 seconds. Explains how Phase fits in your day.",
  },
  {
    title: 'Create your first project',
    body: "We'll pre-fill milestones for your trade so you're not staring at a blank page.",
  },
  {
    title: 'Invite your customer',
    body: "One tap to send them a code — they join via SMS, no chasing.",
  },
  {
    title: 'Post your first update',
    body: "A photo and a sentence is enough. They see it instantly.",
  },
  {
    title: "Lock in the price",
    body: "Set the agreed quote. Any change after that needs their OK — no surprise bills.",
  },
];

const CUSTOMER_STEPS = [
  {
    title: 'Quick tour',
    body: "Four screens, 30 seconds. Explains what Phase will show you.",
  },
  {
    title: 'Join your project',
    body: "Enter the code your tradesman sent and you're in.",
  },
  {
    title: 'React to an update',
    body: 'Tap 👏 ❤️ or 💪 so your tradesman knows the message landed.',
  },
  {
    title: 'Ask questions any time',
    body: "Built-in chat — replies stay logged so nobody forgets what was agreed.",
  },
  {
    title: 'Approve every price change',
    body: "If the price needs to move, you get the request first. Approve or reject.",
  },
];

/** Crew (apprentices + helpers) land in the Today shell — these steps
 *  mirror what they'll actually do on day one. */
const CREW_STEPS = [
  {
    title: 'Quick tour',
    body: 'Three screens, 20 seconds. How Phase works on site.',
  },
  {
    title: "Open today's job",
    body: "The project, the address and your job list — all on the Today tab.",
  },
  {
    title: 'Post a photo update',
    body: "Snap it, send it. Your lead gives it the once-over before the customer sees it.",
  },
  {
    title: 'Tick off your job list',
    body: 'Your lead assigns the jobs; you tick them off as you go.',
  },
];

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  const t = lightTheme;
  return (
    <View
      style={[
        styles.stepRow,
        { backgroundColor: t.colors.bg.surface, borderColor: t.colors.border.subtle },
      ]}
    >
      <View style={[styles.stepNumber, { backgroundColor: t.colors.brand.tint }]}>
        <Text
          style={[t.type.bodyLgEmphasis, { color: t.colors.brand.primary }]}
        >
          {n}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
          {title}
        </Text>
        <Text
          style={[
            t.type.body,
            { color: t.colors.text.secondary, marginTop: 2, lineHeight: 20 },
          ]}
        >
          {body}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={t.colors.text.tertiary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
  },
  cluster: {
    marginTop: 36,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
