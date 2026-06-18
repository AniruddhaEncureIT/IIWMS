"use client";

import { useState, useCallback, useId, useMemo } from "react";
import { toast } from "sonner";
import {
  Plus, Search, Edit2, Trash2, X, Check, AlertCircle, Database,
  ChevronDown, ChevronUp, ChevronsUpDown, Download, TrendingUp,
  BarChart3, ArrowUpDown, CheckSquare, Square, Minus,
} from "lucide-react";
import { store } from "@/store/iims.store";
import type { IRateItem } from "@/types/iims.types";
import { formatINR } from "@/components/dashboard/dash-shared";

// ─── Constants ─────────────────────────────────────────────────────────────────

const UNITS   = ["Cum", "Sqm", "MT", "Nos", "RM", "Kg", "Ltr", "Set", "Each", "Point", "OTHER"];
const YEARS   = ["2025-2026", "2024-2025", "2023-2024", "2022-2023"];
const PG_SIZES = [25, 50, 100] as const;

type SortField = "code" | "description" | "unit" | "rate" | "year" | "type";
type SortDir   = "asc" | "desc";

interface RateForm {
  code: string; description: string; unit: string; rate: string;
  year: string; type: "SSR" | "DSR";
}

// ─── helpers ───────────────────────────────────────────────────────────────────

function rateStats(items: IRateItem[]) {
  if (!items.length) return { min: 0, max: 0, avg: 0, total: 0 };
  const rates = items.map((r) => r.rate);
  return {
    min:   Math.min(...rates),
    max:   Math.max(...rates),
    avg:   Math.round(rates.reduce((s, r) => s + r, 0) / rates.length),
    total: items.length,
  };
}

