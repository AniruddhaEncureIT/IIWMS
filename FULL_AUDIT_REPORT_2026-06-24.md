# IIMS Frontend — End-to-End Workflow Audit Report
**Date:** 2026-06-24  
**Auditor:** Senior Functional Architect / Product Auditor (AI-assisted)  
**Codebase:** `/Users/anikon/Downloads/IIWMS/Frontend/18062026/IIMS_UX4G`  
**Audit basis:** Implementation code vs. requirement document (20-page screenshot set, 2026-06-24)  
**Scope:** 11 modules — Cost Estimation, DTP, Tender Notice, Technical Bid, Financial Bid, GB Approval, LOA, Work Order, E-MB, Billing, Project Closure

---

## OVERALL VERDICT

> **NOT READY FOR UAT**

High-severity gaps exist in document enforcement, 5% bid threshold gating, notification infrastructure, terminology mismatch (LOA vs LOI), and role-scoped data access. These must be resolved before UAT begins.

---

## Summary Table

| ID | Severity | Module | Issue |
|----|----------|--------|-------|
| C1 | CRITICAL | Financial Bid / Work Order | No 5% above-estimate gate — bids >5% above TS can proceed unchecked |
| C2 | CRITICAL | GB Approval | GB Resolution document is not mandatory; TC can submit without uploading |
| C3 | CRITICAL | Billing (E-MB) | Notification system is not implemented — no in-system alerts for pending actions |
| H1 | HIGH | Technical Bid | Office Note text is not mandatory before TC forwards to EE |
| H2 | HIGH | Financial Bid | No minimum-bidders-with-percentage check — TC can forward with 0 percentage entries |
| H3 | HIGH | LOA / LOI | Module named "LOI" (Letter of Intent) throughout; requirement calls it "LOA" (Letter of Award) — UAT testers will be confused |
| H4 | HIGH | All Modules | Documents are optional at all stages — no upload validation on forward/approve actions |
| H5 | HIGH | All Modules | All roles see ALL projects on `/all-projects` — no division/sub-division or role-based data scoping |
| H6 | HIGH | MB-Billing | EE can approve MB with zero measurements — no check that MB has at least one measurement row |
| H7 | HIGH | Project Closure | After CEO approves "Bill Paid", project status is "Project Closed" but the project is NOT locked from further edits in all views |
| M1 | MEDIUM | Cost Estimation | No mandatory field validation on SE estimate submission (project name, work description, estimated amount can be blank) |
| M2 | MEDIUM | DTP | DTP sanctioned amount is not auto-fetched as Technical Sanction Amount in downstream modules |
| M3 | MEDIUM | Tender Notice | No check that DTP is "DTP Sanctioned" before allowing Tender Notice creation |
| M4 | MEDIUM | Technical Bid | Disqualified bidders still visible in Financial Bid bidder list (implementation may carry them over) |
| M5 | MEDIUM | Financial Bid | L1 comparative statement (abstract) is not a downloadable/printable document — requirement shows it as a generated report |
| M6 | MEDIUM | Work Order | Security deposit and performance guarantee are shown as "recommended" (≥5%) but not enforced — TC can submit below threshold |
| M7 | MEDIUM | MB-Billing | Auditor deduction fields default to 0% — no warning if all deductions are zero before forwarding to Accountant |
| M8 | MEDIUM | MB-Billing | MB approval chain does not display Auditor, Accountant, AAO, CAFO, ACEO, CEO names/timestamps in the Approval Progress visualizer |
| M9 | MEDIUM | Dashboard | SE dashboard "Active Projects" stat counts all non-draft projects regardless of whether SE created them |
| M10 | MEDIUM | Admin | Contractor designation list still defaults to `["Contractor"]` in seed data (user ID 12) — does not reflect the 18 updated designations |

---

## CRITICAL Issues

---

### C1 — Financial Bid / Work Order: No 5% Above-Estimate Gate

