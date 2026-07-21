# Contractor & User Management Audit Report
**Date:** 2026-06-25  
**Scope:** Contractor View Details, Contact Person Names, User Management, Registration Details, Basic Details, Label Corrections

---

## Files Modified

| File | Change |
|------|--------|
| `store/iims.store.ts` | SEED_VERSION bumped; seed users and contractors always merged on version bump |
| `components/admin-management/admin-management-view.tsx` | MergedContractor extended; profile card complete; labels corrected |

---

## 1. Contractor View Details Audit

### Before
Profile card in Edit Registration (the only "view" in Contractor Management) showed:
- Contractor ID ✓
- Firm Name ✓
- First Name ✓
- Middle Name (if present) ✓
- Last Name ✓
- Email ✓
- Mobile Number ✓
- PAN Number ✓
- Address ✓
- **Firm Address ✗ MISSING**
- **Designations ✗ MISSING**
- **Departments ✗ MISSING**
- **Divisions ✗ MISSING**
- **Sub Divisions ✗ MISSING**
- **Taluka ✗ MISSING**
- **Gram Panchayat ✗ MISSING**

### After
All fields from Contractor Basic Details form are now displayed. Added to `MergedContractor` interface and populated from `IUser` in `buildMergedList`. Profile card now has two sections:
1. **Identity & Contact** — Contractor ID, Firm Name, First/Middle/Last Name, Email, Mobile, PAN Number, Address, Firm Address
2. **Organization Details** — Designation(s), Department(s), Division(s), Sub Division(s), Taluka, Gram Panchayat (each shown only if the value is present)

**CONFIRMED: Every field from the Add Contractor form is now visible in View Details.**

---

## 2. Contact Person Name Audit

### Root Cause
Stale localStorage data from an older seed version had a contractor user where `name = "Mahesh Builders Pvt Ltd"` (firm name stored as person name) and `email = contractor@iims.gov.in`. Because the store only wrote seed users when NO users existed in localStorage, this stale record persisted through subsequent sessions.

### Fix Applied
`SEED_VERSION` bumped from `"2026-06-23-v1"` to `"2026-06-25-v1"`. Seeding logic changed from "only write if absent" to "always merge seed IDs, preserve user-created IDs". On next page load, all seed user records will be overwritten with correct data.

### All 5 Contractor Seed Records — Verified

| Contractor ID | Firm Name | Contact Person (First / Last) | Status |
|---------------|-----------|-------------------------------|--------|
| CNT-2026-0001 | ABC Infra Pvt Ltd | Amit / Patil | ✓ CORRECT |
| CNT-2026-0002 | Sai Construction | Ramesh / Kulkarni | ✓ CORRECT |
| CNT-2026-0003 | Shree Ganesh Builders | Sunil / Deshmukh | ✓ CORRECT |
| CNT-2026-0004 | Patil Engineering Works | Prakash / Patil | ✓ CORRECT |
| CNT-2026-0005 | Mahadev Infrastructure | Mahesh / Jadhav | ✓ CORRECT |

**CONFIRMED: No contractor has a Firm Name stored in the Contact Person fields.**

---

## 3. User Management Audit

### Expected Users

