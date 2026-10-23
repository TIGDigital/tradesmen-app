import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Tabs } from 'expo-router';

import { fetchUnreadMessageCount } from '@/services/messages';
import { fetchUnreadNotificationCount } from '@/services/notifications';
import { lightTheme } from '@/theme/light';

/**
 * Customer tab bar: Project / Updates / Messages / Account.
 * Matches the prototype's bottom-nav model.
 */
export default function CustomerLayout() {
  const t = lightTheme;
  // Unread chat badge on the Messages tab; same query key as the home-feed
  // banner so one fetch serves both (beta feedback 16 Oct).
  const { data: unreadMessages = 0 } = useQuery({
    queryKey: ['unread-messages'],
    queryFn: fetchUnreadMessageCount,
    refetchInterval: 30_000,
  });
  // Same cadence for the inbox badge (snag/quote/price notifications were
  // landing silently — beta feedback 23 Oct).
  const { data: unreadNotifications = 0 } = useQuery({
    queryKey: ['unread-notifications'],
    queryFn: fetchUnreadNotificationCount,
    refetchInterval: 30_000,
  });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.colors.brand.primary,
        tabBarInactiveTintColor: t.colors.text.tertiary,
        tabBarStyle: {
          borderTopColor: t.colors.border.subtle,
          borderTopWidth: 1,
          backgroundColor: t.colors.bg.canvas,
        },
        // Phase DS labels: Geist Mono uppercase with wide tracking — the
        // "stamped tool name" treatment, sized to fit the tab bar.
        tabBarLabelStyle: {
          fontFamily: 'GeistMono_500Medium',
          fontSize: 10,
          letterSpacing: 0.9,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Project',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="updates"
        options={{
          title: 'Updates',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarBadge: unreadMessages > 0 ? unreadMessages : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarBadge: unreadNotifications > 0 ? unreadNotifications : undefined,
          title: 'Activity',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
