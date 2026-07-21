"use client";

import { useState, useEffect, useCallback, useId } from "react";
import { toast } from "sonner";
import {
  Plus,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Percent,
  Search,
  X,
  Check,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { store } from "@/store/iims.store";
import type { ICharge } from "@/types/iims.types";

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// Assign a consistent color per charge type for the visual indicator
const TYPE_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-teal-500", "bg-amber-500",
  "bg-green-500", "bg-red-500", "bg-indigo-500", "bg-pink-500",
  "bg-orange-500", "bg-cyan-500",
];
function chargeColor(id: string) {
  const n = id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  return TYPE_COLORS[n % TYPE_COLORS.length];
}

// ─── Charge Form Modal ────────────────────────────────────────────────────────

interface ChargeFormData {
  type: string;
  percentage: string;
  isActive: boolean;
}

const EMPTY_FORM: ChargeFormData = { type: "", percentage: "", isActive: true };

// Common charge type suggestions
const CHARGE_SUGGESTIONS = [
  "GST", "Labour Cess", "Insurance", "Quality Control Charges",
  "Contingency", "Income Tax (TDS)", "Royalty", "Environment Cess",
  "Water Cess", "Stamp Duty", "Performance Security",
];

function ChargeModal({
  charge,
  existingTypes,
  onClose,
  onSave,
}: {
  charge: ICharge | null;
  existingTypes: string[];
  onClose: () => void;
  onSave: (data: ChargeFormData, id?: string) => void;
}) {
  const isEdit = !!charge;
  const uid = useId();

  const [form, setForm] = useState<ChargeFormData>(() =>
    charge
      ? { type: charge.type, percentage: String(charge.percentage), isActive: charge.isActive }
      : EMPTY_FORM
  );
  const [errors, setErrors] = useState<Partial<Record<keyof ChargeFormData, string>>>({});
  const [saving, setSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = CHARGE_SUGGESTIONS.filter(
    (s) => s.toLowerCase().includes(form.type.toLowerCase()) && s !== form.type
  );

  function set<K extends keyof ChargeFormData>(k: K, v: ChargeFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  }

  function validate(): boolean {
    const e: Partial<Record<keyof ChargeFormData, string>> = {};
    if (!form.type.trim()) {
      e.type = "Charge type is required.";
    } else if (
      !isEdit &&
      existingTypes.some((t) => t.toLowerCase() === form.type.trim().toLowerCase())
    ) {
      e.type = "A charge with this type already exists.";
    }
    const pct = parseFloat(form.percentage);
    if (!form.percentage) {
      e.percentage = "Percentage is required.";
    } else if (isNaN(pct) || pct < 0) {
      e.percentage = "Percentage must be a non-negative number.";
    } else if (pct > 100) {
      e.percentage = "Percentage cannot exceed 100%.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    try {
      onSave(form, charge?.id);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              {isEdit
                ? <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                : <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              }
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {isEdit ? "Edit Charge" : "Add New Charge"}
            </h2>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-5">

          {/* Charge Type */}
          <div>
            <label htmlFor={`${uid}-type`}
              className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Charge Type <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id={`${uid}-type`}
                value={form.type}
                onChange={(e) => { set("type", e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="e.g. GST, Labour Cess…"
                autoComplete="off"
                className={`w-full rounded-lg border ${errors.type ? "border-red-400 dark:border-red-600" : "border-gray-200 dark:border-gray-600"} bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition`}
              />
              {/* Suggestions dropdown */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 shadow-lg overflow-hidden">
                  {filteredSuggestions.slice(0, 6).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onMouseDown={() => { set("type", s); setShowSuggestions(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.type && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.type}
              </p>
            )}
          </div>

          {/* Percentage */}
          <div>
            <label htmlFor={`${uid}-pct`}
              className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Percentage (%) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id={`${uid}-pct`}
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.percentage}
                onChange={(e) => set("percentage", e.target.value)}
                placeholder="0.00"
                className={`w-full rounded-lg border ${errors.percentage ? "border-red-400 dark:border-red-600" : "border-gray-200 dark:border-gray-600"} bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">%</span>
            </div>
            {errors.percentage ? (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.percentage}
              </p>
            ) : form.percentage && !isNaN(parseFloat(form.percentage)) ? (
              <p className="text-xs text-gray-400 mt-1">
                On ₹1,00,000 this adds ₹{(parseFloat(form.percentage) * 1000).toFixed(0)}
              </p>
            ) : null}
          </div>

          {/* Active status */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Status
            </label>
            <div className="flex gap-3">
              {([true, false] as const).map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => set("isActive", v)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    form.isActive === v
                      ? v
                        ? "border-green-400 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                        : "border-gray-400 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                      : "border-gray-200 dark:border-gray-600 text-gray-400 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}
                >
                  {form.isActive === v && <Check className="w-3.5 h-3.5" />}
                  {v ? "Active" : "Inactive"}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Only active charges are applied during cost estimation.
            </p>
          </div>

          {/* Live preview */}
          {form.type && form.percentage && !isNaN(parseFloat(form.percentage)) && (
            <div className={`rounded-xl p-4 border ${form.isActive ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800" : "bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-600"}`}>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Preview</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{form.type}</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{parseFloat(form.percentage).toFixed(2)}%</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    form.isActive
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                  }`}>
                    {form.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/60 rounded-b-2xl">
          <button onClick={onClose} disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
            {saving
              ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : isEdit ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />
            }
            {isEdit ? "Save Changes" : "Add Charge"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({
  charge,
  onConfirm,
  onCancel,
}: {
  charge: ICharge;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Delete Charge</h3>
            <p className="text-xs text-gray-400 mt-0.5">This action cannot be undone.</p>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{charge.type}</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">{charge.percentage}%</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Status: <span className={charge.isActive ? "text-green-600 dark:text-green-400 font-medium" : "text-gray-500"}>{charge.isActive ? "Active" : "Inactive"}</span>
          </p>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
          Deleting this charge will remove it from all future cost estimations.
          Existing project estimates will not be affected.
        </p>

        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Charge Card (grid view) ─────────────────────────────────────────────────

function ChargeCard({
  charge,
  onEdit,
  onToggle,
  onDelete,
}: {
  charge: ICharge;
  onEdit: (c: ICharge) => void;
  onToggle: (c: ICharge) => void;
  onDelete: (c: ICharge) => void;
}) {
  const dot = chargeColor(charge.id);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border shadow-sm transition-all hover:shadow-md ${
      charge.isActive
        ? "border-gray-200 dark:border-gray-700"
        : "border-gray-100 dark:border-gray-700/50 opacity-60"
    }`}>
      {/* Color bar */}
      <div className={`h-1.5 ${charge.isActive ? dot : "bg-gray-200 dark:bg-gray-700"} rounded-t-xl`} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              charge.isActive ? `${dot} bg-opacity-15` : "bg-gray-100 dark:bg-gray-700"
            }`}
              style={{ backgroundColor: charge.isActive ? undefined : undefined }}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                charge.isActive ? "bg-blue-50 dark:bg-blue-900/20" : "bg-gray-100 dark:bg-gray-700"
              }`}>
                <Percent className={`w-4 h-4 ${charge.isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-400"}`} />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{charge.type}</p>
              <p className="text-xs text-gray-400 mt-0.5">Updated {fmtDate(charge.updatedAt)}</p>
            </div>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
            charge.isActive
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
          }`}>
            {charge.isActive ? "Active" : "Inactive"}
          </span>
        </div>

        {/* Percentage display */}
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
              {charge.percentage}
              <span className="text-lg font-semibold text-gray-400 ml-0.5">%</span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              On ₹1 lakh → ₹{(charge.percentage * 1000).toLocaleString("en-IN")}
            </p>
          </div>

          {/* Mini bar */}
          <div className="w-20">
            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${charge.isActive ? dot : "bg-gray-300 dark:bg-gray-600"}`}
                style={{ width: `${Math.min(100, charge.percentage * 5)}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400 text-right mt-0.5">of 20%</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={() => onToggle(charge)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              charge.isActive
                ? "bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40"
            }`}
          >
            {charge.isActive
              ? <><ToggleRight className="w-3.5 h-3.5" /> Deactivate</>
              : <><ToggleLeft className="w-3.5 h-3.5" /> Activate</>
            }
          </button>
          <button
            onClick={() => onEdit(charge)}
            className="p-2 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            title="Edit charge"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(charge)}
            className="p-2 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Delete charge"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function ChargesManagementView() {
  const [charges,     setCharges]     = useState<ICharge[]>([]);
  const [search,      setSearch]      = useState("");
  const [statusFilter,setStatusFilter]= useState<"all" | "active" | "inactive">("all");
  const [editCharge,  setEditCharge]  = useState<ICharge | null>(null);
  const [createOpen,  setCreateOpen]  = useState(false);
  const [deleteCharge,setDeleteCharge]= useState<ICharge | null>(null);
  const [view,        setView]        = useState<"grid" | "table">("grid");

  const reload = useCallback(() => {
    setCharges(store.getAllCharges());
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // ── computed
  const active   = charges.filter((c) => c.isActive);
  const inactive = charges.filter((c) => !c.isActive);
  const totalPct = active.reduce((s, c) => s + c.percentage, 0);

  const filtered = charges.filter((c) => {
    const matchSearch = !search || c.type.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === "all"      ? true :
      statusFilter === "active"   ? c.isActive :
      !c.isActive;
    return matchSearch && matchStatus;
  });

  const existingTypes = charges.map((c) => c.type);

  // ── handlers

  function handleSave(data: ChargeFormData, id?: string) {
    const pct = parseFloat(data.percentage);
    if (id) {
      store.updateCharge(id, { type: data.type.trim(), percentage: pct, isActive: data.isActive });
      toast.success(`"${data.type}" updated.`);
      setEditCharge(null);
    } else {
      store.addCharge({ type: data.type.trim(), percentage: pct, isActive: data.isActive });
      toast.success(`"${data.type}" added.`);
      setCreateOpen(false);
    }
    reload();
  }

  function handleToggle(charge: ICharge) {
    store.updateCharge(charge.id, { isActive: !charge.isActive });
    toast.success(`"${charge.type}" ${charge.isActive ? "deactivated" : "activated"}.`);
    reload();
  }

  function handleDelete(charge: ICharge) {
    store.deleteCharge(charge.id);
    toast.success(`"${charge.type}" deleted.`);
    setDeleteCharge(null);
    reload();
  }

  return (
    <>
      {createOpen && (
        <ChargeModal
          charge={null}
          existingTypes={existingTypes}
          onClose={() => setCreateOpen(false)}
          onSave={handleSave}
        />
      )}
      {editCharge && (
        <ChargeModal
          charge={editCharge}
          existingTypes={existingTypes.filter((t) => t !== editCharge.type)}
          onClose={() => setEditCharge(null)}
          onSave={handleSave}
        />
      )}
      {deleteCharge && (
        <DeleteConfirm
          charge={deleteCharge}
          onConfirm={() => handleDelete(deleteCharge)}
          onCancel={() => setDeleteCharge(null)}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Percent className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Charges Management
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Configure percentage charges applied during cost estimation
            </p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Charge
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Total Charges",
              value: charges.length,
              sub: "configured",
              color: "blue",
              icon: <Percent className="w-4 h-4" />,
            },
            {
              label: "Active",
              value: active.length,
              sub: "applied to estimates",
              color: "green",
              icon: <CheckCircle2 className="w-4 h-4" />,
            },
            {
              label: "Inactive",
              value: inactive.length,
              sub: "currently disabled",
              color: "gray",
              icon: <AlertCircle className="w-4 h-4" />,
            },
            {
              label: "Total Active %",
              value: `${totalPct.toFixed(2)}%`,
              sub: "cumulative rate",
              color: "violet",
              icon: <Percent className="w-4 h-4" />,
            },
          ].map(({ label, value, sub, color, icon }) => (
            <div
              key={label}
              className={`bg-white dark:bg-gray-800 rounded-xl border border-${color}-100 dark:border-${color}-900/30 p-4 shadow-sm`}
            >
              <div className={`flex items-center gap-1.5 text-${color}-500 dark:text-${color}-400 mb-2`}>
                {icon}
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
              </div>
              <p className={`text-2xl font-bold text-${color}-700 dark:text-${color}-400`}>{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search charge type…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm transition"
            />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status filter */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 border border-gray-200 dark:border-gray-700">
            {(["all", "active", "inactive"] as const).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  statusFilter === s
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}>
                {s}
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 border border-gray-200 dark:border-gray-700">
            {(["grid", "table"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  view === v
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Results label */}
        {(search || statusFilter !== "all") && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Showing <strong className="text-gray-700 dark:text-gray-200">{filtered.length}</strong> of {charges.length}</span>
            <button onClick={() => { setSearch(""); setStatusFilter("all"); }}
              className="text-blue-500 hover:underline">Clear</button>
          </div>
        )}

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center shadow-sm">
            <Percent className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              {search ? `No charges match "${search}".` : "No charges configured yet."}
            </p>
            {!search && (
              <button onClick={() => setCreateOpen(true)}
                className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors mx-auto">
                <Plus className="w-4 h-4" /> Add First Charge
              </button>
            )}
          </div>

        ) : view === "grid" ? (
          /* Grid view */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered
              .slice()
              .sort((a, b) => Number(b.isActive) - Number(a.isActive) || b.percentage - a.percentage)
              .map((charge) => (
                <ChargeCard
                  key={charge.id}
                  charge={charge}
                  onEdit={setEditCharge}
                  onToggle={handleToggle}
                  onDelete={setDeleteCharge}
                />
              ))}
          </div>

        ) : (
          /* Table view */
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                    {["Charge Type", "Percentage", "Status", "Created", "Updated", "Actions"].map((h) => (
                      <th key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40">
                  {filtered
                    .slice()
                    .sort((a, b) => Number(b.isActive) - Number(a.isActive) || b.percentage - a.percentage)
                    .map((charge) => (
                      <tr key={charge.id}
                        className={`hover:bg-gray-50/60 dark:hover:bg-gray-700/20 transition-colors ${!charge.isActive ? "opacity-60" : ""}`}>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${charge.isActive ? chargeColor(charge.id) : "bg-gray-300 dark:bg-gray-600"}`} />
                            <span className="font-semibold text-gray-800 dark:text-gray-200">{charge.type}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">{charge.percentage}%</span>
                            <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${charge.isActive ? chargeColor(charge.id) : "bg-gray-300 dark:bg-gray-600"}`}
                                style={{ width: `${Math.min(100, charge.percentage * 5)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggle(charge)}
                            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${
                              charge.isActive
                                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40"
                                : "bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                            }`}
                          >
                            {charge.isActive
                              ? <><ToggleRight className="w-4 h-4" /> Active</>
                              : <><ToggleLeft className="w-4 h-4" /> Inactive</>
                            }
                          </button>
                        </td>

                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {fmtDate(charge.createdAt)}
                        </td>

                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {fmtDate(charge.updatedAt)}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setEditCharge(charge)}
                              title="Edit"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setDeleteCharge(charge)}
                              title="Delete"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-50 dark:bg-blue-900/20 border-t border-blue-100 dark:border-blue-800">
                    <td className="px-4 py-3 text-xs font-semibold text-blue-700 dark:text-blue-300">
                      {active.length} active / {inactive.length} inactive
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-blue-700 dark:text-blue-300 tabular-nums">
                      {totalPct.toFixed(2)}%
                    </td>
                    <td colSpan={4} className="px-4 py-3 text-xs text-blue-600 dark:text-blue-400">
                      cumulative active rate
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Info note */}
        <div className="flex gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Only <strong>Active</strong> charges are applied during cost estimation. Deactivating a charge preserves it for future use without affecting ongoing project estimates.
          </p>
        </div>

      </div>
    </>
  );
}
