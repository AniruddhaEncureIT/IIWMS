// ── User ───────────────────────────────────────────────────────────────────
export interface IUser {
  id: string;
  email: string;
  password: string;
  role: string;
  name: string;
  status: "Active" | "Inactive";
  division?: string;
  subDivision?: string;
  lastLogin?: string;
  // Extended profile fields
  userType?: "Employee" | "Contractor";
  firstName?: string;
  middleName?: string;
  lastName?: string;
  mobile?: string;
  address?: string;
  departments?: string[];
  designations?: string[];
  divisions?: string[];
  subDivisions?: string[];
  taluka?: string;
  gramPanchayat?: string;
  signatureUrl?: string;
  panNo?: string;
  firm?: string;
  firmAddress?: string;
}

// ── Document ───────────────────────────────────────────────────────────────
export interface IDocument {
  id: string;
  name: string;
  type: string;
  url?: string;
  uploadedAt: string;
  uploadedBy: string;
}

// ── Project Document Sets ───────────────────────────────────────────────────
export interface IProjectDocumentSets {
  drawings:      IDocument[];
  sitePhotos:    IDocument[];
  surveyReports: IDocument[];
}

// ── Project sub-entities ────────────────────────────────────────────────────
export interface ISubWork {
  id: string;
  name: string;
  category?: string;
  description?: string;
}

export interface ILeadStatement {
  id: string;
  materialName: string;
  sourceOfSupply: string;
  kilometer: number;
  calculation: number; // km × 150
}

export interface IRateAnalysis {
  id: string;
  itemNumber: string;
  itemDescription?: string;
  itemName?: string;
  materialComponents: number;
  laborComponents: number;
  machineryComponents: number;
  baseRate: number;
  totalRate: number; // material + labor + machinery + baseRate
  remarks?: string;
}

export interface IMeasurement {
  id: string;
  itemNumber: string;
  itemName: string;
  length: number;
  breadth: number;
  height: number;
  quantity: number; // length × breadth × height
  unit: "Cum" | "Sqm" | "RMT" | "Nos" | "MT" | "Ton" | string;
  rate: number;
  amount: number; // quantity × rate
}

// ── DTP ────────────────────────────────────────────────────────────────────
export interface IDTPData {
  id?: string;
  tsNumber?: string;
  tsDate?: string;
  aaNumber?: string;
  aaDate?: string;
  completionPeriod: string;
  dlpPeriod?: string;
  paymentTerms?: string;
  penaltyClause?: string;
  ssrReference?: string;
  dsrReference?: string;
  specialConditions?: string;
  qualityStandards?: string;
  emdAmount: number;
  tenderFee: number;
  classOfContractor: string;
  eligibilityCriteria: string;
  status: string;
  createdBy?: string;
  createdAt?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  sanctionedBy?: string;
  sanctionedAt?: string;
  remarks?: string;
  documents?: IDocument[];
}

// ── Tender ──────────────────────────────────────────────────────────────────
export interface IBidder {
  id: string;
  name: string;
  emdStatus: string;
  documentVerificationStatus: string;
  technicalEligibilityStatus: string;
  quotedPercentage?: number;
}

export interface ITechnicalBidData {
  bidders: IBidder[];
  officeNote: string;
  documents: IDocument[];
  status: string;
  approvedBy?: string;
}

export interface IFinancialBidData {
  qualifiedBidders: IBidder[];
  l1Bidder?: IBidder;
  l2Bidder?: IBidder;
  l3Bidder?: IBidder;
  officeNote: string;
  gbResolution?: IDocument;
  status: string;
  approvedBy?: string;
}

export interface IGBApprovalData {
  l1Contractor: string;
  aboveBelowPercentage: number;
  percentageType: "Above" | "Below" | "Equal";
  gbResolutionDoc?: IDocument;
  approvalLetterDoc?: IDocument;
  remarks?: string;
  submittedBy?: string;
  submittedAt?: string;
}

export interface ILOAData {
  l1Contractor: string;
  approvedPercentage: number;
  approvedAmount: number;
  completionPeriod: string;
  documents: IDocument[];
  status: string;
  issuedDate?: string;
  approvedBy?: string;
}

