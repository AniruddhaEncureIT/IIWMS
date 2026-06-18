"use client";

import { useState, useCallback, useId } from "react";
import { toast } from "sonner";
import {
  Plus, Search, Edit2, Trash2, X, Check, AlertCircle, Database, ChevronDown,
} from "lucide-react";
import { store } from "@/store/iims.store";
import type { IRateItem } from "@/types/iims.types";
import { formatINR } from "@/components/dashboard/dash-shared";

// ─── constants ────────────────────────────────────────────────────────────────

const UNITS = ["Cum", "Sqm", "MT", "Nos", "RM", "Kg", "Ltr", "Set", "Each", "Point"];
const YEARS = ["2024-2025", "2025-2026", "2023-2024", "2022-2023"];

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({ item, onConfirm, onCancel }: {
  item: IRateItem; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Delete Rate Item</h3>
            <p className="text-xs text-gray-400 mt-0.5">This cannot be undone.</p>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 mb-5 space-y-1">
          <p className="text-xs font-mono font-bold text-blue-700 dark:text-blue-400">{item.code}</p>
          <p className="text-sm text-gray-700 dark:text-gray-200 line-clamp-2">{item.description}</p>
          <p className="text-xs text-gray-500">{item.type} · {item.year} · {item.unit} · {formatINR(item.rate)}</p>
        </div>
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

// ─── Rate Item Modal ──────────────────────────────────────────────────────────

interface RateForm {
  code: string; description: string; unit: string; rate: string; year: string;
}

function RateModal({ item, rateType, onClose, onSave }: {
  item: IRateItem | null;
  rateType: "SSR" | "DSR";
  onClose: () => void;
  onSave: (data: RateForm, id?: string) => void;
}) {
  const uid    = useId();
  const isEdit = !!item;
  const [form, setForm] = useState<RateForm>(() =>
    item
      ? { code: item.code, description: item.description, unit: item.unit, rate: String(item.rate), year: item.year }
      : { code: "", description: "", unit: "Cum", rate: "", year: "2024-2025" }
  );
  const [errors, setErrors] = useState<Partial<Record<keyof RateForm, string>>>({});
  const [saving, setSaving] = useState(false);

  function set<K extends keyof RateForm>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  }

  function validate(): boolean {
    const e: Partial<Record<keyof RateForm, string>> = {};
    if (!form.code.trim())        e.code        = "Code is required.";
    if (!form.description.trim()) e.description = "Description is required.";
    if (!form.unit)               e.unit        = "Unit is required.";
    const r = parseFloat(form.rate);
    if (!form.rate || isNaN(r) || r < 0) e.rate = "Enter a valid rate ≥ 0.";
    if (!form.year)               e.year        = "Year is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    try { onSave(form, item?.id); } finally { setSaving(false); }
  }

  const inp = (err?: string) =>
    `w-full rounded-lg border ${err ? "border-red-400 dark:border-red-600" : "border-gray-200 dark:border-gray-600"} bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 px-4 py-6 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 my-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              {isEdit ? <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" /> : <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {isEdit ? `Edit ${rateType} Item` : `Add ${rateType} Rate Item`}
              </h2>
              {isEdit && <p className="text-xs text-gray-400 mt-0.5 font-mono">{item!.code}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Code + Year */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor={`${uid}-code`} className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Item Code <span className="text-red-500">*</span>
              </label>
              <input id={`${uid}-code`} value={form.code} onChange={(e) => set("code", e.target.value)}
                placeholder="e.g. 24.01" className={inp(errors.code)} />
              {errors.code && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.code}</p>}
            </div>
            <div>
              <label htmlFor={`${uid}-year`} className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Schedule Year <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select id={`${uid}-year`} value={form.year} onChange={(e) => set("year", e.target.value)}
                  className={`${inp(errors.year)} appearance-none pr-8`}>
                  {YEARS.map((y) => <option key={y}>{y}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor={`${uid}-desc`} className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea id={`${uid}-desc`} rows={4} value={form.description} onChange={(e) => set("description", e.target.value)}
              placeholder="Full item description as per schedule…"
              className={`${inp(errors.description)} resize-none`} />
            {errors.description && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.description}</p>}
          </div>

          {/* Unit + Rate */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor={`${uid}-unit`} className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Unit <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select id={`${uid}-unit`} value={form.unit} onChange={(e) => set("unit", e.target.value)}
                  className={`${inp(errors.unit)} appearance-none pr-8`}>
                  {UNITS.map((u) => <option key={u}>{u}</option>)}
                  <option value="OTHER">Other</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label htmlFor={`${uid}-rate`} className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Rate (₹ / {form.unit}) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                <input id={`${uid}-rate`} type="number" min="0" step="0.01"
                  value={form.rate} onChange={(e) => set("rate", e.target.value)}
                  placeholder="0.00" className={`${inp(errors.rate)} pl-6`} />
              </div>
              {form.rate && !isNaN(parseFloat(form.rate)) && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{formatINR(parseFloat(form.rate))}</p>
              )}
              {errors.rate && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.rate}</p>}
            </div>
          </div>

          {/* Type badge */}
          <div className="flex items-center gap-2 pt-1">
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${rateType === "SSR" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"}`}>
              {rateType} · {form.year || "—"}
            </span>
            <p className="text-xs text-gray-400">This item will be saved as a {rateType} rate.</p>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/60 rounded-b-2xl">
          <button onClick={onClose} disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
            {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : isEdit ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isEdit ? "Save Changes" : "Add Item"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Rate Items Tab ───────────────────────────────────────────────────────────

export function RateItemsTab({ rateType }: { rateType: "SSR" | "DSR" }) {
  const [items,       setItems]       = useState<IRateItem[]>(() => store.getAllRateItems().filter((r) => r.type === rateType));
  const [search,      setSearch]      = useState("");
  const [yearFilter,  setYearFilter]  = useState("all");
  const [editItem,    setEditItem]    = useState<IRateItem | null>(null);
  const [createOpen,  setCreateOpen]  = useState(false);
  const [deleteItem,  setDeleteItem]  = useState<IRateItem | null>(null);

  const reload = useCallback(() => {
    setItems(store.getAllRateItems().filter((r) => r.type === rateType));
  }, [rateType]);

  const years = Array.from(new Set(items.map((r) => r.year))).sort().reverse();

  const filtered = items.filter((r) => {
    const matchSearch = !search ||
      r.code.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      r.unit.toLowerCase().includes(search.toLowerCase());
    const matchYear = yearFilter === "all" || r.year === yearFilter;
    return matchSearch && matchYear;
  });

  function handleSave(data: RateForm, id?: string) {
    const payload = {
      code:        data.code.trim(),
      description: data.description.trim(),
      unit:        data.unit,
      rate:        parseFloat(data.rate),
      type:        rateType as "SSR" | "DSR",
      year:        data.year,
    };
    if (id) {
      store.updateRateItem(id, payload);
      toast.success(`${rateType} item "${data.code}" updated.`);
      setEditItem(null);
    } else {
      store.addRateItem(payload);
      toast.success(`${rateType} item "${data.code}" added.`);
      setCreateOpen(false);
    }
    reload();
  }

  function handleDelete(item: IRateItem) {
    store.deleteRateItem(item.id);
    toast.success(`"${item.code}" deleted.`);
    setDeleteItem(null);
    reload();
  }

  const color = rateType === "SSR"
    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
    : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400";

  return (
    <>
      {createOpen && (
        <RateModal item={null} rateType={rateType} onClose={() => setCreateOpen(false)} onSave={handleSave} />
      )}
      {editItem && (
        <RateModal item={editItem} rateType={rateType} onClose={() => setEditItem(null)} onSave={handleSave} />
      )}
      {deleteItem && (
        <DeleteConfirm item={deleteItem} onConfirm={() => handleDelete(deleteItem)} onCancel={() => setDeleteItem(null)} />
      )}

      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Items", value: items.length, sub: `${rateType} schedule` },
            { label: "Years",       value: years.length, sub: "schedule years" },
            { label: "In Search",   value: filtered.length, sub: "matching items" },
          ].map(({ label, value, sub }) => (
            <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${rateType} items by code or description…`}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm transition" />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>}
          </div>
          <div className="relative">
            <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}
              className="pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm transition">
              <option value="all">All Years</option>
              {years.map((y) => <option key={y}>{y}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <button onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Add {rateType} Item
          </button>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center shadow-sm">
            <Database className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              {search ? `No ${rateType} items match "${search}".` : `No ${rateType} rate items configured.`}
            </p>
            <button onClick={() => setCreateOpen(true)}
              className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors mx-auto">
              <Plus className="w-4 h-4" /> Add First Item
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                    {["Code", "Description", "Unit", "Rate (₹)", "Year", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40">
                  {filtered.sort((a, b) => a.code.localeCompare(b.code)).map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/20 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-xs text-blue-700 dark:text-blue-400 whitespace-nowrap">{item.code}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200 max-w-md">
                        <p className="line-clamp-2 text-xs leading-relaxed">{item.description}</p>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">{item.unit}</td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap tabular-nums">{formatINR(item.rate)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${color}`}>{item.year}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditItem(item)} title="Edit"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteItem(item)} title="Delete"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50/60 dark:bg-gray-700/20 border-t border-gray-100 dark:border-gray-700">
                    <td colSpan={5} className="px-4 py-2.5 text-xs text-gray-400">
                      {filtered.length} item{filtered.length !== 1 ? "s" : ""} · Average rate: {formatINR(Math.round(filtered.reduce((s, r) => s + r.rate, 0) / (filtered.length || 1)))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
