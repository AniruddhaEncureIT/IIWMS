"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type KeyboardEvent,
} from "react";
import {
  X,
  Minus,
  Send,
  Bot,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import type { User } from "@/types/auth.types";
import type { INotification } from "@/hooks/use-notifications";
import { store } from "@/store/iims.store";
import { NAV_BY_ROLE } from "@/components/layout/shell-nav";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "user" | "bot";

interface Message {
  id: string;
  role: Role;
  text: string;
  ts: Date;
}

// ─── Module-aware permission engine ──────────────────────────────────────────

// Allowed module keys per role — governs what the assistant can answer
const ROLE_MODULES: Record<string, Set<string>> = {
  "Sectional Engineer":                  new Set(["projects", "dtp", "mb", "drafts"]),
  "Deputy Engineer":                     new Set(["projects", "dtp", "tender", "work-order", "mb"]),
  "Executive Engineer":                  new Set(["projects", "dtp", "tender", "loa", "work-order", "mb"]),
  "Tender Clerk":                        new Set(["projects", "dtp", "tender", "loa", "bids", "work-order"]),
  "Auditor":                             new Set(["projects", "mb"]),
  "Accountant":                          new Set(["projects", "mb", "payments"]),
  "Assistant Accounts Officer":          new Set(["projects", "mb", "payments"]),
  "Chief Accounts and Finance Officer":  new Set(["projects", "mb", "payments", "budget"]),
  "Additional Chief Executive Officer":  new Set(["projects", "dtp", "tender", "loa"]),
  "Chief Executive Officer":             new Set(["projects"]),
  "System Administrator":                new Set(["users", "roles", "org", "approval-chains", "charges", "system-config", "templates", "rate-items"]),
  "Contractor":                          new Set(["projects", "mb", "payments", "work-order"]),
  "Technical System Configurator":       new Set(["rate-items", "templates", "system-config"]),
};

// Roles that see all ZP projects in the store
const ALL_PROJECT_ROLES = new Set([
  "Sectional Engineer", "Deputy Engineer", "Executive Engineer", "Tender Clerk",
  "Auditor", "Accountant", "Assistant Accounts Officer",
  "Chief Accounts and Finance Officer", "Additional Chief Executive Officer",
  "Chief Executive Officer",
]);

// Documents per role
const ROLE_DOCUMENTS: Record<string, string[]> = {
  "Sectional Engineer":                  ["Project Estimates", "DTP Documents"],
  "Deputy Engineer":                     ["Project Estimates", "DTP Documents", "Tender Documents"],
  "Executive Engineer":                  ["Project Estimates", "DTP Documents", "Tender Documents", "Work Orders", "MB Reports"],
  "Tender Clerk":                        ["DTP Documents", "Tender Documents", "LOI Documents"],
  "Auditor":                             ["MB Reports", "Audit Reports"],
  "Accountant":                          ["MB Reports", "Financial Reports"],
  "Assistant Accounts Officer":          ["MB Reports", "Financial Reports"],
  "Chief Accounts and Finance Officer":  ["MB Reports", "Financial Reports", "Audit Reports"],
  "Additional Chief Executive Officer":  ["All Documents (read-only)"],
  "Chief Executive Officer":             ["All Documents (read-only)"],
  "System Administrator":                ["Admin & Configuration Documents", "Templates", "Rate Item Schedules"],
  "Contractor":                          ["LOI", "Work Order", "Measurement Books (assigned to you)"],
  "Technical System Configurator":       ["Templates", "Rate Item Schedules"],
};

// Map query keywords to module keys
const TOPIC_MAP: Array<{ module: string; keywords: string[] }> = [
  { module: "projects",         keywords: ["project", "prj ", "prj-", "estimate", "cost estimation", "all projects", "my projects", "pending project", "create project", "project status", "project list", "assigned project", "project stage", "project workflow", "project flow", "show projects", "find project", "search project", "project details", "project info", "project count", "how many projects"] },
  { module: "dtp",              keywords: ["dtp", "draft tender paper", "tender paper"] },
  { module: "tender",           keywords: ["tender schedule", "tender id", "publish tender", "mahatender", "e-tender", "tender notice", "technical bid", "financial bid", "bid evaluation", "bids received", "my tenders", "tender queue", "tenders assigned", "tender detail"] },
  { module: "bids",             keywords: ["bidder list", "l1 bidder", "l1 determination", "quoted percentage", "bid list"] },
  { module: "loa",              keywords: ["loa", "loi", "letter of intent", "letter of award", "l1 contractor"] },
  { module: "work-order",       keywords: ["work order", "commencement", "security deposit", "performance guarantee"] },
  { module: "mb",               keywords: ["measurement book", "mb pending", "mb verification", "verify mb", "mb audit", "mb record", "running bill", "deduction", "audit observation", "mb accept", "which mb", "mb for project", "show mb", "mb details", "mb status", "my bills", "my mbs", "bill status", "how many mbs", "mb count"] },
  { module: "payments",         keywords: ["payment status", "bill payment", "disbursement", "net payable", "bill processing", "process payment", "bills under", "payment pending", "my payments", "bills pending", "payment processed", "payment history", "how much paid", "total payment", "payment amount"] },
  { module: "budget",           keywords: ["budget", "financial summary", "finance action", "budget allocation"] },
  { module: "users",            keywords: ["user list", "user management", "all users", "add user", "inactive user", "user account", "active users", "user summary", "registered users", "find user", "search user", "who is user", "user details", "user info", "staff list", "staff members", "how many users", "user count", "total users"] },
  { module: "roles",            keywords: ["role management", "system roles", "role assignment", "roles in iims", "which roles", "all roles", "list of roles", "available roles", "designations", "what roles"] },
  { module: "org",              keywords: ["org unit", "organizational", "org hierarchy", "division list", "sub division list", "which division", "gram panchayat list", "taluka list"] },
  { module: "approval-chains",  keywords: ["approval chain", "workflow chain", "approval sequence", "who approves", "approval order", "approval hierarchy", "sign-off chain"] },
  { module: "charges",          keywords: ["charge management", "gst charge", "gst rate", "gst percent", "what is gst", "labour cess", "labor cess", " cess ", "insurance charge", "insurance rate", "quality control charge", "qc charge", "contingency charge", "contingency rate", "active charges", "all charges", "configured charge"] },
  { module: "rate-items",       keywords: ["rate item", "ssr rate", "dsr rate", "schedule of rate", "ssr-", "dsr-", "rate for item", "rate lookup", "rate code", "search rate", "list rate", "show rate", "all ssr", "all dsr"] },
  { module: "templates",        keywords: ["template", "document template", "available template", "list template", "my templates", "template list"] },
  { module: "system-config",    keywords: ["system config", "configuration detail", "org name config"] },
  { module: "drafts",           keywords: ["saved draft", "my draft", "resume project", "draft project", "unsaved project"] },
];

const DENY_MSG = "You do not have access to this information. I can assist you only with the modules and records assigned to your role.";

function hit(lower: string, keywords: string[]): boolean {
  return keywords.some((kw) => lower.includes(kw));
}

function canAccess(role: string, module: string): boolean {
  return ROLE_MODULES[role]?.has(module) ?? false;
}

function detectTopic(lower: string): string | null {
  for (const entry of TOPIC_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) return entry.module;
  }
  return null;
}

function getAccessibleProjects(user: User) {
  const all = store.getAllProjects();
  if (ALL_PROJECT_ROLES.has(user.role)) return all;
  if (user.role === "Contractor") return all.filter((p) => p.workOrderData || p.tenderData?.loa);
  return [];
}

function fmt(lakhs: number) { return `₹${lakhs.toFixed(2)}L`; }
function toLakh(n: number)  { return n / 100000; }

// ── Module handlers ───────────────────────────────────────────────────────────

function handleProjects(lower: string, role: string, firstName: string, projects: ReturnType<typeof getAccessibleProjects>, actions: INotification[]): string {
  // Contractor view
  if (role === "Contractor") {
    const wo  = projects.filter((p) => p.workOrderData);
    const loa = projects.filter((p) => p.tenderData?.loa && !p.workOrderData);
    let r = "";
    if (wo.length)  r += `**Active Work Orders (${wo.length}):**\n${wo.slice(0,5).map((p) => `• **${p.id}** – ${p.projectName} (${p.status})`).join("\n")}\n\n`;
    if (loa.length) r += `**LOI Issued, Work Order Pending (${loa.length}):**\n${loa.slice(0,3).map((p) => `• **${p.id}** – ${p.projectName}`).join("\n")}`;
    return r || `No active projects assigned to you, ${firstName}.`;
  }
  // Drafts sub-query
  if (hit(lower, ["draft", "saved draft", "unsaved"])) {
    const drafts = projects.filter((p) => p.status === "Draft");
    if (!drafts.length) return `No saved drafts found, ${firstName}.`;
    return `Saved drafts (${drafts.length}):\n${drafts.slice(0,5).map((p) => `• **${p.id}** – ${p.projectName}`).join("\n")}`;
  }
  // ── "How many projects pending?" — count-only response ──────────────
  if (hit(lower, ["how many", "count of", "number of"]) && hit(lower, ["pending", "approval", "awaiting", "action"])) {
    const pa = actions.filter((n) => n.projectId);
    if (!pa.length) return `No projects are currently awaiting your action, ${firstName}.`;
    return `You currently have **${pa.length} project${pa.length !== 1 ? "s" : ""}** pending your approval. Say "show pending projects" to see the full list.`;
  }
  // Pending / action — list view
  if (hit(lower, ["pending", "awaiting", "action", "my queue", "requiring"])) {
    const pa = actions.filter((n) => n.projectId);
    if (!pa.length) return `No projects requiring your action, ${firstName}.`;
    return `Projects requiring your action (${pa.length}):\n${pa.slice(0,5).map((n) => `• **${n.title}**: ${n.message}`).join("\n")}`;
  }
  // ── Project summary / count ───────────────────────────────────────────
  if (hit(lower, ["how many", "total projects", "project summary", "project count", "count of project", "summary of project"])) {
    const byStatus: Record<string, number> = {};
    projects.forEach((p) => { byStatus[p.status] = (byStatus[p.status] ?? 0) + 1; });
    const totalAmt = projects.reduce((s, p) => s + (p.estimatedAmount ?? 0), 0);
    return `**Project Summary, ${firstName}:**\n• Total accessible: **${projects.length}**\n• Total estimated value: **${fmt(toLakh(totalAmt))}**\n\n**By Status:**\n${Object.entries(byStatus).slice(0, 10).map(([s, c]) => `• ${s}: ${c}`).join("\n")}`;
  }

  // ── Cost range filter ─────────────────────────────────────────────────
  const aboveMatch = lower.match(/(?:above|over|more\s+than|greater\s+than)\s+(?:rs\.?\s*|₹\s*)?(\d+)\s*(?:lakh|l\b)/i);
  const belowMatch = lower.match(/(?:below|under|less\s+than)\s+(?:rs\.?\s*|₹\s*)?(\d+)\s*(?:lakh|l\b)/i);
  if (aboveMatch) {
    const threshold = parseFloat(aboveMatch[1]) * 100000;
    const f = projects.filter((p) => (p.estimatedAmount ?? 0) > threshold);
    if (!f.length) return `No projects above ₹${aboveMatch[1]}L in your scope.`;
    return `Projects above **₹${aboveMatch[1]}L** (${f.length}):\n${f.slice(0, 8).map((p) => `• **${p.id}** – ${p.projectName}\n  ${fmt(toLakh(p.estimatedAmount ?? 0))} | ${p.status}`).join("\n")}`;
  }
  if (belowMatch) {
    const threshold = parseFloat(belowMatch[1]) * 100000;
    const f = projects.filter((p) => (p.estimatedAmount ?? 0) < threshold && (p.estimatedAmount ?? 0) > 0);
    if (!f.length) return `No projects below ₹${belowMatch[1]}L in your scope.`;
    return `Projects below **₹${belowMatch[1]}L** (${f.length}):\n${f.slice(0, 8).map((p) => `• **${p.id}** – ${p.projectName}\n  ${fmt(toLakh(p.estimatedAmount ?? 0))} | ${p.status}`).join("\n")}`;
  }

  // ── Location filter — dynamic: searches ALL location fields in actual data ──
  // No hardcoded location names — valid locations discovered from project records.
  {
    const locStopW = new Set([...SEARCH_STOP_WORDS, "project", "projects"]);
    const locTerms  = lower.split(/\s+/).filter((w) => w.length > 3 && !locStopW.has(w));
    if (locTerms.length > 0) {
      // A term qualifies as a location only when it exactly matches a taluka or
      // gramPanchayat in the live data — prevents generic words from false-matching.
      const locTerm = locTerms.find((t) =>
        projects.some(
          (p) => p.taluka.toLowerCase() === t || p.gramPanchayat.toLowerCase() === t
        )
      );
      if (locTerm) {
        const f = projects.filter(
          (p) =>
            p.taluka.toLowerCase() === locTerm ||
            p.gramPanchayat.toLowerCase() === locTerm ||
            p.division.toLowerCase().includes(locTerm) ||
            (p.subDivision ?? "").toLowerCase().includes(locTerm)
        );
        if (f.length > 0 && f.length < projects.length) {
          const cap = locTerm.charAt(0).toUpperCase() + locTerm.slice(1);
          return `Projects in **${cap}** (${f.length}):\n${f.slice(0, 8).map((p) => `• **${p.id}** – ${p.projectName} (${p.status})`).join("\n")}${f.length > 8 ? `\n_…and ${f.length - 8} more_` : ""}`;
        }
      }
    }
  }

  // ── Work activity filter — dynamic: searches actual workActivity field values ──
  // No hardcoded activity categories — discovers activity types from project data.
  {
    const actStopW = new Set([...SEARCH_STOP_WORDS, "project", "projects"]);
    const actTerms  = lower.split(/\s+/).filter((w) => w.length > 3 && !actStopW.has(w));
    if (actTerms.length > 0) {
      const actMatched = projects.filter((p) =>
        actTerms.some((t) => (p.workActivity ?? "").toLowerCase().includes(t))
      );
      if (actMatched.length > 0 && actMatched.length < projects.length) {
        const freq: Record<string, number> = {};
        actMatched.forEach((p) => {
          if (p.workActivity) freq[p.workActivity] = (freq[p.workActivity] ?? 0) + 1;
        });
        const topActivity =
          Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Matching Projects";
        return `**${topActivity} (${actMatched.length}):**\n${actMatched.slice(0, 8).map((p) => `• **${p.id}** – ${p.projectName} (${p.status})`).join("\n")}${actMatched.length > 8 ? `\n_…and ${actMatched.length - 8} more_` : ""}`;
      }
    }
  }

  if (!projects.length) return `No projects found in your scope, ${firstName}.`;

  // ── Project name keyword search ───────────────────────────────────────
  // Strip stop words and search remaining terms against project names
  const stopW = new Set(["project", "projects", "show", "find", "list", "get", "search", "what", "which", "any", "give", "all", "the", "are", "there", "have", "for", "with", "that", "this", "those"]);
  const terms = lower.split(/\s+/).filter((w) => w.length > 3 && !stopW.has(w));
  if (terms.length && !hit(lower, ["all projects", "my projects", "project list"])) {
    const found = projects.filter((p) => terms.some((t) => p.projectName.toLowerCase().includes(t)));
    if (found.length > 0 && found.length < projects.length) {
      return `Matching projects (${found.length}):\n${found.slice(0, 8).map((p) => `• **${p.id}** – ${p.projectName} (${p.status})`).join("\n")}${found.length > 8 ? `\n_…and ${found.length - 8} more_` : ""}`;
    }
  }

  const listed = projects.slice(0, 8);
  return `You can access **${projects.length} project${projects.length !== 1 ? "s" : ""}**, ${firstName}:\n${listed.map((p) => `• **${p.id}** – ${p.projectName} (${p.status})`).join("\n")}${projects.length > 8 ? `\n_…and ${projects.length - 8} more_` : ""}`;
}

function handleDTP(lower: string, role: string, firstName: string, projects: ReturnType<typeof getAccessibleProjects>, actions: INotification[]): string {
  const dtpActions = actions.filter((n) => n.id.includes("dtp") || n.title.toLowerCase().includes("dtp"));
  if (role === "Sectional Engineer") {
    const ready = projects.filter((p) => p.status === "Cost Approved" && !p.dtpData);
    if (!ready.length) return `No projects pending DTP preparation, ${firstName}.`;
    return `Projects ready for DTP preparation (${ready.length}):\n${ready.slice(0,5).map((p) => `• **${p.id}** – ${p.projectName} (${fmt(toLakh(p.estimatedAmount ?? 0))})`).join("\n")}`;
  }
  if (["Deputy Engineer", "Executive Engineer"].includes(role)) {
    const pending = dtpActions.filter((n) => n.category === "action");
    if (!pending.length) return `No DTP reviews pending for you, ${firstName}.`;
    return `DTP items awaiting your review:\n${pending.slice(0,5).map((n) => `• **${n.title}**: ${n.message}`).join("\n")}`;
  }
  if (role === "Additional Chief Executive Officer") {
    if (!dtpActions.length) return `No DTP approvals pending, ${firstName}.`;
    return `DTP approvals pending your sign-off:\n${dtpActions.slice(0,5).map((n) => `• **${n.title}**: ${n.message}`).join("\n")}`;
  }
  // Tender Clerk: sanctioned DTP
  const sanctioned = projects.filter((p) => p.status === "DTP Sanctioned");
  if (!sanctioned.length) return `No DTP-sanctioned projects found, ${firstName}.`;
  return `DTP-sanctioned projects ready for tender (${sanctioned.length}):\n${sanctioned.slice(0,5).map((p) => `• **${p.id}** – ${p.projectName}`).join("\n")}`;
}

