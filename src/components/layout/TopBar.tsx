"use client";

import React from "react";
import { Search, Bell, ChevronDown, ChevronRight, LogOut, Menu } from "lucide-react";


import { useAuthStore } from "@/store/useAuthStore";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { useProjectStore } from "@/store/useProjectStore";
import { useKanbanStore } from "@/store/useTaskStore";


export function TopBar({ onMenuClick }: { onMenuClick?: () => void }) {
  const [workspaceOpen, setWorkspaceOpen] = React.useState(false);


  const user = useAuthStore((state) => state.user);
  const { searchQuery, setSearchQuery, tasks } = useKanbanStore();
  const { projects, activeProjectId, setActiveProject } = useProjectStore();

  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      Cookies.remove("auth");
      router.push("/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || "Guest";
  const initials = displayName.substring(0, 2).toUpperCase();

  const activeProject = activeProjectId ? projects[activeProjectId] : null;

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 z-10 h-16 border-b border-border bg-background px-4 lg:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3 lg:gap-6">
        <button 
          onClick={onMenuClick}
          className="lg:hidden h-9 w-9 rounded-xl flex items-center justify-center hover:bg-secondary text-foreground transition-all active:scale-95 border border-border"
        >
          <Menu className="h-5 w-5" />
        </button>
        
        <div className="flex items-center gap-6">

        <div className="relative">
          <div 
            onClick={() => setWorkspaceOpen(!workspaceOpen)}
            className={`flex items-center gap-2 cursor-pointer hover:bg-secondary rounded-lg px-2 py-1 transition-colors ${workspaceOpen ? 'bg-secondary' : ''}`}
          >
            <img src="/logo.png" alt="TaskMatrix" className="h-5 w-5 object-contain" />

            <span className="text-sm font-bold text-foreground truncate max-w-[150px]">
              {activeProjectId === "all" || !activeProjectId ? "All Workspaces" : activeProject?.title}
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${workspaceOpen ? 'rotate-180' : ''}`} />
          </div>

          {/* Mobile Overlay to close */}
          {workspaceOpen && (
            <div 
              className="fixed inset-0 z-40 bg-transparent" 
              onClick={() => setWorkspaceOpen(false)}
            />
          )}

          {/* Dropdown Menu */}
          <div className={`absolute top-full left-0 w-64 pt-1 transition-all z-50 ${workspaceOpen ? 'opacity-100 visible h-auto' : 'opacity-0 invisible h-0 overflow-hidden'}`}>
            <div className="rounded-xl border border-border bg-card p-1 shadow-elevated">
              <div className="px-2 py-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                Switch Workspace
              </div>
              
              <button
                onClick={() => { setActiveProject("all"); setWorkspaceOpen(false); }}
                className={`w-full text-left flex items-center px-2 py-2 text-sm font-medium rounded-lg transition-colors ${!activeProjectId || activeProjectId === 'all' ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-secondary'}`}
              >
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span className="truncate">All Workspaces</span>
                </div>
              </button>

              <div className="h-[1px] w-full bg-border my-1" />

              <div className="max-h-64 overflow-y-auto no-scrollbar">
                {Object.values(projects).length > 0 ? (
                  Object.values(projects).map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setActiveProject(p.id); setWorkspaceOpen(false); }}
                      className={`w-full text-left flex items-center px-2 py-2 text-sm font-medium rounded-lg transition-colors ${p.id === activeProjectId ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-secondary'}`}
                    >
                      <span className="truncate pl-4">{p.title}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-2 py-2 text-xs text-muted-foreground italic">No workspaces found.</div>
                )}
              </div>
              <div className="h-[1px] w-full bg-border my-1" />
              <button
                onClick={() => { router.push("/projects"); setWorkspaceOpen(false); }}
                className="w-full text-left flex items-center px-2 py-2 text-sm font-bold text-primary hover:bg-primary/5 rounded-lg transition-colors"
              >
                Manage Workspaces
              </button>
            </div>
          </div>
        </div>

        
        <div className="hidden md:flex relative w-96 max-w-md">
          <form 
            onSubmit={(e) => e.preventDefault()}
            className="w-full relative"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
            <input
              type="text"
              placeholder="Search across all workspaces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchQuery(searchQuery)} // Ensure results show on focus if query exists
              className="w-full rounded-2xl bg-secondary/70 border-none px-10 py-1.5 text-sm transition-all focus:bg-background focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          </form>

          {/* Search Results Dropdown */}
          {searchQuery.trim().length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-1 max-h-[400px] overflow-y-auto rounded-2xl border border-border bg-card shadow-elevated z-50 p-2 animate-in fade-in slide-in-from-top-2">
              <div className="px-2 py-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-border mb-1">
                Found Results
              </div>
              
              {Object.values(tasks).filter(t => 
                t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
              ).length > 0 ? (
                Object.values(tasks)
                  .filter(t => 
                    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
                  )
                  .slice(0, 8) // Limit to top 8
                  .map(task => (
                    <button
                      key={task.id}
                      onClick={() => {
                        // Navigate to board or open modal? 
                        // For now we'll set the active project and go to board
                        if (task.projectId) {
                           setActiveProject(task.projectId);
                           router.push("/board");
                        }
                        setSearchQuery("");
                      }}
                      className="w-full text-left p-3 hover:bg-secondary rounded-xl transition-all group border border-transparent hover:border-border"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">{task.title}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                            {projects[task.projectId]?.title || "Unknown Workspace"} • {task.status.toUpperCase()}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </button>
                  ))
              ) : (
                <div className="p-4 text-center">
                  <p className="text-xs text-muted-foreground italic">No tasks matching "{searchQuery}"</p>
                </div>
              )}

              <div className="mt-2 border-t border-border pt-2">
                <button
                   onClick={() => { router.push("/backlog"); setSearchQuery(""); }}
                   className="w-full py-2 text-[10px] font-bold text-primary hover:bg-primary/5 rounded-lg transition-colors text-center uppercase tracking-wider"
                >
                  View All in Backlog
                </button>
              </div>
            </div>
          )}
        </div>



      </div>
    </div>

    <div className="flex items-center gap-4">


        <button className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary transition-colors relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full border-2 border-background bg-destructive"></span>
        </button>
        
        <div className="h-4 w-[1px] bg-border mx-2" />

        <div className="flex items-center gap-3">
          <div 
            onClick={() => router.push("/profile")}
            className="flex items-center gap-3 cursor-pointer group transition-all"
          >
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-foreground leading-none group-hover:text-primary transition-colors">
                {displayName}
              </p>
              <p className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                {user?.email || "No email"}
              </p>
            </div>
            <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden selection:bg-transparent group-hover:scale-105 transition-transform">
              {initials}
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="ml-2 h-8 w-8 rounded-full hover:bg-red-50 dark:hover:bg-red-950 flex flex-col items-center justify-center text-red-500 transition-colors"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

      </div>
    </header>
  );
}

