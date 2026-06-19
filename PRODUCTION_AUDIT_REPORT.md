# IIWMS Frontend — Production Readiness Audit Report

**Codebase:** `/Users/anikon/Downloads/IIWMS/Frontend/18062026/IIMS_UX4G`
**Build Status:** ✅ Passes
**TypeScript:** ✅ Clean
**Date:** 2026-06-19
**Audited By:** Claude Code (Sonnet 4.6)

---

## Summary

| Severity | Count |
|---|---|
| 🔴 Critical | 5 |
| 🟠 High | 9 |
| 🟡 Medium | 10 |
| 🟢 Low | 7 |
| **Total** | **31** |

---

## Top 3 Must-Fix Before Any Real-User Deployment

1. **C-2 + C-3** — Replace `MockAuthRepository` + strip passwords from localStorage
2. **C-1** — Validate `callbackUrl` to prevent open redirect
3. **C-4** — Move cookie issuance to API route for `HttpOnly; Secure`

---

## 🔴 CRITICAL ISSUES (Production Blockers)

---

### C-1. Open Redirect Vulnerability After Login

**File:** `app/login/page.tsx` — line 220
**Area:** Security / Authentication

**Root Cause:**
`callbackUrl` query param is passed directly to `window.location.href` with no validation. An attacker can craft a URL like `/login?callbackUrl=https://evil.com` and after successful login the user is silently redirected off-domain.

```ts
const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
window.location.href = callbackUrl; // ← no validation
```

**Impact:** Credential phishing and session theft. A government system handling sensitive financial data is especially at risk.

**Recommended Fix:**
```ts
const raw = searchParams.get("callbackUrl") ?? "/dashboard";
const safe = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
window.location.href = safe;
```

---

### C-2. Mock Authentication Shipped to Production

**Files:**
- `services/auth.service.ts` — line 18
- `repositories/auth.repository.ts` — lines 24–86
- `mock-data/users.mock.ts` — entire file

**Area:** Security / Authentication

**Root Cause:**
`AuthService.getInstance()` is hardcoded to `new MockAuthRepository()`. All 13 user credentials (including `admin123`, `ceo123`, `contractor123`) are stored in plain text in `users.mock.ts`. The mock repository validates tokens by checking if they start with `"mock_access_"`. The store re-seeds `SEED_USERS` (containing passwords) into `localStorage` on every app load.

**Impact:** Anyone can construct a valid auth cookie from DevTools and gain full access as any role. Any user who opens DevTools can read all credentials.

**Recommended Fix:**
Replace `MockAuthRepository` with a real API repository. Gate mock data behind `NODE_ENV !== "production"` and remove `password` fields from `SEED_USERS` that are written to `localStorage`.

---

### C-3. User Passwords Persisted to localStorage

**File:** `store/iims.store.ts` — lines 39, 344–356
**Area:** Security / Data Integrity

**Root Cause:**
`ensureSeeded()` writes the full `SEED_USERS` array (which includes `password` fields) to `localStorage` under key `"iims-users"`. `createUser()` also stores user objects with the `password` field. Any JavaScript running on the page can read all stored passwords.

**Impact:** Full credential exposure via `localStorage.getItem("iims-users")`. Admin-created users also have plaintext passwords stored.

**Recommended Fix:**
Strip the `password` field before writing to `localStorage`:
```ts
SEED_USERS.map(({ password: _, ...u }) => u)
```
Remove `password` from `IUser` interface or make it `password?: never` in the store layer.

---

### C-4. Auth Cookie Is JavaScript-Readable (No HttpOnly)

**File:** `services/auth.service.ts` — line 34
**Area:** Security / Authentication

**Root Cause:**
The auth cookie is set via `document.cookie` from client-side JavaScript. JavaScript cannot set `HttpOnly`. The code even acknowledges this in a comment. The token is therefore accessible to any XSS attack.

**Impact:** Any XSS vector can steal the auth token and replay it to gain authenticated access.

