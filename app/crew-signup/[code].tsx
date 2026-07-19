import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PhaseLogo } from '@/components/PhaseLogo';
import { ErrorState } from '@/components/ui/ErrorState';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { signUpWithEmail } from '@/services/auth';
import { acceptCrewInvite, fetchCrewInviteByCode } from '@/services/crew';
import { useAuthStore } from '@/stores/auth';
import { lightTheme } from '@/theme/light';

/**
 * Crew-specific sign-up flow.
 *
 * Lives at /crew-signup/[code]. Entered from /crew-invite/[code] when the
 * recipient doesn't yet have a Phase account. The whole flow is one
 * screen:
 *
 *   1. Fetch the invite (just to show "you're joining {project}")
 *   2. Collect name + email + password
 *   3. Sign up with role pre-set to 'apprentice'
 *   4. Accept the invite (inserts project_crew row, bumps role if needed)
 *   5. Mark the welcome screen as shown so AuthGate doesn't bounce us
 *   6. Replace navigation to the project detail
 *
 * This is the ONLY supported path to becoming an apprentice. The normal
 * role-select screen doesn't expose apprentice as a self-pick option.
 */
export default function CrewSignUpScreen() {
  const t = lightTheme;
  const { code } = useLocalSearchParams<{ code: string }>();
  const queryClient = useQueryClient();
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const markWelcomeShown = useAuthStore((s) => s.markWelcomeShown);

  const inviteQuery = useQuery({
    queryKey: ['crew-invite', code],
    queryFn: () => fetchCrewInviteByCode(code!),
    enabled: !!code,
  });

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    if (!fullName.trim() || !email.trim() || password.length < 6) {
      Alert.alert('Missing something', 'Name, email, and a 6+ character password please.');
      return;
    }
    if (!code) {
      Alert.alert('Missing code', 'This invite link is incomplete.');
      return;
    }
    // iOS 26 keyboard-teardown crash guard — blur well before the
    // router.replace at the end of this flow unmounts the screen.
    // Same root cause + fix as sign-up.tsx.
    Keyboard.dismiss();
    await new Promise((resolve) => setTimeout(resolve, 400));
    setSubmitting(true);
    try {
      // 1. Create the account with role pre-set to 'apprentice'. The
      //    on_auth_user_created trigger writes the role into profiles.
      await signUpWithEmail({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        role: 'apprentice',
      });

      // 2. Accept the invite. acceptCrewInvite reads the just-created
      //    session from the supabase client, inserts the project_crew
      //    row, and bumps the role to 'apprentice' (defensive — covers
      //    the case where the metadata didn't fire).
      const { project_id } = await acceptCrewInvite(code);

      // 3. Tell the auth store about the new profile + warm the cache.
      await refreshProfile();
      await queryClient.invalidateQueries({ queryKey: ['my-projects'] });
      await queryClient.invalidateQueries({ queryKey: ['project-crew', project_id] });

      // 4. Skip the welcome screen — we're done onboarding this crew member.
      markWelcomeShown();

      // 5. Land them straight in the project.
      router.replace({ pathname: '/project/[id]', params: { id: project_id } });
    } catch (e) {
      Alert.alert("Couldn't create your account", (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const invite = inviteQuery.data;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['top', 'bottom']}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        style={styles.backBtn}
        accessibilityLabel="Back"
      >
        <Ionicons name="chevron-back" size={26} color={t.colors.text.primary} />
      </Pressable>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { padding: t.space[6] }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand cluster — matches the welcome + sign-up cadence. */}
          <View style={{ alignItems: 'center', marginTop: t.space[4] }}>
            <PhaseLogo size={44} />
            <Text style={[t.type.caption, { color: t.colors.text.tertiary, marginTop: t.space[3] }]}>
              Phase
            </Text>
          </View>

          {/* Hero — confirms the project they're joining. */}
          <View style={{ marginTop: t.space[10] }}>
            <Text style={[t.type.caption, { color: t.colors.brand.primary, marginBottom: t.space[3] }]}>
              Join the crew
            </Text>
            {inviteQuery.isLoading ? (
              <Skeleton width="60%" height={28} />
            ) : invite ? (() => {
              // Prefer denormalised fields — see /crew-invite/[code].tsx for
              // the rationale. Fallback chain keeps pre-migration invites
              // rendering reasonably.
              const projectTitle =
                invite.project_title ?? invite.project?.title ?? 'this project';
              const inviterName =
                invite.inviter_name ?? invite.inviter?.full_name ?? 'Your tradesman';
              return (
              <>
                <Text style={[t.type.title1, { color: t.colors.text.primary }]}>
                  {projectTitle}
                </Text>
                <Text
                  style={[
                    t.type.body,
                    { color: t.colors.text.secondary, marginTop: t.space[2], lineHeight: 22 },
                  ]}
                >
                  {inviterName} invited you to the crew. Create your account and we'll
                  add you in one tap.
                </Text>
              </>
              );
            })() : (
              <ErrorState
                tone="empty"
                title="Invite not found"
                message="That code may be expired, used, or revoked. Ask the tradesman for a new one."
              />
            )}
          </View>

          {invite && (
            <>
              <View style={{ gap: t.space[4], marginTop: t.space[8] }}>
                <InputField
                  label="Full name"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  autoComplete="name"
                  textContentType="name"
                  returnKeyType="next"
                />
                <InputField
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType="next"
                />
                <InputField
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  // Intentionally NO autoComplete/textContentType: iOS
                  // 26.5's password-suggestion overlay crashes when the
                  // field unmounts on the post-signup navigation. Same
                  // guard as sign-up.tsx / sign-in.tsx.
                  helper="At least 6 characters."
                  returnKeyType="done"
                  onSubmitEditing={onSubmit}
                />
              </View>

              <View style={{ marginTop: t.space[8] }}>
                <PrimaryButton
                  title="Create account & join"
                  onPress={onSubmit}
                  loading={submitting}
                />
              </View>

              <Pressable
                onPress={() => router.push('/(auth)/sign-in')}
                hitSlop={12}
                style={{
                  alignItems: 'center',
                  paddingVertical: t.space[4],
                  marginTop: t.space[2],
                }}
              >
                <Text style={[t.type.body, { color: t.colors.text.secondary }]}>
                  Already have an account?{' '}
                  <Text style={{ color: t.colors.text.link, fontWeight: '600' }}>Sign in</Text>
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
  backBtn: { paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'flex-start' },
});
