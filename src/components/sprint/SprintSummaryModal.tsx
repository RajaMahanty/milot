"use client";

import React, { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle2, ChevronRight, AlertCircle, ArrowRightCircle } from "lucide-react";
import { Task } from "@/store/useTaskStore";

interface Props {
  open: boolean;
  onClose: () => void;
  sprintName: string;
  tasks: Task[];
  onComplete: (rolloverChoice: "backlog" | "next") => void;
}

export function SprintSummaryModal({ open, onClose, sprintName, tasks, onComplete }: Props) {
  const completedTasks = useMemo(() => tasks.filter(t => t.status === "done"), [tasks]);
  const incompleteTasks = useMemo(() => tasks.filter(t => t.status !== "done"), [tasks]);

  const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const completedPoints = completedTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent 
        className="sm:max-w-md" 
        aria-describedby={undefined}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Complete {sprintName}</DialogTitle>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">Completed</p>
                <p className="text-xl font-bold text-emerald-900">{completedTasks.length} <span className="text-sm font-medium">tasks</span></p>
                <p className="text-xs text-emerald-700 font-medium">{completedPoints} points</p>
             </div>
             <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Incomplete</p>
                <p className="text-xl font-bold text-amber-900">{incompleteTasks.length} <span className="text-sm font-medium">tasks</span></p>
                <p className="text-xs text-amber-700 font-medium">{totalPoints - completedPoints} points</p>
             </div>
          </div>

          {/* Action Choice */}
          {incompleteTasks.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-bold text-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                What to do with {incompleteTasks.length} incomplete tasks?
              </p>
              
              <button 
                onClick={() => onComplete("backlog")}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group text-left"
              >
                <div>
                   <p className="text-sm font-bold text-foreground">Move to Backlog</p>
                   <p className="text-xs text-muted-foreground mt-0.5">Tasks will be unassigned from any sprint.</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
              </button>

              <button 
                disabled
                className="w-full flex items-center justify-between p-4 rounded-xl border border-border opacity-50 cursor-not-allowed text-left"
              >
                <div>
                   <p className="text-sm font-bold text-foreground">Move to Next Sprint</p>
                   <p className="text-xs text-muted-foreground mt-0.5">Create a new sprint or wait for the next one.</p>
                </div>
                <div className="px-2 py-0.5 bg-secondary text-[8px] font-bold rounded uppercase tracking-widest text-muted-foreground">Soon</div>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
               <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-6 w-6" />
               </div>
               <p className="text-sm font-bold text-foreground">Perfect Sprint!</p>
               <p className="text-xs text-muted-foreground mt-1">All tasks in this sprint were completed.</p>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-end gap-2">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-secondary rounded-xl transition-colors"
          >
            Cancel
          </button>
          {incompleteTasks.length === 0 && (
            <button 
              onClick={() => onComplete("backlog")}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-glow hover:opacity-90 active:scale-95 transition-all"
            >
              Finish Sprint
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
