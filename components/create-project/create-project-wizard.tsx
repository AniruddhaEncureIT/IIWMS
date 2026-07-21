"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ChevronLeft, ChevronRight, Save, Send, Check, Sparkles } from "lucide-react";
import Link from "next/link";

import { store } from "@/store/iims.store";
import type { ICharge, IDocument } from "@/types/iims.types";

import { Step1CreateProject } from "./step1-create-project";
import { Step2SubWork } from "./step2-sub-work";
import { Step3LeadStatement } from "./step3-lead-statement";
import { Step4RateAnalysis } from "./step4-rate-analysis";
import { Step5Measurement } from "./step5-measurement";
import { Step6GeneralDescription } from "./step6-general-description";
import { Step7UploadDocuments } from "./step7-upload-documents";
import { Step8ReviewSubmit } from "./step8-review-submit";

import type { WizardState, BasicDetails, SubWorkItem, LeadStatementItem, RateItem, MeasurementItem, GeneralDescription, UploadedFile, AppliedCharge, UploadedDocumentSet } from "./wizard-types";
import { STEP_NAMES, BLANK_BASIC, BLANK_DOCUMENT_SET, VALID_SSR_ITEM_NUMBERS } from "./wizard-types";

// ── Initial state ─────────────────────────────────────────────────────────────

function initialState(): WizardState {
  return {
    basicDetails: { ...BLANK_BASIC },
    subWorks: [{ id: "sw-init", name: "" }],
    leadStatements: [
      { id: "ls-init-1", materialName: "Sand", sourceOfSupply: "Local Quarry", kilometer: 15, calculation: 2250 },
      { id: "ls-init-2", materialName: "Cement", sourceOfSupply: "ACC Depot", kilometer: 25, calculation: 3750 },
    ],
    rateAnalysis: [{ id: "ra-init", itemNumber: "", itemDescription: "", materialComponents: 0, laborComponents: 0, machineryComponents: 0, baseRate: 0, totalRate: 0, remarks: "" }],
    measurements: [{ id: "ms-init", itemNumber: "", itemName: "", length: 0, breadth: 0, height: 0, quantity: 0, unit: "Cum", rate: 0, amount: 0 }],
    generalDescription: { technicalNotes: "", siteConditions: "", specialClauses: "" },
    documents: [],
    documentSets: { ...BLANK_DOCUMENT_SET },
    verificationChecked: false,
    isDataAutoFilled: false,
  };
}

// ── Progress Steps ────────────────────────────────────────────────────────────

