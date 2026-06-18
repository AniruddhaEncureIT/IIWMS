import type { UserRole } from "@/types/auth.types";

// ── Result type ────────────────────────────────────────────────────────────────

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

// ── Workflow Stage Definition ──────────────────────────────────────────────────

export interface WorkflowAction {
  id: string;
  label: string;
  actionType: "submit" | "forward" | "approve" | "reject" | "accept" | "create" | "process";
  requiresRemarks?: boolean;
  nextStageId: string;
  nextOwnerRole: UserRole;
}

export interface WorkflowStage {
  id: string;
  stageNumber: number;
  name: string;
  ownerRole: UserRole;
  status: string;
  description?: string;
  possibleActions: WorkflowAction[];
}

// ── 33-Stage Workflow Definition (with DTP, Contractor MB, CEO closure) ────────

export const WORKFLOW_STAGES: WorkflowStage[] = [
  // ── STAGE 1: Project Creation ──────────────────────────────────────────
  {
    id: "stage-1",
    stageNumber: 1,
    name: "Project Creation",
    ownerRole: "Sectional Engineer",
    status: "Draft",
    description: "SE creates and saves project estimate with all details",
    possibleActions: [
      {
        id: "submit-draft",
        label: "Submit Project",
        actionType: "submit",
        requiresRemarks: false,
        nextStageId: "stage-2",
        nextOwnerRole: "Deputy Engineer",
      },
    ],
  },

  // ── STAGE 2: Deputy Engineer Review ────────────────────────────────────
  {
    id: "stage-2",
    stageNumber: 2,
    name: "Deputy Engineer Review",
    ownerRole: "Deputy Engineer",
    status: "Pending Deputy Engineer Review",
    description: "DE verifies project data and measurements",
    possibleActions: [
      {
        id: "de-forward",
        label: "Verify & Forward to Executive Engineer",
        actionType: "forward",
        requiresRemarks: true,
        nextStageId: "stage-3",
        nextOwnerRole: "Executive Engineer",
      },
      {
        id: "de-return",
        label: "Return for Correction",
        actionType: "reject",
        requiresRemarks: true,
        nextStageId: "stage-1",
        nextOwnerRole: "Sectional Engineer",
      },
    ],
  },

  // ── STAGE 3: Executive Engineer Review ─────────────────────────────────
  {
    id: "stage-3",
    stageNumber: 3,
    name: "Executive Engineer Review",
    ownerRole: "Executive Engineer",
    status: "Pending Executive Engineer Review",
    description: "EE reviews and grants technical sanction",
    possibleActions: [
      {
        id: "ee-grant-ts",
        label: "Grant Technical Sanction",
        actionType: "approve",
        requiresRemarks: true,
        nextStageId: "stage-4",
        nextOwnerRole: "Sectional Engineer",
      },
      {
        id: "ee-return-de",
        label: "Return to Deputy Engineer",
        actionType: "reject",
        requiresRemarks: true,
        nextStageId: "stage-2",
        nextOwnerRole: "Deputy Engineer",
      },
    ],
  },

  // ── STAGE 4: DTP Preparation (SE) ──────────────────────────────────────
  {
    id: "stage-4",
    stageNumber: 4,
    name: "DTP Preparation",
    ownerRole: "Sectional Engineer",
    status: "Ready for DTP Preparation",
    description: "SE prepares Draft Tender Paper with all technical details",
    possibleActions: [
      {
        id: "se-submit-dtp",
        label: "Submit DTP for Review",
        actionType: "submit",
        requiresRemarks: false,
        nextStageId: "stage-5",
        nextOwnerRole: "Deputy Engineer",
      },
    ],
  },

  // ── STAGE 5: DTP Review (DE) ───────────────────────────────────────────
  {
    id: "stage-5",
    stageNumber: 5,
    name: "DTP Review",
    ownerRole: "Deputy Engineer",
    status: "Pending DTP Review",
    description: "DE reviews and verifies the DTP details",
    possibleActions: [
      {
        id: "de-forward-dtp",
        label: "Forward DTP to Executive Engineer",
        actionType: "forward",
        requiresRemarks: true,
        nextStageId: "stage-6",
        nextOwnerRole: "Executive Engineer",
      },
      {
        id: "de-return-dtp",
        label: "Return DTP for Correction",
        actionType: "reject",
        requiresRemarks: true,
        nextStageId: "stage-4",
        nextOwnerRole: "Sectional Engineer",
      },
    ],
  },

  // ── STAGE 6: DTP Approval (EE) ─────────────────────────────────────────
  {
    id: "stage-6",
    stageNumber: 6,
    name: "DTP Approval",
    ownerRole: "Executive Engineer",
    status: "Pending DTP Approval",
    description: "EE approves and sanctions the Draft Tender Paper",
    possibleActions: [
      {
        id: "ee-approve-dtp",
        label: "Approve DTP",
        actionType: "approve",
        requiresRemarks: true,
        nextStageId: "stage-7",
        nextOwnerRole: "Tender Clerk",
      },
      {
        id: "ee-return-dtp",
        label: "Return DTP to Deputy Engineer",
        actionType: "reject",
        requiresRemarks: true,
        nextStageId: "stage-5",
        nextOwnerRole: "Deputy Engineer",
      },
    ],
  },

  // ── STAGE 7: Tender Preparation (TC) ──────────────────────────────────
  {
    id: "stage-7",
    stageNumber: 7,
    name: "Tender Preparation",
    ownerRole: "Tender Clerk",
    status: "Ready for Tender Preparation",
    description: "TC prepares tender notice and submits for EE review",
    possibleActions: [
      {
        id: "tc-submit-tender",
        label: "Submit Tender for Review",
        actionType: "submit",
        requiresRemarks: false,
        nextStageId: "stage-7b",
        nextOwnerRole: "Executive Engineer",
      },
    ],
  },

  // ── STAGE 7b: Tender - EE Review ───────────────────────────────────────
  {
    id: "stage-7b",
    stageNumber: 8,
    name: "Tender - EE Review",
    ownerRole: "Executive Engineer",
    status: "Tender Pending EE Review",
    description: "EE reviews tender notice and forwards to CAFO",
    possibleActions: [
      {
        id: "ee-forward-tender-to-cafo",
        label: "Forward to CAFO",
        actionType: "forward",
        requiresRemarks: true,
        nextStageId: "stage-7c",
        nextOwnerRole: "Chief Accounts and Finance Officer",
      },
      {
        id: "ee-return-tender",
        label: "Return to TC",
        actionType: "reject",
        requiresRemarks: true,
        nextStageId: "stage-7",
        nextOwnerRole: "Tender Clerk",
      },
    ],
  },

  // ── STAGE 7c: Tender - CAFO Review ─────────────────────────────────────
  {
    id: "stage-7c",
    stageNumber: 9,
    name: "Tender - CAFO Review",
    ownerRole: "Chief Accounts and Finance Officer",
    status: "Tender Pending CAFO Review",
    description: "CAFO reviews tender notice and forwards to Additional CEO",
    possibleActions: [
      {
        id: "cafo-forward-tender-to-aceo",
        label: "Forward to Additional CEO",
        actionType: "forward",
        requiresRemarks: true,
        nextStageId: "stage-7d",
        nextOwnerRole: "Additional Chief Executive Officer",
      },
      {
        id: "cafo-return-tender",
        label: "Return to EE",
        actionType: "reject",
        requiresRemarks: true,
        nextStageId: "stage-7b",
        nextOwnerRole: "Executive Engineer",
      },
    ],
  },

  // ── STAGE 7d: Tender - ACEO Approval ───────────────────────────────────
  {
    id: "stage-7d",
    stageNumber: 10,
    name: "Tender - ACEO Approval",
    ownerRole: "Additional Chief Executive Officer",
    status: "Tender Pending ACEO Approval",
    description: "Additional CEO approves and publishes tender on MahaTender",
    possibleActions: [
      {
        id: "aceo-publish-tender",
        label: "Publish Tender",
        actionType: "approve",
        requiresRemarks: true,
        nextStageId: "stage-8",
        nextOwnerRole: "Tender Clerk",
      },
      {
        id: "aceo-return-tender",
        label: "Return to CAFO",
        actionType: "reject",
        requiresRemarks: true,
        nextStageId: "stage-7c",
        nextOwnerRole: "Chief Accounts and Finance Officer",
      },
    ],
  },

  // ── STAGE 8: Technical Bid Processing ──────────────────────────────────
  // Bids are submitted externally on MahaTender; TC records outcomes in IIMS
  {
    id: "stage-8",
    stageNumber: 8,
    name: "Technical Bid Processing",
    ownerRole: "Tender Clerk",
    status: "Tender Published",
    description: "TC records technical bid data from MahaTender and forwards for EE review",
    possibleActions: [
      {
        id: "tc-forward-tech-bid",
        label: "Forward Technical Bids for Review",
        actionType: "forward",
        requiresRemarks: false,
        nextStageId: "stage-9",
        nextOwnerRole: "Executive Engineer",
      },
    ],
  },

  // ── STAGE 9: Technical Bid - EE Review ─────────────────────────────────
  {
    id: "stage-9",
    stageNumber: 9,
    name: "Technical Bid - EE Review",
    ownerRole: "Executive Engineer",
    status: "Technical Bid - EE Review",
    description: "EE evaluates technical bids and forwards to CAFO",
    possibleActions: [
      {
        id: "ee-forward-tech-to-cafo",
        label: "Forward to CAFO",
        actionType: "forward",
        requiresRemarks: true,
        nextStageId: "stage-10",
        nextOwnerRole: "Chief Accounts and Finance Officer",
      },
      {
        id: "ee-return-tech-bid",
        label: "Return to TC",
        actionType: "reject",
        requiresRemarks: true,
        nextStageId: "stage-8",
        nextOwnerRole: "Tender Clerk",
      },
    ],
  },

  // ── STAGE 10: Technical Bid - CAFO Review ──────────────────────────────
  {
    id: "stage-10",
    stageNumber: 10,
    name: "Technical Bid - CAFO Review",
    ownerRole: "Chief Accounts and Finance Officer",
    status: "Technical Bid - CAFO Review",
    description: "CAFO reviews technical bids and forwards to ACEO",
    possibleActions: [
      {
        id: "cafo-forward-tech-to-aceo",
        label: "Forward to Additional CEO",
        actionType: "forward",
        requiresRemarks: true,
        nextStageId: "stage-11",
        nextOwnerRole: "Additional Chief Executive Officer",
      },
      {
        id: "cafo-return-tech-bid",
        label: "Return to EE",
        actionType: "reject",
        requiresRemarks: true,
        nextStageId: "stage-9",
        nextOwnerRole: "Executive Engineer",
      },
    ],
  },

  // ── STAGE 11: Technical Bid - ACEO Approval ────────────────────────────
  {
    id: "stage-11",
    stageNumber: 11,
    name: "Technical Bid - ACEO Approval",
    ownerRole: "Additional Chief Executive Officer",
    status: "Technical Bid - ACEO Review",
    description: "ACEO approves technical qualification of bids",
    possibleActions: [
      {
        id: "aceo-approve-tech-bid",
        label: "Approve Technical Bids",
        actionType: "approve",
        requiresRemarks: true,
        nextStageId: "stage-12",
        nextOwnerRole: "Tender Clerk",
      },
      {
        id: "aceo-return-tech-bid",
        label: "Return to CAFO",
        actionType: "reject",
        requiresRemarks: true,
        nextStageId: "stage-10",
        nextOwnerRole: "Chief Accounts and Finance Officer",
      },
    ],
  },

  // ── STAGE 12: Financial Bid Processing ─────────────────────────────────
  {
    id: "stage-12",
    stageNumber: 12,
    name: "Financial Bid Processing",
    ownerRole: "Tender Clerk",
    status: "Technical Bid Finalized",
    description: "TC records financial bid data from MahaTender and forwards for EE review",
    possibleActions: [
      {
        id: "tc-forward-fin-bid",
        label: "Forward Financial Bids for Review",
        actionType: "forward",
        requiresRemarks: false,
        nextStageId: "stage-13",
        nextOwnerRole: "Executive Engineer",
      },
    ],
  },

  // ── STAGE 13: Financial Bid - EE Review ────────────────────────────────
  {
    id: "stage-13",
    stageNumber: 13,
    name: "Financial Bid - EE Review",
    ownerRole: "Executive Engineer",
    status: "Financial Bid - EE Review",
    description: "EE evaluates financial bids and recommends L1",
    possibleActions: [
      {
        id: "ee-forward-fin-to-cafo",
        label: "Forward to CAFO",
        actionType: "forward",
        requiresRemarks: true,
        nextStageId: "stage-14",
        nextOwnerRole: "Chief Accounts and Finance Officer",
      },
      {
        id: "ee-return-fin-bid",
        label: "Return to TC",
        actionType: "reject",
        requiresRemarks: true,
        nextStageId: "stage-12",
        nextOwnerRole: "Tender Clerk",
      },
    ],
  },

  // ── STAGE 14: Financial Bid - CAFO Review ──────────────────────────────
  {
    id: "stage-14",
    stageNumber: 14,
    name: "Financial Bid - CAFO Review",
    ownerRole: "Chief Accounts and Finance Officer",
    status: "Financial Bid - CAFO Review",
    description: "CAFO performs financial review and forwards to ACEO",
    possibleActions: [
      {
        id: "cafo-forward-fin-to-aceo",
        label: "Forward to Additional CEO",
        actionType: "forward",
        requiresRemarks: true,
        nextStageId: "stage-15",
        nextOwnerRole: "Additional Chief Executive Officer",
      },
      {
        id: "cafo-return-fin-bid",
        label: "Return to EE",
        actionType: "reject",
        requiresRemarks: true,
        nextStageId: "stage-13",
        nextOwnerRole: "Executive Engineer",
      },
    ],
  },

  // ── STAGE 15: Financial Bid - ACEO Review ──────────────────────────────
  {
    id: "stage-15",
    stageNumber: 15,
    name: "Financial Bid - ACEO Review",
    ownerRole: "Additional Chief Executive Officer",
    status: "Financial Bid - ACEO Review",
    description: "ACEO performs administrative recommendation and forwards to TC for L1 selection",
    possibleActions: [
      {
        id: "aceo-forward-to-l1-selection",
        label: "Forward for L1 Selection",
        actionType: "forward",
        requiresRemarks: true,
        nextStageId: "stage-16",
        nextOwnerRole: "Tender Clerk",
      },
      {
        id: "aceo-return-fin-bid",
        label: "Return to CAFO",
        actionType: "reject",
        requiresRemarks: true,
        nextStageId: "stage-14",
        nextOwnerRole: "Chief Accounts and Finance Officer",
      },
    ],
  },

  // ── STAGE 16: L1 Selection & GB Resolution ─────────────────────────────
  {
    id: "stage-16",
    stageNumber: 16,
    name: "L1 Selection & GB Resolution",
    ownerRole: "Tender Clerk",
    status: "Pending L1 Selection",
    description: "TC selects L1 contractor, uploads GB Resolution, and forwards for LOI approval",
    possibleActions: [
      {
        id: "tc-forward-to-loi",
        label: "Forward for LOI Approval",
        actionType: "forward",
        requiresRemarks: false,
        nextStageId: "stage-17",
        nextOwnerRole: "Executive Engineer",
      },
    ],
  },

  // ── STAGE 17: LOI - EE Review ──────────────────────────────────────────
  {
    id: "stage-17",
    stageNumber: 17,
    name: "LOI - EE Review",
    ownerRole: "Executive Engineer",
    status: "Financial Bid Approved",
    description: "EE reviews LOI and forwards to CAFO",
    possibleActions: [
      {
        id: "ee-forward-loi-to-cafo",
        label: "Forward to CAFO",
        actionType: "forward",
        requiresRemarks: true,
        nextStageId: "stage-18",
        nextOwnerRole: "Chief Accounts and Finance Officer",
      },
      {
        id: "ee-return-loi",
        label: "Return to TC",
        actionType: "reject",
        requiresRemarks: true,
        nextStageId: "stage-16",
        nextOwnerRole: "Tender Clerk",
      },
    ],
  },

  // ── STAGE 18: LOI - CAFO Review ────────────────────────────────────────
  {
    id: "stage-18",
    stageNumber: 18,
    name: "LOI - CAFO Review",
    ownerRole: "Chief Accounts and Finance Officer",
    status: "LOI - CAFO Review",
    description: "CAFO reviews LOI and forwards to ACEO",
    possibleActions: [
      {
        id: "cafo-forward-loi-to-aceo",
        label: "Forward to Additional CEO",
        actionType: "forward",
        requiresRemarks: true,
        nextStageId: "stage-19",
        nextOwnerRole: "Additional Chief Executive Officer",
      },
      {
        id: "cafo-return-loi",
        label: "Return to EE",
        actionType: "reject",
        requiresRemarks: true,
        nextStageId: "stage-17",
        nextOwnerRole: "Executive Engineer",
      },
    ],
  },

  // ── STAGE 19: LOI - ACEO Approval ──────────────────────────────────────
  {
    id: "stage-19",
    stageNumber: 19,
    name: "LOI - ACEO Approval",
    ownerRole: "Additional Chief Executive Officer",
    status: "LOI - ACEO Approval",
    description: "ACEO approves LOI and forwards to TC for Work Order preparation",
    possibleActions: [
      {
        id: "aceo-approve-loi",
        label: "Approve LOI",
        actionType: "approve",
        requiresRemarks: true,
        nextStageId: "stage-20",
        nextOwnerRole: "Tender Clerk",
      },
      {
        id: "aceo-return-loi",
        label: "Return to CAFO",
        actionType: "reject",
        requiresRemarks: true,
        nextStageId: "stage-18",
        nextOwnerRole: "Chief Accounts and Finance Officer",
      },
    ],
  },

  // ── STAGE 20: Work Order - EE Review ───────────────────────────────────
  {
    id: "stage-20",
    stageNumber: 20,
    name: "Work Order - EE Review",
    ownerRole: "Executive Engineer",
    status: "LOI Issued",
    description: "EE reviews Work Order and forwards to CAFO",
    possibleActions: [
      {
        id: "ee-forward-wo-to-cafo",
        label: "Forward to CAFO",
        actionType: "forward",
        requiresRemarks: true,
        nextStageId: "stage-21",
        nextOwnerRole: "Chief Accounts and Finance Officer",
      },
      {
        id: "ee-return-wo",
        label: "Return to TC",
        actionType: "reject",
        requiresRemarks: true,
        nextStageId: "stage-20",
        nextOwnerRole: "Tender Clerk",
      },
    ],
  },

  // ── STAGE 21: Work Order - CAFO Review ─────────────────────────────────
  {
    id: "stage-21",
    stageNumber: 21,
    name: "Work Order - CAFO Review",
    ownerRole: "Chief Accounts and Finance Officer",
    status: "Work Order - CAFO Review",
    description: "CAFO reviews Work Order and forwards to ACEO",
    possibleActions: [
      {
        id: "cafo-forward-wo-to-aceo",
        label: "Forward to Additional CEO",
        actionType: "forward",
        requiresRemarks: true,
        nextStageId: "stage-22",
        nextOwnerRole: "Additional Chief Executive Officer",
      },
      {
        id: "cafo-return-wo",
        label: "Return to EE",
        actionType: "reject",
        requiresRemarks: true,
        nextStageId: "stage-20",
        nextOwnerRole: "Executive Engineer",
      },
    ],
  },

  // ── STAGE 22: Work Order - ACEO Approval ───────────────────────────────
  {
    id: "stage-22",
    stageNumber: 22,
    name: "Work Order - ACEO Approval",
    ownerRole: "Additional Chief Executive Officer",
    status: "Work Order - ACEO Approval",
    description: "ACEO approves Work Order and issues to SE for project execution",
    possibleActions: [
      {
        id: "aceo-approve-wo",
        label: "Approve Work Order",
        actionType: "approve",
        requiresRemarks: true,
        nextStageId: "stage-23",
        nextOwnerRole: "Sectional Engineer",
      },
      {
        id: "aceo-return-wo",
        label: "Return to CAFO",
        actionType: "reject",
        requiresRemarks: true,
        nextStageId: "stage-21",
        nextOwnerRole: "Chief Accounts and Finance Officer",
      },
    ],
  },

  // ── STAGE 23: Measurement Book Creation ────────────────────────────────
  {
    id: "stage-23",
    stageNumber: 23,
    name: "Measurement Book",
    ownerRole: "Sectional Engineer",
    status: "Work Order Issued",
    description: "SE creates and submits measurement book entries",
    possibleActions: [
      {
        id: "se-submit-mb",
        label: "Submit Measurement Book",
        actionType: "submit",
        requiresRemarks: false,
        nextStageId: "stage-24",
        nextOwnerRole: "Deputy Engineer",
      },
    ],
  },

  // ── STAGE 24: Measurement Verification (DE) ────────────────────────────
  {
    id: "stage-24",
    stageNumber: 24,
    name: "Measurement Verification",
    ownerRole: "Deputy Engineer",
    status: "Pending Measurement Verification",
    description: "DE verifies measurement entries",
    possibleActions: [
      {
        id: "de-verify-mb",
        label: "Verify & Forward",
        actionType: "forward",
        requiresRemarks: true,
        nextStageId: "stage-25",
        nextOwnerRole: "Contractor",
      },
      {
        id: "de-return-mb",
        label: "Return for Correction",
        actionType: "reject",
        requiresRemarks: true,
        nextStageId: "stage-23",
        nextOwnerRole: "Sectional Engineer",
      },
    ],
  },

  // ── STAGE 25: Contractor Acceptance ────────────────────────────────────
  {
    id: "stage-25",
    stageNumber: 25,
    name: "Contractor Acceptance",
    ownerRole: "Contractor",
    status: "Pending Contractor Acceptance",
    description: "Contractor reviews and accepts measurement book entries",
    possibleActions: [
      {
        id: "contractor-accept-mb",
        label: "Accept Measurement Book",
        actionType: "accept",
        requiresRemarks: true,
        nextStageId: "stage-26",
        nextOwnerRole: "Executive Engineer",
      },
      {
        id: "contractor-reject-mb",
        label: "Reject with Remarks",
        actionType: "reject",
        requiresRemarks: true,
        nextStageId: "stage-24",
        nextOwnerRole: "Deputy Engineer",
      },
    ],
  },

  // ── STAGE 26: Measurement Approval (EE) ────────────────────────────────
  {
    id: "stage-26",
    stageNumber: 26,
    name: "Measurement Approval",
    ownerRole: "Executive Engineer",
    status: "Pending Measurement Approval",
    description: "EE approves measurement book",
    possibleActions: [
      {
        id: "ee-approve-mb",
        label: "Approve Measurement Book",
        actionType: "approve",
        requiresRemarks: true,
        nextStageId: "stage-27",
        nextOwnerRole: "Auditor",
      },
      {
        id: "ee-return-mb",
        label: "Return for Correction",
        actionType: "reject",
        requiresRemarks: true,
        nextStageId: "stage-24",
        nextOwnerRole: "Deputy Engineer",
      },
    ],
  },

  // ── STAGE 27: Auditor Review ───────────────────────────────────────────
  {
    id: "stage-27",
    stageNumber: 27,
    name: "Auditor Review",
    ownerRole: "Auditor",
    status: "Pending Auditor Review",
    description: "Auditor reviews and verifies measurement book entries",
    possibleActions: [
      {
        id: "auditor-forward-mb",
        label: "Forward for Bill Generation",
        actionType: "forward",
        requiresRemarks: true,
        nextStageId: "stage-28",
        nextOwnerRole: "Accountant",
      },
      {
        id: "auditor-return-mb",
        label: "Return for Correction",
        actionType: "reject",
        requiresRemarks: true,
        nextStageId: "stage-26",
        nextOwnerRole: "Executive Engineer",
      },
    ],
  },

  // ── STAGE 28: Bill Generation ──────────────────────────────────────────
  {
    id: "stage-28",
    stageNumber: 28,
    name: "Bill Generation",
    ownerRole: "Accountant",
    status: "Ready for Billing",
    description: "Accountant generates bill from MB",
    possibleActions: [
      {
        id: "accountant-submit-bill",
        label: "Submit Bill",
        actionType: "submit",
        requiresRemarks: false,
        nextStageId: "stage-29",
        nextOwnerRole: "Assistant Accounts Officer",
      },
    ],
  },

  // ── STAGE 29: Bill Verification ───────────────────────────────────────
  {
    id: "stage-29",
    stageNumber: 29,
    name: "Bill Verification",
    ownerRole: "Assistant Accounts Officer",
    status: "Pending Bill Verification",
    description: "AAO verifies bill calculations",
    possibleActions: [
      {
        id: "aao-verify-bill",
        label: "Verify & Forward",
        actionType: "forward",
        requiresRemarks: true,
        nextStageId: "stage-30",
        nextOwnerRole: "Chief Accounts and Finance Officer",
      },
      {
        id: "aao-return-bill",
        label: "Return for Correction",
        actionType: "reject",
        requiresRemarks: true,
        nextStageId: "stage-28",
        nextOwnerRole: "Accountant",
      },
    ],
  },

  // ── STAGE 30: Bill Approval (CAFO) ────────────────────────────────────
  {
    id: "stage-30",
    stageNumber: 30,
    name: "Bill Approval",
    ownerRole: "Chief Accounts and Finance Officer",
    status: "Pending Bill Approval",
    description: "CAFO approves bill and forwards to ACEO",
    possibleActions: [
      {
        id: "cafo-approve-bill",
        label: "Forward to Additional CEO",
        actionType: "forward",
        requiresRemarks: true,
        nextStageId: "stage-31",
        nextOwnerRole: "Additional Chief Executive Officer",
      },
      {
        id: "cafo-return-bill",
        label: "Return to AAO",
        actionType: "reject",
        requiresRemarks: true,
        nextStageId: "stage-29",
        nextOwnerRole: "Assistant Accounts Officer",
      },
    ],
  },

  // ── STAGE 31: Bill Review (ACEO) ───────────────────────────────────────
  {
    id: "stage-31",
    stageNumber: 31,
    name: "Bill Review",
    ownerRole: "Additional Chief Executive Officer",
    status: "Pending ACEO Bill Review",
    description: "ACEO reviews bill and forwards to CEO for final approval",
    possibleActions: [
      {
        id: "aceo-forward-to-ceo",
        label: "Forward to Chief Executive Officer",
        actionType: "forward",
        requiresRemarks: true,
        nextStageId: "stage-32",
        nextOwnerRole: "Chief Executive Officer",
      },
      {
        id: "aceo-return-bill",
        label: "Return to CAFO",
        actionType: "reject",
        requiresRemarks: true,
        nextStageId: "stage-30",
        nextOwnerRole: "Chief Accounts and Finance Officer",
      },
    ],
  },

  // ── STAGE 32: Final Approval & Project Closure (CEO) ────────────────────
  {
    id: "stage-32",
    stageNumber: 32,
    name: "Final Approval & Project Closure",
    ownerRole: "Chief Executive Officer",
    status: "Pending CEO Final Approval",
    description: "CEO reviews MB summary, deductions, remarks, and approves bill. System marks bill as paid, updates dashboards, and closes project.",
    possibleActions: [
      {
        id: "ceo-approve-mb-close",
        label: "Approve MB & Close Project",
        actionType: "approve",
        requiresRemarks: true,
        nextStageId: "stage-33",
        nextOwnerRole: "Chief Executive Officer",
      },
      {
        id: "ceo-return-bill",
        label: "Return to Additional CEO",
        actionType: "reject",
        requiresRemarks: true,
        nextStageId: "stage-31",
        nextOwnerRole: "Additional Chief Executive Officer",
      },
    ],
  },

  // ── STAGE 33: Project Completed ────────────────────────────────────────
  {
    id: "stage-33",
    stageNumber: 33,
    name: "Project Completed",
    ownerRole: "Chief Executive Officer",
    status: "Project Completed",
    description: "Project has been completed, audited, and closed. Bill paid, financial records updated, project completion tracked.",
    possibleActions: [],
  },
];

