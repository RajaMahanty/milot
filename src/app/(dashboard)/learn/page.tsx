"use client";

import React, { useState } from "react";
import {
  BookOpen,
  Columns,
  FolderKanban,
  CheckSquare,
  Database,
  Zap,
  Users,
  User,
  Bell,
  MessageSquare,
  AtSign,
  LayoutDashboard,
  GripVertical,
  Sparkles,
  Search,
} from "lucide-react";

interface Module {
  id: string;
  icon: React.ReactNode;
  title: string;
  sections: {
    heading: string;
    content: string;
  }[];
}

const modules: Module[] = [
  {
    id: "dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
    title: "Dashboard",
    sections: [
      {
        heading: "Overview",
        content:
          "The Dashboard is your landing page after login. It shows task counts by status, recent activity, and sprint progress across all your workspaces. Use it to quickly assess what needs attention without navigating to each project individually.",
      },
    ],
  },
  {
    id: "board",
    icon: <Columns className="h-4 w-4" />,
    title: "Kanban Board",
    sections: [
      {
        heading: "Overview",
        content:
          "A visual board with columns for TODO, IN PROGRESS, and DONE. Each task is a card. Drag cards between columns to change their status. The update is saved instantly.",
      },
      {
        heading: "Multiple boards",
        content:
          "Each project can have multiple boards (tabs at the top). Use them to organize work into categories — for example, \"Frontend\" and \"Backend\" boards. Drag a card onto a different board tab to transfer it.",
      },
      {
        heading: "Inline editing",
        content:
          "Double-click any card title on the board to edit it directly. Press Enter to save, Escape to cancel. Single-click opens the full task modal.",
      },
      {
        heading: "Filters",
        content:
          "Filter cards by priority, assignee, or shared workspaces using the filter bar. Switch between Board and List view from the View dropdown.",
      },
    ],
  },
  {
    id: "projects",
    icon: <FolderKanban className="h-4 w-4" />,
    title: "Projects",
    sections: [
      {
        heading: "Overview",
        content:
          "Projects are workspaces. Each one has its own boards, tasks, sprints, and team members. Switch between them using the dropdown in the top navigation bar. Select \"All Workspaces\" to see everything at once.",
      },
      {
        heading: "Sharing",
        content:
          "Open a project and click the share icon to invite members by email. They receive a notification and can accept to gain access. Shared members see the same boards and tasks as the owner.",
      },
      {
        heading: "Deletion",
        content:
          "Deleting a project also removes all its tasks, boards, and sprints. This is permanent and cannot be undone.",
      },
    ],
  },
  {
    id: "my-tasks",
    icon: <CheckSquare className="h-4 w-4" />,
    title: "My Tasks",
    sections: [
      {
        heading: "Overview",
        content:
          "Shows every task assigned to you across all projects, grouped by status. Think of it as your personal inbox — a single view to answer \"what should I work on next?\" without switching between workspaces.",
      },
    ],
  },
  {
    id: "backlog",
    icon: <Database className="h-4 w-4" />,
    title: "Backlog",
    sections: [
      {
        heading: "Overview",
        content:
          "A flat table of all tasks in the current project. Unlike the board view, it shows everything in a compact list format — useful for bulk planning, reviewing priorities, and assigning story points before a sprint.",
      },
    ],
  },
  {
    id: "sprint",
    icon: <Zap className="h-4 w-4" />,
    title: "Sprints",
    sections: [
      {
        heading: "Overview",
        content:
          "Sprints are time-boxed work cycles (typically 1-2 weeks). Create a sprint with a name, goal, and date range. Then assign tasks to it from the task modal's Sprint dropdown.",
      },
      {
        heading: "Tracking",
        content:
          "Each sprint shows a progress bar based on how many tasks are completed vs. remaining. Complete a sprint when the cycle ends — tasks don't need to all be done.",
      },
    ],
  },
  {
    id: "team",
    icon: <Users className="h-4 w-4" />,
    title: "Team",
    sections: [
      {
        heading: "Overview",
        content:
          "Create teams and invite members by email. Team members receive notifications to accept the invite. Link teams to projects so the right people have access to the right workspaces.",
      },
    ],
  },
  {
    id: "task-modal",
    icon: <Sparkles className="h-4 w-4" />,
    title: "Task Details & AI",
    sections: [
      {
        heading: "Overview",
        content:
          "Click any task card to open the full detail modal. It contains the title, description, subtasks, comments, priority, assignee, due date, sprint, story points, and project/board assignment.",
      },
      {
        heading: "AI Refine Title",
        content:
          "When a title is present, click the AI Refine button in the top-right corner of the title field. The AI rewrites it to be concise, professional, and actionable.",
      },
      {
        heading: "AI Generate Description",
        content:
          "Next to the Description label, click AI Generate (or AI Refine if a description already exists). The AI writes or improves the description based on the task title.",
      },
      {
        heading: "AI Break Down Subtasks",
        content:
          "In the Subtasks section, click AI Break Down. The AI analyzes the title and description and generates a set of actionable subtasks automatically.",
      },
    ],
  },
  {
    id: "comments",
    icon: <MessageSquare className="h-4 w-4" />,
    title: "Comments & Replies",
    sections: [
      {
        heading: "Overview",
        content:
          "Add comments in the Activity section of any task. Reply to existing comments to create threads. The task owner and any mentioned users are notified automatically.",
      },
    ],
  },
  {
    id: "mentions",
    icon: <AtSign className="h-4 w-4" />,
    title: "@Mentions",
    sections: [
      {
        heading: "Overview",
        content:
          "Type @ in any comment or reply to trigger an autocomplete dropdown showing project members. Select a name to mention them. The mentioned user receives a notification with a link directly to the task.",
      },
    ],
  },
  {
    id: "notifications",
    icon: <Bell className="h-4 w-4" />,
    title: "Notifications",
    sections: [
      {
        heading: "Overview",
        content:
          "The bell icon in the top bar shows notifications for project invites, team invites, task assignments, comments, replies, and mentions. Unread notifications are highlighted.",
      },
      {
        heading: "Navigation",
        content:
          "Click any task-related notification to navigate directly to the board and auto-open the task modal. The correct project is selected automatically.",
      },
    ],
  },
  {
    id: "dnd",
    icon: <GripVertical className="h-4 w-4" />,
    title: "Drag & Drop",
    sections: [
      {
        heading: "Between columns",
        content:
          "Drag a task card from one status column to another (e.g., TODO to IN PROGRESS). The status updates instantly.",
      },
      {
        heading: "Between boards",
        content:
          "While dragging a card, hover over a different board tab at the top. The tab highlights to indicate it's a valid drop target. Release to move the card to that board.",
      },
    ],
  },
  {
    id: "profile",
    icon: <User className="h-4 w-4" />,
    title: "Profile",
    sections: [
      {
        heading: "Overview",
        content:
          "View and edit your display name and username. The Activity tab shows your recent task changes across all projects and statuses. Use the Network section to search for and follow other users.",
      },
    ],
  },
];

