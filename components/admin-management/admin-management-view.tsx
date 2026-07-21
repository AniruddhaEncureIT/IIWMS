"use client";

import { useState, useEffect, useCallback, useId, useRef, useMemo } from "react";
import { toast } from "sonner";
import {
  Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight, AlertCircle, X,
  Eye, EyeOff, Users, ShieldCheck, UserCheck, UserX, ChevronDown, Check,
  Crown, Shield, Building2, GitBranch, FileKey, Activity, Lock, Pencil,
  ChevronRight, AlertTriangle, Clock, CheckCircle2, ArrowRight, ArrowLeft,
  HardHat, Phone, Mail, Calendar, CreditCard, Landmark, Upload, UserCog,
} from "lucide-react";
import { store } from "@/store/iims.store";
import type { IUser, IContractor, IContractorRegistration, IContractorHistoryEntry } from "@/types/iims.types";
import type { UserRole } from "@/types/auth.types";
import { validateEmail, validateMobile, sanitiseMobile, normaliseEmail } from "@/lib/validators";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_ROLES: UserRole[] = [
  "Sectional Engineer", "Deputy Engineer", "Executive Engineer",
  "Tender Clerk", "Auditor", "Accountant", "Assistant Accounts Officer",
  "Chief Accounts and Finance Officer", "Additional Chief Executive Officer",
  "Chief Executive Officer", "System Administrator", "Contractor",
  "Technical System Configurator",
];

