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
  XCircle,
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
  BadgeCheck,
  Hash,
  Percent,
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

function genLOIRef(projectId: string) {
  return `LOI/${new Date().getFullYear()}/${projectId.slice(-4)}`;
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
  config: RemarksDialogConfig; onCancel: () => void; saving: boolean;
}) {
  const [remarks, setRemarks] = useState("");

  function submit() {
    if (config.required && !remarks.trim()) { toast.error("Remarks are required."); return; }
    config.onConfirm(remarks.trim());
  }

  const btnCls = config.confirmColor === "green"
    ? "bg-green-600 hover:bg-green-700"
    : "bg-red-600 hover:bg-red-700";

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
        <div className="px-6 py-4">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Remarks {config.required && <span className="text-red-500">*</span>}
          </label>
          <textarea rows={4} value={remarks} onChange={(e) => setRemarks(e.target.value)}
            placeholder={config.required ? "Remarks are required…" : "Optional remarks…"}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
            autoFocus />
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
          <button type="button" onClick={onCancel} disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60">
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={saving}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-60 ${btnCls}`}>
            {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : config.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

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
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="w-full flex items-center gap-3 px-6 py-4 bg-gray-50/70 dark:bg-gray-700/40 border-b border-gray-100 dark:border-gray-700 text-left hover:bg-gray-100/60 dark:hover:bg-gray-700/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500">
        <span className="text-blue-600 dark:text-blue-400" aria-hidden="true">{icon}</span>
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex-1">{title}</span>
        {badge}
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
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
            drag ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/40"
          }`}>
          <Upload className={`w-7 h-7 mx-auto mb-2 ${drag ? "text-blue-500" : "text-gray-400"}`} />
          <p className="text-sm text-gray-500 dark:text-gray-400">{drag ? `Drop ${label} here` : `Upload ${label}`}</p>
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

