"use client";

import {
  Database, FileEdit, FileText, Layers, Settings,
} from "lucide-react";
import { store } from "@/store/iims.store";
import { StatCard, QuickAction, SectionCard } from "./dash-shared";

export function ConfiguratorDashboard({ name }: { name: string }) {
  const ssrItems   = store.getSSRRateItems();
  const dsrItems   = store.getDSRRateItems();
  const templates  = store.getTemplates();
  const totalItems = ssrItems.length + dsrItems.length;

  // Group SSR by year
  const ssrByYear = new Map<string, number>();
  for (const item of ssrItems) {
    ssrByYear.set(item.year, (ssrByYear.get(item.year) ?? 0) + 1);
  }
  const dsrByYear = new Map<string, number>();
  for (const item of dsrItems) {
    dsrByYear.set(item.year, (dsrByYear.get(item.year) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          System Configuration
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Welcome back, {name.split(" ")[0]}! Manage system rates and templates
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Database}  color="blue"   label="SSR Rate Items"   value={ssrItems.length}  trend="Standard schedule rates" />
        <StatCard icon={FileEdit}  color="green"  label="DSR Rate Items"   value={dsrItems.length}  trend="District schedule rates" />
        <StatCard icon={FileText}  color="purple" label="Total Templates"  value={templates.length} trend="Document templates" />
        <StatCard icon={Layers}    color="orange" label="Total Rate Items" value={totalItems}        trend="SSR + DSR combined" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickAction icon={Database}  color="blue"   title="Add SSR Item"      description="New schedule rate"       href="/system-configuration?tab=ssr&mode=add"           />
        <QuickAction icon={FileEdit}  color="green"  title="Add DSR Item"      description="New district rate"       href="/system-configuration?tab=dsr&mode=add"           />
        <QuickAction icon={FileText}  color="purple" title="Create Template"   description="New document template"   href="/system-configuration?tab=templates&mode=create"  />
        <QuickAction icon={Settings}  color="orange" title="Manage Rates"      description="View all rate items"     href="/system-configuration"                           />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SSR breakdown */}
        <SectionCard title="SSR Items by Year">
          {ssrByYear.size === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No SSR items</p>
          ) : (
            <div className="space-y-3">
              {[...ssrByYear.entries()].map(([year, count]) => (
                <div key={year} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{year}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{count} items</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* DSR breakdown */}
        <SectionCard title="DSR Items by Year">
          {dsrByYear.size === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No DSR items</p>
          ) : (
            <div className="space-y-3">
              {[...dsrByYear.entries()].map(([year, count]) => (
                <div key={year} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileEdit className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{year}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{count} items</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Templates list */}
        <SectionCard title="Document Templates">
          {templates.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No templates</p>
          ) : (
            <div className="space-y-3">
              {templates.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <FileText className="w-4 h-4 text-purple-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{t.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{t.type}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
