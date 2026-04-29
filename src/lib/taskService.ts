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
      orderBy("createdAt", "desc"),
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
