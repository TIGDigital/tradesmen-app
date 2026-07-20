import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRealtimeSnags } from '@/hooks/useRealtimeSnags';
import { getSignedUrl } from '@/services/media';
import { relativeTime } from '@/services/projects';
import { fetchProjectSnags, type SnagStatus } from '@/services/snags';
import { lightTheme } from '@/theme/light';

/**
 * Snag list for a project. Both parties can see every snag here; create
 * via the + in the nav bar. Resolution flow ships in Sprint 33.
 */
export default function SnagsScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  useRealtimeSnags(id ?? null);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['snags', id],
    queryFn: () => fetchProjectSnags(id!),
    enabled: !!id,
  });

  const items = data ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['bottom']}>
      <View style={[styles.navBar, { paddingTop: insets.top, height: 44 + insets.top }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[t.type.bodyLg, { color: t.colors.text.link }]}>Done</Text>
        </Pressable>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
          Snags
        </Text>
        <Pressable
          onPress={() =>
            router.push({ pathname: '/project/[id]/snags/new', params: { id: id! } })
          }
          hitSlop={12}
          accessibilityLabel="Flag a snag"
        >
          <Ionicons name="add-circle" size={28} color={t.colors.text.link} />
        </Pressable>
      </View>

      {isLoading && (
        <View style={{ padding: t.space[5], gap: t.space[3] }}>
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <Skeleton width="60%" height={18} />
              <View style={{ height: 6 }} />
              <Skeleton width="40%" height={14} />
              <View style={{ height: 12 }} />
              <Skeleton width="100%" height={80} borderRadius={8} />
            </Card>
          ))}
        </View>
      )}

      {error && (
        <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />
      )}

      {!isLoading && !error && items.length === 0 && (
        <ErrorState
          tone="empty"
          title="No snags flagged"
          message="Tap the + above to log an issue — the other party gets notified."
        />
      )}

      {items.length > 0 && (
        <ScrollView
          contentContainerStyle={{ padding: t.space[5], gap: t.space[3] }}
          refreshControl={<RefreshControl tintColor={t.colors.brand.primary} refreshing={isRefetching} onRefresh={refetch} />}
        >
          {items.map((s) => (
            <Card key={s.id}>
              <Pressable
                onPress={() => router.push({ pathname: '/snag/[id]', params: { id: s.id } })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}
                      numberOfLines={2}
                    >
                      {s.title}
                    </Text>
                    {s.location_hint && (
                      <Text style={[t.type.footnote, { color: t.colors.text.secondary, marginTop: 2 }]}>
                        📍 {s.location_hint}
                      </Text>
                    )}
                    <Text style={[t.type.footnote, { color: t.colors.text.tertiary, marginTop: 4 }]}>
                      {s.reporter?.full_name ?? 'Someone'} · {relativeTime(s.created_at)}
                      {s.status === 'resolved' && s.confirmed_at ? ' · ✓ signed off' : ''}
                    </Text>
                  </View>
                  <StatusPill status={s.status} />
                </View>
                {s.description && (
                  <Text
                    style={[t.type.body, { color: t.colors.text.primary, marginTop: 10 }]}
                    numberOfLines={4}
                  >
                    {s.description}
                  </Text>
                )}
                {s.photos.length > 0 && (
                  <View style={{ marginTop: 10 }}>
                    <SnagPhotoStrip photos={s.photos.filter((p) => p.kind !== 'resolution')} />
                  </View>
                )}
              </Pressable>
            </Card>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function StatusPill({ status }: { status: SnagStatus }) {
  const t = lightTheme;
  const { bg, fg, label } =
    status === 'resolved'
      ? { bg: '#E2F5EA', fg: '#197A4D', label: 'Resolved' }
      : status === 'in_progress'
        ? { bg: '#FFF3D6', fg: '#8A5A00', label: 'In progress' }
        : { bg: '#FCEAE7', fg: '#C0392B', label: 'Open' };
  return (
    <View
      style={{
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: bg,
      }}
    >
      <Text style={[t.type.footnote, { color: fg, fontWeight: '600' }]}>{label}</Text>
    </View>
  );
}

function SnagPhotoStrip({ photos }: { photos: { id: string; storage_path: string; sort_order: number }[] }) {
  const ordered = [...photos].sort((a, b) => a.sort_order - b.sort_order);
  const paths = ordered.map((p) => p.storage_path);
  const { data: urls } = useQuery({
    queryKey: ['snag-photo-urls', paths.join('|')],
    queryFn: () => Promise.all(paths.map((p) => getSignedUrl(p))),
    enabled: paths.length > 0,
    staleTime: 50 * 60 * 1000,
  });
  if (paths.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
      {ordered.map((p, i) => {
        const uri = urls?.[i];
        return (
          <View
            key={p.id}
            style={{ width: 92, height: 92, borderRadius: 8, overflow: 'hidden', backgroundColor: '#EEE' }}
          >
            {uri && <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />}
          </View>
        );
      })}
    </ScrollView>
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