**Severity:** CRITICAL  
**Modules affected:** Financial Bid, Work Order  
**Requirement:** If the L1 bid percentage exceeds 5% above the Technical Sanction (estimated) amount, the work order cannot be issued without a separate GB resolution approving the excess. The EE or ACEO must be gated.  
**Implementation:** The Financial Bid view (`financial-bid-view.tsx`) calculates and displays the L1 bid amount and percentage above/below the estimate. However, there is no check anywhere in the approval chain (EE → CAFO → ACEO) that gates the action when L1 is >5% above estimate. The Work Order view also has no such gate.  
**Evidence:**
```ts
// financial-bid-view.tsx – handleForward() (line 411)
if (!hasAllPct) { toast.error(...); return; }
if (!l1) { toast.error(...); return; }
// ← No check for l1.pct > 5%
```
The Work Order view checks security deposit ≥5% (line 669) but not bid percentage.  
**Impact:** A 15% above-estimate bid can sail through EE → CAFO → ACEO → Work Order without any system block.  
**Fix:** In `financial-bid-view.tsx` `handleEEApprove()`, add:
```ts
if ((l1Bidder?.quotedPercentage ?? 0) > 5) {
  toast.error("L1 bid is >5% above estimate. A separate GB resolution is required before approval.");
  return;
}
```
Or at minimum display a mandatory confirmation dialog requiring remarks citing the GB resolution number.

---

### C2 — GB Approval: GB Resolution Document Not Mandatory

**Severity:** CRITICAL  
**Module:** GB Approval  
**Requirement:** The GB Resolution Copy and Approval Letter must both be uploaded before the GB Approval can be submitted. These documents are the legal basis for issuing the LOI.  
**Implementation:** `gb-approval-view.tsx` `handleSubmit()` (line 220) validates only that `selectedContractor` is filled and a valid percentage is entered. It saves `gbResolutionDoc` and `approvalLetterDoc` as optional (`buildDoc(gbResDoc)` can return `undefined`). There is no guard preventing submission without documents.  
**Evidence:**
```ts
// gb-approval-view.tsx handleSubmit() line 220–231
if (!selectedContractor.trim()) { toast.error(...); return; }
// ← No check for !gbResDoc or !approvalLetterDoc
const gbApprovalData: IGBApprovalData = {
  gbResolutionDoc: buildDoc(gbResDoc),   // ← can be undefined
  approvalLetterDoc: buildDoc(approvalLetterDoc), // ← can be undefined
```
**Impact:** LOI can be issued without any documentary proof of GB approval. This is a legal and audit compliance failure.  
**Fix:**
```ts
if (!gbResDoc) { toast.error("GB Resolution Copy is required."); return; }
if (!approvalLetterDoc) { toast.error("Approval Letter is required."); return; }
```

---

### C3 — No Notification System Implemented

**Severity:** CRITICAL  
**Modules affected:** All (cross-cutting)  
**Requirement:** At every workflow stage transition, the next approver should receive an in-system notification (and optionally email/SMS) alerting them of a pending action. The notification inbox/bell should show unread count.  
**Implementation:** A `/notifications` route and `notifications-view.tsx` component exist, but:
- `INotification` type is not defined in `types/iims.types.ts`
- No `addNotification()` or `getNotifications()` method exists in `iims.store.ts`
- No workflow action (`forwardProject`, `approveProject`, `rejectProject`) calls a notification function
- The notification bell in the layout presumably renders an empty or static list

**Impact:** Approvers have no in-system alert mechanism. They must manually check `/all-projects` to discover pending work. This is a critical gap for a workflow management system intended for UAT with real roles.  
**Fix:** Add `INotification` to types, implement `addNotification()` in store, and call it from `forwardProject()`, `rejectProject()`, and `approveProject()` targeting the `toRole` or returning role.

---

## HIGH Issues

---

### H1 — Technical Bid: Office Note Not Mandatory

**Severity:** HIGH  
**Module:** Technical Bid  
**Requirement:** The Office Note (summary/recommendation) is a mandatory document that the Tender Clerk must fill before forwarding for EE review.  
**Implementation:** `technical-bid-view.tsx` `handleForward()` (line 513) validates bidder count and qualification status but does not validate whether `officeNote` text is non-empty.  
**Evidence:**
```ts
if (bidders.length === 0) { toast.error(...); return; }
if (qualified.length === 0) { toast.error(...); return; }
if (pending.length > 0) { toast.error(...); return; }
// ← No check: if (!officeNote.trim())
```
**Fix:** Add `if (!officeNote.trim()) { toast.error("Office note is required before forwarding."); return; }` before the `forwardProject` call.

