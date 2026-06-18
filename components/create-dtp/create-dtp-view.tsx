"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  FileText,
  Send,
  CheckCircle,
  XCircle,
  Edit2,
  Save,
  Info,
  AlertCircle,
  Upload,
  Eye,
  Trash2,
  Check,
  MessageSquare,
  Paperclip,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { store } from "@/store/iims.store";
import type { IProject, IDTPData, IDocument } from "@/types/iims.types";
import { formatINR, StatusBadge } from "@/components/dashboard/dash-shared";

// ─── helpers ─────────────────────────────────────────────────────────────────

function calcEMD(amount: number) { return Math.round(amount * 0.02); }
function calcClass(amount: number): string {
  if (amount > 10_000_000) return "Class A";
  if (amount > 5_000_000) return "Class B";
  return "Class C";
}
function calcFee(amount: number): number { return amount > 5_000_000 ? 10_000 : 5_000; }

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

// ─── Approval Chain ───────────────────────────────────────────────────────────

const DTP_CHAIN = [
  { role: "Sectional Engineer", short: "SE" },
  { role: "Deputy Engineer",    short: "DE" },
  { role: "Executive Engineer", short: "EE" },
];

function statusToActiveStep(status: string): number {
  const s = status.toLowerCase();
  if (s.includes("pending at deputy"))     return 1;
  if (s.includes("returned to sectional")) return 0;
  if (s.includes("pending at executive"))  return 2;
  if (s.includes("returned to deputy"))    return 1;
  if (s.includes("dtp sanctioned"))        return 3; // past EE — all steps done
  return 0; // Draft
}

