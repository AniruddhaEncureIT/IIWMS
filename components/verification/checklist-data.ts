export interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
  hint?: string;
}

export const DE_CHECKLIST: ChecklistItem[] = [
  { id: "de-1", label: "Project name and administrative details are correct", required: true },
  { id: "de-2", label: "Site inspection has been carried out and findings recorded", required: true },
  { id: "de-3", label: "Cost estimates match applicable SSR / DSR rates", required: true },
  { id: "de-4", label: "Sub-works are properly defined and categorised", required: true },
  { id: "de-5", label: "Lead statement distances are verified against site conditions", required: true },
  { id: "de-6", label: "Measurement sheets are arithmetically correct", required: true },
  { id: "de-7", label: "Rate analysis components are reasonable and justified", required: true },
  { id: "de-8", label: "Major head / budget code is appropriate for this work", required: true },
  { id: "de-9", label: "All supporting documents are attached and legible", required: false, hint: "Optional — note any missing docs in remarks" },
  { id: "de-10", label: "Work is not duplicated with any ongoing or completed scheme", required: false },
];

export const EE_CHECKLIST: ChecklistItem[] = [
  { id: "ee-1", label: "DE verification has been completed satisfactorily", required: true },
  { id: "ee-2", label: "Technical parameters and specifications are within prescribed limits", required: true },
  { id: "ee-3", label: "Total cost is within the sanctioned administrative approval amount", required: true },
  { id: "ee-4", label: "SSR / DSR year and type are appropriate for the sanction year", required: true },
  { id: "ee-5", label: "Structural design is adequate for the intended use (if applicable)", required: false, hint: "Mark N/A in remarks if not applicable" },
  { id: "ee-6", label: "Environmental and statutory clearances are in place", required: false },
  { id: "ee-7", label: "Contractor class threshold is correctly determined from estimate value", required: true },
  { id: "ee-8", label: "Completion period is realistic and compliant with departmental norms", required: true },
  { id: "ee-9", label: "Quality control plan and test frequencies are adequate", required: true },
  { id: "ee-10", label: "Work is included in the annual programme / plan", required: false },
];
