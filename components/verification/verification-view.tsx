"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Send,
  FileText,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  Calendar,
  User,
  MapPin,
  Layers,
  Ruler,
  ClipboardCheck,
  BookOpen,
  Info,
  ShieldCheck,
  ShieldAlert,
  Eye,
  Download,
  ReceiptText,
} from "lucide-react";
import { store } from "@/store/iims.store";
import type { IProject } from "@/types/iims.types";
import { formatINR, formatCr, StatusBadge } from "@/components/dashboard/dash-shared";
import { DE_CHECKLIST, EE_CHECKLIST } from "./checklist-data";
import type { ChecklistItem } from "./checklist-data";

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtDate(s?: string) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return s;
  }
}

function infoRow(label: string, value?: string | number | null) {
  if (value == null || value === "") return null;
  return (
    <div key={label}>
      <dt className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-0.5">{String(value)}</dd>
    </div>
  );
}

function historyDot(action: string) {
  const l = action.toLowerCase();
  if (l.includes("forward") || l.includes("approved") || l.includes("sanction")) return "bg-green-500";
  if (l.includes("return") || l.includes("reject")) return "bg-red-500";
  return "bg-blue-500";
}

// ─── accordion (compact, same as project-details) ────────────────────────────

function Accordion({
  title,
  icon,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
      aria-expanded={open}
      >
        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0" aria-hidden="true">{icon}</span>
        <span className="flex-1 font-semibold text-gray-800 dark:text-gray-100 text-sm">{title}</span>
        {badge && <span className="mr-2">{badge}</span>}
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden="true" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden="true" />}
      </button>
      {open && <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-5">{children}</div>}
    </div>
  );
}

// ─── checklist panel ─────────────────────────────────────────────────────────

interface ChecklistPanelProps {
  items: ChecklistItem[];
  checked: Set<string>;
  onToggle: (id: string) => void;
}

function ChecklistPanel({ items, checked, onToggle }: ChecklistPanelProps) {
  const required = items.filter((i) => i.required);
  const optional = items.filter((i) => !i.required);
  const requiredDone = required.filter((i) => checked.has(i.id)).length;
  const totalDone = items.filter((i) => checked.has(i.id)).length;
  const allRequiredDone = requiredDone === required.length;
  const pct = Math.round((totalDone / items.length) * 100);

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
            {totalDone}/{items.length} items verified
          </span>
          <span className={`text-xs font-semibold ${allRequiredDone ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
            {allRequiredDone ? "Ready to approve" : `${required.length - requiredDone} required remaining`}
          </span>
        </div>
        <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${allRequiredDone ? "bg-green-500" : "bg-blue-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Required items */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Required ({requiredDone}/{required.length})
        </p>
        {required.map((item) => (
          <ChecklistRow key={item.id} item={item} checked={checked.has(item.id)} onToggle={() => onToggle(item.id)} />
        ))}
      </div>

      {/* Optional items */}
      {optional.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Additional ({optional.filter((i) => checked.has(i.id)).length}/{optional.length})
          </p>
          {optional.map((item) => (
            <ChecklistRow key={item.id} item={item} checked={checked.has(item.id)} onToggle={() => onToggle(item.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChecklistRow({ item, checked, onToggle }: { item: ChecklistItem; checked: boolean; onToggle: () => void }) {
  return (
    <label
      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${
        checked
          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
          : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
      }`}
    >
      <div className="flex-shrink-0 mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="sr-only"
        />
        <div
          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
            checked
              ? "bg-green-500 border-green-500"
              : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
          }`}
        >
          {checked && (
            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
              <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${checked ? "text-green-800 dark:text-green-200" : "text-gray-700 dark:text-gray-300"}`}>
          {item.label}
          {!item.required && (
            <span className="ml-1.5 text-xs text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
          )}
        </p>
        {item.hint && !checked && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 italic">{item.hint}</p>
        )}
      </div>
    </label>
  );
}

// ─── action bar ──────────────────────────────────────────────────────────────

interface ActionBarProps {
  role: "Deputy Engineer" | "Executive Engineer";
  allRequiredChecked: boolean;
  remarks: string;
  saving: boolean;
  onApprove: () => void;
  onReturn: () => void;
}

