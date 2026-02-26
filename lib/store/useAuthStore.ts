import { create } from "zustand";
import { supabase } from "@/lib/supabase/client";
import type { User as MiniUser } from "@supabase/supabase-js";
import { Membership } from "@/features/db-ts/objects";
import { devtools, persist } from "zustand/middleware";

interface AuthState {
  user: MiniUser | null;
  full_name: string | null;
  avatar_url: string | null;
  memberships: Partial<Membership>[];
  currentMembershipId: string | null;
  loading: boolean;
  initialized: boolean;

  getCurrentMembership: () => Partial<Membership> | null;
  isCurrentMemberStaff: () => boolean;

  initialize: () => () => void;
  setUser: (user: MiniUser | null) => void;
  setMemberships: (memberships: Partial<Membership>[]) => void;
  setCurrentMembershipId: (id: string | null) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        full_name: null,
        avatar_url: null,
        memberships: [],
        currentMembershipId: null,
        loading: true,
        initialized: false,

        getCurrentMembership: () => {
          const { memberships, currentMembershipId } = get();
          if (memberships.length === 0) return null;
          // Return found membership or fall back to the first one
          return memberships.find((m) => m.id === currentMembershipId) || memberships[0];
        },
        isCurrentMemberStaff: () => {
          return get().getCurrentMembership()?.member_role !== "student";
        },

        setUser: (user) => set({ user }),
        setMemberships: (memberships) => set({ memberships }),
        setCurrentMembershipId: (id) => set({ currentMembershipId: id }),

        initialize: () => {
          if (get().initialized) return () => {};

          const fetchUserData = async (userId: string) => {
            set({ loading: true });

            console.log(userId);
            const { data, error } = await supabase
              .from("profiles")
              .select(
                `full_name, avatar_url, memberships(
              id, organization_id, member_role, on_free_trial, status, subscribed_upto, 
              organization:organizations!inner(*)
              )`,
              )
              .eq("id", userId)
              .single();

            const savedId = get().currentMembershipId;
            const newId =
              savedId && data?.memberships.some((m) => m.id === savedId)
                ? savedId
                : data?.memberships[0]?.id || null;

            set({
              full_name: data?.full_name || null,
              avatar_url: data?.avatar_url || null,
              currentMembershipId: newId,
              memberships:
                (data?.memberships as unknown as Partial<Membership>[]) || [],
              initialized: true,
            });

            if (error) {
              console.error("Error fetching user data:", error);
            }
            set({ loading: false });
          };

          // 1. Get Initial Session
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
              set({ user: session?.user || null });
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
                set({ memberships: [], loading: false, currentMembershipId: null });
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
      }),
      {
        name: "aceverse-membership-storage",
        // This is the "Surgical" part:
        partialize: (state) => ({ currentMembershipId: state.currentMembershipId }),
      },
    ),
    { name: "AceVerse-Auth" },
  ),
);
