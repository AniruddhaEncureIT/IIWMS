"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Eye,
  Edit2,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  Trash2,
  Check,
  RotateCcw,
  IndianRupee,
  ClipboardList,
  Ruler,
  TrendingDown,
  FileText,
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { store } from "@/store/iims.store";
import { validateMBVerify, validateMBApprove } from "@/constants/workflow-transitions";
import type {
  IProject,
  IMBData,
  IMBMeasurement,
  IDeductions,
} from "@/types/iims.types";
import { formatINR, StatusBadge } from "@/components/dashboard/dash-shared";

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtDate(s?: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function genMbNumber(projectId: string, count: number) {
  return `MB/${projectId.slice(-4).toUpperCase()}/${String(count + 1).padStart(3, "0")}`;
}

function statusColor(s: string) {
  if (s.includes("Approved") || s.includes("Accepted by Contractor")) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (s.includes("Returned") || s.includes("Rejected"))  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  if (s.includes("DE"))             return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  if (s.includes("Contractor"))     return "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400";
  if (s.includes("EE"))             return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400";
  if (s === "Draft")                return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
  return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
}

function mbStatusLabel(s: string): string {
  if (s === "Draft")                                                      return "Draft";
  if (s.includes("Submitted"))                                            return "Pending Measurement Verification";
  if (s.includes("Returned by DE"))                                       return "Returned by Deputy Engineer";
  if (s.includes("Verified by DE") || s === "Pending Contractor Acceptance") return "Pending Contractor Acceptance";
  if (s.includes("Rejected by Contractor"))                               return "Rejected by Contractor";
  if (s.includes("Returned by Contractor"))                               return "Returned by Contractor";
  if (s.includes("Accepted by Contractor") || s.includes("Returned by EE")) return "Pending Measurement Approval";
  if (s.includes("Approved by EE") || s.includes("Returned by Auditor")) return "Pending Auditor Review";
  if (s.includes("Verified by Auditor") || s.includes("Returned by Accountant")) return "Ready for Billing";
  if (s.includes("Verified by Accountant") || s.includes("Returned by AAO")) return "Pending Bill Verification";
  if (s.includes("Verified by AAO") || s.includes("Returned by CAFO"))   return "Pending Bill Approval";
  if (s.includes("Verified by CAFO") || s.includes("Returned by ACEO"))  return "Pending ACEO Bill Review";
  if (s.includes("Verified by ACEO") || s.includes("Returned by CEO"))   return "Pending CEO Final Approval";
  if (s === "Bill Paid")                                                  return "Project Completed";
  return s;
}

// ─── Measurement Row (form state) ─────────────────────────────────────────────

interface MeasRow {
  id: string;
  itemNo: string;
  description: string;
  date: string;
  length: string;
  breadth: string;
  height: string;
  rate: string;
}

function calcQty(r: MeasRow): number {
  const l = parseFloat(r.length) || 0;
  const b = parseFloat(r.breadth) || 1;
  const h = parseFloat(r.height) || 1;
  return Math.round(l * b * h * 1000) / 1000;
}

function calcAmt(r: MeasRow): number {
  return Math.round(calcQty(r) * (parseFloat(r.rate) || 0) * 100) / 100;
}

function newRow(): MeasRow {
  return {
    id: `R${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    itemNo: "",
    description: "",
    date: today(),
    length: "",
    breadth: "",
    height: "",
    rate: "",
  };
}

// ─── Approval Chain ───────────────────────────────────────────────────────────

const CHAIN_STEPS = ["SE", "DE", "Contractor", "EE", "Auditor", "Accountant", "AAO", "CAFO", "ACEO", "CEO"] as const;

function mbChainIndex(status: string): number {
  if (status === "Draft")                                                                     return 0;
  if (status === "Pending Measurement Verification" || status.includes("Submitted") || status.includes("Returned by DE")) return 2;
  if (status.includes("Verified by DE") || status.includes("Pending Contractor") ||
      status.includes("Rejected by Contractor") || status.includes("Returned by Contractor")) return 3;
  if (status === "Pending Measurement Approval" || status.includes("Accepted by Contractor") || status.includes("Returned by EE")) return 4;
  if (status.includes("Approved by EE") || status.includes("Returned by Auditor"))           return 5;
  if (status.includes("Verified by Auditor") || status.includes("Returned by Accountant"))   return 6;
  if (status.includes("Verified by Accountant") || status.includes("Returned by AAO"))       return 7;
  if (status.includes("Verified by AAO") || status.includes("Returned by CAFO"))             return 8;
  if (status.includes("Verified by CAFO") || status.includes("Returned by ACEO"))            return 9;
  if (status.includes("Verified by ACEO") || status.includes("Returned by CEO"))             return 10;
  if (status === "Bill Paid")                                                                 return 11;
  return 0;
}

function ApprovalChain({ status }: { status: string }) {
  const active = mbChainIndex(status);
  const isReturned = status.includes("Returned");
  return (
    <div className="flex items-center gap-0">
      {CHAIN_STEPS.map((label, i) => {
        const done    = active > i + 1;
        const current = active === i + 1;
        const ret     = isReturned && active === i + 1;
        return (
          <div key={label} className="flex items-center gap-0 flex-1 min-w-0">
            <div className="flex flex-col items-center shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                done    ? "bg-green-500 border-green-500 text-white" :
                ret     ? "bg-red-500 border-red-500 text-white" :
                current ? "bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/40" :
                          "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400"
              }`}>
                {done ? <Check className="w-3.5 h-3.5" /> : ret ? <XCircle className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <p className={`text-xs mt-1 text-center leading-tight max-w-[70px] ${
                current ? "text-blue-700 dark:text-blue-400 font-semibold" :
                done    ? "text-green-600 dark:text-green-400" :
                          "text-gray-400"
              }`}>{label}</p>
            </div>
            {i < CHAIN_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mt-[-18px] ${done ? "bg-green-400" : "bg-gray-200 dark:bg-gray-700"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Deductions Panel ─────────────────────────────────────────────────────────

interface DeductState {
  itPct: string;
  gstPct: string;
  lcPct: string;
  sdAmt: string;
  mobAmt: string;
  penaltyAmt: string;
}

function calcDeductions(d: DeductState, totalWork: number): IDeductions & { total: number } {
  const it      = totalWork * (parseFloat(d.itPct)  || 0) / 100;
  const gst     = totalWork * (parseFloat(d.gstPct) || 0) / 100;
  const lc      = totalWork * (parseFloat(d.lcPct)  || 0) / 100;
  const sd      = parseFloat(d.sdAmt)      || 0;
  const mob     = parseFloat(d.mobAmt)     || 0;
  const penalty = parseFloat(d.penaltyAmt) || 0;
  const total   = it + gst + lc + sd + mob + penalty;
  return { incomeTax: it, gstTds: gst, labourCess: lc,
           securityDeposit: sd, mobilizationAdvance: mob, penalty, totalDeduction: total, total };
}

const DEFAULT_DEDUCT: DeductState = {
  itPct: "2", gstPct: "2", lcPct: "1", sdAmt: "0", mobAmt: "0", penaltyAmt: "0",
};

function deductFromIMB(d?: IDeductions, totalWork = 0): DeductState {
  if (!d) return DEFAULT_DEDUCT;
  return {
    itPct:     totalWork > 0 ? String(((d.incomeTax / totalWork) * 100).toFixed(2)) : "2",
    gstPct:    totalWork > 0 ? String(((d.gstTds / totalWork) * 100).toFixed(2)) : "2",
    lcPct:     totalWork > 0 ? String(((d.labourCess / totalWork) * 100).toFixed(2)) : "1",
    sdAmt:     String(d.securityDeposit),
    mobAmt:    String(d.mobilizationAdvance),
    penaltyAmt:String(d.penalty),
  };
}

// ─── MB List View ─────────────────────────────────────────────────────────────

function MBListView({
  project, onNew, onOpen, canCreate,
}: {
  project: IProject;
  onNew: () => void;
  onOpen: (id: string) => void;
  canCreate: boolean;
}) {
  const mbs      = project.mbData ?? [];
  const wo       = project.workOrderData;
  const contract = wo?.contractAmount ?? 0;
  const billed   = mbs.reduce((s, m) => s + (m.totalWorkAmount ?? 0), 0);
  const paid     = mbs.filter((m) => m.status.includes("Approved")).reduce((s, m) => s + (m.netPayable ?? 0), 0);

  return (
    <div className="space-y-5">

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Contract Amount",  value: formatINR(contract), color: "blue",   sub: "LOI value" },
          { label: "Total Billed",     value: formatINR(billed),   color: "amber",  sub: `${mbs.length} MB${mbs.length !== 1 ? "s" : ""}` },
          { label: "Net Paid",         value: formatINR(paid),     color: "green",  sub: "Approved MBs" },
          { label: "Balance",          value: formatINR(Math.max(0, contract - billed)), color: "violet", sub: "Remaining work" },
        ].map(({ label, value, color, sub }) => (
          <div key={label}
            className={`bg-white dark:bg-gray-800 rounded-xl border border-${color}-100 dark:border-${color}-900/30 p-4 shadow-sm`}>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
            <p className={`text-lg font-bold text-${color}-700 dark:text-${color}-400`}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Billed % progress */}
      {contract > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
            <span>Work Billed</span>
            <span className="font-semibold">{Math.min(100, Math.round((billed / contract) * 100))}% of contract</span>
          </div>
          <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all"
              style={{ width: `${Math.min(100, (billed / contract) * 100)}%` }} />
          </div>
        </div>
      )}

      {/* MB table */}
      {mbs.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <ClipboardList className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">No measurement books yet</p>
          <p className="text-xs text-gray-400 mt-1">Create the first MB to start billing</p>
          {canCreate && (
            <button onClick={onNew}
              className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors mx-auto">
              <Plus className="w-4 h-4" /> New MB
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                  {["MB Number", "Date", "Items", "Work Amount", "Net Payable", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {mbs.map((mb) => (
                  <tr key={mb.id}
                    onClick={() => onOpen(mb.id)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-blue-700 dark:text-blue-400 text-xs">{mb.mbNumber}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{fmtDate(mb.recordEntryDate)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{mb.measurements.length}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">{formatINR(mb.totalWorkAmount ?? 0)}</td>
                    <td className="px-4 py-3 font-semibold text-green-700 dark:text-green-400 whitespace-nowrap">{formatINR(mb.netPayable ?? 0)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor(mb.status)}`}>{mbStatusLabel(mb.status)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MB Form View (create / edit draft) ──────────────────────────────────────

function MBFormView({
  project, editMb, onSaved, onCancel,
}: {
  project: IProject;
  editMb: IMBData | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const mbs = project.mbData ?? [];

  // ── form state
  const [mbNumber]          = useState(() =>
    editMb?.mbNumber ?? genMbNumber(project.id, mbs.length)
  );
  const [billType,   setBillType]   = useState<"First and Final Bill" | "RA Bill" | "">(
    editMb?.billType ?? ""
  );
  const [billTypeConfirmed, setBillTypeConfirmed] = useState(!!editMb?.billType);
  const [entryDate,  setEntryDate]  = useState(editMb?.recordEntryDate?.slice(0, 10) ?? today());
  const [rows,       setRows]       = useState<MeasRow[]>(() => {
    if (!editMb || editMb.measurements.length === 0) return [newRow()];
    return editMb.measurements.map((m) => ({
      id: m.id, itemNo: m.itemNo, description: m.description,
      date: m.dateOfMeasurement?.slice(0, 10) ?? today(),
      length:  String(m.length), breadth: String(m.breadth),
      height:  String(m.height), rate:    String(m.rate),
    }));
  });
  const [deduct, setDeduct] = useState<DeductState>(() =>
    deductFromIMB(editMb?.deductions, editMb?.totalWorkAmount ?? 0)
  );
  const [remarks, setRemarks] = useState("");
  const [saving,  setSaving]  = useState(false);
  const [measError, setMeasError] = useState(false);

  // ── computed
  const totalWork = rows.reduce((s, r) => s + calcAmt(r), 0);
  const ded       = calcDeductions(deduct, totalWork);
  const netPay    = Math.max(0, totalWork - ded.total);

  // ── row operations
  function addRow() { setRows((r) => [...r, newRow()]); }
  function removeRow(id: string) {
    if (rows.length === 1) { toast.error("At least one measurement row is required."); return; }
    setRows((r) => r.filter((x) => x.id !== id));
  }
  function updateRow(id: string, field: keyof MeasRow, val: string) {
    if (measError) setMeasError(false);
    setRows((r) => r.map((x) => x.id === id ? { ...x, [field]: val } : x));
  }
  function setDeductField(field: keyof DeductState, val: string) {
    setDeduct((d) => ({ ...d, [field]: val }));
  }

  // ── build payload
  function buildMB(status: string): IMBData {
    const measurements: IMBMeasurement[] = rows.map((r, i) => {
      const qty = calcQty(r);
      const amt = calcAmt(r);
      return {
        id:                   r.id,
        itemNo:               r.itemNo || String(i + 1),
        description:          r.description,
        dateOfMeasurement:    r.date,
        length:               parseFloat(r.length) || 0,
        breadth:              parseFloat(r.breadth) || 1,
        height:               parseFloat(r.height) || 1,
        quantity:             qty,
        cumulativeQuantity:   qty,
        balanceQuantity:      0,
        rate:                 parseFloat(r.rate) || 0,
        itemAmount:           amt,
        runningBillTotal:     totalWork,
      };
    });
    const now = new Date().toISOString();
    const base = editMb ?? {};
    return {
      ...base,
      id:              editMb?.id ?? `MB${Date.now()}`,
      mbNumber,
      billType:        billType as "First and Final Bill" | "RA Bill",
      recordEntryDate: entryDate,
      measurements,
      deductions:      { incomeTax: ded.incomeTax, gstTds: ded.gstTds, labourCess: ded.labourCess,
                         securityDeposit: ded.securityDeposit, mobilizationAdvance: ded.mobilizationAdvance,
                         penalty: ded.penalty, totalDeduction: ded.total },
      totalWorkAmount: totalWork,
      netPayable:      netPay,
      status,
      remarks:         remarks.trim() ? [...(editMb?.remarks ?? []), remarks.trim()] : (editMb?.remarks ?? []),
      createdBy:       editMb?.createdBy ?? store.getCurrentUser()?.name ?? "Unknown",
      createdAt:       editMb?.createdAt ?? now,
      currentApprover: status === "Draft" ? undefined : "Deputy Engineer",
    };
  }

  function saveMb(status: string) {
    if (!billType) { toast.error("Please select a Bill Type before saving."); return; }
    if (status !== "Draft" && !rows.some((r) => calcQty(r) > 0 && calcAmt(r) > 0)) {
      setMeasError(true);
      toast.error("Measurement Book must contain at least one valid measurement.");
      return;
    }
    const mb     = buildMB(status);
    const others = mbs.filter((m) => m.id !== mb.id);
    store.updateProject(project.id, { mbData: [...others, mb] });
    if (status !== "Draft") {
      const fwdResult = store.forwardProject(
        project.id,
        "Deputy Engineer",
        "Measurement book submitted for DE verification",
        "Pending Measurement Verification"
      );
      if (!fwdResult.ok) { toast.error(fwdResult.error); return; }
    }
    toast.success(status === "Draft" ? "MB saved as draft." : "MB submitted to Deputy Engineer.");
    onSaved();
  }

  async function handleSave(status: string) {
    setSaving(true);
    try { saveMb(status); } finally { setSaving(false); }
  }

  // ── collapsible deductions
  const [dedOpen, setDedOpen] = useState(true);

  // ── Project-closed guard ───────────────────────────────────────────────────
  const isProjectClosed = project.status === "Project Closed" || project.status === "Project Completed";
  if (isProjectClosed) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-12 text-center">
        <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Project Completed</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">This project is locked. No new measurement books can be created or edited.</p>
        <button onClick={onCancel}
          className="mt-5 px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          ← Back
        </button>
      </div>
    );
  }

  // ── Bill Type selection gate ───────────────────────────────────────────────
  if (!billTypeConfirmed) {
    return (
      <div className="space-y-5">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-700/40">
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Select Bill Type</h3>
            <span className="ml-2 text-xs text-red-500">* Required before proceeding</span>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
              Select the type of bill for this Measurement Book. This selection is mandatory and cannot be changed after saving.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(["First and Final Bill", "RA Bill"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setBillType(type)}
                  className={`flex flex-col items-start gap-2 p-5 rounded-xl border-2 text-left transition-all ${
                    billType === type
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-600 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-700/40"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    billType === type ? "border-blue-500 bg-blue-500" : "border-gray-300 dark:border-gray-500"
                  }`}>
                    {billType === type && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{type}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {type === "First and Final Bill"
                      ? "Single final bill on completion of the entire work."
                      : "Running / interim bill for work completed up to this stage."}
                  </p>
                </button>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={onCancel}
                className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!billType) { toast.error("Please select a Bill Type."); return; }
                  setBillTypeConfirmed(true);
                }}
                disabled={!billType}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" /> Proceed to E-MB Entry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Bill Type badge */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl text-sm">
        <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
        <span className="text-blue-800 dark:text-blue-200 font-medium">Bill Type:</span>
        <span className="font-semibold text-blue-700 dark:text-blue-300">{billType}</span>
      </div>

      {/* Header info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              MB Number <span className="text-blue-500">(auto)</span>
            </label>
            <p className="font-mono font-bold text-blue-700 dark:text-blue-400 text-sm px-3 py-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              {mbNumber}
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Record Entry Date <span className="text-red-500">*</span>
            </label>
            <input type="date" value={entryDate} max={today()} onChange={(e) => setEntryDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition" />
          </div>
        </div>
      </div>

      {/* Measurements table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-700/40">
          <Ruler className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Measurement Entries</h3>
          <span className="ml-auto text-xs text-gray-400">{rows.length} item{rows.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700">
                {["No.", "Description", "Date", "L (m)", "B (m)", "H / Nos", "Qty", "Rate (₹)", "Amount (₹)", ""].map((h) => (
                  <th key={h} className="px-2 py-2.5 text-left font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap first:pl-4 last:pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40">
              {rows.map((r, i) => {
                const qty = calcQty(r);
                const amt = calcAmt(r);
                return (
                  <tr key={r.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/20">
                    <td className="pl-4 py-2 w-10">
                      <input value={r.itemNo} onChange={(e) => updateRow(r.id, "itemNo", e.target.value)}
                        placeholder={String(i + 1)}
                        className="w-10 text-center rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-1 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500/40 focus:border-blue-500 transition-colors" />
                    </td>
                    <td className="px-2 py-2">
                      <input value={r.description} onChange={(e) => updateRow(r.id, "description", e.target.value)}
                        placeholder="Work description…"
                        className="w-48 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500/40 focus:border-blue-500 transition-colors" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="date" value={r.date} onChange={(e) => updateRow(r.id, "date", e.target.value)}
                        className="w-32 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500/40 focus:border-blue-500 transition-colors" />
                    </td>
                    {(["length", "breadth", "height"] as const).map((f) => (
                      <td key={f} className="px-2 py-2">
                        <input type="number" min="0" step="0.001"
                          value={r[f]} onChange={(e) => updateRow(r.id, f, e.target.value)}
                          placeholder="1"
                          className="w-16 text-right rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500/40 focus:border-blue-500 transition-colors" />
                      </td>
                    ))}
                    <td className="px-2 py-2 text-right font-semibold text-gray-700 dark:text-gray-200 w-16">
                      {qty > 0 ? qty.toFixed(3) : "—"}
                    </td>
                    <td className="px-2 py-2">
                      <div className="relative">
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                        <input type="number" min="0" step="0.01"
                          value={r.rate} onChange={(e) => updateRow(r.id, "rate", e.target.value)}
                          placeholder="0"
                          className="w-24 pl-5 pr-2 py-1.5 text-right rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500/40 focus:border-blue-500 transition-colors" />
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap w-28">
                      {amt > 0 ? formatINR(amt) : "—"}
                    </td>
                    <td className="pr-4 py-2">
                      <button onClick={() => removeRow(r.id)}
                        className="p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add row + subtotal */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <button onClick={addRow}
            className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add measurement row
          </button>
          <div className="text-sm font-bold text-gray-800 dark:text-gray-100">
            Total Work: <span className="text-blue-700 dark:text-blue-400 ml-1">{formatINR(totalWork)}</span>
          </div>
        </div>
      </div>

      {measError && (
        <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1.5 px-1">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          Measurement Book must contain at least one valid measurement.
        </p>
      )}

      {/* Deductions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <button type="button" onClick={() => setDedOpen((o) => !o)}
          className="w-full flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-700/40 text-left">
          <TrendingDown className="w-4 h-4 text-red-500" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex-1">Deductions</span>
          <span className="text-xs font-semibold text-red-600 dark:text-red-400">{formatINR(ded.total)}</span>
          {dedOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {dedOpen && (
          <div className="p-5 space-y-4">
            {/* % deductions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {([
                { label: "Income Tax %",  field: "itPct"  as const, color: "red",    computed: ded.incomeTax },
                { label: "GST TDS %",     field: "gstPct" as const, color: "orange", computed: ded.gstTds },
                { label: "Labour Cess %", field: "lcPct"  as const, color: "amber",  computed: ded.labourCess },
              ]).map(({ label, field, color, computed }) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">{label}</label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input type="number" min="0" max="100" step="0.01"
                        value={deduct[field]} onChange={(e) => setDeductField(field, e.target.value)}
                        className="w-full pr-6 pl-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition" />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                    </div>
                    <span className={`text-xs font-semibold text-${color}-600 dark:text-${color}-400 whitespace-nowrap`}>
                      = {formatINR(computed)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {/* flat deductions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {([
                { label: "SD Deduction (₹)",     field: "sdAmt"      as const, computed: ded.securityDeposit },
                { label: "Mob. Advance Rec. (₹)", field: "mobAmt"     as const, computed: ded.mobilizationAdvance },
                { label: "Penalty (₹)",           field: "penaltyAmt" as const, computed: ded.penalty },
              ]).map(({ label, field, computed }) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">{label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                    <input type="number" min="0" step="1"
                      value={deduct[field]} onChange={(e) => setDeductField(field, e.target.value)}
                      className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition" />
                  </div>
                  <p className="text-xs text-red-500 mt-0.5">{computed > 0 ? `- ${formatINR(computed)}` : ""}</p>
                </div>
              ))}
            </div>
            {/* Deductions summary */}
            <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-1.5">
              {[
                { label: "Total Work Amount", val: totalWork, bold: false },
                { label: "(-) Total Deductions", val: -ded.total, bold: false },
              ].map(({ label, val, bold }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className={`text-gray-500 dark:text-gray-400 ${bold ? "font-semibold" : ""}`}>{label}</span>
                  <span className={`${val < 0 ? "text-red-600 dark:text-red-400" : "text-gray-800 dark:text-gray-200"} ${bold ? "font-bold" : "font-semibold"}`}>
                    {val < 0 ? `- ${formatINR(Math.abs(val))}` : formatINR(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Net Payable banner */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-5 text-white shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold opacity-80 uppercase tracking-wide">Net Amount Payable</p>
              <p className="text-xs opacity-70 mt-0.5">After all deductions</p>
            </div>
          </div>
          <p className="text-3xl font-bold">{formatINR(netPay)}</p>
        </div>
        <div className="mt-3 pt-3 border-t border-white/20 flex gap-8 text-xs opacity-80">
          <span>Work: {formatINR(totalWork)}</span>
          <span>Deductions: {formatINR(ded.total)}</span>
          <span>Net: {formatINR(netPay)}</span>
        </div>
      </div>

      {/* Remarks */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          Remarks
        </label>
        <textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)}
          placeholder="Any notes or observations for this MB…"
          className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 resize-none transition" />
      </div>

      {/* Actions */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm flex flex-wrap gap-3">
        <button onClick={onCancel} disabled={saving}
          className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60">
          Cancel
        </button>
        <button onClick={() => handleSave("Draft")} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60">
          <FileText className="w-4 h-4" /> Save Draft
        </button>
        <button onClick={() => handleSave("Pending Measurement Verification")} disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
          {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
          Submit to Deputy Engineer
        </button>
        <div className="ml-auto text-sm text-gray-400 flex items-center gap-2">
          <IndianRupee className="w-4 h-4" />
          Net Payable: <strong className="text-green-700 dark:text-green-400">{formatINR(netPay)}</strong>
        </div>
      </div>
    </div>
  );
}

// ─── Contractor Accept Checkbox ───────────────────────────────────────────────

function ContractorAcceptCheckbox({
  checked, onChange,
}: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div
        onClick={() => onChange(!checked)}
        className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
          checked
            ? "bg-teal-600 border-teal-600"
            : "border-gray-300 dark:border-gray-500 group-hover:border-teal-400"
        }`}>
        {checked && <Check className="w-3 h-3 text-white" />}
      </div>
      <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 select-none">
        I Accept — I confirm the above measurement details and bill amounts are correct.
      </span>
    </label>
  );
}

// ─── MB Detail View ───────────────────────────────────────────────────────────

function MBDetailView({
  project, mb, role, onBack, onEdit, onUpdated,
}: {
  project: IProject;
  mb: IMBData;
  role: string;
  onBack: () => void;
  onEdit: () => void;
  onUpdated: () => void;
}) {
  const [remark,             setRemark]            = useState("");
  const [saving,             setSaving]            = useState(false);
  const [dedOpen,            setDedOpen]           = useState(false);
  const [contractorAccepted, setContractorAccepted] = useState(false);
  const [audDedState, setAudDedState] = useState<DeductState>(() =>
    deductFromIMB(mb.deductions, mb.totalWorkAmount ?? 0)
  );
  const [budgetHead,  setBudgetHead]  = useState(mb.budgetHead ?? "");

  const isDE          = role === "Deputy Engineer";
  const isEE          = role === "Executive Engineer";
  const isContractor  = role === "Contractor";
  const isAuditor     = role === "Auditor";
  const isAccountant  = role === "Accountant";
  const isAAO         = role === "Assistant Accounts Officer";
  const isCAFO        = role === "Chief Accounts and Finance Officer";
  const isACEO        = role === "Additional Chief Executive Officer";
  const isCEO         = role === "Chief Executive Officer";
  const isDraft       = mb.status === "Draft";
  const isCreator     = !isDE && !isEE && !isContractor && !isAuditor && !isAccountant && !isAAO && !isCAFO && !isACEO && !isCEO;
  const isProjectClosed = project.status === "Project Closed" || project.status === "Project Completed";

  function patchMb(patch: Partial<IMBData>) {
    const mbs = project.mbData ?? [];
    const next = mbs.map((m) => m.id === mb.id ? { ...m, ...patch } : m);
    store.updateProject(project.id, { mbData: next });
  }

  function addHistory(action: string, from: string, to: string) {
    const updated = store.getProjectById(project.id);
    if (!updated) return;
    store.updateProject(project.id, {
      history: [
        ...(updated.history ?? []),
        { id: `H${Date.now()}`, action, performedBy: store.getCurrentUser()?.name ?? "Unknown",
          performedAt: new Date().toISOString(), fromStatus: from, toStatus: to, remarks: remark },
      ],
    });
  }

  async function handleAction(action:
    | "verify-de" | "return-de"
    | "accept-contractor" | "reject-contractor"
    | "approve-ee" | "return-ee"
    | "forward-auditor" | "return-auditor"
    | "forward-accountant" | "return-accountant"
    | "forward-aao" | "return-aao"
    | "forward-cafo" | "return-cafo"
    | "forward-aceo" | "return-aceo"
    | "approve-ceo" | "return-ceo"
  ) {
    if (["return-de", "reject-contractor", "return-ee", "return-auditor", "return-accountant",
         "return-aao", "return-cafo", "return-aceo", "return-ceo"].includes(action) && !remark.trim()) {
      toast.error("Remarks required for return."); return;
    }
    if (action === "approve-ceo" && !remark.trim()) {
      toast.error("Remarks required for final approval."); return;
    }

    // Re-read fresh MB state from the store to prevent duplicate execution
    // and catch any status change since the component last rendered.
    const freshProject = store.getProjectById(project.id);
    const freshMb = (freshProject?.mbData ?? []).find((m) => m.id === mb.id);
    if (!freshMb) { toast.error("MB record not found. Please refresh the page."); return; }

    const user = store.getCurrentUser();
    if (action === "verify-de") {
      const v = validateMBVerify(user?.role ?? "", freshMb.status);
      if (!v.ok) { toast.error(v.error); return; }
    }
    if (action === "approve-ee") {
      const v = validateMBApprove(user?.role ?? "", freshMb.status);
      if (!v.ok) { toast.error(v.error); return; }
    }

    setSaving(true);
    const now = new Date().toISOString();
    const from = mb.status;
    try {
      if (action === "verify-de") {
        patchMb({ status: "Verified by DE", currentApprover: "Contractor",
                  deVerifiedBy: store.getCurrentUser()?.name, deVerifiedAt: now,
                  remarks: remark.trim() ? [...(mb.remarks ?? []), `DE: ${remark}`] : mb.remarks });
        const fwdResult = store.forwardProject(
          project.id,
          "Contractor",
          remark.trim() || "Measurement book verified by DE — pending contractor acceptance",
          "Pending Contractor Acceptance"
        );
        if (!fwdResult.ok) { toast.error(fwdResult.error); return; }
        addHistory("MB Verified by DE", from, "Verified by DE");
        toast.success("MB verified and forwarded to Contractor.");
      } else if (action === "return-de") {
        patchMb({ status: "Returned by DE", currentApprover: "Sectional Engineer",
                  remarks: [...(mb.remarks ?? []), `DE returned: ${remark}`] });
        const rejResult = store.rejectProject(
          project.id,
          "Sectional Engineer",
          remark,
          "Work Order Issued"
        );
        if (!rejResult.ok) { toast.error(rejResult.error); return; }
        addHistory("MB Returned by DE", from, "Returned by DE");
        toast.success("MB returned to Sectional Engineer.");
      } else if (action === "accept-contractor") {
        patchMb({ status: "Pending Measurement Approval", acceptedByContractor: true,
                  contractorAcceptedAt: now, currentApprover: "Executive Engineer",
                  remarks: remark.trim() ? [...(mb.remarks ?? []), `Contractor accepted: ${remark}`] : mb.remarks });
        const fwdResult = store.forwardProject(
          project.id,
          "Executive Engineer",
          remark.trim() || "Measurement book accepted by Contractor — forwarded to Executive Engineer",
          "Pending Measurement Approval"
        );
        if (!fwdResult.ok) { toast.error(fwdResult.error); return; }
        addHistory("MB Accepted by Contractor", from, "Pending Measurement Approval");
        toast.success("MB accepted — forwarded to Executive Engineer.");

      } else if (action === "reject-contractor") {
        patchMb({ status: "Rejected by Contractor", acceptedByContractor: false,
                  currentApprover: "Deputy Engineer",
                  remarks: [...(mb.remarks ?? []), `Contractor rejected: ${remark}`] });
        const rejResult = store.rejectProject(
          project.id,
          "Deputy Engineer",
          remark,
          "Pending Measurement Verification"
        );
        if (!rejResult.ok) { toast.error(rejResult.error); return; }
        addHistory("MB Rejected by Contractor", from, "Rejected by Contractor");
        toast.success("MB not accepted — returned to Deputy Engineer.");

      } else if (action === "approve-ee") {
        patchMb({ status: "Approved by EE", currentApprover: undefined,
                  eeVerifiedBy: store.getCurrentUser()?.name, eeVerifiedAt: now,
                  remarks: remark.trim() ? [...(mb.remarks ?? []), `EE: ${remark}`] : mb.remarks });
        const appResult = store.approveProject(
          project.id,
          "Pending Auditor Review",
          remark.trim() || "Measurement book approved by EE — forwarding for auditor review"
        );
        if (!appResult.ok) { toast.error(appResult.error); return; }
        addHistory("MB Approved by EE", from, "Approved by EE");
        toast.success("MB approved — forwarded to Auditor.");
      } else if (action === "return-ee") {
        patchMb({ status: "Returned by EE", currentApprover: "Deputy Engineer",
                  remarks: [...(mb.remarks ?? []), `EE returned: ${remark}`] });
        const rejResult = store.rejectProject(
          project.id,
          "Deputy Engineer",
          remark,
          "Pending Measurement Verification"
        );
        if (!rejResult.ok) { toast.error(rejResult.error); return; }
        addHistory("MB Returned by EE", from, "Returned by EE");
        toast.success("MB returned to Deputy Engineer.");

      } else if (action === "forward-auditor") {
        const ded = calcDeductions(audDedState, mb.totalWorkAmount ?? 0);
        const netPayable = Math.max(0, (mb.totalWorkAmount ?? 0) - ded.total);
        patchMb({
          status: "Verified by Auditor",
          deductions: { ...ded, totalDeduction: ded.total },
          netPayable,
          auditorVerifiedBy: store.getCurrentUser()?.name,
          auditorVerifiedAt: now,
          remarks: remark.trim() ? [...(mb.remarks ?? []), `Auditor: ${remark}`] : mb.remarks,
        });
        const fwdResult = store.forwardProject(
          project.id,
          "Accountant",
          remark.trim() || "Deductions entered and verified by Auditor — forwarded to Accountant",
          "Ready for Billing"
        );
        if (!fwdResult.ok) { toast.error(fwdResult.error); return; }
        addHistory("MB Verified by Auditor", from, "Verified by Auditor");
        toast.success("Deductions saved — forwarded to Accountant.");

      } else if (action === "return-auditor") {
        patchMb({
          status: "Returned by Auditor",
          currentApprover: "Executive Engineer",
          remarks: [...(mb.remarks ?? []), `Auditor returned: ${remark}`],
        });
        const rejResult = store.rejectProject(
          project.id,
          "Executive Engineer",
          remark,
          "Pending Measurement Approval"
        );
        if (!rejResult.ok) { toast.error(rejResult.error); return; }
        addHistory("MB Returned by Auditor", from, "Returned by Auditor");
        toast.success("MB returned to Executive Engineer.");

      } else if (action === "forward-accountant") {
        patchMb({
          status: "Verified by Accountant",
          budgetHead: budgetHead.trim(),
          accountantVerifiedBy: store.getCurrentUser()?.name,
          accountantVerifiedAt: now,
          remarks: remark.trim() ? [...(mb.remarks ?? []), `Accountant: ${remark}`] : mb.remarks,
        });
        const fwdResult = store.forwardProject(
          project.id,
          "Assistant Accounts Officer",
          remark.trim() || "Net payable and budget head verified by Accountant — forwarded to AAO",
          "Pending Bill Verification"
        );
        if (!fwdResult.ok) { toast.error(fwdResult.error); return; }
        addHistory("MB Verified by Accountant", from, "Verified by Accountant");
        toast.success("Verified — forwarded to Assistant Accounts Officer.");

      } else if (action === "return-accountant") {
        patchMb({
          status: "Returned by Accountant",
          currentApprover: "Auditor",
          remarks: [...(mb.remarks ?? []), `Accountant returned: ${remark}`],
        });
        const rejResult = store.rejectProject(
          project.id,
          "Auditor",
          remark,
          "Pending Auditor Review"
        );
        if (!rejResult.ok) { toast.error(rejResult.error); return; }
        addHistory("MB Returned by Accountant", from, "Returned by Accountant");
        toast.success("MB returned to Auditor.");

      } else if (action === "forward-aao") {
        patchMb({
          status: "Verified by AAO",
          aaoVerifiedBy: store.getCurrentUser()?.name,
          aaoVerifiedAt: now,
          remarks: remark.trim() ? [...(mb.remarks ?? []), `AAO: ${remark}`] : mb.remarks,
        });
        const fwdResult = store.forwardProject(
          project.id,
          "Chief Accounts and Finance Officer",
          remark.trim() || "Deductions and payable verified by AAO — forwarded to CAFO",
          "Pending Bill Approval"
        );
        if (!fwdResult.ok) { toast.error(fwdResult.error); return; }
        addHistory("MB Verified by AAO", from, "Verified by AAO");
        toast.success("Verified — forwarded to CAFO.");

      } else if (action === "return-aao") {
        patchMb({
          status: "Returned by AAO",
          currentApprover: "Accountant",
          remarks: [...(mb.remarks ?? []), `AAO returned: ${remark}`],
        });
        const rejResult = store.rejectProject(
          project.id,
          "Accountant",
          remark,
          "Ready for Billing"
        );
        if (!rejResult.ok) { toast.error(rejResult.error); return; }
        addHistory("MB Returned by AAO", from, "Returned by AAO");
        toast.success("MB returned to Accountant.");

      } else if (action === "forward-cafo") {
        patchMb({
          status: "Verified by CAFO",
          cafoVerifiedBy: store.getCurrentUser()?.name,
          cafoVerifiedAt: now,
          remarks: remark.trim() ? [...(mb.remarks ?? []), `CAFO: ${remark}`] : mb.remarks,
        });
        const fwdResult = store.forwardProject(
          project.id,
          "Additional Chief Executive Officer",
          remark.trim() || "Fund availability confirmed and accounts finalised by CAFO — forwarded to Additional CEO",
          "Pending ACEO Bill Review"
        );
        if (!fwdResult.ok) { toast.error(fwdResult.error); return; }
        addHistory("MB Accounts Finalised by CAFO", from, "Verified by CAFO");
        toast.success("Accounts finalised — forwarded to Additional CEO.");

      } else if (action === "return-cafo") {
        patchMb({
          status: "Returned by CAFO",
          currentApprover: "Assistant Accounts Officer",
          remarks: [...(mb.remarks ?? []), `CAFO returned: ${remark}`],
        });
        const rejResult = store.rejectProject(
          project.id,
          "Assistant Accounts Officer",
          remark,
          "Pending Bill Verification"
        );
        if (!rejResult.ok) { toast.error(rejResult.error); return; }
        addHistory("MB Returned by CAFO", from, "Returned by CAFO");
        toast.success("MB returned to Assistant Accounts Officer.");

      } else if (action === "forward-aceo") {
        patchMb({
          status: "Verified by ACEO",
          aceoVerifiedBy: store.getCurrentUser()?.name,
          aceoVerifiedAt: now,
          remarks: remark.trim() ? [...(mb.remarks ?? []), `ACEO: ${remark}`] : mb.remarks,
        });
        const fwdResult = store.forwardProject(
          project.id,
          "Chief Executive Officer",
          remark.trim() || "Administrative approval granted by Additional CEO — forwarded to CEO for final approval",
          "Pending CEO Final Approval"
        );
        if (!fwdResult.ok) { toast.error(fwdResult.error); return; }
        addHistory("MB Approved by Additional CEO", from, "Verified by ACEO");
        toast.success("Administrative approval granted — forwarded to CEO.");

      } else if (action === "return-aceo") {
        patchMb({
          status: "Returned by ACEO",
          currentApprover: "Chief Accounts and Finance Officer",
          remarks: [...(mb.remarks ?? []), `ACEO returned: ${remark}`],
        });
        const rejResult = store.rejectProject(
          project.id,
          "Chief Accounts and Finance Officer",
          remark,
          "Pending Bill Approval"
        );
        if (!rejResult.ok) { toast.error(rejResult.error); return; }
        addHistory("MB Returned by Additional CEO", from, "Returned by ACEO");
        toast.success("MB returned to CAFO.");

      } else if (action === "approve-ceo") {
        const contractAmt    = project.workOrderData?.contractAmount ?? 0;
        const completionPct  = contractAmt > 0
          ? Math.min(100, Math.round(((mb.totalWorkAmount ?? 0) / contractAmt) * 100))
          : 0;
        patchMb({
          status: "Bill Paid",
          locked: true,
          ceoApprovedBy: store.getCurrentUser()?.name,
          ceoApprovedAt: now,
          billPaidAt: now,
          remarks: [...(mb.remarks ?? []), `CEO approved: ${remark}`],
        });
        const appResult = store.approveProject(project.id, "Project Completed", remark);
        if (!appResult.ok) { toast.error(appResult.error); return; }
        store.updateProject(project.id, { completedAt: now, completionPercentage: completionPct });
        addHistory("Project Completed — Bill Paid & MB Locked", from, "Project Completed");
        toast.success(`Bill approved and paid. Completion: ${completionPct}%. MB locked. Project closed.`);

      } else if (action === "return-ceo") {
        patchMb({
          status: "Returned by CEO",
          currentApprover: "Additional Chief Executive Officer",
          remarks: [...(mb.remarks ?? []), `CEO returned: ${remark}`],
        });
        const rejResult = store.rejectProject(
          project.id,
          "Additional Chief Executive Officer",
          remark,
          "Pending ACEO Bill Review"
        );
        if (!rejResult.ok) { toast.error(rejResult.error); return; }
        addHistory("MB Returned by CEO", from, "Returned by CEO");
        toast.success("MB returned to Additional CEO.");
      }
      setRemark("");
      onUpdated();
    } finally { setSaving(false); }
  }

  const d   = mb.deductions;
  const ded = d ?? { incomeTax: 0, gstTds: 0, labourCess: 0, securityDeposit: 0, mobilizationAdvance: 0, penalty: 0 };

  return (
    <div className="space-y-5">

      {/* Header cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Work Amount",    value: formatINR(mb.totalWorkAmount ?? 0), color: "blue" },
          { label: "Deductions",     value: formatINR(d?.totalDeduction ?? 0),  color: "red" },
          { label: "Net Payable",    value: formatINR(mb.netPayable ?? 0),       color: "green" },
          { label: "Measurements",   value: String(mb.measurements.length),      color: "violet" },
        ].map(({ label, value, color }) => (
          <div key={label}
            className={`bg-white dark:bg-gray-800 rounded-xl border border-${color}-100 dark:border-${color}-900/30 p-4 shadow-sm`}>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
            <p className={`text-lg font-bold text-${color}-700 dark:text-${color}-400`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Approval chain */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Approval Progress</p>
        </div>
        <div className="p-5">
        <ApprovalChain status={mb.status} />
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
          {mb.createdBy  && <span><User className="w-3 h-3 inline mr-1" />Created by <strong className="text-gray-600 dark:text-gray-300">{mb.createdBy}</strong></span>}
          {mb.deVerifiedBy && <span>DE: <strong className="text-gray-600 dark:text-gray-300">{mb.deVerifiedBy}</strong> on {fmtDate(mb.deVerifiedAt)}</span>}
          {mb.acceptedByContractor && <span>Contractor: <strong className="text-gray-600 dark:text-gray-300">Accepted</strong> on {fmtDate(mb.contractorAcceptedAt)}</span>}
          {mb.eeVerifiedBy && <span>EE: <strong className="text-gray-600 dark:text-gray-300">{mb.eeVerifiedBy}</strong> on {fmtDate(mb.eeVerifiedAt)}</span>}
        </div>
        </div>{/* /p-5 */}
      </div>

      {/* Measurement table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-700/40">
          <Ruler className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Measurements</h3>
          <span className="ml-auto text-xs text-gray-400">{mb.measurements.length} item{mb.measurements.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700">
                {["No.", "Description", "Date", "L", "B", "H", "Qty", "Rate (₹)", "Amount (₹)"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap first:pl-4 last:pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40">
              {mb.measurements.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50/40 dark:hover:bg-gray-700/10">
                  <td className="pl-4 py-2.5 font-semibold text-gray-700 dark:text-gray-300">{m.itemNo}</td>
                  <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 max-w-48">{m.description}</td>
                  <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{fmtDate(m.dateOfMeasurement)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-gray-600 dark:text-gray-300">{m.length}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-gray-600 dark:text-gray-300">{m.breadth}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-gray-600 dark:text-gray-300">{m.height}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold text-gray-700 dark:text-gray-200">{m.quantity.toFixed(3)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-gray-600 dark:text-gray-300">{formatINR(m.rate)}</td>
                  <td className="pr-4 px-3 py-2.5 text-right font-semibold text-gray-800 dark:text-gray-100">{formatINR(m.itemAmount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-blue-50 dark:bg-blue-900/20 border-t border-blue-100 dark:border-blue-800">
                <td colSpan={8} className="pl-4 py-2.5 text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase">Total Work Amount</td>
                <td className="pr-4 py-2.5 text-right font-bold text-blue-700 dark:text-blue-300">{formatINR(mb.totalWorkAmount ?? 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Deductions breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <button type="button" onClick={() => setDedOpen((o) => !o)}
          className="w-full flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-700/40 text-left">
          <TrendingDown className="w-4 h-4 text-red-500" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex-1">Deductions Breakdown</span>
          <span className="text-xs font-semibold text-red-600 dark:text-red-400">{formatINR(d?.totalDeduction ?? 0)}</span>
          {dedOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {dedOpen && (
          <div className="p-5">
            <div className="divide-y divide-gray-50 dark:divide-gray-700/40">
              {[
                { label: "Income Tax (TDS)",           val: ded.incomeTax },
                { label: "GST TDS",                    val: ded.gstTds },
                { label: "Labour Cess",                val: ded.labourCess },
                { label: "Security Deposit Deduction", val: ded.securityDeposit },
                { label: "Mobilization Advance Recovery", val: ded.mobilizationAdvance },
                { label: "Penalty",                    val: ded.penalty },
              ].map(({ label, val }) => val > 0 && (
                <div key={label} className="flex justify-between py-2 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{label}</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">- {formatINR(val)}</span>
                </div>
              ))}
              <div className="flex justify-between py-3 text-sm font-bold border-t border-gray-200 dark:border-gray-600 mt-1">
                <span className="text-gray-800 dark:text-gray-200">Total Deductions</span>
                <span className="text-red-700 dark:text-red-400">- {formatINR(d?.totalDeduction ?? 0)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Net Payable */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-5 text-white shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold opacity-80 uppercase tracking-wide">Net Amount Payable</p>
            <p className="text-xs opacity-70 mt-0.5">{mbStatusLabel(mb.status)}</p>
          </div>
          <p className="text-3xl font-bold">{formatINR(mb.netPayable ?? 0)}</p>
        </div>
      </div>

      {/* Remarks history */}
      {(mb.remarks?.length ?? 0) > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-5 py-2.5 bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Remarks History</p>
          </div>
          <div className="p-5 space-y-2">
            {mb.remarks!.map((r, i) => (
              <div key={i} className="flex gap-2.5 text-sm">
                <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-gray-700 dark:text-gray-300">{r}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auditor: deduction entry panel */}
      {isAuditor && mb.status === "Approved by EE" && (() => {
        const ded = calcDeductions(audDedState, mb.totalWorkAmount ?? 0);
        const net = Math.max(0, (mb.totalWorkAmount ?? 0) - ded.total);
        const pctFields = [
          { label: "Income Tax %",  field: "itPct"  as const, computed: ded.incomeTax },
          { label: "GST TDS %",     field: "gstPct" as const, computed: ded.gstTds },
          { label: "Labour Cess %", field: "lcPct"  as const, computed: ded.labourCess },
        ];
        const amtFields = [
          { label: "SD Deduction (₹)",      field: "sdAmt"      as const, computed: ded.securityDeposit },
          { label: "Mob. Advance Rec. (₹)", field: "mobAmt"     as const, computed: ded.mobilizationAdvance },
          { label: "Penalty (₹)",           field: "penaltyAmt" as const, computed: ded.penalty },
        ];
        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-amber-200 dark:border-amber-800/50 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-amber-50/80 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800/40 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-amber-600" />
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Enter Deductions — Part 4</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {pctFields.map(({ label, field, computed }) => (
                  <div key={field}>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">{label}</label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input type="number" min="0" max="100" step="0.01"
                          value={audDedState[field]}
                          onChange={(e) => setAudDedState((s) => ({ ...s, [field]: e.target.value }))}
                          className="w-full pr-6 pl-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition" />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                      </div>
                      <span className="text-xs font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">= {formatINR(computed)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {amtFields.map(({ label, field, computed }) => (
                  <div key={field}>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">{label}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                      <input type="number" min="0" step="1"
                        value={audDedState[field]}
                        onChange={(e) => setAudDedState((s) => ({ ...s, [field]: e.target.value }))}
                        className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition" />
                    </div>
                    {computed > 0 && <p className="text-xs text-red-500 mt-0.5">- {formatINR(computed)}</p>}
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Total Deductions</span>
                <span className="text-sm font-bold text-red-600 dark:text-red-400">- {formatINR(ded.total)}</span>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg px-4 py-3 flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Net Amount Payable</span>
                <span className="text-lg font-bold text-green-700 dark:text-green-400">{formatINR(net)}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Accountant: verify net payable + budget head */}
      {isAccountant && mb.status === "Verified by Auditor" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-blue-200 dark:border-blue-800/50 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-blue-50/80 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/40 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Accountant Verification</p>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Work Amount</p>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{formatINR(mb.totalWorkAmount ?? 0)}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg px-4 py-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Net Payable (after deductions)</p>
                <p className="text-sm font-bold text-green-700 dark:text-green-400">{formatINR(mb.netPayable ?? 0)}</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Budget Head <span className="text-gray-400 font-normal">(verify and confirm)</span>
              </label>
              <input type="text"
                value={budgetHead}
                onChange={(e) => setBudgetHead(e.target.value)}
                placeholder="e.g. 4215 — Capital Outlay on Water Supply…"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition" />
            </div>
          </div>
        </div>
      )}

      {/* CAFO: fund availability + finalise accounts */}
      {isCAFO && mb.status === "Verified by AAO" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-emerald-200 dark:border-emerald-800/50 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-emerald-50/80 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800/40 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">CAFO — Fund Availability & Final Accounts</p>
          </div>
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Work Amount</p>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{formatINR(mb.totalWorkAmount ?? 0)}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Deductions</p>
                <p className="text-sm font-bold text-red-700 dark:text-red-400">- {formatINR(mb.deductions?.totalDeduction ?? 0)}</p>
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg px-4 py-3 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Net Amount Payable</span>
              <span className="text-lg font-bold text-green-700 dark:text-green-400">{formatINR(mb.netPayable ?? 0)}</span>
            </div>
            {mb.budgetHead && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Budget Head</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">{mb.budgetHead}</span>
              </div>
            )}
            {mb.aaoVerifiedBy && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Verified by AAO</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">{mb.aaoVerifiedBy}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ACEO: administrative approval */}
      {isACEO && mb.status === "Verified by CAFO" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-indigo-200 dark:border-indigo-800/50 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-indigo-50/80 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800/40 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">Additional CEO — Administrative Approval</p>
          </div>
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Work Amount</p>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{formatINR(mb.totalWorkAmount ?? 0)}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg px-4 py-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Net Payable</p>
                <p className="text-sm font-bold text-green-700 dark:text-green-400">{formatINR(mb.netPayable ?? 0)}</p>
              </div>
            </div>
            {mb.budgetHead && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Budget Head</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">{mb.budgetHead}</span>
              </div>
            )}
            {mb.cafoVerifiedBy && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">CAFO Finalised by</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">{mb.cafoVerifiedBy}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CEO: final approval + project closure summary */}
      {isCEO && mb.status === "Verified by ACEO" && (() => {
        const contractAmt   = project.workOrderData?.contractAmount ?? 0;
        const completionPct = contractAmt > 0
          ? Math.min(100, Math.round(((mb.totalWorkAmount ?? 0) / contractAmt) * 100))
          : 0;
        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-rose-200 dark:border-rose-800/50 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-rose-50/80 dark:bg-rose-900/20 border-b border-rose-100 dark:border-rose-800/40 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-rose-600" />
              <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wide">CEO — Approve MB &amp; Bill</p>
            </div>
            <div className="p-5 space-y-4">

              {/* Financial summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Work Amount</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{formatINR(mb.totalWorkAmount ?? 0)}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Deductions</p>
                  <p className="text-sm font-bold text-red-700 dark:text-red-400">- {formatINR(mb.deductions?.totalDeduction ?? 0)}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Net Payable</p>
                  <p className="text-sm font-bold text-green-700 dark:text-green-400">{formatINR(mb.netPayable ?? 0)}</p>
                </div>
              </div>

              {/* Approver trail */}
              <div className="space-y-1.5">
                {[
                  { label: "Contractor Accepted",  val: mb.acceptedByContractor ? "Yes" : undefined },
                  { label: "Verified by EE",        val: mb.eeVerifiedBy },
                  { label: "Verified by Auditor",   val: mb.auditorVerifiedBy },
                  { label: "Verified by Accountant", val: mb.accountantVerifiedBy },
                  { label: "Verified by AAO",        val: mb.aaoVerifiedBy },
                  { label: "Finalised by CAFO",      val: mb.cafoVerifiedBy },
                  { label: "Approved by Addl. CEO",  val: mb.aceoVerifiedBy },
                ].filter((r) => r.val).map(({ label, val }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{label}</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{val}</span>
                  </div>
                ))}
              </div>

              {/* System actions that will execute */}
              <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-4 border border-rose-100 dark:border-rose-800/40 space-y-2">
                <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wide mb-2">System Actions on Approval</p>
                {[
                  { label: "Mark Bill Paid",       detail: formatINR(mb.netPayable ?? 0) },
                  { label: "Update Completion %",  detail: `${completionPct}% of contract amount` },
                  { label: "Update Dashboard",     detail: "Status: Project Completed" },
                  { label: "Lock MB",              detail: "No further edits allowed" },
                ].map(({ label, detail }) => (
                  <div key={label} className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-rose-800 dark:text-rose-300">{label}</span>
                      <span className="text-xs text-rose-600 dark:text-rose-400 ml-2">— {detail}</span>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-rose-700 dark:text-rose-400 font-semibold">
                ⚠ This action is permanent and cannot be undone. The project will be closed and the MB will be locked.
              </p>
            </div>
          </div>
        );
      })()}

      {/* AAO: verify deductions + payable summary */}
      {isAAO && mb.status === "Verified by Accountant" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-violet-200 dark:border-violet-800/50 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-violet-50/80 dark:bg-violet-900/20 border-b border-violet-100 dark:border-violet-800/40 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-violet-600" />
            <p className="text-xs font-semibold text-violet-700 dark:text-violet-400 uppercase tracking-wide">AAO Verification</p>
          </div>
          <div className="p-5 space-y-3">
            {[
              { label: "Income Tax (TDS)",              val: mb.deductions?.incomeTax ?? 0 },
              { label: "GST TDS",                       val: mb.deductions?.gstTds ?? 0 },
              { label: "Labour Cess",                   val: mb.deductions?.labourCess ?? 0 },
              { label: "Security Deposit Deduction",    val: mb.deductions?.securityDeposit ?? 0 },
              { label: "Mobilization Advance Recovery", val: mb.deductions?.mobilizationAdvance ?? 0 },
              { label: "Penalty",                       val: mb.deductions?.penalty ?? 0 },
            ].map(({ label, val }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{label}</span>
                <span className={`font-semibold ${val > 0 ? "text-red-600 dark:text-red-400" : "text-gray-400"}`}>
                  {val > 0 ? `- ${formatINR(val)}` : "—"}
                </span>
              </div>
            ))}
            <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex justify-between">
              <span className="text-sm text-gray-500">Total Deductions</span>
              <span className="text-sm font-bold text-red-600 dark:text-red-400">- {formatINR(mb.deductions?.totalDeduction ?? 0)}</span>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg px-4 py-3 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Final Payable Amount</span>
              <span className="text-lg font-bold text-green-700 dark:text-green-400">{formatINR(mb.netPayable ?? 0)}</span>
            </div>
            {mb.budgetHead && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Budget Head</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">{mb.budgetHead}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contractor Acceptance Panel */}
      {isContractor && (mb.status === "Verified by DE" || mb.status === "Pending Contractor Acceptance") && (() => {
        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-teal-200 dark:border-teal-800/50 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-teal-50/80 dark:bg-teal-900/20 border-b border-teal-100 dark:border-teal-800/40 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <p className="text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wide">Contractor Acceptance — Abstract Bill</p>
            </div>
            <div className="p-5 space-y-4">
              {/* Abstract Bill summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Work Amount (₹)", value: formatINR(mb.totalWorkAmount ?? 0), color: "blue" },
                  { label: "Deductions (₹)",  value: formatINR(mb.deductions?.totalDeduction ?? 0), color: "red" },
                  { label: "Net Payable (₹)", value: formatINR(mb.netPayable ?? 0), color: "green" },
                  { label: "Measurements",    value: String(mb.measurements.length), color: "violet" },
                ].map(({ label, value, color }) => (
                  <div key={label} className={`bg-${color}-50 dark:bg-${color}-900/20 rounded-lg px-3 py-3 border border-${color}-100 dark:border-${color}-800/30`}>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                    <p className={`text-sm font-bold text-${color}-700 dark:text-${color}-400`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Deduction breakdown (read-only) */}
              {mb.deductions && (
                <div className="border border-gray-100 dark:border-gray-700 rounded-lg divide-y divide-gray-50 dark:divide-gray-700/40">
                  {[
                    { label: "Income Tax (TDS)",              val: mb.deductions.incomeTax },
                    { label: "GST TDS",                       val: mb.deductions.gstTds },
                    { label: "Labour Cess",                   val: mb.deductions.labourCess },
                    { label: "Security Deposit Deduction",    val: mb.deductions.securityDeposit },
                    { label: "Mobilization Advance Recovery", val: mb.deductions.mobilizationAdvance },
                    { label: "Penalty",                       val: mb.deductions.penalty },
                  ].filter(({ val }) => val > 0).map(({ label, val }) => (
                    <div key={label} className="flex justify-between px-4 py-2 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{label}</span>
                      <span className="font-semibold text-red-600 dark:text-red-400">- {formatINR(val)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between px-4 py-2.5 text-sm font-bold bg-green-50 dark:bg-green-900/20">
                    <span className="text-gray-800 dark:text-gray-200">Net Payable</span>
                    <span className="text-green-700 dark:text-green-400">{formatINR(mb.netPayable ?? 0)}</span>
                  </div>
                </div>
              )}

              {/* I Accept checkbox */}
              <ContractorAcceptCheckbox
                checked={contractorAccepted}
                onChange={setContractorAccepted}
              />

              <p className="text-xs text-gray-400 dark:text-gray-500">
                By accepting, you confirm that the above measurements and amounts are correct and you agree to proceed with billing.
                "Not Accept" returns the MB to the Deputy Engineer for revision.
              </p>
            </div>
          </div>
        );
      })()}

      {/* Approval actions */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm space-y-4">
        {/* Remark input (shown to approvers) */}
        {(
          (isDE && mb.status === "Pending Measurement Verification") ||
          (isContractor && (mb.status === "Verified by DE" || mb.status === "Pending Contractor Acceptance")) ||
          (isEE && mb.status === "Pending Measurement Approval") ||
          (isAuditor && mb.status === "Approved by EE") ||
          (isAccountant && mb.status === "Verified by Auditor") ||
          (isAAO && mb.status === "Verified by Accountant") ||
          (isCAFO && mb.status === "Verified by AAO") ||
          (isACEO && mb.status === "Verified by CAFO") ||
          (isCEO && mb.status === "Verified by ACEO")
        ) ? (
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Remarks <span className="text-gray-400 font-normal">(required for return)</span>
            </label>
            <textarea rows={2} value={remark} onChange={(e) => setRemark(e.target.value)}
              placeholder="Enter verification notes or reason for return…"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 resize-none transition" />
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button onClick={onBack}
            className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            ← Back to List
          </button>

          {/* Creator: edit draft or re-submit returned */}
          {isCreator && !mb.locked && !isProjectClosed && (isDraft || mb.status.includes("Returned")) && (
            <button onClick={onEdit}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
              <Edit2 className="w-4 h-4" /> Edit MB
            </button>
          )}

          {/* DE: verify or return */}
          {isDE && mb.status === "Pending Measurement Verification" && (
            <>
              <button onClick={() => handleAction("return-de")} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60">
                <RotateCcw className="w-4 h-4" /> Return to SE
              </button>
              <button onClick={() => handleAction("verify-de")} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
                {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Verify &amp; Forward to Contractor
              </button>
            </>
          )}

          {/* Contractor: accept or not accept */}
          {isContractor && (mb.status === "Verified by DE" || mb.status === "Pending Contractor Acceptance") && (
            <>
              <button
                onClick={() => handleAction("reject-contractor")}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60">
                <XCircle className="w-4 h-4" /> Not Accept — Return to DE
              </button>
              <button
                onClick={() => {
                  if (!contractorAccepted) { toast.error("Please check the 'I Accept' checkbox before accepting."); return; }
                  handleAction("accept-contractor");
                }}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
                {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Accept &amp; Forward to EE
              </button>
            </>
          )}

          {/* EE: approve or return */}
          {isEE && mb.status === "Pending Measurement Approval" && (
            <>
              <button onClick={() => handleAction("return-ee")} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60">
                <RotateCcw className="w-4 h-4" /> Return to DE
              </button>
              <button onClick={() => handleAction("approve-ee")} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
                {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Approve &amp; Forward to Auditor
              </button>
            </>
          )}

          {/* Auditor: verify deductions and forward */}
          {isAuditor && mb.status === "Approved by EE" && (
            <>
              <button onClick={() => handleAction("return-auditor")} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60">
                <RotateCcw className="w-4 h-4" /> Return to EE
              </button>
              <button onClick={() => handleAction("forward-auditor")} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
                {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Verify &amp; Forward to Accountant
              </button>
            </>
          )}

          {/* Accountant: verify net payable and forward */}
          {isAccountant && mb.status === "Verified by Auditor" && (
            <>
              <button onClick={() => handleAction("return-accountant")} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60">
                <RotateCcw className="w-4 h-4" /> Return to Auditor
              </button>
              <button onClick={() => handleAction("forward-accountant")} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
                {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Verify &amp; Forward to AAO
              </button>
            </>
          )}

          {/* AAO: verify and forward to CAFO */}
          {isAAO && mb.status === "Verified by Accountant" && (
            <>
              <button onClick={() => handleAction("return-aao")} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60">
                <RotateCcw className="w-4 h-4" /> Return to Accountant
              </button>
              <button onClick={() => handleAction("forward-aao")} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
                {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Verify &amp; Forward to CAFO
              </button>
            </>
          )}

          {/* CAFO: finalise accounts and forward */}
          {isCAFO && mb.status === "Verified by AAO" && (
            <>
              <button onClick={() => handleAction("return-cafo")} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60">
                <RotateCcw className="w-4 h-4" /> Return to AAO
              </button>
              <button onClick={() => handleAction("forward-cafo")} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
                {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Finalise &amp; Forward to ACEO
              </button>
            </>
          )}

          {/* ACEO: administrative approval and forward */}
          {isACEO && mb.status === "Verified by CAFO" && (
            <>
              <button onClick={() => handleAction("return-aceo")} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60">
                <RotateCcw className="w-4 h-4" /> Return to CAFO
              </button>
              <button onClick={() => handleAction("forward-aceo")} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
                {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Approve &amp; Forward to CEO
              </button>
            </>
          )}

          {/* CEO: final approval and project closure */}
          {isCEO && mb.status === "Verified by ACEO" && (
            <>
              <button onClick={() => handleAction("return-ceo")} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60">
                <RotateCcw className="w-4 h-4" /> Return to ACEO
              </button>
              <button onClick={() => handleAction("approve-ceo")} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
                {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Approve MB &amp; Bill
              </button>
            </>
          )}

          {/* Closed state */}
          {mb.status === "Bill Paid" && (
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 font-semibold">
              <CheckCircle2 className="w-5 h-5" />
              Bill paid — Project Completed. Net: {formatINR(mb.netPayable ?? 0)}.
              {mb.locked && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 ml-1">MB Locked</span>}
            </div>
          )}

          {/* Project closed — MB not final (edge case: project closed, this MB in earlier state) */}
          {isProjectClosed && mb.status !== "Bill Paid" && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Project Completed — this measurement book is locked. No further actions available.
            </div>
          )}

          {/* Approved state */}
          {mb.status === "Approved by EE" && !isAuditor && (
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 font-semibold">
              <CheckCircle2 className="w-5 h-5" /> Approved — forwarded to Auditor. Net: {formatINR(mb.netPayable ?? 0)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Root View ────────────────────────────────────────────────────────────────

type Page = "list" | "form" | "detail";

export function MBBillingView({ projectId }: { projectId: string }) {
  const [project, setProject]   = useState<IProject | null>(null);
  const [page,    setPage]      = useState<Page>("list");
  const [editMbId, setEditMbId] = useState<string | null>(null);  // null = new MB

  const user = store.getCurrentUser();
  const role = user?.role ?? "";

  const reload = useCallback(() => {
    setProject(store.getProjectById(projectId));
  }, [projectId]);

  useEffect(() => { reload(); }, [reload]);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-gray-300 dark:text-gray-600" />
        <p className="text-gray-500 dark:text-gray-400">Project not found.</p>
        <Link href="/all-projects" className="text-blue-600 hover:underline text-sm">← All Projects</Link>
      </div>
    );
  }

  const mbs       = project.mbData ?? [];
  const activeMb  = editMbId ? mbs.find((m) => m.id === editMbId) ?? null : null;
  const isDE         = role === "Deputy Engineer";
  const isEE         = role === "Executive Engineer";
  const isContractorRole = role === "Contractor";
  const isProjectClosed = project.status === "Project Closed" || project.status === "Project Completed";
  const canCreate    = !isDE && !isEE && !isContractorRole && !isProjectClosed;

  // Page titles
  const pageTitle = page === "form"
    ? (editMbId ? `Edit ${activeMb?.mbNumber ?? "MB"}` : "New Measurement Book")
    : page === "detail"
    ? (activeMb?.mbNumber ?? "MB Detail")
    : "MB & Billing";

  const pageSubtitle = page === "list"
    ? `${mbs.length} measurement book${mbs.length !== 1 ? "s" : ""}`
    : project.projectName;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-start gap-4">
        {page === "list" ? (
          <Link href={`/project/${project.id}`}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors mt-0.5 shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        ) : (
          <button onClick={() => { setPage("list"); setEditMbId(null); }}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors mt-0.5 shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-0.5">
            {page !== "list" && (
              <>
                <button onClick={() => { setPage("list"); setEditMbId(null); }}
                  className="hover:text-blue-500 transition-colors">MB & Billing</button>
                <ChevronRight className="w-3 h-3" />
              </>
            )}
            <span className="truncate">{project.projectName}</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{pageTitle}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{pageSubtitle}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <StatusBadge status={project.status} />
          {page === "list" && canCreate && (
            <button onClick={() => { setEditMbId(null); setPage("form"); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
              <Plus className="w-4 h-4" /> New MB
            </button>
          )}
          {page === "detail" && activeMb && (
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${statusColor(activeMb.status)}`}>
                {activeMb.status}
              </span>
              {canCreate && !activeMb.locked && (activeMb.status === "Draft" || activeMb.status.includes("Returned")) && (
                <button onClick={() => setPage("form")}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                  <Edit2 className="w-4 h-4" /> Edit
                </button>
              )}
              {activeMb.locked && (
                <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                  Locked
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Project Closed banner */}
      {isProjectClosed && (
        <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl px-5 py-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-800 dark:text-green-300">Project Completed</p>
            <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
              Bill paid and MB locked. Completion:{" "}
              <strong>{project.completionPercentage ?? 0}%</strong> of contract.
              {project.completedAt && <> Closed on <strong>{fmtDate(project.completedAt)}</strong>.</>}
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
            {project.completionPercentage ?? 0}% Complete
          </span>
        </div>
      )}

      {/* Work order summary pill */}
      {project.workOrderData && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 shadow-sm">
          <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" />WO: <strong className="font-mono text-gray-700 dark:text-gray-200">{project.workOrderData.workOrderNumber}</strong></span>
          <span className="flex items-center gap-1.5"><IndianRupee className="w-3.5 h-3.5" />Contract: <strong className="text-gray-700 dark:text-gray-200">{formatINR(project.workOrderData.contractAmount)}</strong></span>
          <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />Contractor: <strong className="text-gray-700 dark:text-gray-200">{project.workOrderData.l1Contractor}</strong></span>
          <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Completion: <strong className="text-gray-700 dark:text-gray-200">{fmtDate(project.workOrderData.workCompletionDate)}</strong></span>
          {isProjectClosed && project.completionPercentage !== undefined && (
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" />Billed: <strong className="text-green-700 dark:text-green-400">{project.completionPercentage}%</strong></span>
          )}
        </div>
      )}

      {/* Page content */}
      {page === "list" && (
        <MBListView
          project={project}
          onNew={() => { setEditMbId(null); setPage("form"); }}
          onOpen={(id) => { setEditMbId(id); setPage("detail"); }}
          canCreate={canCreate}
        />
      )}

      {page === "form" && (
        <MBFormView
          project={project}
          editMb={activeMb}
          onSaved={() => { reload(); setPage("list"); setEditMbId(null); }}
          onCancel={() => { setPage(editMbId ? "detail" : "list"); }}
        />
      )}

      {page === "detail" && activeMb && (
        <MBDetailView
          project={project}
          mb={activeMb}
          role={role}
          onBack={() => { setPage("list"); setEditMbId(null); }}
          onEdit={() => setPage("form")}
          onUpdated={() => reload()}
        />
      )}
    </div>
  );
}
