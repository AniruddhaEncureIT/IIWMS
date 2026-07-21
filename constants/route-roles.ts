import type { UserRole } from "@/types/auth.types";

// All 13 defined roles
export const ALL_ROLES: UserRole[] = [
  "Sectional Engineer",
  "Deputy Engineer",
  "Executive Engineer",
  "Tender Clerk",
  "Auditor",
  "Accountant",
  "Assistant Accounts Officer",
  "Chief Accounts and Finance Officer",
  "Additional Chief Executive Officer",
  "Chief Executive Officer",
  "System Administrator",
  "Contractor",
  "Technical System Configurator",
];

// All roles except Contractor and Technical System Configurator
// (operational/government staff who access the main project workflow)
const OPERATIONAL_ROLES: UserRole[] = [
  "Sectional Engineer",
  "Deputy Engineer",
  "Executive Engineer",
  "Tender Clerk",
  "Auditor",
  "Accountant",
  "Assistant Accounts Officer",
  "Chief Accounts and Finance Officer",
  "Additional Chief Executive Officer",
  "Chief Executive Officer",
  "System Administrator",
];

/**
 * Authoritative role-to-route mapping.
 * Source of truth for ProtectedRoute allowedRoles on every dashboard page.
 */
export const ROUTE_ROLES = {
  // ── Universal ────────────────────────────────────────────────────────────────
  dashboard:    ALL_ROLES,
  notifications: ALL_ROLES,
  search:       ALL_ROLES,

  // ── Project overview ─────────────────────────────────────────────────────────
  // All government/admin roles; Contractor has own portal; TSC has no project access
  allProjects:   OPERATIONAL_ROLES,
  projectDetail: OPERATIONAL_ROLES,

  // ── Project creation (SE only) ────────────────────────────────────────────────
  createProject: ["Sectional Engineer"] as UserRole[],
  savedDrafts:   ["Sectional Engineer"] as UserRole[],

  // ── Cost estimation list ──────────────────────────────────────────────────────
  costEstimation: [
    "Sectional Engineer",
    "Deputy Engineer",
    "Executive Engineer",
  ] as UserRole[],

  // ── DTP workflow ──────────────────────────────────────────────────────────────
  draftTenderPaper: [
    "Sectional Engineer",
    "Deputy Engineer",
    "Executive Engineer",
    "Tender Clerk",
  ] as UserRole[],

  // SE creates, DE verifies, EE approves
  createDtp: [
    "Sectional Engineer",
    "Deputy Engineer",
    "Executive Engineer",
  ] as UserRole[],

  // ── Verification (project technical review) ───────────────────────────────────
  verification: [
    "Deputy Engineer",
    "Executive Engineer",
  ] as UserRole[],

  // ── Tender workflow ───────────────────────────────────────────────────────────
  // TC prepares, EE verifies, CAFO approves, ACEO publishes
  createTender: [
    "Tender Clerk",
    "Executive Engineer",
    "Chief Accounts and Finance Officer",
    "Additional Chief Executive Officer",
  ] as UserRole[],

  tenderProcedure: [
    "Deputy Engineer",
    "Executive Engineer",
    "Tender Clerk",
    "Chief Accounts and Finance Officer",
  ] as UserRole[],

  technicalBid: [
    "Executive Engineer",
    "Tender Clerk",
  ] as UserRole[],

  financialBid: [
    "Executive Engineer",
    "Tender Clerk",
  ] as UserRole[],

  // ── GB Approval ───────────────────────────────────────────────────────────────
  // TC records GB Resolution, Approval Letter, L1 contractor and percentage after ACEO Financial Bid approval
  gbApproval: [
    "Tender Clerk",
    "Executive Engineer",
    "Additional Chief Executive Officer",
    "Chief Executive Officer",
  ] as UserRole[],

  // ── Award & execution ─────────────────────────────────────────────────────────
  // LOI chain: TC (Creator) → EE (Verify) → CAFO (Verify) → ACEO (Final Approval)
  letterOfAward: [
    "Tender Clerk",
    "Executive Engineer",
    "Chief Accounts and Finance Officer",
    "Additional Chief Executive Officer",
  ] as UserRole[],

  // Work Order list page — roles with WO in sidebar nav
  workOrderList: [
    "Deputy Engineer",
    "Executive Engineer",
    "Tender Clerk",
    "Chief Accounts and Finance Officer",
  ] as UserRole[],

  // Work Order detail — EE issues; DE/SE/TC can view; Contractor receives it
  workOrderDetail: [
    "Sectional Engineer",
    "Deputy Engineer",
    "Executive Engineer",
    "Tender Clerk",
    "Contractor",
  ] as UserRole[],

  // ── MB & Billing ──────────────────────────────────────────────────────────────
  // List: all roles who manage/review MBs (SE excluded from list nav but included for consistency)
  mbBillingList: [
    "Sectional Engineer",
    "Deputy Engineer",
    "Executive Engineer",
    "Auditor",
    "Accountant",
    "Assistant Accounts Officer",
    "Chief Accounts and Finance Officer",
    "Additional Chief Executive Officer",
    "Chief Executive Officer",
  ] as UserRole[],

  // Detail: adds Contractor (views/accepts their own MB)
  mbBillingDetail: [
    "Sectional Engineer",
    "Deputy Engineer",
    "Executive Engineer",
    "Auditor",
    "Accountant",
    "Assistant Accounts Officer",
    "Chief Accounts and Finance Officer",
    "Additional Chief Executive Officer",
    "Chief Executive Officer",
    "Contractor",
  ] as UserRole[],

  // ── Contractor portal (Contractor only) ───────────────────────────────────────
  contractorMyProjects:    ["Contractor"] as UserRole[],
  contractorMbVerification:["Contractor"] as UserRole[],
  contractorBillsPayments: ["Contractor"] as UserRole[],

  // ── Administration ────────────────────────────────────────────────────────────
  adminManagement:   ["System Administrator"] as UserRole[],
  chargesManagement: ["System Administrator"] as UserRole[],

  // System Admin manages config; TSC configures rate items and templates
  systemConfig:  ["System Administrator", "Technical System Configurator"] as UserRole[],
  templateEditor:["System Administrator", "Technical System Configurator"] as UserRole[],
  rateItemEditor:["System Administrator", "Technical System Configurator"] as UserRole[],
} as const;
