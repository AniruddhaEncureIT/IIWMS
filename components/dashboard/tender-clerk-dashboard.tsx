"use client";

import Link from "next/link";
import {
  Clock, CheckCircle2, TrendingUp, Activity,
  FolderOpen,
} from "lucide-react";
import { store } from "@/store/iims.store";
import {
  StatCard, QuickAction, ProjectCard, ActivityTimeline,
  SectionCard, formatCr, totalBudget, getPendingForRole,
} from "./dash-shared";
import type { IProjectHistory } from "@/types/iims.types";

export function TenderClerkDashboard({ name }: { name: string }) {
  const allProjects = store.getAllProjects();

  const pendingProjects = getPendingForRole(allProjects, "Tender Clerk");
  const pendingCount = pendingProjects.length;

  const activeTenders = allProjects.filter((p) => {
    const s = p.status.toLowerCase();
    return s.includes("tender") || s.includes("bid");
  }).length;

  const budget = totalBudget(allProjects);

  const workOrders = allProjects.filter((p) =>
    p.status.toLowerCase().includes("work order") || p.status.toLowerCase().includes("loa")
  ).length;

  const recent = [...pendingProjects]
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
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Tender preparation and bid management
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Clock}        color="yellow" label="Pending Actions"       value={pendingCount}  trend="Awaiting your action" />
        <StatCard icon={CheckCircle2} color="blue"   label="Active Tenders"       value={activeTenders} trend="Published / In progress" />
        <StatCard icon={TrendingUp}   color="green"  label="Total Budget"         value={formatCr(budget)} trend="All projects" />
        <StatCard icon={Activity}     color="purple" label="Work Orders / LOI"    value={workOrders}    trend="Post-tender stage" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-1 gap-3 max-w-xs">
        <QuickAction icon={FolderOpen} color="green" title="View All Projects" description="Browse tender projects" href="/draft-tender-paper" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SectionCard
            title="Pending Actions"
            action={<Link href="/all-projects" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View all</Link>}
          >
            {recent.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No pending projects</p>
            ) : (
              <div className="space-y-3">
                {recent.map((p) => <ProjectCard key={p.id} project={p} />)}
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
