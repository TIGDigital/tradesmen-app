import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { fetchMessages, type MessageRow, markChatRead, sendMessage } from '@/services/messages';
import { fetchProject } from '@/services/projects';
import { useAuthStore } from '@/stores/auth';
import { lightTheme } from '@/theme/light';

export default function ChatScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const myId = useAuthStore((s) => s.profile?.id);
  const myRole = useAuthStore((s) => s.profile?.role);
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<MessageRow>>(null);

  const projectQuery = useQuery({
    queryKey: ['project', id],
    queryFn: () => fetchProject(id!),
    enabled: !!id,
  });

  const messagesQuery = useQuery({
    queryKey: ['messages', id],
    queryFn: () => fetchMessages(id!),
    enabled: !!id,
  });

  // Live updates from the other party.
  useRealtimeMessages(id ?? null);

  // Mark anything the other party sent as read whenever we open or new arrives.
  useEffect(() => {
    if (!id) return;
    void markChatRead(id);
  }, [id, messagesQuery.data?.length]);

  const sendMutation = useMutation({
    mutationFn: (text: string) => sendMessage(id!, text),
    onMutate: async (text: string) => {
      setDraft(''); // optimistic clear
      const key = ['messages', id];
      const previous = queryClient.getQueryData<MessageRow[]>(key);
      const optimistic: MessageRow = {
        id: `temp-${Date.now()}`,
        project_id: id!,
        sender_id: myId ?? 'me',
        body: text,
        type: 'text',
        created_at: new Date().toISOString(),
        read_at: null,
        sender_role: myRole ?? null,
      };
      queryClient.setQueryData<MessageRow[]>(key, (prev) => [...(prev ?? []), optimistic]);
      return { previous, text };
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['messages', id], ctx.previous);
      if (ctx?.text) setDraft(ctx.text);
      Alert.alert("Couldn't send", (e as Error).message);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['messages', id] }),
  });

  function onSendPress() {
    const text = draft.trim();
    if (!text) return;
    sendMutation.mutate(text);
  }

  // Who's the other party? For the title.
  const project = projectQuery.data;
  const otherName =
    project?.tradesman?.id === myId
      ? project?.customer?.full_name ?? project?.pending_customer_name ?? 'Customer'
      : project?.tradesman?.full_name ?? 'Tradesman';

  const messages = messagesQuery.data ?? [];

  function renderMessage({ item }: { item: MessageRow }) {
    // Prefer role-vs-role match (works in single-account dev where both
    // sides share auth.uid). Fall back to sender_id for legacy rows that
    // were inserted before sender_role existed.
    const isMine = item.sender_role
      ? item.sender_role === myRole
      : item.sender_id === myId;
    return (
      <View
        style={[
          styles.bubble,
          {
            alignSelf: isMine ? 'flex-end' : 'flex-start',
            backgroundColor: isMine ? t.colors.brand.primary : t.colors.bg.surface2,
            borderTopRightRadius: isMine ? 4 : 18,
            borderTopLeftRadius: isMine ? 18 : 4,
          },
        ]}
      >
        <Text
          style={[
            t.type.bodyLg,
            { color: isMine ? t.colors.text.inverse : t.colors.text.primary },
          ]}
        >
          {item.body}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['bottom']}>
      <View style={[styles.navBar, { paddingTop: insets.top, height: 44 + insets.top }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          hitSlop={12}
          style={{ width: 60 }}
        >
          <Text style={[t.type.bodyLg, { color: t.colors.text.link }]}>‹ Back</Text>
        </Pressable>
        <Text
          style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary, flex: 1, textAlign: 'center' }]}
          numberOfLines={1}
        >
          {otherName}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 44}
      >
        {messagesQuery.isLoading && (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        )}

        {!messagesQuery.isLoading && messages.length === 0 && (
          <View style={styles.center}>
            <Text style={[t.type.body, { color: t.colors.text.tertiary, textAlign: 'center' }]}>
              Say hi to {otherName}.
            </Text>
          </View>
        )}

        {messages.length > 0 && (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderMessage}
            contentContainerStyle={{ padding: t.space[4], gap: 8 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Composer */}
        <View
          style={[
            styles.composer,
            {
              borderTopColor: t.colors.border.subtle,
              backgroundColor: t.colors.bg.canvas,
              paddingBottom: insets.bottom > 0 ? 4 : 12,
            },
          ]}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message"
            placeholderTextColor={t.colors.text.tertiary}
            multiline
            style={[
              t.type.bodyLg,
              {
                flex: 1,
                backgroundColor: t.colors.bg.surface2,
                color: t.colors.text.primary,
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 10,
                maxHeight: 120,
                minHeight: 40,
              },
            ]}
          />
          <Pressable
            onPress={onSendPress}
            disabled={!draft.trim() || sendMutation.isPending}
            style={[
              styles.sendBtn,
              {
                backgroundColor: draft.trim()
                  ? t.colors.brand.primary
                  : t.colors.border.strong,
              },
            ]}
            hitSlop={8}
          >
            <Text style={styles.sendArrow}>↑</Text>
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
    paddingHorizontal: 20,
    height: 44,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  msgRow: { flexDirection: 'row' },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendArrow: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
});
