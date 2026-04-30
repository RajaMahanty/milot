"use client";

import React, { useState, useEffect, useRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  X,
  Search,
  UserPlus,
  Users,
  CheckCircle2,
  Loader2,
  Mail,
  Shield,
  Trash2,
} from "lucide-react";
import { userService, UserProfile } from "@/lib/userService";
import { useProjectStore } from "@/store/useProjectStore";
import { useTeamStore } from "@/store/useTeamStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "@/store/useToastStore";

interface InviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
}

export function InviteModal({
  open,
  onOpenChange,
  projectId,
  projectName,
}: InviteModalProps) {
  const { projects, inviteMemberToProject, updateProject } = useProjectStore();
  const { teams, fetchTeams } = useTeamStore();
  const { sendNotification } = useNotificationStore();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<"people" | "teams">("people");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [invitedUids, setInvitedUids] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const project = projects[projectId];

  useEffect(() => {
    if (open) {
      fetchTeams();
      setQuery("");
      setResults([]);
      setInvitedUids(new Set());
      if (project?.memberIds) {
        loadMembers(project.memberIds);
      }
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, projectId]);

  const loadMembers = async (uids: string[]) => {
    const data = await userService.getUsersByIds(uids);
    setMembers(data);
  };

  const handleSearch = async (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const data = await userService.searchUsers(value);
      // Filter out already-members and self
      const filteredData = data.filter(
        (u) => u.uid !== user?.uid && !project?.memberIds?.includes(u.uid),
      );
      setResults(filteredData);
    } catch {
      toast.error("Search failed.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleInvite = async (targetUser: UserProfile) => {
    if (!project) return;
    if (invitedUids.has(targetUser.uid)) return;

    await sendNotification({
      type: "project_invite",
      toUid: targetUser.uid,
      projectId: project.id,
      projectName: project.title,
    });

    setInvitedUids((prev) => new Set([...prev, targetUser.uid]));
  };

  const handleAssignTeam = async (teamId: string) => {
    if (!project) return;
    if (project.teamIds?.includes(teamId)) {
      toast.error("Team already assigned.");
      return;
    }
    await useProjectStore.getState().assignTeamToProject(project.id, teamId);
    toast.success("Team assigned to workspace!");
  };

  const handleRemoveTeam = async (teamId: string) => {
    if (!project) return;
    const confirmed = window.confirm("Remove this team from the workspace?");
    if (!confirmed) return;

    const newTeamIds = project.teamIds?.filter((id) => id !== teamId) ?? [];
    await updateProject(project.id, { teamIds: newTeamIds });
    toast.success("Team removed from workspace.");
  };

  const handleRemoveMember = async (uid: string) => {
    if (!project) return;
    const newMemberIds = project.memberIds.filter((id) => id !== uid);
    await updateProject(project.id, { memberIds: newMemberIds });
    setMembers((prev) => prev.filter((m) => m.uid !== uid));
  };

  const isOwner = project?.uid === user?.uid;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card border border-border rounded-[32px] shadow-card p-0 overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-border">
            <div className="flex items-center gap-4">
              <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogPrimitive.Title className="text-lg font-bold tracking-tight">
                  Invite to Workspace
                </DialogPrimitive.Title>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {projectName}
                </p>
              </div>
            </div>
            <DialogPrimitive.Close className="p-2 rounded-xl hover:bg-secondary text-muted-foreground transition-colors">
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-7 pt-5">
            {(["people", "teams"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all capitalize ${
                  activeTab === tab
                    ? "bg-primary text-white shadow-elevated"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {tab === "people" ? (
                  <span className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    People
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5" />
                    Teams
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto no-scrollbar px-7 py-5 space-y-6">
            {activeTab === "people" ? (
              <>
                {/* Live search */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                    Search Members
                  </label>
                  <div className="relative">
                    {isSearching ? (
                      <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-spin" />
                    ) : (
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    )}
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Search by name, username or email..."
                      value={query}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-background transition-all"
                    />
                  </div>

                  {/* Search Results */}
                  {results.length > 0 && (
                    <div className="space-y-2 mt-2 animate-in fade-in slide-in-from-top-2">
                      {results.map((u) => {
                        const invited = invitedUids.has(u.uid);
                        return (
                          <div
                            key={u.uid}
                            className="flex items-center justify-between p-3 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/40 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xs font-bold ring-1 ring-primary/20">
                                {u.displayName?.substring(0, 2).toUpperCase() ||
                                  "U"}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-foreground leading-none">
                                  {u.displayName}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  @{u.username}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleInvite(u)}
                              disabled={invited}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                invited
                                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                  : "bg-primary/10 text-primary hover:bg-primary hover:text-white active:scale-95"
                              }`}
                            >
                              {invited ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Invited
                                </>
                              ) : (
                                <>
                                  <UserPlus className="h-3.5 w-3.5" />
                                  Invite
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {query.length >= 2 &&
                    !isSearching &&
                    results.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4 italic">
                        No users found matching "{query}".
                      </p>
                    )}
                </div>

                {/* Current Members */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                      Workspace Members
                    </h4>
                    <span className="text-[9px] font-bold bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">
                      {members.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {members.map((m) => (
                      <div
                        key={m.uid}
                        className="flex items-center justify-between p-3 rounded-xl border border-border group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-secondary text-primary flex items-center justify-center text-xs font-bold ring-1 ring-border">
                            {m.displayName?.substring(0, 2).toUpperCase() ||
                              "U"}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground leading-none">
                              {m.displayName}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              @{m.username}
                            </p>
                          </div>
                        </div>
                        {project?.uid === m.uid ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                            <Shield className="h-3 w-3" />
                            Owner
                          </span>
                        ) : isOwner ? (
                          <button
                            onClick={() => handleRemoveMember(m.uid)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                            title="Remove from workspace"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-lg">
                            Member
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Available teams to assign */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                    Your Teams
                  </h4>
                  {teams.length > 0 ? (
                    <div className="space-y-2">
                      {teams.map((t) => {
                        const assigned = project?.teamIds?.includes(t.id);
                        return (
                          <div
                            key={t.id}
                            className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-secondary/20 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                {t.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-foreground leading-none">
                                  {t.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {t.memberIds.length} member
                                  {t.memberIds.length !== 1 ? "s" : ""}
                                </p>
                              </div>
                            </div>
                            {assigned ? (
                              <button
                                onClick={() => handleRemoveTeam(t.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-destructive border border-destructive/20 hover:bg-destructive/10 transition-all"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Remove
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAssignTeam(t.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-primary/10 text-primary hover:bg-primary hover:text-white active:scale-95"
                              >
                                <Users className="h-3.5 w-3.5" />
                                Assign
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed border-border rounded-2xl">
                      <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs font-bold text-muted-foreground">
                        No teams created yet.
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        Create a team in the Team page first.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-7 pb-6 pt-4 border-t border-border">
            <p className="text-[10px] text-muted-foreground text-center">
              Invited users will receive a notification and must accept to gain
              access.
            </p>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