const ROLE_META: Record<string, { color: string; short: string; group: string; modules: string[] }> = {
  "Sectional Engineer":                { color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",  short: "SE",   group: "Engineering",   modules: ["Dashboard", "All Projects", "Cost Estimation", "Draft Tender Paper", "Notifications"] },
  "Deputy Engineer":                   { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",          short: "DE",   group: "Engineering",   modules: ["Dashboard", "All Projects", "Cost Estimation", "Draft Tender Paper", "Tender Procedure", "Work Order", "Notifications"] },
  "Executive Engineer":                { color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",  short: "EE",   group: "Engineering",   modules: ["Dashboard", "All Projects", "Cost Estimation", "Draft Tender Paper", "Tender Procedure", "Work Order", "MB & Billing", "Notifications"] },
  "Tender Clerk":                      { color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",          short: "TC",   group: "Administration", modules: ["Dashboard", "All Projects", "Draft Tender Paper", "Tender Procedure", "Work Order", "Notifications"] },
  "Auditor":                           { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",      short: "AUD",  group: "Finance",        modules: ["Dashboard", "All Projects", "MB & Billing", "Notifications"] },
  "Accountant":                        { color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",  short: "ACC",  group: "Finance",        modules: ["Dashboard", "All Projects", "MB & Billing", "Notifications"] },
  "Assistant Accounts Officer":        { color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", short: "AAO",  group: "Finance",        modules: ["Dashboard", "All Projects", "MB & Billing", "Notifications"] },
  "Chief Accounts and Finance Officer":{ color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300", short: "CAFO", group: "Finance",        modules: ["Dashboard", "All Projects", "MB & Billing", "Notifications"] },
  "Additional Chief Executive Officer":{ color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", short: "ACEO", group: "Executive",      modules: ["Dashboard", "All Projects", "Notifications"] },
  "Chief Executive Officer":           { color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",         short: "CEO",  group: "Executive",      modules: ["Dashboard", "All Projects", "Notifications"] },
  "System Administrator":              { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",             short: "SA",   group: "System",         modules: ["Dashboard", "Admin Management", "Charges Management", "System Config", "Template Editor", "Rate Item Editor", "Notifications"] },
  "Contractor":                        { color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",         short: "CON",  group: "External",       modules: ["Dashboard", "My Projects", "MB Verification", "Bills & Payments", "Notifications"] },
  "Technical System Configurator":     { color: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",     short: "TSC",  group: "System",         modules: ["Dashboard", "Rate Items", "Templates", "System Config", "Notifications"] },
};

const DIVISIONS = ["Pune Division", "Nashik Division", "Aurangabad Division", "Nagpur Division"];
const SUB_DIVISIONS = [
  "Khed Sub Division", "Haveli Sub Division", "Maval Sub Division",
  "Bhor Sub Division", "Junnar Sub Division", "Shirur Sub Division",
];

const DEPARTMENTS = [
  "General Administration",
  "Public Works (Roads & Bridges)",
  "Water Supply & Sanitation",
  "Primary Education",
  "Secondary Education",
  "Health & Family Welfare",
  "Agriculture",
  "Women & Child Development",
  "Finance & Accounts",
  "Social Welfare",
  "Rural Development",
  "Statistics",
  "Planning",
  "Animal Husbandry",
  "Fisheries",
];

const EMPLOYEE_DESIGNATIONS = ALL_ROLES.filter((r) => r !== "Contractor" && r !== "Technical System Configurator");

const CONTRACTOR_DESIGNATIONS = [
  "Additional CEO",
  "Admin",
  "Animal Husbandry",
  "Assistant Accountant Officer",
  "Auditor",
  "CEO",
  "Clerk",
  "Contractor",
  "Deputy Engineer",
  "Education Primary & Secondary",
  "Executive Engineer",
  "Health Department",
  "PBR",
  "Personal Accountant",
  "Project Officer",
  "Sectional Engineer",
  "W.C. Officer",
  "Women & Child Welfare",
];

const TALUKAS = [
  "Haveli", "Khed", "Maval", "Mulshi", "Bhor", "Velhe",
  "Purandar", "Indapur", "Baramati", "Daund", "Shirur",
  "Ambegaon", "Junnar",
];

const GRAM_PANCHAYATS: Record<string, string[]> = {
  Haveli:    ["Nanded", "Uruli Devachi", "Lohegaon", "Manjari", "Fursungi", "Khadki"],
  Khed:      ["Rajgurunagar", "Chakan", "Alandi", "Vadgaon Sheri", "Nighoje"],
  Maval:     ["Talegaon Dabhade", "Vadgaon Maval", "Pawna Nagar", "Kamshet"],
  Mulshi:    ["Paud", "Pirangut", "Lavale", "Mulshi"],
  Bhor:      ["Bhor", "Nasrapur", "Velha"],
  Velhe:     ["Velhe", "Ambe", "Panshet"],
  Purandar:  ["Saswad", "Jejuri", "Narayanpur", "Yavat"],
  Indapur:   ["Indapur", "Bhigwan", "Khamgaon"],
  Baramati:  ["Baramati", "Phaltan", "Morgaon"],
  Daund:     ["Daund", "Yevat", "Uruli Kanchan"],
  Shirur:    ["Shirur", "Ranjangaon", "Shikrapur"],
  Ambegaon:  ["Ghodegaon", "Manchar", "Narayangaon"],
  Junnar:    ["Junnar", "Otur", "Nimgaon"],
};

// ─── Section definition ───────────────────────────────────────────────────────

type AdminTab = "users" | "roles" | "hierarchy" | "approval-chains" | "document-access" | "activity-logs" | "contractors";

interface NavSection {
  id:          AdminTab;
  label:       string;
  description: string;
  icon:        React.ElementType;
}

const NAV_SECTIONS: NavSection[] = [
  { id: "users",           label: "User Management",          description: "Create, edit and manage user accounts",        icon: Users     },
  { id: "contractors",     label: "Contractor Management",    description: "Registered contractors and their details",      icon: HardHat   },
  { id: "roles",           label: "Role Management",          description: "View role permissions and module access",       icon: Shield    },
  { id: "hierarchy",       label: "Organizational Hierarchy", description: "Divisions, sub-divisions and offices",          icon: Building2 },
  { id: "approval-chains", label: "Approval Chains",          description: "Workflow sequences and approval steps",         icon: GitBranch },
  { id: "document-access", label: "Document Access",          description: "Role-based document permissions",              icon: FileKey   },
  { id: "activity-logs",   label: "System Activity Logs",     description: "Audit trail and system events",                icon: Activity  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function avatarColor(id: string) {
  const palette = ["bg-blue-500","bg-violet-500","bg-indigo-500","bg-teal-500","bg-green-500","bg-amber-500","bg-orange-500","bg-pink-500"];
  const n = id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  return palette[n % palette.length];
}

function fmtDate(s?: string) {
  if (!s) return "Never";
  return s.replace("T", " ").slice(0, 16);
}

function fmtTime(s?: string) {
  if (!s) return "—";
  try { return new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return s.slice(0, 16); }
}

// ─── Searchable Multi-Select ──────────────────────────────────────────────────

interface SearchableMultiSelectProps {
  id?: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

function SearchableMultiSelect({ id, options, selected, onChange, placeholder = "Search and select…", error, disabled }: SearchableMultiSelectProps) {
  const [query,  setQuery]  = useState("");
  const [open,   setOpen]   = useState(false);
  const [cursor, setCursor] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  const filtered = options.filter(
    (o) => o.toLowerCase().includes(query.toLowerCase()) && !selected.includes(o)
  );

  function select(val: string) {
    onChange([...selected, val]);
    setQuery("");
    setCursor(-1);
    inputRef.current?.focus();
  }

  function remove(val: string) {
    onChange(selected.filter((v) => v !== val));
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    if (e.key === "Enter" && cursor >= 0 && filtered[cursor]) { e.preventDefault(); select(filtered[cursor]); }
    if (e.key === "Escape") { setOpen(false); setCursor(-1); }
    if (e.key === "Backspace" && query === "" && selected.length > 0) {
      onChange(selected.slice(0, -1));
    }
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCursor(-1);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const borderCls = error
    ? "border-red-400 dark:border-red-600"
    : open
    ? "border-blue-500 ring-2 ring-blue-500/40"
    : "border-gray-200 dark:border-gray-600";

  return (
    <div className="relative" ref={containerRef}>
      <div
        className={`min-h-[42px] w-full rounded-lg border ${borderCls} bg-white dark:bg-gray-700 px-3 py-1.5 flex flex-wrap gap-1.5 items-center cursor-text transition-colors ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        onClick={() => { if (!disabled) { setOpen(true); inputRef.current?.focus(); } }}
      >
        {selected.map((val) => (
          <span key={val} className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shrink-0">
            {val}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); remove(val); }}
                className="text-blue-500 hover:text-blue-800 dark:hover:text-blue-200 focus:outline-none"
                aria-label={`Remove ${val}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          value={query}
          disabled={disabled}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setCursor(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          placeholder={selected.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[80px] text-sm text-gray-800 dark:text-gray-200 bg-transparent outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 py-1 disabled:cursor-not-allowed"
          autoComplete="off"
        />
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </div>

      {open && !disabled && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-lg max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 px-3 py-2.5 italic">
              {query ? `No results for "${query}"` : "All options selected"}
            </p>
          ) : (
            filtered.map((opt, idx) => (
              <button
                type="button"
                key={opt}
                onMouseDown={(e) => { e.preventDefault(); select(opt); }}
                onMouseEnter={() => setCursor(idx)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                  cursor === idx
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600/40"
                }`}
              >
                <Check className={`w-3.5 h-3.5 shrink-0 ${cursor === idx ? "text-blue-500" : "opacity-0"}`} />
                {opt}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const meta = ROLE_META[role] ?? { color: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300", short: "—" };
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${meta.color}`}>
      {role}
    </span>
  );
}

function StatusToggle({ active, onClick, disabled }: { active: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} title={active ? "Deactivate user" : "Activate user"}
      className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40"
          : "bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
      }`}>
      {active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
      {active ? "Active" : "Inactive"}
    </button>
  );
}

// ─── Section card wrapper ─────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, description, color = "blue" }: { icon: React.ElementType; title: string; description: string; color?: string }) {
  const bg: Record<string, string> = { blue: "bg-blue-50 dark:bg-blue-900/20", green: "bg-green-50 dark:bg-green-900/20", violet: "bg-violet-50 dark:bg-violet-900/20", amber: "bg-amber-50 dark:bg-amber-900/20", red: "bg-red-50 dark:bg-red-900/20" };
  const ic: Record<string, string> = { blue: "text-blue-600 dark:text-blue-400", green: "text-green-600 dark:text-green-400", violet: "text-violet-600 dark:text-violet-400", amber: "text-amber-600 dark:text-amber-400", red: "text-red-600 dark:text-red-400" };
  return (
    <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
      <div className={`w-8 h-8 rounded-lg ${bg[color] ?? bg.blue} flex items-center justify-center`}>
        <Icon className={`w-4 h-4 ${ic[color] ?? ic.blue}`} />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1: USER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

interface UserFormData {
  userType: "Employee" | "Contractor";
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  password: string;
  mobile: string;
  address: string;
  designations: string[];
  departments: string[];
  divisions: string[];
  subDivisions: string[];
  taluka: string;
  gramPanchayat: string;
  signatureUrl: string;
  // Contractor-specific
  panNo: string;
  firm: string;
  firmAddress: string;
  status: "Active" | "Inactive";
}

function splitName(name: string): [string, string, string] {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return [parts[0], "", ""];
  if (parts.length === 2) return [parts[0], "", parts[1]];
  return [parts[0], parts.slice(1, -1).join(" "), parts[parts.length - 1]];
}

function makeEmptyForm(userType: "Employee" | "Contractor" = "Employee"): UserFormData {
  return {
    userType,
    firstName: "", middleName: "", lastName: "",
    email: "", password: "", mobile: "", address: "",
    designations: userType === "Contractor" ? ["Contractor"] : [],
    departments: [], divisions: [], subDivisions: [],
    taluka: "", gramPanchayat: "", signatureUrl: "",
    panNo: "", firm: "", firmAddress: "",
    status: "Active",
  };
}

function UserModal({ user, onClose, onSave }: { user: IUser | null; onClose: () => void; onSave: (data: UserFormData, id?: string) => void }) {
  const isEdit = !!user;
  const uid = useId();

  const [form, setForm] = useState<UserFormData>(() => {
    if (!user) return makeEmptyForm("Employee");
    const [fn, mn, ln] = splitName(user.name);
    const uType = (user.userType ?? (user.role === "Contractor" ? "Contractor" : "Employee")) as "Employee" | "Contractor";
    return {
      userType:     uType,
      firstName:    user.firstName  ?? fn,
      middleName:   user.middleName ?? mn,
      lastName:     user.lastName   ?? ln,
      email:        user.email,
      password:     "",
      mobile:       user.mobile      ?? "",
      address:      user.address     ?? "",
      designations: user.designations ?? (user.role ? [user.role] : []),
      departments:  user.departments  ?? [],
      divisions:    user.divisions    ?? (user.division ? [user.division] : []),
      subDivisions: user.subDivisions ?? (user.subDivision ? [user.subDivision] : []),
      taluka:       user.taluka       ?? "",
      gramPanchayat:user.gramPanchayat ?? "",
      signatureUrl: user.signatureUrl  ?? "",
      panNo:        user.panNo         ?? "",
      firm:         user.firm          ?? "",
      firmAddress:  user.firmAddress   ?? "",
      status:       user.status,
    };
  });

  const [showPwd, setShowPwd] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState<Partial<Record<string, string>>>({});

  function set<K extends keyof UserFormData>(k: K, v: UserFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  }

  function switchType(t: "Employee" | "Contractor") {
    setForm((f) => ({
      ...makeEmptyForm(t),
      email:     f.email,
      password:  f.password,
      firstName: f.firstName,
      middleName:f.middleName,
      lastName:  f.lastName,
      mobile:    f.mobile,
      address:   f.address,
      status:    f.status,
    }));
    setErrors({});
  }

  function validate(): boolean {
    const e: Partial<Record<string, string>> = {};
    if (!form.firstName.trim()) e.firstName = "First name is required.";
    if (!form.lastName.trim())  e.lastName  = "Last name is required.";
    const emailErr = validateEmail(form.email);
    if (emailErr) e.email = emailErr;
    const mobileErr = validateMobile(form.mobile);
    if (mobileErr) e.mobile = mobileErr;
    if (!isEdit && !form.password.trim()) e.password = "Password is required for new users.";
    if (form.password && form.password.length < 6) e.password = "Password must be at least 6 characters.";
    if (form.designations.length === 0)  e.designations = "Select at least one designation.";
    if (form.departments.length === 0)   e.departments  = "Select at least one department.";
    if (form.divisions.length === 0)     e.divisions    = "Select at least one division.";
    if (form.subDivisions.length === 0)  e.subDivisions = "Select at least one sub-division.";
    if (form.userType === "Contractor" && !form.firm.trim()) e.firm = "Firm name is required.";
    if (form.userType === "Contractor" && !form.panNo.trim()) e.panNo = "PAN number is required.";
    if (form.userType === "Contractor" && form.panNo.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.panNo.trim()))
      e.panNo = "Invalid PAN format (e.g. ABCDE1234F).";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    try { onSave(form, user?.id); } finally { setSaving(false); }
  }

  const inputCls = (key: string) =>
    `w-full rounded-lg border ${errors[key] ? "border-red-400 dark:border-red-600" : "border-gray-200 dark:border-gray-600"} bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors`;

  const lbl = (text: string) => {
    const [base, req] = text.endsWith(" *") ? [text.slice(0, -2), true] : [text, false];
    return (
      <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
        {base}{req && <span className="text-red-500 ml-0.5">*</span>}
      </span>
    );
  };

  const errMsg = (key: string) =>
    errors[key] ? <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors[key]}</p> : null;

  const gramOptions = form.taluka ? (GRAM_PANCHAYATS[form.taluka] ?? []) : [];
  const designationOptions = form.userType === "Contractor" ? CONTRACTOR_DESIGNATIONS : EMPLOYEE_DESIGNATIONS;

  const secHd = (text: string) => (
    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-4">{text}</p>
  );

  const selectCls = "w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 transition";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">

      {/* Page header */}
      <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100 dark:border-gray-700">
        <button onClick={onClose} title="Back to user list"
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex-none">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            {isEdit ? <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" /> : <UserCog className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{isEdit ? "Edit Master User" : "Add Master User"}</h2>
            {isEdit && <p className="text-xs text-gray-400 mt-0.5 truncate">{user!.email}</p>}
          </div>
        </div>
        <p className="text-xs text-gray-400 shrink-0 hidden sm:block">
          User Management <span className="mx-1.5">/</span>
          <span className="font-medium text-gray-600 dark:text-gray-300">{isEdit ? "Edit User" : "Add User"}</span>
        </p>
      </div>

      {/* User Type Tabs */}
      <div className="px-6 pt-5">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700/60 rounded-xl p-1 border border-gray-200 dark:border-gray-700">
          {(["Employee", "Contractor"] as const).map((t) => (
            <button key={t} type="button" onClick={() => !isEdit && switchType(t)} disabled={isEdit}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all disabled:cursor-not-allowed ${
                form.userType === t
                  ? t === "Employee"
                    ? "bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-300 shadow-sm"
                    : "bg-white dark:bg-gray-700 text-teal-700 dark:text-teal-300 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}>
              {t === "Employee" ? <Users className="w-4 h-4" /> : <HardHat className="w-4 h-4" />}
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">

        {/* Personal Information */}
        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-5 space-y-4">
          {secHd("Personal Information")}
          <div className="grid grid-cols-3 gap-3">
            <div>
              {lbl("First Name *")}
              <input id={`${uid}-fn`} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="First name" className={inputCls("firstName")} />
              {errMsg("firstName")}
            </div>
            <div>
              {lbl("Middle Name")}
              <input id={`${uid}-mn`} value={form.middleName} onChange={(e) => set("middleName", e.target.value)} placeholder="Middle name" className={inputCls("middleName")} />
            </div>
            <div>
              {lbl("Last Name *")}
              <input id={`${uid}-ln`} value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Last name" className={inputCls("lastName")} />
              {errMsg("lastName")}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              {lbl("Email *")}
              <input id={`${uid}-email`} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="user@iims.gov.in" className={inputCls("email")} />
              {errMsg("email")}
            </div>
            <div>
              {lbl(isEdit ? "New Password (Leave Blank To Keep)" : "Password *")}
              <div className="relative">
                <input id={`${uid}-pwd`} type={showPwd ? "text" : "password"} value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder={isEdit ? "Enter to change…" : "Minimum 6 characters"}
                  className={`${inputCls("password")} pr-10`} />
                <button type="button" onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errMsg("password")}
            </div>
          </div>
          <div>
            {lbl("Mobile Number *")}
            <input id={`${uid}-mobile`} type="tel" inputMode="numeric" value={form.mobile}
              onChange={(e) => set("mobile", sanitiseMobile(e.target.value))}
              placeholder="10-digit mobile number" maxLength={10} className={inputCls("mobile")} />
            {errMsg("mobile")}
          </div>
        </div>

        {/* Address / Contractor Details */}
        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-5 space-y-4">
          {secHd(form.userType === "Contractor" ? "Contractor Details" : "Address")}
          <div>
            {lbl("Address")}
            <input id={`${uid}-address`} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Residential / Official address" className={inputCls("address")} />
          </div>
          {form.userType === "Contractor" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  {lbl("PAN No *")}
                  <input id={`${uid}-pan`} value={form.panNo} onChange={(e) => set("panNo", e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} className={inputCls("panNo")} />
                  {errMsg("panNo")}
                </div>
                <div>
                  {lbl("Firm Name *")}
                  <input id={`${uid}-firm`} value={form.firm} onChange={(e) => set("firm", e.target.value)} placeholder="Registered firm name" className={inputCls("firm")} />
                  {errMsg("firm")}
                </div>
              </div>
              <div>
                {lbl("Firm Address")}
                <input id={`${uid}-firmAddr`} value={form.firmAddress} onChange={(e) => set("firmAddress", e.target.value)} placeholder="Firm registered address" className={inputCls("firmAddress")} />
              </div>
            </>
          )}
        </div>

        {/* Organization */}
        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-5 space-y-4">
          {secHd("Organization")}
          <div>
            {lbl("Designation *")}
            <SearchableMultiSelect id={`${uid}-desig`} options={designationOptions} selected={form.designations}
              onChange={(v) => { set("designations", v); setErrors((e) => ({ ...e, designations: undefined })); }}
              placeholder="Search and select designation" error={errors.designations} />
            {errMsg("designations")}
          </div>
          <div>
            {lbl("Department *")}
            <SearchableMultiSelect id={`${uid}-dept`} options={DEPARTMENTS} selected={form.departments}
              onChange={(v) => { set("departments", v); setErrors((e) => ({ ...e, departments: undefined })); }}
              placeholder="Search and select department" error={errors.departments} />
            {errMsg("departments")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              {lbl("Division *")}
              <SearchableMultiSelect id={`${uid}-div`} options={DIVISIONS} selected={form.divisions}
                onChange={(v) => { set("divisions", v); setErrors((e) => ({ ...e, divisions: undefined })); }}
                placeholder="Search and select division" error={errors.divisions} />
              {errMsg("divisions")}
            </div>
            <div>
              {lbl("Sub Division *")}
              <SearchableMultiSelect id={`${uid}-subdiv`} options={SUB_DIVISIONS} selected={form.subDivisions}
                onChange={(v) => { set("subDivisions", v); setErrors((e) => ({ ...e, subDivisions: undefined })); }}
                placeholder="Search and select sub division" error={errors.subDivisions} />
              {errMsg("subDivisions")}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              {lbl("Taluka")}
              <div className="relative">
                <select id={`${uid}-taluka`} value={form.taluka}
                  onChange={(e) => { set("taluka", e.target.value); set("gramPanchayat", ""); }}
                  className={selectCls}>
                  <option value="">— Select Taluka —</option>
                  {TALUKAS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              {lbl("Gram Panchayat")}
              <div className="relative">
                <select id={`${uid}-gp`} value={form.gramPanchayat}
                  onChange={(e) => set("gramPanchayat", e.target.value)}
                  disabled={!form.taluka}
                  className={`${selectCls} disabled:opacity-50 disabled:cursor-not-allowed`}>
                  <option value="">{form.taluka ? "— Select GP —" : "— Select Taluka first —"}</option>
                  {gramOptions.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Signature */}
        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-5">
          {secHd("Signature")}
          <label htmlFor={`${uid}-sig`}
            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-5 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors group">
            {form.signatureUrl ? (
              form.signatureUrl.startsWith("data:image") ? (
                <img src={form.signatureUrl} alt="Signature preview" className="max-h-20 max-w-full rounded border border-gray-200 dark:border-gray-600 object-contain" />
              ) : (
                <div className="text-center">
                  <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto mb-1" />
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Signature uploaded</p>
                  <p className="text-xs text-gray-400 mt-0.5">{form.signatureUrl}</p>
                </div>
              )
            ) : (
              <>
                <Upload className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Click to upload signature image</p>
                <p className="text-xs text-gray-400">PNG, JPG up to 2 MB</p>
              </>
            )}
          </label>
          <input id={`${uid}-sig`} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const reader = new FileReader();
              reader.onload = (ev) => { if (ev.target?.result) set("signatureUrl", ev.target.result as string); };
              reader.readAsDataURL(f);
            }} />
          {form.signatureUrl && (
            <button type="button" onClick={() => set("signatureUrl", "")} className="mt-1.5 text-xs text-red-500 hover:underline">Remove signature</button>
          )}
        </div>

        {/* Account Status */}
        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-5">
          {secHd("Account Status")}
          <div className="flex gap-3">
            {(["Active", "Inactive"] as const).map((s) => (
              <button key={s} type="button" onClick={() => set("status", s)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  form.status === s
                    ? s === "Active" ? "border-green-400 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" : "border-gray-400 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    : "border-gray-200 dark:border-gray-600 text-gray-400 hover:border-gray-300"
                }`}>
                {form.status === s && <Check className="w-3.5 h-3.5" />}
                {s}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/60 rounded-b-xl">
        <button onClick={onClose} disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60">
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
          {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : isEdit ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isEdit ? "Save Changes" : "Create User"}
        </button>
      </div>
    </div>
  );
}

function DeleteConfirm({ user, onConfirm, onCancel }: { user: IUser; onConfirm: () => void; onCancel: () => void }) {
  const [saving, setSaving] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Delete User</h3>
            <p className="text-xs text-gray-400 mt-0.5">This action cannot be undone.</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Are you sure you want to delete <strong>{user.name}</strong>?</p>
        <p className="text-xs text-gray-400 mb-5">{user.email} · {user.role}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60">Cancel</button>
          <button onClick={async () => { setSaving(true); onConfirm(); }} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
            {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function UserViewModal({ user, onClose, onEdit }: { user: IUser; onClose: () => void; onEdit: () => void }) {
  const meta = ROLE_META[user.role];

  const row = (label: string, value?: string | string[]) => {
    const display = Array.isArray(value)
      ? (value.length > 0 ? value.join(", ") : "—")
      : (value?.trim() || "—");
    return (
      <div className="flex flex-col gap-0.5">
        <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
        <p className={`text-sm ${display === "—" ? "text-gray-400 dark:text-gray-500" : "text-gray-800 dark:text-gray-200"}`}>{display}</p>
      </div>
    );
  };

  const isContractor = user.userType === "Contractor" || user.role === "Contractor";
  const firstName  = user.firstName  || user.name.split(" ")[0]  || "";
  const lastName   = user.lastName   || user.name.split(" ").slice(-1)[0] || "";
  const divisions    = user.divisions?.length    ? user.divisions    : user.division    ? [user.division]    : [];
  const subDivisions = user.subDivisions?.length ? user.subDivisions : user.subDivision ? [user.subDivision] : [];
  const designations = user.designations?.length ? user.designations : [user.role];

  const secTitle = (text: string) => (
    <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">{text}</p>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 px-4 py-6 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-700 my-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${avatarColor(user.id)} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
              {initials(user.name)}
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">{user.name}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* Role / Status badges */}
          <div className="flex items-center gap-3 flex-wrap">
            <RoleBadge role={user.role} />
            {meta && <span className="text-xs text-gray-400">Group: {meta.group}</span>}
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              user.status === "Active"
                ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
            }`}>{user.status}</span>
          </div>

          {/* Two-column section layout */}
          <div className="grid grid-cols-2 gap-4 items-start">

            {/* LEFT — Personal + Contractor */}
            <div className="space-y-4">

              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                {secTitle("Personal Information")}
                <div className="grid grid-cols-2 gap-3">
                  {row("First Name",  firstName)}
                  {row("Middle Name", user.middleName)}
                  {row("Last Name",   lastName)}
                  {row("Email",       user.email)}
                  {row("Mobile",      user.mobile)}
                  <div className="col-span-2">{row("Address", user.address)}</div>
                </div>
              </div>

              {isContractor && (
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                  {secTitle("Contractor Details")}
                  <div className="grid grid-cols-2 gap-3">
                    {row("PAN No",    user.panNo)}
                    {row("Firm Name", user.firm)}
                    <div className="col-span-2">{row("Firm Address", user.firmAddress)}</div>
                  </div>
                </div>
              )}

            </div>

            {/* RIGHT — Organization + Account */}
            <div className="space-y-4">

              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                {secTitle("Organization")}
                <div className="grid grid-cols-2 gap-3">
                  {row("Designation(s)",  designations)}
                  {row("Department(s)",   user.departments)}
                  {row("Division(s)",     divisions)}
                  {row("Sub Division(s)", subDivisions)}
                  {row("Taluka",          user.taluka)}
                  {row("Gram Panchayat",  user.gramPanchayat)}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                {secTitle("Account")}
                <div className="grid grid-cols-2 gap-3">
                  {row("Status",     user.status)}
                  {row("User Type",  user.userType ?? (isContractor ? "Contractor" : "Employee"))}
                  {row("User ID",    user.id)}
                  {row("Last Login", fmtDate(user.lastLogin))}
                </div>
              </div>

            </div>
          </div>

          {/* Signature — full width */}
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl px-4 py-3">
            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Signature</p>
            {user.signatureUrl && user.signatureUrl.startsWith("data:image") ? (
              <div className="flex items-center gap-4">
                <img
                  src={user.signatureUrl}
                  alt="Signature"
                  className="h-14 max-w-[200px] object-contain rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 p-1"
                />
                <a
                  href={user.signatureUrl}
                  download={`signature-${user.id}.${user.signatureUrl.includes("image/png") ? "png" : "jpg"}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Download
                </a>
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">{user.signatureUrl || "—"}</p>
            )}
          </div>

          {/* Module Access — full width */}
          {meta?.modules && (
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
              {secTitle("Module Access")}
              <div className="flex flex-wrap gap-1.5">
                {meta.modules.map((m) => (
                  <span key={m} className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200">
                    <CheckCircle2 className="w-3 h-3 text-green-500" /> {m}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/60 rounded-b-2xl">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Close</button>
          <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
            <Edit2 className="w-4 h-4" /> Edit User
          </button>
        </div>
      </div>
    </div>
  );
}

// ── UserViewPage — full-page read-only user details ───────────────────────────
function UserViewPage({ user, onBack, onEdit }: { user: IUser; onBack: () => void; onEdit: () => void }) {
  const meta = ROLE_META[user.role];

  const row = (label: string, value?: string | string[]) => {
    const display = Array.isArray(value)
      ? (value.length > 0 ? value.join(", ") : "—")
      : (value?.trim() || "—");
    return (
      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
        <p className={`text-sm ${display === "—" ? "text-gray-400 dark:text-gray-500" : "text-gray-800 dark:text-gray-200"}`}>{display}</p>
      </div>
    );
  };

  const isContractor = user.userType === "Contractor" || user.role === "Contractor";
  const firstName    = user.firstName  || user.name.split(" ")[0]  || "";
  const lastName     = user.lastName   || user.name.split(" ").slice(-1)[0] || "";
  const divisions    = user.divisions?.length    ? user.divisions    : user.division    ? [user.division]    : [];
  const subDivisions = user.subDivisions?.length ? user.subDivisions : user.subDivision ? [user.subDivision] : [];
  const designations = user.designations?.length ? user.designations : [user.role];

  const card = (children: React.ReactNode) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
      {children}
    </div>
  );

  const secTitle = (text: string) => (
    <div className="flex items-center gap-2 mb-5 pb-3 border-b border-gray-100 dark:border-gray-700">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{text}</h3>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Page header + breadcrumb */}
      {card(
        <>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
            <button onClick={onBack} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">
              User Management
            </button>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            <span className="text-gray-700 dark:text-gray-200 font-medium">View User</span>
          </div>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-full ${avatarColor(user.id)} flex items-center justify-center text-white text-lg font-bold shrink-0`}>
                {initials(user.name)}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{user.name}</h2>
                <p className="text-sm text-gray-400 mt-0.5">{user.email}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <RoleBadge role={user.role} />
                  {meta && <span className="text-xs text-gray-400">Group: {meta.group}</span>}
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    user.status === "Active"
                      ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  }`}>{user.status}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={onBack}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button onClick={onEdit}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
                <Edit2 className="w-4 h-4" /> Edit User
              </button>
            </div>
          </div>
        </>
      )}

      {/* 1. Basic Details */}
      {card(
        <>
          {secTitle("Basic Details")}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {row("User ID",    user.id)}
            {row("User Type",  user.userType ?? (isContractor ? "Contractor" : "Employee"))}
            {row("Status",     user.status)}
            {row("Last Login", fmtDate(user.lastLogin))}
          </div>
        </>
      )}

      {/* 2. Personal Information */}
      {card(
        <>
          {secTitle("Personal Information")}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {row("First Name",  firstName)}
            {row("Middle Name", user.middleName)}
            {row("Last Name",   lastName)}
            {row("Email",       user.email)}
            {row("Mobile",      user.mobile)}
            <div className="col-span-2 sm:col-span-3">{row("Address", user.address)}</div>
          </div>
        </>
      )}

      {/* 3. Contractor Details (conditional) */}
      {isContractor && card(
        <>
          {secTitle("Contractor Details")}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {row("PAN No",    user.panNo)}
            {row("Firm Name", user.firm)}
            <div className="col-span-2 sm:col-span-3">{row("Firm Address", user.firmAddress)}</div>
          </div>
        </>
      )}

      {/* 4. Organization */}
      {card(
        <>
          {secTitle("Organization")}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {row("Designation(s)",  designations)}
            {row("Department(s)",   user.departments)}
            {row("Division(s)",     divisions)}
            {row("Sub Division(s)", subDivisions)}
            {row("Taluka",          user.taluka)}
            {row("Gram Panchayat",  user.gramPanchayat)}
          </div>
        </>
      )}

      {/* 5. Signature */}
      {card(
        <>
          {secTitle("Signature")}
          {user.signatureUrl && user.signatureUrl.startsWith("data:image") ? (
            <div className="flex items-center gap-4">
              <img src={user.signatureUrl} alt="Signature"
                className="h-16 max-w-[220px] object-contain rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 p-1.5" />
              <a href={user.signatureUrl}
                download={`signature-${user.id}.${user.signatureUrl.includes("image/png") ? "png" : "jpg"}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                <Upload className="w-3.5 h-3.5" /> Download
              </a>
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">No signature uploaded.</p>
          )}
        </>
      )}

      {/* 6. Module Access */}
      {meta?.modules && card(
        <>
          {secTitle("Module Access")}
          <div className="flex flex-wrap gap-2">
            {meta.modules.map((m) => (
              <span key={m} className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200">
                <CheckCircle2 className="w-3 h-3 text-green-500" /> {m}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function UserManagementTab({ onFullPage }: { onFullPage?: (active: boolean) => void }) {
  const [view,        setView]        = useState<"list" | "form">("list");
  const [formTarget,  setFormTarget]  = useState<IUser | null>(null);
  const [users,       setUsers]       = useState<IUser[]>([]);
  const [search,      setSearch]      = useState("");
  const [roleFilter,  setRoleFilter]  = useState<string>("all");
  const [statusFilter,setStatusFilter]= useState<"all" | "Active" | "Inactive">("all");
  const [viewPage,    setViewPage]    = useState<IUser | null>(null);
  const [deleteUser,  setDeleteUser]  = useState<IUser | null>(null);
  const currentUser = store.getCurrentUser();

  const reload = useCallback(() => setUsers(store.getAllUsers()), []);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { onFullPage?.(viewPage !== null); }, [viewPage, onFullPage]);

  const active   = users.filter((u) => u.status === "Active").length;
  const inactive = users.filter((u) => u.status === "Inactive").length;
  const rolesInUse = Array.from(new Set(users.map((u) => u.role))).sort();

  const filtered = users.filter((u) => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()) || u.role.toLowerCase().includes(search.toLowerCase());
    const matchRole   = roleFilter === "all" || u.role === roleFilter;
    const matchStatus = statusFilter === "all" || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  function handleSave(data: UserFormData, id?: string) {
    const normEmail = normaliseEmail(data.email);
    const fullName  = [data.firstName, data.middleName, data.lastName].filter(Boolean).join(" ").trim();
    const primaryRole = data.userType === "Contractor" ? "Contractor" : (data.designations[0] ?? "");
    const primaryDiv  = data.divisions[0]    ?? "";
    const primarySub  = data.subDivisions[0] ?? "";
    const payload: Partial<IUser> = {
      name: fullName, email: normEmail, role: primaryRole, division: primaryDiv, subDivision: primarySub,
      status: data.status, userType: data.userType,
      firstName: data.firstName.trim(), middleName: data.middleName.trim(), lastName: data.lastName.trim(),
      mobile: data.mobile, address: data.address.trim() || undefined,
      designations: data.designations, departments: data.departments, divisions: data.divisions, subDivisions: data.subDivisions,
      taluka: data.taluka || undefined, gramPanchayat: data.gramPanchayat || undefined,
      signatureUrl: data.signatureUrl || undefined,
      panNo: data.panNo.trim() || undefined, firm: data.firm.trim() || undefined, firmAddress: data.firmAddress.trim() || undefined,
    };
    if (id) {
      if (data.password.trim()) payload.password = data.password.trim();
      store.updateUser(id, payload);
      toast.success(`${fullName} updated successfully.`);
    } else {
      const existing = store.getAllUsers().find((u) => u.email === normEmail);
      if (existing) { toast.error("A user with this email already exists."); return; }
      store.createUser({ ...payload, password: data.password.trim() });
      toast.success(`${fullName} created successfully.`);
    }
    setView("list");
    setFormTarget(null);
    reload();
  }

  function handleToggleStatus(user: IUser) {
    if (user.id === currentUser?.id) { toast.error("You cannot deactivate your own account."); return; }
    const next = user.status === "Active" ? "Inactive" : "Active";
    store.updateUser(user.id, { status: next });
    toast.success(`${user.name} is now ${next}.`);
    reload();
  }

  function handleDelete(user: IUser) {
    store.deleteUser(user.id);
    toast.success(`${user.name} deleted.`);
    setDeleteUser(null);
    reload();
  }

  if (viewPage) {
    return (
      <UserViewPage
        user={viewPage}
        onBack={() => setViewPage(null)}
        onEdit={() => { setFormTarget(viewPage); setViewPage(null); setView("form"); }}
      />
    );
  }

  if (view === "form") {
    return (
      <UserModal
        user={formTarget}
        onClose={() => { setView("list"); setFormTarget(null); }}
        onSave={(data, id) => handleSave(data, id)}
      />
    );
  }

  return (
    <>
      {deleteUser && <DeleteConfirm user={deleteUser} onConfirm={() => handleDelete(deleteUser)} onCancel={() => setDeleteUser(null)} />}

      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Users",    value: users.length,  icon: Users,        color: "blue",   sub: `${rolesInUse.length} roles` },
            { label: "Active",         value: active,        icon: UserCheck,    color: "green",  sub: `${users.length > 0 ? Math.round((active/users.length)*100) : 0}% of total` },
            { label: "Inactive",       value: inactive,      icon: UserX,        color: "red",    sub: inactive > 0 ? "Review access" : "All accounts active" },
            { label: "Administrators", value: users.filter((u) => u.role === "System Administrator").length, icon: Crown, color: "amber", sub: "System Administrator role" },
          ].map(({ label, value, icon: Icon, color, sub }) => (
            <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
              <div className="flex items-center gap-1.5 mb-2">
                <Icon className={`w-4 h-4 text-${color}-500 dark:text-${color}-400`} />
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
              </div>
              <p className={`text-2xl font-bold text-${color}-700 dark:text-${color}-400`}>{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-3 flex-1">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or role…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition" />
              {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="w-4 h-4" /></button>}
            </div>
            <div className="relative">
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
                className="pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm appearance-none transition">
                <option value="all">All Roles</option>
                {rolesInUse.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 border border-gray-200 dark:border-gray-700">
              {(["all", "Active", "Inactive"] as const).map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === s ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>
                  {s === "all" ? "All" : s}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => { setFormTarget(null); setView("form"); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm shrink-0">
            <Plus className="w-4 h-4" /> Add User
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Showing <strong className="text-gray-700 dark:text-gray-200">{filtered.length}</strong> of {users.length} users
          {(search || roleFilter !== "all" || statusFilter !== "all") && (
            <button onClick={() => { setSearch(""); setRoleFilter("all"); setStatusFilter("all"); }} className="ml-2 text-blue-500 hover:underline">Clear filters</button>
          )}
        </p>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center shadow-sm">
            <Users className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{search ? `No users match "${search}".` : "No users found."}</p>
            <button onClick={() => { setFormTarget(null); setView("form"); }} className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors mx-auto">
              <Plus className="w-4 h-4" /> Add User
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                    {["User", "User ID", "Role", "Division", "Status", "Last Login", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40">
                  {filtered.map((user) => {
                    const isSelf = user.id === currentUser?.id;
                    return (
                      <tr key={user.id} className={`hover:bg-gray-50/60 dark:hover:bg-gray-700/20 transition-colors ${user.status === "Inactive" ? "opacity-60" : ""}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full ${avatarColor(user.id)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>{initials(user.name)}</div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{user.name}</p>
                                {isSelf && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shrink-0">You</span>}
                              </div>
                              <p className="text-xs text-gray-400 truncate">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">{user.id}</p>
                        </td>
                        <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-gray-700 dark:text-gray-200">{user.division ?? "—"}</p>
                          <p className="text-xs text-gray-400">{user.subDivision ?? ""}</p>
                        </td>
                        <td className="px-4 py-3"><StatusToggle active={user.status === "Active"} onClick={() => handleToggleStatus(user)} disabled={isSelf} /></td>
                        <td className="px-4 py-3"><p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(user.lastLogin)}</p></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setViewPage(user)} title="View details" className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"><Eye className="w-4 h-4" /></button>
                            <button onClick={() => { setFormTarget(user); setView("form"); }} title="Edit" className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => { if (isSelf) { toast.error("You cannot delete your own account."); return; } setDeleteUser(user); }} title="Delete"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-50 dark:border-gray-700/50 bg-gray-50/60 dark:bg-gray-700/20 flex items-center justify-between text-xs text-gray-400">
              <span>{filtered.length} user{filtered.length !== 1 ? "s" : ""} shown</span>
              <span>{active} active · {inactive} inactive</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2: ROLE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

function RoleManagementTab() {
  const users = store.getAllUsers();
  const [expanded, setExpanded] = useState<string | null>(null);

  const roleStats = ALL_ROLES.map((role) => ({
    role,
    count: users.filter((u) => u.role === role).length,
    meta:  ROLE_META[role],
  }));

  return (
    <div className="space-y-5">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
          Role permissions are system-defined and enforced by the IIMS access control layer.
          This view shows the current permission mapping for all 13 roles.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <SectionHeader icon={Shield} title="System Roles" description="All 13 defined roles and their module access permissions" />
        <div className="divide-y divide-gray-50 dark:divide-gray-700/40">
          {roleStats.map(({ role, count, meta }) => (
            <div key={role}>
              <button onClick={() => setExpanded(expanded === role ? null : role)}
                aria-expanded={expanded === role}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${meta?.color ?? "bg-gray-100 text-gray-600"}`}>
                  {meta?.short ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{role}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">{meta?.group}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{count} user{count !== 1 ? "s" : ""} assigned</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {meta?.modules.length ?? 0} modules
                  </span>
                  {expanded === role
                    ? <ChevronDown className="w-4 h-4 text-gray-400" />
                    : <ChevronRight className="w-4 h-4 text-gray-400" />}
                </div>
              </button>
              {expanded === role && (
                <div className="px-5 pb-5 bg-gray-50/60 dark:bg-gray-700/10">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 pt-3">Module Access</p>
                  <div className="flex flex-wrap gap-2">
                    {meta?.modules.map((m) => (
                      <span key={m} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200">
                        <CheckCircle2 className="w-3 h-3 text-green-500" /> {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3: ORGANIZATIONAL HIERARCHY MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

interface OrgNode { id: string; name: string; type: "Division" | "Sub Division" | "Office"; children?: OrgNode[]; }

const ORG_TREE: OrgNode[] = [
  {
    id: "div-pune", name: "Pune Division", type: "Division",
    children: [
      { id: "sd-khed",     name: "Khed Sub Division",     type: "Sub Division", children: [{ id: "off-khed",     name: "Khed Office",     type: "Office" }] },
      { id: "sd-shirur",   name: "Shirur Sub Division",   type: "Sub Division", children: [{ id: "off-shirur",   name: "Shirur Office",   type: "Office" }] },
      { id: "sd-baramati", name: "Baramati Sub Division", type: "Sub Division", children: [{ id: "off-baramati", name: "Baramati Office", type: "Office" }] },
      { id: "sd-daund",    name: "Daund Sub Division",    type: "Sub Division", children: [{ id: "off-daund",    name: "Daund Office",    type: "Office" }] },
      { id: "sd-pune",     name: "Pune City Sub Division", type: "Sub Division", children: [{ id: "off-pune",   name: "Pune City Office", type: "Office" }] },
    ],
  },
];

function OrgTreeNode({ node, depth = 0 }: { node: OrgNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = !!node.children?.length;
  const typeColors: Record<string, string> = {
    Division:       "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    "Sub Division": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    Office:         "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  };
  return (
    <div>
      <div onClick={() => hasChildren && setOpen((o) => !o)}
        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors ${hasChildren ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50" : "cursor-default"}`}
        style={{ marginLeft: `${depth * 20}px` }}>
        <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 flex-1">{node.name}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeColors[node.type]}`}>{node.type}</span>
        {hasChildren && (open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />)}
      </div>
      {open && node.children?.map((child) => <OrgTreeNode key={child.id} node={child} depth={depth + 1} />)}
    </div>
  );
}

function HierarchyTab() {
  const flatList: { name: string; type: string; parent: string }[] = [
    { name: "Pune Division",         type: "Division",     parent: "—" },
    { name: "Khed Sub Division",     type: "Sub Division", parent: "Pune Division" },
    { name: "Shirur Sub Division",   type: "Sub Division", parent: "Pune Division" },
    { name: "Baramati Sub Division", type: "Sub Division", parent: "Pune Division" },
    { name: "Daund Sub Division",    type: "Sub Division", parent: "Pune Division" },
    { name: "Pune City Sub Division",type: "Sub Division", parent: "Pune Division" },
    { name: "Khed Office",           type: "Office",       parent: "Khed Sub Division" },
    { name: "Shirur Office",         type: "Office",       parent: "Shirur Sub Division" },
    { name: "Baramati Office",       type: "Office",       parent: "Baramati Sub Division" },
    { name: "Daund Office",          type: "Office",       parent: "Daund Sub Division" },
    { name: "Pune City Office",      type: "Office",       parent: "Pune City Sub Division" },
  ];

  const typeColors: Record<string, string> = {
    Division:       "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    "Sub Division": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    Office:         "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  };

  return (
    <div className="space-y-6">
      {/* Tree view */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <SectionHeader icon={Building2} title="Organizational Tree" description="Visual hierarchy of Pune Zilla Parishad divisions and offices" color="green" />
        <div className="px-4 py-4">
          {ORG_TREE.map((node) => <OrgTreeNode key={node.id} node={node} />)}
        </div>
      </div>

      {/* Flat list */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <SectionHeader icon={Building2} title="Organizational Units" description="All registered divisions, sub-divisions, and offices" color="green" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                {["Unit Name", "Type", "Parent Unit"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40">
              {flatList.map((row) => (
                <tr key={row.name} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/20 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />{row.name}
                  </td>
                  <td className="px-5 py-3.5"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${typeColors[row.type]}`}>{row.type}</span></td>
                  <td className="px-5 py-3.5 text-xs text-gray-500 dark:text-gray-400">{row.parent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-50 dark:border-gray-700/50 bg-gray-50/60 dark:bg-gray-700/20 text-xs text-gray-400">
          {flatList.length} organizational units · Pune Division
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 4: APPROVAL CHAINS MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

interface ApprovalStep { order: number; role: string; action: string; canDelegate: boolean; }
interface WorkflowDef  { id: string; name: string; description: string; steps: ApprovalStep[]; }

const WORKFLOWS: WorkflowDef[] = [
  {
    id: "wf-cost", name: "Cost Estimation Approval", description: "From SE creation to CEO approval",
    steps: [
      { order: 1, role: "Sectional Engineer",    action: "Create & Forward Estimate",          canDelegate: false },
      { order: 2, role: "Deputy Engineer",        action: "Verify & Forward to EE",            canDelegate: true  },
      { order: 3, role: "Executive Engineer",     action: "Grant Technical Sanction",           canDelegate: false },
      { order: 4, role: "Additional Chief Executive Officer", action: "Administrative Approval", canDelegate: false },
      { order: 5, role: "Chief Executive Officer", action: "Final Approval",                   canDelegate: false },
    ],
  },
  {
    id: "wf-dtp", name: "DTP Approval Chain", description: "Draft Tender Paper sanction workflow",
    steps: [
      { order: 1, role: "Sectional Engineer",    action: "Create DTP",                         canDelegate: false },
      { order: 2, role: "Deputy Engineer",        action: "Review & Forward",                  canDelegate: true  },
      { order: 3, role: "Executive Engineer",     action: "Verify & Approve",                  canDelegate: false },
      { order: 4, role: "Additional Chief Executive Officer", action: "Sanction DTP",          canDelegate: false },
      { order: 5, role: "Chief Executive Officer", action: "Final Sanction",                   canDelegate: false },
    ],
  },
  {
    id: "wf-tender", name: "Tender Publication Chain", description: "Tender creation to MahaTender publication",
    steps: [
      { order: 1, role: "Tender Clerk",           action: "Create Tender Notice",               canDelegate: false },
      { order: 2, role: "Executive Engineer",      action: "Verify & Forward to CAFO",          canDelegate: false },
      { order: 3, role: "Chief Accounts and Finance Officer", action: "Forward to Addl CEO",    canDelegate: false },
      { order: 4, role: "Additional Chief Executive Officer", action: "Approve & Publish on MahaTender", canDelegate: false },
    ],
  },
  {
    id: "wf-mb", name: "MB & Billing Approval", description: "Measurement book submission to payment",
    steps: [
      { order: 1, role: "Sectional Engineer",     action: "Create MB & Forward",               canDelegate: false },
      { order: 2, role: "Contractor",             action: "Accept / Reject MB",                canDelegate: false },
      { order: 3, role: "Executive Engineer",     action: "5% Checking & Forward to Auditor",  canDelegate: false },
      { order: 4, role: "Auditor",                action: "Submit Audit Report",               canDelegate: false },
      { order: 5, role: "Accountant",             action: "Process Bill & Forward to AAO",     canDelegate: false },
      { order: 6, role: "Assistant Accounts Officer", action: "Review & Forward to CAFO",      canDelegate: true  },
      { order: 7, role: "Chief Accounts and Finance Officer", action: "Approve Payment",       canDelegate: false },
    ],
  },
];

function ApprovalChainsTab() {
  const [expanded, setExpanded] = useState<string | null>("wf-cost");
  return (
    <div className="space-y-4">
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
          Approval chains define the mandatory workflow sequence for each process type. Steps are enforced by the system and cannot be bypassed.
        </p>
      </div>
      {WORKFLOWS.map((wf) => (
        <div key={wf.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <button onClick={() => setExpanded(expanded === wf.id ? null : wf.id)}
            aria-expanded={expanded === wf.id}
            className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
              <GitBranch className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{wf.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{wf.description} · {wf.steps.length} steps</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">Active</span>
              {expanded === wf.id ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            </div>
          </button>
          {expanded === wf.id && (
            <div className="px-5 pb-5 border-t border-gray-50 dark:border-gray-700">
              <div className="pt-4 space-y-0">
                {wf.steps.map((step, idx) => (
                  <div key={step.order} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">{step.order}</div>
                      {idx < wf.steps.length - 1 && <div className="w-0.5 flex-1 bg-blue-200 dark:bg-blue-900/40 my-1 min-h-[16px]" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{step.role}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"><ArrowRight className="w-3 h-3" />{step.action}</span>
                        {step.canDelegate && <span className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Can Delegate</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 5: DOCUMENT ACCESS MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

interface DocAccess { documentType: string; allowedRoles: string[]; accessLevel: "View" | "Edit" | "Manage"; }

const DOC_ACCESS: DocAccess[] = [
  { documentType: "Project Estimates",    allowedRoles: ["Sectional Engineer","Deputy Engineer","Executive Engineer","System Administrator"], accessLevel: "Manage" },
  { documentType: "DTP Documents",        allowedRoles: ["Sectional Engineer","Deputy Engineer","Executive Engineer","Tender Clerk","System Administrator"], accessLevel: "Edit" },
  { documentType: "Tender Documents",     allowedRoles: ["Tender Clerk","Deputy Engineer","Executive Engineer","System Administrator"], accessLevel: "Manage" },
  { documentType: "Technical Bid Sheets", allowedRoles: ["Tender Clerk","Executive Engineer","Additional Chief Executive Officer"], accessLevel: "Manage" },
  { documentType: "Financial Bid Sheets", allowedRoles: ["Tender Clerk","Executive Engineer","Additional Chief Executive Officer"], accessLevel: "Manage" },
  { documentType: "Letter of Intent",      allowedRoles: ["Executive Engineer","Contractor","Additional Chief Executive Officer","Chief Executive Officer"], accessLevel: "View" },
  { documentType: "Work Order",           allowedRoles: ["Executive Engineer","Contractor","Sectional Engineer","Deputy Engineer"], accessLevel: "View" },
  { documentType: "MB Records",           allowedRoles: ["Sectional Engineer","Deputy Engineer","Executive Engineer","Contractor","Auditor"], accessLevel: "Edit" },
  { documentType: "Payment Certificates", allowedRoles: ["Accountant","Assistant Accounts Officer","Chief Accounts and Finance Officer","Executive Engineer"], accessLevel: "Manage" },
  { documentType: "Audit Reports",        allowedRoles: ["Auditor","Chief Accounts and Finance Officer","System Administrator"], accessLevel: "View" },
  { documentType: "Sanction Letters",     allowedRoles: ["Executive Engineer","Additional Chief Executive Officer","Chief Executive Officer"], accessLevel: "Manage" },
  { documentType: "Financial Reports",    allowedRoles: ["Accountant","Assistant Accounts Officer","Chief Accounts and Finance Officer","Executive Engineer","System Administrator"], accessLevel: "View" },
];

const ACCESS_COLORS: Record<string, string> = {
  View:   "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  Edit:   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Manage: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
};
const ACCESS_ICONS: Record<string, React.ReactNode> = {
  View:   <Eye className="w-3.5 h-3.5" />,
  Edit:   <Pencil className="w-3.5 h-3.5" />,
  Manage: <ShieldCheck className="w-3.5 h-3.5" />,
};

function DocumentAccessTab() {
  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <SectionHeader icon={FileKey} title="Document Access Matrix" description="Role-based access levels for each document type across the system" color="violet" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                {["Document Type", "Allowed Roles", "Access Level"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40">
              {DOC_ACCESS.map((row) => (
                <tr key={row.documentType} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/20 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">
                    <div className="flex items-center gap-2"><Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />{row.documentType}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      {row.allowedRoles.map((r) => <span key={r} className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{r}</span>)}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${ACCESS_COLORS[row.accessLevel]}`}>
                      {ACCESS_ICONS[row.accessLevel]}{row.accessLevel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-50 dark:border-gray-700/50 bg-gray-50/60 dark:bg-gray-700/20 text-xs text-gray-400">
          {DOC_ACCESS.length} document types configured
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 6: SYSTEM ACTIVITY LOGS
// ═══════════════════════════════════════════════════════════════════════════════

function ActivityLogsTab() {
  const projects = store.getAllProjects();
  const users    = store.getAllUsers();

  // Aggregate all project history entries
  const entries = projects
    .flatMap((p) =>
      (p.history ?? []).map((h) => ({
        id:          h.id,
        projectId:   p.id,
        projectName: p.projectName,
        action:      h.action,
        performedBy: h.performedBy,
        performedAt: h.performedAt,
        fromStatus:  h.fromStatus,
        toStatus:    h.toStatus,
        remarks:     h.remarks,
      }))
    )
    .sort((a, b) => (b.performedAt ?? "").localeCompare(a.performedAt ?? ""))
    .slice(0, 100);

  // Also include user last-login events
  const loginEvents = users
    .filter((u) => u.lastLogin)
    .map((u) => ({
      id:          `login-${u.id}`,
      projectId:   "",
      projectName: "",
      action:      "User Login",
      performedBy: `${u.name} (${u.role})`,
      performedAt: u.lastLogin ?? "",
      fromStatus:  "",
      toStatus:    "Authenticated",
      remarks:     u.email,
    }))
    .sort((a, b) => (b.performedAt ?? "").localeCompare(a.performedAt ?? ""))
    .slice(0, 20);

  const allEvents = [...entries, ...loginEvents]
    .sort((a, b) => (b.performedAt ?? "").localeCompare(a.performedAt ?? ""))
    .slice(0, 80);

  const actionColor = (action: string) => {
    if (action.toLowerCase().includes("approved") || action.toLowerCase().includes("sanctioned") || action.toLowerCase().includes("issued") || action.toLowerCase().includes("payment")) return "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400";
    if (action.toLowerCase().includes("returned") || action.toLowerCase().includes("rejected") || action.toLowerCase().includes("reject")) return "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400";
    if (action.toLowerCase().includes("login")) return "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400";
    if (action.toLowerCase().includes("forward") || action.toLowerCase().includes("submitted")) return "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400";
    return "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400";
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Showing <strong className="text-gray-700 dark:text-gray-200">{allEvents.length}</strong> recent system events
        </p>
        <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg">Live from localStorage</span>
      </div>

      {allEvents.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center shadow-sm">
          <Activity className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">No activity recorded yet.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <SectionHeader icon={Activity} title="System Activity Log" description="All tracked events across projects and users" />
          <div className="divide-y divide-gray-50 dark:divide-gray-700/40">
            {allEvents.map((ev, idx) => (
              <div key={`${ev.id}-${idx}`} className="flex items-start gap-4 px-5 py-3.5 hover:bg-gray-50/60 dark:hover:bg-gray-700/20 transition-colors">
                <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${actionColor(ev.action)}`}>
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{ev.action}</p>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
                      <Clock className="w-3 h-3" />{fmtTime(ev.performedAt)}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{ev.performedBy}</p>
                  {ev.projectName && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">{ev.projectId} · {ev.projectName}</p>
                  )}
                  {ev.toStatus && (
                    <p className="text-xs text-gray-400 mt-0.5">Status → <span className="font-medium text-gray-600 dark:text-gray-300">{ev.toStatus}</span></p>
                  )}
                  {ev.remarks && (
                    <p className="text-xs text-gray-400 mt-0.5 italic">&quot;{ev.remarks}&quot;</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-gray-50 dark:border-gray-700/50 bg-gray-50/60 dark:bg-gray-700/20 text-xs text-gray-400">
            {allEvents.length} events shown · Sorted by most recent
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 7: CONTRACTOR MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

const REG_CLASSES = ["Class A", "Class B", "Class C", "Class D"] as const;

// ── Merged contractor: profile from IUser + registration from IContractor ──────

interface MergedContractor {
  userId?:       string;
  contractorId?: string;
  name:          string;   // Full contact person name
  firstName?:    string;
  middleName?:   string;
  lastName?:     string;
  firmName:      string;
  firmAddress?:  string;
  email:         string;
  mobile:        string;
  panNo?:        string;
  address?:      string;
  divisions?:    string[];
  subDivisions?: string[];
  departments?:  string[];
  taluka?:       string;
  gramPanchayat?:string;
  designations?: string[];
  registration?: IContractorRegistration;
  history:       IContractorHistoryEntry[];
  createdAt:     string;
}

function buildMergedList(users: IUser[], contractors: IContractor[]): MergedContractor[] {
  const result: MergedContractor[] = [];
  const matchedContractorIds = new Set<string>();

  for (const u of users.filter((u) => u.role === "Contractor" || u.userType === "Contractor")) {
    const c = contractors.find((c) => c.userId === u.id || c.email === u.email);
    if (c) matchedContractorIds.add(c.id);
    result.push({
      userId:        u.id,
      contractorId:  c?.id,
      name:          u.name,
      firstName:     u.firstName  ?? c?.firstName,
      middleName:    u.middleName ?? c?.middleName,
      lastName:      u.lastName   ?? c?.lastName,
      firmName:      u.firm ?? c?.firmName ?? "",
      firmAddress:   u.firmAddress,
      email:         u.email,
      mobile:        u.mobile ?? c?.mobile ?? "",
      panNo:         u.panNo ?? c?.registration?.panNumber,
      address:       u.address,
      divisions:     u.divisions,
      subDivisions:  u.subDivisions,
      departments:   u.departments,
      taluka:        u.taluka,
      gramPanchayat: u.gramPanchayat,
      designations:  u.designations,
      registration:  c?.registration,
      history:       c?.history ?? [],
      createdAt:     c?.createdAt ?? new Date().toISOString().split("T")[0],
    });
  }

  // Legacy IContractor entries with no matching IUser (seed data / direct entries)
  for (const c of contractors) {
    if (!matchedContractorIds.has(c.id)) {
      result.push({
        contractorId: c.id,
        name:         c.name,
        firstName:    c.firstName,
        middleName:   c.middleName,
        lastName:     c.lastName,
        firmName:     c.firmName,
        email:        c.email,
        mobile:       c.mobile,
        panNo:        c.registration?.panNumber,
        address:      c.registration?.address,
        registration: c.registration,
        history:      c.history ?? [],
        createdAt:    c.createdAt,
      });
    }
  }

  return result;
}

// ── Registration form data ────────────────────────────────────────────────────

interface RegFormData {
  // Registration Information
  registerSrNo:             string;
  registrationClassSrNo:    string;
  registrationNo:           string;
  registrationClass:        "Class A" | "Class B" | "Class C" | "Class D";
  workCapacity:             string;
  educationalQualification: string;
  guidelineBooklet:         string;
  // Payment Information
  receiptOrDDNo:    string;
  receiptOrDDDate:  string;
  registrationFee:  string;
  certificateAmount:string;
  // Validity Information
  registrationDate:      string;
  validityYears:         string;
  registrationPeriodFrom:string;
  registrationPeriodTo:  string;
  // File Information
  fileYearNo: string;
  fileNoteNo: string;
  filePageNo: string;
  bundleNo:   string;
  // Additional (kept for compatibility)
  panNumber:   string;
  gstNumber:   string;
  bankName:    string;
  bankAccount: string;
  bankIfsc:    string;
}

const EMPTY_REG_FORM: RegFormData = {
  registerSrNo: "", registrationClassSrNo: "",
  registrationNo: "", registrationClass: "Class A",
  workCapacity: "", educationalQualification: "", guidelineBooklet: "",
  receiptOrDDNo: "", receiptOrDDDate: "", registrationFee: "", certificateAmount: "",
  registrationDate: "", validityYears: "", registrationPeriodFrom: "", registrationPeriodTo: "",
  fileYearNo: "", fileNoteNo: "", filePageNo: "", bundleNo: "",
  panNumber: "", gstNumber: "", bankName: "", bankAccount: "", bankIfsc: "",
};

function regFormFromRecord(r: IContractorRegistration): RegFormData {
  return {
    registerSrNo:             r.registerSrNo          ?? "",
    registrationClassSrNo:    r.registrationClassSrNo ?? "",
    registrationNo:           r.registrationNumber    ?? "",
    registrationClass:        r.registrationClass     ?? "Class A",
    workCapacity:             r.workCapacity          ?? "",
    educationalQualification: r.educationalQualification ?? "",
    guidelineBooklet:         r.guidelineBooklet      ?? "",
    receiptOrDDNo:            r.receiptOrDDNo         ?? "",
    receiptOrDDDate:          r.receiptOrDDDate       ?? "",
    registrationFee:          r.registrationFee       ?? "",
    certificateAmount:        r.certificateAmount     ?? "",
    registrationDate:         r.registrationDate      ?? "",
    validityYears:            r.validityYears         ?? "",
    registrationPeriodFrom:   r.registrationPeriodFrom ?? "",
    registrationPeriodTo:     r.registrationPeriodTo  ?? r.validUpto ?? "",
    fileYearNo:               r.fileYearNo            ?? "",
    fileNoteNo:               r.fileNoteNo            ?? "",
    filePageNo:               r.filePageNo            ?? "",
    bundleNo:                 r.bundleNo              ?? "",
    panNumber:                r.panNumber             ?? "",
    gstNumber:                r.gstNumber             ?? "",
    bankName:                 r.bankName              ?? "",
    bankAccount:              r.bankAccountNumber     ?? "",
    bankIfsc:                 r.bankIfscCode          ?? "",
  };
}

// ── Registration Modal ────────────────────────────────────────────────────────

// ── Contractor Registration Page ──────────────────────────────────────────────

function ContractorRegistrationPage({
  editTarget,
  onBack,
  onSave,
  onNavigateToUsers,
  currentUserName,
  unregisteredUsers,
  merged,
}: {
  editTarget: MergedContractor | null;
  onBack: () => void;
  onSave: (mc: MergedContractor, form: RegFormData, entry: IContractorHistoryEntry) => void;
  onNavigateToUsers: () => void;
  currentUserName: string;
  unregisteredUsers: IUser[];
  merged: MergedContractor[];
}) {
  const uid = useId();
  const isEdit = editTarget !== null;

  const [selectedMc, setSelectedMc] = useState<MergedContractor | null>(editTarget);
  const [ddQuery,    setDdQuery]    = useState(isEdit ? (editTarget?.name ?? "") : "");
  const [ddOpen,     setDdOpen]     = useState(false);
  const ddRef = useRef<HTMLDivElement>(null);

  const [form,   setForm]   = useState<RegFormData>(() =>
    editTarget?.registration ? regFormFromRecord(editTarget.registration) : { ...EMPTY_REG_FORM }
  );
  const [saving,    setSaving]    = useState(false);
  const [view,      setView]      = useState<"registration" | "history">("registration");
  const [regErrors, setRegErrors] = useState<Partial<Record<string, string>>>({});

  function validateReg(): boolean {
    const e: Partial<Record<string, string>> = {};
    if (!selectedMc) { e._mc = "Select a contractor first."; setRegErrors(e); return false; }
    if (!form.registrationNo.trim())        e.registrationNo        = "Registration No is required.";
    if (!form.registrationDate)             e.registrationDate      = "Registration Date is required.";
    if (!form.validityYears.trim())         e.validityYears         = "Validity Years is required.";
    if (form.validityYears.trim() && !/^\d+$/.test(form.validityYears.trim()))
                                            e.validityYears         = "Must be a whole number.";
    if (!form.registrationPeriodFrom)       e.registrationPeriodFrom = "Period From is required.";
    if (!form.registrationPeriodTo)         e.registrationPeriodTo  = "Period To is required.";
    if (form.registrationPeriodFrom && form.registrationPeriodTo &&
        form.registrationPeriodTo < form.registrationPeriodFrom)
                                            e.registrationPeriodTo  = "Period To must be on or after Period From.";
    if (form.registrationFee.trim() && !/^\d+(\.\d{1,2})?$/.test(form.registrationFee.trim()))
                                            e.registrationFee       = "Must be a valid amount (e.g. 5000 or 5000.00).";
    if (form.certificateAmount.trim() && !/^\d+(\.\d{1,2})?$/.test(form.certificateAmount.trim()))
                                            e.certificateAmount     = "Must be a valid amount.";
    setRegErrors(e);
    return Object.keys(e).length === 0;
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) setDdOpen(false);
    }
    if (ddOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ddOpen]);

  const filteredUsers = unregisteredUsers.filter((u) => {
    if (!ddQuery) return true;
    const q = ddQuery.toLowerCase();
    return u.name.toLowerCase().includes(q) || (u.firm ?? "").toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  function selectUser(u: IUser) {
    const mc: MergedContractor = {
      userId:        u.id,
      name:          u.name,
      firstName:     u.firstName,
      middleName:    u.middleName,
      lastName:      u.lastName,
      firmName:      u.firm ?? "",
      firmAddress:   u.firmAddress,
      email:         u.email,
      mobile:        u.mobile ?? "",
      panNo:         u.panNo,
      address:       u.address,
      divisions:     u.divisions,
      subDivisions:  u.subDivisions,
      departments:   u.departments,
      taluka:        u.taluka,
      gramPanchayat: u.gramPanchayat,
      designations:  u.designations,
      history:       [],
      createdAt:     new Date().toISOString().split("T")[0],
    };
    setSelectedMc(mc);
    setDdQuery(u.name);
    setDdOpen(false);
    setForm({ ...EMPTY_REG_FORM });
  }

  function historyAction(): string {
    if (!editTarget?.registration) return "Registration Created";
    return "Registration Updated";
  }

  function handleSave() {
    if (!validateReg() || !selectedMc) return;
    setSaving(true);
    const mc = selectedMc;
    const entry: IContractorHistoryEntry = {
      id:          `H${Date.now()}`,
      date:        new Date().toISOString().split("T")[0],
      action:      historyAction(),
      performedBy: currentUserName,
    };
    try { onSave(mc, form, entry); } finally { setSaving(false); }
  }

  function set<K extends keyof RegFormData>(k: K, v: RegFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setRegErrors((e) => { const n = { ...e }; delete n[k as string]; return n; });
  }

  const inputCls = "w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors";

  const fld = (lblText: string, node: React.ReactNode, errKey?: string) => {
    const [base, req] = lblText.endsWith(" *") ? [lblText.slice(0, -2), true] : [lblText, false];
    return (
      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
          {base}{req && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {node}
        {errKey && regErrors[errKey] && (
          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {regErrors[errKey]}
          </p>
        )}
      </div>
    );
  };

  const reqInputCls = (key: string) =>
    `w-full rounded-lg border ${regErrors[key] ? "border-red-400 dark:border-red-600" : "border-gray-200 dark:border-gray-600"} bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors`;

  const mc = selectedMc;

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} title="Back"
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex-none">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {isEdit ? "Edit Registration" : "Register Contractor"}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Contractor Management <span className="mx-1.5">/</span>
            <span className="font-medium text-gray-600 dark:text-gray-300">{isEdit ? "Edit Registration" : "New Registration"}</span>
          </p>
        </div>
      </div>

      {/* Contractor Selector (new registration only) */}
      {!isEdit && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <SectionHeader icon={HardHat} title="Select Contractor" description="Choose a contractor from User Management to register" color="blue" />
          <div className="px-6 py-5">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
              Contractor <span className="text-red-500">*</span>
            </label>
            <div ref={ddRef} className="relative">
              <div
                className={`w-full rounded-lg border ${ddOpen ? "border-blue-500 ring-2 ring-blue-500/40" : "border-gray-200 dark:border-gray-600"} bg-white dark:bg-gray-700 flex items-center gap-2 px-3 py-2.5 cursor-text`}
                onClick={() => { setDdOpen(true); }}
              >
                {mc && !ddOpen ? (
                  <div className={`w-6 h-6 rounded-full ${avatarColor(mc.userId ?? mc.email)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                    {initials(mc.name)}
                  </div>
                ) : (
                  <Search className="w-4 h-4 text-gray-400 shrink-0" />
                )}
                <input
                  value={ddOpen ? ddQuery : (mc ? mc.name : "")}
                  onChange={(e) => { setDdQuery(e.target.value); setDdOpen(true); }}
                  onFocus={() => { setDdOpen(true); setDdQuery(""); }}
                  placeholder={mc ? mc.name : "Search by name, firm or email…"}
                  className="flex-1 text-sm text-gray-800 dark:text-gray-200 bg-transparent outline-none"
                />
                {mc && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedMc(null); setDdQuery(""); }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <X className="w-4 h-4" />
                  </button>
                )}
                <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${ddOpen ? "rotate-180" : ""}`} />
              </div>
              {ddOpen && (
                <div className="absolute z-50 top-full mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-lg max-h-52 overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="px-4 py-5 text-center">
                      <p className="text-sm text-gray-400 italic">
                        {ddQuery ? `No unregistered contractors match "${ddQuery}"` : "All contractors are already registered"}
                      </p>
                      <button onClick={() => { setDdOpen(false); onBack(); onNavigateToUsers(); }}
                        className="mt-2 text-xs text-blue-500 hover:underline">
                        Go to User Management to add contractors
                      </button>
                    </div>
                  ) : (
                    filteredUsers.map((u) => (
                      <button key={u.id} type="button"
                        onMouseDown={(e) => { e.preventDefault(); selectUser(u); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-600/40 transition-colors">
                        <div className={`w-8 h-8 rounded-full ${avatarColor(u.id)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                          {initials(u.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{u.name}</p>
                          <p className="text-xs text-gray-400 truncate">{u.firm ? `${u.firm} · ` : ""}{u.email}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {unregisteredUsers.length === 0 && !mc && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                All contractors from User Management are already registered.
                <button onClick={() => { onBack(); onNavigateToUsers(); }} className="underline ml-1 hover:text-amber-700">Add a contractor</button>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Contractor Profile — read-only */}
      {mc && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${avatarColor(mc.userId ?? mc.email)} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                {initials(mc.name)}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{mc.firmName || mc.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{mc.contractorId ? `${mc.contractorId} · ` : ""}{mc.name}</p>
              </div>
            </div>
            {mc.userId && (
              <button onClick={() => { onBack(); onNavigateToUsers(); }}
                className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/40 transition-colors whitespace-nowrap border border-blue-100 dark:border-blue-800">
                <Edit2 className="w-3.5 h-3.5" /> Edit Basic Details
              </button>
            )}
          </div>
          <div className="px-6 py-4 space-y-4">
            {/* Identity & Contact */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: "Contractor ID",  value: mc.contractorId || "—" },
                { label: "Firm Name",      value: mc.firmName || "—" },
                { label: "First Name",     value: mc.firstName || mc.name.split(" ")[0] || "—" },
                ...(mc.middleName ? [{ label: "Middle Name", value: mc.middleName }] : []),
                { label: "Last Name",      value: mc.lastName || mc.name.split(" ").slice(-1)[0] || "—" },
                { label: "Email",          value: mc.email },
                { label: "Mobile Number",  value: mc.mobile || "—" },
                { label: "PAN Number",     value: mc.panNo  || "—" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
                  <p className="text-sm text-gray-800 dark:text-gray-200 break-words">{value}</p>
                </div>
              ))}
              {mc.address && (
                <div className="col-span-2 sm:col-span-3">
                  <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 mb-0.5">Address</p>
                  <p className="text-sm text-gray-800 dark:text-gray-200 break-words">{mc.address}</p>
                </div>
              )}
              {mc.firmAddress && (
                <div className="col-span-2 sm:col-span-3">
                  <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 mb-0.5">Firm Address</p>
                  <p className="text-sm text-gray-800 dark:text-gray-200 break-words">{mc.firmAddress}</p>
                </div>
              )}
            </div>
            {/* Organization Details */}
            {(mc.designations?.length || mc.departments?.length || mc.divisions?.length || mc.subDivisions?.length || mc.taluka || mc.gramPanchayat) && (
              <>
                <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                  <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Organization Details</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[
                      ...(mc.designations?.length ? [{ label: "Designation(s)", value: mc.designations.join(", ") }] : []),
                      ...(mc.departments?.length  ? [{ label: "Department(s)",  value: mc.departments.join(", ")  }] : []),
                      ...(mc.divisions?.length    ? [{ label: "Division(s)",    value: mc.divisions.join(", ")    }] : []),
                      ...(mc.subDivisions?.length ? [{ label: "Sub Division(s)",value: mc.subDivisions.join(", ")}] : []),
                      ...(mc.taluka               ? [{ label: "Taluka",         value: mc.taluka                  }] : []),
                      ...(mc.gramPanchayat        ? [{ label: "Gram Panchayat", value: mc.gramPanchayat           }] : []),
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
                        <p className="text-sm text-gray-800 dark:text-gray-200 break-words">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <p className="px-6 pb-4 text-[11px] text-blue-500 dark:text-blue-400 font-medium">
            {mc.userId ? "Profile details are managed in User Management." : "Legacy record — no linked user account."}
          </p>
        </div>
      )}

      {/* Registration form — only shown when contractor is selected / editing */}
      {mc && (
        <>
          {/* Tab bar (edit mode shows history) */}
          {isEdit && (
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-700/60 rounded-xl p-1 border border-gray-200 dark:border-gray-700">
              {(["registration", "history"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setView(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                    view === t
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  }`}>
                  {t === "registration" ? "Registration Details" : `History (${editTarget?.history?.length ?? 0})`}
                </button>
              ))}
            </div>
          )}

          {/* History tab */}
          {isEdit && view === "history" ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <SectionHeader icon={Clock} title="Registration History" description="Append-only history of all registration changes" color="amber" />
              {(editTarget?.history?.length ?? 0) === 0 ? (
                <div className="text-center py-10">
                  <Clock className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No history recorded yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                        {["Date", "Action", "Performed By"].map((h) => (
                          <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40">
                      {[...(editTarget?.history ?? [])].reverse().map((h) => (
                        <tr key={h.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/20 transition-colors">
                          <td className="px-5 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{h.date}</td>
                          <td className="px-5 py-3 text-sm font-medium text-gray-800 dark:text-gray-200">{h.action}</td>
                          <td className="px-5 py-3 text-xs text-gray-500 dark:text-gray-400">{h.performedBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <>

              {/* Section 1: Registration Information */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <SectionHeader icon={FileKey} title="Registration Information" description="Core registration identifiers and classification" color="blue" />
                <div className="px-6 py-5 grid grid-cols-2 gap-4">
                  {fld("Register Sr. No.",
                    <input id={`${uid}-rsr`} value={form.registerSrNo} onChange={(e) => set("registerSrNo", e.target.value)} placeholder="e.g. 101" className={inputCls} />
                  )}
                  {fld("Registration Class Sr. No.",
                    <input id={`${uid}-rcsr`} value={form.registrationClassSrNo} onChange={(e) => set("registrationClassSrNo", e.target.value)} placeholder="e.g. A-05" className={inputCls} />
                  )}
                  {fld("Registration No *",
                    <input id={`${uid}-rno`} value={form.registrationNo} onChange={(e) => set("registrationNo", e.target.value)} placeholder="PWD/MH/2024/XXXX" className={reqInputCls("registrationNo")} />
                  , "registrationNo")}
                  {fld("Registration Class",
                    <div className="relative">
                      <select id={`${uid}-rc`} value={form.registrationClass} onChange={(e) => set("registrationClass", e.target.value as typeof form.registrationClass)}
                        className={`${inputCls} appearance-none pr-8`}>
                        {REG_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  )}
                  {fld("Work Capacity",
                    <input id={`${uid}-wc`} value={form.workCapacity} onChange={(e) => set("workCapacity", e.target.value)} placeholder="e.g. ₹50 Lakh" className={inputCls} />
                  )}
                  {fld("Educational Qualification",
                    <input id={`${uid}-eq`} value={form.educationalQualification} onChange={(e) => set("educationalQualification", e.target.value)} placeholder="e.g. B.E. Civil" className={inputCls} />
                  )}
                  <div className="col-span-2">
                    {fld("Guideline Booklet",
                      <input id={`${uid}-gb`} value={form.guidelineBooklet} onChange={(e) => set("guidelineBooklet", e.target.value)} placeholder="Booklet number or reference" className={inputCls} />
                    )}
                  </div>
                </div>
              </div>

              {/* Section 2: Payment Information */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <SectionHeader icon={CreditCard} title="Payment Information" description="Fee payment receipts and certificate amounts" color="green" />
                <div className="px-6 py-5 grid grid-cols-2 gap-4">
                  {fld("Receipt / DD No",
                    <input id={`${uid}-rdno`} value={form.receiptOrDDNo} onChange={(e) => set("receiptOrDDNo", e.target.value)} placeholder="Receipt or DD number" className={inputCls} />
                  )}
                  {fld("Receipt / DD Date",
                    <input id={`${uid}-rddt`} type="date" value={form.receiptOrDDDate} onChange={(e) => set("receiptOrDDDate", e.target.value)} className={inputCls} />
                  )}
                  {fld("Registration Fee",
                    <input id={`${uid}-rf`} value={form.registrationFee} onChange={(e) => set("registrationFee", e.target.value)} placeholder="₹ Amount" className={reqInputCls("registrationFee")} />
                  , "registrationFee")}
                  {fld("Certificate Amount",
                    <input id={`${uid}-ca`} value={form.certificateAmount} onChange={(e) => set("certificateAmount", e.target.value)} placeholder="₹ Amount" className={reqInputCls("certificateAmount")} />
                  , "certificateAmount")}
                </div>
              </div>

              {/* Section 3: Validity Information */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <SectionHeader icon={CheckCircle2} title="Validity Information" description="Registration dates and validity period" color="violet" />
                <div className="px-6 py-5 grid grid-cols-2 gap-4">
                  {fld("Registration Date *",
                    <input id={`${uid}-rd`} type="date" value={form.registrationDate} onChange={(e) => set("registrationDate", e.target.value)} className={reqInputCls("registrationDate")} />
                  , "registrationDate")}
                  {fld("Validity Years *",
                    <input id={`${uid}-vy`} value={form.validityYears} onChange={(e) => set("validityYears", e.target.value)} placeholder="e.g. 3" className={reqInputCls("validityYears")} />
                  , "validityYears")}
                  {fld("Registration Period From *",
                    <input id={`${uid}-rpf`} type="date" value={form.registrationPeriodFrom} onChange={(e) => set("registrationPeriodFrom", e.target.value)} className={reqInputCls("registrationPeriodFrom")} />
                  , "registrationPeriodFrom")}
                  {fld("Registration Period To *",
                    <input id={`${uid}-rpt`} type="date" value={form.registrationPeriodTo} onChange={(e) => set("registrationPeriodTo", e.target.value)} className={reqInputCls("registrationPeriodTo")} />
                  , "registrationPeriodTo")}
                </div>
              </div>

              {/* Section 4: File Information */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <SectionHeader icon={FileKey} title="File Information" description="Internal file reference numbers" color="amber" />
                <div className="px-6 py-5 grid grid-cols-2 gap-4">
                  {fld("File Year No",
                    <input id={`${uid}-fyn`} value={form.fileYearNo} onChange={(e) => set("fileYearNo", e.target.value)} placeholder="Year number" className={inputCls} />
                  )}
                  {fld("File Note No",
                    <input id={`${uid}-fnn`} value={form.fileNoteNo} onChange={(e) => set("fileNoteNo", e.target.value)} placeholder="Note number" className={inputCls} />
                  )}
                  {fld("File Page No",
                    <input id={`${uid}-fpn`} value={form.filePageNo} onChange={(e) => set("filePageNo", e.target.value)} placeholder="Page number" className={inputCls} />
                  )}
                  {fld("Bundle No",
                    <input id={`${uid}-bn`} value={form.bundleNo} onChange={(e) => set("bundleNo", e.target.value)} placeholder="Bundle number" className={inputCls} />
                  )}
                </div>
              </div>

              {/* Additional Details */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <SectionHeader icon={Landmark} title="Additional Details" description="Banking information and supporting documentation" color="blue" />
                <div className="px-6 py-5 grid grid-cols-2 gap-4">
                  {fld("PAN Number (Registration Doc)",
                    <input id={`${uid}-pan`} value={form.panNumber} onChange={(e) => set("panNumber", e.target.value.toUpperCase())} placeholder="ABCDE1234F" className={inputCls} />
                  )}
                  {fld("GST Number",
                    <input id={`${uid}-gst`} value={form.gstNumber} onChange={(e) => set("gstNumber", e.target.value.toUpperCase())} placeholder="27ABCDE1234F1Z5" className={inputCls} />
                  )}
                  {fld("Bank Name",
                    <input id={`${uid}-bk`} value={form.bankName} onChange={(e) => set("bankName", e.target.value)} placeholder="State Bank of India" className={inputCls} />
                  )}
                  {fld("Bank Account Number",
                    <input id={`${uid}-bac`} value={form.bankAccount} onChange={(e) => set("bankAccount", e.target.value)} placeholder="Account number" className={inputCls} />
                  )}
                  <div className="col-span-2">
                    {fld("IFSC Code",
                      <input id={`${uid}-ifsc`} value={form.bankIfsc} onChange={(e) => set("bankIfsc", e.target.value.toUpperCase())} placeholder="SBIN0012345" className={inputCls} />
                    )}
                  </div>
                </div>
              </div>

            </>
          )}

          {/* Action bar */}
          {view === "registration" && (
            <div className="flex gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-6 py-4 shadow-sm">
              <button onClick={onBack} disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || !selectedMc}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
                {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                {isEdit ? "Save Registration" : "Register Contractor"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Contractor View Modal ─────────────────────────────────────────────────────

function ContractorViewModal({ mc, onClose, onEdit }: {
  mc: MergedContractor;
  onClose: () => void;
  onEdit: () => void;
}) {
  const r = mc.registration!;

  const field = (label: string, value?: string) => (
    <div key={label}>
      <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-sm break-words ${value ? "text-gray-800 dark:text-gray-200" : "text-gray-400 dark:text-gray-500"}`}>{value || "—"}</p>
    </div>
  );

  const secTitle = (text: string) => (
    <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">{text}</p>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 px-4 py-6 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl border border-gray-200 dark:border-gray-700 my-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${avatarColor(mc.contractorId ?? mc.email)} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
              {initials(mc.firmName || mc.name)}
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">{mc.firmName || "—"}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{mc.contractorId || "—"} · {mc.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* Basic Details — full width */}
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
            {secTitle("Basic Details")}
            <div className="grid grid-cols-4 gap-3">
              {field("Contractor ID",  mc.contractorId)}
              {field("Firm Name",      mc.firmName)}
              {field("First Name",     mc.firstName || mc.name.split(" ")[0])}
              {field("Last Name",      mc.lastName  || mc.name.split(" ").slice(-1)[0])}
              {field("Email",          mc.email)}
              {field("Mobile",         mc.mobile)}
              {field("PAN Number",     mc.panNo)}
              {field("Address",        mc.address)}
            </div>
          </div>

          {/* Two-column: Registration Info + Payment / Validity / File */}
          <div className="grid grid-cols-2 gap-4 items-start">

            {/* LEFT — Registration Information */}
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
              {secTitle("Registration Information")}
              <div className="grid grid-cols-2 gap-3">
                {field("Register Sr. No.",           r.registerSrNo)}
                {field("Registration Class Sr. No.", r.registrationClassSrNo)}
                {field("Registration No.",           r.registrationNumber)}
                {field("Registration Class",         r.registrationClass)}
                {field("Work Capacity",              r.workCapacity)}
                {field("Educational Qualification",  r.educationalQualification)}
                <div className="col-span-2">{field("Guideline Booklet", r.guidelineBooklet)}</div>
              </div>
            </div>

            {/* RIGHT — Payment + Validity + File */}
            <div className="space-y-4">

              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                {secTitle("Payment Information")}
                <div className="grid grid-cols-2 gap-3">
                  {field("Receipt / DD No",   r.receiptOrDDNo)}
                  {field("Receipt / DD Date", r.receiptOrDDDate)}
                  {field("Registration Fee",  r.registrationFee)}
                  {field("Certificate Amount",r.certificateAmount)}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                {secTitle("Validity Information")}
                <div className="grid grid-cols-2 gap-3">
                  {field("Registration Date",      r.registrationDate)}
                  {field("Validity Years",          r.validityYears)}
                  {field("Period From",             r.registrationPeriodFrom)}
                  {field("Period To",               r.registrationPeriodTo ?? r.validUpto)}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                {secTitle("File Information")}
                <div className="grid grid-cols-2 gap-3">
                  {field("File Year No", r.fileYearNo)}
                  {field("File Note No", r.fileNoteNo)}
                  {field("File Page No", r.filePageNo)}
                  {field("Bundle No",    r.bundleNo)}
                </div>
              </div>

            </div>
          </div>

          {/* Additional Details — full width */}
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
            {secTitle("Additional Details")}
            <div className="grid grid-cols-5 gap-3">
              {field("PAN Number",       r.panNumber)}
              {field("GST Number",       r.gstNumber)}
              {field("Bank Name",        r.bankName)}
              {field("Account Number",   r.bankAccountNumber)}
              {field("IFSC Code",        r.bankIfscCode)}
            </div>
          </div>

          {/* History */}
          {mc.history.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
              {secTitle(`History (${mc.history.length})`)}
              <div className="space-y-2">
                {[...mc.history].reverse().map((h) => (
                  <div key={h.id} className="flex items-center gap-3 text-sm">
                    <span className="text-xs text-gray-400 w-24 shrink-0">{h.date}</span>
                    <span className="text-gray-800 dark:text-gray-200 flex-1">{h.action}</span>
                    <span className="text-xs text-gray-400 shrink-0">{h.performedBy}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/60 rounded-b-2xl">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Close</button>
          <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors">
            <Edit2 className="w-4 h-4" /> Edit Registration
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ContractorViewPage — full-page read-only contractor details ───────────────
function ContractorViewPage({ mc, onBack, onEdit }: { mc: MergedContractor; onBack: () => void; onEdit: () => void }) {
  const r = mc.registration!;

  const field = (label: string, value?: string) => (
    <div key={label} className="flex flex-col gap-1">
      <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-sm break-words ${value ? "text-gray-800 dark:text-gray-200" : "text-gray-400 dark:text-gray-500"}`}>{value || "—"}</p>
    </div>
  );

  const card = (children: React.ReactNode) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
      {children}
    </div>
  );

  const secTitle = (text: string) => (
    <div className="flex items-center gap-2 mb-5 pb-3 border-b border-gray-100 dark:border-gray-700">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{text}</h3>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Page header + breadcrumb */}
      {card(
        <>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
            <button onClick={onBack} className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors font-medium">
              Contractor Management
            </button>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            <span className="text-gray-700 dark:text-gray-200 font-medium">View Contractor</span>
          </div>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-full ${avatarColor(mc.contractorId ?? mc.email)} flex items-center justify-center text-white text-lg font-bold shrink-0`}>
                {initials(mc.firmName || mc.name)}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{mc.firmName || "—"}</h2>
                <p className="text-sm text-gray-400 mt-0.5">{mc.contractorId || "—"}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{mc.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={onBack}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button onClick={onEdit}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors">
                <Edit2 className="w-4 h-4" /> Edit Registration
              </button>
            </div>
          </div>
        </>
      )}

      {/* 1. Basic Details */}
      {card(
        <>
          {secTitle("Basic Details")}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {field("Contractor ID", mc.contractorId)}
            {field("Firm Name",     mc.firmName)}
            {field("First Name",    mc.firstName || mc.name.split(" ")[0])}
            {field("Last Name",     mc.lastName  || mc.name.split(" ").slice(-1)[0])}
            {field("Email",         mc.email)}
            {field("Mobile",        mc.mobile)}
            {field("PAN Number",    mc.panNo)}
            <div className="col-span-2 sm:col-span-4">{field("Address", mc.address)}</div>
          </div>
        </>
      )}

      {/* 2. Registration Information */}
      {card(
        <>
          {secTitle("Registration Information")}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {field("Register Sr. No.",           r.registerSrNo)}
            {field("Registration Class Sr. No.", r.registrationClassSrNo)}
            {field("Registration No.",           r.registrationNumber)}
            {field("Registration Class",         r.registrationClass)}
            {field("Work Capacity",              r.workCapacity)}
            {field("Validity Years",             r.validityYears)}
            <div className="col-span-2 sm:col-span-3">{field("Educational Qualification", r.educationalQualification)}</div>
            <div className="col-span-2 sm:col-span-3">{field("Guideline Booklet", r.guidelineBooklet)}</div>
          </div>
        </>
      )}

      {/* 3. Validity & Period */}
      {card(
        <>
          {secTitle("Validity & Period")}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {field("Registration Date", r.registrationDate)}
            {field("Valid Up To",       r.validUpto)}
            {field("Period From",       r.registrationPeriodFrom)}
            {field("Period To",         r.registrationPeriodTo ?? r.validUpto)}
          </div>
        </>
      )}

      {/* 4. Payment Information */}
      {card(
        <>
          {secTitle("Payment Information")}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {field("Receipt / DD No",   r.receiptOrDDNo)}
            {field("Receipt / DD Date", r.receiptOrDDDate)}
            {field("Registration Fee",  r.registrationFee)}
            {field("Certificate Amount",r.certificateAmount)}
          </div>
        </>
      )}

      {/* 5. File Information */}
      {card(
        <>
          {secTitle("File Information")}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {field("File Year No", r.fileYearNo)}
            {field("File Note No", r.fileNoteNo)}
            {field("File Page No", r.filePageNo)}
            {field("Bundle No",    r.bundleNo)}
          </div>
        </>
      )}

      {/* 6. Bank & Finance */}
      {card(
        <>
          {secTitle("Bank & Finance")}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {field("PAN Number",     r.panNumber)}
            {field("GST Number",     r.gstNumber)}
            {field("Bank Name",      r.bankName)}
            {field("Account Number", r.bankAccountNumber)}
            {field("IFSC Code",      r.bankIfscCode)}
          </div>
        </>
      )}

      {/* 7. History */}
      {mc.history.length > 0 && card(
        <>
          {secTitle(`Registration History (${mc.history.length})`)}
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {[...mc.history].reverse().map((h) => (
              <div key={h.id} className="flex items-center gap-4 py-3 text-sm">
                <span className="text-xs text-gray-400 w-24 shrink-0">{h.date}</span>
                <span className="text-gray-800 dark:text-gray-200 flex-1">{h.action}</span>
                <span className="text-xs text-gray-400 shrink-0">{h.performedBy}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── New ContractorManagementTab ───────────────────────────────────────────────

function ContractorManagementTab({ onNavigateToUsers, onFullPage }: { onNavigateToUsers: () => void; onFullPage?: (active: boolean) => void }) {
  const [view,        setView]        = useState<"list" | "form">("list");
  const [editTarget,  setEditTarget]  = useState<MergedContractor | null>(null);
  const [viewPage,    setViewPage]    = useState<MergedContractor | null>(null);
  const [users,       setUsers]       = useState<IUser[]>([]);
  const [contractors, setContractors] = useState<IContractor[]>([]);
  const [search,      setSearch]      = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const currentUser = store.getCurrentUser();

  const reload = useCallback(() => {
    setUsers(store.getAllUsers());
    setContractors(store.getAllContractors());
  }, []);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { onFullPage?.(viewPage !== null); }, [viewPage, onFullPage]);

  const merged = useMemo(() => buildMergedList(users, contractors), [users, contractors]);

  const unregisteredUsers = useMemo(() =>
    users.filter((u) =>
      (u.role === "Contractor" || u.userType === "Contractor") &&
      !contractors.some((c) => (c.userId === u.id || c.email === u.email) && c.registration)
    ),
    [users, contractors]
  );

  // Only registered contractors appear in the table
  const registeredMerged = useMemo(() => merged.filter((mc) => mc.registration != null), [merged]);

  const filtered = registeredMerged.filter((mc) => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      mc.name.toLowerCase().includes(q) ||
      mc.firmName.toLowerCase().includes(q) ||
      (mc.contractorId ?? "").toLowerCase().includes(q) ||
      mc.email.toLowerCase().includes(q);
    const matchClass  = classFilter === "all" || mc.registration?.registrationClass === classFilter;
    return matchSearch && matchClass;
  });

  function handleSaveRegistration(mc: MergedContractor, form: RegFormData, entry: IContractorHistoryEntry) {
    const reg: IContractorRegistration = {
      registrationNumber:       form.registrationNo,
      registrationClass:        form.registrationClass,
      validUpto:                form.registrationPeriodTo || form.registrationDate || "",
      panNumber:                form.panNumber    || undefined,
      gstNumber:                form.gstNumber    || undefined,
      address:                  undefined,
      bankName:                 form.bankName     || undefined,
      bankAccountNumber:        form.bankAccount  || undefined,
      bankIfscCode:             form.bankIfsc     || undefined,
      registerSrNo:             form.registerSrNo || undefined,
      registrationClassSrNo:    form.registrationClassSrNo || undefined,
      workCapacity:             form.workCapacity || undefined,
      educationalQualification: form.educationalQualification || undefined,
      guidelineBooklet:         form.guidelineBooklet || undefined,
      receiptOrDDNo:            form.receiptOrDDNo   || undefined,
      receiptOrDDDate:          form.receiptOrDDDate  || undefined,
      registrationFee:          form.registrationFee  || undefined,
      certificateAmount:        form.certificateAmount || undefined,
      registrationDate:         form.registrationDate  || undefined,
      validityYears:            form.validityYears     || undefined,
      registrationPeriodFrom:   form.registrationPeriodFrom || undefined,
      registrationPeriodTo:     form.registrationPeriodTo   || undefined,
      fileYearNo:               form.fileYearNo   || undefined,
      fileNoteNo:               form.fileNoteNo   || undefined,
      filePageNo:               form.filePageNo   || undefined,
      bundleNo:                 form.bundleNo     || undefined,
    };

    if (mc.contractorId) {
      const existing = store.getContractorById(mc.contractorId);
      store.updateContractor(mc.contractorId, {
        registration: reg,
        history: [...(existing?.history ?? []), entry],
      });
    } else {
      store.createContractor({
        userId:    mc.userId,
        name:      mc.name,
        firstName: mc.firstName,
        middleName:mc.middleName,
        lastName:  mc.lastName,
        firmName:  mc.firmName,
        email:     mc.email,
        mobile:    mc.mobile,
        status:    "Active",
        registration: reg,
        history:   [entry],
      });
    }
    toast.success("Registration saved successfully.");
    setView("list");
    setEditTarget(null);
    reload();
  }

  if (viewPage) {
    return (
      <ContractorViewPage
        mc={viewPage}
        onBack={() => setViewPage(null)}
        onEdit={() => { setEditTarget(viewPage); setViewPage(null); setView("form"); }}
      />
    );
  }

  if (view === "form") {
    return (
      <ContractorRegistrationPage
        editTarget={editTarget}
        onBack={() => { setView("list"); setEditTarget(null); }}
        onSave={handleSaveRegistration}
        onNavigateToUsers={onNavigateToUsers}
        currentUserName={currentUser?.name ?? "Admin"}
        unregisteredUsers={unregisteredUsers}
        merged={merged}
      />
    );
  }

  const openEdit = (mc: MergedContractor) => { setEditTarget(mc); setView("form"); };

  const totalContractorUsers = users.filter((u) => u.role === "Contractor" || u.userType === "Contractor").length;
  const registeredCount      = registeredMerged.length;
  const nonRegisteredCount   = Math.max(0, totalContractorUsers - registeredCount);

  return (
    <div className="space-y-5">

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Contractors",     value: totalContractorUsers, icon: Users,     color: "blue"  },
          { label: "Registered",            value: registeredCount,      icon: CheckCircle2, color: "green" },
          { label: "Not Yet Registered",    value: nonRegisteredCount,   icon: Clock,     color: "amber" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <Icon className={`w-4 h-4 text-${color}-500 dark:text-${color}-400`} />
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
            </div>
            <p className={`text-2xl font-bold text-${color}-700 dark:text-${color}-400`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
          Contractor accounts are created from{" "}
          <button onClick={onNavigateToUsers} className="underline hover:text-blue-600 dark:hover:text-blue-200 transition-colors">
            User Management → Add Master User → User Type: Contractor
          </button>
          . Contractor Management handles registration and classification only.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3 flex-1">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contractor name, firm or email…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition" />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="w-4 h-4" /></button>}
          </div>
          <div className="relative">
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}
              className="pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm appearance-none transition">
              <option value="all">All Classes</option>
              {REG_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <button
          onClick={() => { setEditTarget(null); setView("form"); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors shadow-sm shrink-0">
          <Plus className="w-4 h-4" /> Register Contractor
        </button>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Showing <strong className="text-gray-700 dark:text-gray-200">{filtered.length}</strong> of {registeredMerged.length} registered contractors
        {(search || classFilter !== "all") && (
          <button onClick={() => { setSearch(""); setClassFilter("all"); }} className="ml-2 text-blue-500 hover:underline">Clear filters</button>
        )}
      </p>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center shadow-sm">
          <HardHat className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            {search ? `No contractors match "${search}".` : "No contractors found. Create contractors from User Management."}
          </p>
          {!search && (
            <button onClick={onNavigateToUsers}
              className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors mx-auto">
              <Users className="w-4 h-4" /> Go to User Management
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                  {["Contractor ID / Firm Name", "Contact Person", "Reg. Class", "Reg. Number", "Mobile", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40">
                {filtered.map((mc) => {
                  const rowKey = mc.userId ?? mc.contractorId ?? mc.email;
                  return (
                    <tr key={rowKey} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/20 transition-colors">
                      {/* Col 1: Contractor ID + Firm Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${avatarColor(rowKey)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                            {initials(mc.firmName || mc.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{mc.firmName || "—"}</p>
                            <p className="text-xs text-gray-400 font-mono truncate">{mc.contractorId || "—"}</p>
                          </div>
                        </div>
                      </td>
                      {/* Col 2: Contact Person */}
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-700 dark:text-gray-200">{mc.name || "—"}</p>
                        <p className="text-xs text-gray-400 truncate">{mc.email}</p>
                      </td>
                      {/* Col 3: Reg. Class */}
                      <td className="px-4 py-3">
                        {mc.registration?.registrationClass ? (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                            {mc.registration.registrationClass}
                          </span>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      {/* Col 4: Reg. Number */}
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-700 dark:text-gray-200">{mc.registration?.registrationNumber || "—"}</p>
                      </td>
                      {/* Col 5: Mobile */}
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-700 dark:text-gray-200">{mc.mobile || "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setViewPage(mc)} title="View Registration Details"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEdit(mc)} title="Edit Registration"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-50 dark:border-gray-700/50 bg-gray-50/60 dark:bg-gray-700/20 flex items-center justify-between text-xs text-gray-400">
            <span>{filtered.length} contractor{filtered.length !== 1 ? "s" : ""} shown</span>
            <span>{registeredCount} registered · {nonRegisteredCount} pending registration</span>
          </div>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT — left-nav admin management layout
// ═══════════════════════════════════════════════════════════════════════════════

export function AdminManagementView() {
  const [activeSection, setActiveSection] = useState<AdminTab>("users");
  const [fullPageMode,  setFullPageMode]  = useState(false);

  // Honour ?tab= query param from dashboard quick-action links
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab");
    if (t === "role-management")  setActiveSection("roles");
    if (t === "hierarchy")        setActiveSection("hierarchy");
    if (t === "approval-chains")  setActiveSection("approval-chains");
    if (t === "document-access")  setActiveSection("document-access");
    if (t === "activity-logs")    setActiveSection("activity-logs");
  }, []);

  const activeNav = NAV_SECTIONS.find((s) => s.id === activeSection)!;

  function navigate(id: AdminTab) {
    setActiveSection(id);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">

      {/* ── Page header — hidden when a view page is open ────────────────── */}
      <div className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm flex-none ${fullPageMode ? "hidden" : ""}`}>
        <div className="px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-md flex-none">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight leading-tight">Admin Management</h1>
            <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">
              <span className="text-gray-300 dark:text-gray-600">Administration</span>
              <span className="mx-1.5 text-gray-300 dark:text-gray-600">/</span>
              <span className="text-gray-600 dark:text-gray-300 font-medium">{activeNav.label}</span>
            </p>
          </div>
        </div>

        {/* ── Horizontal tab bar ─────────────────────────────────────────── */}
        <nav
          aria-label="Admin management sections"
          className="flex overflow-x-auto scrollbar-none border-t border-gray-100 dark:border-gray-700/60 px-4 sm:px-6"
        >
          {NAV_SECTIONS.map((section) => {
            const Icon     = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => navigate(section.id)}
                aria-current={isActive ? "page" : undefined}
                className={`
                  relative flex-none flex items-center gap-2 px-4 py-3 text-sm font-medium
                  whitespace-nowrap border-b-2 transition-colors
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500
                  ${isActive
                    ? "border-blue-600 dark:border-blue-400 text-blue-700 dark:text-blue-300"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
                  }
                `}
              >
                <Icon className={`w-4 h-4 flex-none ${isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"}`} />
                {section.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Full-width content area ───────────────────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="p-4 sm:p-6">
          {activeSection === "users"           && <UserManagementTab onFullPage={setFullPageMode} />}
          {activeSection === "contractors"     && <ContractorManagementTab onNavigateToUsers={() => navigate("users")} onFullPage={setFullPageMode} />}
          {activeSection === "roles"           && <RoleManagementTab />}
          {activeSection === "hierarchy"       && <HierarchyTab />}
          {activeSection === "approval-chains" && <ApprovalChainsTab />}
          {activeSection === "document-access" && <DocumentAccessTab />}
          {activeSection === "activity-logs"   && <ActivityLogsTab />}
        </div>
      </main>
    </div>
  );
}
