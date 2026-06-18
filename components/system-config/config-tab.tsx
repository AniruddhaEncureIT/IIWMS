"use client";

import { useState } from "react";
import {
  Building2, GitBranch, ShieldCheck, FileKey, ChevronRight, ChevronDown,
  CheckCircle2, Circle, Settings, Lock, Eye, Pencil, AlertTriangle,
} from "lucide-react";
import { store } from "@/store/iims.store";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface OrgNode { id: string; name: string; type: "Division" | "Sub Division" | "Office"; children?: OrgNode[]; }
interface ApprovalStep { order: number; role: string; action: string; canDelegate: boolean; }
interface WorkflowDef { id: string; name: string; steps: ApprovalStep[]; }
interface DocAccess { documentType: string; allowedRoles: string[]; accessLevel: "View" | "Edit" | "Manage"; }

// ─── Seed data (config-only, not persisted) ────────────────────────────────────

const ORG_TREE: OrgNode[] = [
  {
    id: "div-pune", name: "Pune Division", type: "Division",
    children: [
      {
        id: "sd-pune", name: "Pune Sub Division", type: "Sub Division",
        children: [
          { id: "off-pune-city", name: "Pune City Office", type: "Office" },
          { id: "off-pimpri",   name: "Pimpri Office",    type: "Office" },
        ],
      },
      {
        id: "sd-baramati", name: "Baramati Sub Division", type: "Sub Division",
        children: [
          { id: "off-baramati",  name: "Baramati Office",  type: "Office" },
          { id: "off-indapur",   name: "Indapur Office",   type: "Office" },
        ],
      },
      {
        id: "sd-haveli", name: "Haveli Sub Division", type: "Sub Division",
        children: [
          { id: "off-haveli",    name: "Haveli Office",    type: "Office" },
          { id: "off-mulshi",    name: "Mulshi Office",    type: "Office" },
        ],
      },
    ],
  },
];

const WORKFLOWS: WorkflowDef[] = [
  {
    id: "wf-tender", name: "Tender Approval",
    steps: [
      { order: 1, role: "Junior Engineer",     action: "Prepare DTP",        canDelegate: false },
      { order: 2, role: "Deputy Engineer",     action: "Verify DTP",         canDelegate: true  },
      { order: 3, role: "Executive Engineer",  action: "Approve & Issue NIT", canDelegate: false },
    ],
  },
  {
    id: "wf-loa", name: "LOA Issuance",
    steps: [
      { order: 1, role: "Executive Engineer",  action: "Issue LOA",          canDelegate: false },
    ],
  },
  {
    id: "wf-mb", name: "MB Approval",
    steps: [
      { order: 1, role: "Junior Engineer",     action: "Record Measurements", canDelegate: false },
      { order: 2, role: "Deputy Engineer",     action: "Verify MB",           canDelegate: false },
      { order: 3, role: "Executive Engineer",  action: "Approve MB",          canDelegate: true  },
    ],
  },
  {
    id: "wf-payment", name: "Payment Processing",
    steps: [
      { order: 1, role: "Executive Engineer",  action: "Approve MB",          canDelegate: false },
      { order: 2, role: "Finance Officer",     action: "Process Payment",     canDelegate: false },
      { order: 3, role: "Divisional Accountant", action: "Deduct & Release", canDelegate: false },
    ],
  },
];

const DOC_ACCESS: DocAccess[] = [
  { documentType: "DTP Document",          allowedRoles: ["Junior Engineer","Deputy Engineer","Executive Engineer","Superintendent Engineer","Chief Engineer"], accessLevel: "Manage" },
  { documentType: "Tender Documents",      allowedRoles: ["Deputy Engineer","Executive Engineer","Superintendent Engineer","Chief Engineer","Contractor"], accessLevel: "View" },
  { documentType: "Bid Sheets",            allowedRoles: ["Executive Engineer","Superintendent Engineer","Chief Engineer"], accessLevel: "Manage" },
  { documentType: "LOI",                   allowedRoles: ["Executive Engineer","Contractor","Superintendent Engineer","Chief Engineer"], accessLevel: "View" },
  { documentType: "Work Order",            allowedRoles: ["Executive Engineer","Contractor","Junior Engineer","Deputy Engineer"], accessLevel: "View" },
  { documentType: "MB Records",            allowedRoles: ["Junior Engineer","Deputy Engineer","Executive Engineer","Contractor"], accessLevel: "Edit" },
  { documentType: "Payment Certificates",  allowedRoles: ["Finance Officer","Divisional Accountant","Executive Engineer"], accessLevel: "Manage" },
  { documentType: "Sanction Letters",      allowedRoles: ["Executive Engineer","Superintendent Engineer","Chief Engineer"], accessLevel: "Manage" },
];

// ─── Org Tree Node ─────────────────────────────────────────────────────────────

