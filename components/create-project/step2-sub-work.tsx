"use client";

import { Plus, X } from "lucide-react";
import type { SubWorkItem } from "./wizard-types";

interface Props {
  items: SubWorkItem[];
  onChange: (items: SubWorkItem[]) => void;
  errors?: Record<string, string>;
}

const input =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 text-sm transition-colors";
const inputErr =
  "w-full px-3 py-2 border border-red-500 dark:border-red-400 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 text-sm transition-colors";

export function Step2SubWork({ items, onChange, errors }: Props) {
  function add() {
    onChange([...items, { id: `sw-${Date.now()}`, name: "" }]);
  }

  function remove(id: string) {
    if (items.length <= 1) return;
    onChange(items.filter((i) => i.id !== id));
  }

  function update(id: string, name: string) {
    onChange(items.map((i) => (i.id === id ? { ...i, name } : i)));
  }

  return (
    <div className="space-y-6">
      {/* Step header */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0 mt-0.5" aria-hidden="true">2</div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Item Sub Work Creation</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Define the sub-works that constitute this project.</p>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item, idx) => {
          const nameErr = errors?.[`name_${item.id}`];
          return (
            <div key={item.id} className={`rounded-xl border bg-white dark:bg-gray-800 shadow-sm overflow-hidden ${nameErr ? "border-red-300 dark:border-red-700" : "border-gray-200 dark:border-gray-700"}`}>
              {/* Card header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Sub Work {idx + 1}</span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className="p-1 rounded text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    aria-label={`Remove sub work ${idx + 1}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {/* Card body */}
              <div className="p-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Sub Work Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={nameErr ? inputErr : input}
                  placeholder={`Enter sub work ${idx + 1} name`}
                  value={item.name}
                  onChange={(e) => update(item.id, e.target.value)}
                  aria-invalid={!!nameErr}
                  aria-describedby={nameErr ? `sw-err-${item.id}` : undefined}
                />
                {nameErr && (
                  <p id={`sw-err-${item.id}`} className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">{nameErr}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={add}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <Plus className="w-4 h-4" aria-hidden="true" /> Add Another Sub Work
      </button>
    </div>
  );
}