export default function LearnPage() {
  const [activeModule, setActiveModule] = useState<string>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");

  const currentModule = modules.find((m) => m.id === activeModule) || modules[0];

  const filteredModules = searchQuery.trim()
    ? modules.filter((m) =>
        m.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : modules;

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Left nav */}
      <div className="w-full lg:w-56 shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-card/30 overflow-y-auto no-scrollbar">
        <div className="px-4 pt-5 pb-3">
          <h2 className="text-base font-bold text-foreground mb-3">Documentation</h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-border bg-card text-xs focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <nav className="px-2 pb-4 space-y-px">
          {filteredModules.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveModule(m.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-colors ${
                activeModule === m.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <span className="opacity-60">{m.icon}</span>
              {m.title}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="max-w-xl mx-auto px-6 py-8 lg:px-10 lg:py-12">
          <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">
            {currentModule.title}
          </h1>
          <div className="h-px bg-border mb-6" />

          <div className="space-y-6">
            {currentModule.sections.map((section, i) => (
              <div key={i}>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  {section.heading}
                </h3>
                <p className="text-sm text-foreground/80 leading-[1.8]">
                  {section.content}
                </p>
              </div>
            ))}
          </div>

          {/* Navigation hint */}
          <div className="mt-10 pt-6 border-t border-border flex items-center justify-between">
            {(() => {
              const idx = modules.findIndex((m) => m.id === activeModule);
              const prev = idx > 0 ? modules[idx - 1] : null;
              const next = idx < modules.length - 1 ? modules[idx + 1] : null;
              return (
                <>
                  {prev ? (
                    <button
                      onClick={() => setActiveModule(prev.id)}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      ← {prev.title}
                    </button>
                  ) : <span />}
                  {next ? (
                    <button
                      onClick={() => setActiveModule(next.id)}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {next.title} →
                    </button>
                  ) : <span />}
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
