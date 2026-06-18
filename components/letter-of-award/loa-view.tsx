"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  Upload,
  Send,
  AlertCircle,
  CheckCircle2,
  FileText,
  Eye,
  Trash2,
  Paperclip,
  Trophy,
  TrendingDown,
  TrendingUp,
  Calendar,
  IndianRupee,
  Clock,
  Building2,
  Stamp,
  RotateCcw,
  Info,
  Check,
} from "lucide-react";
import { store } from "@/store/iims.store";
import type { IProject, ILOAData, IDocument } from "@/types/iims.types";
import { formatINR, StatusBadge } from "@/components/dashboard/dash-shared";

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtDate(s?: string) {
  if (!s) return new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  return new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function fmtPct(pct: number) {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

function pctLabel(pct: number) {
  if (pct < 0) return `${Math.abs(pct).toFixed(2)}% below the estimated cost`;
  if (pct > 0) return `${pct.toFixed(2)}% above the estimated cost`;
  return "at the estimated cost";
}

const MAX_SIZE = 20 * 1024 * 1024;

// ─── LOA Document Preview ─────────────────────────────────────────────────────

function LOAPreview({
  project,
  l1Name,
  l1Pct,
  amount,
  completionPeriod,
  contractorAddress,
  tenderId,
  tsNumber,
}: {
  project: IProject;
  l1Name: string;
  l1Pct: number;
  amount: number;
  completionPeriod: string;
  contractorAddress: string;
  tenderId: string;
  tsNumber?: string;
}) {
  const today = fmtDate();
  const loaNumber = `LOI/${new Date().getFullYear()}/${project.id.slice(-4)}`;

  return (
    <div
      id="loa-preview"
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden font-serif"
    >
      {/* Letter header band */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-800 px-8 py-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-sans font-semibold uppercase tracking-widest opacity-80">
              Zilla Parishad, Pune Division
            </p>
            <p className="text-xs font-sans opacity-70 mt-0.5">
              Infrastructure &amp; Works Management System
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-sans opacity-70">Ref No.</p>
            <p className="text-sm font-sans font-bold">{loaNumber}</p>
          </div>
        </div>
      </div>

      <div className="px-10 py-8 space-y-6 text-gray-800 dark:text-gray-200">

        {/* Title */}
        <div className="text-center border-b-2 border-gray-800 dark:border-gray-200 pb-4">
          <h2 className="text-xl font-bold uppercase tracking-wide">Letter of Intent</h2>
          <p className="text-sm mt-1 font-sans text-gray-500 dark:text-gray-400">Date: {today}</p>
        </div>

        {/* Addressee */}
        <div>
          <p className="text-sm font-sans font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide text-xs mb-1">To,</p>
          <p className="font-bold text-base">{l1Name}</p>
          {contractorAddress ? (
            <p className="text-sm mt-1 whitespace-pre-wrap text-gray-600 dark:text-gray-300">{contractorAddress}</p>
          ) : (
            <p className="text-sm mt-1 italic text-gray-400">[Contractor Address]</p>
          )}
        </div>

        {/* Subject */}
        <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg px-4 py-3">
          <p className="text-xs font-sans font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Subject</p>
          <p className="text-sm font-semibold">
            Award of Contract for: {project.projectName}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Tender ID: {tenderId}{tsNumber ? ` | TS No.: ${tsNumber}` : ""}
          </p>
        </div>

        {/* Body */}
        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            With reference to your bid submitted in response to Tender Notice No.{" "}
            <strong>{tenderId}</strong> dated{" "}
            {project.tenderData?.publishingDate ? fmtDate(project.tenderData.publishingDate) : "—"}, and
            subsequent evaluation of technical and financial bids, we are pleased to inform you that
            your firm has been identified as the <strong>L1 (lowest) bidder</strong> and your tender
            has been accepted.
          </p>

          <p>
            You are hereby awarded the contract for the execution of the above-mentioned work at the
            rate of{" "}
            <strong>
              {fmtPct(l1Pct)} ({pctLabel(l1Pct)})
            </strong>
            , as per your quoted percentage on the Schedule of Rates (SSR/DSR).
          </p>

          {/* Key terms table */}
          <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden mt-4">
            <table className="w-full text-sm font-sans">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  ["Name of Work",         project.projectName],
                  ["Contract Value (₹)",   formatINR(amount)],
                  ["Quoted Percentage",    `${fmtPct(l1Pct)} (${pctLabel(l1Pct)})`],
                  ["Completion Period",    completionPeriod],
                  ["Technical Sanction No.", tsNumber ?? "As per file"],
                  ["Tender ID",            tenderId],
                  ["Governing Body Resolution", "As per Resolution passed on record"],
                ].map(([label, value]) => (
                  <tr key={label} className="even:bg-gray-50 dark:even:bg-gray-700/20">
                    <td className="px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-400 w-52">{label}</td>
                    <td className="px-4 py-2.5 text-gray-800 dark:text-gray-200">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            You are directed to submit the following within <strong>15 days</strong> from the date of
            this letter:
          </p>
          <ol className="list-decimal pl-5 space-y-1 text-gray-700 dark:text-gray-300">
            <li>Performance Security / Performance Guarantee (@ 5% of contract value)</li>
            <li>Security Deposit (@ 5% of contract value)</li>
            <li>Signed Agreement duly executed on stamp paper</li>
            <li>Valid Insurance Policy</li>
            <li>Commencement Certificate from Site Engineer</li>
          </ol>

          <p>
            The work shall be commenced within <strong>15 days</strong> from the date of this letter
            and shall be completed within the stipulated period of <strong>{completionPeriod}</strong>{" "}
            from the date of commencement.
          </p>

          <p>
            Failure to comply with the above conditions within the specified time shall result in
            forfeiture of the Earnest Money Deposit and cancellation of this award.
          </p>
        </div>

        {/* Signature block */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-8 grid grid-cols-2 gap-8 font-sans text-sm">
          <div>
            <div className="h-16 border-b border-dashed border-gray-300 dark:border-gray-600 mb-2" />
            <p className="font-semibold">Executive Engineer</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Pune Zilla Parishad</p>
          </div>
          <div>
            <div className="h-16 border-b border-dashed border-gray-300 dark:border-gray-600 mb-2" />
            <p className="font-semibold">Additional CEO</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Pune Zilla Parishad</p>
          </div>
        </div>

        {/* Receipt acknowledgement */}
        <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 font-sans text-xs text-gray-500 dark:text-gray-400">
          <p className="font-semibold mb-1 text-gray-600 dark:text-gray-300">Contractor&apos;s Acknowledgement</p>
          <p>
            I/We, the undersigned contractor, hereby acknowledge receipt of this Letter of Intent and
            accept all terms and conditions stated herein.
          </p>
          <div className="mt-4 flex items-end gap-16">
            <div>
              <div className="h-8 border-b border-dashed border-gray-300 dark:border-gray-600 w-36 mb-1" />
              <p>Signature</p>
            </div>
            <div>
              <div className="h-8 border-b border-dashed border-gray-300 dark:border-gray-600 w-32 mb-1" />
              <p>Date</p>
            </div>
            <div>
              <div className="h-8 border-b border-dashed border-gray-300 dark:border-gray-600 w-24 mb-1" />
              <p>Seal</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function LOAView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const signedFileRef = useRef<HTMLInputElement>(null);

  const [project, setProject] = useState<IProject | null>(null);
  const [saving,  setSaving]  = useState(false);

  // editable fields
  const [contractorAddress, setContractorAddress] = useState("");

  // signed LOA upload
  const [signedDoc, setSignedDoc] = useState<{ id: string; name: string; size: number; url: string } | null>(null);
  const [signedDrag, setSignedDrag] = useState(false);

  // return dialog
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [returnRemark, setReturnRemark] = useState("");

  const load = useCallback(() => {
    const p = store.getProjectById(projectId);
    setProject(p);
    if (p?.tenderData?.loa) {
      const loa = p.tenderData.loa;
      if (loa.documents?.length) {
        const d = loa.documents[0];
        setSignedDoc({ id: d.id, name: d.name, size: 0, url: d.url ?? "" });
      }
    }
    // pre-fill contractor address from financial bid L1 info (if available)
    const l1 = p?.tenderData?.financialBid?.l1Bidder;
    if (l1) setContractorAddress(`${l1.name}\n[Address to be filled]`);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    return () => { if (signedDoc?.url.startsWith("blob:")) URL.revokeObjectURL(signedDoc.url); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-gray-300 dark:text-gray-600" />
        <p className="text-gray-500 dark:text-gray-400">Project not found.</p>
        <Link href="/all-projects" className="text-blue-600 hover:underline text-sm">← All Projects</Link>
      </div>
    );
  }

  const tenderData  = project.tenderData;
  const finBid      = tenderData?.financialBid;
  const loa         = tenderData?.loa;
  const isIssued    = loa?.status === "LOI Issued" || loa?.status === "LOA Issued" || project.status.includes("LOI Issued") || project.status.includes("LOA Issued");
  const isSubmitted = project.status === "Financial Bid Approved" ||
                      project.status.includes("LOI - CAFO Review") ||
                      project.status.includes("LOI - ACEO Approval");

  const currentUser = store.getCurrentUser();
  const isTenderClerk = currentUser?.role === "Tender Clerk";
  // Tender Clerk can edit until LOI is finally issued; other roles lock on submission
  const canEdit     = isTenderClerk ? !isIssued : (!isIssued && !isSubmitted);

  // Derive L1 info
  const l1Bidder    = finBid?.l1Bidder;
  const l1Name      = l1Bidder?.name ?? loa?.l1Contractor ?? "—";
  const l1Pct       = l1Bidder?.quotedPercentage ?? loa?.approvedPercentage ?? 0;
  const estimatedAmt = project.estimatedAmount ?? 0;
  const amount      = loa?.approvedAmount ?? Math.round(estimatedAmt * (1 + l1Pct / 100));
  const completionPeriod = tenderData?.completionPeriod ?? project.dtpData?.completionPeriod ?? "12 months";
  const tsNumber    = project.dtpData?.tsNumber;
  const tenderId    = tenderData?.tenderId ?? "—";

  // ── signed file ────────────────────────────────────────────────────────────

  function pickFile(file: File) {
    if (file.size > MAX_SIZE) { toast.error("File exceeds 20 MB."); return; }
    if (signedDoc?.url.startsWith("blob:")) URL.revokeObjectURL(signedDoc.url);
    setSignedDoc({ id: `SLOA${Date.now()}`, name: file.name, size: file.size, url: URL.createObjectURL(file) });
  }

  function removeSignedDoc() {
    if (signedDoc?.url.startsWith("blob:")) URL.revokeObjectURL(signedDoc.url);
    setSignedDoc(null);
  }

  function buildSignedIDoc(): IDocument | undefined {
    if (!signedDoc) return undefined;
    return {
      id: signedDoc.id, name: signedDoc.name,
      type: "application/pdf", url: signedDoc.url,
      uploadedAt: new Date().toISOString(),
      uploadedBy: store.getCurrentUser()?.name ?? "Unknown",
    };
  }

  // ── download plain-text LOA ────────────────────────────────────────────────

  function handleDownload() {
    if (!project) return;
    const lines = [
      "LETTER OF INTENT",
      "=================",
      `Ref No.: LOI/${new Date().getFullYear()}/${project.id.slice(-4)}`,
      `Date: ${fmtDate()}`,
      "",
      "To,",
      l1Name,
      contractorAddress || "[Address]",
      "",
      `Sub: Award of Contract for ${project.projectName}`,
      `Tender ID: ${tenderId}`,
      tsNumber ? `TS No.: ${tsNumber}` : "",
      "",
      "Sir/Madam,",
      "",
      `With reference to Tender Notice No. ${tenderId}, your firm has been identified as the L1 bidder.`,
      `You are hereby awarded the contract at ${fmtPct(l1Pct)} (${pctLabel(l1Pct)}).`,
      "",
      "AWARD PARTICULARS",
      `-----------------`,
      `Name of Work         : ${project.projectName}`,
      `Contract Value       : ${formatINR(amount)}`,
      `Quoted Percentage    : ${fmtPct(l1Pct)}`,
      `Completion Period    : ${completionPeriod}`,
      `Technical Sanction   : ${tsNumber ?? "As per file"}`,
      "",
      "CONDITIONS:",
      "1. Submit Performance Security (5% of contract value) within 15 days.",
      "2. Submit Security Deposit (5% of contract value) within 15 days.",
      "3. Submit signed agreement within 15 days.",
      "4. Commence work within 15 days of this letter.",
      `5. Complete work within ${completionPeriod} from commencement.`,
      "",
      "Executive Engineer                Additional CEO",
      "Pune Zilla Parishad              Pune Zilla Parishad",
    ].filter((l) => l !== undefined).join("\n");

    const blob = new Blob([lines], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `LOI_${project.id}_${l1Name.replace(/\s+/g, "_").slice(0, 20)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── issue LOA ──────────────────────────────────────────────────────────────

  async function handleIssueLOA() {
    if (!project || !tenderData) return;
    if (!l1Name || l1Name === "—") { toast.error("No L1 bidder found. Complete financial bid first."); return; }

    setSaving(true);
    try {
      const loaData: ILOAData = {
        l1Contractor: l1Name,
        approvedPercentage: l1Pct,
        approvedAmount: amount,
        completionPeriod,
        status: "Pending LOI Approval",
        issuedDate: new Date().toISOString(),
        documents: signedDoc ? [buildSignedIDoc()!] : [],
      };

      store.updateProject(project.id, { tenderData: { ...tenderData, loa: loaData } });

      const fwdResult = store.forwardProject(
        project.id,
        "Executive Engineer",
        `LOI submitted for approval. L1: ${l1Name} at ${fmtPct(l1Pct)}. Value: ${formatINR(amount)}.`,
        "Financial Bid Approved"
      );
      if (!fwdResult.ok) { toast.error(fwdResult.error); return; }

      toast.success("LOI submitted for EE review.");
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  // ── save LOI draft (Tender Clerk only) ────────────────────────────────────

  async function handleSaveLOI() {
    if (!project || !tenderData) return;
    setSaving(true);
    try {
      const existing = tenderData.loa;
      const loaData: ILOAData = {
        l1Contractor: l1Name,
        approvedPercentage: l1Pct,
        approvedAmount: amount,
        completionPeriod,
        status: existing?.status ?? "LOI Draft",
        issuedDate: existing?.issuedDate ?? new Date().toISOString(),
        documents: signedDoc
          ? [buildSignedIDoc()!]
          : (existing?.documents ?? []),
      };
      store.updateProject(project.id, { tenderData: { ...tenderData, loa: loaData } });
      toast.success("LOI saved successfully.");
      load();
    } finally { setSaving(false); }
  }

  // ── return for clarification ───────────────────────────────────────────────

  async function handleReturn() {
    if (!returnRemark.trim()) { toast.error("Remarks are required."); return; }
    if (!project || !tenderData) return;
    setSaving(true);
    try {
      const loaReturnResult = store.rejectProject(project.id, "Financial Bid", returnRemark);
      if (!loaReturnResult.ok) { toast.error(loaReturnResult.error); return; }
      toast.success("Returned for clarification.");
      setShowReturnDialog(false);
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  return (
    <>
      {/* Return dialog */}
      {showReturnDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Return for Clarification</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Provide the reason for returning this LOI. The financial bid evaluation will need to be revised.
            </p>
            <textarea
              rows={4}
              value={returnRemark}
              onChange={(e) => setReturnRemark(e.target.value)}
              placeholder="Enter reason for return…"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowReturnDialog(false)} disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Cancel
              </button>
              <button onClick={handleReturn} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Return
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-start gap-4">
          <Link href={`/project/${project.id}`}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors mt-0.5 shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Letter of Intent (LOI)</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">{project.projectName}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {isIssued && (
              <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <Stamp className="w-3.5 h-3.5" /> Issued
              </span>
            )}
            <StatusBadge status={project.status} />
            <button onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors">
              <Download className="w-4 h-4" /> Download LOI
            </button>
          </div>
        </div>

        {/* Submitted for review banner */}
        {isSubmitted && !isIssued && (
          <div className="flex gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">LOI Submitted for Approval</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                Awaiting EE / CAFO / ACEO approval for LOI to{" "}
                <strong>{loa?.l1Contractor ?? l1Name}</strong>. Value:{" "}
                <strong>{formatINR(amount)}</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Issued banner */}
        {isIssued && (
          <div className="flex gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">LOI Issued Successfully</p>
              <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                Issued to <strong>{loa?.l1Contractor ?? l1Name}</strong> on {fmtDate(loa?.issuedDate)}.
                Proceed to issue Work Order.
              </p>
            </div>
          </div>
        )}

        {/* No L1 guard */}
        {!l1Bidder && !loa && (
          <div className="flex gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Financial Bid Not Completed</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                Complete the financial bid evaluation to determine the L1 bidder before issuing this LOI.
              </p>
              <Link href={`/financial-bid/${project.id}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline mt-1">
                → Go to Financial Bid
              </Link>
            </div>
          </div>
        )}

        {/* LOA Summary Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-5 h-5 text-yellow-300" />
              <p className="text-xs font-semibold text-blue-100 uppercase tracking-widest">L1 Contractor — Contract Awarded</p>
            </div>
            <h2 className="text-2xl font-bold text-white truncate">{l1Name}</h2>
          </div>
          <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-5">
            <div>
              <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 mb-1">
                {l1Pct < 0 ? <TrendingDown className="w-3.5 h-3.5 text-green-500" /> : <TrendingUp className="w-3.5 h-3.5 text-red-400" />}
                <p className="text-xs font-medium">Approved Percentage</p>
              </div>
              <p className={`text-lg font-bold ${l1Pct < 0 ? "text-green-600 dark:text-green-400" : l1Pct > 0 ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-200"}`}>
                {fmtPct(l1Pct)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{pctLabel(l1Pct)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 mb-1">
                <IndianRupee className="w-3.5 h-3.5" />
                <p className="text-xs font-medium">Contract Value</p>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{formatINR(amount)}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">vs. estimate {formatINR(estimatedAmt)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 mb-1">
                <Clock className="w-3.5 h-3.5" />
                <p className="text-xs font-medium">Completion Period</p>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{completionPeriod}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">from commencement date</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 mb-1">
                <Calendar className="w-3.5 h-3.5" />
                <p className="text-xs font-medium">Tender ID</p>
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{tenderId}</p>
              {tsNumber && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">TS: {tsNumber}</p>}
            </div>
          </div>
        </div>

        {/* Contractor Address (editable) */}
        {canEdit && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
              <Building2 className="w-4 h-4 text-blue-500" />
              Contractor Address
              <span className="text-xs font-normal text-gray-400 ml-1">(appears in the LOI document)</span>
            </label>
            <textarea
              rows={3}
              value={contractorAddress}
              onChange={(e) => setContractorAddress(e.target.value)}
              placeholder="M/s. Contractor Name&#10;Plot No. XX, Area&#10;City – PIN Code"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 resize-none transition"
            />
          </div>
        )}

        {/* LOA Document Preview */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-gray-400" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">LOI Document Preview</p>
            <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 italic">Read-only preview</span>
          </div>
          <LOAPreview
            project={project}
            l1Name={l1Name}
            l1Pct={l1Pct}
            amount={amount}
            completionPeriod={completionPeriod}
            contractorAddress={contractorAddress}
            tenderId={tenderId}
            tsNumber={tsNumber}
          />
        </div>

        {/* Signed LOA Upload */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-700/30">
            <Stamp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Signed LOI Document</h3>
            <span className="ml-auto text-xs text-gray-400">
              {signedDoc ? "1 file uploaded" : "Upload contractor-signed copy"}
            </span>
          </div>
          <div className="p-6">
            {canEdit && !signedDoc && (
              <div
                onDragEnter={(e) => { e.preventDefault(); setSignedDrag(true); }}
                onDragLeave={(e) => { e.preventDefault(); setSignedDrag(false); }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); setSignedDrag(false); const f = e.dataTransfer.files[0]; if (f) pickFile(f); }}
                onClick={() => signedFileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  signedDrag
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/40"
                }`}
              >
                <Upload className={`w-8 h-8 mx-auto mb-2 ${signedDrag ? "text-blue-500" : "text-gray-400"}`} />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {signedDrag ? "Drop signed LOI here" : "Upload the contractor-signed & stamped LOI copy"}
                </p>
                <p className="text-xs text-gray-400 mt-1">PDF, JPG — max 20 MB</p>
                <input ref={signedFileRef} type="file" className="sr-only"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ""; }} />
              </div>
            )}

            {signedDoc && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                <Paperclip className="w-4 h-4 text-green-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{signedDoc.name}</p>
                  <p className="text-xs text-green-600 dark:text-green-400">Signed copy uploaded</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {signedDoc.url && (
                    <>
                      <a href={signedDoc.url} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                        <Eye className="w-4 h-4" />
                      </a>
                      <a href={signedDoc.url} download={signedDoc.name}
                        className="p-1.5 rounded text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                        <Download className="w-4 h-4" />
                      </a>
                    </>
                  )}
                  {canEdit && (
                    <button onClick={removeSignedDoc}
                      className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {!canEdit && !signedDoc && (
              <p className="text-sm text-gray-400 text-center py-4">No signed copy uploaded.</p>
            )}
          </div>
        </div>

        {/* Checklist before issue */}
        {canEdit && l1Bidder && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-500" /> Pre-Issue Checklist
            </p>
            <div className="space-y-2">
              {[
                { label: "L1 bidder identified from financial evaluation",  done: !!l1Bidder },
                { label: "GB Resolution uploaded and approved",             done: !!finBid?.gbResolution },
                { label: "Office note recorded in financial bid",           done: !!finBid?.officeNote },
                { label: "Signed LOI copy uploaded",                       done: !!signedDoc },
              ].map(({ label, done }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    done ? "bg-green-500" : "bg-gray-200 dark:bg-gray-600"
                  }`}>
                    {done && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <p className={`text-sm ${done ? "text-gray-700 dark:text-gray-200" : "text-gray-400 dark:text-gray-500"}`}>
                    {label}
                    {!done && label.includes("Signed") && (
                      <span className="ml-1 text-xs text-amber-500">(optional but recommended)</span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Bar */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
          <div className="flex flex-wrap gap-3">

            {/* Always-visible View + Download for authorized users when LOI exists */}
            {(loa || l1Bidder) && (
              <>
                <button onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 text-sm font-medium transition-colors">
                  <Download className="w-4 h-4" /> Download LOI
                </button>
                <a href="#loa-preview"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm font-medium transition-colors">
                  <Eye className="w-4 h-4" /> View LOI
                </a>
              </>
            )}

            {/* Tender Clerk: Save LOI */}
            {isTenderClerk && canEdit && (
              <button
                onClick={handleSaveLOI}
                disabled={saving || !l1Bidder}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60"
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-gray-400/40 border-t-gray-400 rounded-full animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                Save LOI
              </button>
            )}

            {canEdit && (
              <>
                <button
                  onClick={handleIssueLOA}
                  disabled={saving || !l1Bidder}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {saving ? (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Submit for LOI Approval
                </button>
                <button
                  onClick={() => setShowReturnDialog(true)}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors disabled:opacity-60"
                >
                  <RotateCcw className="w-4 h-4" /> Return for Clarification
                </button>
              </>
            )}

            {isIssued && (
              <>
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 font-medium">
                  <CheckCircle2 className="w-4 h-4" /> LOI issued to {loa?.l1Contractor ?? l1Name}
                </div>
                <Link href={`/work-order/${project.id}`}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors ml-auto">
                  <Send className="w-4 h-4" /> Proceed to Work Order →
                </Link>
              </>
            )}
          </div>

          {/* Footer metadata */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
            <span>Contractor: <strong className="text-gray-600 dark:text-gray-300">{l1Name}</strong></span>
            <span>Contract Value: <strong className="text-gray-600 dark:text-gray-300">{formatINR(amount)}</strong></span>
            <span>Quoted: <strong className="text-gray-600 dark:text-gray-300">{fmtPct(l1Pct)}</strong></span>
            <span>Period: <strong className="text-gray-600 dark:text-gray-300">{completionPeriod}</strong></span>
          </div>
        </div>

      </div>
    </>
  );
}
