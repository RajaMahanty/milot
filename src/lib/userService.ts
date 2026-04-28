import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  collection, 
  query, 
  where, 
  getDocs 
} from "firebase/firestore";
import { db } from "./firebase";

export interface UserProfile {
  uid: string;
  username: string;
  email: string | null;
  displayName: string | null;
  bio?: string;
  photoURL?: string;
  followers?: string[];
  following?: string[];
  createdAt: string;
}


const USERS_COLLECTION = "users";

export const userService = {
  async getProfile(uid: string): Promise<UserProfile | null> {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  },

  async syncProfile(uid: string, initialData: Partial<UserProfile>): Promise<void> {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      const defaultUsername = initialData.displayName 
        ? initialData.displayName.toLowerCase().replace(/\s+/g, '_') + "_" + uid.substring(0, 4)
        : "user_" + uid.substring(0, 6);

      await setDoc(docRef, {
        ...initialData,
        uid,
        username: defaultUsername,
        followers: [],
        following: [],
        createdAt: new Date().toISOString()
      });
    }
  },


  async updateProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    const docRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(docRef, data);
  },

  async isUsernameAvailable(username: string): Promise<boolean> {
    const q = query(
      collection(db, USERS_COLLECTION),
      where("username", "==", username)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty;
  },


  async followUser(currentUid: string, targetUid: string): Promise<void> {
    const currentUserRef = doc(db, USERS_COLLECTION, currentUid);
    const targetUserRef = doc(db, USERS_COLLECTION, targetUid);

    await updateDoc(currentUserRef, {
      following: arrayUnion(targetUid)
    });

    await updateDoc(targetUserRef, {
      followers: arrayUnion(currentUid)
    });
  },

  async unfollowUser(currentUid: string, targetUid: string): Promise<void> {
    const currentUserRef = doc(db, USERS_COLLECTION, currentUid);
    const targetUserRef = doc(db, USERS_COLLECTION, targetUid);

    await updateDoc(currentUserRef, {
      following: arrayRemove(targetUid)
    });

    await updateDoc(targetUserRef, {
      followers: arrayRemove(currentUid)
    });
  },

  async searchUsers(queryStr: string): Promise<UserProfile[]> {
    const q = query(
      collection(db, USERS_COLLECTION),
      where("displayName", ">=", queryStr),
      where("displayName", "<=", queryStr + "\uf8ff")
    );
    
    const querySnapshot = await getDocs(q);
    const users: UserProfile[] = [];
    querySnapshot.forEach((doc) => {
      users.push(doc.data() as UserProfile);
    });
    return users;
  }
};
