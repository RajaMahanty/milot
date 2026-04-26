"use client";

import React, { useState, useEffect } from "react";
import { useKanbanStore, Task } from "@/store/useTaskStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useProjectStore } from "@/store/useProjectStore";
import { TaskModal } from "@/components/task/TaskModal";
import {
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  Minus,
  Search,
  Plus,
  Pencil,
  Trash2
} from "lucide-react";

export default function BacklogPage() {
  const { tasks, fetchTasks, addTask, editTask, deleteTask } = useKanbanStore();
  const { user } = useAuthStore();
  const { projects, activeProjectId } = useProjectStore();

  const showWorkspace = activeProjectId === "all" || !activeProjectId;

  const [searchQuery, setSearchQuery] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeEditTask, setActiveEditTask] = useState<Task | null>(null);

  useEffect(() => {
    if (user?.uid) {
      fetchTasks();
    }
  }, [fetchTasks, user?.uid]);

  // Handle Save (Create or Update)
  const handleSaveTask = (data: any) => {
    if (activeEditTask) {
      editTask(activeEditTask.id, data);
    } else {
      // For new tasks, we ensure minimal required fields are set
      addTask({
        id: crypto.randomUUID(),
        title: data.title || "Untitled Task",
        description: data.description,
        status: "todo",
        priority: data.priority,
        dueDate: data.dueDate,
        projectId: data.projectId as string,
        createdAt: new Date().toISOString(),
        storyPoints: data.storyPoints,
        subtasks: data.subtasks,
        comments: data.comments,
      });
    }
  };

  const openCreateModal = () => {
    setActiveEditTask(null);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setActiveEditTask(task);
    setIsModalOpen(true);
  };

  const handleDeleteTask = (taskId: string) => {
    if (window.confirm("Are you sure you want to delete this task? This cannot be undone.")) {
      deleteTask(taskId);
    }
  };

  const priorityIcons = {
    high: { icon: ArrowUp, color: "text-rose-500", label: "High" },
    medium: { icon: Minus, color: "text-amber-500", label: "Medium" },
    low: { icon: ArrowDown, color: "text-blue-500", label: "Low" },
  };

  const statusColors = {
    todo: "bg-blue-50 text-blue-700 border-blue-100",
    "in-progress": "bg-amber-50 text-amber-700 border-amber-100",
    done: "bg-emerald-50 text-emerald-700 border-emerald-100",
    archived: "bg-gray-50 text-gray-700 border-gray-100",
  };

  // Filter Tasks
  const filteredTasks = Object.values(tasks).filter(task => {
    // Ignore archived tasks completely
    if (task.status === "archived") return false;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      if (!task.title.toLowerCase().includes(query) &&
        !(task.description && task.description.toLowerCase().includes(query))) {
        return false;
      }
    }

    // Status filter
    if (!showDone && task.status === 'done') {
      return false;
    }

    return true;
  }).sort((a, b) => {
    // Sort by creation date descending
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="flex flex-col gap-8 pb-8 h-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Backlog
          </h2>
          <p className="text-sm text-muted-foreground mt-1 text-neutral-muted">
            Prioritize and manage your product backlog in a dense list view.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground hover:opacity-90 transition-all shadow-elevated active:scale-95"
        >
          <Plus className="h-5 w-5" />
          Create Task
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 bg-card border border-border rounded-2xl p-4 shadow-soft">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search backlog..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 rounded-xl bg-secondary/50 border-none pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        <div className="h-6 w-[1px] bg-border mx-2" />
        <button
          onClick={() => setShowDone(!showDone)}
          className={`text-xs font-bold px-3 py-1.5 rounded transition-all ${showDone
            ? 'bg-primary/10 text-primary border border-primary/20'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
        >
          {showDone ? 'Hide Done' : 'Show Done'}
        </button>
      </div>

      {/* Table Container */}
      <div className="relative overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
            <tr>
              <th className="px-6 py-4">Title</th>
              {showWorkspace && <th className="px-6 py-4">Workspace</th>}
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Priority</th>
              <th className="px-6 py-4">Assignee</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-secondary/30 transition-colors group">
                  <td className="px-6 py-4 max-w-[250px]">
                    <div className="flex items-start gap-3">
                      <div className="h-2 w-2 rounded-full bg-primary/30 mt-1.5 flex-shrink-0" />
                      <div className="overflow-hidden">
                        <p className="font-bold text-foreground group-hover:text-primary transition-colors truncate">{task.title}</p>
                        <p className="text-[10px] text-neutral-muted truncate max-w-full">{task.description}</p>
                      </div>
                    </div>
                  </td>
                  {showWorkspace && (
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-lg border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-bold text-primary">
                        {projects[task.projectId]?.title || "Unknown"}
                      </span>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-bold capitalize ${statusColors[task.status]}`}>
                      {task.status.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {task.priority && priorityIcons[task.priority] ? (
                      <div className="flex items-center gap-2">
                        <div className={priorityIcons[task.priority].color}>
                          {React.createElement(priorityIcons[task.priority].icon, { size: 14 })}
                        </div>
                        <span className="text-[10px] font-bold text-foreground">{priorityIcons[task.priority].label}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-lg bg-secondary flex items-center justify-center text-[8px] font-bold ring-1 ring-border shadow-sm">
                        {task.assignedTo ? task.assignedTo.substring(0, 2).toUpperCase() : "U"}
                      </div>
                      <span className="text-[10px] font-medium text-foreground">{task.assignedTo || "Unassigned"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right w-[120px]">
                    <div className="relative flex items-center justify-end h-8">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-0">
                        <button
                          onClick={() => handleEditTask(task)}
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 inline-flex items-center justify-center transition-colors shadow-sm bg-card border border-border cursor-pointer"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 inline-flex items-center justify-center transition-colors shadow-sm bg-card border border-border cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="group-hover:opacity-0 transition-opacity flex items-center justify-center h-8 w-8 text-muted-foreground">
                        <MoreHorizontal size={16} />
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center mb-2">
                      <Search className="h-6 w-6 opacity-20" />
                    </div>
                    <p className="font-bold text-foreground">
                      {searchQuery ? "No matches found" : "Backlog is empty"}
                    </p>
                    <p className="text-xs">
                      {searchQuery ? "Try a different search term." : "Congratulations! You've triaged all pending work."}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <TaskModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setActiveEditTask(null);
        }}
        onSave={handleSaveTask}
        initialData={activeEditTask}
      />
    </div>
  );
}
