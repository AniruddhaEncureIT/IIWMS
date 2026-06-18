"use client";

import { useState, useCallback, useRef, useEffect, useId } from "react";
import { toast } from "sonner";
import {
  FileText, Plus, Search, Trash2, X, Code, Eye, Copy, Download,
  Save, AlertCircle, ChevronDown, Layers, CheckCircle2,
  ArrowLeft, FilePlus, RefreshCw,
} from "lucide-react";
import { store } from "@/store/iims.store";
import type { ITemplate } from "@/types/iims.types";

// ─── Constants ─────────────────────────────────────────────────────────────────

const TEMPLATE_TYPES = ["dtp", "loa", "work_order", "mb", "sanction", "custom"] as const;
type TmplType = typeof TEMPLATE_TYPES[number];

const TYPE_META: Record<TmplType, { label: string; color: string; chip: string }> = {
  dtp:        { label: "DTP",        color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",       chip: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400" },
  loa:        { label: "LOI",        color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",   chip: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400" },
  work_order: { label: "Work Order", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",   chip: "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-400" },
  mb:         { label: "MB",         color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400", chip: "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700 dark:bg-violet-900/20 dark:text-violet-400" },
  sanction:   { label: "Sanction",   color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",       chip: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-900/20 dark:text-rose-400" },
  custom:     { label: "Custom",     color: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",          chip: "border-gray-300 bg-gray-50 text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300" },
};

const VARIABLES_BY_TYPE: Record<string, { key: string; hint: string }[]> = {
  dtp: [
    { key: "{{PROJECT_ID}}",      hint: "PROJ-0042" },
    { key: "{{PROJECT_NAME}}",    hint: "Road Widening Project" },
    { key: "{{DISTRICT}}",        hint: "Pune" },
    { key: "{{ESTIMATED_COST}}", hint: "₹42,00,000" },
    { key: "{{SCOPE_OF_WORK}}",  hint: "Road widening from 5m to 9m…" },
    { key: "{{DURATION}}",        hint: "12 months" },
    { key: "{{DIVISION}}",        hint: "Pune Division ZP" },
    { key: "{{DATE}}",            hint: "15/06/2026" },
  ],
  loa: [
    { key: "{{PROJECT_ID}}",        hint: "PROJ-0042" },
    { key: "{{PROJECT_NAME}}",      hint: "Road Widening Project" },
    { key: "{{L1_CONTRACTOR}}",     hint: "M/s Raj Constructions Pvt Ltd" },
    { key: "{{BID_AMOUNT}}",        hint: "₹1,42,50,000" },
    { key: "{{BID_PERCENTAGE}}",    hint: "-2.50%" },
    { key: "{{COMPLETION_PERIOD}}", hint: "12 months" },
    { key: "{{WORK_DESCRIPTION}}", hint: "Construction of…" },
    { key: "{{ISSUE_DATE}}",        hint: "15/06/2026" },
    { key: "{{TENDER_ID}}",         hint: "TEN-2024-042" },
    { key: "{{DIVISION}}",          hint: "Pune Division ZP" },
  ],
  work_order: [
    { key: "{{WO_NUMBER}}",               hint: "WO/2024/0042" },
    { key: "{{PROJECT_NAME}}",            hint: "Road Widening Project" },
    { key: "{{CONTRACTOR_NAME}}",         hint: "M/s Raj Constructions Pvt Ltd" },
    { key: "{{CONTRACTOR_GST}}",          hint: "27AABCR1234A1Z5" },
    { key: "{{CONTRACTOR_ADDRESS}}",      hint: "Survey No. 45, Pune - 411001" },
    { key: "{{CONTRACT_AMOUNT}}",         hint: "₹1,42,50,000" },
    { key: "{{COMMENCEMENT_DATE}}",       hint: "01/07/2026" },
    { key: "{{COMPLETION_DATE}}",         hint: "30/06/2027" },
    { key: "{{SECURITY_DEPOSIT}}",        hint: "₹7,12,500" },
    { key: "{{PERFORMANCE_GUARANTEE}}",   hint: "₹7,12,500" },
    { key: "{{DIVISION}}",                hint: "Pune Division ZP" },
  ],
  mb: [
    { key: "{{MB_NUMBER}}",          hint: "MB/0042/001" },
    { key: "{{PROJECT_NAME}}",       hint: "Road Widening Project" },
    { key: "{{WO_NUMBER}}",          hint: "WO/2024/0042" },
    { key: "{{MEASUREMENT_DATE}}",   hint: "15/06/2026" },
    { key: "{{JE_NAME}}",            hint: "Er. Suresh Patil" },
    { key: "{{TOTAL_WORK_AMOUNT}}", hint: "₹21,37,500" },
    { key: "{{TOTAL_DEDUCTIONS}}",  hint: "₹2,56,050" },
    { key: "{{NET_PAYABLE}}",        hint: "₹18,81,450" },
    { key: "{{ITEMS_TABLE}}",        hint: "[Measurement Table]" },
  ],
  sanction: [
    { key: "{{PROJECT_NAME}}",    hint: "Road Widening Project" },
    { key: "{{SANCTION_NUMBER}}", hint: "SAN/2024/042" },
    { key: "{{SANCTION_DATE}}",   hint: "01/04/2026" },
    { key: "{{APPROVED_AMOUNT}}", hint: "₹45,00,000" },
    { key: "{{PROJECT_ID}}",      hint: "PROJ-0042" },
    { key: "{{DIVISION}}",        hint: "Pune Division ZP" },
    { key: "{{AUTHORITY}}",       hint: "Executive Engineer" },
    { key: "{{FINANCIAL_YEAR}}",  hint: "2026-2027" },
  ],
  custom: [
    { key: "{{PROJECT_ID}}",    hint: "PROJ-0042" },
    { key: "{{PROJECT_NAME}}", hint: "Road Widening Project" },
    { key: "{{DATE}}",          hint: "15/06/2026" },
    { key: "{{DIVISION}}",      hint: "Pune Division ZP" },
  ],
};

// Complete sample data map for preview substitution
const PREVIEW_DATA: Record<string, string> = {
  PROJECT_ID:           "PROJ-0042",
  PROJECT_NAME:         "Nashik Road Bridge Widening",
  DISTRICT:             "Pune",
  ESTIMATED_COST:       "₹42,00,000",
  SCOPE_OF_WORK:        "Road widening from 5m to 9m carriageway including drainage work",
  DURATION:             "12 months",
  DIVISION:             "Pune Division, Zilla Parishad",
  DATE:                 new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }),
  L1_CONTRACTOR:        "M/s Raj Constructions Pvt Ltd",
  BID_AMOUNT:           "₹1,42,50,000",
  BID_PERCENTAGE:       "-2.50%",
  COMPLETION_PERIOD:    "12 months",
  WORK_DESCRIPTION:     "Construction of bridge widening on Nashik Road km 14+200",
  ISSUE_DATE:           new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }),
  TENDER_ID:            "TEN/2024-25/042",
  WO_NUMBER:            "WO/2024/0042",
  CONTRACTOR_NAME:      "M/s Raj Constructions Pvt Ltd",
  CONTRACTOR_GST:       "27AABCR1234A1Z5",
  CONTRACTOR_ADDRESS:   "Survey No. 45, Hadapsar, Pune - 411028",
  CONTRACT_AMOUNT:      "₹1,42,50,000",
  COMMENCEMENT_DATE:    "01/07/2026",
  COMPLETION_DATE:      "30/06/2027",
  SECURITY_DEPOSIT:     "₹7,12,500",
  PERFORMANCE_GUARANTEE:"₹7,12,500",
  MB_NUMBER:            "MB/0042/001",
  MEASUREMENT_DATE:     "15/06/2026",
  JE_NAME:              "Er. Suresh Patil",
  TOTAL_WORK_AMOUNT:   "₹21,37,500",
  TOTAL_DEDUCTIONS:    "₹2,56,050",
  NET_PAYABLE:          "₹18,81,450",
  ITEMS_TABLE:          "[Measurement items table — rendered at runtime]",
  SANCTION_NUMBER:      "SAN/2024/042",
  SANCTION_DATE:        "01/04/2026",
  APPROVED_AMOUNT:      "₹45,00,000",
  AUTHORITY:            "Executive Engineer",
  FINANCIAL_YEAR:       "2026-2027",
};