// ── Status mapping for backward compatibility ──────────────────────────────────

const STATUS_MAPPING: Record<string, string> = {
  "Pending at Sectional Engineer": "Pending Sectional Engineer Review",
  "Pending at Deputy Engineer": "Pending Deputy Engineer Review",
  "Pending at Executive Engineer": "Pending Executive Engineer Review",
  "Pending at Tender Clerk": "Pending Tender Clerk Review",
  "Pending at Contractor": "Pending Contractor Review",
  "Pending at Auditor": "Pending Auditor Review",
  "Pending at Accountant": "Pending Accountant Review",
  "Pending at Assistant Accounts Officer": "Pending AAO Review",
  "Pending at Chief Accounts and Finance Officer": "Pending CAFO Review",
  "Pending at Additional Chief Executive Officer": "Pending Additional CEO Review",
  "Pending at Chief Executive Officer": "Pending CEO Review",
  // LOA → LOI rename backward compatibility (existing projects in store)
  "LOA - CAFO Review": "LOI - CAFO Review",
  "LOA - ACEO Approval": "LOI - ACEO Approval",
  "LOA Issued": "LOI Issued",
};

// ── Workflow Lookup Helpers ────────────────────────────────────────────────────

export function getStageByStatus(status: string): WorkflowStage | null {
  // Try exact match first
  let stage = WORKFLOW_STAGES.find((s) => s.status === status);
  if (stage) return stage;

  // Try mapped status for backward compatibility
  const mappedStatus = STATUS_MAPPING[status];
  if (mappedStatus) {
    stage = WORKFLOW_STAGES.find((s) => s.status === mappedStatus);
    if (stage) return stage;
  }

  return null;
}

