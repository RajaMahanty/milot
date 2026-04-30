import { create } from 'zustand';
import { boardService, Board } from '@/lib/boardService';
import { useAuthStore } from './useAuthStore';
import { useProjectStore } from './useProjectStore';
import { toast } from './useToastStore';

interface BoardState {
  boards: Record<string, Board>;
  activeBoardId: string | null;
  isLoading: boolean;
  error: string | null;
  
  fetchBoards: () => Promise<void>;
  createBoard: (name: string) => Promise<void>;
  setActiveBoard: (boardId: string | null) => void;
  deleteBoard: (boardId: string) => Promise<void>;
  updateBoard: (boardId: string, updates: Partial<Board>) => Promise<void>;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: {},
  activeBoardId: null,
  isLoading: false,
  error: null,

  fetchBoards: async () => {
    const user = useAuthStore.getState().user;
    const activeProjectId = useProjectStore.getState().activeProjectId;
    
    if (!user || !activeProjectId || activeProjectId === "all") {
      set({ boards: {}, activeBoardId: null });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const dbBoards = await boardService.fetchBoards(user.uid, activeProjectId);
      const boardIds = Object.keys(dbBoards);
      
      if (boardIds.length === 0) {
        // Only auto-create a default board if this user OWNS the project
        const projects = useProjectStore.getState().projects;
        const project = projects[activeProjectId];
        if (project && project.uid === user.uid) {
          await get().createBoard("Untitled Board");
        } else {
          // Invited member with no boards yet — just clear state
          set({ boards: {}, activeBoardId: null, isLoading: false });
        }
        return;
      }

      let newActiveId = get().activeBoardId;
      if (!newActiveId || !dbBoards[newActiveId]) {
        // Prefer the board created by the project owner
        const projects = useProjectStore.getState().projects;
        const project = projects[activeProjectId];
        const ownerBoard = project
          ? Object.values(dbBoards).find(b => b.uid === project.uid)
          : null;
        newActiveId = ownerBoard?.id || boardIds[0];
      }

      set({ boards: dbBoards, activeBoardId: newActiveId, isLoading: false });
    } catch (err: any) {
      console.error(err);
      set({ error: err.message, isLoading: false });
    }
  },


  createBoard: async (name: string) => {
    const user = useAuthStore.getState().user;
    const activeProjectId = useProjectStore.getState().activeProjectId;
    if (!user || !activeProjectId || activeProjectId === "all") return;

    const newBoard: Board = {
      id: crypto.randomUUID(),
      uid: user.uid,
      projectId: activeProjectId,
      name,
      createdAt: new Date().toISOString(),
    };

    set(state => ({
      boards: { ...state.boards, [newBoard.id]: newBoard },
      activeBoardId: state.activeBoardId || newBoard.id
    }));

    try {
      await boardService.createBoard(newBoard);
      toast.success(`Board "${name}" created!`);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to create board.");
    }
  },

  setActiveBoard: (boardId) => {
    set({ activeBoardId: boardId });
  },

  updateBoard: async (boardId, updates) => {
    set(state => ({
      boards: {
        ...state.boards,
        [boardId]: { ...state.boards[boardId], ...updates }
      }
    }));

    try {
      await boardService.updateBoard(boardId, updates);
    } catch (err: any) {
      console.error(err);
    }
  },

  deleteBoard: async (boardId) => {
    const currentBoards = get().boards;
    const boardCount = Object.keys(currentBoards).length;
    if (boardCount <= 1) {
      toast.warning("You cannot delete the last remaining board.");
      return;
    }

    const prevBoards = { ...currentBoards };
    const newBoards = { ...prevBoards };
    delete newBoards[boardId];

    let newActiveId = get().activeBoardId;
    if (newActiveId === boardId) {
      const remaining = Object.keys(newBoards);
      newActiveId = remaining.length > 0 ? remaining[0] : null;
    }

    set({ boards: newBoards, activeBoardId: newActiveId });

    try {
      await boardService.deleteBoard(boardId);
      toast.success("Board deleted.");
    } catch (err: any) {
      console.error(err);
      set({ boards: prevBoards });
      toast.error("Failed to delete board.");
    }
  }
}));