---

### H2 — Financial Bid: Forward Possible with Zero Percentages

**Severity:** HIGH  
**Module:** Financial Bid  
**Requirement:** All technically qualified bidders must have their financial bid percentage entered before the TC can forward for EE review.  
**Implementation:** `handleForward()` (line 411) checks `hasAllPct` which should enforce this. However, the `hasAllPct` variable is computed over `qualifiedBidders` — if the bidder list from Technical Bid carries over bidders whose `quotedPercentage` field is `undefined` or the field is not initialised, the check may pass with empty values.  
**Risk:** Low-risk if Technical Bid properly seeds `quotedPercentage: ""` for each bidder, but this is worth a regression test.  
**Fix:** Confirm `hasAllPct` guards: `bidders.every(b => b.quotedPercentage !== "" && b.quotedPercentage !== undefined)`.

---

### H3 — LOA vs LOI Terminology Mismatch

**Severity:** HIGH  
**Module:** LOA / Letter of Award  
**Requirement:** The requirement document consistently uses "LOA" (Letter of Award). The IIMS workflow standard terminology is LOA.  
**Implementation:** All code, routes, and UI labels use "LOI" (Letter of Intent):
- Route: `/letter-of-award/[id]` (URL is correct but the module internally says LOI)
- `loa-view.tsx`: UI title "Letter of Intent", references `LOI/${year}/${id}`
- `work-order-view.tsx`: `genLOIRef()`, "LOI Reference"
- `workflow-transitions.ts`: Stage names include "LOI" (stages 19–22)

**Impact:** UAT testers and end-users trained on the requirement document will look for "LOA" and find "LOI". This will generate confusion and bug reports during UAT, potentially blocking sign-off.  
**Fix:** Global rename: LOI → LOA across all labels, function names, and toast messages. Keep backward-compat status strings (e.g., "LOA - EE Review") in workflow-transitions.ts. Or decide on one term with stakeholder sign-off before UAT.

---

### H4 — Documents Are Optional Across All Modules

**Severity:** HIGH  
**Module:** Technical Bid, Financial Bid, LOA, Work Order, E-MB  
**Requirement:** Each module requires mandatory document uploads at specific stages (e.g., comparative statement in Financial Bid, office note in Technical Bid as a file, signed Work Order copy, MB book scan, etc.).  
**Implementation:** All `FileUploadZone` components are purely optional. No module enforces document upload before forwarding:
- Technical Bid: `handleForward()` — no document check
- Financial Bid: `handleForward()` — no document check
- LOA: `handleSubmitForEE()` — no document check
- Work Order: `handleIssue()` — no document check
- GB Approval: `handleSubmit()` — no document check (see C2 for GB resolution specifically)

**Fix:** For each module, identify which documents are mandatory per stage and add guards in the forward/submit handlers.

---

### H5 — No Division/Role-Based Data Scoping

**Severity:** HIGH  
**Module:** All Projects list, all role dashboards  
**Requirement:** Each user should see only projects from their assigned division/sub-division. A DE from Pune Division should not see or act on projects from Nashik Division.  
**Implementation:**
- `getPendingForRole()` in `dash-shared.tsx` filters by status string matching the role but returns ALL matching projects across ALL divisions
- `/all-projects` page shows every project in localStorage regardless of logged-in user's division
- `store.getAllProjects()` has no division filter
- SE isolation exists for `forwardProject()` (line 233) — only checks `createdBy` — but DE, EE, CAFO, ACEO, CEO, Auditor, Accountant, AAO all act on all projects

**Impact:** Multi-division deployments (even with two demo users in different divisions) will cross-contaminate project lists and actions.  
**Fix:** Add `user.division`-based filtering to `getPendingForRole()` and `getAllProjects()`, or at minimum to the `pendingProjects` lists shown on dashboards.

---

### H6 — EE Can Approve MB with Zero Measurements