export function getStageById(stageId: string): WorkflowStage | null {
  return WORKFLOW_STAGES.find((s) => s.id === stageId) ?? null;
}

export function getNextStage(currentStageId: string, actionId: string): WorkflowStage | null {
  const currentStage = getStageById(currentStageId);
  if (!currentStage) return null;

  const action = currentStage.possibleActions.find((a) => a.id === actionId);
  if (!action) return null;

  return getStageById(action.nextStageId);
}

export function getActionsByStage(stageId: string): WorkflowAction[] {
  const stage = getStageById(stageId);
  return stage?.possibleActions ?? [];
}

// ── Validation Functions ───────────────────────────────────────────────────────

export function validateAction(
  callerRole: string,
  currentStatus: string,
  actionId: string
): ActionResult {
  const currentStage = getStageByStatus(currentStatus);
  if (!currentStage) {
    return {
      ok: false,
      error: `Unknown project status: "${currentStatus}". Cannot determine workflow stage.`,
    };
  }

  if (currentStage.ownerRole !== callerRole) {
    return {
      ok: false,
      error: `Role "${callerRole}" cannot perform actions on this project. Current stage "${currentStage.name}" is owned by "${currentStage.ownerRole}".`,
    };
  }

  const action = currentStage.possibleActions.find((a) => a.id === actionId);
  if (!action) {
    const allowedActions = currentStage.possibleActions.map((a) => `"${a.label}"`).join(", ");
    return {
      ok: false,
      error: `Action "${actionId}" is not available at stage "${currentStage.name}". Allowed actions: ${allowedActions || "none"}.`,
    };
  }

  return { ok: true };
}

