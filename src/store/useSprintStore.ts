import { create } from 'zustand';
import { sprintService, Sprint } from '@/lib/sprintService';
import { useAuthStore } from './useAuthStore';
import { useProjectStore } from './useProjectStore';
import { toast } from './useToastStore';


interface SprintState {
  sprints: Sprint[];
  activeSprintId: string | null;
  isLoading: boolean;
  error: string | null;
  
  fetchSprints: () => Promise<void>;
  createSprint: (data: Omit<Sprint, 'id' | 'projectId' | 'uid' | 'status' | 'createdAt'>) => Promise<void>;
  updateSprint: (id: string, updates: Partial<Sprint>) => Promise<void>;
  activateSprint: (id: string) => Promise<void>;
  completeActiveSprint: () => Promise<void>;
  
  // Pagination
  lastVisible: any | null;
  hasMore: boolean;
  fetchMoreSprints: () => Promise<void>;
}

export const useSprintStore = create<SprintState>((set, get) => ({
  sprints: [],
  activeSprintId: null,
  isLoading: false,
  error: null,
  
  lastVisible: null,
  hasMore: true,

  fetchSprints: async () => {
    const user = useAuthStore.getState().user;
    const activeProjectId = useProjectStore.getState().activeProjectId;
    if (!user || !activeProjectId) {
      set({ sprints: [], activeSprintId: null });
      return;
    }

    set({ isLoading: true, error: null, lastVisible: null, hasMore: true });
    try {
      const { sprints: fetchedSprints, lastVisible: lastDoc } = await sprintService.fetchSprints(user.uid, activeProjectId, 50);
      const activeSprint = fetchedSprints.find(s => s.status === 'active');
      set({ 
        sprints: fetchedSprints, 
        activeSprintId: activeSprint ? activeSprint.id : null,
        isLoading: false,
        lastVisible: lastDoc,
        hasMore: !!lastDoc
      });
    } catch (err: any) {
      console.error(err);
      set({ error: err.message, isLoading: false });
    }
  },

  fetchMoreSprints: async () => {
    const { lastVisible, hasMore, isLoading, sprints } = get();
    if (!hasMore || isLoading || !lastVisible) return;

    const user = useAuthStore.getState().user;
    const activeProjectId = useProjectStore.getState().activeProjectId;

    if (!user || !activeProjectId) return;

    set({ isLoading: true });
    try {
      const { sprints: fetchedSprints, lastVisible: lastDoc } = await sprintService.fetchSprints(user.uid, activeProjectId, 20, lastVisible);
      
      set({ 
        sprints: [...sprints, ...fetchedSprints],
        isLoading: false,
        lastVisible: lastDoc,
        hasMore: !!lastDoc
      });
    } catch (err: any) {
      console.error(err);
      set({ isLoading: false });
    }
  },

  createSprint: async (data) => {
    const user = useAuthStore.getState().user;
    const activeProjectId = useProjectStore.getState().activeProjectId;
    
    if (!user || (!activeProjectId || activeProjectId === "all")) {
      toast.warning("Please select a specific project first.");
      return;
    }

    const newSprint: Sprint = {
      ...data,
      id: crypto.randomUUID(),
      projectId: activeProjectId,
      uid: user.uid,
      status: 'planned',
      createdAt: new Date().toISOString()
    };

    set({ isLoading: true });
    try {
      await sprintService.createSprint(newSprint);
      set((state) => ({
        sprints: [newSprint, ...state.sprints],
        isLoading: false
      }));
    } catch (err: any) {
      console.error(err);
      set({ error: err.message, isLoading: false });
    }
  },

  updateSprint: async (id, updates) => {
    set({ isLoading: true });
    try {
      await sprintService.updateSprint(id, updates);
      set((state) => {
        const updatedSprints = state.sprints.map(s => s.id === id ? { ...s, ...updates } : s);
        const activeSprint = updatedSprints.find(s => s.status === 'active');
        return {
          sprints: updatedSprints,
          activeSprintId: activeSprint ? activeSprint.id : null,
          isLoading: false
        };
      });
    } catch (err: any) {
      console.error(err);
      set({ error: err.message, isLoading: false });
    }
  },

  activateSprint: async (id) => {
    set({ isLoading: true });
    try {
      await sprintService.updateSprint(id, { status: 'active' });
      set((state) => ({
        sprints: state.sprints.map(s => s.id === id ? { ...s, status: 'active' } : s),
        activeSprintId: id,
        isLoading: false
      }));
    } catch (err: any) {
      console.error(err);
      set({ error: err.message, isLoading: false });
    }
  },

  completeActiveSprint: async () => {
    const { activeSprintId } = get();
    if (!activeSprintId) return;

    set({ isLoading: true });
    try {
      await sprintService.updateSprint(activeSprintId, { status: 'completed' });
      set((state) => ({
        sprints: state.sprints.map(s => s.id === activeSprintId ? { ...s, status: 'completed' } : s),
        activeSprintId: null,
        isLoading: false
      }));
    } catch (err: any) {
      console.error(err);
      set({ error: err.message, isLoading: false });
    }
  }
}));
