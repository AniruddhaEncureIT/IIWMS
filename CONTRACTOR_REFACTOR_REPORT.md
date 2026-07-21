# Contractor Management & Registration Flow — Refactor Report

## 1. Contractor Management Structure

### Separation of Concerns (strictly enforced)

| Concern | Location | Data Source |
|---|---|---|
| Identity & Login | User Management → Add Master User (User Type: Contractor) | `IUser` |
| Registration & Classification | Contractor Management | `IContractor` |

### Data Flow

```
IUser (role="Contractor" or userType="Contractor")
    └─ Profile: name, firmName, email, mobile, panNo, address
           ↕ linked by email or userId
IContractor
    └─ Registration: all registration fields + regStatus + history
```

### `buildMergedList()` Logic

1. For each IUser where role/userType = Contractor: find matching IContractor by `userId` or `email`
2. Profile comes from IUser; registration comes from matched IContractor
3. Remaining IContractor entries with no matching IUser (legacy seed data) appear as-is
4. No duplication — profile fields never stored twice

---

## 2. Registration Form Sections

### Registration Information
- Register Sr No
- Registration Class Sr No
- Registration No
- Registration Class (Class A / B / C / D)
- Work Capacity
- Educational Qualification
- Guideline Booklet

### Payment Information
- Receipt / DD No
- Receipt / DD Date
- Registration Fee
- Certificate Amount

### Validity Information
- Registration Date
- Validity Years
- Registration Period From
- Registration Period To

### File Information
- File Year No
- File Note No
- File Page No
- Bundle No

### Additional Details (preserved from existing)
- PAN Number (Registration Document)
- GST Number
- Bank Name
- Bank Account Number
- IFSC Code

### Registration Status (selector)
- Not Registered
- Active
- Expired
- Renewal Due
- Suspended

---

## 3. Fields Preserved

All existing `IContractorRegistration` fields retained:
- `registrationNumber` → mapped to "Registration No"
- `registrationClass` → mapped to "Registration Class"
- `validUpto` → auto-populated from "Registration Period To"
- `panNumber`, `gstNumber`, `address`, `bankName`, `bankAccountNumber`, `bankIfscCode`

New fields added:
- 17 new registration fields across 4 sections
- `regStatus: RegistrationStatus` on IContractor
- `history: IContractorHistoryEntry[]` on IContractor
- `userId?: string` on IContractor (link to IUser)

---

## 4. Files Modified

### `types/iims.types.ts`
- Added `RegistrationStatus` type union
- Added `IContractorHistoryEntry` interface
- Extended `IContractorRegistration` with 17 new fields
- Extended `IContractor` with `userId?`, `regStatus?`, `history?`

### `mock-data/contractors.mock.ts`
- Added `regStatus` to all 5 seed contractors
- Added initial history entries (Registration Created)
- Added `registrationPeriodTo` to match new validity fields

### `components/admin-management/admin-management-view.tsx`
- Added `useMemo` to React imports
- Added `RegistrationStatus`, `IContractorHistoryEntry` to type imports
- Added `Upload`, `UserCog` to Lucide imports
- Removed: `ContractorFormData`, `EMPTY_CONTRACTOR_FORM`, `ContractorModal`, `ContractorViewModal`, old `ContractorManagementTab`
- Added: `REG_STATUS_META`, `regStatusColor()`, `MergedContractor`, `buildMergedList()`, `RegFormData`, `EMPTY_REG_FORM`, `regFormFromRecord()`
- Added: `RegistrationModal` component
- Added: new `ContractorManagementTab({ onNavigateToUsers })`
- Updated: `AdminManagementView` renders `<ContractorManagementTab onNavigateToUsers={() => navigate("users")} />`

---

## 5. Test Scenarios

| Scenario | Expected | Result |
|---|---|---|
| TS build | 0 errors | ✅ 0 errors |
| Contractor Management tab loads | Shows merged list of IUser contractors + legacy IContractor seed data | ✅ |
| Seed contractors (no IUser) | Appear in list, profile shows IContractor data | ✅ |
| IUser contractors (created from User Management) | Appear in list, profile shows IUser data | ✅ |
| Click edit registration icon | Opens RegistrationModal | ✅ |
| Profile banner shows read-only data | name, firm, email, mobile, PAN, address — all locked | ✅ |
| "Edit Basic Details" button | Closes modal, navigates to User Management tab | ✅ (present only for users with userId) |
| Registration form — 4 sections visible | Registration Info, Payment Info, Validity Info, File Info | ✅ |
| Save registration (new) | Creates IContractor record with userId, adds "Registration Created" history | ✅ |
| Save registration (update) | Updates IContractor, appends history entry with action label | ✅ |
| History tab | Shows reversed history table (most recent first) | ✅ |
| Registration status badge | Reflects regStatus from IContractor | ✅ |
| Filters: class + status | Both filter correctly | ✅ |
| Info banner link | Navigates to User Management tab | ✅ |
| No "Add Contractor" button | Removed; guidance banner shown instead | ✅ |

---

## 6. Separation Confirmation

| Requirement | Status |
|---|---|
| User Management = Identity & Login | ✅ UserModal handles all identity fields |
| Contractor Management = Registration only | ✅ RegistrationModal handles only registration fields |
| Contractor Management never edits identity | ✅ Profile banner is read-only; "Edit Basic Details" redirects to User Management |
| No contractor dropdown in registration form | ✅ Admin navigates into a contractor record; no dropdown |
| Contractor list auto-includes User Management contractors | ✅ `buildMergedList()` reads IUser where role/userType=Contractor |
| No profile data duplication | ✅ Profile always sourced from IUser; registration sourced from IContractor |
| Legacy IContractor entries preserved | ✅ Entries without a matching IUser still appear in the list |
