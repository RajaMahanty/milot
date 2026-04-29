"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { useProjectStore } from "@/store/useProjectStore";
import { useSprintStore } from "@/store/useSprintStore";
import { useBoardStore } from "@/store/useBoardStore";
import { useTeamStore } from "@/store/useTeamStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { userService, UserProfile } from "@/lib/userService";
import { Task, SubTask, Comment, CommentReply } from "@/store/useTaskStore";
import {
  CheckCircle2,
  Circle,
  Plus,
  Send,
  User,
  Calendar,
  AlertCircle,
  Zap,
  MoreHorizontal,
  X,
  AlignLeft,
  ChevronRight,
  Trash2,
  ChevronDown,
  Clock,
  LayoutGrid,
  MessageSquare,
  Layers,
  Reply,
  CornerDownRight
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "@/store/useToastStore";


type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: Task | null;
};

export function TaskModal({ open, onClose, onSave, initialData }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"todo" | "in-progress" | "done" | "archived">("todo");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [sprintId, setSprintId] = useState<string>("");
  const [boardId, setBoardId] = useState<string>("");
  const [storyPoints, setStoryPoints] = useState<string>("");

  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionTarget, setMentionTarget] = useState<'comment' | 'reply' | null>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [isAIDescriptionProcessing, setIsAIDescriptionProcessing] = useState(false);
  const [isAITitleProcessing, setIsAITitleProcessing] = useState(false);
  const hasLoadedInitial = useRef(false);
  const lastNotifiedAssignee = useRef<string | null>(null);
  const currentTaskId = useRef<string | null>(null);

  const { projects, activeProjectId } = useProjectStore();
  const { sprints, activeSprintId } = useSprintStore();
  const { boards, activeBoardId } = useBoardStore();
  const { teams } = useTeamStore();
  const { sendNotification } = useNotificationStore();
  const { user } = useAuthStore();
  
  const [projectMembers, setProjectMembers] = useState<UserProfile[]>([]);

  useEffect(() => {
    const loadMembers = async () => {
      if (!projectId) return;
      const project = projects[projectId];
      if (!project) return;

      const memberUids = new Set<string>(project.memberIds || []);
      
      // Add team members
      if (project.teamIds) {
        project.teamIds.forEach(teamId => {
          const team = teams.find(t => t.id === teamId);
          if (team) {
            team.memberIds.forEach(uid => memberUids.add(uid));
          }
        });
      }

      const profiles = await userService.getUsersByIds(Array.from(memberUids));
      setProjectMembers(profiles);
    };

    loadMembers();
  }, [projectId, projects, teams]);
  const projectList = useMemo(() => Object.values(projects), [projects]);

  const isEditMode = !!initialData;

  useEffect(() => {
    if (!open) {
      hasLoadedInitial.current = false;
      currentTaskId.current = null;
      return;
    }

    // Only load if we haven't loaded for this specific task opening
    if (open && (!hasLoadedInitial.current || (initialData?.id !== currentTaskId.current))) {
      if (initialData) {
        setTitle(initialData.title);
        setDescription(initialData.description || "");
        setStatus(initialData.status || "todo");
        setPriority(initialData.priority || "medium");
        setDueDate(initialData.dueDate || "");
        setProjectId(initialData.projectId);
        setSprintId(initialData.sprintId || "");
        setBoardId(initialData.boardId || "");
        setStoryPoints(initialData.storyPoints?.toString() || "");
        setSubtasks(initialData.subtasks || []);
        setComments(initialData.comments || []);
        setAssignedTo(initialData.assignedTo || "");
        currentTaskId.current = initialData.id;
      } else {
        setTitle("");
        setDescription("");
        setStatus("todo");
        setPriority("medium");
        setDueDate("");
        setStoryPoints("");
        setSubtasks([]);
        setComments([]);
        setProjectId(activeProjectId && activeProjectId !== "all" ? activeProjectId : projectList[0]?.id || "");
        setSprintId(activeSprintId || "");
        setBoardId(activeBoardId || "");
        setAssignedTo("");
        currentTaskId.current = "new";
      }
      
      // Delay enabling autosave to allow states to settle and avoid loop
      const timer = setTimeout(() => {
        hasLoadedInitial.current = true;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [open, initialData?.id, activeProjectId, projectList]);

  const lastValidDueDate = useRef(initialData?.dueDate || "");
  useEffect(() => {
    if (open && initialData) {
      lastValidDueDate.current = initialData.dueDate || "";
    }
  }, [open, initialData?.dueDate]);


  // Debounced Autosave
  useEffect(() => {
    // CRITICAL: Only autosave if we've fully loaded initial data and it's an edit
    if (!isEditMode || !hasLoadedInitial.current || !open) return;

    const saveChanges = async () => {
      if (!title.trim() || !projectId) return;
      
      setIsSaving(true);
      try {
        await onSave({
          title: title.trim(),
          description: description.trim() || undefined,
          status,
          priority,
          dueDate: dueDate || undefined,
          projectId: projectId,
          sprintId: sprintId || undefined,
          boardId: boardId || undefined,
          storyPoints: storyPoints ? parseInt(storyPoints, 10) : undefined,
          subtasks,
          comments,
          assignedTo: assignedTo || undefined,
        });
      } finally {
        setTimeout(() => setIsSaving(false), 500);
      }
    };

    const timeout = setTimeout(saveChanges, 500);
    return () => clearTimeout(timeout);
  }, [title, description, status, priority, dueDate, projectId, sprintId, boardId, storyPoints, subtasks, comments, assignedTo]);

  // Task Assignment Notification
  useEffect(() => {
    if (!open || !hasLoadedInitial.current || !assignedTo) return;
    if (assignedTo === user?.uid) return;
    if (assignedTo === initialData?.assignedTo) return;
    if (assignedTo === lastNotifiedAssignee.current) return;

    sendNotification({
      type: 'task_assigned',
      toUid: assignedTo,
      taskId: initialData?.id || "new",
      taskTitle: title.trim(),
      projectId,
      projectName: projects[projectId]?.title
    });
    
    lastNotifiedAssignee.current = assignedTo;
  }, [assignedTo, open, user?.uid, initialData?.id, initialData?.assignedTo, projectId, projects, title, sendNotification]);

  const handleSave = () => {
    if (!title.trim() || !projectId) return;

    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      dueDate: dueDate || undefined,
      projectId: projectId,
      sprintId: sprintId || undefined,
      boardId: boardId || undefined,
      storyPoints: storyPoints ? parseInt(storyPoints, 10) : undefined,
      subtasks,
      comments,
      assignedTo: assignedTo || undefined,
    });

    onClose();
    toast.success("Task saved successfully!");
  };


  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    const sub: SubTask = {
      id: crypto.randomUUID(),
      title: newSubtask.trim(),
      completed: false
    };
    setSubtasks([...subtasks, sub]);
    setNewSubtask("");
  };

  const toggleSubtask = (id: string) => {
    setSubtasks(subtasks.map(s => s.id === id ? { ...s, completed: !s.completed } : s));
  };

  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter(s => s.id !== id));
    toast.info("Subtask removed");
  };


  const editSubtask = (id: string, title: string) => {
    setSubtasks(subtasks.map(s => s.id === id ? { ...s, title } : s));
  };

  // Parse @username mentions from text and return matching member profiles
  const getMentionedUsers = (text: string) => {
    const matches = text.match(/@(\w+)/g) || [];
    const usernames = matches.map(m => m.slice(1).toLowerCase());
    return projectMembers.filter(m => usernames.includes(m.username?.toLowerCase() || ""));
  };

  // Detect @ in textarea and show member suggestions
  const handleTextareaInput = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
    setValue: (v: string) => void,
    target: 'comment' | 'reply'
  ) => {
    const value = e.target.value;
    setValue(value);
    const cursor = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursor);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionTarget(target);
    } else {
      setMentionQuery("");
      setMentionTarget(null);
    }
  };

  const mentionSuggestions = mentionQuery !== null && mentionTarget
    ? projectMembers.filter(m =>
        m.uid !== user?.uid &&
        (m.username?.toLowerCase().startsWith(mentionQuery.toLowerCase()) ||
         m.displayName?.toLowerCase().startsWith(mentionQuery.toLowerCase()))
      )
    : [];

  const insertMention = (member: UserProfile, currentText: string, setValue: (v: string) => void, ref: React.RefObject<HTMLTextAreaElement | null>) => {
    const cursor = ref.current?.selectionStart ?? currentText.length;
    const textBefore = currentText.slice(0, cursor);
    const textAfter = currentText.slice(cursor);
    const replaced = textBefore.replace(/@(\w*)$/, `@${member.username} `);
    setValue(replaced + textAfter);
    setMentionQuery("");
    setMentionTarget(null);
    setTimeout(() => ref.current?.focus(), 0);
  };

  const addComment = () => {
    if (!newComment.trim() || !user) return;
    const comm: Comment = {
      id: crypto.randomUUID(),
      author: user.displayName || user.email || "Anonymous",
      authorId: user.uid,
      text: newComment.trim(),
      createdAt: new Date().toISOString(),
      replies: []
    };
    setComments([comm, ...comments]);

    // Notify assignee (if not self)
    if (assignedTo && assignedTo !== user.uid && initialData?.id) {
      sendNotification({
        type: 'task_comment',
        toUid: assignedTo,
        taskId: initialData.id,
        taskTitle: title.trim(),
        projectId,
        projectName: projects[projectId]?.title,
        commentId: comm.id,
        commentText: comm.text.slice(0, 100),
      } as any);
    }

    // Notify @mentioned users
    getMentionedUsers(comm.text).forEach(m => {
      if (m.uid !== user.uid && initialData?.id) {
        sendNotification({
          type: 'mention',
          toUid: m.uid,
          taskId: initialData.id,
          taskTitle: title.trim(),
          projectId,
          projectName: projects[projectId]?.title,
          commentId: comm.id,
          commentText: comm.text.slice(0, 100),
        } as any);
      }
    });

    setNewComment("");
  };

  const addReply = (commentId: string) => {
    if (!replyText.trim() || !user) return;
    const reply: CommentReply = {
      id: crypto.randomUUID(),
      author: user.displayName || user.email || "Anonymous",
      authorId: user.uid,
      text: replyText.trim(),
      createdAt: new Date().toISOString()
    };
    const parentComment = comments.find(c => c.id === commentId);
    setComments(comments.map(c =>
      c.id === commentId
        ? { ...c, replies: [...(c.replies || []), reply] }
        : c
    ));

    // Notify original comment author
    if (parentComment && parentComment.authorId !== user.uid && initialData?.id) {
      sendNotification({
        type: 'comment_reply',
        toUid: parentComment.authorId,
        taskId: initialData.id,
        taskTitle: title.trim(),
        projectId,
        projectName: projects[projectId]?.title,
        commentId,
        commentText: reply.text.slice(0, 100),
      } as any);
    }

    // Notify @mentioned users in reply
    getMentionedUsers(reply.text).forEach(m => {
      if (m.uid !== user.uid && initialData?.id) {
        sendNotification({
          type: 'mention',
          toUid: m.uid,
          taskId: initialData.id,
          taskTitle: title.trim(),
          projectId,
          projectName: projects[projectId]?.title,
          commentId,
          commentText: reply.text.slice(0, 100),
        } as any);
      }
    });

    setReplyText("");
    setReplyingToId(null);
  };

  const generateAISubtasks = async () => {
    if (!title.trim()) return;
    setIsAIProcessing(true);
    try {
      const response = await fetch("/api/ai/subtasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      const data = await response.json();
      if (data.substeps && Array.isArray(data.substeps)) {
        const existingTitles = new Set(subtasks.map(s => s.title.toLowerCase().trim()));
        const uniqueNewSubs = data.substeps
          .filter((text: string) => !existingTitles.has(text.toLowerCase().trim()))
          .map((text: string) => ({
            id: crypto.randomUUID(),
            title: text,
            completed: false
          }));
          
        if (uniqueNewSubs.length > 0) {
          setSubtasks([...subtasks, ...uniqueNewSubs]);
          toast.success("AI generated new subtasks!");
        } else {
          toast.info("AI generated identical subtasks. No duplicates added.");
        }
      }
    } catch (error) {
      console.error("AI Generation failed", error);
    } finally {
      setIsAIProcessing(false);
    }
  };

  const generateAIDescription = async () => {
    if (!title.trim()) {
      toast.warning("Please enter a title first to generate a description.");
      return;
    }
    setIsAIDescriptionProcessing(true);
    try {
      const response = await fetch("/api/ai/description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      const data = await response.json();
      if (data.description) {
        setDescription(data.description);
        toast.success(description ? "Description refined via AI!" : "Description generated via AI!");
      }
    } catch (error) {
      console.error("AI Description Generation failed", error);
      toast.error("Failed to process description via AI.");
    } finally {
      setIsAIDescriptionProcessing(false);
    }
  };

  const refineAITitle = async () => {
    if (!title.trim()) return;
    setIsAITitleProcessing(true);
    try {
      const response = await fetch("/api/ai/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await response.json();
      if (data.title) {
        setTitle(data.title);
        toast.success("Title refined via AI!");
      }
    } catch (error) {
      console.error("AI Title Refinement failed", error);
      toast.error("Failed to refine title via AI.");
    } finally {
      setIsAITitleProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="max-w-5xl max-h-[90vh] overflow-hidden p-0 border-none bg-white dark:bg-slate-950 rounded-3xl shadow-2xl no-scrollbar flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Target className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                {initialData?.id ? `TASK-${initialData.id.substring(0, 8).toUpperCase()}` : "NEW TASK"}
              </span>
              <ChevronRight className="h-3 w-3 text-slate-300" />
              <div className="flex flex-col">
                <DialogTitle className="text-sm font-bold text-slate-900 dark:text-white">Issue Details</DialogTitle>
                <DialogDescription className="sr-only">
                  View and manage the details, subtasks, and comments for this task.
                </DialogDescription>
              </div>
            </div>

          </div>
          <div className="flex items-center gap-2">
            {isSaving && (
              <span className="text-[10px] font-bold text-emerald-500 animate-pulse bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 uppercase tracking-tighter">
                Saving changes...
              </span>
            )}
            {!isEditMode ? (
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2"
              >
                Create Task
              </button>
            ) : null}
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="flex flex-col md:flex-row min-h-full">
            {/* Main Content Column */}
            <div className="flex-1 p-8 space-y-8 border-r border-slate-100 dark:border-slate-800">
              {/* Title Section */}
              <div className="relative">
                <textarea
                  ref={(el) => {
                    if (el) {
                      el.style.height = 'auto';
                      el.style.height = el.scrollHeight + 'px';
                    }
                  }}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Task title..."
                  rows={1}
                  className="w-full pr-28 text-3xl font-bold bg-transparent border-none p-0 focus:ring-0 placeholder:text-slate-200 dark:placeholder:text-slate-800 text-slate-900 dark:text-white resize-none leading-tight overflow-hidden"
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = target.scrollHeight + 'px';
                  }}
                />
                {title.trim() && (
                  <button
                    onClick={refineAITitle}
                    disabled={isAITitleProcessing}
                    className={`absolute top-0 right-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-tighter transition-all shadow-sm ${
                      isAITitleProcessing 
                      ? 'bg-primary/20 text-primary animate-pulse cursor-wait' 
                      : 'bg-primary/10 text-primary hover:bg-primary hover:text-white cursor-pointer active:scale-95'
                    } disabled:opacity-50 disabled:pointer-events-none`}
                  >
                    <Zap className={`h-2.5 w-2.5 ${isAITitleProcessing ? 'animate-bounce' : ''}`} />
                    {isAITitleProcessing ? 'Refining...' : 'AI Refine'}
                  </button>
                )}
              </div>

              {/* Description Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-500">
                    <AlignLeft className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Description</span>
                  </div>
                  <button
                    onClick={generateAIDescription}
                    disabled={isAIDescriptionProcessing || !title.trim()}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tighter transition-all shadow-sm ${
                      isAIDescriptionProcessing 
                      ? 'bg-primary/20 text-primary animate-pulse cursor-wait' 
                      : 'bg-primary/10 text-primary hover:bg-primary hover:text-white cursor-pointer active:scale-95'
                    } disabled:opacity-50 disabled:pointer-events-none`}
                  >
                    <Zap className={`h-2.5 w-2.5 ${isAIDescriptionProcessing ? 'animate-bounce' : ''}`} />
                    {isAIDescriptionProcessing ? 'Thinking...' : description.trim() ? 'AI Refine' : 'AI Generate'}
                  </button>
                </div>
                <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 focus-within:border-primary/30 transition-colors">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a detailed description..."
                    className="w-full bg-transparent border-none focus:ring-0 text-sm text-slate-600 dark:text-slate-400 placeholder:text-slate-300 dark:placeholder:text-slate-700 min-h-[120px] py-3 px-4 leading-relaxed resize-y"
                  />
                </div>
              </div>

              {/* Subtasks Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-500">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Subtasks</span>
                    <button
                      onClick={generateAISubtasks}
                      disabled={isAIProcessing || !title.trim()}
                      className={`ml-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tighter transition-all shadow-sm ${
                        isAIProcessing 
                        ? 'bg-primary/20 text-primary animate-pulse cursor-wait' 
                        : 'bg-primary/10 text-primary hover:bg-primary hover:text-white cursor-pointer active:scale-95'
                      } disabled:opacity-50 disabled:pointer-events-none`}
                    >
                      <Zap className={`h-2.5 w-2.5 ${isAIProcessing ? 'animate-bounce' : ''}`} />
                      {isAIProcessing ? 'Thinking...' : 'AI Break down'}
                    </button>
                  </div>
                  <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">
                    {subtasks.filter(s => s.completed).length} of {subtasks.length}
                  </span>

                </div>

                {/* Progress Bar */}
                {subtasks.length > 0 && (
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${(subtasks.filter(s => s.completed).length / subtasks.length) * 100}%` }}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  {subtasks.map((st) => (
                    <div key={st.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 group transition-colors">
                      <button
                        onClick={() => toggleSubtask(st.id)}
                        className={`transition-colors ${st.completed ? 'text-emerald-500' : 'text-slate-300 hover:text-slate-400'}`}
                      >
                        {st.completed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                      </button>
                      <input
                        type="text"
                        value={st.title}
                        onChange={(e) => editSubtask(st.id, e.target.value)}
                        className={`flex-1 bg-transparent border-none text-sm font-medium focus:ring-0 p-0 ${st.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}
                      />
                      <button
                        onClick={() => removeSubtask(st.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-all p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  <div className="flex items-center gap-3 px-2 py-1">
                    <Plus className="h-4 w-4 text-slate-300" />
                    <input
                      type="text"
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
                      placeholder="Add a subtask..."
                      className="flex-1 bg-transparent border-none text-sm font-medium focus:ring-0 p-0 placeholder:text-slate-400"
                    />
                    {newSubtask && (
                      <button
                        onClick={addSubtask}
                        className="text-xs font-bold text-primary hover:underline"
                      >
                        Add
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Comments Section */}
              <div className="space-y-6 pt-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Activity</span>
                </div>

                <div className="flex gap-4">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-3">
                    {/* Textarea with @mention anchored above */}
                    <div className="relative">
                      <textarea
                        ref={commentRef}
                        value={newComment}
                        onChange={(e) => handleTextareaInput(e, setNewComment, 'comment')}
                        placeholder="Write a comment... Use @username to mention someone"
                        className="w-full rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 shadow-sm transition-all focus:border-primary/30"
                        rows={2}
                      />
                      {/* @mention suggestion list - appears ABOVE textarea */}
                      {mentionTarget === 'comment' && mentionSuggestions.length > 0 && (
                        <div className="absolute z-50 left-0 bottom-full mb-2 w-56 bg-card border border-border rounded-xl shadow-elevated overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                          {mentionSuggestions.map(m => (
                            <button
                              key={m.uid}
                              onMouseDown={(e) => { e.preventDefault(); insertMention(m, newComment, setNewComment, commentRef); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-secondary transition-colors text-left"
                            >
                              <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                {m.displayName?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-foreground leading-none">{m.displayName}</p>
                                <p className="text-[9px] text-muted-foreground mt-0.5">@{m.username}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={addComment}
                        disabled={!newComment.trim()}
                        className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-xs font-bold disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                      >
                        Comment
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 group">
                      {/* Avatar */}
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0 ring-1 ring-primary/20">
                        {comment.author.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Author + timestamp */}
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{comment.author}</span>
                          <span className="text-[10px] font-medium text-slate-400">
                            {new Date(comment.createdAt).toLocaleDateString()} at {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Comment body */}
                        <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          {comment.text}
                        </div>

                        {/* Reply button */}
                        <button
                          onClick={() => {
                            setReplyingToId(replyingToId === comment.id ? null : comment.id);
                            setReplyText("");
                          }}
                          className="mt-1.5 flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-primary transition-colors"
                        >
                          <CornerDownRight className="h-3 w-3" />
                          {replyingToId === comment.id ? "Cancel" : `Reply${
                            comment.replies && comment.replies.length > 0 ? ` · ${comment.replies.length}` : ""
                          }`}
                        </button>

                        {/* Inline reply input */}
                        {replyingToId === comment.id && (
                          <div className="mt-3 flex gap-2.5 animate-in fade-in slide-in-from-top-1">
                            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
                              {user?.displayName?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <div className="flex-1">
                              {/* Reply textarea with @mention anchored above */}
                              <div className="relative">
                                <textarea
                                  ref={replyRef}
                                  autoFocus
                                  value={replyText}
                                  onChange={(e) => handleTextareaInput(e, setReplyText, 'reply')}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                      e.preventDefault();
                                      addReply(comment.id);
                                    }
                                  }}
                                  placeholder={`Reply to ${comment.author}... Use @username to mention`}
                                  rows={2}
                                  className="w-full rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary/20 shadow-sm transition-all focus:border-primary/30 resize-none"
                                />
                                {/* Reply @mention suggestions - appears ABOVE textarea */}
                                {mentionTarget === 'reply' && mentionSuggestions.length > 0 && (
                                  <div className="absolute z-50 left-0 bottom-full mb-2 w-52 bg-card border border-border rounded-xl shadow-elevated overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                                    {mentionSuggestions.map(m => (
                                      <button
                                        key={m.uid}
                                        onMouseDown={(e) => { e.preventDefault(); insertMention(m, replyText, setReplyText, replyRef); }}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-secondary transition-colors text-left"
                                      >
                                        <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                                          {m.displayName?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                          <p className="text-xs font-bold text-foreground leading-none">{m.displayName}</p>
                                          <p className="text-[9px] text-muted-foreground mt-0.5">@{m.username}</p>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex justify-end mt-1.5">
                                <button
                                  onClick={() => addReply(comment.id)}
                                  disabled={!replyText.trim()}
                                  className="px-3 py-1.5 bg-primary text-white rounded-lg text-[10px] font-bold disabled:opacity-40 transition-all hover:opacity-90 active:scale-95 flex items-center gap-1.5"
                                >
                                  <Reply className="h-3 w-3" />
                                  Reply
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Nested replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="mt-3 space-y-3 pl-4 border-l-2 border-slate-100 dark:border-slate-800">
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="flex gap-2.5">
                                <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-600 dark:text-slate-300 flex-shrink-0">
                                  {reply.author.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-baseline gap-1.5 mb-0.5">
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{reply.author}</span>
                                    <span className="text-[9px] text-slate-400">
                                      {new Date(reply.createdAt).toLocaleDateString()} at {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50/80 dark:bg-slate-900/30 px-3 py-2 rounded-lg border border-slate-100/80 dark:border-slate-800/80">
                                    {reply.text}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {comments.length === 0 && (
                    <div className="py-8 text-center border-2 border-dashed border-slate-50 dark:border-slate-900 rounded-2xl">
                      <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">No activity logs</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar Column */}
            <div className="w-full md:w-80 bg-slate-50/50 dark:bg-slate-900/30 p-8 space-y-8">
              {/* Status Section */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className={`w-full flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold outline-none transition-colors appearance-none ${
                    status === 'done' ? 'text-emerald-600 dark:text-emerald-400 border-emerald-100 bg-emerald-50/50' :
                    status === 'in-progress' ? 'text-blue-600 dark:text-blue-400 border-blue-100 bg-blue-50/50' :
                    'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* Metadata Fields Grid */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  {/* Project Field */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Target className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Project</span>
                    </div>
                    <select
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      disabled={isEditMode}
                      className={`w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-primary/20 outline-none appearance-none ${isEditMode ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`}
                    >

                      <option value="" disabled>Select Project</option>
                      {projectList.map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>

                  {/* Board Field */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-400">
                      <LayoutGrid className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Board</span>
                    </div>
                    <select
                      value={boardId}
                      onChange={(e) => setBoardId(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                    >
                      <option value="">No Board (General)</option>
                      {Object.values(boards)
                        .filter(b => b.projectId === projectId)
                        .map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sprint Field */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Layers className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Sprint</span>
                    </div>
                    <select
                      value={sprintId}
                      onChange={(e) => setSprintId(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                    >
                      <option value="">Backlog (No Sprint)</option>
                      {sprints
                        .filter(s => s.projectId === projectId)
                        .map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.status})</option>
                      ))}
                    </select>
                  </div>

                  {/* Assignee */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-400">
                      <User className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Assignee</span>
                    </div>
                    <select
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                    >
                      <option value="">Unassigned</option>
                      {projectMembers.map(m => (
                        <option key={m.uid} value={m.uid}>{m.displayName || m.username}</option>
                      ))}
                    </select>
                  </div>

                  {/* Priority */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-400">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Priority</span>
                    </div>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none transition-colors ${priority === 'high' ? 'bg-rose-50/50 border-rose-100 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900' :
                        priority === 'medium' ? 'bg-amber-50/50 border-amber-100 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900' :
                          'bg-slate-50/50 border-slate-100 text-slate-500 dark:bg-slate-900/50 dark:border-slate-800'
                        }`}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  {/* Story Points */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Zap className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Story Points</span>
                    </div>
                    <input
                      type="number"
                      value={storyPoints}
                      onChange={(e) => setStoryPoints(e.target.value)}
                      placeholder="None"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>

                  {/* Due Date */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Due Date</span>
                    </div>
                    <input
                      type="date"
                      value={dueDate}
                      min={new Date().toISOString().split('T')[0]}
                      max="2099-12-31"
                      onChange={(e) => setDueDate(e.target.value)}
                      onBlur={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        
                        const selectedDate = new Date(val);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        
                        if (selectedDate < today) {
                           toast.warning("Past dates are not allowed. Restoring previous date.");
                           setDueDate(lastValidDueDate.current);
                           return;
                        }
                        if (selectedDate.getFullYear() > 2100) {
                           toast.warning("Date too far in future. Restoring previous date.");
                           setDueDate(lastValidDueDate.current);
                           return;
                        }

                        // If valid, update the "last valid" reference
                        lastValidDueDate.current = val;
                      }}

                      className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
                    />

                  </div>

                </div>
              </div>

              {/* Sidebar Footer */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                  <span>Created</span>
                  <span>{initialData?.createdAt ? new Date(initialData.createdAt).toLocaleDateString() : 'Today'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Target(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}
