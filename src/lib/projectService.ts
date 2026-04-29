import { collection, doc, setDoc, getDocs, updateDoc, deleteDoc, query, where, limit, startAfter, QueryDocumentSnapshot, DocumentData, orderBy } from "firebase/firestore";
import { db } from "./firebase";

const PROJECTS_COLLECTION = "projects";

export type Project = {
  id: string;
  uid: string; // Owner UID
  title: string;
  description?: string;
  memberIds: string[];
  teamIds: string[];
  createdAt: string;
};

export const projectService = {
  // Fetch projects for a specific user
  async fetchProjects(
    uid: string, 
    pageSize: number = 20, 
    lastVisible?: QueryDocumentSnapshot<DocumentData> | null
  ): Promise<{ projects: Record<string, Project>, lastVisible: QueryDocumentSnapshot<DocumentData> | null }> {
    // We want projects where the user is either the owner OR a member.
    // For now, let's assume memberIds always includes the owner.
    let constraints: any[] = [
      where("memberIds", "array-contains", uid),
      orderBy("createdAt", "desc"),
      limit(pageSize)
    ];

    if (lastVisible) {
      constraints.push(startAfter(lastVisible));
    }

    const q = query(collection(db, PROJECTS_COLLECTION), ...constraints);
    const querySnapshot = await getDocs(q);
    
    const projects: Record<string, Project> = {};
    querySnapshot.forEach((doc) => {
      projects[doc.id] = doc.data() as Project;
    });

    const lastVisibleDoc = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
    return { projects, lastVisible: lastVisibleDoc };
  },

  async fetchProjectsByTeams(
    teamIds: string[]
  ): Promise<Record<string, Project>> {
    if (!teamIds || teamIds.length === 0) return {};
    
    // Firestore "array-contains-any" can check if any value in a list is present in an array field
    const q = query(
      collection(db, PROJECTS_COLLECTION),
      where("teamIds", "array-contains-any", teamIds.slice(0, 10)) // Max 10 for array-contains-any
    );
    
    const querySnapshot = await getDocs(q);
    const projects: Record<string, Project> = {};
    querySnapshot.forEach((doc) => {
      projects[doc.id] = doc.data() as Project;
    });
    return projects;
  },

  // Create a new project
  async createProject(project: Project): Promise<void> {
    const projectRef = doc(db, PROJECTS_COLLECTION, project.id);
    await setDoc(projectRef, project);
  },

  // Update an existing project
  async updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    await updateDoc(projectRef, updates);
  },

  // Delete a project
  async deleteProject(projectId: string): Promise<void> {
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    await deleteDoc(projectRef);
  }
};
