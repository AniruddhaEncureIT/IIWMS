"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  IndianRupee,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingDown,
  FileText,
  ChevronDown,
  ChevronUp,
  Filter,
  Banknote,
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

// ─── Payment status helpers ───────────────────────────────────────────────────

type PaymentStatus = "pending" | "processing" | "paid";

function paymentStatus(mb: ContractorMB): PaymentStatus {
  if (mb.status === "Contractor Accepted") return "processing";
  if (mb.status === "Payment Processed")   return "paid";
  return "pending";
}

function PaymentStatusPill({ status }: { status: PaymentStatus }) {
  const cfg = {
    pending:    { cls: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",    label: "Pending" },
    processing: { cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", label: "Processing" },
    paid:       { cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", label: "Paid" },
  }[status];
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${cfg.cls}`}>
      {status === "paid" ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
      {cfg.label}
    </span>
  );
}

// ─── Bill Row (expandable) ────────────────────────────────────────────────────

function BillRow({ mb, onMarkPaid }: { mb: ContractorMB; onMarkPaid: (mb: ContractorMB) => void }) {
  const [open, setOpen] = useState(false);
  const d       = mb.deductions;
  const ps      = paymentStatus(mb);
  const showPay = ps === "processing";

  return (
    <>
      <tr
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors border-b border-gray-50 dark:border-gray-700/50"
      >
        <td className="px-4 py-3">
          <span className="font-mono font-bold text-xs text-blue-700 dark:text-blue-400">{mb.mbNumber}</span>
        </td>
        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 max-w-48">
          <span className="line-clamp-1">{mb.projectName}</span>
          <span className="block text-gray-400 font-mono text-[10px]">{mb.workOrderNumber}</span>
        </td>
        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(mb.recordEntryDate)}</td>
        <td className="px-4 py-3 text-right">
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{formatINR(mb.totalWorkAmount ?? 0)}</span>
        </td>
        <td className="px-4 py-3 text-right">
          <span className="text-xs font-semibold text-red-600 dark:text-red-400">- {formatINR(d?.totalDeduction ?? 0)}</span>
        </td>
        <td className="px-4 py-3 text-right">
          <span className="text-sm font-bold text-green-700 dark:text-green-400">{formatINR(mb.netPayable ?? 0)}</span>
        </td>
        <td className="px-4 py-3"><MBStatusBadge status={mb.status} /></td>
        <td className="px-4 py-3"><PaymentStatusPill status={ps} /></td>
        <td className="px-4 py-3">
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" aria-hidden="true" /> : <ChevronDown className="w-4 h-4 text-gray-400" aria-hidden="true" />}
        </td>
      </tr>

      {open && (
        <tr className="border-b border-gray-100 dark:border-gray-700">
          <td colSpan={9} className="px-4 py-4 bg-gray-50/60 dark:bg-gray-800/60">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Deductions breakdown */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-red-500" aria-hidden="true" /> Deductions Breakdown
                </p>
                {d ? (
                  <div className="space-y-1.5">
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
                    <div className="flex justify-between text-xs font-bold pt-2 border-t border-gray-100 dark:border-gray-700">
                      <span className="text-gray-700 dark:text-gray-200">Total Deductions</span>
                      <span className="text-red-600 dark:text-red-400">- {formatINR(d.totalDeduction ?? 0)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No deduction data.</p>
                )}
              </div>

              {/* Bill summary + actions */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">Work Amount</span>
                    <span className="font-semibold">{formatINR(mb.totalWorkAmount ?? 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">Deductions</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">- {formatINR(d?.totalDeduction ?? 0)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-gray-800 dark:text-gray-200">Net Payable</span>
                    <span className="text-green-700 dark:text-green-400">{formatINR(mb.netPayable ?? 0)}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 flex-wrap">
                  <button
                    onClick={(e) => { e.stopPropagation(); downloadBillStatement(mb); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" /> Download Statement
                  </button>
                  {showPay && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onMarkPaid(mb); }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors"
                    >
                      <Banknote className="w-3.5 h-3.5" aria-hidden="true" /> Mark as Paid
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Audit trail */}
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-400">
              {mb.createdBy       && <span>Created by <strong className="text-gray-600 dark:text-gray-300">{mb.createdBy}</strong></span>}
              {mb.deVerifiedBy    && <span>DE: <strong className="text-gray-600 dark:text-gray-300">{mb.deVerifiedBy}</strong> ({fmtDate(mb.deVerifiedAt)})</span>}
              {mb.eeVerifiedBy    && <span>EE: <strong className="text-gray-600 dark:text-gray-300">{mb.eeVerifiedBy}</strong> ({fmtDate(mb.eeVerifiedAt)})</span>}
              {mb.contractorAcceptedAt && <span>Accepted: <strong className="text-gray-600 dark:text-gray-300">{fmtDate(mb.contractorAcceptedAt)}</strong></span>}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Download bill statement ──────────────────────────────────────────────────

function downloadBillStatement(mb: ContractorMB) {
  const d = mb.deductions;
  const lines = [
    "BILL STATEMENT",
    "==============",
    `MB Number      : ${mb.mbNumber}`,
    `Project        : ${mb.projectName}`,
    `Work Order     : ${mb.workOrderNumber}`,
    `Record Date    : ${fmtDate(mb.recordEntryDate)}`,
    "",
    "MEASUREMENT DETAILS",
    "-------------------",
    ...mb.measurements.map(
      (m) => `  ${m.itemNo}. ${m.description} | Qty: ${m.quantity.toFixed(3)} × ₹${m.rate} = ${formatINR(m.itemAmount)}`
    ),
    "",
    `Gross Work Amount   : ${formatINR(mb.totalWorkAmount ?? 0)}`,
    "",
    "DEDUCTIONS",
    "----------",
    d ? [
      `  Income Tax (TDS)  : - ${formatINR(d.incomeTax)}`,
      `  GST TDS           : - ${formatINR(d.gstTds)}`,
      `  Labour Cess       : - ${formatINR(d.labourCess)}`,
      d.securityDeposit   > 0 ? `  Security Deposit  : - ${formatINR(d.securityDeposit)}`  : "",
      d.mobilizationAdvance>0 ? `  Mob. Advance Rec. : - ${formatINR(d.mobilizationAdvance)}` : "",
      d.penalty           > 0 ? `  Penalty           : - ${formatINR(d.penalty)}`           : "",
      `  Total Deductions  : - ${formatINR(d.totalDeduction ?? 0)}`,
    ].filter(Boolean).join("\n") : "  No deductions recorded.",
    "",
    `NET AMOUNT PAYABLE  : ${formatINR(mb.netPayable ?? 0)}`,
    "",
    `Status         : ${mb.status}`,
  ].join("\n");

  const blob = new Blob([lines], { type: "text/plain" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = `BillStatement_${mb.mbNumber.replace(/\//g, "_")}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main View ────────────────────────────────────────────────────────────────

type FilterKey = "all" | "pending" | "processing" | "paid";

export function BillsPaymentsView() {
  const [projects, setProjects] = useState<IProject[]>([]);
  const [filter,   setFilter]   = useState<FilterKey>("all");

  const load = useCallback(() => {
    const user = store.getCurrentUser();
    const all  = store.getAllProjects();
    setProjects(getContractorProjects(all, user?.name ?? ""));
  }, []);

  useEffect(() => { load(); }, [load]);

  const allMbs = flatMbs(projects);

  function handleMarkPaid(mb: ContractorMB) {
    patchProjectMb(mb.projectId, mb.id, { status: "Payment Processed" });
    toast.success(`${mb.mbNumber} marked as paid.`);
    load();
  }

  function downloadFullStatement() {
    const lines = [
      "PAYMENT SUMMARY STATEMENT",
      "=========================",
      `Generated On  : ${new Date().toLocaleDateString("en-IN")}`,
      `Contractor    : ${store.getCurrentUser()?.name ?? "—"}`,
      "",
      ...allMbs.map((mb) =>
        `${mb.mbNumber} | ${mb.projectName} | ${fmtDate(mb.recordEntryDate)} | Work: ${formatINR(mb.totalWorkAmount ?? 0)} | Ded: ${formatINR(mb.deductions?.totalDeduction ?? 0)} | Net: ${formatINR(mb.netPayable ?? 0)} | ${mb.status}`
      ),
      "",
      `Total Work Amount   : ${formatINR(allMbs.reduce((s, m) => s + (m.totalWorkAmount ?? 0), 0))}`,
      `Total Deductions    : ${formatINR(allMbs.reduce((s, m) => s + (m.deductions?.totalDeduction ?? 0), 0))}`,
      `Total Net Payable   : ${formatINR(allMbs.reduce((s, m) => s + (m.netPayable ?? 0), 0))}`,
    ].join("\n");

    const blob = new Blob([lines], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `PaymentStatement_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Summary amounts
  const totalWork   = allMbs.reduce((s, m) => s + (m.totalWorkAmount ?? 0), 0);
  const totalDed    = allMbs.reduce((s, m) => s + (m.deductions?.totalDeduction ?? 0), 0);
  const totalNet    = allMbs.reduce((s, m) => s + (m.netPayable ?? 0), 0);
  const totalPaid   = allMbs.filter((m) => paymentStatus(m) === "paid").reduce((s, m) => s + (m.netPayable ?? 0), 0);
  const totalProcess= allMbs.filter((m) => paymentStatus(m) === "processing").reduce((s, m) => s + (m.netPayable ?? 0), 0);
  const totalPending= allMbs.filter((m) => paymentStatus(m) === "pending").reduce((s, m) => s + (m.netPayable ?? 0), 0);

  const filtered = filter === "all"       ? allMbs :
                   filter === "pending"   ? allMbs.filter((m) => paymentStatus(m) === "pending") :
                   filter === "processing"? allMbs.filter((m) => paymentStatus(m) === "processing") :
                                           allMbs.filter((m) => paymentStatus(m) === "paid");

  const FILTERS: { key: FilterKey; label: string; count: number }[] = [
    { key: "all",        label: "All Bills",  count: allMbs.length },
    { key: "pending",    label: "Pending",    count: allMbs.filter((m) => paymentStatus(m) === "pending").length },
    { key: "processing", label: "Processing", count: allMbs.filter((m) => paymentStatus(m) === "processing").length },
    { key: "paid",       label: "Paid",       count: allMbs.filter((m) => paymentStatus(m) === "paid").length },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Bills & Payments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Running bill register — {allMbs.length} bill{allMbs.length !== 1 ? "s" : ""} across all projects
          </p>
        </div>
        <button onClick={downloadFullStatement}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors shrink-0">
          <Download className="w-4 h-4" aria-hidden="true" /> Export Statement
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Billed",  value: formatINR(totalWork),    sub: "gross work amount", color: "blue" },
          { label: "Deductions",    value: formatINR(totalDed),     sub: "all categories",    color: "red" },
          { label: "Net Payable",   value: formatINR(totalNet),     sub: "after deductions",  color: "indigo" },
          { label: "Paid",          value: formatINR(totalPaid),    sub: "cleared bills",     color: "green" },
        ].map(({ label, value, sub, color }) => (
          <div key={label}
            className={`bg-white dark:bg-gray-800 rounded-xl border border-${color}-100 dark:border-${color}-900/30 p-4 shadow-sm`}>
            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-lg font-bold text-${color}-700 dark:text-${color}-400`}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Pipeline bar */}
      {totalNet > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Payment Pipeline</p>
          <div className="flex gap-4 text-xs mb-3">
            {[
              { label: "Paid",        val: totalPaid,    color: "bg-green-500" },
              { label: "Processing",  val: totalProcess, color: "bg-amber-500" },
              { label: "Pending",     val: totalPending, color: "bg-gray-300 dark:bg-gray-600" },
            ].map(({ label, val, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                <span className="text-gray-500 dark:text-gray-400">{label}</span>
                <span className="font-semibold text-gray-700 dark:text-gray-200">{formatINR(val)}</span>
              </div>
            ))}
          </div>
          <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
            {totalNet > 0 && (
              <>
                <div className="h-full bg-green-500 transition-all" style={{ width: `${(totalPaid / totalNet) * 100}%` }} />
                <div className="h-full bg-amber-500 transition-all" style={{ width: `${(totalProcess / totalNet) * 100}%` }} />
              </>
            )}
          </div>
        </div>
      )}

      {/* Alert for processing */}
      {totalProcess > 0 && (
        <div className="flex gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <strong>{formatINR(totalProcess)}</strong> of net payable is in processing — accepted by you and awaiting payment from the department.
          </p>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-gray-400 shrink-0" aria-hidden="true" />
        {FILTERS.map(({ key, label, count }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
              filter === key
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            }`}>
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              filter === key ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
            }`}>{count}</span>
          </button>
        ))}
      </div>

      {/* Bills table */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center shadow-sm">
          <IndianRupee className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            {filter === "all" ? "No bills found." : `No ${filter} bills.`}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-700/40">
            <FileText className="w-4 h-4 text-blue-500" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Running Bill Register</h3>
            <span className="ml-auto text-xs text-gray-400">{filtered.length} bill{filtered.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                  {["MB No.", "Project", "Date", "Work Amount", "Deductions", "Net Payable", "MB Status", "Payment", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((mb) => (
                  <BillRow key={`${mb.projectId}-${mb.id}`} mb={mb} onMarkPaid={handleMarkPaid} />
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-blue-50 dark:bg-blue-900/20 border-t border-blue-100 dark:border-blue-800">
                  <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase">
                    Totals ({filtered.length} bills)
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-gray-800 dark:text-gray-200">
                    {formatINR(filtered.reduce((s, m) => s + (m.totalWorkAmount ?? 0), 0))}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-red-600 dark:text-red-400">
                    - {formatINR(filtered.reduce((s, m) => s + (m.deductions?.totalDeduction ?? 0), 0))}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-green-700 dark:text-green-400">
                    {formatINR(filtered.reduce((s, m) => s + (m.netPayable ?? 0), 0))}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
