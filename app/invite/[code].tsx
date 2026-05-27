import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { acceptInvite, getInviteByCode } from '@/services/invites';
import { useAuthStore } from '@/stores/auth';
import { lightTheme } from '@/theme/light';

export default function InviteAcceptScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();
  const { code } = useLocalSearchParams<{ code: string }>();
  const role = useAuthStore((s) => s.profile?.role);
  const queryClient = useQueryClient();

  const inviteQuery = useQuery({
    queryKey: ['invite', code],
    queryFn: () => getInviteByCode(code!),
    enabled: !!code,
  });

  const acceptMutation = useMutation({
    mutationFn: () => acceptInvite(code!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-current-project'] });
      queryClient.invalidateQueries({ queryKey: ['my-projects'] });
      Alert.alert('Joined!', `You're now following "${data.title}".`);
      router.replace('/');
    },
    onError: (e) => Alert.alert("Couldn't join", (e as Error).message),
  });

  const isCustomer = role === 'customer';
  const data = inviteQuery.data;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['bottom']}>
      <View style={[styles.navBar, { paddingTop: insets.top, height: 44 + insets.top }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[t.type.bodyLg, { color: t.colors.text.link }]}>Cancel</Text>
        </Pressable>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>Invite</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: t.space[5], gap: t.space[4] }}
      >
        {inviteQuery.isLoading && (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        )}

        {!inviteQuery.isLoading && !data && (
          <View style={styles.center}>
            <Text style={[t.type.title2, { color: t.colors.text.primary, textAlign: 'center' }]}>
              Invite not found
            </Text>
            <Text
              style={[
                t.type.body,
                { color: t.colors.text.secondary, textAlign: 'center', marginTop: 8 },
              ]}
            >
              Double-check the code with your tradesman. Codes are case-insensitive.
            </Text>
          </View>
        )}

        {data && (
          <>
            <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>
              Invited to follow
            </Text>
            <Card>
              <Text style={[t.type.title2, { color: t.colors.text.primary }]}>
                {data.title}
              </Text>
              <Text
                style={[
                  t.type.body,
                  { color: t.colors.text.secondary, marginTop: t.space[2] },
                ]}
              >
                {[data.address_line_1, data.city, data.postcode].filter(Boolean).join(', ') || '—'}
              </Text>
            </Card>

            <Card>
              <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>
                Your tradesman
              </Text>
              <Text
                style={[
                  t.type.bodyLgEmphasis,
                  { color: t.colors.text.primary, marginTop: t.space[2] },
                ]}
              >
                {data.tradesman?.full_name ?? 'Tradesman'}
              </Text>
            </Card>

            {!isCustomer && (
              <Text
                style={[
                  t.type.footnote,
                  { color: t.colors.destructive.text, textAlign: 'center' },
                ]}
              >
                Only customer accounts can accept invites. You're signed in as {role}.
              </Text>
            )}

            <View style={{ marginTop: t.space[4] }}>
              <PrimaryButton
                title="Join project"
                onPress={() => acceptMutation.mutate()}
                loading={acceptMutation.isPending}
                disabled={!isCustomer}
              />
            </View>
          </>
        )}
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
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
});
