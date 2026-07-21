"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  AlertCircle,
  Send,
  CheckCircle2,
  XCircle,
  Trophy,
  Medal,
  Award,
  TrendingDown,
  TrendingUp,
  Minus,
  Upload,
  FileText,
  Trash2,
  Eye,
  Download,
  MessageSquare,
  Info,
  BarChart3,
  Users,
  RefreshCw,
  Paperclip,
  Clock,
  BadgeCheck,
  ShieldCheck,
} from "lucide-react";
import { store } from "@/store/iims.store";
import type { IProject, IBidder, IFinancialBidData, IDocument } from "@/types/iims.types";
import { formatINR, StatusBadge } from "@/components/dashboard/dash-shared";

// ─── helpers ─────────────────────────────────────────────────────────────────

function bidAmount(estimatedAmt: number, pct: number): number {
  return Math.round(estimatedAmt * (1 + pct / 100));
}

function fmtPct(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

function pctLabel(pct: number): string {
  if (pct < 0) return `${Math.abs(pct).toFixed(2)}% below estimate`;
  if (pct > 0) return `${pct.toFixed(2)}% above estimate`;
  return "At estimate";
}

function rankIcon(rank: number) {
  if (rank === 1) return <Trophy  className="w-4 h-4 text-yellow-500" />;
  if (rank === 2) return <Medal   className="w-4 h-4 text-gray-400"   />;
  if (rank === 3) return <Award   className="w-4 h-4 text-amber-600"  />;
  return null;
}

function rankLabel(rank: number) {
  if (rank === 1) return "L1";
  if (rank === 2) return "L2";
  if (rank === 3) return "L3";
  return `L${rank}`;
}

const MAX_SIZE = 20 * 1024 * 1024;

// ─── Ranked bidder row type ───────────────────────────────────────────────────

interface RankedBidder extends IBidder {
  amount: number;
  rank: number;
  pct: number;
}

// ─── Pct input cell ──────────────────────────────────────────────────────────

function PctInput({
  value, onChange, readOnly,
}: {
  value: string; onChange: (v: string) => void; readOnly: boolean;
}) {
  if (readOnly) {
    return (
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
        {value !== "" ? fmtPct(Number(value)) : "—"}
      </span>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0.00"
        className="w-24 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 text-right"
      />
      <span className="text-xs text-gray-400">%</span>
    </div>
  );
}

// ─── L1 Highlight Card ────────────────────────────────────────────────────────

function L1Card({ bidder, estimatedAmt }: { bidder: RankedBidder; estimatedAmt: number }) {
  const isBelow = bidder.pct < 0;
  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-300 dark:border-green-700 rounded-xl p-5">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center shrink-0">
          <Trophy className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-0.5">
            L1 Bidder — Lowest Quote
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-white truncate">{bidder.name}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2">
            <div>
              <p className="text-[10px] text-green-600 dark:text-green-500">Quoted Percentage</p>
              <p className={`text-base font-bold flex items-center gap-1 ${isBelow ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {isBelow ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                {fmtPct(bidder.pct)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{pctLabel(bidder.pct)}</p>
            </div>
            <div>
              <p className="text-[10px] text-green-600 dark:text-green-500">Contract Amount</p>
              <p className="text-base font-bold text-gray-900 dark:text-white">{formatINR(bidder.amount)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                vs. estimate {formatINR(estimatedAmt)} ({isBelow ? "saving" : "excess"}: {formatINR(Math.abs(bidder.amount - estimatedAmt))})
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Remarks Dialog (for EE / CAFO / ACEO actions) ───────────────────────────

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
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${config.confirmColor === "green" ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
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
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
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

// ─── Main View ────────────────────────────────────────────────────────────────

export function FinancialBidView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [project, setProject] = useState<IProject | null>(null);
  const [userRole, setUserRole] = useState("");
  const [saving,  setSaving]  = useState(false);

  // per-bidder percentage inputs (bidder.id → string value)
  const [pctMap, setPctMap] = useState<Record<string, string>>({});

  // office note
  const [officeNote, setOfficeNote] = useState("");

  // Comparative Statement / Supporting document
  const [gbFile, setGbFile] = useState<{ id: string; name: string; size: number; url: string } | null>(null);
  const [gbDrag, setGbDrag]   = useState(false);

  // action dialog (EE / CAFO / ACEO)
  const [actionDialog, setActionDialog] = useState<RemarksDialogConfig | null>(null);

  const load = useCallback(() => {
    const p = store.getProjectById(projectId);
    setProject(p);
    setUserRole(store.getCurrentUser()?.role ?? "");

    if (p?.tenderData?.financialBid) {
      const fb = p.tenderData.financialBid;
      setOfficeNote(fb.officeNote ?? "");
      if (fb.gbResolution) {
        setGbFile({
          id: fb.gbResolution.id,
          name: fb.gbResolution.name,
          size: 0,
          url: fb.gbResolution.url ?? "",
        });
      }
      const map: Record<string, string> = {};
      fb.qualifiedBidders.forEach((b) => {
        if (b.quotedPercentage !== undefined) map[b.id] = String(b.quotedPercentage);
      });
      setPctMap(map);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    return () => { if (gbFile?.url.startsWith("blob:")) URL.revokeObjectURL(gbFile.url); };
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
  const techBid     = tenderData?.technicalBid;
  const finBid      = tenderData?.financialBid;

  // ── Stage / role detection ────────────────────────────────────────────────

  // stage-12 status is "Technical Bid Finalized" — TC enters financial bid data here
  const isTCStage    = project.status === "Technical Bid Finalized";
  const isEEStage    = project.status === "Financial Bid - EE Review";
  const isCAFOStage  = project.status === "Financial Bid - CAFO Review";
  const isACEOStage  = project.status === "Financial Bid - ACEO Review";
  // After ACEO approves, physical papers go to GB; IIMS status = "Pending GB Approval"
  const isApproved   = project.status === "Pending GB Approval";

  const isTenderClerk = userRole === "Tender Clerk";
  const isEERole      = userRole === "Executive Engineer";
  const isCAFORole    = userRole === "Chief Accounts and Finance Officer";
  const isACEORole    = userRole === "Additional Chief Executive Officer";

  const canEdit       = isTCStage && isTenderClerk;
  const isReviewStage = isEEStage || isCAFOStage || isACEOStage;

  const estimatedAmt = project.technicalSanctionAmount ?? project.estimatedAmount ?? 0;

  // Qualified bidders sourced from Technical Bid
  const qualifiedBidders: IBidder[] = techBid?.bidders.filter(
    (b) => b.technicalEligibilityStatus === "Qualified"
  ) ?? finBid?.qualifiedBidders ?? [];

  // Build ranked list — sorted ascending (lowest amount = L1)
  const ranked: RankedBidder[] = qualifiedBidders
    .map((b) => {
      const pctStr = pctMap[b.id];
      const pct    = pctStr !== undefined && pctStr !== "" ? Number(pctStr) : NaN;
      return {
        ...b,
        pct: isNaN(pct) ? 0 : pct,
        amount: bidAmount(estimatedAmt, isNaN(pct) ? 0 : pct),
        rank: 0,
      };
    })
    .filter((b) => pctMap[b.id] !== undefined && pctMap[b.id] !== "")
    .sort((a, b) => a.amount - b.amount)
    .map((b, i) => ({ ...b, rank: i + 1 }));

  const displayBidders: (IBidder & { ranked?: RankedBidder })[] = qualifiedBidders.map((b) => ({
    ...b,
    ranked: ranked.find((r) => r.id === b.id),
  }));

  const l1         = ranked[0];
  const hasAllPct  = qualifiedBidders.length > 0 &&
    qualifiedBidders.every((b) => pctMap[b.id] !== undefined && pctMap[b.id] !== "");

  // ── Comparative Statement file handlers ────────────────────────────────────

  function pickGbFile(file: File) {
    const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
    if (![".pdf", ".doc", ".docx"].includes(ext)) { toast.error("Invalid file type. Allowed types: PDF, DOC, DOCX"); return; }
    if (file.size > MAX_SIZE) { toast.error("File exceeds 20 MB."); return; }
    if (gbFile?.url.startsWith("blob:")) URL.revokeObjectURL(gbFile.url);
    setGbFile({ id: `GB${Date.now()}`, name: file.name, size: file.size, url: URL.createObjectURL(file) });
  }

  function removeGb() {
    if (gbFile?.url.startsWith("blob:")) URL.revokeObjectURL(gbFile.url);
    setGbFile(null);
  }

  function buildGbDoc(): IDocument | undefined {
    if (!gbFile) return undefined;
    return {
      id: gbFile.id,
      name: gbFile.name,
      type: "application/pdf",
      url: gbFile.url,
      uploadedAt: new Date().toISOString(),
      uploadedBy: store.getCurrentUser()?.name ?? "Unknown",
    };
  }

  // ── Build payload ──────────────────────────────────────────────────────────

  function buildPayload(status: string): IFinancialBidData {
    const biddersWithPct: IBidder[] = qualifiedBidders.map((b) => ({
      ...b,
      quotedPercentage: pctMap[b.id] !== undefined && pctMap[b.id] !== ""
        ? Number(pctMap[b.id])
        : undefined,
    }));

    return {
      qualifiedBidders: biddersWithPct,
      l1Bidder: ranked[0] ? { ...ranked[0], quotedPercentage: ranked[0].pct } : undefined,
      l2Bidder: ranked[1] ? { ...ranked[1], quotedPercentage: ranked[1].pct } : undefined,
      l3Bidder: ranked[2] ? { ...ranked[2], quotedPercentage: ranked[2].pct } : undefined,
      officeNote,
      gbResolution: buildGbDoc(),
      status,
      approvedBy: store.getCurrentUser()?.name,
    };
  }

  // ── TC: Save draft ─────────────────────────────────────────────────────────

  async function handleSave() {
    if (!project || !tenderData) return;
    setSaving(true);
    try {
      store.updateProject(project.id, {
        tenderData: { ...tenderData, financialBid: buildPayload("In Progress") },
      });
      toast.success("Financial bid evaluation saved.");
      load();
    } finally { setSaving(false); }
  }

  // ── TC: Forward for EE review ──────────────────────────────────────────────

  async function handleForward() {
    if (!project || !tenderData) return;
    if (!hasAllPct) {
      toast.error("Enter quoted percentages for all qualified bidders.");
      return;
    }
    if (!l1) {
      toast.error("No L1 bidder determined — check percentage entries.");
      return;
    }
    setSaving(true);
    try {
      const fb = buildPayload("Submitted for Review");
      store.updateProject(project.id, { tenderData: { ...tenderData, financialBid: fb } });
      const fwdResult = store.forwardProject(
        project.id,
        "Executive Engineer",
        `Financial bid office note submitted for review. L1: ${l1.name} at ${fmtPct(l1.pct)}.`,
        "Financial Bid - EE Review"
      );
      if (!fwdResult.ok) { toast.error(fwdResult.error); return; }
      toast.success(`Financial bid forwarded to Executive Engineer. L1: ${l1.name} at ${fmtPct(l1.pct)}.`);
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  // ── EE: Approve → forward to CAFO ─────────────────────────────────────────

  async function handleEEApprove(remarks: string) {
    if (!project) return;
    setSaving(true);
    try {
      const r = store.forwardProject(
        project.id,
        "Chief Accounts and Finance Officer",
        remarks,
        "Financial Bid - CAFO Review"
      );
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Financial Bid approved and forwarded to CAFO.");
      setActionDialog(null);
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  // ── EE: Return to TC ───────────────────────────────────────────────────────

  async function handleEEReturn(remarks: string) {
    if (!project || !tenderData) return;
    setSaving(true);
    try {
      if (tenderData.financialBid) {
        store.updateProject(project.id, {
          tenderData: {
            ...tenderData,
            financialBid: { ...tenderData.financialBid, status: "In Progress" },
          },
        });
      }
      const r = store.rejectProject(
        project.id,
        "Tender Clerk",
        remarks,
        "Technical Bid Finalized"
      );
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Financial Bid returned to Tender Clerk with remarks.");
      setActionDialog(null);
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  // ── CAFO: Approve → forward to ACEO ───────────────────────────────────────

  async function handleCAFOApprove(remarks: string) {
    if (!project) return;
    setSaving(true);
    try {
      const r = store.forwardProject(
        project.id,
        "Additional Chief Executive Officer",
        remarks,
        "Financial Bid - ACEO Review"
      );
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Financial Bid approved and forwarded to Additional CEO.");
      setActionDialog(null);
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  // ── CAFO: Return to EE ─────────────────────────────────────────────────────

  async function handleCAFOReturn(remarks: string) {
    if (!project) return;
    setSaving(true);
    try {
      const r = store.rejectProject(
        project.id,
        "Executive Engineer",
        remarks,
        "Financial Bid - EE Review"
      );
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Financial Bid returned to Executive Engineer with remarks.");
      setActionDialog(null);
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  // ── ACEO: Approve → Pending GB Approval ───────────────────────────────────
  // Physical papers go to Governing Body; IIMS status = "Pending GB Approval"

  async function handleACEOApprove(remarks: string) {
    if (!project || !tenderData) return;
    setSaving(true);
    try {
      const user = store.getCurrentUser();
      store.updateProject(project.id, {
        tenderData: {
          ...tenderData,
          financialBid: {
            ...(tenderData.financialBid ?? { qualifiedBidders: [], officeNote: "", status: "" }),
            status: "Approved — Pending GB",
            approvedBy: user?.name,
          },
        },
      });
      const r = store.approveProject(project.id, "Pending GB Approval", remarks);
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Financial Bid approved. Physical papers submitted to Governing Body. GB Approval stage is now active.");
      setActionDialog(null);
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  // ── ACEO: Return to CAFO ───────────────────────────────────────────────────

  async function handleACEOReturn(remarks: string) {
    if (!project) return;
    setSaving(true);
    try {
      const r = store.rejectProject(
        project.id,
        "Chief Accounts and Finance Officer",
        remarks,
        "Financial Bid - CAFO Review"
      );
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Financial Bid returned to CAFO with remarks.");
      setActionDialog(null);
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  // ── Stage banner info ──────────────────────────────────────────────────────

  const reviewBannerInfo = isEEStage
    ? { role: "Executive Engineer Review", hint: "Review the financial bid evaluation, L1 determination, office note, and comparative statement. Recommend L1 or return to Tender Clerk." }
    : isCAFOStage
    ? { role: "CAFO Review", hint: "Review financial implications, budget availability, and L1 recommendation. Approve to forward to Additional CEO or return to Executive Engineer." }
    : isACEOStage
    ? { role: "Additional CEO — Administrative Recommendation", hint: "Review the financial bid recommendation. Approve to forward for GB Approval or return to CAFO." }
    : null;

  return (
    <>
      {actionDialog && (
        <RemarksDialog
          config={actionDialog}
          onCancel={() => setActionDialog(null)}
          saving={saving}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-start gap-4">
          <Link href={`/project/${project.id}`}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors mt-0.5 shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Financial Bid Evaluation</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">{project.projectName}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {isApproved && (
              <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <BadgeCheck className="w-3.5 h-3.5" /> Approved
              </span>
            )}
            {isReviewStage && (
              <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                <Clock className="w-3.5 h-3.5" /> Under Review
              </span>
            )}
            <StatusBadge status={tenderData?.status ?? project.status} />
          </div>
        </div>

        {/* Reference-only notice */}
        <div className="flex gap-3 rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-4 py-3.5">
          <AlertCircle className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <span className="font-semibold">Reference only.&nbsp;</span>
            Financial Bid evaluation is performed externally on MahaTender. This module is retained for reference purposes only.
          </p>
        </div>

        {/* Tender info strip */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Tender Information</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Tender ID",         value: tenderData?.tenderId ?? "—" },
              { label: "Sanctioned Amount",  value: formatINR(estimatedAmt) },
              { label: "EMD Required",      value: formatINR(tenderData?.emdAmount ?? 0) },
              { label: "Qualified Bidders", value: String(qualifiedBidders.length) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">{label}</p>
                <p className="text-sm font-bold text-blue-800 dark:text-blue-200 mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Review stage banner — shown to EE / CAFO / ACEO */}
        {reviewBannerInfo && (
          <div className="flex gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{reviewBannerInfo.role}</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">{reviewBannerInfo.hint}</p>
            </div>
          </div>
        )}

        {/* TC viewing while bid is under review */}
        {isReviewStage && isTenderClerk && (
          <div className="flex gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Submitted — Awaiting Approval</p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                The Financial Bid office note is currently under review. No edits are allowed until returned.
              </p>
            </div>
          </div>
        )}

        {/* Approved notice (ACEO approved, papers sent to GB) */}
        {isApproved && (
          <div className="flex gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4">
            <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">Financial Bid Approved — Pending GB Approval</p>
              <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                Physical papers submitted to Governing Body.
                {finBid?.approvedBy && <span className="ml-1">Approved by: <strong>{finBid.approvedBy}</strong></span>}
                {finBid?.l1Bidder && <span className="ml-1">L1: <strong>{finBid.l1Bidder.name}</strong> at {fmtPct(finBid.l1Bidder.quotedPercentage ?? 0)}.</span>}
              </p>
            </div>
          </div>
        )}

        {/* No qualified bidders guard */}
        {qualifiedBidders.length === 0 && (
          <div className="flex gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">No Qualified Bidders</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                Complete the Technical Bid evaluation and qualify at least one bidder before proceeding.
              </p>
              <Link href={`/technical-bid/${project.id}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline mt-1">
                <Users className="w-3 h-3" /> Go to Technical Bid
              </Link>
            </div>
          </div>
        )}

        {/* Qualified bidders list */}
        {qualifiedBidders.length > 0 && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-700/30">
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Qualified Bidders from Technical Evaluation
                </h2>
              </div>
              <span className="text-xs text-gray-400">{qualifiedBidders.length} bidder{qualifiedBidders.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="px-6 py-3 flex flex-wrap gap-2">
              {qualifiedBidders.map((b, i) => (
                <span key={b.id} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="w-3 h-3" />
                  {i + 1}. {b.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Financial Bid Table */}
        {qualifiedBidders.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-700/30">
              <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Financial Bid Evaluation — Quoted Percentages</h2>
              <span className="ml-auto text-xs text-gray-400">
                Sanctioned: <strong className="text-gray-600 dark:text-gray-300">{formatINR(estimatedAmt)}</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 w-8">Rank</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 min-w-[200px]">Bidder Name</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 w-44">
                      Quoted % <span className="text-gray-400 font-normal">(+above / −below)</span>
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 w-44">Bid Amount (₹)</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 w-20">L-Rank</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {displayBidders.map((b) => {
                    const r      = b.ranked;
                    const pctStr = pctMap[b.id] ?? "";
                    const pct    = pctStr !== "" ? Number(pctStr) : NaN;
                    const amt    = !isNaN(pct) ? bidAmount(estimatedAmt, pct) : null;
                    const isL1   = r?.rank === 1;
                    const isBelow = !isNaN(pct) && pct < 0;

                    return (
                      <tr key={b.id}
                        className={`transition-colors ${
                          isL1
                            ? "bg-green-50/60 dark:bg-green-900/10"
                            : r?.rank === 2
                            ? "bg-blue-50/30 dark:bg-blue-900/5"
                            : ""
                        }`}>
                        <td className="px-5 py-4">
                          {r ? (
                            <div className="flex items-center justify-center w-7 h-7 rounded-full
                              bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-sm">
                              {rankIcon(r.rank)}
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                              <span className="text-xs text-gray-400">—</span>
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            {isL1 && <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-500 text-white">L1</span>}
                            <span className={`font-medium ${isL1 ? "text-green-800 dark:text-green-200" : "text-gray-800 dark:text-gray-100"}`}>
                              {b.name}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!isNaN(pct) && (
                              isBelow
                                ? <TrendingDown className="w-4 h-4 text-green-500 shrink-0" />
                                : pct > 0
                                ? <TrendingUp className="w-4 h-4 text-red-400 shrink-0" />
                                : <Minus className="w-4 h-4 text-gray-400 shrink-0" />
                            )}
                            <PctInput
                              value={pctStr}
                              onChange={(v) => setPctMap((m) => ({ ...m, [b.id]: v }))}
                              readOnly={!canEdit}
                            />
                          </div>
                          {!isNaN(pct) && (
                            <p className={`text-[10px] mt-0.5 ${isBelow ? "text-green-600 dark:text-green-400" : pct > 0 ? "text-red-500" : "text-gray-400"}`}>
                              {pctLabel(pct)}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          {amt !== null ? (
                            <div>
                              <p className={`font-bold ${isL1 ? "text-green-700 dark:text-green-400" : "text-gray-700 dark:text-gray-200"}`}>
                                {formatINR(amt)}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {amt < estimatedAmt
                                  ? `saving ${formatINR(estimatedAmt - amt)}`
                                  : amt > estimatedAmt
                                  ? `excess ${formatINR(amt - estimatedAmt)}`
                                  : "at estimate"}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-center">
                          {r ? (
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                              r.rank === 1 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : r.rank === 2 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : r.rank === 3 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                            }`}>
                              {rankLabel(r.rank)}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Comparison footer */}
                {ranked.length > 1 && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
                      <td colSpan={2} className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Spread between L1 and L{ranked.length}
                      </td>
                      <td colSpan={2} className="px-5 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-200">
                        {fmtPct(ranked[ranked.length - 1].pct - ranked[0].pct)} difference in percentage
                      </td>
                      <td className="px-5 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-200">
                        {formatINR(ranked[ranked.length - 1].amount - ranked[0].amount)} spread
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {canEdit && qualifiedBidders.length > 0 && !hasAllPct && (
              <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                <Info className="w-3.5 h-3.5" />
                Enter quoted percentages for all bidders to see automatic L1/L2/L3 determination.
              </div>
            )}
          </div>
        )}

        {/* L1 Highlight Card */}
        {l1 && <L1Card bidder={l1} estimatedAmt={estimatedAmt} />}

        {/* Comparative chart */}
        {ranked.length > 1 && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
              <BarChart3 className="w-4 h-4 text-blue-500" aria-hidden="true" />
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Comparative Statement</p>
            </div>
            <div className="p-5 space-y-3">
              {ranked.map((b) => {
                const max    = ranked[ranked.length - 1].amount;
                const barPct = max > 0 ? Math.max(4, Math.round((b.amount / max) * 100)) : 4;
                return (
                  <div key={b.id}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={`font-medium ${b.rank === 1 ? "text-green-700 dark:text-green-400" : "text-gray-600 dark:text-gray-300"}`}>
                        {rankLabel(b.rank)} — {b.name}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">{formatINR(b.amount)}</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${barPct}%` }}
                        className={`h-full rounded-full transition-all ${
                          b.rank === 1 ? "bg-green-500"
                          : b.rank === 2 ? "bg-blue-400"
                          : b.rank === 3 ? "bg-amber-400"
                          : "bg-gray-400"
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Comparative Statement / Supporting Document Upload */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-700/30">
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Supporting Documents</h3>
            <span className="ml-auto text-xs text-gray-400">Comparative Statement, Financial Bid Documents</span>
          </div>
          <div className="p-6">
            {canEdit && !gbFile && (
              <div
                onDragEnter={(e) => { e.preventDefault(); setGbDrag(true); }}
                onDragLeave={(e) => { e.preventDefault(); setGbDrag(false); }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault(); setGbDrag(false);
                  const f = e.dataTransfer.files[0];
                  if (f) pickGbFile(f);
                }}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  gbDrag
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/40"
                }`}
              >
                <Upload className={`w-8 h-8 mx-auto mb-2 ${gbDrag ? "text-blue-500" : "text-gray-400"}`} />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {gbDrag ? "Drop file here" : "Click or drag & drop — Comparative Statement or Financial Bid Document"}
                </p>
                <p className="text-xs text-gray-400 mt-1">PDF, DOCX — max 20 MB</p>
                <input ref={fileRef} type="file" className="sr-only"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) pickGbFile(f);
                    e.target.value = "";
                  }} />
              </div>
            )}

            {gbFile && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                <Paperclip className="w-4 h-4 text-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{gbFile.name}</p>
                  {gbFile.size > 0 && (
                    <p className="text-xs text-gray-400">{(gbFile.size / 1024 / 1024).toFixed(1)} MB</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {gbFile.url && (
                    <>
                      <a href={gbFile.url} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                        <Eye className="w-4 h-4" />
                      </a>
                      <a href={gbFile.url} download={gbFile.name}
                        className="p-1.5 rounded text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                        <Download className="w-4 h-4" />
                      </a>
                    </>
                  )}
                  {canEdit && (
                    <button onClick={removeGb}
                      className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {!canEdit && !gbFile && (
              <p className="text-sm text-gray-400 text-center py-4">No documents attached.</p>
            )}
          </div>
        </div>

        {/* Office Note */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
            <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Office Note
          </label>
          {canEdit ? (
            <>
              <textarea
                rows={5}
                value={officeNote}
                onChange={(e) => setOfficeNote(e.target.value)}
                placeholder="Record committee observations, negotiations, justification for award recommendation, any special conditions or waivers…"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 resize-none transition"
              />
              <p className="text-xs text-gray-400 text-right mt-1">{officeNote.length} chars</p>
            </>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/40 rounded-lg p-4 whitespace-pre-wrap min-h-[80px]">
              {officeNote || "No office note recorded."}
            </p>
          )}
        </div>

        {/* ── Action Bar ─────────────────────────────────────────────────────── */}

        {/* TC Actions */}
        {isTCStage && isTenderClerk && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
            <div className="flex flex-wrap gap-3">
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors disabled:opacity-60">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Save Progress
              </button>
              <button
                onClick={handleForward}
                disabled={saving || !hasAllPct || !l1}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                <Send className="w-4 h-4" /> Forward Financial Bids for Review
              </button>
            </div>
            {qualifiedBidders.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-1">
                {!hasAllPct && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Enter quoted percentages for all {qualifiedBidders.length} qualified bidder{qualifiedBidders.length !== 1 ? "s" : ""}.
                  </p>
                )}
                {hasAllPct && l1 && (
                  <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    Ready — L1 is {l1.name} at {fmtPct(l1.pct)} ({formatINR(l1.amount)}).
                  </p>
                )}
              </div>
            )}
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
                  description: "Financial Bid will be forwarded to CAFO for financial review.",
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
                  description: "Financial Bid will be returned to Tender Clerk for correction.",
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
                  description: "Financial Bid recommendation will be forwarded to Additional CEO.",
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
                  description: "Financial Bid will be returned to Executive Engineer for revision.",
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
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Additional CEO — Approval Actions</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setActionDialog({
                  title: "Approve Financial Bid Recommendation",
                  description: "Financial Bid will be approved. Physical papers will be submitted to Governing Body for GB Approval.",
                  confirmLabel: "Approve Financial Bid",
                  confirmColor: "green",
                  required: true,
                  onConfirm: handleACEOApprove,
                })}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                <BadgeCheck className="w-4 h-4" /> Approve Financial Bid Recommendation
              </button>
              <button
                onClick={() => setActionDialog({
                  title: "Return to CAFO",
                  description: "Financial Bid recommendation will be returned to CAFO for further review.",
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

        {/* Approved — no further actions */}
        {isApproved && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 font-medium">
              <BadgeCheck className="w-4 h-4" />
              Financial Bid Approved — Pending GB Approval. TC records GB outcome in the GB Approval stage.
            </div>
          </div>
        )}

      </div>
    </>
  );
}