function ProgressSteps({ current }: { current: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-6 py-5 mb-6 overflow-x-auto">
      {/* Progress bar: thin track at the top */}
      <div className="relative mb-5 h-1 bg-gray-100 dark:bg-gray-700 rounded-full mx-5">
        <div
          className="absolute left-0 top-0 h-full bg-blue-600 rounded-full transition-all duration-500"
          style={{ width: `${((current - 1) / (STEP_NAMES.length - 1)) * 100}%` }}
          aria-hidden="true"
        />
      </div>

      <div className="flex items-start min-w-max">
        {STEP_NAMES.map((name, idx) => {
          const step = idx + 1;
          const done = step < current;
          const active = step === current;
          return (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center">
                {/* Step circle */}
                <div
                  className={[
                    "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                    done
                      ? "bg-green-600 text-white shadow-sm"
                      : active
                      ? "bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/40 shadow-sm"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500",
                  ].join(" ")}
                  aria-label={done ? `Step ${step} complete` : active ? `Step ${step} — current` : `Step ${step}`}
                >
                  {done ? <Check className="w-4 h-4" strokeWidth={2.5} /> : (
                    <span className={active ? "text-white" : ""}>{step}</span>
                  )}
                </div>
                {/* Label */}
                <span
                  className={[
                    "mt-2 text-[11px] font-medium whitespace-nowrap max-w-[72px] text-center leading-tight",
                    done
                      ? "text-green-700 dark:text-green-400"
                      : active
                      ? "text-blue-700 dark:text-blue-400 font-semibold"
                      : "text-gray-400 dark:text-gray-500",
                  ].join(" ")}
                >
                  {name}
                </span>
              </div>
              {/* Connector */}
              {idx < STEP_NAMES.length - 1 && (
                <div
                  className={[
                    "h-px w-8 sm:w-10 mx-1 -mt-5 transition-colors",
                    done ? "bg-green-400 dark:bg-green-700" : "bg-gray-200 dark:bg-gray-700",
                  ].join(" ")}
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step counter pill */}
      <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500 text-right">
        <span className="font-semibold text-gray-600 dark:text-gray-300">Step {current}</span>
        {" "}of {STEP_NAMES.length}
      </p>
    </div>
  );
}

// ── Validation ────────────────────────────────────────────────────────────────
// Returns a map of fieldKey → error message. Empty map means the step is valid.

function validateStep(step: number, state: WizardState): Record<string, string> {
  const errors: Record<string, string> = {};
  const b = state.basicDetails;

  if (step === 1) {
    if (!b.projectName?.trim())     errors.projectName    = "Work Name is required.";
    if (!b.workDescription?.trim()) errors.workDescription = "Work Description is required.";
    if (!b.sanctionYear)         errors.sanctionYear   = "Please select a Sanction Year.";
    if (!b.departmentName)       errors.departmentName = "Please select a Department.";
    if (!b.majorHeadName)        errors.majorHeadName  = "Please select a Major Head.";
    if (!b.division)             errors.division       = "Please select a Division.";
    if (!b.subDivision)          errors.subDivision    = "Please select a Sub Division.";
    if (!b.taluka)               errors.taluka         = "Please select a Taluka.";
    if (!b.gramPanchayat)        errors.gramPanchayat  = "Please select a Gram Panchayat.";
    if (!b.ssrType)              errors.ssrType        = "Please select an SSR.";
    if (!b.ssrYear)              errors.ssrYear        = "Please select an SSR Year.";
    if (!b.workActivity)         errors.workActivity   = "Please select a Work Activity.";
    if (!b.workDemandBy)         errors.workDemandBy   = "Please select a Work Demand By.";
  }

  if (step === 2) {
    for (const sw of state.subWorks) {
      if (!sw.name.trim()) errors[`name_${sw.id}`] = "Sub Work Name is required.";
    }
  }

  if (step === 3) {
    for (const ls of state.leadStatements) {
      if (!ls.materialName)
        errors[`materialName_${ls.id}`]   = "Material Name is required.";
      if (!ls.sourceOfSupply?.trim())
        errors[`sourceOfSupply_${ls.id}`] = "Source of Supply is required.";
      if (!ls.kilometer || ls.kilometer <= 0)
        errors[`kilometer_${ls.id}`]      = "Distance (km) must be greater than 0.";
    }
  }

  if (step === 4) {
    const validSet = new Set<string>(VALID_SSR_ITEM_NUMBERS);
    for (const ra of state.rateAnalysis) {
      if (!ra.itemNumber || !validSet.has(ra.itemNumber))
        errors[`itemNumber_${ra.id}`] = "Please select an Item Number.";
    }
  }

  if (step === 5) {
    for (const ms of state.measurements) {
      if (!ms.itemNumber?.trim()) errors[`itemNumber_${ms.id}`] = "Item Number is required.";
      if (!ms.itemName?.trim())   errors[`itemName_${ms.id}`]   = "Item Name is required.";
      if (!ms.rate || ms.rate <= 0) errors[`rate_${ms.id}`]     = "Rate (₹) must be greater than 0.";
    }
    const totalAmt = state.measurements.reduce((s, m) => s + (m.amount || 0), 0);
    if (totalAmt <= 0) errors.estimatedAmount = "Estimated Amount must be greater than ₹0. Enter at least one measurement with a valid rate and quantity.";
  }

  // step 6 — all fields are optional; no validation required

  // step 7 — Upload Documents is optional; all three document types may be skipped

  if (step === 8) {
    if (!state.verificationChecked)
      errors.verificationChecked = "Please check the verification checkbox before submitting.";
  }

  return errors;
}

// ── Wizard ────────────────────────────────────────────────────────────────────

export function CreateProjectWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftParam = searchParams.get("draft");
  const stepParam = searchParams.get("step");

  const [step, setStep] = useState(1);
  const [wiz, setWiz] = useState<WizardState>(initialState);
  const [availableCharges, setAvailableCharges] = useState<ICharge[]>([]); // all active charges from store
  const [appliedCharges,   setAppliedCharges]   = useState<AppliedCharge[]>([]); // user-selected, may override %
  const [fieldErrors,      setFieldErrors]      = useState<Record<string, string>>({});
  const isDraftEdit = !!draftParam;

  // Load draft if ?draft=id — ?step= param overrides the saved step (used by "Continue" on Saved Drafts)
  useEffect(() => {
    setAvailableCharges(store.getActiveCharges());
    if (!draftParam) return;
    const draft = store.loadDraft(draftParam);
    if (!draft) return;

    const dd = draft.draftData ?? {};
    // URL ?step= wins over saved step so the user lands exactly where they clicked
    const resumeStep = stepParam ? Math.min(Math.max(parseInt(stepParam, 10), 1), 8) : (dd.currentStep ?? 1);
    const restored: WizardState = {
      basicDetails: {
        projectName: draft.projectName ?? "",
        sanctionYear: draft.sanctionYear ?? "",
        departmentName: draft.departmentName ?? "",
        majorHeadName: draft.majorHeadName ?? "",
        majorHeadCode: draft.majorHeadCode ?? "",
        division: draft.division ?? "",
        subDivision: draft.subDivision ?? "",
        taluka: draft.taluka ?? "",
        gramPanchayat: draft.gramPanchayat ?? "",
        ssrType: draft.ssrType ?? "",
        ssrYear: draft.ssrYear ?? "",
        dsrType: draft.dsrType ?? "",
        workActivity: draft.workActivity ?? "",
        workDemandBy: draft.workDemandBy ?? "",
        workDemandByDocumentName: "",
        workDescription: draft.workDescription ?? "",
      },
      subWorks: draft.subWorks?.map((sw) => ({ id: sw.id, name: sw.name })) ?? [{ id: "sw-init", name: "" }],
      leadStatements: draft.leadStatements?.map((ls) => ({
        id: ls.id,
        materialName: ls.materialName,
        sourceOfSupply: ls.sourceOfSupply,
        kilometer: ls.kilometer,
        calculation: ls.calculation,
      })) ?? initialState().leadStatements,
      rateAnalysis: draft.rateAnalysis?.map((ra) => ({
        id: ra.id,
        itemNumber: ra.itemNumber,
        itemDescription: ra.itemDescription ?? ra.itemName ?? "",
        materialComponents: ra.materialComponents,
        laborComponents: ra.laborComponents,
        machineryComponents: ra.machineryComponents,
        baseRate: ra.baseRate,
        totalRate: ra.totalRate,
        remarks: ra.remarks ?? "",
      })) ?? initialState().rateAnalysis,
      measurements: draft.measurements?.map((ms) => ({
        id: ms.id,
        itemNumber: ms.itemNumber,
        itemName: ms.itemName,
        length: ms.length,
        breadth: ms.breadth,
        height: ms.height,
        quantity: ms.quantity,
        unit: ms.unit,
        rate: ms.rate,
        amount: ms.amount,
      })) ?? initialState().measurements,
      generalDescription: dd.generalDescription ?? { technicalNotes: "", siteConditions: "", specialClauses: "" },
      documents: [],
      documentSets: { ...BLANK_DOCUMENT_SET },
      verificationChecked: dd.verificationChecked ?? false,
      draftId: draft.id,
      uploadedFileName: dd.uploadedProjectFileName,
      isDataAutoFilled: dd.isDataAutoFilled ?? false,
    };
    setWiz(restored);
    setStep(resumeStep);
  }, [draftParam, stepParam]);

  // Patch helpers — each clears only the keys it owns so errors from other fields persist
  const patchBasic = useCallback((patch: Partial<BasicDetails>) => {
    setWiz((w) => ({ ...w, basicDetails: { ...w.basicDetails, ...patch } }));
    setFieldErrors((prev) => {
      if (!Object.keys(prev).length) return prev;
      const next = { ...prev };
      for (const k of Object.keys(patch)) delete next[k];
      return next;
    });
  }, []);

  const patchSubWorks = useCallback((items: SubWorkItem[]) => {
    setWiz((w) => ({ ...w, subWorks: items }));
    setFieldErrors({});
  }, []);

  const patchLeadStatements = useCallback((items: LeadStatementItem[]) => {
    setWiz((w) => ({ ...w, leadStatements: items }));
    setFieldErrors({});
  }, []);

  const patchRateAnalysis = useCallback((items: RateItem[]) => {
    setWiz((w) => ({ ...w, rateAnalysis: items }));
    setFieldErrors({});
  }, []);

  const patchMeasurements = useCallback((items: MeasurementItem[]) => {
    setWiz((w) => ({ ...w, measurements: items }));
    setFieldErrors({});
  }, []);

  const patchGeneralDesc = useCallback((patch: Partial<GeneralDescription>) => {
    setWiz((w) => ({ ...w, generalDescription: { ...w.generalDescription, ...patch } }));
  }, []);

  const patchDocuments = useCallback((files: UploadedFile[]) => {
    setWiz((w) => ({ ...w, documents: files }));
  }, []);

  const patchDocumentSets = useCallback((sets: UploadedDocumentSet) => {
    setWiz((w) => ({ ...w, documentSets: sets }));
    setFieldErrors((prev) => {
      if (!prev.drawings && !prev.sitePhotos && !prev.surveyReports) return prev;
      const next = { ...prev };
      delete next.drawings;
      delete next.sitePhotos;
      delete next.surveyReports;
      return next;
    });
  }, []);

  // AI fill — called by AIUploadPanel after parsing stages complete
  const handleAIFill = useCallback((patch: Partial<WizardState>) => {
    setWiz((w) => ({
      ...w,
      ...patch,
      // preserve documents & verification state
      documents: w.documents,
      verificationChecked: w.verificationChecked,
    }));
  }, []);

  const handleAIReset = useCallback(() => {
    setWiz((w) => ({ ...w, uploadedFileName: undefined, isDataAutoFilled: false }));
  }, []);

  // Build project payload
  const buildPayload = useCallback(() => {
    const b = wiz.basicDetails;
    const currentUser = store.getCurrentUser();
    const today = new Date().toISOString().split("T")[0];
    const totalAmount = wiz.measurements.reduce((s, m) => s + (m.amount || 0), 0);
    const chargeTotal = appliedCharges.reduce((s, c) => s + (totalAmount * c.percentage) / 100, 0);

    // Convert UploadedFile to IDocument format
    const convertToDoc = (file: UploadedFile): IDocument => ({
      id: file.id,
      name: file.name,
      type: file.type,
      url: file.url,
      uploadedAt: today,
      uploadedBy: currentUser?.name ?? "System",
    });

    return {
      projectName: b.projectName,
      departmentName: b.departmentName,
      workActivity: b.workActivity,
      sanctionYear: b.sanctionYear,
      dsrType: b.dsrType,
      ssrType: b.ssrType,
      ssrYear: b.ssrYear,
      budgetDepartment: b.departmentName,
      majorHeadName: b.majorHeadName,
      majorHeadCode: b.majorHeadCode,
      division: b.division,
      subDivision: b.subDivision,
      taluka: b.taluka,
      gramPanchayat: b.gramPanchayat,
      workDemandBy: b.workDemandBy,
      workDescription: b.workDescription,
      workDemandByDocument: b.workDemandByDocumentFile ? {
        id: b.workDemandByDocumentFile.id,
        name: b.workDemandByDocumentFile.name,
        type: b.workDemandByDocumentFile.type,
        url: b.workDemandByDocumentFile.url,
        uploadedAt: today,
        uploadedBy: currentUser?.name ?? "System",
      } : undefined,
      subWorks: wiz.subWorks.map((sw) => ({ id: sw.id, name: sw.name })),
      leadStatements: wiz.leadStatements,
      rateAnalysis: wiz.rateAnalysis.map((ra) => ({ ...ra, itemName: ra.itemDescription, itemDescription: ra.itemDescription })),
      measurements: wiz.measurements,
      documentSets: {
        drawings: wiz.documentSets.drawings.map(convertToDoc),
        sitePhotos: wiz.documentSets.sitePhotos.map(convertToDoc),
        surveyReports: wiz.documentSets.surveyReports.map(convertToDoc),
      },
      estimatedAmount: totalAmount,
      technicalSanctionAmount: totalAmount + chargeTotal,
      draftData: {
        currentStep: step,
        generalDescription: wiz.generalDescription,
        percentageCharges: appliedCharges.map((c) => ({ id: c.chargeId, type: c.type, percentage: c.percentage })),
        uploadedProjectFileName: wiz.uploadedFileName,
        isDataAutoFilled: wiz.isDataAutoFilled,
        verificationChecked: wiz.verificationChecked,
      },
    };
  }, [wiz, appliedCharges, step]);

  // Save Draft
  function handleSaveDraft() {
    const payload = buildPayload();
    const saved = store.saveDraft({ ...payload, ...(wiz.draftId ? { id: wiz.draftId } : {}) });
    setWiz((w) => ({ ...w, draftId: saved.id }));
    toast.success("Draft saved successfully!", { description: "Continue editing from Saved Drafts anytime." });
  }

  // Next — validates current step before advancing
  function handleNext() {
    const errors = validateStep(step, wiz);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error("Please fill all highlighted mandatory fields before proceeding.");
      // After the DOM re-renders with aria-invalid attributes, scroll to and focus the first invalid field
      setTimeout(() => {
        const first = document.querySelector<HTMLElement>("[aria-invalid='true']");
        if (first) {
          first.scrollIntoView({ behavior: "smooth", block: "center" });
          first.focus();
        }
      }, 50);
      return;
    }
    setFieldErrors({});
    setStep((s) => Math.min(s + 1, 8));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Previous
  function handlePrev() {
    setFieldErrors({});
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Submit — final validation before creating the project
  function handleSubmit() {
    const errors = validateStep(8, wiz);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error("Please fill all highlighted mandatory fields before proceeding.");
      setTimeout(() => {
        const first = document.querySelector<HTMLElement>("[aria-invalid='true']");
        if (first) {
          first.scrollIntoView({ behavior: "smooth", block: "center" });
          first.focus();
        }
      }, 50);
      return;
    }
    const payload = buildPayload();
    // Create project with Draft status (Stage 1), then forward to DE
    const project = store.createProject({ ...payload });
    if (wiz.draftId) store.deleteDraft(wiz.draftId);
    // Forward from Stage 1 (SE) to Stage 2 (DE)
    const stage2Status = "Pending Deputy Engineer Review";
    store.forwardProject(project.id, "Deputy Engineer", "Submitted from Cost Estimation Wizard", stage2Status);
    toast.success("Project submitted for verification!", { description: `Project ID: ${project.id}` });
    router.push("/dashboard");
  }

  const showAIBanner = wiz.isDataAutoFilled && step > 1;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Page header */}
        <div className="flex items-start gap-4 mb-6">
          <Link
            href="/dashboard"
            className="mt-0.5 p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {isDraftEdit ? "Edit Draft" : "Create New Estimate"}
              </h1>
              {isDraftEdit && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700 rounded-full">
                  Draft
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Cost Estimation Module — Step {step} of {STEP_NAMES.length}
            </p>
          </div>
        </div>

        {/* AI banner shown on steps 2-8 when data was auto-filled */}
        {showAIBanner && (
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-300 dark:border-purple-700 rounded-lg p-4 flex items-center gap-3 mb-4">
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <p className="text-sm text-purple-800 dark:text-purple-300 font-medium">
              AI-populated data from{" "}
              <span className="font-semibold">{wiz.uploadedFileName}</span>. Please review all fields carefully.
            </p>
          </div>
        )}

        {/* Progress */}
        <ProgressSteps current={step} />

        {/* Step content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
          {step === 1 && (
            <Step1CreateProject
              data={wiz.basicDetails}
              onChange={patchBasic}
              uploadedFileName={wiz.uploadedFileName ?? ""}
              isAutoFilled={wiz.isDataAutoFilled}
              onFill={handleAIFill}
              onReset={handleAIReset}
              errors={fieldErrors}
            />
          )}
          {step === 2 && (
            <Step2SubWork items={wiz.subWorks} onChange={patchSubWorks} errors={fieldErrors} />
          )}
          {step === 3 && (
            <Step3LeadStatement items={wiz.leadStatements} onChange={patchLeadStatements} errors={fieldErrors} />
          )}
          {step === 4 && (
            <Step4RateAnalysis
              items={wiz.rateAnalysis}
              onChange={patchRateAnalysis}
              availableCharges={availableCharges}
              appliedCharges={appliedCharges}
              onAppliedChargesChange={setAppliedCharges}
              errors={fieldErrors}
            />
          )}
          {step === 5 && (
            <Step5Measurement items={wiz.measurements} onChange={patchMeasurements} errors={fieldErrors} />
          )}
          {step === 6 && (
            <Step6GeneralDescription data={wiz.generalDescription} onChange={patchGeneralDesc} />
          )}
          {step === 7 && (
            <Step7UploadDocuments documentSets={wiz.documentSets} onChange={patchDocumentSets} errors={fieldErrors} />
          )}
          {step === 8 && (
            <Step8ReviewSubmit
              state={wiz}
              activeCharges={appliedCharges.map((ac) => ({
                id: ac.chargeId, type: ac.type, percentage: ac.percentage,
                isActive: true, createdAt: "", updatedAt: "",
              }))}
              onVerificationChange={(checked) => {
                setWiz((w) => ({ ...w, verificationChecked: checked }));
                if (checked) setFieldErrors((prev) => { const n = { ...prev }; delete n.verificationChecked; return n; });
              }}
              errors={fieldErrors}
            />
          )}
        </div>

        {/* Bottom navigation */}
        <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-3.5 flex items-center justify-between gap-3 shadow-sm">
          <button
            type="button"
            onClick={handlePrev}
            disabled={step === 1}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" /> Previous
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <Save className="w-4 h-4" aria-hidden="true" /> Save Draft
            </button>

            {step < 8 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
              >
                Next <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-sm font-semibold transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500"
              >
                <Send className="w-4 h-4" aria-hidden="true" /> Submit for Verification
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
