"use client";

import React, { useState, useEffect } from "react";
import { useKanbanStore } from "@/store/useTaskStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useSprintStore } from "@/store/useSprintStore";
import { useProjectStore } from "@/store/useProjectStore";
import { StartSprintModal } from "@/components/sprint/StartSprintModal";
import { ProjectSprintSection } from "@/components/sprint/ProjectSprintSection";
import { Layers, Plus } from "lucide-react";

export default function SprintPage() {
  const { tasks, fetchTasks, searchQuery } = useKanbanStore();
  const { user } = useAuthStore();
  const { sprints, createSprint, fetchSprints, fetchMoreSprints, hasMore, isLoading } = useSprintStore();
  const { activeProjectId, projects } = useProjectStore();

  const observer = React.useRef<IntersectionObserver | null>(null);
  const lastSprintElementRef = React.useCallback((node: any) => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchMoreSprints();
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading, hasMore, fetchMoreSprints]);

  const [isStartSprintModalOpen, setIsStartSprintModalOpen] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      fetchTasks();
      fetchSprints();
    }
  }, [fetchTasks, fetchSprints, user?.uid]);

  const allTasks = Object.values(tasks);

  if (activeProjectId === "all") {
    const visibleSprints = sprints.filter(s => (s.status === "active" || s.status === "planned") && s.projectId !== "all");
    
    if (visibleSprints.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] gap-6 animate-in fade-in zoom-in-95">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
            <Layers className="h-8 w-8" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">No Sprints Found</h2>
            <p className="text-muted-foreground text-xs max-w-xs mx-auto">
              There are no active or planned sprints in any of your workspaces. Switch to a specific workspace to start a sprint.
            </p>
          </div>
        </div>
      );
    }

    // Group by project
    const sprintsByProject = visibleSprints.reduce((acc, sprint) => {
      if (!acc[sprint.projectId]) acc[sprint.projectId] = [];
      acc[sprint.projectId].push(sprint);
      return acc;
    }, {} as Record<string, typeof visibleSprints>);

    const projectIdsWithSprints = Object.keys(sprintsByProject);
    const displayedProjectIds = projectIdsWithSprints;

    return (
      <div className="flex flex-col gap-8 pb-8 h-full animate-in fade-in slide-in-from-bottom-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">All Workspace Sprints</h2>
          <p className="text-muted-foreground text-sm">Overview of active and planned sprints across your projects.</p>
        </div>

        <div className="flex flex-col gap-10">
          {displayedProjectIds.map(projectId => {
            const project = projects[projectId];
            const projectSprintsList = sprintsByProject[projectId];

            return (
              <div key={projectId} className="space-y-6">
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {(project?.title || "Unknown").substring(0, 2).toUpperCase()}
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{project?.title || "Unknown Project"}</h3>
                </div>
                
                <div className="flex flex-col gap-8">
                  {projectSprintsList.map(sprint => {
                    let sprintTasks = allTasks.filter(t => t.sprintId === sprint.id);
                    if (searchQuery.trim()) {
                      const q = searchQuery.toLowerCase();
                      sprintTasks = sprintTasks.filter(
                        (t) =>
                          t.title.toLowerCase().includes(q) ||
                          (t.description && t.description.toLowerCase().includes(q)),
                      );
                    }

                    return (
                      <ProjectSprintSection 
                        key={sprint.id}
                        activeSprint={sprint}
                        sprintTasks={sprintTasks}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        {isLoading && (
          <div className="mt-8 flex justify-center items-center gap-3 text-muted-foreground">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold uppercase tracking-widest">Loading more sprints...</span>
          </div>
        )}
      </div>
    );
  }

  // Single Project View
  const projectSprints = sprints.filter(s => s.projectId === activeProjectId && (s.status === "active" || s.status === "planned"));

  return (
    <div className="flex flex-col gap-8 pb-8 h-full animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Sprints</h2>
          <p className="text-muted-foreground text-sm">Manage planned and active sprints for this project.</p>
        </div>
        <button
          onClick={() => setIsStartSprintModalOpen(true)}
          className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground hover:opacity-90 transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Sprint
        </button>
      </div>

      <StartSprintModal
        open={isStartSprintModalOpen}
        onOpenChange={setIsStartSprintModalOpen}
        onStart={createSprint}
      />

      {projectSprints.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-6">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
            <Layers className="h-8 w-8" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">No Sprints Yet</h2>
            <p className="text-muted-foreground text-xs max-w-xs mx-auto">
              Start a new sprint to organize your team's work and track target goals.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {projectSprints.map((sprint, index) => {
            let sprintTasks = allTasks.filter((t) => t.sprintId === sprint.id);
            if (searchQuery.trim()) {
              const q = searchQuery.toLowerCase();
              sprintTasks = sprintTasks.filter(
                (t) =>
                  t.title.toLowerCase().includes(q) ||
                  (t.description && t.description.toLowerCase().includes(q)),
              );
            }
            return (
              <div 
                key={sprint.id} 
                ref={index === projectSprints.length - 1 ? lastSprintElementRef : null}
              >
                <ProjectSprintSection 
                  activeSprint={sprint}
                  sprintTasks={sprintTasks}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
