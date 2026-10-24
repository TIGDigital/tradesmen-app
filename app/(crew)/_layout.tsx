import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Tabs } from 'expo-router';

import { fetchUnreadMessageCount } from '@/services/messages';
import { fetchUnreadNotificationCount } from '@/services/notifications';
import { lightTheme } from '@/theme/light';

/**
 * Crew tab bar: Today / Messages / Activity / Account. The dedicated
 * shell for apprentices + helpers (persona plan, section B) — no project
 * creation, no money, no crew management. Badge queries share keys with
 * the tradesman shell so one fetch serves whichever shell is mounted.
 */
export default function CrewLayout() {
  const t = lightTheme;
  const { data: unreadMessages = 0 } = useQuery({
    queryKey: ['unread-messages'],
    queryFn: fetchUnreadMessageCount,
    refetchInterval: 30_000,
  });
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
        tabBarLabelStyle: {
          fontFamily: 'GeistMono_500Medium',
          fontSize: 10,
          letterSpacing: 0.9,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sunny-outline" color={color} size={size} />
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
          title: 'Activity',
          tabBarBadge: unreadNotifications > 0 ? unreadNotifications : undefined,
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
