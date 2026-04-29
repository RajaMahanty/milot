"use client";

import React, { useMemo, useState } from "react";
import {
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
          "Each project can have multiple boards (tabs at the top). Use them to organize work into categories such as Frontend and Backend. Drag a card onto a different board tab to transfer it.",
      },
      {
        heading: "Inline editing",
        content:
          "Double-click a task title on the board to edit it directly. Press Enter to save and Escape to cancel. Single-click opens the full task modal for details.",
      },
      {
        heading: "Filters",
        content:
          "Filter cards by priority, assignee, or project using the filter bar. Switch between Board and List view from the View dropdown for the layout you need.",
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
          "Projects are workspaces with their own boards, tasks, sprints, and team members. Switch between them using the project selector in the top navigation bar.",
      },
      {
        heading: "Sharing",
        content:
          "Open a project and click the share icon to invite members by email. Shared members see the same boards, tasks, and updates as the owner.",
      },
      {
        heading: "Deletion",
        content:
          "Deleting a project also removes its tasks, boards, and sprints. This action is permanent, so confirm carefully before proceeding.",
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
          "My Tasks shows every task assigned to you across all projects, grouped by status. Use it as your personal action list to answer 'what should I work on next?'.",
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
          "The Backlog displays all tasks in the current project as a compact list. It's ideal for bulk planning, prioritizing, and assigning story points before sprint planning.",
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
          "Sprints are time-boxed work cycles, typically one or two weeks. Create a sprint with a name, goal, and date range, then assign tasks to it from the task modal.",
      },
      {
        heading: "Tracking",
        content:
          "Each sprint shows progress based on completed versus remaining tasks. Close the sprint at the end of the cycle to review results and plan next work.",
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
          "Create teams and invite members by email. Team membership ensures the right people have access to the right projects and updates.",
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
          "The task modal surfaces title, description, subtasks, comments, priority, assignee, due date, sprint, story points, and project/board assignment in one view.",
      },
      {
        heading: "AI Refine Title",
        content:
          "Click AI Refine to rewrite titles into concise, professional, actionable statements. This helps make work items easier to understand at a glance.",
      },
      {
        heading: "AI Generate Description",
        content:
          "Use AI Generate or AI Refine on the task description to create clear guidance based on the title and existing details.",
      },
      {
        heading: "AI Break Down Subtasks",
        content:
          "Click AI Break Down to generate a set of actionable subtasks from your task title and description automatically.",
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
          "Add comments in the Activity section for any task. Reply to comments to create threads and keep discussions organized.",
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
          "Type @ in comments or replies to mention a team member. Mentions send notifications and link directly to the task for fast follow-up.",
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
          "The bell icon shows notifications for invites, assignments, comments, replies, and mentions. Unread items are highlighted for fast triage.",
      },
      {
        heading: "Navigation",
        content:
          "Click a task-related notification to open the correct board and task modal automatically.",
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
          "Drag a task card between status columns to update its workflow stage instantly.",
      },
      {
        heading: "Between boards",
        content:
          "Hover over a board tab while dragging a card to move it to a different board. The target board highlights as a valid drop zone.",
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
          "Edit your display name and username, review recent activity, and build your network with the Search section.",
      },
    ],
  },
];

export default function LearnPage() {
  const [activeModule, setActiveModule] = useState<string>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");

  const currentModule = useMemo(
    () => modules.find((m) => m.id === activeModule) || modules[0],
    [activeModule],
  );

  const filteredModules = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return modules;
    return modules.filter((module) =>
      module.title.toLowerCase().includes(query),
    );
  }, [searchQuery]);

  const currentIndex = modules.findIndex((m) => m.id === currentModule.id);
  const prevModule = currentIndex > 0 ? modules[currentIndex - 1] : null;
  const nextModule =
    currentIndex < modules.length - 1 ? modules[currentIndex + 1] : null;

  return (
    <div className="flex min-h-full flex-col gap-6 lg:flex-row">
      <aside className="w-full shrink-0 lg:w-80 xl:w-72">
        <div className="sticky top-6 space-y-6 rounded-3xl border border-border bg-card/90 p-6 shadow-card">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Learn Center
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Task Matrix Guide
            </h1>
            <p className="text-sm leading-7 text-muted-foreground">
              A practical reference for building clarity, staying aligned, and
              using every workspace feature with confidence.
            </p>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search modules"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-border bg-muted/70 py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <nav className="grid gap-2">
            {filteredModules.map((module) => (
              <button
                key={module.id}
                type="button"
                onClick={() => setActiveModule(module.id)}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition duration-200 ${
                  activeModule === module.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
                aria-current={activeModule === module.id ? "page" : undefined}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  {module.icon}
                </span>
                <span className="truncate">{module.title}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 pb-10 pt-4 lg:px-10 lg:pb-14">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-col gap-4 border-b border-border bg-muted/50 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary">
                    {currentModule.icon}
                  </span>
                  {currentModule.title}
                </div>
                <CardTitle className="text-3xl font-semibold text-foreground">
                  {currentModule.title}
                </CardTitle>
                <CardDescription className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  Use this guide to understand the main workflows for Task
                  Matrix features. Each section is written for fast scanning and
                  practical use.
                </CardDescription>
              </div>
              <div className="rounded-3xl bg-secondary px-4 py-3 text-sm font-medium text-foreground">
                Guided learning for every feature
              </div>
            </CardHeader>

            <CardContent className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-10">
                {currentModule.sections.map((section) => (
                  <section key={section.heading}>
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      {section.heading}
                    </h2>
                    <p className="text-base leading-8 text-foreground/95">
                      {section.content}
                    </p>
                  </section>
                ))}
              </div>

              <aside className="space-y-5 rounded-3xl border border-border bg-card/95 p-5 shadow-sm">
                <div className="rounded-3xl bg-primary/5 p-4 text-sm leading-7 text-foreground">
                  <p className="font-semibold text-primary">
                    How to use this section
                  </p>
                  <p className="mt-2 text-muted-foreground">
                    Read the feature overview first, then use the navigation
                    links to move through related topics quickly.
                  </p>
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    Best practices
                  </p>
                  <ul className="space-y-3 text-sm leading-7 text-foreground/90">
                    <li>Keep task titles concise and outcome-focused.</li>
                    <li>Use boards for workflow and backlog for planning.</li>
                    <li>
                      Invite team members to share visibility and reduce
                      handoffs.
                    </li>
                  </ul>
                </div>
                <div className="rounded-3xl border border-border bg-secondary/75 p-4 text-sm text-muted-foreground">
                  Tip: Search by feature name to jump directly to the workflow
                  you want to master.
                </div>
              </aside>
            </CardContent>
          </Card>

          <div className="mt-8 flex flex-col gap-3 rounded-3xl border border-border bg-card/90 p-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            {prevModule ? (
              <button
                type="button"
                onClick={() => setActiveModule(prevModule.id)}
                className="text-sm font-medium text-primary hover:underline"
              >
                ← {prevModule.title}
              </button>
            ) : (
              <div />
            )}
            {nextModule ? (
              <button
                type="button"
                onClick={() => setActiveModule(nextModule.id)}
                className="text-sm font-medium text-primary hover:underline"
              >
                {nextModule.title} →
              </button>
            ) : (
              <div />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
