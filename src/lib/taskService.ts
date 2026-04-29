import { collection, doc, setDoc, getDocs, updateDoc, deleteDoc, query, where, limit, startAfter, QueryDocumentSnapshot, DocumentData, orderBy } from "firebase/firestore";
import { db } from "./firebase";
import { Task } from "@/store/useTaskStore";

const TASKS_COLLECTION = "tasks";

export const taskService = {
  async fetchTasks(
    uid: string, 
    projectId?: string | null, 
    pageSize: number = 20, 
    lastVisible?: QueryDocumentSnapshot<DocumentData> | null
  ): Promise<{ tasks: Record<string, Task>, lastVisible: QueryDocumentSnapshot<DocumentData> | null }> {
    let constraints: any[] = [
      where("uid", "==", uid),
      limit(pageSize)
    ];

    if (projectId && projectId !== "all") {
      constraints.push(where("projectId", "==", projectId));
    }

    if (lastVisible) {
      constraints.push(startAfter(lastVisible));
    }

    const q = query(collection(db, TASKS_COLLECTION), ...constraints);
    const querySnapshot = await getDocs(q);
    
    const tasks: Record<string, Task> = {};
    querySnapshot.forEach((doc) => {
      tasks[doc.id] = doc.data() as Task;
    });

    const lastVisibleDoc = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
    return { tasks, lastVisible: lastVisibleDoc };
  },

  /**
   * Fetch all tasks belonging to specific project IDs (for shared/invited projects).
   * Does NOT filter by uid — returns all tasks regardless of creator.
   */
  async fetchTasksByProjectIds(
    projectIds: string[]
  ): Promise<Record<string, Task>> {
    if (!projectIds || projectIds.length === 0) return {};

    // Firestore "in" supports max 30 values; chunk if needed
    const chunks: string[][] = [];
    for (let i = 0; i < projectIds.length; i += 30) {
      chunks.push(projectIds.slice(i, i + 30));
    }

    const allTasks: Record<string, Task> = {};
    for (const chunk of chunks) {
      const q = query(
        collection(db, TASKS_COLLECTION),
        where("projectId", "in", chunk)
      );
      const snap = await getDocs(q);
      snap.forEach((doc) => {
        allTasks[doc.id] = doc.data() as Task;
      });
    }
    return allTasks;
  },

  // Create a new task (assumes uid is already set on the task object)
  async createTask(task: Task & { uid: string }): Promise<void> {
    const taskRef = doc(db, TASKS_COLLECTION, task.id);
    await setDoc(taskRef, task);
  },

  // Update an existing task
  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    await updateDoc(taskRef, updates);
  },

  // Delete a task
  async deleteTask(taskId: string): Promise<void> {
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    await deleteDoc(taskRef);
  }
};
