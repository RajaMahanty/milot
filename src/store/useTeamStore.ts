import { create } from 'zustand';
import { teamService, Team } from '@/lib/teamService';
import { useAuthStore } from './useAuthStore';
import { toast } from './useToastStore';

interface TeamState {
  teams: Team[];
  isLoading: boolean;
  error: string | null;
  
  fetchTeams: () => Promise<void>;
  createTeam: (name: string) => Promise<void>;
  updateTeam: (id: string, updates: Partial<Team>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  addMemberToTeam: (teamId: string, uid: string) => Promise<void>;
  removeMemberFromTeam: (teamId: string, uid: string) => Promise<void>;
}

export const useTeamStore = create<TeamState>((set, get) => ({
  teams: [],
  isLoading: false,
  error: null,

  fetchTeams: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    set({ isLoading: true, error: null });
    try {
      const dbTeams = await teamService.fetchUserTeams(user.uid);
      set({ teams: dbTeams, isLoading: false });
    } catch (err: any) {
      console.error(err);
      set({ error: err.message, isLoading: false });
    }
  },

  createTeam: async (name) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const newTeam: Team = {
      id: crypto.randomUUID(),
      name,
      ownerId: user.uid,
      memberIds: [user.uid],
      createdAt: new Date().toISOString()
    };

    set(state => ({ teams: [newTeam, ...state.teams], isLoading: true }));
    try {
      await teamService.createTeam(newTeam);
      set({ isLoading: false });
      toast.success(`Team "${name}" created!`);
    } catch (err: any) {
      console.error(err);
      set(state => ({ 
        teams: state.teams.filter(t => t.id !== newTeam.id),
        isLoading: false,
        error: err.message 
      }));
      toast.error("Failed to create team.");
    }
  },

  updateTeam: async (id, updates) => {
    set(state => ({
      teams: state.teams.map(t => t.id === id ? { ...t, ...updates } : t)
    }));
    try {
      await teamService.updateTeam(id, updates);
    } catch (err: any) {
      console.error(err);
    }
  },

  deleteTeam: async (id) => {
    const prevTeams = [...get().teams];
    set(state => ({ teams: state.teams.filter(t => t.id !== id) }));
    try {
      await teamService.deleteTeam(id);
      toast.success("Team deleted.");
    } catch (err: any) {
      console.error(err);
      set({ teams: prevTeams });
      toast.error("Failed to delete team.");
    }
  },

  addMemberToTeam: async (teamId, uid) => {
    try {
      await teamService.addMember(teamId, uid);
      set(state => ({
        teams: state.teams.map(t => t.id === teamId ? { ...t, memberIds: [...t.memberIds, uid] } : t)
      }));
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to add member.");
    }
  },

  removeMemberFromTeam: async (teamId, uid) => {
    try {
      await teamService.removeMember(teamId, uid);
      set(state => ({
        teams: state.teams.map(t => t.id === teamId ? { ...t, memberIds: t.memberIds.filter(id => id !== uid) } : t)
      }));
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to remove member.");
    }
  }
}));