**Recommended Fix:**
Move cookie issuance to a Next.js API route (`/api/auth/login`) using `cookies()` from `next/headers`, which can set `HttpOnly; Secure; SameSite=Strict`. The client POSTs credentials to the route; the route sets the cookie and returns user info.

---

### C-5. ESLint Disabled During Builds

**File:** `next.config.ts` — lines 4–6
**Area:** Build Quality

**Root Cause:**
`eslint: { ignoreDuringBuilds: true }` completely disables linting in CI/CD builds. Lint regressions, accessibility violations, and unsafe patterns are never caught automatically.

**Impact:** Every CI/CD build runs without lint checks. Security and quality regressions ship silently.

**Recommended Fix:**
Remove the `eslint.ignoreDuringBuilds` key (or set it to `false`) and fix all lint errors that surface.

---

## 🟠 HIGH PRIORITY ISSUES

---

### H-1. Duplicate Stage Numbers in Workflow Definition

**File:** `constants/workflow-transitions.ts` — lines 208, 236, 264, 293, 313, 341
**Area:** Workflow Transitions / Data Integrity

**Root Cause:**
`stage-7b`, `stage-7c`, `stage-7d` are assigned `stageNumber` values of 8, 9, and 10. The subsequent stages `stage-8`, `stage-9`, `stage-10` also have `stageNumber` 8, 9, 10 — three pairs of duplicated stage numbers.

**Impact:** Progress indicators and stage-based sorting display incorrect progress for all projects in the Tender phase. Sorting or deduplication by `stageNumber` silently discards stages.

**Recommended Fix:**
Renumber `stage-7b/c/d` as 7.1, 7.2, 7.3 (float) or shift all subsequent stage numbers up by 3 so all 33 stages have unique sequential integers.

---

### H-2. Work Order Rejection Self-Loops Back to EE (Stage 20)

**File:** `constants/workflow-transitions.ts` — line 624
**Area:** Workflow Transitions

**Root Cause:**
The `ee-return-wo` action in Stage 20 ("Work Order - EE Review") sets `nextStageId: "stage-20"` — pointing back to itself. EE rejection never reaches Tender Clerk for correction. Similarly, CAFO/ACEO rejection actions also reference `nextStageId: "stage-20"`.

**Impact:** Work Order rejection workflow is completely broken. Rejected Work Orders are stuck with EE permanently and can never return to the Tender Clerk.

**Recommended Fix:**
Add a TC Work Order preparation stage (`stage-19b`) and set `nextStageId: "stage-19b"` for EE, CAFO, and ACEO rejection actions in the Work Order workflow.

---

### H-3. Bell Icon Missing from Sidebar Icon Map

**File:** `components/layout/app-sidebar.tsx` — lines 25–29
**Area:** UI / Dead Code

**Root Cause:**
`shell-nav.ts` uses `icon: "Bell"` for the Notifications nav item. The `ICON_MAP` in `app-sidebar.tsx` does not include `Bell`. The fallback `ICON_MAP[item.icon] ?? LayoutDashboard` means Notifications renders a Dashboard grid icon instead.

**Impact:** All 13 roles see the wrong icon (Dashboard grid) on their Notifications navigation link.

**Recommended Fix:**
Import `Bell` from `lucide-react` in `app-sidebar.tsx` and add `Bell` to `ICON_MAP`.

---

### H-4. `refreshAuth()` Calls `repo.logout()` Instead of Token Refresh

**File:** `services/auth.service.ts` — line 66
**Area:** Authentication / State Management

**Root Cause:**
The `refreshAuth()` method calls `this.repo.logout()` under the comment "Notify backend to refresh tokens." This is semantically wrong — it calls the logout endpoint, not a token refresh endpoint.

**Impact:** When a real backend is wired, session refresh will actually log the user out server-side. Backend logs will show spurious logout calls on every refresh.

**Recommended Fix:**
Remove the backend call entirely from `refreshAuth()` (middleware handles cookie-based auth) or call `this.repo.refreshToken(token)` correctly.

---

### H-5. `submitDraft` Bypasses Workflow Role Validation

**File:** `store/iims.store.ts` — lines 314–330
**Area:** Authorization / Workflow Transitions

