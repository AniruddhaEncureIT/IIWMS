"use client";

import Link from "next/link";
import {
  Clock, CheckCircle2, TrendingUp, Activity,
  FolderOpen,
} from "lucide-react";
import { store } from "@/store/iims.store";
import {
  StatCard, QuickAction, ProjectCard, ActivityTimeline,
  SectionCard, formatCr, totalBudget,
} from "./dash-shared";
import type { IProjectHistory } from "@/types/iims.types";

// Shared by: Auditor, Accountant, AAO, CAFO, Additional CEO, CEO

interface GenericConfig {
  subtitle: string;
  pendingLabel: string;
  pendingFilter: (status: string) => boolean;
}

const CONFIG: Record<string, GenericConfig> = {
  "Auditor": {
    subtitle: "Audit and verify measurement books",
    pendingLabel: "MB Pending Audit",
    pendingFilter: (s) => s.toLowerCase().includes("auditor"),
  },
  "Accountant": {
    subtitle: "Process and track project bills",
    pendingLabel: "Pending Processing",
    pendingFilter: (s) => s.toLowerCase().includes("accountant"),
  },
  "Assistant Accounts Officer": {
    subtitle: "Review accounts and forward for approval",
    pendingLabel: "Pending AAO Review",
    pendingFilter: (s) => s.toLowerCase().includes("aao") || s.toLowerCase().includes("assistant accounts"),
  },
  "Chief Accounts and Finance Officer": {
    subtitle: "Approve payments and financial matters",
    pendingLabel: "Pending CAFO Approval",
    pendingFilter: (s) => s.toLowerCase().includes("cafo") || s.toLowerCase().includes("chief accounts"),
  },
  "Additional Chief Executive Officer": {
    subtitle: "Sanction and approve project proposals",
    pendingLabel: "Pending ACEO Approval",
    pendingFilter: (s) => s.toLowerCase().includes("additional") || s.toLowerCase().includes("addl"),
  },
  "Chief Executive Officer": {
    subtitle: "Final approval authority for all projects",
    pendingLabel: "Pending CEO Approval",
    pendingFilter: (s) => s.toLowerCase().includes("ceo") || s.toLowerCase().includes("chief executive"),
  },
};

const DEFAULT_CONFIG: GenericConfig = {
  subtitle: "Manage and review project activities",
  pendingLabel: "Pending Action",
  pendingFilter: (s) => s.toLowerCase().includes("pending"),
};

export function GenericFinanceDashboard({
  name,
  role,
}: {
  name: string;
  role: string;
}) {
  const cfg = CONFIG[role] ?? DEFAULT_CONFIG;
  const allProjects = store.getAllProjects();

  // Role-specific pending count — check project mbData statuses too
  let pendingCount = 0;
  for (const p of allProjects) {
    const inProjectStatus = cfg.pendingFilter(p.status);
    const inMBStatus = (p.mbData ?? []).some((mb) => cfg.pendingFilter(mb.status));
    if (inProjectStatus || inMBStatus) pendingCount++;
  }

  const approved = allProjects.filter((p) => {
    const s = p.status.toLowerCase();
    return s.includes("approved") || s.includes("sanctioned") || s.includes("payment");
  }).length;

  const budget = totalBudget(allProjects);
  const active = allProjects.filter(
    (p) => p.status !== "Draft" && !p.status.toLowerCase().includes("payment")
  ).length;

  // Show projects relevant to this role
  const recent = allProjects
    .filter((p) => {
      const inStatus = cfg.pendingFilter(p.status);
      const inMB = (p.mbData ?? []).some((mb) => cfg.pendingFilter(mb.status));
      return inStatus || inMB;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  // Fallback: show all recently active projects if nothing role-specific
  const displayProjects =
    recent.length > 0
      ? recent
      : [...allProjects]
          .filter((p) => p.status !== "Draft")
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 5);

  const recentActivity: (IProjectHistory & { projectName: string })[] = [];
  for (const p of allProjects) {
    for (const h of p.history ?? []) {
      recentActivity.push({ ...h, projectName: p.projectName });
    }
  }
  recentActivity.sort((a, b) => b.performedAt.localeCompare(a.performedAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back, {name.split(" ")[0]}!
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{cfg.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Clock}        color="yellow" label={cfg.pendingLabel}  value={pendingCount} trend="Awaiting your action" />
        <StatCard icon={CheckCircle2} color="green"  label="Approved / Paid"  value={approved}     trend="Completed" />
        <StatCard icon={TrendingUp}   color="blue"   label="Total Budget"     value={formatCr(budget)} trend="All projects" />
        <StatCard icon={Activity}     color="purple" label="Active Projects"  value={active}       trend="In progress" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-1 gap-3 max-w-xs">
        <QuickAction icon={FolderOpen} color="green" title="View All Projects" description="Browse project registry" href="/all-projects" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SectionCard
            title="Projects Pending Action"
            action={<Link href="/all-projects" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View all</Link>}
          >
            {displayProjects.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No pending items
              </p>
            ) : (
              <div className="space-y-3">
                {displayProjects.map((p) => <ProjectCard key={p.id} project={p} />)}
              </div>
            )}
          </SectionCard>
        </div>
        <SectionCard title="Recent Activity">
          <ActivityTimeline entries={recentActivity.slice(0, 3)} />
        </SectionCard>
      </div>
    </div>
  );
}