function ActionBar({ role, allRequiredChecked, remarks, saving, onApprove, onReturn }: ActionBarProps) {
  const approveLabel = role === "Deputy Engineer" ? "Verify & Forward to EE" : "Grant Technical Sanction";
  const returnLabel = role === "Deputy Engineer" ? "Return to SE" : "Return to DE";
  const approveDisabled = !allRequiredChecked || saving;

  return (
    <div className="space-y-2">
      {!allRequiredChecked && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Complete all required checklist items before approving.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={onApprove}
        disabled={approveDisabled}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 ${
          approveDisabled
            ? "bg-green-300 dark:bg-green-900 cursor-not-allowed opacity-60"
            : "bg-green-600 hover:bg-green-700 active:bg-green-800 shadow-sm"
        }`}
      >
        {saving
          ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          : <CheckCircle2 className="w-4 h-4" />}
        {approveLabel}
      </button>

      <button
        type="button"
        onClick={onReturn}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500 disabled:opacity-60"
      >
        {saving
          ? <span className="w-4 h-4 border-2 border-red-400/40 border-t-red-500 rounded-full animate-spin" />
          : <XCircle className="w-4 h-4" />}
        {returnLabel}
      </button>
    </div>
  );
}

// ─── main view ───────────────────────────────────────────────────────────────

export function VerificationView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project, setProject] = useState<IProject | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [remarks, setRemarks] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadProject = useCallback(() => {
    const p = store.getProjectById(projectId);
    setProject(p);
    const u = store.getCurrentUser();
    setUserRole(u?.role ?? "");
  }, [projectId]);

  useEffect(() => { loadProject(); }, [loadProject]);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-gray-300 dark:text-gray-600" />
        <p className="text-gray-500 dark:text-gray-400">Project not found.</p>
        <Link href="/all-projects" className="text-blue-600 hover:underline text-sm">← All Projects</Link>
      </div>
    );
  }

  // Role resolution — only DE and EE have a verification screen
  const isDE = userRole === "Deputy Engineer";
  const isEE = userRole === "Executive Engineer";
  const verifyingRole: "Deputy Engineer" | "Executive Engineer" | null =
    isDE ? "Deputy Engineer" : isEE ? "Executive Engineer" : null;

  const checklist = isDE ? DE_CHECKLIST : isEE ? EE_CHECKLIST : [];
  const requiredItems = checklist.filter((i) => i.required);
  const allRequiredChecked = requiredItems.every((i) => checked.has(i.id));

  const { subWorks = [], leadStatements = [], rateAnalysis = [], measurements = [], documents = [], history = [] } = project;
  const measureTotal = measurements.reduce((s, m) => s + (m.amount ?? 0), 0);

  function toggleItem(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleApprove() {
    if (!verifyingRole || !project || saving) return;
    if (!allRequiredChecked) {
      toast.error("Complete all required checklist items before approving.");
      return;
    }
    setSaving(true);
    try {
      if (isDE) {
        const result = store.forwardProject(project.id, "Executive Engineer", remarks || "Verified by DE — forwarding to EE");
        if (!result.ok) { toast.error(result.error); return; }
        toast.success("Verified & forwarded to Executive Engineer");
      } else {
        const result = store.approveProject(project.id, "Cost Approved", remarks || "Technical sanction granted by EE");
        if (!result.ok) { toast.error(result.error); return; }
        toast.success("Technical sanction granted — project is now Cost Approved");
      }
      router.push("/all-projects");
    } finally { setSaving(false); }
  }

  function handleReturn() {
    if (!verifyingRole || !project || saving) return;
    if (!remarks.trim()) {
      toast.error("Remarks are required when returning a project.");
      return;
    }
    setSaving(true);
    try {
      if (isDE) {
        const result = store.rejectProject(project.id, "Sectional Engineer", remarks);
        if (!result.ok) { toast.error(result.error); return; }
        toast.success("Project returned to Sectional Engineer");
      } else {
        const result = store.rejectProject(project.id, "Deputy Engineer", remarks);
      if (!result.ok) { toast.error(result.error); return; }
      toast.success("Project returned to Deputy Engineer");
      }
      router.push("/all-projects");
    } finally { setSaving(false); }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">

      {/* ── Page header ── */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/all-projects"
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {isDE ? "Deputy Engineer Verification" : isEE ? "Executive Engineer Verification" : "Verification"}
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              isDE
                ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"
                : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800"
            }`}>
              {userRole}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{project.id} · {project.projectName}</p>
        </div>
        <Link href={`/project/${project.id}`} className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline">
          <Eye className="w-4 h-4" /> Full Details
        </Link>
      </div>

      {/* ── Role guard banner ── */}
      {!verifyingRole && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
          <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Your role (<strong>{userRole || "Unknown"}</strong>) does not have verification authority for this project.
            Only Deputy Engineers and Executive Engineers can perform verification.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── MAIN — project summary ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Project info card */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">{project.projectName}</h2>
              <StatusBadge status={project.status} />
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              {infoRow("Department", project.departmentName)}
              {infoRow("Work Activity", project.workActivity)}
              {infoRow("Sanction Year", project.sanctionYear)}
              {infoRow("SSR Type", `${project.ssrType} · ${project.ssrYear}`)}
              {infoRow("Division", project.division)}
              {infoRow("Sub-Division", project.subDivision)}
              {infoRow("Taluka", project.taluka)}
              {infoRow("Gram Panchayat", project.gramPanchayat)}
              {infoRow("Major Head", project.majorHeadName ? `${project.majorHeadName} (${project.majorHeadCode})` : undefined)}
              {infoRow("Work Demand By", project.workDemandBy)}
              {infoRow("Created By", project.createdBy)}
              {infoRow("Created At", fmtDate(project.createdAt))}
            </dl>
          </div>

          {/* Financial summary card */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/60">
              <TrendingUp className="w-4 h-4 text-blue-500" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Financial Summary</h3>
            </div>
            <div className="grid grid-cols-3 gap-px bg-gray-100 dark:bg-gray-700 p-px rounded-b-xl overflow-hidden">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20">
                <p className="text-[11px] font-medium text-blue-500 dark:text-blue-400 uppercase tracking-wide mb-1">Estimated</p>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{formatCr(project.estimatedAmount ?? measureTotal)}</p>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20">
                <p className="text-[11px] font-medium text-green-500 dark:text-green-400 uppercase tracking-wide mb-1">Sanctioned</p>
                <p className="text-lg font-bold text-green-700 dark:text-green-300">{project.technicalSanctionAmount ? formatCr(project.technicalSanctionAmount) : "—"}</p>
              </div>
              <div className="text-center p-4 bg-white dark:bg-gray-800">
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Work Portion</p>
                <p className="text-lg font-bold text-gray-700 dark:text-gray-300">{formatCr(measureTotal)}</p>
              </div>
            </div>
          </div>

          {/* Sub-works accordion */}
          {subWorks.length > 0 && (
            <Accordion
              title="Sub-Works"
              icon={<Layers className="w-5 h-5" />}
              badge={<span className="text-xs font-semibold text-gray-500">{subWorks.length}</span>}
              defaultOpen
            >
              <ol className="space-y-2 list-decimal list-inside">
                {subWorks.map((sw, i) => (
                  <li key={sw.id ?? i} className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">{sw.name}</span>
                    {sw.description && <p className="text-xs text-gray-400 mt-0.5 ml-5">{sw.description}</p>}
                  </li>
                ))}
              </ol>
            </Accordion>
          )}

          {/* Lead Statements accordion */}
          {leadStatements.length > 0 && (
            <Accordion
              title="Lead Statements"
              icon={<FileText className="w-5 h-5" />}
              badge={<span className="text-xs font-semibold text-gray-500">{leadStatements.length}</span>}
            >
              <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      {["Material", "Source of Supply", "Km", "Calculation (₹)"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-gray-500 font-semibold uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {leadStatements.map((ls, i) => (
                      <tr key={ls.id ?? i} className="bg-white dark:bg-gray-800">
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300 font-medium">{ls.materialName}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{ls.sourceOfSupply}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{ls.kilometer}</td>
                        <td className="px-3 py-2 font-semibold text-gray-800 dark:text-gray-200">{formatINR(ls.calculation)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Accordion>
          )}

          {/* Rate Analysis accordion */}
          {rateAnalysis.length > 0 && (
            <Accordion
              title="Rate Analysis"
              icon={<ReceiptText className="w-5 h-5" />}
              badge={<span className="text-xs font-semibold text-gray-500">{rateAnalysis.length} items</span>}
            >
              <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      {["Item #", "Description", "Material ₹", "Labour ₹", "Machinery ₹", "Total ₹"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-gray-500 font-semibold uppercase whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {rateAnalysis.map((ra, i) => (
                      <>
                        <tr key={ra.id ?? i} className="bg-white dark:bg-gray-800">
                          <td className="px-3 py-2 font-mono text-blue-600 dark:text-blue-400">{ra.itemNumber}</td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-300 max-w-[180px]">{ra.itemDescription ?? ra.itemName}</td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{formatINR(ra.materialComponents)}</td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{formatINR(ra.laborComponents)}</td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{formatINR(ra.machineryComponents)}</td>
                          <td className="px-3 py-2 font-semibold text-gray-800 dark:text-gray-200">{formatINR(ra.totalRate)}</td>
                        </tr>
                        {ra.remarks && (
                          <tr key={`${ra.id ?? i}-r`} className="bg-amber-50/60 dark:bg-amber-900/10">
                            <td colSpan={6} className="px-3 py-1.5 border-l-2 border-amber-400 text-xs text-amber-700 dark:text-amber-400">
                              {ra.remarks}
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </Accordion>
          )}

          {/* Measurements accordion */}
          {measurements.length > 0 && (
            <Accordion
              title="Measurement Sheet"
              icon={<Ruler className="w-5 h-5" />}
              badge={<span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{formatCr(measureTotal)}</span>}
            >
              <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      {["Item #", "Name", "L", "B", "H", "Qty", "Unit", "Rate ₹", "Amount ₹"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-gray-500 font-semibold uppercase whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {measurements.map((ms, i) => (
                      <tr key={ms.id ?? i} className="bg-white dark:bg-gray-800">
                        <td className="px-3 py-2 font-mono text-blue-600 dark:text-blue-400">{ms.itemNumber}</td>
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300 max-w-[140px] truncate">{ms.itemName}</td>
                        <td className="px-3 py-2 text-gray-500">{ms.length}</td>
                        <td className="px-3 py-2 text-gray-500">{ms.breadth}</td>
                        <td className="px-3 py-2 text-gray-500">{ms.height}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{ms.quantity?.toFixed(3)}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{ms.unit}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{formatINR(ms.rate)}</td>
                        <td className="px-3 py-2 font-semibold text-gray-800 dark:text-gray-200">{formatINR(ms.amount)}</td>
                      </tr>
                    ))}
                    <tr className="bg-blue-50 dark:bg-blue-900/20">
                      <td colSpan={8} className="px-3 py-2 text-right font-semibold text-blue-700 dark:text-blue-300 text-xs">Total</td>
                      <td className="px-3 py-2 font-bold text-blue-800 dark:text-blue-200 text-xs">{formatINR(measureTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Accordion>
          )}

          {/* Documents accordion */}
          {documents.length > 0 && (
            <Accordion
              title="Supporting Documents"
              icon={<FileText className="w-5 h-5" />}
              badge={<span className="text-xs font-semibold text-gray-500">{documents.length}</span>}
            >
              <ul className="space-y-2">
                {documents.map((doc, i) => (
                  <li key={doc.id ?? i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg">
                    <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{doc.name}</p>
                      {doc.uploadedAt && <p className="text-xs text-gray-400">{fmtDate(doc.uploadedAt)}</p>}
                    </div>
                    <div className="flex gap-1">
                      {doc.url && (
                        <a href={doc.url} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                          <Eye className="w-4 h-4" />
                        </a>
                      )}
                      {doc.url && (
                        <a href={doc.url} download={doc.name}
                          className="p-1.5 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Accordion>
          )}

          {/* Audit Trail accordion */}
          {history.length > 0 && (
            <Accordion
              title="Audit Trail"
              icon={<BookOpen className="w-5 h-5" />}
              badge={<span className="text-xs font-semibold text-gray-500">{history.length} entries</span>}
            >
              <div className="space-y-3">
                {[...history].reverse().map((entry, i) => (
                  <div key={entry.id ?? i} className="flex gap-2.5">
                    <div className="flex flex-col items-center">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${historyDot(entry.action)}`} />
                      {i < history.length - 1 && <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700 mt-1" />}
                    </div>
                    <div className="pb-3 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{entry.action}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{entry.performedBy} · {fmtDate(entry.performedAt)}</p>
                      {entry.remarks && (
                        <p className="text-xs text-gray-400 italic mt-1">"{entry.remarks}"</p>
                      )}
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-300 dark:text-gray-600">
                        <span className="truncate">{entry.fromStatus}</span>
                        <span>→</span>
                        <span className="text-gray-500 dark:text-gray-400 truncate">{entry.toStatus}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Accordion>
          )}
        </div>

        {/* ── SIDEBAR — verification panel ── */}
        <div className="space-y-4">

          {/* Verification identity card */}
          <div className={`border rounded-xl p-4 ${
            isDE
              ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
              : isEE
              ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
              : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className={`w-5 h-5 ${isDE ? "text-blue-600 dark:text-blue-400" : "text-purple-600 dark:text-purple-400"}`} />
              <h3 className={`text-sm font-bold ${isDE ? "text-blue-800 dark:text-blue-200" : "text-purple-800 dark:text-purple-200"}`}>
                {isDE ? "Deputy Engineer Verification" : isEE ? "Executive Engineer Verification" : "Verification"}
              </h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              {isDE
                ? "Review the cost estimate for technical accuracy. Verify measurements, rates, and documents before forwarding to the Executive Engineer."
                : isEE
                ? "Review the estimate for compliance with technical standards. Grant Technical Sanction to unlock DTP preparation."
                : "This verification screen is intended for Deputy Engineers and Executive Engineers."}
            </p>
          </div>

          {/* Checklist */}
          {verifyingRole && checklist.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4" /> Verification Checklist
              </h3>
              <ChecklistPanel items={checklist} checked={checked} onToggle={toggleItem} />
            </div>
          )}

          {/* Remarks */}
          {verifyingRole && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Verification Remarks
                {!allRequiredChecked && <span className="ml-1 text-xs font-normal text-gray-400">(required to return)</span>}
              </label>
              <textarea
                rows={5}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add detailed remarks about the verification findings, discrepancies found, or special observations…"
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 placeholder:text-gray-400 transition-colors"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                {remarks.length} characters · Remarks are <strong>mandatory</strong> when returning.
              </p>
            </div>
          )}

          {/* Action buttons */}
          {verifyingRole && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Actions</h3>
              <ActionBar
                role={verifyingRole}
                allRequiredChecked={allRequiredChecked}
                remarks={remarks}
                saving={saving}
                onApprove={handleApprove}
                onReturn={handleReturn}
              />
            </div>
          )}

          {/* Sidebar: project quick info */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" /> Quick Reference
            </h3>
            <dl className="space-y-2.5">
              <div>
                <dt className="text-xs text-gray-400">Current Status</dt>
                <dd className="mt-0.5"><StatusBadge status={project.status} /></dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Created By</dt>
                <dd className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-0.5 flex items-center gap-1">
                  <User className="w-3 h-3" /> {project.createdBy}
                </dd>
              </div>
              {project.taluka && (
                <div>
                  <dt className="text-xs text-gray-400">Location</dt>
                  <dd className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {project.taluka}{project.gramPanchayat ? `, ${project.gramPanchayat}` : ""}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-gray-400">Sanction Year</dt>
                <dd className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-0.5 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {project.sanctionYear}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Estimate</dt>
                <dd className="text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                  {formatCr(project.estimatedAmount ?? measureTotal)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
