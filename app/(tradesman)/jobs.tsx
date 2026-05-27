import { useQuery } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { signOut, switchMyRole } from '@/services/auth';
import { fireLocalTest } from '@/services/notifications';
import { fetchMyProjects } from '@/services/projects';
import { useAuthStore } from '@/stores/auth';
import { lightTheme } from '@/theme/light';
import type { ProjectStatus } from '@/theme/tokens';

export default function JobsScreen() {
  const t = lightTheme;
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['my-projects', profile?.id],
    queryFn: fetchMyProjects,
    enabled: !!profile && profile.role === 'tradesman',
  });

  // If the role flipped to customer (e.g. via the dev switch), bounce out.
  // All hooks above this line so React's hook ordering stays stable.
  if (profile && profile.role !== 'tradesman') {
    return <Redirect href="/" />;
  }

  function onMenu() {
    Alert.alert('Menu', undefined, [
      {
        text: 'Switch to customer view (dev)',
        onPress: async () => {
          try {
            await switchMyRole();
            await refreshProfile();
          } catch (e) {
            Alert.alert('Failed', (e as Error).message);
          }
        },
      },
      {
        text: 'Send test notification (dev)',
        onPress: () => fireLocalTest(),
      },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => signOut(),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['top']}>
      <View style={styles.navBar}>
        <Pressable onPress={onMenu} hitSlop={12} style={styles.navIconBox}>
          <Text style={{ fontSize: 22, color: t.colors.text.primary }}>≡</Text>
        </Pressable>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>Jobs</Text>
        <View style={styles.navIconBox} />
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

      {!isLoading && !error && (
        <ScrollView
          contentContainerStyle={{ padding: t.space[5], gap: t.space[3], paddingBottom: t.space[16] }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
          {(data ?? []).length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: t.space[12] }}>
              <Text style={[t.type.title2, { color: t.colors.text.primary, textAlign: 'center' }]}>
                No jobs yet
              </Text>
              <Text
                style={[
                  t.type.body,
                  {
                    color: t.colors.text.secondary,
                    textAlign: 'center',
                    marginTop: 8,
                    maxWidth: 280,
                  },
                ]}
              >
                Create your first project to get started.
              </Text>
            </View>
          ) : (
            (data ?? []).map((p) => (
              <Card key={p.id} onPress={() => router.push({ pathname: '/project/[id]', params: { id: p.id } })}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, paddingRight: t.space[3] }}>
                    <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]} numberOfLines={1}>
                      {p.title}
                    </Text>
                    <Text
                      style={[t.type.footnote, { color: t.colors.text.tertiary, marginTop: 2 }]}
                      numberOfLines={1}
                    >
                      {p.pending_customer_name ?? 'Customer joined'} · {p.city ?? '—'}
                    </Text>
                  </View>
                  <StatusBadge status={p.status as ProjectStatus} size="sm" />
                </View>
              </Card>
            ))
          )}

          <View style={{ marginTop: t.space[6] }}>
            <PrimaryButton
              title="Create new project"
              onPress={() => router.push('/(tradesman)/projects/new')}
            />
          </View>
        </ScrollView>
      )}
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
  navIconBox: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