function handleTender(lower: string, role: string, firstName: string, projects: ReturnType<typeof getAccessibleProjects>, actions: INotification[]): string {
  const tenderActions = actions.filter((n) => n.title.toLowerCase().includes("tender") || n.id.startsWith("tc-"));
  if (role === "Tender Clerk") {
    // Schedule dates
    if (hit(lower, ["schedule", "closing date", "open date", "publishing date"])) {
      const published = projects.filter((p) => p.tenderData?.publishingDate);
      if (!published.length) return `No published tenders found, ${firstName}.`;
      return `Tender schedules:\n${published.slice(0,5).map((p) => {
        const t = p.tenderData!;
        return `• **${p.id}** – ${p.projectName}\n  Published: ${t.publishingDate} | Closing: ${t.closingDate}`;
      }).join("\n")}`;
    }
    // Tender IDs
    if (hit(lower, ["tender id", "tender number", "reference id", "mahatender"])) {
      const withId = projects.filter((p) => p.tenderData?.tenderId || p.tenderData?.mahaTenderReferenceId);
      if (!withId.length) return `No tender IDs assigned yet, ${firstName}.`;
      return `Tender IDs:\n${withId.slice(0,5).map((p) => `• **${p.id}** – ${p.tenderData!.tenderId ?? "—"} | MahaTender: ${p.tenderData!.mahaTenderReferenceId ?? "Pending"}`).join("\n")}`;
    }
    // Technical bid
    if (hit(lower, ["technical bid", "tech bid"])) {
      const tb = projects.filter((p) => p.tenderData?.technicalBid);
      if (!tb.length) return `No technical bid evaluations in progress, ${firstName}.`;
      return `Technical bid status:\n${tb.slice(0,5).map((p) => {
        const bidders = p.tenderData!.technicalBid!.bidders ?? [];
        return `• **${p.id}** – ${p.projectName}: ${bidders.length} bidder${bidders.length !== 1 ? "s" : ""} | ${p.tenderData!.technicalBid!.status}`;
      }).join("\n")}`;
    }
    // Financial bid / L1
    if (hit(lower, ["financial bid", "l1 bidder", "l1 determination", "bidder", "quoted percentage"])) {
      const fb = projects.filter((p) => p.tenderData?.financialBid?.l1Bidder);
      if (!fb.length) return `No financial bid evaluations completed, ${firstName}.`;
      return `Financial bid results:\n${fb.slice(0,5).map((p) => {
        const l1 = p.tenderData!.financialBid!.l1Bidder!;
        return `• **${p.id}** – ${p.projectName}\n  L1: ${l1.name} | Quoted: ${l1.quotedPercentage ?? "—"}%`;
      }).join("\n")}`;
    }
  }
  if (!tenderActions.length) return `No tender actions pending for you, ${firstName}.`;
  return `Tender actions for your role:\n${tenderActions.slice(0,5).map((n) => `• **${n.title}**: ${n.message}`).join("\n")}`;
}

function handleLOA(lower: string, role: string, firstName: string, projects: ReturnType<typeof getAccessibleProjects>, actions: INotification[]): string {
  const loaProjects = projects.filter((p) => p.tenderData?.loa);
  if (role === "Tender Clerk") {
    if (!loaProjects.length) return `No LOIs issued yet, ${firstName}.`;
    return `LOI-issued projects (${loaProjects.length}):\n${loaProjects.slice(0,5).map((p) => {
      const loa = p.tenderData!.loa!;
      return `• **${p.id}** – ${p.projectName}\n  Contractor: ${loa.l1Contractor} | Amount: ${fmt(toLakh(loa.approvedAmount))} | Status: ${loa.status}`;
    }).join("\n")}`;
  }
  if (role === "Executive Engineer") {
    const pending = actions.filter((n) => n.id.startsWith("ee-loa") || n.title.toLowerCase().includes("loi") || n.title.toLowerCase().includes("loa"));
    if (!pending.length) return `No LOI issuance actions pending, ${firstName}.`;
    return `LOI actions pending:\n${pending.slice(0,5).map((n) => `• **${n.title}**: ${n.message}`).join("\n")}`;
  }
  if (role === "Additional Chief Executive Officer") {
    const pending = actions.filter((n) => n.title.toLowerCase().includes("loi") || n.title.toLowerCase().includes("loa") || n.id.includes("loa"));
    if (!pending.length) return `No LOI approvals pending, ${firstName}.`;
    return `LOI approvals pending your sign-off:\n${pending.slice(0,5).map((n) => `• **${n.title}**: ${n.message}`).join("\n")}`;
  }
  if (role === "Contractor") {
    if (!loaProjects.length) return `No LOIs issued to you yet, ${firstName}.`;
    return `LOIs issued to you (${loaProjects.length}):\n${loaProjects.slice(0,5).map((p) => {
      const loa = p.tenderData!.loa!;
      return `• **${p.id}** – ${p.projectName} | ${fmt(toLakh(loa.approvedAmount))} | ${loa.status}`;
    }).join("\n")}`;
  }
  if (!loaProjects.length) return `No LOI information found, ${firstName}.`;
  return `LOI status (${loaProjects.length} project${loaProjects.length !== 1 ? "s" : ""}):\n${loaProjects.slice(0,5).map((p) => `• **${p.id}** – ${p.projectName}: ${p.tenderData!.loa!.status}`).join("\n")}`;
}

function handleWorkOrder(lower: string, role: string, firstName: string, projects: ReturnType<typeof getAccessibleProjects>, actions: INotification[]): string {
  const woProjects = projects.filter((p) => p.workOrderData);
  const woActions  = actions.filter((n) => n.id.includes("wo") || n.title.toLowerCase().includes("work order"));
  if (role === "Executive Engineer") {
    if (woActions.length) return `Work Order actions pending:\n${woActions.slice(0,5).map((n) => `• **${n.title}**: ${n.message}`).join("\n")}`;
    if (!woProjects.length) return `No Work Orders issued yet, ${firstName}.`;
    return `Work Orders issued (${woProjects.length}):\n${woProjects.slice(0,5).map((p) => {
      const wo = p.workOrderData!;
      return `• **${p.id}** – ${p.projectName} | WO: ${wo.workOrderNumber ?? "—"} | ${fmt(toLakh(wo.contractAmount))}`;
    }).join("\n")}`;
  }
  if (role === "Contractor") {
    if (!woProjects.length) return `No Work Orders issued to you yet, ${firstName}.`;
    return `Your Work Orders (${woProjects.length}):\n${woProjects.slice(0,5).map((p) => {
      const wo = p.workOrderData!;
      return `• **${p.id}** – ${p.projectName}\n  WO: ${wo.workOrderNumber ?? "—"} | ${fmt(toLakh(wo.contractAmount))} | Due: ${wo.workCompletionDate}`;
    }).join("\n")}`;
  }
  if (!woProjects.length) return `No Work Orders found in your scope, ${firstName}.`;
  return `Work Orders in your scope (${woProjects.length}):\n${woProjects.slice(0,5).map((p) => `• **${p.id}** – ${p.projectName} (${p.status})`).join("\n")}`;
}

function handleMB(lower: string, role: string, firstName: string, projects: ReturnType<typeof getAccessibleProjects>, notifications: INotification[]): string {
  // ── "How many MBs pending?" — count-only response ────────────────────
  if (hit(lower, ["how many", "count of", "number of"])) {
    let count = 0; let label = "";
    if (role === "Deputy Engineer") {
      count = projects.filter((p) => p.mbData?.some((m) => m.status === "Pending Measurement Verification")).length;
      label = "pending your verification";
    } else if (role === "Executive Engineer") {
      count = projects.filter((p) => p.mbData?.some((m) => m.status === "Pending Measurement Approval")).length;
      label = "pending your approval";
    } else if (role === "Auditor") {
      count = projects.filter((p) => p.mbData?.some((m) => m.status === "Approved by EE")).length;
      label = "pending audit scrutiny";
    } else if (["Accountant", "Assistant Accounts Officer", "Chief Accounts and Finance Officer"].includes(role)) {
      count = projects.filter((p) => p.mbData?.some((m) => m.status?.includes("Accountant") || m.status === "Approved by EE")).length;
      label = "pending payment processing";
    } else {
      count = projects.filter((p) => (p.mbData?.length ?? 0) > 0).length;
      label = "project(s) with MB records";
    }
    if (count === 0) return `No MBs ${label} right now, ${firstName}.`;
    return `You have **${count} MB${count !== 1 ? "s" : ""}** ${label}. Say "list pending MBs" to see the full details.`;
  }

  if (role === "Sectional Engineer") {
    const seP = projects.filter((p) => p.mbData?.length);
    if (!seP.length) return `No Measurement Books created yet, ${firstName}.`;
    return `Your MB records (${seP.length} project${seP.length !== 1 ? "s" : ""}):\n${seP.slice(0,5).map((p) => `• **${p.id}** – ${p.projectName}: ${p.mbData!.length} MB (Latest: ${p.mbData!.at(-1)!.status})`).join("\n")}`;
  }
  if (role === "Deputy Engineer") {
    const pending = projects.filter((p) => p.mbData?.some((m) => m.status === "Pending Measurement Verification"));
    if (!pending.length) return `No MBs pending your verification, ${firstName}.`;
    return `MBs pending your 100% verification (${pending.length}):\n${pending.slice(0,5).map((p) => {
      const mb = p.mbData!.find((m) => m.status === "Pending Measurement Verification")!;
      return `• **${p.id}** – ${p.projectName}\n  ${mb.mbNumber} | ${fmt(toLakh(mb.totalWorkAmount ?? 0))}`;
    }).join("\n")}`;
  }
  if (role === "Executive Engineer") {
    const pending = projects.filter((p) => p.mbData?.some((m) => m.status === "Pending Measurement Approval"));
    if (!pending.length) return `No MBs pending your 5% approval check, ${firstName}.`;
    return `MBs pending your approval (${pending.length}):\n${pending.slice(0,5).map((p) => {
      const mb = p.mbData!.find((m) => m.status === "Pending Measurement Approval")!;
      return `• **${p.id}** – ${p.projectName}\n  ${mb.mbNumber} | Net Payable: ${fmt(toLakh(mb.netPayable ?? 0))}`;
    }).join("\n")}`;
  }
  if (role === "Auditor") {
    const pending = projects.filter((p) => p.mbData?.some((m) => m.status === "Approved by EE"));
    if (!pending.length) return `Audit queue is clear, ${firstName}. No MBs pending scrutiny.`;
    return `MBs pending your audit scrutiny (${pending.length}):\n${pending.slice(0,5).map((p) => {
      const mb = p.mbData!.find((m) => m.status === "Approved by EE")!;
      return `• **${p.id}** – ${p.projectName}\n  ${mb.mbNumber} | Amount: ${fmt(toLakh(mb.totalWorkAmount ?? 0))}`;
    }).join("\n")}`;
  }
  if (["Accountant", "Assistant Accounts Officer", "Chief Accounts and Finance Officer"].includes(role)) {
    const pending = projects.filter((p) => p.mbData?.some((m) => m.status?.includes("Accountant") || m.status === "Approved by EE"));
    if (!pending.length) return `No bills pending payment processing, ${firstName}.`;
    return `Bills pending payment processing (${pending.length}):\n${pending.slice(0,5).map((p) => {
      const mb = p.mbData!.find((m) => m.status?.includes("Accountant") || m.status === "Approved by EE")!;
      return `• **${p.id}** – ${p.projectName}\n  ${mb.mbNumber} | Net Payable: ${fmt(toLakh(mb.netPayable ?? 0))}`;
    }).join("\n")}`;
  }
  if (role === "Contractor") {
    // Latest bill query
    if (hit(lower, ["latest bill", "latest mb", "most recent bill", "last bill", "my latest bill", "status of my bill", "bill status", "my bill"])) {
      const allMBs = projects.flatMap((p) => (p.mbData ?? []).map((mb) => ({ mb, project: p })));
      if (!allMBs.length) return `No bills found for your projects, ${firstName}.`;
      allMBs.sort((a, b) => new Date(b.mb.recordEntryDate).getTime() - new Date(a.mb.recordEntryDate).getTime());
      const { mb, project } = allMBs[0];
      const dedTotal = mb.deductions?.totalDeduction ?? 0;
      return `**Latest Bill: ${mb.mbNumber}**\n• Project: **${project.id}** – ${project.projectName}\n• Entry Date: ${mb.recordEntryDate}\n• Work Amount: ${fmt(toLakh(mb.totalWorkAmount ?? 0))}\n• Deductions: ${fmt(toLakh(dedTotal))}\n• **Net Payable: ${fmt(toLakh(mb.netPayable ?? 0))}**\n• Status: **${mb.status}**\n• Contractor Accepted: ${mb.acceptedByContractor ? "Yes ✓" : "Pending"}`;
    }
    const pendingAcc = projects.filter((p) => p.mbData?.some((m) => !m.acceptedByContractor && m.status !== "Draft"));
    const accepted   = projects.filter((p) => p.mbData?.some((m) => m.acceptedByContractor));
    let r = "";
    if (pendingAcc.length) r += `**MBs pending your acceptance (${pendingAcc.length}):**\n${pendingAcc.slice(0,3).map((p) => {
      const mb = p.mbData!.find((m) => !m.acceptedByContractor && m.status !== "Draft")!;
      return `• **${p.id}** – ${p.projectName}: ${mb.mbNumber} | ${fmt(toLakh(mb.netPayable ?? 0))}`;
    }).join("\n")}\n\n`;
    if (accepted.length) r += `**Accepted MBs (${accepted.length}):**\n${accepted.slice(0,3).map((p) => `• **${p.id}** – ${p.projectName}`).join("\n")}`;
    return r || `No MB actions pending, ${firstName}.`;
  }
  const mbNotifs = notifications.filter((n) => n.title.toLowerCase().includes("mb") || n.message.toLowerCase().includes("measurement"));
  if (!mbNotifs.length) return `No MB actions pending for your role, ${firstName}.`;
  return `MB items for your action:\n${mbNotifs.slice(0,5).map((n) => `• **${n.title}**: ${n.message}`).join("\n")}`;
}

function handlePayments(lower: string, role: string, firstName: string, projects: ReturnType<typeof getAccessibleProjects>, notifications: INotification[]): string {
  // ── CAFO / accounting roles: total pending payments ───────────────────
  if (["Chief Accounts and Finance Officer", "Accountant", "Assistant Accounts Officer"].includes(role)) {
    if (hit(lower, ["total pending", "total amount", "pending payment amount", "financial summary", "how much pending", "aggregate", "total bills"])) {
      const pendingMBs = projects.flatMap((p) =>
        (p.mbData ?? [])
          .filter((m) => m.status?.includes("Accountant") || m.status === "Approved by EE")
          .map((m) => ({ mb: m, project: p }))
      );
      const total = pendingMBs.reduce((s, { mb }) => s + (mb.netPayable ?? 0), 0);
      if (!pendingMBs.length) return `No pending bills in your payment queue, ${firstName}.`;
      return `**Payment Queue Summary, ${firstName}:**\n• Pending bills: **${pendingMBs.length}**\n• **Total Net Payable: ${fmt(toLakh(total))}**\n\n${pendingMBs.slice(0, 5).map(({ mb, project }) => `• **${mb.mbNumber}** – ${project.projectName}\n  ${fmt(toLakh(mb.netPayable ?? 0))} | ${mb.status}`).join("\n")}${pendingMBs.length > 5 ? `\n_…and ${pendingMBs.length - 5} more_` : ""}`;
    }
  }

  if (role === "Contractor") {
    const paid    = projects.filter((p) => p.mbData?.some((m) => m.status === "Payment Processed"));
    const inProc  = projects.filter((p) => p.mbData?.some((m) => m.acceptedByContractor && m.status !== "Payment Processed"));
    let r = "";
    if (paid.length)   r += `**Payments received (${paid.length}):**\n${paid.slice(0,4).map((p) => `• **${p.id}** – ${p.projectName}`).join("\n")}\n\n`;
    if (inProc.length) r += `**Payments in process (${inProc.length}):**\n${inProc.slice(0,4).map((p) => `• **${p.id}** – ${p.projectName}: MB under payment chain`).join("\n")}`;
    return r || `No payment records found, ${firstName}.`;
  }
  const payNotifs = notifications.filter((n) => n.title.toLowerCase().includes("payment") || n.id.startsWith("acc-"));
  if (!payNotifs.length) return `No payment actions pending, ${firstName}.`;
  return `Payment items for your role:\n${payNotifs.slice(0,5).map((n) => `• **${n.title}**: ${n.message}`).join("\n")}`;
}

