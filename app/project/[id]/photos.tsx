import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { getSignedUrl } from '@/services/media';
import { fetchProjectUpdates } from '@/services/projects';
import { lightTheme } from '@/theme/light';

type GalleryItem = {
  update_id: string;
  storage_path: string;
  index_within_update: number; // 0-based position within parent update's photos
  created_at: string;
};

/**
 * Photos gallery for a single project. Aggregates every image attachment
 * across every project_update, sorts newest-first, and renders a 3-column
 * grid. Tapping a photo opens the existing fullscreen viewer at the right
 * index within that update.
 *
 * Reuses the cached ['updates', id] query so opening from the project
 * detail is instant — no extra fetch.
 */
export default function PhotosScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width: screenWidth } = useWindowDimensions();

  const updatesQuery = useQuery({
    queryKey: ['updates', id],
    queryFn: () => fetchProjectUpdates(id!),
    enabled: !!id,
  });

  // Flatten every image attachment across every update.
  const items: GalleryItem[] = (updatesQuery.data ?? []).flatMap((u) => {
    const photos = (u.media ?? [])
      .filter((m) => m.media_type !== 'voice')
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order);
    return photos.map((m, idx) => ({
      update_id: u.id,
      storage_path: m.storage_path,
      index_within_update: idx,
      created_at: u.created_at ?? '',
    }));
  });

  const paths = items.map((i) => i.storage_path);
  const urlsQuery = useQuery({
    queryKey: ['gallery-urls', paths.join('|')],
    queryFn: () => Promise.all(paths.map((p) => getSignedUrl(p))),
    enabled: paths.length > 0,
    staleTime: 50 * 60 * 1000,
  });

  // 3-col grid with 4pt gutters and screen-edge padding.
  const PAD = 4;
  const GAP = 2;
  const cellSize = Math.floor((screenWidth - PAD * 2 - GAP * 2) / 3);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['bottom']}>
      <View style={[styles.navBar, { paddingTop: insets.top, height: 44 + insets.top }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[t.type.bodyLg, { color: t.colors.text.link }]}>Done</Text>
        </Pressable>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
          Photos
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {updatesQuery.isLoading && (
        <View style={{ padding: PAD, flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} width={cellSize} height={cellSize} borderRadius={4} />
          ))}
        </View>
      )}

      {updatesQuery.error && (
        <ErrorState
          message={(updatesQuery.error as Error).message}
          onRetry={() => void updatesQuery.refetch()}
        />
      )}

      {!updatesQuery.isLoading && !updatesQuery.error && items.length === 0 && (
        <ErrorState
          tone="empty"
          title="No photos yet"
          message="Photos posted to project updates will appear here."
        />
      )}

      {items.length > 0 && (
        <ScrollView
          contentContainerStyle={{ padding: PAD, gap: GAP, flexDirection: 'row', flexWrap: 'wrap' }}
        >
          {items.map((item, i) => {
            const uri = urlsQuery.data?.[i];
            return (
              <Pressable
                key={`${item.update_id}-${item.index_within_update}`}
                onPress={() =>
                  router.push({
                    pathname: '/photo/[update_id]',
                    params: {
                      update_id: item.update_id,
                      index: String(item.index_within_update),
                    },
                  })
                }
                style={{ width: cellSize, height: cellSize, backgroundColor: t.colors.bg.surface2 }}
              >
                {uri ? (
                  <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                ) : (
                  // Per-cell skeleton while signed URLs resolve.
                  <Skeleton width={cellSize} height={cellSize} borderRadius={0} />
                )}
              </Pressable>
            );
          })}
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
});
