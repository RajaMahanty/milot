"use client";

import React, { useEffect, useState } from "react";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Bell, UserPlus, Check, X, Clock, ExternalLink, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const { notifications, fetchNotifications, respondToInvite, markAsRead, isLoading } = useNotificationStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleRespond = async (e: React.MouseEvent, id: string, status: 'accepted' | 'declined') => {
    e.stopPropagation();
    await respondToInvite(id, status);
  };

  return (
    <div className="absolute top-full right-0 mt-2 w-80 md:w-96 bg-card border border-border rounded-2xl shadow-elevated z-[100] flex flex-col max-h-[500px] animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-bold text-sm text-foreground">Notifications</h3>
        <button 
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-primary transition-colors font-medium"
        >
          Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1">
        {isLoading && notifications.length === 0 ? (
          <div className="py-8 flex justify-center">
             <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((n) => (
            <div 
              key={n.id}
              onClick={() => n.status === 'pending' ? null : markAsRead(n.id)}
              className={`p-3 rounded-xl border border-transparent transition-all ${
                n.status === 'pending' 
                ? 'bg-primary/5 border-primary/10' 
                : 'hover:bg-secondary'
              }`}
            >
              <div className="flex gap-3">
                <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ${
                  n.type === 'team_invite' ? 'bg-blue-100 text-blue-600' : 
                  n.type === 'task_assigned' ? 'bg-amber-100 text-amber-600' :
                  'bg-brand-secondary/10 text-brand-secondary'
                }`}>
                  {n.type === 'task_assigned' ? <Zap className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-foreground leading-tight">
                      {n.type === 'team_invite' ? (
                        <>Team Invitation</>
                      ) : n.type === 'task_assigned' ? (
                        <>Task Assigned</>
                      ) : (
                        <>Project Invitation</>
                      )}
                    </p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {n.type === 'task_assigned' ? (
                      <>
                        <span className="font-bold text-foreground">{n.fromName}</span> assigned you to 
                        <span className="font-bold text-foreground"> {n.taskTitle}</span>.
                      </>
                    ) : (
                      <>
                        <span className="font-bold text-foreground">{n.fromName}</span> invited you to join 
                        <span className="font-bold text-foreground"> {n.teamName || n.projectName}</span>.
                      </>
                    )}
                  </p>

                  {n.status === 'pending' ? (
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
                    <div className="mt-2 flex items-center gap-1.5">
                       <span className={`text-[10px] font-bold uppercase tracking-wider ${
                         n.status === 'accepted' ? 'text-emerald-500' : 'text-rose-500'
                       }`}>
                         {n.status}
                       </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center px-4">
             <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground mb-3 opacity-20">
                <Bell className="h-6 w-6" />
             </div>
             <p className="text-xs font-bold text-foreground">No notifications</p>
             <p className="text-[10px] text-muted-foreground mt-1">When you get invited to a team or project, it will show up here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
