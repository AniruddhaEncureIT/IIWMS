"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Send,
  Upload,
  Download,
  Eye,
  Trash2,
  Paperclip,
  FileText,
  AlertCircle,
  CheckCircle2,
  Building2,
  IndianRupee,
  Clock,
  Calendar,
  Shield,
  Lock,
  ClipboardList,
  Check,
  Info,
  ChevronDown,
  ChevronUp,
  Stamp,
} from "lucide-react";
import { store } from "@/store/iims.store";
import type { IProject, IWorkOrderData, IDocument } from "@/types/iims.types";
import { formatINR, StatusBadge } from "@/components/dashboard/dash-shared";

// ─── helpers ─────────────────────────────────────────────────────────────────

function genWorkOrderNumber(projectId: string) {
  const year = new Date().getFullYear();
  const seq  = projectId.slice(-4).toUpperCase();
  return `WO/${year}/${seq}`;
}

function addDays(date: string, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function parsePeriodDays(period: string): number {
  const m = period.match(/(\d+)\s*(month|year|day)/i);
  if (!m) return 365;
  const n = parseInt(m[1]);
  if (/year/i.test(m[2]))  return n * 365;
  if (/month/i.test(m[2])) return n * 30;
  return n;
}

function fmtDate(s?: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateInput(s?: string) {
  if (!s) return "";
  return s.slice(0, 10);
}

const MAX_SIZE = 20 * 1024 * 1024;

const DEMO_CONTRACTORS = [
  "M/s. Shree Ram Construction",
  "M/s. Patil Constructions Pvt. Ltd.",
  "M/s. Jadhav & Sons Contractors",
  "M/s. Desai Infrastructure Ltd.",
  "M/s. Maharashtra Builders",
  "M/s. Pune Civil Works Co.",
  "M/s. National Construction Corp.",
  "M/s. Apex Contractors",
] as const;

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({
  icon, title, badge, children, defaultOpen = true,
}: {
  icon: React.ReactNode; title: string; badge?: React.ReactNode;
  children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-6 py-4 bg-gray-50/70 dark:bg-gray-700/40 border-b border-gray-100 dark:border-gray-700 text-left hover:bg-gray-100/60 dark:hover:bg-gray-700/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
      >
        <span className="text-blue-600 dark:text-blue-400" aria-hidden="true">{icon}</span>
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex-1">{title}</span>
        {badge}
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" aria-hidden="true" />
        )}
      </button>
      {open && <div className="p-6">{children}</div>}
    </div>
  );
}

// ─── File Drop Zone ───────────────────────────────────────────────────────────