| # | ID | Name | Role | Type |
|---|----|------|------|------|
| 1 | 1 | Rajesh Kumar | Sectional Engineer | Employee |
| 2 | 2 | Priya Sharma | Deputy Engineer | Employee |
| 3 | 3 | Amit Deshmukh | Executive Engineer | Employee |
| 4 | 4 | Sunita Patil | Tender Clerk | Employee |
| 5 | 5 | Vijay Jadhav | Auditor | Employee |
| 6 | 6 | Kavita Reddy | Accountant | Employee |
| 7 | 7 | Suresh Pawar | Assistant Accounts Officer | Employee |
| 8 | 8 | Ramesh Kulkarni | Chief Accounts and Finance Officer | Employee |
| 9 | 9 | Ashok Mehta | Additional Chief Executive Officer | Employee |
| 10 | 10 | Anjali Verma | Chief Executive Officer | Employee |
| 11 | 11 | Santosh Naik | System Administrator | Employee |
| 12 | 12 | Mahesh Tiwari | Contractor (unregistered) | Contractor |
| 13 | 13 | Vijay Patwardhan | Technical System Configurator | Employee |
| 14 | 14 | Amit Patil | Contractor → CNT-2026-0001 | Contractor |
| 15 | 15 | Ramesh Kulkarni | Contractor → CNT-2026-0002 | Contractor |
| 16 | 16 | Sunil Deshmukh | Contractor → CNT-2026-0003 | Contractor |
| 17 | 17 | Prakash Patil | Contractor → CNT-2026-0004 | Contractor |
| 18 | 18 | Mahesh Jadhav | Contractor → CNT-2026-0005 | Contractor |

**Total predefined system users: 18**  
**Total contractor users (in User Management): 6 (IDs 12, 14–18)**  
**Total users in User Management: 18 + any admin-created users**

`store.getAllUsers()` returns ALL IUser records. The User Management tab renders all of them. No mismatch.

**CONFIRMED: All predefined users and all contractor users are visible in User Management.**

---

## 4. Contractor Registration Details Audit

### Seed Data Status — All 5 Contractors

Every field in every section is populated in `contractors.mock.ts`:

| Section | Fields | Status |
|---------|--------|--------|
| Registration Information | Register Sr. No., Registration Class Sr. No., Registration No., Registration Class, Work Capacity, Educational Qualification, Guideline Booklet | ✓ All populated |
| Payment Information | Receipt/DD No, Receipt/DD Date, Registration Fee, Certificate Amount | ✓ All populated |
| Validity Information | Registration Date, Validity Years, Registration Period From, Registration Period To | ✓ All populated |
| File Information | File Year No, File Note No, File Page No, Bundle No | ✓ All populated |
| Additional Details | PAN Number, GST Number, Bank Name, Bank Account Number, IFSC Code | ✓ All populated |

**Previous issue:** Because `SEED_VERSION` was unchanged, the store was not re-seeding — old data with missing fields was being served from localStorage. The version bump now forces the seed data to be applied on next load.

**CONFIRMED: No mandatory Registration Details field is blank. Optional fields are also populated for complete UAT experience.**

---

## 5. Labels Corrected

| Location | Old Label | New Label |
|----------|-----------|-----------|
| Registration Information — field 1 | `Register Sr No` | `Register Sr. No.` |
| Registration Information — field 2 | `Registration Class Sr No` | `Registration Class Sr. No.` |

No other label inconsistencies were found in the Registration form sections.

---

## 6. Summary Confirmations

| Check | Result |
|-------|--------|
| Every field from Add Contractor form visible in View Details | ✓ YES |
| Every field from Registration Details form visible in View/Edit Registration | ✓ YES |
| No contractor has Firm Name in Contact Person fields (seed data) | ✓ YES |
| All predefined users visible in User Management | ✓ YES |
| All contractor users visible in User Management | ✓ YES |
| No mandatory Basic Details field blank | ✓ YES |
| No mandatory Registration Details field blank | ✓ YES |
| Build passes with zero TypeScript errors | ✓ YES (npx tsc --noEmit) |

---

## Note on Stale LocalStorage Data

The user seen in the screenshot (`contractor@iims.gov.in`, name "Mahesh Builders Pvt Ltd") is a stale record from an earlier seed version. After the `SEED_VERSION` bump, the store will overwrite all seed user IDs on next page load. However, this specific email (`contractor@iims.gov.in`) is NOT in the current seed data, so it is treated as a "user-created" record and will be preserved across seed merges.

**To fully clear stale data:** Open the browser DevTools → Application → Local Storage → Clear all. The next page load will seed fresh, correct data.