**Severity:** HIGH  
**Module:** E-MB (Measurement Book)  
**Requirement:** A Measurement Book must have at least one measurement entry with a non-zero quantity and amount before it can be verified by DE and approved by EE.  
**Implementation:** `mb-billing-view.tsx` `handleAction("verify-de")` (line 825): validates role and status via `validateMBVerify()` but does not check `mb.measurements.length > 0` or `mb.totalWorkAmount > 0`. An SE can create an empty MB with zero total and forward it.  
**Fix:**
```ts
// In handleAction(), before verify-de:
if ((freshMb.measurements?.length ?? 0) === 0) {
  toast.error("MB must have at least one measurement entry.");
  return;
}
if ((freshMb.totalWorkAmount ?? 0) <= 0) {
  toast.error("Total work amount must be greater than zero.");
  return;
}
```

---

### H7 — Project Not Fully Locked After CEO Approval

**Severity:** HIGH  
**Module:** Project Closure  
**Requirement:** After CEO approves the bill ("Bill Paid"), the project must be locked — no further edits to MB, measurements, deductions, or project details should be possible.  
**Implementation:** CEO approval sets `mb.locked = true` on the specific MB record (line 1092). However:
- The project's other MBs can still be edited/created by SE
- The project-details view does not check for project closure and may still show action buttons
- No check in `store.createMB()` or `forwardProject()` that blocks actions on closed projects

**Fix:** Add a project-level `locked` flag. In `createMB()` and all workflow actions, check `if (project.status === "Project Closed") return { ok: false, error: "Project is closed." }`.

---

## MEDIUM Issues

---

### M1 — Cost Estimation: No Mandatory Field Validation on Submission

**Severity:** MEDIUM  
**Module:** Cost Estimation (Create Project)  
**Issue:** SE can submit a project with blank `projectName`, empty work description, or zero `estimatedAmount`. No server-side or store-level validation exists.  
**Fix:** Add validation in the create-project submit handler requiring: `projectName`, `workDescription`, `estimatedAmount > 0`, `division`, `subDivision`.

---

### M2 — DTP Sanctioned Amount Not Auto-fetched Downstream

**Severity:** MEDIUM  
**Module:** DTP → Tender, Technical Bid  
**Requirement:** Once DTP is sanctioned (EE approves), the `sanctionedAmount` should be auto-populated as the `estimatedAmount` used in subsequent calculations (EMD = 2% of TS amount, contractor class thresholds).  
**Implementation:** `create-dtp-view.tsx` calculates EMD, fee, and class from `project.estimatedAmount`. But there is no field `project.technicalSanctionAmount` being set when DTP is sanctioned. The `totalBudget()` helper in `dash-shared.tsx` uses `p.technicalSanctionAmount ?? p.estimatedAmount` — `technicalSanctionAmount` is referenced but never set by the DTP workflow.  
**Fix:** In `create-dtp-view.tsx` DTP sanction action, set `technicalSanctionAmount` on the project: `store.updateProject(id, { technicalSanctionAmount: form.estimatedAmount })`.

---

### M3 — Tender Notice Accessible Without DTP Sanctioned

**Severity:** MEDIUM  
**Module:** Tender Notice  
**Requirement:** Tender publication should only be possible after DTP is sanctioned (status = "DTP Sanctioned").  
**Implementation:** No guard in `create-tender-view.tsx` checks that `project.dtpData?.status === "DTP Sanctioned"` before allowing tender creation.  
**Fix:** Add a prerequisite banner/gate: if DTP is not sanctioned, show a locked state with a message "DTP must be sanctioned before publishing the tender notice."

---

### M4 — Disqualified Bidders Visible in Financial Bid

**Severity:** MEDIUM  
**Module:** Financial Bid  
**Requirement:** Only technically qualified bidders should participate in the financial bid evaluation.  
**Implementation:** The Financial Bid view filters qualified bidders from `tenderData.technicalBid.bidders` (those with `technicalEligibilityStatus === "Qualified"`). Disqualified bidders are shown in a separate "Disqualified" section for information. This appears mostly correct, but the `qualifiedBidders` array must be confirmed to be the only list shown in the percentage-entry table.  
**Status:** Mostly implemented — verify that `buildPayload()` in financial-bid-view only includes `qualifiedBidders` in the saved `financialBid.qualifiedBidders` array.

