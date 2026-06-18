"use client";

import Link from "next/link";
import {
  Users, CheckCircle2, Clock, Shield,
  UserPlus, Settings,
} from "lucide-react";
import { store } from "@/store/iims.store";
import { StatCard, QuickAction, SectionCard } from "./dash-shared";

export function AdminDashboard({ name }: { name: string }) {
  const allUsers = store.getAllUsers();
  const active   = allUsers.filter((u) => u.status === "Active");
  const inactive = allUsers.filter((u) => u.status === "Inactive");
  const roles    = new Set(allUsers.map((u) => u.role)).size;

  const activePct = allUsers.length > 0
    ? Math.round((active.length / allUsers.length) * 100)
    : 0;

  // Role distribution
  const roleCounts = new Map<string, number>();
  for (const u of allUsers) {
    roleCounts.set(u.role, (roleCounts.get(u.role) ?? 0) + 1);
  }
  const roleDist = [...roleCounts.entries()]
    .sort((a, b) => b[1] - a[1]);

  // Last 5 active users as "recent activity"
  const recentUsers = [...active].slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          System Administration
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Welcome back, {name.split(" ")[0]}! Manage users and system administration
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}       color="blue"   label="Total Users"   value={allUsers.length} trend="Registered accounts" />
        <StatCard icon={CheckCircle2}color="green"  label="Active Users"  value={active.length}   trend={`${activePct}% of total`} />
        <StatCard icon={Clock}       color="yellow" label="Inactive Users" value={inactive.length} trend={`${inactive.length} need attention`} />
        <StatCard icon={Shield}      color="purple" label="User Roles"    value={roles}           trend="Distinct role types" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickAction icon={UserPlus} color="blue"   title="Add New User"    description="Create a user account"   href="/admin-management"                       />
        <QuickAction icon={Users}    color="green"  title="Manage Users"    description="Edit existing users"     href="/admin-management"                       />
        <QuickAction icon={Shield}   color="purple" title="Role Management" description="Configure roles"         href="/admin-management?tab=role-management"   />
        <QuickAction icon={Settings} color="orange" title="System Settings" description="Configure system"        href="/admin-management?tab=system-settings"   />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Role distribution */}
        <SectionCard title="User Distribution by Role">
          {roleDist.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No users</p>
          ) : (
            <div className="space-y-3">
              {roleDist.map(([role, count]) => {
                const pct = allUsers.length > 0 ? Math.round((count / allUsers.length) * 100) : 0;
                return (
                  <div
                    key={role}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                        <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {role}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{count}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-right">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Recent User Activity */}
        <SectionCard
          title="Recent User Activity"
          action={
            <Link href="/admin-management" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
              View all
            </Link>
          }
        >
          {recentUsers.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No users</p>
          ) : (
            <div className="space-y-3">
              {recentUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.role}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{u.email}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 shrink-0">
                    {u.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
