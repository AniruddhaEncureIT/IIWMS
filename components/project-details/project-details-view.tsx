"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Send,
  FileText,
  Gavel,
  Package,
  ClipboardList,
  DollarSign,
  Eye,
  Download,
  Calendar,
  User,
  Users,
  BarChart3,
  MapPin,
  Building2,
  AlertCircle,
  TrendingUp,
  Layers,
  Ruler,
  ListChecks,
  ReceiptText,
  Truck,
  BookOpen,
  Info,
} from "lucide-react";
import { store } from "@/store/iims.store";
import { getStageByStatus, getStageById } from "@/constants/workflow-transitions";
import type {
  IProject,
  IProjectHistory,
  IDTPData,
  ITenderData,
  IWorkOrderData,
  IMBData,
} from "@/types/iims.types";
import type { UserRole } from "@/types/auth.types";
import { formatINR, formatCr, statusVariant, StatusBadge } from "@/components/dashboard/dash-shared";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(s?: string) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return s;
  }
}

function infoRow(label: string, value?: string | number | null) {
  if (value == null || value === "") return null;
  return (
    <div key={label}>
      <dt className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-0.5">{String(value)}</dd>
    </div>
  );
}

// ─── Accordion ────────────────────────────────────────────────────────────────

interface AccordionProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Accordion({ id, title, icon, badge, defaultOpen = false, children }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
      >
        <span className="text-gray-500 dark:text-gray-400 flex-shrink-0" aria-hidden="true">{icon}</span>
        <span className="flex-1 font-semibold text-gray-800 dark:text-gray-100 text-sm">{title}</span>
        {badge && <span className="mr-2">{badge}</span>}
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
        )}
      </button>
      {open && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-5">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Action Dialog ────────────────────────────────────────────────────────────

interface ActionDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  confirmColor: "green" | "red" | "blue";
  requireRemarks?: boolean;
  onConfirm: (remarks: string) => void;
  onCancel: () => void;
}