**Root Cause:**
`submitDraft()` directly sets `status: "Pending at Deputy Engineer"` without calling `validateForward()`. All other workflow transitions go through validation. Any role can call this method.

**Impact:** A Contractor or System Administrator who gets a project reference can bypass all role checks and push a Draft project to the Deputy Engineer queue.

**Recommended Fix:**
```ts
const user = this.getCurrentUser();
if (!user || user.role !== "Sectional Engineer") {
  return { ok: false, error: "Only Sectional Engineer can submit drafts." };
}
const validation = validateForward(user.role, "Draft", "Deputy Engineer");
if (!validation.ok) return validation;
```

---

### H-6. 4,295-Line Mock File Re-Serialized to localStorage on Every Boot

**File:** `mock-data/projects.mock.ts`
**Area:** Performance / State Management

**Root Cause:**
`ensureSeeded()` always re-writes the entire `SEED_PROJECTS` array to `localStorage` on every page load — a synchronous blocking operation on the main thread with deeply nested objects.

**Impact:** Freezes the UI on cold load. Especially severe on low-end government hardware and slow devices.

**Recommended Fix:**
Add a version stamp check:
```ts
if (localStorage.getItem("iims-seed-version") === CURRENT_VERSION) return;
// ... seed data ...
localStorage.setItem("iims-seed-version", CURRENT_VERSION);
```

---

### H-7. Base64 Logo Storage Risks localStorage Quota Exhaustion

**File:** `components/system-config/system-config-view.tsx` — lines 113–122
**Area:** Performance / Data Integrity

**Root Cause:**
Organisation logo uploads use `reader.readAsDataURL(file)` and store the full base64-encoded image in `localStorage`. Base64 increases file size by ~33%. Combined with seed data, the 5–10 MB browser quota can be exhausted.

**Impact:** After logo upload, `localStorage.setItem` throws `QuotaExceededError` silently — causing project data writes to fail without any user notification.

**Recommended Fix:**
Store logos in `IndexedDB` (handles large binary data) or upload to a CDN/object store via an API endpoint.

---

### H-8. Language Selector Is Completely Non-Functional

**Files:**
- `app/login/page.tsx` — lines 56–60, 259–269
- `components/layout/app-header.tsx` — line 81

**Area:** Accessibility / Compliance

**Root Cause:**
The language picker has no i18n library, no translation files, and no `lang` attribute update. `<html lang="en">` is hardcoded. Selecting Marathi or Hindi changes only a state variable with no visible effect.

**Impact:** Violates GIGW/UX4G government compliance requirement for Marathi language support. Screen readers mispronounce content. Creates a false affordance for users.

**Recommended Fix:**
Remove the language selector until i18n is implemented, or integrate `next-intl` with Marathi and Hindi translations.

---

### H-9. CAPTCHA Is Auto-Solved on Role Selection

**File:** `app/login/page.tsx` — line 180
**Area:** Security / Authentication

**Root Cause:**
`handleRoleSelect` calls `setCaptchaInput(captchaText)` — auto-filling the correct CAPTCHA answer when a role is selected. The entire login form can be submitted with a single click after role selection.

**Impact:** CAPTCHA provides zero bot protection. The security control is completely bypassed for all users.

**Recommended Fix:**
Remove `setCaptchaInput(captchaText)` from `handleRoleSelect`. Auto-fill should apply to email/password only; the user must type the CAPTCHA manually.

---

## 🟡 MEDIUM PRIORITY ISSUES

---

### M-1. Form Labels Not Associated with Inputs (WCAG Failure)

**File:** `components/create-project/step1-create-project.tsx` — lines 92, 106, 120+
**Area:** Accessibility

**Root Cause:**
`<label>` elements have no `htmlFor` attribute and corresponding `<input>`/`<select>` elements have no matching `id`. Clicking a label does not focus its input. Screen readers cannot associate labels with controls.

**Impact:** Fails WCAG 1.3.1 (Info and Relationships) and 4.1.2 (Name, Role, Value). Government sites must meet WCAG 2.1 AA minimum.

