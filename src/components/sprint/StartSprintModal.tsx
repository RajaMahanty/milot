"use client";

import React, { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, Calendar, Zap, Target } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (data: {
    name: string;
    goal: string;
    startDate: string;
    endDate: string;
  }) => void;
};

export function StartSprintModal({ open, onOpenChange, onStart }: Props) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [duration, setDuration] = useState("2"); // weeks
  
  const calculateEndDate = (weeks: string) => {
    const d = new Date();
    d.setDate(d.getDate() + (parseInt(weeks) * 7));
    return d.toISOString().split('T')[0];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onStart({
      name,
      goal,
      startDate: new Date().toISOString().split('T')[0],
      endDate: calculateEndDate(duration)
    });

    onOpenChange(false);
    setName("");
    setGoal("");
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in" />
        <DialogPrimitive.Content 
          className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-6 rounded-3xl border border-border bg-card p-8 shadow-card animate-in zoom-in-95 duration-200"
        >
          <DialogPrimitive.Title className="text-2xl font-bold tracking-tight flex items-center gap-3">
             <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Zap className="h-5 w-5" />
             </div>
             Add New Sprint
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Create a new sprint by providing a name, duration, and goal.
          </DialogPrimitive.Description>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                 Sprint Name
              </label>
              <input
                autoFocus
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Q2 - Performance Sprint"
                className="w-full rounded-xl bg-secondary/50 border border-border px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                 <Calendar className="h-3 w-3" />
                 Duration
              </label>
              <select 
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full rounded-xl bg-secondary/50 border border-border px-4 py-3 text-sm focus:border-primary focus:outline-none transition-all"
              >
                 <option value="1">1 Week</option>
                 <option value="2">2 Weeks</option>
                 <option value="3">3 Weeks</option>
                 <option value="4">4 Weeks</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                 <Target className="h-3 w-3" />
                 Sprint Goal
              </label>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="What are we trying to achieve?"
                className="w-full rounded-xl bg-secondary/50 border border-border px-4 py-3 text-sm min-h-[100px] resize-none focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-elevated hover:opacity-90 transition-opacity active:scale-95"
              >
                Add Sprint
              </button>
            </div>
          </form>
          
          <DialogPrimitive.Close className="absolute right-6 top-6 rounded-lg opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none">
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
