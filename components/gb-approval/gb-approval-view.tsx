"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Upload,
  Send,
  AlertCircle,
  CheckCircle2,
  FileText,
  Trash2,
  Paperclip,
  ChevronDown,
  Building2,
  Percent,
  Eye,
  Download,
} from "lucide-react";
import { store } from "@/store/iims.store";
import type { IProject, IGBApprovalData, IDocument } from "@/types/iims.types";
import { StatusBadge, formatINR } from "@/components/dashboard/dash-shared";

const MAX_SIZE = 20 * 1024 * 1024;

type FileSlot = { id: string; name: string; url: string } | null;

function FileUploadZone({
  label,
  hint,
  value,
  onChange,
  disabled,
  required,
  error,
}: {
  label: string;
  hint?: string;
  value: FileSlot;
  onChange: (slot: FileSlot) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  function pick(file: File) {
    const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
    if (![".pdf", ".jpg", ".jpeg", ".png"].includes(ext)) { toast.error("Invalid file type. Allowed types: PDF, JPG, PNG"); return; }
    if (file.size > MAX_SIZE) { toast.error("File exceeds 20 MB."); return; }
    if (value?.url.startsWith("blob:")) URL.revokeObjectURL(value.url);
    onChange({ id: `DOC${Date.now()}`, name: file.name, url: URL.createObjectURL(file) });
  }

  function remove() {
    if (value?.url.startsWith("blob:")) URL.revokeObjectURL(value.url);
    onChange(null);
  }

  return (
    <div>
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-1.5">
        <FileText className="w-4 h-4 text-blue-500" />
        {label}
        {required && <span className="text-red-500">*</span>}
      </p>
      {hint && <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">{hint}</p>}

      {!value && !disabled && (
        <div
          onDragEnter={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDrag(false); }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) pick(f); }}
          onClick={() => ref.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            drag
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : error
              ? "border-red-400 bg-red-50/40 dark:bg-red-900/10 hover:border-red-500"
              : "border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/40"
          }`}
        >
          <Upload className={`w-7 h-7 mx-auto mb-2 ${drag ? "text-blue-500" : error ? "text-red-400" : "text-gray-400"}`} />
          <p className={`text-sm ${error ? "text-red-500 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}`}>
            {drag ? "Drop file here" : "Click or drag to upload"}
          </p>
          <p className="text-xs text-gray-400 mt-1">PDF, JPG — max 20 MB</p>
          <input
            ref={ref}
            type="file"
            className="sr-only"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = ""; }}
          />
        </div>
      )}

      {value && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
          <Paperclip className="w-4 h-4 text-green-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{value.name}</p>
            <p className="text-xs text-green-600 dark:text-green-400">Uploaded</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <a
              href={value.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              title="View"
            >
              <Eye className="w-4 h-4" />
            </a>
            <a
              href={value.url}
              download={value.name}
              className="p-1.5 rounded text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </a>
            {!disabled && (
              <button
                onClick={remove}
                className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {!value && disabled && (
        <p className="text-sm text-gray-400 italic py-3">No document uploaded.</p>
      )}

      {error && <p className="text-xs text-red-500 dark:text-red-400 mt-1.5">{error}</p>}
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function GBApprovalView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project, setProject] = useState<IProject | null>(null);
  const [saving, setSaving] = useState(false);

  const [selectedContractor, setSelectedContractor] = useState("");
  const [contractorSearch, setContractorSearch] = useState("");
  const [contractorDropOpen, setContractorDropOpen] = useState(false);
  const registeredContractors = store.getAllContractors().filter((c) => c.status === "Active");
  const [pctType, setPctType]   = useState<"Above" | "Below" | "Equal">("Below");
  const [percentage, setPercentage] = useState<string>("");
  const [gbResDoc, setGbResDoc]     = useState<FileSlot>(null);
  const [approvalLetterDoc, setApprovalLetterDoc] = useState<FileSlot>(null);
  const [remarks, setRemarks] = useState("");

  type FormErrors = {
    contractor?: string;
    percentage?: string;
    gbResDoc?: string;
    approvalLetterDoc?: string;
    remarks?: string;
  };
  const [errors, setErrors] = useState<FormErrors>({});

  function clearError(field: keyof FormErrors) {
    setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  }

  function validate(): boolean {
    const e: FormErrors = {};
    if (!selectedContractor.trim()) {
      e.contractor = "L1 Contractor is required.";
    }
    if (pctType !== "Equal") {
      const n = parseFloat(percentage);
      if (percentage.trim() === "" || isNaN(n) || n < 0) {
        e.percentage = "Enter a valid percentage (must be 0 or more).";
      }
    }
    if (!gbResDoc) {
      e.gbResDoc = "GB Resolution Copy is required.";
    }
    if (!approvalLetterDoc) {
      e.approvalLetterDoc = "Approval Letter is required.";
    }
    if (!remarks.trim()) {
      e.remarks = "Remarks are required.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const load = useCallback(() => {
    const p = store.getProjectById(projectId);
    setProject(p);
    if (!p) return;
    if (p.tenderData?.gbApproval) {
      const gb = p.tenderData.gbApproval;
      setSelectedContractor(gb.l1Contractor);
      setPctType(gb.percentageType);
      setPercentage(String(gb.aboveBelowPercentage));
      setRemarks(gb.remarks ?? "");
      if (gb.gbResolutionDoc) {
        setGbResDoc({ id: gb.gbResolutionDoc.id, name: gb.gbResolutionDoc.name, url: gb.gbResolutionDoc.url ?? "" });
      }
      if (gb.approvalLetterDoc) {
        setApprovalLetterDoc({ id: gb.approvalLetterDoc.id, name: gb.approvalLetterDoc.name, url: gb.approvalLetterDoc.url ?? "" });
      }
    } else {
      // Pre-fill from Financial Bid L1 — TC can correct before saving
      const l1 = p.tenderData?.financialBid?.l1Bidder;
      if (l1) {
        setSelectedContractor(l1.name);
        const qp = l1.quotedPercentage ?? 0;
        if (qp === 0) {
          setPctType("Equal");
          setPercentage("0");
        } else if (qp > 0) {
          setPctType("Above");
          setPercentage(String(Math.abs(qp).toFixed(2)));
        } else {
          setPctType("Below");
          setPercentage(String(Math.abs(qp).toFixed(2)));
        }
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

  const tenderData = project.tenderData;
  const qualifiedBidders = tenderData?.financialBid?.qualifiedBidders ?? [];
  const existing = tenderData?.gbApproval;
  const currentUser = store.getCurrentUser();
  const isTenderClerk = currentUser?.role === "Tender Clerk";
  const isSubmitted = project.status !== "Pending GB Approval";

  function buildDoc(slot: FileSlot): IDocument | undefined {
    if (!slot) return undefined;
    return {
      id: slot.id, name: slot.name, type: "application/pdf",
      url: slot.url, uploadedAt: new Date().toISOString(),
      uploadedBy: currentUser?.name ?? "Unknown",
    };
  }

  async function handleSubmit() {
    if (!project || !tenderData) return;
    if (!validate()) return;
    const pctValue = pctType === "Equal" ? 0 : parseFloat(percentage);

    setSaving(true);
    try {
      const gbApprovalData: IGBApprovalData = {
        l1Contractor: selectedContractor.trim(),
        aboveBelowPercentage: pctValue,
        percentageType: pctType,
        gbResolutionDoc: buildDoc(gbResDoc),
        approvalLetterDoc: buildDoc(approvalLetterDoc),
        remarks: remarks.trim() || undefined,
        submittedBy: currentUser?.name,
        submittedAt: new Date().toISOString(),
      };

      store.updateProject(project.id, {
        tenderData: { ...tenderData, gbApproval: gbApprovalData },
      });

      const pctLabel = pctType === "Equal"
        ? "at estimated cost"
        : `${pctValue.toFixed(2)}% ${pctType.toLowerCase()} estimated cost`;

      const result = store.forwardProject(
        project.id,
        "Tender Clerk",
        `GB Approval recorded. L1: ${selectedContractor.trim()} at ${pctLabel}. Proceeding to LOI preparation.`,
        "Financial Bid Approved"
      );

      if (!result.ok) { toast.error(result.error); return; }

      toast.success("GB Approval submitted. LOI preparation stage is now open.");
      router.push(`/project/${project.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href={`/project/${project.id}`}
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors mt-0.5 shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">GB Approval</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">{project.projectName}</p>
        </div>
        <div className="shrink-0">
          <StatusBadge status={project.status} />
        </div>
      </div>

      {/* Info banner */}
      <div className="flex gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Governing Body Approval</p>
          <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
            GB approval happens offline. Record the outcome here by uploading the GB Resolution Copy and
            Approval Letter, selecting the confirmed L1 Contractor, and entering the approved percentage.
            After submission, status will change to <strong>Financial Bid Approved</strong> and LOI
            preparation will become available.
          </p>
        </div>
      </div>

      {/* Already submitted banner */}
      {isSubmitted && existing && (
        <div className="flex gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-800 dark:text-green-300">GB Approval Already Recorded</p>
            <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
              L1: <strong>{existing.l1Contractor}</strong> —{" "}
              <strong>
                {existing.percentageType === "Equal"
                  ? "at estimated cost"
                  : `${existing.aboveBelowPercentage.toFixed(2)}% ${existing.percentageType}`}
              </strong>
              . Submitted by {existing.submittedBy}.
              {existing.remarks && <span className="block mt-0.5">Remarks: {existing.remarks}</span>}
            </p>
          </div>
        </div>
      )}

      {/* Form card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-700/30">
          <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">GB Approval Details</h3>
        </div>

        <div className="p-6 space-y-6">

          {/* Sanctioned Amount — auto-fetched from DTP, frozen */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600">
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1">Technical Sanction Amount</p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
                {formatINR(project.technicalSanctionAmount ?? project.estimatedAmount ?? 0)}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Locked after DTP approval</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1">Estimate Amount</p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
                {formatINR(project.estimatedAmount ?? 0)}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Original work estimate</p>
            </div>
          </div>

          {/* L1 Contractor */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              L1 Contractor <span className="text-red-500">*</span>
            </label>
            {isSubmitted || !isTenderClerk ? (
              <div className={`w-full rounded-lg border border-gray-200 dark:border-gray-600 text-sm px-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400`}>
                {selectedContractor || "—"}
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={contractorSearch || selectedContractor}
                  onChange={(e) => {
                    setContractorSearch(e.target.value);
                    setContractorDropOpen(true);
                    if (!e.target.value) setSelectedContractor("");
                    clearError("contractor");
                  }}
                  onFocus={() => setContractorDropOpen(true)}
                  placeholder="Search contractor by name, firm or ID…"
                  className={`w-full rounded-lg border text-sm px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 transition bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 ${
                    errors.contractor
                      ? "border-red-400 focus:ring-red-400/40 focus:border-red-400"
                      : "border-gray-200 dark:border-gray-600 focus:ring-blue-500/40 focus:border-blue-500"
                  }`}
                />
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                {contractorDropOpen && (
                  <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto">
                    {registeredContractors
                      .filter((c) => {
                        const q = (contractorSearch || "").toLowerCase();
                        return !q || c.name.toLowerCase().includes(q) || c.firmName.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
                      })
                      .map((c) => {
                        const label = `${c.id} – ${c.firmName}`;
                        return (
                          <button key={c.id} type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setSelectedContractor(label);
                              setContractorSearch("");
                              setContractorDropOpen(false);
                              clearError("contractor");
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-50 dark:border-gray-700/50 last:border-0 ${selectedContractor === label ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium" : "text-gray-700 dark:text-gray-300"}`}>
                            <p className="font-medium">{c.id} – {c.firmName}</p>
                            <p className="text-xs text-gray-400">Contact: {c.name} · {c.registration?.registrationClass ?? ""}</p>
                          </button>
                        );
                      })}
                    {registeredContractors.filter((c) => { const q = (contractorSearch || "").toLowerCase(); return !q || c.name.toLowerCase().includes(q) || c.firmName.toLowerCase().includes(q) || c.id.toLowerCase().includes(q); }).length === 0 && (
                      <p className="px-4 py-3 text-sm text-gray-400">No contractors found.</p>
                    )}
                  </div>
                )}
              </div>
            )}
            {selectedContractor && !isSubmitted && isTenderClerk && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">Selected: {selectedContractor}</p>
            )}
            {errors.contractor && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.contractor}</p>}
          </div>

          {/* Above/Below Percentage */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Approved Percentage <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden shrink-0">
                {(["Below", "Equal", "Above"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    disabled={!isTenderClerk || isSubmitted}
                    onClick={() => { setPctType(t); if (t === "Equal") setPercentage("0"); clearError("percentage"); }}
                    className={`px-3 py-2.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
                      pctType === t
                        ? t === "Below"
                          ? "bg-green-600 text-white"
                          : t === "Above"
                          ? "bg-red-500 text-white"
                          : "bg-gray-600 text-white"
                        : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="relative flex-1">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={percentage}
                  onChange={(e) => { setPercentage(e.target.value); clearError("percentage"); }}
                  disabled={!isTenderClerk || isSubmitted || pctType === "Equal"}
                  placeholder="0.00"
                  className={`w-full rounded-lg border text-sm px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 transition ${
                    !isTenderClerk || isSubmitted || pctType === "Equal"
                      ? "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 cursor-default focus:ring-blue-500/40 focus:border-blue-500"
                      : errors.percentage
                      ? "border-red-400 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-red-400/40 focus:border-red-400"
                      : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-blue-500/40 focus:border-blue-500"
                  }`}
                />
                <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              </div>
            </div>
            {pctType !== "Equal" && percentage && !isNaN(parseFloat(percentage)) && !errors.percentage && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                Contract value:{" "}
                <strong>
                  {parseFloat(percentage).toFixed(2)}%{" "}
                  {pctType.toLowerCase()} the estimated cost
                </strong>
              </p>
            )}
            {errors.percentage && <p className="text-xs text-red-500 dark:text-red-400 mt-1.5">{errors.percentage}</p>}
          </div>

          {/* Document uploads */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <FileUploadZone
              label="GB Resolution Copy"
              hint="Upload the resolution passed by the Governing Body"
              value={gbResDoc}
              onChange={(slot) => { setGbResDoc(slot); if (slot) clearError("gbResDoc"); }}
              disabled={!isTenderClerk || isSubmitted}
              required
              error={errors.gbResDoc}
            />
            <FileUploadZone
              label="Approval Letter"
              hint="Upload the official approval letter"
              value={approvalLetterDoc}
              onChange={(slot) => { setApprovalLetterDoc(slot); if (slot) clearError("approvalLetterDoc"); }}
              disabled={!isTenderClerk || isSubmitted}
              required
              error={errors.approvalLetterDoc}
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Remarks {isTenderClerk && !isSubmitted && <span className="text-red-500">*</span>}
            </label>
            {!isTenderClerk || isSubmitted ? (
              <p className={`w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-600 dark:text-gray-300 px-3 py-2.5 min-h-[80px] ${!remarks ? "italic text-gray-400" : ""}`}>
                {remarks || "No remarks entered."}
              </p>
            ) : (
              <>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => { setRemarks(e.target.value); clearError("remarks"); }}
                  placeholder="Enter any additional remarks or observations about the GB Approval…"
                  className={`w-full rounded-lg border text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 transition resize-none ${
                    errors.remarks
                      ? "border-red-400 bg-white dark:bg-gray-700 focus:ring-red-400/40 focus:border-red-400"
                      : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-blue-500/40 focus:border-blue-500"
                  }`}
                />
                {errors.remarks && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.remarks}</p>}
              </>
            )}
          </div>

        </div>
      </div>

      {/* Action bar */}
      {isTenderClerk && !isSubmitted && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/project/${project.id}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {saving
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <Send className="w-4 h-4" />}
              Submit GB Approval
            </button>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
            After submission, project status will change to <strong>Financial Bid Approved</strong> and LOI preparation will be available.
          </p>
        </div>
      )}

    </div>
  );
}
