"use client";

import { useMemo } from "react";
import { store } from "@/store/iims.store";
import type { IProject } from "@/types/iims.types";

// ─── Result types ──────────────────────────────────────────────────────────────

export type ResultType = "project" | "document" | "tender" | "work_order" | "mb";

export interface SearchResult {
  id:           string;
  type:         ResultType;
  title:        string;
  subtitle:     string;
  meta:         string[];
  href:         string;
  projectId:    string;
  projectName:  string;
  matchedField: string;
  score:        number;
}

export interface SearchResults {
  all:        SearchResult[];
  project:    SearchResult[];
  document:   SearchResult[];
  tender:     SearchResult[];
  work_order: SearchResult[];
  mb:         SearchResult[];
  total:      number;
}

// ─── Tokenizer ─────────────────────────────────────────────────────────────────

function tokenize(q: string): string[] {
  return q.trim().toLowerCase().split(/\s+/).filter((t) => t.length > 0);
}

function matches(tokens: string[], ...fields: (string | undefined | null)[]): boolean {
  const haystack = fields.filter(Boolean).join(" ").toLowerCase();
  return tokens.every((t) => haystack.includes(t));
}

// Score: higher = more relevant. Title/ID exact prefix beats partial body match.
function score(tokens: string[], titleField: string, ...bodyFields: (string | undefined | null)[]): number {
  const title = titleField.toLowerCase();
  let s = 0;
  for (const t of tokens) {
    if (title.startsWith(t))        s += 10;
    else if (title.includes(t))     s += 6;
    else {
      const body = bodyFields.filter(Boolean).join(" ").toLowerCase();
      if (body.includes(t))         s += 2;
    }
  }
  return s;
}

// ─── Engine ────────────────────────────────────────────────────────────────────