function ActionDialog({
  title,
  description,
  confirmLabel,
  confirmColor,
  requireRemarks = false,
  onConfirm,
  onCancel,
}: ActionDialogProps) {
  const [remarks,    setRemarks]    = useState("");
  const [confirming, setConfirming] = useState(false);

  const colorCls =
    confirmColor === "green"
      ? "bg-green-600 hover:bg-green-700"
      : confirmColor === "red"
      ? "bg-red-600 hover:bg-red-700"
      : "bg-blue-600 hover:bg-blue-700";

  function submit() {
    if (requireRemarks && !remarks.trim()) {
      toast.error("Remarks are required to return a project.");
      return;
    }
    if (confirming) return;
    setConfirming(true);
    try { onConfirm(remarks.trim()); } finally { setConfirming(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${confirmColor === "red" ? "bg-red-100 dark:bg-red-900/30" : "bg-blue-100 dark:bg-blue-900/30"}`}>
            {confirmColor === "red" ? (
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            ) : (
              <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Remarks {requireRemarks && <span className="text-red-500">*</span>}
          </label>
          <textarea
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
            placeholder={requireRemarks ? "Remarks are required…" : "Optional remarks…"}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={confirming}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={confirming}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 disabled:opacity-60 ${colorCls}`}
          >
            {confirming
              ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Section primitives ───────────────────────────────────────────────────────

function InfoGrid({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-2 gap-x-6 gap-y-4">{children}</dl>;
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="h-px flex-1 bg-gray-100 dark:bg-gray-700" />
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
      <div className="h-px flex-1 bg-gray-100 dark:bg-gray-700" />
    </div>
  );
}

// ─── Audit trail dot ─────────────────────────────────────────────────────────

function historyDot(action: string) {
  const low = action.toLowerCase();
  if (low.includes("forward") || low.includes("approved") || low.includes("sanction")) return "bg-green-500";
  if (low.includes("return") || low.includes("reject") || low.includes("returned")) return "bg-red-500";
  if (low.includes("submit") || low.includes("created") || low.includes("draft")) return "bg-blue-500";
  return "bg-gray-400";
}

// ─── Stage actions ────────────────────────────────────────────────────────────

type DialogConfig = {
  title: string;
  description: string;
  confirmLabel: string;
  confirmColor: "green" | "red" | "blue";
  requireRemarks?: boolean;
  onConfirm: (remarks: string) => void;
} | null;

interface StageActionsProps {
  project: IProject;
  role: string;
  onAction: () => void;
}

function StageActionsCard({ project, role, onAction }: StageActionsProps) {
  const [dialog, setDialog] = useState<DialogConfig>(null);

  const status = project.status ?? "";
  const id = project.id;
  const currentStage = getStageByStatus(status);

  // ── Check if user is the stage owner ───────────────────────────────────────

  const userRole = role as UserRole;
  const isStageOwner = currentStage && currentStage.ownerRole === userRole;

  if (!currentStage) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
          <ListChecks className="w-4 h-4 text-blue-500" />
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Available Actions</h3>
        </div>
        <div className="p-4">
          <div className="flex flex-col items-center justify-center py-5 text-center">
            <AlertCircle className="w-7 h-7 text-yellow-500 mb-2" />
            <p className="text-xs text-gray-400 dark:text-gray-500">Unknown project status.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Store action handlers ──────────────────────────────────────────────────

  function handleAction(actionId: string, nextStageId: string): (remarks: string) => void {
    const nextStage = getStageById(nextStageId);

    return (remarks: string) => {
      if (!nextStage) {
        toast.error("Invalid next stage configuration");
        return;
      }

      if (!remarks.trim()) {
        toast.error("Remarks are required.");
        return;
      }

      // Determine the action type and call appropriate store method
      const action = currentStage?.possibleActions.find((a) => a.id === actionId);
      if (!action) {
        toast.error("Action not found");
        return;
      }

      let result;
      switch (action.actionType) {
        case "forward":
        case "submit":
        case "create":
          result = store.forwardProject(id, action.nextOwnerRole, remarks, nextStage.status);
          break;
        case "reject":
          result = store.rejectProject(id, action.nextOwnerRole, remarks, nextStage.status);
          break;
        case "approve":
        case "process":
          result = store.approveProject(id, nextStage.status, remarks);
          break;
        case "accept":
          result = store.forwardProject(id, action.nextOwnerRole, remarks, nextStage.status);
          break;
        default:
          toast.error(`Unknown action type: ${action.actionType}`);
          return;
      }

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(`${action.label} completed`);
      setDialog(null);
      onAction();
    };
  }

  // ── Build action buttons ───────────────────────────────────────────────────

  const actions: React.ReactNode[] = [];

  const DTP_STAGE_IDS = ["stage-4", "stage-5", "stage-6"];
  const TENDER_STAGE_IDS = ["stage-7", "stage-7b", "stage-7c", "stage-7d"];
  // Form-based stages: stage-id → route path
  const FORM_STAGE_MAP: Record<string, string> = {
    "stage-8":  `/technical-bid/${id}`,   // TC records technical bids
    "stage-12": `/financial-bid/${id}`,   // TC records financial bids
    "stage-16": `/letter-of-award/${id}`, // TC issues LOI
    "stage-20": `/work-order/${id}`,      // EE creates work order
    "stage-23": `/mb-billing/${id}`,      // SE creates measurement book
    "stage-24": `/mb-billing/${id}`,      // DE verifies measurement book
    "stage-26": `/mb-billing/${id}`,      // EE approves measurement book
  };
  const isDTPStage = DTP_STAGE_IDS.includes(currentStage.id);
  const isTenderStage = TENDER_STAGE_IDS.includes(currentStage.id);
  const formRoute = FORM_STAGE_MAP[currentStage.id];

  if (isStageOwner) {
    if (isDTPStage) {
      // DTP stages are handled in the DTP form — navigate there instead of direct action
      actions.push(
        <Link
          key="dtp-nav"
          href={`/create-dtp/${id}`}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          <FileText className="w-4 h-4" />
          {currentStage.ownerRole === "Sectional Engineer" ? "Open DTP Form" : "Review DTP"}
        </Link>
      );
    } else if (isTenderStage) {
      // Tender stages are handled in the Tender form — navigate there instead of direct action
      actions.push(
        <Link
          key="tender-nav"
          href={`/create-tender/${id}`}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          <FileText className="w-4 h-4" />
          {currentStage.ownerRole === "Tender Clerk" ? "Open Tender Form" : "Review Tender"}
        </Link>
      );
    } else if (formRoute) {
      // Other form-based stages — navigate to dedicated page
      const formLabel =
        currentStage.id === "stage-8"  ? "Open Technical Bid" :
        currentStage.id === "stage-12" ? "Open Financial Bid" :
        currentStage.id === "stage-16" ? "Issue Letter of Intent" :
        currentStage.id === "stage-20" ? "Open Work Order Form" :
        currentStage.id === "stage-23" ? "Create Measurement Book" :
        currentStage.id === "stage-24" ? "Review Measurement Book" :
        currentStage.id === "stage-26" ? "Approve Measurement Book" :
        "Open Form";
      actions.push(
        <Link
          key="form-nav"
          href={formRoute}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          <FileText className="w-4 h-4" />
          {formLabel}
        </Link>
      );
    } else {
      currentStage.possibleActions.forEach((action, idx) => {
        const actionHandler = handleAction(action.id, action.nextStageId);
        const requiresRemarks = action.requiresRemarks ?? true;

        const baseColor =
          action.actionType === "reject" ? "bg-red-600 hover:bg-red-700" :
          action.actionType === "approve" || action.actionType === "process" ? "bg-green-600 hover:bg-green-700" :
          action.actionType === "forward" || action.actionType === "submit" ? "bg-green-600 hover:bg-green-700" :
          "bg-blue-600 hover:bg-blue-700";

        const icon =
          action.actionType === "reject" ? <XCircle className="w-4 h-4" /> :
          action.actionType === "approve" || action.actionType === "process" ? <CheckCircle className="w-4 h-4" /> :
          <Send className="w-4 h-4" />;

        const nextStage = getStageById(action.nextStageId);
        const description = `${action.label} → ${nextStage?.name || "next stage"}`;

        actions.push(
          <button
            key={action.id}
            type="button"
            onClick={() =>
              setDialog({
                title: action.label,
                description,
                confirmLabel: action.label,
                confirmColor: action.actionType === "reject" ? "red" : "green",
                requireRemarks: requiresRemarks,
                onConfirm: actionHandler,
              })
            }
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition-colors ${baseColor}`}
          >
            {icon} {action.label}
          </button>
        );
      });
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
          <ListChecks className="w-4 h-4 text-blue-500" aria-hidden="true" />
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Available Actions</h3>
          {actions.length > 0 && (
            <span className="ml-auto inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold">
              {actions.length}
            </span>
          )}
        </div>
        <div className="p-4">
          {!isStageOwner ? (
            <div className="flex flex-col items-center justify-center py-5 text-center">
              <Info className="w-7 h-7 text-gray-300 dark:text-gray-600 mb-2" aria-hidden="true" />
              <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                This project is currently owned by <span className="font-medium">{currentStage.ownerRole}</span>.
              </p>
            </div>
          ) : actions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-5 text-center">
              <Info className="w-7 h-7 text-gray-300 dark:text-gray-600 mb-2" aria-hidden="true" />
              <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                No actions are currently available for this project.
              </p>
            </div>
          ) : (
            <div className="space-y-2">{actions}</div>
          )}
        </div>
      </div>

      {dialog && (
        <ActionDialog
          title={dialog.title}
          description={dialog.description}
          confirmLabel={dialog.confirmLabel}
          confirmColor={dialog.confirmColor}
          requireRemarks={dialog.requireRemarks}
          onConfirm={dialog.onConfirm}
          onCancel={() => setDialog(null)}
        />
      )}
    </>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

interface Props {
  projectId: string;
}

export function ProjectDetailsView({ projectId }: Props) {
  const router = useRouter();
  const [project, setProject] = useState<IProject | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [showMore, setShowMore] = useState(false);

  const loadProject = useCallback(() => {
    const p = store.getProjectById(projectId);
    setProject(p);
    const u = store.getCurrentUser();
    setUserRole(u?.role ?? "");
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-gray-300 dark:text-gray-600" />
        <p className="text-gray-500 dark:text-gray-400">Project not found.</p>
        <Link href="/all-projects" className="text-blue-600 hover:underline text-sm">← Back to All Projects</Link>
      </div>
    );
  }

  const {
    subWorks = [],
    leadStatements = [],
    rateAnalysis = [],
    measurements = [],
    documents = [],
    history = [],
    dtpData,
    tenderData,
    workOrderData,
    mbData = [],
    documentSets,
  } = project;

  const AUTO_DOCS = [
    { id: "abstract-sheet",        name: "Abstract Sheet"             },
    { id: "quality-control-sheet", name: "Quality Control Sheet"      },
    { id: "royalty-sheet",         name: "Royalty Sheet"              },
    { id: "material-consumption",  name: "Material Consumption Sheet" },
  ] as const;

  const hasUploadedDocs = documentSets && (
    (documentSets.drawings?.length ?? 0) +
    (documentSets.sitePhotos?.length ?? 0) +
    (documentSets.surveyReports?.length ?? 0)
  ) > 0;

  const generalDesc = project.draftData?.generalDescription;
  const measureTotal = measurements.reduce((s, m) => s + (m.amount ?? 0), 0);

  const currentStageForBanner = getStageByStatus(project.status);
  const isStageOwnerForBanner = currentStageForBanner?.ownerRole === userRole;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Page header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/all-projects"
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Project Details</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{project.id}</p>
        </div>
      </div>

      {/* Role-aware action banner */}
      {isStageOwnerForBanner && currentStageForBanner && (
        <div className="flex items-center gap-3 px-4 py-3 mb-6 bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800 rounded-xl">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Action required</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 truncate">
              This project is at <span className="font-medium">{currentStageForBanner.name}</span> — awaiting your action.
            </p>
          </div>
          <a
            href="#stage-actions"
            className="shrink-0 px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
          >
            View Actions
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── MAIN CONTENT ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Project Info Card */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="flex items-start justify-between gap-4 px-6 py-4 bg-gray-50/60 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                {project.projectName}
              </h2>
              <StatusBadge status={project.status} />
            </div>

            <div className="p-6">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-4">
              {infoRow("Department", project.departmentName)}
              {infoRow("Work Activity", project.workActivity)}
              {infoRow("Sanction Year", project.sanctionYear)}
              {infoRow("Division", project.division)}
              <div>
                <dt className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Estimated Amount</dt>
                <dd className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                  {formatCr(project.estimatedAmount ?? measureTotal)}
                </dd>
              </div>
              {infoRow("Current Stage", project.currentStage)}
            </div>

            {/* View More toggle */}
            <button
              type="button"
              onClick={() => setShowMore((s) => !s)}
              className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium transition-colors"
            >
              {showMore ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showMore ? "Hide Details" : "View Complete Details"}
            </button>

            {showMore && (
              <div className="mt-5 space-y-6 border-t border-gray-100 dark:border-gray-700 pt-5">
                <SectionDivider label="Additional Information" />
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                  {infoRow("DSR Type", project.dsrType)}
                  {infoRow("Department Name", project.departmentName)}
                  {infoRow("SSR Type", project.ssrType)}
                  {infoRow("SSR Year", project.ssrYear)}
                  {infoRow("Major Head", project.majorHeadName)}
                  {infoRow("Major Head Code", project.majorHeadCode)}
                  {infoRow("Sub-Division", project.subDivision)}
                  {infoRow("Taluka", project.taluka)}
                  {infoRow("Gram Panchayat", project.gramPanchayat)}
                  {infoRow("Work Demand By", project.workDemandBy)}
                  {infoRow("Budget Department", project.budgetDepartment)}
                  <div>
                    <dt className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Technical Sanction Amount</dt>
                    <dd className="text-xl font-bold text-green-600 dark:text-green-400 mt-0.5">
                      {formatCr(project.technicalSanctionAmount)}
                    </dd>
                  </div>
                </dl>

                {/* Demand Info */}
                {(project.workDemandBy || project.workDemandByDocument) && (
                  <>
                    <SectionDivider label="Demand Info" />
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 mb-6">
                      {infoRow("Work Demanded By", project.workDemandBy)}
                    </dl>
                    {project.workDemandByDocument && (
                      <div>
                        <dt className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Work Demand Document</dt>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                          <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{project.workDemandByDocument.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Uploaded on {new Date(project.workDemandByDocument.uploadedAt).toLocaleDateString()}</p>
                          </div>
                          <button
                            type="button"
                            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg text-blue-600 dark:text-blue-400 transition-colors"
                            aria-label="Download document"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Sub-works */}
                {subWorks.length > 0 && (
                  <>
                    <SectionDivider label="Sub-Works" />
                    <ol className="space-y-1.5 list-decimal list-inside">
                      {subWorks.map((sw, i) => (
                        <li key={sw.id ?? i} className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="font-medium">{sw.name}</span>
                          {sw.category && <span className="text-gray-500"> · {sw.category}</span>}
                          {sw.description && <p className="text-xs text-gray-400 mt-0.5 ml-5">{sw.description}</p>}
                        </li>
                      ))}
                    </ol>
                  </>
                )}

                {/* Lead Statements */}
                {leadStatements.length > 0 && (
                  <>
                    <SectionDivider label="Lead Statements" />
                    <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                          <tr>
                            {["Material", "Source of Supply", "Km", "Calculation (₹)"].map((h) => (
                              <th key={h} className="px-3 py-2 text-left text-gray-500 font-semibold uppercase">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {leadStatements.map((ls, i) => (
                            <tr key={ls.id ?? i} className="bg-white dark:bg-gray-800">
                              <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{ls.materialName}</td>
                              <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{ls.sourceOfSupply}</td>
                              <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{ls.kilometer}</td>
                              <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">
                                {formatINR(ls.calculation)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* Rate Analysis */}
                {rateAnalysis.length > 0 && (
                  <>
                    <SectionDivider label="Rate Analysis" />
                    <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                          <tr>
                            {["Item #", "Description", "Material ₹", "Labour ₹", "Machinery ₹", "Total Rate ₹"].map((h) => (
                              <th key={h} className="px-3 py-2 text-left text-gray-500 font-semibold uppercase whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {rateAnalysis.map((ra, i) => (
                            <React.Fragment key={ra.id ?? i}>
                              <tr className="bg-white dark:bg-gray-800">
                                <td className="px-3 py-2 font-mono text-blue-600 dark:text-blue-400">{ra.itemNumber}</td>
                                <td className="px-3 py-2 text-gray-700 dark:text-gray-300 max-w-[180px]">{ra.itemDescription ?? ra.itemName}</td>
                                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{formatINR(ra.materialComponents)}</td>
                                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{formatINR(ra.laborComponents)}</td>
                                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{formatINR(ra.machineryComponents)}</td>
                                <td className="px-3 py-2 font-semibold text-gray-800 dark:text-gray-200">{formatINR(ra.totalRate)}</td>
                              </tr>
                              {ra.remarks && (
                                <tr className="bg-amber-50/50 dark:bg-amber-900/10">
                                  <td colSpan={6} className="px-3 py-1.5 border-l-2 border-amber-400 text-xs text-amber-700 dark:text-amber-400">
                                    {ra.remarks}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* Percentage Charges */}
                {(project.draftData?.percentageCharges ?? []).length > 0 && (
                  <>
                    <SectionDivider label="Percentage Charges" />
                    <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                          <tr>
                            {["Charge Type", "Percentage (%)"].map((h) => (
                              <th key={h} className="px-3 py-2 text-left text-gray-500 font-semibold uppercase">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {(project.draftData?.percentageCharges ?? []).map((pc, i) => (
                            <tr key={pc.id ?? i} className="bg-white dark:bg-gray-800">
                              <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{pc.type}</td>
                              <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">{pc.percentage}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* Measurements */}
                {measurements.length > 0 && (
                  <>
                    <SectionDivider label="Measurement Sheet" />
                    <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                          <tr>
                            {["Item #", "Name", "L", "B", "H", "Qty", "Unit", "Rate ₹", "Amount ₹"].map((h) => (
                              <th key={h} className="px-3 py-2 text-left text-gray-500 font-semibold uppercase">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {measurements.map((ms, i) => (
                            <tr key={ms.id ?? i} className="bg-white dark:bg-gray-800">
                              <td className="px-3 py-2 font-mono text-blue-600 dark:text-blue-400">{ms.itemNumber}</td>
                              <td className="px-3 py-2 text-gray-700 dark:text-gray-300 max-w-[140px] truncate">{ms.itemName}</td>
                              <td className="px-3 py-2 text-gray-500">{ms.length}</td>
                              <td className="px-3 py-2 text-gray-500">{ms.breadth}</td>
                              <td className="px-3 py-2 text-gray-500">{ms.height}</td>
                              <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{ms.quantity?.toFixed(3)}</td>
                              <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{ms.unit}</td>
                              <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{formatINR(ms.rate)}</td>
                              <td className="px-3 py-2 font-semibold text-gray-800 dark:text-gray-200">{formatINR(ms.amount)}</td>
                            </tr>
                          ))}
                          <tr className="bg-blue-50 dark:bg-blue-900/20">
                            <td colSpan={8} className="px-3 py-2 font-semibold text-blue-700 dark:text-blue-300 text-right">Total</td>
                            <td className="px-3 py-2 font-bold text-blue-800 dark:text-blue-200">{formatINR(measureTotal)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* General Description */}
                {generalDesc && (generalDesc.technicalNotes || generalDesc.siteConditions || generalDesc.specialClauses) && (
                  <>
                    <SectionDivider label="General Description" />
                    <div className="space-y-4">
                      {generalDesc.technicalNotes && (
                        <div>
                          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Technical Notes</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{generalDesc.technicalNotes}</p>
                        </div>
                      )}
                      {generalDesc.siteConditions && (
                        <div>
                          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Site Conditions</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{generalDesc.siteConditions}</p>
                        </div>
                      )}
                      {generalDesc.specialClauses && (
                        <div>
                          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Special Clauses</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{generalDesc.specialClauses}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Documents */}
                {documents.length > 0 && (
                  <>
                    <SectionDivider label="Documents" />
                    <ul className="space-y-2">
                      {documents.map((doc, i) => (
                        <li key={doc.id ?? i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg">
                          <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">{doc.name}</span>
                          <div className="flex gap-1">
                            {doc.url && (
                              <a href={doc.url} target="_blank" rel="noopener noreferrer"
                                className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="View">
                                <Eye className="w-4 h-4" />
                              </a>
                            )}
                            {doc.url && (
                              <a href={doc.url} download={doc.name}
                                className="p-1.5 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors" title="Download">
                                <Download className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
            </div>{/* /p-6 */}
          </div>

          {/* Cost Details Accordion */}
          {(subWorks.length > 0 || measurements.length > 0 || rateAnalysis.length > 0) && (
            <Accordion
              id="cost"
              title="Cost Details"
              icon={<DollarSign className="w-5 h-5" />}
              badge={measureTotal > 0 ? <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{formatCr(measureTotal)}</span> : undefined}
            >
              <InfoGrid>
                {infoRow("Sub-Works", subWorks.length > 0 ? `${subWorks.length} item(s)` : undefined)}
                {infoRow("Lead Statements", leadStatements.length > 0 ? `${leadStatements.length} item(s)` : undefined)}
                {infoRow("Rate Analysis Items", rateAnalysis.length > 0 ? `${rateAnalysis.length} item(s)` : undefined)}
                {infoRow("Measurement Entries", measurements.length > 0 ? `${measurements.length} item(s)` : undefined)}
                {infoRow("Work Portion Amount", formatINR(measureTotal))}
                {infoRow("Technical Sanction Amount", project.technicalSanctionAmount ? formatINR(project.technicalSanctionAmount) : undefined)}
              </InfoGrid>
            </Accordion>
          )}

          {/* DTP Details Accordion */}
          {dtpData && (
            <Accordion
              id="dtp"
              title="DTP Details"
              icon={<FileText className="w-5 h-5" />}
              badge={<StatusBadge status={dtpData.status} />}
            >
              <InfoGrid>
                {infoRow("Completion Period", dtpData.completionPeriod)}
                {infoRow("DLP Period", dtpData.dlpPeriod)}
                {infoRow("EMD Amount", dtpData.emdAmount ? formatINR(dtpData.emdAmount) : undefined)}
                {infoRow("Tender Fee", dtpData.tenderFee ? formatINR(dtpData.tenderFee) : undefined)}
                {infoRow("Class of Contractor", dtpData.classOfContractor)}
                {infoRow("Eligibility Criteria", dtpData.eligibilityCriteria)}
                {infoRow("TS Number", dtpData.tsNumber)}
                {infoRow("TS Date", fmtDate(dtpData.tsDate))}
                {infoRow("AA Number", dtpData.aaNumber)}
                {infoRow("AA Date", fmtDate(dtpData.aaDate))}
                {infoRow("SSR Reference", dtpData.ssrReference)}
                {infoRow("DSR Reference", dtpData.dsrReference)}
                {infoRow("Sanctioned By", dtpData.sanctionedBy)}
                {infoRow("Sanctioned At", fmtDate(dtpData.sanctionedAt))}
                {infoRow("Payment Terms", dtpData.paymentTerms)}
                {infoRow("Penalty Clause", dtpData.penaltyClause)}
              </InfoGrid>
              {dtpData.specialConditions && (
                <div className="mt-4">
                  <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Special Conditions</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{dtpData.specialConditions}</p>
                </div>
              )}
              {dtpData.qualityStandards && (
                <div className="mt-3">
                  <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Quality Standards</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{dtpData.qualityStandards}</p>
                </div>
              )}
              {(dtpData.remarks) && (
                <div className="mt-3 px-3 py-2 border-l-2 border-amber-400 bg-amber-50 dark:bg-amber-900/10 rounded-r-lg">
                  <p className="text-xs text-amber-700 dark:text-amber-400">{dtpData.remarks}</p>
                </div>
              )}
            </Accordion>
          )}

          {/* Tender Details Accordion */}
          {tenderData && (
            <Accordion
              id="tender"
              title="Tender Details"
              icon={<Gavel className="w-5 h-5" />}
              badge={<StatusBadge status={tenderData.status} />}
            >
              <InfoGrid>
                {infoRow("Tender ID", tenderData.tenderId)}
                {infoRow("Publishing Date", fmtDate(tenderData.publishingDate))}
                {infoRow("Closing Date", fmtDate(tenderData.closingDate))}
                {infoRow("Bid Start Date", fmtDate(tenderData.bidStartDate))}
                {infoRow("Bid End Date", fmtDate(tenderData.bidEndDate))}
                {infoRow("Pre-Bid Start", fmtDate(tenderData.preBidStartDate))}
                {infoRow("Pre-Bid End", fmtDate(tenderData.preBidEndDate))}
                {infoRow("Tender Fee", tenderData.tenderFee ? formatINR(tenderData.tenderFee) : undefined)}
                {infoRow("EMD Amount", tenderData.emdAmount ? formatINR(tenderData.emdAmount) : undefined)}
                {infoRow("Class of Contractor", tenderData.classOfContractor)}
                {infoRow("Eligibility Criteria", tenderData.eligibilityCriteria)}
                {infoRow("Completion Period", tenderData.completionPeriod)}
                {infoRow("MahaTender Ref.", tenderData.mahaTenderReferenceId)}
                {infoRow("EE Approved By", tenderData.eeApprovedBy)}
                {infoRow("CAFO Approved By", tenderData.cafoApprovedBy)}
              </InfoGrid>

              {/* Technical Bid */}
              {tenderData.technicalBid && (
                <>
                  <SectionDivider label="Technical Bid" />
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 mb-2">{tenderData.technicalBid.officeNote}</p>
                    {tenderData.technicalBid.bidders.length > 0 && (
                      <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                              {["Bidder", "EMD Status", "Doc Verification", "Technical Eligibility"].map((h) => (
                                <th key={h} className="px-3 py-2 text-left text-gray-500 font-semibold uppercase">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {tenderData.technicalBid.bidders.map((b, i) => (
                              <tr key={b.id ?? i} className="bg-white dark:bg-gray-800">
                                <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">{b.name}</td>
                                <td className="px-3 py-2"><StatusBadge status={b.emdStatus} /></td>
                                <td className="px-3 py-2"><StatusBadge status={b.documentVerificationStatus} /></td>
                                <td className="px-3 py-2"><StatusBadge status={b.technicalEligibilityStatus} /></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Financial Bid */}
              {tenderData.financialBid && (
                <>
                  <SectionDivider label="Financial Bid" />
                  <InfoGrid>
                    {infoRow("L1 Bidder", tenderData.financialBid.l1Bidder?.name)}
                    {infoRow("L1 Quoted %", tenderData.financialBid.l1Bidder?.quotedPercentage != null ? `${tenderData.financialBid.l1Bidder.quotedPercentage}%` : undefined)}
                    {infoRow("L2 Bidder", tenderData.financialBid.l2Bidder?.name)}
                    {infoRow("L3 Bidder", tenderData.financialBid.l3Bidder?.name)}
                  </InfoGrid>
                  <p className="text-xs text-gray-500 mt-2">{tenderData.financialBid.officeNote}</p>
                </>
              )}

              {/* LOA */}
              {tenderData.loa && (
                <>
                  <SectionDivider label="Letter of Intent" />
                  <InfoGrid>
                    {infoRow("L1 Contractor", tenderData.loa.l1Contractor)}
                    {infoRow("Approved %", `${tenderData.loa.approvedPercentage}%`)}
                    {infoRow("Approved Amount", formatINR(tenderData.loa.approvedAmount))}
                    {infoRow("Completion Period", tenderData.loa.completionPeriod)}
                    {infoRow("Issued Date", fmtDate(tenderData.loa.issuedDate))}
                  </InfoGrid>
                </>
              )}
            </Accordion>
          )}

          {/* Work Order Accordion */}
          {workOrderData && (
            <Accordion
              id="workorder"
              title="Work Order Details"
              icon={<Package className="w-5 h-5" />}
              badge={<StatusBadge status={workOrderData.status} />}
            >
              <InfoGrid>
                {infoRow("Work Order Number", workOrderData.workOrderNumber ?? workOrderData.workOrderId)}
                {infoRow("Issue Date", fmtDate(workOrderData.issueDate ?? workOrderData.issuedDate))}
                {infoRow("L1 Contractor", workOrderData.l1Contractor)}
                <div className="col-span-2">
                  <dt className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Contract Amount</dt>
                  <dd className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-0.5">
                    {formatINR(workOrderData.contractAmount)}
                  </dd>
                </div>
                {infoRow("GST Number", workOrderData.contractorGST)}
                {infoRow("Contractor Address", workOrderData.contractorAddress)}
                {infoRow("Completion Period", workOrderData.completionPeriod)}
                {infoRow("Commencement Date", fmtDate(workOrderData.commencementDate))}
                {infoRow("Work Completion Date", fmtDate(workOrderData.workCompletionDate))}
                {infoRow("Security Deposit", workOrderData.securityDeposit ? formatINR(workOrderData.securityDeposit) : undefined)}
                {typeof workOrderData.performanceGuarantee === "number"
                  ? infoRow("Performance Guarantee", formatINR(workOrderData.performanceGuarantee))
                  : null}
                {infoRow("Issued By", workOrderData.issuedBy)}
              </InfoGrid>
              {workOrderData.clauses && (
                <div className="mt-4">
                  <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Clauses</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{workOrderData.clauses}</p>
                </div>
              )}
            </Accordion>
          )}

          {/* MB & Billing Accordion */}
          {mbData.length > 0 && (
            <Accordion
              id="mb"
              title="MB & Billing"
              icon={<ReceiptText className="w-5 h-5" />}
              badge={<span className="text-xs font-semibold text-gray-500">{mbData.length} MB{mbData.length > 1 ? "s" : ""}</span>}
            >
              <div className="space-y-4">
                {mbData.map((mb, i) => (
                  <div key={mb.id ?? i} className="border border-gray-100 dark:border-gray-700 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{mb.mbNumber}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{fmtDate(mb.recordEntryDate)}</p>
                      </div>
                      <StatusBadge status={mb.status} />
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Work Amount</p>
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{mb.totalWorkAmount ? formatINR(mb.totalWorkAmount) : "—"}</p>
                      </div>
                      {mb.deductions && (
                        <div>
                          <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Deductions</p>
                          <p className="font-semibold text-red-600 dark:text-red-400">
                            {formatINR(
                              (mb.deductions.incomeTax ?? 0) +
                              (mb.deductions.gstTds ?? 0) +
                              (mb.deductions.labourCess ?? 0) +
                              (mb.deductions.securityDeposit ?? 0) +
                              (mb.deductions.mobilizationAdvance ?? 0) +
                              (mb.deductions.penalty ?? 0)
                            )}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Net Payable</p>
                        <p className="font-bold text-green-600 dark:text-green-400">{mb.netPayable ? formatINR(mb.netPayable) : "—"}</p>
                      </div>
                    </div>
                    {mb.measurements.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-400 mb-1">{mb.measurements.length} measurement entries</p>
                      </div>
                    )}
                    {mb.remarks && mb.remarks.length > 0 && (
                      <div className="mt-2 px-3 py-1.5 border-l-2 border-amber-400 bg-amber-50 dark:bg-amber-900/10 rounded-r-lg">
                        <p className="text-xs text-amber-700 dark:text-amber-400">{mb.remarks[mb.remarks.length - 1]}</p>
                      </div>
                    )}
                    <Link
                      href={`/mb-billing/${project.id}`}
                      className="mt-3 flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium"
                    >
                      View Details <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
                    </Link>
                  </div>
                ))}
              </div>
            </Accordion>
          )}

          {/* Documents Accordion */}
          {documents.length > 0 && (
            <Accordion
              id="docs"
              title="Documents"
              icon={<Truck className="w-5 h-5" />}
              badge={<span className="text-xs font-semibold text-gray-500">{documents.length} file{documents.length > 1 ? "s" : ""}</span>}
            >
              <ul className="space-y-2">
                {documents.map((doc, i) => (
                  <li key={doc.id ?? i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg">
                    <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{doc.name}</p>
                      <p className="text-xs text-gray-400">{doc.type} · {fmtDate(doc.uploadedAt)}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {doc.url && (
                        <a href={doc.url} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="View">
                          <Eye className="w-4 h-4" />
                        </a>
                      )}
                      {doc.url && (
                        <a href={doc.url} download={doc.name}
                          className="p-1.5 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors" title="Download">
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Accordion>
          )}

          {/* Auto-Generated Documents Accordion */}
          {project.status !== "Draft" && project.estimatedAmount !== undefined && (
            <Accordion
              id="auto-docs"
              title="Auto-Generated Documents"
              icon={<ReceiptText className="w-5 h-5" />}
              badge={<span className="text-xs font-semibold text-gray-500">{AUTO_DOCS.length} documents</span>}
            >
              <ul className="space-y-2">
                {AUTO_DOCS.map((doc) => (
                  <li key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg">
                    <FileText className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{doc.name}</p>
                      <p className="text-xs text-gray-400">System generated · PDF</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        title="Preview"
                        className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        title="Download"
                        className="p-1.5 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </Accordion>
          )}

          {/* Uploaded Documents Accordion */}
          {hasUploadedDocs && documentSets && (
            <Accordion
              id="uploaded-docs"
              title="Uploaded Documents"
              icon={<BookOpen className="w-5 h-5" />}
              badge={
                <span className="text-xs font-semibold text-gray-500">
                  {(documentSets.drawings?.length ?? 0) + (documentSets.sitePhotos?.length ?? 0) + (documentSets.surveyReports?.length ?? 0)} file{
                    ((documentSets.drawings?.length ?? 0) + (documentSets.sitePhotos?.length ?? 0) + (documentSets.surveyReports?.length ?? 0)) !== 1 ? "s" : ""
                  }
                </span>
              }
            >
              <div className="space-y-5">
                {documentSets.drawings?.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Drawings</p>
                    <ul className="space-y-2">
                      {documentSets.drawings.map((doc, i) => (
                        <li key={doc.id ?? i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg">
                          <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{doc.name}</p>
                            <p className="text-xs text-gray-400">{doc.type} · {fmtDate(doc.uploadedAt)} · {doc.uploadedBy}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {doc.url ? (
                              <>
                                <a href={doc.url} target="_blank" rel="noopener noreferrer"
                                  className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Preview">
                                  <Eye className="w-4 h-4" />
                                </a>
                                <a href={doc.url} download={doc.name}
                                  className="p-1.5 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors" title="Download">
                                  <Download className="w-4 h-4" />
                                </a>
                              </>
                            ) : (
                              <>
                                <button type="button" title="Preview"
                                  className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button type="button" title="Download"
                                  className="p-1.5 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                                  <Download className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {documentSets.sitePhotos?.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Site Photos</p>
                    <ul className="space-y-2">
                      {documentSets.sitePhotos.map((doc, i) => (
                        <li key={doc.id ?? i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg">
                          <FileText className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{doc.name}</p>
                            <p className="text-xs text-gray-400">{doc.type} · {fmtDate(doc.uploadedAt)} · {doc.uploadedBy}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {doc.url ? (
                              <>
                                <a href={doc.url} target="_blank" rel="noopener noreferrer"
                                  className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Preview">
                                  <Eye className="w-4 h-4" />
                                </a>
                                <a href={doc.url} download={doc.name}
                                  className="p-1.5 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors" title="Download">
                                  <Download className="w-4 h-4" />
                                </a>
                              </>
                            ) : (
                              <>
                                <button type="button" title="Preview"
                                  className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button type="button" title="Download"
                                  className="p-1.5 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                                  <Download className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {documentSets.surveyReports?.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Survey Reports</p>
                    <ul className="space-y-2">
                      {documentSets.surveyReports.map((doc, i) => (
                        <li key={doc.id ?? i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg">
                          <FileText className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{doc.name}</p>
                            <p className="text-xs text-gray-400">{doc.type} · {fmtDate(doc.uploadedAt)} · {doc.uploadedBy}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {doc.url ? (
                              <>
                                <a href={doc.url} target="_blank" rel="noopener noreferrer"
                                  className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Preview">
                                  <Eye className="w-4 h-4" />
                                </a>
                                <a href={doc.url} download={doc.name}
                                  className="p-1.5 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors" title="Download">
                                  <Download className="w-4 h-4" />
                                </a>
                              </>
                            ) : (
                              <>
                                <button type="button" title="Preview"
                                  className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button type="button" title="Download"
                                  className="p-1.5 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                                  <Download className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Accordion>
          )}
        </div>

        {/* ── SIDEBAR ── */}
        <div className="space-y-4">
          {/* Financial Summary */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
              <TrendingUp className="w-4 h-4 text-blue-500" aria-hidden="true" />
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Financial Summary</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Estimated</span>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {formatCr(project.estimatedAmount ?? measureTotal)}
                </span>
              </div>
              {project.technicalSanctionAmount && (
                <div className="flex justify-between items-baseline">
                  <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">TS Amount</span>
                  <span className="text-base font-bold text-green-600 dark:text-green-400">
                    {formatCr(project.technicalSanctionAmount)}
                  </span>
                </div>
              )}
              {project.gstAmount && (
                <div className="flex justify-between items-baseline">
                  <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">GST</span>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {formatINR(project.gstAmount)}
                  </span>
                </div>
              )}
              {workOrderData?.contractAmount && (
                <div className="flex justify-between items-baseline pt-2 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Contract</span>
                  <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                    {formatCr(workOrderData.contractAmount)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Project Timeline */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
              <Calendar className="w-4 h-4 text-blue-500" aria-hidden="true" />
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Project Timeline</h3>
            </div>
            <div className="p-4 space-y-2.5">
              <div>
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Current Stage</p>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-0.5">{project.currentStage}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Created By</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-0.5 flex items-center gap-1">
                  <User className="w-3 h-3" aria-hidden="true" /> {project.createdBy}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Created At</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-0.5">{fmtDate(project.createdAt)}</p>
              </div>
              {project.taluka && (
                <div>
                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Location</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" aria-hidden="true" /> {project.taluka}{project.gramPanchayat ? `, ${project.gramPanchayat}` : ""}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Stage Actions */}
          <div id="stage-actions">
            <StageActionsCard
              project={project}
              role={userRole}
              onAction={loadProject}
            />
          </div>

          {/* Audit Trail */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
              <BookOpen className="w-4 h-4 text-blue-500" aria-hidden="true" />
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Audit Trail</h3>
            </div>
            <div className="p-4">
            {history.length === 0 ? (
              <div className="text-center py-6">
                <Info className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" aria-hidden="true" />
                <p className="text-xs text-gray-400">No history yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...history].reverse().map((entry, i) => (
                  <div key={entry.id ?? i} className="flex gap-2.5">
                    <div className="flex flex-col items-center">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${historyDot(entry.action)}`} />
                      {i < history.length - 1 && <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700 mt-1" />}
                    </div>
                    <div className="pb-3 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-tight">{entry.action}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {entry.performedBy} · {fmtDate(entry.performedAt)}
                      </p>
                      {entry.remarks && (
                        <p className="text-xs text-gray-400 italic mt-1 leading-relaxed">"{entry.remarks}"</p>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-gray-300 dark:text-gray-600 truncate">{entry.fromStatus}</span>
                        <span className="text-xs text-gray-300">→</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{entry.toStatus}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
