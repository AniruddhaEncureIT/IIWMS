"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FolderOpen,
  Calculator,
  FileText,
  Gavel,
  FileCheck,
  ClipboardList,
  Users,
  Percent,
  Settings,
  FileEdit,
  Database,
  type LucideIcon,
} from "lucide-react";
import { getNavItems } from "./shell-nav";

// ─── Icon registry ─────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, FolderOpen, Calculator, FileText,
  Gavel, FileCheck, ClipboardList, Users, Percent,
  Settings, FileEdit, Database,
};

interface AppSidebarProps {
  role: string;
  name: string;
  onClose?: () => void;
}

export function AppSidebar({ role, name, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const navItems = getNavItems(role);

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function isActive(href: string) {
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">

      {/* ── IIMS Wordmark ──────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <Link
          href="/dashboard"
          onClick={onClose}
          className="flex flex-col items-start gap-0.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
          aria-label="IIMS — Go to dashboard"
        >
          {/* Logotype */}
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-blue-700 dark:text-blue-400 leading-none select-none">
              IIMS
            </span>
            <span className="hidden sm:block w-1.5 h-1.5 rounded-full bg-blue-400 dark:bg-blue-500 mb-0.5 shrink-0" aria-hidden="true" />
          </div>
          {/* Tagline */}
          <p className="text-[9px] font-medium text-gray-400 dark:text-gray-500 leading-tight uppercase tracking-widest select-none">
            Integrated Infrastructure
          </p>
        </Link>


      </div>

      {/* ── Navigation ────────────────────────────────────────────────── */}
      <nav
        className="flex-1 px-2 py-2 overflow-y-auto"
        aria-label="Primary navigation"
      >
        <p className="px-3 pt-1 pb-2 text-[9px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-[0.08em]" aria-hidden="true">
          Navigation
        </p>
        <ul className="space-y-0.5" role="list">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;
            return (
              <li key={item.href} role="listitem">
                <Link
                  href={item.href}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 relative",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1",
                    active
                      ? [
                          "bg-blue-50 dark:bg-blue-900/25",
                          "text-blue-700 dark:text-blue-300",
                          "font-semibold",
                          // Strong left accent bar
                          "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2",
                          "before:w-[3px] before:h-5 before:rounded-r-full before:bg-blue-600 dark:before:bg-blue-400",
                        ].join(" ")
                      : "text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-gray-100",
                  ].join(" ")}
                >
                  <span className={[
                    "flex items-center justify-center w-7 h-7 rounded-md transition-colors shrink-0",
                    active
                      ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                      : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600",
                  ].join(" ")} aria-hidden="true">
                    <Icon size={16} />
                  </span>
                  <span className="truncate leading-tight">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── User footer ───────────────────────────────────────────────── */}
      {mounted && (
        <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3 px-2.5 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/60">
            <div
              className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-[11px] font-bold shrink-0 select-none"
              aria-hidden="true"
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-900 dark:text-white truncate leading-tight">{name}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate leading-tight mt-0.5">{role}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
