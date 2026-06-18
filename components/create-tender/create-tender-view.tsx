"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Gavel,
  Send,
  CheckCircle,
  XCircle,
  Info,
  AlertCircle,
  Check,
  Save,
  Globe,
  Calendar,
  DollarSign,
  FileText,
  Users,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  Clock,
} from "lucide-react";
import { store } from "@/store/iims.store";
import type { IProject, ITenderData } from "@/types/iims.types";
import { formatINR, StatusBadge } from "@/components/dashboard/dash-shared";

// ─── helpers ─────────────────────────────────────────────────────────────────

function calcEMD(n: number) { return Math.round(n * 0.02); }
function calcClass(n: number) {
  if (n > 10_000_000) return "Class A";
  if (n > 5_000_000)  return "Class B";
  return "Class C";
}
function calcFee(n: number) { return n > 5_000_000 ? 10_000 : 5_000; }

function genTenderId() {
  return `TND/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;
}
function addDays(base: string, days: number) {
  if (!base) return "";
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function fmtDate(s: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function daysBetween(a: string, b: string) {
  if (!a || !b) return 0;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

// ─── Primitives ───────────────────────────────────────────────────────────────

const base =
  "w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition";
const roBase =
  "w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-600 dark:text-gray-300 px-3 py-2.5 cursor-default";

function Field({
  label, value, onChange, type = "text", readOnly = false, required = false,
  hint, min, max,
}: {
  label: string; value: string; onChange?: (v: string) => void;
  type?: "text" | "date" | "number" | "textarea"; readOnly?: boolean;
  required?: boolean; hint?: string; min?: string; max?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {type === "textarea" ? (
        <textarea rows={4} value={value} readOnly={readOnly}
          onChange={(e) => onChange?.(e.target.value)}
          className={`${readOnly ? roBase : base} resize-none`} />
      ) : (
        <input type={type} value={value} readOnly={readOnly} min={min} max={max}
          onChange={(e) => onChange?.(e.target.value)}
          className={readOnly ? roBase : base} />
      )}
      {hint && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

function SelectField({
  label, value, onChange, options, readOnly = false,
}: {
  label: string; value: string; onChange?: (v: string) => void;
  options: string[]; readOnly?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      {readOnly
        ? <div className={roBase}>{value || "—"}</div>
        : <select value={value} onChange={(e) => onChange?.(e.target.value)} className={base}>
            {options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>}
    </div>
  );
}

function SectionCard({
  icon, title, children,
}: {
  icon: React.ReactNode; title: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-700/30">
        <span className="text-blue-600 dark:text-blue-400">{icon}</span>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ─── Approval Chain ───────────────────────────────────────────────────────────

const CHAIN = [
  { key: "clerk",  label: "Tender Clerk",      short: "TC" },
  { key: "ee",     label: "Exec. Engineer",    short: "EE" },
  { key: "cafo",   label: "Chief Accounts & Finance Officer", short: "CAFO" },
  { key: "addlceo",label: "Addl. Chief Executive Officer",    short: "ACEO" },
  { key: "portal", label: "MahaTender Portal", short: "MT" },
];

function chainIndex(status: string): number {
  const s = status.toLowerCase();
  if (s.includes("published") || s.includes("tender published"))     return 5;
  if (s.includes("pending at additional chief executive officer"))    return 3;
  if (s.includes("pending at additional"))                           return 3;
  if (s.includes("pending at chief accounts and finance officer"))   return 2;
  if (s.includes("pending at executive"))                            return 1;
  return 0;
}

function ApprovalChain({ status }: { status: string }) {
  const idx = chainIndex(status);
  const returned = status.toLowerCase().includes("returned");
  const published = status.toLowerCase().includes("published");

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tender Approval Chain</p>
        {published && (
          <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <Globe className="w-3 h-3" aria-hidden="true" /> Published on MahaTender
          </span>
        )}
        {returned && !published && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            Returned for Corrections
          </span>
        )}
      </div>

      <div className="p-5">
      <div className="flex items-start">
        {CHAIN.map((step, i) => {
          const done = i < idx || published;
          const active = i === idx && !published;
          const isReturned = returned && active;

          return (
            <div key={step.key} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center gap-2 shrink-0 w-16">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  done
                    ? "bg-green-500 border-green-500 text-white shadow-sm"
                    : isReturned
                    ? "bg-red-500 border-red-500 text-white"
                    : active
                    ? "bg-blue-600 border-blue-600 text-white shadow-md ring-4 ring-blue-100 dark:ring-blue-900/30"
                    : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-400"
                }`}>
                  {done ? <Check className="w-4 h-4" /> : step.short}
                </div>
                <p className={`text-[10px] font-medium text-center leading-tight ${
                  active && !isReturned ? "text-blue-600 dark:text-blue-400"
                  : done ? "text-green-600 dark:text-green-400"
                  : isReturned ? "text-red-500"
                  : "text-gray-400 dark:text-gray-500"
                }`}>{step.label}</p>
              </div>
              {i < CHAIN.length - 1 && (
                <div className={`h-0.5 flex-1 mx-0.5 -mt-5 transition-colors ${
                  i < idx || published ? "bg-green-400" : "bg-gray-200 dark:bg-gray-700"
                }`} />
              )}
            </div>
          );
        })}
      </div>
      </div>{/* /p-5 */}
    </div>
  );
}

