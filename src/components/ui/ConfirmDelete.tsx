"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
}

export function ConfirmDelete({ open, onClose, onConfirm, title, description }: Props) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500 mb-2">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
            {title || "Confirm Deletion"}
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            {description || "Are you sure you want to delete this? This action cannot be undone."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 gap-2">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-6 py-2 bg-rose-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-rose-200 dark:shadow-none hover:bg-rose-600 active:scale-95 transition-all"
          >
            Delete
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
