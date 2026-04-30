"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Column from "./Column";
import { TaskModal } from "@/components/task/TaskModal";
import { useKanbanStore, Task } from "@/store/useTaskStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useBoardStore } from "@/store/useBoardStore";
import { useProjectStore } from "@/store/useProjectStore";
import { TaskCard } from "@/components/task/TaskCard";
import { toast } from "@/store/useToastStore";
import { InviteModal } from "@/components/project/InviteModal";
import { userService, UserProfile } from "@/lib/userService";

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
  useDroppable,
} from "@dnd-kit/core";
import { Skeleton } from "@/components/ui/Skeleton";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import {
  Plus,
  Filter,
  SlidersHorizontal,
  UserPlus,
  ChevronDown,
  Trash2,
  Layout,
  LayoutGrid,
  MoreVertical,
  Pencil,
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

// Droppable board tab component
function DroppableBoardTab({
  board,
  isActive,
  onSelect,
  onDoubleClick,
  children,
}: {
  board: { id: string; name: string };
  isActive: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
  children?: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `board-tab-${board.id}` });
  return (
    <button
      ref={setNodeRef}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      className={`px-6 py-3 text-sm font-bold transition-all relative ${
        isOver
          ? "text-primary bg-primary/10 ring-2 ring-primary/30 rounded-t-xl scale-105"
          : isActive
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground"
      }`}
      title="Double click to rename · Drag cards here to move"
    >
      {board.name}
      {isActive && !isOver && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
      )}
      {isOver && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full animate-pulse" />
      )}
      {children}
    </button>
  );
}

