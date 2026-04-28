"use client";

import React, { useState, useCallback, useEffect } from "react";
import Column from "./Column";
import { TaskModal } from "@/components/task/TaskModal";
import { useKanbanStore, Task } from "@/store/useTaskStore";
import { useAuthStore } from "@/store/useAuthStore";
import { TaskCard } from "@/components/task/TaskCard";
import { toast } from "@/store/useToastStore";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DropAnimation,
  pointerWithin,
  rectIntersection,
} from "@dnd-kit/core";
import { Skeleton } from "@/components/ui/Skeleton";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import { 
  Plus, 
  Filter, 
  SlidersHorizontal, 
  UserPlus, 
  ChevronDown,
  Pencil,
  Trash2
} from "lucide-react";


import { ConfirmDelete } from "@/components/ui/ConfirmDelete";


const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.5",
      },
    },
  }),
};

export default function Board() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeEditTask, setActiveEditTask] = useState<Task | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);


  // Filter States
  const [showSearch, setShowSearch] = useState(false);


  const [filterPriority, setFilterPriority] = useState<"high" | "medium" | "low" | null>(null);
  const [filterAssignee, setFilterAssignee] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [showViewDropdown, setShowViewDropdown] = useState(false);



  const { columns, tasks, addTask, editTask, deleteTask, moveTask, fetchTasks, isLoading, searchQuery, setSearchQuery } = useKanbanStore();


  const { user } = useAuthStore();

  useEffect(() => {
    if (user?.uid) {
      fetchTasks();
    }
  }, [fetchTasks, user?.uid]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleSaveTask = (data: any) => {
    if (activeEditTask) {
      editTask(activeEditTask.id, {
        ...data,
        projectId: data.projectId
      });
    } else {
      addTask({
        id: crypto.randomUUID(),
        title: data.title || "",
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
    setDeleteTaskId(taskId);
  };

  const confirmDeleteTask = () => {
    if (deleteTaskId) {
      deleteTask(deleteTaskId);
      toast.success("Task deleted permanently");
      setDeleteTaskId(null);
    }
  };



  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveTask(tasks[active.id as string] || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTaskData = tasks[activeId];
    const overTaskData = tasks[overId];

    if (!activeTaskData) return;

    const activeColumnId = activeTaskData.status;
    const overColumnId = overTaskData ? overTaskData.status : (columns[overId] ? overId : null);

    if (overColumnId && activeColumnId !== overColumnId) {
      moveTask(activeId, overId);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over) {
      moveTask(active.id as string, over.id as string);
    }
    setActiveTask(null);
  };

  const collisionDetectionStrategy = useCallback(
    (args: any) => {
      const pointerCollisions = pointerWithin(args);
      if (pointerCollisions.length > 0) return pointerCollisions;
      const rectCollisions = rectIntersection(args);
      if (rectCollisions.length > 0) return rectCollisions;
      return [];
    },
    []
  );

  return (
    <div className="flex h-full flex-col">
      {/* Board Header */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Kanban Board
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Manage and track your team's project tasks.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex -space-x-2 mr-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 w-8 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground ring-1 ring-border">
                U{i}
              </div>
            ))}
            <button 
              onClick={() => toast.info("Team Invitation is coming soon!")}
              className="h-8 w-8 rounded-full border-2 border-dashed border-muted-foreground/30 bg-secondary/30 flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors"

            >
              <UserPlus className="h-3 w-3" />
            </button>
          </div>

          <div className="h-8 w-[1px] bg-border mx-1 hidden sm:block" />

          <button 
            onClick={() => setShowSearch(!showSearch)}
            className={`flex h-10 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all shadow-soft active:scale-95 ${showSearch ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-secondary text-foreground hover:bg-accent'}`}
          >
            <Filter className="h-4 w-4" />
            Filter
          </button>
          
          <button 
            onClick={openCreateModal}
            className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 transition-all shadow-elevated active:scale-95"
          >
            <Plus className="h-5 w-5" />
            New Task
          </button>
        </div>
      </div>

      {showSearch && (
         <div className="mb-4 animate-in fade-in slide-in-from-top-2">
            <input 
               type="text" 
               placeholder="Search by task title or description..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full sm:max-w-md rounded-xl border border-border bg-card px-4 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
         </div>
      )}

      {/* Constraints/Filters Bar */}
      <div className="mb-6 flex items-center flex-wrap gap-4 py-2">

        <div className="relative">
          <div 
            onClick={() => setShowViewDropdown(!showViewDropdown)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${showViewDropdown ? "border-primary text-primary bg-primary/10" : "bg-secondary/50 border-border text-muted-foreground hover:bg-secondary"}`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            View: {viewMode === 'board' ? 'Board' : 'List'}
            <ChevronDown className={`h-3 w-3 transition-transform ${showViewDropdown ? 'rotate-180' : ''}`} />
          </div>

          {showViewDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowViewDropdown(false)} />
              <div className="absolute top-full left-0 mt-1 w-32 rounded-xl border border-border bg-card p-1 shadow-elevated z-20 animate-in fade-in zoom-in-95">
                <button 
                  onClick={() => { setViewMode("board"); setShowViewDropdown(false); }}
                  className={`w-full text-left px-2 py-1.5 text-xs font-bold rounded-lg transition-colors ${viewMode === 'board' ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-secondary'}`}
                >
                  Board View
                </button>
                <button 
                  onClick={() => { setViewMode("list"); setShowViewDropdown(false); }}
                  className={`w-full text-left px-2 py-1.5 text-xs font-bold rounded-lg transition-colors ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-secondary'}`}
                >
                  List View
                </button>
              </div>
            </>
          )}
        </div>

        <div 
          onClick={() => setFilterPriority(prev => !prev ? "high" : prev === "high" ? "medium" : prev === "medium" ? "low" : null)}
          className={`flex items-center select-none gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${filterPriority ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:bg-secondary"}`}
        >
          Priority {filterPriority && `: ${filterPriority.toUpperCase()}`}
        </div>
        <div 
          onClick={() => setFilterAssignee(!filterAssignee)}
          className={`flex items-center select-none gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${filterAssignee ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:bg-secondary"}`}
        >
          Assigned to {filterAssignee && `: Me`}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {viewMode === "board" ? (
          <div className="flex flex-1 gap-6 overflow-x-auto pb-8 no-scrollbar scroll-smooth">
            {isLoading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="w-[320px] shrink-0 space-y-4">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-40 w-full rounded-2xl" />
                  <Skeleton className="h-40 w-full rounded-2xl" />
                </div>
              ))
            ) : (
              Object.values(columns).map((column) => {
                let columnTasks = column.taskIds.map((taskId) => tasks[taskId]).filter(Boolean);

                if (filterPriority) {
                   columnTasks = columnTasks.filter(t => t.priority === filterPriority);
                }
                if (filterAssignee) {
                   columnTasks = columnTasks.filter(t => t.assignedTo);
                }
                if (searchQuery.trim()) {
                   const query = searchQuery.toLowerCase();
                   columnTasks = columnTasks.filter(t => 
                      t.title.toLowerCase().includes(query) || 
                      (t.description && t.description.toLowerCase().includes(query))
                   );
                }

                return (
                  <Column
                    key={column.id}
                    column={column}
                    tasks={columnTasks}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                  />
                );
              })
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
               <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                    <tr>
                      <th className="px-6 py-3">Task Title</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Priority</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {Object.values(tasks)
                      .filter(t => {
                        if (filterPriority && t.priority !== filterPriority) return false;
                        if (filterAssignee && !t.assignedTo) return false;
                        if (searchQuery.trim()) {
                          const q = searchQuery.toLowerCase();
                          if (!t.title.toLowerCase().includes(q) && !(t.description && t.description.toLowerCase().includes(q))) return false;
                        }
                        return true;
                      })
                      .map(task => (
                        <tr key={task.id} className="hover:bg-secondary/30 transition-colors group">
                          <td 
                            onClick={() => handleEditTask(task)}
                            className="px-6 py-3 font-bold text-foreground cursor-pointer hover:text-primary transition-colors group-hover:underline decoration-primary/30"
                          >
                            {task.title}
                          </td>

                          <td className="px-6 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[10px] capitalize">
                              {task.status.replace('-', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-3 font-medium text-muted-foreground uppercase text-[10px]">{task.priority}</td>
                          <td className="px-6 py-3 text-right">
                             <div className="flex justify-end gap-1">
                                <button 
                                  onClick={() => handleEditTask(task)} 
                                  className="p-1.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteTask(task.id)} 
                                  className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                             </div>
                          </td>

                        </tr>
                      ))
                    }
                  </tbody>
               </table>
            </div>
          </div>
        )}



        <DragOverlay dropAnimation={dropAnimation}>
          {activeTask ? (
            <div className="w-[320px] rotate-2 scale-105 opacity-90 transition-transform">
              <TaskCard task={activeTask} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setActiveEditTask(null);
        }}
        onSave={handleSaveTask}
        initialData={activeEditTask}
      />

      <ConfirmDelete 
        open={!!deleteTaskId}
        onClose={() => setDeleteTaskId(null)}
        onConfirm={confirmDeleteTask}
        title="Delete Task?"
        description="Are you sure you want to permanently delete this task? This cannot be undone."
      />
    </div>

  );
}
