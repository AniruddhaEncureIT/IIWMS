"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FolderOpen,
  IndianRupee,
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileText,
  Building2,
  Stamp,
  ClipboardList,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import { store } from "@/store/iims.store";
import type { IProject } from "@/types/iims.types";
import { formatINR } from "@/components/dashboard/dash-shared";
import {
  fmtDate, daysLeft, fmtPct,
  getContractorProjects, flatMbs, ProjectStatusDot,
} from "./contractor-shared";

// ─── Project stage timeline ───────────────────────────────────────────────────

const STAGES = [
  { key: "dtp",    label: "DTP",         check: (p: IProject) => !!p.dtpData },
  { key: "tender", label: "Tender",      check: (p: IProject) => !!p.tenderData?.tenderId },
  { key: "loa",    label: "LOI",         check: (p: IProject) => !!p.tenderData?.loa },
  { key: "wo",     label: "Work Order",  check: (p: IProject) => !!p.workOrderData },
  { key: "mb",     label: "MB & Billing",check: (p: IProject) => (p.mbData?.length ?? 0) > 0 },
] as const;

function StageTimeline({ project }: { project: IProject }) {
  return (
    <div className="flex items-center gap-0 pt-1">
      {STAGES.map((s, i) => {
        const done = s.check(project);
        return (
          <div key={s.key} className="flex items-center gap-0 flex-1 min-w-0">
            <div className="flex flex-col items-center">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                done
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400"
              }`}>
                {done ? "✓" : i + 1}
              </div>
              <p className={`text-[9px] mt-0.5 text-center leading-tight max-w-[52px] ${
                done ? "text-blue-600 dark:text-blue-400 font-semibold" : "text-gray-400"
              }`}>{s.label}</p>
            </div>
            {i < STAGES.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mt-[-10px] ${done ? "bg-blue-400" : "bg-gray-200 dark:bg-gray-700"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({ project }: { project: IProject }) {
  const [expanded, setExpanded] = useState(false);

  const wo         = project.workOrderData;
  const loa        = project.tenderData?.loa;
  const mbs        = project.mbData ?? [];
  const billed     = mbs.reduce((s, m) => s + (m.totalWorkAmount ?? 0), 0);
  const approved   = mbs.filter((m) => m.status.includes("Approved") || m.status === "Contractor Accepted")
                        .reduce((s, m) => s + (m.netPayable ?? 0), 0);
  const contract   = wo?.contractAmount ?? loa?.approvedAmount ?? 0;
  const pct        = loa?.approvedPercentage ?? 0;
  const billedPct  = contract > 0 ? Math.min(100, (billed / contract) * 100) : 0;
  const days       = daysLeft(wo?.workCompletionDate);
  const overdue    = days !== null && days < 0;
  const daysStr    = days === null ? null
    : overdue   ? `${Math.abs(days)}d overdue`
    : days <= 7 ? `${days}d left`
    : null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      {/* Card header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <ProjectStatusDot status={project.status} />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{project.projectName}</h3>
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <MapPin className="w-3 h-3" />{project.taluka}, {project.gramPanchayat}
              </span>
              {wo?.workOrderNumber && (
                <span className="text-xs font-mono text-blue-600 dark:text-blue-400">{wo.workOrderNumber}</span>
              )}
            </div>
          </div>
          {daysStr && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
              overdue ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            }`}>{daysStr}</span>
          )}
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Contract Value</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{formatINR(contract)}</p>
            <p className={`text-xs mt-0.5 flex items-center gap-0.5 ${pct < 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
              {pct < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
              {fmtPct(pct)} SSR
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Billed</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{formatINR(billed)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{mbs.length} MB{mbs.length !== 1 ? "s" : ""}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Net Approved</p>
            <p className="text-sm font-bold text-green-700 dark:text-green-400">{formatINR(approved)}</p>
            <p className="text-xs text-gray-400 mt-0.5">After deductions</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Work Progress</span>
            <span className="font-semibold">{billedPct.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${billedPct}%` }} />
          </div>
        </div>

        {/* Dates row */}
        <div className="flex gap-4 mt-3 text-xs text-gray-400">
          {wo?.commencementDate && (
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Start: {fmtDate(wo.commencementDate)}</span>
          )}
          {wo?.workCompletionDate && (
            <span className={`flex items-center gap-1 ${overdue ? "text-red-500 dark:text-red-400 font-semibold" : ""}`}>
              <Clock className="w-3 h-3" />Due: {fmtDate(wo.workCompletionDate)}
            </span>
          )}
        </div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between px-5 py-3 bg-gray-50/80 dark:bg-gray-700/30 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
      >
        <span>Project stage timeline</span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" /> : <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />}
      </button>

      {expanded && (
        <div className="px-5 pt-3 pb-5 border-t border-gray-100 dark:border-gray-700 space-y-4">
          <StageTimeline project={project} />

          {/* MB mini-list */}
          {mbs.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Measurement Books</p>
              <div className="space-y-1.5">
                {mbs.map((mb) => (
                  <div key={mb.id} className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-gray-50 dark:bg-gray-700/40">
                    <span className="font-mono font-semibold text-blue-700 dark:text-blue-400">{mb.mbNumber}</span>
                    <span className="text-gray-500">{fmtDate(mb.recordEntryDate)}</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-200">{formatINR(mb.netPayable ?? 0)}</span>
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${
                      mb.status === "Approved by EE" || mb.status === "Contractor Accepted"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                    }`}>{mb.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          <div className="flex gap-3 pt-1 flex-wrap">
            <Link href={`/contractor/mb-verification`}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
              <FileText className="w-3.5 h-3.5" /> MB Verification →
            </Link>
            <Link href={`/contractor/bills-payments`}
              className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400 hover:underline">
              <ClipboardList className="w-3.5 h-3.5" /> Bills & Payments →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function MyProjectsView() {
  const [projects, setProjects] = useState<IProject[]>([]);
  const [search,   setSearch]   = useState("");

  useEffect(() => {
    const user = store.getCurrentUser();
    const all  = store.getAllProjects();
    setProjects(getContractorProjects(all, user?.name ?? ""));
  }, []);

  const filtered = projects.filter((p) =>
    !search || p.projectName.toLowerCase().includes(search.toLowerCase()) ||
    (p.workOrderData?.workOrderNumber ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const totalContract = projects.reduce((s, p) => s + (p.workOrderData?.contractAmount ?? p.tenderData?.loa?.approvedAmount ?? 0), 0);
  const totalBilled   = projects.flatMap((p) => p.mbData ?? []).reduce((s, m) => s + (m.totalWorkAmount ?? 0), 0);
  const totalApproved = projects.flatMap((p) => p.mbData ?? [])
    .filter((m) => m.status.includes("Approved") || m.status === "Contractor Accepted")
    .reduce((s, m) => s + (m.netPayable ?? 0), 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Projects</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {projects.length} active contract{projects.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Contracts",   value: String(projects.length), sub: "active",       color: "blue",   icon: <Stamp className="w-4 h-4" /> },
          { label: "Contract Value",    value: formatINR(totalContract), sub: "total awarded", color: "indigo", icon: <IndianRupee className="w-4 h-4" /> },
          { label: "Work Billed",       value: formatINR(totalBilled),   sub: "all MBs",      color: "amber",  icon: <ClipboardList className="w-4 h-4" /> },
          { label: "Net Approved",      value: formatINR(totalApproved), sub: "after deductions", color: "green", icon: <CheckCircle2 className="w-4 h-4" /> },
        ].map(({ label, value, sub, color, icon }) => (
          <div key={label}
            className={`bg-white dark:bg-gray-800 rounded-xl border border-${color}-100 dark:border-${color}-900/30 p-4 shadow-sm`}>
            <div className={`flex items-center gap-1.5 text-${color}-500 dark:text-${color}-400 mb-2`}>
              {icon}
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
            </div>
            <p className={`text-lg font-bold text-${color}-700 dark:text-${color}-400`}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by project name or WO number…"
        className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm transition"
      />

      {/* Project cards */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center shadow-sm">
          <FolderOpen className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            {search ? "No projects match your search." : "No awarded contracts found."}
          </p>
          {search && (
            <button onClick={() => setSearch("")} className="mt-3 text-xs text-blue-500 hover:underline">Clear search</button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((p) => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}

      {/* Notice */}
      {projects.length > 0 && (
        <div className="flex gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
          <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            MBs approved by EE are awaiting your acceptance in{" "}
            <Link href="/contractor/mb-verification" className="font-semibold hover:underline">MB Verification</Link>.
            Accepted bills will appear in{" "}
            <Link href="/contractor/bills-payments" className="font-semibold hover:underline">Bills &amp; Payments</Link>.
          </p>
        </div>
      )}
    </div>
  );
}