export interface ITenderGeneratedDocuments {
  tenderNotice?: IDocument;
  scheduleB?: IDocument;
  technicalSanction?: IDocument;
  abstract?: IDocument;
}

export interface ITenderData {
  tenderId: string;
  publishingDate: string;
  closingDate: string;
  bidStartDate: string;
  bidEndDate: string;
  preBidStartDate: string;
  preBidEndDate: string;
  tenderFee: number;
  emdAmount: number;
  classOfContractor: string;
  eligibilityCriteria: string;
  completionPeriod: string;
  status: string;
  createdBy?: string;
  createdAt?: string;
  eeApprovedBy?: string;
  cafoApprovedBy?: string;
  additionalCeoApprovedBy?: string;
  mahaTenderReferenceId?: string;
  generatedDocuments?: ITenderGeneratedDocuments;
  technicalBid?: ITechnicalBidData;
  financialBid?: IFinancialBidData;
  gbApproval?: IGBApprovalData;
  loa?: ILOAData;
}

// ── Work Order ──────────────────────────────────────────────────────────────
export interface IWorkOrderData {
  workOrderNumber?: string;
  workOrderId?: string;
  issueDate?: string;
  issuedDate?: string;
  l1Contractor?: string;
  l1BidAmount?: number;
  contractAmount: number;
  contractorGST?: string;
  contractorAddress?: string;
  completionPeriod: string;
  commencementDate?: string;
  workCompletionDate: string;
  securityDeposit: number;
  securityDepositPercentage?: number;
  performanceGuarantee?: number | IDocument;
  agreement?: IDocument;
  status: string;
  issuedBy?: string;
  clauses?: string;
  // new fields
  percentageType?: "Below" | "Above" | "Equal";
  bidPercentage?: number;
  demandDraftNumber?: string;
  demandDraftDate?: string;
  eeApprovedBy?: string;
  eeApprovedAt?: string;
}

// ── MB & Billing ────────────────────────────────────────────────────────────
export interface IMBMeasurement {
  id: string;
  itemNo: string;
  description: string;
  dateOfMeasurement: string;
  length: number;
  breadth: number;
  height: number;
  quantity: number;
  cumulativeQuantity: number;
  balanceQuantity: number;
  rate: number;
  itemAmount: number;
  runningBillTotal: number;
}

export interface IDeductions {
  incomeTax: number;
  gstTds: number;
  labourCess: number;
  securityDeposit: number;
  mobilizationAdvance: number;
  penalty: number;
  totalDeduction?: number;
}

export interface IMBData {
  id: string;
  mbNumber: string;
  recordEntryDate: string;
  measurements: IMBMeasurement[];
  deductions?: IDeductions;
  totalWorkAmount?: number;
  netPayable?: number;
  status: string;
  billType?: "First and Final Bill" | "RA Bill";
  acceptedByContractor?: boolean;
  currentApprover?: string;
  remarks?: string[];
  createdBy?: string;
  createdAt?: string;
  deVerifiedBy?: string;
  deVerifiedAt?: string;
  eeVerifiedBy?: string;
  eeVerifiedAt?: string;
  contractorAcceptedAt?: string;
  auditorVerifiedBy?: string;
  auditorVerifiedAt?: string;
  accountantVerifiedBy?: string;
  accountantVerifiedAt?: string;
  aaoVerifiedBy?: string;
  aaoVerifiedAt?: string;
  cafoVerifiedBy?: string;
  cafoVerifiedAt?: string;
  aceoVerifiedBy?: string;
  aceoVerifiedAt?: string;
  ceoApprovedBy?: string;
  ceoApprovedAt?: string;
  billPaidAt?: string;
  budgetHead?: string;
  locked?: boolean;
}

// ── History ─────────────────────────────────────────────────────────────────
export interface IProjectHistory {
  id: string;
  action: string;
  performedBy: string;
  performedAt: string;
  remarks?: string;
  fromStatus: string;
  toStatus: string;
}

