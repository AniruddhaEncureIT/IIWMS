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
  Info,
  Check,
  XCircle,
  Lock,
  BadgeCheck,
  ShieldCheck,
} from "lucide-react";
import { store } from "@/store/iims.store";
import type { IProject, ILOAData, IDocument, IGBApprovalData } from "@/types/iims.types";
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

// ─── Remarks Dialog ────────────────────────────────────────────────────────────

interface RemarksDialogConfig {
  title: string;
  description: string;
  confirmLabel: string;
  confirmColor: "green" | "red";
  required: boolean;
  onConfirm: (remarks: string) => void;
}

function RemarksDialog({
  config, onCancel, saving,
}: {
  config: RemarksDialogConfig;
  onCancel: () => void;
  saving: boolean;
}) {
  const [remarks, setRemarks] = useState("");

  function submit() {
    if (config.required && !remarks.trim()) {
      toast.error("Remarks are required for this action.");
      return;
    }
    config.onConfirm(remarks.trim());
  }

  const btnCls = config.confirmColor === "green"
    ? "bg-green-600 hover:bg-green-700 focus-visible:ring-green-500"
    : "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-start gap-3 px-6 py-5 border-b border-gray-100 dark:border-gray-700">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
            config.confirmColor === "green"
              ? "bg-green-100 dark:bg-green-900/30"
              : "bg-red-100 dark:bg-red-900/30"
          }`}>
            {config.confirmColor === "green"
              ? <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
              : <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{config.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{config.description}</p>
          </div>
        </div>
        <div className="px-6 py-4 space-y-3">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Remarks {config.required && <span className="text-red-500">*</span>}
          </label>
          <textarea
            rows={4}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder={config.required ? "Remarks are required…" : "Optional remarks…"}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
            autoFocus
          />
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
          <button type="button" onClick={onCancel} disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60">
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={saving}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 ${btnCls}`}>
            {saving
              ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : config.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Read-only doc row ────────────────────────────────────────────────────────

function ReadOnlyDocRow({ label, doc }: { label: string; doc?: IDocument }) {
  if (!doc) {
    return (
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
        <p className="text-sm text-gray-400 italic">Not uploaded</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
        <Paperclip className="w-4 h-4 text-green-500 shrink-0" />
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 flex-1 min-w-0 truncate">{doc.name}</p>
        <div className="flex items-center gap-1 shrink-0">
          {doc.url && (
            <>
              <a href={doc.url} target="_blank" rel="noopener noreferrer"
                className="p-1.5 rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="View">
                <Eye className="w-4 h-4" />
              </a>
              <a href={doc.url} download={doc.name}
                className="p-1.5 rounded text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors" title="Download">
                <Download className="w-4 h-4" />
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── LOI Document Preview ─────────────────────────────────────────────────────

function LOIPreview({
  project, l1Name, l1Pct, amount, completionPeriod, contractorAddress, tenderId, tsNumber,
}: {
  project: IProject; l1Name: string; l1Pct: number; amount: number;
  completionPeriod: string; contractorAddress: string; tenderId: string; tsNumber?: string;
}) {
  const today     = fmtDate();
  const loiNumber = `LOI/${new Date().getFullYear()}/${project.id.slice(-4)}`;

  return (
    <div id="loi-preview"
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden font-serif">
      <div className="bg-gradient-to-r from-blue-700 to-blue-800 px-8 py-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-sans font-semibold uppercase tracking-widest opacity-80">Zilla Parishad, Pune Division</p>
            <p className="text-xs font-sans opacity-70 mt-0.5">Infrastructure &amp; Works Management System</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-sans opacity-70">Ref No.</p>
            <p className="text-sm font-sans font-bold">{loiNumber}</p>
          </div>
        </div>
      </div>

      <div className="px-10 py-8 space-y-6 text-gray-800 dark:text-gray-200">
        <div className="text-center border-b-2 border-gray-800 dark:border-gray-200 pb-4">
          <h2 className="text-xl font-bold uppercase tracking-wide">Letter of Intent</h2>
          <p className="text-sm mt-1 font-sans text-gray-500 dark:text-gray-400">Date: {today}</p>
        </div>

        <div>
          <p className="text-sm font-sans font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide text-xs mb-1">To,</p>
          <p className="font-bold text-base">{l1Name}</p>
          {contractorAddress
            ? <p className="text-sm mt-1 whitespace-pre-wrap text-gray-600 dark:text-gray-300">{contractorAddress}</p>
            : <p className="text-sm mt-1 italic text-gray-400">[Contractor Address]</p>}
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg px-4 py-3">
          <p className="text-xs font-sans font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Subject</p>
          <p className="text-sm font-semibold">Award of Contract for: {project.projectName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Tender ID: {tenderId}{tsNumber ? ` | TS No.: ${tsNumber}` : ""}
          </p>
        </div>

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
            rate of <strong>{fmtPct(l1Pct)} ({pctLabel(l1Pct)})</strong>, as per your quoted
            percentage on the Schedule of Rates (SSR/DSR).
          </p>
          <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden mt-4">
            <table className="w-full text-sm font-sans">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  ["Name of Work",               project.projectName],
                  ["Contract Value (₹)",         formatINR(amount)],
                  ["Quoted Percentage",          `${fmtPct(l1Pct)} (${pctLabel(l1Pct)})`],
                  ["Completion Period",          completionPeriod],
                  ["Technical Sanction No.",     tsNumber ?? "As per file"],
                  ["Tender ID",                  tenderId],
                  ["Governing Body Resolution",  "As per Resolution passed on record"],
                ].map(([label, value]) => (
                  <tr key={label} className="even:bg-gray-50 dark:even:bg-gray-700/20">
                    <td className="px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-400 w-52">{label}</td>
                    <td className="px-4 py-2.5 text-gray-800 dark:text-gray-200">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>You are directed to submit the following within <strong>15 days</strong> from the date of this letter:</p>
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

        <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 font-sans text-xs text-gray-500 dark:text-gray-400">
          <p className="font-semibold mb-1 text-gray-600 dark:text-gray-300">Contractor&apos;s Acknowledgement</p>
          <p>I/We, the undersigned contractor, hereby acknowledge receipt of this Letter of Intent and accept all terms and conditions stated herein.</p>
          <div className="mt-4 flex items-end gap-16">
            <div><div className="h-8 border-b border-dashed border-gray-300 dark:border-gray-600 w-36 mb-1" /><p>Signature</p></div>
            <div><div className="h-8 border-b border-dashed border-gray-300 dark:border-gray-600 w-32 mb-1" /><p>Date</p></div>
            <div><div className="h-8 border-b border-dashed border-gray-300 dark:border-gray-600 w-24 mb-1" /><p>Seal</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function LOAView({ projectId }: { projectId: string }) {
  const router      = useRouter();
  const signedFileRef = useRef<HTMLInputElement>(null);

  const [project,       setProject]       = useState<IProject | null>(null);
  const [saving,        setSaving]        = useState(false);
  const [actionDialog,  setActionDialog]  = useState<RemarksDialogConfig | null>(null);

  // TC-editable fields
  const [contractorAddress, setContractorAddress] = useState("");
  const [signedDoc,         setSignedDoc]         = useState<{ id: string; name: string; size: number; url: string } | null>(null);
  const [signedDrag,        setSignedDrag]        = useState(false);

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
    // Pre-fill contractor address
    const gbAppr = p?.tenderData?.gbApproval;
    const l1     = p?.tenderData?.financialBid?.l1Bidder;
    if (gbAppr?.l1Contractor) setContractorAddress(gbAppr.l1Contractor);
    else if (l1)               setContractorAddress(l1.name);
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

  const tenderData = project.tenderData;
  const finBid     = tenderData?.financialBid;
  const gbApproval = tenderData?.gbApproval as IGBApprovalData | undefined;
  const loa        = tenderData?.loa;

  // ── Stage / role detection ─────────────────────────────────────────────────

  // stage-16 status = "Financial Bid Approved" — TC prepares LOI here
  const isTCStage    = project.status === "Financial Bid Approved";
  const isEEStage    = project.status === "LOI - EE Review";
  const isCAFOStage  = project.status === "LOI - CAFO Review";
  const isACEOStage  = project.status === "LOI - ACEO Approval";
  // After ACEO approves, loa.status = "LOI Issued" and project moves to Work Order stage
  const isIssued     = loa?.status === "LOI Issued" || loa?.status === "LOA Issued" ||
                       project.status === "Work Order - TC Preparation" ||
                       project.status.includes("Work Order");
  const isReviewStage = isEEStage || isCAFOStage || isACEOStage;

  const currentUser   = store.getCurrentUser();
  const userRole      = currentUser?.role ?? "";
  const isTenderClerk = userRole === "Tender Clerk";
  const isEERole      = userRole === "Executive Engineer";
  const isCAFORole    = userRole === "Chief Accounts and Finance Officer";
  const isACEORole    = userRole === "Additional Chief Executive Officer";

  const canEdit = isTCStage && isTenderClerk;

  // ── Derived values from GB Approval (auto-fetched, read-only) ─────────────

  const l1Bidder    = finBid?.l1Bidder;
  const l1Name      = gbApproval?.l1Contractor || l1Bidder?.name || loa?.l1Contractor || "—";
  const l1PctRaw    = gbApproval != null
    ? (gbApproval.percentageType === "Above"
        ? gbApproval.aboveBelowPercentage
        : gbApproval.percentageType === "Below"
        ? -gbApproval.aboveBelowPercentage
        : 0)
    : (l1Bidder?.quotedPercentage ?? loa?.approvedPercentage ?? 0);
  const l1Pct       = l1PctRaw;
  const estimatedAmt = project.estimatedAmount ?? 0;
  const tsAmt        = project.technicalSanctionAmount ?? estimatedAmt;
  const amount      = loa?.approvedAmount ?? Math.round(tsAmt * (1 + l1Pct / 100));
  const completionPeriod = tenderData?.completionPeriod ?? project.dtpData?.completionPeriod ?? "";
  const tsNumber    = project.dtpData?.tsNumber;
  const tenderId    = tenderData?.tenderId ?? "—";

  // GB Approval documents (auto-fetched, visible to all roles)
  const gbResolutionDoc  = gbApproval?.gbResolutionDoc;
  const approvalLetterDoc = gbApproval?.approvalLetterDoc;

  // ── File handlers ──────────────────────────────────────────────────────────

  function pickFile(file: File) {
    const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
    if (![".pdf", ".jpg", ".jpeg", ".png"].includes(ext)) { toast.error("Invalid file type. Allowed types: PDF, JPG, PNG"); return; }
    if (file.size > MAX_SIZE) { toast.error("File exceeds 20 MB."); return; }
    if (signedDoc?.url.startsWith("blob:")) URL.revokeObjectURL(signedDoc.url);
    setSignedDoc({ id: `SLOI${Date.now()}`, name: file.name, size: file.size, url: URL.createObjectURL(file) });
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
      uploadedBy: currentUser?.name ?? "Unknown",
    };
  }

  // ── Download plain-text LOI ────────────────────────────────────────────────

  function handleDownload() {
    if (!project) return;
    const lines = [
      "LETTER OF INTENT", "=================",
      `Ref No.: LOI/${new Date().getFullYear()}/${project.id.slice(-4)}`,
      `Date: ${fmtDate()}`, "",
      "To,", l1Name, contractorAddress || "[Address]", "",
      `Sub: Award of Contract for ${project.projectName}`,
      `Tender ID: ${tenderId}`, tsNumber ? `TS No.: ${tsNumber}` : "", "",
      "Sir/Madam,", "",
      `With reference to Tender Notice No. ${tenderId}, your firm has been identified as the L1 bidder.`,
      `You are hereby awarded the contract at ${fmtPct(l1Pct)} (${pctLabel(l1Pct)}).`, "",
      "AWARD PARTICULARS", "-----------------",
      `Name of Work         : ${project.projectName}`,
      `Contract Value       : ${formatINR(amount)}`,
      `Quoted Percentage    : ${fmtPct(l1Pct)}`,
      `Completion Period    : ${completionPeriod}`,
      `Technical Sanction   : ${tsNumber ?? "As per file"}`, "",
      "CONDITIONS:",
      "1. Submit Performance Security (5% of contract value) within 15 days.",
      "2. Submit Security Deposit (5% of contract value) within 15 days.",
      "3. Submit signed agreement within 15 days.",
      "4. Commence work within 15 days of this letter.",
      `5. Complete work within ${completionPeriod} from commencement.`, "",
      "Executive Engineer                Additional CEO",
      "Pune Zilla Parishad              Pune Zilla Parishad",
    ].filter((l) => l !== undefined).join("\n");

    const blob = new Blob([lines], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `LOI_${project.id}_${l1Name.replace(/\s+/g, "_").slice(0, 20)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── TC: Save draft ────────────────────────────────────────────────────────

  async function handleSaveLOI() {
    if (!project || !tenderData) return;
    setSaving(true);
    try {
      const existing = tenderData.loa;
      const loaData: ILOAData = {
        l1Contractor:      l1Name,
        approvedPercentage: l1Pct,
        approvedAmount:    amount,
        completionPeriod,
        status:            existing?.status ?? "LOI Draft",
        issuedDate:        existing?.issuedDate ?? new Date().toISOString(),
        documents:         signedDoc ? [buildSignedIDoc()!] : (existing?.documents ?? []),
      };
      store.updateProject(project.id, { tenderData: { ...tenderData, loa: loaData } });
      toast.success("LOI saved.");
      load();
    } finally { setSaving(false); }
  }

  // ── TC: Submit for EE review ───────────────────────────────────────────────

  async function handleSubmitForEE() {
    if (!project || !tenderData) return;
    if (!gbApproval) {
      toast.error("GB Approval record not found. Complete GB Approval before submitting LOI.");
      return;
    }
    if (!gbApproval.l1Contractor) {
      toast.error("L1 contractor not recorded in GB Approval. Complete GB Approval first.");
      return;
    }
    if (!gbApproval.gbResolutionDoc) {
      toast.error("GB Resolution Copy is missing. Upload it in GB Approval before submitting.");
      return;
    }
    if (!gbApproval.approvalLetterDoc) {
      toast.error("Approval Letter is missing. Upload it in GB Approval before submitting.");
      return;
    }
    setSaving(true);
    try {
      const loaData: ILOAData = {
        l1Contractor:      l1Name,
        approvedPercentage: l1Pct,
        approvedAmount:    amount,
        completionPeriod,
        status:            "Submitted for Review",
        issuedDate:        new Date().toISOString(),
        documents:         signedDoc ? [buildSignedIDoc()!] : [],
      };
      store.updateProject(project.id, { tenderData: { ...tenderData, loa: loaData } });
      const r = store.forwardProject(
        project.id, "Executive Engineer",
        `LOI submitted for approval. L1: ${l1Name} at ${fmtPct(l1Pct)}. Value: ${formatINR(amount)}.`,
        "LOI - EE Review"
      );
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("LOI submitted for EE review.");
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  // ── EE: Approve → CAFO ───────────────────────────────────────────────────

  async function handleEEApprove(remarks: string) {
    if (!project) return;
    setSaving(true);
    try {
      const r = store.forwardProject(project.id, "Chief Accounts and Finance Officer", remarks, "LOI - CAFO Review");
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("LOI approved and forwarded to CAFO.");
      setActionDialog(null);
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  // ── EE: Return → TC ──────────────────────────────────────────────────────

  async function handleEEReturn(remarks: string) {
    if (!project || !tenderData) return;
    setSaving(true);
    try {
      if (tenderData.loa) {
        store.updateProject(project.id, {
          tenderData: { ...tenderData, loa: { ...tenderData.loa, status: "In Progress" } },
        });
      }
      const r = store.rejectProject(project.id, "Tender Clerk", remarks, "Financial Bid Approved");
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("LOI returned to Tender Clerk with remarks.");
      setActionDialog(null);
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  // ── CAFO: Approve → ACEO ─────────────────────────────────────────────────

  async function handleCAFOApprove(remarks: string) {
    if (!project) return;
    setSaving(true);
    try {
      const r = store.forwardProject(project.id, "Additional Chief Executive Officer", remarks, "LOI - ACEO Approval");
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("LOI approved and forwarded to Additional CEO.");
      setActionDialog(null);
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  // ── CAFO: Return → EE ────────────────────────────────────────────────────

  async function handleCAFOReturn(remarks: string) {
    if (!project) return;
    setSaving(true);
    try {
      const r = store.rejectProject(project.id, "Executive Engineer", remarks, "LOI - EE Review");
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("LOI returned to Executive Engineer with remarks.");
      setActionDialog(null);
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  // ── ACEO: Approve → LOI Issued ───────────────────────────────────────────
  // Sets loa.status = "LOI Issued" and moves project to Work Order stage

  async function handleACEOApprove(remarks: string) {
    if (!project || !tenderData) return;
    setSaving(true);
    try {
      const loaData: ILOAData = {
        ...(tenderData.loa ?? {
          l1Contractor: l1Name, approvedPercentage: l1Pct,
          approvedAmount: amount, completionPeriod, issuedDate: new Date().toISOString(), documents: [],
        }),
        status:     "LOI Issued",
        approvedBy: currentUser?.name,
      };
      store.updateProject(project.id, { tenderData: { ...tenderData, loa: loaData } });
      const r = store.approveProject(project.id, "Work Order - TC Preparation", remarks);
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("LOI approved and issued. Work Order preparation stage is now open.");
      setActionDialog(null);
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  // ── ACEO: Return → CAFO ──────────────────────────────────────────────────

  async function handleACEOReturn(remarks: string) {
    if (!project) return;
    setSaving(true);
    try {
      const r = store.rejectProject(project.id, "Chief Accounts and Finance Officer", remarks, "LOI - CAFO Review");
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("LOI returned to CAFO with remarks.");
      setActionDialog(null);
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  // ── Review banner info ────────────────────────────────────────────────────

  const reviewBannerInfo = isEEStage
    ? { role: "Executive Engineer Review", hint: "Review the LOI details, approved percentage, contract value, and all supporting documents." }
    : isCAFOStage
    ? { role: "CAFO Review", hint: "Review the LOI for financial correctness, approved percentage, and budget compliance." }
    : isACEOStage
    ? { role: "Additional CEO — Final Approval", hint: "Review and approve the LOI. Approval will issue the LOI and open the Work Order preparation stage." }
    : null;

  return (
    <>
      {actionDialog && (
        <RemarksDialog config={actionDialog} onCancel={() => setActionDialog(null)} saving={saving} />
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
            {isReviewStage && (
              <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                <Clock className="w-3.5 h-3.5" /> Under Review
              </span>
            )}
            <StatusBadge status={project.status} />
            <button onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors">
              <Download className="w-4 h-4" /> Download LOI
            </button>
          </div>
        </div>

        {/* Review stage banner */}
        {reviewBannerInfo && (
          <div className="flex gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{reviewBannerInfo.role}</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">{reviewBannerInfo.hint}</p>
            </div>
          </div>
        )}

        {/* TC: awaiting review banner */}
        {isReviewStage && isTenderClerk && (
          <div className="flex gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">LOI Submitted — Awaiting Approval</p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                LOI is currently under review. No edits are allowed until returned.
              </p>
            </div>
          </div>
        )}

        {/* Issued banner */}
        {isIssued && (
          <div className="flex gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4">
            <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">LOI Issued Successfully</p>
              <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                Issued to <strong>{loa?.l1Contractor ?? l1Name}</strong>
                {loa?.approvedBy && <span> — Approved by <strong>{loa.approvedBy}</strong></span>}
                {loa?.issuedDate && <span> on {fmtDate(loa.issuedDate)}</span>}.
                Proceed to issue Work Order.
              </p>
            </div>
          </div>
        )}

        {/* No GB Approval guard — shown whenever gbApproval record is absent, regardless of l1Bidder */}
        {!gbApproval && !isIssued && (
          <div className="flex gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">GB Approval Not Recorded</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                GB Approval must be completed before this LOI can be submitted. GB Resolution Copy and Approval Letter are required.
              </p>
              <Link href={`/gb-approval/${project.id}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline mt-1">
                → Go to GB Approval
              </Link>
            </div>
          </div>
        )}
        {/* GB Approval exists but documents are incomplete */}
        {gbApproval && (!gbApproval.gbResolutionDoc || !gbApproval.approvalLetterDoc) && !isIssued && (
          <div className="flex gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">GB Approval Documents Incomplete</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                {!gbApproval.gbResolutionDoc && !gbApproval.approvalLetterDoc
                  ? "GB Resolution Copy and Approval Letter are missing."
                  : !gbApproval.gbResolutionDoc
                  ? "GB Resolution Copy is missing."
                  : "Approval Letter is missing."}
                {" "}Upload them in GB Approval before submitting the LOI.
              </p>
              <Link href={`/gb-approval/${project.id}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline mt-1">
                → Go to GB Approval
              </Link>
            </div>
          </div>
        )}

        {/* Auto-fetched / Read-only Award Details */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-5 h-5 text-yellow-300" />
              <p className="text-xs font-semibold text-blue-100 uppercase tracking-widest">L1 Contractor — Auto-fetched from GB Approval</p>
            </div>
            <h2 className="text-2xl font-bold text-white truncate">{l1Name}</h2>
          </div>

          <div className="p-6 space-y-5">
            {/* Core numbers */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
              <div>
                <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 mb-1">
                  {l1Pct < 0
                    ? <TrendingDown className="w-3.5 h-3.5 text-green-500" />
                    : <TrendingUp className="w-3.5 h-3.5 text-red-400" />}
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
                  <p className="text-xs font-medium">Approved Amount</p>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{formatINR(amount)}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">vs. sanctioned {formatINR(tsAmt)}</p>
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

            {/* Disabled notice */}
            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/40 rounded-lg px-3 py-2">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              These fields are auto-fetched from GB Approval and are read-only. Edit via GB Approval to update.
            </div>

            {/* GB documents (visible to all roles, always) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-gray-700">
              <ReadOnlyDocRow label="GB Resolution Copy" doc={gbResolutionDoc} />
              <ReadOnlyDocRow label="Approval Letter"    doc={approvalLetterDoc} />
            </div>
          </div>
        </div>

        {/* TC: Contractor Address (editable) */}
        {(canEdit || contractorAddress) && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
              <Building2 className="w-4 h-4 text-blue-500" />
              Contractor Address
              <span className="text-xs font-normal text-gray-400 ml-1">(appears in the LOI document)</span>
            </label>
            {canEdit ? (
              <textarea
                rows={3}
                value={contractorAddress}
                onChange={(e) => setContractorAddress(e.target.value)}
                placeholder={"M/s. Contractor Name\nPlot No. XX, Area\nCity – PIN Code"}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 resize-none transition"
              />
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/40 rounded-lg px-3 py-2.5 whitespace-pre-wrap min-h-[60px]">
                {contractorAddress || "—"}
              </p>
            )}
          </div>
        )}

        {/* LOI Document Preview */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-gray-400" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">LOI Document Preview</p>
            <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 italic">Read-only preview</span>
          </div>
          <LOIPreview
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

        {/* Signed LOI document upload (TC only, editable only when TC stage) */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-700/30">
            <Stamp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Signed LOI Document</h3>
            <span className="ml-auto text-xs text-gray-400">
              {signedDoc ? "1 file uploaded" : canEdit ? "Upload contractor-signed copy" : "No signed copy uploaded"}
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
                }`}>
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

        {/* TC pre-issue checklist */}
        {canEdit && (gbApproval || l1Bidder) && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-500" /> Pre-Issue Checklist
            </p>
            <div className="space-y-2">
              {[
                { label: "GB Approval recorded",              done: !!gbApproval },
                { label: "L1 contractor confirmed",            done: !!l1Name && l1Name !== "—" },
                { label: "Office note in financial bid",       done: !!finBid?.officeNote },
                { label: "Signed LOI copy uploaded (optional)", done: !!signedDoc },
              ].map(({ label, done }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-green-500" : "bg-gray-200 dark:bg-gray-600"}`}>
                    {done && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <p className={`text-sm ${done ? "text-gray-700 dark:text-gray-200" : "text-gray-400 dark:text-gray-500"}`}>
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Action Bars ─────────────────────────────────────────────────────── */}

        {/* TC Actions */}
        {isTCStage && isTenderClerk && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
            <div className="flex flex-wrap gap-3">
              <button onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 text-sm font-medium transition-colors">
                <Download className="w-4 h-4" /> Download LOI
              </button>
              <a href="#loi-preview"
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm font-medium transition-colors">
                <Eye className="w-4 h-4" /> View LOI
              </a>
              <button onClick={handleSaveLOI} disabled={saving || (!gbApproval && !l1Bidder)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60">
                {saving
                  ? <span className="w-4 h-4 border-2 border-gray-400/40 border-t-gray-400 rounded-full animate-spin" />
                  : <FileText className="w-4 h-4" />}
                Save LOI
              </button>
              <button onClick={handleSubmitForEE} disabled={saving || !gbApproval || !gbApproval.l1Contractor || !gbApproval.gbResolutionDoc || !gbApproval.approvalLetterDoc}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
                {saving
                  ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : <Send className="w-4 h-4" />}
                Submit for LOI Approval
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
              <span>Contractor: <strong className="text-gray-600 dark:text-gray-300">{l1Name}</strong></span>
              <span>Contract Value: <strong className="text-gray-600 dark:text-gray-300">{formatINR(amount)}</strong></span>
              <span>Quoted: <strong className="text-gray-600 dark:text-gray-300">{fmtPct(l1Pct)}</strong></span>
              <span>Period: <strong className="text-gray-600 dark:text-gray-300">{completionPeriod}</strong></span>
            </div>
          </div>
        )}

        {/* EE Actions */}
        {isEEStage && isEERole && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">EE Review Actions</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setActionDialog({
                  title: "Approve & Forward to CAFO",
                  description: "LOI will be forwarded to CAFO for review.",
                  confirmLabel: "Approve & Forward",
                  confirmColor: "green",
                  required: true,
                  onConfirm: handleEEApprove,
                })}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                <CheckCircle2 className="w-4 h-4" /> Approve & Forward to CAFO
              </button>
              <button
                onClick={() => setActionDialog({
                  title: "Return to Tender Clerk",
                  description: "LOI will be returned to Tender Clerk for revision.",
                  confirmLabel: "Return with Remarks",
                  confirmColor: "red",
                  required: true,
                  onConfirm: handleEEReturn,
                })}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                <XCircle className="w-4 h-4" /> Return to Tender Clerk
              </button>
            </div>
          </div>
        )}

        {/* CAFO Actions */}
        {isCAFOStage && isCAFORole && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">CAFO Review Actions</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setActionDialog({
                  title: "Approve & Forward to Additional CEO",
                  description: "LOI will be forwarded to Additional CEO for final approval.",
                  confirmLabel: "Approve & Forward",
                  confirmColor: "green",
                  required: true,
                  onConfirm: handleCAFOApprove,
                })}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                <CheckCircle2 className="w-4 h-4" /> Approve & Forward to Additional CEO
              </button>
              <button
                onClick={() => setActionDialog({
                  title: "Return to Executive Engineer",
                  description: "LOI will be returned to Executive Engineer for revision.",
                  confirmLabel: "Return with Remarks",
                  confirmColor: "red",
                  required: true,
                  onConfirm: handleCAFOReturn,
                })}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                <XCircle className="w-4 h-4" /> Return to Executive Engineer
              </button>
            </div>
          </div>
        )}

        {/* ACEO Actions */}
        {isACEOStage && isACEORole && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Additional CEO — Final Approval</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setActionDialog({
                  title: "Approve & Issue LOI",
                  description: "LOI will be approved and issued. Status will change to 'LOI Issued' and Work Order preparation will open.",
                  confirmLabel: "Approve LOI",
                  confirmColor: "green",
                  required: true,
                  onConfirm: handleACEOApprove,
                })}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                <BadgeCheck className="w-4 h-4" /> Approve & Issue LOI
              </button>
              <button
                onClick={() => setActionDialog({
                  title: "Return to CAFO",
                  description: "LOI will be returned to CAFO for further review.",
                  confirmLabel: "Return with Remarks",
                  confirmColor: "red",
                  required: true,
                  onConfirm: handleACEOReturn,
                })}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                <XCircle className="w-4 h-4" /> Return to CAFO
              </button>
            </div>
          </div>
        )}

        {/* Issued — proceed to Work Order */}
        {isIssued && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 font-medium">
                <CheckCircle2 className="w-4 h-4" /> LOI issued to {loa?.l1Contractor ?? l1Name}
              </div>
              {isTenderClerk && (
                <Link href={`/work-order/${project.id}`}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors ml-auto">
                  <Send className="w-4 h-4" /> Proceed to Work Order →
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Always-visible download row for reviewers */}
        {isReviewStage && (loa || gbApproval || l1Bidder) && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
            <div className="flex flex-wrap gap-3">
              <button onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 text-sm font-medium transition-colors">
                <Download className="w-4 h-4" /> Download LOI
              </button>
              <a href="#loi-preview"
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm font-medium transition-colors">
                <Eye className="w-4 h-4" /> View LOI
              </a>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
