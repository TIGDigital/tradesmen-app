import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
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

import { deleteMyAccount, signOut } from '@/services/auth';
import { useAuthStore } from '@/stores/auth';
import { lightTheme } from '@/theme/light';

/**
 * Permanent account deletion screen.
 *
 * Required by App Store guideline 5.1.1(v). The flow is deliberately
 * heavy: a warning hero, a list of what gets removed, and a typed-DELETE
 * confirmation before the destructive button enables. No "30-day grace
 * period" UI yet — Apple accepts this minimum.
 *
 * On success:
 *   - the Edge Function has already nuked auth.users + projects (for
 *     tradesmen);
 *   - we sign the local session out, which clears AsyncStorage + the
 *     in-memory Zustand state;
 *   - AuthGate routes to /(auth)/welcome, completing the loop.
 *
 * If the Edge Function errors mid-flow the user lands back on this screen
 * with an alert. The auth.users row may or may not be in a partially
 * deleted state; tradesmen with many projects could time out. We log the
 * error verbatim so we can debug — but the user-facing message stays
 * gentle.
 */
export default function DeleteAccountScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);

  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);

  // Apple-compliant: user must type the exact word to enable the button.
  // Avoids the "tapped it by accident" footgun.
  const canDelete = confirmText.trim().toUpperCase() === 'DELETE' && !busy;

  async function onConfirmDelete() {
    if (!canDelete) return;
    setBusy(true);
    try {
      await deleteMyAccount();
      // Sign out clears AsyncStorage + Zustand state.
      await signOut();
      // AuthGate sees !session → routes to /(auth)/welcome. We don't push
      // explicitly because the AuthGate redirect happens during the next
      // render tick and explicit navigation can race it.
    } catch (e) {
      setBusy(false);
      Alert.alert(
        "Couldn't delete account",
        (e as Error).message ?? 'Something went wrong. Try again, or get in touch.',
      );
    }
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}
      edges={['bottom']}
    >
      <View style={[styles.navBar, { paddingTop: insets.top, height: 44 + insets.top }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[t.type.bodyLg, { color: t.colors.text.link }]}>Cancel</Text>
        </Pressable>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
          Delete account
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingBottom: 48, gap: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Warning hero */}
          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: t.colors.destructive.bg },
              ]}
            >
              <Ionicons
                name="alert-circle"
                size={48}
                color={t.colors.destructive.text}
              />
            </View>
            <Text
              style={[
                t.type.title1,
                {
                  color: t.colors.text.primary,
                  textAlign: 'center',
                  marginTop: 18,
                },
              ]}
            >
              Delete your Phase account
            </Text>
            <Text
              style={[
                t.type.body,
                {
                  color: t.colors.text.secondary,
                  textAlign: 'center',
                  marginTop: 8,
                  lineHeight: 22,
                  maxWidth: 320,
                },
              ]}
            >
              This is permanent. We can't undo it — not even if you ask
              nicely.
            </Text>
          </View>

          {/* What gets removed */}
          <View
            style={[
              styles.panel,
              { backgroundColor: t.colors.bg.surface, borderColor: t.colors.border.subtle },
            ]}
          >
            <Text
              style={[
                t.type.caption,
                { color: t.colors.text.tertiary, letterSpacing: 1.4, textTransform: 'uppercase' },
              ]}
            >
              What this removes
            </Text>
            <View style={{ marginTop: 12, gap: 10 }}>
              <Row text="Your sign-in (email and password)" />
              <Row text="Your profile and avatar" />
              {profile?.role === 'tradesman' && (
                <>
                  <Row text="Every project you've created" />
                  <Row text="All updates, photos, and messages on those projects" />
                  <Row text="Your crew's access to those projects" />
                </>
              )}
              {profile?.role === 'customer' && (
                <Row text="Your reactions, comments, and messages on every project you've joined" />
              )}
              {profile?.role === 'apprentice' && (
                <Row text="Your crew memberships and any updates you've authored" />
              )}
              <Row text="Push tokens and notification history" />
            </View>
            <Text
              style={[
                t.type.footnote,
                { color: t.colors.text.tertiary, marginTop: 14, lineHeight: 18 },
              ]}
            >
              You can sign up again afterwards with the same email — it'll
              be a fresh account, with no past history.
            </Text>
          </View>

          {/* Confirmation field */}
          <View>
            <Text style={[t.type.body, { color: t.colors.text.primary, fontWeight: '600' }]}>
              Type DELETE to confirm
            </Text>
            <Text
              style={[
                t.type.footnote,
                { color: t.colors.text.tertiary, marginTop: 4 },
              ]}
            >
              Capital letters, no spaces.
            </Text>
            <TextInput
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder="DELETE"
              placeholderTextColor={t.colors.text.tertiary}
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              style={[
                t.type.bodyLg,
                {
                  marginTop: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: t.radius.md,
                  borderWidth: 1,
                  borderColor: t.colors.border.strong,
                  backgroundColor: t.colors.bg.surface2,
                  color: t.colors.text.primary,
                  letterSpacing: 2,
                },
              ]}
            />
          </View>

          {/* Final destructive button */}
          <Pressable
            onPress={onConfirmDelete}
            disabled={!canDelete}
            style={({ pressed }) => [
              styles.destructiveBtn,
              {
                backgroundColor: canDelete
                  ? pressed
                    ? '#8E2E1B'
                    : t.colors.destructive.text
                  : t.colors.bg.surface2,
                borderColor: canDelete ? 'transparent' : t.colors.border.subtle,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Permanently delete my account"
            accessibilityState={{ disabled: !canDelete }}
          >
            <Text
              style={[
                t.type.bodyLg,
                {
                  color: canDelete ? '#FFFFFF' : t.colors.text.tertiary,
                  fontWeight: '600',
                },
              ]}
            >
              {busy ? 'Deleting…' : 'Permanently delete my account'}
            </Text>
          </Pressable>

          {/* Soft exit */}
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={{ alignItems: 'center', paddingVertical: 8 }}
          >
            <Text style={[t.type.body, { color: t.colors.text.link, fontWeight: '500' }]}>
              Keep my account
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Row({ text }: { text: string }) {
  const t = lightTheme;
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <Ionicons
        name="ellipse"
        size={6}
        color={t.colors.text.tertiary}
        style={{ marginTop: 9 }}
      />
      <Text style={[t.type.body, { color: t.colors.text.primary, flex: 1, lineHeight: 22 }]}>
        {text}
      </Text>
    </View>
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
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  destructiveBtn: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
});