function FileDropZone({
  label, hint, onPick, doc, onRemove, canEdit, accept = ".pdf,.jpg,.jpeg,.png",
}: {
  label: string; hint?: string; accept?: string;
  onPick: (f: File) => void; doc: { name: string; url: string } | null;
  onRemove: () => void; canEdit: boolean;
}) {
  const ref  = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{label}</p>
      {canEdit && !doc && (
        <div
          onDragEnter={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDrag(false); }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onPick(f); }}
          onClick={() => ref.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            drag
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/40"
          }`}
        >
          <Upload className={`w-7 h-7 mx-auto mb-2 ${drag ? "text-blue-500" : "text-gray-400"}`} />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {drag ? `Drop ${label} here` : `Upload ${label}`}
          </p>
          {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
          <input ref={ref} type="file" accept={accept} className="sr-only"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ""; }} />
        </div>
      )}
      {doc && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
          <Paperclip className="w-4 h-4 text-green-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{doc.name}</p>
            <p className="text-xs text-green-600 dark:text-green-400">Uploaded</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {doc.url && (
              <>
                <a href={doc.url} target="_blank" rel="noopener noreferrer"
                  className="p-1.5 rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                  <Eye className="w-4 h-4" />
                </a>
                <a href={doc.url} download={doc.name}
                  className="p-1.5 rounded text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                  <Download className="w-4 h-4" />
                </a>
              </>
            )}
            {canEdit && (
              <button onClick={onRemove}
                className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
      {!canEdit && !doc && (
        <p className="text-sm text-gray-400 italic">No document uploaded.</p>
      )}
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function WorkOrderView({ projectId }: { projectId: string }) {
  const router = useRouter();

  const [project, setProject] = useState<IProject | null>(null);
  const [saving,  setSaving]  = useState(false);

  // ── current user / role ───────────────────────────────────────────────────
  const currentUser = store.getCurrentUser();
  const role = currentUser?.role ?? "";
  const isEE = role === "Executive Engineer";

  // ── form fields ────────────────────────────────────────────────────────────
  const [woNumber,           setWoNumber]           = useState("");
  const [contractorName,     setContractorName]     = useState("");
  const [contractorGST,      setContractorGST]      = useState("");
  const [contractorAddress,  setContractorAddress]  = useState("");
  const [contractAmount,     setContractAmount]     = useState("");
  const [completionPeriod,   setCompletionPeriod]   = useState("");
  const [commencementDate,   setCommencementDate]   = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [workCompletionDate, setWorkCompletionDate] = useState("");
  const [securityDeposit,    setSecurityDeposit]    = useState("");
  const [sdPctInput,         setSdPctInput]         = useState("4");
  const [performanceAmt,     setPerformanceAmt]     = useState("");
  const [clauses,            setClauses]            = useState("");

  // ── new fields ─────────────────────────────────────────────────────────────
  const [percentageType,  setPercentageType]  = useState<"Below" | "Above" | "Equal">("Below");
  const [bidPercentage,   setBidPercentage]   = useState("");
  const [demandDraftNumber, setDemandDraftNumber] = useState("");
  const [demandDraftDate,   setDemandDraftDate]   = useState("");

  // ── uploaded documents ─────────────────────────────────────────────────────
  const [pgDoc,        setPgDoc]        = useState<{ name: string; url: string } | null>(null);
  const [agreementDoc, setAgreementDoc] = useState<{ name: string; url: string } | null>(null);

  // blob URL cleanup refs
  const pgBlobRef  = useRef<string | null>(null);
  const agBlobRef  = useRef<string | null>(null);

  const load = useCallback(() => {
    const p = store.getProjectById(projectId);
    setProject(p);
    if (!p) return;

    const wo  = p.workOrderData;
    const loa = p.tenderData?.loa;
    const fin = p.tenderData?.financialBid;

    // If work order already exists, load persisted data
    if (wo) {
      setWoNumber(wo.workOrderNumber ?? wo.workOrderId ?? genWorkOrderNumber(p.id));
      setContractorName(wo.l1Contractor ?? "");
      setContractorGST(wo.contractorGST ?? "");
      setContractorAddress(wo.contractorAddress ?? "");
      setContractAmount(String(wo.contractAmount ?? ""));
      setCompletionPeriod(wo.completionPeriod ?? "");
      setCommencementDate(fmtDateInput(wo.commencementDate) || new Date().toISOString().slice(0, 10));
      setWorkCompletionDate(fmtDateInput(wo.workCompletionDate));
      setSecurityDeposit(String(wo.securityDeposit ?? ""));
      const loadedSdPct = wo.securityDepositPercentage
        ? String(wo.securityDepositPercentage)
        : (wo.contractAmount && wo.securityDeposit
          ? String(((wo.securityDeposit / wo.contractAmount) * 100).toFixed(2))
          : "4");
      setSdPctInput(loadedSdPct);
      setPerformanceAmt(String(typeof wo.performanceGuarantee === "number" ? wo.performanceGuarantee : ""));
      setClauses(wo.clauses ?? "");
      if (wo.percentageType) setPercentageType(wo.percentageType);
      if (wo.bidPercentage != null) setBidPercentage(String(wo.bidPercentage));
      if (wo.demandDraftNumber) setDemandDraftNumber(wo.demandDraftNumber);
      if (wo.demandDraftDate) setDemandDraftDate(wo.demandDraftDate);

      if (wo.agreement) setAgreementDoc({ name: wo.agreement.name, url: wo.agreement.url ?? "" });
      if (wo.performanceGuarantee && typeof wo.performanceGuarantee !== "number") {
        const pgDoc = wo.performanceGuarantee as IDocument;
        setPgDoc({ name: pgDoc.name, url: pgDoc.url ?? "" });
      }
      return;
    }

    // Auto-populate from LOA / financial bid
    const l1Name   = loa?.l1Contractor ?? fin?.l1Bidder?.name ?? "";
    const amt      = loa?.approvedAmount ?? (fin?.l1Bidder ? Math.round((p.estimatedAmount ?? 0) * (1 + (fin.l1Bidder.quotedPercentage ?? 0) / 100)) : 0);
    const period   = loa?.completionPeriod ?? p.tenderData?.completionPeriod ?? p.dtpData?.completionPeriod ?? "12 months";
    const pg       = Math.round(amt * 0.05);
    const today    = new Date().toISOString().slice(0, 10);
    const days     = parsePeriodDays(period);
    const compDate = addDays(today, days);

    setWoNumber(genWorkOrderNumber(p.id));
    setContractorName(l1Name);
    setContractorAddress(loa?.l1Contractor ? `${l1Name}\n[Address]` : "");
    setContractAmount(String(amt));
    setCompletionPeriod(period);
    setCommencementDate(today);
    setWorkCompletionDate(compDate);
    setSdPctInput("4");
    setSecurityDeposit(String(Math.round(amt * 0.04)));
    setPerformanceAmt(String(pg));
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    return () => {
      if (pgBlobRef.current?.startsWith("blob:"))  URL.revokeObjectURL(pgBlobRef.current);
      if (agBlobRef.current?.startsWith("blob:"))  URL.revokeObjectURL(agBlobRef.current);
    };
  }, []);

  // ── computed ───────────────────────────────────────────────────────────────
  const amt         = parseFloat(contractAmount) || 0;
  const sdAmt       = parseFloat(securityDeposit) || 0;
  const pgAmt       = parseFloat(performanceAmt) || 0;
  const sdPct       = amt > 0 ? ((sdAmt / amt) * 100).toFixed(1) : "0";
  const pgPct       = amt > 0 ? ((pgAmt / amt) * 100).toFixed(1) : "0";

  // recompute work completion date when commencement or period changes
  useEffect(() => {
    if (commencementDate && completionPeriod) {
      const days = parsePeriodDays(completionPeriod);
      setWorkCompletionDate(addDays(commencementDate, days));
    }
  }, [commencementDate, completionPeriod]);

  // recompute SD amount when SD% or contract amount changes
  useEffect(() => {
    const pct = parseFloat(sdPctInput);
    const a   = parseFloat(contractAmount) || 0;
    if (!isNaN(pct) && a > 0) {
      setSecurityDeposit(String(Math.round(a * pct / 100)));
    }
  }, [sdPctInput, contractAmount]);

  // ── early null check (after hooks) ────────────────────────────────────────
  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-gray-300 dark:text-gray-600" />
        <p className="text-gray-500 dark:text-gray-400">Project not found.</p>
        <Link href="/all-projects" className="text-blue-600 hover:underline text-sm">← All Projects</Link>
      </div>
    );
  }

  const isIssued = project.workOrderData?.status === "Work Order Issued" ||
                   project.status.includes("Work Order Issued") ||
                   project.workOrderData?.status === "Work Order Approved" ||
                   project.status.includes("Work Order Approved");
  const isSubmitted = project.status.includes("Work Order - CAFO Review") ||
                      project.status.includes("Work Order - ACEO Approval") ||
                      isIssued;
  // EE can view/approve but not edit form fields; Tender Clerk edits
  const canEdit  = !isSubmitted && !isEE;

  // ── file handlers ──────────────────────────────────────────────────────────

  function pickPG(file: File) {
    if (file.size > MAX_SIZE) { toast.error("File exceeds 20 MB."); return; }
    if (pgBlobRef.current?.startsWith("blob:")) URL.revokeObjectURL(pgBlobRef.current);
    const url = URL.createObjectURL(file);
    pgBlobRef.current = url;
    setPgDoc({ name: file.name, url });
  }

  function removePG() {
    if (pgBlobRef.current?.startsWith("blob:")) URL.revokeObjectURL(pgBlobRef.current);
    pgBlobRef.current = null;
    setPgDoc(null);
  }

  function pickAgreement(file: File) {
    if (file.size > MAX_SIZE) { toast.error("File exceeds 20 MB."); return; }
    if (agBlobRef.current?.startsWith("blob:")) URL.revokeObjectURL(agBlobRef.current);
    const url = URL.createObjectURL(file);
    agBlobRef.current = url;
    setAgreementDoc({ name: file.name, url });
  }

  function removeAgreement() {
    if (agBlobRef.current?.startsWith("blob:")) URL.revokeObjectURL(agBlobRef.current);
    agBlobRef.current = null;
    setAgreementDoc(null);
  }

  function mkDoc(name: string, url: string): IDocument {
    return {
      id: `DOC${Date.now()}`,
      name, type: "application/pdf",
      url, uploadedAt: new Date().toISOString(),
      uploadedBy: store.getCurrentUser()?.name ?? "Unknown",
    };
  }

  // ── validation ─────────────────────────────────────────────────────────────

  function validate(): string | null {
    if (!contractorName.trim())   return "Contractor name is required.";
    if (amt <= 0)                  return "Contract amount must be greater than zero.";
    if (!completionPeriod.trim())  return "Completion period is required.";
    if (!commencementDate)         return "Commencement date is required.";
    if (!workCompletionDate)       return "Work completion date is required.";
    if (new Date(workCompletionDate) <= new Date(commencementDate))
      return "Work completion date must be after commencement date.";
    if (sdAmt < 0)                 return "Security deposit cannot be negative.";
    if (pgAmt < 0)                 return "Performance guarantee cannot be negative.";
    return null;
  }

  // ── save draft ─────────────────────────────────────────────────────────────

  async function handleSaveDraft() {
    if (!project) return;
    const err = validate();
    if (err) { toast.error(err); return; }
    setSaving(true);
    try {
      const payload = buildPayload("Work Order Draft");
      store.updateProject(project.id, { workOrderData: payload });
      toast.success("Work order saved as draft.");
      load();
    } finally { setSaving(false); }
  }

  // ── issue work order ───────────────────────────────────────────────────────

  async function handleIssue() {
    if (!project) return;
    const err = validate();
    if (err) { toast.error(err); return; }
    if (!agreementDoc) { toast.error("Please upload the signed agreement before issuing."); return; }

    setSaving(true);
    try {
      const payload = buildPayload("Submitted for Review");
      store.updateProject(project.id, { workOrderData: payload });
      const fwdResult = store.forwardProject(
        project.id,
        "Chief Accounts and Finance Officer",
        `Work Order submitted for CAFO review. Contractor: ${contractorName}. Contract: ${formatINR(amt)}.`,
        "Work Order - CAFO Review"
      );
      if (!fwdResult.ok) { toast.error(fwdResult.error); return; }
      toast.success("Work order submitted for CAFO review.");
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  // ── EE approve work order ──────────────────────────────────────────────────

  async function handleEEApprove() {
    if (!project) return;
    setSaving(true);
    try {
      const existing = project.workOrderData;
      if (existing) {
        store.updateProject(project.id, {
          workOrderData: {
            ...existing,
            status: "Work Order Issued",
            eeApprovedBy: currentUser?.name ?? "Executive Engineer",
            eeApprovedAt: new Date().toISOString(),
          },
        });
      }
      const appResult = store.approveProject(
        project.id,
        "Work Order Issued",
        `Work Order approved by Executive Engineer.`
      );
      if (!appResult.ok) { toast.error(appResult.error); return; }
      toast.success("Work Order approved by Executive Engineer.");
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  function buildPayload(status: string): IWorkOrderData {
    return {
      workOrderNumber: woNumber,
      workOrderId: woNumber,
      issueDate: new Date().toISOString(),
      issuedDate: new Date().toISOString(),
      l1Contractor: contractorName,
      l1BidAmount: amt,
      contractAmount: amt,
      contractorGST: contractorGST,
      contractorAddress: contractorAddress,
      completionPeriod,
      commencementDate,
      workCompletionDate,
      securityDeposit: sdAmt,
      securityDepositPercentage: parseFloat(sdPctInput) || 4,
      performanceGuarantee: pgDoc
        ? mkDoc(pgDoc.name, pgDoc.url)
        : pgAmt,
      agreement: agreementDoc ? mkDoc(agreementDoc.name, agreementDoc.url) : undefined,
      status,
      issuedBy: currentUser?.name ?? "Unknown",
      clauses,
      percentageType,
      bidPercentage: parseFloat(bidPercentage) || undefined,
      demandDraftNumber: demandDraftNumber.trim() || undefined,
      demandDraftDate: demandDraftDate || undefined,
    };
  }

  // ── download work order ────────────────────────────────────────────────────

  function handleDownload() {
    if (!project) return;
    const lines = [
      "WORK ORDER",
      "==========",
      `Work Order No.: ${woNumber}`,
      `Date: ${fmtDate(commencementDate)}`,
      "",
      "To,",
      contractorName,
      contractorAddress || "[Address]",
      contractorGST ? `GST No.: ${contractorGST}` : "",
      "",
      `Sub: Work Order for — ${project.projectName}`,
      "",
      "You are hereby instructed to commence the following work:",
      "",
      "CONTRACT PARTICULARS",
      "--------------------",
      `Name of Work          : ${project.projectName}`,
      `Work Order No.        : ${woNumber}`,
      `Contract Amount (₹)   : ${formatINR(amt)}`,
      `Security Deposit (₹)  : ${formatINR(sdAmt)} (${sdPct}%)`,
      `Performance Guarantee : ${formatINR(pgAmt)} (${pgPct}%)`,
      `Commencement Date     : ${fmtDate(commencementDate)}`,
      `Completion Date       : ${fmtDate(workCompletionDate)}`,
      `Completion Period     : ${completionPeriod}`,
      "",
      clauses ? `SPECIAL CLAUSES\n---------------\n${clauses}` : "",
      "",
      "GENERAL CONDITIONS:",
      "1. Work shall be carried out as per approved drawings and specifications.",
      "2. All materials shall conform to IS specifications.",
      "3. Security Deposit will be refunded after defect liability period.",
      "4. Any deviation requires prior written approval.",
      "5. Time is the essence of this contract.",
      "",
      "Executive Engineer",
      "Pune Zilla Parishad",
    ].filter(Boolean).join("\n");

    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `WO_${woNumber.replace(/\//g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── checklist ──────────────────────────────────────────────────────────────
  const checklist = [
    { label: "L1 contractor identified from LOI",    done: !!contractorName },
    { label: "Contract amount set",                  done: amt > 0 },
    { label: "Security deposit configured (≥5%)",    done: sdAmt > 0 && (sdAmt / amt) >= 0.049 },
    { label: "Performance guarantee configured (≥5%)", done: pgAmt > 0 && (pgAmt / amt) >= 0.049 },
    { label: "Commencement & completion dates set",  done: !!commencementDate && !!workCompletionDate },
    { label: "Signed agreement uploaded",            done: !!agreementDoc },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href={`/project/${project.id}`}
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors mt-0.5 shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Work Order</h1>
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
            <Download className="w-4 h-4" /> Download
          </button>
        </div>
      </div>

      {/* Submitted for review banner */}
      {isSubmitted && !isIssued && (
        <div className="flex gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
          <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Work Order Submitted for Approval</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Awaiting CAFO / ACEO approval. Contractor:{" "}
              <strong>{project.workOrderData?.l1Contractor}</strong>. Contract:{" "}
              <strong>{formatINR(project.workOrderData?.contractAmount ?? 0)}</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Issued banner */}
      {isIssued && (
        <div className="flex gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-800 dark:text-green-300">Work Order Issued</p>
            <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
              Issued to <strong>{project.workOrderData?.l1Contractor}</strong>. Contract:{" "}
              <strong>{formatINR(project.workOrderData?.contractAmount ?? 0)}</strong>. Proceed to MB &amp; Billing.
            </p>
          </div>
        </div>
      )}

      {/* Summary strip */}
      <div id="wo-summary" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: <FileText className="w-4 h-4" />, label: "Work Order No.", value: woNumber, color: "blue" },
          { icon: <IndianRupee className="w-4 h-4" />, label: "Contract Amount", value: amt > 0 ? formatINR(amt) : "—", color: "green" },
          { icon: <Clock className="w-4 h-4" />, label: "Completion Period", value: completionPeriod || "—", color: "amber" },
          { icon: <Calendar className="w-4 h-4" />, label: "Completion Date", value: workCompletionDate ? fmtDate(workCompletionDate) : "—", color: "violet" },
        ].map(({ icon, label, value, color }) => (
          <div key={label}
            className={`bg-white dark:bg-gray-800 rounded-xl border border-${color}-100 dark:border-${color}-900/30 p-4 shadow-sm`}>
            <div className={`flex items-center gap-1.5 text-${color}-500 dark:text-${color}-400 mb-1.5`}>
              {icon}
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
            </div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Section 1: Work Order Identification */}
      <SectionCard icon={<ClipboardList className="w-4 h-4" />} title="Work Order Identification">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Work Order Number <span className="text-blue-500">(auto-generated)</span>
            </label>
            <input
              value={woNumber}
              onChange={(e) => setWoNumber(e.target.value)}
              disabled={!canEdit}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-blue-50 dark:bg-blue-900/20 text-sm font-mono font-semibold text-blue-700 dark:text-blue-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 disabled:opacity-70 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Issue Date
            </label>
            <input type="date" value={commencementDate} disabled
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 px-3 py-2.5 opacity-70" />
          </div>
        </div>
      </SectionCard>

      {/* Section 2: Contractor & Contract Details */}
      <SectionCard icon={<Building2 className="w-4 h-4" />} title="Contractor & Contract Details">
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Contractor Name <span className="text-red-500">*</span>
              </label>
              <select
                value={contractorName}
                onChange={(e) => setContractorName(e.target.value)}
                disabled={!canEdit}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 disabled:opacity-70 transition"
              >
                <option value="">— Select Contractor —</option>
                {DEMO_CONTRACTORS.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                GST Number
              </label>
              <input
                value={contractorGST}
                onChange={(e) => setContractorGST(e.target.value)}
                disabled={!canEdit}
                placeholder="27XXXXXXXXXXXZX"
                maxLength={15}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-mono text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 disabled:opacity-70 transition uppercase"
              />
            </div>
          </div>

          {/* Percentage Type + Bid Percentage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Percentage Type <span className="text-red-500">*</span>
              </label>
              <select
                value={percentageType}
                onChange={(e) => setPercentageType(e.target.value as "Below" | "Above" | "Equal")}
                disabled={!canEdit}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 disabled:opacity-70 transition"
              >
                <option value="Below">Below</option>
                <option value="Above">Above</option>
                <option value="Equal">Equal</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Percentage (%) — {percentageType} estimated cost
              </label>
              <div className="relative">
                <input
                  type="number" min="0" max="100" step="0.01"
                  value={bidPercentage}
                  onChange={(e) => setBidPercentage(e.target.value)}
                  disabled={!canEdit}
                  placeholder="0.00"
                  className="w-full pr-8 pl-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 disabled:opacity-70 transition"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Contractor Address
            </label>
            <textarea
              rows={3}
              value={contractorAddress}
              onChange={(e) => setContractorAddress(e.target.value)}
              disabled={!canEdit}
              placeholder="Plot No., Street, City, PIN"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 disabled:opacity-70 resize-none transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Contract Amount (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                <input
                  type="number" min="0" step="1"
                  value={contractAmount}
                  onChange={(e) => setContractAmount(e.target.value)}
                  disabled={!canEdit}
                  placeholder="0"
                  className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 disabled:opacity-70 transition"
                />
              </div>
              {amt > 0 && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{formatINR(amt)}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Completion Period <span className="text-red-500">*</span>
              </label>
              <input
                value={completionPeriod}
                onChange={(e) => setCompletionPeriod(e.target.value)}
                disabled={!canEdit}
                placeholder="e.g. 12 months"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 disabled:opacity-70 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Commencement Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date" value={commencementDate}
                onChange={(e) => setCommencementDate(e.target.value)}
                disabled={!canEdit}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 disabled:opacity-70 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Work Completion Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date" value={workCompletionDate}
                onChange={(e) => setWorkCompletionDate(e.target.value)}
                disabled={!canEdit}
                min={commencementDate}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 disabled:opacity-70 transition"
              />
              {commencementDate && workCompletionDate && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {Math.round((new Date(workCompletionDate).getTime() - new Date(commencementDate).getTime()) / 86400000)} days from commencement
                </p>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Section 3: Security Deposit */}
      <SectionCard icon={<Lock className="w-4 h-4" />} title="Security Deposit"
        badge={
          sdAmt > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              {formatINR(sdAmt)} ({sdPct}%)
            </span>
          )
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-4">
            {/* Security Deposit Percentage — placed BEFORE amount */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Security Deposit Percentage (%)
              </label>
              <div className="relative">
                <input
                  type="number" min="0" max="100" step="0.01"
                  value={sdPctInput}
                  onChange={(e) => setSdPctInput(e.target.value)}
                  disabled={!canEdit}
                  placeholder="4"
                  className="w-full pr-8 pl-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 disabled:opacity-70 transition"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Default 4% — auto-calculates the amount below</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Security Deposit Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                <input
                  type="number" min="0" step="1"
                  value={securityDeposit}
                  onChange={(e) => setSecurityDeposit(e.target.value)}
                  disabled={!canEdit}
                  placeholder="0"
                  className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 disabled:opacity-70 transition"
                />
              </div>
              {amt > 0 && sdAmt > 0 && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{formatINR(sdAmt)} ({sdPct}%)</p>
              )}
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 flex flex-col justify-center">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">Security Deposit Terms</p>
            <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1 list-disc pl-4">
              <li>Minimum 5% of contract amount</li>
              <li>Retained during contract period</li>
              <li>Refunded after defect liability period</li>
              <li>Forfeited on contract breach</li>
            </ul>
          </div>
        </div>

        {/* Visual SD bar */}
        {amt > 0 && sdAmt > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
              <span>Security Deposit as % of Contract</span>
              <span className={parseFloat(sdPct) >= 5 ? "text-green-600 font-semibold" : "text-amber-600 font-semibold"}>
                {sdPct}% {parseFloat(sdPct) >= 5 ? "✓" : "(below 5% recommended)"}
              </span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${parseFloat(sdPct) >= 5 ? "bg-green-500" : "bg-amber-500"}`}
                style={{ width: `${Math.min(parseFloat(sdPct) * 4, 100)}%` }}
              />
            </div>
          </div>
        )}
      </SectionCard>

      {/* Section 4: Performance Guarantee */}
      <SectionCard icon={<Shield className="w-4 h-4" />} title="Performance Guarantee"
        badge={
          pgAmt > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
              {formatINR(pgAmt)} ({pgPct}%)
            </span>
          )
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Performance Guarantee Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                <input
                  type="number" min="0" step="1"
                  value={performanceAmt}
                  onChange={(e) => setPerformanceAmt(e.target.value)}
                  disabled={!canEdit}
                  placeholder="0"
                  className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-70 transition"
                />
              </div>
              {amt > 0 && (
                <button type="button" disabled={!canEdit}
                  onClick={() => setPerformanceAmt(String(Math.round(amt * 0.05)))}
                  className="text-xs text-violet-500 hover:underline mt-1 disabled:pointer-events-none">
                  Set 5% → {formatINR(Math.round(amt * 0.05))}
                </button>
              )}
            </div>
          </div>

          <div>
            <FileDropZone
              label="Performance Guarantee Document"
              hint="Bank Guarantee / Insurance Bond — PDF, max 20 MB"
              onPick={pickPG}
              doc={pgDoc}
              onRemove={removePG}
              canEdit={canEdit}
            />
          </div>
        </div>

        {amt > 0 && pgAmt > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
              <span>Performance Guarantee as % of Contract</span>
              <span className={parseFloat(pgPct) >= 5 ? "text-green-600 font-semibold" : "text-amber-600 font-semibold"}>
                {pgPct}% {parseFloat(pgPct) >= 5 ? "✓" : "(below 5% recommended)"}
              </span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${parseFloat(pgPct) >= 5 ? "bg-violet-500" : "bg-amber-500"}`}
                style={{ width: `${Math.min(parseFloat(pgPct) * 4, 100)}%` }}
              />
            </div>
          </div>
        )}
      </SectionCard>

      {/* Section 5: Agreement Upload */}
      <SectionCard icon={<FileText className="w-4 h-4" />} title="Signed Agreement"
        badge={
          agreementDoc ? (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Uploaded
            </span>
          ) : (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              Required
            </span>
          )
        }
      >
        <FileDropZone
          label="Signed Agreement Document"
          hint="Executed agreement on stamp paper — PDF, max 20 MB"
          onPick={pickAgreement}
          doc={agreementDoc}
          onRemove={removeAgreement}
          canEdit={canEdit}
        />
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          The signed agreement is mandatory before a work order can be issued.
        </p>
      </SectionCard>

      {/* Section 5b: Demand Draft */}
      <SectionCard icon={<FileText className="w-4 h-4" />} title="Demand Draft Details" defaultOpen={true}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Demand Draft Number
            </label>
            <input
              value={demandDraftNumber}
              onChange={(e) => setDemandDraftNumber(e.target.value)}
              disabled={!canEdit}
              placeholder="DD/YYYY/XXXXXX"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 disabled:opacity-70 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Demand Draft Date
            </label>
            <input
              type="date"
              value={demandDraftDate}
              onChange={(e) => setDemandDraftDate(e.target.value)}
              disabled={!canEdit}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 disabled:opacity-70 transition"
            />
          </div>
        </div>
      </SectionCard>

      {/* Section 6: Special Clauses */}
      <SectionCard icon={<ClipboardList className="w-4 h-4" />} title="Special Clauses & Conditions" defaultOpen={false}>
        <textarea
          rows={5}
          value={clauses}
          onChange={(e) => setClauses(e.target.value)}
          disabled={!canEdit}
          placeholder="Enter any special clauses, milestones, or conditions specific to this work order…"
          className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 disabled:opacity-70 resize-none transition"
        />
      </SectionCard>

      {/* Pre-issue checklist */}
      {canEdit && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" /> Pre-Issue Checklist
          </p>
          <div className="space-y-2">
            {checklist.map(({ label, done }) => (
              <div key={label} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  done ? "bg-green-500" : "bg-gray-200 dark:bg-gray-600"
                }`}>
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

      {/* Action Bar */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap gap-3">

          {/* Always-visible: View + Download for all authorized users when WO exists */}
          {project.workOrderData && (
            <>
              <a href="#wo-summary"
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm font-medium transition-colors">
                <Eye className="w-4 h-4" /> View WO
              </a>
              <button onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 text-sm font-medium transition-colors">
                <Download className="w-4 h-4" /> Download WO
              </button>
            </>
          )}

          {/* Tender Clerk actions */}
          {canEdit && (
            <>
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60"
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-gray-400/40 border-t-gray-400 rounded-full animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                Save Draft
              </button>
              <button
                onClick={handleIssue}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Submit for CAFO Review
              </button>
            </>
          )}

          {/* Executive Engineer: Approve Work Order */}
          {isEE && project.workOrderData && !isIssued && (
            <button
              onClick={handleEEApprove}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Approve Work Order
            </button>
          )}

          {isIssued && (
            <>
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Work Order issued to {project.workOrderData?.l1Contractor}
              </div>
              <Link href={`/mb-billing/${project.id}`}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors ml-auto">
                <Send className="w-4 h-4" /> Proceed to MB &amp; Billing →
              </Link>
            </>
          )}
        </div>

        {/* Footer metadata */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
          <span>WO No.: <strong className="text-gray-600 dark:text-gray-300">{woNumber}</strong></span>
          <span>Amount: <strong className="text-gray-600 dark:text-gray-300">{amt > 0 ? formatINR(amt) : "—"}</strong></span>
          <span>SD: <strong className="text-gray-600 dark:text-gray-300">{sdAmt > 0 ? formatINR(sdAmt) : "—"}</strong></span>
          <span>PG: <strong className="text-gray-600 dark:text-gray-300">{pgAmt > 0 ? formatINR(pgAmt) : "—"}</strong></span>
          <span>Completion: <strong className="text-gray-600 dark:text-gray-300">{workCompletionDate ? fmtDate(workCompletionDate) : "—"}</strong></span>
        </div>
      </div>

    </div>
  );
}
