import { create } from 'zustand';
import { taskService } from '@/lib/taskService';
import { useAuthStore } from './useAuthStore';
import { toast } from './useToastStore';


export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Comment {
  id: string;
  author: string;
  authorId: string;
  text: string;
  createdAt: string;
}

export interface Task {
  id: string;
  uid?: string;
  projectId: string;
  title: string;
  description?: string;
  status: "todo" | "in-progress" | "done" | "archived";
  priority?: "low" | "medium" | "high";
  sprintId?: string;
  boardId?: string;
  assignedTo?: string;
  dueDate?: string;
  storyPoints?: number;
  createdAt: string;
  subtasks?: SubTask[];
  comments?: Comment[];
}

export type Column = {
  id: "todo" | "in-progress" | "done";
  title: string;
  taskIds: string[];
};

interface KanbanState {
  tasks: Record<string, Task>;
  columns: Record<string, Column>;
  isLoading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  addTask: (task: Omit<Task, 'uid'>) => Promise<void>;
  editTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  moveTask: (activeId: string, overId: string) => Promise<void>;
  assignTasksToSprint: (taskIds: string[], sprintId: string | null) => Promise<void>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  completeSprint: (sprintId?: string) => Promise<void>;
  
  // Pagination
  lastVisible: any | null;
  hasMore: boolean;
  fetchMoreTasks: () => Promise<void>;
}


const defaultColumns: Record<string, Column> = {
  "todo": { id: "todo", title: "To Do", taskIds: [] },
  "in-progress": { id: "in-progress", title: "In Progress", taskIds: [] },
  "done": { id: "done", title: "Done", taskIds: [] }
};

