import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Pressable, Text } from 'react-native';

import { fetchUnreadMessageCount } from '@/services/messages';
import { lightTheme } from '@/theme/light';

/**
 * Compact brand-blue banner shown at the top of the home feed when the
 * signed-in user has unread chat messages. Renders nothing at zero. The
 * caller supplies onPress (usually: jump to the Messages tab) because the
 * tab path differs per role group.
 *
 * Shares the ['unread-messages'] query with the tab-bar badge, so both
 * update together and the count is fetched once.
 */
export function UnreadMessagesBanner({ onPress }: { onPress: () => void }) {
  const t = lightTheme;
  const { data: unread = 0 } = useQuery({
    queryKey: ['unread-messages'],
    queryFn: fetchUnreadMessageCount,
    refetchInterval: 30_000,
  });

  if (unread === 0) return null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: t.colors.brand.primary,
        opacity: pressed ? 0.85 : 1,
        borderRadius: t.radius.lg,
        paddingVertical: 12,
        paddingHorizontal: 16,
      })}
    >
      <Ionicons name="chatbubble" size={18} color="#FFFFFF" />
      <Text style={[t.type.bodyLgEmphasis, { color: '#FFFFFF', flex: 1 }]}>
        {unread === 1 ? '1 unread message' : `${unread} unread messages`}
      </Text>
      <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
    </Pressable>
  );
}
