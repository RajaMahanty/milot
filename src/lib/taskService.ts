import { collection, doc, setDoc, getDocs, updateDoc, deleteDoc, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { Task } from "@/store/useTaskStore";

const TASKS_COLLECTION = "tasks";

export const taskService = {
  async fetchTasks(uid: string, projectId?: string | null): Promise<Record<string, Task>> {
    let q;
    if (projectId && projectId !== "all") {
      q = query(
        collection(db, TASKS_COLLECTION), 
        where("uid", "==", uid),
        where("projectId", "==", projectId)
      );
    } else {
      q = query(
        collection(db, TASKS_COLLECTION), 
        where("uid", "==", uid)
      );
    }
    const querySnapshot = await getDocs(q);
    const tasks: Record<string, Task> = {};
    querySnapshot.forEach((doc) => {
      const data = doc.data() as Task;
      tasks[doc.id] = data;
    });
    return tasks;
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
