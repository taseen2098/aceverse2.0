import { create } from "zustand";
import { supabase } from "@/lib/supabase/client";
import type { User as MiniUser } from "@supabase/supabase-js";
import { Membership } from "@/features/db-ts/objects";

interface AuthState {
  user: MiniUser | null;
  memberships: Membership[];
  currentMembershipId: string | null;
  loading: boolean;
  initialized: boolean;

  initialize: () => () => void;
  setUser: (user: MiniUser | null) => void;
  setMemberships: (memberships: Membership[]) => void;
  setCurrentMembershipId: (id: string | null) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  memberships: [],
  currentMembershipId: null,
  loading: true,
  initialized: false,

  setUser: (user) => set({ user }),
  setMemberships: (memberships) => set({ memberships }),
  setCurrentMembershipId: (id) => set({ currentMembershipId: id }),

  initialize: () => {
    if (get().initialized) return () => {};

    const fetchUserData = async (userId: string) => {
      set({ loading: true });

      // Parallel fetch for profile and memberships
      const { data, error } = await supabase
        .from("memberships")
        .select("*, organization:organizations(*)")
        .eq("user_id", userId);
      set({
        memberships: (data as Membership[]) || [],
        loading: false,
      });
      console.error("Error fetching user data:", error);
      set({ loading: false });
    };

    // 1. Get Initial Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ user: session?.user || null, initialized: true });
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        set({ memberships: [], loading: false });
      }
    });

    // 2. Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = get().user;
      const newUser = session?.user || null;

      // Only refetch if user changed or logged in
      if (newUser?.id !== currentUser?.id) {
        set({ user: newUser });
        if (newUser) {
          fetchUserData(newUser.id);
        } else {
          set({ memberships: [], loading: false });
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, memberships: [], loading: false });
  },
}));
