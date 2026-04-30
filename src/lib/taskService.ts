import { collection, doc, setDoc, getDocs, updateDoc, deleteDoc, query, where, limit, startAfter, QueryDocumentSnapshot, DocumentData, onSnapshot, QueryConstraint } from "firebase/firestore";
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
    const constraints: QueryConstraint[] = [
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

  subscribeTasksByProjectIds(
    projectIds: string[],
    callback: (tasks: Record<string, Task>) => void
  ): () => void {
    if (!projectIds || projectIds.length === 0) {
      callback({});
      return () => {};
    }

    const chunks: string[][] = [];
    for (let i = 0; i < projectIds.length; i += 10) {
      chunks.push(projectIds.slice(i, i + 10));
    }

    const chunkResults: Record<number, Record<string, Task>> = {};
    const unsubscribes: (() => void)[] = [];

    const notifyMerged = () => {
      const merged: Record<string, Task> = {};
      Object.values(chunkResults).forEach((chunkTasks) => {
        Object.assign(merged, chunkTasks);
      });
      callback(merged);
    };

    chunks.forEach((chunk, index) => {
      const q = query(
        collection(db, TASKS_COLLECTION),
        where("projectId", "in", chunk)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const tasks: Record<string, Task> = {};
        snapshot.forEach((doc) => {
          tasks[doc.id] = doc.data() as Task;
        });
        chunkResults[index] = tasks;
        notifyMerged();
      });

      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
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
  },

  // Delete all tasks belonging to a project
  async deleteTasksByProjectId(projectId: string): Promise<void> {
    const q = query(
      collection(db, TASKS_COLLECTION),
      where("projectId", "==", projectId)
    );
    const snap = await getDocs(q);
    const deletePromises = snap.docs.map(d => deleteDoc(doc(db, TASKS_COLLECTION, d.id)));
    await Promise.all(deletePromises);
  }
};