export default function Board() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeEditTask, setActiveEditTask] = useState<Task | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [deleteBoardId, setDeleteBoardId] = useState<string | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [projectMembers, setProjectMembers] = useState<UserProfile[]>([]);

  // Filter States
  const [showSearch, setShowSearch] = useState(false);

  const [filterPriority, setFilterPriority] = useState<
    "high" | "medium" | "low" | null
  >(null);
  const [filterAssignee, setFilterAssignee] = useState<boolean>(false);
  const [filterShared, setFilterShared] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [showViewDropdown, setShowViewDropdown] = useState(false);

  const {
    columns,
    tasks,
    addTask,
    editTask,
    deleteTask,
    moveTask,
    fetchTasks,
    unsubscribeTasks,
    isLoading,
    searchQuery,
    setSearchQuery,
  } = useKanbanStore();
  const {
    boards,
    activeBoardId,
    setActiveBoard,
    createBoard,
    deleteBoard,
    updateBoard,
  } = useBoardStore();
  const { activeProjectId, projects } = useProjectStore();

  const [isAddingBoard, setIsAddingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [tempDescription, setTempDescription] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [tempBoardName, setTempBoardName] = useState("");

  const activeProject =
    activeProjectId && activeProjectId !== "all"
      ? projects[activeProjectId]
      : null;

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) return;
    await createBoard(newBoardName.trim());
    setNewBoardName("");
    setIsAddingBoard(false);
  };

  const handleRenameBoard = async () => {
    if (editingBoardId && tempBoardName.trim()) {
      await updateBoard(editingBoardId, { name: tempBoardName.trim() });
      setEditingBoardId(null);
      toast.success("Board renamed!");
    } else {
      setEditingBoardId(null);
    }
  };

  const handleSaveDescription = async () => {
    if (activeProjectId && activeProjectId !== "all") {
      const { updateProject } = useProjectStore.getState();
      await updateProject(activeProjectId, { description: tempDescription });
      setIsEditingDescription(false);
      toast.success("Project description updated!");
    }
  };

  const { user } = useAuthStore();

  // Fetch member profiles when active project changes
  useEffect(() => {
    const project =
      activeProjectId && activeProjectId !== "all"
        ? projects[activeProjectId]
        : null;
    if (project?.memberIds?.length) {
      userService.getUsersByIds(project.memberIds).then(setProjectMembers);
    } else {
      setProjectMembers([]);
    }
  }, [activeProjectId, projects]);

  useEffect(() => {
    if (user?.uid) {
      fetchTasks();
    }

    return () => {
      unsubscribeTasks();
    };
  }, [fetchTasks, unsubscribeTasks, user?.uid]);

  // Auto-open task from notification deep link (?openTask=taskId)
  const searchParams = useSearchParams();
  const routerBoard = useRouter();
  const hasHandledDeepLink = useRef(false);

  useEffect(() => {
    const openTaskId = searchParams.get("openTask");
    if (openTaskId && !hasHandledDeepLink.current && !isLoading) {
      const task = tasks[openTaskId];
      if (task) {
        hasHandledDeepLink.current = true;
        setActiveEditTask(task);
        setIsModalOpen(true);
        // Clean up the URL without triggering a navigation
        routerBoard.replace("/board", { scroll: false });
      }
    }
  }, [searchParams, tasks, isLoading]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleSaveTask = (data: any) => {
    if (activeEditTask) {
      editTask(activeEditTask.id, {
        ...data,
        projectId: data.projectId,
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
        boardId: activeBoardId || undefined,
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
    const overColumnId = overTaskData
      ? overTaskData.status
      : columns[overId]
        ? overId
        : null;

    if (overColumnId && activeColumnId !== overColumnId) {
      moveTask(activeId, overId);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over) {
      const overId = over.id as string;
      // Check if dropped on a board tab
      if (overId.startsWith("board-tab-")) {
        const targetBoardId = overId.replace("board-tab-", "");
        const taskId = active.id as string;
        if (tasks[taskId] && tasks[taskId].boardId !== targetBoardId) {
          editTask(taskId, { boardId: targetBoardId });
          toast.success(`Moved to ${boards[targetBoardId]?.name || "board"}`);
        }
      } else {
        moveTask(active.id as string, overId);
      }
    }
    setActiveTask(null);
  };

  const collisionDetectionStrategy = useCallback((args: any) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    const rectCollisions = rectIntersection(args);
    if (rectCollisions.length > 0) return rectCollisions;
    return [];
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Board Header */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            {activeProject ? activeProject.title : "Kanban Board"}
          </h2>

          {activeProject ? (
            <div className="mt-2 max-w-full pr-10">
              {isEditingDescription ? (
                <div className="flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-200">
                  <textarea
                    autoFocus
                    value={tempDescription}
                    onChange={(e) => setTempDescription(e.target.value)}
                    onBlur={handleSaveDescription}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSaveDescription();
                      }
                      if (e.key === "Escape") {
                        setIsEditingDescription(false);
                        setTempDescription(activeProject.description || "");
                      }
                    }}
                    className="w-full min-h-[150px] rounded-xl border border-primary/30 bg-card px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed resize-y"
                    placeholder="Enter project description..."
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onMouseDown={(e) => e.preventDefault()} // Prevent blur before click
                      onClick={handleSaveDescription}
                      className="text-[10px] font-bold text-primary hover:underline"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditingDescription(false)}
                      className="text-[10px] font-bold text-muted-foreground hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDoubleClick={() => {
                    setTempDescription(activeProject.description || "");
                    setIsEditingDescription(true);
                  }}
                  className="group relative cursor-text"
                  title="Double click to edit description"
                >
                  <p
                    className={`text-sm text-muted-foreground leading-relaxed transition-all ${!isExpanded ? "line-clamp-2" : ""}`}
                  >
                    {activeProject.description ||
                      "No description provided. Double-click to add one."}
                  </p>

                  {activeProject.description &&
                    activeProject.description.length > 150 && (
                      <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-[10px] font-bold text-primary hover:underline mt-1 flex items-center gap-0.5"
                      >
                        {isExpanded ? "Show Less" : "Read More"}
                      </button>
                    )}

                  <div className="absolute -right-6 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="h-3 w-3 text-muted-foreground/50" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">
              Manage and track your team's project tasks.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Member Avatars */}
          <div className="flex -space-x-2 mr-1">
            {projectMembers.slice(0, 4).map((m) => (
              <div
                key={m.uid}
                className="h-8 w-8 rounded-full border-2 border-background bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold ring-1 ring-border"
                title={m.displayName || "Member"}
              >
                {m.displayName?.substring(0, 2).toUpperCase() || "U"}
              </div>
            ))}
            {projectMembers.length > 4 && (
              <div className="h-8 w-8 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-[9px] font-bold text-muted-foreground ring-1 ring-border">
                +{projectMembers.length - 4}
              </div>
            )}
            {activeProject && (
              <button
                onClick={() => setIsInviteOpen(true)}
                title="Invite member"
                className="h-8 w-8 rounded-full border-2 border-dashed border-primary/40 bg-primary/5 flex items-center justify-center text-primary hover:bg-primary hover:text-white hover:border-transparent transition-all"
              >
                <UserPlus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="h-8 w-[1px] bg-border mx-1 hidden sm:block" />

          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`flex h-10 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all shadow-soft active:scale-95 ${showSearch ? "bg-primary/10 text-primary border border-primary/20" : "bg-secondary text-foreground hover:bg-accent"}`}
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

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* Board Tabs */}
        <div className="flex items-center gap-1 border-b border-border mb-6">
          {Object.values(boards).map((board) => (
            <div key={board.id} className="relative group">
              {editingBoardId === board.id ? (
                <div className="px-4 py-2 animate-in fade-in zoom-in-95 duration-150">
                  <input
                    autoFocus
                    value={tempBoardName}
                    onChange={(e) => setTempBoardName(e.target.value)}
                    onBlur={handleRenameBoard}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRenameBoard();
                      if (e.key === "Escape") setEditingBoardId(null);
                    }}
                    className="h-7 w-32 rounded-lg border border-primary/30 bg-card px-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              ) : (
                <DroppableBoardTab
                  board={board}
                  isActive={activeBoardId === board.id}
                  onSelect={() => setActiveBoard(board.id)}
                  onDoubleClick={() => {
                    setEditingBoardId(board.id);
                    setTempBoardName(board.name);
                  }}
                />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteBoardId(board.id);
                }}
                className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 p-1 bg-destructive text-destructive-foreground rounded-full h-4 w-4 flex items-center justify-center transition-opacity"
              >
                <Trash2 className="h-2 w-2" />
              </button>
            </div>
          ))}

          {isAddingBoard ? (
            <div className="flex items-center gap-2 px-4 py-2 animate-in slide-in-from-left-2 duration-200">
              <input
                autoFocus
                type="text"
                placeholder="Board name..."
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateBoard()}
                className="h-8 rounded-lg border border-border bg-card px-3 text-xs font-medium focus:border-primary focus:outline-none"
              />
              <button
                onClick={handleCreateBoard}
                className="text-[10px] font-bold text-primary hover:underline"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setIsAddingBoard(false);
                  setNewBoardName("");
                }}
                className="text-[10px] font-bold text-muted-foreground hover:underline"
              >
                Cancel
              </button>
            </div>
          ) : (
            activeProjectId &&
            activeProjectId !== "all" && (
              <button
                onClick={() => setIsAddingBoard(true)}
                className="px-6 py-3 text-sm font-bold text-muted-foreground hover:text-foreground transition-all flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Board
              </button>
            )
          )}
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
              View: {viewMode === "board" ? "Board" : "List"}
              <ChevronDown
                className={`h-3 w-3 transition-transform ${showViewDropdown ? "rotate-180" : ""}`}
              />
            </div>

            {showViewDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowViewDropdown(false)}
                />
                <div className="absolute top-full left-0 mt-1 w-32 rounded-xl border border-border bg-card p-1 shadow-elevated z-20 animate-in fade-in zoom-in-95">
                  <button
                    onClick={() => {
                      setViewMode("board");
                      setShowViewDropdown(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 text-xs font-bold rounded-lg transition-colors ${viewMode === "board" ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary"}`}
                  >
                    Board View
                  </button>
                  <button
                    onClick={() => {
                      setViewMode("list");
                      setShowViewDropdown(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 text-xs font-bold rounded-lg transition-colors ${viewMode === "list" ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary"}`}
                  >
                    List View
                  </button>
                </div>
              </>
            )}
          </div>

          <div
            onClick={() =>
              setFilterPriority((prev) =>
                !prev
                  ? "high"
                  : prev === "high"
                    ? "medium"
                    : prev === "medium"
                      ? "low"
                      : null,
              )
            }
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
          <div
            onClick={() => setFilterShared(!filterShared)}
            className={`flex items-center select-none gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${filterShared ? "border-blue-500 text-blue-600 bg-blue-50" : "border-border text-muted-foreground hover:bg-secondary"}`}
          >
            Shared Workspaces
          </div>
        </div>

        {viewMode === "board" ? (
          <div className="flex flex-1 gap-6 overflow-x-auto pb-8 no-scrollbar scroll-smooth">
            {isLoading
              ? [1, 2, 3].map((i) => (
                  <div key={i} className="w-[320px] shrink-0 space-y-4">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-40 w-full rounded-2xl" />
                    <Skeleton className="h-40 w-full rounded-2xl" />
                  </div>
                ))
              : Object.values(columns).map((column) => {
                  let columnTasks = column.taskIds
                    .map((taskId) => tasks[taskId])
                    .filter(Boolean);

                  // Filter by Board (skip when viewing All Workspaces)
                  if (activeProjectId !== "all") {
                    if (activeBoardId) {
                      columnTasks = columnTasks.filter(
                        (t) => t.boardId === activeBoardId,
                      );
                    } else if (Object.keys(boards).length > 0) {
                      columnTasks = columnTasks.filter((t) => !t.boardId);
                    }
                  }

                  if (filterPriority) {
                    columnTasks = columnTasks.filter(
                      (t) => t.priority === filterPriority,
                    );
                  }
                  if (filterAssignee) {
                    columnTasks = columnTasks.filter(
                      (t) => t.assignedTo === user?.uid,
                    );
                  }
                  if (filterShared) {
                    columnTasks = columnTasks.filter(
                      (t) => projects[t.projectId]?.uid !== user?.uid,
                    );
                  }
                  if (searchQuery.trim()) {
                    const query = searchQuery.toLowerCase();
                    columnTasks = columnTasks.filter(
                      (t) =>
                        t.title.toLowerCase().includes(query) ||
                        (t.description &&
                          t.description.toLowerCase().includes(query)),
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
                    .filter((t) => {
                      if (activeProjectId !== "all") {
                        if (activeBoardId && t.boardId !== activeBoardId)
                          return false;
                        if (
                          !activeBoardId &&
                          Object.keys(boards).length > 0 &&
                          t.boardId
                        )
                          return false;
                      }
                      if (filterPriority && t.priority !== filterPriority)
                        return false;
                      if (filterAssignee && t.assignedTo !== user?.uid)
                        return false;
                      if (
                        filterShared &&
                        projects[t.projectId]?.uid === user?.uid
                      )
                        return false;
                      if (searchQuery.trim()) {
                        const q = searchQuery.toLowerCase();
                        if (
                          !t.title.toLowerCase().includes(q) &&
                          !(
                            t.description &&
                            t.description.toLowerCase().includes(q)
                          )
                        )
                          return false;
                      }
                      return true;
                    })
                    .map((task) => (
                      <tr
                        key={task.id}
                        className="hover:bg-secondary/30 transition-colors group"
                      >
                        <td
                          onClick={() => handleEditTask(task)}
                          className="px-6 py-3 font-bold text-foreground cursor-pointer hover:text-primary transition-colors group-hover:underline decoration-primary/30"
                        >
                          {task.title}
                        </td>

                        <td className="px-6 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[10px] capitalize">
                            {task.status.replace("-", " ")}
                          </span>
                        </td>
                        <td className="px-6 py-3 font-medium text-muted-foreground uppercase text-[10px]">
                          {task.priority}
                        </td>
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
                    ))}
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

      <ConfirmDelete
        open={!!deleteBoardId}
        onClose={() => setDeleteBoardId(null)}
        onConfirm={() => {
          if (deleteBoardId) {
            deleteBoard(deleteBoardId);
            setDeleteBoardId(null);
          }
        }}
        title="Delete Board?"
        description="Are you sure you want to permanently delete this board? All tasks in this board will remain in your project but won't be visible on this board view anymore."
      />

      {activeProject && (
        <InviteModal
          open={isInviteOpen}
          onOpenChange={setIsInviteOpen}
          projectId={activeProject.id}
          projectName={activeProject.title}
        />
      )}
    </div>
  );
}
