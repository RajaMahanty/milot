"use client";

import React, { useState, useCallback, useEffect } from "react";
import Column from "./Column";
import { TaskModal } from "@/components/task/TaskModal";
import { useKanbanStore, Task } from "@/store/useTaskStore";
import { useAuthStore } from "@/store/useAuthStore";
import { TaskCard } from "@/components/task/TaskCard";
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
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { 
  Plus, 
  Filter, 
  SlidersHorizontal, 
  UserPlus, 
  ChevronDown 
} from "lucide-react";

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

  // Filter States
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<"high" | "medium" | "low" | null>(null);
  const [filterAssignee, setFilterAssignee] = useState<boolean>(false);

  const { columns, tasks, addTask, editTask, deleteTask, moveTask, fetchTasks } = useKanbanStore();
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

  const handleSaveTask = (data: Partial<Task>) => {
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
              onClick={() => alert("Team Invite Feature requires Pro tier. Setup coming soon!")}
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
      <div className="mb-6 flex items-center gap-4 py-2 overflow-x-auto no-scrollbar">
        <div 
          onClick={() => alert("Custom Views (List, Calendar) feature coming soon!")}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border text-xs font-semibold text-muted-foreground cursor-pointer hover:bg-secondary transition-colors"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Views
          <ChevronDown className="h-3 w-3" />
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
        <div className="flex flex-1 gap-6 overflow-x-auto pb-8 no-scrollbar scroll-smooth">
          {Object.values(columns).map((column) => {
            let columnTasks = column.taskIds.map((taskId) => tasks[taskId]).filter(Boolean);

            if (filterPriority) {
               columnTasks = columnTasks.filter(t => t.priority === filterPriority);
            }
            if (filterAssignee) {
               columnTasks = columnTasks.filter(t => t.assignedTo); // basic mock filter for existence
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
          })}
        </div>

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
    </div>
  );
}
