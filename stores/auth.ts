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
};

type AuthActions = {
  /** Wire up the Supabase listener — call once on app start. Returns an unsubscribe fn. */
  initialise: () => () => void;
  /** Re-fetch profile from DB (after role-select, etc.). */
  refreshProfile: () => Promise<void>;
  /** Mark the welcome screen as having been seen this app session. */
  markWelcomeShown: () => void;
};

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  session: null,
  profile: null,
  initialising: true,
  welcomeShown: false,

  markWelcomeShown: () => set({ welcomeShown: true }),

  initialise: () => {
    // Read current session synchronously from storage, then mark initialising=false.
    void supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session ?? null;
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
      set({ session, profile, initialising: false });
    });

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
