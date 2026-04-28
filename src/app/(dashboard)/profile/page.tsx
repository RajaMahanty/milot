"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { userService, UserProfile } from "@/lib/userService";
import { useKanbanStore } from "@/store/useTaskStore";
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
  ExternalLink
} from "lucide-react";
import { toast } from "@/store/useToastStore";

export default function ProfilePage() {
  const { user } = useAuthStore();
  const { tasks } = useKanbanStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "settings" | "network">("overview");
  const [isLoading, setIsLoading] = useState(true);
  
  // Edit States
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Search/Network States
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      loadProfile();
    }
  }, [user?.uid]);

  const loadProfile = async () => {
    if (!user) return;
    try {
      // Sync profile if it doesn't exist
      await userService.syncProfile(user.uid, {
        displayName: user.displayName,
        email: user.email
      });
      
      const data = await userService.getProfile(user.uid);
      if (data) {
        setProfile(data);
        setEditName(data.displayName || "");
        setEditBio(data.bio || "");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load profile.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await userService.updateProfile(user.uid, {
        displayName: editName,
        bio: editBio
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
      setSearchResults(results.filter(u => u.uid !== user?.uid)); // Don't show self
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
      setSearchResults(prev => prev.map(u => 
        u.uid === targetUid ? { ...u, followers: [...(u.followers || []), user.uid] } : u
      ));
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
      setSearchResults(prev => prev.map(u => 
        u.uid === targetUid ? { ...u, followers: (u.followers || []).filter(id => id !== user.uid) } : u
      ));
    } catch (error) {
      toast.error("Unfollow action failed.");
    }
  };

  const taskStats = React.useMemo(() => {
     const allTasks = Object.values(tasks);
     const completed = allTasks.filter(t => t.status === "done").length;
     return {
        total: allTasks.length,
        completed: completed,
        completionRate: allTasks.length > 0 ? Math.round((completed / allTasks.length) * 100) : 0
     };
  }, [tasks]);

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
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Profile Header */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm mb-6">
        <div className="h-32 bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-border"></div>
        <div className="px-6 pb-6 flex flex-col md:flex-row items-start md:items-end gap-6 -mt-10">
          <div className="h-24 w-24 rounded-2xl bg-primary flex items-center justify-center text-2xl font-bold text-white shadow-md">
             {profile?.displayName?.substring(0, 2).toUpperCase() || "TM"}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground truncate">{profile?.displayName || "User"}</h1>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            <div className="flex flex-wrap gap-3 mt-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary/50 px-2 py-1 rounded">
                Joined {profile ? new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : "Recently"}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/5 px-2 py-1 rounded">
                {taskStats.completed} Tasks Completed
              </span>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab("settings")}
            className="px-4 py-2 rounded-xl border border-border hover:bg-secondary text-xs font-bold transition-all"
          >
             Edit Profile
          </button>
        </div>
      </div>

      {/* Profile Content */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {/* Simple Side Nav */}
         <div className="md:col-span-1 flex flex-col gap-1">
            {[
               { id: "overview", label: "Overview", icon: User },
               { id: "settings", label: "Settings", icon: Settings },
               { id: "network", label: "Network", icon: Users }
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
         <div className="md:col-span-3">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm min-h-[400px]">
               {activeTab === "overview" && (
                  <div>
                     <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Biography</h2>
                     <p className="text-sm text-foreground leading-relaxed">
                        {profile?.bio || "No biography provided."}
                     </p>
                     
                     <div className="mt-8">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Recent Activity</h2>
                        <div className="space-y-2">
                           {Object.values(tasks)
                              .filter(t => t.status === "done")
                              .slice(0, 3)
                              .map(t => (
                                 <div key={t.id} className="p-3 rounded-lg border border-border text-xs flex items-center justify-between">
                                    <span className="font-medium">{t.title}</span>
                                    <span className="text-[10px] text-muted-foreground">Completed</span>
                                 </div>
                              ))
                           }
                           {Object.values(tasks).filter(t => t.status === "done").length === 0 && (
                              <p className="text-xs text-muted-foreground italic">No recent activity.</p>
                           )}
                        </div>
                     </div>
                  </div>
               )}

               {activeTab === "settings" && (
                  <div className="max-w-md">
                     <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6">Profile Settings</h2>
                     <div className="space-y-4">
                        <div>
                           <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1.5 ml-1">Name</label>
                           <input 
                              type="text" 
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full h-10 rounded-xl bg-secondary/30 border border-border px-4 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                           />
                        </div>
                        <div>
                           <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1.5 ml-1">Bio</label>
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
                      <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6">User Network</h2>
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
                            searchResults.map(u => {
                               const isFollowing = profile?.following?.includes(u.uid);
                               return (
                                  <div key={u.uid} className="p-3 rounded-xl border border-border flex items-center justify-between">
                                     <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-[10px] font-bold">
                                           {u.displayName?.substring(0, 2).toUpperCase() || "U"}
                                        </div>
                                        <div className="text-xs">
                                           <p className="font-bold">{u.displayName}</p>
                                           <p className="text-muted-foreground">{u.email}</p>
                                        </div>
                                     </div>
                                     <button 
                                       onClick={() => isFollowing ? handleUnfollow(u.uid) : handleFollow(u.uid)}
                                       className={`px-3 py-1 rounded-lg text-[10px] font-bold ${isFollowing ? 'bg-secondary text-muted-foreground' : 'bg-primary/10 text-primary'}`}
                                     >
                                        {isFollowing ? 'Unfollow' : 'Follow'}
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
    </div>
  );
}