// ─── Read-only field ──────────────────────────────────────────────────────────

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">{label}</p>
      <div className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-600 dark:text-gray-300 px-3 py-2.5 min-h-[40px]">
        {value || "—"}
      </div>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function WorkOrderView({ projectId }: { projectId: string }) {
  const router = useRouter();

  const [project, setProject] = useState<IProject | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [actionDialog, setActionDialog] = useState<RemarksDialogConfig | null>(null);

  // ── form fields ────────────────────────────────────────────────────────────
  const [woNumber,           setWoNumber]           = useState("");
  const [contractorName,     setContractorName]     = useState("");
  const [contractorGST,      setContractorGST]      = useState("");
  const [contractorAddress,  setContractorAddress]  = useState("");
  const [contractAmount,     setContractAmount]     = useState("");
  const [completionPeriod,   setCompletionPeriod]   = useState("");
  const [commencementDate,   setCommencementDate]   = useState("");
  const [workCompletionDate, setWorkCompletionDate] = useState("");
  const [securityDeposit,    setSecurityDeposit]    = useState("");
  const [sdPctInput,         setSdPctInput]         = useState("4");
  const [performanceAmt,     setPerformanceAmt]     = useState("");
  const [clauses,            setClauses]            = useState("");
  const [percentageType,     setPercentageType]     = useState<"Below" | "Above" | "Equal">("Below");
  const [bidPercentage,      setBidPercentage]      = useState("");
  const [demandDraftNumber,  setDemandDraftNumber]  = useState("");
  const [demandDraftDate,    setDemandDraftDate]    = useState("");

  const [pgDoc,        setPgDoc]        = useState<{ name: string; url: string } | null>(null);
  const [agreementDoc, setAgreementDoc] = useState<{ name: string; url: string } | null>(null);
  const pgBlobRef = useRef<string | null>(null);
  const agBlobRef = useRef<string | null>(null);

  const load = useCallback(() => {
    const p = store.getProjectById(projectId);
    setProject(p);
    if (!p) return;

    const wo  = p.workOrderData;
    const loa = p.tenderData?.loa;
    const fin = p.tenderData?.financialBid;
    const gb  = p.tenderData?.gbApproval;

    if (wo) {
      setWoNumber(wo.workOrderNumber ?? wo.workOrderId ?? genWorkOrderNumber(p.id));
      setContractorName(wo.l1Contractor ?? "");
      setContractorGST(wo.contractorGST ?? "");
      setContractorAddress(wo.contractorAddress ?? "");
      setContractAmount(String(wo.contractAmount ?? ""));
      setCompletionPeriod(wo.completionPeriod ?? "");
      setCommencementDate(fmtDateInput(wo.commencementDate));
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
      if (wo.demandDraftDate)   setDemandDraftDate(wo.demandDraftDate);
      if (wo.agreement) setAgreementDoc({ name: wo.agreement.name, url: wo.agreement.url ?? "" });
      if (wo.performanceGuarantee && typeof wo.performanceGuarantee !== "number") {
        const pgD = wo.performanceGuarantee as IDocument;
        setPgDoc({ name: pgD.name, url: pgD.url ?? "" });
      }
      return;
    }

    // Auto-populate from LOA / financial bid / GB Approval
    const l1Name = loa?.l1Contractor ?? fin?.l1Bidder?.name ?? "";
    const amt    = loa?.approvedAmount ?? (fin?.l1Bidder ? Math.round((p.technicalSanctionAmount ?? p.estimatedAmount ?? 0) * (1 + (fin.l1Bidder.quotedPercentage ?? 0) / 100)) : 0);
    const period = loa?.completionPeriod ?? p.tenderData?.completionPeriod ?? p.dtpData?.completionPeriod ?? "";
    const pg     = Math.round(amt * 0.05);

    setWoNumber(genWorkOrderNumber(p.id));
    setContractorName(l1Name);
    setContractorAddress("");
    setContractAmount(String(amt));
    setCompletionPeriod(period);
    setCommencementDate("");
    setWorkCompletionDate("");
    setSdPctInput("5");
    setSecurityDeposit("");
    setPerformanceAmt(String(pg));

    if (gb?.percentageType) {
      setPercentageType(gb.percentageType);
      if (gb.aboveBelowPercentage != null) setBidPercentage(String(gb.aboveBelowPercentage));
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    return () => {
      if (pgBlobRef.current?.startsWith("blob:"))  URL.revokeObjectURL(pgBlobRef.current);
      if (agBlobRef.current?.startsWith("blob:"))  URL.revokeObjectURL(agBlobRef.current);
    };
  }, []);

  // ── computed ───────────────────────────────────────────────────────────────
  const amt   = parseFloat(contractAmount) || 0;
  const sdAmt = parseFloat(securityDeposit) || 0;
  const pgAmt = parseFloat(performanceAmt) || 0;
  const sdPct = amt > 0 ? ((sdAmt / amt) * 100).toFixed(1) : "0";
  const pgPct = amt > 0 ? ((pgAmt / amt) * 100).toFixed(1) : "0";

  useEffect(() => {
    if (commencementDate && completionPeriod) {
      setWorkCompletionDate(addDays(commencementDate, parsePeriodDays(completionPeriod)));
    }
  }, [commencementDate, completionPeriod]);

  useEffect(() => {
    const pct = parseFloat(sdPctInput);
    const a   = parseFloat(contractAmount) || 0;
    if (!isNaN(pct) && a > 0) setSecurityDeposit(String(Math.round(a * pct / 100)));
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

  // ── Stage / role detection ─────────────────────────────────────────────────

  const isTCStage    = project.status === "Work Order - TC Preparation";
  const isEEStage    = project.status === "Work Order - EE Review";
  const isCAFOStage  = project.status === "Work Order - CAFO Review";
  const isACEOStage  = project.status === "Work Order - ACEO Approval";
  const isIssued     = project.workOrderData?.status === "Work Order Issued" ||
                       project.status === "Work Order Issued";
  const isReviewStage = isEEStage || isCAFOStage || isACEOStage;

  const currentUser   = store.getCurrentUser();
  const role          = currentUser?.role ?? "";
  const isTenderClerk = role === "Tender Clerk";
  const isEERole      = role === "Executive Engineer";
  const isCAFORole    = role === "Chief Accounts and Finance Officer";
  const isACEORole    = role === "Additional Chief Executive Officer";

  // TC edits only at TC Preparation stage; all other stages are read-only
  const canEdit = isTCStage && isTenderClerk;

  // ── Auto-fetched values (always read-only) ─────────────────────────────────

  const tenderData = project.tenderData;
  const loa        = tenderData?.loa;
  const fin        = tenderData?.financialBid;
  const gb         = tenderData?.gbApproval;

  const autoTenderId    = tenderData?.tenderId ?? "—";
  const autoLOARef      = genLOIRef(project.id);
  const autoL1Name      = loa?.l1Contractor ?? fin?.l1Bidder?.name ?? (contractorName || "—");
  const autoPctType     = gb?.percentageType ?? percentageType;
  const autoPctValue    = gb?.aboveBelowPercentage ?? parseFloat(bidPercentage) ?? 0;
  const autoPctDisplay  = autoPctType === "Equal"
    ? "Equal (0% — at estimate)"
    : `${autoPctValue.toFixed(2)}% ${autoPctType} estimated cost`;
  const autoEMD         = tenderData?.emdAmount ?? 0;
  const autoApprovedAmt = loa?.approvedAmount ?? amt;

  // ── file handlers ──────────────────────────────────────────────────────────

  function pickPG(file: File) {
    const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
    if (![".pdf", ".jpg", ".jpeg", ".png"].includes(ext)) { toast.error("Invalid file type. Allowed types: PDF, JPG, PNG"); return; }
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
    const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
    if (![".pdf", ".jpg", ".jpeg", ".png"].includes(ext)) { toast.error("Invalid file type. Allowed types: PDF, JPG, PNG"); return; }
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
    return { id: `DOC${Date.now()}`, name, type: "application/pdf", url, uploadedAt: new Date().toISOString(), uploadedBy: currentUser?.name ?? "Unknown" };
  }

  // ── validation ─────────────────────────────────────────────────────────────

  function validate(): string | null {
    if (!contractorName.trim())  return "Contractor name is required.";
    if (amt <= 0)                return "Contract amount must be greater than zero.";
    if (!completionPeriod.trim()) return "Completion period is required.";
    if (!commencementDate)       return "Commencement date is required.";
    if (!workCompletionDate)     return "Work completion date is required.";
    if (new Date(workCompletionDate) <= new Date(commencementDate))
      return "Work completion date must be after commencement date.";
    return null;
  }

  // ── build payload ──────────────────────────────────────────────────────────

  function buildPayload(status: string): IWorkOrderData {
    return {
      workOrderNumber: woNumber, workOrderId: woNumber,
      issueDate: new Date().toISOString(), issuedDate: new Date().toISOString(),
      l1Contractor: contractorName, l1BidAmount: amt, contractAmount: amt,
      contractorGST, contractorAddress, completionPeriod,
      commencementDate, workCompletionDate,
      securityDeposit: sdAmt, securityDepositPercentage: parseFloat(sdPctInput) || 4,
      performanceGuarantee: pgDoc ? mkDoc(pgDoc.name, pgDoc.url) : pgAmt,
      agreement: agreementDoc ? mkDoc(agreementDoc.name, agreementDoc.url) : undefined,
      status, issuedBy: currentUser?.name ?? "Unknown",
      clauses, percentageType,
      bidPercentage: parseFloat(bidPercentage) || undefined,
      demandDraftNumber: demandDraftNumber.trim() || undefined,
      demandDraftDate: demandDraftDate || undefined,
    };
  }

  // ── TC: Save draft ─────────────────────────────────────────────────────────

  async function handleSaveDraft() {
    if (!project) return;
    const err = validate();
    if (err) { toast.error(err); return; }
    setSaving(true);
    try {
      store.updateProject(project.id, { workOrderData: buildPayload("Work Order Draft") });
      toast.success("Work order saved as draft.");
      load();
    } finally { setSaving(false); }
  }

  // ── TC: Submit to EE ───────────────────────────────────────────────────────

  async function handleIssue() {
    if (!project) return;
    const err = validate();
    if (err) { toast.error(err); return; }
    setSaving(true);
    try {
      store.updateProject(project.id, { workOrderData: buildPayload("Submitted for EE Review") });
      const r = store.forwardProject(project.id, "Executive Engineer",
        `Work Order submitted for review. Contractor: ${contractorName}. Contract: ${formatINR(amt)}.`,
        "Work Order - EE Review");
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Work Order submitted to Executive Engineer.");
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  // ── EE: Approve → CAFO ────────────────────────────────────────────────────

  async function handleEEApprove(remarks: string) {
    if (!project) return;
    setSaving(true);
    try {
      if (project.workOrderData) {
        store.updateProject(project.id, {
          workOrderData: { ...project.workOrderData, status: "Work Order - CAFO Review", eeApprovedBy: currentUser?.name, eeApprovedAt: new Date().toISOString() },
        });
      }
      const r = store.forwardProject(project.id, "Chief Accounts and Finance Officer", remarks, "Work Order - CAFO Review");
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Work Order approved and forwarded to CAFO.");
      setActionDialog(null);
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  // ── EE: Return → TC ───────────────────────────────────────────────────────

  async function handleEEReturn(remarks: string) {
    if (!project) return;
    setSaving(true);
    try {
      if (project.workOrderData) {
        store.updateProject(project.id, { workOrderData: { ...project.workOrderData, status: "In Progress" } });
      }
      const r = store.rejectProject(project.id, "Tender Clerk", remarks, "Work Order - TC Preparation");
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Work Order returned to Tender Clerk with remarks.");
      setActionDialog(null);
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  // ── CAFO: Approve → ACEO ──────────────────────────────────────────────────

  async function handleCAFOApprove(remarks: string) {
    if (!project) return;
    setSaving(true);
    try {
      const r = store.forwardProject(project.id, "Additional Chief Executive Officer", remarks, "Work Order - ACEO Approval");
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Work Order approved and forwarded to Additional CEO.");
      setActionDialog(null);
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  // ── CAFO: Return → EE ─────────────────────────────────────────────────────

  async function handleCAFOReturn(remarks: string) {
    if (!project) return;
    setSaving(true);
    try {
      const r = store.rejectProject(project.id, "Executive Engineer", remarks, "Work Order - EE Review");
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Work Order returned to Executive Engineer with remarks.");
      setActionDialog(null);
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  // ── ACEO: Approve → Work Order Issued ─────────────────────────────────────

  async function handleACEOApprove(remarks: string) {
    if (!project) return;
    setSaving(true);
    try {
      if (project.workOrderData) {
        store.updateProject(project.id, {
          workOrderData: { ...project.workOrderData, status: "Work Order Issued", issuedBy: currentUser?.name },
        });
      }
      // ACEO approve routes to stage-23 (Measurement Book), owner: Sectional Engineer
      const r = store.approveProject(project.id, "Work Order Issued", remarks);
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Work Order approved and issued. MB & Billing stage is now open.");
      setActionDialog(null);
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  // ── ACEO: Return → CAFO ───────────────────────────────────────────────────

  async function handleACEOReturn(remarks: string) {
    if (!project) return;
    setSaving(true);
    try {
      const r = store.rejectProject(project.id, "Chief Accounts and Finance Officer", remarks, "Work Order - CAFO Review");
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Work Order returned to CAFO with remarks.");
      setActionDialog(null);
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  // ── download ───────────────────────────────────────────────────────────────

  function handleDownload() {
    if (!project) return;
    const lines = [
      "WORK ORDER", "==========",
      `Work Order No.: ${woNumber}`, `Date: ${fmtDate(commencementDate)}`, "",
      "To,", contractorName, contractorAddress || "[Address]",
      contractorGST ? `GST No.: ${contractorGST}` : "", "",
      `Sub: Work Order for — ${project.projectName}`, "",
      "You are hereby instructed to commence the following work:", "",
      "CONTRACT PARTICULARS", "--------------------",
      `Name of Work          : ${project.projectName}`,
      `Tender ID             : ${autoTenderId}`,
      `LOI Reference         : ${autoLOARef}`,
      `Work Order No.        : ${woNumber}`,
      `Contractor            : ${autoL1Name}`,
      `Approved Percentage   : ${autoPctDisplay}`,
      `EMD Amount (₹)        : ${formatINR(autoEMD)}`,
      `Approved Amount (₹)   : ${formatINR(autoApprovedAmt)}`,
      `Contract Amount (₹)   : ${formatINR(amt)}`,
      `Security Deposit (₹)  : ${formatINR(sdAmt)} (${sdPct}%)`,
      `Performance Guarantee : ${formatINR(pgAmt)} (${pgPct}%)`,
      `Commencement Date     : ${fmtDate(commencementDate)}`,
      `Completion Date       : ${fmtDate(workCompletionDate)}`,
      `Completion Period     : ${completionPeriod}`, "",
      clauses ? `SPECIAL CLAUSES\n---------------\n${clauses}` : "",
      "", "GENERAL CONDITIONS:",
      "1. Work shall be carried out as per approved drawings and specifications.",
      "2. All materials shall conform to IS specifications.",
      "3. Security Deposit will be refunded after defect liability period.",
      "4. Any deviation requires prior written approval.",
      "5. Time is the essence of this contract.", "",
      "Executive Engineer", "Pune Zilla Parishad",
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
    { label: "L1 contractor identified from LOI",      done: !!contractorName },
    { label: "Contract amount set",                    done: amt > 0 },
    { label: "Security deposit configured (≥5%)",      done: sdAmt > 0 && (sdAmt / amt) >= 0.049 },
    { label: "Performance guarantee configured (≥5%)", done: pgAmt > 0 && (pgAmt / amt) >= 0.049 },
    { label: "Commencement & completion dates set",    done: !!commencementDate && !!workCompletionDate },
    { label: "Signed agreement uploaded",              done: !!agreementDoc },
  ];

  // ── review banner ──────────────────────────────────────────────────────────
  const reviewBannerInfo = isEEStage
    ? { role: "Executive Engineer Review", hint: "Review the Work Order details, contract value, security deposit, and uploaded documents." }
    : isCAFOStage
    ? { role: "CAFO Review", hint: "Review financial terms, security deposit amount, and performance guarantee." }
    : isACEOStage
    ? { role: "Additional CEO — Final Approval", hint: "Review and approve the Work Order. Approval issues the Work Order and opens MB & Billing." }
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
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Work Order</h1>
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
              <Download className="w-4 h-4" /> Download
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

        {/* TC: awaiting review */}
        {isReviewStage && isTenderClerk && (
          <div className="flex gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Work Order Submitted — Awaiting Approval</p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                {project.status === "Work Order - EE Review"
                  ? "Awaiting Executive Engineer review."
                  : project.status === "Work Order - CAFO Review"
                  ? "Awaiting CAFO review."
                  : "Awaiting Additional CEO approval."}
                {" "}Contractor: <strong>{project.workOrderData?.l1Contractor}</strong>. Contract:{" "}
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
            <div key={label} className={`bg-white dark:bg-gray-800 rounded-xl border border-${color}-100 dark:border-${color}-900/30 p-4 shadow-sm`}>
              <div className={`flex items-center gap-1.5 text-${color}-500 dark:text-${color}-400 mb-1.5`}>
                {icon}
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* ── Section: Auto-fetched Details (always read-only) ───────────────── */}
        <SectionCard icon={<Lock className="w-4 h-4" />} title="Auto-fetched Details"
          badge={
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Read-only
            </span>
          }>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/40 rounded-lg px-3 py-2 mb-4">
              <Info className="w-3.5 h-3.5 shrink-0" />
              These fields are auto-fetched from Tender, GB Approval, and LOI records. They cannot be edited here.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <ReadOnlyField label="Tender ID" value={autoTenderId} />
              <ReadOnlyField label="LOI Reference" value={autoLOARef} />
              <ReadOnlyField label="L1 Contractor" value={autoL1Name} />
              <ReadOnlyField label="Approved Percentage" value={autoPctDisplay} />
              <ReadOnlyField label="EMD Amount" value={autoEMD > 0 ? formatINR(autoEMD) : "—"} />
              <ReadOnlyField label="Approved Amount (from LOI)" value={autoApprovedAmt > 0 ? formatINR(autoApprovedAmt) : "—"} />
            </div>
          </div>
        </SectionCard>

        {/* ── Section 1: Work Order Identification ─────────────────────────── */}
        <SectionCard icon={<ClipboardList className="w-4 h-4" />} title="Work Order Identification">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Work Order Number <span className="text-blue-500">(auto-generated)</span>
              </label>
              <input value={woNumber} onChange={(e) => setWoNumber(e.target.value)} disabled={!canEdit}
                className={`w-full rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-mono font-semibold px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition ${!canEdit ? "bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 cursor-default" : "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"}`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Issue Date</label>
              <input type="date" value={commencementDate} disabled
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-600 dark:text-gray-300 px-3 py-2.5 cursor-default" />
            </div>
          </div>
        </SectionCard>

        {/* ── Section 2: Contractor Details ─────────────────────────────────── */}
        <SectionCard icon={<Building2 className="w-4 h-4" />} title="Contractor & Contract Details">
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Contractor Name
                </label>
                <input value={contractorName} disabled
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-600 dark:text-gray-300 px-3 py-2.5 cursor-default" />
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><Lock className="w-3 h-3" /> Auto-fetched from LOI</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">GST Number</label>
                <input value={contractorGST} onChange={(e) => setContractorGST(e.target.value)} disabled={!canEdit}
                  placeholder="27XXXXXXXXXXXZX" maxLength={15}
                  className={`w-full rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-mono px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition uppercase ${!canEdit ? "bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 cursor-default" : "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Percentage Type
                </label>
                <input value={autoPctType} disabled
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-600 dark:text-gray-300 px-3 py-2.5 cursor-default" />
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><Lock className="w-3 h-3" /> Auto-fetched from GB Approval</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  <Percent className="w-3.5 h-3.5 inline mr-1" />Bid Percentage
                </label>
                <input value={autoPctValue.toFixed(2)} disabled
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-600 dark:text-gray-300 px-3 py-2.5 cursor-default" />
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><Lock className="w-3 h-3" /> Auto-fetched from GB Approval</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Contractor Address</label>
              <textarea rows={3} value={contractorAddress} onChange={(e) => setContractorAddress(e.target.value)} disabled={!canEdit}
                placeholder="Plot No., Street, City, PIN"
                className={`w-full rounded-lg border border-gray-200 dark:border-gray-600 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 resize-none transition ${!canEdit ? "bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 cursor-default" : "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"}`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Contract Amount (₹) <Lock className="w-3.5 h-3.5 inline ml-1 text-gray-400" />
                </label>
                <input value={autoApprovedAmt > 0 ? String(autoApprovedAmt) : contractAmount} disabled
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-600 dark:text-gray-300 px-3 py-2.5 cursor-default" />
                {autoApprovedAmt > 0 && <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{formatINR(autoApprovedAmt)}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Completion Period</label>
                <input value={completionPeriod} disabled
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-600 dark:text-gray-300 px-3 py-2.5 cursor-default" />
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><Lock className="w-3 h-3" /> Auto-fetched from LOI</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Commencement Date</label>
                <input type="date" value={commencementDate} onChange={(e) => setCommencementDate(e.target.value)} disabled={!canEdit}
                  className={`w-full rounded-lg border border-gray-200 dark:border-gray-600 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition ${!canEdit ? "bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 cursor-default" : "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"}`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Work Completion Date <span className="text-red-500">*</span>
                </label>
                <input type="date" value={workCompletionDate} onChange={(e) => setWorkCompletionDate(e.target.value)} disabled={!canEdit}
                  min={commencementDate}
                  className={`w-full rounded-lg border border-gray-200 dark:border-gray-600 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition ${!canEdit ? "bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 cursor-default" : "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"}`}
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

        {/* ── Section 3: Security Deposit ───────────────────────────────────── */}
        <SectionCard icon={<Lock className="w-4 h-4" />} title="Security Deposit"
          badge={sdAmt > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              {formatINR(sdAmt)} ({sdPct}%)
            </span>
          )}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Security Deposit Percentage (%)</label>
                <div className="relative">
                  <input type="number" min="0" max="100" step="0.01" value={sdPctInput} onChange={(e) => setSdPctInput(e.target.value)} disabled={!canEdit} placeholder="4"
                    className={`w-full pr-8 pl-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition ${!canEdit ? "bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 cursor-default" : "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"}`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Default 4% — auto-calculates amount below</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Security Deposit Amount (₹) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                  <input type="number" min="0" step="1" value={securityDeposit} onChange={(e) => setSecurityDeposit(e.target.value)} disabled={!canEdit} placeholder="0"
                    className={`w-full pl-7 pr-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition ${!canEdit ? "bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 cursor-default" : "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"}`}
                  />
                </div>
                {amt > 0 && sdAmt > 0 && <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{formatINR(sdAmt)} ({sdPct}%)</p>}
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
          {amt > 0 && sdAmt > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                <span>Security Deposit as % of Contract</span>
                <span className={parseFloat(sdPct) >= 5 ? "text-green-600 font-semibold" : "text-amber-600 font-semibold"}>
                  {sdPct}% {parseFloat(sdPct) >= 5 ? "✓" : "(below 5% recommended)"}
                </span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${parseFloat(sdPct) >= 5 ? "bg-green-500" : "bg-amber-500"}`}
                  style={{ width: `${Math.min(parseFloat(sdPct) * 4, 100)}%` }} />
              </div>
            </div>
          )}
        </SectionCard>

        {/* ── Section 4: Performance Guarantee ──────────────────────────────── */}
        <SectionCard icon={<Shield className="w-4 h-4" />} title="Performance Guarantee"
          badge={pgAmt > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
              {formatINR(pgAmt)} ({pgPct}%)
            </span>
          )}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Performance Guarantee Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                  <input type="number" min="0" step="1" value={performanceAmt} onChange={(e) => setPerformanceAmt(e.target.value)} disabled={!canEdit} placeholder="0"
                    className={`w-full pl-7 pr-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition ${!canEdit ? "bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 cursor-default" : "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"}`}
                  />
                </div>
                {amt > 0 && (
                  <button type="button" disabled={!canEdit} onClick={() => setPerformanceAmt(String(Math.round(amt * 0.05)))}
                    className="text-xs text-violet-500 hover:underline mt-1 disabled:pointer-events-none">
                    Set 5% → {formatINR(Math.round(amt * 0.05))}
                  </button>
                )}
              </div>
            </div>
            <FileDropZone label="Performance Guarantee Document" hint="Bank Guarantee / Insurance Bond — PDF, max 20 MB"
              onPick={pickPG} doc={pgDoc} onRemove={removePG} canEdit={canEdit} />
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
                <div className={`h-full rounded-full transition-all ${parseFloat(pgPct) >= 5 ? "bg-violet-500" : "bg-amber-500"}`}
                  style={{ width: `${Math.min(parseFloat(pgPct) * 4, 100)}%` }} />
              </div>
            </div>
          )}
        </SectionCard>

        {/* ── Section 5: Signed Agreement ───────────────────────────────────── */}
        <SectionCard icon={<FileText className="w-4 h-4" />} title="Signed Agreement"
          badge={agreementDoc
            ? <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Uploaded</span>
            : <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Required</span>}>
          <FileDropZone label="Signed Agreement Document" hint="Executed agreement on stamp paper — PDF, max 20 MB"
            onPick={pickAgreement} doc={agreementDoc} onRemove={removeAgreement} canEdit={canEdit} />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" /> The signed agreement is mandatory before a work order can be issued.
          </p>
        </SectionCard>

        {/* ── Section 5b: Demand Draft ───────────────────────────────────────── */}
        <SectionCard icon={<Hash className="w-4 h-4" />} title="Demand Draft Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Demand Draft Number</label>
              <input value={demandDraftNumber} onChange={(e) => setDemandDraftNumber(e.target.value)} disabled={!canEdit} placeholder="DD/YYYY/XXXXXX"
                className={`w-full rounded-lg border border-gray-200 dark:border-gray-600 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition ${!canEdit ? "bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 cursor-default" : "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"}`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Demand Draft Date</label>
              <input type="date" value={demandDraftDate} onChange={(e) => setDemandDraftDate(e.target.value)} disabled={!canEdit}
                className={`w-full rounded-lg border border-gray-200 dark:border-gray-600 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition ${!canEdit ? "bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 cursor-default" : "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"}`}
              />
            </div>
          </div>
        </SectionCard>

        {/* ── Section 6: Work Order Content (CK Editor placeholder) ─────────── */}
        <SectionCard icon={<ClipboardList className="w-4 h-4" />} title="Work Order Content & Special Clauses" defaultOpen={false}>
          {canEdit ? (
            <textarea rows={6} value={clauses} onChange={(e) => setClauses(e.target.value)}
              placeholder="Enter the work order body, special clauses, milestones, or conditions specific to this work order…"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 resize-none transition"
            />
          ) : (
            <p className={`text-sm bg-gray-50 dark:bg-gray-700/40 rounded-lg px-3 py-2.5 min-h-[80px] whitespace-pre-wrap ${clauses ? "text-gray-700 dark:text-gray-200" : "text-gray-400 italic"}`}>
              {clauses || "No content entered."}
            </p>
          )}
        </SectionCard>

        {/* Pre-issue checklist (TC only) */}
        {canEdit && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-500" /> Pre-Issue Checklist
            </p>
            <div className="space-y-2">
              {checklist.map(({ label, done }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-green-500" : "bg-gray-200 dark:bg-gray-600"}`}>
                    {done && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <p className={`text-sm ${done ? "text-gray-700 dark:text-gray-200" : "text-gray-400 dark:text-gray-500"}`}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Action Bar ──────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
          <div className="flex flex-wrap gap-3">

            {/* View + Download always visible when WO exists */}
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

            {/* TC Actions */}
            {canEdit && (
              <>
                <button onClick={handleSaveDraft} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60">
                  {saving ? <span className="w-4 h-4 border-2 border-gray-400/40 border-t-gray-400 rounded-full animate-spin" /> : <FileText className="w-4 h-4" />}
                  Save Draft
                </button>
                <button onClick={handleIssue} disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
                  {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit Work Order to Executive Engineer
                </button>
              </>
            )}

            {/* EE Actions */}
            {isEEStage && isEERole && (
              <>
                <button
                  onClick={() => setActionDialog({ title: "Approve & Forward to CAFO", description: "Work Order will be forwarded to CAFO for review.", confirmLabel: "Approve & Forward", confirmColor: "green", required: true, onConfirm: handleEEApprove })}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                  <CheckCircle2 className="w-4 h-4" /> Approve & Forward to CAFO
                </button>
                <button
                  onClick={() => setActionDialog({ title: "Return to Tender Clerk", description: "Work Order will be returned for revision.", confirmLabel: "Return with Remarks", confirmColor: "red", required: true, onConfirm: handleEEReturn })}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                  <XCircle className="w-4 h-4" /> Return to Tender Clerk
                </button>
              </>
            )}

            {/* CAFO Actions */}
            {isCAFOStage && isCAFORole && (
              <>
                <button
                  onClick={() => setActionDialog({ title: "Approve & Forward to Additional CEO", description: "Work Order will be forwarded to Additional CEO for final approval.", confirmLabel: "Approve & Forward", confirmColor: "green", required: true, onConfirm: handleCAFOApprove })}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                  <CheckCircle2 className="w-4 h-4" /> Approve & Forward to Additional CEO
                </button>
                <button
                  onClick={() => setActionDialog({ title: "Return to Executive Engineer", description: "Work Order will be returned to Executive Engineer for revision.", confirmLabel: "Return with Remarks", confirmColor: "red", required: true, onConfirm: handleCAFOReturn })}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                  <XCircle className="w-4 h-4" /> Return to Executive Engineer
                </button>
              </>
            )}

            {/* ACEO Actions */}
            {isACEOStage && isACEORole && (
              <>
                <button
                  onClick={() => setActionDialog({ title: "Approve & Issue Work Order", description: "Work Order will be issued. Status changes to 'Work Order Issued' and MB & Billing stage opens.", confirmLabel: "Approve Work Order", confirmColor: "green", required: true, onConfirm: handleACEOApprove })}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                  <BadgeCheck className="w-4 h-4" /> Approve & Issue Work Order
                </button>
                <button
                  onClick={() => setActionDialog({ title: "Return to CAFO", description: "Work Order will be returned to CAFO for further review.", confirmLabel: "Return with Remarks", confirmColor: "red", required: true, onConfirm: handleACEOReturn })}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                  <XCircle className="w-4 h-4" /> Return to CAFO
                </button>
              </>
            )}

            {/* Issued state */}
            {isIssued && (
              <>
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Work Order issued to {project.workOrderData?.l1Contractor}
                </div>
                {isTenderClerk && (
                  <Link href={`/mb-billing/${project.id}`}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors ml-auto">
                    <Send className="w-4 h-4" /> Proceed to MB &amp; Billing →
                  </Link>
                )}
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
    </>
  );
}
