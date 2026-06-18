"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { ROUTE_ROLES } from "@/constants/route-roles";
import {
  ArrowLeft,
  FileText,
  Trash2,
  Send,
  Plus,
  Eye,
  X,
  Play,
  MapPin,
  Calendar,
  Layers,
  TrendingUp,
  ClipboardList,
  Ruler,
  FileCheck,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { store } from "@/store/iims.store";
import type { IProject } from "@/types/iims.types";

// ── Constants ─────────────────────────────────────────────────────────────────

const STEP_NAMES = [
  "Create Project",
  "Item Sub Work",
  "Lead Statement",
  "Rate Analysis",
  "Measurement Sheet",
  "General Description",
  "Upload Documents",
  "Review & Submit",
] as const;

const STEP_ICONS = [FileText, Layers, TrendingUp, ClipboardList, Ruler, FileCheck, FileText, Send];

function stepName(n: number) {
  return STEP_NAMES[(n - 1) % STEP_NAMES.length] ?? "Create Project";
}

function savedStep(p: IProject) {
  return p.draftData?.currentStep ?? 1;
}

function measurementTotal(p: IProject) {
  return (p.measurements ?? []).reduce((s, m) => s + (m.amount ?? 0), 0);
}

function formatINR(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  const pct = Math.round(((step - 1) / (STEP_NAMES.length - 1)) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">{stepName(step)}</span>
        <span className="text-xs text-gray-400">{step}/{STEP_NAMES.length}</span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Delete confirm dialog ─────────────────────────────────────────────────────

interface DeleteDialogProps {
  draft: IProject;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteDialog({ draft, onConfirm, onCancel }: DeleteDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Delete Draft</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Are you sure you want to delete{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                "{draft.projectName || "Untitled Project"}"
              </span>
              ? This cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
          >
            Delete Draft
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Preview drawer ────────────────────────────────────────────────────────────

interface PreviewDrawerProps {
  draft: IProject;
  onClose: () => void;
  onContinue: () => void;
  onSubmit: () => void;
  onDelete: () => void;
}

function PreviewDrawer({ draft, onClose, onContinue, onSubmit, onDelete }: PreviewDrawerProps) {
  const step = savedStep(draft);
  const total = measurementTotal(draft);
  const generalDesc = draft.draftData?.generalDescription;

  const StepIcon = STEP_ICONS[step - 1] ?? FileText;

  return (
    <>
      {/* backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* drawer */}
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Draft Preview</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* title + badge */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">
              {draft.projectName || "Untitled Project"}
            </h3>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-semibold border border-amber-200 dark:border-amber-700">
                Draft
              </span>
              {draft.workActivity && (
                <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium border border-blue-100 dark:border-blue-800">
                  {draft.workActivity}
                </span>
              )}
              {draft.sanctionYear && (
                <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium">
                  {draft.sanctionYear}
                </span>
              )}
            </div>
          </div>

          {/* Resume step highlight */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <StepIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-blue-500 dark:text-blue-400 font-medium">Saved at</p>
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                Step {step}: {stepName(step)}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-blue-400 ml-auto" />
          </div>

          {/* Step progress */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Wizard Progress</p>
            <div className="space-y-1.5">
              {STEP_NAMES.map((name, idx) => {
                const sn = idx + 1;
                const done = sn < step;
                const active = sn === step;
                return (
                  <div key={sn} className="flex items-center gap-2">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        done
                          ? "bg-green-500 text-white"
                          : active
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-400"
                      }`}
                    >
                      {done ? "✓" : sn}
                    </div>
                    <span
                      className={`text-xs ${
                        done
                          ? "text-green-600 dark:text-green-400 line-through"
                          : active
                          ? "text-blue-700 dark:text-blue-300 font-semibold"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    >
                      {name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Project info grid */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Project Details</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {[
                { icon: FileText, label: "Department", value: draft.departmentName },
                { icon: Calendar, label: "Sanction Year", value: draft.sanctionYear },
                { icon: MapPin, label: "Division", value: draft.division },
                { icon: MapPin, label: "Sub Division", value: draft.subDivision },
                { icon: MapPin, label: "Taluka", value: draft.taluka },
                { icon: MapPin, label: "Gram Panchayat", value: draft.gramPanchayat },
                { icon: FileCheck, label: "SSR Type", value: draft.ssrType },
                { icon: FileCheck, label: "SSR Year", value: draft.ssrYear },
                { icon: FileText, label: "Major Head", value: draft.majorHeadName ? `${draft.majorHeadName} (${draft.majorHeadCode})` : undefined },
                { icon: Layers, label: "Work Demand By", value: draft.workDemandBy },
              ]
                .filter((r) => r.value)
                .map(({ icon: Icon, label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-0.5 leading-snug">{value}</p>
                  </div>
                ))}
            </div>
          </div>

          {/* Sub-works */}
          {(draft.subWorks ?? []).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Sub-Works ({draft.subWorks!.length})
              </p>
              <ul className="space-y-1">
                {draft.subWorks!.map((sw, i) => (
                  <li key={sw.id ?? i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs flex items-center justify-center font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    {sw.name || "(Unnamed)"}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Lead statements */}
          {(draft.leadStatements ?? []).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Lead Statements ({draft.leadStatements!.length})
              </p>
              <div className="border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-gray-500">Material</th>
                      <th className="px-2 py-1.5 text-left text-gray-500">Source</th>
                      <th className="px-2 py-1.5 text-right text-gray-500">Km</th>
                      <th className="px-2 py-1.5 text-right text-gray-500">Calc (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {draft.leadStatements!.map((ls, i) => (
                      <tr key={ls.id ?? i} className="bg-white dark:bg-gray-900">
                        <td className="px-2 py-1.5 text-gray-700 dark:text-gray-300">{ls.materialName}</td>
                        <td className="px-2 py-1.5 text-gray-500 truncate max-w-[80px]">{ls.sourceOfSupply}</td>
                        <td className="px-2 py-1.5 text-right text-gray-600 dark:text-gray-400">{ls.kilometer}</td>
                        <td className="px-2 py-1.5 text-right font-medium text-gray-700 dark:text-gray-300">
                          {ls.calculation.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Rate analysis summary */}
          {(draft.rateAnalysis ?? []).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Rate Analysis ({draft.rateAnalysis!.length} items)
              </p>
              <div className="space-y-1">
                {draft.rateAnalysis!.map((ra, i) => (
                  <div key={ra.id ?? i} className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div className="min-w-0">
                      <span className="text-xs font-mono text-blue-600 dark:text-blue-400 mr-1.5">{ra.itemNumber}</span>
                      <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{ra.itemDescription ?? ra.itemName}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 ml-3 flex-shrink-0">
                      ₹{(ra.totalRate ?? 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Measurements + total */}
          {(draft.measurements ?? []).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Measurements ({draft.measurements!.length} items)
              </p>
              <div className="space-y-1">
                {draft.measurements!.map((ms, i) => (
                  <div key={ms.id ?? i} className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div className="min-w-0">
                      <span className="text-xs font-mono text-blue-600 dark:text-blue-400 mr-1.5">{ms.itemNumber}</span>
                      <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{ms.itemName}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 ml-3 flex-shrink-0">
                      ₹{(ms.amount ?? 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
              {total > 0 && (
                <div className="flex items-center justify-between px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Estimated Total</span>
                  <span className="text-sm font-bold text-blue-800 dark:text-blue-200">{formatINR(total)}</span>
                </div>
              )}
            </div>
          )}

          {/* General description (truncated) */}
          {generalDesc?.technicalNotes && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Technical Notes</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed">
                {generalDesc.technicalNotes}
              </p>
            </div>
          )}

          {/* Saved on */}
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-100 dark:border-gray-700">
            <Calendar className="w-3.5 h-3.5" />
            Saved on {formatDate(draft.createdAt)} · Draft ID: {draft.id}
          </div>
        </div>

        {/* footer actions */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 px-5 py-4 space-y-2">
          <button
            type="button"
            onClick={onContinue}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
          >
            <Play className="w-4 h-4" />
            Continue from Step {savedStep(draft)}: {stepName(savedStep(draft))}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSubmit}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 text-sm font-medium transition-colors"
            >
              <Send className="w-3.5 h-3.5" /> Submit
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function SavedDraftsContent() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<IProject[]>([]);
  const [previewDraft, setPreviewDraft] = useState<IProject | null>(null);
  const [deletingDraft, setDeletingDraft] = useState<IProject | null>(null);

  function reload() {
    const user = store.getCurrentUser();
    const all = store.getDraftProjects(user?.id ?? "");
    // newest first
    setDrafts([...all].reverse());
  }

  useEffect(() => {
    reload();
  }, []);

  // Close preview with Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPreviewDraft(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function continueDraft(draft: IProject) {
    const step = savedStep(draft);
    router.push(`/create-project?draft=${draft.id}&step=${step}`);
  }

  function confirmDelete(draft: IProject) {
    setPreviewDraft(null);
    setDeletingDraft(draft);
  }

  function executeDelete() {
    if (!deletingDraft) return;
    store.deleteDraft(deletingDraft.id);
    setDeletingDraft(null);
    setPreviewDraft(null);
    reload();
    toast.success("Draft deleted successfully");
  }

  function submitDraft(draft: IProject) {
    setPreviewDraft(null);
    if (!confirm(`Submit "${draft.projectName || "this draft"}" for verification? It will move to the approval workflow.`)) return;
    store.submitDraft(draft.id);
    toast.success("Project submitted for verification!", {
      description: `${draft.projectName || "Project"} is now pending at Deputy Engineer.`,
    });
    router.push("/all-projects");
  }

  const readyCount = drafts.filter((d) => savedStep(d) >= 8).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <Link
            href="/dashboard"
            className="mt-0.5 p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Saved Drafts</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Continue editing your saved project drafts or submit them for approval
            </p>
          </div>
          <Link
            href="/create-project"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> New Project
          </Link>
        </div>

        {/* Stats strip */}
        {drafts.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Drafts</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{drafts.length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">In Progress</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">{drafts.length - readyCount}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Ready to Submit</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-0.5">{readyCount}</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {drafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl">
            <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
              <FileText className="w-10 h-10 text-gray-300 dark:text-gray-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No Saved Drafts</h2>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-6 max-w-sm">
              Start a new project estimate. Save at any step and come back later to continue right where you left off.
            </p>
            <Link
              href="/create-project"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" /> Create New Project
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  {["Project", "Department", "Location", "Progress", "Saved On", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {drafts.map((draft) => {
                  const step = savedStep(draft);
                  const total = measurementTotal(draft);
                  return (
                    <tr
                      key={draft.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors group"
                    >
                      {/* Project */}
                      <td className="px-4 py-3.5 max-w-[220px]">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <FileText className="w-4 h-4 text-blue-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 dark:text-gray-200 truncate leading-tight">
                              {draft.projectName || "Untitled Project"}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                              {draft.workActivity || "No activity set"}
                            </p>
                            {total > 0 && (
                              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                                {formatINR(total)}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="px-4 py-3.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {draft.departmentName || "—"}
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-start gap-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-gray-700 dark:text-gray-300">{draft.taluka || "—"}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[120px]">{draft.gramPanchayat || ""}</p>
                          </div>
                        </div>
                      </td>

                      {/* Progress */}
                      <td className="px-4 py-3.5 min-w-[160px]">
                        <ProgressBar step={step} />
                      </td>

                      {/* Saved On */}
                      <td className="px-4 py-3.5 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                        {formatDate(draft.createdAt)}
                        <p className="text-gray-400 dark:text-gray-500">{draft.id}</p>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {/* Continue — primary action */}
                          <button
                            type="button"
                            onClick={() => continueDraft(draft)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors whitespace-nowrap"
                            title={`Continue from Step ${step}`}
                          >
                            <Play className="w-3.5 h-3.5" /> Continue
                          </button>

                          {/* Preview */}
                          <button
                            type="button"
                            onClick={() => setPreviewDraft(draft)}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:text-purple-600 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                            title="Preview draft"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Submit */}
                          <button
                            type="button"
                            onClick={() => submitDraft(draft)}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:text-green-600 hover:border-green-300 dark:hover:border-green-700 transition-colors"
                            title="Submit for verification"
                          >
                            <Send className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => confirmDelete(draft)}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:text-red-600 hover:border-red-300 dark:hover:border-red-700 transition-colors"
                            title="Delete draft"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview Drawer */}
      {previewDraft && (
        <PreviewDrawer
          draft={previewDraft}
          onClose={() => setPreviewDraft(null)}
          onContinue={() => continueDraft(previewDraft)}
          onSubmit={() => submitDraft(previewDraft)}
          onDelete={() => confirmDelete(previewDraft)}
        />
      )}

      {/* Delete Dialog */}
      {deletingDraft && (
        <DeleteDialog
          draft={deletingDraft}
          onConfirm={executeDelete}
          onCancel={() => setDeletingDraft(null)}
        />
      )}
    </div>
  );
}

export default function SavedDraftsPage() {
  return (
    <ProtectedRoute allowedRoles={ROUTE_ROLES.savedDrafts}>
      <SavedDraftsContent />
    </ProtectedRoute>
  );
}
