"use client";

import Link from "next/link";
import {
  Clock, CheckCircle2, TrendingUp, Activity,
  Plus, FileEdit, FolderOpen,
} from "lucide-react";
import { store } from "@/store/iims.store";
import {
  StatCard, QuickAction, ProjectCard, ActivityTimeline,
  SectionCard, formatCr, totalBudget,
} from "./dash-shared";
import type { IProjectHistory } from "@/types/iims.types";

export function SEDashboard({ name }: { name: string }) {
  const projects = store.getAllProjects().filter((p) => p.status !== "Draft" || p.draftData);
  const allProjects = store.getAllProjects();

  const pending  = allProjects.filter((p) => p.status.toLowerCase().includes("pending")).length;
  const approved = allProjects.filter((p) => {
    const s = p.status.toLowerCase();
    return s.includes("approved") || s.includes("sanctioned") || s.includes("cost approved");
  }).length;
  const budget   = totalBudget(allProjects);
  const active   = allProjects.filter((p) => p.status !== "Draft" && !p.status.toLowerCase().includes("payment")).length;

  const recent = [...allProjects]
    .filter((p) => p.status !== "Draft")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  // Collect last 3 history entries across all projects
  const recentActivity: (IProjectHistory & { projectName: string })[] = [];
  for (const p of allProjects) {
    for (const h of p.history ?? []) {
      recentActivity.push({ ...h, projectName: p.projectName });
    }
  }
  recentActivity.sort((a, b) => b.performedAt.localeCompare(a.performedAt));
  const last3 = recentActivity.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back, {name.split(" ")[0]}!
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage project estimates and submissions
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Clock}        color="yellow" label="Pending Reviews"   value={pending}         trend="Awaiting action" />
        <StatCard icon={CheckCircle2} color="green"  label="Approved Projects" value={approved}        trend="Sanctioned/Approved" />
        <StatCard icon={TrendingUp}   color="blue"   label="Total Budget"      value={formatCr(budget)} trend="Across all projects" />
        <StatCard icon={Activity}     color="purple" label="Active Projects"   value={active}          trend="Non-draft projects" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <QuickAction icon={Plus}       color="blue"   title="Create New Project" description="Start a new estimate"     href="/create-project"  />
        <QuickAction icon={FileEdit}   color="purple" title="Saved Drafts"        description="Resume draft projects"   href="/saved-drafts"    />
        <QuickAction icon={FolderOpen} color="green"  title="View All Projects"   description="Browse project registry" href="/all-projects"    />
      </div>

      {/* Two-column bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Projects */}
        <div className="lg:col-span-2">
          <SectionCard
            title="Recent Projects"
            action={
              <Link href="/all-projects" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                View all
              </Link>
            }
          >
            {recent.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No projects yet</p>
            ) : (
              <div className="space-y-3">
                {recent.map((p) => <ProjectCard key={p.id} project={p} />)}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Recent Activity */}
        <div>
          <SectionCard title="Recent Activity">
            <ActivityTimeline entries={last3} />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