function handleUsers(lower: string, firstName: string): string {
  const all = store.getAllUsers();

  // ── Count queries: "how many users are active?", "how many DEs?" ──────────
  if (hit(lower, ["how many", "count", "number of", "total"])) {
    // Role-specific count: "how many sectional engineers?"
    for (const [alias, fullRole] of Object.entries(ROLE_ABBR_MAP)) {
      const trimmed = alias.trim();
      if (trimmed.length > 2 && lower.includes(trimmed)) {
        const count = all.filter((u) => u.role === fullRole).length;
        return `There ${count === 1 ? "is" : "are"} **${count} ${fullRole}${count !== 1 ? "s" : ""}** registered in the system.`;
      }
    }
    // Status filter
    if (hit(lower, ["active"])) {
      const count = all.filter((u) => u.status === "Active").length;
      return `There are **${count} active user${count !== 1 ? "s" : ""}** in the system (out of ${all.length} total).`;
    }
    if (hit(lower, ["inactive", "disabled"])) {
      const count = all.filter((u) => u.status === "Inactive").length;
      return `There are **${count} inactive user${count !== 1 ? "s" : ""}** in the system.`;
    }
    // Total count
    const active = all.filter((u) => u.status === "Active").length;
    return `There are **${all.length} total users** in the system — **${active} active**, **${all.length - active} inactive**.`;
  }

  // ── "Who are the [role]?" — list users by role ────────────────────────────
  if (hit(lower, ["who are", "list all", "show all", "all the"])) {
    for (const [alias, fullRole] of Object.entries(ROLE_ABBR_MAP)) {
      const trimmed = alias.trim();
      if (trimmed.length > 2 && lower.includes(trimmed)) {
        const found = all.filter((u) => u.role === fullRole);
        if (!found.length) return `No users with role **${fullRole}** are registered.`;
        return `**${fullRole}s (${found.length}):**\n${found.map((u) => `• **${u.name}** — ${u.email} | ${u.status}`).join("\n")}`;
      }
    }
  }

  // ── Email direct lookup ───────────────────────────────────────────────
  const emailMatch = lower.match(/\b([a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,})\b/i);
  if (emailMatch) {
    const u = all.find((u) => u.email.toLowerCase() === emailMatch[1].toLowerCase());
    if (!u) return `No user with email **${emailMatch[1]}** found.`;
    return `**${u.name}** (${u.role})\n• Email: ${u.email}\n• Status: ${u.status}\n• Division: ${u.division ?? "—"}\n• Last Login: ${u.lastLogin ?? "Never"}`;
  }

  // ── Name search: "find user Priya", "search Rajesh", "user named Amit" ─
  const nameMatch = lower.match(/(?:find\s+user\s+|search\s+(?:for\s+)?user\s+|user\s+named\s+|find\s+|search\s+for\s+|who\s+is\s+)([a-z]+(?:\s+[a-z]+)?)/i);
  if (nameMatch) {
    const q = nameMatch[1].toLowerCase().trim();
    if (q.length > 2) {
      const found = all.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
      if (found.length === 1) {
        const u = found[0];
        return `**${u.name}** (${u.role})\n• Email: ${u.email}\n• Status: ${u.status}\n• Division: ${u.division ?? "—"}\n• Last Login: ${u.lastLogin ?? "Never"}`;
      }
      if (found.length > 1) return `Users matching **"${nameMatch[1]}"** (${found.length}):\n${found.slice(0, 8).map((u) => `• **${u.name}** (${u.role}) — ${u.email} | ${u.status}`).join("\n")}`;
    }
  }

  // ── Inactive / disabled accounts ──────────────────────────────────────
  if (hit(lower, ["inactive", "disabled"])) {
    const inactive = all.filter((u) => u.status === "Inactive");
    if (!inactive.length) return `No inactive accounts, ${firstName}.`;
    return `Inactive accounts (${inactive.length}):\n${inactive.slice(0, 8).map((u) => `• **${u.name}** (${u.role}) — ${u.email}`).join("\n")}`;
  }

  // ── Role filter ───────────────────────────────────────────────────────
  const roleMatch = lower.match(/(?:role[:\s]+|users?\s+with\s+role\s+)(.+?)(?:\?|$)/i);
  if (roleMatch) {
    const q = roleMatch[1].trim();
    const found = all.filter((u) => u.role.toLowerCase().includes(q.toLowerCase()));
    if (!found.length) return `No users with role matching "${q}".`;
    return `Users matching role **"${q}"** (${found.length}):\n${found.slice(0, 8).map((u) => `• **${u.name}** — ${u.email} (${u.status})`).join("\n")}`;
  }

  // ── Summary ───────────────────────────────────────────────────────────
  const active = all.filter((u) => u.status === "Active").length;
  const byRole: Record<string, number> = {};
  all.forEach((u) => { byRole[u.role] = (byRole[u.role] ?? 0) + 1; });
  return `**User Summary** (Total: ${all.length} | Active: ${active} | Inactive: ${all.length - active})\n\n**By Role:**\n${Object.entries(byRole).map(([r, c]) => `• ${r}: ${c}`).join("\n")}`;
}

// Charge name aliases — maps query keywords to the type string stored in the data
const CHARGE_ALIASES: Array<{ keys: string[]; name: string }> = [
  { keys: ["gst", "goods and service"],              name: "GST" },
  { keys: ["labour cess", "labor cess", " cess "],   name: "Labour Cess" },
  { keys: ["insurance"],                             name: "Insurance" },
  { keys: ["quality control", "qc charge"],          name: "Quality Control Charges" },
  { keys: ["contingency"],                           name: "Contingency" },
];

// ── Role knowledge base ───────────────────────────────────────────────────────

const ROLE_KNOWLEDGE: Record<string, { description: string; responsibilities: string[]; reports?: string }> = {
  "Sectional Engineer": {
    description: "Initiates and manages infrastructure projects at the field level within the Zilla Parishad.",
    responsibilities: [
      "Creates project estimates using the 8-step project wizard",
      "Prepares and submits Draft Tender Papers (DTP)",
      "Creates Measurement Books (MB) recording completed work",
      "Forwards projects to the Deputy Engineer for approval",
      "Can only act on projects they personally created",
    ],
    reports: "Deputy Engineer",
  },
  "Deputy Engineer": {
    description: "Reviews and verifies projects and Measurement Books forwarded by Sectional Engineers.",
    responsibilities: [
      "Reviews and approves project cost estimates from SEs",
      "Performs 100% verification of Measurement Books",
      "Approves or returns DTP documents for correction",
      "Forwards verified MBs to the Contractor for acceptance",
    ],
    reports: "Executive Engineer",
  },
  "Executive Engineer": {
    description: "Provides technical and administrative oversight — approves DTP, issues Work Orders, and performs MB spot-checks.",
    responsibilities: [
      "Approves or rejects DTP documents",
      "Issues Work Orders to L1 contractors after LOI",
      "Performs 5% spot-check verification of Measurement Books",
      "Approves LOI (Letter of Intent) issuance",
      "Oversees financial bid evaluation and tender results",
    ],
    reports: "Additional Chief Executive Officer",
  },
  "Tender Clerk": {
    description: "Manages the tendering process — from publishing the tender notice to evaluating bids and issuing the LOI.",
    responsibilities: [
      "Publishes tender notices on MahaTender portal",
      "Sets tender schedule (dates, EMD amount, tender fees)",
      "Evaluates technical and financial bids",
      "Determines the L1 (lowest-quoted) bidder",
      "Prepares the Letter of Intent (LOI) for EE approval",
    ],
    reports: "Executive Engineer",
  },
  "Auditor": {
    description: "Performs audit scrutiny of Measurement Books before they proceed to payment.",
    responsibilities: [
      "Audits MB records for accuracy and compliance",
      "Applies deductions for discrepancies or non-conformities",
      "Records audit observations and remarks",
      "Approves or returns MBs for correction",
    ],
    reports: "Chief Accounts and Finance Officer",
  },
  "Accountant": {
    description: "Processes payment bills for audit-cleared Measurement Books.",
    responsibilities: [
      "Processes payment for audit-cleared MBs",
      "Verifies net payable amounts after all deductions",
      "Forwards payment bills to the Assistant Accounts Officer",
    ],
    reports: "Assistant Accounts Officer",
  },
  "Assistant Accounts Officer": {
    description: "Reviews payments processed by the Accountant before escalating to the CAFO.",
    responsibilities: [
      "Reviews payment bills processed by the Accountant",
      "Approves bills for the Chief Accounts and Finance Officer",
      "Monitors the overall payment pipeline",
    ],
    reports: "Chief Accounts and Finance Officer",
  },
  "Chief Accounts and Finance Officer": {
    description: "Final payment authority in the billing chain — processes all MB payments and monitors the financial position.",
    responsibilities: [
      "Final approval of all MB payment bills",
      "Monitors budget allocation and financial summary",
      "Reviews aggregate pending payment queue",
      "Issues final payment orders",
    ],
    reports: "Chief Executive Officer",
  },
  "Additional Chief Executive Officer": {
    description: "Provides executive oversight — gives final approval for DTP sanction and LOI, and reviews high-level project status.",
    responsibilities: [
      "Final sanction of DTP (Draft Tender Paper) documents",
      "Approves Letter of Intent (LOI) to L1 contractors",
      "Reviews overall project portfolio and status",
      "Final sign-off in the DTP and LOI approval chains",
    ],
    reports: "Chief Executive Officer",
  },
  "Chief Executive Officer": {
    description: "Highest authority with full read-only visibility across all projects and initiatives in the Zilla Parishad.",
    responsibilities: [
      "Top-level portfolio view of all projects",
      "Reviews project status and financial progress",
      "Oversight role — no direct workflow action",
    ],
  },
  "System Administrator": {
    description: "Manages users, roles, organizational units, approval chains, charges, templates, and rate item schedules across the entire system.",
    responsibilities: [
      "Creates and manages all user accounts",
      "Assigns roles, designations, and divisions",
      "Configures approval chains and workflow sequences",
      "Manages charge rates (GST, Labour Cess, Insurance, etc.)",
      "Manages document templates (DTP, LOI, Work Order, MB)",
      "Manages Rate Item schedules (SSR and DSR)",
      "Configures system settings and organizational hierarchy",
    ],
  },
  "Contractor": {
    description: "External party who executes work under an issued Work Order and submits Measurement Books for payment processing.",
    responsibilities: [
      "Reviews issued Work Orders and LOIs assigned to them",
      "Accepts or returns Measurement Books submitted by the SE",
      "Tracks payment bill status",
    ],
    reports: "Executive Engineer (via Work Order)",
  },
  "Technical System Configurator": {
    description: "Manages SSR/DSR rate item schedules and document templates within the IIMS system.",
    responsibilities: [
      "Creates and updates Rate Item schedules (SSR and DSR)",
      "Manages document templates using {{VARIABLE}} placeholders",
      "Configures system-level settings",
    ],
    reports: "System Administrator",
  },
};

// Abbreviation / alias map for role names (padded with spaces to avoid partial matches)
const ROLE_ABBR_MAP: Record<string, string> = {
  " se ": "Sectional Engineer",
  " de ": "Deputy Engineer",
  " ee ": "Executive Engineer",
  " tc ": "Tender Clerk",
  " cafo ": "Chief Accounts and Finance Officer",
  " aao ": "Assistant Accounts Officer",
  " aceo ": "Additional Chief Executive Officer",
  " ceo ": "Chief Executive Officer",
  " tsc ": "Technical System Configurator",
  "sectional engineer": "Sectional Engineer",
  "deputy engineer": "Deputy Engineer",
  "executive engineer": "Executive Engineer",
  "tender clerk": "Tender Clerk",
  "auditor": "Auditor",
  "accountant": "Accountant",
  "assistant accounts officer": "Assistant Accounts Officer",
  "chief accounts and finance officer": "Chief Accounts and Finance Officer",
  "chief accounts officer": "Chief Accounts and Finance Officer",
  "additional chief executive officer": "Additional Chief Executive Officer",
  "additional ceo": "Additional Chief Executive Officer",
  "chief executive officer": "Chief Executive Officer",
  "system administrator": "System Administrator",
  "contractor": "Contractor",
  "technical system configurator": "Technical System Configurator",
};

// ── Workflow stage knowledge base ─────────────────────────────────────────────

const WORKFLOW_STAGES: Array<{ status: string; description: string; handledBy: string; nextStep: string }> = [
  { status: "draft",                          description: "Project is being created or saved as a draft by the Sectional Engineer.",                                                    handledBy: "Sectional Engineer",                 nextStep: "Complete all steps and submit to Deputy Engineer" },
  { status: "pending at de",                  description: "Project estimate has been submitted and is awaiting review by the Deputy Engineer.",                                         handledBy: "Deputy Engineer",                    nextStep: "DE approves → forwards to EE, or returns to SE" },
  { status: "returned to sectional engineer", description: "Project was returned by the DE or EE with remarks for correction.",                                                         handledBy: "Sectional Engineer",                 nextStep: "Revise and resubmit to the Deputy Engineer" },
  { status: "pending at ee",                  description: "Project cost estimate approved by DE and awaiting Executive Engineer review.",                                               handledBy: "Executive Engineer",                 nextStep: "EE approves → Cost Approved, or returns to SE" },
  { status: "cost approved",                  description: "Project cost estimate has been approved by the Executive Engineer. The SE can now prepare the Draft Tender Paper (DTP).",   handledBy: "Sectional Engineer",                 nextStep: "SE prepares and submits DTP" },
  { status: "dtp submitted to de",            description: "Draft Tender Paper has been submitted to the Deputy Engineer for verification.",                                             handledBy: "Deputy Engineer",                    nextStep: "DE verifies and forwards to EE" },
  { status: "dtp verified by de",             description: "DTP verified by DE and forwarded to the Executive Engineer for approval.",                                                   handledBy: "Executive Engineer",                 nextStep: "EE approves DTP" },
  { status: "dtp approved by ee",             description: "DTP approved by EE and forwarded to the Additional CEO for final sanction.",                                                handledBy: "Additional Chief Executive Officer", nextStep: "Additional CEO grants final DTP sanction" },
  { status: "dtp sanctioned",                 description: "DTP has received final sanction from the Additional CEO. Tender Clerk can now publish the tender on MahaTender.",           handledBy: "Tender Clerk",                       nextStep: "Publish tender on MahaTender portal" },
  { status: "tender published",               description: "Tender notice has been published on MahaTender and is open for contractor bids.",                                            handledBy: "Tender Clerk",                       nextStep: "Receive bids, evaluate technical bid, then financial bid" },
  { status: "bids evaluated",                 description: "Technical and financial bids have been evaluated; L1 (lowest) bidder has been determined.",                                  handledBy: "Executive Engineer / Tender Clerk",  nextStep: "Issue LOI to L1 contractor" },
  { status: "loa issued",                     description: "Letter of Intent has been issued to the L1 contractor. Work Order to be issued next.",                                        handledBy: "Executive Engineer",                 nextStep: "EE issues Work Order to contractor" },
  { status: "work order issued",              description: "Work Order has been issued to the contractor with commencement and completion dates. Work can begin.",                        handledBy: "Contractor / Sectional Engineer",    nextStep: "Contractor executes work; SE creates MB on completion" },
  { status: "submitted to de",               description: "Measurement Book submitted by SE to the Deputy Engineer for 100% measurement verification.",                                  handledBy: "Deputy Engineer",                    nextStep: "DE verifies 100%; Contractor accepts MB" },
  { status: "verified by de",               description: "MB verified by DE. Contractor must accept before EE performs the 5% spot-check.",                                             handledBy: "Contractor / Executive Engineer",    nextStep: "Contractor accepts; EE performs 5% check" },
  { status: "approved by ee",               description: "MB has passed EE's 5% spot-check. Sent to Auditor for scrutiny.",                                                             handledBy: "Auditor",                            nextStep: "Auditor applies deductions and clears the MB" },
  { status: "pending at auditor",             description: "Measurement Book is pending audit scrutiny.",                                                                                handledBy: "Auditor",                            nextStep: "Auditor reviews, applies deductions, forwards to Accountant" },
  { status: "payment processed",              description: "Payment has been approved and disbursed by the Chief Accounts and Finance Officer. Billing cycle complete.",                 handledBy: "Chief Accounts and Finance Officer", nextStep: "Complete — billing cycle finished for this MB" },
];

function handleCharges(lower: string, firstName: string): string {
  const charges = store.getAllCharges();

  // ── Specific charge lookup — return only the asked charge ─────────────
  for (const { keys, name } of CHARGE_ALIASES) {
    if (keys.some((k) => lower.includes(k))) {
      const charge = charges.find((c) => c.type.toLowerCase().includes(name.toLowerCase()));
      if (!charge) return `Charge type **${name}** is not configured in the system.`;
      const state = charge.isActive ? "Active" : "Inactive";
      return `**${charge.type}** is currently configured at **${charge.percentage}%** (${state}).`;
    }
  }

  // ── Explicit list request ──────────────────────────────────────────────
  const active = charges.filter((c) => c.isActive).length;
  const lines  = charges.map((c) => `• **${c.type}**: ${c.percentage}% — ${c.isActive ? "Active ✓" : "Inactive"}`).join("\n");
  return `**Charges Configuration** (${active} active, ${charges.length - active} inactive):\n${lines}\n\nManage at **Charges Management**.`;
}

