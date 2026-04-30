import { create } from 'zustand';
import { notificationService, Notification } from '@/lib/notificationService';
import { useAuthStore } from './useAuthStore';
import { useTeamStore } from './useTeamStore';
import { toast } from './useToastStore';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  
  fetchNotifications: () => Promise<void>;
  sendNotification: (data: Omit<Notification, 'id' | 'createdAt' | 'status' | 'fromUid' | 'fromName'>) => Promise<void>;
  respondToInvite: (id: string, status: 'accepted' | 'declined') => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    set({ isLoading: true });
    try {
      const dbNotifications = await notificationService.fetchUserNotifications(user.uid);
      const unread = dbNotifications.filter(n => n.status === 'pending').length;
      set({ notifications: dbNotifications, unreadCount: unread, isLoading: false });
    } catch (err: any) {
      console.error(err);
      set({ isLoading: false });
    }
  },

  sendNotification: async (data) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const newNotification: Notification = {
      ...data,
      id: crypto.randomUUID(),
      fromUid: user.uid,
      fromName: user.displayName || "Unknown",
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    try {
      await notificationService.createNotification(newNotification);
      if (data.type === 'team_invite' || data.type === 'project_invite') {
        toast.success("Invitation sent!");
      }
    } catch (err: any) {
      console.error(err);
      if (data.type === 'team_invite' || data.type === 'project_invite') {
        toast.error("Failed to send invitation.");
      }
    }
  },

  respondToInvite: async (id, status) => {
    const notification = get().notifications.find(n => n.id === id);
    if (!notification) return;

    set({ isLoading: true });
    try {
      const isInvite = notification.type === 'team_invite' || notification.type === 'project_invite';
      if (status === 'accepted') {
        if (notification.type === 'team_invite' && notification.teamId) {
          await useTeamStore.getState().addMemberToTeam(notification.teamId, notification.toUid);
          toast.success(`Joined team ${notification.teamName}!`);
        } else if (notification.type === 'project_invite' && notification.projectId) {
          const { useProjectStore } = require('./useProjectStore');
          await useProjectStore.getState().inviteMemberToProject(notification.projectId, notification.toUid);
          await useProjectStore.getState().fetchProjects();
          toast.success(`Joined project ${notification.projectName}!`);
        }
      }

      if (isInvite && (status === 'accepted' || status === 'declined')) {
        await notificationService.deleteNotification(id);
        set(state => ({
          notifications: state.notifications.filter(n => n.id !== id),
          unreadCount: Math.max(0, state.unreadCount - (notification.status === 'pending' ? 1 : 0)),
          isLoading: false
        }));
      } else {
        await notificationService.updateNotificationStatus(id, status);
        set(state => ({
          notifications: state.notifications.map(n => n.id === id ? { ...n, status } : n),
          unreadCount: state.unreadCount - 1,
          isLoading: false
        }));
      }
    } catch (err: any) {
      console.error(err);
      set({ isLoading: false });
      toast.error("Action failed.");
    }
  },

  markAsRead: async (id) => {
    try {
      await notificationService.updateNotificationStatus(id, 'read');
      set(state => ({
        notifications: state.notifications.map(n => n.id === id ? { ...n, status: 'read' } : n),
        unreadCount: Math.max(0, state.unreadCount - (state.notifications.find(n => n.id === id)?.status === 'pending' ? 1 : 0))
      }));
    } catch (err: any) {
      console.error(err);
    }
  }
}));
