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
  usernameLower?: string;
  email: string | null;
  displayName: string | null;
  displayNameLower?: string;
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

  async getProfileByUsername(username: string): Promise<UserProfile | null> {
    if (!username) return null;
    const q = query(
      collection(db, USERS_COLLECTION),
      where("username", "==", username),
      // we only expect 1 but limit(1) is good practice for uniqueness
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data() as UserProfile;
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

      const displayName = initialData.displayName || null;

      await setDoc(docRef, {
        ...initialData,
        uid,
        username: defaultUsername.toLowerCase(),
        usernameLower: defaultUsername.toLowerCase(),
        displayNameLower: displayName ? displayName.toLowerCase() : null,
        followers: [],
        following: [],
        createdAt: new Date().toISOString()
      });
    } else {
       // Even if it exists, let's ensure lowercase fields are there
       const data = docSnap.data();
       if (!data.usernameLower || !data.displayNameLower) {
          await updateDoc(docRef, {
             usernameLower: data.username.toLowerCase(),
             displayNameLower: data.displayName ? data.displayName.toLowerCase() : null
          });
       }
    }
  },


  async updateProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const updates: any = { ...data };
    if (data.username) updates.usernameLower = data.username.toLowerCase();
    if (data.displayName) updates.displayNameLower = data.displayName.toLowerCase();
    await updateDoc(docRef, updates);
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
    const cleanQueryLower = queryStr.toLowerCase();
    
    // Query 1: displayNameLower prefix
    const q1 = query(
      collection(db, USERS_COLLECTION),
      where("displayNameLower", ">=", cleanQueryLower),
      where("displayNameLower", "<=", cleanQueryLower + "\uf8ff")
    );
    
    // Query 2: usernameLower prefix
    const q2 = query(
      collection(db, USERS_COLLECTION),
      where("usernameLower", ">=", cleanQueryLower),
      where("usernameLower", "<=", cleanQueryLower + "\uf8ff")
    );
    
    // Query 3: exact email
    const q3 = query(
      collection(db, USERS_COLLECTION),
      where("email", "==", queryStr)
    );

    const [snap1, snap2, snap3] = await Promise.all([getDocs(q1), getDocs(q2), getDocs(q3)]);
    
    const userMap = new Map<string, UserProfile>();
    
    [snap1, snap2, snap3].forEach(snap => {
      snap.forEach(doc => {
        userMap.set(doc.id, doc.data() as UserProfile);
      });
    });
    
    return Array.from(userMap.values());
  },

  async getUsersByIds(uids: string[]): Promise<UserProfile[]> {
    if (!uids || uids.length === 0) return [];
    
    // Using Promise.all with getDoc for simplicity and to avoid the 'in' query limit of 10 items.
    const promises = uids.map(uid => getDoc(doc(db, USERS_COLLECTION, uid)));
    const docs = await Promise.all(promises);
    
    return docs
      .filter(docSnap => docSnap.exists())
      .map(docSnap => docSnap.data() as UserProfile);
  }
};
