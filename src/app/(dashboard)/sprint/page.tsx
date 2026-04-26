"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useKanbanStore, Task } from "@/store/useTaskStore";
import { useAuthStore } from "@/store/useAuthStore";
import { TaskModal } from "@/components/task/TaskModal";
import { 
  Clock, 
  ChevronRight, 
  Plus,
  Target,
  Trophy,
  AlertTriangle,
  History,
  LayoutGrid,
  ListTodo,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUp,
  ArrowDown,
  Minus
} from "lucide-react";

import { useSprintStore } from "@/store/useSprintStore";
import { useProjectStore } from "@/store/useProjectStore";
import { StartSprintModal } from "@/components/sprint/StartSprintModal";
import { BacklogTaskPicker } from "@/components/sprint/BacklogTaskPicker";
import { SprintSummaryModal } from "@/components/sprint/SprintSummaryModal";

export default function SprintPage() {
  const { tasks, fetchTasks, editTask, assignTasksToSprint } = useKanbanStore();
  const { user } = useAuthStore();
  const { sprints, activeSprintId, startSprint, fetchSprints, updateSprint, completeActiveSprint } = useSprintStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStartSprintModalOpen, setIsStartSprintModalOpen] = useState(false);
  const [isBacklogPickerOpen, setIsBacklogPickerOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [activeEditTask, setActiveEditTask] = useState<Task | null>(null);
  
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState("");

  useEffect(() => {
    if (user?.uid) {
      fetchTasks();
      fetchSprints();
    }
  }, [fetchTasks, fetchSprints, user?.uid]);

  const activeSprint = useMemo(() => 
    activeSprintId ? sprints.find(s => s.id === activeSprintId) : null
  , [sprints, activeSprintId]);

  const allTasks = Object.values(tasks);
  
  const sprintTasks = useMemo(() => 
    activeSprintId ? allTasks.filter(t => t.sprintId === activeSprintId) : []
  , [allTasks, activeSprintId]);

  // Stats Logic
  const stats = useMemo(() => {
    const totalCount = sprintTasks.length;
    const completedCount = sprintTasks.filter(t => t.status === "done").length;
    
    const ptsTotal = sprintTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const ptsDone = sprintTasks.filter(t => t.status === "done")
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

    // If story points are used (total > 0), use points. Otherwise use counts.
    const usePoints = ptsTotal > 0;
    const progress = usePoints 
      ? Math.round((ptsDone / ptsTotal) * 100) 
      : (totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0);

    return {
      total: usePoints ? ptsTotal : totalCount,
      done: usePoints ? ptsDone : completedCount,
      progress,
      unit: usePoints ? "pts" : "tasks"
    };
  }, [sprintTasks]);

  const progressPercent = stats.progress;

  // Pace awareness
  const calculatePace = () => {
    if (!activeSprint) return null;
    const start = new Date(activeSprint.startDate);
    const end = new Date(activeSprint.endDate);
    const now = new Date();
    
    // Total duration in days
    const totalDays = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    // Days elapsed from start till now
    const daysElapsed = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    
    const expectedProgress = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));
    const isBehind = progressPercent < expectedProgress - 5;
    
    return { isBehind, expectedProgress: Math.round(expectedProgress) };
  };

  const pace = calculatePace();

  const handleEditTask = (task: Task) => {
    setActiveEditTask(task);
    setIsModalOpen(true);
  };

  const handleSaveTask = (data: Partial<Task>) => {
    if (activeEditTask) {
      editTask(activeEditTask.id, data);
    }
  };

  const handleUpdateGoal = async () => {
    if (!activeSprintId) return;
    await updateSprint(activeSprintId, { goal: tempGoal });
    setIsEditingGoal(false);
  };

  const handleFinishSprint = async (rolloverChoice: "backlog" | "next") => {
    try {
      if (rolloverChoice === "backlog") {
        const incompleteTaskIds = sprintTasks.filter(t => t.status !== "done").map(t => t.id);
        if (incompleteTaskIds.length > 0) {
          await assignTasksToSprint(incompleteTaskIds, null);
        }
      }
      
      await useKanbanStore.getState().completeSprint();
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

  if (!activeSprint) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] gap-6 animate-in fade-in zoom-in-95">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
           <Layers className="h-8 w-8" />
        </div>
        <div className="text-center space-y-2">
           <h2 className="text-2xl font-bold tracking-tight">No Active Sprint</h2>
           <p className="text-muted-foreground text-xs max-w-xs mx-auto">
             Start a new sprint to organize your team's work and track target goals.
           </p>
        </div>
        <button 
           onClick={() => setIsStartSprintModalOpen(true)}
           className="flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground hover:opacity-90 transition-all shadow-md active:scale-95 mt-2 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Start Sprint
        </button>

        <StartSprintModal 
          open={isStartSprintModalOpen}
          onOpenChange={setIsStartSprintModalOpen}
          onStart={startSprint}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-8 h-full animate-in fade-in slide-in-from-bottom-2">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
             <span className="flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-700 uppercase tracking-wider">
               Active Sprint
             </span>
             <span className="text-muted-foreground text-[10px] font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(activeSprint.startDate).toLocaleDateString()} - {new Date(activeSprint.endDate).toLocaleDateString()}
             </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {activeSprint.name}
          </h2>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
             calculateDaysRemaining(activeSprint.endDate) <= 2 
             ? 'bg-rose-50 border-rose-100 text-rose-600' 
             : 'bg-secondary/40 border-border text-foreground'
          }`}>
            <Clock className={`h-3.5 w-3.5 ${calculateDaysRemaining(activeSprint.endDate) <= 2 ? 'text-rose-500' : 'text-amber-500'}`} />
            {calculateDaysRemaining(activeSprint.endDate)} Days Left
          </div>
          <button 
             onClick={() => setIsSummaryModalOpen(true)}
             className="flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white hover:opacity-90 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            Complete Sprint
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left Column: Metrics */}
        <div className="lg:col-span-1 space-y-5">
           {/* Progress Card */}
           <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Sprint Progress</p>
                <p className="text-xs font-bold text-primary">{progressPercent}%</p>
              </div>
              <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden mb-4">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-1000" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between items-baseline">
                <div>
                   <p className="text-lg font-bold text-foreground">{stats.done} <span className="text-[10px] font-medium text-muted-foreground">/ {stats.total} {stats.unit}</span></p>
                </div>
                {pace?.isBehind && (
                  <div className="flex items-center gap-1 text-[9px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded animate-pulse">
                    <AlertTriangle className="h-3 w-3" />
                  </div>
                )}
              </div>
           </div>

           {/* Small Stats Grid */}
           <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-3.5 w-3.5 text-primary" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Goal</p>
                  </div>
                  {isEditingGoal ? (
                    <div className="space-y-2">
                       <textarea 
                         autoFocus
                         className="w-full text-[11px] bg-secondary/30 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-primary min-h-[60px]"
                         value={tempGoal}
                         onChange={(e) => setTempGoal(e.target.value)}
                       />
                       <div className="flex gap-2">
                          <button onClick={handleUpdateGoal} className="px-2 py-1 bg-primary text-white text-[9px] font-bold rounded cursor-pointer">Save</button>
                          <button onClick={() => setIsEditingGoal(false)} className="px-2 py-1 text-[9px] font-bold rounded border border-border cursor-pointer">Cancel</button>
                       </div>
                    </div>
                  ) : (
                    <p 
                      onClick={() => { setTempGoal(activeSprint.goal || ""); setIsEditingGoal(true); }}
                      className="text-[11px] text-foreground leading-relaxed cursor-pointer hover:text-primary transition-colors border border-transparent hover:border-primary/10 rounded p-1"
                    >
                      {activeSprint.goal || "No goal set. Click to define."}
                    </p>
                  )}
              </div>

              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <History className="h-3.5 w-3.5 text-blue-500" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Velocity</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <p className="text-xl font-bold text-foreground">{stats.done}</p>
                    <p className="text-[10px] font-bold text-muted-foreground">{stats.unit} delivered</p>
                  </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <ListTodo className="h-3.5 w-3.5 text-indigo-500" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Workload</p>
                  </div>
                  <div className="space-y-2.5">
                    {Array.from(new Set(sprintTasks.map(t => t.assignedTo || "Unassigned"))).map(user => {
                      const userTasks = sprintTasks.filter(t => t.assignedTo === (user === "Unassigned" ? undefined : user));
                      const userPoints = userTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
                      return (
                        <div key={user} className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                              <div className="h-5 w-5 rounded-md bg-secondary flex items-center justify-center text-[8px] font-bold border border-border">
                                 {user.substring(0, 2).toUpperCase()}
                              </div>
                              <span className="text-[10px] font-medium text-foreground">{user}</span>
                           </div>
                           <span className="text-[10px] font-bold text-muted-foreground">{userPoints} pts</span>
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
                         viewMode === "kanban" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <LayoutGrid className="h-3 w-3" />
                      Board
                    </button>
                    <button 
                      onClick={() => setViewMode("list")}
                      className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                         viewMode === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
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
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            status === 'todo' ? 'bg-primary' : status === 'in-progress' ? 'bg-amber-400' : 'bg-emerald-500'
                          }`} />
                          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            {status.replace('-', ' ')}
                          </h4>
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground opacity-40">
                          {sprintTasks.filter(t => t.status === status).length}
                        </span>
                     </div>

                     <div className="flex flex-col gap-2.5 min-h-[150px]">
                        {sprintTasks.filter(t => t.status === status).map((task) => (
                           <div 
                             key={task.id}
                             onClick={() => handleEditTask(task)}
                             className="group p-3.5 rounded-xl border border-border bg-card shadow-sm hover:border-primary/20 transition-all cursor-pointer"
                           >
                              <div className="flex justify-between items-start gap-2 mb-2">
                                 <h5 className="text-[11px] font-bold text-foreground leading-snug line-clamp-2">
                                    {task.title}
                                 </h5>
                                 <div className="flex-shrink-0 text-[9px] font-bold text-primary">
                                    {task.storyPoints || 0}
                                 </div>
                              </div>
                              {task.description && (
                                <p className="text-[9px] text-muted-foreground line-clamp-1 mb-3">
                                   {task.description.length > 50 ? `${task.description.substring(0, 50)}...` : task.description}
                                </p>
                              )}
                              <div className="flex items-center justify-between">
                                 <div className="h-5 w-5 rounded-md bg-secondary flex items-center justify-center text-[7px] font-bold border border-border">
                                    {task.assignedTo ? task.assignedTo.substring(0, 2).toUpperCase() : "U"}
                                 </div>
                                 {task.priority && (
                                   <div className={priorityIcons[task.priority as keyof typeof priorityIcons]?.color}>
                                      {React.createElement(priorityIcons[task.priority as keyof typeof priorityIcons]?.icon, { size: 12 })}
                                   </div>
                                 )}
                              </div>
                           </div>
                        ))}
                        
                        {sprintTasks.filter(t => t.status === status).length === 0 && (
                          <div className="flex-1 flex items-center justify-center rounded-xl border border-dashed border-border py-6 opacity-30">
                             <p className="text-[8px] font-bold uppercase tracking-widest">Empty</p>
                          </div>
                        )}
                     </div>
                  </div>
                ))}
             </div>
           ) : (
             <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                <table className="w-full text-left">
                   <thead className="bg-secondary/40 border-b border-border">
                      <tr>
                         <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Task</th>
                         <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                         <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Priority</th>
                         <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Points</th>
                         <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Assignee</th>
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
                                <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{task.title}</p>
                                {task.description && (
                                  <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                                    {task.description.length > 70 ? `${task.description.substring(0, 70)}...` : task.description}
                                  </p>
                                )}
                             </td>
                             <td className="px-4 py-3">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                                   task.status === 'done' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                   task.status === 'in-progress' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                                   'bg-blue-50 text-blue-600 border-blue-100'
                                }`}>
                                   {task.status.replace('-', ' ')}
                                </span>
                             </td>
                             <td className="px-4 py-3">
                                {task.priority && (
                                  <div className={`flex items-center gap-1.5 ${priorityIcons[task.priority as keyof typeof priorityIcons]?.color}`}>
                                     {React.createElement(priorityIcons[task.priority as keyof typeof priorityIcons]?.icon, { size: 12 })}
                                     <span className="text-[10px] font-bold capitalize">{task.priority}</span>
                                  </div>
                                )}
                             </td>
                             <td className="px-4 py-3">
                                <span className="text-[10px] font-bold text-primary">{task.storyPoints || 0}</span>
                             </td>
                             <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-5 w-5 rounded bg-secondary flex items-center justify-center text-[8px] font-bold border border-border">
                                     {task.assignedTo ? task.assignedTo.substring(0, 2).toUpperCase() : "U"}
                                  </div>
                                  <span className="text-[10px] font-medium text-foreground">{task.assignedTo || "Unassigned"}</span>
                                </div>
                             </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                           <td colSpan={5} className="py-12 text-center text-muted-foreground italic text-xs">No tasks in current sprint.</td>
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
        tasks={allTasks}
        onAdd={(taskIds) => assignTasksToSprint(taskIds, activeSprintId)}
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
