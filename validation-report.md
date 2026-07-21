# IIMS — Email & Mobile Validation Report
**Date:** 2026-06-23  
**Build status:** TypeScript strict-mode — 0 errors

---

## 1. Files Modified

| File | Change |
|------|--------|
| `lib/validators.ts` | **New file** — common validation utilities |
| `app/login/page.tsx` | Applied validators to Password login, OTP login, Forgot Password flows |
| `components/layout/app-header.tsx` | Applied validator to Reset Password modal |
| `components/admin-management/admin-management-view.tsx` | Applied validators to User Creation and Contractor Creation/Edit forms |
| `components/system-config/system-config-view.tsx` | Applied validator to Official Email field |

---

## 2. Common Validators Added (`lib/validators.ts`)

### `validateEmail(value: string): string | null`
- Trims whitespace before testing
- Rejects values with embedded spaces
- Tests against `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$` (requires TLD of ≥ 2 chars)
- Returns `"Please enter a valid email address."` on failure, `null` on success

### `validateMobile(value: string): string | null`
- Trims whitespace before testing
- Must be exactly 10 digits (`/^\d{10}$/`)
- First digit must be 6, 7, 8, or 9 (`/^[6-9]/`)
- Returns `"Please enter a valid 10-digit mobile number."` on failure, `null` on success

### `validateContact(value: string): string | null`
- Detects type: contains `@` → delegates to `validateEmail`; all digits → delegates to `validateMobile`; neither → returns format error
- Returns `"Enter your email address or mobile number."` when empty
- Used in all OTP/contact entry flows

### `normaliseEmail(value: string): string`
- Trims + lowercases before storage
- Used in User and Contractor save handlers

### `sanitiseMobile(value: string): string`
- Strips all non-digit characters, caps at 10 chars
- Applied as `onChange` transformer on every mobile input

---

## 3. Screens Affected

| Screen | Fields Validated |
|--------|-----------------|
| Login — Password method | Email (`validateEmail`) |
| Login — OTP method | Email or Mobile (`validateContact`), digit-only filter + 10-char cap when typing mobile |
| Login — Forgot Password | Email or Mobile (`validateContact`), digit-only filter |
| Profile — Reset Password modal | Email or Mobile (`validateContact`), digit-only filter |
| System Administration — User Creation | Email (`validateEmail`), normalised on save |
| System Administration — Contractor Creation / Edit | Email (`validateEmail`) + Mobile (`validateMobile`), digit-only input filter, normalised on save |
| System Configuration — General Settings | Official Email (`validateEmail`, optional field) |

---

## 4. Validation Messages Implemented

| Condition | Message |
|-----------|---------|
| Empty email | `"Email address is required."` |
| Invalid email format | `"Please enter a valid email address."` |
| Empty mobile | `"Mobile number is required."` |
| Mobile not 10 digits | `"Please enter a valid 10-digit mobile number."` |
| Mobile first digit not 6–9 | `"Please enter a valid 10-digit mobile number."` |
| Empty OTP/contact field | `"Enter your email address or mobile number."` |
| OTP contact: neither email nor mobile | `"Enter a valid email address or 10-digit mobile number."` |

All messages appear as:
- **Toast errors** — for OTP/contact flows (single-field panels)
- **Inline field errors** — below the input with a red border + `AlertCircle` icon, for multi-field forms (User, Contractor, System Config)

---

## 5. Duplicate Email Prevention

| Location | Mechanism |
|----------|-----------|
| User Creation | `store.getAllUsers().find(u => u.email === normaliseEmail(data.email))` → toast error |
| Contractor Creation | `store.getAllContractors().find(c => c.email === normaliseEmail(data.email))` → toast error |
| User Edit | Not checked (intentional — editing email to an already-used address is prevented by unique email policy at the data layer) |

Both checks now compare against pre-normalised (trimmed + lowercased) emails, eliminating case-sensitivity bypass (e.g. `Admin@iims.gov.in` vs `admin@iims.gov.in`).

---

## 6. Test Scenarios

### Email Validation
| Input | Expected | Result |
|-------|----------|--------|
| `abc@example.com` | Valid | ✅ |
| `user.name@gmail.com` | Valid | ✅ |
| `abc` | "Please enter a valid email address." | ✅ |
| `abc@` | "Please enter a valid email address." | ✅ |
| `@gmail.com` | "Please enter a valid email address." | ✅ |
| `abc @gmail.com` (space before @) | "Please enter a valid email address." | ✅ |
| ` abc@gmail.com ` (leading/trailing spaces) | Trimmed → Valid | ✅ |
| `ABC@IIMS.GOV.IN` | Normalised to `abc@iims.gov.in` on save | ✅ |
| `(empty)` | "Email address is required." | ✅ |

### Mobile Validation
| Input | Expected | Result |
|-------|----------|--------|
| `9876543210` | Valid | ✅ |
| `8765432109` | Valid | ✅ |
| `6012345678` | Valid | ✅ |
| `1234567890` | "Please enter a valid 10-digit mobile number." (first digit 1) | ✅ |
| `5678901234` | "Please enter a valid 10-digit mobile number." (first digit 5) | ✅ |
| `98765` | "Please enter a valid 10-digit mobile number." (< 10 digits) | ✅ |
| `98765432101` | Capped to 10 digits by `sanitiseMobile` on input; cannot be submitted as 11-digit | ✅ |
| `98765abcd1` | Non-digits stripped by `sanitiseMobile` on input; never reaches validator as mixed | ✅ |
| `98-76543210` | Non-digits stripped by `sanitiseMobile` | ✅ |
| `(empty)` | "Mobile number is required." | ✅ |

### Duplicate Email
| Scenario | Expected | Result |
|----------|----------|--------|
| Create user with email that already exists (same case) | Toast: "A user with this email already exists." | ✅ |
| Create user with email that already exists (different case) | Toast: same (normalised comparison) | ✅ |
| Create contractor with duplicate email | Toast: "A contractor with this email already exists." | ✅ |

### OTP / Contact Field
| Input | Expected | Result |
|-------|----------|--------|
| `9876543210` (valid mobile) | OTP sent (mobile toast) | ✅ |
| `user@iims.gov.in` (valid email) | OTP sent (email toast) | ✅ |
| `98765` | Validator error | ✅ |
| `not-email-not-digits` | "Enter a valid email address or 10-digit mobile number." | ✅ |
| `(empty)` | "Enter your email address or mobile number." | ✅ |

---

## 7. Confirmation: All Modules Use Common Validation Utilities

Every email and mobile field in the application now routes through `lib/validators.ts`:

```
lib/validators.ts
  ├── validateEmail()   ← admin-management (User), admin-management (Contractor),
  │                        login (password flow), system-config (official email)
  ├── validateMobile()  ← admin-management (Contractor mobile)
  ├── validateContact() ← login (OTP flow), login (Forgot Password),
  │                        app-header (Reset Password)
  ├── normaliseEmail()  ← admin-management (User save), admin-management (Contractor save)
  └── sanitiseMobile()  ← admin-management (Contractor mobile input),
                           login (OTP contact input), login (Forgot contact input),
                           app-header (Reset Password contact input)
```

No inline regex patterns remain for email or mobile validation in any component file.
