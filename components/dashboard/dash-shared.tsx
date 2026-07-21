"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Calendar, TrendingUp, Activity, Bell, ChevronRight } from "lucide-react";
import { store } from "@/store/iims.store";
import { WORKFLOW_STAGES } from "@/constants/workflow-transitions";
import type { IProject, IProjectHistory } from "@/types/iims.types";

// ─── Currency helpers ─────────────────────────────────────────────────────────

export function formatINR(amount: number | undefined): string {
  if (amount == null) return "₹0";
  return "₹" + Number(amount).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function formatCr(amount: number | undefined): string {
  if (amount == null) return "₹0";
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(2)}Cr`;
  if (amount >= 100_000)    return `₹${(amount / 100_000).toFixed(2)}L`;
  return formatINR(amount);
}

export function totalBudget(projects: IProject[]): number {
  return projects.reduce((sum, p) => sum + (p.technicalSanctionAmount ?? p.estimatedAmount ?? 0), 0);
}

// ─── Status badge — UX4G semantic color tokens ────────────────────────────────

type Variant = "yellow" | "green" | "red" | "blue" | "teal" | "purple" | "gray";

const VARIANT_CLS: Record<Variant, string> = {
  yellow: "bg-amber-50  text-amber-700  border-amber-200  dark:bg-amber-900/20  dark:text-amber-400  dark:border-amber-800",
  green:  "bg-green-50  text-green-700  border-green-200  dark:bg-green-900/20  dark:text-green-400  dark:border-green-800",
  red:    "bg-red-50    text-red-700    border-red-200    dark:bg-red-900/20    dark:text-red-400    dark:border-red-800",
  blue:   "bg-blue-50   text-blue-700   border-blue-200   dark:bg-blue-900/20   dark:text-blue-400   dark:border-blue-800",
  teal:   "bg-teal-50   text-teal-700   border-teal-200   dark:bg-teal-900/20   dark:text-teal-400   dark:border-teal-800",
  purple: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800",
  gray:   "bg-gray-100  text-gray-600   border-gray-200   dark:bg-gray-700      dark:text-gray-300   dark:border-gray-600",
};

export function statusVariant(status: string): Variant {
  const s = status.toLowerCase();
  if (s.includes("returned") || s.includes("rejected"))                                  return "red";
  if (s.includes("draft"))                                                                return "gray";
  if (s.includes("pending") || s.includes("awaiting"))                                   return "yellow";
  if (s.includes("loa") || s.includes("letter of award"))                                return "teal";
  if (s.includes("work order") || s.includes("issued"))                                  return "teal";
  if (s.includes("tender") || s.includes("published") || s.includes("bids"))             return "blue";
  if (s.includes("progress") || s.includes("billing"))                                   return "purple";
  if (
    s.includes("sanctioned") || s.includes("approved") ||
    s.includes("payment")    || s.includes("processed") ||
    s.includes("cost approved") || s.includes("technically")
  ) return "green";
  return "gray";
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border leading-tight ${VARIANT_CLS[statusVariant(status)]}`}
    >
      {status}
    </span>
  );
}

// ─── Stat card — UX4G card radius (12px) ─────────────────────────────────────

type IconColor = "yellow" | "green" | "blue" | "purple" | "orange" | "teal" | "red";

const ICON_BG: Record<IconColor, string> = {
  yellow: "bg-amber-50  border-amber-100  text-amber-600  dark:bg-amber-900/20  dark:border-amber-900  dark:text-amber-400",
  green:  "bg-green-50  border-green-100  text-green-600  dark:bg-green-900/20  dark:border-green-900  dark:text-green-400",
  blue:   "bg-blue-50   border-blue-100   text-blue-600   dark:bg-blue-900/20   dark:border-blue-900   dark:text-blue-400",
  purple: "bg-purple-50 border-purple-100 text-purple-600 dark:bg-purple-900/20 dark:border-purple-900 dark:text-purple-400",
  orange: "bg-orange-50 border-orange-100 text-orange-600 dark:bg-orange-900/20 dark:border-orange-900 dark:text-orange-400",
  teal:   "bg-teal-50   border-teal-100   text-teal-600   dark:bg-teal-900/20   dark:border-teal-900   dark:text-teal-400",
  red:    "bg-red-50    border-red-100    text-red-600    dark:bg-red-900/20    dark:border-red-900    dark:text-red-400",
};