---

### M5 — L1 Comparative Statement Not Downloadable/Printable

**Severity:** MEDIUM  
**Module:** Financial Bid  
**Requirement:** The comparative statement showing all bidder percentages and L1 determination must be downloadable as a PDF for physical file submission.  
**Implementation:** The L1 card and ranked bidder table are displayed on-screen (good). However, there is no "Download as PDF" or "Print" action for the comparative statement.  
**Fix:** Add a print-friendly CSS class or a `react-to-print` / `jspdf` export for the comparative statement section.

---

### M6 — Security Deposit and Performance Guarantee Not Enforced

**Severity:** MEDIUM  
**Module:** Work Order  
**Requirement:** Security Deposit must be at least 5% of contract amount. Performance Guarantee must be at least 5% of contract amount.  
**Implementation:** `work-order-view.tsx` (line 669) shows a checklist with `done: sdAmt > 0 && (sdAmt / amt) >= 0.049` and displays "(below 5% recommended)" warnings. But `handleIssue()` does not block submission if either is below 5%.  
**Fix:** In `handleIssue()`, add hard blocks:
```ts
if (sdAmt / amt < 0.05) { toast.error("Security Deposit must be ≥5% of contract amount."); return; }
if (pgAmt / amt < 0.05) { toast.error("Performance Guarantee must be ≥5% of contract amount."); return; }
```

---

### M7 — Auditor Can Submit Zero Deductions Without Warning

**Severity:** MEDIUM  
**Module:** Billing (E-MB)  
**Requirement:** Auditor must enter deductions before forwarding to Accountant. All-zero deductions are only acceptable with an explicit remark explaining the reason.  
**Implementation:** `forward-auditor` action (line 916) computes deductions via `calcDeductions(audDedState, ...)` and allows forwarding with all zeros. No warning or mandatory remark is required if `ded.total === 0`.  
**Fix:** If `ded.total === 0`, require a mandatory remark field: "All deductions are zero — please provide a reason in the remarks field."

---

### M8 — MB Approval Chain Visualizer Missing Later Stages

**Severity:** MEDIUM  
**Module:** Billing (E-MB)  
**Requirement:** The approval chain should show all stages with completion timestamps: SE → DE → Contractor → EE → Auditor → Accountant → AAO → CAFO → ACEO → CEO.  
**Implementation:** `mb-billing-view.tsx` `ApprovalChain` component uses `CHAIN_STEPS = ["SE", "DE", "Contractor", "EE", "Auditor", "Accountant", "AAO", "CAFO", "ACEO", "CEO"]` (line referenced in summary). The status footer (line 1156) only shows `createdBy`, `deVerifiedBy`, `acceptedByContractor`, `eeVerifiedBy` — the Auditor, Accountant, AAO, CAFO, ACEO, CEO completion timestamps are tracked on the MB object (`auditorVerifiedAt`, `accountantVerifiedAt`, etc.) but are NOT displayed in the footer.  
**Fix:** Add corresponding display rows for all 10 stages in the Approval Progress footer.

---

### M9 — SE Dashboard "Active Projects" Counts All Projects

**Severity:** MEDIUM  
**Module:** SE Dashboard  
**Requirement:** SE dashboard should show only the SE's own projects (created by them).  
**Implementation:** `se-dashboard.tsx` (line 25): `active = allProjects.filter(p => ...)` — counts all non-draft projects across all SEs in all divisions.  
**Fix:** Filter: `allProjects.filter(p => p.createdBy === name && ...)`.

---

### M10 — Seed Contractor User Still Has `designations: ["Contractor"]`

**Severity:** MEDIUM  
**Module:** Admin — Contractor Management  
**Requirement:** Contractor designation was expanded to 18 options (alphabetically sorted). The seed contractor user (id: "12") should have an appropriate designation from the new list.  
**Implementation:** `users.mock.ts` line 143: `designations: ["Contractor"]` — "Contractor" is not in the new 18-option designation list. When this user's profile is displayed in the registration form, the designation chip will not match any valid option.  
**Fix:** Update seed user id "12" `designations` to `["Contractor General Works"]` (or whichever from the 18 options best fits).

