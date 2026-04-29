"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  Columns,
  FolderKanban,
  Database,
  Zap,
  Users,
  User
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Columns, label: "Board", href: "/board" },
  { icon: CheckSquare, label: "My Tasks", href: "/my-tasks" },
  { icon: FolderKanban, label: "Projects", href: "/projects" },
  { icon: Database, label: "Backlog", href: "/backlog" },
  { icon: Zap, label: "Sprint", href: "/sprint" },
  { icon: Users, label: "Team", href: "/team" },
  { icon: User, label: "Profile", href: "/profile" },
];


export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed left-0 top-0 z-50 h-screen w-64 border-r border-border bg-card flex flex-col transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex h-16 items-center justify-between px-6">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
            <div className="h-10 w-10 flex items-center justify-center">
              <img src="/logo.png" alt="TaskMatrix Logo" className="h-8 w-8 object-contain" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">TaskMatrix</span>
          </Link>

          <button
            onClick={onClose}
            className="lg:hidden h-8 w-8 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <Zap className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
