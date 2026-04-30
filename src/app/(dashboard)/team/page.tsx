"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTeamStore } from "@/store/useTeamStore";
import { useProjectStore } from "@/store/useProjectStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { userService, UserProfile } from "@/lib/userService";
import {
  Users,
  Plus,
  Search,
  UserPlus,
  Mail,
  Shield,
  Trash2,
  MoreVertical,
  X,
  CheckCircle2,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { toast } from "@/store/useToastStore";

export default function TeamPage() {
  const { teams, fetchTeams, createTeam, deleteTeam, removeMemberFromTeam } =
    useTeamStore();
  const { projects, fetchProjects, setActiveProject } = useProjectStore();
  const { sendNotification } = useNotificationStore();
  const { user } = useAuthStore();
  const router = useRouter();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      const team = teams.find((t) => t.id === selectedTeamId);
      if (team) loadTeamMembers(team.memberIds);
    } else if (teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [selectedTeamId, teams]);

  useEffect(() => {
    if (Object.keys(projects).length === 0) {
      fetchProjects();
    }
  }, [projects, fetchProjects]);

  // Auto-search as user types (debounced)
  useEffect(() => {
    if (userSearchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => handleSearchUsers(), 400);
    return () => clearTimeout(timer);
  }, [userSearchQuery]);

  const loadTeamMembers = async (uids: string[]) => {
    const members = await userService.getUsersByIds(uids);
    setTeamMembers(members);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    await createTeam(newTeamName);
    setNewTeamName("");
    setIsCreateModalOpen(false);
  };

  const handleSearchUsers = async () => {
    if (userSearchQuery.trim().length < 2) return;
    setIsSearching(true);
    try {
      const results = await userService.searchUsers(userSearchQuery);
      // Filter out existing members
      const existingIds = selectedTeam?.memberIds || [];
      setSearchResults(
        results.filter(
          (u) => !existingIds.includes(u.uid) && u.uid !== user?.uid,
        ),
      );
    } catch (error) {
      toast.error("Search failed.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleInviteToTeam = async (targetUser: UserProfile) => {
    if (!selectedTeamId) return;
    const team = teams.find((t) => t.id === selectedTeamId);
    if (!team) return;

    if (team.memberIds.includes(targetUser.uid)) {
      toast.error("User is already in this team.");
      return;
    }

    await sendNotification({
      type: "team_invite",
      toUid: targetUser.uid,
      teamId: team.id,
      teamName: team.name,
    });

    setSearchResults((prev) => prev.filter((u) => u.uid !== targetUser.uid));
  };

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);
  const associatedProjects = selectedTeam
    ? Object.values(projects).filter((project) =>
        project.teamIds.includes(selectedTeam.id),
      )
    : [];

  return (
    <div className="flex flex-col gap-8 pb-8 h-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Users className="h-5 w-5" />
            </div>
            Teams
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Collaborate with your team members across multiple projects.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground hover:opacity-90 transition-all shadow-elevated active:scale-95"
        >
          <Plus className="h-5 w-5" />
          Create Team
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Teams List Sidebar */}
        <div className="lg:col-span-1 space-y-3">
          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2 mb-2">
            Your Teams
          </div>
          {teams.length > 0 ? (
            teams.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTeamId(t.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left ${
                  selectedTeamId === t.id
                    ? "bg-primary/5 border-primary/20 text-primary shadow-sm"
                    : "bg-card border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      selectedTeamId === t.id
                        ? "bg-primary text-white"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {t.name.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm font-bold truncate max-w-[120px]">
                    {t.name}
                  </span>
                </div>
                <ChevronRight
                  className={`h-4 w-4 transition-transform ${selectedTeamId === t.id ? "translate-x-1" : ""}`}
                />
              </button>
            ))
          ) : (
            <div className="p-8 text-center border-2 border-dashed border-border rounded-2xl bg-secondary/10">
              <p className="text-xs font-medium text-muted-foreground">
                No teams yet.
              </p>
            </div>
          )}
        </div>

        {/* Team Details Panel */}
        <div className="lg:col-span-3 space-y-6">
          {selectedTeam ? (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-soft">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center text-xl font-bold text-white shadow-md">
                    {selectedTeam.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">
                      {selectedTeam.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedTeam.memberIds.length} Members • Created{" "}
                      {new Date(selectedTeam.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {selectedTeam.ownerId === user?.uid && (
                  <button
                    onClick={() => {
                      if (window.confirm("Delete team?"))
                        deleteTeam(selectedTeam.id);
                    }}
                    className="p-2.5 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors border border-border hover:border-destructive/20"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Members List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                      Team Members
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {teamMembers.map((m) => (
                      <div
                        key={m.uid}
                        className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-secondary/20 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold text-primary ring-1 ring-border shadow-sm">
                            {m.displayName?.substring(0, 2).toUpperCase() ||
                              "U"}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground leading-none">
                              {m.displayName}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              @{m.username}
                            </p>
                          </div>
                        </div>
                        {selectedTeam.ownerId === m.uid ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                            <Shield className="h-3 w-3" />
                            Owner
                          </span>
                        ) : (
                          selectedTeam.ownerId === user?.uid && (
                            <button
                              onClick={() =>
                                removeMemberFromTeam(selectedTeam.id, m.uid)
                              }
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Invite Members */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    Invite New Members
                  </h4>
                  {/* Live search input */}
                  <div className="space-y-3">
                    <div className="relative">
                      {isSearching ? (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      )}
                      <input
                        type="text"
                        placeholder="Search by name, email or username..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-background transition-all"
                      />
                    </div>

                    {userSearchQuery.length >= 2 &&
                      !isSearching &&
                      searchResults.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-2 italic">
                          No users found.
                        </p>
                      )}
                  </div>

                  <div className="space-y-2 mt-4 max-h-[200px] overflow-y-auto no-scrollbar">
                    {searchResults.length > 0 &&
                      searchResults.map((u) => {
                        const alreadyInvited = selectedTeam?.memberIds.includes(
                          u.uid,
                        );
                        return (
                          <div
                            key={u.uid}
                            className="flex items-center justify-between p-3 rounded-xl border border-border bg-card/50 hover:bg-card transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                {u.displayName?.substring(0, 2).toUpperCase() ||
                                  "U"}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground truncate">
                                  {u.displayName}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  @{u.username}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleInviteToTeam(u)}
                              disabled={alreadyInvited}
                              className={`p-1.5 rounded-lg transition-all shadow-sm active:scale-95 ${
                                alreadyInvited
                                  ? "bg-secondary text-muted-foreground cursor-not-allowed"
                                  : "bg-primary/10 text-primary hover:bg-primary hover:text-white"
                              }`}
                            >
                              {alreadyInvited ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                <UserPlus className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    Projects under this Team
                  </h4>
                  <span className="text-[10px] text-muted-foreground">
                    {associatedProjects.length} project
                    {associatedProjects.length === 1 ? "" : "s"}
                  </span>
                </div>
                {associatedProjects.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {associatedProjects.map((project) => (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => {
                          setActiveProject(project.id);
                          router.push("/board");
                        }}
                        className="text-left p-4 rounded-2xl border border-border bg-secondary/50 hover:bg-secondary/70 transition-all"
                      >
                        <h5 className="font-bold text-sm text-foreground truncate">
                          {project.title}
                        </h5>
                        <p className="text-[10px] text-muted-foreground mt-2 line-clamp-2">
                          {project.description || "No description provided."}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
                    No projects are currently assigned to this team.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-card border border-border border-dashed rounded-3xl">
              <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground mb-4 opacity-50">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-foreground">
                Select or Create a Team
              </h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                Teams allow you to group people together and assign them to
                projects with a single click.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Team Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-card border border-border rounded-[32px] shadow-card overflow-hidden animate-in zoom-in-95 p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold tracking-tight">New Team</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 rounded-xl hover:bg-secondary text-muted-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Team Name
                </label>
                <input
                  autoFocus
                  required
                  placeholder="e.g. Design Team"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-background transition-all"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-elevated hover:opacity-90 active:scale-95 transition-all"
                >
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
