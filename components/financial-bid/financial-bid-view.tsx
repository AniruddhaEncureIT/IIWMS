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
  pct: number; // resolved from quotedPercentage
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

// ─── Main View ────────────────────────────────────────────────────────────────

export function FinancialBidView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [project, setProject] = useState<IProject | null>(null);
  const [saving,  setSaving]  = useState(false);

  // per-bidder percentage inputs (bidder.id → string value)
  const [pctMap, setPctMap] = useState<Record<string, string>>({});

  // office note
  const [officeNote, setOfficeNote] = useState("");

  // GB Resolution file
  const [gbFile, setGbFile] = useState<{ id: string; name: string; size: number; url: string } | null>(null);
  const [gbDrag, setGbDrag]   = useState(false);

  const load = useCallback(() => {
    const p = store.getProjectById(projectId);
    setProject(p);

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
      // restore pct values from saved bidders
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

  const tenderData   = project.tenderData;
  const techBid      = tenderData?.technicalBid;
  const finBid       = tenderData?.financialBid;
  const isSubmitted  = finBid?.status === "Recommended for LOA";
  const canEdit      = !isSubmitted;

  const estimatedAmt = project.estimatedAmount ?? 0;

  // Qualified bidders come from technical bid
  const qualifiedBidders: IBidder[] = techBid?.bidders.filter(
    (b) => b.technicalEligibilityStatus === "Qualified"
  ) ?? finBid?.qualifiedBidders ?? [];

  // Build ranked list — bidders with a quoted percentage, sorted ascending (lowest amount = L1)
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

  // keep original order for display but with rank attached
  const displayBidders: (IBidder & { ranked?: RankedBidder })[] = qualifiedBidders.map((b) => ({
    ...b,
    ranked: ranked.find((r) => r.id === b.id),
  }));

  const l1 = ranked[0];
  const hasAllPct = qualifiedBidders.length > 0 &&
    qualifiedBidders.every((b) => pctMap[b.id] !== undefined && pctMap[b.id] !== "");

  // ── GB file ────────────────────────────────────────────────────────────────

  function pickGbFile(file: File) {
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

  // ── payload ────────────────────────────────────────────────────────────────

  function buildPayload(status: string): IFinancialBidData {
    const biddersWithPct: IBidder[] = qualifiedBidders.map((b) => ({
      ...b,
      quotedPercentage: pctMap[b.id] !== undefined && pctMap[b.id] !== ""
        ? Number(pctMap[b.id])
        : undefined,
    }));

    return {
      qualifiedBidders: biddersWithPct,
      l1Bidder: ranked[0]
        ? { ...ranked[0], quotedPercentage: ranked[0].pct }
        : undefined,
      l2Bidder: ranked[1]
        ? { ...ranked[1], quotedPercentage: ranked[1].pct }
        : undefined,
      l3Bidder: ranked[2]
        ? { ...ranked[2], quotedPercentage: ranked[2].pct }
        : undefined,
      officeNote,
      gbResolution: buildGbDoc(),
      status,
      approvedBy: store.getCurrentUser()?.name,
    };
  }

  // ── actions ────────────────────────────────────────────────────────────────

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

  async function handleRecommend() {
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
      const fb = buildPayload("Recommended for LOI");
      store.updateProject(project.id, { tenderData: { ...tenderData, financialBid: fb } });
      const fwdResult = store.forwardProject(project.id, "Executive Engineer", `Financial bid complete. L1: ${l1.name} at ${fmtPct(l1.pct)}`, "Financial Bid - EE Review");
      if (!fwdResult.ok) { toast.error(fwdResult.error); return; }
      toast.success(`Financial bid forwarded to EE. L1: ${l1.name} at ${fmtPct(l1.pct)}`);
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  return (
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
        <div className="shrink-0">
          <StatusBadge status={tenderData?.status ?? project.status} />
        </div>
      </div>

      {/* Tender info strip */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Tender Information</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Tender ID",       value: tenderData?.tenderId ?? "—" },
            { label: "Estimate Amount", value: formatINR(estimatedAmt) },
            { label: "EMD Required",    value: formatINR(tenderData?.emdAmount ?? 0) },
            { label: "Qualified Bidders", value: String(qualifiedBidders.length) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">{label}</p>
              <p className="text-sm font-bold text-blue-800 dark:text-blue-200 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Submitted notice */}
      {isSubmitted && (
        <div className="flex gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-800 dark:text-green-300">
              Financial Bid Recommended for LOA
            </p>
            <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
              L1: {finBid?.l1Bidder?.name ?? "—"} — approved by {finBid?.approvedBy ?? "—"}
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

      {/* Qualified bidders list (from tech bid) */}
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
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Financial Bid Evaluation</h2>
            <span className="ml-auto text-xs text-gray-400">
              Estimate: <strong className="text-gray-600 dark:text-gray-300">{formatINR(estimatedAmt)}</strong>
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
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 w-20">Rank</th>
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

          {/* Live L1 hint below table */}
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

      {/* Comparative summary bar */}
      {ranked.length > 1 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
            <BarChart3 className="w-4 h-4 text-blue-500" aria-hidden="true" />
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Comparative Chart</p>
          </div>
          <div className="p-5 space-y-3">
            {ranked.map((b) => {
              // scale relative to the highest bid
              const max = ranked[ranked.length - 1].amount;
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

      {/* GB Resolution Upload */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-700/30">
          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">GB Resolution</h3>
          <span className="ml-auto text-xs text-gray-400">Governing Body approval document</span>
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
                {gbDrag ? "Drop GB Resolution here" : "Click or drag & drop the GB Resolution document"}
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
            <p className="text-sm text-gray-400 text-center py-4">No GB Resolution uploaded.</p>
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
          <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/40 rounded-lg p-4 whitespace-pre-wrap">
            {officeNote || "No office note recorded."}
          </p>
        )}
      </div>

      {/* Action Bar */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap gap-3">
          {canEdit && (
            <>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors disabled:opacity-60">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Save Progress
              </button>
              <button onClick={handleRecommend}
                disabled={saving || !hasAllPct || !l1}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                <Send className="w-4 h-4" /> Recommend for LOA
              </button>
            </>
          )}

          {isSubmitted && (
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Recommended for LOA — L1: {finBid?.l1Bidder?.name}
            </div>
          )}
        </div>

        {/* Validation hints */}
        {canEdit && qualifiedBidders.length > 0 && (
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

    </div>
  );
}
