"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { store } from "@/store/iims.store";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface INotification {
  id:           string;
  type:         "urgent" | "pending" | "approved" | "returned" | "info";
  category:     "action" | "update" | "system";
  title:        string;
  message:      string;
  time:         string;
  projectId?:   string;
  actionLabel?: string;
  actionHref?:  string;
}

// ─── Notification generators per role ──────────────────────────────────────────

function generateNotifications(role: string): INotification[] {
  const projects = store.getAllProjects();
  const notes: INotification[] = [];

  // ── Sectional Engineer / Junior Engineer ───────────────────────────────────
  if (role === "Sectional Engineer" || role === "Junior Engineer") {
    projects
      .filter((p) => p.status?.toLowerCase().includes("return") || p.currentStage === "Sectional Engineer")
      .slice(0, 4)
      .forEach((p) =>
        notes.push({
          id:          `se-ret-${p.id}`,
          type:        "returned",
          category:    "action",
          title:       "Project Returned for Correction",
          message:     `${p.projectName} has been returned. Review remarks and resubmit.`,
          time:        p.history?.at(-1)?.performedAt ?? p.createdAt,
          projectId:   p.id,
          actionLabel: "Review Project",
          actionHref:  `/project/${p.id}`,
        })
      );

    projects
      .filter((p) => p.currentStage === "DTP" && !p.dtpData)
      .slice(0, 3)
      .forEach((p) =>
        notes.push({
          id:          `se-dtp-${p.id}`,
          type:        "pending",
          category:    "action",
          title:       "DTP Preparation Required",
          message:     `${p.projectName} — Prepare the Detailed Technical Proposal.`,
          time:        p.createdAt,
          projectId:   p.id,
          actionLabel: "Prepare DTP",
          actionHref:  `/draft-tender-paper/${p.id}`,
        })
      );

    projects
      .filter((p) => p.mbData?.some((mb) => mb.status === "Pending Measurement Verification"))
      .slice(0, 2)
      .forEach((p) =>
        notes.push({
          id:          `se-mb-${p.id}`,
          type:        "approved",
          category:    "update",
          title:       "MB Submitted for Verification",
          message:     `${p.projectName} — Measurement Book sent to Deputy Engineer.`,
          time:        p.mbData?.find((mb) => mb.status === "Pending Measurement Verification")?.createdAt ?? p.createdAt,
          projectId:   p.id,
          actionLabel: "View MB",
          actionHref:  `/mb-billing/${p.id}`,
        })
      );
  }

  // ── Deputy Engineer ────────────────────────────────────────────────────────
  if (role === "Deputy Engineer") {
    projects
      .filter((p) => p.status?.includes("Deputy Engineer") || p.status === "Pending Measurement Verification")
      .slice(0, 4)
      .forEach((p) =>
        notes.push({
          id:          `de-verify-${p.id}`,
          type:        "urgent",
          category:    "action",
          title:       "Verification Required",
          message:     `${p.projectName} — Awaiting DE verification before proceeding.`,
          time:        p.history?.at(-1)?.performedAt ?? p.createdAt,
          projectId:   p.id,
          actionLabel: "Verify Now",
          actionHref:  `/project/${p.id}`,
        })
      );

    projects
      .filter((p) => p.mbData?.some((mb) => mb.status === "Pending Measurement Verification"))
      .slice(0, 3)
      .forEach((p) => {
        const mb = p.mbData!.find((m) => m.status === "Pending Measurement Verification")!;
        notes.push({
          id:          `de-mb-${p.id}-${mb.id}`,
          type:        "urgent",
          category:    "action",
          title:       "MB Pending DE Verification",
          message:     `${p.projectName} — ${mb.mbNumber} submitted by JE for verification.`,
          time:        mb.createdAt ?? new Date().toISOString(),
          projectId:   p.id,
          actionLabel: "Verify MB",
          actionHref:  `/mb-billing/${p.id}`,
        });
      });

    projects
      .filter((p) => p.status === "DTP Submitted")
      .slice(0, 2)
      .forEach((p) =>
        notes.push({
          id:          `de-dtp-${p.id}`,
          type:        "pending",
          category:    "action",
          title:       "DTP Pending Review",
          message:     `${p.projectName} — DTP submitted by SE, awaiting DE review.`,
          time:        p.dtpData?.createdAt ?? p.createdAt,
          projectId:   p.id,
          actionLabel: "Review DTP",
          actionHref:  `/draft-tender-paper/${p.id}`,
        })
      );
  }

  // ── Executive Engineer ──────────────────────────────────────────────────────
  if (role === "Executive Engineer") {
    projects
      .filter((p) =>
        p.status?.includes("Technical Sanction") ||
        p.status === "Submitted to EE" ||
        p.currentStage === "Technical Sanction"
      )
      .slice(0, 4)
      .forEach((p) =>
        notes.push({
          id:          `ee-ts-${p.id}`,
          type:        "urgent",
          category:    "action",
          title:       "Technical Sanction Pending",
          message:     `${p.projectName} — Awaiting EE technical sanction to proceed.`,
          time:        p.history?.at(-1)?.performedAt ?? p.createdAt,
          projectId:   p.id,
          actionLabel: "Review & Sanction",
          actionHref:  `/project/${p.id}`,
        })
      );

    projects
      .filter((p) =>
        p.status?.includes("Financial Bid Complete") ||
        p.status?.includes("LOI") ||
        p.status?.includes("LOA") ||
        p.currentStage === "LOI Pending" ||
        p.currentStage === "LOA Pending"
      )
      .slice(0, 3)
      .forEach((p) =>
        notes.push({
          id:          `ee-loa-${p.id}`,
          type:        "urgent",
          category:    "action",
          title:       "Letter of Intent Ready",
          message:     `${p.projectName} — L1 bid accepted. Issue LOI to proceed.`,
          time:        p.history?.at(-1)?.performedAt ?? p.createdAt,
          projectId:   p.id,
          actionLabel: "Issue LOI",
          actionHref:  `/letter-of-award/${p.id}`,
        })
      );

    projects
      .filter((p) => p.status === "LOI Issued" || p.status === "LOA Issued" || p.currentStage === "Work Order Pending")
      .slice(0, 2)
      .forEach((p) =>
        notes.push({
          id:          `ee-wo-${p.id}`,
          type:        "pending",
          category:    "action",
          title:       "Work Order Pending Issuance",
          message:     `${p.projectName} — LOI issued. Draft and issue Work Order.`,
          time:        p.history?.at(-1)?.performedAt ?? p.createdAt,
          projectId:   p.id,
          actionLabel: "Issue Work Order",
          actionHref:  `/work-order/${p.id}`,
        })
      );

    projects
      .filter((p) => p.mbData?.some((mb) => mb.status === "Pending Measurement Approval"))
      .slice(0, 3)
      .forEach((p) => {
        const mb = p.mbData!.find((m) => m.status === "Pending Measurement Approval")!;
        notes.push({
          id:          `ee-mb-${p.id}-${mb.id}`,
          type:        "urgent",
          category:    "action",
          title:       "MB Ready for EE Approval",
          message:     `${p.projectName} — ${mb.mbNumber} verified by DE. Approve to release payment.`,
          time:        mb.createdAt ?? new Date().toISOString(),
          projectId:   p.id,
          actionLabel: "Approve MB",
          actionHref:  `/mb-billing/${p.id}`,
        });
      });

    projects
      .filter((p) => p.mbData?.some((mb) => mb.status === "Approved by EE"))
      .slice(0, 2)
      .forEach((p) =>
        notes.push({
          id:          `ee-mb-done-${p.id}`,
          type:        "approved",
          category:    "update",
          title:       "MB Approved",
          message:     `${p.projectName} — Measurement Book approved. Payment being processed.`,
          time:        p.history?.at(-1)?.performedAt ?? p.createdAt,
          projectId:   p.id,
          actionLabel: "View Project",
          actionHref:  `/project/${p.id}`,
        })
      );
  }

  // ── Tender Clerk ────────────────────────────────────────────────────────────
  if (role === "Tender Clerk") {
    projects
      .filter((p) => p.status === "DTP Sanctioned" && !p.tenderData)
      .slice(0, 3)
      .forEach((p) =>
        notes.push({
          id:          `tc-pub-${p.id}`,
          type:        "urgent",
          category:    "action",
          title:       "Tender Ready to Publish",
          message:     `${p.projectName} — DTP sanctioned. Publish tender on GeM/e-tender portal.`,
          time:        p.history?.at(-1)?.performedAt ?? p.createdAt,
          projectId:   p.id,
          actionLabel: "Publish Tender",
          actionHref:  `/tender-procedure/${p.id}`,
        })
      );

    projects
      .filter((p) => p.status === "Tender Published")
      .slice(0, 2)
      .forEach((p) =>
        notes.push({
          id:          `tc-prog-${p.id}`,
          type:        "pending",
          category:    "update",
          title:       "Tender Bid Period Active",
          message:     `${p.projectName} — Tender open. Monitor bid submissions.`,
          time:        p.tenderData?.publishingDate ?? p.createdAt,
          projectId:   p.id,
          actionLabel: "View Tender",
          actionHref:  `/tender-procedure/${p.id}`,
        })
      );

    projects
      .filter((p) => p.status === "Bids Received" || p.status === "Technical Bid Open")
      .slice(0, 2)
      .forEach((p) =>
        notes.push({
          id:          `tc-bid-${p.id}`,
          type:        "urgent",
          category:    "action",
          title:       "Bids Received — Action Required",
          message:     `${p.projectName} — Bids received. Proceed with technical bid opening.`,
          time:        p.history?.at(-1)?.performedAt ?? p.createdAt,
          projectId:   p.id,
          actionLabel: "Open Bids",
          actionHref:  `/tender-procedure/${p.id}`,
        })
      );
  }

  // ── Auditor ────────────────────────────────────────────────────────────────
  if (role === "Auditor") {
    const mbPending = projects.filter((p) =>
      p.mbData?.some((mb) => mb.status === "Approved by EE")
    );
    mbPending.slice(0, 5).forEach((p) => {
      const mb = p.mbData!.find((m) => m.status === "Approved by EE")!;
      notes.push({
        id:          `aud-${p.id}-${mb.id}`,
        type:        "urgent",
        category:    "action",
        title:       "MB Audit Required",
        message:     `${p.projectName} — ${mb.mbNumber} pending your audit sign-off.`,
        time:        mb.createdAt ?? new Date().toISOString(),
        projectId:   p.id,
        actionLabel: "Audit MB",
        actionHref:  `/mb-billing/${p.id}`,
      });
    });
    if (mbPending.length === 0) {
      notes.push({
        id:       "aud-clear",
        type:     "approved",
        category: "update",
        title:    "Audit Queue Clear",
        message:  "No MBs pending audit at this time.",
        time:     new Date().toISOString(),
      });
    }
  }

  // ── Chief Accounts and Finance Officer — tender approval ──────────────────
  if (role === "Chief Accounts and Finance Officer") {
    projects
      .filter((p) => p.status?.includes("Pending at Chief Accounts and Finance Officer"))
      .slice(0, 4)
      .forEach((p) =>
        notes.push({
          id:          `cafo-tender-${p.id}`,
          type:        "urgent",
          category:    "action",
          title:       "Tender Approval Required",
          message:     `${p.projectName} — Tender notice pending your review before forwarding to Additional Chief Executive Officer.`,
          time:        p.history?.at(-1)?.performedAt ?? p.createdAt,
          projectId:   p.id,
          actionLabel: "Review Tender",
          actionHref:  `/create-tender/${p.id}`,
        })
      );
  }

  // ── Additional Chief Executive Officer — tender approval ──────────────────
  if (role === "Additional Chief Executive Officer") {
    projects
      .filter((p) => p.status?.includes("Pending at Additional Chief Executive Officer"))
      .slice(0, 4)
      .forEach((p) =>
        notes.push({
          id:          `aceo-tender-${p.id}`,
          type:        "urgent",
          category:    "action",
          title:       "Tender Publication Approval Required",
          message:     `${p.projectName} — Tender approved by CAFO. Approve and publish on MahaTender portal.`,
          time:        p.history?.at(-1)?.performedAt ?? p.createdAt,
          projectId:   p.id,
          actionLabel: "Approve & Publish",
          actionHref:  `/create-tender/${p.id}`,
        })
      );
  }

  // ── Accountant / AAO / CAFO ────────────────────────────────────────────────
  if (["Accountant", "Assistant Accounts Officer", "Chief Accounts and Finance Officer"].includes(role)) {
    projects
      .filter((p) => p.mbData?.some((mb) => mb.status?.includes("Accountant") || mb.status === "Approved by EE"))
      .slice(0, 4)
      .forEach((p) => {
        const mb = p.mbData!.find((m) => m.status?.includes("Accountant") || m.status === "Approved by EE")!;
        notes.push({
          id:          `acc-${p.id}-${mb.id}`,
          type:        "urgent",
          category:    "action",
          title:       "Payment Processing Required",
          message:     `${p.projectName} — ${mb.mbNumber} approved. Process payment of ${mb.netPayable ? `₹${mb.netPayable.toLocaleString("en-IN")}` : "pending amount"}.`,
          time:        mb.createdAt ?? new Date().toISOString(),
          projectId:   p.id,
          actionLabel: "Process Payment",
          actionHref:  `/mb-billing/${p.id}`,
        });
      });

    projects
      .filter((p) => p.mbData?.some((mb) => mb.status === "Payment Processed"))
      .slice(0, 2)
      .forEach((p) =>
        notes.push({
          id:          `acc-done-${p.id}`,
          type:        "approved",
          category:    "update",
          title:       "Payment Processed",
          message:     `${p.projectName} — Payment disbursed to contractor.`,
          time:        p.history?.at(-1)?.performedAt ?? p.createdAt,
          projectId:   p.id,
          actionLabel: "View Details",
          actionHref:  `/mb-billing/${p.id}`,
        })
      );
  }

  // ── CEO / Additional CEO / Superintendent Engineer ──────────────────────────
  if (["Chief Executive Officer", "Additional Chief Executive Officer", "Superintendent Engineer"].includes(role)) {
    projects
      .filter((p) => p.status?.includes("CEO") || p.status?.includes("Superintendent"))
      .slice(0, 3)
      .forEach((p) =>
        notes.push({
          id:          `ceo-esc-${p.id}`,
          type:        "urgent",
          category:    "action",
          title:       "Escalated for High-level Sanction",
          message:     `${p.projectName} — Escalated. Your approval is required to proceed.`,
          time:        p.history?.at(-1)?.performedAt ?? p.createdAt,
          projectId:   p.id,
          actionLabel: "Review",
          actionHref:  `/project/${p.id}`,
        })
      );

    const highValue = projects
      .filter((p) => (p.estimatedAmount ?? 0) > 5000000)
      .slice(0, 2);
    highValue.forEach((p) =>
      notes.push({
        id:          `ceo-hv-${p.id}`,
        type:        "info",
        category:    "update",
        title:       "High-Value Project Update",
        message:     `${p.projectName} — ₹${((p.estimatedAmount ?? 0) / 100000).toFixed(1)}L project: ${p.status}.`,
        time:        p.history?.at(-1)?.performedAt ?? p.createdAt,
        projectId:   p.id,
        actionLabel: "View Project",
        actionHref:  `/project/${p.id}`,
      })
    );
  }

  // ── Contractor ──────────────────────────────────────────────────────────────
  if (role === "Contractor") {
    projects
      .filter((p) => p.mbData?.some((mb) => mb.status === "Approved by EE" && !mb.acceptedByContractor))
      .slice(0, 4)
      .forEach((p) => {
        const mb = p.mbData!.find((m) => m.status === "Approved by EE" && !m.acceptedByContractor)!;
        notes.push({
          id:          `con-mb-${p.id}-${mb.id}`,
          type:        "urgent",
          category:    "action",
          title:       "MB Pending Your Acceptance",
          message:     `${p.projectName} — ${mb.mbNumber} approved. Accept to trigger payment.`,
          time:        mb.createdAt ?? new Date().toISOString(),
          projectId:   p.id,
          actionLabel: "Accept MB",
          actionHref:  `/contractor/mb-verification`,
        });
      });

    projects
      .filter((p) => p.mbData?.some((mb) => mb.status === "Contractor Rejected"))
      .slice(0, 2)
      .forEach((p) =>
        notes.push({
          id:          `con-rej-${p.id}`,
          type:        "returned",
          category:    "action",
          title:       "MB Returned by You",
          message:     `${p.projectName} — MB rejected. Awaiting ZP response.`,
          time:        p.history?.at(-1)?.performedAt ?? p.createdAt,
          projectId:   p.id,
          actionLabel: "View MB",
          actionHref:  `/contractor/mb-verification`,
        })
      );

    projects
      .filter((p) => p.mbData?.some((mb) => mb.status === "Payment Processed"))
      .slice(0, 2)
      .forEach((p) =>
        notes.push({
          id:          `con-pay-${p.id}`,
          type:        "approved",
          category:    "update",
          title:       "Payment Processed",
          message:     `${p.projectName} — Payment disbursed to your account.`,
          time:        p.history?.at(-1)?.performedAt ?? p.createdAt,
          projectId:   p.id,
          actionLabel: "View Payments",
          actionHref:  `/contractor/bills-payments`,
        })
      );

    projects
      .filter((p) => (p.status === "LOI Issued" || p.status === "LOA Issued") && !p.workOrderData)
      .slice(0, 2)
      .forEach((p) =>
        notes.push({
          id:          `con-loa-${p.id}`,
          type:        "info",
          category:    "update",
          title:       "Letter of Intent Issued",
          message:     `${p.projectName} — LOI issued. Await Work Order before commencing work.`,
          time:        p.history?.at(-1)?.performedAt ?? p.createdAt,
          projectId:   p.id,
          actionLabel: "View Project",
          actionHref:  `/contractor/my-projects`,
        })
      );
  }

  // ── System Administrator ────────────────────────────────────────────────────
  if (role === "System Administrator") {
    const allUsers = store.getAllUsers();
    const inactive = allUsers.filter((u) => u.status === "Inactive");
    if (inactive.length)
      notes.push({
        id:          "admin-inactive-users",
        type:        "info",
        category:    "action",
        title:       `${inactive.length} Inactive User Account${inactive.length !== 1 ? "s" : ""}`,
        message:     `${inactive.length} user account${inactive.length !== 1 ? "s" : ""} currently inactive. Review in Admin Management.`,
        time:        new Date().toISOString(),
        actionLabel: "Manage Users",
        actionHref:  `/admin-management`,
      });

    notes.push({
      id:          "admin-rates-notice",
      type:        "info",
      category:    "action",
      title:       "Schedule Year Review Due",
      message:     "New financial year approaching. Verify SSR/DSR rate items for 2025-2026 schedule.",
      time:        new Date().toISOString(),
      actionLabel: "Open Rate Editor",
      actionHref:  `/rate-item-editor`,
    });
  }

  // ── Universal system notice (all roles) ────────────────────────────────────
  notes.push({
    id:       "sys-v2-notice",
    type:     "info",
    category: "system",
    title:    "IIMS v2.1 — New Features Available",
    message:  "Template Editor, Rate Item Editor, and enhanced MB workflow are now live.",
    time:     "2026-06-10T09:00:00",
  });

  notes.push({
    id:       "sys-maintenance",
    type:     "info",
    category: "system",
    title:    "Scheduled Maintenance",
    message:  "System maintenance window: Sunday 02:00–04:00 IST. Save all work before this window.",
    time:     "2026-06-08T09:00:00",
  });

  // De-duplicate by id and cap total
  const seen = new Set<string>();
  return notes.filter((n) => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return true;
  }).slice(0, 20);
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "iims-notif-read-ids";

function loadReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch { /* ignore */ }
}

export function useNotifications(role: string) {
  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadIds());

  // Sync readIds to localStorage
  useEffect(() => { saveReadIds(readIds); }, [readIds]);

  const notifications = useMemo(() => generateNotifications(role), [role]);

  const markRead = useCallback((id: string) => {
    setReadIds((s) => { const n = new Set(s); n.add(id); return n; });
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds(new Set(notifications.map((n) => n.id)));
  }, [notifications]);

  const markUnread = useCallback((id: string) => {
    setReadIds((s) => { const n = new Set(s); n.delete(id); return n; });
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !readIds.has(n.id)).length,
    [notifications, readIds]
  );

  return { notifications, unreadCount, readIds, markRead, markAllRead, markUnread };
}
