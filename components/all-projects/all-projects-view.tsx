"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search, Plus, Eye, LayoutGrid, List,
  Calendar, TrendingUp, Activity, Gavel,
  FileCheck, IndianRupee, X, FolderSearch, Bell,
} from "lucide-react";
import { store } from "@/store/iims.store";
import { useAuth } from "@/hooks/use-auth";
import { StatusBadge, statusVariant, formatINR } from "@/components/dashboard/dash-shared";
import type { IProject } from "@/types/iims.types";

// ─── Route config ─────────────────────────────────────────────────────────────

export interface RouteConfig {
  title: string;
  description: string;
  /** Narrows the base project list before user filters are applied */
  preFilter?: (p: IProject) => boolean;
  /** SE-only "Create" button shown only on /all-projects */
  showCreate?: boolean;
}

// ─── Phase filter ─────────────────────────────────────────────────────────────

type PhaseKey = "all" | "draft" | "estimation" | "tender" | "workorder" | "billing" | "returned" | "completed";

const PHASE_TABS: Array<{ key: PhaseKey; label: string }> = [
  { key: "all",        label: "All" },
  { key: "draft",      label: "Draft" },
  { key: "estimation", label: "Estimation" },
  { key: "tender",     label: "Tender Phase" },
  { key: "workorder",  label: "Work Order" },
  { key: "billing",    label: "Execution / MB" },
  { key: "returned",   label: "Returned" },
  { key: "completed",  label: "Completed" },
];

function matchesPhase(status: string, phase: PhaseKey): boolean {
  if (phase === "all") return true;
  const s = status.toLowerCase();
  const keywords: Record<Exclude<PhaseKey, "all">, string[]> = {
    draft:      ["draft"],
    estimation: ["verification", "verified by de", "submitted to ee", "technical sanction", "estimation"],
    tender:     ["dtp", "tender", "loa", "l1 selected", "financial bid", "technical bid", "pre-bid"],
    workorder:  ["work order"],
    billing:    ["mb ", "bill", "payment", "measurement book"],
    returned:   ["returned", "rejected"],
    completed:  ["completed"],
  };
  return keywords[phase].some((kw) => s.includes(kw));
}

// ─── Phase progress bar ───────────────────────────────────────────────────────

const PHASE_LABELS = ["Draft", "Estimation", "Tender", "Work Order", "Exec/MB", "Done"] as const;

function statusToPhaseIndex(status: string): { index: number; isReturned: boolean } {
  const s = status.toLowerCase();
  if (s.includes("returned") || s.includes("rejected")) return { index: -1, isReturned: true };
  if (s.includes("completed"))                           return { index: 5, isReturned: false };
  if (s.includes("mb ") || s.includes("bill") || s.includes("payment")) return { index: 4, isReturned: false };
  if (s.includes("work order"))                          return { index: 3, isReturned: false };
  if (s.includes("dtp") || s.includes("tender") || s.includes("loa") || s.includes("l1") || s.includes("financial bid") || s.includes("technical bid")) return { index: 2, isReturned: false };
  if (s.includes("verification") || s.includes("verified") || s.includes("submitted to ee") || s.includes("technical sanction")) return { index: 1, isReturned: false };
  return { index: 0, isReturned: false };
}