// ── Legacy Compatibility Functions ─────────────────────────────────────────────

export function validateForward(
  callerRole: string,
  currentStatus: string,
  toRole: string
): ActionResult {
  const currentStage = getStageByStatus(currentStatus);
  if (!currentStage) {
    return { ok: false, error: `Unknown status: "${currentStatus}"` };
  }

  if (currentStage.ownerRole !== callerRole) {
    return {
      ok: false,
      error: `Role "${callerRole}" is not authorized to act on this project at stage "${currentStage.name}".`,
    };
  }

  const forwardAction = currentStage.possibleActions.find((a) =>
    ["forward", "submit", "accept", "create"].includes(a.actionType)
  );

  if (!forwardAction) {
    return {
      ok: false,
      error: `No forward action available at stage "${currentStage.name}".`,
    };
  }

  const nextStage = getStageById(forwardAction.nextStageId);
  if (!nextStage || nextStage.ownerRole !== toRole) {
    return {
      ok: false,
      error: `Cannot forward to role "${toRole}" from stage "${currentStage.name}". Next role should be "${forwardAction.nextOwnerRole}".`,
    };
  }

  return { ok: true };
}

export function validateApprove(
  callerRole: string,
  currentStatus: string,
  toStatus: string
): ActionResult {
  const currentStage = getStageByStatus(currentStatus);
  if (!currentStage) {
    return { ok: false, error: `Unknown status: "${currentStatus}"` };
  }

  if (currentStage.ownerRole !== callerRole) {
    return {
      ok: false,
      error: `Role "${callerRole}" is not authorized to approve at stage "${currentStage.name}".`,
    };
  }

  const approveAction = currentStage.possibleActions.find(
    (a) => a.actionType === "approve" && getStageById(a.nextStageId)?.status === toStatus
  );

  if (!approveAction) {
    return {
      ok: false,
      error: `Cannot approve to status "${toStatus}" from stage "${currentStage.name}".`,
    };
  }

  return { ok: true };
}