---

## Module-by-Module Workflow Conformance

| Module | Workflow Chain | Role Actions | Status Transitions | Documents | Verdict |
|--------|---------------|--------------|-------------------|-----------|---------|
| Cost Estimation | SE creates → DE reviews → EE sanctions | ✓ Implemented | ✓ Draft → Pending DE → Pending EE → DTP Sanctioned | N/A | **PASS with M1** |
| DTP | SE → DE → EE (3 steps) | ✓ Implemented | ✓ | Upload optional | **PASS with M2, M3** |
| Tender Notice | TC creates/publishes | ✓ Implemented | ✓ | Optional | **PASS with M3** |
| Technical Bid | TC → EE → CAFO → ACEO | ✓ Full chain | ✓ | Optional | **PASS with H1, H4** |
| Financial Bid | TC → EE → CAFO → ACEO | ✓ Full chain | ✓ L1 auto-rank | Optional | **FAIL — C1, H2, H4** |
| GB Approval | TC records offline outcome | ✓ TC-only | ✓ → Financial Bid Approved | **NOT ENFORCED** | **FAIL — C2** |
| LOA (LOI) | TC → EE → CAFO → ACEO → TC (WO) | ✓ Full chain | ✓ | Optional | **FAIL — H3, H4** |
| Work Order | TC → EE → CAFO → ACEO → WO Issued | ✓ Full chain | ✓ | Optional | **FAIL — C1, H4, M6** |
| E-MB | SE → DE → Contractor → EE | ✓ Implemented | ✓ | Optional | **FAIL — H6** |
| Billing | EE → Auditor → Accountant → AAO → CAFO → ACEO → CEO | ✓ Full chain | ✓ Net payable calculated | — | **PASS with M7, M8** |
| Project Closure | CEO → "Project Closed" + MB locked | ✓ Implemented | ✓ | — | **FAIL — H7, C3** |

---

## Positive Findings (What Works Well)

- **Technical Bid validation** is thorough: bidder count check, ≥1 qualified, no Under Review bidders — all enforced before forwarding.
- **Financial Bid L1 determination** is correctly auto-computed by sorting quoted percentages; L1 card displayed prominently.
- **MB billing chain** (SE → DE → Contractor → EE → Auditor → Accountant → AAO → CAFO → ACEO → CEO) is fully implemented with appropriate role checks and status transitions.
- **Contractor acceptance** flow (accept vs. reject) correctly routes back to DE on rejection.
- **Measurement Book auto-calculation**: L × B × H = Quantity is computed client-side; amounts calculated from rate.
- **Auditor deduction panel**: percentage fields (IT, GST, Labour Cess) and fixed amounts (SD, Mob Advance, Penalty) are correctly implemented with net payable derivation.
- **Work Order 5% SD/PG recommendation**: system shows checklist item and percentage helper buttons — good UX even if not enforced.
- **Store role isolation for SE**: `forwardProject()` correctly blocks non-creator SEs from forwarding projects (line 233).
- **Contractor dashboard routes**: all three quick-action routes (`/contractor/my-projects`, `/contractor/mb-verification`, `/contractor/bills-payments`) exist as real pages.
- **GB Approval auto-fill**: L1 contractor and percentage pre-populated from Financial Bid result — good UX.

---

## Action Priority

| Priority | Issue IDs | Action |
|----------|-----------|--------|
| P0 — Before UAT | C1, C2, C3 | 5% gate, GB doc enforcement, notification system |
| P1 — Sprint 1 | H1, H3, H4, H6, H7 | Office note mandatory, LOA rename, doc enforcement, MB zero-measurement guard, project lock |
| P2 — Sprint 2 | H2, H5, M1, M3, M6 | Financial bid pct check, data scoping, estimate validation, DTP gate, SD/PG enforcement |
| P3 — Sprint 3 | M2, M4, M5, M7, M8, M9, M10 | DTP TS amount propagation, comparative statement PDF, auditor zero-deduction warning, chain visualizer, SE dashboard scope, seed data fix |

---

*Report generated: 2026-06-24. All findings are based on code reading of the 18062026 build.*