function OrgTreeNode({ node, depth = 0 }: { node: OrgNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = !!node.children?.length;
  const typeColors: Record<string, string> = {
    Division:    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    "Sub Division": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    Office:      "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  };

  return (
    <div>
      <div
        onClick={() => hasChildren && setOpen((o) => !o)}
        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors ${hasChildren ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50" : "cursor-default"}`}
        style={{ marginLeft: `${depth * 20}px` }}
      >
        <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 flex-1">{node.name}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeColors[node.type]}`}>{node.type}</span>
        {hasChildren && (open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />)}
      </div>
      {open && node.children?.map((child) => (
        <OrgTreeNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

// ─── Workflow Card ─────────────────────────────────────────────────────────────

function WorkflowCard({ wf }: { wf: WorkflowDef }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <button onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <GitBranch className="w-4 h-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{wf.name}</p>
            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{wf.steps.length} step{wf.steps.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" aria-hidden="true" /> : <ChevronRight className="w-4 h-4 text-gray-400" aria-hidden="true" />}
      </button>
      {open && (
        <div className="px-5 pb-5">
          <div className="relative">
            {wf.steps.map((step, idx) => (
              <div key={step.order} className="flex gap-4 mb-3 last:mb-0">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">{step.order}</div>
                  {idx < wf.steps.length - 1 && <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-700 mt-1" />}
                </div>
                <div className="flex-1 pb-3">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{step.role}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{step.action}</p>
                  {step.canDelegate && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
                      <AlertTriangle className="w-3 h-3" /> Can Delegate
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Config Tab ────────────────────────────────────────────────────────────────

const ACCESS_ICONS: Record<string, React.ReactNode> = {
  View:   <Eye    className="w-3.5 h-3.5" />,
  Edit:   <Pencil className="w-3.5 h-3.5" />,
  Manage: <ShieldCheck className="w-3.5 h-3.5" />,
};

const ACCESS_COLORS: Record<string, string> = {
  View:   "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  Edit:   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Manage: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
};

const YEARS = ["2024-2025", "2025-2026", "2023-2024", "2022-2023"];

export function ConfigTab() {
  const allItems   = store.getAllRateItems();
  const ssrYears   = Array.from(new Set(allItems.filter((r) => r.type === "SSR").map((r) => r.year))).sort().reverse();
  const dsrYears   = Array.from(new Set(allItems.filter((r) => r.type === "DSR").map((r) => r.year))).sort().reverse();
  const [ssrYear, setSsrYear]  = useState(ssrYears[0] ?? "2024-2025");
  const [dsrYear, setDsrYear]  = useState(dsrYears[0] ?? "2024-2025");
  const [saved,   setSaved]    = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-8">
      {/* Active Schedule Years */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
            <Settings className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Active Schedule Years</h3>
            <p className="text-xs text-gray-400 mt-0.5">The year used by default when creating new estimates.</p>
          </div>
        </div>
        <div className="px-6 py-5">
          <div className="grid grid-cols-2 gap-6">
            {[
              { label: "SSR (State Schedule of Rates)", color: "blue", value: ssrYear, onChange: setSsrYear, years: ssrYears.length ? ssrYears : YEARS },
              { label: "DSR (District Schedule of Rates)", color: "violet", value: dsrYear, onChange: setDsrYear, years: dsrYears.length ? dsrYears : YEARS },
            ].map(({ label, color, value, onChange, years }) => (
              <div key={label}>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{label}</label>
                <div className="flex items-center gap-3">
                  <select value={value} onChange={(e) => onChange(e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition">
                    {years.map((y) => <option key={y}>{y}</option>)}
                  </select>
                  <span className={`text-xs font-bold px-2.5 py-1.5 rounded-full ${color === "blue" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"}`}>Active</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {allItems.filter((r) => r.type === (color === "blue" ? "SSR" : "DSR") && r.year === value).length} items in this year
                </p>
              </div>
            ))}
          </div>
          <button onClick={handleSave}
            className={`mt-5 flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${saved ? "bg-green-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}>
            {saved ? <><CheckCircle2 className="w-4 h-4" /> Saved!</> : <><Settings className="w-4 h-4" /> Save Settings</>}
          </button>
        </div>
      </section>

      {/* Organizational Structure */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Organizational Structure</h3>
            <p className="text-xs text-gray-400 mt-0.5">Division → Sub Division → Office hierarchy for Pune ZP.</p>
          </div>
        </div>
        <div className="px-4 py-4">
          {ORG_TREE.map((node) => <OrgTreeNode key={node.id} node={node} />)}
        </div>
      </section>

      {/* Approval Workflows */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <GitBranch className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Approval Workflows</h3>
            <p className="text-xs text-gray-400 mt-0.5">Multi-step approval chains for each process type.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {WORKFLOWS.map((wf) => <WorkflowCard key={wf.id} wf={wf} />)}
        </div>
      </section>

      {/* Document Access Matrix */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
            <FileKey className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Document Access Matrix</h3>
            <p className="text-xs text-gray-400 mt-0.5">Role-based access levels per document type.</p>
          </div>
        </div>
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
                  <td className="px-5 py-3.5 text-sm font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      {row.documentType}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      {row.allowedRoles.map((r) => (
                        <span key={r} className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{r}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${ACCESS_COLORS[row.accessLevel]}`}>
                      {ACCESS_ICONS[row.accessLevel]}
                      {row.accessLevel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
