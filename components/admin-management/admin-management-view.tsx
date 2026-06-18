"use client";

import { useState, useEffect, useCallback, useId } from "react";
import { toast } from "sonner";
import {
  Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight, AlertCircle, X,
  Eye, EyeOff, Users, ShieldCheck, UserCheck, UserX, ChevronDown, Check,
  Crown, Shield, Building2, GitBranch, FileKey, Activity, Lock, Pencil,
  ChevronRight, AlertTriangle, Clock, CheckCircle2, ArrowRight, Menu,
} from "lucide-react";
import { store } from "@/store/iims.store";
import type { IUser } from "@/types/iims.types";
import type { UserRole } from "@/types/auth.types";

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

// ─── Section definition ───────────────────────────────────────────────────────

type AdminTab = "users" | "roles" | "hierarchy" | "approval-chains" | "document-access" | "activity-logs";

interface NavSection {
  id:          AdminTab;
  label:       string;
  description: string;
  icon:        React.ElementType;
}

const NAV_SECTIONS: NavSection[] = [
  { id: "users",           label: "User Management",          description: "Create, edit and manage user accounts",        icon: Users     },
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
  name: string; email: string; password: string;
  role: UserRole | ""; division: string; subDivision: string;
  status: "Active" | "Inactive";
}

const EMPTY_FORM: UserFormData = { name: "", email: "", password: "", role: "", division: "Pune Division", subDivision: "Khed Sub Division", status: "Active" };

