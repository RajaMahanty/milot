import React from "react";
import { TaskCard } from "@/components/task/TaskCard";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { MoreHorizontal, Plus } from "lucide-react";

export type ColumnType = {
  id: "todo" | "in-progress" | "done";
  title: string;
  taskIds: string[];
};

import { Task } from "@/store/useTaskStore";
import { toast } from "@/store/useToastStore";


type Props = {
  column: ColumnType;
  tasks: Task[];
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
};

const columnStyles = {
  "todo": "border-t-primary",
  "in-progress": "border-t-amber-400",
  "done": "border-t-emerald-400"
};

export default function Column({ column, tasks, onEdit, onDelete }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col flex-1 basis-0 rounded-2xl border-t-4 bg-secondary/30 p-4 min-w-[320px] transition-all ${
        columnStyles[column.id]
      } ${isOver ? "bg-primary/5 ring-2 ring-primary/20" : ""}`}
    >
      <div className="mb-5 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold tracking-tight text-foreground/80 uppercase">
            {column.title}
          </h3>
          <span className="flex h-5 min-w-[1.25rem] px-1 items-center justify-center rounded-full bg-secondary border border-border text-[10px] font-bold text-muted-foreground">
            {tasks.length}
          </span>
        </div>
        <button 
          onClick={() => toast.info(`Settings for "${column.title}" are coming soon!`)}
          className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground transition-colors"

        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col space-y-4 flex-1">
        <SortableContext items={column.taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard 
               key={task.id} 
               task={task as any} 
               onEdit={onEdit as any} 
               onDelete={onDelete} 
            />
          ))}

          {tasks.length === 0 && (
            <div className="flex h-32 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border transition-colors hover:border-primary/30">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/50 text-muted-foreground">
                <Plus className="h-5 w-5" />
              </div>
              <span className="mt-2 text-xs font-medium text-muted-foreground">Drop tasks here</span>
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}