function handleRateItems(lower: string, firstName: string): string {
  const items = store.getAllRateItems();

  // ── Decimal / schedule code lookup: "10.01", "2.10", "D-1.01" ────────
  const decMatch = lower.match(/\b(d-\d+\.\d+|\d{1,2}\.\d{2})\b/i);
  if (decMatch) {
    const rawCode = decMatch[1];
    const exact = items.find((i) => i.code.toLowerCase() === rawCode.toLowerCase());
    if (exact) {
      return `**${exact.id}** — Code: \`${exact.code}\`\n• Type: ${exact.type} | Year: ${exact.year}\n• Unit: ${exact.unit} | Rate: ₹${exact.rate.toLocaleString("en-IN")}\n• ${exact.description.slice(0, 180)}${exact.description.length > 180 ? "…" : ""}`;
    }
    const partial = items.filter((i) => i.code.toLowerCase().includes(rawCode.toLowerCase()));
    if (!partial.length) return `Rate code **${rawCode}** not found in the schedule. Check the Rate Item Editor for the complete list.`;
    if (partial.length === 1) {
      const f = partial[0];
      return `**${f.id}** — Code: \`${f.code}\`\n• Type: ${f.type} | Year: ${f.year}\n• Unit: ${f.unit} | Rate: ₹${f.rate.toLocaleString("en-IN")}\n• ${f.description.slice(0, 180)}${f.description.length > 180 ? "…" : ""}`;
    }
    return `Rate codes matching **${rawCode}** (${partial.length}):\n${partial.slice(0, 5).map((i) => `• **${i.id}** (\`${i.code}\`) — ${i.type} | ₹${i.rate.toLocaleString("en-IN")}/${i.unit}`).join("\n")}\n\nAsk for the exact code to get full details.`;
  }

  // ── ID-style code lookup: "SSR001", "DSR-001" ─────────────────────────
  const codeMatch = lower.match(/\b(ssr[-\s]?\d+|dsr[-\s]?\d+)\b/i);
  if (codeMatch) {
    const code  = codeMatch[1].replace(/[-\s]/g, "").toUpperCase();
    const found = items.find((i) => i.id.toUpperCase() === code || i.code.replace(/[.\s]/g, "").toUpperCase().includes(code));
    if (!found) return `Rate item **${codeMatch[1].toUpperCase()}** not found. Check the Rate Item Editor for the full list.`;
    return `**${found.id}** — Code: \`${found.code}\`\n• Type: ${found.type} | Year: ${found.year}\n• Unit: ${found.unit} | Rate: ₹${found.rate.toLocaleString("en-IN")}\n• ${found.description.slice(0, 120)}${found.description.length > 120 ? "…" : ""}`;
  }

  // ── Description / material keyword search ─────────────────────────────
  const descPatterns: RegExp[] = [
    /(?:rate\s+(?:for|of)|cost\s+of|price\s+of)\s+(.+?)(?:\?|$)/i,
    /(?:what(?:'s|\s+is)\s+the\s+rate\s+(?:of|for)\s*)(.+?)(?:\?|$)/i,
    /(?:find|search|lookup)\s+(?:rate\s+(?:for\s+)?)?(.+?)(?:\s+rate|\?|$)/i,
  ];
  for (const pat of descPatterns) {
    const m = lower.match(pat);
    if (m) {
      const q = m[1].replace(/\?$/, "").trim().toLowerCase();
      if (q.length < 3) break;
      const found = items.filter((i) => i.description.toLowerCase().includes(q) || i.code.toLowerCase().includes(q));
      if (!found.length) return `No rate items found for **"${q}"**. Try searching by schedule code (e.g., "10.01" or "SSR007").`;
      if (found.length === 1) {
        const f = found[0];
        return `**${f.id}** — Code: \`${f.code}\`\n• Type: ${f.type} | Year: ${f.year}\n• Unit: ${f.unit} | Rate: ₹${f.rate.toLocaleString("en-IN")}\n• ${f.description.slice(0, 180)}${f.description.length > 180 ? "…" : ""}`;
      }
      return `Rate items matching **"${q}"** (${found.length}):\n${found.slice(0, 6).map((i) => `• **${i.id}** (\`${i.code}\`) — ${i.unit} @ ₹${i.rate.toLocaleString("en-IN")}\n  ${i.description.slice(0, 75)}…`).join("\n")}`;
    }
  }

  // ── SSR only ──────────────────────────────────────────────────────────
  if (hit(lower, ["all ssr", "ssr only", "ssr items", "ssr rates"])) {
    const ssr = items.filter((i) => i.type === "SSR");
    return `**SSR Rate Items (${ssr.length}):**\n${ssr.map((i) => `• **${i.id}** (\`${i.code}\`) — ${i.unit} @ ₹${i.rate.toLocaleString("en-IN")}`).join("\n")}`;
  }

  // ── DSR only ──────────────────────────────────────────────────────────
  if (hit(lower, ["all dsr", "dsr only", "dsr items", "dsr rates"])) {
    const dsr = items.filter((i) => i.type === "DSR");
    return `**DSR Rate Items (${dsr.length}):**\n${dsr.map((i) => `• **${i.id}** (\`${i.code}\`) — ${i.unit} @ ₹${i.rate.toLocaleString("en-IN")}`).join("\n")}`;
  }

  // ── Year filter ───────────────────────────────────────────────────────
  const yrMatch = lower.match(/\b(20\d{2}[-–]\d{2,4})\b/);
  if (yrMatch) {
    const yr    = yrMatch[1];
    const found = items.filter((i) => i.year.includes(yr));
    if (!found.length) return `No rate items found for year **${yr}**.`;
    return `Rate items for **${yr}** (${found.length} total):\n${found.slice(0, 8).map((i) => `• **${i.id}** (${i.type}) — ₹${i.rate.toLocaleString("en-IN")}/${i.unit}`).join("\n")}`;
  }

  // ── Summary ───────────────────────────────────────────────────────────
  const ssr   = items.filter((i) => i.type === "SSR").length;
  const dsr   = items.filter((i) => i.type === "DSR").length;
  const years = [...new Set(items.map((i) => i.year))].join(", ");
  return `**Rate Item Library:**\n• SSR Items: ${ssr}\n• DSR Items: ${dsr}\n• Schedule Year(s): ${years}\n\nSearch by code: "10.01" or "SSR007" or "D-1.01"\nOr ask: "show all SSR items" or "rate for cement plaster"`;
}

function handleTemplates(lower: string, firstName: string): string {
  const templates = store.getTemplates();
  // Specific template
  if (hit(lower, ["dtp template", "loa template", "work order template", "mb template", "sanction template"])) {
    const search = lower.includes("dtp") ? "dtp" : lower.includes("loa") ? "loa" : lower.includes("work order") ? "work" : lower.includes("sanction") ? "sanction" : "mb";
    const found  = templates.find((t) => t.name.toLowerCase().includes(search) || t.type.toLowerCase().includes(search));
    if (!found) return `Template not found. Available: ${templates.map((t) => t.name).join(", ")}.`;
    const vars = [...new Set([...found.content.matchAll(/\{\{(\w+)\}\}/g)].map((m) => `{{${m[1]}}}`))] ;
    return `**${found.name}** (type: \`${found.type}\`)\nPlaceholder variables (${vars.length}): ${vars.slice(0,10).join(", ")}${vars.length > 10 ? "…" : ""}\n\nEdit at **Template Editor**.`;
  }
  return `**Available Templates (${templates.length}):**\n${templates.map((t) => `• **${t.name}** — type: \`${t.type}\``).join("\n")}\n\nManage at **Template Editor**.`;
}

// Static knowledge base — topic-gated
const STATIC_KB: Array<{ module?: string; keywords: string[]; reply: string }> = [
  { module: "projects",   keywords: ["create project", "new project", "8-step", "project wizard"],           reply: "To create a new project, go to **All Projects** → **Create New Project** (SE role). The 8-step wizard covers: Basic Details → Sub Works → Lead Statement → Rate Analysis → Measurement Sheet → General Description → Documents → Review & Submit." },
  { module: "projects",   keywords: ["project workflow", "project stage", "project flow", "forward project"], reply: "Project workflow: Draft → Pending at DE → Pending at EE → Cost Approved → DTP Sanctioned → Tender Published → LOI Issued → Work Order Issued → MB & Billing → Payment Processed." },
  { module: "dtp",        keywords: ["how does dtp work", "dtp approval", "dtp chain", "dtp process"],        reply: "DTP (Draft Tender Paper) is prepared by the SE after **Cost Approved** status. Approval chain: SE → DE → EE → Additional CEO. After final approval, status becomes **DTP Sanctioned** and the Tender Clerk can publish the tender." },
  { module: "tender",     keywords: ["how does tender work", "tender process", "tender chain", "bid process"], reply: "Tender chain: Tender Clerk fills tender notice → EE approves → CAFO approves → Additional CEO → MahaTender Portal. Two bid stages follow: Technical Bid Evaluation, then Financial Bid Evaluation (L1 determination)." },
  { module: "loa",        keywords: ["how is loi issued", "loi process", "loi approval", "how is loa issued", "loa process", "loa approval"], reply: "LOI (Letter of Intent) is approved by the Additional CEO and issued to the L1 contractor (lowest quoted percentage). The Executive Engineer then issues the Work Order." },
  { module: "work-order", keywords: ["how is work order issued", "work order process"],                       reply: "Work Orders are issued by the Executive Engineer after LOI approval. Security Deposit and Performance Guarantee are each auto-calculated as 5% of the contract amount." },
  { module: "mb",         keywords: ["how does mb work", "mb process", "mb chain", "mb billing process"],     reply: "MB & Billing chain: SE creates MB → DE verifies (100% check) → Contractor accepts → EE verifies (5% check) → Auditor applies deductions → Accountant → AAO → CAFO processes payment." },
  { module: "charges",    keywords: ["how do charges work", "how is gst applied", "what are active charges"], reply: "Active charges are automatically applied during Rate Analysis in project creation. Default: GST 18%, Labour Cess 1%, Insurance 0.5%, Quality Control 1% — all active. Contingency 2% is inactive." },
  { module: "rate-items", keywords: ["how to search rate", "how to lookup rate", "how to find ssr"],          reply: "Search rate items by asking: **'SSR001'** or **'show all DSR rates'** or **'rate items for 2024-2025'**. Items are stored in the Rate Item Editor." },
  { module: "templates",  keywords: ["how to edit template", "how do templates work", "template variables"],  reply: "Templates use {{VARIABLE_NAME}} placeholders. Edit them at **Template Editor** — select a template, edit content, preview, and save. Variables like {{PROJECT_NAME}} and {{CONTRACT_AMOUNT}} are auto-substituted when generating documents." },
  { module: "drafts",     keywords: ["how to save draft", "resume project", "how to resume"],                 reply: "Project creation can be saved as a draft at any step using the **Save as Draft** button. Resume from **Saved Drafts** — all fields, sub-works, and uploaded documents are preserved." },
  // Non-restricted (always allowed)
  { keywords: ["dark mode", "light mode", "theme toggle", "switch theme"],  reply: "Toggle light/dark mode using the Sun/Moon button in the header. Your preference is saved automatically." },
  { keywords: ["thank", "thanks", "great", "helpful", "good job"],          reply: "Happy to help! Let me know if there's anything else I can assist with." },
  { keywords: ["what is iims", "about iims", "what does iims do"],          reply: "IIMS (Integrated Infrastructure Management System) is the Zilla Parishad platform for managing the full lifecycle of public works: project creation → cost estimation → DTP → tendering → LOI → work order → MB & billing → payment." },
  { keywords: ["full project lifecycle", "entire workflow", "end-to-end workflow", "project life cycle", "project cycle"], reply: "Full IIMS project lifecycle:\n1. **SE** creates project estimate (Draft)\n2. **DE** reviews → **EE** approves (Cost Approved)\n3. **SE** prepares DTP → **DE** → **EE** → **Additional CEO** sanctions (DTP Sanctioned)\n4. **Tender Clerk** publishes tender → bids evaluated → L1 determined\n5. **EE** issues LOI and Work Order to L1 contractor\n6. **SE** creates Measurement Book → **DE** verifies → **Contractor** accepts → **EE** spot-checks\n7. **Auditor** scrutinises → **Accountant** → **AAO** → **CAFO** processes payment" },
  { keywords: ["what is ssr", "what is dsr", "ssr vs dsr", "difference between ssr and dsr"], reply: "**SSR (Schedule of Standard Rates)** — Standard rates for common construction works as issued by the state government. Used for recurring work items.\n\n**DSR (Delhi Schedule of Rates / District Schedule of Rates)** — Rates specific to a district or type of work. Used when SSR rates are not available.\n\nBoth are available in the **Rate Item Editor**." },
  { keywords: ["what is dtp", "what is draft tender paper"],                  reply: "A **Draft Tender Paper (DTP)** is the detailed document prepared by the Sectional Engineer after the project cost is approved. It includes scope of work, technical specifications, terms and conditions, and schedule of quantities. It goes through SE → DE → EE → Additional CEO for approval before publishing the tender." },
  { keywords: ["what is loi", "what is letter of award"],                     reply: "An **LOI (Letter of Intent)** is the formal award issued to the L1 (lowest-quoted) contractor after financial bid evaluation. It is prepared by the Tender Clerk, approved by EE and Additional CEO, and authorises the contractor to commence work once the Work Order is issued." },
  { keywords: ["what is mb", "what is measurement book"],                     reply: "A **Measurement Book (MB)** is the official record of work completed by the contractor at site. The Sectional Engineer creates it; it then goes through DE (100% check) → Contractor (acceptance) → EE (5% spot-check) → Auditor (deductions) → Accountant → AAO → CAFO for payment." },
  { keywords: ["what is emd", "earnest money deposit"],                       reply: "**EMD (Earnest Money Deposit)** is a security deposit required from contractors while submitting bids. It is configured per tender and refunded to unsuccessful bidders after L1 determination. The L1 contractor's EMD is adjusted against the Security Deposit." },
];

// ── Entity extraction ─────────────────────────────────────────────────────────
// Pulls every identifiable entity from a query so routing is ID / name driven,
// not keyword driven.  Handles fuzzy forms: PRJ002 = PRJ-002 = "project 2".

interface Entities {
  projectIds:  string[];  // normalised PRJ-NNN
  tenderIds:   string[];  // normalised TND-YYYY-NNN
  woIds:       string[];  // normalised WO-YYYY-NNN
  mbIds:       string[];  // normalised MB-YYYY-NNN-NNN
  rateCodes:   string[];  // decimal ("18.01") or SSR/DSR ("SSR007")
  chargeNames: string[];  // from CHARGE_ALIASES
  roleNames:   string[];  // from ROLE_ABBR_MAP
  stageNames:  string[];  // from WORKFLOW_STAGES (lowercase)
  any:         boolean;   // true when at least one specific entity found
}

function extractEntities(lower: string): Entities {
  const e: Entities = {
    projectIds: [], tenderIds: [], woIds: [], mbIds: [],
    rateCodes: [], chargeNames: [], roleNames: [], stageNames: [],
    any: false,
  };

  // ── Project IDs: PRJ002, PRJ-002, prj002, "project 2", "project no. 3" ──
  // Stored format is PRJnnn (no dash) for seeded data; PRJxxxxxxxx for user-
  // created (base-36).  Normalise all numeric inputs to 3-digit zero-padded
  // and preserve alphanumeric (base-36) suffixes unchanged.
  const seenP = new Set<string>();
  const addProject = (raw: string) => {
    const suffix = /^\d+$/.test(raw)
      ? raw.replace(/^0+/, "").padStart(3, "0")  // "002" or "2" → "002"
      : raw.toUpperCase();                         // base-36 as-is
    const id = `PRJ${suffix}`;
    if (!seenP.has(id)) { seenP.add(id); e.projectIds.push(id); }
  };
  // Handles: PRJ002, PRJ-002, prj 002, PRJK4X2GJ9 (base-36)
  for (const m of lower.matchAll(/\bprj[-.\s]?([a-z0-9]{1,12})\b/gi)) addProject(m[1]);
  // Handles: "project 2", "project no. 3", "project #5", "project id 10"
  for (const m of lower.matchAll(/\bproject\s+(?:id\s+|no\.?\s+|number\s+|#\s*)?0*(\d+)\b/gi)) addProject(m[1]);

  // ── Tender IDs: TND-2026-014, TND2026014, "tnd 2026 014" ─────────────────
  const seenT = new Set<string>();
  for (const m of lower.matchAll(/\btnd[-.\s]?(\d{4})[-.\s]?(\d{3,6})\b/gi)) {
    const id = `TND-${m[1]}-${m[2].padStart(3, "0")}`;
    if (!seenT.has(id)) { seenT.add(id); e.tenderIds.push(id); }
  }

  // ── Work Order IDs: WO-2026-007, WO2026007, "work order 2026-007" ─────────
  const seenW = new Set<string>();
  for (const m of lower.matchAll(/\bwo[-.\s]?(\d{4})[-.\s]?(\d{3,6})\b/gi)) {
    const id = `WO-${m[1]}-${m[2].padStart(3, "0")}`;
    if (!seenW.has(id)) { seenW.add(id); e.woIds.push(id); }
  }
  for (const m of lower.matchAll(/\bwork[-\s]order\s+(?:no\.?\s*)?(\d{4})[-.\s]?(\d{3,6})\b/gi)) {
    const id = `WO-${m[1]}-${m[2].padStart(3, "0")}`;
    if (!seenW.has(id)) { seenW.add(id); e.woIds.push(id); }
  }

  // ── MB Numbers: MB-2026-008-001, MB2026008001 ──────────────────────────────
  const seenM = new Set<string>();
  for (const m of lower.matchAll(/\bmb[-.\s]?(\d{4})[-.\s]?(\d{3,6})[-.\s]?(\d{3,6})\b/gi)) {
    const id = `MB-${m[1]}-${m[2].padStart(3, "0")}-${m[3].padStart(3, "0")}`;
    if (!seenM.has(id)) { seenM.add(id); e.mbIds.push(id); }
  }

  // ── Rate codes: 18.01, 10.01, D-2.01, SSR001, DSR-5 ──────────────────────
  // Skip decimal detection when the number is clearly a monetary amount
  const hasAmountCtx =
    lower.includes("lakh") || lower.includes("crore") ||
    lower.includes("₹")    || lower.includes("rs.")   ||
    lower.includes("rupee");
  if (!hasAmountCtx) {
    const seenR = new Set<string>();
    for (const m of lower.matchAll(/\b(d-\d+\.\d+|\d{1,3}\.\d{2})\b/gi)) {
      if (!seenR.has(m[1])) { seenR.add(m[1]); e.rateCodes.push(m[1]); }
    }
  }
  for (const m of lower.matchAll(/\b(ssr[-\s]?\d+|dsr[-\s]?\d+)\b/gi)) {
    const code = m[1].replace(/[-\s]/g, "").toUpperCase();
    if (!e.rateCodes.includes(code)) e.rateCodes.push(code);
  }

  // ── Charge names ───────────────────────────────────────────────────────────
  for (const { keys, name } of CHARGE_ALIASES) {
    if (keys.some((k) => k.trim().length > 2 && lower.includes(k.trim()))) {
      if (!e.chargeNames.includes(name)) e.chargeNames.push(name);
    }
  }

  // ── Role names — abbreviations need space boundaries, full names are safe ──
  const paddedLower = ` ${lower} `;
  for (const [alias, fullRole] of Object.entries(ROLE_ABBR_MAP)) {
    const matches = alias.startsWith(" ") && alias.endsWith(" ")
      ? paddedLower.includes(alias)
      : lower.includes(alias);
    if (matches && alias.trim().length > 1 && !e.roleNames.includes(fullRole)) {
      e.roleNames.push(fullRole);
    }
  }

  // ── Workflow stage names (lowercase status strings) ────────────────────────
  for (const stage of WORKFLOW_STAGES) {
    if (lower.includes(stage.status) && !e.stageNames.includes(stage.status)) {
      e.stageNames.push(stage.status);
    }
  }

  e.any = !!(
    e.projectIds.length || e.tenderIds.length || e.woIds.length  ||
    e.mbIds.length      || e.rateCodes.length || e.chargeNames.length ||
    e.roleNames.length  || e.stageNames.length
  );
  return e;
}

// ── Intent classification ──────────────────────────────────────────────────────
// Determines what shape of answer the user wants so the same entity can produce
// a status string, an amount, a history log, a full detail card, etc.

type QueryIntent =
  | "count" | "status" | "history" | "person" | "amount" | "ts-amount"
  | "location" | "contractor" | "list" | "definition" | "pending" | "detail";

function classifyIntent(lower: string): QueryIntent {
  if (hit(lower, ["how many", "count of", "number of", "total number", "total count"])) return "count";
  if (hit(lower, ["who approved", "who verified", "who forwarded", "who rejected", "who returned",
                   "history of", "audit trail", "timeline", "previous actions", "activity log", "log of"])) return "history";
  if (hit(lower, ["who is", "who are", "find user", "search user", "show user", "which user"])) return "person";
  if (hit(lower, ["status", "current status", "what stage", "which stage", "what is the status",
                   "current stage", "what stage is"])) return "status";
  if (hit(lower, ["where is", "location of", "in which taluka", "in which division", "gram panchayat",
                   "which village", "which taluka"])) return "location";
  if (hit(lower, ["contractor", "l1 contractor", "l1 bidder", "who got the tender", "who got tender",
                   "who won", "who is doing"])) return "contractor";
  // TS Amount must be checked before generic "amount" — it is a distinct field
  if (hit(lower, ["ts amount", "ts amt", "t.s. amount", "t.s amount", "ts sanctioned",
                   "technically sanctioned amount", "technically sanctioned",
                   "technical sanction amount", "technical sanctioned amount",
                   "technical sanction", "tsa"])) return "ts-amount";
  if (hit(lower, ["amount", "cost", "estimated cost", "estimated amount", "how much", "budget",
                   "what is the cost", "what is the amount", "what is the rate", "rate of"])) return "amount";
  if (hit(lower, ["my pending", "pending approval", "awaiting my", "my queue", "action required",
                   "my approvals", "needs my action"])) return "pending";
  if (hit(lower, ["list all", "show all", "display all", "get all", "all the", "show me all"])) return "list";
  if (hit(lower, ["what does", "responsibilities", "duties of", "role of", "function of",
                   "describe the role", "explain the role", "what can the", "what is a ",
                   "what is an ", "what are the duties", "what are the responsibilities"])) return "definition";
  return "detail";
}

// ── Universal project field resolver ─────────────────────────────────────────
// One entry per project field. Add new fields here — no other code needs change.
// Keys are lower-case substrings matched via lower.includes(key).
// More-specific aliases must come before less-specific ones (ordering matters).

type AccessibleProject = ReturnType<typeof getAccessibleProjects>[number];

interface ProjectFieldAlias {
  keys:  string[];
  label: string;
  get:   (p: AccessibleProject) => string | number | boolean | null | undefined;
  fmt?:  (v: string | number | boolean) => string;
}

const PROJECT_FIELD_ALIASES: ProjectFieldAlias[] = [
  // ── Deductions — listed before overlapping amount aliases ─────────────────
  { keys: ["sd deduction", "security deposit deduction", "security deduction"],
    label: "Security Deposit Deduction (Latest MB)",
    get: (p) => p.mbData?.at(-1)?.deductions?.securityDeposit,
    fmt: (v) => `₹${Number(v).toLocaleString("en-IN")}` },
  { keys: ["penalty deduction", "penalty amount mb", "penalty in mb"],
    label: "Penalty (Latest MB)",
    get: (p) => p.mbData?.at(-1)?.deductions?.penalty,
    fmt: (v) => `₹${Number(v).toLocaleString("en-IN")}` },
  { keys: ["income tax deduction", "tds deduction", "income tax tds", "it deduction", "income tax"],
    label: "Income Tax Deduction (Latest MB)",
    get: (p) => p.mbData?.at(-1)?.deductions?.incomeTax,
    fmt: (v) => `₹${Number(v).toLocaleString("en-IN")}` },
  { keys: ["gst tds deduction", "gst tds"],
    label: "GST TDS Deduction (Latest MB)",
    get: (p) => p.mbData?.at(-1)?.deductions?.gstTds,
    fmt: (v) => `₹${Number(v).toLocaleString("en-IN")}` },
  { keys: ["labour cess deduction", "cess deduction", "labour cess amount", "labour cess"],
    label: "Labour Cess Deduction (Latest MB)",
    get: (p) => p.mbData?.at(-1)?.deductions?.labourCess,
    fmt: (v) => `₹${Number(v).toLocaleString("en-IN")}` },
  { keys: ["mobilization advance", "mobilisation advance", "advance deduction"],
    label: "Mobilization Advance Deduction (Latest MB)",
    get: (p) => p.mbData?.at(-1)?.deductions?.mobilizationAdvance,
    fmt: (v) => `₹${Number(v).toLocaleString("en-IN")}` },
  { keys: ["total deduction", "total deductions", "total deducted"],
    label: "Total Deductions (Latest MB)",
    get: (p) => p.mbData?.at(-1)?.deductions?.totalDeduction,
    fmt: (v) => `₹${Number(v).toLocaleString("en-IN")}` },

  // ── Amounts ───────────────────────────────────────────────────────────────
  { keys: ["ts amount", "ts amt", "t.s. amount", "t.s amount", "technically sanctioned amount",
            "technically sanctioned", "technical sanction amount", "technical sanctioned amount",
            "technical sanction", "tsa", "ts cost"],
    label: "TS Amount (Technically Sanctioned)",
    get: (p) => p.technicalSanctionAmount,
    fmt: (v) => fmt(toLakh(v as number)) },
  { keys: ["estimated amount", "estimated cost", "estimate amount", "project cost", "project estimate",
            "total estimate", "pc amount", "estimated value", "project value"],
    label: "Estimated Amount",
    get: (p) => p.estimatedAmount,
    fmt: (v) => fmt(toLakh(v as number)) },
  { keys: ["gst amount", "gst value", "tax amount"],
    label: "GST Amount",
    get: (p) => p.gstAmount,
    fmt: (v) => fmt(toLakh(v as number)) },
  { keys: ["contract amount", "wo amount", "work order amount", "contract value", "contract cost",
            "work order cost", "agreed amount"],
    label: "Contract Amount",
    get: (p) => p.workOrderData?.contractAmount,
    fmt: (v) => fmt(toLakh(v as number)) },
  { keys: ["loi amount", "loi approved amount", "loa amount", "loa approved amount", "letter of intent amount", "award amount"],
    label: "LOI Approved Amount",
    get: (p) => p.tenderData?.loa?.approvedAmount,
    fmt: (v) => fmt(toLakh(v as number)) },
  { keys: ["loi percentage", "loi approved percentage", "loa percentage", "loa approved percentage", "loi %", "loa %", "award percentage"],
    label: "LOI Approved Percentage",
    get: (p) => p.tenderData?.loa?.approvedPercentage,
    fmt: (v) => `${v}%` },
  { keys: ["net payable", "payable amount", "bill amount", "payment amount", "net payment"],
    label: "Net Payable (Latest MB)",
    get: (p) => p.mbData?.at(-1)?.netPayable,
    fmt: (v) => fmt(toLakh(v as number)) },
  { keys: ["total work amount", "gross amount", "work amount", "mb work amount", "measured amount"],
    label: "Total Work Amount (Latest MB)",
    get: (p) => p.mbData?.at(-1)?.totalWorkAmount,
    fmt: (v) => fmt(toLakh(v as number)) },
  { keys: ["security deposit amount", "security deposit"],
    label: "Security Deposit",
    get: (p) => p.workOrderData?.securityDeposit,
    fmt: (v) => `₹${Number(v).toLocaleString("en-IN")}` },
  { keys: ["performance guarantee amount", "performance guarantee", "performance bond"],
    label: "Performance Guarantee",
    get: (p) => { const pg = p.workOrderData?.performanceGuarantee; return typeof pg === "number" ? pg : undefined; },
    fmt: (v) => `₹${Number(v).toLocaleString("en-IN")}` },
  { keys: ["tender fee", "tender fees", "document fee", "document cost"],
    label: "Tender Fee",
    get: (p) => p.tenderData?.tenderFee,
    fmt: (v) => `₹${Number(v).toLocaleString("en-IN")}` },
  { keys: ["emd amount", "earnest money deposit", " emd ", "bid security"],
    label: "EMD Amount",
    get: (p) => p.tenderData?.emdAmount,
    fmt: (v) => `₹${Number(v).toLocaleString("en-IN")}` },
  { keys: ["quoted percentage", "l1 percentage", "l1 %", "quoted %",
            "percentage above", "percentage below", "quoted rate", "bid percentage"],
    label: "L1 Quoted Percentage",
    get: (p) => p.tenderData?.financialBid?.l1Bidder?.quotedPercentage,
    fmt: (v) => `${v}%` },

  // ── Dates ─────────────────────────────────────────────────────────────────
  { keys: ["commencement date", "start date", "work start date", "commencement",
            "work commencement", "site handover date"],
    label: "Work Commencement Date",
    get: (p) => p.workOrderData?.commencementDate },
  { keys: ["work completion date", "work deadline", "work completion", "completion due",
            "due date", "deadline", "finish date"],
    label: "Work Completion Date",
    get: (p) => p.workOrderData?.workCompletionDate },
  { keys: ["work order issue date", "wo issue date", "wo issued", "work order issued date",
            "work order date"],
    label: "Work Order Issue Date",
    get: (p) => p.workOrderData?.issueDate ?? p.workOrderData?.issuedDate },
  { keys: ["publishing date", "tender published", "publish date", "tender publish date",
            "published on", "tender open date"],
    label: "Tender Publishing Date",
    get: (p) => p.tenderData?.publishingDate },
  { keys: ["closing date", "bid closing", "last date", "tender closing",
            "submission deadline", "bid last date", "tender last date"],
    label: "Tender Closing Date",
    get: (p) => p.tenderData?.closingDate },
  { keys: ["bid start date", "bid opening date", "bid open date"],
    label: "Bid Start Date",
    get: (p) => p.tenderData?.bidStartDate },
  { keys: ["bid end date", "bid end"],
    label: "Bid End Date",
    get: (p) => p.tenderData?.bidEndDate },
  { keys: ["ts date", "technical sanction date", "ts issued date", "ts order date",
            "ts sanctioned date"],
    label: "TS Date",
    get: (p) => p.dtpData?.tsDate },
  { keys: ["aa date", "administrative approval date", "admin approval date",
            "aa order date", "aa sanctioned date"],
    label: "AA Date",
    get: (p) => p.dtpData?.aaDate },
  { keys: ["loi issued date", "loi issue date", "loi date", "loa issued date", "loa issue date", "loa date", "letter of intent date"],
    label: "LOI Issued Date",
    get: (p) => p.tenderData?.loa?.issuedDate },
  { keys: ["mb date", "measurement book date", "entry date", "mb entry date", "mb record date"],
    label: "Latest MB Entry Date",
    get: (p) => p.mbData?.at(-1)?.recordEntryDate },

  // ── Reference Numbers ─────────────────────────────────────────────────────
  { keys: ["ts number", "technical sanction number", "ts no ", "ts order number"],
    label: "TS Number",
    get: (p) => p.dtpData?.tsNumber },
  { keys: ["aa number", "administrative approval number", "aa no ", "admin approval number"],
    label: "AA Number",
    get: (p) => p.dtpData?.aaNumber },
  { keys: ["tender id", "tender number", "tender no ", "tender reference number"],
    label: "Tender ID",
    get: (p) => p.tenderData?.tenderId },
  { keys: ["mahatender reference", "mahatender id", "maha tender", "maha ref", "mahatender no"],
    label: "MahaTender Reference ID",
    get: (p) => p.tenderData?.mahaTenderReferenceId },
  { keys: ["work order number", "wo number", "wo no ", "work order no ", "work order reference"],
    label: "Work Order Number",
    get: (p) => p.workOrderData?.workOrderNumber },
  { keys: ["mb number", "measurement book number", "mb no ", "latest mb number"],
    label: "Latest MB Number",
    get: (p) => p.mbData?.at(-1)?.mbNumber },

  // ── Contractor / Bidder ───────────────────────────────────────────────────
  { keys: ["l1 bidder name", "l1 contractor name", "winning bidder", "lowest bidder", "l1 bidder"],
    label: "L1 Contractor",
    get: (p) => p.workOrderData?.l1Contractor
             ?? p.tenderData?.loa?.l1Contractor
             ?? p.tenderData?.financialBid?.l1Bidder?.name },
  { keys: ["contractor gst", "contractor gstin", "contractor gst number"],
    label: "Contractor GST",
    get: (p) => p.workOrderData?.contractorGST },
  { keys: ["contractor address"],
    label: "Contractor Address",
    get: (p) => p.workOrderData?.contractorAddress },
  { keys: ["number of bidders", "bidder count", "total bidders", "how many bidders"],
    label: "Number of Bidders",
    get: (p) => p.tenderData?.technicalBid?.bidders?.length,
    fmt: (v) => `${v} bidder${Number(v) !== 1 ? "s" : ""}` },
  { keys: ["class of contractor", "contractor class", "contractor category", "contractor eligibility"],
    label: "Class of Contractor",
    get: (p) => p.tenderData?.classOfContractor },

  // ── Project Classification ────────────────────────────────────────────────
  { keys: ["work activity", "type of work", "nature of work", "work type", "activity type"],
    label: "Work Activity",
    get: (p) => p.workActivity },
  { keys: ["sanction year", "year of sanction", "project year", "sanctioned year"],
    label: "Sanction Year",
    get: (p) => p.sanctionYear },
  { keys: ["ssr type", "rate schedule type", "ssr schedule"],
    label: "SSR Type",
    get: (p) => p.ssrType },
  { keys: ["ssr year", "rate schedule year"],
    label: "SSR Year",
    get: (p) => p.ssrYear },
  { keys: ["budget department", "budget head department"],
    label: "Budget Department",
    get: (p) => p.budgetDepartment },
  { keys: ["major head name", "major head", "budget head name", "head of account"],
    label: "Major Head",
    get: (p) => p.majorHeadName },
  { keys: ["major head code", "head code", "account code"],
    label: "Major Head Code",
    get: (p) => p.majorHeadCode },

  // ── Completion Period ─────────────────────────────────────────────────────
  { keys: ["completion period", "work period", "time period", "duration of work", "project duration"],
    label: "Completion Period",
    get: (p) => p.workOrderData?.completionPeriod
             ?? p.tenderData?.completionPeriod
             ?? p.dtpData?.completionPeriod },
  { keys: ["dlp period", "defect liability period", "defect period"],
    label: "DLP Period",
    get: (p) => p.dtpData?.dlpPeriod },
  { keys: ["payment terms", "payment conditions"],
    label: "Payment Terms",
    get: (p) => p.dtpData?.paymentTerms },
  { keys: ["penalty clause", "penalty condition", "penalty provision"],
    label: "Penalty Clause",
    get: (p) => p.dtpData?.penaltyClause },

  // ── Approval / Workflow ───────────────────────────────────────────────────
  { keys: ["created by", "project created by", "initiated by", "who created", "project initiator"],
    label: "Created By",
    get: (p) => p.createdBy },
  { keys: ["dtp sanctioned by", "sanctioned by", "who sanctioned"],
    label: "Sanctioned By",
    get: (p) => p.dtpData?.sanctionedBy },
  { keys: ["ee approved by", "ee approval", "who approved dtp"],
    label: "EE Approved By",
    get: (p) => p.tenderData?.eeApprovedBy },
  { keys: ["cafo approved", "cafo approval"],
    label: "CAFO Approved By",
    get: (p) => p.tenderData?.cafoApprovedBy },
  { keys: ["additional ceo approved", "aceo approved", "final approved by"],
    label: "Additional CEO Approved By",
    get: (p) => p.tenderData?.additionalCeoApprovedBy },
  { keys: ["work order issued by", "wo issued by", "who issued work order"],
    label: "Work Order Issued By",
    get: (p) => p.workOrderData?.issuedBy },

  // ── MB Summary ────────────────────────────────────────────────────────────
  { keys: ["mb count", "number of mbs", "total mbs", "how many mbs", "mb records"],
    label: "Total MBs",
    get: (p) => p.mbData?.length,
    fmt: (v) => `${v} Measurement Book${Number(v) !== 1 ? "s" : ""}` },
  { keys: ["mb status", "measurement book status", "latest mb status", "current mb status"],
    label: "Latest MB Status",
    get: (p) => p.mbData?.at(-1)?.status },

  // ── DTP References ────────────────────────────────────────────────────────
  { keys: ["ssr reference", "ssr ref"],
    label: "SSR Reference",
    get: (p) => p.dtpData?.ssrReference },
  { keys: ["dsr reference", "dsr ref"],
    label: "DSR Reference",
    get: (p) => p.dtpData?.dsrReference },
];

// Returns a field-specific reply when the query names a known project field,
// or null when no alias matches (caller falls through to the detail card).
function resolveProjectField(lower: string, p: AccessibleProject): string | null {
  for (const alias of PROJECT_FIELD_ALIASES) {
    if (!alias.keys.some((k) => lower.includes(k))) continue;
    const raw = alias.get(p);
    if (raw == null || raw === "") {
      return `**${p.id}** — ${p.projectName}\n${alias.label}: _Not recorded_`;
    }
    const display = alias.fmt
      ? alias.fmt(raw as string | number | boolean)
      : String(raw);
    return `**${p.id}** — ${p.projectName}\n${alias.label}: **${display}**`;
  }
  return null;
}

// ── Retrieval engine ──────────────────────────────────────────────────────────
// Searches ALL accessible data sources with per-field weighted scoring.
//
// Match precision tiers (per field, per term):
//   Tier 1 — Exact full-value match  → weight × 8  + exactMatch flag
//   Tier 2 — Word-boundary match     → weight × 2
//   Tier 3 — Substring match         → weight × 1
//
// Field weights reflect specificity: IDs/codes (200) > names (100) >
// status/location (50-60) > secondary fields (20-30).
//
// Ranking: exactMatch records always sort above partial-match records.
// Grouping: only within 15% of top score, same type — never cross-type mixing.

const SEARCH_STOP_WORDS = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","with",
  "from","by","as","is","are","was","were","be","been","has","have","had",
  "do","does","did","will","would","could","should","may","might","can",
  "i","me","my","we","our","you","your","he","she","it","its","they",
  "them","their","this","that","these","those",
  "who","what","where","when","which","how","why",
  "show","find","get","give","list","tell","please","need",
  "any","about","there","here","also","just","only","not",
]);

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface SearchMatch {
  type: "project"|"user"|"rate-item"|"charge"|"template"|"notification"|"role"|"stage";
  id: string;
  title: string;
  score: number;
  exactMatch: boolean;   // true when a term exactly equals a primary-field value
  format: (intent: QueryIntent) => string;
}

function comprehensiveSearch(
  lower:         string,
  intent:        QueryIntent,
  role:          string,
  projects:      ReturnType<typeof getAccessibleProjects>,
  notifications: INotification[],
): string | null {
  const terms = lower.split(/\s+/).filter((w) => w.length > 1 && !SEARCH_STOP_WORDS.has(w));
  if (terms.length === 0) return null;

  // Pre-compile word-boundary patterns once per search — avoids recompilation
  // for every field × every record.
  const patterns = terms.map((t) => ({
    t,
    boundary: new RegExp(`(?:^|\\s)${escapeRegex(t)}(?:\\s|$)`),
  }));

  type FieldDef = { value: string; weight: number; primary?: boolean };

  // Score one record's fields against all query terms.
  // Each term contributes its best field score (avoids double-counting).
  const scoreRecord = (fields: FieldDef[]): { score: number; exactMatch: boolean } => {
    let score = 0;
    let exactMatch = false;
    for (const { t, boundary } of patterns) {
      let best = 0;
      let termExact = false;
      for (const { value, weight, primary } of fields) {
        const v = (value ?? "").toLowerCase().trim();
        if (!v) continue;
        let pts: number;
        if (v === t) {
          pts = weight * 8;               // exact full-value match
          if (primary) termExact = true;
        } else if (boundary.test(v)) {
          pts = weight * 2;               // word-boundary match
        } else if (v.includes(t)) {
          pts = weight;                   // substring match (lowest priority)
        } else {
          pts = 0;
        }
        if (pts > best) best = pts;
      }
      score += best;
      if (termExact) exactMatch = true;
    }
    return { score, exactMatch };
  };

  const matches: SearchMatch[] = [];

  // ── 1. Projects ─────────────────────────────────────────────────────────────
  if (canAccess(role, "projects")) {
    for (const p of projects) {
      const stageInfo = WORKFLOW_STAGES.find(
        (s) => s.status === p.status.toLowerCase() || s.status === (p.currentStage ?? "").toLowerCase()
      );
      const handledBy = stageInfo?.handledBy ?? "";
      const contractor = p.workOrderData?.l1Contractor
        ?? p.tenderData?.loa?.l1Contractor
        ?? p.tenderData?.financialBid?.l1Bidder?.name
        ?? "";

      // Comprehensive field-token string — lets field-label queries like
      // "commencement date" or "TS number" score projects that have those
      // fields, even when the label doesn't appear in the project name or ID.
      const fieldTokens = [
        p.estimatedAmount         != null ? "estimated amount project cost estimate" : "",
        p.technicalSanctionAmount != null ? "technically sanctioned ts amount tsa technical sanction" : "",
        p.gstAmount               != null ? "gst amount" : "",
        p.dtpData ? [
          "ts number ts date aa number aa date dtp completion period sanction",
          p.dtpData.tsNumber ?? "", p.dtpData.aaNumber ?? "",
          p.dtpData.tsDate ?? "", p.dtpData.aaDate ?? "",
        ].join(" ") : "",
        p.tenderData ? [
          "tender id publishing date closing date emd tender fee class contractor mahatender quoted percentage l1 bidder",
          p.tenderData.tenderId ?? "", p.tenderData.mahaTenderReferenceId ?? "",
          p.tenderData.publishingDate ?? "", p.tenderData.closingDate ?? "",
          p.tenderData.financialBid?.l1Bidder?.name ?? "",
          p.tenderData.loa ? "loa amount loa percentage approved amount letter of award" : "",
        ].join(" ") : "",
        p.workOrderData ? [
          "work order commencement date completion date due date deadline contract amount security deposit performance guarantee wo number issued by",
          p.workOrderData.workOrderNumber ?? "", p.workOrderData.commencementDate ?? "",
          p.workOrderData.workCompletionDate ?? "", p.workOrderData.issueDate ?? "",
        ].join(" ") : "",
        p.mbData?.length ? [
          `measurement book mb net payable work amount deductions entry date ${p.mbData.length} mbs`,
          p.mbData.at(-1)?.mbNumber ?? "", p.mbData.at(-1)?.recordEntryDate ?? "",
        ].join(" ") : "",
      ].filter(Boolean).join(" ");

      const fields: FieldDef[] = [
        { value: p.id,                                      weight: 200, primary: true },
        { value: p.projectName,                             weight: 100, primary: true },
        { value: p.status,                                  weight: 60  },
        { value: p.currentStage ?? "",                      weight: 50  },
        { value: p.workActivity ?? "",                      weight: 50  },
        { value: p.taluka,                                  weight: 50  },
        { value: p.gramPanchayat,                           weight: 50  },
        { value: p.division,                                weight: 40  },
        { value: p.subDivision ?? "",                       weight: 30  },
        { value: p.departmentName ?? "",                    weight: 30  },
        { value: contractor,                                weight: 60  },
        { value: handledBy,                                 weight: 30  },
        { value: p.tenderData?.tenderId ?? "",              weight: 80, primary: true },
        { value: p.tenderData?.status ?? "",                weight: 30  },
        { value: p.tenderData?.mahaTenderReferenceId ?? "", weight: 60, primary: true },
        { value: p.tenderData?.classOfContractor ?? "",     weight: 20  },
        { value: p.workOrderData?.workOrderNumber ?? "",    weight: 80, primary: true },
        { value: p.workOrderData?.status ?? "",             weight: 30  },
        { value: p.ssrType ?? "",                           weight: 20  },
        { value: p.sanctionYear ?? "",                      weight: 20  },
        { value: fieldTokens, weight: 25 },
        ...(p.mbData?.flatMap((mb) => [
          { value: mb.mbNumber, weight: 60, primary: true as boolean },
          { value: mb.status,   weight: 20 },
        ]) ?? []),
      ];

      const { score, exactMatch } = scoreRecord(fields);
      if (score <= 0) continue;

      matches.push({
        type: "project", id: p.id, title: p.projectName, score, exactMatch,
        format: (intent) => {
          const field = resolveProjectField(lower, p);
          if (field) return field;
          if (intent === "status")
            return `**${p.id}** — ${p.projectName}\nStatus: **${p.status}**`;
          if (intent === "ts-amount") {
            const ts = p.technicalSanctionAmount;
            return ts != null
              ? `**${p.id}** — ${p.projectName}\nTS Amount: **${fmt(toLakh(ts))}**`
              : `**${p.id}** — ${p.projectName}\nNo technically sanctioned amount recorded yet.`;
          }
          if (intent === "amount")
            return `**${p.id}** — ${p.projectName}\nEstimated: **${fmt(toLakh(p.estimatedAmount ?? 0))}**`;
          if (intent === "location")
            return `**${p.id}** — ${p.projectName}\nLocation: ${p.gramPanchayat}, ${p.taluka} — ${p.division}`;
          if (intent === "contractor")
            return contractor
              ? `**${p.id}** — ${p.projectName}\nContractor: **${contractor}**`
              : `**${p.id}** — ${p.projectName}\nNo contractor assigned yet`;
          if (intent === "history") {
            const hist = p.history ?? [];
            if (!hist.length) return `**${p.id}** — ${p.projectName}\nNo history recorded yet.`;
            const recent = hist.slice(-5);
            return `**${p.id}** — ${p.projectName}\n**History (last ${recent.length}):**\n${recent.map((h) => `• ${h.action} by ${h.performedBy} | ${h.performedAt.split("T")[0]}\n  ${h.fromStatus} → ${h.toStatus}`).join("\n")}`;
          }
          let r = `**${p.id}** — ${p.projectName}\n• Status: **${p.status}** | Stage: ${p.currentStage ?? "—"}\n• Amount: ${fmt(toLakh(p.estimatedAmount ?? 0))} | Location: ${p.taluka}, ${p.gramPanchayat} (${p.division})`;
          if (contractor) r += `\n• Contractor: **${contractor}**`;
          if (p.workOrderData) r += `\n• WO: ${p.workOrderData.workOrderNumber ?? "Issued"} | Due: ${p.workOrderData.workCompletionDate}`;
          if (p.tenderData && canAccess(role, "tender")) r += `\n• Tender: ${p.tenderData.tenderId ?? "—"} | ${p.tenderData.status}`;
          if (p.mbData?.length) {
            const mb = p.mbData.at(-1)!;
            r += `\n• MBs: ${p.mbData.length} | Latest: ${mb.mbNumber} (${mb.status})`;
          }
          return r;
        },
      });
    }
  }

  // ── 2. Users ──────────────────────────────────────────────────────────────
  if (canAccess(role, "users")) {
    for (const u of store.getAllUsers()) {
      const { score, exactMatch } = scoreRecord([
        { value: u.name,           weight: 100, primary: true },
        { value: u.email,          weight: 100, primary: true },
        { value: u.role,           weight: 80,  primary: true },
        { value: u.division ?? "", weight: 40   },
        { value: u.status,         weight: 30   },
      ]);
      if (score <= 0) continue;
      matches.push({
        type: "user", id: u.email, title: u.name, score, exactMatch,
        format: () =>
          `**${u.name}** (${u.role})\n• Email: ${u.email} | Status: ${u.status} | Division: ${u.division ?? "—"} | Last Login: ${u.lastLogin ?? "Never"}`,
      });
    }
  }

  // ── 3. Rate Items ─────────────────────────────────────────────────────────
  if (canAccess(role, "rate-items")) {
    for (const item of store.getAllRateItems()) {
      const { score, exactMatch } = scoreRecord([
        { value: item.id,          weight: 200, primary: true },
        { value: item.code,        weight: 200, primary: true },
        { value: item.description, weight: 40   },
        { value: item.type,        weight: 30   },
        { value: item.unit,        weight: 20   },
        { value: item.year ?? "",  weight: 20   },
      ]);
      if (score <= 0) continue;
      matches.push({
        type: "rate-item", id: item.id,
        title: `${item.code} — ${item.description.slice(0, 50)}`,
        score, exactMatch,
        format: () =>
          `**${item.id}** — \`${item.code}\`\n• ${item.description.slice(0, 200)}${item.description.length > 200 ? "…" : ""}\n• Rate: ₹${item.rate.toLocaleString("en-IN")}/${item.unit} | Type: ${item.type} | Year: ${item.year}`,
      });
    }
  }

  // ── 4. Charges ────────────────────────────────────────────────────────────
  if (canAccess(role, "charges")) {
    for (const charge of store.getAllCharges()) {
      const { score, exactMatch } = scoreRecord([
        { value: charge.type,                              weight: 100, primary: true },
        { value: charge.isActive ? "active" : "inactive", weight: 30   },
        { value: String(charge.percentage),                weight: 20   },
      ]);
      if (score <= 0) continue;
      matches.push({
        type: "charge", id: charge.type, title: charge.type, score, exactMatch,
        format: () =>
          `**${charge.type}**: **${charge.percentage}%** (${charge.isActive ? "Active ✓" : "Inactive"})`,
      });
    }
  }

  // ── 5. Templates ──────────────────────────────────────────────────────────
  if (canAccess(role, "templates")) {
    for (const t of store.getTemplates()) {
      const { score, exactMatch } = scoreRecord([
        { value: t.name, weight: 100, primary: true },
        { value: t.type, weight: 60,  primary: true },
      ]);
      if (score <= 0) continue;
      const vars = [...new Set([...t.content.matchAll(/\{\{(\w+)\}\}/g)].map((m) => `{{${m[1]}}}`))] ;
      matches.push({
        type: "template", id: t.name, title: t.name, score, exactMatch,
        format: () =>
          `**${t.name}** (type: \`${t.type}\`)\nVariables: ${vars.slice(0, 6).join(", ")}${vars.length > 6 ? "…" : ""}\nEdit at **Template Editor**.`,
      });
    }
  }

  // ── 6. Notifications ─────────────────────────────────────────────────────
  for (const n of notifications) {
    const { score, exactMatch } = scoreRecord([
      { value: n.title,   weight: 80, primary: true },
      { value: n.message, weight: 40  },
    ]);
    if (score <= 0) continue;
    matches.push({
      type: "notification", id: n.id ?? n.title, title: n.title, score, exactMatch,
      format: () => `**${n.title}**: ${n.message}`,
    });
  }

  // ── 7. Role Knowledge — live user records take priority over descriptions ──
  for (const [roleName, rk] of Object.entries(ROLE_KNOWLEDGE)) {
    const { score, exactMatch } = scoreRecord([
      { value: roleName,           weight: 100, primary: true },
      { value: rk.description,    weight: 20   },
      { value: rk.reports ?? "",  weight: 20   },
      ...rk.responsibilities.map((r) => ({ value: r, weight: 15 })),
    ]);
    if (score <= 0) continue;
    matches.push({
      type: "role", id: roleName, title: roleName, score, exactMatch,
      format: () => {
        if (canAccess(role, "users")) {
          const found = store.getAllUsers().filter((u) => u.role === roleName);
          if (found.length === 1) {
            const u = found[0];
            return `**${roleName}:** ${u.name}\n• Email: ${u.email} | Status: ${u.status} | Division: ${u.division ?? "—"}`;
          }
          if (found.length > 1)
            return `**${roleName}s (${found.length}):**\n${found.map((u) => `• **${u.name}** — ${u.email} | ${u.status}`).join("\n")}`;
        }
        let reply = `**${roleName}**\n${rk.description}\n\n**Responsibilities:**\n${rk.responsibilities.map((r) => `• ${r}`).join("\n")}`;
        if (rk.reports) reply += `\n\n**Reports to:** ${rk.reports}`;
        return reply;
      },
    });
  }

  // ── 8. Workflow Stages — live project counts first, description as fallback ──
  for (const stage of WORKFLOW_STAGES) {
    const { score, exactMatch } = scoreRecord([
      { value: stage.status,      weight: 80, primary: true },
      { value: stage.description, weight: 20  },
      { value: stage.handledBy,   weight: 30  },
      { value: stage.nextStep,    weight: 15  },
    ]);
    if (score <= 0) continue;
    const atStage = canAccess(role, "projects")
      ? projects.filter((p) => p.status.toLowerCase() === stage.status || p.currentStage?.toLowerCase() === stage.status)
      : [];
    matches.push({
      type: "stage", id: stage.status, title: stage.status, score, exactMatch,
      format: () => {
        const label = stage.status.replace(/\b\w/g, (c) => c.toUpperCase());
        if (atStage.length > 0)
          return `**Projects at "${label}" (${atStage.length}):**\n${atStage.slice(0, 6).map((p) => `• **${p.id}** — ${p.projectName}`).join("\n")}${atStage.length > 6 ? `\n_…and ${atStage.length - 6} more_` : ""}\n\n_${stage.description}_\n**Handled by:** ${stage.handledBy}`;
        return `**Stage: ${label}**\n${stage.description}\n• **Handled by:** ${stage.handledBy}\n• **Next step:** ${stage.nextStep}`;
      },
    });
  }

  if (matches.length === 0) return null;

  // ── Rank and select ───────────────────────────────────────────────────────
  // Exact primary-field matches always sort above any partial-match record,
  // regardless of raw score — prevents a long description match from beating
  // an exact code/ID match.
  matches.sort((a, b) => {
    if (a.exactMatch !== b.exactMatch) return a.exactMatch ? -1 : 1;
    return b.score - a.score;
  });

  const top    = matches[0];
  const second = matches[1];

  // Clear winner — return immediately without grouping:
  //   • only one result
  //   • top score is 20%+ ahead of second
  //   • top has an exact primary-field match and second does not
  if (
    !second ||
    top.score > second.score * 1.2 ||
    (top.exactMatch && !second.exactMatch)
  ) {
    return top.format(intent);
  }

  // Near-tied results of the SAME type — group them (threshold tightened to
  // 85% vs. old 70% to reduce false groupings).
  const threshold = top.score * 0.85;
  const sameType  = matches.filter((m) => m.type === top.type && m.score >= threshold);

  if (sameType.length > 1) {
    const TYPE_LABELS: Record<string, string> = {
      project: "Project", user: "User", "rate-item": "Rate Item",
      charge: "Charge", template: "Template", notification: "Notification",
      role: "Role", stage: "Workflow Stage",
    };
    const label = TYPE_LABELS[top.type] ?? top.type;
    if (sameType.length <= 3) {
      return `**${sameType.length} ${label}${sameType.length > 1 ? "s" : ""} found:**\n\n${sameType.map((m) => m.format(intent)).join("\n\n")}`;
    }
    return `**${sameType.length} ${label}s matching your query:**\n${sameType.slice(0, 8).map((m) => `• **${m.id}** — ${m.title}`).join("\n")}${sameType.length > 8 ? `\n_…and ${sameType.length - 8} more_` : ""}`;
  }

  // Mixed types or too narrow a margin to group: return the single best result
  return top.format(intent);
}

