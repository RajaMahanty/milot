"use client";

import React from "react";
import { useToastStore, ToastType } from "@/store/useToastStore";
import { 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  AlertTriangle, 
  X 
} from "lucide-react";

export function Toaster() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: any; onRemove: () => void }) {
  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    error: <AlertCircle className="h-5 w-5 text-rose-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
  };

  const bgColors = {
    success: "bg-white dark:bg-slate-900 border-emerald-100 dark:border-emerald-900/30",
    error: "bg-white dark:bg-slate-900 border-rose-100 dark:border-rose-900/30",
    warning: "bg-white dark:bg-slate-900 border-amber-100 dark:border-amber-900/30",
    info: "bg-white dark:bg-slate-900 border-blue-100 dark:border-blue-900/30",
  };

  return (
    <div 
      className={`
        pointer-events-auto flex items-center gap-3 min-w-[300px] max-w-md p-4 rounded-2xl border shadow-xl
        animate-in slide-in-from-right-full fade-in duration-300
        ${bgColors[toast.type as ToastType]}
      `}
    >
      <div className="shrink-0">{icons[toast.type as ToastType]}</div>
      <div className="flex-1">
        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
          {toast.message}
        </p>
      </div>
      <button 
        onClick={onRemove}
        className="shrink-0 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
