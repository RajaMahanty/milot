import React, { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, MessageSquare, Pencil, Trash2 } from "lucide-react";

import { Task, useKanbanStore } from "@/store/useTaskStore";
import { useProjectStore } from "@/store/useProjectStore";
import { useAuthStore } from "@/store/useAuthStore";

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
}

const priorityConfig = {
  low: { dot: "bg-blue-400", bg: "bg-blue-50 text-blue-700 border-blue-100" },
  medium: { dot: "bg-amber-400", bg: "bg-amber-50 text-amber-700 border-amber-100" },
  high: { dot: "bg-rose-400", bg: "bg-rose-50 text-rose-700 border-rose-100" },
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityStyle = task.priority ? priorityConfig[task.priority] : null;
  const { projects, activeProjectId } = useProjectStore();
  const { user } = useAuthStore();
  const editTask = useKanbanStore(s => s.editTask);
  const project = projects[task.projectId];
  const isOwner = project?.uid === user?.uid;
  const showProjectTag = activeProjectId === "all" || !activeProjectId;

  // Inline title editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditingTitle]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTitle(task.title);
    setIsEditingTitle(true);
  };

  const commitTitleEdit = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== task.title) {
      editTask(task.id, { title: trimmed });
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitTitleEdit();
    } else if (e.key === "Escape") {
      setEditTitle(task.title);
      setIsEditingTitle(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative flex flex-col h-[130px] rounded-2xl border border-border bg-card p-4 shadow-soft transition-all hover:shadow-card hover:border-primary/20 ${
        isDragging ? "z-50 opacity-0" : "opacity-100 cursor-grab active:cursor-grabbing"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-1">
        {isEditingTitle ? (
          <input
            ref={titleInputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={commitTitleEdit}
            onKeyDown={handleTitleKeyDown}
            onPointerDown={(e) => e.stopPropagation()}
            maxLength={120}
            className="flex-1 text-sm font-bold tracking-tight text-foreground bg-primary/5 border border-primary/30 rounded-lg px-2 py-1 focus:ring-2 focus:ring-primary/20 outline-none pointer-events-auto"
          />
        ) : (
          <h3 
            onClick={(e) => { e.stopPropagation(); onEdit?.(task); }}
            onDoubleClick={handleDoubleClick}
            className="text-sm font-bold tracking-tight text-foreground leading-snug group-hover:text-primary transition-colors cursor-pointer pointer-events-auto line-clamp-2"
            title="Double-click to edit title"
          >
            {task.title}
          </h3>
        )}
        <div className="flex flex-col items-end gap-1.5">
          {showProjectTag && (
            <div className={`flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[9px] font-bold ${project ? (isOwner ? 'border-primary/20 bg-primary/5 text-primary' : 'border-blue-200 bg-blue-50 text-blue-600') : 'border-rose-200 bg-rose-50 text-rose-600'}`}>
              <span className="truncate max-w-[100px]">{project?.title || "No Workspace"}</span>
              {!isOwner && project && <span className="ml-1 opacity-70">Shared</span>}
            </div>
          )}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                onPointerDown={(e) => e.stopPropagation()}
                className="h-6 w-6 flex items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors pointer-events-auto cursor-pointer"
                title="Edit Task"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {onDelete && (
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                onPointerDown={(e) => e.stopPropagation()}
                className="h-6 w-6 flex items-center justify-center rounded-md text-rose-600 hover:bg-rose-50 transition-colors pointer-events-auto cursor-pointer"
                title="Delete Task"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {task.description && (
          <p className="mt-1 line-clamp-2 text-[10px] font-medium text-muted-foreground leading-relaxed">
            {task.description}
          </p>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg bg-secondary flex items-center justify-center text-[10px] font-bold ring-1 ring-border shadow-sm">
            {task.assignedTo ? task.assignedTo.substring(0, 2).toUpperCase() : "U"}
          </div>
          
          {task.priority && priorityStyle && (
             <div className={`flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[10px] font-bold ${priorityStyle.bg}`}>
                <div className={`h-1.5 w-1.5 rounded-full ${priorityStyle.dot}`} />
                {task.priority.toUpperCase()}
             </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="flex items-center gap-1 text-[10px] font-medium">
            <MessageSquare className="h-3 w-3" />
            <span>{task.comments?.length || 0}</span>
          </div>
          {task.dueDate && (
            <div className="flex items-center gap-1 text-[10px] font-medium">
               <Calendar className="h-3 w-3" />
               <span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
