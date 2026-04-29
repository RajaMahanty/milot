import React, { useState, useMemo } from "react";
import { Task } from "@/store/useTaskStore";
import { Sprint } from "@/lib/sprintService";
import { TaskModal } from "@/components/task/TaskModal";
import {
  Clock,
  Target,
  History,
  LayoutGrid,
  ListTodo,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus,
  AlertTriangle,
  Plus,
  Pencil,
} from "lucide-react";
import { useKanbanStore } from "@/store/useTaskStore";
import { useSprintStore } from "@/store/useSprintStore";
import { useProjectStore } from "@/store/useProjectStore";
import { BacklogTaskPicker } from "@/components/sprint/BacklogTaskPicker";
import { SprintSummaryModal } from "@/components/sprint/SprintSummaryModal";

interface ProjectSprintSectionProps {
  activeSprint: Sprint;
  sprintTasks: Task[];
  projectName?: string;
}

export function ProjectSprintSection({
  activeSprint,
  sprintTasks,
  projectName,
}: ProjectSprintSectionProps) {
  const { editTask, assignTasksToSprint } = useKanbanStore();
  const { updateSprint, fetchSprints, activateSprint } = useSprintStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBacklogPickerOpen, setIsBacklogPickerOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [activeEditTask, setActiveEditTask] = useState<Task | null>(null);

  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState("");

  const [isEditingDates, setIsEditingDates] = useState(false);
  const [tempStartDate, setTempStartDate] = useState("");
  const [tempEndDate, setTempEndDate] = useState("");

  const handleUpdateDates = async () => {
    if (tempStartDate && tempEndDate) {
      await updateSprint(activeSprint.id, { startDate: tempStartDate, endDate: tempEndDate });
    }
    setIsEditingDates(false);
  };

  const stats = useMemo(() => {
    const totalCount = sprintTasks.length;
    const completedCount = sprintTasks.filter(
      (t) => t.status === "done",
    ).length;

    const ptsTotal = sprintTasks.reduce(
      (sum, t) => sum + (t.storyPoints || 0),
      0,
    );
    const ptsDone = sprintTasks
      .filter((t) => t.status === "done")
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

    const usePoints = ptsTotal > 0;
    const progress = usePoints
      ? Math.round((ptsDone / ptsTotal) * 100)
      : totalCount > 0
        ? Math.round((completedCount / totalCount) * 100)
        : 0;

    return {
      total: usePoints ? ptsTotal : totalCount,
      done: usePoints ? ptsDone : completedCount,
      progress,
      unit: usePoints ? "pts" : "tasks",
    };
  }, [sprintTasks]);

  const progressPercent = stats.progress;

  const calculatePace = () => {
    if (!activeSprint) return null;
    const start = new Date(activeSprint.startDate);
    const end = new Date(activeSprint.endDate);
    const now = new Date();

    const totalDays = Math.max(
      1,
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysElapsed =
      (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

    const expectedProgress = Math.min(
      100,
      Math.max(0, (daysElapsed / totalDays) * 100),
    );
    const isBehind = progressPercent < expectedProgress - 5;

    return { isBehind, expectedProgress: Math.round(expectedProgress) };
  };

  const pace = calculatePace();

  const handleEditTask = (task: Task) => {
    setActiveEditTask(task);
    setIsModalOpen(true);
  };

  const handleSaveTask = (data: any) => {
    if (activeEditTask) {
      editTask(activeEditTask.id, data);
    }
  };

  const handleUpdateGoal = async () => {
    await updateSprint(activeSprint.id, { goal: tempGoal });
    setIsEditingGoal(false);
  };

  const handleFinishSprint = async (rolloverChoice: "backlog" | "next") => {
    try {
      if (rolloverChoice === "backlog") {
        const incompleteTaskIds = sprintTasks
          .filter((t) => t.status !== "done")
          .map((t) => t.id);
        if (incompleteTaskIds.length > 0) {
          await assignTasksToSprint(incompleteTaskIds, null);
        }
      }

      await useKanbanStore.getState().completeSprint(activeSprint.id);
      setIsSummaryModalOpen(false);

      useProjectStore.getState().fetchProjects();
      fetchSprints();
    } catch (err) {
      console.error(err);
    }
  };

  const calculateDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const priorityIcons = {
    high: { icon: ArrowUp, color: "text-rose-500" },
    medium: { icon: Minus, color: "text-amber-500" },
    low: { icon: ArrowDown, color: "text-blue-500" },
  };

  // The task picker needs all tasks to filter from backlog, but actually since we are moving things around
  // We can just get them directly from store when needed, or pass them. For simplicity:
  const allGlobalTasks = Object.values(useKanbanStore.getState().tasks);
  const projectBacklogTasks = allGlobalTasks.filter(t => t.projectId === activeSprint.projectId);

  return (
    <div className="flex flex-col gap-6 p-6 rounded-2xl bg-secondary/10 border border-border">
      {projectName && (
        <div className="flex items-center gap-2 mb-2">
          <div className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
            {projectName.substring(0, 2).toUpperCase()}
          </div>
          <h3 className="text-lg font-bold text-foreground">{projectName}</h3>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {activeSprint.status === "planned" ? (
              <span className="flex items-center gap-1.5 rounded-md bg-blue-50 border border-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                Planned Sprint
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                Active Sprint
              </span>
            )}
            {isEditingDates ? (
              <div className="flex items-center gap-2 bg-card rounded p-1 border border-border shadow-sm">
                <input 
                  type="date" 
                  value={tempStartDate} 
                  onChange={e => setTempStartDate(e.target.value)} 
                  className="text-xs px-1 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-primary bg-transparent text-foreground" 
                />
                <span className="text-xs text-muted-foreground">-</span>
                <input 
                  type="date" 
                  value={tempEndDate} 
                  onChange={e => setTempEndDate(e.target.value)} 
                  className="text-xs px-1 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-primary bg-transparent text-foreground" 
                />
                <button onClick={handleUpdateDates} className="text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded font-bold hover:opacity-90 transition-all cursor-pointer">Save</button>
                <button onClick={() => setIsEditingDates(false)} className="text-[10px] bg-secondary text-foreground px-2 py-1 rounded font-bold hover:bg-secondary/80 transition-all cursor-pointer">Cancel</button>
              </div>
            ) : (
              <span 
                onClick={() => {
                  setTempStartDate(activeSprint.startDate.split('T')[0]);
                  setTempEndDate(activeSprint.endDate.split('T')[0]);
                  setIsEditingDates(true);
                }}
                className="text-muted-foreground text-xs font-medium flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors group px-2 py-1 rounded-md hover:bg-secondary/40"
              >
                <Calendar className="h-3.5 w-3.5" />
                {new Date(activeSprint.startDate).toLocaleDateString()} -{" "}
                {new Date(activeSprint.endDate).toLocaleDateString()}
                <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {activeSprint.name}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {activeSprint.status !== "planned" && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                calculateDaysRemaining(activeSprint.endDate) <= 2
                  ? "bg-rose-50 border-rose-100 text-rose-600"
                  : "bg-secondary/40 border-border text-foreground"
              }`}
            >
              <Clock
                className={`h-3.5 w-3.5 ${calculateDaysRemaining(activeSprint.endDate) <= 2 ? "text-rose-500" : "text-amber-500"}`}
              />
              {calculateDaysRemaining(activeSprint.endDate)} Days Left
            </div>
          )}
          
          {activeSprint.status === "planned" ? (
            <button
              onClick={() => activateSprint(activeSprint.id)}
              className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white hover:opacity-90 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              Start Sprint
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateSprint(activeSprint.id, { status: "planned" })}
                className="flex h-10 items-center gap-2 rounded-lg bg-card border border-border px-4 text-xs font-bold text-foreground hover:bg-secondary transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                Stop Sprint
              </button>
              <button
                onClick={() => setIsSummaryModalOpen(true)}
                className="flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white hover:opacity-90 transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                Complete Sprint
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left Column: Metrics */}
        <div className="lg:col-span-1 space-y-5">
          {/* Progress Card */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Sprint Progress
              </p>
              <p className="text-sm font-bold text-primary">
                {progressPercent}%
              </p>
            </div>
            <div className="h-2 w-full rounded-full bg-secondary overflow-hidden mb-4">
              <div
                className="h-full bg-primary rounded-full transition-all duration-1000"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-baseline">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.done}{" "}
                  <span className="text-sm font-medium text-muted-foreground">
                    / {stats.total} {stats.unit}
                  </span>
                </p>
              </div>
              {pace?.isBehind && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-full animate-pulse shadow-sm border border-rose-100">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Behind
                </div>
              )}
            </div>
          </div>

          {/* Small Stats Grid */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-primary" />
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Goal
                </p>
              </div>
              {isEditingGoal ? (
                <div className="space-y-2">
                  <textarea
                    autoFocus
                    className="w-full text-sm bg-secondary/30 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-primary min-h-[80px]"
                    value={tempGoal}
                    onChange={(e) => setTempGoal(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdateGoal}
                      className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditingGoal(false)}
                      className="px-3 py-1.5 text-xs font-bold rounded border border-border cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p
                  onClick={() => {
                    setTempGoal(activeSprint.goal || "");
                    setIsEditingGoal(true);
                  }}
                  className="text-sm text-foreground leading-relaxed cursor-pointer hover:text-primary transition-colors border border-transparent hover:border-primary/10 rounded p-2"
                >
                  {activeSprint.goal || "No goal set. Click to define."}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <History className="h-4 w-4 text-blue-500" />
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Velocity
                </p>
              </div>
              <div className="flex items-baseline gap-1">
                <p className="text-3xl font-bold text-foreground">
                  {stats.done}
                </p>
                <p className="text-xs font-bold text-muted-foreground">
                  {stats.unit} delivered
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <ListTodo className="h-4 w-4 text-indigo-500" />
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Workload
                </p>
              </div>
              <div className="space-y-4">
                {Array.from(
                  new Set(sprintTasks.map((t) => t.assignedTo || "Unassigned")),
                ).map((user) => {
                  const userTasks = sprintTasks.filter(
                    (t) =>
                      t.assignedTo ===
                      (user === "Unassigned" ? undefined : user),
                  );
                  const userPoints = userTasks.reduce(
                    (sum, t) => sum + (t.storyPoints || 0),
                    0,
                  );
                  return (
                    <div
                      key={user}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-lg bg-secondary flex items-center justify-center text-[10px] font-bold border border-border shadow-sm">
                          {user.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-foreground">
                          {user}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-muted-foreground">
                        {userPoints} pts
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Section Header with Toggles */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-secondary/50 p-1 rounded-lg border border-border">
                <button
                  onClick={() => setViewMode("kanban")}
                  className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    viewMode === "kanban"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutGrid className="h-3 w-3" />
                  Board
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    viewMode === "list"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ListTodo className="h-3 w-3" />
                  List
                </button>
              </div>
            </div>
            <button
              onClick={() => setIsBacklogPickerOpen(true)}
              className="flex items-center gap-2 px-4 py-2 border border-dashed border-primary/40 text-primary rounded-lg text-xs font-bold hover:bg-primary/5 transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Tasks
            </button>
          </div>

          {/* View Content */}
          {viewMode === "kanban" ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {["todo", "in-progress", "done"].map((status) => (
                <div key={status} className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          status === "todo"
                            ? "bg-primary"
                            : status === "in-progress"
                              ? "bg-amber-400"
                              : "bg-emerald-500"
                        }`}
                      />
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        {status.replace("-", " ")}
                      </h4>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground opacity-40">
                      {sprintTasks.filter((t) => t.status === status).length}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2.5 min-h-[150px]">
                    {sprintTasks
                      .filter((t) => t.status === status)
                      .map((task) => (
                        <div
                          key={task.id}
                          onClick={() => handleEditTask(task)}
                          className="group p-4 rounded-xl border border-border bg-card shadow-sm hover:border-primary/20 transition-all cursor-pointer hover:shadow-md"
                        >
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <h5 className="text-xs font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                              {task.title}
                            </h5>
                            <div className="flex-shrink-0 text-[10px] font-black text-primary bg-primary/5 px-1.5 py-0.5 rounded">
                              {task.storyPoints || 0}
                            </div>
                          </div>
                          {task.description && (
                            <p className="text-[10px] text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between pt-2 border-t border-border/50">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-lg bg-secondary flex items-center justify-center text-[9px] font-bold border border-border shadow-sm">
                                {task.assignedTo
                                  ? task.assignedTo
                                      .substring(0, 2)
                                      .toUpperCase()
                                  : "U"}
                              </div>
                              <span className="text-[10px] font-medium text-muted-foreground">
                                {task.assignedTo || "Unassigned"}
                              </span>
                            </div>
                            {task.priority && (
                              <div
                                className={
                                  priorityIcons[
                                    task.priority as keyof typeof priorityIcons
                                  ]?.color
                                }
                              >
                                {React.createElement(
                                  priorityIcons[
                                    task.priority as keyof typeof priorityIcons
                                  ]?.icon,
                                  { size: 14 },
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                    {sprintTasks.filter((t) => t.status === status).length ===
                      0 && (
                      <div className="flex-1 flex items-center justify-center rounded-xl border border-dashed border-border py-6 opacity-30">
                        <p className="text-[8px] font-bold uppercase tracking-widest">
                          Empty
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-x-auto no-scrollbar">
              <table className="w-full text-left min-w-[600px]">
                <thead className="bg-secondary/40 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Task
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Points
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Assignee
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sprintTasks.length > 0 ? (
                    sprintTasks.map((task) => (
                      <tr
                        key={task.id}
                        onClick={() => handleEditTask(task)}
                        className="hover:bg-secondary/20 transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-3">
                          <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                              {task.description.length > 70
                                ? `${task.description.substring(0, 70)}...`
                                : task.description}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                              task.status === "done"
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                : task.status === "in-progress"
                                  ? "bg-amber-50 text-amber-600 border-amber-100"
                                  : "bg-blue-50 text-blue-600 border-blue-100"
                            }`}
                          >
                            {task.status.replace("-", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {task.priority && (
                            <div
                              className={`flex items-center gap-1.5 ${priorityIcons[task.priority as keyof typeof priorityIcons]?.color}`}
                            >
                              {React.createElement(
                                priorityIcons[
                                  task.priority as keyof typeof priorityIcons
                                ]?.icon,
                                { size: 12 },
                              )}
                              <span className="text-[10px] font-bold capitalize">
                                {task.priority}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold text-primary">
                            {task.storyPoints || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded bg-secondary flex items-center justify-center text-[8px] font-bold border border-border">
                              {task.assignedTo
                                ? task.assignedTo.substring(0, 2).toUpperCase()
                                : "U"}
                            </div>
                            <span className="text-[10px] font-medium text-foreground">
                              {task.assignedTo || "Unassigned"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-12 text-center text-muted-foreground italic text-xs"
                      >
                        No tasks in current sprint.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <TaskModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setActiveEditTask(null);
        }}
        onSave={handleSaveTask}
        initialData={activeEditTask}
      />

      <BacklogTaskPicker
        open={isBacklogPickerOpen}
        onClose={() => setIsBacklogPickerOpen(false)}
        tasks={projectBacklogTasks}
        onAdd={(taskIds) => assignTasksToSprint(taskIds, activeSprint.id)}
      />

      <SprintSummaryModal
        open={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        sprintName={activeSprint.name}
        tasks={sprintTasks}
        onComplete={handleFinishSprint}
      />
    </div>
  );
}
