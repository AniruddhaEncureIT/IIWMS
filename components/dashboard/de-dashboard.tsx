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

export function DEDashboard({ name }: { name: string }) {
  const allProjects = store.getAllProjects();

  const pendingDE  = allProjects.filter((p) => p.status.toLowerCase().includes("deputy engineer")).length;
  const approved   = allProjects.filter((p) => {
    const s = p.status.toLowerCase();
    return s.includes("approved") || s.includes("sanctioned");
  }).length;
  const budget     = totalBudget(allProjects);
  const active     = allProjects.filter((p) => p.status !== "Draft" && !p.status.toLowerCase().includes("payment")).length;

  const recent = allProjects
    .filter((p) => p.status.toLowerCase().includes("deputy engineer"))
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
          Verify and forward project estimates
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Clock}        color="yellow" label="Pending Verification" value={pendingDE} trend="Awaiting DE review" />
        <StatCard icon={CheckCircle2} color="green"  label="Approved Projects"   value={approved}  trend="Sanctioned/Approved" />
        <StatCard icon={TrendingUp}   color="blue"   label="Total Budget"        value={formatCr(budget)} trend="All projects" />
        <StatCard icon={Activity}     color="purple" label="Active Projects"     value={active}    trend="In progress" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-1 gap-3 max-w-xs">
        <QuickAction icon={FolderOpen} color="green" title="View All Projects" description="Browse all projects" href="/all-projects" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SectionCard
            title="Pending Verification"
            action={<Link href="/all-projects" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View all</Link>}
          >
            {recent.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No projects pending DE verification
              </p>
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
