import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  collection, 
  arrayUnion, 
  arrayRemove 
} from "firebase/firestore";
import { db } from "./firebase";

const TEAMS_COLLECTION = "teams";

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
  createdAt: string;
}

export const teamService = {
  async createTeam(team: Team): Promise<void> {
    const docRef = doc(db, TEAMS_COLLECTION, team.id);
    await setDoc(docRef, team);
  },

  async fetchUserTeams(uid: string): Promise<Team[]> {
    const q = query(
      collection(db, TEAMS_COLLECTION),
      where("memberIds", "array-contains", uid)
    );
    const querySnapshot = await getDocs(q);
    const teams: Team[] = [];
    querySnapshot.forEach((doc) => {
      teams.push(doc.data() as Team);
    });
    return teams;
  },

  async updateTeam(id: string, updates: Partial<Team>): Promise<void> {
    const docRef = doc(db, TEAMS_COLLECTION, id);
    await updateDoc(docRef, updates);
  },

  async deleteTeam(id: string): Promise<void> {
    const docRef = doc(db, TEAMS_COLLECTION, id);
    await deleteDoc(docRef);
  },

  async addMember(teamId: string, uid: string): Promise<void> {
    const docRef = doc(db, TEAMS_COLLECTION, teamId);
    await updateDoc(docRef, {
      memberIds: arrayUnion(uid)
    });
  },

  async removeMember(teamId: string, uid: string): Promise<void> {
    const docRef = doc(db, TEAMS_COLLECTION, teamId);
    await updateDoc(docRef, {
      memberIds: arrayRemove(uid)
    });
  }
};
