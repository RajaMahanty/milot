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
  orderBy,
  limit
} from "firebase/firestore";
import { db } from "./firebase";

const NOTIFICATIONS_COLLECTION = "notifications";

export interface Notification {
  id: string;
  type: 'team_invite' | 'project_invite' | 'task_assigned' | 'general';
  fromUid: string;
  fromName: string;
  toUid: string;
  teamId?: string;
  teamName?: string;
  projectId?: string;
  projectName?: string;
  taskId?: string;
  taskTitle?: string;
  status: 'pending' | 'accepted' | 'declined' | 'read';
  createdAt: string;
}

export const notificationService = {
  async createNotification(notification: Notification): Promise<void> {
    const docRef = doc(db, NOTIFICATIONS_COLLECTION, notification.id);
    await setDoc(docRef, notification);
  },

  async fetchUserNotifications(uid: string, pageSize: number = 20): Promise<Notification[]> {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where("toUid", "==", uid),
      orderBy("createdAt", "desc"),
      limit(pageSize)
    );
    const querySnapshot = await getDocs(q);
    const notifications: Notification[] = [];
    querySnapshot.forEach((doc) => {
      notifications.push(doc.data() as Notification);
    });
    return notifications;
  },

  async updateNotificationStatus(id: string, status: Notification['status']): Promise<void> {
    const docRef = doc(db, NOTIFICATIONS_COLLECTION, id);
    await updateDoc(docRef, { status });
  },

  async deleteNotification(id: string): Promise<void> {
    const docRef = doc(db, NOTIFICATIONS_COLLECTION, id);
    await deleteDoc(docRef);
  }
};
