import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProjectStore } from "@/store/useProjectStore";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description?: string;
    priority?: "low" | "medium" | "high";
    dueDate?: string;
    projectId?: string;
    storyPoints?: number;
  }) => void;
  initialData?: Task | null;
};

export function TaskModal({ open, onClose, onSave, initialData }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [storyPoints, setStoryPoints] = useState<string>("");

  const { projects, activeProjectId } = useProjectStore();
  const projectList = Object.values(projects);

  const isEditMode = !!initialData;

  // Reset form whenever the modal opens or initialData changes
  useEffect(() => {
    if (open) {
      if (initialData) {
        setTitle(initialData.title);
        setDescription(initialData.description || "");
        setPriority(initialData.priority || "medium");
        setDueDate(initialData.dueDate || "");
        setProjectId(initialData.projectId);
        setStoryPoints(initialData.storyPoints?.toString() || "");
      } else {
        setTitle("");
        setDescription("");
        setPriority("medium");
        setDueDate("");
        setStoryPoints("");
        // Set default project if active project is "all", otherwise use active project
        setProjectId(activeProjectId && activeProjectId !== "all" ? activeProjectId : projectList[0]?.id || "");
      }
    }
  }, [open, initialData, activeProjectId, projectList]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !projectId) return;

    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      dueDate: dueDate || undefined,
      projectId: projectId,
      storyPoints: storyPoints ? parseInt(storyPoints, 10) : undefined,
    });

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent 
        className="sm:max-w-md" 
        aria-describedby={undefined}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Task" : "Create New Task"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Update landing page"
              className="w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details about this task..."
              className="w-full resize-none rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="project" className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Workspace <span className="text-red-500">*</span>
            </label>
            <select
              id="project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700"
              required
            >
              <option value="" disabled>Select a workspace</option>
              {projectList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            {projectList.length === 0 && (
              <p className="text-[10px] text-rose-500 font-medium">Please create a workspace first.</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="priority" className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Priority
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
              className="w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="dueDate" className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Due Date
            </label>
            <input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="storyPoints" className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Story Points
            </label>
            <input
              id="storyPoints"
              type="number"
              min="1"
              max="53"
              step="1"
              value={storyPoints}
              onChange={(e) => setStoryPoints(e.target.value)}
              placeholder="e.g. 5"
              className="w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isEditMode ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
