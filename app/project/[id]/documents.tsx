import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Alert,
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
import {
  listProjectDocuments,
  pickDocument,
  uploadDocument,
} from '@/services/documents';
import { relativeTime } from '@/services/projects';
import { lightTheme } from '@/theme/light';

/**
 * Documents list for a project. Tradesman + customer can upload PDFs or
 * images (quote, certificate, plan, invoice). The in-app viewer ships in
 * Sprint 31 — for now, tap a row to confirm it loaded and let the user
 * know preview is coming.
 */
export default function DocumentsScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['documents', id],
    queryFn: () => listProjectDocuments(id!),
    enabled: !!id,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const asset = await pickDocument();
      if (!asset) return null; // user cancelled
      return uploadDocument({ project_id: id!, asset });
    },
    onSuccess: (row) => {
      if (row) queryClient.invalidateQueries({ queryKey: ['documents', id] });
    },
    onError: (e) => Alert.alert("Couldn't upload", (e as Error).message),
  });

  const items = data ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['bottom']}>
      <View style={[styles.navBar, { paddingTop: insets.top, height: 44 + insets.top }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[t.type.bodyLg, { color: t.colors.text.link }]}>Done</Text>
        </Pressable>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
          Documents
        </Text>
        <Pressable
          onPress={() => uploadMutation.mutate()}
          hitSlop={12}
          disabled={uploadMutation.isPending}
          accessibilityLabel="Upload a document"
        >
          <Ionicons
            name="add-circle"
            size={28}
            color={uploadMutation.isPending ? t.colors.text.tertiary : t.colors.text.link}
          />
        </Pressable>
      </View>

      {isLoading && (
        <View style={{ padding: t.space[5], gap: t.space[3] }}>
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <Skeleton width={40} height={40} borderRadius={8} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Skeleton width="65%" height={16} />
                  <Skeleton width="40%" height={12} />
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}

      {error && (
        <ErrorState
          message={(error as Error).message}
          onRetry={() => void refetch()}
        />
      )}

      {!isLoading && !error && items.length === 0 && (
        <View style={{ flex: 1 }}>
          <ErrorState
            tone="empty"
            title="No documents yet"
            message="Tap the + above to share a PDF or image with the other party."
          />
        </View>
      )}

      {items.length > 0 && (
        <ScrollView
          contentContainerStyle={{ padding: t.space[5], gap: t.space[3] }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
          {items.map((d) => {
            const isPdf = d.mime_type === 'application/pdf';
            const isImage = d.mime_type.startsWith('image/');
            const iconName: keyof typeof Ionicons.glyphMap = isPdf
              ? 'document-text'
              : isImage
                ? 'image'
                : 'document';
            const iconColor = isPdf ? '#C0392B' : isImage ? '#1F9C56' : t.colors.text.secondary;
            return (
              <Card key={d.id}>
                <Pressable
                  onPress={() =>
                    Alert.alert(
                      d.file_name,
                      'In-app preview ships in the next sprint. For now, the file is safely stored on the project.',
                    )
                  }
                  style={styles.row}
                >
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: t.colors.bg.surface2 },
                    ]}
                  >
                    <Ionicons name={iconName} size={22} color={iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}
                      numberOfLines={1}
                    >
                      {d.file_name}
                    </Text>
                    <Text
                      style={[t.type.footnote, { color: t.colors.text.tertiary, marginTop: 2 }]}
                      numberOfLines={1}
                    >
                      {(d.uploader?.full_name ?? 'Someone')} ·{' '}
                      {relativeTime(d.created_at)} · {formatBytes(d.size_bytes)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={t.colors.text.tertiary} />
                </Pressable>
              </Card>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 44,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
