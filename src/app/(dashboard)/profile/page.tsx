"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { userService, UserProfile } from "@/lib/userService";
import { useKanbanStore, Task } from "@/store/useTaskStore";
import { TaskModal } from "@/components/task/TaskModal";
import { taskService } from "@/lib/taskService";
import {
  User,
  Settings,
  Users,
  CheckCircle2,
  Activity,
  Edit3,
  Globe,
  Mail,
  Calendar,
  Save,
  Search as SearchIcon,
  UserPlus,
  UserMinus,
  ExternalLink,
  X,
} from "lucide-react";
import { toast } from "@/store/useToastStore";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { user } = useAuthStore();
  const { tasks, editTask } = useKanbanStore();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<
    "overview" | "settings" | "network"
  >("overview");
  const [isLoading, setIsLoading] = useState(true);

  // Task Modal States
  const [activeEditTask, setActiveEditTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Edit States
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Search/Network States
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Network Modal States
  const [networkModal, setNetworkModal] = useState<{
    isOpen: boolean;
    type: "followers" | "following";
    title: string;
  }>({ isOpen: false, type: "followers", title: "" });
  const [networkModalUsers, setNetworkModalUsers] = useState<UserProfile[]>([]);
  const [isNetworkModalLoading, setIsNetworkModalLoading] = useState(false);

  // Public Profile Modal States
  const [publicProfileModal, setPublicProfileModal] = useState<{
    isOpen: boolean;
    username: string;
  }>({ isOpen: false, username: "" });
  const [publicProfile, setPublicProfile] = useState<UserProfile | null>(null);
  const [publicTaskStats, setPublicTaskStats] = useState({ completed: 0 });
  const [isPublicProfileLoading, setIsPublicProfileLoading] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      loadProfile();
      loadAllTasks();
    }
  }, [user?.uid]);

  const loadAllTasks = async () => {
    if (!user) return;
    try {
      const { tasks: tasksRecord } = await taskService.fetchTasks(
        user.uid,
        "all",
      );
      setAllTasks(Object.values(tasksRecord));
    } catch (error) {
      console.error("Failed to load all tasks:", error);
    }
  };

  const loadProfile = async () => {
    if (!user) return;
    try {
      // Sync profile if it doesn't exist
      await userService.syncProfile(user.uid, {
        displayName: user.displayName,
        email: user.email,
      });

      const data = await userService.getProfile(user.uid);
      if (data) {
        setProfile(data);
        setEditName(data.displayName || "");
        setEditBio(data.bio || "");
        setEditUsername(data.username || "");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load profile.");
    } finally {
      setIsLoading(false);
    }
  };

  const usernamePattern = /^[a-z_]+$/;

  const sanitizeUsernameInput = (value: string) => {
    const normalized = value.toLowerCase().replace(/\s+/g, "_");
    return normalized
      .replace(/[^a-z_]/g, "")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const cleanUsername = sanitizeUsernameInput(editUsername.trim());

      if (!cleanUsername) {
        setUsernameError("Username is required.");
        setIsSaving(false);
        return;
      }

      if (!usernamePattern.test(cleanUsername)) {
        setUsernameError(
          "Username may only contain lowercase letters (a-z) and underscores.",
        );
        setIsSaving(false);
        return;
      }

      setUsernameError(null);

      if (profile?.username !== cleanUsername) {
        const isAvailable =
          await userService.isUsernameAvailable(cleanUsername);
        if (!isAvailable) {
          setUsernameError("Username is already taken.");
          setIsSaving(false);
          return;
        }
      }

      await userService.updateProfile(user.uid, {
        displayName: editName,
        bio: editBio,
        username: cleanUsername,
      });
      toast.success("Profile updated successfully!");
      loadProfile();
    } catch (error) {
      toast.error("Update failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSearchUsers = async () => {
    if (userSearchQuery.trim().length < 2) return;
    setIsSearching(true);
    try {
      const results = await userService.searchUsers(userSearchQuery);
      setSearchResults(results);
    } catch (error) {
      toast.error("Search failed.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleFollow = async (targetUid: string) => {
    if (!user) return;
    try {
      await userService.followUser(user.uid, targetUid);
      toast.success("User followed!");
      loadProfile();
      // Update search results locally too
      setSearchResults((prev) =>
        prev.map((u) =>
          u.uid === targetUid
            ? { ...u, followers: [...(u.followers || []), user.uid] }
            : u,
        ),
      );
    } catch (error) {
      toast.error("Follow action failed.");
    }
  };

  const handleUnfollow = async (targetUid: string) => {
    if (!user) return;
    try {
      await userService.unfollowUser(user.uid, targetUid);
      toast.success("Unfollowed user.");
      loadProfile();
      setSearchResults((prev) =>
        prev.map((u) =>
          u.uid === targetUid
            ? {
                ...u,
                followers: (u.followers || []).filter((id) => id !== user.uid),
              }
            : u,
        ),
      );
      setNetworkModalUsers((prev) =>
        prev.map((u) =>
          u.uid === targetUid
            ? {
                ...u,
                followers: (u.followers || []).filter((id) => id !== user.uid),
              }
            : u,
        ),
      );
    } catch (error) {
      toast.error("Unfollow action failed.");
    }
  };

  const handleOpenNetworkModal = async (
    type: "followers" | "following",
    sourceProfile?: UserProfile | null,
  ) => {
    const target = sourceProfile || profile;
    const uids = type === "followers" ? target?.followers : target?.following;
    if (!uids || uids.length === 0) return;

    setNetworkModal({
      isOpen: true,
      type,
      title: type === "followers" ? "Followers" : "Following",
    });
    setIsNetworkModalLoading(true);
    try {
      const users = await userService.getUsersByIds(uids);
      setNetworkModalUsers(users);
    } catch (error) {
      toast.error("Failed to load users");
    } finally {
      setIsNetworkModalLoading(false);
    }
  };

  const handleOpenPublicProfile = async (username: string) => {
    setPublicProfileModal({ isOpen: true, username });
    setIsPublicProfileLoading(true);
    setPublicTaskStats({ completed: 0 });
    try {
      const data = await userService.getProfileByUsername(username);
      setPublicProfile(data);
      if (data) {
        const { tasks: tasksRecord } = await taskService.fetchTasks(
          data.uid,
          "all",
        );
        const completed = Object.values(tasksRecord).filter(
          (t) => t.status === "done" || t.status === "archived",
        ).length;
        setPublicTaskStats({ completed });
      }
    } catch (error) {
      toast.error("Failed to load user profile");
      setPublicProfileModal({ isOpen: false, username: "" });
    } finally {
      setIsPublicProfileLoading(false);
    }
  };

  const handleSaveTask = async (data: any) => {
    if (activeEditTask) {
      await editTask(activeEditTask.id, {
        ...data,
        projectId: data.projectId,
      });
      loadAllTasks();
    }
  };

  const taskStats = React.useMemo(() => {
    const completed = allTasks.filter(
      (t) => t.status === "done" || t.status === "archived",
    ).length;
    return {
      total: allTasks.length,
      completed: completed,
      completionRate:
        allTasks.length > 0
          ? Math.round((completed / allTasks.length) * 100)
          : 0,
    };
  }, [allTasks]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-secondary"></div>
          <p className="text-sm font-bold">Synchronizing Profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      {/* Profile Header */}
      <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden mb-8">
        <div className="h-28 bg-gradient-to-r from-primary/15 to-secondary/15"></div>
        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[auto_minmax(0,1fr)_auto] items-start">
          <div className="h-24 w-24 rounded-3xl bg-primary flex items-center justify-center text-3xl font-bold text-white shadow-md">
            {profile?.displayName?.substring(0, 2).toUpperCase() || "TM"}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-foreground truncate">
              {profile?.displayName || "User"}
            </h1>
            <p className="text-sm font-medium text-primary mt-1 mb-2">
              @{profile?.username || "username"}
            </p>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            <div className="flex flex-wrap gap-3 mt-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary/50 px-2 py-1 rounded">
                Joined{" "}
                {profile
                  ? new Date(profile.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      year: "numeric",
                    })
                  : "Recently"}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/5 px-2 py-1 rounded">
                {taskStats.completed} Tasks Completed
              </span>
              <span
                onClick={() => handleOpenNetworkModal("followers")}
                className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary/50 px-2 py-1 rounded cursor-pointer hover:bg-secondary hover:text-foreground transition-colors"
              >
                {profile?.followers?.length || 0} Followers
              </span>
              <span
                onClick={() => handleOpenNetworkModal("following")}
                className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary/50 px-2 py-1 rounded cursor-pointer hover:bg-secondary hover:text-foreground transition-colors"
              >
                {profile?.following?.length || 0} Following
              </span>
            </div>
          </div>
          <div className="self-start md:self-center">
            <button
              onClick={() => setActiveTab("settings")}
              className="px-4 py-2 rounded-2xl border border-border hover:bg-secondary text-xs font-bold transition-all"
            >
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Simple Side Nav */}
        <div className="flex flex-col gap-2">
          {[
            { id: "overview", label: "Overview", icon: User },
            { id: "settings", label: "Settings", icon: Settings },
            { id: "network", label: "Network", icon: Users },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Panels */}
        <div>
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm min-h-[360px]">
            {activeTab === "overview" && (
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
                  Biography
                </h2>
                <p className="text-sm text-foreground leading-relaxed">
                  {profile?.bio || "No biography provided."}
                </p>

                <div className="mt-8">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
                    Recent Activity
                  </h2>
                  <div className="space-y-2">
                    {allTasks
                      .sort(
                        (a, b) =>
                          new Date(b.createdAt).getTime() -
                          new Date(a.createdAt).getTime(),
                      )
                      .slice(0, 5)
                      .map((t) => {
                        let actionText = "Created task";
                        let actionColor = "text-muted-foreground";

                        if (t.status === "in-progress") {
                          actionText = "Started working on";
                          actionColor = "text-blue-500 dark:text-blue-400";
                        } else if (t.status === "done") {
                          actionText = "Completed task";
                          actionColor = "text-green-500 dark:text-green-400";
                        } else if (t.status === "archived") {
                          actionText = "Archived task";
                        }

                        return (
                          <div
                            key={t.id}
                            onClick={() => {
                              setActiveEditTask(t);
                              setIsTaskModalOpen(true);
                            }}
                            className="p-3 rounded-xl border border-border text-xs flex flex-col gap-1 hover:bg-secondary/20 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-foreground">
                                {t.title.length > 45
                                  ? `${t.title.slice(0, 45)}…`
                                  : t.title}
                              </span>
                              <span
                                className={`text-[10px] font-bold ${actionColor}`}
                              >
                                {actionText}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(t.createdAt).toLocaleDateString(
                                undefined,
                                {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </p>
                          </div>
                        );
                      })}
                    {allTasks.length === 0 && (
                      <p className="text-xs text-muted-foreground italic bg-secondary/10 p-4 rounded-xl text-center border border-dashed border-border">
                        No recent activity.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="max-w-md">
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6">
                  Profile Settings
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1.5 ml-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full h-10 rounded-xl bg-secondary/30 border border-border px-4 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1.5 ml-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => {
                        const sanitized = sanitizeUsernameInput(e.target.value);
                        setEditUsername(sanitized);
                        if (
                          sanitized !==
                          e.target.value.toLowerCase().replace(/\s+/g, "_")
                        ) {
                          setUsernameError(
                            "Username may only contain lowercase letters (a-z) and underscores.",
                          );
                        } else {
                          setUsernameError(null);
                        }
                      }}
                      className={`w-full h-10 rounded-xl bg-secondary/30 border px-4 text-sm font-medium focus:outline-none focus:ring-1 ${
                        usernameError
                          ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                          : "border-border focus:border-primary focus:ring-primary"
                      }`}
                    />
                    {usernameError && (
                      <p className="mt-2 text-[10px] text-destructive">
                        {usernameError}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1.5 ml-1">
                      Bio
                    </label>
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      className="w-full h-32 rounded-xl bg-secondary/30 border border-border p-4 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    />
                  </div>
                  <button
                    disabled={isSaving}
                    onClick={handleUpdateProfile}
                    className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:opacity-90 disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}

            {activeTab === "network" && (
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6">
                  User Network
                </h2>
                <div className="flex gap-2 mb-6">
                  <input
                    type="text"
                    placeholder="Find users..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="flex-1 h-10 rounded-xl bg-secondary/30 border border-border px-4 text-sm focus:outline-none"
                  />
                  <button
                    onClick={handleSearchUsers}
                    className="px-4 rounded-xl bg-primary text-white text-xs font-bold"
                  >
                    Search
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {searchResults.length > 0 ? (
                    searchResults.map((u) => {
                      const isFollowing = profile?.following?.includes(u.uid);
                      return (
                        <div
                          key={u.uid}
                          className="p-3 rounded-xl border border-border flex items-center justify-between"
                        >
                          <div
                            className="flex items-center gap-3 cursor-pointer"
                            onClick={() => handleOpenPublicProfile(u.username)}
                          >
                            <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-[10px] font-bold text-foreground shadow-sm">
                              {u.displayName?.substring(0, 2).toUpperCase() ||
                                "U"}
                            </div>
                            <div className="text-xs">
                              <p className="font-bold text-foreground hover:underline">
                                {u.displayName}
                              </p>
                              <p className="text-[10px] text-primary font-medium">
                                @{u.username}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (u.uid === user?.uid) return;
                              isFollowing
                                ? handleUnfollow(u.uid)
                                : handleFollow(u.uid);
                            }}
                            disabled={u.uid === user?.uid}
                            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                              u.uid === user?.uid
                                ? "bg-secondary/50 text-muted-foreground/50 cursor-not-allowed"
                                : isFollowing
                                  ? "bg-secondary text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                  : "bg-primary/10 text-primary hover:bg-primary/20"
                            }`}
                          >
                            {u.uid === user?.uid
                              ? "You"
                              : isFollowing
                                ? "Unfollow"
                                : "Follow"}
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-8 bg-secondary/10 rounded-xl border border-dashed border-border">
                      Search to find people to follow.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Network Modal */}
      {networkModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-elevated overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-bold text-foreground">
                {networkModal.title}
              </h3>
              <button
                onClick={() =>
                  setNetworkModal({ ...networkModal, isOpen: false })
                }
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4 flex flex-col gap-3">
              {isNetworkModalLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : networkModalUsers.length > 0 ? (
                networkModalUsers.map((u) => {
                  const isFollowing = profile?.following?.includes(u.uid);
                  return (
                    <div
                      key={u.uid}
                      className="p-3 rounded-xl border border-border flex items-center justify-between hover:bg-secondary/20 transition-colors"
                    >
                      <div
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => {
                          setNetworkModal({ ...networkModal, isOpen: false });
                          handleOpenPublicProfile(u.username);
                        }}
                      >
                        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-xs font-bold text-white shadow-sm">
                          {u.displayName?.substring(0, 2).toUpperCase() || "U"}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <p className="font-bold text-sm text-foreground truncate hover:underline">
                            {u.displayName}
                          </p>
                          <p className="text-xs text-primary font-medium">
                            @{u.username}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (u.uid === user?.uid) return;
                          isFollowing
                            ? handleUnfollow(u.uid)
                            : handleFollow(u.uid);
                        }}
                        disabled={u.uid === user?.uid}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                          u.uid === user?.uid
                            ? "bg-secondary/50 text-muted-foreground/50 cursor-not-allowed"
                            : isFollowing
                              ? "bg-secondary text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              : "bg-primary/10 text-primary hover:bg-primary/20"
                        }`}
                      >
                        {u.uid === user?.uid
                          ? "You"
                          : isFollowing
                            ? "Unfollow"
                            : "Follow"}
                      </button>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No users found.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Public Profile Modal */}
      {publicProfileModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in p-4">
          <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-elevated overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-bold text-foreground">User Profile</h3>
              <button
                onClick={() =>
                  setPublicProfileModal({ isOpen: false, username: "" })
                }
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 flex-1">
              {isPublicProfileLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : publicProfile ? (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                    <div className="h-24 w-24 rounded-2xl bg-primary shrink-0 flex items-center justify-center text-3xl font-bold text-white shadow-md">
                      {publicProfile.displayName
                        ?.substring(0, 2)
                        .toUpperCase() || "U"}
                    </div>
                    <div className="flex-1 text-center md:text-left min-w-0">
                      <h2 className="text-2xl font-bold text-foreground truncate">
                        {publicProfile.displayName}
                      </h2>
                      <p className="text-sm font-medium text-primary mt-0.5 mb-2">
                        @{publicProfile.username}
                      </p>

                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary/50 px-2 py-1 rounded">
                          Joined{" "}
                          {new Date(publicProfile.createdAt).toLocaleDateString(
                            undefined,
                            { month: "short", year: "numeric" },
                          )}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/5 px-2 py-1 rounded">
                          {publicTaskStats.completed} Tasks Completed
                        </span>
                        <span
                          onClick={() =>
                            publicProfile?.followers?.length &&
                            handleOpenNetworkModal("followers", publicProfile)
                          }
                          className={`text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary/50 px-2 py-1 rounded transition-colors ${publicProfile?.followers?.length ? "cursor-pointer hover:bg-secondary hover:text-foreground" : ""}`}
                        >
                          {publicProfile.followers?.length || 0} Followers
                        </span>
                        <span
                          onClick={() =>
                            publicProfile?.following?.length &&
                            handleOpenNetworkModal("following", publicProfile)
                          }
                          className={`text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary/50 px-2 py-1 rounded transition-colors ${publicProfile?.following?.length ? "cursor-pointer hover:bg-secondary hover:text-foreground" : ""}`}
                        >
                          {publicProfile.following?.length || 0} Following
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {user?.uid !== publicProfile.uid && (
                        <button
                          onClick={() => {
                            const isFollowing =
                              publicProfile.followers?.includes(
                                user?.uid || "",
                              );
                            if (isFollowing) {
                              handleUnfollow(publicProfile.uid);
                              setPublicProfile((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      followers: prev.followers?.filter(
                                        (id) => id !== user?.uid,
                                      ),
                                    }
                                  : null,
                              );
                            } else {
                              handleFollow(publicProfile.uid);
                              setPublicProfile((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      followers: [
                                        ...(prev.followers || []),
                                        user!.uid,
                                      ],
                                    }
                                  : null,
                              );
                            }
                          }}
                          className={`px-6 py-2 rounded-xl text-xs font-bold transition-all shadow-sm w-full md:w-auto ${
                            publicProfile.followers?.includes(user?.uid || "")
                              ? "bg-secondary text-foreground hover:bg-destructive/10 hover:text-destructive border border-border"
                              : "bg-primary text-white hover:opacity-90"
                          }`}
                        >
                          {publicProfile.followers?.includes(user?.uid || "")
                            ? "Unfollow"
                            : "Follow"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="bg-secondary/20 border border-border rounded-xl p-5">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                      Biography
                    </h4>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {publicProfile.bio || "No biography provided."}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-12">
                  User not found.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Task Modal for viewing details from activity */}
      <TaskModal
        open={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setActiveEditTask(null);
        }}
        onSave={handleSaveTask}
        initialData={activeEditTask}
      />
    </div>
  );
}
