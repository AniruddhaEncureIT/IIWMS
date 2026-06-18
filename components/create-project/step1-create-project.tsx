"use client";

import { useRef } from "react";
import { Upload, FileText, X } from "lucide-react";
import type { BasicDetails, WizardState } from "./wizard-types";
import { MAJOR_HEAD_CODES } from "./wizard-types";
import { AIUploadPanel } from "./ai-upload-panel";

interface Props {
  data: BasicDetails;
  onChange: (patch: Partial<BasicDetails>) => void;
  uploadedFileName: string;
  isAutoFilled: boolean;
  onFill: (patch: Partial<WizardState>) => void;
  onReset: () => void;
  errors?: Record<string, string>;
}

const lbl = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5";
const input =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 text-sm transition-colors";
const inputErr =
  "w-full px-3 py-2 border border-red-500 dark:border-red-400 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 text-sm transition-colors";
const readonlyCls =
  "w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 text-sm cursor-not-allowed";

const sectionLabel = "text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2";
const sectionDiv = "rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40 p-4 space-y-4";

function ErrMsg({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">{msg}</p>;
}

export function Step1CreateProject({ data, onChange, uploadedFileName, isAutoFilled, onFill, onReset, errors }: Props) {
  const demandDocRef = useRef<HTMLInputElement>(null);

  function handleMajorHead(name: string) {
    onChange({ majorHeadName: name, majorHeadCode: MAJOR_HEAD_CODES[name] ?? "" });
  }

  function handleDemandDoc(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      const url = URL.createObjectURL(f);
      onChange({
        workDemandByDocumentName: f.name,
        workDemandByDocumentFile: {
          id: `doc-${Date.now()}`,
          name: f.name,
          type: f.type,
          url: url,
        }
      });
    }
    e.target.value = "";
  }

  // Returns className + aria-invalid for a required field
  const fc  = (key: string) => (errors?.[key] ? inputErr : input);
  const inv = (key: string): boolean => !!errors?.[key];

  return (
    <div className="space-y-6">
      {/* Step header */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0 mt-0.5" aria-hidden="true">1</div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Create Project</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Enter basic project details or upload a specification file for AI-assisted auto-fill.
          </p>
        </div>
      </div>

      {/* AI Upload Panel */}
      <AIUploadPanel
        uploadedFileName={uploadedFileName}
        isAutoFilled={isAutoFilled}
        onFill={onFill}
        onReset={onReset}
      />

      {/* ── Section A: Work Details ──────────────────────────────────── */}
      <div className={sectionDiv}>
        <p className={sectionLabel}>
          <span className="w-5 h-px bg-gray-300 dark:bg-gray-600 inline-block" />
          Work Details
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={lbl}>Work Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              className={fc("projectName")}
              placeholder="Enter project / work name"
              value={data.projectName}
              onChange={(e) => onChange({ projectName: e.target.value })}
              aria-invalid={inv("projectName")}
              aria-describedby={inv("projectName") ? "err-projectName" : undefined}
            />
            <ErrMsg msg={errors?.projectName} />
          </div>

          <div>
            <label className={lbl}>Sanction Year <span className="text-red-500">*</span></label>
            <select
              className={fc("sanctionYear")}
              value={data.sanctionYear}
              onChange={(e) => onChange({ sanctionYear: e.target.value })}
              aria-invalid={inv("sanctionYear")}
            >
              <option value="">Select year</option>
              {["2025-2026", "2024-2025", "2023-2024"].map((y) => <option key={y}>{y}</option>)}
            </select>
            <ErrMsg msg={errors?.sanctionYear} />
          </div>

          <div>
            <label className={lbl}>Department Name <span className="text-red-500">*</span></label>
            <select
              className={fc("departmentName")}
              value={data.departmentName}
              onChange={(e) => onChange({ departmentName: e.target.value })}
              aria-invalid={inv("departmentName")}
            >
              <option value="">Select department</option>
              {["Works", "Electrical", "Water Conservation"].map((d) => <option key={d}>{d}</option>)}
            </select>
            <ErrMsg msg={errors?.departmentName} />
          </div>

          <div>
            <label className={lbl}>Major Head <span className="text-red-500">*</span></label>
            <select
              className={fc("majorHeadName")}
              value={data.majorHeadName}
              onChange={(e) => handleMajorHead(e.target.value)}
              aria-invalid={inv("majorHeadName")}
            >
              <option value="">Select major head</option>
              {Object.keys(MAJOR_HEAD_CODES).map((h) => <option key={h}>{h}</option>)}
            </select>
            <ErrMsg msg={errors?.majorHeadName} />
          </div>

          <div>
            <label className={lbl}>Major Head Number</label>
            <input type="text" className={readonlyCls} readOnly value={data.majorHeadCode} placeholder="Auto-populated" />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Populated automatically from Major Head selection</p>
          </div>
        </div>
      </div>

      {/* ── Section B: Location ──────────────────────────────────────── */}
      <div className={sectionDiv}>
        <p className={sectionLabel}>
          <span className="w-5 h-px bg-gray-300 dark:bg-gray-600 inline-block" />
          Location
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Division <span className="text-red-500">*</span></label>
            <select
              className={fc("division")}
              value={data.division}
              onChange={(e) => onChange({ division: e.target.value })}
              aria-invalid={inv("division")}
            >
              <option value="">Select division</option>
              {["Pune Division", "Mumbai Division", "Nagpur Division", "Nashik Division"].map((d) => <option key={d}>{d}</option>)}
            </select>
            <ErrMsg msg={errors?.division} />
          </div>

          <div>
            <label className={lbl}>Sub Division <span className="text-red-500">*</span></label>
            <select
              className={fc("subDivision")}
              value={data.subDivision}
              onChange={(e) => onChange({ subDivision: e.target.value })}
              aria-invalid={inv("subDivision")}
            >
              <option value="">Select sub division</option>
              {["Khed Sub Division", "Thane Sub Division", "Maval Sub Division"].map((d) => <option key={d}>{d}</option>)}
            </select>
            <ErrMsg msg={errors?.subDivision} />
          </div>

          <div>
            <label className={lbl}>Taluka <span className="text-red-500">*</span></label>
            <select
              className={fc("taluka")}
              value={data.taluka}
              onChange={(e) => onChange({ taluka: e.target.value })}
              aria-invalid={inv("taluka")}
            >
              <option value="">Select taluka</option>
              {["Khed", "Thane", "Maval", "Pune"].map((t) => <option key={t}>{t}</option>)}
            </select>
            <ErrMsg msg={errors?.taluka} />
          </div>

          <div>
            <label className={lbl}>Gram Panchayat <span className="text-red-500">*</span></label>
            <select
              className={fc("gramPanchayat")}
              value={data.gramPanchayat}
              onChange={(e) => onChange({ gramPanchayat: e.target.value })}
              aria-invalid={inv("gramPanchayat")}
            >
              <option value="">Select gram panchayat</option>
              {["Khed Grampanchayat", "Hadapsar Gram Panchayat", "Shirur Grampanchayat", "Baramati Grampanchayat", "Daund Grampanchayat", "Pune Municipal Corporation"].map((g) => <option key={g}>{g}</option>)}
            </select>
            <ErrMsg msg={errors?.gramPanchayat} />
          </div>
        </div>
      </div>

      {/* ── Section C: Rate & Schedule ───────────────────────────────── */}
      <div className={sectionDiv}>
        <p className={sectionLabel}>
          <span className="w-5 h-px bg-gray-300 dark:bg-gray-600 inline-block" />
          Rate &amp; Schedule
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>SSR – Standard Schedule Rates <span className="text-red-500">*</span></label>
            <select
              className={fc("ssrType")}
              value={data.ssrType}
              onChange={(e) => onChange({ ssrType: e.target.value })}
              aria-invalid={inv("ssrType")}
            >
              <option value="">Select SSR</option>
              {["SSR-PWD", "MJP-ELEC", "CSR-WCD"].map((s) => <option key={s}>{s}</option>)}
            </select>
            <ErrMsg msg={errors?.ssrType} />
          </div>

          <div>
            <label className={lbl}>SSR Year <span className="text-red-500">*</span></label>
            <select
              className={fc("ssrYear")}
              value={data.ssrYear}
              onChange={(e) => onChange({ ssrYear: e.target.value })}
              aria-invalid={inv("ssrYear")}
            >
              <option value="">Select year</option>
              {["2024-2025", "2025-2026", "2026-2027"].map((y) => <option key={y}>{y}</option>)}
            </select>
            <ErrMsg msg={errors?.ssrYear} />
          </div>

          <div>
            <label className={lbl}>District Schedule of Rates (DSR) Type</label>
            <select className={input} value={data.dsrType} onChange={(e) => onChange({ dsrType: e.target.value })}>
              <option value="">Select DSR (optional)</option>
              {["DSR-001", "DSR-002", "DSR-003", "DSR-004"].map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label className={lbl}>Work Activity <span className="text-red-500">*</span></label>
            <select
              className={fc("workActivity")}
              value={data.workActivity}
              onChange={(e) => onChange({ workActivity: e.target.value })}
              aria-invalid={inv("workActivity")}
            >
              <option value="">Select activity</option>
              {["Building Construction", "Road Works", "Bridge Construction", "Water Supply", "Drainage Works"].map((a) => <option key={a}>{a}</option>)}
            </select>
            <ErrMsg msg={errors?.workActivity} />
          </div>
        </div>
      </div>

      {/* ── Section D: Demand Info ───────────────────────────────────── */}
      <div className={sectionDiv}>
        <p className={sectionLabel}>
          <span className="w-5 h-px bg-gray-300 dark:bg-gray-600 inline-block" />
          Demand Info
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Work Demand By <span className="text-red-500">*</span></label>
            <select
              className={fc("workDemandBy")}
              value={data.workDemandBy}
              onChange={(e) => onChange({ workDemandBy: e.target.value })}
              aria-invalid={inv("workDemandBy")}
            >
              <option value="">Select demand source</option>
              {["Gram Panchayat", "Zilla Parishad", "Public Representative", "Government Department", "Local Authority"].map((w) => <option key={w}>{w}</option>)}
            </select>
            <ErrMsg msg={errors?.workDemandBy} />
          </div>

          <div>
            <label className={lbl}>Work Demand By Document</label>
            {data.workDemandByDocumentName ? (
              <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
                <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="flex-1 text-gray-700 dark:text-gray-300 truncate">{data.workDemandByDocumentName}</span>
                <button type="button" onClick={() => onChange({ workDemandByDocumentName: "" })} className="text-red-400 hover:text-red-600 focus-visible:outline-none">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <input ref={demandDocRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleDemandDoc} />
                <button
                  type="button"
                  onClick={() => demandDocRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <Upload className="w-4 h-4" /> Upload PDF/DOC (optional)
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
