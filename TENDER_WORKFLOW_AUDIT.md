# IIWMS Workflow Audit Report — Post-Tender-Publication Phase

**Date:** 2026-06-22
**Scope:** Workflow from Tender Publication (ACEO approval) through LOI generation

---

## 1. Requirement Flow

```
ACEO approves Tender Publication
  └─ Status: "Tender Published"
  └─ Tender exported to MahaTender Portal

[EXTERNAL — no IIMS involvement]
  ├─ Bid Submission (by Contractors on MahaTender)
  ├─ Technical Evaluation (on MahaTender)
  ├─ Financial Evaluation (on MahaTender)
  └─ L1 Selection (on MahaTender)

[After external completion + Governing Body approval]
  └─ Tender Clerk opens a single IIMS submission screen:
       ┌──────────────────────────────────────────────┐
       │ 1. Upload GB Resolution Copy                 │
       │ 2. Upload Approval Letter                    │
       │ 3. Select L1 Contractor (dropdown)           │
       │ 4. Enter Above/Below Percentage (single)     │
       │ 5. Submit                                    │
       └──────────────────────────────────────────────┘
  └─ Status becomes: "Financial Bid Approved"

LOI generation becomes available
```

---

## 2. Current Implemented Flow

```
ACEO approves Tender Publication (stage-7d)
  └─ Status: "Tender Published" → Stage 8 (TC)

Stage 8 — Technical Bid Processing (TC)
  └─ TC opens Technical Bid screen (internal IIMS)
  └─ TC manages bidder list, EMD status, document status,
     qualification status inside IIMS
  └─ Action: "Forward Technical Bids for Review" → Stage 9 (EE)

Stage 9 — Technical Bid EE Review (EE)
  └─ Action: Forward to CAFO / Return to TC

Stage 10 — Technical Bid CAFO Review (CAFO)
  └─ Action: Forward to ACEO / Return to EE

Stage 11 — Technical Bid ACEO Approval (ACEO)
  └─ Action: Approve Technical Bids / Return to CAFO → Stage 12 (TC)

Stage 12 — Financial Bid Processing (TC)
  └─ TC opens Financial Bid screen (internal IIMS)
  └─ TC enters quoted percentage per bidder
  └─ L1 is auto-calculated by lowest percentage
  └─ TC uploads GB Resolution here
  └─ Action: "Forward Financial Bids for Review" → Stage 13 (EE)
     Status forwarded as: "Financial Bid - EE Review"

Stage 13 — Financial Bid EE Review (EE)
  └─ Action: Forward to CAFO / Return to TC

Stage 14 — Financial Bid CAFO Review (CAFO)
  └─ Action: Forward to ACEO / Return to EE

Stage 15 — Financial Bid ACEO Review (ACEO)
  └─ Action: "Forward for L1 Selection" → Stage 16 (TC)

Stage 16 — L1 Selection & GB Resolution (TC)
  └─ TC action maps to /letter-of-award/[id]
  └─ Action: "Forward for LOI Approval" → Stage 17 (EE)
     Status: "Financial Bid Approved" ← assigned at Stage 17, not Stage 16

Stage 17 — LOI EE Review (EE)
  └─ Status: "Financial Bid Approved"
  └─ LOI flow begins
```

---

## 3. Missing Screens

| # | Missing Screen | Where Required |
|---|---|---|
| M-1 | **TC Post-Bidding Submission screen** — a single combined form with: GB Resolution upload, Approval Letter upload, L1 Contractor dropdown (from registered contractors), and a single Above/Below percentage field | After "Tender Published", before LOI chain |

The current implementation has no dedicated screen that matches the requirement. The `financial-bid-view.tsx` is a bid evaluation tool, not a post-bidding submission form. The `letter-of-award/loa-view.tsx` does have L1 display, but it is the LOI screen — not the pre-LOI TC submission screen.

### Required TC Submission Screen Fields

```
┌─────────────────────────────────────────────────┐
│ GB Resolution Copy          [Upload / Drag-drop] │
│ Approval Letter             [Upload / Drag-drop] │
│ L1 Contractor               [Dropdown]           │
│ Above / Below Percentage    [Number input + %]   │
│                             [Submit]             │
└─────────────────────────────────────────────────┘
```

The L1 Contractor dropdown should be populated from registered Contractors in the system — not calculated from internal bid data. The Above/Below percentage is a single field entered manually, reflecting the outcome recorded on MahaTender.

---

## 4. Incorrect Screens

| # | Screen | File | Why Incorrect |
|---|---|---|---|
| I-1 | **Technical Bid Screen** | `components/technical-bid/technical-bid-view.tsx` | Full internal Technical Bid evaluation UI (bidder list, EMD status, document status, qualification) exists inside IIMS. Per requirement: Technical Evaluation is entirely external on MahaTender. No Technical Bid screen should exist inside IIMS. |
| I-2 | **Financial Bid Screen** | `components/financial-bid/financial-bid-view.tsx` | Acts as an internal Financial Evaluation tool — TC enters quoted percentages per bidder and L1 is auto-calculated. Per requirement: Financial Evaluation is external. The screen should instead be a post-external-completion submission form (documents + single L1 dropdown + single percentage entry). |

---

## 5. Incorrect Actions

