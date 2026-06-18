"use client";

import { useState, useCallback, useId, useRef } from "react";
import { toast } from "sonner";
import {
  Plus, Search, Edit2, Trash2, X, Check, AlertCircle, FileText, Eye, Code,
  ChevronRight, Copy, Maximize2, Minimize2,
} from "lucide-react";
import { store } from "@/store/iims.store";
import type { ITemplate } from "@/types/iims.types";

// ─── Variable reference ────────────────────────────────────────────────────────

const TEMPLATE_VARIABLES: Record<string, string[]> = {
  dtp: ["{{PROJECT_ID}}", "{{PROJECT_NAME}}", "{{DISTRICT}}", "{{ESTIMATED_COST}}", "{{SCOPE_OF_WORK}}", "{{DURATION}}", "{{DIVISION}}", "{{DATE}}"],
  loa: ["{{PROJECT_ID}}", "{{PROJECT_NAME}}", "{{L1_CONTRACTOR}}", "{{BID_AMOUNT}}", "{{BID_PERCENTAGE}}", "{{COMPLETION_PERIOD}}", "{{WORK_DESCRIPTION}}", "{{ISSUE_DATE}}", "{{TENDER_ID}}", "{{DIVISION}}"],
  work_order: ["{{WO_NUMBER}}", "{{PROJECT_NAME}}", "{{CONTRACTOR_NAME}}", "{{CONTRACTOR_GST}}", "{{CONTRACTOR_ADDRESS}}", "{{CONTRACT_AMOUNT}}", "{{COMMENCEMENT_DATE}}", "{{COMPLETION_DATE}}", "{{SECURITY_DEPOSIT}}", "{{PERFORMANCE_GUARANTEE}}", "{{DIVISION}}"],
  mb: ["{{MB_NUMBER}}", "{{PROJECT_NAME}}", "{{WO_NUMBER}}", "{{MEASUREMENT_DATE}}", "{{JE_NAME}}", "{{TOTAL_WORK_AMOUNT}}", "{{TOTAL_DEDUCTIONS}}", "{{NET_PAYABLE}}", "{{ITEMS_TABLE}}"],
  sanction: ["{{PROJECT_NAME}}", "{{SANCTION_NUMBER}}", "{{SANCTION_DATE}}", "{{APPROVED_AMOUNT}}", "{{PROJECT_ID}}", "{{DIVISION}}", "{{AUTHORITY}}", "{{FINANCIAL_YEAR}}"],
};