function exportCSV(items: IRateItem[]) {
  const header = ["Code", "Description", "Unit", "Rate", "Type", "Year"];
  const rows   = items.map((r) =>
    [r.code, `"${r.description.replace(/"/g, '""')}"`, r.unit, r.rate, r.type, r.year].join(",")
  );
  const csv    = [header.join(","), ...rows].join("\n");
  const blob   = new Blob([csv], { type: "text/csv" });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement("a");
  a.href       = url;
  a.download   = `rate-items-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`Exported ${items.length} items as CSV.`);
}

// ─── Sort icon ─────────────────────────────────────────────────────────────────

function SortIcon({ field, active, dir }: { field: string; active: string; dir: SortDir }) {
  if (field !== active) return <ChevronsUpDown className="w-3 h-3 text-gray-300 dark:text-gray-600" />;
  return dir === "asc"
    ? <ChevronUp   className="w-3 h-3 text-blue-500" />
    : <ChevronDown className="w-3 h-3 text-blue-500" />;
}

// ─── Delete confirm ────────────────────────────────────────────────────────────

function DeleteConfirm({ item, onConfirm, onCancel }: {
  item: IRateItem; onConfirm(): void; onCancel(): void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Delete Rate Item</h3>
            <p className="text-xs text-gray-400">This cannot be undone.</p>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 mb-5 space-y-1">
          <p className="text-xs font-mono font-bold text-blue-700 dark:text-blue-400">{item.code}</p>
          <p className="text-sm text-gray-700 dark:text-gray-200 line-clamp-2">{item.description}</p>
          <p className="text-xs text-gray-400">{item.type} · {item.year} · {item.unit} · {formatINR(item.rate)}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk delete confirm ───────────────────────────────────────────────────────

function BulkDeleteConfirm({ count, onConfirm, onCancel }: {
  count: number; onConfirm(): void; onCancel(): void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Delete {count} Item{count !== 1 ? "s" : ""}</h3>
            <p className="text-xs text-gray-400">This cannot be undone.</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
          You are about to permanently delete <strong>{count}</strong> rate item{count !== 1 ? "s" : ""}. Any estimates referencing these items may be affected.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors">
            <Trash2 className="w-4 h-4" /> Delete All
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Rate Item Modal ───────────────────────────────────────────────────────────

function RateModal({ item, defaultType, onClose, onSave }: {
  item: IRateItem | null;
  defaultType: "SSR" | "DSR" | "ALL";
  onClose(): void;
  onSave(data: RateForm, id?: string): void;
}) {
  const uid    = useId();
  const isEdit = !!item;

  const [form, setForm] = useState<RateForm>(() =>
    item
      ? { code: item.code, description: item.description, unit: item.unit, rate: String(item.rate), year: item.year, type: item.type }
      : { code: "", description: "", unit: "Cum", rate: "", year: "2024-2025", type: defaultType === "ALL" ? "SSR" : defaultType }
  );
  const [errors, setErrors] = useState<Partial<Record<keyof RateForm, string>>>({});
  const [saving, setSaving] = useState(false);

  function set<K extends keyof RateForm>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v as RateForm[K] }));
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

  const rateNum = parseFloat(form.rate);
  const rateOk  = form.rate !== "" && !isNaN(rateNum);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 my-auto">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${form.type === "SSR" ? "bg-blue-100 dark:bg-blue-900/30" : "bg-violet-100 dark:bg-violet-900/30"}`}>
              {isEdit
                ? <Edit2 className={`w-4 h-4 ${form.type === "SSR" ? "text-blue-600 dark:text-blue-400" : "text-violet-600 dark:text-violet-400"}`} />
                : <Plus  className={`w-4 h-4 ${form.type === "SSR" ? "text-blue-600 dark:text-blue-400" : "text-violet-600 dark:text-violet-400"}`} />}
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {isEdit ? "Edit Rate Item" : "Add Rate Item"}
              </h2>
              {isEdit && <p className="text-xs text-gray-400 font-mono mt-0.5">{item!.code} · {item!.type}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Type toggle */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Schedule Type <span className="text-red-500">*</span></p>
            <div className="flex gap-2">
              {(["SSR", "DSR"] as const).map((t) => (
                <button key={t} onClick={() => set("type", t)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${form.type === t
                    ? t === "SSR"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                      : "border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300"
                    : "border-gray-200 dark:border-gray-600 text-gray-400 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}>
                  {t}
                  <span className="block text-xs font-normal opacity-70 mt-0.5">
                    {t === "SSR" ? "State Schedule of Rates" : "District Schedule of Rates"}
                  </span>
                </button>
              ))}
            </div>
          </div>

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
            <textarea id={`${uid}-desc`} rows={3} value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Full item description as per schedule of rates…"
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
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label htmlFor={`${uid}-rate`} className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Rate (₹ / {form.unit}) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">₹</span>
                <input id={`${uid}-rate`} type="number" min="0" step="0.01"
                  value={form.rate} onChange={(e) => set("rate", e.target.value)}
                  placeholder="0.00" className={`${inp(errors.rate)} pl-6`} />
              </div>
              {rateOk && (
                <p className={`text-xs font-semibold mt-1 ${form.type === "SSR" ? "text-blue-600 dark:text-blue-400" : "text-violet-600 dark:text-violet-400"}`}>
                  {formatINR(rateNum)}
                </p>
              )}
              {errors.rate && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.rate}</p>}
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/60 rounded-b-2xl">
          <button onClick={onClose} disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-60 ${form.type === "SSR" ? "bg-blue-600 hover:bg-blue-700" : "bg-violet-600 hover:bg-violet-700"}`}>
            {saving
              ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : isEdit ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isEdit ? "Save Changes" : `Add ${form.type} Item`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────

function CB({ checked, indeterminate, onChange }: {
  checked: boolean; indeterminate?: boolean; onChange(): void;
}) {
  return (
    <button onClick={onChange} className="p-0.5 rounded text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
      {indeterminate
        ? <Minus       className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        : checked
          ? <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          : <Square      className="w-4 h-4" />}
    </button>
  );
}

// ─── Rate Item Editor View ─────────────────────────────────────────────────────

export function RateItemEditorView() {
  const [items,       setItems]       = useState<IRateItem[]>(() => store.getAllRateItems());
  const [search,      setSearch]      = useState("");
  const [typeFilter,  setTypeFilter]  = useState<"ALL" | "SSR" | "DSR">("ALL");
  const [yearFilter,  setYearFilter]  = useState("all");
  const [unitFilter,  setUnitFilter]  = useState("all");
  const [sortField,   setSortField]   = useState<SortField>("code");
  const [sortDir,     setSortDir]     = useState<SortDir>("asc");
  const [pgSize,      setPgSize]      = useState<number>(25);
  const [page,        setPage]        = useState(1);
  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [editItem,    setEditItem]    = useState<IRateItem | null>(null);
  const [createOpen,  setCreateOpen]  = useState(false);
  const [deleteItem,  setDeleteItem]  = useState<IRateItem | null>(null);
  const [bulkDel,     setBulkDel]     = useState(false);

  const reload = useCallback(() => {
    setItems(store.getAllRateItems());
    setSelected(new Set());
  }, []);

  // Derived filter values
  const allYears = useMemo(() =>
    Array.from(new Set(items.map((r) => r.year))).sort().reverse(), [items]);
  const allUnits = useMemo(() =>
    Array.from(new Set(items.map((r) => r.unit))).sort(), [items]);

  // Filtered + sorted list
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items
      .filter((r) => {
        const matchType = typeFilter === "ALL" || r.type === typeFilter;
        const matchYear = yearFilter === "all" || r.year === yearFilter;
        const matchUnit = unitFilter === "all" || r.unit === unitFilter;
        const matchQ    = !q ||
          r.code.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.unit.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q);
        return matchType && matchYear && matchUnit && matchQ;
      })
      .sort((a, b) => {
        let cmp = 0;
        if      (sortField === "rate") cmp = a.rate - b.rate;
        else if (sortField === "code") cmp = a.code.localeCompare(b.code);
        else     cmp = String(a[sortField]).localeCompare(String(b[sortField]));
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [items, search, typeFilter, yearFilter, unitFilter, sortField, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pgSize));
  const safePage   = Math.min(page, totalPages);
  const paged      = filtered.slice((safePage - 1) * pgSize, safePage * pgSize);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
    setPage(1);
  }

  function resetFilters() {
    setSearch(""); setTypeFilter("ALL"); setYearFilter("all"); setUnitFilter("all"); setPage(1);
  }

  // Selection helpers
  const allPageSelected  = paged.length > 0 && paged.every((r) => selected.has(r.id));
  const somePageSelected = paged.some((r) => selected.has(r.id)) && !allPageSelected;

  function toggleAll() {
    if (allPageSelected) {
      setSelected((s) => { const n = new Set(s); paged.forEach((r) => n.delete(r.id)); return n; });
    } else {
      setSelected((s) => { const n = new Set(s); paged.forEach((r) => n.add(r.id)); return n; });
    }
  }

  function toggleOne(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  // CRUD handlers
  function handleSave(data: RateForm, id?: string) {
    const payload = {
      code:        data.code.trim(),
      description: data.description.trim(),
      unit:        data.unit,
      rate:        parseFloat(data.rate),
      type:        data.type,
      year:        data.year,
    };
    if (id) {
      store.updateRateItem(id, payload);
      toast.success(`"${data.code}" updated.`);
      setEditItem(null);
    } else {
      store.addRateItem(payload);
      toast.success(`${data.type} item "${data.code}" added.`);
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

  function handleBulkDelete() {
    selected.forEach((id) => store.deleteRateItem(id));
    toast.success(`${selected.size} item${selected.size !== 1 ? "s" : ""} deleted.`);
    setBulkDel(false);
    reload();
  }

  // Stats
  const ssrItems  = items.filter((r) => r.type === "SSR");
  const dsrItems  = items.filter((r) => r.type === "DSR");
  const ssrStats  = rateStats(ssrItems);
  const dsrStats  = rateStats(dsrItems);
  const hasFilter = search || typeFilter !== "ALL" || yearFilter !== "all" || unitFilter !== "all";

  // Column header helper
  function TH({ field, label, right }: { field: SortField; label: string; right?: boolean }) {
    return (
      <th onClick={() => toggleSort(field)}
        className={`px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors group ${right ? "text-right" : "text-left"}`}>
        <span className="inline-flex items-center gap-1">
          {label}
          <SortIcon field={field} active={sortField} dir={sortDir} />
        </span>
      </th>
    );
  }

  const typeBadge = (type: "SSR" | "DSR") =>
    type === "SSR"
      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400";

  return (
    <>
      {createOpen   && <RateModal item={null} defaultType={typeFilter} onClose={() => setCreateOpen(false)} onSave={handleSave} />}
      {editItem     && <RateModal item={editItem} defaultType={typeFilter} onClose={() => setEditItem(null)} onSave={handleSave} />}
      {deleteItem   && <DeleteConfirm item={deleteItem} onConfirm={() => handleDelete(deleteItem)} onCancel={() => setDeleteItem(null)} />}
      {bulkDel      && <BulkDeleteConfirm count={selected.size} onConfirm={handleBulkDelete} onCancel={() => setBulkDel(false)} />}

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* ── Page header ──────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="max-w-screen-xl mx-auto px-5 py-5">
            <div className="flex items-start gap-4 justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-md shrink-0">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Rate Item Editor</h1>
                  <p className="text-sm text-gray-400 mt-0.5">Manage SSR and DSR schedule of rates for Pune Division</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => exportCSV(filtered)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
                  <Download className="w-4 h-4" /> Export CSV
                </button>
                <button onClick={() => setCreateOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm">
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>
            </div>

            {/* ── Stats strip ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-400 mb-1">Total Items</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{items.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">{allYears.length} schedule year{allYears.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-100 dark:border-blue-800">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-blue-500 font-semibold">SSR Items</p>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{ssrItems.length}</span>
                </div>
                <p className="text-sm font-bold text-blue-900 dark:text-blue-200">Avg {formatINR(ssrStats.avg)}</p>
                <p className="text-xs text-blue-400 mt-0.5">{formatINR(ssrStats.min)} – {formatINR(ssrStats.max)}</p>
              </div>
              <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-3 border border-violet-100 dark:border-violet-800">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-violet-500 font-semibold">DSR Items</p>
                  <span className="text-xs font-bold text-violet-600 dark:text-violet-400">{dsrItems.length}</span>
                </div>
                <p className="text-sm font-bold text-violet-900 dark:text-violet-200">Avg {formatINR(dsrStats.avg)}</p>
                <p className="text-xs text-violet-400 mt-0.5">{formatINR(dsrStats.min)} – {formatINR(dsrStats.max)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-400 mb-1">In View</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{filtered.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">of {items.length} after filters</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-screen-xl mx-auto px-5 py-5 space-y-4">
          {/* ── Filter bar ───────────────────────────────────────────── */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 space-y-3">
            {/* Row 1: search */}
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search by code, description, or unit…"
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition" />
                {search && (
                  <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Row 2: type tabs + dropdowns + sort */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Type */}
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
                {(["ALL", "SSR", "DSR"] as const).map((t) => (
                  <button key={t} onClick={() => { setTypeFilter(t); setPage(1); }}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${typeFilter === t ? "bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-100 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>
                    {t}
                  </button>
                ))}
              </div>

              {/* Year */}
              <div className="relative">
                <select value={yearFilter} onChange={(e) => { setYearFilter(e.target.value); setPage(1); }}
                  className="pl-3 pr-7 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-200 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition">
                  <option value="all">All Years</option>
                  {allYears.map((y) => <option key={y}>{y}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>

              {/* Unit */}
              <div className="relative">
                <select value={unitFilter} onChange={(e) => { setUnitFilter(e.target.value); setPage(1); }}
                  className="pl-3 pr-7 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-200 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition">
                  <option value="all">All Units</option>
                  {allUnits.map((u) => <option key={u}>{u}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>

              {/* Sort */}
              <div className="relative">
                <select value={`${sortField}:${sortDir}`}
                  onChange={(e) => {
                    const [f, d] = e.target.value.split(":");
                    setSortField(f as SortField); setSortDir(d as SortDir); setPage(1);
                  }}
                  className="pl-3 pr-7 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-200 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition">
                  <option value="code:asc">Code A→Z</option>
                  <option value="code:desc">Code Z→A</option>
                  <option value="rate:asc">Rate Low→High</option>
                  <option value="rate:desc">Rate High→Low</option>
                  <option value="year:desc">Year Newest</option>
                  <option value="year:asc">Year Oldest</option>
                  <option value="unit:asc">Unit A→Z</option>
                </select>
                <ArrowUpDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>

              {hasFilter && (
                <button onClick={resetFilters}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 px-2.5 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border border-gray-200 dark:border-gray-600">
                  <X className="w-3.5 h-3.5" /> Clear filters
                </button>
              )}

              {/* Page size */}
              <div className="ml-auto flex items-center gap-1.5">
                <span className="text-xs text-gray-400">Show:</span>
                {PG_SIZES.map((n) => (
                  <button key={n} onClick={() => { setPgSize(n); setPage(1); }}
                    className={`w-8 h-7 rounded text-xs font-semibold transition-colors ${pgSize === n ? "bg-blue-600 text-white" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Bulk action bar ──────────────────────────────────────── */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 bg-blue-600 text-white rounded-xl px-4 py-3 shadow-md">
              <CheckSquare className="w-4 h-4 shrink-0" />
              <span className="text-sm font-semibold">{selected.size} item{selected.size !== 1 ? "s" : ""} selected</span>
              <button onClick={() => exportCSV(items.filter((r) => selected.has(r.id)))}
                className="ml-auto flex items-center gap-1.5 text-xs font-medium bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors">
                <Download className="w-3.5 h-3.5" /> Export Selected
              </button>
              <button onClick={() => setBulkDel(true)}
                className="flex items-center gap-1.5 text-xs font-medium bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Delete Selected
              </button>
              <button onClick={() => setSelected(new Set())}
                className="flex items-center gap-1 text-xs opacity-70 hover:opacity-100 transition-opacity">
                <X className="w-3.5 h-3.5" /> Deselect
              </button>
            </div>
          )}

          {/* ── Table ───────────────────────────────────────────────── */}
          {filtered.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-14 text-center shadow-sm">
              <Database className="w-10 h-10 text-gray-200 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                {hasFilter ? "No items match the current filters." : "No rate items yet."}
              </p>
              {hasFilter ? (
                <button onClick={resetFilters} className="mt-4 text-xs text-blue-600 dark:text-blue-400 hover:underline">Clear all filters</button>
              ) : (
                <button onClick={() => setCreateOpen(true)}
                  className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors mx-auto">
                  <Plus className="w-4 h-4" /> Add First Item
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                      <th className="px-4 py-3 w-10">
                        <CB checked={allPageSelected} indeterminate={somePageSelected} onChange={toggleAll} />
                      </th>
                      <TH field="code"        label="Code" />
                      <TH field="description" label="Description" />
                      <TH field="type"        label="Type" />
                      <TH field="unit"        label="Unit" />
                      <TH field="rate"        label="Rate (₹)" right />
                      <TH field="year"        label="Year" />
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40">
                    {paged.map((item) => {
                      const isChecked = selected.has(item.id);
                      return (
                        <tr key={item.id}
                          className={`transition-colors group ${isChecked ? "bg-blue-50/50 dark:bg-blue-900/10" : "hover:bg-gray-50/60 dark:hover:bg-gray-700/20"}`}>
                          <td className="px-4 py-3">
                            <CB checked={isChecked} onChange={() => toggleOne(item.id)} />
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-xs text-blue-700 dark:text-blue-400 whitespace-nowrap">
                            {item.code}
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <p className="text-xs text-gray-700 dark:text-gray-200 line-clamp-2 leading-relaxed">{item.description}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${typeBadge(item.type)}`}>{item.type}</span>
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">{item.unit}</td>
                          <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap tabular-nums text-right">
                            {formatINR(item.rate)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${typeBadge(item.type)}`}>
                              {item.year}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50/70 dark:bg-gray-700/20 border-t border-gray-100 dark:border-gray-700">
                      <td />
                      <td colSpan={4} className="px-4 py-2.5 text-xs text-gray-400">
                        {filtered.length} item{filtered.length !== 1 ? "s" : ""}
                        {selected.size > 0 && ` · ${selected.size} selected`}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 text-right font-semibold tabular-nums whitespace-nowrap">
                        Avg {formatINR(Math.round(filtered.reduce((s, r) => s + r.rate, 0) / (filtered.length || 1)))}
                        <span className="font-normal text-gray-400 ml-1">/ unit</span>
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/40 dark:bg-gray-700/10">
                  <p className="text-xs text-gray-400">
                    Page {safePage} of {totalPages} · {(safePage - 1) * pgSize + 1}–{Math.min(safePage * pgSize, filtered.length)} of {filtered.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage(1)} disabled={safePage === 1}
                      className="px-2 py-1 rounded text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors">«</button>
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}
                      className="px-2 py-1 rounded text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors">‹</button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
                      return start + i;
                    }).map((p) => (
                      <button key={p} onClick={() => setPage(p)}
                        className={`w-7 h-7 rounded text-xs font-semibold transition-colors ${safePage === p ? "bg-blue-600 text-white" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"}`}>
                        {p}
                      </button>
                    ))}
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                      className="px-2 py-1 rounded text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors">›</button>
                    <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages}
                      className="px-2 py-1 rounded text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors">»</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Rate analytics strip ─────────────────────────────────── */}
          {filtered.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Rate Distribution — Current View</p>
              </div>
              <RateDistribution items={filtered} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Rate distribution ─────────────────────────────────────────────────────────

function RateDistribution({ items }: { items: IRateItem[] }) {
  const buckets = useMemo(() => {
    if (!items.length) return [];
    const rates  = items.map((r) => r.rate);
    const minR   = Math.min(...rates);
    const maxR   = Math.max(...rates);
    const range  = maxR - minR || 1;
    const n      = 8;
    const bw     = range / n;

    return Array.from({ length: n }, (_, i) => {
      const lo    = minR + i * bw;
      const hi    = i === n - 1 ? maxR + 1 : lo + bw;
      const count = items.filter((r) => r.rate >= lo && r.rate < hi).length;
      const ssr   = items.filter((r) => r.rate >= lo && r.rate < hi && r.type === "SSR").length;
      const dsr   = count - ssr;
      return { lo, hi, count, ssr, dsr };
    });
  }, [items]);

  const maxCount = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <div className="flex items-end gap-1 h-16">
      {buckets.map((b, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
          <div className="w-full flex flex-col justify-end" style={{ height: "48px" }}>
            <div className="w-full rounded-t overflow-hidden flex flex-col-reverse" style={{ height: `${(b.count / maxCount) * 48}px` }}>
              {b.dsr > 0 && <div className="w-full bg-violet-400 dark:bg-violet-500" style={{ flex: b.dsr }} />}
              {b.ssr > 0 && <div className="w-full bg-blue-400 dark:bg-blue-500"    style={{ flex: b.ssr }} />}
            </div>
          </div>
          <p className="text-xs text-gray-400 whitespace-nowrap" style={{ fontSize: "9px" }}>
            {formatINR(Math.round(b.lo))}
          </p>
          {b.count > 0 && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10">
              <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                {b.count} item{b.count !== 1 ? "s" : ""} · {b.ssr} SSR, {b.dsr} DSR
              </div>
              <div className="w-1.5 h-1.5 bg-gray-900 rotate-45 -mt-0.5" />
            </div>
          )}
        </div>
      ))}
      <div className="flex flex-col justify-end gap-1 ml-3 shrink-0">
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-blue-400" /><span className="text-xs text-gray-400">SSR</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-violet-400" /><span className="text-xs text-gray-400">DSR</span></div>
      </div>
    </div>
  );
}
