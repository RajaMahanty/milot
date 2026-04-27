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
  startSprint: (data: Omit<Sprint, 'id' | 'projectId' | 'uid' | 'status' | 'createdAt'>) => Promise<void>;
  updateSprint: (id: string, updates: Partial<Sprint>) => Promise<void>;
  completeActiveSprint: () => Promise<void>;
}

export const useSprintStore = create<SprintState>((set, get) => ({
  sprints: [],
  activeSprintId: null,
  isLoading: false,
  error: null,

  fetchSprints: async () => {
    const activeProjectId = useProjectStore.getState().activeProjectId;
    if (!activeProjectId) {
      set({ sprints: [], activeSprintId: null });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const fetchedSprints = await sprintService.fetchSprints(activeProjectId);
      const activeSprint = fetchedSprints.find(s => s.status === 'active');
      set({ 
        sprints: fetchedSprints, 
        activeSprintId: activeSprint ? activeSprint.id : null,
        isLoading: false 
      });
    } catch (err: any) {
      console.error(err);
      set({ error: err.message, isLoading: false });
    }
  },

  startSprint: async (data) => {
    const user = useAuthStore.getState().user;
    const activeProjectId = useProjectStore.getState().activeProjectId;
    
    if (!user || !activeProjectId) return;

    // Check if there is already an active sprint
    if (get().activeSprintId) {
      toast.warning("An active sprint already exists.");
      return;
    }


    const newSprint: Sprint = {
      ...data,
      id: crypto.randomUUID(),
      projectId: activeProjectId,
      uid: user.uid,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    set({ isLoading: true });
    try {
      await sprintService.createSprint(newSprint);
      set((state) => ({
        sprints: [newSprint, ...state.sprints],
        activeSprintId: newSprint.id,
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
      set((state) => ({
        sprints: state.sprints.map(s => s.id === id ? { ...s, ...updates } : s),
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
