"use client";

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Search, Plus, CheckCircle2, Circle } from "lucide-react";
import { Task } from "@/store/useTaskStore";

interface Props {
  open: boolean;
  onClose: () => void;
  tasks: Task[];
  onAdd: (taskIds: string[]) => void;
}

export function BacklogTaskPicker({ open, onClose, tasks, onAdd }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => 
      !t.sprintId && 
      t.status !== "done" &&
      (t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
       t.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [tasks, searchQuery]);

  const toggleSelection = (taskId: string) => {
    setSelectedIds(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const handleAdd = () => {
    onAdd(selectedIds);
    setSelectedIds([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent 
        className="sm:max-w-xl max-h-[80vh] flex flex-col p-0 overflow-hidden" 
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Add Tasks to Sprint</DialogTitle>
          <DialogDescription className="sr-only">
            Select tasks from the backlog to add them to the current sprint.
          </DialogDescription>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search backlog..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 rounded-xl bg-secondary/50 border-none pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-2">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => {
              const isSelected = selectedIds.includes(task.id);
              return (
                <div 
                  key={task.id}
                  onClick={() => toggleSelection(task.id)}
                  className={`group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected ? 'bg-primary/5 border-primary/30' : 'bg-card border-border hover:border-primary/20'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`transition-colors ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                      {isSelected ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{task.priority || 'medium'}</span>
                        <span className="text-muted-foreground opacity-30 text-[10px]">•</span>
                        <span className="text-[10px] font-bold text-primary">{task.storyPoints || 0} pts</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Search className="h-6 w-6 opacity-20" />
              </div>
              <p className="text-sm font-bold text-foreground">No tasks available</p>
              <p className="text-xs text-muted-foreground mt-1">All eligible tasks are already in a sprint or done.</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border flex items-center justify-between bg-secondary/10">
          <p className="text-xs font-bold text-muted-foreground">
            {selectedIds.length} tasks selected
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-secondary rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={selectedIds.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-elevated hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              Add to Sprint
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
