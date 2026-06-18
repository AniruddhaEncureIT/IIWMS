"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock,
  Ruler,
  TrendingDown,
  IndianRupee,
  RotateCcw,
} from "lucide-react";
import { store } from "@/store/iims.store";
import type { IProject } from "@/types/iims.types";
import { formatINR } from "@/components/dashboard/dash-shared";
import {
  fmtDate,
  getContractorProjects,
  flatMbs,
  patchProjectMb,
  MBStatusBadge,
  type ContractorMB,
} from "./contractor-shared";

// ─── Accept / Reject dialogs ──────────────────────────────────────────────────

function AcceptDialog({
  mb,
  onConfirm,
  onCancel,
}: {
  mb: ContractorMB;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Accept Measurement Book</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Confirm acceptance of <strong>{mb.mbNumber}</strong> for project{" "}
          <strong className="line-clamp-1">{mb.projectName}</strong>.
        </p>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 mb-5 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-300">Work Amount</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">{formatINR(mb.totalWorkAmount ?? 0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-300">Total Deductions</span>
            <span className="font-semibold text-red-600 dark:text-red-400">- {formatINR(mb.deductions?.totalDeduction ?? 0)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold border-t border-green-200 dark:border-green-700 pt-2 mt-2">
            <span className="text-gray-800 dark:text-gray-200">Net Payable</span>
            <span className="text-green-700 dark:text-green-400 text-base">{formatINR(mb.netPayable ?? 0)}</span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mb-5">
          By accepting, you confirm that the measurements recorded in this MB are correct and agree to the net payable amount.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Accept
          </button>
        </div>
      </div>
    </div>
  );
}

function RejectDialog({
  mb,
  onConfirm,
  onCancel,
}: {
  mb: ContractorMB;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Reject Measurement Book</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Provide the reason for rejecting <strong>{mb.mbNumber}</strong>. This will be sent to the site engineer for correction.
        </p>
        <textarea
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Describe the discrepancy or reason for rejection…"
          className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none mb-4"
        />
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Cancel
          </button>
          <button onClick={() => { if (!reason.trim()) { toast.error("Reason is required."); return; } onConfirm(reason); }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors">
            <XCircle className="w-4 h-4" aria-hidden="true" /> Reject
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MB Card ──────────────────────────────────────────────────────────────────

function MBCard({
  mb,
  onAccept,
  onReject,
}: {
  mb: ContractorMB;
  onAccept: (mb: ContractorMB) => void;
  onReject: (mb: ContractorMB) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const d         = mb.deductions;
  const isPending = mb.status === "Approved by EE";
  const isAccepted= mb.status === "Contractor Accepted";
  const isRejected= mb.status === "Contractor Rejected";

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md ${
      isPending  ? "border-violet-200 dark:border-violet-800" :
      isAccepted ? "border-green-200 dark:border-green-800" :
      isRejected ? "border-red-200 dark:border-red-800" :
                   "border-gray-200 dark:border-gray-700"
    }`}>
      {/* Top band for pending */}
      {isPending && (
        <div className="h-1 bg-gradient-to-r from-violet-500 to-blue-500" />
      )}

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            isAccepted ? "bg-green-100 dark:bg-green-900/30" :
            isRejected ? "bg-red-100 dark:bg-red-900/30" :
                         "bg-violet-100 dark:bg-violet-900/30"
          }`}>
            <FileCheck className={`w-5 h-5 ${
              isAccepted ? "text-green-600 dark:text-green-400" :
              isRejected ? "text-red-600 dark:text-red-400" :
                           "text-violet-600 dark:text-violet-400"
            }`} aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-sm text-blue-700 dark:text-blue-400">{mb.mbNumber}</span>
              <MBStatusBadge status={mb.status} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{mb.projectName}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-gray-400">Net Payable</p>
            <p className="text-lg font-bold text-green-700 dark:text-green-400">{formatINR(mb.netPayable ?? 0)}</p>
          </div>
        </div>

        {/* Amounts row */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Work Amount</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatINR(mb.totalWorkAmount ?? 0)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Deductions</p>
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">- {formatINR(d?.totalDeduction ?? 0)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Measurements</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{mb.measurements.length} items</p>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" aria-hidden="true" />Recorded: {fmtDate(mb.recordEntryDate)}</span>
          {mb.eeVerifiedAt && <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" aria-hidden="true" />EE: {fmtDate(mb.eeVerifiedAt)}</span>}
          {mb.contractorAcceptedAt && <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" aria-hidden="true" />You: {fmtDate(mb.contractorAcceptedAt)}</span>}
        </div>

        {/* Expand measurements */}
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-3 w-full flex items-center justify-between text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors pt-3 border-t border-gray-100 dark:border-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
        >
          <span className="flex items-center gap-1.5"><Ruler className="w-3 h-3" aria-hidden="true" />View measurement details</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" /> : <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />}
        </button>

        {expanded && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/40 border-b border-gray-100 dark:border-gray-700">
                  {["No.", "Description", "L", "B", "H", "Qty", "Rate (₹)", "Amount (₹)"].map((h) => (
                    <th key={h} className="px-2 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap first:pl-3 last:pr-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40">
                {mb.measurements.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50/40 dark:hover:bg-gray-700/10">
                    <td className="pl-3 py-2 font-semibold text-gray-700 dark:text-gray-300">{m.itemNo}</td>
                    <td className="px-2 py-2 text-gray-700 dark:text-gray-300 max-w-36 truncate">{m.description}</td>
                    <td className="px-2 py-2 font-mono text-right">{m.length}</td>
                    <td className="px-2 py-2 font-mono text-right">{m.breadth}</td>
                    <td className="px-2 py-2 font-mono text-right">{m.height}</td>
                    <td className="px-2 py-2 font-mono text-right font-semibold">{m.quantity.toFixed(3)}</td>
                    <td className="px-2 py-2 text-right">{formatINR(m.rate)}</td>
                    <td className="pr-3 px-2 py-2 text-right font-semibold">{formatINR(m.itemAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Deductions breakdown */}
            {d && (
              <div className="mt-3 border border-gray-100 dark:border-gray-700 rounded-lg p-3 space-y-1">
                <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <TrendingDown className="w-3 h-3 text-red-500" aria-hidden="true" /> Deductions
                </p>
                {[
                  ["Income Tax (TDS)", d.incomeTax],
                  ["GST TDS",          d.gstTds],
                  ["Labour Cess",      d.labourCess],
                  ["Security Deposit", d.securityDeposit],
                  ["Mob. Advance",     d.mobilizationAdvance],
                  ["Penalty",          d.penalty],
                ].filter(([, v]) => (v as number) > 0).map(([label, val]) => (
                  <div key={label as string} className="flex justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-400">{label as string}</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">- {formatINR(val as number)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs font-bold pt-1.5 border-t border-gray-100 dark:border-gray-700">
                  <span>Net Payable</span>
                  <span className="text-green-700 dark:text-green-400">{formatINR(mb.netPayable ?? 0)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Remarks (if rejected) */}
        {isRejected && (mb.remarks?.length ?? 0) > 0 && (
          <div className="mt-3 pt-3 border-t border-red-100 dark:border-red-900/30">
            <p className="text-[11px] font-semibold text-red-600 dark:text-red-400 mb-1 flex items-center gap-1.5">
              <RotateCcw className="w-3 h-3" aria-hidden="true" /> Rejection Reason
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300">{mb.remarks![mb.remarks!.length - 1]}</p>
          </div>
        )}

        {/* Action buttons */}
        {isPending && (
          <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button onClick={() => onReject(mb)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <XCircle className="w-4 h-4" aria-hidden="true" /> Reject
            </button>
            <button onClick={() => onAccept(mb)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors">
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Accept
            </button>
          </div>
        )}

        {isAccepted && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-green-100 dark:border-green-900/30 text-sm text-green-700 dark:text-green-400 font-medium">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            Accepted on {fmtDate(mb.contractorAcceptedAt)} — payment pending
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

type TabKey = "pending" | "accepted" | "rejected" | "all";

export function MBVerificationView() {
  const [projects,   setProjects]   = useState<IProject[]>([]);
  const [tab,        setTab]        = useState<TabKey>("pending");
  const [acceptMb,   setAcceptMb]   = useState<ContractorMB | null>(null);
  const [rejectMb,   setRejectMb]   = useState<ContractorMB | null>(null);

  const load = useCallback(() => {
    const user = store.getCurrentUser();
    const all  = store.getAllProjects();
    setProjects(getContractorProjects(all, user?.name ?? ""));
  }, []);

  useEffect(() => { load(); }, [load]);

  const allMbs = flatMbs(projects);
  const pending  = allMbs.filter((m) => m.status === "Approved by EE");
  const accepted = allMbs.filter((m) => m.status === "Contractor Accepted");
  const rejected = allMbs.filter((m) => m.status === "Contractor Rejected");

  const displayed: ContractorMB[] =
    tab === "pending"  ? pending  :
    tab === "accepted" ? accepted :
    tab === "rejected" ? rejected :
    allMbs;

  function handleAccept(mb: ContractorMB) {
    const now = new Date().toISOString();
    patchProjectMb(mb.projectId, mb.id, {
      acceptedByContractor: true,
      contractorAcceptedAt: now,
      status: "Contractor Accepted",
      remarks: [...(mb.remarks ?? []), `Contractor accepted on ${fmtDate(now)}`],
    });
    toast.success(`${mb.mbNumber} accepted successfully.`);
    setAcceptMb(null);
    load();
  }

  function handleReject(mb: ContractorMB, reason: string) {
    patchProjectMb(mb.projectId, mb.id, {
      acceptedByContractor: false,
      status: "Contractor Rejected",
      remarks: [...(mb.remarks ?? []), `Contractor rejected: ${reason}`],
    });
    toast.success(`${mb.mbNumber} rejection recorded.`);
    setRejectMb(null);
    load();
  }

  const TABS: { key: TabKey; label: string; count: number }[] = [
    { key: "pending",  label: "Pending Acceptance", count: pending.length  },
    { key: "accepted", label: "Accepted",           count: accepted.length },
    { key: "rejected", label: "Rejected",           count: rejected.length },
    { key: "all",      label: "All MBs",            count: allMbs.length   },
  ];

  return (
    <>
      {acceptMb && (
        <AcceptDialog mb={acceptMb} onConfirm={() => handleAccept(acceptMb)} onCancel={() => setAcceptMb(null)} />
      )}
      {rejectMb && (
        <RejectDialog mb={rejectMb} onConfirm={(r) => handleReject(rejectMb, r)} onCancel={() => setRejectMb(null)} />
      )}

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">MB Verification</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Review and accept measurement books approved by the Executive Engineer
          </p>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Pending",  value: pending.length,  color: "violet", sub: "awaiting acceptance" },
            { label: "Accepted", value: accepted.length, color: "green",  sub: "payment pipeline" },
            { label: "Rejected", value: rejected.length, color: "red",    sub: "returned for fix" },
            { label: "Total MBs",value: allMbs.length,   color: "blue",   sub: "all books" },
          ].map(({ label, value, color, sub }) => (
            <div key={label}
              className={`bg-white dark:bg-gray-800 rounded-xl border border-${color}-100 dark:border-${color}-900/30 p-4 shadow-sm`}>
              <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{label}</p>
              <p className={`text-2xl font-bold text-${color}-700 dark:text-${color}-400`}>{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Pending notice */}
        {pending.length > 0 && (
          <div className="flex gap-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 rounded-xl p-4">
            <AlertCircle className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-violet-800 dark:text-violet-300">
              <strong>{pending.length}</strong> measurement book{pending.length !== 1 ? "s" : ""} approved by EE are awaiting your acceptance.
              Review the measurements carefully before accepting.
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 border border-gray-200 dark:border-gray-700">
          {TABS.map(({ key, label, count }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                tab === key
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}>
              {label}
              {count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  tab === key
                    ? key === "pending" ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                    : key === "rejected" ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                    : "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                }`}>{count}</span>
              )}
            </button>
          ))}
        </div>

        {/* MB Cards */}
        {displayed.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center shadow-sm">
            <Eye className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" aria-hidden="true" />
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              {tab === "pending"  ? "No MBs pending acceptance." :
               tab === "accepted" ? "No accepted MBs yet." :
               tab === "rejected" ? "No rejected MBs." :
               "No measurement books found."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayed.map((mb) => (
              <MBCard key={`${mb.projectId}-${mb.id}`} mb={mb}
                onAccept={setAcceptMb} onReject={setRejectMb} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
