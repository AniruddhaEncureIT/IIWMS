"use client";

import type { IProject, IMBData } from "@/types/iims.types";
import { store } from "@/store/iims.store";

// ─── helpers ─────────────────────────────────────────────────────────────────

export function fmtDate(s?: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export function daysLeft(dateStr?: string): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

export function fmtPct(pct: number) {
  const s = pct > 0 ? "+" : "";
  return `${s}${pct.toFixed(2)}%`;
}

// ─── contractor project filter ────────────────────────────────────────────────

export interface ContractorMB extends IMBData {
  projectId: string;
  projectName: string;
  contractAmount: number;
  workOrderNumber: string;
}

export function getContractorProjects(projects: IProject[], userName: string): IProject[] {
  return projects.filter(
    (p) =>
      p.workOrderData?.l1Contractor === userName ||
      p.tenderData?.loa?.l1Contractor === userName ||
      p.tenderData?.financialBid?.l1Bidder?.name === userName
  );
}

export function flatMbs(projects: IProject[]): ContractorMB[] {
  return projects.flatMap((p) =>
    (p.mbData ?? []).map((mb) => ({
      ...mb,
      projectId:      p.id,
      projectName:    p.projectName,
      contractAmount: p.workOrderData?.contractAmount ?? p.tenderData?.loa?.approvedAmount ?? 0,
      workOrderNumber:p.workOrderData?.workOrderNumber ?? "—",
    }))
  );
}

// Save updated MBs back to project
export function patchProjectMb(projectId: string, mbId: string, patch: Partial<IMBData>) {
  const p = store.getProjectById(projectId);
  if (!p) return;
  store.updateProject(projectId, {
    mbData: (p.mbData ?? []).map((m) => m.id === mbId ? { ...m, ...patch } : m),
  });
}

// ─── Status badge ──────────────────────────────────────────────────────────────

export function MBStatusBadge({ status }: { status: string }) {
  const cls =
    status === "Contractor Accepted"  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
    status === "Contractor Rejected"  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
    status === "Approved by EE"       ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" :
    status === "Verified by DE"       ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
    status.includes("Returned")       ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
    status === "Draft"                ? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" :
                                        "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400";
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${cls}`}>
      {status}
    </span>
  );
}

export function ProjectStatusDot({ status }: { status: string }) {
  const color =
    status.includes("Issued") || status.includes("Approved") ? "bg-green-500" :
    status.includes("Progress")  ? "bg-blue-500" :
    status.includes("Pending")   ? "bg-amber-500" :
    status.includes("Rejected")  ? "bg-red-500" :
                                   "bg-gray-400";
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}