// ── Project ─────────────────────────────────────────────────────────────────
export interface IProject {
  id: string;
  projectName: string;
  departmentName: string;
  workActivity: string;
  sanctionYear: string;
  dsrType?: string;
  ssrType: string;
  ssrYear: string;
  budgetDepartment: string;
  majorHeadName: string;
  majorHeadCode: string;
  division: string;
  subDivision: string;
  taluka: string;
  gramPanchayat: string;
  workDemandBy?: string;
  workDemandByDocument?: IDocument;
  workDescription?: string;
  status: string;
  currentStage: string;
  createdBy: string;
  createdAt: string;
  completedAt?: string;
  completionPercentage?: number;
  subWorks?: ISubWork[];
  leadStatements?: ILeadStatement[];
  rateAnalysis?: IRateAnalysis[];
  measurements?: IMeasurement[];
  documents?: IDocument[];
  documentSets?: IProjectDocumentSets;
  dtpData?: IDTPData;
  tenderData?: ITenderData;
  workOrderData?: IWorkOrderData;
  mbData?: IMBData[];
  history?: IProjectHistory[];
  estimatedAmount?: number;
  technicalSanctionAmount?: number;
  gstAmount?: number;
  draftData?: {
    currentStep?: number;
    generalDescription?: { technicalNotes: string; siteConditions: string; specialClauses: string };
    percentageCharges?: Array<{ id: string; type: string; percentage: number }>;
    uploadedProjectFileName?: string;
    isDataAutoFilled?: boolean;
    verificationChecked?: boolean;
  };
}

// ── Charge ──────────────────────────────────────────────────────────────────
export interface ICharge {
  id: string;
  type: string;
  percentage: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Rate Item ───────────────────────────────────────────────────────────────
export interface IRateItem {
  id: string;
  code: string;
  description: string;
  unit: string;
  rate: number;
  type: "SSR" | "DSR";
  year: string;
}

// ── Template ────────────────────────────────────────────────────────────────
export interface ITemplate {
  id: string;
  name: string;
  content: string;
  type: string;
}

// ── Contractor ──────────────────────────────────────────────────────────────

export type RegistrationStatus =
  | "Not Registered"
  | "Active"
  | "Expired"
  | "Renewal Due"
  | "Suspended";

export interface IContractorHistoryEntry {
  id:          string;
  date:        string;
  action:      string;
  performedBy: string;
}

export interface IContractorRegistration {
  // ── Core (kept for backwards compatibility)
  registrationNumber: string;
  registrationClass: "Class A" | "Class B" | "Class C" | "Class D";
  validUpto: string;
  panNumber?: string;
  gstNumber?: string;
  address?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfscCode?: string;

  // ── Registration Information
  registerSrNo?: string;
  registrationClassSrNo?: string;
  workCapacity?: string;
  educationalQualification?: string;
  guidelineBooklet?: string;

  // ── Payment Information
  receiptOrDDNo?: string;
  receiptOrDDDate?: string;
  registrationFee?: string;
  certificateAmount?: string;

  // ── Validity Information
  registrationDate?: string;
  validityYears?: string;
  registrationPeriodFrom?: string;
  registrationPeriodTo?: string;

  // ── File Information
  fileYearNo?: string;
  fileNoteNo?: string;
  filePageNo?: string;
  bundleNo?: string;
}

export interface IContractor {
  id: string;
  name: string;       // Full contact person name (firstName + middleName + lastName)
  firstName?: string;
  middleName?: string;
  lastName?: string;
  firmName: string;
  email: string;
  mobile: string;
  status: "Active" | "Inactive";
  createdAt: string;
  registration?: IContractorRegistration;
  // ── Extended
  userId?: string;
  regStatus?: RegistrationStatus;
  history?: IContractorHistoryEntry[];
}

// ── Admin entities ──────────────────────────────────────────────────────────
export interface IApprovalChain {
  id: string;
  workflow: string;
  steps: Array<{ order: number; role: string; action: string; canDelegate: boolean }>;
}

export interface IDocumentAccess {
  id: string;
  documentType: string;
  allowedRoles: string[];
  accessLevel: "Read" | "Write" | "Full";
}

export interface IOrganizationalUnit {
  id: string;
  name: string;
  type: "Division" | "Sub Division" | "Office";
  parentId?: string;
}