function ApprovalChain({ status }: { status: string }) {
  const active = statusToActiveStep(status);
  const isReturned = status.toLowerCase().includes("returned");

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">DTP Approval Chain</p>
        {isReturned && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            Returned for Corrections
          </span>
        )}
        {status === "DTP Sanctioned" && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Sanctioned ✓
          </span>
        )}
      </div>
      <div className="p-5">
      <div className="flex items-start gap-0">
        {DTP_CHAIN.map((step, i) => {
          const done     = i < active;
          const current  = !isReturned && i === active && active < DTP_CHAIN.length;
          const returned = isReturned && i === active;

          return (
            <div key={step.role} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                  done
                    ? "bg-green-500 border-green-500 text-white"
                    : returned
                    ? "bg-red-500 border-red-500 text-white"
                    : current
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400"
                }`}>
                  {done ? <Check className="w-4 h-4" /> : step.short.length > 3 ? String(i + 1) : step.short}
                </div>
                <p className={`text-[10px] font-medium text-center leading-tight w-14 truncate ${
                  current ? "text-blue-600 dark:text-blue-400"
                  : done ? "text-green-600 dark:text-green-400"
                  : returned ? "text-red-500"
                  : "text-gray-400 dark:text-gray-500"
                }`}>{step.role}</p>
              </div>
              {i < DTP_CHAIN.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 mt-[-14px] ${done ? "bg-green-400" : "bg-gray-200 dark:bg-gray-700"}`} />
              )}
            </div>
          );
        })}
      </div>
      </div>{/* /p-5 */}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ num, title, badge }: { num: number; title: string; badge?: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-700 pb-3 mb-5">
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">
        {num}
      </span>
      <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
      <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${
        badge === "Required"
          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      }`}>
        {badge ?? "Auto-generated"}
      </span>
    </div>
  );
}

// ─── Field primitives ─────────────────────────────────────────────────────────

const fieldBase =
  "w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition";
const readOnlyClass = "bg-gray-50 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 cursor-default";

function Field({
  label, value, onChange, type = "text", readOnly = false, required = false, rows = 3,
}: {
  label: string; value: string; onChange?: (v: string) => void;
  type?: "text" | "date" | "textarea"; readOnly?: boolean; required?: boolean; rows?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {type === "textarea" ? (
        <textarea rows={rows} value={value} readOnly={readOnly}
          onChange={(e) => onChange?.(e.target.value)}
          className={`${fieldBase} ${readOnly ? readOnlyClass : ""} resize-none`} />
      ) : (
        <input type={type} value={value} readOnly={readOnly}
          onChange={(e) => onChange?.(e.target.value)}
          className={`${fieldBase} ${readOnly ? readOnlyClass : ""}`} />
      )}
    </div>
  );
}

function SelectField({
  label, value, onChange, options, readOnly = false,
}: {
  label: string; value: string; onChange?: (v: string) => void;
  options: string[]; readOnly?: boolean;
}) {
  if (readOnly) {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
        <div className={`${fieldBase} ${readOnlyClass}`}>{value || "—"}</div>
      </div>
    );
  }
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange?.(e.target.value)} className={fieldBase}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ─── Document upload types ────────────────────────────────────────────────────

interface LocalDoc {
  id: string;
  name: string;
  size: number;
  url: string;     // blob URL — ephemeral
  mimeType: string;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

// ─── Main component ───────────────────────────────────────────────────────────

export function CreateDTPView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [project, setProject] = useState<IProject | null>(null);
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showSections, setShowSections] = useState(true);

  // form fields
  const [tsNumber, setTsNumber] = useState("");
  const [tsDate, setTsDate] = useState("");
  const [aaNumber, setAaNumber] = useState("");
  const [aaDate, setAaDate] = useState("");
  const [completionPeriod, setCompletionPeriod] = useState("12 months");
  const [dlpPeriod, setDlpPeriod] = useState("12 months");
  const [paymentTerms, setPaymentTerms] = useState(
    "Payment shall be made within 30 days of submission of running account bill duly verified by the Engineer-in-Charge, subject to deductions as per contract conditions and relevant government orders."
  );
  const [penaltyClause, setPenaltyClause] = useState(
    "In the event of failure by the contractor to complete the work within the stipulated period, a penalty of 0.5% of the contract amount per week of delay shall be levied, subject to a maximum of 10% of the total contract value."
  );
  const [ssrReference, setSsrReference] = useState("");
  const [dsrReference, setDsrReference] = useState("");
  const [specialConditions, setSpecialConditions] = useState("");
  const [qualityStandards, setQualityStandards] = useState(
    "All materials and workmanship shall conform to the relevant IS standards and the specifications laid down in the Schedule of Rates. Quality control tests shall be carried out as per prescribed frequencies."
  );
  const [remarks, setRemarks] = useState("");

  // documents
  const [dtpDocs, setDtpDocs] = useState<LocalDoc[]>([]);

  const load = useCallback(() => {
    const p = store.getProjectById(projectId);
    setProject(p);
    const u = store.getCurrentUser();
    setUserRole(u?.role ?? "");
    setUserName(u?.name ?? "");
    if (p) {
      const dtp = p.dtpData;
      setTsNumber(dtp?.tsNumber ?? `TS/${new Date().getFullYear()}/${p.id.slice(-4)}`);
      setTsDate(dtp?.tsDate ?? new Date().toISOString().slice(0, 10));
      setAaNumber(dtp?.aaNumber ?? "");
      setAaDate(dtp?.aaDate ?? "");
      setCompletionPeriod(dtp?.completionPeriod ?? "12 months");
      setDlpPeriod(dtp?.dlpPeriod ?? "12 months");
      if (dtp?.paymentTerms) setPaymentTerms(dtp.paymentTerms);
      if (dtp?.penaltyClause) setPenaltyClause(dtp.penaltyClause);
      setSsrReference(dtp?.ssrReference ?? p.ssrType ?? "");
      setDsrReference(dtp?.dsrReference ?? "DSR 2023-24");
      if (dtp?.specialConditions) setSpecialConditions(dtp.specialConditions);
      if (dtp?.qualityStandards) setQualityStandards(dtp.qualityStandards);
      if (dtp?.remarks) setRemarks(dtp.remarks);
      // blob URLs can't be restored from store; docs show as names only
      if (dtp?.documents?.length) {
        setDtpDocs(dtp.documents.map((d) => ({
          id: d.id,
          name: d.name,
          size: 0,
          url: d.url ?? "",
          mimeType: d.type,
        })));
      }
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  // revoke blob URLs on unmount
  useEffect(() => {
    return () => {
      dtpDocs.forEach((d) => { if (d.url.startsWith("blob:")) URL.revokeObjectURL(d.url); });
    };
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

  const isSE = userRole === "Sectional Engineer";
  const isDE = userRole === "Deputy Engineer";
  const isEE = userRole === "Executive Engineer";
  const canEdit = isSE && (!project.dtpData || project.dtpData.status === "Draft" || (project.dtpData.status ?? "").toLowerCase().includes("returned"));
  const isInEditMode = canEdit || isEditing;

  const estimatedAmt = project.estimatedAmount ?? 0;
  const emdAmount = calcEMD(estimatedAmt);
  const contractorClass = calcClass(estimatedAmt);
  const tenderFee = calcFee(estimatedAmt);
  const dtpStatus = project.dtpData?.status ?? "Draft";

  // ── file handlers ──────────────────────────────────────────────────────────

  function addFiles(files: FileList | null) {
    if (!files || !isInEditMode) return;
    const newDocs: LocalDoc[] = [];
    Array.from(files).forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds 20 MB limit.`);
        return;
      }
      if (dtpDocs.some((d) => d.name === file.name)) {
        toast.error(`${file.name} is already attached.`);
        return;
      }
      newDocs.push({
        id: `DOC${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        size: file.size,
        url: URL.createObjectURL(file),
        mimeType: file.type,
      });
    });
    setDtpDocs((prev) => [...prev, ...newDocs]);
  }

  function removeDoc(id: string) {
    setDtpDocs((prev) => {
      const doc = prev.find((d) => d.id === id);
      if (doc?.url.startsWith("blob:")) URL.revokeObjectURL(doc.url);
      return prev.filter((d) => d.id !== id);
    });
  }

  function buildIDocuments(): IDocument[] {
    const user = store.getCurrentUser();
    return dtpDocs.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.mimeType || "application/octet-stream",
      url: d.url,
      uploadedAt: new Date().toISOString(),
      uploadedBy: user?.name ?? "Unknown",
    }));
  }

  // ── DTP payload ────────────────────────────────────────────────────────────

  function buildDTPPayload(p: IProject, status: string, extraRemarks?: string): IDTPData {
    return {
      id: p.dtpData?.id ?? `DTP${Date.now()}`,
      tsNumber, tsDate, aaNumber, aaDate,
      completionPeriod, dlpPeriod,
      paymentTerms, penaltyClause,
      ssrReference, dsrReference,
      specialConditions, qualityStandards,
      emdAmount: calcEMD(p.estimatedAmount ?? 0),
      tenderFee: calcFee(p.estimatedAmount ?? 0),
      classOfContractor: calcClass(p.estimatedAmount ?? 0),
      eligibilityCriteria: `Registered contractor of ${calcClass(p.estimatedAmount ?? 0)} and above with valid registration certificate and minimum 3 years experience in similar works.`,
      status,
      remarks: extraRemarks ?? remarks,
      documents: buildIDocuments(),
      createdBy: p.dtpData?.createdBy ?? store.getCurrentUser()?.name ?? "Unknown",
      createdAt: p.dtpData?.createdAt ?? new Date().toISOString(),
    };
  }

  // ── actions ────────────────────────────────────────────────────────────────

  async function handleSaveDraft() {
    if (!project) return;
    setSaving(true);
    try {
      store.updateProject(project.id, { dtpData: buildDTPPayload(project, "Draft") });
      toast.success("DTP draft saved.");
      load();
      setIsEditing(false);
    } finally { setSaving(false); }
  }

  async function handleSubmit() {
    if (!project) return;
    if (!tsNumber.trim()) { toast.error("TS Number is required."); return; }
    if (!completionPeriod) { toast.error("Completion period is required."); return; }
    setSaving(true);
    try {
      store.updateProject(project.id, { dtpData: buildDTPPayload(project, "Pending at Deputy Engineer") });
      const submitResult = store.forwardProject(project.id, "Deputy Engineer", "DTP submitted for DE verification", "Pending DTP Review");
      if (!submitResult.ok) { toast.error(submitResult.error); return; }
      toast.success("DTP created and forwarded to Deputy Engineer!");
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  async function handleDEForward() {
    if (!project?.dtpData) return;
    setSaving(true);
    try {
      const dtp: IDTPData = {
        ...project.dtpData,
        status: "Pending at Executive Engineer",
        verifiedBy: store.getCurrentUser()?.name,
        verifiedAt: new Date().toISOString(),
        remarks,
      };
      store.updateProject(project.id, { dtpData: dtp });
      const deResult = store.forwardProject(project.id, "Executive Engineer", remarks || "DTP verified by DE — forwarding to EE", "Pending DTP Approval");
      if (!deResult.ok) { toast.error(deResult.error); return; }
      toast.success("DTP forwarded to Executive Engineer.");
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  async function handleEEApprove() {
    if (!project?.dtpData) return;
    setSaving(true);
    try {
      const dtp: IDTPData = {
        ...project.dtpData,
        status: "DTP Sanctioned",
        approvedBy: store.getCurrentUser()?.name,
        approvedAt: new Date().toISOString(),
        remarks,
      };
      store.updateProject(project.id, { dtpData: dtp });
      const eeResult = store.approveProject(project.id, "Ready for Tender Preparation", remarks || "DTP approved by EE — ready for tender creation");
      if (!eeResult.ok) { toast.error(eeResult.error); return; }
      toast.success("DTP Approved! Ready for Tender Creation.");
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  async function handleReturn(toRole: string) {
    if (!project?.dtpData) return;
    if (!remarks.trim()) { toast.error("Remarks are required when returning."); return; }
    setSaving(true);
    try {
      const dtp: IDTPData = { ...project.dtpData, status: `Returned to ${toRole}`, remarks };
      store.updateProject(project.id, { dtpData: dtp });
      const returnNextStatus = toRole === "Sectional Engineer" ? "Ready for DTP Preparation" : "Pending DTP Review";
      const returnResult = store.rejectProject(project.id, toRole, remarks, returnNextStatus);
      if (!returnResult.ok) { toast.error(returnResult.error); return; }
      toast.success(`DTP returned to ${toRole}.`);
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  function handleDownload() {
    if (!project) return;
    const lines = [
      "DRAFT TENDER PAPER",
      "==================",
      "",
      `Project         : ${project.projectName}`,
      `Department      : ${project.departmentName}`,
      `Location        : ${project.taluka}, ${project.gramPanchayat}`,
      `Division        : ${project.division} / ${project.subDivision}`,
      "",
      "1. COVER PAGE",
      `   Estimate Amount         : ${formatINR(estimatedAmt)}`,
      `   Technical Sanction No.  : ${tsNumber}`,
      `   Sanction Date           : ${tsDate}`,
      `   AA Number               : ${aaNumber || "—"}`,
      `   AA Date                 : ${aaDate || "—"}`,
      "",
      "2. ADMINISTRATIVE APPROVAL",
      `   Estimated Amount        : ${formatINR(estimatedAmt)}`,
      `   Technical Sanction Amt  : ${formatINR(project.technicalSanctionAmount ?? estimatedAmt)}`,
      `   AA Number               : ${aaNumber || "—"}`,
      `   AA Date                 : ${aaDate || "—"}`,
      "",
      "3. GENERAL CONDITIONS OF CONTRACT",
      `   Completion Period        : ${completionPeriod}`,
      `   DLP Period               : ${dlpPeriod}`,
      `   Payment Terms            : ${paymentTerms}`,
      `   Penalty Clause           : ${penaltyClause}`,
      "",
      "4. TECHNICAL SPECIFICATIONS",
      `   SSR Reference            : ${ssrReference}`,
      `   DSR Reference            : ${dsrReference}`,
      `   Special Conditions       : ${specialConditions || "None"}`,
      `   Quality Standards        : ${qualityStandards}`,
      "",
      "5. SUPPORTING DOCUMENTS",
      ...(dtpDocs.length ? dtpDocs.map((d, i) => `   ${i + 1}. ${d.name}`) : ["   None attached"]),
      "",
      "TENDER PARAMETERS",
      `   EMD Amount (2%)          : ${formatINR(emdAmount)}`,
      `   Tender Fee               : ${formatINR(tenderFee)}`,
      `   Class of Contractor      : ${contractorClass}`,
      "",
      `DTP Status: ${dtpStatus}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DTP_${project.id}_${project.projectName.replace(/\s+/g, "_").slice(0, 30)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href={`/project/${project.id}`}
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors mt-0.5 shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Draft Tender Paper (DTP)</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">{project.projectName}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <StatusBadge status={dtpStatus} />
          <button onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors">
            <Download className="w-4 h-4" /> Download DTP
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 flex gap-3">
        <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
            Auto-generated DTP from Technically Sanctioned Estimate
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
            Review all sections, attach supporting documents, and submit for departmental verification before tender publication.
          </p>
        </div>
      </div>

      {/* Tender parameters strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Estimated Amount", value: formatINR(estimatedAmt) },
          { label: "EMD Amount (2%)",  value: formatINR(emdAmount) },
          { label: "Completion Period", value: completionPeriod },
          { label: "Class of Contractor", value: contractorClass },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Approval Chain */}
      <ApprovalChain status={dtpStatus} />

      {/* SE Edit toggle (only if DTP already saved once) */}
      {isSE && project.dtpData && (
        <div className="flex justify-end">
          {isEditing ? (
            <button onClick={() => setIsEditing(false)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Cancel Edit
            </button>
          ) : (
            <button onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
              <Edit2 className="w-3.5 h-3.5" /> Edit DTP
            </button>
          )}
        </div>
      )}

      {/* DTP Document — collapsible */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowSections((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
        >
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">DTP Sections (1–4)</span>
          {showSections ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {showSections && (
          <div className="px-8 pb-8 space-y-10 border-t border-gray-100 dark:border-gray-700 pt-6">

            {/* 1. Cover Page */}
            <section>
              <SectionHeader num={1} title="Cover Page" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Name of Work" value={project.projectName} readOnly />
                <Field label="Estimate Amount (₹)" value={formatINR(estimatedAmt)} readOnly />
                <Field label="Technical Sanction No." value={tsNumber} onChange={setTsNumber} readOnly={!isInEditMode} required />
                <Field label="Sanction Date" value={tsDate} onChange={setTsDate} type="date" readOnly={!isInEditMode} />
                <Field label="Administrative Approval No." value={aaNumber} onChange={setAaNumber} readOnly={!isInEditMode} />
                <Field label="AA Date" value={aaDate} onChange={setAaDate} type="date" readOnly={!isInEditMode} />
              </div>
            </section>

            {/* 2. Administrative Approval */}
            <section>
              <SectionHeader num={2} title="Administrative Approval" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Estimated Amount (₹)" value={formatINR(estimatedAmt)} readOnly />
                <Field label="Technical Sanction Amount (₹)" value={formatINR(project.technicalSanctionAmount ?? estimatedAmt)} readOnly />
                <Field label="AA Number" value={aaNumber} onChange={setAaNumber} readOnly={!isInEditMode} />
                <Field label="AA Date" value={aaDate} onChange={setAaDate} type="date" readOnly={!isInEditMode} />
              </div>
            </section>

            {/* 3. General Conditions */}
            <section>
              <SectionHeader num={3} title="General Conditions of Contract" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                <SelectField label="Completion Period" value={completionPeriod} onChange={setCompletionPeriod}
                  options={["6 months", "9 months", "12 months", "18 months", "24 months"]} readOnly={!isInEditMode} />
                <SelectField label="Defect Liability Period (DLP)" value={dlpPeriod} onChange={setDlpPeriod}
                  options={["12 months", "24 months", "36 months"]} readOnly={!isInEditMode} />
              </div>
              <div className="space-y-5">
                <Field label="Payment Terms" value={paymentTerms} onChange={setPaymentTerms} type="textarea" rows={4} readOnly={!isInEditMode} />
                <Field label="Penalty Clause" value={penaltyClause} onChange={setPenaltyClause} type="textarea" rows={4} readOnly={!isInEditMode} />
              </div>
            </section>

            {/* 4. Technical Specifications */}
            <section>
              <SectionHeader num={4} title="Technical Specifications" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                <Field label="SSR Reference" value={ssrReference} onChange={setSsrReference} readOnly={!isInEditMode} />
                <Field label="DSR Reference" value={dsrReference} onChange={setDsrReference} readOnly={!isInEditMode} />
              </div>
              <div className="space-y-5">
                <Field label="Special Conditions" value={specialConditions} onChange={setSpecialConditions} type="textarea" rows={3} readOnly={!isInEditMode} />
                <Field label="Quality Standards" value={qualityStandards} onChange={setQualityStandards} type="textarea" rows={3} readOnly={!isInEditMode} />
              </div>
            </section>

          </div>
        )}
      </div>

      {/* Section 5: Supporting Documents */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-700 pb-3 mb-5">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">5</span>
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Supporting Documents</h3>
          <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 uppercase tracking-wide">
            {dtpDocs.length} file{dtpDocs.length !== 1 ? "s" : ""} attached
          </span>
        </div>

        {/* Drop zone */}
        {isInEditMode && (
          <div
            onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); setDragActive(false); addFiles(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-4 ${
              dragActive
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/40"
            }`}
          >
            <Upload className={`w-8 h-8 mx-auto mb-2 ${dragActive ? "text-blue-500" : "text-gray-400"}`} />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {dragActive ? "Drop files here" : "Click or drag & drop to attach documents"}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">PDF, DOCX, XLSX, JPG, PNG — max 20 MB each</p>
            <input ref={fileInputRef} type="file" multiple className="sr-only"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          </div>
        )}

        {/* File list */}
        {dtpDocs.length > 0 ? (
          <div className="space-y-2">
            {dtpDocs.map((doc) => (
              <div key={doc.id}
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                <Paperclip className="w-4 h-4 text-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{doc.name}</p>
                  {doc.size > 0 && <p className="text-xs text-gray-400">{fmtBytes(doc.size)}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {doc.url && (
                    <>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                        <Eye className="w-4 h-4" />
                      </a>
                      <a href={doc.url} download={doc.name}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                        <Download className="w-4 h-4" />
                      </a>
                    </>
                  )}
                  {isInEditMode && (
                    <button onClick={() => removeDoc(doc.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          !isInEditMode && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No documents attached.</p>
          )
        )}
      </div>

      {/* Remarks (DE/EE always shown; SE shown for context if dtpData has remarks) */}
      {(isDE || isEE || (isSE && project.dtpData?.remarks)) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
            <MessageSquare className="w-4 h-4 text-gray-400" />
            {isSE ? "Previous Remarks" : "Remarks"}
            {(isDE || isEE) && <span className="text-xs font-normal text-gray-400 ml-1">(required when returning)</span>}
          </label>
          {isSE ? (
            <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/40 rounded-lg p-3">
              {project.dtpData?.remarks || "—"}
            </p>
          ) : (
            <>
              <textarea
                rows={4}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add remarks or observations..."
                className={`${fieldBase} resize-none`}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 text-right mt-1">{remarks.length} chars</p>
            </>
          )}
        </div>
      )}

      {/* Read-only note for DE/EE */}
      {(isDE || isEE) && (
        <div className="flex gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Viewing in <strong>read-only</strong> mode. Use the action buttons below to verify and forward, or return for corrections with remarks.
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        <div className="flex flex-wrap gap-3">

          {isSE && (
            <>
              <button onClick={handleSaveDraft} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors disabled:opacity-60">
                <Save className="w-4 h-4" /> Save Draft
              </button>
              <button onClick={handleSubmit} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                Submit DTP for Verification
              </button>
            </>
          )}

          {isDE && (
            <>
              <button onClick={handleDEForward} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Verify &amp; Forward to EE
              </button>
              <button onClick={() => handleReturn("Sectional Engineer")} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors disabled:opacity-60">
                {saving ? <span className="w-4 h-4 border-2 border-red-400/40 border-t-red-500 rounded-full animate-spin" /> : <XCircle className="w-4 h-4" />}
                Return to SE
              </button>
            </>
          )}

          {isEE && (
            <>
              <button onClick={handleEEApprove} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Approve DTP
              </button>
              <button onClick={() => handleReturn("Deputy Engineer")} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors disabled:opacity-60">
                {saving ? <span className="w-4 h-4 border-2 border-red-400/40 border-t-red-500 rounded-full animate-spin" /> : <XCircle className="w-4 h-4" />}
                Return to DE
              </button>
            </>
          )}

          {!isSE && !isDE && !isEE && (
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Info className="w-4 h-4" /> No actions available for your role on this page.
            </p>
          )}
        </div>

        {/* tender fee / EMD footer note */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
          <span>EMD: <strong className="text-gray-600 dark:text-gray-300">{formatINR(emdAmount)}</strong> (2% of estimate)</span>
          <span>Tender Fee: <strong className="text-gray-600 dark:text-gray-300">{formatINR(tenderFee)}</strong></span>
          <span>Class: <strong className="text-gray-600 dark:text-gray-300">{contractorClass}</strong></span>
          <span>Documents attached: <strong className="text-gray-600 dark:text-gray-300">{dtpDocs.length}</strong></span>
        </div>
      </div>

    </div>
  );
}