function getContextualReply(input: string, user: User | null, notifications: INotification[]): string {
  if (!user) return "Please log in to use the IIMS Assistant.";

  const lower     = input.toLowerCase().trim();
  const firstName = user.name.split(" ")[0];
  const role      = user.role;
  const navModules = (NAV_BY_ROLE[role] ?? []).filter((m) => m.label !== "Notifications");
  const actions   = notifications.filter((n) => n.category === "action");
  const projects  = getAccessibleProjects(user);
  const allowed   = ROLE_MODULES[role] ?? new Set<string>();

  const denyWithScope = () => {
    const mods = navModules.map((m) => m.label).join(", ");
    return `You do not have access to this information. I can assist you only with the modules and records assigned to your role: **${mods}**.`;
  };

  // ── Always-allowed: identity, personal, greetings ─────────────────────────

  if (hit(lower, ["hello", "hi there", "hey there", "namaste", "good morning", "good afternoon", "good evening"])) {
    return `Hello, **${firstName}**! How can I help you today?`;
  }

  if (hit(lower, ["who am i", "my role", "my designation", "what is my role", "my profile"])) {
    return `You are **${user.name}**, logged in as **${role}**.\n\nYour accessible modules: ${navModules.map((m) => `**${m.label}**`).join(", ")}.`;
  }

  if (hit(lower, ["my modules", "what can i access", "accessible modules", "my access", "what pages", "what sections"])) {
    return `As **${role}**, you have access to:\n${navModules.map((m) => `• **${m.label}**`).join("\n")}`;
  }

  if (hit(lower, ["my documents", "what documents", "document access", "accessible documents"])) {
    const docs = ROLE_DOCUMENTS[role] ?? ["Standard documents for your role"];
    return `Documents accessible to **${role}**:\n${docs.map((d) => `• ${d}`).join("\n")}`;
  }

  if (hit(lower, ["my pending", "pending approval", "awaiting my", "action required", "my queue", "pending actions", "my approvals", "which projects are awaiting"])) {
    if (!actions.length) return `No pending actions for you right now, ${firstName}. Your queue is clear!`;
    return `You have **${actions.length} pending action${actions.length !== 1 ? "s" : ""}**, ${firstName}:\n\n${actions.slice(0, 5).map((n) => `• **${n.title}**: ${n.message}`).join("\n")}`;
  }

  if (hit(lower, ["my notifications", "my alerts", "recent notifications", "show notifications"])) {
    if (!notifications.length) return `No notifications for you right now, ${firstName}.`;
    return `Your recent notifications:\n\n${notifications.slice(0, 5).map((n) => `• **${n.title}**: ${n.message}`).join("\n")}`;
  }

  if (hit(lower, ["my activities", "recent activities", "activity log"])) {
    const updates = notifications.filter((n) => n.category === "update").slice(0, 5);
    if (!updates.length) return `No recent activity updates, ${firstName}.`;
    return `Recent activity:\n${updates.map((n) => `• **${n.title}**: ${n.message}`).join("\n")}`;
  }

  if (hit(lower, ["help", "what can you do", "how can you help"])) {
    return `I can help you with your **${role}** tasks, ${firstName}.\n\nYour modules: ${navModules.map((m) => m.label).join(", ")}\n\n• Ask about your pending actions\n• Look up a project (e.g. "status of PRJ-001")\n• Ask about any role or designation (e.g. "What does Sectional Engineer do?")\n• Search rate items, charges, templates, and workflows\n• Query module-specific data or workflow stages`;
  }

  // ── Dashboard / overview ──────────────────────────────────────────────────

  if (hit(lower, ["my dashboard", "my overview", "my summary", "dashboard summary", "what's happening", "whats happening", "what is on my dashboard"])) {
    let dash = `**Your Dashboard, ${firstName}** — ${role}\n`;
    dash += `• Pending actions: **${actions.length}**\n`;
    if (canAccess(role, "projects")) dash += `• Accessible projects: **${projects.length}**\n`;
    if (actions.length > 0) {
      dash += `\n**Pending Actions:**\n${actions.slice(0, 4).map((n) => `• ${n.title}: ${n.message}`).join("\n")}`;
      if (actions.length > 4) dash += `\n_…and ${actions.length - 4} more. Say "show all pending actions" to see the full list._`;
    } else {
      dash += `\nYour queue is clear — no actions waiting for you right now!`;
    }
    return dash;
  }

  // ── STEP 1: Entity extraction + intent classification ────────────────────────
  // Entity extraction runs first — specific IDs, codes, and names take priority
  // over any keyword-based routing.  Intent shapes the response format.

  const ent    = extractEntities(lower);
  const intent = classifyIntent(lower);

  // ── STEP 2: Project IDs ───────────────────────────────────────────────────
  // Matches: PRJ-001, PRJ001, prj-01, "project 3", "project no. 1"

  if (ent.projectIds.length > 0) {
    if (!canAccess(role, "projects")) return denyWithScope();
    for (const projId of ent.projectIds) {
      const found = projects.find((p) => p.id.toUpperCase() === projId.toUpperCase());
      if (!found) {
        const existsAnywhere = store.getAllProjects().find((p) => p.id.toUpperCase() === projId.toUpperCase());
        if (existsAnywhere) return DENY_MSG;
        continue;
      }
      // Field-specific query takes priority over intent-shaped responses
      const fieldReply = resolveProjectField(lower, found);
      if (fieldReply) return fieldReply;
      // Intent-shaped responses
      if (intent === "status")     return `Project **${found.id}** is currently **${found.status}**.`;
      if (intent === "ts-amount") {
        const ts = found.technicalSanctionAmount;
        return ts != null
          ? `The technically sanctioned (TS) amount for **${found.id}** (${found.projectName}) is **${fmt(toLakh(ts))}**.`
          : `**${found.id}** — ${found.projectName}\nNo technically sanctioned amount recorded yet.`;
      }
      if (intent === "amount")     return `The estimated amount for **${found.id}** (${found.projectName}) is **${fmt(toLakh(found.estimatedAmount ?? 0))}**.`;
      if (intent === "location")   return `**${found.id}** is located in ${found.gramPanchayat}, ${found.taluka} — ${found.division}.`;
      if (intent === "contractor") {
        const c = found.workOrderData?.l1Contractor ?? found.tenderData?.loa?.l1Contractor ?? found.tenderData?.financialBid?.l1Bidder?.name;
        return c ? `The L1 contractor for **${found.id}** is **${c}**.` : `No contractor assigned to **${found.id}** yet.`;
      }
      if (intent === "history") {
        const hist = found.history ?? [];
        if (!hist.length) return `No history recorded for **${found.id}** yet.`;
        const recent = hist.slice(-8);
        return `**${found.id}** — ${found.projectName}\n**History (${hist.length} entries, last ${recent.length}):**\n${recent.map((h) => `• **${h.action}** by ${h.performedBy} | ${h.performedAt.split("T")[0]}\n  ${h.fromStatus} → ${h.toStatus}${h.remarks ? `\n  _${h.remarks}_` : ""}`).join("\n")}`;
      }
      // Default: full detail card
      let reply = `**${found.id}** — ${found.projectName}\n• **Status:** ${found.status}\n• **Stage:** ${found.currentStage ?? "—"}\n• **Amount:** ${fmt(toLakh(found.estimatedAmount ?? 0))}\n• **Location:** ${found.taluka}, ${found.gramPanchayat} (${found.division})`;
      if (found.workOrderData) {
        const wo = found.workOrderData;
        reply += `\n• **Work Order:** ${wo.workOrderNumber ?? "Issued"} | Contractor: ${wo.l1Contractor ?? "—"} | ${fmt(toLakh(wo.contractAmount))} | Due: ${wo.workCompletionDate}`;
      }
      if (found.tenderData?.loa) {
        const loa = found.tenderData.loa;
        reply += `\n• **LOI:** ${loa.l1Contractor} | ${fmt(toLakh(loa.approvedAmount))} | ${loa.status}`;
      }
      if (found.tenderData && canAccess(role, "tender")) {
        reply += `\n• **Tender:** ${found.tenderData.tenderId} | ${found.tenderData.status}`;
      }
      if (found.mbData?.length) {
        const latestMB = found.mbData.at(-1)!;
        reply += `\n• **MBs:** ${found.mbData.length} | Latest: ${latestMB.mbNumber} (${latestMB.status})`;
      }
      return reply;
    }
    if (ent.projectIds.length === 1) {
      return `Project **${ent.projectIds[0]}** was not found in your accessible records.`;
    }
  }

  // ── STEP 3: Tender IDs ────────────────────────────────────────────────────
  // Matches: TND-2026-014, TND2026014, "tnd 2026 014"

  if (ent.tenderIds.length > 0) {
    const canTender = canAccess(role, "tender") || canAccess(role, "loa") || canAccess(role, "bids") || canAccess(role, "work-order");
    if (!canTender) return denyWithScope();
    for (const tndId of ent.tenderIds) {
      const found = projects.find((p) => p.tenderData?.tenderId?.toUpperCase() === tndId.toUpperCase());
      if (!found) {
        if (store.getAllProjects().find((p) => p.tenderData?.tenderId?.toUpperCase() === tndId.toUpperCase())) return DENY_MSG;
        continue;
      }
      const td = found.tenderData!;
      let reply = `**${tndId}** — ${found.projectName} (**${found.id}**)\n• Status: ${td.status}\n• Published: ${td.publishingDate} | Closing: ${td.closingDate}\n• Class: ${td.classOfContractor} | EMD: ₹${td.emdAmount.toLocaleString("en-IN")} | Fee: ₹${td.tenderFee.toLocaleString("en-IN")}`;
      if (td.mahaTenderReferenceId) reply += `\n• MahaTender Ref: **${td.mahaTenderReferenceId}**`;
      if (td.technicalBid) reply += `\n• Technical Bid: ${td.technicalBid.status} (${td.technicalBid.bidders?.length ?? 0} bidder${(td.technicalBid.bidders?.length ?? 0) !== 1 ? "s" : ""})`;
      if (td.financialBid?.l1Bidder) {
        const l1 = td.financialBid.l1Bidder;
        reply += `\n• L1 Bidder: **${l1.name}** @ ${l1.quotedPercentage ?? "—"}%`;
      }
      if (td.loa) reply += `\n• LOI: Issued to **${td.loa.l1Contractor}** | ${fmt(toLakh(td.loa.approvedAmount))} | ${td.loa.status}`;
      return reply;
    }
  }

  // ── STEP 4: Work Order IDs ────────────────────────────────────────────────
  // Matches: WO-2026-007, WO2026007, "work order 2026-007"

  if (ent.woIds.length > 0) {
    if (!canAccess(role, "work-order")) return denyWithScope();
    for (const woId of ent.woIds) {
      const found = projects.find((p) => p.workOrderData?.workOrderNumber?.toUpperCase() === woId.toUpperCase());
      if (!found) {
        if (store.getAllProjects().find((p) => p.workOrderData?.workOrderNumber?.toUpperCase() === woId.toUpperCase())) return DENY_MSG;
        continue;
      }
      const wo = found.workOrderData!;
      return `**${woId}** — ${found.projectName} (**${found.id}**)\n• Contractor: **${wo.l1Contractor ?? "—"}**\n• Contract Amount: **${fmt(toLakh(wo.contractAmount))}**\n• Issue Date: ${wo.issueDate ?? wo.issuedDate ?? "—"}\n• Commencement: ${wo.commencementDate ?? "—"}\n• Completion Due: **${wo.workCompletionDate}**\n• Security Deposit: ₹${wo.securityDeposit.toLocaleString("en-IN")}\n• Status: ${wo.status}`;
    }
  }

  // ── STEP 5: MB Numbers ────────────────────────────────────────────────────
  // Matches: MB-2026-008-001, MB2026008001, "mb 2026 008 001"

  if (ent.mbIds.length > 0) {
    if (!canAccess(role, "mb")) return denyWithScope();
    for (const mbId of ent.mbIds) {
      let foundProject: ReturnType<typeof getAccessibleProjects>[number] | null = null;
      let foundMB: NonNullable<ReturnType<typeof getAccessibleProjects>[number]["mbData"]>[number] | null = null;
      for (const p of projects) {
        const mb = p.mbData?.find((m) => m.mbNumber.toUpperCase() === mbId.toUpperCase());
        if (mb) { foundProject = p; foundMB = mb; break; }
      }
      if (!foundMB || !foundProject) {
        for (const p of store.getAllProjects()) {
          if (p.mbData?.find((m) => m.mbNumber.toUpperCase() === mbId.toUpperCase())) return DENY_MSG;
        }
        return `Measurement Book **${mbId}** was not found.`;
      }
      const ded = foundMB.deductions?.totalDeduction ?? 0;
      return `**${mbId}** — ${foundProject.projectName} (**${foundProject.id}**)\n• Entry Date: ${foundMB.recordEntryDate}\n• Work Amount: **${fmt(toLakh(foundMB.totalWorkAmount ?? 0))}**\n• Deductions: ${fmt(toLakh(ded))}\n• **Net Payable: ${fmt(toLakh(foundMB.netPayable ?? 0))}**\n• Status: **${foundMB.status}**\n• Contractor Accepted: ${foundMB.acceptedByContractor ? "Yes ✓" : "Pending"}\n• Items measured: ${foundMB.measurements.length}`;
    }
  }

  // ── STEP 6: Rate codes ────────────────────────────────────────────────────
  // Matches: 18.01, 10.01, D-2.01, SSR001, DSR-5 — without "rate item" keyword

  if (ent.rateCodes.length > 0) {
    if (!canAccess(role, "rate-items")) return denyWithScope();
    return handleRateItems(lower, firstName);
  }

  // ── STEP 7: Charge names ──────────────────────────────────────────────────
  // Matches charge aliases even without "charge" keyword in the query

  if (ent.chargeNames.length > 0) {
    if (!canAccess(role, "charges")) return denyWithScope();
    return handleCharges(lower, firstName);
  }

  // ── STEP 8: Role / designation names ─────────────────────────────────────
  // Only activate when the query has role-query intent, not general module queries.
  // "how many DEs" / "who is EE" → role block
  // "contractor road project" → falls through to comprehensiveSearch

  if (ent.roleNames.length > 0) {
    const roleName = ent.roleNames[0];
    const rk       = ROLE_KNOWLEDGE[roleName];
    const isRoleQuery = intent === "count" || intent === "person" || intent === "list" || intent === "definition"
      || hit(lower, ["tell me about", "what is a ", "what is an ", "what is the role", "about the role",
                     "show the", "find the", "show me the", "find me the", "who handles", "all the",
                     "all roles", "all designations", "list of roles"]);

    if (isRoleQuery) {
      if (intent === "count" && canAccess(role, "users")) {
        const count = store.getAllUsers().filter((u) => u.role === roleName).length;
        return `There ${count === 1 ? "is" : "are"} **${count} ${roleName}${count !== 1 ? "s" : ""}** registered in the system.`;
      }

      if ((intent === "person" || intent === "list") && canAccess(role, "users")) {
        const found = store.getAllUsers().filter((u) => u.role === roleName);
        if (found.length === 1) {
          const u = found[0];
          return `**${roleName}:** ${u.name}\n• Email: ${u.email}\n• Division: ${u.division ?? "—"}\n• Status: ${u.status}\n• Last Login: ${u.lastLogin ?? "Never"}`;
        }
        if (found.length > 1) return `**${roleName}s (${found.length}):**\n${found.map((u) => `• **${u.name}** — ${u.email} | ${u.division ?? "—"} | ${u.status}`).join("\n")}`;
        if (rk) return `No user with designation **${roleName}** is currently registered.\n\n_About this role:_ ${rk.description}`;
      }

      if (intent === "definition" && rk) {
        let reply = `**${roleName}**\n${rk.description}\n\n**Responsibilities:**\n${rk.responsibilities.map((r) => `• ${r}`).join("\n")}`;
        if (rk.reports) reply += `\n\n**Reports to:** ${rk.reports}`;
        return reply;
      }

      // Default for role queries: search live users first, definition as fallback
      if (canAccess(role, "users")) {
        const found = store.getAllUsers().filter((u) => u.role === roleName);
        if (found.length === 1) {
          const u = found[0];
          return `**${roleName}:** ${u.name}\n• Email: ${u.email}\n• Division: ${u.division ?? "—"}\n• Status: ${u.status}\n• Last Login: ${u.lastLogin ?? "Never"}`;
        }
        if (found.length > 1) return `**${roleName}s (${found.length}):**\n${found.map((u) => `• **${u.name}** — ${u.email} | ${u.division ?? "—"} | ${u.status}`).join("\n")}`;
      }
      if (rk) {
        let reply = `**${roleName}**\n${rk.description}\n\n**Responsibilities:**\n${rk.responsibilities.map((r) => `• ${r}`).join("\n")}`;
        if (rk.reports) reply += `\n\n**Reports to:** ${rk.reports}`;
        return reply;
      }
    }
  }

  // ── STEP 9: Workflow stage names ──────────────────────────────────────────
  // Projects at that stage first; stage explanation only when no live data.

  if (ent.stageNames.length > 0) {
    const stageName = ent.stageNames[0];
    const stageInfo = WORKFLOW_STAGES.find((s) => s.status === stageName);
    if (canAccess(role, "projects") && projects.length > 0) {
      const atStage = projects.filter((p) =>
        p.status.toLowerCase() === stageName || p.currentStage?.toLowerCase() === stageName
      );
      if (atStage.length > 0) {
        const label = stageName.replace(/\b\w/g, (c) => c.toUpperCase());
        return `**Projects at "${label}" (${atStage.length}):**\n${atStage.slice(0, 6).map((p) => `• **${p.id}** — ${p.projectName}`).join("\n")}${atStage.length > 6 ? `\n_…and ${atStage.length - 6} more_` : ""}${stageInfo ? `\n\n_${stageInfo.description}_\n**Handled by:** ${stageInfo.handledBy} → **Next:** ${stageInfo.nextStep}` : ""}`;
      }
    }
    if (stageInfo) {
      return `**Stage: ${stageName.replace(/\b\w/g, (c) => c.toUpperCase())}**\n${stageInfo.description}\n\n• **Handled by:** ${stageInfo.handledBy}\n• **Next step:** ${stageInfo.nextStep}`;
    }
  }

  // ── STEP 10: Count / list queries without a specific entity ───────────────

  if (intent === "count" || hit(lower, ["how many", "count of", "number of", "total number"])) {
    if (hit(lower, ["user", "account", "engineer", "officer", "clerk", "auditor", "accountant", "configurator", "administrator", "active", "inactive", "staff"]) && canAccess(role, "users")) {
      return handleUsers(lower, firstName);
    }
    if (hit(lower, ["project"]) && canAccess(role, "projects")) {
      return `You have access to **${projects.length} project${projects.length !== 1 ? "s" : ""}**.`;
    }
  }

  // ── All roles listing ─────────────────────────────────────────────────────

  if (hit(lower, ["all roles", "list of roles", "which roles", "roles in iims", "what roles are", "roles available", "roles in system", "available roles", "all designations", "list designations"])) {
    if (canAccess(role, "users")) {
      const allUsers = store.getAllUsers();
      const roleNames = Object.keys(ROLE_KNOWLEDGE);
      return `**Roles in IIMS (${roleNames.length}):**\n${roleNames.map((r) => {
        const count = allUsers.filter((u) => u.role === r).length;
        return `• **${r}** — ${count} user${count !== 1 ? "s" : ""}`;
      }).join("\n")}`;
    }
    const roleNames = Object.keys(ROLE_KNOWLEDGE);
    return `**Roles in IIMS (${roleNames.length}):**\n${roleNames.map((r) => `• **${r}**`).join("\n")}`;
  }

  // ── Person search: "who is [name]" without a role entity ─────────────────

  if (intent === "person" && canAccess(role, "users")) return handleUsers(lower, firstName);

  // ── STEP 11: Module routing — explicit listing / browsing intent only ──────
  // TOPIC_MAP fires ONLY when the user clearly wants to browse a module
  // ("show all projects", "list tenders", "my mb records"). For detail queries
  // ("status of project 3", "rate of 18.01") comprehensiveSearch (step 12)
  // handles retrieval so we never short-circuit on a keyword match alone.

  const isBrowse = intent === "list" || hit(lower, [
    "show all", "list all", "display all", "all projects", "all tenders",
    "all work orders", "all mb", "all bills", "all users", "all charges",
    "all templates", "all rate items", "my projects", "my tenders",
    "my work orders", "my mb", "my bills", "my approvals", "my pending",
    "pending with me", "assigned to me",
  ]);

  if (isBrowse) {
    const topic = detectTopic(lower);
    if (topic && !canAccess(role, topic)) return denyWithScope();
    if (topic === "projects" || topic === "drafts") return handleProjects(lower, role, firstName, projects, actions);
    if (topic === "dtp")                            return handleDTP(lower, role, firstName, projects, actions);
    if (topic === "tender" || topic === "bids")     return handleTender(lower, role, firstName, projects, actions);
    if (topic === "loa")                            return handleLOA(lower, role, firstName, projects, actions);
    if (topic === "work-order")                     return handleWorkOrder(lower, role, firstName, projects, actions);
    if (topic === "mb")                             return handleMB(lower, role, firstName, projects, notifications);
    if (topic === "payments" || topic === "budget") return handlePayments(lower, role, firstName, projects, notifications);
    if (topic === "users" || topic === "roles" || topic === "org" || topic === "approval-chains") return handleUsers(lower, firstName);
    if (topic === "charges")                        return handleCharges(lower, firstName);
    if (topic === "rate-items")                     return handleRateItems(lower, firstName);
    if (topic === "templates" || topic === "system-config") return handleTemplates(lower, firstName);
  }

  // ── STEP 12: Comprehensive search — scored sweep across ALL accessible data ─
  // This is the primary retrieval path for all detail, status, person, amount,
  // location, contractor, history, pending, and definition queries.

  const searchResult = comprehensiveSearch(lower, intent, role, projects, notifications);
  if (searchResult) return searchResult;

  // ── STEP 13: Static KB — procedural knowledge only (true last resort) ─────
  // Only fires when comprehensiveSearch found nothing — for "how to" /
  // "what is the process" queries that aren't answered by live data.

  for (const entry of STATIC_KB) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      if (entry.module && !canAccess(role, entry.module)) return denyWithScope();
      return entry.reply;
    }
  }

  // ── No result found ───────────────────────────────────────────────────────
  return `I could not find any matching information within your accessible modules and records.`;
}

