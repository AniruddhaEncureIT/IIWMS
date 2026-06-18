"use client";

import { Plus, X } from "lucide-react";
import type { LeadStatementItem } from "./wizard-types";

interface Props {
  items: LeadStatementItem[];
  onChange: (items: LeadStatementItem[]) => void;
  errors?: Record<string, string>;
}

const input =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 text-sm transition-colors";
const inputErr =
  "w-full px-3 py-2 border border-red-500 dark:border-red-400 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 text-sm transition-colors";
const readonlyCls =
  "w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 text-sm cursor-not-allowed";
const fieldLabel = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5";

const MATERIALS = ["Sand", "Cement", "Steel", "Aggregate", "Bricks", "Stone"];

function ErrMsg({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">{msg}</p>;
}

export function Step3LeadStatement({ items, onChange, errors }: Props) {
  function add() {
    onChange([...items, { id: `ls-${Date.now()}`, materialName: "", sourceOfSupply: "", kilometer: 0, calculation: 0 }]);
  }

  function remove(id: string) {
    onChange(items.filter((i) => i.id !== id));
  }

  function update(id: string, patch: Partial<LeadStatementItem>) {
    onChange(
      items.map((i) => {
        if (i.id !== id) return i;
        const updated = { ...i, ...patch };
        if ("kilometer" in patch) {
          updated.calculation = updated.kilometer * 150;
        }
        return updated;
      })
    );
  }

  return (
    <div className="space-y-6">
      {/* Step header */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0 mt-0.5" aria-hidden="true">3</div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Lead Statement</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Define lead statements for material transportation and associated costs.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item, idx) => {
          const matErr = errors?.[`materialName_${item.id}`];
          const srcErr = errors?.[`sourceOfSupply_${item.id}`];
          const kmErr  = errors?.[`kilometer_${item.id}`];
          const hasAnyErr = !!(matErr || srcErr || kmErr);

          return (
            <div key={item.id} className={`rounded-xl border bg-white dark:bg-gray-800 shadow-sm overflow-hidden ${hasAnyErr ? "border-red-300 dark:border-red-700" : "border-gray-200 dark:border-gray-700"}`}>
              {/* Card header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Lead Statement {idx + 1}</span>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="p-1 rounded text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  aria-label={`Remove lead statement ${idx + 1}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* Card body */}
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className={fieldLabel}>Material Name <span className="text-red-500">*</span></label>
                  <select className={matErr ? inputErr : input} value={item.materialName}
                    onChange={(e) => update(item.id, { materialName: e.target.value })}
                    aria-invalid={!!matErr}>
                    <option value="">Select material</option>
                    {MATERIALS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                  <ErrMsg msg={matErr} />
                </div>
                <div>
                  <label className={fieldLabel}>Source of Supply <span className="text-red-500">*</span></label>
                  <input type="text" className={srcErr ? inputErr : input} placeholder="e.g., Local Quarry"
                    value={item.sourceOfSupply}
                    onChange={(e) => update(item.id, { sourceOfSupply: e.target.value })}
                    aria-invalid={!!srcErr} />
                  <ErrMsg msg={srcErr} />
                </div>
                <div>
                  <label className={fieldLabel}>Kilometer <span className="text-red-500">*</span></label>
                  <input type="number" min="0" step="0.1" className={kmErr ? inputErr : input} placeholder="0"
                    value={item.kilometer || ""}
                    onChange={(e) => update(item.id, { kilometer: parseFloat(e.target.value) || 0 })}
                    aria-invalid={!!kmErr} />
                  <ErrMsg msg={kmErr} />
                </div>
                <div>
                  <label className={fieldLabel}>Calculation (₹)</label>
                  <input type="text" className={readonlyCls} readOnly value={`₹${item.calculation.toLocaleString("en-IN")}`} />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">= km × 150</p>
                </div>
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
        <Plus className="w-4 h-4" aria-hidden="true" /> Add Another Lead Statement
      </button>
    </div>
  );
}
