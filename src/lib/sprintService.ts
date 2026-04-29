import { collection, doc, setDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy } from "firebase/firestore";
import { db } from "./firebase";

const SPRINTS_COLLECTION = "sprints";

export type Sprint = {
  id: string;
  projectId: string;
  uid: string;
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'planned';
  createdAt: string;
};

export const sprintService = {
  async fetchSprints(uid: string, projectId: string): Promise<Sprint[]> {
    let q;
    if (projectId && projectId !== "all") {
      q = query(
        collection(db, SPRINTS_COLLECTION), 
        where("uid", "==", uid),
        where("projectId", "==", projectId)
      );
    } else {
      q = query(
        collection(db, SPRINTS_COLLECTION), 
        where("uid", "==", uid)
      );
    }
    const querySnapshot = await getDocs(q);
    const sprints: Sprint[] = [];
    querySnapshot.forEach((doc) => {
      sprints.push(doc.data() as Sprint);
    });
    
    // Sort by createdAt desc in memory to avoid needing composite indexes
    return sprints.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  // Create a new sprint
  async createSprint(sprint: Sprint): Promise<void> {
    const sprintRef = doc(db, SPRINTS_COLLECTION, sprint.id);
    await setDoc(sprintRef, sprint);
  },

  // Update a sprint
  async updateSprint(id: string, updates: Partial<Sprint>): Promise<void> {
    const sprintRef = doc(db, SPRINTS_COLLECTION, id);
    await updateDoc(sprintRef, updates);
  }
};