// ─── Role-specific quick chips ───────────────────────────────────────────────

function getRoleChips(role: string): string[] {
  switch (role) {
    case "Sectional Engineer":
      return ["My pending actions", "Show my projects", "My DTP queue", "My MB records"];
    case "Deputy Engineer":
      return ["My pending actions", "MB pending verification", "DTP review queue"];
    case "Executive Engineer":
      return ["My pending actions", "MB approvals", "Tender actions", "Work orders"];
    case "Tender Clerk":
      return ["Tender schedules", "Tender IDs", "Financial bid results", "LOI status"];
    case "Auditor":
      return ["MB audit queue", "My pending actions", "Show my projects"];
    case "Accountant":
    case "Assistant Accounts Officer":
      return ["Bills pending payment", "My pending actions", "Payment actions"];
    case "Chief Accounts and Finance Officer":
      return ["Bills pending payment", "Budget overview", "My pending actions"];
    case "Additional Chief Executive Officer":
      return ["My pending actions", "DTP approvals", "LOI approvals"];
    case "Chief Executive Officer":
      return ["My pending actions", "Show all projects"];
    case "System Administrator":
      return ["User summary", "Active charges", "Show all rate items", "Available templates"];
    case "Contractor":
      return ["My work orders", "MB pending acceptance", "My payments"];
    case "Technical System Configurator":
      return ["Show all rate items", "Available templates", "Show all SSR items"];
    default:
      return ["My pending actions", "Show my projects", "What can I access?"];
  }
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

// Simple markdown bold: **text** → <strong>
function renderText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

// ─── Bot typing indicator ─────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 justify-start">
      <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
        <Bot className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
      </div>
      <div className="px-3 py-2 rounded-2xl rounded-bl-sm bg-gray-100 dark:bg-gray-700">
        <span className="flex gap-1 items-center h-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

// ─── Floating Chat Component ──────────────────────────────────────────────────

interface FloatingChatProps {
  open:             boolean;
  onClose:          () => void;
  user:             User | null;
  notifications:    INotification[];
  onTypingChange?:  (typing: boolean) => void;
}

function buildInitialMessage(): Message {
  return {
    id: "init", role: "bot", ts: new Date(),
    text: "Hi! How can I help you today?",
  };
}

export function FloatingChat({ open, onClose, user, notifications, onTypingChange }: FloatingChatProps) {
  const [messages, setMessages] = useState<Message[]>(() => [buildInitialMessage()]);
  const [input, setInput]       = useState("");
  const [minimized, setMinimized] = useState(false);
  const [typing, setTyping]     = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Notify parent of typing state changes for trigger icon animation
  useEffect(() => { onTypingChange?.(typing); }, [typing, onTypingChange]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (!minimized) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing, minimized]);

  // Focus input when panel opens / un-minimizes
  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, minimized]);

  const send = useCallback(() => {
    const text = input.trim();
    if (!text) return;

    const userMsg: Message = { id: uid(), role: "user", text, ts: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    // Simulated 600–1200 ms thinking delay
    const delay = 600 + Math.random() * 600;
    setTimeout(() => {
      const reply = getContextualReply(text, user, notifications);
      setTyping(false);
      setMessages((prev) => [...prev, { id: uid(), role: "bot", text: reply, ts: new Date() }]);
    }, delay);
  }, [input, user, notifications]);

  const handleKey = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    },
    [send]
  );

  if (!open) return null;

  return (
    <div
      className={[
        "fixed bottom-6 right-6 z-50 w-80 flex flex-col",
        "bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700",
        "transition-all duration-200 ease-out",
        minimized ? "h-auto" : "h-[28rem]",
      ].join(" ")}
      role="dialog"
      aria-label="IIMS Assistant"
      aria-modal="false"
    >
      {/* ── Panel header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl rounded-b-none shrink-0">
        {/* Bot icon */}
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight">IIMS Assistant</p>
          <p className="text-[10px] text-blue-200 leading-tight">
            {typing ? "Typing…" : "Online"}
          </p>
        </div>

        {/* Minimize */}
        <button
          type="button"
          onClick={() => setMinimized((m) => !m)}
          className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors"
          aria-label={minimized ? "Expand chat" : "Minimize chat"}
        >
          {minimized ? (
            <ChevronDown className="w-4 h-4 rotate-180" />
          ) : (
            <Minus className="w-4 h-4" />
          )}
        </button>

        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors"
          aria-label="Close chat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Body (hidden when minimized) ─────────────────────────────── */}
      {!minimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scroll-smooth">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={[
                  "flex items-end gap-2",
                  msg.role === "user" ? "justify-end" : "justify-start",
                ].join(" ")}
              >
                {/* Bot avatar */}
                {msg.role === "bot" && (
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0 mb-0.5">
                    <Bot className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                )}

                <div className="max-w-[75%] flex flex-col gap-1">
                  <div
                    className={[
                      "px-3 py-2 text-xs leading-relaxed",
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-2xl rounded-br-sm"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-2xl rounded-bl-sm",
                    ].join(" ")}
                  >
                    {renderText(msg.text)}
                  </div>
                  <p
                    className={[
                      "text-[10px] text-gray-400 dark:text-gray-500 px-1",
                      msg.role === "user" ? "text-right" : "text-left",
                    ].join(" ")}
                  >
                    {fmtTime(msg.ts)}
                  </p>
                </div>

                {/* User avatar */}
                {msg.role === "user" && (
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mb-0.5">
                    <span className="text-[10px] font-bold text-white">
                      {user?.name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() ?? "U"}
                    </span>
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {typing && <TypingIndicator />}

            {/* Scroll anchor */}
            <div ref={bottomRef} />
          </div>

          {/* ── Quick suggestion chips ──────────────────────────────── */}
          {messages.length <= 1 && (
            <div className="px-3 pb-1 flex flex-wrap gap-1.5">
              {getRoleChips(user?.role ?? "").map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setInput(q);
                    setTimeout(() => inputRef.current?.focus(), 0);
                  }}
                  className="text-[10px] px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* ── Input bar ─────────────────────────────────────────────── */}
          <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2 shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about IIMS…"
              disabled={typing}
              className="flex-1 px-3 py-2 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors disabled:opacity-50"
            />
            <button
              type="button"
              onClick={send}
              disabled={!input.trim() || typing}
              className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800 text-white rounded-xl transition-colors shrink-0"
              aria-label="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Trigger button (rendered in header) ─────────────────────────────────────

interface ChatTriggerProps {
  onClick:       () => void;
  active:        boolean;
  pendingCount?: number;
  isProcessing?: boolean;
}

export function ChatTrigger({
  onClick,
  active,
  pendingCount  = 0,
  isProcessing  = false,
}: ChatTriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={[
        active ? "Close" : "Open",
        "IIMS Assistant",
        pendingCount > 0 ? `— ${pendingCount} pending action${pendingCount !== 1 ? "s" : ""}` : "",
      ].filter(Boolean).join(" ")}
      className={[
        "relative p-2 rounded-xl transition-all duration-200 ease-out",
        "hover:scale-110 active:scale-95 focus-visible:outline-none",
        active
          ? "text-white"
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800",
      ].join(" ")}
      style={
        active
          ? {
              background:  "hsl(var(--brand-600))",
              boxShadow:   "0 0 0 3px hsl(var(--brand-600) / 0.2), 0 4px 14px hsl(var(--brand-600) / 0.35)",
            }
          : undefined
      }
    >
      {/* ── Idle breathing glow ring — only when panel is closed ───────── */}
      {!active && (
        <span
          aria-hidden="true"
          className="chat-pulse-ring-el absolute inset-0 rounded-xl pointer-events-none"
          style={{ animation: "chat-pulse-ring 3.5s ease-in-out infinite" }}
        />
      )}

      {/* ── Processing arc spinner — thin rotating ring while bot types ── */}
      {isProcessing && (
        <span
          aria-hidden="true"
          className="absolute -inset-[3px] rounded-[15px] pointer-events-none"
          style={{
            border:           "2px solid transparent",
            borderTopColor:   "hsl(var(--brand-500))",
            borderRightColor: "hsl(var(--brand-300))",
            animation:        "chat-spin 1.2s linear infinite",
          }}
        />
      )}

      {/* ── Main icon ─────────────────────────────────────────────────── */}
      <Sparkles className="relative z-10 w-4 h-4" />

      {/* ── Pending action badge ──────────────────────────────────────── */}
      {pendingCount > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 z-20 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none select-none"
          style={{ animation: "chat-notif-pop 3s ease-in-out infinite" }}
        >
          {pendingCount > 9 ? "9+" : pendingCount}
        </span>
      )}

      {/* ── Online dot — only when idle (no pending, no badge, inactive) ─ */}
      {!active && pendingCount === 0 && (
        <span
          aria-hidden="true"
          className="absolute top-0.5 right-0.5 z-20 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-gray-900"
          style={{ animation: "chat-online-glow 2.5s ease-in-out infinite" }}
        />
      )}
    </button>
  );
}
