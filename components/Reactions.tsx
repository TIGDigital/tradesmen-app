import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type ReactionKind, toggleReaction } from '@/services/reactions';
import { useAuthStore } from '@/stores/auth';
import { lightTheme } from '@/theme/light';

type ReactionRow = { kind: ReactionKind; user_id: string };

type Props = {
  update_id: string;
  project_id: string;
  reactions: ReactionRow[] | null | undefined;
};

const KINDS: { kind: ReactionKind; emoji: string }[] = [
  { kind: 'heart', emoji: '❤️' },
  { kind: 'thumbs_up', emoji: '👍' },
  { kind: 'question', emoji: '❓' },
];

export function Reactions({ update_id, project_id, reactions }: Props) {
  const t = lightTheme;
  const userId = useAuthStore((s) => s.profile?.id);
  const queryClient = useQueryClient();

  const rows = reactions ?? [];
  const myReaction: ReactionKind | null =
    rows.find((r) => r.user_id === userId)?.kind ?? null;

  const counts: Record<ReactionKind, number> = {
    thumbs_up: 0,
    heart: 0,
    question: 0,
  };
  for (const r of rows) counts[r.kind]++;

  const mutation = useMutation({
    mutationFn: (kind: ReactionKind) => toggleReaction(update_id, kind),
    onSuccess: () => {
      // Realtime sub will invalidate too, but we hit it here for immediacy
      // in case the channel is briefly slow.
      void queryClient.invalidateQueries({ queryKey: ['updates', project_id] });
      void queryClient.invalidateQueries({ queryKey: ['my-current-project'] });
    },
  });

  return (
    <View style={[styles.row, { marginTop: 12 }]}>
      {KINDS.map(({ kind, emoji }) => {
        const isMine = myReaction === kind;
        const count = counts[kind];
        return (
          <Pressable
            key={kind}
            onPress={() => mutation.mutate(kind)}
            disabled={mutation.isPending}
            style={({ pressed }) => [
              styles.pill,
              {
                backgroundColor: isMine ? t.colors.brand.tint : t.colors.bg.surface2,
                borderColor: isMine ? t.colors.brand.primary : 'transparent',
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            hitSlop={4}
          >
            <Text style={styles.emoji}>{emoji}</Text>
            {count > 0 && (
              <Text
                style={[
                  t.type.footnote,
                  {
                    color: isMine ? t.colors.brand.primary : t.colors.text.secondary,
                    marginLeft: 4,
                  },
                ]}
              >
                {count}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    minWidth: 44,
    justifyContent: 'center',
  },
  emoji: { fontSize: 16 },
});
