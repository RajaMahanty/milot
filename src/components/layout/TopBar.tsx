"use client";

import React from "react";
import { Search, Bell, ChevronDown, LogOut } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { useProjectStore } from "@/store/useProjectStore";

export function TopBar() {
  const user = useAuthStore((state) => state.user);
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
    <header className="fixed top-0 left-0 lg:left-64 right-0 z-10 h-16 border-b border-border bg-background px-6 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <div className="relative group">
          <div className="flex items-center gap-2 cursor-pointer hover:bg-secondary rounded-lg px-2 py-1 transition-colors">
            <span className="text-sm font-semibold text-foreground italic px-1 bg-primary/10 text-primary rounded">TM</span>
            <span className="text-sm font-bold text-foreground truncate max-w-[150px]">
              {activeProjectId === "all" || !activeProjectId ? "All Workspaces" : activeProject?.title}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Dropdown Menu */}
          <div className="absolute top-full left-0 w-56 pt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            <div className="rounded-xl border border-border bg-card p-1 shadow-elevated pointer-events-none group-hover:pointer-events-auto">
              <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Switch Workspace
              </div>
              
              <button
                onClick={() => setActiveProject("all")}
                className={`w-full text-left flex items-center px-2 py-2 text-sm font-medium rounded-lg transition-colors ${!activeProjectId || activeProjectId === 'all' ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-secondary'}`}
              >
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span className="truncate">All Workspaces</span>
                </div>
              </button>

              <div className="h-[1px] w-full bg-border my-1" />

              {Object.values(projects).length > 0 ? (
                Object.values(projects).map(p => (
                  <button
                    key={p.id}
                    onClick={() => setActiveProject(p.id)}
                    className={`w-full text-left flex items-center px-2 py-2 text-sm font-medium rounded-lg transition-colors ${p.id === activeProjectId ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-secondary'}`}
                  >
                    <span className="truncate pl-4">{p.title}</span>
                  </button>
                ))
              ) : (
                <div className="px-2 py-2 text-xs text-muted-foreground">No workspaces found.</div>
              )}
              <div className="h-[1px] w-full bg-border my-1" />
              <button
                onClick={() => router.push("/projects")}
                className="w-full text-left flex items-center px-2 py-2 text-sm font-medium text-foreground hover:bg-secondary rounded-lg transition-colors"
              >
                Manage Workspaces
              </button>
            </div>
          </div>
        </div>
        
        <div className="hidden md:flex relative w-96 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
          <input
            type="text"
            placeholder="Search tasks, docs..."
            className="w-full rounded-2xl bg-secondary/70 border-none px-10 py-1.5 text-sm transition-all focus:bg-background focus:ring-2 focus:ring-primary/20 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary transition-colors relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full border-2 border-background bg-destructive"></span>
        </button>
        
        <div className="h-4 w-[1px] bg-border mx-2" />

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-foreground leading-none">{displayName}</p>
            <p className="text-[10px] text-muted-foreground truncate max-w-[100px]">{user?.email || "No email"}</p>
          </div>
          <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden cursor-pointer selection:bg-transparent">
             {initials}
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

