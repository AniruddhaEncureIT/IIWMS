# IIWMS Full Functional Workflow Audit Report
**Date:** 2026-06-24  
**Role:** Senior Functional Architect & Product Auditor  
**Scope:** Full 11-module workflow vs. requirement document — two full passes  
**Verdict at bottom**

---

## CRITICAL ISSUES — ALL RESOLVED

### C1 — LOI ACEO Approval: `forwardProject` used instead of `approveProject`
**File:** `components/letter-of-award/loa-view.tsx`  
**Root Cause:** Stage-19 (`actionType: "approve"`) was called via `store.forwardProject`. `validateForward` rejects approve-type actions → LOI issuance silently fails.  
**Fix Applied:** Changed to `store.approveProject(project.id, "Work Order - TC Preparation", remarks)` ✓

---

### C2 — Work Order ACEO Approval: same `forwardProject` vs. `approveProject` mismatch
**File:** `components/work-order/work-order-view.tsx`  
**Root Cause:** Stage-22 (`actionType: "approve"`) was called via `store.forwardProject` → Work Order issuance silently fails.  
**Fix Applied:** Changed to `store.approveProject(project.id, "Work Order Issued", remarks)` ✓

---

### C3 — CEO MB Approval: status string `"Project Closed"` ≠ workflow stage `"Project Completed"`
**File:** `components/mb-billing/mb-billing-view.tsx:1132`  
**Root Cause:** Stage-33 has `status: "Project Completed"`. `validateApprove` found no matching action → CEO could not close any project.  
**Fix Applied:** Changed to `store.approveProject(project.id, "Project Completed", remark)` ✓

---

## HIGH ISSUES — ALL RESOLVED

### H1 — Technical Bid and Financial Bid modules appear editable but are bypassed
**Files:** `components/technical-bid/technical-bid-view.tsx`, `components/financial-bid/financial-bid-view.tsx`  
**Root Cause:** Bid evaluation is external (MahaTender). ACEO's tender publish skips stages 8–15 and jumps to stage-15b ("Pending GB Approval"). These pages remained visible and appeared interactive.  
**Fix Applied:** Amber reference-only informational banner added to both pages. `canEdit` was already false in the main flow (required statuses "Tender Published" and "Technical Bid Finalized" are never reached). ✓

---

### H2 — MB Billing chain labels inconsistent with project workflow statuses
**File:** `components/mb-billing/mb-billing-view.tsx`  
**Root Cause:** MB badge and Net Payable card subtitle showed raw internal `mb.status` strings ("Verified by ACEO") while project status said "Pending CEO Final Approval". Auditors reviewing the chain UI would flag the mismatch.  
**Fix Applied:** `mbStatusLabel()` mapping function added. All internal MB statuses now map to project workflow terminology. Applied at both display points. ✓

---

### H3 — `hasPendingActionForRole` broken for 8 of 10 roles in all-projects dashboard
**File:** `components/all-projects/all-projects-view.tsx` — line 101–132  
**Root Cause:** Status substring patterns used stale strings that did not match any actual `project.status` value from the workflow. Effect: "My Pending Actions" filter returned empty for SE (DTP/MB stages), DE, EE, TC, CAFO, ACEO, CEO, Accountant, AAO when they had live pending projects.

Examples of broken patterns vs. actual statuses:
| Role | Old pattern | Actual project.status |
|------|------------|----------------------|
| SE | `s === "draft"` only | Also: "Ready for DTP Preparation", "Work Order Issued" |
| DE | `s.includes("submitted to de")` | "Pending Deputy Engineer Review", "Pending DTP Review", "Pending Measurement Verification" |
| CAFO | `s.includes("pending cafo")` | "Tender Pending CAFO Review", "LOI - CAFO Review", "Work Order - CAFO Review", "Pending Bill Approval" |
| ACEO | `s.includes("approved by cafo")` | "Tender Pending ACEO Approval", "LOI - ACEO Approval", "Work Order - ACEO Approval", "Pending ACEO Bill Review" |
| CEO | `s.includes("approved by aceo")` | "Pending CEO Final Approval" |
| Accountant | `s.includes("pending accountant")` | "Ready for Billing" |
| AAO | `s.includes("pending aao")` | "Pending Bill Verification" |

**Fix Applied:** All 10 cases rewritten using exact workflow status strings from `workflow-transitions.ts`. ✓

---

### H4 — `FORM_STAGE_MAP` missing billing chain stages 25, 27–32 in project-details
**File:** `components/project-details/project-details-view.tsx` — `FORM_STAGE_MAP`  
**Root Cause:** Stages 25 (Contractor), 27 (Auditor), 28 (Accountant), 29 (AAO), 30 (CAFO), 31 (ACEO), 32 (CEO) had no entries. When these roles viewed project-details at their respective billing stage, StageActionsCard showed generic workflow action buttons instead of navigating to the MB billing form. Generic buttons advance `project.status` without updating `mb.status`, breaking the MB billing chain for all subsequent approvers.  
**Fix Applied:** All 7 missing stages added to `FORM_STAGE_MAP` pointing to `/mb-billing/${id}`. Navigation labels added for each. ✓

---

## MEDIUM ISSUES — ALL RESOLVED

### M1 — DTP summary strip shows "Estimated Amount" label
**File:** `components/create-dtp/create-dtp-view.tsx`  
**Fix:** Label changed to "Technical Sanction Amount"; value uses `project.technicalSanctionAmount ?? estimatedAmt`. ✓

### M2 — CEO history log entry uses "Project Closed" instead of "Project Completed"
**File:** `components/mb-billing/mb-billing-view.tsx:1135`  
**Fix:** `addHistory("Project Completed — Bill Paid & MB Locked", from, "Project Completed")`. ✓

