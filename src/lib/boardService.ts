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
      where("uid", "==", uid),
      where("projectId", "==", projectId),
      orderBy("createdAt", "asc")
    );
    const querySnapshot = await getDocs(q);
    const boards: Record<string, Board> = {};
    querySnapshot.forEach((doc) => {
      boards[doc.id] = doc.data() as Board;
    });
    return boards;
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
  }
};
