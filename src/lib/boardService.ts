import { collection, doc, setDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy } from "firebase/firestore";
import { db } from "./firebase";

export interface Board {
  id: string;
  uid: string;
  projectId: string;
  name: string;
  createdAt: string;
}

const BOARDS_COLLECTION = "boards";

export const boardService = {
  async fetchBoards(uid: string, projectId: string): Promise<Record<string, Board>> {
    const q = query(
      collection(db, BOARDS_COLLECTION),
      where("projectId", "==", projectId)
      // Note: filtering by uid removed so invited members see project boards
    );
    const querySnapshot = await getDocs(q);
    const boards: Record<string, Board> = {};
    querySnapshot.forEach((doc) => {
      boards[doc.id] = doc.data() as Board;
    });
    // Sort in memory by createdAt
    const sorted: Record<string, Board> = {};
    Object.values(boards)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .forEach(b => { sorted[b.id] = b; });
    return sorted;
  },

  async createBoard(board: Board): Promise<void> {
    const boardRef = doc(db, BOARDS_COLLECTION, board.id);
    await setDoc(boardRef, board);
  },

  async updateBoard(boardId: string, updates: Partial<Board>): Promise<void> {
    const boardRef = doc(db, BOARDS_COLLECTION, boardId);
    await updateDoc(boardRef, updates);
  },

  async deleteBoard(boardId: string): Promise<void> {
    const boardRef = doc(db, BOARDS_COLLECTION, boardId);
    await deleteDoc(boardRef);
  },

  // Delete all boards belonging to a project
  async deleteBoardsByProjectId(projectId: string): Promise<void> {
    const q = query(
      collection(db, BOARDS_COLLECTION),
      where("projectId", "==", projectId)
    );
    const snap = await getDocs(q);
    const deletePromises = snap.docs.map(d => deleteDoc(doc(db, BOARDS_COLLECTION, d.id)));
    await Promise.all(deletePromises);
  }
};