**Recommended Fix:**
Add `id` to each input and matching `htmlFor` to each label:
```tsx
<label htmlFor="projectName">Project Name</label>
<input id="projectName" ... />
```

---

### M-2. Role Selector Has No ARIA Roles

**File:** `app/login/page.tsx` — lines 316–357
**Area:** Accessibility

**Root Cause:**
Custom role dropdown built with `<div>` and `<button>` — no `role="listbox"`, no `aria-labelledby`, no `aria-controls`, no keyboard navigation (arrow keys).

**Impact:** Screen readers cannot identify the role selector's purpose or its options. Keyboard-only users cannot navigate it.

**Recommended Fix:**
Use Radix UI `Select` component (already a project dependency) which handles all ARIA roles and keyboard navigation automatically.

---

### M-3. `createObjectURL` Memory Leak in Upload Wizard

**Files:**
- `components/create-project/step1-create-project.tsx` — line 45
- `components/create-project/step7-upload-documents.tsx` — line 101

**Area:** Memory Leaks / Performance

**Root Cause:**
`URL.createObjectURL(f)` creates blob URLs for uploaded files. When the wizard unmounts mid-session (user navigates away without removing files), blob URLs are never revoked via `URL.revokeObjectURL`.

**Impact:** Memory grows unboundedly for operators who frequently open and close the create project wizard without completing it.

**Recommended Fix:**
Add cleanup `useEffect` in `create-project-wizard.tsx`:
```ts
useEffect(() => {
  return () => {
    wiz.documents.forEach(f => URL.revokeObjectURL(f.url));
    Object.values(wiz.documentSets).flat().forEach(f => URL.revokeObjectURL(f.url));
  };
}, []);
```

---

### M-4. `getDraftProjects` Uses Substring Match for Author Name

**File:** `store/iims.store.ts` — lines 301–307
**Area:** Data Integrity / Authorization

**Root Cause:**
`p.createdBy.includes(name)` is a substring match. A user named "Raj" would see drafts created by "Rajesh Kumar". A user whose name appears as a substring in another name would get incorrect results.

**Impact:** Draft projects from other users may be visible to the wrong Sectional Engineer.

**Recommended Fix:**
Use exact match `p.createdBy === name` or store and match on user ID instead of display name.

---

### M-5. `submitDraft` Returns `void` — No Error Signal to UI

**File:** `store/iims.store.ts` — line 314
**Area:** Error Handling

**Root Cause:**
Unlike `forwardProject`, `rejectProject`, and `approveProject` which all return `ActionResult`, `submitDraft` returns `void`. Failures (wrong status, wrong role) are silent — the UI gets no indication.

**Impact:** If submit fails silently, the user sees no error and believes the action succeeded.

**Recommended Fix:**
Change return type to `ActionResult` and return `{ ok: false, error: "..." }` on all failure paths.

---

### M-6. MB Workflow Validation Checks Wrong Status Strings

**File:** `constants/workflow-transitions.ts` — lines 1156–1173
**Area:** Workflow Transitions / Data Integrity

**Root Cause:**
`validateMBVerify` checks for `currentStatus === "Submitted to DE"` and `validateMBApprove` checks for `currentStatus === "Verified by DE"`. Neither string exists in the 33-stage `WORKFLOW_STAGES`. Actual stages use `"Pending Measurement Verification"` and `"Pending Measurement Approval"`.

**Impact:** DE verification and EE approval for all MB workflows always fail silently, completely blocking the MB/Billing phase.

**Recommended Fix:**
Align the status strings in `validateMBVerify` and `validateMBApprove` with the actual status values defined in `WORKFLOW_STAGES`.

---

### M-7. Nested `ProtectedRoute` — Double Auth Check Per Page

**Files:**
- `app/(dashboard)/layout.tsx`
- All `app/(dashboard)/*/page.tsx` files

**Area:** Route Protection / Performance

**Root Cause:**
`(dashboard)/layout.tsx` wraps all children in `<ProtectedRoute>`. Every individual page also wraps its content in `<ProtectedRoute allowedRoles={...}>`. Two auth checks run per page render.

