"use client";

import React, { useState, useEffect } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, Search, UserPlus, Users, Trash2, Shield, User, Plus } from "lucide-react";
import { userService, UserProfile } from "@/lib/userService";
import { useProjectStore, Project } from "@/store/useProjectStore";
import { useTeamStore } from "@/store/useTeamStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "@/store/useToastStore";

export function ShareProjectModal({ 
  open, 
  onOpenChange, 
  project 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  project: Project | null;
}) {
  const { inviteMemberToProject, assignTeamToProject, updateProject } = useProjectStore();
  const { teams, fetchTeams } = useTeamStore();
  const { sendNotification } = useNotificationStore();
  const { user } = useAuthStore();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'people' | 'teams'>('people');

  useEffect(() => {
    if (open) {
      fetchTeams();
      setSearchQuery("");
      setSearchResults([]);
      if (project) {
        loadMembers(project.memberIds);
      }
    }
  }, [open, project]);

  // Live search with debounce
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => handleSearch(), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadMembers = async (uids: string[]) => {
    const data = await userService.getUsersByIds(uids);
    setMembers(data);
  };

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) return;
    setIsSearching(true);
    try {
      const data = await userService.searchUsers(searchQuery);
      // Filter out existing members
      setSearchResults(data.filter(u => !project?.memberIds?.includes(u.uid)));
    } catch (err) {
      toast.error("Search failed.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleInvitePerson = async (targetUser: UserProfile) => {
    if (!project) return;
    if (project.memberIds.includes(targetUser.uid)) {
      toast.error("User is already a member.");
      return;
    }

    await sendNotification({
      type: 'project_invite',
      toUid: targetUser.uid,
      projectId: project.id,
      projectName: project.title
    });
    
    setSearchResults(prev => prev.filter(u => u.uid !== targetUser.uid));
  };

  const handleAssignTeam = async (teamId: string) => {
    if (!project) return;
    await assignTeamToProject(project.id, teamId);
    toast.success("Team assigned to project!");
  };

  const handleRemoveMember = async (uid: string) => {
    if (!project) return;
    const newMemberIds = project.memberIds.filter(id => id !== uid);
    await updateProject(project.id, { memberIds: newMemberIds });
    setMembers(prev => prev.filter(m => m.uid !== uid));
  };

  const handleRemoveTeam = async (teamId: string) => {
    if (!project) return;
    const newTeamIds = project.teamIds.filter(id => id !== teamId);
    await updateProject(project.id, { teamIds: newTeamIds });
  };

  if (!project) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-6 rounded-[32px] border border-border bg-card p-8 shadow-card animate-in zoom-in-95 max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <UserPlus className="h-6 w-6" />
              </div>
              <div>
                <DialogPrimitive.Title className="text-2xl font-bold tracking-tight">Share Workspace</DialogPrimitive.Title>
                <p className="text-sm text-muted-foreground">{project.title}</p>
              </div>
            </div>
            <DialogPrimitive.Close className="p-2 rounded-xl hover:bg-secondary text-muted-foreground transition-colors">
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex gap-2 p-1 bg-secondary/50 rounded-xl w-fit">
            <button 
              onClick={() => setActiveTab('people')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'people' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'}`}
            >
              People
            </button>
            <button 
              onClick={() => setActiveTab('teams')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'teams' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'}`}
            >
              Teams
            </button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar space-y-8">
            {activeTab === 'people' ? (
              <div className="space-y-6">
                {/* Search and Invite */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Invite People</h4>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      {isSearching ? (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      )}
                      <input 
                        type="text"
                        placeholder="Search by name, email, or username..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-background transition-all"
                      />
                    </div>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 animate-in fade-in slide-in-from-top-2">
                      {searchResults.map(u => (
                        <div key={u.uid} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card/50">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                              {u.displayName?.substring(0, 2).toUpperCase() || "U"}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-foreground truncate">{u.displayName}</p>
                              <p className="text-[10px] text-muted-foreground">@{u.username}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleInvitePerson(u)}
                            className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all"
                          >
                            <UserPlus className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Member List */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Workspace Members</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {members.map(m => (
                      <div key={m.uid} className="flex items-center justify-between p-3 rounded-xl border border-border group">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold text-primary ring-1 ring-border shadow-sm">
                            {m.displayName?.substring(0, 2).toUpperCase() || "U"}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground leading-none">{m.displayName}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">@{m.username}</p>
                          </div>
                        </div>
                        {project.uid === m.uid ? (
                          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg">Owner</span>
                        ) : project.uid === user?.uid && (
                          <button 
                            onClick={() => handleRemoveMember(m.uid)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Assign Team */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Assign Team</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {teams.filter(t => !project.teamIds.includes(t.id)).length > 0 ? (
                      teams.filter(t => !project.teamIds.includes(t.id)).map(t => (
                        <button
                          key={t.id}
                          onClick={() => handleAssignTeam(t.id)}
                          className="flex items-center justify-between p-3 rounded-xl border border-border bg-card/50 hover:bg-secondary transition-all text-left group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                              {t.name.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-xs font-bold text-foreground">{t.name}</span>
                          </div>
                          <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </button>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground italic p-4 text-center border border-dashed border-border rounded-xl col-span-2">
                        No teams available to assign.
                      </p>
                    )}
                  </div>
                </div>

                {/* Assigned Teams */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Assigned Teams</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {project.teamIds.length > 0 ? (
                      project.teamIds.map(teamId => {
                        const team = teams.find(t => t.id === teamId);
                        return (
                          <div key={teamId} className="flex items-center justify-between p-3 rounded-xl border border-border group">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                {team?.name.substring(0, 2).toUpperCase() || "T"}
                              </div>
                              <span className="text-sm font-bold text-foreground">{team?.name || "Unknown Team"}</span>
                            </div>
                            {project.uid === user?.uid && (
                              <button 
                                onClick={() => handleRemoveTeam(teamId)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-muted-foreground italic p-4 text-center col-span-2">
                        No teams assigned to this workspace.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
