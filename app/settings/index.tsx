import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { signOut, updateProfile } from '@/services/auth';
import { pickAvatar, uploadAvatar } from '@/services/media';
import { useAuthStore } from '@/stores/auth';
import { lightTheme } from '@/theme/light';

export default function SettingsScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const queryClient = useQueryClient();

  const avatarMutation = useMutation({
    mutationFn: async () => {
      const picked = await pickAvatar();
      if (!picked) return null;
      const url = await uploadAvatar({ photo: picked, user_id: profile!.id });
      await updateProfile({ avatar_url: url });
      await refreshProfile();
      // Invalidate any avatar consumers (none yet, but future-proof).
      queryClient.invalidateQueries({ queryKey: ['my-projects'] });
      return url;
    },
    onError: (e) => Alert.alert("Couldn't update photo", (e as Error).message),
  });

  function onSignOut() {
    Alert.alert('Sign out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  const initials = (profile?.full_name ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['bottom']}>
      <View style={[styles.navBar, { paddingTop: insets.top, height: 44 + insets.top }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[t.type.bodyLg, { color: t.colors.text.link }]}>Done</Text>
        </Pressable>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: t.space[5], gap: t.space[4] }}>
        {/* Avatar + name */}
        <View style={{ alignItems: 'center', gap: t.space[3] }}>
          <Pressable
            onPress={() => avatarMutation.mutate()}
            disabled={avatarMutation.isPending}
            style={[
              styles.avatar,
              { backgroundColor: t.colors.bg.surface2, borderColor: t.colors.border.subtle },
              avatarMutation.isPending && { opacity: 0.5 },
            ]}
          >
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} contentFit="cover" />
            ) : (
              <Text style={[t.type.title1, { color: t.colors.text.secondary }]}>{initials}</Text>
            )}
          </Pressable>
          <Pressable onPress={() => avatarMutation.mutate()} hitSlop={6}>
            <Text style={[t.type.footnote, { color: t.colors.text.link }]}>
              {avatarMutation.isPending ? 'Uploading…' : 'Change photo'}
            </Text>
          </Pressable>
        </View>

        {/* Editable fields */}
        <Card>
          <Pressable
            onPress={() => router.push('/settings/edit-name')}
            style={styles.rowBetween}
          >
            <View>
              <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>Name</Text>
              <Text style={[t.type.bodyLg, { color: t.colors.text.primary, marginTop: 4 }]}>
                {profile?.full_name ?? '—'}
              </Text>
            </View>
            <Text style={[t.type.bodyLg, { color: t.colors.text.tertiary }]}>›</Text>
          </Pressable>
        </Card>

        {/* Read-only fields */}
        <Card>
          <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>Email</Text>
          <Text style={[t.type.bodyLg, { color: t.colors.text.primary, marginTop: 4 }]}>
            {profile?.email ?? '—'}
          </Text>
        </Card>

        <Card>
          <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>Account type</Text>
          <Text
            style={[
              t.type.bodyLg,
              { color: t.colors.text.primary, marginTop: 4, textTransform: 'capitalize' },
            ]}
          >
            {profile?.role ?? '—'}
          </Text>
        </Card>

        {/* Notifications — all roles. Routes to the warm consent screen,
            which detects current iOS permission state and either prompts,
            deep-links to Settings, or no-ops if already granted. */}
        <Card>
          <Pressable
            onPress={() => router.push('/consent/notifications')}
            style={styles.rowBetween}
          >
            <View>
              <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>Notifications</Text>
              <Text style={[t.type.bodyLg, { color: t.colors.text.primary, marginTop: 4 }]}>
                Push alerts for updates and messages
              </Text>
            </View>
            <Text style={[t.type.bodyLg, { color: t.colors.text.tertiary }]}>›</Text>
          </Pressable>
        </Card>

        {/* Tradesman-only entries */}
        {profile?.role === 'tradesman' && (
          <>
            <Card>
              <Pressable
                onPress={() => router.push('/settings/business')}
                style={styles.rowBetween}
              >
                <View>
                  <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>Business profile</Text>
                  <Text style={[t.type.bodyLg, { color: t.colors.text.primary, marginTop: 4 }]}>
                    Bio, trades, service area
                  </Text>
                </View>
                <Text style={[t.type.bodyLg, { color: t.colors.text.tertiary }]}>›</Text>
              </Pressable>
            </Card>
            <Card>
              <Pressable
                onPress={() => router.push('/settings/verification')}
                style={styles.rowBetween}
              >
                <View>
                  <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>Verification</Text>
                  <Text style={[t.type.bodyLg, { color: t.colors.text.primary, marginTop: 4 }]}>
                    Certificates + insurance
                  </Text>
                </View>
                <Text style={[t.type.bodyLg, { color: t.colors.text.tertiary }]}>›</Text>
              </Pressable>
            </Card>
          </>
        )}

        {/* Sign out */}
        <View style={{ marginTop: t.space[8] }}>
          <Pressable onPress={onSignOut} style={[styles.signOutBtn, { borderColor: t.colors.border.subtle }]}>
            <Text style={[t.type.bodyLgEmphasis, { color: t.colors.destructive.text }]}>
              Sign out
            </Text>
          </Pressable>
        </View>

        <Text
          style={[
            t.type.footnote,
            { color: t.colors.text.tertiary, textAlign: 'center', marginTop: t.space[4] },
          ]}
        >
          Phase v1.0.0
        </Text>
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
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  signOutBtn: {
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
  },
});
