"use client";

import React, { useState, useEffect } from "react";
import { useKanbanStore, Task } from "@/store/useTaskStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useProjectStore } from "@/store/useProjectStore";
import { TaskModal } from "@/components/task/TaskModal";
import { ConfirmDelete } from "@/components/ui/ConfirmDelete";
import { toast } from "@/store/useToastStore";
import {
  CheckSquare,
  Calendar,
  Search,
  Filter,
  ArrowUp,
  ArrowDown,
  Minus,
  Pencil,
  Trash2,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  ChevronDown,
  LayoutList,
  LayoutGrid,
  MessageSquare,
  GitBranch,
} from "lucide-react";

const priorityConfig = {
  high: { icon: ArrowUp, color: "text-rose-500", bg: "bg-rose-50 text-rose-600 border-rose-100", dot: "bg-rose-500", label: "High" },
  medium: { icon: Minus, color: "text-amber-500", bg: "bg-amber-50 text-amber-600 border-amber-100", dot: "bg-amber-500", label: "Medium" },
  low: { icon: ArrowDown, color: "text-blue-500", bg: "bg-blue-50 text-blue-600 border-blue-100", dot: "bg-blue-500", label: "Low" },
};

const statusConfig = {
  "todo": { label: "To Do", icon: Circle, color: "text-slate-500", bg: "bg-slate-50 text-slate-600 border-slate-100" },
  "in-progress": { label: "In Progress", icon: Clock, color: "text-amber-500", bg: "bg-amber-50 text-amber-600 border-amber-100" },
  "done": { label: "Done", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  "archived": { label: "Archived", icon: AlertCircle, color: "text-slate-400", bg: "bg-slate-50 text-slate-400 border-slate-100" },
};

type FilterStatus = "all" | "todo" | "in-progress" | "done" | "archived";
type FilterPriority = "all" | "high" | "medium" | "low";
type ViewMode = "list" | "grid";

export default function MyTasksPage() {
  const { tasks, fetchTasks, editTask, deleteTask, isLoading } = useKanbanStore();
  const { user } = useAuthStore();
  const { projects } = useProjectStore();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterPriority, setFilterPriority] = useState<FilterPriority>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [activeEditTask, setActiveEditTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);

  useEffect(() => {
    if (user?.uid) fetchTasks();
  }, [fetchTasks, user?.uid]);

  const myTasks = Object.values(tasks).filter((t) => {
    if (t.assignedTo !== user?.displayName && t.assignedTo !== user?.uid) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!t.title.toLowerCase().includes(q) && !(t.description?.toLowerCase().includes(q))) return false;
    }
    return true;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const stats = {
    total: myTasks.length,
    todo: myTasks.filter(t => t.status === "todo").length,
    inProgress: myTasks.filter(t => t.status === "in-progress").length,
    done: myTasks.filter(t => t.status === "done").length,
  };

  const handleSaveTask = (data: any) => {
    if (activeEditTask) {
      editTask(activeEditTask.id, data);
    }
  };

  const confirmDelete = () => {
    if (deleteTaskId) {
      deleteTask(deleteTaskId);
      toast.success("Task deleted");
      setDeleteTaskId(null);
    }
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div
      className="flex flex-col gap-6 pb-8 h-full"
      onClick={() => { setShowStatusDropdown(false); setShowPriorityDropdown(false); }}
    >
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <CheckSquare className="h-5 w-5" />
            </div>
            My Tasks
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            All tasks assigned to you across every workspace.
          </p>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-2 bg-secondary rounded-xl p-1">
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === "list" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutList className="h-3.5 w-3.5" />
            List
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === "grid" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Grid
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", count: stats.total, icon: CheckSquare, color: "text-primary", bg: "bg-primary/10" },
          { label: "To Do", count: stats.todo, icon: Circle, color: "text-slate-500", bg: "bg-slate-100" },
          { label: "In Progress", count: stats.inProgress, icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
          { label: "Done", count: stats.done, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border bg-card p-4 shadow-soft flex items-center gap-3 transition-all hover:shadow-card"
          >
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${s.bg}`}>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">{s.count}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-card border border-border rounded-2xl p-4 shadow-soft">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full h-10 rounded-xl bg-secondary/50 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all border-none"
          />
        </div>

        {/* Status Filter */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => { setShowStatusDropdown(!showStatusDropdown); setShowPriorityDropdown(false); }}
            className={`flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-bold transition-all ${filterStatus !== "all" ? "bg-primary/10 text-primary border border-primary/20" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"}`}
          >
            <Filter className="h-3.5 w-3.5" />
            {filterStatus === "all" ? "All Status" : statusConfig[filterStatus]?.label}
            <ChevronDown className={`h-3 w-3 transition-transform ${showStatusDropdown ? "rotate-180" : ""}`} />
          </button>
          {showStatusDropdown && (
            <div className="absolute top-full left-0 mt-1 w-40 bg-card border border-border rounded-xl shadow-elevated z-20 p-1 animate-in fade-in zoom-in-95">
              {(["all", "todo", "in-progress", "done", "archived"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => { setFilterStatus(s); setShowStatusDropdown(false); }}
                  className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg transition-colors ${filterStatus === s ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary"}`}
                >
                  {s === "all" ? "All Status" : statusConfig[s]?.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Priority Filter */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => { setShowPriorityDropdown(!showPriorityDropdown); setShowStatusDropdown(false); }}
            className={`flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-bold transition-all ${filterPriority !== "all" ? "bg-primary/10 text-primary border border-primary/20" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"}`}
          >
            {filterPriority === "all" ? "All Priority" : priorityConfig[filterPriority]?.label}
            <ChevronDown className={`h-3 w-3 transition-transform ${showPriorityDropdown ? "rotate-180" : ""}`} />
          </button>
          {showPriorityDropdown && (
            <div className="absolute top-full left-0 mt-1 w-36 bg-card border border-border rounded-xl shadow-elevated z-20 p-1 animate-in fade-in zoom-in-95">
              {(["all", "high", "medium", "low"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => { setFilterPriority(p); setShowPriorityDropdown(false); }}
                  className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg transition-colors ${filterPriority === p ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary"}`}
                >
                  {p === "all" ? "All Priority" : priorityConfig[p]?.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center gap-3 text-muted-foreground">
          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold uppercase tracking-widest">Loading tasks...</span>
        </div>
      ) : myTasks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
          <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center">
            <CheckSquare className="h-10 w-10 text-primary/30" />
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">No tasks assigned to you</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search || filterStatus !== "all" || filterPriority !== "all"
                ? "Try adjusting your filters."
                : "Ask a team member to assign you a task!"}
            </p>
          </div>
        </div>
      ) : viewMode === "list" ? (
        /* List View */
        <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              <tr>
                <th className="px-6 py-4">Task</th>
                <th className="px-6 py-4">Project</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {myTasks.map((task) => {
                const status = statusConfig[task.status] || statusConfig["todo"];
                const priority = task.priority ? priorityConfig[task.priority] : null;
                const project = projects[task.projectId];
                const overdue = isOverdue(task.dueDate) && task.status !== "done";

                return (
                  <tr key={task.id} className="hover:bg-secondary/30 transition-colors group">
                    <td
                      onClick={() => { setActiveEditTask(task); setIsModalOpen(true); }}
                      className="px-6 py-4 max-w-[260px] cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <status.icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${status.color}`} />
                        <div className="overflow-hidden">
                          <p className="font-bold text-foreground group-hover:text-primary transition-colors truncate">{task.title}</p>
                          {task.description && (
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{task.description}</p>
                          )}
                          {/* Subtask + comment counts */}
                          <div className="flex items-center gap-3 mt-1">
                            {task.subtasks && task.subtasks.length > 0 && (
                              <span className="flex items-center gap-1 text-[9px] text-muted-foreground font-medium">
                                <GitBranch className="h-2.5 w-2.5" />
                                {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                              </span>
                            )}
                            {task.comments && task.comments.length > 0 && (
                              <span className="flex items-center gap-1 text-[9px] text-muted-foreground font-medium">
                                <MessageSquare className="h-2.5 w-2.5" />
                                {task.comments.length}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {project ? (
                        <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-[9px] font-bold bg-primary/5 text-primary border border-primary/10 whitespace-nowrap">
                          {project.title}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">Unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[10px] font-bold ${status.bg}`}>
                        <status.icon className="h-3 w-3" />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {priority ? (
                        <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[10px] font-bold ${priority.bg}`}>
                          <div className={`h-1.5 w-1.5 rounded-full ${priority.dot}`} />
                          {priority.label}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {task.dueDate ? (
                        <span className={`flex items-center gap-1.5 text-[10px] font-bold ${overdue ? "text-rose-500" : "text-muted-foreground"}`}>
                          <Calendar className="h-3 w-3" />
                          {new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          {overdue && <span className="text-[9px] font-black uppercase text-rose-500">Overdue</span>}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">No date</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setActiveEditTask(task); setIsModalOpen(true); }}
                          className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary text-muted-foreground flex items-center justify-center transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTaskId(task.id)}
                          className="h-7 w-7 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myTasks.map((task) => {
            const status = statusConfig[task.status] || statusConfig["todo"];
            const priority = task.priority ? priorityConfig[task.priority] : null;
            const project = projects[task.projectId];
            const overdue = isOverdue(task.dueDate) && task.status !== "done";

            return (
              <div
                key={task.id}
                onClick={() => { setActiveEditTask(task); setIsModalOpen(true); }}
                className="group relative flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-soft hover:shadow-card hover:border-primary/20 transition-all cursor-pointer overflow-hidden"
              >
                {/* Top accent */}
                <div className={`absolute top-0 left-0 right-0 h-0.5 ${task.priority === "high" ? "bg-rose-400" : task.priority === "medium" ? "bg-amber-400" : "bg-blue-400"} opacity-40 group-hover:opacity-100 transition-opacity`} />

                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <status.icon className={`h-4 w-4 flex-shrink-0 ${status.color}`} />
                    <span className={`text-[10px] font-bold inline-flex items-center px-2 py-0.5 rounded-lg border ${status.bg}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => { setActiveEditTask(task); setIsModalOpen(true); }}
                      className="h-6 w-6 rounded-md hover:bg-primary/10 hover:text-primary text-muted-foreground flex items-center justify-center"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => setDeleteTaskId(task.id)}
                      className="h-6 w-6 rounded-md hover:bg-destructive/10 hover:text-destructive text-muted-foreground flex items-center justify-center"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">{task.title}</h3>
                  {task.description && (
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{task.description}</p>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
                  <div className="flex items-center gap-2">
                    {project && (
                      <span className="text-[9px] font-black uppercase tracking-wider text-primary bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10 truncate max-w-[100px]">
                        {project.title}
                      </span>
                    )}
                    {priority && (
                      <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border ${priority.bg}`}>
                        <div className={`h-1.5 w-1.5 rounded-full ${priority.dot}`} />
                        {priority.label}
                      </span>
                    )}
                  </div>
                  {task.dueDate && (
                    <span className={`flex items-center gap-1 text-[10px] font-bold ${overdue ? "text-rose-500" : "text-muted-foreground"}`}>
                      <Calendar className="h-3 w-3" />
                      {new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>

                {/* Subtask progress */}
                {task.subtasks && task.subtasks.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Subtasks</span>
                      <span className="text-[9px] font-bold text-muted-foreground">{task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}</span>
                    </div>
                    <div className="h-1 w-full bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${(task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Task Modal */}
      <TaskModal
        open={isModalOpen}
        onClose={() => { setIsModalOpen(false); setActiveEditTask(null); }}
        onSave={handleSaveTask}
        initialData={activeEditTask}
      />

      {/* Confirm Delete */}
      <ConfirmDelete
        open={!!deleteTaskId}
        onClose={() => setDeleteTaskId(null)}
        onConfirm={confirmDelete}
        title="Delete Task?"
        description="Are you sure you want to permanently delete this task? This cannot be undone."
      />
    </div>
  );
}