// ─── Publish Confirm Dialog ───────────────────────────────────────────────────

function PublishDialog({
  tenderId, projectName, onConfirm, onCancel, confirming,
}: {
  tenderId: string; projectName: string;
  onConfirm: () => void; onCancel: () => void; confirming: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Publish on MahaTender?</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">This action cannot be undone.</p>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-5 space-y-1 text-sm">
          <p className="text-gray-600 dark:text-gray-300"><span className="text-gray-400 dark:text-gray-500 text-xs">Tender ID</span><br /><strong>{tenderId}</strong></p>
          <p className="text-gray-600 dark:text-gray-300 text-xs mt-2 line-clamp-2">{projectName}</p>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          The tender notice will be published on the MahaTender portal and a reference ID will be generated. Bidders will be able to view and download the notice immediately.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={confirming}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={confirming}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50">
            {confirming ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            {confirming ? "Publishing…" : "Publish Now"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Published Banner ─────────────────────────────────────────────────────────

function PublishedBanner({ tenderId, mahaTenderRef }: { tenderId: string; mahaTenderRef?: string }) {
  return (
    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shrink-0">
          <Globe className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-green-800 dark:text-green-300">Tender Published on MahaTender</p>
          <p className="text-sm text-green-700 dark:text-green-400 mt-0.5">
            This tender is live and visible to contractors on the MahaTender portal.
          </p>
          <div className="flex flex-wrap gap-4 mt-3">
            <div>
              <p className="text-xs text-green-600 dark:text-green-500">Tender ID</p>
              <p className="text-sm font-bold text-green-800 dark:text-green-300">{tenderId}</p>
            </div>
            {mahaTenderRef && (
              <div>
                <p className="text-xs text-green-600 dark:text-green-500">MahaTender Reference</p>
                <p className="text-sm font-bold text-green-800 dark:text-green-300">{mahaTenderRef}</p>
              </div>
            )}
          </div>
        </div>
        <ExternalLink className="w-4 h-4 text-green-500 shrink-0 mt-1" />
      </div>
    </div>
  );
}

// ─── Date Timeline ────────────────────────────────────────────────────────────

function DateTimeline({
  publishingDate, closingDate, bidStartDate, bidEndDate,
  preBidStartDate, preBidEndDate,
}: {
  publishingDate: string; closingDate: string;
  bidStartDate: string; bidEndDate: string;
  preBidStartDate: string; preBidEndDate: string;
}) {
  const totalDays = daysBetween(publishingDate, closingDate);
  if (!publishingDate || !closingDate || totalDays <= 0) return null;

  const events: { label: string; date: string; color: string }[] = [
    { label: "Publishing",   date: publishingDate,   color: "bg-blue-500"   },
    { label: "Pre-Bid Start", date: preBidStartDate, color: "bg-purple-400" },
    { label: "Pre-Bid End",   date: preBidEndDate,   color: "bg-purple-600" },
    { label: "Bid Open",      date: bidStartDate,    color: "bg-green-500"  },
    { label: "Bid Close",     date: bidEndDate,      color: "bg-orange-500" },
    { label: "Tender Close",  date: closingDate,     color: "bg-red-500"    },
  ].filter((e) => e.date && daysBetween(publishingDate, e.date) >= 0);

  return (
    <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" /> Date Timeline ({totalDays} days)
      </p>
      <div className="relative h-2 bg-gray-100 dark:bg-gray-700 rounded-full mb-6">
        {events.map((ev) => {
          const pct = Math.min(100, Math.max(0, (daysBetween(publishingDate, ev.date) / totalDays) * 100));
          return (
            <div key={ev.label} className="absolute top-0 -translate-x-1/2" style={{ left: `${pct}%` }}>
              <div className={`w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 -mt-0.5 ${ev.color}`} />
              <p className="text-[9px] font-medium text-gray-500 dark:text-gray-400 mt-2 whitespace-nowrap -translate-x-1/4">{ev.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function CreateTenderView({ projectId }: { projectId: string }) {
  const router = useRouter();

  const [project, setProject]   = useState<IProject | null>(null);
  const [userRole, setUserRole] = useState("");
  const [saving, setSaving]     = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [remarks, setRemarks]   = useState("");

  const today = new Date().toISOString().slice(0, 10);

  // form state
  const [tenderId,        setTenderId]        = useState(genTenderId());
  const [publishingDate,  setPublishingDate]  = useState(today);
  const [closingDate,     setClosingDate]     = useState(addDays(today, 30));
  const [bidStartDate,    setBidStartDate]    = useState(addDays(today, 5));
  const [bidEndDate,      setBidEndDate]      = useState(addDays(today, 28));
  const [preBidStartDate, setPreBidStartDate] = useState(addDays(today, 10));
  const [preBidEndDate,   setPreBidEndDate]   = useState(addDays(today, 12));
  const [tenderFeeVal,    setTenderFeeVal]    = useState("5000");
  const [emdAmountVal,    setEmdAmountVal]    = useState("0");
  const [contractorClass, setContractorClass] = useState("Class A");
  const [eligibility,     setEligibility]     = useState("");
  const [completionPeriod, setCompletionPeriod] = useState("12 months");

  const load = useCallback(() => {
    const p = store.getProjectById(projectId);
    setProject(p);
    setUserRole(store.getCurrentUser()?.role ?? "");

    if (p) {
      const td  = p.tenderData;
      const amt = p.estimatedAmount ?? 0;
      if (td) {
        setTenderId(td.tenderId);
        setPublishingDate(td.publishingDate);
        setClosingDate(td.closingDate);
        setBidStartDate(td.bidStartDate);
        setBidEndDate(td.bidEndDate);
        setPreBidStartDate(td.preBidStartDate);
        setPreBidEndDate(td.preBidEndDate);
        setTenderFeeVal(String(td.tenderFee));
        setEmdAmountVal(String(td.emdAmount));
        setContractorClass(td.classOfContractor);
        setEligibility(td.eligibilityCriteria);
        setCompletionPeriod(td.completionPeriod);
      } else {
        setEmdAmountVal(String(calcEMD(amt)));
        setTenderFeeVal(String(calcFee(amt)));
        setContractorClass(calcClass(amt));
        setEligibility(
          p.dtpData?.eligibilityCriteria ??
          `Registered contractor of ${calcClass(amt)} and above with valid registration certificate and minimum 3 years experience in similar works.`
        );
        setCompletionPeriod(p.dtpData?.completionPeriod ?? "12 months");
      }
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-gray-300 dark:text-gray-600" />
        <p className="text-gray-500 dark:text-gray-400">Project not found.</p>
        <Link href="/all-projects" className="text-blue-600 hover:underline text-sm">← All Projects</Link>
      </div>
    );
  }

  const isTenderClerk = userRole === "Tender Clerk";
  const isEE          = userRole === "Executive Engineer";
  const isCAFO        = userRole === "Chief Accounts and Finance Officer";
  const isAddlCEO     = userRole === "Additional Chief Executive Officer";
  const estimatedAmt  = project.estimatedAmount ?? 0;
  const tenderStatus  = project.tenderData?.status ?? "Draft";
  const isPublished   = tenderStatus.toLowerCase().includes("published");
  const isReturned    = tenderStatus.toLowerCase().includes("returned");

  // Clerk can edit when: no tender data yet, or it was returned to them
  const canEdit = isTenderClerk && (!project.tenderData || isReturned);

  // ── payload ────────────────────────────────────────────────────────────────

  function buildPayload(p: IProject, status: string): ITenderData {
    return {
      tenderId,
      publishingDate,
      closingDate,
      bidStartDate,
      bidEndDate,
      preBidStartDate,
      preBidEndDate,
      tenderFee: Number(tenderFeeVal) || 0,
      emdAmount: Number(emdAmountVal) || 0,
      classOfContractor: contractorClass,
      eligibilityCriteria: eligibility,
      completionPeriod,
      status,
      createdBy: p.tenderData?.createdBy ?? store.getCurrentUser()?.name ?? "Unknown",
      createdAt: p.tenderData?.createdAt ?? new Date().toISOString(),
    };
  }

  // ── validation ─────────────────────────────────────────────────────────────

  function validate(): boolean {
    if (!tenderId.trim()) { toast.error("Tender ID is required."); return false; }
    if (!publishingDate)  { toast.error("Publishing date is required."); return false; }
    if (!closingDate)     { toast.error("Closing date is required."); return false; }
    if (closingDate <= publishingDate) { toast.error("Closing date must be after publishing date."); return false; }
    if (!bidStartDate || !bidEndDate) { toast.error("Bid start and end dates are required."); return false; }
    if (bidEndDate <= bidStartDate) { toast.error("Bid end date must be after bid start date."); return false; }
    if (bidStartDate < publishingDate) { toast.error("Bid start date cannot be before publishing date."); return false; }
    if (bidEndDate > closingDate) { toast.error("Bid end date cannot be after tender closing date."); return false; }
    if (Number(emdAmountVal) <= 0) { toast.error("EMD Amount must be greater than zero."); return false; }
    if (!eligibility.trim()) { toast.error("Eligibility criteria is required."); return false; }
    return true;
  }

  // ── actions ────────────────────────────────────────────────────────────────

  async function handleSaveDraft() {
    if (!project) return;
    setSaving(true);
    try {
      store.updateProject(project.id, { tenderData: buildPayload(project, "Draft") });
      toast.success("Tender notice draft saved.");
      load();
    } finally { setSaving(false); }
  }

  async function handleCreate() {
    if (!project || !validate()) return;
    setSaving(true);
    try {
      store.updateProject(project.id, { tenderData: buildPayload(project, "Pending at Executive Engineer") });
      const createResult = store.forwardProject(project.id, "Executive Engineer", "Tender notice submitted for EE verification", "Tender Pending EE Review");
      if (!createResult.ok) { toast.error(createResult.error); return; }
      toast.success("Tender notice created and forwarded to Executive Engineer!");
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  async function handleEEForward() {
    if (!project?.tenderData) return;
    setSaving(true);
    try {
      store.updateProject(project.id, {
        tenderData: { ...project.tenderData, status: "Pending at Chief Accounts and Finance Officer", eeApprovedBy: store.getCurrentUser()?.name },
      });
      const eeResult = store.forwardProject(project.id, "Chief Accounts and Finance Officer", remarks || "Tender verified by EE — forwarding to Chief Accounts and Finance Officer", "Tender Pending CAFO Review");
      if (!eeResult.ok) { toast.error(eeResult.error); return; }
      toast.success("Tender forwarded to Chief Accounts and Finance Officer.");
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  async function handleCAFOForward() {
    if (!project?.tenderData) return;
    setSaving(true);
    try {
      store.updateProject(project.id, {
        tenderData: { ...project.tenderData, status: "Pending at Additional Chief Executive Officer", cafoApprovedBy: store.getCurrentUser()?.name },
      });
      const cafoResult = store.forwardProject(project.id, "Additional Chief Executive Officer", remarks || "Tender verified by Chief Accounts and Finance Officer — forwarding to Additional Chief Executive Officer", "Tender Pending ACEO Approval");
      if (!cafoResult.ok) { toast.error(cafoResult.error); return; }
      toast.success("Tender forwarded to Additional Chief Executive Officer.");
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  async function handleAddlCEOPublish() {
    if (!project?.tenderData) return;
    setConfirming(true);
    try {
      const mahaTenderRef = `MT${Date.now().toString().slice(-8)}`;
      store.updateProject(project.id, {
        tenderData: {
          ...project.tenderData,
          status: "Published on MahaTender",
          additionalCeoApprovedBy: store.getCurrentUser()?.name,
          mahaTenderReferenceId: mahaTenderRef,
        },
      });
      const publishResult = store.approveProject(project.id, "Tender Published", remarks || "Tender approved and published on MahaTender portal");
      if (!publishResult.ok) { toast.error(publishResult.error); return; }
      toast.success(`Tender published! MahaTender Ref: ${mahaTenderRef}`);
      setShowPublishDialog(false);
      load();
    } finally { setConfirming(false); setSaving(false); }
  }

  async function handleReturn(toRole: string) {
    if (!project?.tenderData) return;
    if (!remarks.trim()) { toast.error("Remarks are required when returning."); return; }
    setSaving(true);
    try {
      store.updateProject(project.id, {
        tenderData: { ...project.tenderData, status: `Returned to ${toRole}` },
      });
      const returnNextStatus =
        toRole === "Tender Clerk" ? "Ready for Tender Preparation" :
        toRole === "Executive Engineer" ? "Tender Pending EE Review" :
        "Tender Pending CAFO Review";
      const tenderReturnResult = store.rejectProject(project.id, toRole, remarks, returnNextStatus);
      if (!tenderReturnResult.ok) { toast.error(tenderReturnResult.error); return; }
      toast.success(`Tender returned to ${toRole}.`);
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  const pageTitle = isTenderClerk ? "Create Tender Notice" : "Verify Tender Notice";

  return (
    <>
      {showPublishDialog && (
        <PublishDialog
          tenderId={tenderId}
          projectName={project.projectName}
          onConfirm={handleAddlCEOPublish}
          onCancel={() => setShowPublishDialog(false)}
          confirming={confirming}
        />
      )}

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-start gap-4">
          <Link href={`/project/${project.id}`}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors mt-0.5 shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{pageTitle}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">{project.projectName}</p>
          </div>
          <div className="shrink-0"><StatusBadge status={tenderStatus} /></div>
        </div>

        {/* Published Banner */}
        {isPublished && (
          <PublishedBanner
            tenderId={tenderId}
            mahaTenderRef={project.tenderData?.mahaTenderReferenceId}
          />
        )}

        {/* Auto-fetch strip */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Auto-fetched from DTP &amp; Technical Sanction</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Estimate Amount",     value: formatINR(estimatedAmt) },
              { label: "EMD Amount (2%)",     value: formatINR(Number(emdAmountVal)) },
              { label: "Completion Period",   value: completionPeriod },
              { label: "Class of Contractor", value: contractorClass },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">{label}</p>
                <p className="text-sm font-bold text-blue-800 dark:text-blue-200 mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Approval chain */}
        <ApprovalChain status={tenderStatus} />

        {/* Returned notice */}
        {isReturned && isTenderClerk && (
          <div className="flex gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">Tender Returned for Corrections</p>
              <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                Review the remarks below, make corrections, and resubmit.
              </p>
            </div>
          </div>
        )}

        {/* Read-only notice for non-Clerk */}
        {!isTenderClerk && !isPublished && (
          <div className="flex gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Viewing in <strong>read-only</strong> mode. Use the action buttons below to forward or return with remarks.
            </p>
          </div>
        )}

        {/* ── Section 1: Tender Identification ── */}
        <SectionCard icon={<FileText className="w-4 h-4" />} title="Tender Identification">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Tender ID" value={tenderId} onChange={setTenderId}
              readOnly={!canEdit} required
              hint="Auto-generated; editable by Tender Clerk" />
            <Field label="Completion Period" value={completionPeriod} onChange={setCompletionPeriod}
              readOnly={!canEdit}
              hint="Pre-filled from DTP" />
          </div>
        </SectionCard>

        {/* ── Section 2: Publication Schedule ── */}
        <SectionCard icon={<Calendar className="w-4 h-4" />} title="Publication Schedule">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Publishing Date" value={publishingDate} onChange={setPublishingDate}
              type="date" readOnly={!canEdit} required />
            <Field label="Tender Closing Date" value={closingDate} onChange={setClosingDate}
              type="date" readOnly={!canEdit} required min={publishingDate}
              hint={publishingDate && closingDate ? `${daysBetween(publishingDate, closingDate)} days open` : undefined} />
          </div>
        </SectionCard>

        {/* ── Section 3: Bid Dates ── */}
        <SectionCard icon={<Clock className="w-4 h-4" />} title="Bid Dates &amp; Pre-Bid Meeting">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Bid Start Date" value={bidStartDate} onChange={setBidStartDate}
              type="date" readOnly={!canEdit} required min={publishingDate} />
            <Field label="Bid End Date" value={bidEndDate} onChange={setBidEndDate}
              type="date" readOnly={!canEdit} required min={bidStartDate} max={closingDate} />
            <Field label="Pre-Bid Meeting Start Date" value={preBidStartDate} onChange={setPreBidStartDate}
              type="date" readOnly={!canEdit} min={publishingDate} />
            <Field label="Pre-Bid Meeting End Date" value={preBidEndDate} onChange={setPreBidEndDate}
              type="date" readOnly={!canEdit} min={preBidStartDate} />
          </div>

          {/* Date summary table */}
          {publishingDate && closingDate && (
            <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Date Summary</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: "Tender Published",    date: publishingDate },
                  { label: "Pre-Bid Meeting",     date: preBidStartDate ? `${fmtDate(preBidStartDate)} – ${fmtDate(preBidEndDate)}` : "—" },
                  { label: "Bidding Window",      date: `${fmtDate(bidStartDate)} – ${fmtDate(bidEndDate)}` },
                  { label: "Tender Closes",       date: closingDate },
                  { label: "Days to Close",       date: `${daysBetween(publishingDate, closingDate)} days` },
                  { label: "Bid Window Duration", date: `${daysBetween(bidStartDate, bidEndDate)} days` },
                ].map(({ label, date }) => (
                  <div key={label} className="bg-gray-50 dark:bg-gray-700/40 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">{label}</p>
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mt-0.5">
                      {typeof date === "string" && date.match(/^\d{4}-/) ? fmtDate(date) : date}
                    </p>
                  </div>
                ))}
              </div>

              <DateTimeline
                publishingDate={publishingDate}
                closingDate={closingDate}
                bidStartDate={bidStartDate}
                bidEndDate={bidEndDate}
                preBidStartDate={preBidStartDate}
                preBidEndDate={preBidEndDate}
              />
            </div>
          )}
        </SectionCard>

        {/* ── Section 4: Financial Parameters ── */}
        <SectionCard icon={<DollarSign className="w-4 h-4" />} title="Financial Parameters">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Field label="EMD Amount (₹)" value={emdAmountVal} onChange={setEmdAmountVal}
              type="number" readOnly={!canEdit}
              hint={`Auto: 2% of ${formatINR(estimatedAmt)}`} />
            <Field label="Tender Fee (₹)" value={tenderFeeVal} onChange={setTenderFeeVal}
              type="number" readOnly={!canEdit}
              hint={estimatedAmt > 5_000_000 ? "Auto: ₹10,000 (>50L)" : "Auto: ₹5,000 (≤50L)"} />
            <SelectField label="Class of Contractor" value={contractorClass} onChange={setContractorClass}
              options={["Class A", "Class B", "Class C"]} readOnly={!canEdit} />
          </div>

          {/* Financial summary row */}
          <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">Estimated Cost</p>
              <p className="text-base font-bold text-gray-700 dark:text-gray-200">{formatINR(estimatedAmt)}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">EMD Required</p>
              <p className="text-base font-bold text-blue-600 dark:text-blue-400">{formatINR(Number(emdAmountVal))}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">Tender Fee</p>
              <p className="text-base font-bold text-gray-700 dark:text-gray-200">{formatINR(Number(tenderFeeVal))}</p>
            </div>
          </div>
        </SectionCard>

        {/* ── Section 5: Scope & Eligibility ── */}
        <SectionCard icon={<Users className="w-4 h-4" />} title="Scope &amp; Eligibility">
          <Field label="Eligibility Criteria" value={eligibility} onChange={setEligibility}
            type="textarea" readOnly={!canEdit} required />
        </SectionCard>

        {/* ── Remarks (verification roles always; Clerk if returned) ── */}
        {(isEE || isCAFO || isAddlCEO || (isTenderClerk && isReturned && project.tenderData)) && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              {isTenderClerk ? "Return Remarks" : "Remarks"}
              {!isTenderClerk && (
                <span className="text-xs font-normal text-gray-400 ml-1">(required when returning)</span>
              )}
            </label>
            {isTenderClerk
              ? <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/40 rounded-lg p-3">
                  {project.tenderData?.status ?? "—"}
                </p>
              : <>
                  <textarea rows={4} value={remarks} onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Add remarks or observations for this verification step…"
                    className={`${base} resize-none`} />
                  <p className="text-xs text-gray-400 text-right mt-1">{remarks.length} chars</p>
                </>
            }
          </div>
        )}

        {/* ── Action Buttons ── */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
          <div className="flex flex-wrap gap-3">

            {/* Tender Clerk */}
            {isTenderClerk && canEdit && (
              <>
                <button onClick={handleSaveDraft} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors disabled:opacity-60">
                  <Save className="w-4 h-4" /> Save Draft
                </button>
                <button onClick={handleCreate} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                  {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit Tender Notice
                </button>
              </>
            )}

            {/* EE */}
            {isEE && tenderStatus.includes("Pending at Executive") && (
              <>
                <button onClick={handleEEForward} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                  {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Verify &amp; Forward to CAFO
                </button>
                <button onClick={() => handleReturn("Tender Clerk")} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors disabled:opacity-60">
                  {saving ? <span className="w-4 h-4 border-2 border-red-400/40 border-t-red-500 rounded-full animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Return to Tender Clerk
                </button>
              </>
            )}

            {/* Chief Accounts and Finance Officer */}
            {isCAFO && tenderStatus.includes("Pending at Chief Accounts and Finance Officer") && (
              <>
                <button onClick={handleCAFOForward} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                  {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Forward to Additional Chief Executive Officer
                </button>
                <button onClick={() => handleReturn("Executive Engineer")} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors disabled:opacity-60">
                  {saving ? <span className="w-4 h-4 border-2 border-red-400/40 border-t-red-500 rounded-full animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Return to Executive Engineer
                </button>
              </>
            )}

            {/* Additional Chief Executive Officer */}
            {isAddlCEO && tenderStatus.includes("Pending at Additional Chief Executive Officer") && (
              <>
                <button onClick={() => setShowPublishDialog(true)} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                  <Globe className="w-4 h-4" /> Approve &amp; Publish on MahaTender
                </button>
                <button onClick={() => handleReturn("Chief Accounts and Finance Officer")} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors disabled:opacity-60">
                  {saving ? <span className="w-4 h-4 border-2 border-red-400/40 border-t-red-500 rounded-full animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Return to Chief Accounts and Finance Officer
                </button>
              </>
            )}

            {isPublished && (
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 font-medium">
                <CheckCircle className="w-4 h-4" /> This tender has been published on MahaTender.
              </div>
            )}

            {!isTenderClerk && !isEE && !isCAFO && !isAddlCEO && !isPublished && (
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Info className="w-4 h-4" /> No actions available for your role on this page.
              </p>
            )}
          </div>

          {/* Footer summary */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
            <span>Tender ID: <strong className="text-gray-600 dark:text-gray-300">{tenderId}</strong></span>
            <span>Closing: <strong className="text-gray-600 dark:text-gray-300">{fmtDate(closingDate)}</strong></span>
            <span>EMD: <strong className="text-gray-600 dark:text-gray-300">{formatINR(Number(emdAmountVal))}</strong></span>
            <span>Class: <strong className="text-gray-600 dark:text-gray-300">{contractorClass}</strong></span>
          </div>
        </div>

      </div>
    </>
  );
}