function applyPreview(content: string): string {
  return content.replace(/\{\{([A-Z_]+)\}\}/g, (_, key: string) => PREVIEW_DATA[key] ?? `[${key}]`);
}

// ─── Delete confirm ────────────────────────────────────────────────────────────

function DeleteConfirm({ tmpl, onConfirm, onCancel }: {
  tmpl: ITemplate; onConfirm(): void; onCancel(): void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Delete Template</h3>
            <p className="text-xs text-gray-400 mt-0.5">This cannot be undone.</p>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 mb-5 space-y-1">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{tmpl.name}</p>
          <p className="text-xs font-mono text-gray-400 uppercase">{tmpl.type}</p>
          <p className="text-xs text-gray-400">{tmpl.content.length} chars · {new Set(tmpl.content.match(/\{\{[A-Z_]+\}\}/g) ?? []).size} variables</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Discard unsaved changes confirm ──────────────────────────────────────────

function UnsavedConfirm({ onDiscard, onCancel }: { onDiscard(): void; onCancel(): void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Unsaved Changes</h3>
            <p className="text-xs text-gray-400 mt-0.5">Your edits will be lost.</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">Do you want to discard the changes you made?</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Keep Editing</button>
          <button onClick={onDiscard} className="flex-1 px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors">Discard</button>
        </div>
      </div>
    </div>
  );
}

// ─── Template list sidebar ─────────────────────────────────────────────────────

function Sidebar({
  templates, selected, search, setSearch, typeFilter, setTypeFilter,
  onCreate, onSelect, isDirty,
}: {
  templates: ITemplate[];
  selected: ITemplate | "new" | null;
  search: string;
  setSearch(v: string): void;
  typeFilter: string;
  setTypeFilter(v: string): void;
  onCreate(): void;
  onSelect(t: ITemplate): void;
  isDirty: boolean;
}) {
  const types = Array.from(new Set(templates.map((t) => t.type))).sort();

  const filtered = templates.filter((t) => {
    const q = search.toLowerCase();
    const matchS = !q || t.name.toLowerCase().includes(q) || t.type.includes(q);
    const matchT = typeFilter === "all" || t.type === typeFilter;
    return matchS && matchT;
  });

  function varCount(t: ITemplate) {
    return new Set(t.content.match(/\{\{[A-Z_]+\}\}/g) ?? []).size;
  }

  const selectedId = selected === "new" ? null : selected?.id;

  return (
    <aside className="w-72 shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      {/* Sidebar header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-700">
        <button onClick={onCreate}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors shadow-sm">
          <FilePlus className="w-4 h-4" /> New Template
        </button>

        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="w-full pl-8 pr-8 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Type filter pills */}
        <div className="flex flex-wrap gap-1 mt-2">
          {["all", ...types].map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-colors ${typeFilter === t ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
              {t === "all" ? "All" : (TYPE_META[t as TmplType]?.label ?? t)}
            </button>
          ))}
        </div>
      </div>

      {/* Template list */}
      <div className="flex-1 overflow-y-auto py-2">
        {selected === "new" && (
          <div className="mx-2 mb-1 px-3 py-3 rounded-xl border-2 border-green-500 bg-green-50 dark:bg-green-900/20">
            <div className="flex items-center gap-2">
              <FilePlus className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0" />
              <span className="text-xs font-semibold text-green-700 dark:text-green-400">New Template</span>
              {isDirty && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Unsaved" />}
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-400">{search ? "No matches." : "No templates yet."}</p>
          </div>
        ) : (
          filtered.map((t) => {
            const meta = TYPE_META[t.type as TmplType] ?? TYPE_META.custom;
            const isActive = selectedId === t.id;
            return (
              <button key={t.id} onClick={() => onSelect(t)}
                className={`w-full text-left mx-0 px-3 py-3 mx-2 rounded-xl mb-1 transition-colors group ${isActive ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 mx-2" : "hover:bg-gray-50 dark:hover:bg-gray-700/40"}`}
                style={{ width: "calc(100% - 16px)", marginLeft: "8px" }}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isActive ? "bg-blue-100 dark:bg-blue-900/30" : "bg-gray-100 dark:bg-gray-700"}`}>
                    <FileText className={`w-3.5 h-3.5 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-xs font-semibold truncate ${isActive ? "text-blue-700 dark:text-blue-300" : "text-gray-800 dark:text-gray-100"}`}>{t.name}</p>
                      {isDirty && isActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 ml-auto" title="Unsaved" />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs font-semibold px-1.5 py-0 rounded-full ${meta.color}`}>{meta.label}</span>
                      <span className="text-xs text-gray-400">{varCount(t)} var{varCount(t) !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400">
        {filtered.length} of {templates.length} template{templates.length !== 1 ? "s" : ""}
      </div>
    </aside>
  );
}

// ─── Editor pane ───────────────────────────────────────────────────────────────

interface EditorForm { name: string; type: string; content: string; }

function EditorPane({
  template, isNew, onSave, onDelete, onDuplicate,
}: {
  template: ITemplate | null;
  isNew: boolean;
  onSave(form: EditorForm, id?: string): void;
  onDelete(t: ITemplate): void;
  onDuplicate(t: ITemplate): void;
}) {
  const uid = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mode,   setMode]   = useState<"source" | "preview">("source");
  const [form,   setForm]   = useState<EditorForm>(() =>
    template ? { name: template.name, type: template.type, content: template.content }
             : { name: "", type: "loa", content: "" }
  );
  const [errors, setErrors] = useState<Partial<Record<keyof EditorForm, string>>>({});
  const [saved,  setSaved]  = useState(false);

  // Reset form when template changes
  useEffect(() => {
    setForm(
      template ? { name: template.name, type: template.type, content: template.content }
               : { name: "", type: "loa", content: "" }
    );
    setErrors({});
    setMode("source");
  }, [template?.id, isNew]); // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof EditorForm>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
    setSaved(false);
  }

  const varList = VARIABLES_BY_TYPE[form.type] ?? VARIABLES_BY_TYPE.custom;

  function insertVar(key: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const next = form.content.slice(0, s) + key + form.content.slice(e);
    set("content", next);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(s + key.length, s + key.length); }, 0);
  }

  function validate(): boolean {
    const e: Partial<Record<keyof EditorForm, string>> = {};
    if (!form.name.trim())    e.name    = "Template name is required.";
    if (!form.content.trim()) e.content = "Content cannot be empty.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    onSave(form, template?.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleDownload() {
    const blob = new Blob([form.content], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${form.name.replace(/\s+/g, "_") || "template"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Template downloaded.");
  }

  function handleDownloadPreview() {
    const blob = new Blob([applyPreview(form.content)], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${form.name.replace(/\s+/g, "_") || "template"}_preview.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Preview downloaded.");
  }

  const previewText    = applyPreview(form.content);
  const varCount       = new Set(form.content.match(/\{\{[A-Z_]+\}\}/g) ?? []).size;
  const usedVarKeys    = Array.from(new Set(form.content.match(/\{\{[A-Z_]+\}\}/g) ?? []));
  const meta           = TYPE_META[form.type as TmplType] ?? TYPE_META.custom;

  const inp = (err?: string) =>
    `w-full rounded-lg border ${err ? "border-red-400 dark:border-red-600" : "border-gray-200 dark:border-gray-600"} bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition`;

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Editor header */}
      <div className="shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-5 py-4">
        <div className="flex items-start gap-4">
          {/* Name + type row */}
          <div className="flex-1 min-w-0 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${uid}-name`} className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                Template Name <span className="text-red-500">*</span>
              </label>
              <input id={`${uid}-name`} value={form.name} onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Standard Letter of Intent"
                className={inp(errors.name)} />
              {errors.name && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.name}</p>}
            </div>
            <div>
              <label htmlFor={`${uid}-type`} className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Type</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <select id={`${uid}-type`} value={form.type} onChange={(e) => set("type", e.target.value)}
                    className={`${inp()} appearance-none pr-8`}>
                    {TEMPLATE_TYPES.map((t) => (
                      <option key={t} value={t}>{TYPE_META[t].label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                <span className={`text-xs font-bold px-2.5 py-1.5 rounded-full shrink-0 ${meta.color}`}>{meta.label}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-end gap-2 shrink-0 pt-5">
            {!isNew && template && (
              <>
                <button onClick={() => onDuplicate(template)} title="Duplicate"
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" >
                  <Copy className="w-4 h-4" />
                </button>
                <button onClick={handleDownload} title="Download source"
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <Download className="w-4 h-4" />
                </button>
                <button onClick={() => onDelete(template)}
                  className="p-2 rounded-lg border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button onClick={handleSave}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${saved ? "bg-green-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}>
              {saved ? <><CheckCircle2 className="w-4 h-4" /> Saved</> : <><Save className="w-4 h-4" /> Save</>}
            </button>
          </div>
        </div>

        {/* Mode toolbar */}
        <div className="flex items-center gap-3 mt-4">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
            <button onClick={() => setMode("source")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${mode === "source" ? "bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-100 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>
              <Code className="w-3.5 h-3.5" /> Source
            </button>
            <button onClick={() => setMode("preview")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${mode === "preview" ? "bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-100 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>
              <Eye className="w-3.5 h-3.5" /> Preview
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-400 ml-1">
            <span>{form.content.length} chars</span>
            <span>·</span>
            <span>{form.content.split("\n").length} lines</span>
            <span>·</span>
            <span>{varCount} variable{varCount !== 1 ? "s" : ""}</span>
          </div>

          {mode === "preview" && form.content && (
            <button onClick={handleDownloadPreview}
              className="ml-auto flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20">
              <Download className="w-3.5 h-3.5" /> Download Preview
            </button>
          )}
        </div>
      </div>

      {/* Main editor body */}
      <div className="flex-1 flex overflow-hidden">
        {mode === "source" ? (
          /* Source editor + variable palette */
          <div className="flex-1 flex overflow-hidden">
            {/* Textarea */}
            <div className="flex-1 flex flex-col p-4 overflow-hidden">
              <textarea
                ref={textareaRef}
                id={`${uid}-content`}
                value={form.content}
                onChange={(e) => set("content", e.target.value)}
                spellCheck={false}
                placeholder={`Write your template here. Use {{VARIABLE}} placeholders for dynamic values.\n\nExample:\nNo. {{PROJECT_ID}}\nDate: {{DATE}}\n\nDear {{L1_CONTRACTOR}},\n\nSub: Letter of Intent for {{PROJECT_NAME}}\n\nWith reference to the above tender, you are hereby informed that your offer has been accepted...`}
                className={`flex-1 w-full rounded-xl border ${errors.content ? "border-red-400 dark:border-red-600" : "border-gray-200 dark:border-gray-600"} bg-white dark:bg-gray-900 text-xs font-mono text-gray-800 dark:text-gray-200 p-4 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 resize-none leading-relaxed transition`}
              />
              {errors.content && (
                <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{errors.content}
                </p>
              )}
            </div>

            {/* Variable palette sidebar */}
            <div className="w-56 shrink-0 border-l border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 overflow-y-auto p-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Variables
              </p>
              <p className="text-xs text-gray-400 mb-3 leading-relaxed">Click to insert at cursor position.</p>
              <div className="space-y-1">
                {varList.map(({ key, hint }) => (
                  <button key={key} onClick={() => insertVar(key)}
                    className="w-full text-left group">
                    <div className={`px-2.5 py-2 rounded-lg border text-xs font-mono transition-colors hover:shadow-sm ${meta.chip}`}>
                      <span className="font-bold">{key}</span>
                      <span className="block text-xs font-sans font-normal opacity-60 mt-0.5 truncate">{hint}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Preview panel — full document layout, no internal scroll, no variables panel */
          <div className="flex-1 overflow-y-auto bg-[#c8c8c8] dark:bg-gray-950">
            {form.content ? (
              <div className="max-w-[760px] mx-auto px-6 py-10">

                {/* ── Document paper — always white, like a printed page ── */}
                <div
                  className="bg-white text-gray-900"
                  style={{ boxShadow: "0 8px 48px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.10)" }}
                >
                  {/* Official header band */}
                  <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white px-12 py-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] opacity-70 mb-1">
                      Government of Maharashtra · Zilla Parishad
                    </p>
                    <p className="text-lg font-bold leading-snug">
                      {form.name || "Untitled Template"}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[11px] opacity-60">Document Type:</span>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/20 border border-white/20">
                        {meta.label}
                      </span>
                      <span className="text-[11px] opacity-50 ml-auto">Office of the Executive Engineer, Pune Division</span>
                    </div>
                  </div>

                  {/* Thin accent line */}
                  <div className="h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400" />

                  {/* Document body — A4-like margins, expands to full content height, no overflow */}
                  <div className="px-14 pt-10 pb-14">
                    <pre
                      className="whitespace-pre-wrap leading-[1.85] text-[13.5px] text-gray-900"
                      style={{ fontFamily: "'Times New Roman', Georgia, 'DejaVu Serif', serif" }}
                    >
                      {previewText}
                    </pre>
                  </div>

                  {/* Document footer rule */}
                  <div className="border-t border-gray-200 mx-10 mb-0" />
                  <div className="px-12 py-4 flex items-center justify-between bg-gray-50/60">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                      {form.name} · {meta.label}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      Zilla Parishad, Pune Division · IIMS
                    </p>
                  </div>
                </div>

                {/* Page bottom clearance */}
                <div className="h-12" />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <FileText className="w-10 h-10 text-gray-400 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No content yet. Switch to Source to start writing.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onCreate }: { onCreate(): void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900/40 p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
        <Layers className="w-8 h-8 text-gray-300 dark:text-gray-600" />
      </div>
      <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-1">Select a template</h3>
      <p className="text-sm text-gray-400 max-w-xs leading-relaxed mb-6">
        Pick a template from the list to edit it, or create a new one.
      </p>
      <button onClick={onCreate}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors shadow-sm">
        <FilePlus className="w-4 h-4" /> New Template
      </button>
    </div>
  );
}

// ─── Template Editor View ──────────────────────────────────────────────────────

export function TemplateEditorView() {
  const [templates,    setTemplates]   = useState<ITemplate[]>(() => store.getTemplates());
  const [selected,     setSelected]    = useState<ITemplate | "new" | null>(null);
  const [search,       setSearch]      = useState("");
  const [typeFilter,   setTypeFilter]  = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<ITemplate | null>(null);
  const [unsavedNext,  setUnsavedNext]  = useState<(() => void) | null>(null);
  // Track whether editor has unsaved changes
  const [isDirty, setIsDirty] = useState(false);

  const reload = useCallback(() => setTemplates(store.getTemplates()), []);

  function safeSelect(action: () => void) {
    if (isDirty) {
      setUnsavedNext(() => action);
    } else {
      action();
    }
  }

  function handleSelectTemplate(t: ITemplate) {
    safeSelect(() => { setSelected(t); setIsDirty(false); });
  }

  function handleCreate() {
    safeSelect(() => { setSelected("new"); setIsDirty(false); });
  }

  function handleSave(form: EditorForm, id?: string) {
    if (id) {
      store.updateTemplate(id, { name: form.name, type: form.type, content: form.content });
      toast.success(`"${form.name}" saved.`);
      reload();
      // Refresh selected so it reflects new values
      const updated = store.getTemplates().find((t) => t.id === id) ?? null;
      setSelected(updated);
    } else {
      const created = store.createTemplate({ name: form.name, type: form.type, content: form.content });
      toast.success(`"${form.name}" created.`);
      reload();
      // Select the newly created template
      const all = store.getTemplates();
      setSelected(all[all.length - 1] ?? null);
    }
    setIsDirty(false);
  }

  function handleDelete(t: ITemplate) {
    setDeleteTarget(t);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    store.deleteTemplate(deleteTarget.id);
    toast.success(`"${deleteTarget.name}" deleted.`);
    setDeleteTarget(null);
    reload();
    if (selected !== "new" && selected?.id === deleteTarget.id) {
      setSelected(null);
      setIsDirty(false);
    }
  }

  function handleDuplicate(t: ITemplate) {
    store.createTemplate({ name: `${t.name} (Copy)`, type: t.type, content: t.content });
    toast.success(`Duplicated as "${t.name} (Copy)".`);
    reload();
    const all = store.getTemplates();
    setSelected(all[all.length - 1] ?? null);
    setIsDirty(false);
  }

  function handleReset() {
    if (!selected || selected === "new") return;
    safeSelect(() => {
      // Re-fetch original from store
      const orig = store.getTemplates().find((t) => t.id === (selected as ITemplate).id) ?? null;
      setSelected(null);
      setTimeout(() => { setSelected(orig); setIsDirty(false); }, 0);
    });
  }

  return (
    <>
      {deleteTarget && (
        <DeleteConfirm tmpl={deleteTarget} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
      )}
      {unsavedNext && (
        <UnsavedConfirm
          onDiscard={() => { setIsDirty(false); unsavedNext(); setUnsavedNext(null); }}
          onCancel={() => setUnsavedNext(null)}
        />
      )}

      <div className="h-screen flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
        {/* Top bar */}
        <header className="shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm px-5 py-3 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-600 to-emerald-700 flex items-center justify-center shadow-sm">
              <FileText className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 dark:text-white leading-none">Template Editor</h1>
              <p className="text-xs text-gray-400 mt-0.5">Manage document templates with live preview</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {isDirty && (
              <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-2.5 py-1 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Unsaved changes
              </span>
            )}
            {selected && selected !== "new" && (
              <button onClick={handleReset}
                className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600">
                <RefreshCw className="w-3.5 h-3.5" /> Reset
              </button>
            )}
            <span className="text-xs text-gray-400 border-l border-gray-200 dark:border-gray-700 pl-3">{templates.length} template{templates.length !== 1 ? "s" : ""}</span>
          </div>
        </header>

        {/* Body: sidebar + editor */}
        <div className="flex-1 flex overflow-hidden">
          <Sidebar
            templates={templates}
            selected={selected}
            search={search}
            setSearch={setSearch}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            onCreate={handleCreate}
            onSelect={handleSelectTemplate}
            isDirty={isDirty}
          />

          {selected === null ? (
            <EmptyState onCreate={handleCreate} />
          ) : (
            <div className="flex-1 flex overflow-hidden" onChange={() => setIsDirty(true)}>
              <EditorPane
                key={selected === "new" ? "new" : (selected as ITemplate).id}
                template={selected === "new" ? null : selected as ITemplate}
                isNew={selected === "new"}
                onSave={handleSave}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
