import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Redirect, Tabs } from 'expo-router';

import { fetchUnreadMessageCount } from '@/services/messages';
import { fetchUnreadNotificationCount } from '@/services/notifications';
import { useAuthStore } from '@/stores/auth';
import { lightTheme } from '@/theme/light';

/**
 * Tradesman tab bar: Jobs / Messages / Crew / Activity / Account — the
 * LEAD's shell. Crew (role 'apprentice') have their own `(crew)` group;
 * the Redirect below catches any stale link that still points here.
 */
export default function TradesmanLayout() {
  const t = lightTheme;
  const profile = useAuthStore((s) => s.profile);
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

  // Crew never belong in the lead shell — old deep links, the pre-(crew)
  // index redirect, or a cold-start push could still land them here.
  // Placed AFTER the hooks so hook order never changes between renders.
  if (profile?.role === 'apprentice') {
    return <Redirect href="/(crew)/today" />;
  }

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
        name="jobs"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase-outline" color={color} size={size} />
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
        name="crew"
        options={{
          title: 'Crew',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" color={color} size={size} />
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
