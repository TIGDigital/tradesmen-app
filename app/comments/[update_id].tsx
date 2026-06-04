import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
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

import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRealtimeComments } from '@/hooks/useRealtimeComments';
import { addComment, fetchComments } from '@/services/comments';
import { relativeTime } from '@/services/projects';
import { lightTheme } from '@/theme/light';

const COMMENT_MAX = 2000;

/**
 * Single update's comment thread. Oldest comments at the top, new ones
 * arrive live via the realtime hook, sticky input at the bottom.
 */
export default function CommentsScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();
  const { update_id } = useLocalSearchParams<{ update_id: string }>();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');

  useRealtimeComments(update_id ?? null);

  const commentsQuery = useQuery({
    queryKey: ['comments', update_id],
    queryFn: () => fetchComments(update_id!),
    enabled: !!update_id,
  });

  const mutation = useMutation({
    mutationFn: () => addComment({ update_id: update_id!, body: draft }),
    onSuccess: async () => {
      setDraft('');
      // Bump both the thread query AND the parent updates list so the
      // "💬 N" count on the feed card stays in sync. We don't know which
      // project this update belongs to from here, so blanket-invalidate.
      await queryClient.invalidateQueries({ queryKey: ['comments', update_id] });
      await queryClient.invalidateQueries({ queryKey: ['updates'] });
      await queryClient.invalidateQueries({ queryKey: ['my-current-project'] });
    },
    onError: (e) => Alert.alert("Couldn't send", (e as Error).message),
  });

  const comments = commentsQuery.data ?? [];
  const canSend = draft.trim().length > 0 && !mutation.isPending;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['bottom']}>
      <View style={[styles.navBar, { paddingTop: insets.top, height: 44 + insets.top }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[t.type.bodyLg, { color: t.colors.text.link }]}>Done</Text>
        </Pressable>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
          Comments
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 44}
      >
        {commentsQuery.isLoading && (
          <View style={{ padding: t.space[5], gap: t.space[3] }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <Skeleton width={32} height={32} borderRadius={999} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Skeleton width="40%" height={12} />
                  <Skeleton width="90%" height={14} />
                  <Skeleton width="60%" height={14} />
                </View>
              </View>
            ))}
          </View>
        )}

        {commentsQuery.error && (
          <ErrorState
            message={(commentsQuery.error as Error).message}
            onRetry={() => void commentsQuery.refetch()}
          />
        )}

        {!commentsQuery.isLoading && !commentsQuery.error && comments.length === 0 && (
          <ErrorState
            tone="empty"
            title="Be the first to comment"
            message="Comments will land here and notify everyone on the project."
          />
        )}

        {comments.length > 0 && (
          <ScrollView
            contentContainerStyle={{ padding: t.space[5], gap: t.space[4] }}
            keyboardShouldPersistTaps="handled"
          >
            {comments.map((c) => {
              const initial = (c.author?.full_name ?? '?')[0]?.toUpperCase() ?? '?';
              return (
                <View key={c.id} style={styles.row}>
                  <View style={[styles.avatar, { backgroundColor: t.colors.bg.surface2 }]}>
                    {c.author?.avatar_url ? (
                      <Image
                        source={{ uri: c.author.avatar_url }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                      />
                    ) : (
                      <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.secondary }]}>
                        {initial}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
                        {c.author?.full_name ?? 'Someone'}
                      </Text>
                      <Text style={[t.type.footnote, { color: t.colors.text.tertiary }]}>
                        {relativeTime(c.created_at)}
                      </Text>
                    </View>
                    <Text
                      style={[t.type.body, { color: t.colors.text.primary, marginTop: 2 }]}
                    >
                      {c.body}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Sticky composer */}
        <View
          style={[
            styles.composerWrap,
            { borderTopColor: t.colors.border.subtle, backgroundColor: t.colors.bg.canvas },
          ]}
        >
          <TextInput
            value={draft}
            onChangeText={(v) => v.length <= COMMENT_MAX && setDraft(v)}
            placeholder="Add a comment…"
            placeholderTextColor={t.colors.text.tertiary}
            multiline
            style={[
              t.type.body,
              {
                flex: 1,
                color: t.colors.text.primary,
                maxHeight: 100,
                paddingVertical: 8,
              },
            ]}
          />
          <Pressable
            onPress={() => mutation.mutate()}
            disabled={!canSend}
            style={[
              styles.sendBtn,
              {
                backgroundColor: canSend ? t.colors.brand.primary : t.colors.bg.surface2,
              },
            ]}
            hitSlop={6}
          >
            <Text
              style={[
                t.type.bodyLgEmphasis,
                { color: canSend ? t.colors.text.inverse : t.colors.text.tertiary },
              ]}
            >
              Send
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  composerWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
  },
  sendBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
