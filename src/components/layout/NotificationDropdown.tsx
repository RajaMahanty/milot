"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useProjectStore } from "@/store/useProjectStore";
import { Bell, UserPlus, Check, X, Zap, MessageSquare, AtSign, CornerDownRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Notification } from "@/lib/notificationService";

function getNotificationMeta(n: Notification) {
  switch (n.type) {
    case 'team_invite':
      return {
        icon: <UserPlus className="h-5 w-5" />,
        iconBg: "bg-blue-100 text-blue-600",
        title: "Team Invitation",
        body: <><span className="font-bold text-foreground">{n.fromName}</span> invited you to join <span className="font-bold text-foreground">{n.teamName}</span>.</>,
        isInvite: true,
      };
    case 'project_invite':
      return {
        icon: <UserPlus className="h-5 w-5" />,
        iconBg: "bg-violet-100 text-violet-600",
        title: "Workspace Invitation",
        body: <><span className="font-bold text-foreground">{n.fromName}</span> invited you to join <span className="font-bold text-foreground">{n.projectName}</span>.</>,
        isInvite: true,
      };
    case 'task_assigned':
      return {
        icon: <Zap className="h-5 w-5" />,
        iconBg: "bg-amber-100 text-amber-600",
        title: "Task Assigned",
        body: <><span className="font-bold text-foreground">{n.fromName}</span> assigned you to <span className="font-bold text-foreground">{n.taskTitle}</span>.</>,
        isInvite: false,
      };
    case 'task_comment':
      return {
        icon: <MessageSquare className="h-5 w-5" />,
        iconBg: "bg-emerald-100 text-emerald-600",
        title: "New Comment",
        body: (
          <>
            <span className="font-bold text-foreground">{n.fromName}</span> commented on <span className="font-bold text-foreground">{n.taskTitle}</span>
            {n.commentText && <span className="block mt-1 italic text-muted-foreground truncate">"{n.commentText}"</span>}
          </>
        ),
        isInvite: false,
      };
    case 'comment_reply':
      return {
        icon: <CornerDownRight className="h-5 w-5" />,
        iconBg: "bg-sky-100 text-sky-600",
        title: "New Reply",
        body: (
          <>
            <span className="font-bold text-foreground">{n.fromName}</span> replied to your comment on <span className="font-bold text-foreground">{n.taskTitle}</span>
            {n.commentText && <span className="block mt-1 italic text-muted-foreground truncate">"{n.commentText}"</span>}
          </>
        ),
        isInvite: false,
      };
    case 'mention':
      return {
        icon: <AtSign className="h-5 w-5" />,
        iconBg: "bg-rose-100 text-rose-600",
        title: "You were mentioned",
        body: (
          <>
            <span className="font-bold text-foreground">{n.fromName}</span> mentioned you in <span className="font-bold text-foreground">{n.taskTitle}</span>
            {n.commentText && <span className="block mt-1 italic text-muted-foreground truncate">"{n.commentText}"</span>}
          </>
        ),
        isInvite: false,
      };
    default:
      return {
        icon: <Bell className="h-5 w-5" />,
        iconBg: "bg-secondary text-muted-foreground",
        title: "Notification",
        body: <>{n.fromName} sent you a notification.</>,
        isInvite: false,
      };
  }
}

export function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const { notifications, fetchNotifications, respondToInvite, markAsRead, isLoading } = useNotificationStore();
  const { user } = useAuthStore();
  const { setActiveProject } = useProjectStore();
  const router = useRouter();

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRespond = async (e: React.MouseEvent, id: string, status: 'accepted' | 'declined') => {
    e.stopPropagation();
    await respondToInvite(id, status);
  };

  const handleNotificationClick = async (n: Notification) => {
    // Mark as read first
    if (n.status === 'pending') {
      await markAsRead(n.id);
    }

    // For task-related notifications, navigate to the board with the task open
    const taskTypes = ['task_assigned', 'task_comment', 'comment_reply', 'mention'];
    if (taskTypes.includes(n.type) && n.taskId && n.projectId) {
      // Switch to the correct project
      setActiveProject(n.projectId);
      // Navigate to board with taskId query param
      router.push(`/board?openTask=${n.taskId}`);
      onClose();
    }
  };

  return (
    <div className="absolute top-full right-0 mt-2 w-80 md:w-96 bg-card border border-border rounded-2xl shadow-elevated z-[100] flex flex-col max-h-[520px] animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-bold text-sm text-foreground">Notifications</h3>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-primary transition-colors font-medium">
          Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1">
        {isLoading && notifications.length === 0 ? (
          <div className="py-8 flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((n) => {
            const meta = getNotificationMeta(n);
            return (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-3 rounded-xl border border-transparent transition-all cursor-pointer ${
                  n.status === 'pending'
                    ? 'bg-primary/5 border-primary/10 ring-1 ring-primary/20'
                    : 'hover:bg-secondary opacity-80'
                }`}
              >
                <div className="flex gap-3">
                  <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ${meta.iconBg}`}>
                    {meta.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-foreground leading-tight">{meta.title}</p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{meta.body}</p>

                    {meta.isInvite && (n.status === 'pending' || n.status === 'read') ? (
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={(e) => handleRespond(e, n.id, 'accepted')}
                          className="flex-1 py-1.5 rounded-lg bg-primary text-white text-[10px] font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
                        >
                          <Check className="h-3 w-3" />
                          Accept
                        </button>
                        <button
                          onClick={(e) => handleRespond(e, n.id, 'declined')}
                          className="flex-1 py-1.5 rounded-lg bg-secondary text-foreground text-[10px] font-bold hover:bg-destructive/10 hover:text-destructive transition-colors flex items-center justify-center gap-1"
                        >
                          <X className="h-3 w-3" />
                          Decline
                        </button>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${
                          n.status === 'accepted' ? 'bg-emerald-100 text-emerald-600' :
                          n.status === 'declined' ? 'bg-rose-100 text-rose-600' :
                          'bg-secondary text-muted-foreground'
                        }`}>
                          {n.status}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center px-4">
            <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground mb-3 opacity-20">
              <Bell className="h-6 w-6" />
            </div>
            <p className="text-xs font-bold text-foreground">No notifications</p>
            <p className="text-[10px] text-muted-foreground mt-1">Mentions, comments, and invites will show up here.</p>
          </div>
        )}
      </div>
    </div>
  );
}


