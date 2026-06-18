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
  if (s.includes("Approved"))  return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (s.includes("Returned"))  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  if (s.includes("DE"))        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  if (s.includes("EE"))        return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400";
  if (s === "Draft")           return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
  return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
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

const CHAIN_STEPS = ["JE / Site Eng.", "Deputy Engineer", "Exec. Engineer"] as const;

function mbChainIndex(status: string): number {
  if (status === "Draft")                              return 0;
  if (status.includes("Submitted"))                    return 1;
  if (status.includes("Verified by DE"))               return 2;
  if (status.includes("Approved"))                     return 3;
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
  project, onNew, onOpen,
}: {
  project: IProject;
  onNew: () => void;
  onOpen: (id: string) => void;
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
          { label: "Contract Amount",  value: formatINR(contract), color: "blue",   sub: "LOA value" },
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
          <button onClick={onNew}
            className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors mx-auto">
            <Plus className="w-4 h-4" /> New MB
          </button>
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
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor(mb.status)}`}>{mb.status}</span>
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
    if (totalWork <= 0) { toast.error("Add at least one measurement with a rate."); return; }
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
        <button onClick={() => handleSave("Submitted to DE")} disabled={saving}
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
  const [remark,   setRemark]  = useState("");
  const [saving,   setSaving]  = useState(false);
  const [dedOpen,  setDedOpen] = useState(false);

  const isDE   = role === "Deputy Engineer";
  const isEE   = role === "Executive Engineer";
  const isDraft= mb.status === "Draft";
  const isCreator = !isDE && !isEE;

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

  async function handleAction(action: "verify-de" | "return-de" | "approve-ee" | "return-ee") {
    if ((action === "return-de" || action === "return-ee") && !remark.trim()) {
      toast.error("Remarks required for return."); return;
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
            <p className="text-xs opacity-70 mt-0.5">{mb.status}</p>
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

      {/* Approval actions */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm space-y-4">
        {/* Remark input (shown to approvers) */}
        {(isDE && mb.status === "Submitted to DE") || (isEE && mb.status === "Verified by DE") ? (
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
          {isCreator && (isDraft || mb.status.includes("Returned")) && (
            <button onClick={onEdit}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
              <Edit2 className="w-4 h-4" /> Edit MB
            </button>
          )}

          {/* DE: verify or return */}
          {isDE && mb.status === "Submitted to DE" && (
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

          {/* EE: approve or return */}
          {isEE && mb.status === "Verified by DE" && (
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

          {/* Approved state */}
          {mb.status === "Approved by EE" && (
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
  const isDE      = role === "Deputy Engineer";
  const isEE      = role === "Executive Engineer";
  const canCreate = !isDE && !isEE;

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
              {canCreate && (activeMb.status === "Draft" || activeMb.status.includes("Returned")) && (
                <button onClick={() => setPage("form")}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                  <Edit2 className="w-4 h-4" /> Edit
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Work order summary pill */}
      {project.workOrderData && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 shadow-sm">
          <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" />WO: <strong className="font-mono text-gray-700 dark:text-gray-200">{project.workOrderData.workOrderNumber}</strong></span>
          <span className="flex items-center gap-1.5"><IndianRupee className="w-3.5 h-3.5" />Contract: <strong className="text-gray-700 dark:text-gray-200">{formatINR(project.workOrderData.contractAmount)}</strong></span>
          <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />Contractor: <strong className="text-gray-700 dark:text-gray-200">{project.workOrderData.l1Contractor}</strong></span>
          <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Completion: <strong className="text-gray-700 dark:text-gray-200">{fmtDate(project.workOrderData.workCompletionDate)}</strong></span>
        </div>
      )}

      {/* Page content */}
      {page === "list" && (
        <MBListView
          project={project}
          onNew={() => { setEditMbId(null); setPage("form"); }}
          onOpen={(id) => { setEditMbId(id); setPage("detail"); }}
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
