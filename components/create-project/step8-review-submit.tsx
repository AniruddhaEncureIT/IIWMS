"use client";

import { Eye, CheckCircle2, Download, FileText, Image, BarChart2 } from "lucide-react";
import type { WizardState, UploadedFile } from "./wizard-types";
import { AUTO_GENERATED_DOCS } from "./wizard-types";
import type { ICharge } from "@/types/iims.types";

interface Props {
  state: WizardState;
  activeCharges: ICharge[];
  onVerificationChange: (checked: boolean) => void;
  errors?: Record<string, string>;
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-0.5">{value}</dd>
    </div>
  );
}

function ReviewSection({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3 bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
        <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[11px] font-bold flex items-center justify-center shrink-0">
          {num}
        </span>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

const thCls = "px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap";
const tdCls = "px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300";
const tdNumCls = "px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400 text-right";

// ── Uploaded-files category row ───────────────────────────────────────────────

interface FileCategoryProps {
  label: string;
  files: UploadedFile[];
  Icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}

function FileCategory({ label, files, Icon, iconColor, iconBg }: FileCategoryProps) {
  if (files.length === 0) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <ul className="space-y-1.5">
        {files.map((file) => (
          <li key={file.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
            <div className={`w-7 h-7 rounded-md ${iconBg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-3.5 h-3.5 ${iconColor}`} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{file.name}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <a href={file.url} target="_blank" rel="noopener noreferrer"
                className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                title="Preview" aria-label={`Preview ${file.name}`}>
                <Eye className="w-4 h-4" aria-hidden="true" />
              </a>
              <a href={file.url} download={file.name}
                className="p-1.5 rounded-md text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                title="Download" aria-label={`Download ${file.name}`}>
                <Download className="w-4 h-4" aria-hidden="true" />
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Step 8 ───────────────────────────────────────────────────────────────────

export function Step8ReviewSubmit({ state, activeCharges, onVerificationChange, errors }: Props) {
  const { basicDetails: b, subWorks, leadStatements, rateAnalysis, measurements, generalDescription, documentSets, verificationChecked } = state;

  const workPortionAmount = measurements.reduce((s, m) => s + (m.amount || 0), 0);
  const chargeAmounts = activeCharges.map((c) => ({ ...c, amount: (workPortionAmount * c.percentage) / 100 }));
  const totalCharges = chargeAmounts.reduce((s, c) => s + c.amount, 0);
  const technicalSanctionAmount = workPortionAmount + totalCharges;

  const totalUploadedFiles = (documentSets?.drawings?.length ?? 0) + (documentSets?.sitePhotos?.length ?? 0) + (documentSets?.surveyReports?.length ?? 0);

  return (
    <div className="space-y-5">
      {/* Step header */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center text-white shrink-0 mt-0.5" aria-hidden="true">
          <CheckCircle2 className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Review &amp; Submit</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Review all entered information before submitting for verification.</p>
        </div>
      </div>

      {/* 1. Project Information */}
      <ReviewSection num={1} title="Project Information">
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Row label="Work Name" value={b.projectName} />
          <Row label="Sanction Year" value={b.sanctionYear} />
          <Row label="Department" value={b.departmentName} />
          <Row label="Major Head" value={b.majorHeadName} />
          <Row label="Major Head Code" value={b.majorHeadCode} />
          <Row label="Division" value={b.division} />
          <Row label="Sub Division" value={b.subDivision} />
          <Row label="Taluka" value={b.taluka} />
          <Row label="Gram Panchayat" value={b.gramPanchayat} />
          <Row label="SSR Type" value={b.ssrType} />
          <Row label="SSR Year" value={b.ssrYear} />
          {b.dsrType && <Row label="DSR Type" value={b.dsrType} />}
          <Row label="Work Activity" value={b.workActivity} />
          <Row label="Work Demand By" value={b.workDemandBy} />
        </dl>
        {b.workDemandByDocumentFile && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Work Demand By Document</p>
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{b.workDemandByDocumentFile.name}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (b.workDemandByDocumentFile) {
                    const link = document.createElement("a");
                    link.href = b.workDemandByDocumentFile.url;
                    link.download = b.workDemandByDocumentFile.name;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }
                }}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg text-blue-600 dark:text-blue-400 transition-colors flex-shrink-0"
                aria-label="Download document"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </ReviewSection>

      {/* 2. Sub Works */}
      {subWorks.length > 0 && (
        <ReviewSection num={2} title="Sub Works">
          <ol className="space-y-1.5 list-decimal list-inside">
            {subWorks.map((sw) => (
              <li key={sw.id} className="text-sm text-gray-700 dark:text-gray-300">{sw.name || "(Unnamed)"}</li>
            ))}
          </ol>
        </ReviewSection>
      )}

      {/* 3. Lead Statements */}
      {leadStatements.length > 0 && (
        <ReviewSection num={3} title="Lead Statements">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className={thCls}>#</th>
                  <th className={thCls}>Material</th>
                  <th className={thCls}>Source</th>
                  <th className={`${thCls} text-right`}>Km</th>
                  <th className={`${thCls} text-right`}>Calculation (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {leadStatements.map((ls, i) => (
                  <tr key={ls.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className={tdCls}>{i + 1}</td>
                    <td className={tdCls}>{ls.materialName}</td>
                    <td className={tdCls}>{ls.sourceOfSupply}</td>
                    <td className={tdNumCls}>{ls.kilometer}</td>
                    <td className={`${tdNumCls} font-semibold text-gray-800 dark:text-gray-200`}>₹{ls.calculation.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ReviewSection>
      )}

      {/* 4. Rate Analysis */}
      {rateAnalysis.length > 0 && (
        <ReviewSection num={4} title="Rate Analysis">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 dark:border-gray-700">
                <tr>
                  {["Item #", "Description", "Material", "Labor", "Machinery", "Base", "Total"].map((h) => (
                    <th key={h} className={thCls}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {rateAnalysis.map((ra) => (
                  <tr key={ra.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className={tdCls}>{ra.itemNumber}</td>
                    <td className={`${tdCls} max-w-[180px] truncate`}>{ra.itemDescription}</td>
                    <td className={tdNumCls}>₹{ra.materialComponents.toLocaleString("en-IN")}</td>
                    <td className={tdNumCls}>₹{ra.laborComponents.toLocaleString("en-IN")}</td>
                    <td className={tdNumCls}>₹{ra.machineryComponents.toLocaleString("en-IN")}</td>
                    <td className={tdNumCls}>₹{ra.baseRate.toLocaleString("en-IN")}</td>
                    <td className={`${tdNumCls} font-semibold text-gray-800 dark:text-gray-200`}>₹{ra.totalRate.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ReviewSection>
      )}

      {/* 5. Measurement Sheet */}
      {measurements.length > 0 && (
        <ReviewSection num={5} title="Measurement Sheet">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 dark:border-gray-700">
                <tr>
                  {["Item #", "Name", "L", "B", "H", "Qty", "Unit", "Rate (₹)", "Amount (₹)"].map((h) => (
                    <th key={h} className={thCls}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {measurements.map((ms) => (
                  <tr key={ms.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className={tdCls}>{ms.itemNumber}</td>
                    <td className={`${tdCls} max-w-[160px] truncate`}>{ms.itemName}</td>
                    <td className={tdNumCls}>{ms.length}</td>
                    <td className={tdNumCls}>{ms.breadth}</td>
                    <td className={tdNumCls}>{ms.height}</td>
                    <td className={tdNumCls}>{ms.quantity.toFixed(3)}</td>
                    <td className={tdCls}>{ms.unit}</td>
                    <td className={tdNumCls}>₹{ms.rate.toLocaleString("en-IN")}</td>
                    <td className={`${tdNumCls} font-semibold text-gray-800 dark:text-gray-200`}>₹{ms.amount.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ReviewSection>
      )}

      {/* 6. Financial Summary */}
      <ReviewSection num={6} title="Financial Summary">
        <div className="space-y-0 divide-y divide-gray-100 dark:divide-gray-700/50">
          <div className="flex justify-between py-2.5">
            <span className="text-sm text-gray-700 dark:text-gray-300">Work Portion Amount</span>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">₹{workPortionAmount.toLocaleString("en-IN")}</span>
          </div>
          {chargeAmounts.map((c) => (
            <div key={c.id} className="flex justify-between py-2.5">
              <span className="text-sm text-gray-600 dark:text-gray-400">{c.type} ({c.percentage}%)</span>
              <span className="text-sm text-gray-700 dark:text-gray-300">₹{c.amount.toLocaleString("en-IN")}</span>
            </div>
          ))}
          <div className="flex justify-between py-3 mt-1">
            <span className="text-base font-bold text-gray-900 dark:text-gray-100">Technical Sanction Amount</span>
            <span className="text-xl font-bold text-green-600 dark:text-green-400">₹{technicalSanctionAmount.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </ReviewSection>

      {/* 7. General Description */}
      {(generalDescription.technicalNotes || generalDescription.siteConditions || generalDescription.specialClauses) && (
        <ReviewSection num={7} title="General Description">
          <div className="space-y-4">
            {generalDescription.technicalNotes && (
              <div>
                <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Technical Notes</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{generalDescription.technicalNotes}</p>
              </div>
            )}
            {generalDescription.siteConditions && (
              <div>
                <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Site Conditions</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{generalDescription.siteConditions}</p>
              </div>
            )}
            {generalDescription.specialClauses && (
              <div>
                <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Special Clauses</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{generalDescription.specialClauses}</p>
              </div>
            )}
          </div>
        </ReviewSection>
      )}

      {/* 8. Auto-Generated Documents */}
      <ReviewSection num={8} title="Auto-Generated Documents">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          The following documents are automatically generated by the system upon submission.
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {AUTO_GENERATED_DOCS.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" aria-hidden="true" />
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate">{doc.name}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button"
                  className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  title={`Preview ${doc.name}`} aria-label={`Preview ${doc.name}`}>
                  <Eye className="w-4 h-4" aria-hidden="true" />
                </button>
                <button type="button"
                  className="p-1.5 rounded-md text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                  title={`Download ${doc.name}`} aria-label={`Download ${doc.name}`}>
                  <Download className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </ReviewSection>

      {/* 9. Uploaded Documents */}
      {totalUploadedFiles > 0 && (
        <ReviewSection num={9} title="Uploaded Documents">
          <div className="space-y-5">
            <FileCategory
              label="Drawings"
              files={documentSets?.drawings ?? []}
              Icon={FileText}
              iconColor="text-blue-500"
              iconBg="bg-blue-50 dark:bg-blue-900/30"
            />
            <FileCategory
              label="Site Photos"
              files={documentSets?.sitePhotos ?? []}
              Icon={Image}
              iconColor="text-green-500"
              iconBg="bg-green-50 dark:bg-green-900/30"
            />
            <FileCategory
              label="Survey Reports"
              files={documentSets?.surveyReports ?? []}
              Icon={BarChart2}
              iconColor="text-purple-500"
              iconBg="bg-purple-50 dark:bg-purple-900/30"
            />
          </div>
        </ReviewSection>
      )}

      {/* Verification checkbox */}
      <div className={`rounded-xl border p-4 ${errors?.verificationChecked ? "border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-900/10" : "border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20"}`}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={verificationChecked}
            onChange={(e) => onVerificationChange(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500/40 transition-colors"
            aria-invalid={!!errors?.verificationChecked}
          />
          <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            I verify that all information provided is accurate and complete to the best of my knowledge.
            This estimate has been prepared as per the applicable SSR/DSR and site conditions.
          </span>
        </label>
        {errors?.verificationChecked && (
          <p className="mt-2 ml-7 text-xs text-red-600 dark:text-red-400" role="alert">
            {errors.verificationChecked}
          </p>
        )}
      </div>
    </div>
  );
}
