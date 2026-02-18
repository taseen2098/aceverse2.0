import { create } from 'zustand';
import { OrgRealtimeManager } from '@/lib/logic/OrgRealtimeManager';

interface OrgRealtimeState {
  manager: OrgRealtimeManager | null;
  
  // Actions
  connect: (orgId: string) => void;
  disconnect: () => void;
  getManager: () => OrgRealtimeManager | null;
}

export const useOrgRealtimeStore = create<OrgRealtimeState>((set, get) => ({
  manager: null,

  connect: (orgId) => {
    const { manager } = get();

    if (manager) {
        console.log(`RealtimeStore: Manager already connected for Org ${orgId}`);
        return;
    }

    console.log(`RealtimeStore: Initializing Manager for Org ${orgId}`);
    const newManager = new OrgRealtimeManager(orgId);
    newManager.connect();
    set({ manager: newManager });
  },

  disconnect: () => {
    const { manager } = get();

    if (!manager) return;

    console.log(`RealtimeStore: Disconnecting manager for Org ${manager.getOrgId()}`);
    manager.disconnect();
    set({ manager: null });
  },

  getManager: () => get().manager || null,
}));