export function validateReject(
  callerRole: string,
  currentStatus: string,
  toRole: string
): ActionResult {
  const currentStage = getStageByStatus(currentStatus);
  if (!currentStage) {
    return { ok: false, error: `Unknown status: "${currentStatus}"` };
  }

  if (currentStage.ownerRole !== callerRole) {
    return {
      ok: false,
      error: `Role "${callerRole}" is not authorized to reject at stage "${currentStage.name}".`,
    };
  }

  const rejectAction = currentStage.possibleActions.find(
    (a) => a.actionType === "reject" && a.nextOwnerRole === toRole
  );

  if (!rejectAction) {
    return {
      ok: false,
      error: `Cannot reject to role "${toRole}" from stage "${currentStage.name}".`,
    };
  }

  return { ok: true };
}

export function validateMBVerify(callerRole: string, currentStatus: string): ActionResult {
  if (callerRole !== "Deputy Engineer") {
    return { ok: false, error: `Only Deputy Engineer can verify measurement books.` };
  }
  if (currentStatus !== "Submitted to DE") {
    return { ok: false, error: `MB status must be "Submitted to DE" to verify.` };
  }
  return { ok: true };
}

export function validateMBApprove(callerRole: string, currentStatus: string): ActionResult {
  if (callerRole !== "Executive Engineer") {
    return { ok: false, error: `Only Executive Engineer can approve measurement books.` };
  }
  if (currentStatus !== "Verified by DE") {
    return { ok: false, error: `MB status must be "Verified by DE" to approve.` };
  }
  return { ok: true };
}
