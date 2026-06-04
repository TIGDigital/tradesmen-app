import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/ui/ErrorState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  deleteDocumentEverywhere,
  downloadDocumentToCache,
  fetchDocument,
  getDocumentSignedUrl,
} from '@/services/documents';
import { useAuthStore } from '@/stores/auth';
import { lightTheme } from '@/theme/light';

/**
 * Document viewer.
 *
 * - Images render inline at full screen via expo-image.
 * - PDFs launch in expo-web-browser (SFSafariViewController on iOS) which
 *   renders PDFs natively with native zoom + share + search.
 *
 * The owner (uploader) sees a trash button — confirms then hard-deletes
 * both the storage object and the DB row. Anyone can share via the iOS
 * share sheet; we download to cache first so the share sheet has a real
 * file to hand to other apps.
 */
export default function DocumentViewerScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width: screenWidth } = useWindowDimensions();
  const myId = useAuthStore((s) => s.profile?.id);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<'share' | 'open' | null>(null);

  const docQuery = useQuery({
    queryKey: ['document', id],
    queryFn: () => fetchDocument(id!),
    enabled: !!id,
  });

  const isImage = docQuery.data?.mime_type.startsWith('image/');
  const isPdf = docQuery.data?.mime_type === 'application/pdf';
  const imageUrlQuery = useQuery({
    queryKey: ['document-url', docQuery.data?.storage_path],
    queryFn: () => getDocumentSignedUrl(docQuery.data!.storage_path),
    enabled: !!isImage && !!docQuery.data?.storage_path,
    staleTime: 50 * 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      deleteDocumentEverywhere({
        id: docQuery.data!.id,
        storage_path: docQuery.data!.storage_path,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['documents', docQuery.data?.project_id] });
      router.back();
    },
    onError: (e) => Alert.alert("Couldn't delete", (e as Error).message),
  });

  async function onShare() {
    if (!docQuery.data) return;
    try {
      setBusy('share');
      const localUri = await downloadDocumentToCache(
        docQuery.data.storage_path,
        docQuery.data.file_name,
      );
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Sharing not available on this device');
        return;
      }
      await Sharing.shareAsync(localUri, {
        mimeType: docQuery.data.mime_type,
        dialogTitle: docQuery.data.file_name,
      });
    } catch (e) {
      Alert.alert("Couldn't share", (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function onOpenPdf() {
    if (!docQuery.data) return;
    try {
      setBusy('open');
      const url = await getDocumentSignedUrl(docQuery.data.storage_path);
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      Alert.alert("Couldn't open", (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function onDeletePress() {
    Alert.alert(
      'Delete document?',
      'This removes it from the project for everyone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(),
        },
      ],
    );
  }

  const doc = docQuery.data;
  const isOwner = !!doc && doc.uploader_id === myId;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['bottom']}>
      <View style={[styles.navBar, { paddingTop: insets.top, height: 44 + insets.top }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ width: 60 }}>
          <Text style={[t.type.bodyLg, { color: t.colors.text.link }]}>Done</Text>
        </Pressable>
        <Text
          style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary, flex: 1, textAlign: 'center' }]}
          numberOfLines={1}
        >
          {doc?.file_name ?? 'Document'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 16, width: 60, justifyContent: 'flex-end' }}>
          {doc && (
            <Pressable onPress={onShare} hitSlop={12} disabled={busy === 'share'}>
              <Ionicons
                name="share-outline"
                size={22}
                color={busy === 'share' ? t.colors.text.tertiary : t.colors.text.link}
              />
            </Pressable>
          )}
          {isOwner && (
            <Pressable onPress={onDeletePress} hitSlop={12}>
              <Ionicons name="trash-outline" size={22} color={t.colors.destructive.text} />
            </Pressable>
          )}
        </View>
      </View>

      {docQuery.isLoading && (
        <View style={{ padding: 16 }}>
          <Skeleton width="100%" height={screenWidth} borderRadius={12} />
        </View>
      )}

      {docQuery.error && (
        <ErrorState
          message={(docQuery.error as Error).message}
          onRetry={() => void docQuery.refetch()}
        />
      )}

      {!docQuery.isLoading && !docQuery.error && !doc && (
        <ErrorState tone="empty" title="Document not found" />
      )}

      {doc && isImage && (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {imageUrlQuery.data ? (
            <Image
              source={{ uri: imageUrlQuery.data }}
              style={{ flex: 1 }}
              contentFit="contain"
              transition={150}
            />
          ) : (
            <View style={[styles.center, { backgroundColor: '#000' }]}>
              <ActivityIndicator color="#FFFFFF" />
            </View>
          )}
        </View>
      )}

      {doc && isPdf && (
        <View style={styles.pdfWrap}>
          <View style={[styles.iconCircle, { backgroundColor: t.colors.bg.surface2 }]}>
            <Ionicons name="document-text" size={56} color="#C0392B" />
          </View>
          <Text style={[t.type.title2, { color: t.colors.text.primary, textAlign: 'center', marginTop: 12 }]}>
            {doc.file_name}
          </Text>
          <Text style={[t.type.body, { color: t.colors.text.secondary, textAlign: 'center', marginTop: 8 }]}>
            PDF · {formatBytes(doc.size_bytes)}
          </Text>
          <View style={{ marginTop: 32, alignSelf: 'stretch' }}>
            <PrimaryButton title="Open PDF" onPress={onOpenPdf} loading={busy === 'open'} />
          </View>
          <Text
            style={[t.type.footnote, { color: t.colors.text.tertiary, marginTop: 12, textAlign: 'center' }]}
          >
            Opens in a secure in-app browser.
          </Text>
        </View>
      )}

      {doc && !isImage && !isPdf && (
        <View style={styles.pdfWrap}>
          <Ionicons name="document-outline" size={56} color={t.colors.text.tertiary} />
          <Text style={[t.type.body, { color: t.colors.text.secondary, marginTop: 12, textAlign: 'center' }]}>
            Tap Share to open this file in another app.
          </Text>
        </View>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pdfWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
