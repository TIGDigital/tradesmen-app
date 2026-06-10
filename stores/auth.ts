import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { getMyProfile } from '@/services/auth';
import { registerForPush } from '@/services/notifications';
import { supabase } from '@/services/supabase';
import type { Database } from '@/types/db';

type Profile = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'role' | 'full_name' | 'avatar_url' | 'email'
>;

/** Bumped if we ship a re-designed tour and want to re-show it to all users. */
const TOUR_SEEN_KEY = 'phase.tour.seen.v1';

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  /** True until the first auth state has been resolved (signed-in or out). */
  initialising: boolean;
  /**
   * True after the welcome / promise screen has been tapped through once
   * this app session. Used by AuthGate to land cold-launch users on the
   * welcome screen first, then route them onwards. In-memory only —
   * every cold app launch resets it to false.
   */
  welcomeShown: boolean;
  /**
   * Has the user already swiped through (or skipped) the Phase tour?
   * Persisted to AsyncStorage so the tutorial appears once per device.
   * `null` while still loading from disk — AuthGate treats null as "don't
   * route yet" to avoid a flash of the tour on cold launch.
   */
  tourSeen: boolean | null;
};

type AuthActions = {
  /** Wire up the Supabase listener — call once on app start. Returns an unsubscribe fn. */
  initialise: () => () => void;
  /** Re-fetch profile from DB (after role-select, etc.). */
  refreshProfile: () => Promise<void>;
  /** Mark the welcome screen as having been seen this app session. */
  markWelcomeShown: () => void;
  /** Mark the tour as seen — persists to AsyncStorage so it doesn't re-show. */
  markTourSeen: () => Promise<void>;
  /** Reset the tour-seen flag (used by Settings → "See the tour again"). */
  resetTourSeen: () => Promise<void>;
};

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  session: null,
  profile: null,
  initialising: true,
  welcomeShown: false,
  tourSeen: null,

  markWelcomeShown: () => set({ welcomeShown: true }),
  markTourSeen: async () => {
    await AsyncStorage.setItem(TOUR_SEEN_KEY, 'true');
    set({ tourSeen: true });
  },
  resetTourSeen: async () => {
    await AsyncStorage.removeItem(TOUR_SEEN_KEY);
    set({ tourSeen: false });
  },

  initialise: () => {
    // Read current session + tour flag in parallel.
    void (async () => {
      const [sessionResult, tourSeenStr] = await Promise.all([
        supabase.auth.getSession(),
        AsyncStorage.getItem(TOUR_SEEN_KEY),
      ]);
      const session = sessionResult.data.session ?? null;
      let profile: Profile | null = null;
      if (session) {
        try {
          profile = await getMyProfile();
        } catch (e) {
          // Profile might not exist yet (race with trigger). That's OK.
          profile = null;
        }
        // Fire-and-forget push registration. Failures don't block sign-in.
        void registerForPush();
      }
      set({
        session,
        profile,
        initialising: false,
        tourSeen: tourSeenStr === 'true',
      });
    })();

    // Subscribe to changes from then on.
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      let profile: Profile | null = null;
      if (session) {
        try { profile = await getMyProfile(); } catch { profile = null; }
        if (event === 'SIGNED_IN') void registerForPush();
      }
      set({ session, profile });
    });

    return () => sub.subscription.unsubscribe();
  },

  refreshProfile: async () => {
    if (!get().session) return;
    try {
      const profile = await getMyProfile();
      set({ profile });
    } catch {
      // ignore
    }
  },
}));