**Impact:** Double spinner flash, double `useEffect` auth evaluation, double redirect chain on unauthenticated access.

**Recommended Fix:**
Remove the bare `<ProtectedRoute>` from `(dashboard)/layout.tsx` or consolidate role enforcement at one level only. Do not nest `ProtectedRoute` inside `ProtectedRoute`.

---

### M-8. `setTimeout` Not Cleared on Component Unmount

**Files:**
- `components/template-editor/template-editor-view.tsx` — line 374
- `components/system-config/config-tab.tsx` — line 195

**Area:** Memory Leaks

**Root Cause:**
`setTimeout(() => setSaved(false), 2500)` is called but the timer handle is not stored and cannot be cancelled. If the component unmounts within 2.5 seconds, a state update fires on an unmounted component.

**Impact:** Potential for subtle state bugs if components are quickly remounted.

**Recommended Fix:**
```ts
const timerRef = useRef<ReturnType<typeof setTimeout>>();
// in handleSave:
timerRef.current = setTimeout(() => setSaved(false), 2500);
// cleanup:
useEffect(() => () => clearTimeout(timerRef.current), []);
```

---

### M-9. Notifications Never Refresh During Session

**File:** `hooks/use-notifications.ts` — lines 582–608
**Area:** State Management

**Root Cause:**
`useMemo(() => generateNotifications(role), [role])` runs once on mount and never re-runs during the session. Forwarding a project does not remove it from the "action required" notifications list.

**Impact:** Users see stale "pending action" notifications even after completing workflow actions.

**Recommended Fix:**
Dispatch a custom event on store writes and subscribe in `useNotifications` to invalidate the memo, or use `useSyncExternalStore` to subscribe to localStorage changes.

---

### M-10. Inconsistent localStorage Keys — Raw Strings Scattered in Codebase

**Files:**
- `hooks/use-notifications.ts` — line 564 (`"iims-notif-read-ids"`)
- `hooks/use-global-search.ts` — line 228 (`"iims-search-recent"`)
- `components/system-config/system-config-view.tsx` — lines 11–13 (`"iims_org_logo"`, `"iims_org_logo_dark"`, `"iims_general_config"`)

**Area:** Data Integrity / Maintainability

**Root Cause:**
Multiple localStorage key strings defined as raw literals in individual files instead of referencing central `STORAGE_KEYS` / `STORE_KEYS` constants. `iims.store.ts` also redeclares its own `KEYS` object duplicating `STORE_KEYS`.

**Impact:** Key typos cause silent data loss. No single source of truth for all keys.

**Recommended Fix:**
Add all keys to `storage-keys.ts` and import everywhere. Delete the duplicate `KEYS` object in `iims.store.ts`.

---

## 🟢 LOW PRIORITY ISSUES

---

### L-1. `console.warn` Calls in Production Store Code

**Files:** `store/local-storage.store.ts` — line 36, `store/iims.store.ts` — line 71
**Area:** Build Quality

**Root Cause:** `console.warn(...)` called on localStorage write failures — visible in production DevTools.

**Impact:** Reveals internal implementation details and key names to users with DevTools open.

**Recommended Fix:** Wrap in `if (process.env.NODE_ENV !== "production")` or wire to an observability service.

---

### L-2. Hard Reload on Unauthorized Role (Not Just Unauthenticated)

**File:** `components/auth/protected-route.tsx` — lines 23, 28
**Area:** Route Protection / UX

**Root Cause:** Both unauthenticated and unauthorized (wrong role) redirects use `window.location.href` causing a full page reload even when the cookie is valid.

**Impact:** Unnecessary full reload for role errors; degraded UX with a full page flash.

**Recommended Fix:** For unauthorized (wrong role), use `router.replace(ROUTES.UNAUTHORIZED)` — soft navigation is sufficient since the cookie is still valid. Only use hard reload when clearing the auth cookie.

---

### L-3. `<html lang="en">` Hardcoded in Root Layout

**File:** `app/layout.tsx` — line 25
**Area:** Accessibility / Compliance

