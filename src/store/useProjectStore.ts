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
      const { projects: dbProjects, lastVisible: lastDoc } = await projectService.fetchProjects(user.uid, 50);
      
      const projectIds = Object.keys(dbProjects);
      const activeId = get().activeProjectId;
      
      let newActiveId = activeId || "all";
      if (activeId && activeId !== "all" && !dbProjects[activeId]) {
        newActiveId = "all";
      }

      set({ 
        projects: dbProjects, 
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
  }
}));