function UserModal({ user, onClose, onSave }: { user: IUser | null; onClose: () => void; onSave: (data: UserFormData, id?: string) => void }) {
  const isEdit = !!user;
  const [form, setForm]   = useState<UserFormData>(() =>
    user ? { name: user.name, email: user.email, password: "", role: user.role as UserRole,
             division: user.division ?? "Pune Division", subDivision: user.subDivision ?? "Khed Sub Division", status: user.status }
         : EMPTY_FORM
  );
  const [showPwd, setShowPwd] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState<Partial<Record<keyof UserFormData, string>>>({});
  const uid = useId();

  function set<K extends keyof UserFormData>(k: K, v: UserFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  }

  function validate(): boolean {
    const e: Partial<Record<keyof UserFormData, string>> = {};
    if (!form.name.trim())  e.name  = "Name is required.";
    if (!form.email.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email.";
    if (!form.role)         e.role  = "Role is required.";
    if (!isEdit && !form.password.trim()) e.password = "Password is required for new users.";
    if (form.password && form.password.length < 6) e.password = "Password must be at least 6 characters.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    try { onSave(form, user?.id); } finally { setSaving(false); }
  }

  const inputCls = (err?: string) =>
    `w-full rounded-lg border ${err ? "border-red-400 dark:border-red-600" : "border-gray-200 dark:border-gray-600"} bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors`;

  const field = (label: string, key: keyof UserFormData, input: React.ReactNode) => (
    <div>
      <label htmlFor={`${uid}-${key}`} className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">{label}</label>
      {input}
      {errors[key] && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors[key]}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 px-4 py-6 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 my-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              {isEdit ? <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" /> : <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">{isEdit ? "Edit User" : "Add New User"}</h2>
              {isEdit && <p className="text-xs text-gray-400 mt-0.5">{user!.email}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {field("Full Name *", "name",
            <input id={`${uid}-name`} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Rajesh Kumar" className={inputCls(errors.name)} />
          )}
          {field("Email Address *", "email",
            <input id={`${uid}-email`} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="user@iims.gov.in" className={inputCls(errors.email)} />
          )}
          {field(isEdit ? "New Password (leave blank to keep)" : "Password *", "password",
            <div className="relative">
              <input id={`${uid}-password`} type={showPwd ? "text" : "password"} value={form.password} onChange={(e) => set("password", e.target.value)}
                placeholder={isEdit ? "Enter to change password…" : "Minimum 6 characters"} className={`${inputCls(errors.password)} pr-10`} />
              <button type="button" onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          )}
          {field("Role *", "role",
            <div className="relative">
              <select id={`${uid}-role`} value={form.role} onChange={(e) => set("role", e.target.value as UserRole)} className={`${inputCls(errors.role)} appearance-none pr-8`}>
                <option value="">— Select Role —</option>
                {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          )}
          {form.role && (
            <div className="flex items-center gap-2 -mt-1">
              <RoleBadge role={form.role} />
              <span className="text-xs text-gray-400">Group: {ROLE_META[form.role]?.group ?? "—"}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {field("Division", "division",
              <div className="relative">
                <select id={`${uid}-division`} value={form.division} onChange={(e) => set("division", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
                  {DIVISIONS.map((d) => <option key={d}>{d}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            )}
            {field("Sub-Division", "subDivision",
              <div className="relative">
                <select id={`${uid}-sub`} value={form.subDivision} onChange={(e) => set("subDivision", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
                  {SUB_DIVISIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            )}
          </div>
          {field("Status", "status",
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
          )}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/60 rounded-b-2xl">
          <button onClick={onClose} disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
            {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : isEdit ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isEdit ? "Save Changes" : "Create User"}
          </button>
        </div>
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

function UserManagementTab() {
  const [users,        setUsers]        = useState<IUser[]>([]);
  const [search,       setSearch]       = useState("");
  const [roleFilter,   setRoleFilter]   = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "Active" | "Inactive">("all");
  const [editUser,     setEditUser]     = useState<IUser | null>(null);
  const [createOpen,   setCreateOpen]   = useState(false);
  const [deleteUser,   setDeleteUser]   = useState<IUser | null>(null);
  const currentUser = store.getCurrentUser();

  const reload = useCallback(() => setUsers(store.getAllUsers()), []);
  useEffect(() => { reload(); }, [reload]);

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
    if (id) {
      const patch: Partial<IUser> = { name: data.name.trim(), email: data.email.trim().toLowerCase(), role: data.role as string, division: data.division, subDivision: data.subDivision, status: data.status };
      if (data.password.trim()) patch.password = data.password.trim();
      store.updateUser(id, patch);
      toast.success(`${data.name} updated successfully.`);
    } else {
      const existing = store.getAllUsers().find((u) => u.email.toLowerCase() === data.email.trim().toLowerCase());
      if (existing) { toast.error("A user with this email already exists."); return; }
      store.createUser({ name: data.name.trim(), email: data.email.trim().toLowerCase(), password: data.password.trim(), role: data.role as string, division: data.division, subDivision: data.subDivision, status: data.status });
      toast.success(`${data.name} created successfully.`);
    }
    setEditUser(null);
    setCreateOpen(false);
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

  return (
    <>
      {createOpen && <UserModal user={null} onClose={() => setCreateOpen(false)} onSave={(data) => handleSave(data, undefined)} />}
      {editUser   && <UserModal user={editUser} onClose={() => setEditUser(null)} onSave={(data, id) => handleSave(data, id)} />}
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
          <button onClick={() => setCreateOpen(true)}
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
            <button onClick={() => setCreateOpen(true)} className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors mx-auto">
              <Plus className="w-4 h-4" /> Add User
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                    {["User", "Role", "Division", "Status", "Last Login", "Actions"].map((h) => (
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
                        <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-gray-700 dark:text-gray-200">{user.division ?? "—"}</p>
                          <p className="text-xs text-gray-400">{user.subDivision ?? ""}</p>
                        </td>
                        <td className="px-4 py-3"><StatusToggle active={user.status === "Active"} onClick={() => handleToggleStatus(user)} disabled={isSelf} /></td>
                        <td className="px-4 py-3"><p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(user.lastLogin)}</p></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setEditUser(user)} title="Edit" className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"><Edit2 className="w-4 h-4" /></button>
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
// MAIN EXPORT — left-nav admin management layout
// ═══════════════════════════════════════════════════════════════════════════════

export function AdminManagementView() {
  const [activeSection, setActiveSection] = useState<AdminTab>("users");
  const [drawerOpen,    setDrawerOpen]    = useState(false);

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
    setDrawerOpen(false);
  }

  // Shared nav item renderer
  function NavItem({ section }: { section: NavSection }) {
    const Icon    = section.icon;
    const isActive = activeSection === section.id;
    return (
      <button
        key={section.id}
        onClick={() => navigate(section.id)}
        aria-current={isActive ? "page" : undefined}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 group relative ${
          isActive
            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-100"
        }`}
      >
        {/* Left accent bar */}
        <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r transition-all ${isActive ? "bg-blue-600 dark:bg-blue-400" : "bg-transparent group-hover:bg-gray-300 dark:group-hover:bg-gray-600"}`} />

        {/* Icon container */}
        <span className={`flex-none flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
          isActive
            ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
            : "bg-gray-100 dark:bg-gray-700/60 text-gray-500 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-600/60 group-hover:text-gray-700 dark:group-hover:text-gray-200"
        }`}>
          <Icon className="w-4 h-4" />
        </span>

        {/* Labels */}
        <span className="flex-1 min-w-0">
          <span className={`block text-sm leading-tight truncate ${isActive ? "font-bold" : "font-medium"}`}>
            {section.label}
          </span>
          <span className={`block text-xs leading-tight mt-0.5 truncate transition-colors ${
            isActive ? "text-blue-500 dark:text-blue-400" : "text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400"
          }`}>
            {section.description}
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">

      {/* ── Page header (full-width) ─────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm flex-none z-20">
        <div className="px-4 sm:px-6 py-4 flex items-center gap-4">
          {/* Mobile menu button */}
          <button
            onClick={() => setDrawerOpen((o) => !o)}
            aria-label="Open navigation menu"
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Identity */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-md flex-none">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight leading-tight">Admin Management</h1>
              <p className="text-xs text-gray-400 mt-0.5 truncate hidden sm:block">
                {/* Breadcrumb: current section */}
                <span className="text-gray-300 dark:text-gray-600">Administration</span>
                <span className="mx-1.5 text-gray-300 dark:text-gray-600">/</span>
                <span className="text-gray-600 dark:text-gray-300 font-medium">{activeNav.label}</span>
              </p>
            </div>
          </div>

          {/* Section badge — shows active section on mobile */}
          <div className="lg:hidden flex-none">
            <span className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
              {activeNav.label}
            </span>
          </div>
        </div>
      </div>

      {/* ── Body (two-column on desktop) ─────────────────────────────────── */}
      <div className="flex flex-1 relative overflow-hidden">

        {/* Mobile overlay backdrop */}
        {drawerOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 dark:bg-black/60 backdrop-blur-sm lg:hidden"
            aria-hidden="true"
            onClick={() => setDrawerOpen(false)}
          />
        )}

        {/* ── Left navigation panel ──────────────────────────────────────── */}
        <aside
          aria-label="Admin management navigation"
          className={`
            flex-none w-[268px] bg-white dark:bg-gray-800
            border-r border-gray-200 dark:border-gray-700
            flex flex-col
            transition-transform duration-200 ease-in-out
            /* Mobile: fixed off-screen drawer */
            fixed inset-y-0 left-0 z-40
            lg:static lg:translate-x-0 lg:z-auto
            ${drawerOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
          `}
        >
          {/* Drawer header — mobile only */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-700 lg:hidden flex-none">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold text-gray-800 dark:text-white">Admin Management</span>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Section label */}
          <div className="px-4 pt-4 pb-2 flex-none">
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.08em]">
              Management Sections
            </p>
          </div>

          {/* Nav items */}
          <nav className="flex-1 px-3 pb-4 space-y-0.5 overflow-y-auto">
            {NAV_SECTIONS.map((section) => (
              <NavItem key={section.id} section={section} />
            ))}
          </nav>

          {/* Footer info */}
          <div className="flex-none px-4 py-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed">
              Zilla Parishad · Pune Division
              <br />
              IIMS Administration Console
            </p>
          </div>
        </aside>

        {/* ── Right content area ─────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          {/* Section page header */}
          <div className="bg-white dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700/60 px-6 py-4 hidden lg:block">
            <div className="flex items-center gap-3">
              {(() => {
                const Icon = activeNav.icon;
                return (
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-none">
                    <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                );
              })()}
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">{activeNav.label}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{activeNav.description}</p>
              </div>
            </div>
          </div>

          {/* Section content */}
          <div className="p-4 sm:p-6">
            {activeSection === "users"           && <UserManagementTab />}
            {activeSection === "roles"           && <RoleManagementTab />}
            {activeSection === "hierarchy"       && <HierarchyTab />}
            {activeSection === "approval-chains" && <ApprovalChainsTab />}
            {activeSection === "document-access" && <DocumentAccessTab />}
            {activeSection === "activity-logs"   && <ActivityLogsTab />}
          </div>
        </main>
      </div>
    </div>
  );
}
