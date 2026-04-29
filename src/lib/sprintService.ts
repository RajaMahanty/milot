import { collection, doc, setDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, limit, startAfter, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
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
  async fetchSprints(
    uid: string, 
    projectId: string,
    pageSize: number = 20,
    lastVisible?: QueryDocumentSnapshot<DocumentData> | null
  ): Promise<{ sprints: Sprint[], lastVisible: QueryDocumentSnapshot<DocumentData> | null }> {
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

    const q = query(collection(db, SPRINTS_COLLECTION), ...constraints);
    const querySnapshot = await getDocs(q);
    
    const sprints: Sprint[] = [];
    querySnapshot.forEach((doc) => {
      sprints.push(doc.data() as Sprint);
    });

    const lastVisibleDoc = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
    return { sprints, lastVisible: lastVisibleDoc };
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
  },

  // Delete a single sprint
  async deleteSprint(id: string): Promise<void> {
    const sprintRef = doc(db, SPRINTS_COLLECTION, id);
    await deleteDoc(sprintRef);
  },

  // Delete all sprints belonging to a project
  async deleteSprintsByProjectId(projectId: string): Promise<void> {
    const q = query(
      collection(db, SPRINTS_COLLECTION),
      where("projectId", "==", projectId)
    );
    const snap = await getDocs(q);
    const deletePromises = snap.docs.map(d => deleteDoc(doc(db, SPRINTS_COLLECTION, d.id)));
    await Promise.all(deletePromises);
  }
};