export const useKanbanStore = create<KanbanState>((set, get) => ({
  tasks: {},
  columns: defaultColumns,
  isLoading: false,
  error: null,
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  lastVisible: null,
  hasMore: true,

  fetchTasks: async () => {
    const user = useAuthStore.getState().user;
    const { useProjectStore } = require('./useProjectStore');
    const activeProjectId = useProjectStore.getState().activeProjectId;

    if (!user || !activeProjectId) {
      set({ tasks: {}, columns: defaultColumns, isLoading: false, lastVisible: null, hasMore: false });
      return;
    }

    set({ isLoading: true, error: null, lastVisible: null, hasMore: true });
    try {
      const { tasks: dbTasks, lastVisible: lastDoc } = await taskService.fetchTasks(user.uid, activeProjectId, 50);
      const cols = JSON.parse(JSON.stringify(defaultColumns));

      const projects = useProjectStore.getState().projects;
      const validDbTasks: Record<string, any> = {};

      Object.keys(dbTasks).forEach(taskId => {
        const t = dbTasks[taskId];
        if (projects[t.projectId]) {
          validDbTasks[taskId] = t;
          if (t.status !== "archived" && cols[t.status]) {
            cols[t.status].taskIds.push(taskId);
          }
        }
      });

      set({ 
        tasks: validDbTasks, 
        columns: cols, 
        isLoading: false,
        lastVisible: lastDoc,
        hasMore: !!lastDoc
      });
    } catch (err: any) {
      console.error(err);
      set({ error: err.message, isLoading: false });
    }
  },

  fetchMoreTasks: async () => {
    const { lastVisible, hasMore, isLoading, tasks, columns } = get();
    if (!hasMore || isLoading || !lastVisible) return;

    const user = useAuthStore.getState().user;
    const { useProjectStore } = require('./useProjectStore');
    const activeProjectId = useProjectStore.getState().activeProjectId;

    if (!user || !activeProjectId) return;

    set({ isLoading: true });
    try {
      const { tasks: dbTasks, lastVisible: lastDoc } = await taskService.fetchTasks(user.uid, activeProjectId, 20, lastVisible);
      
      const projects = useProjectStore.getState().projects;
      const newTasks = { ...tasks };
      const newCols = JSON.parse(JSON.stringify(columns));

      Object.keys(dbTasks).forEach(taskId => {
        const t = dbTasks[taskId];
        if (projects[t.projectId]) {
          newTasks[taskId] = t;
          if (t.status !== "archived" && newCols[t.status] && !newCols[t.status].taskIds.includes(taskId)) {
            newCols[t.status].taskIds.push(taskId);
          }
        }
      });

      set({ 
        tasks: newTasks, 
        columns: newCols, 
        isLoading: false,
        lastVisible: lastDoc,
        hasMore: !!lastDoc
      });
    } catch (err: any) {
      console.error(err);
      set({ isLoading: false });
    }
  },

  addTask: async (task) => {
    const user = useAuthStore.getState().user;
    const { useProjectStore } = require('./useProjectStore');
    const { useSprintStore } = require('./useSprintStore');

    const activeProjectId = task.projectId || useProjectStore.getState().activeProjectId;
    const activeSprintId = useSprintStore.getState().activeSprintId;

    if (!user || (!activeProjectId || activeProjectId === "all")) {
      toast.warning("Please select a specific project first.");
      return;
    }


    const taskWithUid = {
      ...task,
      uid: user.uid,
      projectId: activeProjectId,
      sprintId: activeSprintId || undefined
    };

    // Optimistic UI update
    set((state) => ({
      tasks: { ...state.tasks, [task.id]: taskWithUid },
      columns: {
        ...state.columns,
        [task.status]: {
          ...state.columns[task.status],
          taskIds: [...state.columns[task.status].taskIds, task.id],
        },
      },
    }));

    try {
      const cleanTask = Object.fromEntries(Object.entries(taskWithUid).filter(([_, v]) => v !== undefined));
      await taskService.createTask(cleanTask as any);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save task.");
    }

  },

  editTask: async (taskId, updates) => {
    // Optimistic UI update
    set((state) => {
      const task = state.tasks[taskId];
      if (!task) return state;

      const updatedTask = { ...task, ...updates };
      const newState = {
        tasks: { ...state.tasks, [taskId]: updatedTask }
      };

      // If status changed, we need to move it in the columns
      if (updates.status && updates.status !== task.status) {
        const oldCol = state.columns[task.status];
        const newCol = state.columns[updates.status];

        const updatedColumns = {
          ...state.columns,
          [task.status]: {
            ...oldCol,
            taskIds: oldCol.taskIds.filter(id => id !== taskId)
          },
          [updates.status]: {
            ...newCol,
            taskIds: [...newCol.taskIds, taskId]
          }
        };
        return { ...newState, columns: updatedColumns };
      }

      return newState;
    });

    try {
      const cleanUpdates = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined));
      if (Object.keys(cleanUpdates).length > 0) {
        await taskService.updateTask(taskId, cleanUpdates);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to update task.");
    }

  },

  deleteTask: async (taskId) => {
    // Optimistic UI update
    set((state) => {
      const task = state.tasks[taskId];
      if (!task) return state;

      const newTasks = { ...state.tasks };
      delete newTasks[taskId];

      const colId = task.status;
      const col = state.columns[colId];

      if (!col) {
        return { tasks: newTasks };
      }

      const updatedColumns = {
        ...state.columns,
        [colId]: {
          ...col,
          taskIds: col.taskIds.filter(id => id !== taskId)
        }
      };

      return { tasks: newTasks, columns: updatedColumns };
    });

    try {
      await taskService.deleteTask(taskId);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to delete task.");
    }

  },

  moveTask: async (activeId, overId) => {
    const originalState = get();
    const state = originalState; // snapshot before change

    // Calculate new columns (copied from original moveTask logic)
    const activeTask = state.tasks[activeId];
    if (!activeTask) return;

    const sourceColId = activeTask.status;
    let destColId: "todo" | "in-progress" | "done" | "archived" | undefined;

    if (state.columns[overId as keyof typeof state.columns]) {
      destColId = overId as any;
    } else if (state.tasks[overId]) {
      destColId = state.tasks[overId].status;
    }

    if (!destColId || destColId === "archived") return;

    const sourceCol = state.columns[sourceColId];
    const destCol = state.columns[destColId];

    // Optimistic Update
    set((currentState) => {
      if (sourceColId === destColId) {
        const oldIndex = sourceCol.taskIds.indexOf(activeId);
        const newIndex = sourceCol.taskIds.indexOf(overId);
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return currentState;

        const newTaskIds = [...sourceCol.taskIds];
        const [removed] = newTaskIds.splice(oldIndex, 1);
        newTaskIds.splice(newIndex, 0, removed);

        return {
          columns: {
            ...currentState.columns,
            [sourceColId]: { ...sourceCol, taskIds: newTaskIds }
          }
        };
      }

      // Moving to different column
      const newSourceTaskIds = sourceCol.taskIds.filter(id => id !== activeId);
      const newDestTaskIds = [...destCol.taskIds];
      const overIndex = destCol.taskIds.indexOf(overId);

      if (overIndex !== -1) {
        newDestTaskIds.splice(overIndex, 0, activeId);
      } else {
        newDestTaskIds.push(activeId);
      }

      return {
        tasks: {
          ...currentState.tasks,
          [activeId]: { ...activeTask, status: destColId as "todo" | "in-progress" | "done" }
        },
        columns: {
          ...currentState.columns,
          [sourceColId]: { ...sourceCol, taskIds: newSourceTaskIds },
          [destColId]: { ...destCol, taskIds: newDestTaskIds }
        }
      };
    });

    // Note: Reordering within same column isn't persisted to DB in this basic schema
    // since status didn't change and we lack 'order' field. 
    // We only need to sync Firestore if status changed.
    if (sourceColId !== destColId) {
      try {
        await taskService.updateTask(activeId, { status: destColId as any });
      } catch (err: any) {
        console.error("Failed to move task in Firebase:", err);
        // Could revert state here
      }
    }
  },

  assignTasksToSprint: async (taskIds, sprintId) => {
    set((state) => {
      const newTasks = { ...state.tasks };
      taskIds.forEach(id => {
        if (newTasks[id]) {
          newTasks[id] = { ...newTasks[id], sprintId: sprintId || undefined };
        }
      });
      return { tasks: newTasks };
    });

    try {
      await Promise.all(
        taskIds.map(id => taskService.updateTask(id, { sprintId: sprintId as any }))
      );
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to assign tasks to sprint.");
    }

  },

  completeSprint: async (sprintId?: string) => {
    const state = get();
    const { useSprintStore } = require('./useSprintStore');
    const targetSprintId = sprintId || useSprintStore.getState().activeSprintId;

    if (!targetSprintId) return;

    const doneTaskIds = state.columns["done"]?.taskIds || [];
    const sprintDoneTaskIds = doneTaskIds.filter(id => state.tasks[id]?.sprintId === targetSprintId);

    // Optimistic UI Update: Move done tasks to archived and clear done column
    if (sprintDoneTaskIds.length > 0) {
      set((currentState) => {
        const newTasks = { ...currentState.tasks };
        sprintDoneTaskIds.forEach(id => {
          if (newTasks[id]) {
            newTasks[id] = { ...newTasks[id], status: "archived" };
          }
        });

        return {
          tasks: newTasks,
          columns: {
            ...currentState.columns,
            "done": {
              ...currentState.columns["done"],
              taskIds: currentState.columns["done"].taskIds.filter(id => !sprintDoneTaskIds.includes(id))
            }
          }
        };
      });

      // Background Firebase Updates using Promise.all
      try {
        await Promise.all(
          sprintDoneTaskIds.map(id => taskService.updateTask(id, { status: "archived" as any }))
        );
      } catch (err: any) {
        console.error(err);
        toast.error("Failed to archive tasks.");
      }
    }

    // Complete the sprint
    try {
      await useSprintStore.getState().updateSprint(targetSprintId, { status: 'completed' });

      // If the completed sprint was the globally active one, clear it
      if (useSprintStore.getState().activeSprintId === targetSprintId) {
        useSprintStore.setState({ activeSprintId: null });
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to complete sprint.");
    }
  },
}));