const VALUE_COLOR: Record<IconColor, string> = {
  yellow: "text-amber-700  dark:text-amber-300",
  green:  "text-green-700  dark:text-green-300",
  blue:   "text-blue-700   dark:text-blue-300",
  purple: "text-purple-700 dark:text-purple-300",
  orange: "text-orange-700 dark:text-orange-300",
  teal:   "text-teal-700   dark:text-teal-300",
  red:    "text-red-700    dark:text-red-300",
};

interface StatCardProps {
  icon: LucideIcon;
  color: IconColor;
  label: string;
  value: string | number;
  trend?: string;
}

export function StatCard({ icon: Icon, color, label, value, trend }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`flex-none w-10 h-10 rounded-lg border flex items-center justify-center ${ICON_BG[color]}`}
          aria-hidden="true"
        >
          <Icon className="w-4.5 h-4.5" size={18} />
        </div>
        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 leading-tight truncate">{label}</p>
          <p className={`text-2xl font-bold leading-tight mt-0.5 ${VALUE_COLOR[color]}`}>
            {value}
          </p>
          {trend && (
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate leading-tight">{trend}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Quick action button — UX4G button radius (8px) ──────────────────────────

type GradColor = "blue" | "green" | "purple" | "orange" | "teal" | "red";

const GRAD_CLS: Record<GradColor, string> = {
  blue:   "from-blue-600   to-blue-700   hover:from-blue-700   hover:to-blue-800",
  green:  "from-green-600  to-green-700  hover:from-green-700  hover:to-green-800",
  purple: "from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800",
  orange: "from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700",
  teal:   "from-teal-600   to-teal-700   hover:from-teal-700   hover:to-teal-800",
  red:    "from-red-600    to-red-700    hover:from-red-700    hover:to-red-800",
};

interface QuickActionProps {
  icon: LucideIcon;
  color: GradColor;
  title: string;
  description: string;
  href: string;
}

export function QuickAction({ icon: Icon, color, title, description, href }: QuickActionProps) {
  return (
    <Link
      href={href}
      className={`bg-gradient-to-br ${GRAD_CLS[color]} rounded-xl p-4 text-white flex items-center gap-3 transition-all shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500`}
    >
      <div
        className="w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center shrink-0"
        aria-hidden="true"
      >
        <Icon className="w-4.5 h-4.5" size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate leading-tight">{title}</p>
        <p className="text-xs text-white/75 truncate mt-0.5 leading-tight">{description}</p>
      </div>
    </Link>
  );
}

// ─── Recent project card ──────────────────────────────────────────────────────

export function ProjectCard({ project }: { project: IProject }) {
  const router = useRouter();
  const amount = project.technicalSanctionAmount ?? project.estimatedAmount;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/project/${project.id}`)}
      onKeyDown={(e) => e.key === "Enter" && router.push(`/project/${project.id}`)}
      className="group flex items-start justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <div className="min-w-0 flex-1">
        {/* Name + status row */}
        <div className="flex items-start gap-2 flex-wrap mb-1.5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors leading-tight truncate max-w-xs">
            {project.projectName}
          </h3>
          <StatusBadge status={project.status} />
        </div>
        {/* Project ID */}
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-2 font-mono">{project.id}</p>
        {/* Meta row */}
        <div className="flex items-center gap-4 text-[11px] text-gray-500 dark:text-gray-400 flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 shrink-0" aria-hidden="true" />
            {project.createdAt}
          </span>
          {amount != null && (
            <span className="flex items-center gap-1 text-blue-700 dark:text-blue-400 font-semibold">
              <TrendingUp className="w-3 h-3 shrink-0" aria-hidden="true" />
              {formatINR(amount)}
            </span>
          )}
          <span className="flex items-center gap-1 truncate max-w-[180px]">
            <Activity className="w-3 h-3 shrink-0" aria-hidden="true" />
            {project.currentStage}
          </span>
        </div>
      </div>
      <ArrowRight
        className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-blue-500 group-hover:translate-x-0.5 shrink-0 mt-0.5 ml-3 transition-all"
        aria-hidden="true"
      />
    </div>
  );
}

// ─── Activity timeline — UX4G semantic dot colors ────────────────────────────

const HISTORY_DOT: Record<string, string> = {
  forward: "bg-green-500 ring-2 ring-green-100 dark:ring-green-900/40",
  return:  "bg-red-500   ring-2 ring-red-100   dark:ring-red-900/40",
  create:  "bg-blue-500  ring-2 ring-blue-100  dark:ring-blue-900/40",
  default: "bg-gray-300  dark:bg-gray-600",
};

function historyDot(action: string): string {
  const a = action.toLowerCase();
  if (a.includes("forward") || a.includes("approved") || a.includes("sanctioned") || a.includes("issued")) return HISTORY_DOT.forward;
  if (a.includes("return") || a.includes("reject"))  return HISTORY_DOT.return;
  if (a.includes("creat") || a.includes("submit"))   return HISTORY_DOT.create;
  return HISTORY_DOT.default;
}

interface HistoryEntry extends IProjectHistory {
  projectName?: string;
}

export function ActivityTimeline({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) return (
    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">No recent activity</p>
  );

  return (
    <ol className="space-y-0" aria-label="Activity timeline">
      {entries.map((h, i) => (
        <li key={h.id ?? i} className="flex items-start gap-3 pb-4 relative">
          {/* Connector line */}
          {i < entries.length - 1 && (
            <div
              className="absolute left-[5px] top-4 bottom-0 w-px bg-gray-100 dark:bg-gray-700"
              aria-hidden="true"
            />
          )}
          {/* Dot */}
          <div
            className={`w-3 h-3 rounded-full mt-0.5 shrink-0 relative z-10 ${historyDot(h.action)}`}
            aria-hidden="true"
          />
          {/* Content */}
          <div className="min-w-0 flex-1 -mt-0.5">
            <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug">
              {h.action}
              {h.projectName && (
                <span className="font-normal text-gray-500 dark:text-gray-400"> — {h.projectName}</span>
              )}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 leading-tight">
              {h.performedBy} · {h.performedAt}
            </p>
            {h.remarks && (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 italic mt-0.5 truncate">&quot;{h.remarks}&quot;</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ─── Section card wrapper — UX4G card radius (12px) ──────────────────────────

export function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/80">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Pending actions dashboard panel ─────────────────────────────────────────

const OWNED_STATUSES_BY_ROLE: Map<string, Set<string>> = (() => {
  const map = new Map<string, Set<string>>();
  for (const stage of WORKFLOW_STAGES) {
    const role = stage.ownerRole as string;
    if (!map.has(role)) map.set(role, new Set());
    map.get(role)!.add(stage.status);
  }
  return map;
})();

const WORKFLOW_ROLES = new Set(OWNED_STATUSES_BY_ROLE.keys());

export function getPendingForRole(projects: IProject[], role: string): IProject[] {
  const owned = OWNED_STATUSES_BY_ROLE.get(role);
  if (!owned) return [];
  return projects.filter((p) => owned.has(p.status));
}

export function PendingActionsSection({ role }: { role: string }) {
  if (!WORKFLOW_ROLES.has(role)) return null;
  const pending = getPendingForRole(store.getAllProjects(), role).slice(0, 6);
  if (pending.length === 0) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-amber-200 dark:border-amber-800 bg-amber-100/60 dark:bg-amber-900/20">
        <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex-1">
          My Pending Actions
        </h2>
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold">
          {pending.length}
        </span>
      </div>
      <div className="divide-y divide-amber-100 dark:divide-amber-900/30">
        {pending.map((p) => (
          <Link
            key={p.id}
            href={`/project/${p.id}`}
            className="flex items-center gap-3 px-5 py-3 hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
                {p.projectName}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 truncate">{p.status}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-400 shrink-0 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </div>
  );
}
