"use client";

import type { GeneralDescription } from "./wizard-types";

interface Props {
  data: GeneralDescription;
  onChange: (patch: Partial<GeneralDescription>) => void;
}

const label = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5";
const textarea =
  "w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 text-sm resize-none transition-colors";

export function Step6GeneralDescription({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      {/* Step header */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0 mt-0.5" aria-hidden="true">6</div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">General Description</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Provide technical notes, site conditions, and special clauses. All fields are optional.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Technical Notes</span>
          </div>
          <div className="p-4">
            <label className={label}>Notes</label>
            <textarea rows={5} className={textarea}
              placeholder="Enter technical specifications, standards to follow, material requirements..."
              value={data.technicalNotes} onChange={(e) => onChange({ technicalNotes: e.target.value })} />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Site Conditions</span>
          </div>
          <div className="p-4">
            <label className={label}>Conditions</label>
            <textarea rows={5} className={textarea}
              placeholder="Describe the site access, soil conditions, utility conflicts, environmental considerations..."
              value={data.siteConditions} onChange={(e) => onChange({ siteConditions: e.target.value })} />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Special Clauses</span>
          </div>
          <div className="p-4">
            <label className={label}>Clauses</label>
            <textarea rows={5} className={textarea}
              placeholder="List any special contractual requirements, penalty clauses, traffic management notes..."
              value={data.specialClauses} onChange={(e) => onChange({ specialClauses: e.target.value })} />
          </div>
        </div>
      </div>
    </div>
  );
}
