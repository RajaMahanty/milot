import { create } from 'zustand';
import { projectService, Project } from '@/lib/projectService';
import { useAuthStore } from './useAuthStore';
import { useKanbanStore } from './useTaskStore';
import { useBoardStore } from './useBoardStore';

export type { Project };

interface ProjectState {
  projects: Record<string, Project>;
  activeProjectId: string | null;
  isLoading: boolean;
  error: string | null;
  
  fetchProjects: () => Promise<void>;
  createProject: (project: Omit<Project, 'uid' | 'createdAt' | 'id'>) => Promise<void>;
  setActiveProject: (projectId: string | null) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  
  inviteMemberToProject: (projectId: string, uid: string) => Promise<void>;
  assignTeamToProject: (projectId: string, teamId: string) => Promise<void>;
  
  // Pagination
  lastVisible: any | null;
  hasMore: boolean;
  fetchMoreProjects: () => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: {},
  activeProjectId: "all",
  isLoading: false,
  error: null,
  
  lastVisible: null,
  hasMore: true,

  fetchProjects: async () => {
    const user = useAuthStore.getState().user;
    if (!user?.uid) {
      set({ projects: {}, activeProjectId: null, error: "Not authenticated" });
      return;
    }

    set({ isLoading: true, error: null, lastVisible: null, hasMore: true });
    try {
      // 1. Fetch projects where user is a direct member
      const { projects: userProjects, lastVisible: lastDoc } = await projectService.fetchProjects(user.uid, 50);
      
      // 2. Fetch projects where user's teams are assigned
      const { useTeamStore } = require('./useTeamStore');
      await useTeamStore.getState().fetchTeams();
      const userTeams = useTeamStore.getState().teams;
      const teamIds = userTeams.map((t: any) => t.id);
      
      let teamProjects = {};
      if (teamIds.length > 0) {
        teamProjects = await projectService.fetchProjectsByTeams(teamIds);
      }

      const allFetchedProjects = { ...teamProjects, ...userProjects };
      
      const activeId = get().activeProjectId;
      let newActiveId = activeId || "all";
      if (activeId && activeId !== "all" && !allFetchedProjects[activeId]) {
        newActiveId = "all";
      }

      set({ 
        projects: allFetchedProjects, 
        isLoading: false, 
        activeProjectId: newActiveId,
        lastVisible: lastDoc,
        hasMore: !!lastDoc
      });
      
      if (newActiveId !== activeId) {
         requestAnimationFrame(() => {
            const { useSprintStore } = require('./useSprintStore');
            useKanbanStore.getState().fetchTasks();
            useSprintStore.getState().fetchSprints();
            useBoardStore.getState().fetchBoards();
         });
      }
    } catch (err: any) {
      console.error("Failed to fetch projects:", err);
      set({ error: err.message, isLoading: false });
    }
  },

  fetchMoreProjects: async () => {
    const { lastVisible, hasMore, isLoading, projects } = get();
    if (!hasMore || isLoading || !lastVisible) return;

    const user = useAuthStore.getState().user;
    if (!user?.uid) return;

    set({ isLoading: true });
    try {
      const { projects: dbProjects, lastVisible: lastDoc } = await projectService.fetchProjects(user.uid, 20, lastVisible);
      
      set({ 
        projects: { ...projects, ...dbProjects },
        isLoading: false,
        lastVisible: lastDoc,
        hasMore: !!lastDoc
      });
    } catch (err: any) {
      console.error("Failed to fetch more projects:", err);
      set({ isLoading: false });
    }
  },

  createProject: async (projectData) => {
    const user = useAuthStore.getState().user;
    if (!user?.uid) return;

    set({ isLoading: true });
    
    const newProject: Project = {
      ...projectData,
      id: crypto.randomUUID(),
      uid: user.uid,
      memberIds: [user.uid],
      teamIds: [],
      createdAt: new Date().toISOString(),
    };

    // Optimistic Update
    set((state) => ({
      projects: { ...state.projects, [newProject.id]: newProject },
      activeProjectId: state.projects[state.activeProjectId || ""] ? state.activeProjectId : newProject.id
    }));

    try {
      await projectService.createProject(newProject);
      set({ isLoading: false });
      
      // Update tasks if this is the first project
      if (Object.keys(get().projects).length === 1) {
         useKanbanStore.getState().fetchTasks();
      }
    } catch (err: any) {
      console.error("Failed to create project:", err);
      set({ error: err.message, isLoading: false });
      // Revert optimistic update
      const reversedProjects = { ...get().projects };
      delete reversedProjects[newProject.id];
      set({ projects: reversedProjects });
    }
  },

  setActiveProject: (projectId: string | null) => {
    const currentActiveId = get().activeProjectId;
    if (currentActiveId === projectId) return;

    set({ activeProjectId: projectId });
    // Trigger task, sprint and board fetch for the new project state
    const { useSprintStore } = require('./useSprintStore');
    useKanbanStore.getState().fetchTasks();
    useSprintStore.getState().fetchSprints();
    useBoardStore.getState().fetchBoards();
  },

  updateProject: async (projectId, updates) => {
    set((state) => ({
      projects: {
        ...state.projects,
        [projectId]: { ...state.projects[projectId], ...updates }
      }
    }));

    try {
      await projectService.updateProject(projectId, updates);
    } catch (err: any) {
      console.error("Failed to update project:", err);
      set({ error: err.message });
    }
  },

  deleteProject: async (projectId: string) => {
    // Basic optimistic delete
    const { projects, activeProjectId } = get();
    const newProjects = { ...projects };
    delete newProjects[projectId];
    
    let newActiveId = activeProjectId;
    if (activeProjectId === projectId) {
       const remaining = Object.keys(newProjects);
       newActiveId = remaining.length > 0 ? remaining[0] : null;
    }

    set({ projects: newProjects, activeProjectId: newActiveId });
    if (newActiveId !== activeProjectId) {
       useKanbanStore.getState().fetchTasks();
       useBoardStore.getState().fetchBoards();
    }

    try {
      await projectService.deleteProject(projectId);
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
  },

  inviteMemberToProject: async (projectId, uid) => {
    const project = get().projects[projectId];
    if (!project) return;
    if (project.memberIds.includes(uid)) return;

    const newMemberIds = [...project.memberIds, uid];
    set(state => ({
      projects: {
        ...state.projects,
        [projectId]: { ...project, memberIds: newMemberIds }
      }
    }));

    try {
      await projectService.updateProject(projectId, { memberIds: newMemberIds });
    } catch (err) {
      console.error(err);
    }
  },

  assignTeamToProject: async (projectId, teamId) => {
    const project = get().projects[projectId];
    if (!project) return;
    if (project.teamIds.includes(teamId)) return;

    const newTeamIds = [...project.teamIds, teamId];
    set(state => ({
      projects: {
        ...state.projects,
        [projectId]: { ...project, teamIds: newTeamIds }
      }
    }));

    try {
      await projectService.updateProject(projectId, { teamIds: newTeamIds });
    } catch (err) {
      console.error(err);
    }
  }
}));