const ALL_VARS = ["{{PROJECT_ID}}", "{{PROJECT_NAME}}", "{{DISTRICT}}", "{{DIVISION}}", "{{DATE}}", "{{L1_CONTRACTOR}}", "{{BID_AMOUNT}}", "{{WO_NUMBER}}", "{{CONTRACT_AMOUNT}}", "{{MB_NUMBER}}", "{{NET_PAYABLE}}", "{{ITEMS_TABLE}}"];

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({ tmpl, onConfirm, onCancel }: {
  tmpl: ITemplate; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 px-4">
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
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 mb-5">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{tmpl.name}</p>
          <p className="text-xs text-gray-400 mt-1 font-mono uppercase">{tmpl.type}</p>
          <p className="text-xs text-gray-400 mt-1">{tmpl.content.length} chars</p>
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

// ─── Template Editor Modal ────────────────────────────────────────────────────

interface TmplForm { name: string; type: string; content: string; }

function TemplateEditorModal({ tmpl, onClose, onSave }: {
  tmpl: ITemplate | null; onClose: () => void; onSave: (f: TmplForm, id?: string) => void;
}) {
  const uid    = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isEdit = !!tmpl;
  const [form, setForm] = useState<TmplForm>(() =>
    tmpl ? { name: tmpl.name, type: tmpl.type, content: tmpl.content }
         : { name: "", type: "custom", content: "" }
  );
  const [errors, setErrors] = useState<Partial<Record<keyof TmplForm, string>>>({});
  const [preview, setPreview] = useState(false);
  const [expanded, setExpanded] = useState(false);

  function set<K extends keyof TmplForm>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  }

  function insertVar(v: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const next  = form.content.slice(0, start) + v + form.content.slice(end);
    set("content", next);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + v.length, start + v.length);
    }, 0);
  }

  function validate(): boolean {
    const e: Partial<Record<keyof TmplForm, string>> = {};
    if (!form.name.trim())    e.name    = "Name is required.";
    if (!form.content.trim()) e.content = "Content cannot be empty.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSave(form, tmpl?.id);
  }

  const varList = TEMPLATE_VARIABLES[form.type] ?? ALL_VARS;

  const previewContent = preview
    ? form.content
        .replace(/\{\{PROJECT_NAME\}\}/g, "Nashik Road Bridge Widening")
        .replace(/\{\{PROJECT_ID\}\}/g, "PROJ-0042")
        .replace(/\{\{DATE\}\}/g, new Date().toLocaleDateString("en-IN"))
        .replace(/\{\{L1_CONTRACTOR\}\}/g, "M/s Raj Constructions Pvt Ltd")
        .replace(/\{\{BID_AMOUNT\}\}/g, "₹1,42,50,000")
        .replace(/\{\{WO_NUMBER\}\}/g, "WO/2024/0042")
        .replace(/\{\{DIVISION\}\}/g, "Pune Division ZP")
        .replace(/\{\{NET_PAYABLE\}\}/g, "₹18,37,500")
    : form.content;

  const inp = (err?: string) =>
    `w-full rounded-lg border ${err ? "border-red-400 dark:border-red-600" : "border-gray-200 dark:border-gray-600"} bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition`;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 px-4 py-6 overflow-y-auto`}>
      <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 my-auto ${expanded ? "w-full max-w-5xl" : "w-full max-w-3xl"} transition-all`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {isEdit ? "Edit Template" : "New Template"}
              </h2>
              {isEdit && <p className="text-xs text-gray-400 mt-0.5 font-mono uppercase">{tmpl!.type}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setExpanded((e) => !e)} aria-expanded={expanded} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" title={expanded ? "Collapse" : "Expand"}>
              {expanded ? <Minimize2 className="w-4 h-4" aria-hidden="true" /> : <Maximize2 className="w-4 h-4" aria-hidden="true" />}
            </button>
            <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className={`${expanded ? "grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-700" : "flex flex-col"}`}>
          {/* Left: form fields */}
          <div className={`px-6 py-5 space-y-4 ${expanded ? "col-span-2" : ""}`}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor={`${uid}-name`} className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input id={`${uid}-name`} value={form.name} onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Standard LOA" className={inp(errors.name)} />
                {errors.name && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.name}</p>}
              </div>
              <div>
                <label htmlFor={`${uid}-type`} className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Type</label>
                <select id={`${uid}-type`} value={form.type} onChange={(e) => set("type", e.target.value)}
                  className={`${inp()} appearance-none`}>
                  {["dtp","loa","work_order","mb","sanction","custom"].map((t) => (
                    <option key={t} value={t}>{t.replace("_", " ").toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Editor toolbar */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor={`${uid}-content`} className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Content <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{form.content.length} chars</span>
                  <button onClick={() => setPreview((p) => !p)}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-colors ${preview ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400" : "border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
                    {preview ? <><Eye className="w-3.5 h-3.5" /> Preview</> : <><Code className="w-3.5 h-3.5" /> Source</>}
                  </button>
                </div>
              </div>
              {preview ? (
                <div className="w-full min-h-[220px] rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-4 text-sm font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {previewContent || <span className="text-gray-400 italic">No content yet.</span>}
                </div>
              ) : (
                <textarea
                  id={`${uid}-content`}
                  ref={textareaRef}
                  rows={expanded ? 18 : 12}
                  value={form.content}
                  onChange={(e) => set("content", e.target.value)}
                  placeholder={`Type your template here. Use {{VARIABLE}} placeholders for dynamic values.\n\nExample:\nDear {{L1_CONTRACTOR}},\n\nWith reference to the above tender, you are hereby informed that your offer for {{PROJECT_NAME}} has been accepted...`}
                  className={`${inp(errors.content)} font-mono text-xs resize-none leading-relaxed`}
                />
              )}
              {errors.content && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.content}</p>}
            </div>
          </div>

          {/* Right: variable reference */}
          <div className={`${expanded ? "col-span-1 px-5 py-5" : "px-6 pb-5"}`}>
            <div className={`${expanded ? "" : "border-t border-gray-100 dark:border-gray-700 pt-5"}`}>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Available Variables — click to insert
              </p>
              <div className="flex flex-wrap gap-2">
                {varList.map((v) => (
                  <button key={v} onClick={() => insertVar(v)}
                    className="flex items-center gap-1 text-xs font-mono px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                    <Copy className="w-3 h-3 shrink-0" />
                    {v}
                  </button>
                ))}
              </div>
              {preview && (
                <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Preview Note</p>
                  <p className="text-xs text-amber-600 dark:text-amber-300">Variables shown with sample data. Toggle off to edit.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/60 rounded-b-2xl">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
          <button onClick={handleSubmit} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors">
            {isEdit ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isEdit ? "Save Changes" : "Create Template"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Templates Tab ─────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  dtp:        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  loa:        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  work_order: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  mb:         "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  sanction:   "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  custom:     "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};

function countVars(content: string): number {
  return new Set(content.match(/\{\{[A-Z_]+\}\}/g) ?? []).size;
}

export function TemplatesTab() {
  const [templates,   setTemplates]  = useState<ITemplate[]>(() => store.getTemplates());
  const [search,      setSearch]     = useState("");
  const [typeFilter,  setTypeFilter] = useState("all");
  const [editTmpl,    setEditTmpl]   = useState<ITemplate | null>(null);
  const [createOpen,  setCreateOpen] = useState(false);
  const [deleteTmpl,  setDeleteTmpl] = useState<ITemplate | null>(null);

  const reload = useCallback(() => setTemplates(store.getTemplates()), []);

  const types = Array.from(new Set(templates.map((t) => t.type))).sort();
  const filtered = templates.filter((t) => {
    const matchS = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.type.includes(search.toLowerCase());
    const matchT = typeFilter === "all" || t.type === typeFilter;
    return matchS && matchT;
  });

  function handleSave(data: TmplForm, id?: string) {
    if (id) {
      store.updateTemplate(id, { name: data.name, type: data.type, content: data.content });
      toast.success(`Template "${data.name}" saved.`);
      setEditTmpl(null);
    } else {
      store.createTemplate({ name: data.name, type: data.type, content: data.content });
      toast.success(`Template "${data.name}" created.`);
      setCreateOpen(false);
    }
    reload();
  }

  function handleDelete(t: ITemplate) {
    store.deleteTemplate(t.id);
    toast.success(`"${t.name}" deleted.`);
    setDeleteTmpl(null);
    reload();
  }

  return (
    <>
      {createOpen  && <TemplateEditorModal tmpl={null}    onClose={() => setCreateOpen(false)} onSave={handleSave} />}
      {editTmpl    && <TemplateEditorModal tmpl={editTmpl} onClose={() => setEditTmpl(null)}  onSave={handleSave} />}
      {deleteTmpl  && <DeleteConfirm tmpl={deleteTmpl} onConfirm={() => handleDelete(deleteTmpl)} onCancel={() => setDeleteTmpl(null)} />}

      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Templates", value: templates.length },
            { label: "Template Types",  value: types.length },
            { label: "In View",         value: filtered.length },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates by name or type…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm transition" />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>}
          </div>
          <div className="flex gap-1.5">
            {["all", ...types].map((t) => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${typeFilter === t ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
                {t === "all" ? "All" : t.replace("_", " ").toUpperCase()}
              </button>
            ))}
          </div>
          <button onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> New Template
          </button>
        </div>

        {/* Template cards */}
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center shadow-sm">
            <FileText className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              {search ? `No templates match "${search}".` : "No templates configured."}
            </p>
            <button onClick={() => setCreateOpen(true)}
              className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors mx-auto">
              <Plus className="w-4 h-4" /> Create First Template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map((t) => {
              const varCount = countVars(t.content);
              return (
                <div key={t.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:border-blue-300 dark:hover:border-blue-600 transition-colors group">
                  <div className="flex items-start gap-4 p-5">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center shrink-0 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                      <FileText className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{t.name}</h3>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${TYPE_COLORS[t.type] ?? TYPE_COLORS.custom}`}>
                          {t.type.replace("_", " ").toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 font-mono mb-2 line-clamp-1">{t.id}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed mb-3 whitespace-pre-line">
                        {t.content.slice(0, 200)}{t.content.length > 200 ? "…" : ""}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>{t.content.length} chars</span>
                        <span>{varCount} variable{varCount !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setEditTmpl(t)} title="Edit"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                        <ChevronRight className="w-3 h-3" />
                      </button>
                      <button onClick={() => setDeleteTmpl(t)} title="Delete"
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