### M3 — `getTenderClerkAction` TC quick-action buttons used unreachable project statuses
**File:** `components/all-projects/all-projects-view.tsx`  
**Root Cause:** "DTP Sanctioned" and "Tender Published" are never reached as `project.status` in the main flow. The LOI condition checked `tenderData.financialBid.status === "Approved by Additional CEO"` which is never set. TC saw no quick-action shortcuts from the project card list.  
**Fix Applied:** Conditions rewritten to use actual workflow project statuses:
- `"Ready for Tender Preparation"` → "Prepare Tender"
- `"Pending GB Approval"` → "Record GB Approval"
- `"Financial Bid Approved"` → "Issue Letter of Intent"
- `"Work Order - TC Preparation"` → "Prepare Work Order" ✓

---

## MODULE-BY-MODULE STATUS (Final)

| # | Module | Status |
|---|--------|--------|
| 1 | Cost Estimation (SE Wizard) | ✓ PASS |
| 2 | DTP | ✓ PASS |
| 3 | Tender Notice | ✓ PASS |
| 4 | Technical Bid | ✓ PASS — reference-only banner added; editing disabled by design |
| 5 | Financial Bid | ✓ PASS — reference-only banner added; editing disabled by design |
| 6 | GB Approval | ✓ PASS |
| 7 | LOI | ✓ PASS (C1 fixed) |
| 8 | Work Order | ✓ PASS (C2 fixed) |
| 9 | E-MB | ✓ PASS |
| 10 | Billing | ✓ PASS (H4 fixed — all billing roles routed to MB billing form) |
| 11 | Project Closure | ✓ PASS (C3 fixed) |

---

## WORKFLOW CHAIN VERIFICATION (Final)

| Stage | Status | ownerRole | Store call | Result |
|-------|--------|-----------|-----------|--------|
| stage-4 | Ready for DTP Preparation | SE | forwardProject (submit) | ✓ |
| stage-5 | Pending DTP Review | DE | forwardProject (forward) | ✓ |
| stage-6 | Pending DTP Approval | EE | approveProject (approve) | ✓ |
| stage-7 | Ready for Tender Preparation | TC | forwardProject (submit) | ✓ |
| stage-7b | Tender Pending EE Review | EE | forwardProject (forward) | ✓ |
| stage-7c | Tender Pending CAFO Review | CAFO | forwardProject (forward) | ✓ |
| stage-7d | Tender Pending ACEO Approval | ACEO | approveProject (approve) → Pending GB Approval | ✓ |
| stage-15b | Pending GB Approval | TC | forwardProject (submit) → Financial Bid Approved | ✓ |
| stage-16 | Financial Bid Approved | TC | forwardProject (forward) → LOI - EE Review | ✓ |
| stage-17–18 | LOI EE/CAFO review | EE/CAFO | forwardProject (forward) | ✓ |
| stage-19 | LOI - ACEO Approval | ACEO | approveProject (approve) → Work Order - TC Preparation | ✓ (C1 fixed) |
| stage-19b | Work Order - TC Preparation | TC | forwardProject (forward) | ✓ |
| stage-20–21 | WO EE/CAFO review | EE/CAFO | forwardProject (forward) | ✓ |
| stage-22 | Work Order - ACEO Approval | ACEO | approveProject (approve) → Work Order Issued | ✓ (C2 fixed) |
| stage-23–26 | MB creation and approval | SE/DE/Contractor/EE | MB form handles all | ✓ |
| stage-27–32 | Billing chain | Auditor→CEO | MB form routes (H4 fixed) | ✓ |
| stage-32→33 | CEO final approval | CEO | approveProject (approve) → Project Completed | ✓ (C3 fixed) |

---

## ALL FIXES APPLIED IN BOTH SESSIONS

| File | Fix | Severity |
|------|-----|----------|
| `components/letter-of-award/loa-view.tsx:591` | `forwardProject` → `approveProject("Work Order - TC Preparation")` | CRITICAL |
| `components/work-order/work-order-view.tsx:598` | `forwardProject` → `approveProject("Work Order Issued")` | CRITICAL |
| `components/mb-billing/mb-billing-view.tsx:1132` | `"Project Closed"` → `"Project Completed"` | CRITICAL |
| `components/mb-billing/mb-billing-view.tsx:1135` | History label updated to "Project Completed" | MEDIUM |
| `components/mb-billing/mb-billing-view.tsx:66` | `mbStatusLabel()` function added | HIGH |
| `components/technical-bid/technical-bid-view.tsx` | Reference-only amber banner added | HIGH |
| `components/financial-bid/financial-bid-view.tsx` | Reference-only amber banner added | HIGH |
| `components/create-dtp/create-dtp-view.tsx:574` | "Estimated Amount" → "Technical Sanction Amount" | MEDIUM |
| `components/all-projects/all-projects-view.tsx:101` | `hasPendingActionForRole` — all 10 role cases rewritten | HIGH |
| `components/all-projects/all-projects-view.tsx:155` | `getTenderClerkAction` — all conditions rewritten to actual statuses | MEDIUM |
| `components/project-details/project-details-view.tsx:383` | `FORM_STAGE_MAP` — stages 25, 27–32 added | HIGH |

---

## VERDICT

> **READY FOR UAT**
>
> All 3 CRITICAL and all 4 HIGH defects have been identified and fixed. All 3 MEDIUM issues have been resolved. The complete workflow chain from SE project creation through CEO project closure has been verified against the workflow-transitions.ts stage definitions. No Critical or High issues remain.
>
> **Pre-UAT smoke test recommended:** Create a new project as SE → DTP approval by EE → Tender creation by TC → ACEO publishes to GB Approval → TC records GB Approval → LOI approval chain → Work Order approval chain → SE creates MB → billing chain through CEO.
