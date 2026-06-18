import type { ITemplate } from "@/types/iims.types";

export const SEED_TEMPLATES: ITemplate[] = [
  {
    id: "TPL001",
    name: "DTP Template",
    type: "dtp",
    content: `DRAFT TENDER PAPER (DTP)

Zilla Parishad, Pune Division
Office of the Executive Engineer

Name of Work: {{PROJECT_NAME}}
Estimate Amount: ₹{{ESTIMATE_AMOUNT}}
Technical Sanction No.: {{TS_NUMBER}}
Technical Sanction Date: {{TS_DATE}}
Administrative Approval No.: {{AA_NUMBER}}
Administrative Approval Date: {{AA_DATE}}

GENERAL CONDITIONS OF CONTRACT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Completion Period: {{COMPLETION_PERIOD}}
2. Defect Liability Period (DLP): {{DLP_PERIOD}}
3. Payment Terms: {{PAYMENT_TERMS}}
4. Penalty Clause: {{PENALTY_CLAUSE}}

TENDER DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EMD Amount: ₹{{EMD_AMOUNT}}
Tender Fee: ₹{{TENDER_FEE}}
Class of Contractor: {{CLASS_OF_CONTRACTOR}}
Eligibility Criteria: {{ELIGIBILITY_CRITERIA}}

TECHNICAL SPECIFICATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SSR Reference: {{SSR_REFERENCE}}
DSR Reference: {{DSR_REFERENCE}}
Special Conditions: {{SPECIAL_CONDITIONS}}
Quality Standards: {{QUALITY_STANDARDS}}

Division: {{DIVISION}}
Sub-Division: {{SUB_DIVISION}}
Taluka: {{TALUKA}}
Gram Panchayat: {{GRAM_PANCHAYAT}}

Prepared by: {{PREPARED_BY}}
Date: {{PREPARED_DATE}}

Verified by: {{VERIFIED_BY}}
Date: {{VERIFIED_DATE}}

Sanctioned by: {{SANCTIONED_BY}}
Date: {{SANCTIONED_DATE}}
`,
  },
  {
    id: "TPL002",
    name: "Letter of Intent",
    type: "loa",
    content: `LETTER OF INTENT (LOI)

Zilla Parishad, Pune Division
Office of the Executive Engineer

No.: {{LOA_NUMBER}}
Date: {{ISSUE_DATE}}

To,
{{CONTRACTOR_NAME}}
{{CONTRACTOR_ADDRESS}}

Subject: Award of Contract for {{PROJECT_NAME}} — Reg.

Reference:
1. Tender Notice No. {{TENDER_ID}} dated {{PUBLISHING_DATE}}
2. Financial Bid opened on {{BID_END_DATE}}
3. Resolution of GB dated {{GB_RESOLUTION_DATE}}

Dear Sir/Madam,

With reference to the above, I am directed to inform you that your tender for the work mentioned below has been accepted by the competent authority.

WORK DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name of Work:       {{PROJECT_NAME}}
Contract Value:     ₹{{APPROVED_AMOUNT}}
Quoted Percentage:  {{QUOTED_PERCENTAGE}}% ({{ABOVE_BELOW}} estimate)
Completion Period:  {{COMPLETION_PERIOD}}
Commencement Date:  Within 7 days of receipt of Work Order

TERMS & CONDITIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. You are requested to deposit Security Deposit @ 5% of contract amount within 7 days.
2. Performance Guarantee @ 5% of contract amount to be submitted within 7 days.
3. Work shall be executed as per PWD specifications and SSR/DSR applicable.
4. The work shall be completed within the stipulated period.

Please acknowledge receipt of this letter.

Yours faithfully,

Executive Engineer
Pune Division, Zilla Parishad
`,
  },
  {
    id: "TPL003",
    name: "Work Order",
    type: "work_order",
    content: `WORK ORDER

Zilla Parishad, Pune Division
Office of the Executive Engineer

Work Order No.: {{WORK_ORDER_NUMBER}}
Date: {{ISSUE_DATE}}

To,
{{CONTRACTOR_NAME}}
{{CONTRACTOR_ADDRESS}}
GST No.: {{CONTRACTOR_GST}}

Subject: Issue of Work Order for {{PROJECT_NAME}} — Reg.

Reference:
1. LOA No. {{LOA_NUMBER}} dated {{LOA_DATE}}
2. Agreement No. {{AGREEMENT_NUMBER}} dated {{AGREEMENT_DATE}}

Sir/Madam,

You are hereby directed to commence the following work:

WORK DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name of Work:              {{PROJECT_NAME}}
Division:                  {{DIVISION}}
Sub-Division:              {{SUB_DIVISION}}
Taluka / Gram Panchayat:   {{TALUKA}} / {{GRAM_PANCHAYAT}}
Contract Amount:           ₹{{CONTRACT_AMOUNT}}
Completion Period:         {{COMPLETION_PERIOD}}
Commencement Date:         {{COMMENCEMENT_DATE}}
Work Completion Date:      {{WORK_COMPLETION_DATE}}
Security Deposit:          ₹{{SECURITY_DEPOSIT}}
Performance Guarantee:     ₹{{PERFORMANCE_GUARANTEE}}

STANDARD CLAUSES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{{WORK_ORDER_CLAUSES}}

Issued by: {{ISSUED_BY}}
Designation: Executive Engineer, Pune Division

Date: {{ISSUE_DATE}}
`,
  },
  {
    id: "TPL004",
    name: "MB Format",
    type: "mb",
    content: `MEASUREMENT BOOK (MB)

Zilla Parishad, Pune Division

MB Number:          {{MB_NUMBER}}
Project Name:       {{PROJECT_NAME}}
Work Order No.:     {{WORK_ORDER_NUMBER}}
Contractor:         {{CONTRACTOR_NAME}}
Record Entry Date:  {{RECORD_ENTRY_DATE}}

MEASUREMENT DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{{MB_MEASUREMENT_TABLE}}

FINANCIAL SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Work Amount:       ₹{{TOTAL_WORK_AMOUNT}}

DEDUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Income Tax (TDS) @2%:    ₹{{INCOME_TAX}}
GST TDS @2%:             ₹{{GST_TDS}}
Labour Cess @1%:         ₹{{LABOUR_CESS}}
Security Deposit @5%:    ₹{{SECURITY_DEPOSIT_DED}}
Mobilization Advance:    ₹{{MOBILIZATION_ADVANCE}}
Penalty:                 ₹{{PENALTY}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Deductions:        ₹{{TOTAL_DEDUCTIONS}}

NET PAYABLE:             ₹{{NET_PAYABLE}}

Prepared by (SE):  _____________________  Date: ____________
Verified by (DE):  _____________________  Date: ____________
Verified by (EE):  _____________________  Date: ____________
Accepted by Contractor: ______________    Date: ____________
`,
  },
  {
    id: "TPL005",
    name: "Sanction Letter",
    type: "sanction",
    content: `TECHNICAL SANCTION LETTER

Zilla Parishad, Pune Division
Office of the Executive Engineer

Reference No.: {{SANCTION_NUMBER}}
Date: {{SANCTION_DATE}}

To,
The Sectional Engineer,
{{SUB_DIVISION}}, Pune Division.

Subject: Grant of Technical Sanction for {{PROJECT_NAME}} — Reg.

Sir/Madam,

With reference to the estimate submitted by you, I am pleased to communicate the sanction of the competent authority to the following estimate:

SANCTION DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name of Work:                 {{PROJECT_NAME}}
Division:                     {{DIVISION}}
Sub-Division:                 {{SUB_DIVISION}}
Taluka / Gram Panchayat:      {{TALUKA}} / {{GRAM_PANCHAYAT}}
Major Head:                   {{MAJOR_HEAD_NAME}} ({{MAJOR_HEAD_CODE}})
Budget Department:            {{BUDGET_DEPARTMENT}}
Sanction Year:                {{SANCTION_YEAR}}
SSR Type / Year:              {{SSR_TYPE}} / {{SSR_YEAR}}

FINANCIAL DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Estimated Amount (Base):     ₹{{ESTIMATE_AMOUNT}}
Technical Sanction Amount:   ₹{{TECHNICAL_SANCTION_AMOUNT}}

CONDITIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. The work shall be executed strictly as per specifications.
2. Quality Control checks as per prescribed norms shall be maintained.
3. Variation, if any, beyond 10% shall require prior approval.

Sanctioned by: {{SANCTIONED_BY}}
Designation:   Executive Engineer, Pune Division
Date:          {{SANCTION_DATE}}
`,
  },
];
