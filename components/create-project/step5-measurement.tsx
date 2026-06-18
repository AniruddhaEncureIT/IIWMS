"use client";

import { Plus, X, FileText, Info } from "lucide-react";
import type { MeasurementItem } from "./wizard-types";
import { AUTO_GENERATED_DOCS } from "./wizard-types";

interface Props {
  items: MeasurementItem[];
  onChange: (items: MeasurementItem[]) => void;
  errors?: Record<string, string>;
}

const input =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 text-sm transition-colors";
const inputErr =
  "w-full px-3 py-2 border border-red-500 dark:border-red-400 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 text-sm transition-colors";
const readonlyCls =
  "w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 text-sm cursor-not-allowed";
const fieldLabel = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5";

const UNITS = ["Cum", "Sqm", "RMT", "Nos", "MT", "Ton"];

function calcItem(item: MeasurementItem): MeasurementItem {
  const quantity = (item.length || 0) * (item.breadth || 0) * (item.height || 0);
  const amount = quantity * (item.rate || 0);
  return { ...item, quantity, amount };
}

function ErrMsg({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">{msg}</p>;
}

export function Step5Measurement({ items, onChange, errors }: Props) {
  function add() {
    onChange([
      ...items,
      { id: `ms-${Date.now()}`, itemNumber: "", itemName: "", length: 0, breadth: 0, height: 0, quantity: 0, unit: "Cum", rate: 0, amount: 0 },
    ]);
  }

  function remove(id: string) {
    onChange(items.filter((i) => i.id !== id));
  }

  function update(id: string, patch: Partial<MeasurementItem>) {
    onChange(items.map((i) => i.id !== id ? i : calcItem({ ...i, ...patch })));
  }

  const totalAmount = items.reduce((sum, i) => sum + (i.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Step header */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0 mt-0.5" aria-hidden="true">5</div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Measurement Sheet</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Enter dimensions and rates to auto-calculate quantities and amounts.</p>
        </div>
      </div>

      <div className="space-y-4">
        {items.map((item, idx) => {
          const numErr  = errors?.[`itemNumber_${item.id}`];
          const nameErr = errors?.[`itemName_${item.id}`];
          const rateErr = errors?.[`rate_${item.id}`];
          const hasAnyErr = !!(numErr || nameErr || rateErr);

          return (
            <div key={item.id} className={`rounded-xl border bg-white dark:bg-gray-800 shadow-sm overflow-hidden ${hasAnyErr ? "border-red-300 dark:border-red-700" : "border-gray-200 dark:border-gray-700"}`}>
              {/* Card header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Measurement {idx + 1}</span>
                {items.length > 1 && (
                  <button type="button" onClick={() => remove(item.id)}
                    className="p-1 rounded text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    aria-label={`Remove measurement ${idx + 1}`}>
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {/* Card body */}
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className={fieldLabel}>Item Number <span className="text-red-500">*</span></label>
                  <input type="text" className={numErr ? inputErr : input} placeholder="e.g., 1.1"
                    value={item.itemNumber}
                    onChange={(e) => update(item.id, { itemNumber: e.target.value })}
                    aria-invalid={!!numErr} />
                  <ErrMsg msg={numErr} />
                </div>
                <div className="col-span-2">
                  <label className={fieldLabel}>Item Name <span className="text-red-500">*</span></label>
                  <input type="text" className={nameErr ? inputErr : input} placeholder="Describe the measurement item"
                    value={item.itemName}
                    onChange={(e) => update(item.id, { itemName: e.target.value })}
                    aria-invalid={!!nameErr} />
                  <ErrMsg msg={nameErr} />
                </div>
                <div>
                  <label className={fieldLabel}>Length</label>
                  <input type="number" min="0" step="0.01" className={input} placeholder="0"
                    value={item.length || ""} onChange={(e) => update(item.id, { length: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className={fieldLabel}>Breadth</label>
                  <input type="number" min="0" step="0.01" className={input} placeholder="0"
                    value={item.breadth || ""} onChange={(e) => update(item.id, { breadth: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className={fieldLabel}>Height / Depth</label>
                  <input type="number" min="0" step="0.001" className={input} placeholder="0"
                    value={item.height || ""} onChange={(e) => update(item.id, { height: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className={fieldLabel}>Quantity</label>
                  <input type="text" className={readonlyCls} readOnly value={item.quantity.toFixed(3)} />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">= L × B × H</p>
                </div>
                <div>
                  <label className={fieldLabel}>Unit</label>
                  <select className={input} value={item.unit} onChange={(e) => update(item.id, { unit: e.target.value })}>
                    {UNITS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className={fieldLabel}>Rate (₹) <span className="text-red-500">*</span></label>
                  <input type="number" min="0" className={rateErr ? inputErr : input} placeholder="0"
                    value={item.rate || ""}
                    onChange={(e) => update(item.id, { rate: parseFloat(e.target.value) || 0 })}
                    aria-invalid={!!rateErr} />
                  <ErrMsg msg={rateErr} />
                </div>
                <div>
                  <label className={fieldLabel}>Amount (₹)</label>
                  <input type="text" className={readonlyCls} readOnly value={`₹${item.amount.toLocaleString("en-IN")}`} />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">= qty × rate</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button type="button" onClick={add}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
        <Plus className="w-4 h-4" aria-hidden="true" /> Add Another Measurement
      </button>

      {/* Total summary */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">Total Estimated Amount</span>
          <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">
            ₹{totalAmount.toLocaleString("en-IN")}
          </span>
        </div>
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Sum of all measurement amounts</p>
      </div>

      {/* Auto-Generated Documents — informational only */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/60">
          <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Auto-Generated Documents</h3>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              The following documents will be automatically generated by the system upon submission. You can preview and download them in Step 8 (Review &amp; Submit).
            </p>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {AUTO_GENERATED_DOCS.map((doc) => (
              <li key={doc.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                <FileText className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" aria-hidden="true" />
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{doc.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