**Root Cause:** Root layout is a Server Component and cannot read client-side language state. `lang="en"` is static regardless of user language selection.

**Impact:** Screen readers mispronounce Marathi/Hindi content. GIGW compliance requires correct `lang` attribute.

**Recommended Fix:** Use Next.js internationalized routing with `lang` derived from the route segment, or implement `next-intl` which handles this automatically.

---

### L-4. `saved-drafts/page.tsx` Is a 707-Line Client Component

**File:** `app/(dashboard)/saved-drafts/page.tsx`
**Area:** Dead Code / Maintainability

**Root Cause:** Full view logic (delete modal, submit modal, filtering, sorting, project card rendering) is in a single page file — inconsistent with all other pages which extract logic to `components/` view files.

**Impact:** Cannot code-split or lazy-load page content. Harder to test and maintain.

**Recommended Fix:** Extract view logic to `components/saved-drafts/saved-drafts-view.tsx` following the `all-projects/page.tsx` → `all-projects-view.tsx` pattern.

---

### L-5. Two Parallel localStorage Store Abstractions

**Files:** `store/iims.store.ts`, `store/local-storage.store.ts`
**Area:** Maintainability / Dead Code

**Root Cause:** Two separate localStorage abstraction classes with overlapping responsibilities. `iims.store.ts` also redeclares its own `KEYS` constant duplicating `STORE_KEYS` from `storage-keys.ts`.

**Impact:** Unclear which store to use for new features. Two `store` exports with the same name imported from different paths.

**Recommended Fix:** Consolidate into one store or clearly document the separation: one low-level `LocalStorageAdapter` and one domain `IIMSStore` that uses the adapter.

---

### L-6. No `robots.txt` or Crawling Rules

**Root Cause:** No `public/robots.txt`, no `sitemap.xml`, no `noindex` headers configured.

**Impact:** Login page and other authenticated routes can be indexed by search engines.

**Recommended Fix:** Add `public/robots.txt` with `Disallow: /` for all authenticated paths.

---

### L-7. Admin-Created Users Have Plaintext Passwords in localStorage

**File:** `store/iims.store.ts` — line 343
**Area:** Security / Data Integrity

**Root Cause:** `createUser()` accepts `password` in the `Partial<IUser>` data and stores it as-is in `localStorage["iims-users"]` with no hashing.

**Impact:** Passwords for all admin-created users are visible in plain text via DevTools.

**Recommended Fix:** Remove `password` from the `IUser` interface used in the store or strip it before writing: `const { password: _, ...safeUser } = user`.

---

## Appendix — Files Audited

| File | Lines | Area |
|---|---|---|
| `middleware.ts` | 35 | Route Protection |
| `services/auth.service.ts` | 82 | Authentication |
| `components/providers/auth-provider.tsx` | 72 | State Management |
| `components/auth/protected-route.tsx` | 45 | Route Protection |
| `constants/route-roles.ts` | 171 | Authorization |
| `constants/workflow-transitions.ts` | 1200+ | Workflow |
| `store/iims.store.ts` | 494 | State Management |
| `store/local-storage.store.ts` | 50 | State Management |
| `app/login/page.tsx` | 492 | Authentication |
| `components/layout/app-header.tsx` | 500+ | UI |
| `components/layout/app-sidebar.tsx` | 200+ | UI |
| `components/layout/shell-nav.ts` | 122 | Navigation |
| `repositories/auth.repository.ts` | 84 | Authentication |
| `constants/storage-keys.ts` | 24 | Data Integrity |
| `types/auth.types.ts` | 50 | TypeScript |
| `types/iims.types.ts` | 360+ | TypeScript |
| `mock-data/projects.mock.ts` | 4295 | Performance |
| `mock-data/users.mock.ts` | 200+ | Security |
| `hooks/use-notifications.ts` | 600+ | State Management |
| `hooks/use-global-search.ts` | 250+ | State Management |
| `next.config.ts` | 20 | Build Quality |
| `package.json` | 58 | Build Quality |

---

*Report generated 2026-06-19 — IIWMS Frontend Production Readiness Audit*