| # | Stage | Action ID | Implemented As | Should Be |
|---|---|---|---|---|
| A-1 | Stage 8 (TC) | `tc-forward-tech-bid` | "Forward Technical Bids for Review" → EE | No action; stage should not exist inside IIMS |
| A-2 | Stage 9 (EE) | `ee-forward-tech-to-cafo` | "Forward to CAFO" | Stage should not exist |
| A-3 | Stage 9 (EE) | `ee-return-tech-bid` | "Return to TC" | Stage should not exist |
| A-4 | Stage 10 (CAFO) | `cafo-forward-tech-to-aceo` | "Forward to Additional CEO" | Stage should not exist |
| A-5 | Stage 10 (CAFO) | `cafo-return-tech-bid` | "Return to EE" | Stage should not exist |
| A-6 | Stage 11 (ACEO) | `aceo-approve-tech-bid` | "Approve Technical Bids" | Stage should not exist |
| A-7 | Stage 11 (ACEO) | `aceo-return-tech-bid` | "Return to CAFO" | Stage should not exist |
| A-8 | Stage 12 (TC) | `tc-forward-fin-bid` | "Forward Financial Bids for Review" → EE | Replace with: TC submits post-external outcome form → sets status "Financial Bid Approved" → forwards to LOI EE |
| A-9 | Stage 13 (EE) | `ee-forward-fin-to-cafo` | "Forward to CAFO" | Stage should not exist |
| A-10 | Stage 13 (EE) | `ee-return-fin-bid` | "Return to TC" | Stage should not exist |
| A-11 | Stage 14 (CAFO) | `cafo-forward-fin-to-aceo` | "Forward to Additional CEO" | Stage should not exist |
| A-12 | Stage 14 (CAFO) | `cafo-return-fin-bid` | "Return to EE" | Stage should not exist |
| A-13 | Stage 15 (ACEO) | `aceo-forward-to-l1-selection` | "Forward for L1 Selection" | Stage should not exist |
| A-14 | Stage 15 (ACEO) | `aceo-return-fin-bid` | "Return to CAFO" | Stage should not exist |

---

## 6. Missing Statuses

| # | Required Status | When Required | Current State |
|---|---|---|---|
| S-1 | `"Tender Published"` as a **holding status** | Immediately after ACEO publishes tender — project waits here with no IIMS action until external process completes | Present as the status on Stage 8, but Stage 8 immediately gives TC an "Open Technical Bid" action instead of waiting |
| S-2 | `"Financial Bid Approved"` set **by TC submission** | After TC submits GB Resolution + Approval Letter + L1 + Percentage | Currently appears as the status on Stage 17 (LOI EE Review), not as a result of TC submission |

---

## 7. Required Changes

### 7.1 Workflow — `constants/workflow-transitions.ts`

| Change | Detail |
|---|---|
| **Remove** stages 8–11 | Technical Bid Processing → EE → CAFO → ACEO internal chain must be removed |
| **Remove** stages 12–15 | Financial Bid Processing → EE → CAFO → ACEO internal chain must be removed |
| **Remove or repurpose** stage 16 | "L1 Selection & GB Resolution" — replace with the correct TC post-bidding submission stage |
| **Add** TC post-bidding submission stage | After "Tender Published": TC single stage with action "Submit Financial Bid Outcome" → sets status "Financial Bid Approved" → forwards to LOI EE (current stage-17) |
| **Fix** status assignment on stage-17 | Keep "Financial Bid Approved" on LOI EE Review but ensure it is set by the TC submission action, not inherited arbitrarily |

### 7.2 Screens

| Change | Detail |
|---|---|
| **Remove** `components/technical-bid/technical-bid-view.tsx` | Entire screen must be removed; Technical Bid evaluation is external |
| **Remove** `components/financial-bid/financial-bid-view.tsx` | Replace with TC post-bidding submission form |
| **Remove** route `app/(dashboard)/technical-bid/[id]` | Route must be removed |
| **Remove** route `app/(dashboard)/financial-bid/[id]` | Route must be removed |
| **Create** TC Post-Bidding Submission screen | Fields: GB Resolution upload, Approval Letter upload, L1 Contractor dropdown, single Above/Below percentage input, Submit button |
| **Update** `project-details-view.tsx` FORM_STAGE_MAP | Remove stage-8 and stage-12 entries; map the new TC submission stage to the new screen |

### 7.3 Navigation Labels — `project-details-view.tsx`

| Current Label | Stage | Should Be |
|---|---|---|
| "Open Technical Bid" | stage-8 | Removed |
| "Open Financial Bid" | stage-12 | Removed |

---

## Impact Summary

| Category | Count |
|---|---|
| Stages to remove | 8 (stages 8, 9, 10, 11, 12, 13, 14, 15) |
| Stages to replace | 1 (stage 16 → TC post-bidding submission) |
| Screens to remove | 2 (`technical-bid-view`, `financial-bid-view`) |
| Routes to remove | 2 (`/technical-bid/[id]`, `/financial-bid/[id]`) |
| Screens to create | 1 (TC post-bidding submission screen) |
| Statuses to fix | 2 (`"Tender Published"` holding, `"Financial Bid Approved"` assignment point) |

---

*IIWMS Tender Workflow Audit — 2026-06-22*