function runSearch(query: string): SearchResult[] {
  if (!query.trim()) return [];
  const tokens  = tokenize(query);
  const projects = store.getAllProjects();
  const results: SearchResult[] = [];

  for (const p of projects) {
    const pid  = p.id;
    const pname = p.projectName;

    // ── Project ──────────────────────────────────────────────────────────────
    if (matches(tokens, pname, p.id, p.departmentName, p.division, p.taluka,
        p.gramPanchayat, p.workActivity, p.status, p.createdBy,
        p.majorHeadName, p.majorHeadCode, p.budgetDepartment, p.sanctionYear)) {

      const matchedField =
        matchField(tokens, [
          ["Project Name",   pname],
          ["Project ID",     p.id],
          ["Division",       p.division],
          ["Department",     p.departmentName],
          ["Status",         p.status],
          ["Work Activity",  p.workActivity],
          ["Taluka",         p.taluka],
          ["Budget Dept",    p.budgetDepartment],
        ]);

      results.push({
        id:           `proj-${pid}`,
        type:         "project",
        title:        pname,
        subtitle:     `${p.division} · ${p.taluka} · ${p.sanctionYear}`,
        meta:         [p.status, p.currentStage].filter(Boolean),
        href:         `/project/${pid}`,
        projectId:    pid,
        projectName:  pname,
        matchedField,
        score:        score(tokens, pname, p.id, p.division, p.status) + 4,
      });
    }

    // ── Documents ────────────────────────────────────────────────────────────
    const allDocs = [
      ...(p.documents ?? []),
      ...(p.dtpData?.documents ?? []),
    ];
    for (const doc of allDocs) {
      if (matches(tokens, doc.name, doc.type, doc.uploadedBy)) {
        results.push({
          id:           `doc-${pid}-${doc.id}`,
          type:         "document",
          title:        doc.name,
          subtitle:     `${doc.type} · Uploaded by ${doc.uploadedBy}`,
          meta:         [doc.type, p.status],
          href:         `/project/${pid}`,
          projectId:    pid,
          projectName:  pname,
          matchedField: matchField(tokens, [["Document Name", doc.name], ["Type", doc.type], ["Uploader", doc.uploadedBy]]),
          score:        score(tokens, doc.name, doc.type),
        });
      }
    }

    // ── Tender ───────────────────────────────────────────────────────────────
    const td = p.tenderData;
    if (td && matches(tokens, td.tenderId, td.mahaTenderReferenceId, td.status,
        td.classOfContractor, td.createdBy, pname)) {
      results.push({
        id:           `tender-${pid}`,
        type:         "tender",
        title:        td.tenderId,
        subtitle:     `${pname} · Published ${td.publishingDate ? new Date(td.publishingDate).toLocaleDateString("en-IN") : "—"} · Closes ${td.closingDate ? new Date(td.closingDate).toLocaleDateString("en-IN") : "—"}`,
        meta:         [td.status, td.classOfContractor].filter(Boolean),
        href:         `/tender-procedure/${pid}`,
        projectId:    pid,
        projectName:  pname,
        matchedField: matchField(tokens, [
          ["Tender ID",         td.tenderId],
          ["MahaTender Ref",    td.mahaTenderReferenceId ?? ""],
          ["Contractor Class",  td.classOfContractor],
          ["Status",            td.status],
        ]),
        score:        score(tokens, td.tenderId, td.mahaTenderReferenceId ?? "", td.status) + 2,
      });
    }

    // ── Work Order ───────────────────────────────────────────────────────────
    const wo = p.workOrderData;
    if (wo && matches(tokens,
        wo.workOrderNumber, wo.workOrderId, wo.l1Contractor,
        wo.contractorGST, wo.status, pname)) {
      const woNum = wo.workOrderNumber ?? wo.workOrderId ?? "—";
      results.push({
        id:           `wo-${pid}`,
        type:         "work_order",
        title:        woNum,
        subtitle:     `${pname} · ${wo.l1Contractor ?? "Contractor TBD"} · ₹${wo.contractAmount ? wo.contractAmount.toLocaleString("en-IN") : "—"}`,
        meta:         [wo.status, wo.l1Contractor ?? ""].filter(Boolean),
        href:         `/work-order/${pid}`,
        projectId:    pid,
        projectName:  pname,
        matchedField: matchField(tokens, [
          ["Work Order No", woNum],
          ["Contractor",    wo.l1Contractor ?? ""],
          ["GST",           wo.contractorGST ?? ""],
          ["Status",        wo.status],
        ]),
        score:        score(tokens, woNum, wo.l1Contractor ?? "", wo.status) + 3,
      });
    }

    // ── Measurement Books ────────────────────────────────────────────────────
    for (const mb of p.mbData ?? []) {
      if (matches(tokens, mb.mbNumber, mb.status, mb.createdBy, pname,
          mb.currentApprover)) {
        results.push({
          id:           `mb-${pid}-${mb.id}`,
          type:         "mb",
          title:        mb.mbNumber,
          subtitle:     `${pname} · ${mb.status}${mb.netPayable ? ` · Net ₹${mb.netPayable.toLocaleString("en-IN")}` : ""}`,
          meta:         [mb.status, mb.currentApprover ?? ""].filter(Boolean),
          href:         `/mb-billing/${pid}`,
          projectId:    pid,
          projectName:  pname,
          matchedField: matchField(tokens, [
            ["MB Number",   mb.mbNumber],
            ["Status",      mb.status],
            ["Approver",    mb.currentApprover ?? ""],
          ]),
          score:        score(tokens, mb.mbNumber, mb.status) + 3,
        });
      }
    }
  }

  // Deduplicate (same id shouldn't appear twice), sort by score desc
  const seen = new Set<string>();
  return results
    .filter((r) => { if (seen.has(r.id)) return false; seen.add(r.id); return true; })
    .sort((a, b) => b.score - a.score);
}

/** Pick the first field that contains at least one token */
function matchField(tokens: string[], candidates: [string, string][]): string {
  for (const [label, value] of candidates) {
    if (value && tokens.some((t) => value.toLowerCase().includes(t))) return label;
  }
  return "Content";
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useGlobalSearch(query: string): SearchResults {
  return useMemo(() => {
    const all        = runSearch(query);
    const project    = all.filter((r) => r.type === "project");
    const document   = all.filter((r) => r.type === "document");
    const tender     = all.filter((r) => r.type === "tender");
    const work_order = all.filter((r) => r.type === "work_order");
    const mb         = all.filter((r) => r.type === "mb");
    return { all, project, document, tender, work_order, mb, total: all.length };
  }, [query]);
}

// ─── Recent searches (localStorage) ───────────────────────────────────────────

const RECENT_KEY = "iims-search-recent";
const MAX_RECENT = 8;

export function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[];
  } catch { return []; }
}

export function addRecentSearch(q: string) {
  if (!q.trim()) return;
  const prev = getRecentSearches().filter((s) => s !== q);
  const next = [q, ...prev].slice(0, MAX_RECENT);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
}

export function clearRecentSearches() {
  try { localStorage.removeItem(RECENT_KEY); } catch { /* ignore */ }
}