function PhaseProgressBar({ status }: { status: string }) {
  const { index, isReturned } = statusToPhaseIndex(status);
  return (
    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
      <div className="flex-1 flex gap-0.5">
        {PHASE_LABELS.map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-1 rounded-full ${
              isReturned
                ? "bg-red-200 dark:bg-red-900/40"
                : i <= index
                ? "bg-blue-500 dark:bg-blue-400"
                : "bg-gray-200 dark:bg-gray-700"
            }`}
          />
        ))}
      </div>
      <span className={`text-[10px] font-medium shrink-0 min-w-[52px] text-right ${
        isReturned ? "text-red-500 dark:text-red-400" : "text-gray-400 dark:text-gray-500"
      }`}>
        {isReturned ? "Returned" : PHASE_LABELS[Math.max(0, index)]}
      </span>
    </div>
  );
}

// ─── Pending action helper ─────────────────────────────────────────────────────

function hasPendingActionForRole(p: IProject, role: string): boolean {
  const s = p.status.toLowerCase();
  switch (role) {
    case "Sectional Engineer":
      // stage-1 (Draft), stage-4 (Ready for DTP Preparation), stage-23 (Work Order Issued → MB creation)
      return s === "draft" || s === "ready for dtp preparation" || s === "work order issued" || s.includes("returned");
    case "Deputy Engineer":
      // stage-2 (Pending Deputy Engineer Review), stage-5 (Pending DTP Review), stage-24 (Pending Measurement Verification)
      return s === "pending deputy engineer review" || s === "pending dtp review" || s === "pending measurement verification";
    case "Executive Engineer":
      // stage-3, stage-6, stage-7b, stage-9, stage-13, stage-17, stage-20 (all contain "ee review" or "executive engineer")
      // stage-26: "Pending Measurement Approval"; stage-6: "Pending DTP Approval"
      return s.includes("executive engineer") || s.includes("ee review") || s === "pending dtp approval" || s === "pending measurement approval";
    case "Tender Clerk":
      // stage-7: "Ready for Tender Preparation", stage-15b: "Pending GB Approval",
      // stage-16: "Financial Bid Approved" (LOI prep), stage-19b: "Work Order - TC Preparation"
      return (
        s === "ready for tender preparation" ||
        s === "pending gb approval" ||
        s === "financial bid approved" ||
        s === "work order - tc preparation"
      );
    case "Chief Accounts and Finance Officer":
      // stage-7c, stage-10, stage-14, stage-18, stage-21 (all contain "cafo"); stage-30: "Pending Bill Approval"
      return s.includes("cafo") || s === "pending bill approval";
    case "Additional Chief Executive Officer":
      // stage-7d, stage-11, stage-15, stage-19, stage-22, stage-31 (all contain "aceo")
      return s.includes("aceo");
    case "Chief Executive Officer":
      // stage-32: "Pending CEO Final Approval"
      return s === "pending ceo final approval";
    case "Auditor":
      // stage-27: "Pending Auditor Review"
      return s === "pending auditor review";
    case "Accountant":
      // stage-28: "Ready for Billing"
      return s === "ready for billing";
    case "Assistant Accounts Officer":
      // stage-29: "Pending Bill Verification"
      return s === "pending bill verification";
    default:
      return false;
  }
}

// ─── Tender Clerk role-specific action ───────────────────────────────────────

interface RoleAction {
  label: string;
  colorCls: string;
  icon: React.ElementType;
  href: string;
}

function getTenderClerkAction(p: IProject): RoleAction | null {
  // stage-7: TC prepares tender notice
  if (p.status === "Ready for Tender Preparation") {
    return {
      label: "Prepare Tender",
      colorCls: "bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800",
      icon: Gavel,
      href: `/create-tender/${p.id}`,
    };
  }
  // stage-15b: TC records GB Approval outcome
  if (p.status === "Pending GB Approval") {
    return {
      label: "Record GB Approval",
      colorCls: "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
      icon: FileCheck,
      href: `/gb-approval/${p.id}`,
    };
  }
  // stage-16: TC prepares Letter of Intent
  if (p.status === "Financial Bid Approved" && !p.tenderData?.loa) {
    return {
      label: "Issue Letter of Intent",
      colorCls: "bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800",
      icon: FileCheck,
      href: `/letter-of-award/${p.id}`,
    };
  }
  // stage-19b: TC prepares Work Order
  if (p.status === "Work Order - TC Preparation") {
    return {
      label: "Prepare Work Order",
      colorCls: "bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800",
      icon: IndianRupee,
      href: `/work-order/${p.id}`,
    };
  }
  return null;
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  roleAction,
}: {
  project: IProject;
  roleAction: RoleAction | null;
}) {
  const router = useRouter();
  const hasSanction = !!project.technicalSanctionAmount;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/project/${project.id}`)}
      onKeyDown={(e) => e.key === "Enter" && router.push(`/project/${project.id}`)}
      className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer transition-all"
    >
      {/* ── Top row ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-1">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
          {project.projectName}
        </h3>
        <div className="shrink-0">
          <StatusBadge status={project.status} />
        </div>
      </div>

      {/* ── ID ───────────────────────────────────────────────────────── */}
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Project ID: <span className="font-mono font-medium">{project.id}</span>
      </p>

      {/* ── Info grid 3-col ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Calendar className="w-4 h-4 shrink-0 text-gray-400" />
          <span className="truncate">Created: {project.createdAt}</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className={`w-4 h-4 shrink-0 ${hasSanction ? "text-green-500" : "text-gray-400"}`} />
          {hasSanction ? (
            <span className="text-green-700 dark:text-green-400 font-semibold">
              {formatINR(project.technicalSanctionAmount)} <span className="font-normal text-xs text-green-600 dark:text-green-500">Sanctioned</span>
            </span>
          ) : (
            <span className="text-gray-700 dark:text-gray-300 font-medium">{formatINR(project.estimatedAmount)}</span>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Activity className="w-4 h-4 shrink-0 text-gray-400" />
          <span className="truncate">{project.currentStage}</span>
        </div>
      </div>

      {/* ── Tags row ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-4">
        {project.departmentName && (
          <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 truncate max-w-[160px]">
            {project.departmentName}
          </span>
        )}
        {project.taluka && (
          <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800">
            {project.taluka}
          </span>
        )}
        {project.budgetDepartment && (
          <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
            {project.budgetDepartment}
          </span>
        )}
      </div>

      {/* ── Phase progress ───────────────────────────────────────────── */}
      <PhaseProgressBar status={project.status} />

      {/* ── Footer: created-by + actions ─────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 pt-3 flex-wrap">
        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
          Created by {project.createdBy}
        </span>

        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Role-specific action */}
          {roleAction && (
            <Link
              href={roleAction.href}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${roleAction.colorCls}`}
            >
              <roleAction.icon className="w-3.5 h-3.5" />
              {roleAction.label}
            </Link>
          )}

          {/* View Details */}
          <Link
            href={`/project/${project.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Table Row ────────────────────────────────────────────────────────────────

function TableRow({
  project,
  index,
  roleAction,
}: {
  project: IProject;
  index: number;
  roleAction: RoleAction | null;
}) {
  const router = useRouter();
  const hasSanction = !!project.technicalSanctionAmount;
  const variant = statusVariant(project.status);

  const variantDot: Record<string, string> = {
    yellow: "bg-yellow-400", green: "bg-green-500", red: "bg-red-500",
    blue: "bg-blue-500", teal: "bg-teal-500", purple: "bg-purple-500", gray: "bg-gray-400",
  };

  return (
    <tr
      className="group hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
      onClick={() => router.push(`/project/${project.id}`)}
    >
      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 font-mono">
        {index + 1}
      </td>
      <td className="px-4 py-3 max-w-[220px]">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
          {project.projectName}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{project.id}</p>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${variantDot[variant] ?? "bg-gray-400"}`} />
          <span className="text-xs text-gray-700 dark:text-gray-300 leading-tight max-w-[140px] truncate">
            {project.status}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 hidden md:table-cell">
        {project.departmentName}
      </td>
      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 hidden lg:table-cell">
        {project.taluka}
      </td>
      <td className="px-4 py-3 text-sm">
        {hasSanction ? (
          <span className="text-green-700 dark:text-green-400 font-semibold text-xs">
            {formatINR(project.technicalSanctionAmount)}
          </span>
        ) : (
          <span className="text-gray-700 dark:text-gray-300 text-xs font-medium">
            {formatINR(project.estimatedAmount)}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 hidden xl:table-cell max-w-[150px]">
        <span className="truncate block">{project.currentStage}</span>
      </td>
      <td
        className="px-4 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5">
          {roleAction && (
            <Link
              href={roleAction.href}
              className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-md border transition-colors whitespace-nowrap ${roleAction.colorCls}`}
            >
              <roleAction.icon className="w-3 h-3" />
              {roleAction.label}
            </Link>
          )}
          <Link
            href={`/project/${project.id}`}
            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 rounded-md border border-blue-200 dark:border-blue-800 transition-colors whitespace-nowrap"
          >
            <Eye className="w-3 h-3" />
            View
          </Link>
        </div>
      </td>
    </tr>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
        <FolderSearch className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
        No projects found
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Try adjusting your search or filter criteria
      </p>
      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <X className="w-4 h-4" />
          Clear filters
        </button>
      )}
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function AllProjectsView({ title, description, preFilter, showCreate }: RouteConfig) {
  const { user } = useAuth();
  const role = user?.role ?? "";
  const isSE           = role === "Sectional Engineer";
  const isTenderClerk  = role === "Tender Clerk";

  const [search, setSearch]       = useState("");
  const [phase, setPhase]         = useState<PhaseKey>("all");
  const [myActions, setMyActions] = useState(false);
  const [sanctionYear, setSanctionYear] = useState("");
  const [division, setDivision]   = useState("");
  const [budgetDept, setBudgetDept] = useState("");
  const [viewMode, setViewMode]   = useState<"cards" | "table">("cards");

  const allProjects = store.getAllProjects();

  // Unique dimension values for selects
  const sanctionYears = useMemo(
    () => [...new Set(allProjects.map((p) => p.sanctionYear).filter(Boolean))].sort().reverse(),
    [allProjects]
  );
  const divisions = useMemo(
    () => [...new Set(allProjects.map((p) => p.division).filter(Boolean))].sort(),
    [allProjects]
  );
  const budgetDepts = useMemo(
    () => [...new Set(allProjects.map((p) => p.budgetDepartment).filter(Boolean))].sort(),
    [allProjects]
  );

  const displayed = useMemo(() => {
    let list = allProjects;

    // Route-level pre-filter
    if (preFilter) list = list.filter(preFilter);

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.projectName.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q)
      );
    }

    // Lifecycle phase
    if (phase !== "all") {
      list = list.filter((p) => matchesPhase(p.status, phase));
    }

    // My pending actions
    if (myActions) {
      list = list.filter((p) => hasPendingActionForRole(p, role));
    }

    // Dimension filters
    if (sanctionYear) list = list.filter((p) => p.sanctionYear === sanctionYear);
    if (division)     list = list.filter((p) => p.division === division);
    if (budgetDept)   list = list.filter((p) => p.budgetDepartment === budgetDept);

    return list;
  }, [allProjects, preFilter, search, phase, myActions, sanctionYear, division, budgetDept, role]);

  const baseCount = preFilter ? allProjects.filter(preFilter).length : allProjects.length;

  function clearFilters() {
    setSearch("");
    setPhase("all");
    setMyActions(false);
    setSanctionYear("");
    setDivision("");
    setBudgetDept("");
  }

  const hasFilters =
    search.trim() !== "" ||
    phase !== "all" ||
    myActions ||
    sanctionYear !== "" ||
    division !== "" ||
    budgetDept !== "";

  return (
    <div className="space-y-6">
      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
        </div>

        {/* SE: "Create New Project" only on /all-projects */}
        {(isSE && showCreate) && (
          <Link
            href="/create-project"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            Create New Project
          </Link>
        )}
      </div>

      {/* ── Filters card ─────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">

        {/* ── Row 1: Phase tabs ──────────────────────────────────────── */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          {PHASE_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setPhase(tab.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors shrink-0 ${
                phase === tab.key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Row 2: Search + Dimensions + View toggle + Clear ──────── */}
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center flex-wrap">

          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or ID…"
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Sanction Year */}
          {sanctionYears.length > 0 && (
            <select
              value={sanctionYear}
              onChange={(e) => setSanctionYear(e.target.value)}
              className="py-2 px-3 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 appearance-none transition-colors cursor-pointer shrink-0"
            >
              <option value="">All Years</option>
              {sanctionYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          )}

          {/* Division */}
          {divisions.length > 0 && (
            <select
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              className="py-2 px-3 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 appearance-none transition-colors cursor-pointer shrink-0"
            >
              <option value="">All Divisions</option>
              {divisions.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          )}

          {/* Budget Department */}
          {budgetDepts.length > 0 && (
            <select
              value={budgetDept}
              onChange={(e) => setBudgetDept(e.target.value)}
              className="py-2 px-3 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 appearance-none transition-colors cursor-pointer shrink-0"
            >
              <option value="">All Budget Depts</option>
              {budgetDepts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          )}

          {/* My Pending Actions toggle */}
          <button
            type="button"
            onClick={() => setMyActions((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors shrink-0 ${
              myActions
                ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                : "bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-amber-400 hover:text-amber-600"
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            My Actions
          </button>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === "cards" ? "bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}
              aria-label="Card view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === "table" ? "bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}
              aria-label="Table view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Clear */}
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>

        {/* Results count */}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Showing <span className="font-semibold text-gray-900 dark:text-white">{displayed.length}</span> of{" "}
          <span className="font-semibold text-gray-900 dark:text-white">{baseCount}</span> projects
        </p>
      </div>

      {/* ── Results ──────────────────────────────────────────────────── */}
      {displayed.length === 0 ? (
        <EmptyState hasFilters={hasFilters} onClear={clearFilters} />
      ) : viewMode === "cards" ? (
        /* Card view */
        <div className="space-y-4">
          {displayed.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              roleAction={isTenderClerk ? getTenderClerkAction(p) : null}
            />
          ))}
        </div>
      ) : (
        /* Table view */
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                  <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10">#</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Project</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Department</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Taluka</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden xl:table-cell">Stage</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {displayed.map((p, i) => (
                  <TableRow
                    key={p.id}
                    project={p}
                    index={i}
                    roleAction={isTenderClerk ? getTenderClerkAction(p) : null}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {displayed.length} project{displayed.length !== 1 ? "s" : ""} shown
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
