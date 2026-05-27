import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getSignedUrl } from '@/services/media';
import { supabase } from '@/services/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PhotoViewerScreen() {
  const insets = useSafeAreaInsets();
  const { update_id, index } = useLocalSearchParams<{ update_id: string; index?: string }>();
  const initialIndex = Math.max(0, parseInt(index ?? '0', 10) || 0);
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // 1. Fetch media rows for this update (RLS filters to participants only).
  // 2. Resolve signed URLs in parallel (cached 50min).
  const { data: photos, isLoading } = useQuery({
    queryKey: ['photo-viewer', update_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_update_media')
        .select('id, storage_path, sort_order')
        .eq('update_id', update_id!)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      const rows = data ?? [];
      const urls = await Promise.all(rows.map((r) => getSignedUrl(r.storage_path)));
      return rows.map((r, i) => ({ id: r.id, url: urls[i] }));
    },
    enabled: !!update_id,
    staleTime: 50 * 60 * 1000,
  });

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x;
    setCurrentIndex(Math.round(x / SCREEN_WIDTH));
  }

  return (
    <View style={styles.root}>
      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color="#FFFFFF" />
        </View>
      )}

      {photos && photos.length > 0 && (
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          contentOffset={{ x: initialIndex * SCREEN_WIDTH, y: 0 }}
        >
          {photos.map((p) => (
            <Pressable key={p.id} style={styles.page} onPress={() => router.back()}>
              <Image source={{ uri: p.url }} style={styles.image} contentFit="contain" />
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Close button — top right, above the safe area inset */}
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        style={[styles.closeBtn, { top: insets.top + 8 }]}
      >
        <Text style={styles.closeText}>×</Text>
      </Pressable>

      {/* Counter — top center */}
      {photos && photos.length > 1 && (
        <View style={[styles.counter, { top: insets.top + 14 }]} pointerEvents="none">
          <Text style={styles.counterText}>
            {currentIndex + 1} / {photos.length}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  page: { width: SCREEN_WIDTH, height: '100%' },
  image: { flex: 1 },
  closeBtn: {
    position: 'absolute',
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '300',
  },
  counter: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  counterText: { color: '#FFFFFF', fontSize: 13, fontWeight: '500' },
});
