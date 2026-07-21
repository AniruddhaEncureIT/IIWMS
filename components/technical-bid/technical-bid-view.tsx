"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Users,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Send,
  AlertCircle,
  FileText,
  Upload,
  Eye,
  Download,
  Paperclip,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  BadgeCheck,
  ChevronDown,
  Info,
  MessageSquare,
} from "lucide-react";
import { store } from "@/store/iims.store";
import type { IProject, IBidder, ITechnicalBidData, IDocument } from "@/types/iims.types";
import { formatINR, StatusBadge } from "@/components/dashboard/dash-shared";

// ─── constants ────────────────────────────────────────────────────────────────

const EMD_OPTIONS   = ["Verified", "Not Verified", "Returned"] as const;
const DOC_OPTIONS   = ["Approved", "Rejected", "Pending"] as const;
const TECH_OPTIONS  = ["Qualified", "Disqualified", "Under Review"] as const;

type EmdStatus  = typeof EMD_OPTIONS[number];
type DocStatus  = typeof DOC_OPTIONS[number];
type TechStatus = typeof TECH_OPTIONS[number];

// ─── status badge helpers ─────────────────────────────────────────────────────

function emdColor(s: string) {
  if (s === "Verified")     return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (s === "Returned")     return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
}
function docColor(s: string) {
  if (s === "Approved")  return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (s === "Rejected")  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
}
function techColor(s: string) {
  if (s === "Qualified")     return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (s === "Disqualified")  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
}
function techIcon(s: string) {
  if (s === "Qualified")    return <CheckCircle2 className="w-3.5 h-3.5" />;
  if (s === "Disqualified") return <XCircle className="w-3.5 h-3.5" />;
  return <Clock className="w-3.5 h-3.5" />;
}

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${color}`}>
      {label}
    </span>
  );
}

// ─── Select dropdown ──────────────────────────────────────────────────────────

function InlineSelect<T extends string>({
  value, options, onChange, colorFn,
}: {
  value: T; options: readonly T[]; onChange: (v: T) => void;
  colorFn: (v: string) => string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={`text-xs font-semibold px-2.5 py-1.5 rounded-full pr-7 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 appearance-none ${colorFn(value)}`}
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 opacity-60" />
    </div>
  );
}

// ─── Add / Edit Bidder Modal ──────────────────────────────────────────────────

interface BidderForm {
  name: string;
  emdStatus: EmdStatus;
  documentVerificationStatus: DocStatus;
  technicalEligibilityStatus: TechStatus;
}

const EMPTY_FORM: BidderForm = {
  name: "",
  emdStatus: "Not Verified",
  documentVerificationStatus: "Pending",
  technicalEligibilityStatus: "Under Review",
};

function BidderModal({
  initial, onSave, onClose,
}: {
  initial: BidderForm;
  onSave: (f: BidderForm) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<BidderForm>(initial);
  const patch = (k: keyof BidderForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function submit() {
    if (!form.name.trim()) { toast.error("Bidder name is required."); return; }
    onSave(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {initial.name ? "Edit Bidder" : "Add Bidder"}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Bidder / Contractor Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => patch("name", e.target.value)}
              placeholder="M/s. Contractor Name"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">EMD Status</label>
            <select
              value={form.emdStatus}
              onChange={(e) => patch("emdStatus", e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
            >
              {EMD_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Document Verification</label>
            <select
              value={form.documentVerificationStatus}
              onChange={(e) => patch("documentVerificationStatus", e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
            >
              {DOC_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Technical Eligibility</label>
            <select
              value={form.technicalEligibilityStatus}
              onChange={(e) => patch("technicalEligibilityStatus", e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
            >
              {TECH_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Cancel
          </button>
          <button onClick={submit}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
            <Check className="w-4 h-4" />
            {initial.name ? "Save Changes" : "Add Bidder"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Remove Bidder?</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[200px]">{name}</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
          This bidder will be removed from the evaluation. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors">
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Remarks Dialog (for EE / CAFO / ACEO actions) ───────────────────────────

interface RemarksDialogConfig {
  title: string;
  description: string;
  confirmLabel: string;
  confirmColor: "green" | "red";
  required: boolean;
  onConfirm: (remarks: string) => void;
}

function RemarksDialog({
  config, onCancel, saving,
}: {
  config: RemarksDialogConfig;
  onCancel: () => void;
  saving: boolean;
}) {
  const [remarks, setRemarks] = useState("");

  function submit() {
    if (config.required && !remarks.trim()) {
      toast.error("Remarks are required for this action.");
      return;
    }
    config.onConfirm(remarks.trim());
  }

  const btnCls = config.confirmColor === "green"
    ? "bg-green-600 hover:bg-green-700 focus-visible:ring-green-500"
    : "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-start gap-3 px-6 py-5 border-b border-gray-100 dark:border-gray-700">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${config.confirmColor === "green" ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
            {config.confirmColor === "green"
              ? <CheckCircle2 className="w-4.5 h-4.5 text-green-600 dark:text-green-400" />
              : <XCircle className="w-4.5 h-4.5 text-red-600 dark:text-red-400" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{config.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{config.description}</p>
          </div>
        </div>
        <div className="px-6 py-4 space-y-3">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Remarks {config.required && <span className="text-red-500">*</span>}
          </label>
          <textarea
            rows={4}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder={config.required ? "Remarks are required…" : "Optional remarks…"}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
            autoFocus
          />
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 ${btnCls}`}>
            {saving
              ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : config.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Summary stat card ────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className={`rounded-xl p-4 border ${color}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

interface LocalDoc {
  id: string;
  name: string;
  size: number;
  url: string;
}

const MAX_SIZE = 20 * 1024 * 1024;

export function TechnicalBidView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [project, setProject]   = useState<IProject | null>(null);
  const [userRole, setUserRole] = useState("");
  const [saving, setSaving]     = useState(false);

  // bidder state
  const [bidders, setBidders]     = useState<IBidder[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId]   = useState<string | null>(null);

  // office note + docs
  const [officeNote, setOfficeNote]         = useState("");
  const [officeNoteError, setOfficeNoteError] = useState(false);
  const [docs, setDocs]                     = useState<LocalDoc[]>([]);
  const [dragActive, setDragActive]         = useState(false);

  // action dialog (EE / CAFO / ACEO)
  const [actionDialog, setActionDialog] = useState<RemarksDialogConfig | null>(null);

  const load = useCallback(() => {
    const p = store.getProjectById(projectId);
    setProject(p);
    setUserRole(store.getCurrentUser()?.role ?? "");
    if (p?.tenderData?.technicalBid) {
      const tb = p.tenderData.technicalBid;
      setBidders(tb.bidders ?? []);
      setOfficeNote(tb.officeNote ?? "");
      if (tb.documents?.length) {
        setDocs(tb.documents.map((d) => ({ id: d.id, name: d.name, size: 0, url: d.url ?? "" })));
      }
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    return () => { docs.forEach((d) => { if (d.url.startsWith("blob:")) URL.revokeObjectURL(d.url); }); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-gray-300 dark:text-gray-600" />
        <p className="text-gray-500 dark:text-gray-400">Project not found.</p>
        <Link href="/all-projects" className="text-blue-600 hover:underline text-sm">← All Projects</Link>
      </div>
    );
  }

  const tenderData  = project.tenderData;
  const techBid     = tenderData?.technicalBid;

  // ── Stage / role detection ────────────────────────────────────────────────

  const isTCStage    = project.status === "Tender Published";
  const isEEStage    = project.status === "Technical Bid - EE Review";
  const isCAFOStage  = project.status === "Technical Bid - CAFO Review";
  const isACEOStage  = project.status === "Technical Bid - ACEO Review";
  const isFinalized  = project.status === "Technical Bid Finalized";

  const isTenderClerk = userRole === "Tender Clerk";
  const isEERole      = userRole === "Executive Engineer";
  const isCAFORole    = userRole === "Chief Accounts and Finance Officer";
  const isACEORole    = userRole === "Additional Chief Executive Officer";

  // TC edits only when stage is at TC; all reviewers get read-only
  const canEdit       = isTCStage && isTenderClerk;
  const isReviewStage = isEEStage || isCAFOStage || isACEOStage;

  const qualified    = bidders.filter((b) => b.technicalEligibilityStatus === "Qualified");
  const disqualified = bidders.filter((b) => b.technicalEligibilityStatus === "Disqualified");
  const pending      = bidders.filter((b) => b.technicalEligibilityStatus === "Under Review");
  const emdVerified  = bidders.filter((b) => b.emdStatus === "Verified");

  // ── File handlers ──────────────────────────────────────────────────────────

  const TB_ALLOWED_EXTS  = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"];
  const TB_ALLOWED_LABEL = "PDF, DOC, DOCX, JPG, PNG";

  function addFiles(files: FileList | null) {
    if (!files || !canEdit) return;
    const next: LocalDoc[] = [];
    Array.from(files).forEach((f) => {
      const ext = "." + (f.name.split(".").pop() ?? "").toLowerCase();
      if (!TB_ALLOWED_EXTS.includes(ext)) { toast.error(`Invalid file type. Allowed types: ${TB_ALLOWED_LABEL}`); return; }
      if (f.size > MAX_SIZE) { toast.error(`${f.name} exceeds 20 MB.`); return; }
      if (docs.some((d) => d.name === f.name)) { toast.error(`${f.name} already attached.`); return; }
      next.push({ id: `D${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, name: f.name, size: f.size, url: URL.createObjectURL(f) });
    });
    setDocs((prev) => [...prev, ...next]);
  }

  function removeDoc(id: string) {
    setDocs((prev) => {
      const d = prev.find((x) => x.id === id);
      if (d?.url.startsWith("blob:")) URL.revokeObjectURL(d.url);
      return prev.filter((x) => x.id !== id);
    });
  }

  function buildIDocuments(): IDocument[] {
    const user = store.getCurrentUser();
    return docs.map((d) => ({
      id: d.id, name: d.name,
      type: "application/octet-stream",
      url: d.url,
      uploadedAt: new Date().toISOString(),
      uploadedBy: user?.name ?? "Unknown",
    }));
  }

  // ── Bidder CRUD ────────────────────────────────────────────────────────────

  function openAdd() { setEditingId(null); setShowModal(true); }
  function openEdit(id: string) { setEditingId(id); setShowModal(true); }

  function handleSaveBidder(form: BidderForm) {
    if (editingId) {
      setBidders((prev) => prev.map((b) => b.id === editingId ? { ...b, ...form } : b));
      toast.success("Bidder updated.");
    } else {
      const newB: IBidder = {
        id: `BID${Date.now()}`,
        name: form.name,
        emdStatus: form.emdStatus,
        documentVerificationStatus: form.documentVerificationStatus,
        technicalEligibilityStatus: form.technicalEligibilityStatus,
      };
      setBidders((prev) => [...prev, newB]);
      toast.success("Bidder added.");
    }
    setShowModal(false);
  }

  function confirmDelete(id: string) { setDeleteId(id); }
  function handleDelete() {
    setBidders((prev) => prev.filter((b) => b.id !== deleteId));
    setDeleteId(null);
    toast.success("Bidder removed.");
  }

  function updateField<K extends keyof IBidder>(id: string, key: K, value: IBidder[K]) {
    setBidders((prev) => prev.map((b) => b.id === id ? { ...b, [key]: value } : b));
  }

  // ── TC: Save draft ─────────────────────────────────────────────────────────

  async function handleSave() {
    if (!project || !tenderData) return;
    setSaving(true);
    try {
      const tb: ITechnicalBidData = {
        bidders,
        officeNote,
        documents: buildIDocuments(),
        status: "In Progress",
      };
      store.updateProject(project.id, { tenderData: { ...tenderData, technicalBid: tb } });
      toast.success("Technical bid evaluation saved.");
      load();
    } finally { setSaving(false); }
  }

  // ── TC: Forward for EE review ──────────────────────────────────────────────

  async function handleForward() {
    if (!project || !tenderData) return;
    if (!officeNote.trim()) {
      setOfficeNoteError(true);
      toast.error("Office Note is required.");
      return;
    }
    if (bidders.length === 0) { toast.error("Add at least one bidder before forwarding."); return; }
    if (qualified.length === 0) { toast.error("At least one bidder must be marked as Qualified."); return; }
    if (pending.length > 0) {
      toast.error(`${pending.length} bidder(s) still Under Review. Complete evaluation before forwarding.`);
      return;
    }
    setSaving(true);
    try {
      const tb: ITechnicalBidData = {
        bidders,
        officeNote,
        documents: buildIDocuments(),
        status: "Submitted for Review",
        approvedBy: store.getCurrentUser()?.name,
      };
      store.updateProject(project.id, { tenderData: { ...tenderData, technicalBid: tb } });
      const fwdResult = store.forwardProject(
        project.id,
        "Executive Engineer",
        "Technical bid office note and evaluation submitted for EE review.",
        "Technical Bid - EE Review"
      );
      if (!fwdResult.ok) { toast.error(fwdResult.error); return; }
      toast.success("Technical bid forwarded to Executive Engineer for review.");
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  // ── EE: Approve → forward to CAFO ─────────────────────────────────────────

  async function handleEEApprove(remarks: string) {
    if (!project) return;
    setSaving(true);
    try {
      const r = store.forwardProject(
        project.id,
        "Chief Accounts and Finance Officer",
        remarks,
        "Technical Bid - CAFO Review"
      );
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Technical Bid approved and forwarded to CAFO.");
      setActionDialog(null);
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  // ── EE: Return to TC ───────────────────────────────────────────────────────

  async function handleEEReturn(remarks: string) {
    if (!project || !tenderData) return;
    setSaving(true);
    try {
      // Reset techBid status so TC can re-edit and resubmit
      if (tenderData.technicalBid) {
        store.updateProject(project.id, {
          tenderData: {
            ...tenderData,
            technicalBid: { ...tenderData.technicalBid, status: "In Progress" },
          },
        });
      }
      const r = store.rejectProject(
        project.id,
        "Tender Clerk",
        remarks,
        "Tender Published"
      );
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Technical Bid returned to Tender Clerk with remarks.");
      setActionDialog(null);
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  // ── CAFO: Approve → forward to ACEO ───────────────────────────────────────

  async function handleCAFOApprove(remarks: string) {
    if (!project) return;
    setSaving(true);
    try {
      const r = store.forwardProject(
        project.id,
        "Additional Chief Executive Officer",
        remarks,
        "Technical Bid - ACEO Review"
      );
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Technical Bid approved and forwarded to Additional CEO.");
      setActionDialog(null);
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  // ── CAFO: Return to EE ─────────────────────────────────────────────────────

  async function handleCAFOReturn(remarks: string) {
    if (!project) return;
    setSaving(true);
    try {
      const r = store.rejectProject(
        project.id,
        "Executive Engineer",
        remarks,
        "Technical Bid - EE Review"
      );
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Technical Bid returned to Executive Engineer with remarks.");
      setActionDialog(null);
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  // ── ACEO: Approve → Technical Bid Finalized ───────────────────────────────

  async function handleACEOApprove(remarks: string) {
    if (!project || !tenderData) return;
    setSaving(true);
    try {
      const user = store.getCurrentUser();
      store.updateProject(project.id, {
        tenderData: {
          ...tenderData,
          technicalBid: {
            ...(tenderData.technicalBid ?? { bidders: [], officeNote: "", documents: [] }),
            status: "Technical Bid Finalized",
            approvedBy: user?.name,
          },
        },
      });
      const r = store.approveProject(project.id, "Technical Bid Finalized", remarks);
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Technical Bid approved and finalized. Financial Bid stage is now active.");
      setActionDialog(null);
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  // ── ACEO: Return to CAFO ───────────────────────────────────────────────────

  async function handleACEOReturn(remarks: string) {
    if (!project) return;
    setSaving(true);
    try {
      const r = store.rejectProject(
        project.id,
        "Chief Accounts and Finance Officer",
        remarks,
        "Technical Bid - CAFO Review"
      );
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Technical Bid returned to CAFO with remarks.");
      setActionDialog(null);
      router.push(`/project/${project.id}`);
    } finally { setSaving(false); }
  }

  const modalInitial: BidderForm = editingId
    ? (() => {
        const b = bidders.find((x) => x.id === editingId)!;
        return {
          name: b.name,
          emdStatus: b.emdStatus as EmdStatus,
          documentVerificationStatus: b.documentVerificationStatus as DocStatus,
          technicalEligibilityStatus: b.technicalEligibilityStatus as TechStatus,
        };
      })()
    : EMPTY_FORM;

  const deleteName = deleteId ? (bidders.find((b) => b.id === deleteId)?.name ?? "") : "";

  // ── Stage label / description for review banner ────────────────────────────

  const reviewBannerInfo = isEEStage
    ? { role: "Executive Engineer Review", hint: "Review the office note, bidder evaluation, and documents. Approve to forward to CAFO or return to Tender Clerk." }
    : isCAFOStage
    ? { role: "CAFO Review", hint: "Review the office note, bidder evaluation, and documents. Approve to forward to Additional CEO or return to Executive Engineer." }
    : isACEOStage
    ? { role: "Additional CEO Approval", hint: "Review the office note, bidder eligibility, and documents. Approve to finalize Technical Bid or return to CAFO." }
    : null;

  return (
    <>
      {showModal && (
        <BidderModal
          initial={modalInitial}
          onSave={handleSaveBidder}
          onClose={() => setShowModal(false)}
        />
      )}
      {deleteId && (
        <DeleteConfirm
          name={deleteName}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
      {actionDialog && (
        <RemarksDialog
          config={actionDialog}
          onCancel={() => setActionDialog(null)}
          saving={saving}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-start gap-4">
          <Link href={`/project/${project.id}`}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors mt-0.5 shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Technical Bid Evaluation</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">{project.projectName}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {isFinalized && (
              <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <BadgeCheck className="w-3.5 h-3.5" /> Finalized
              </span>
            )}
            {isReviewStage && (
              <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                <Clock className="w-3.5 h-3.5" /> Under Review
              </span>
            )}
            <StatusBadge status={tenderData?.status ?? project.status} />
          </div>
        </div>

        {/* Reference-only notice */}
        <div className="flex gap-3 rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-4 py-3.5">
          <AlertCircle className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <span className="font-semibold">Reference only.&nbsp;</span>
            Technical Bid evaluation is performed externally on MahaTender. This module is retained for reference purposes only.
          </p>
        </div>

        {/* Project / Tender Summary */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Tender Information</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Tender ID",       value: tenderData?.tenderId ?? "—" },
              { label: "Sanctioned Amount", value: formatINR(project.technicalSanctionAmount ?? project.estimatedAmount ?? 0) },
              { label: "Closing Date",    value: tenderData?.closingDate
                  ? new Date(tenderData.closingDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                  : "—" },
              { label: "EMD Required",    value: formatINR(tenderData?.emdAmount ?? 0) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">{label}</p>
                <p className="text-sm font-bold text-blue-800 dark:text-blue-200 mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats strip */}
        {bidders.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total Bidders"  value={bidders.length}      color="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200" />
            <StatCard label="EMD Verified"   value={emdVerified.length}  color="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300" />
            <StatCard label="Qualified"       value={qualified.length}    color="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300" />
            <StatCard label="Under Review"    value={pending.length}      sub={canEdit && pending.length > 0 ? "Complete before forwarding" : undefined}
              color={pending.length > 0 ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"} />
          </div>
        )}

        {/* Review stage banner — shown to EE / CAFO / ACEO */}
        {reviewBannerInfo && (
          <div className="flex gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{reviewBannerInfo.role}</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">{reviewBannerInfo.hint}</p>
            </div>
          </div>
        )}

        {/* TC viewing while bid is in review chain */}
        {isReviewStage && isTenderClerk && (
          <div className="flex gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Submitted — Awaiting Approval</p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                The Technical Bid office note is currently under review. No edits are allowed until returned.
              </p>
            </div>
          </div>
        )}

        {/* Finalized notice */}
        {isFinalized && (
          <div className="flex gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4">
            <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">Technical Bid Finalized</p>
              <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                {qualified.length} bidder{qualified.length !== 1 ? "s" : ""} qualified.
                {techBid?.approvedBy && <span className="ml-1">Approved by: <strong>{techBid.approvedBy}</strong></span>}
                {" "}Financial Bid stage is now active.
              </p>
            </div>
          </div>
        )}

        {/* Bidder Management Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Bidder Evaluation
                {bidders.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-gray-400">{bidders.length} registered</span>
                )}
              </h2>
            </div>
            {canEdit && (
              <button onClick={openAdd}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Bidder
              </button>
            )}
          </div>

          {bidders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <Users className="w-7 h-7 text-gray-300 dark:text-gray-500" />
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No bidders registered yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs">
                Add bidders who have submitted their bids before the tender closing date.
              </p>
              {canEdit && (
                <button onClick={openAdd}
                  className="mt-2 flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
                  <Plus className="w-4 h-4" /> Add First Bidder
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/40 border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 w-6">#</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 min-w-[180px]">Bidder Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">EMD Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Document Verification</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Technical Eligibility</th>
                    {canEdit && <th className="px-4 py-3 w-20"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {bidders.map((bidder, idx) => (
                    <tr key={bidder.id}
                      className={`transition-colors ${
                        bidder.technicalEligibilityStatus === "Qualified"
                          ? "bg-green-50/30 dark:bg-green-900/10"
                          : bidder.technicalEligibilityStatus === "Disqualified"
                          ? "bg-red-50/30 dark:bg-red-900/10"
                          : ""
                      }`}>
                      <td className="px-4 py-3.5 text-xs text-gray-400 font-medium">{idx + 1}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          {bidder.technicalEligibilityStatus === "Qualified" && (
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                          )}
                          {bidder.technicalEligibilityStatus === "Disqualified" && (
                            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                          )}
                          {bidder.technicalEligibilityStatus === "Under Review" && (
                            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                          )}
                          <span className="font-medium text-gray-800 dark:text-gray-100">{bidder.name}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        {canEdit ? (
                          <InlineSelect
                            value={bidder.emdStatus as EmdStatus}
                            options={EMD_OPTIONS}
                            onChange={(v) => updateField(bidder.id, "emdStatus", v)}
                            colorFn={emdColor}
                          />
                        ) : (
                          <StatusPill label={bidder.emdStatus} color={emdColor(bidder.emdStatus)} />
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        {canEdit ? (
                          <InlineSelect
                            value={bidder.documentVerificationStatus as DocStatus}
                            options={DOC_OPTIONS}
                            onChange={(v) => updateField(bidder.id, "documentVerificationStatus", v)}
                            colorFn={docColor}
                          />
                        ) : (
                          <StatusPill label={bidder.documentVerificationStatus} color={docColor(bidder.documentVerificationStatus)} />
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        {canEdit ? (
                          <InlineSelect
                            value={bidder.technicalEligibilityStatus as TechStatus}
                            options={TECH_OPTIONS}
                            onChange={(v) => updateField(bidder.id, "technicalEligibilityStatus", v)}
                            colorFn={techColor}
                          />
                        ) : (
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${techColor(bidder.technicalEligibilityStatus)}`}>
                            {techIcon(bidder.technicalEligibilityStatus)}
                            {bidder.technicalEligibilityStatus}
                          </span>
                        )}
                      </td>

                      {canEdit && (
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(bidder.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => confirmDelete(bidder.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Qualified Bidders Summary */}
        {qualified.length > 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
              <h3 className="text-sm font-semibold text-green-800 dark:text-green-300">
                Qualified Bidders ({qualified.length})
              </h3>
              <span className="ml-auto text-xs text-green-600 dark:text-green-400">Eligible for Financial Bid</span>
            </div>
            <div className="space-y-2">
              {qualified.map((b, i) => (
                <div key={b.id}
                  className="flex items-center gap-3 bg-white dark:bg-green-900/10 border border-green-200 dark:border-green-700 rounded-lg px-4 py-2.5">
                  <span className="w-6 h-6 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-100 flex-1">{b.name}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${emdColor(b.emdStatus)}`}>{b.emdStatus}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${docColor(b.documentVerificationStatus)}`}>{b.documentVerificationStatus}</span>
                </div>
              ))}
            </div>
            {disqualified.length > 0 && (
              <p className="text-xs text-green-600 dark:text-green-500 mt-3">
                {disqualified.length} bidder{disqualified.length !== 1 ? "s" : ""} disqualified and excluded from financial evaluation.
              </p>
            )}
          </div>
        )}

        {/* Office Note */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Office Note
              {canEdit && <span className="text-red-500 ml-0.5">*</span>}
            </h3>
          </div>
          {canEdit ? (
            <>
              <textarea
                rows={5}
                value={officeNote}
                onChange={(e) => { setOfficeNote(e.target.value); if (officeNoteError) setOfficeNoteError(false); }}
                placeholder="Record observations, discrepancies, committee decisions, or any special conditions noted during the technical bid evaluation…"
                className={`w-full rounded-lg border text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 resize-none transition ${
                  officeNoteError
                    ? "border-red-400 bg-white dark:bg-gray-700 focus:ring-red-400/40 focus:border-red-400"
                    : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-blue-500/40 focus:border-blue-500"
                }`}
              />
              <div className="flex items-center justify-between mt-1">
                {officeNoteError
                  ? <p className="text-xs text-red-500 dark:text-red-400">Office Note is required.</p>
                  : <span />}
                <p className="text-xs text-gray-400">{officeNote.length} chars</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/40 rounded-lg p-4 whitespace-pre-wrap min-h-[80px]">
              {officeNote || "No office note recorded."}
            </p>
          )}
        </div>

        {/* Supporting Documents */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Supporting Documents</h3>
              <span className="text-xs text-gray-400 ml-1">(Bid Comparison Sheet, Eligibility Documents)</span>
            </div>
            <span className="text-xs text-gray-400">{docs.length} file{docs.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="p-6">
            {canEdit && (
              <div
                onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); setDragActive(false); addFiles(e.dataTransfer.files); }}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors mb-4 ${
                  dragActive
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/40"
                }`}
              >
                <Upload className={`w-7 h-7 mx-auto mb-2 ${dragActive ? "text-blue-500" : "text-gray-400"}`} />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {dragActive ? "Drop files here" : "Click or drag & drop — Bid Comparison Sheet, Eligibility Documents"}
                </p>
                <p className="text-xs text-gray-400 mt-1">PDF, DOCX, JPG, PNG — max 20 MB each</p>
                <input ref={fileRef} type="file" multiple className="sr-only"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
              </div>
            )}

            {docs.length > 0 ? (
              <div className="space-y-2">
                {docs.map((d) => (
                  <div key={d.id}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                    <Paperclip className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100 flex-1 truncate">{d.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {d.url && (
                        <>
                          <a href={d.url} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                            <Eye className="w-4 h-4" />
                          </a>
                          <a href={d.url} download={d.name}
                            className="p-1.5 rounded text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                            <Download className="w-4 h-4" />
                          </a>
                        </>
                      )}
                      {canEdit && (
                        <button onClick={() => removeDoc(d.id)}
                          className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">No documents attached.</p>
            )}
          </div>
        </div>

        {/* ── Action Bar ─────────────────────────────────────────────────────── */}

        {/* TC Actions — editable stage */}
        {isTCStage && isTenderClerk && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
            <div className="flex flex-wrap gap-3">
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors disabled:opacity-60">
                {saving ? <Clock className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Save Progress
              </button>
              <button
                onClick={handleForward}
                disabled={saving || !officeNote.trim() || qualified.length === 0 || pending.length > 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                <Send className="w-4 h-4" /> Forward Technical Bids for Review
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-1">
              {!officeNote.trim() && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> Office Note is required before forwarding.
                </p>
              )}
              {bidders.length > 0 && qualified.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> Mark at least one bidder as Qualified to forward.
                </p>
              )}
              {pending.length > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> {pending.length} bidder{pending.length !== 1 ? "s" : ""} still Under Review — complete evaluation before forwarding.
                </p>
              )}
              {officeNote.trim() && qualified.length > 0 && pending.length === 0 && (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> Ready to forward — {qualified.length} qualified, {disqualified.length} disqualified.
                </p>
              )}
            </div>
          </div>
        )}

        {/* EE Actions */}
        {isEEStage && isEERole && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">EE Review Actions</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setActionDialog({
                  title: "Approve & Forward to CAFO",
                  description: "Technical Bid will be forwarded to CAFO for review.",
                  confirmLabel: "Approve & Forward",
                  confirmColor: "green",
                  required: true,
                  onConfirm: handleEEApprove,
                })}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                <CheckCircle2 className="w-4 h-4" /> Approve & Forward to CAFO
              </button>
              <button
                onClick={() => setActionDialog({
                  title: "Return to Tender Clerk",
                  description: "Technical Bid will be returned to Tender Clerk for correction.",
                  confirmLabel: "Return with Remarks",
                  confirmColor: "red",
                  required: true,
                  onConfirm: handleEEReturn,
                })}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                <XCircle className="w-4 h-4" /> Return to Tender Clerk
              </button>
            </div>
          </div>
        )}

        {/* CAFO Actions */}
        {isCAFOStage && isCAFORole && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">CAFO Review Actions</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setActionDialog({
                  title: "Approve & Forward to Additional CEO",
                  description: "Technical Bid will be forwarded to Additional CEO for final approval.",
                  confirmLabel: "Approve & Forward",
                  confirmColor: "green",
                  required: true,
                  onConfirm: handleCAFOApprove,
                })}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                <CheckCircle2 className="w-4 h-4" /> Approve & Forward to Additional CEO
              </button>
              <button
                onClick={() => setActionDialog({
                  title: "Return to Executive Engineer",
                  description: "Technical Bid will be returned to Executive Engineer for revision.",
                  confirmLabel: "Return with Remarks",
                  confirmColor: "red",
                  required: true,
                  onConfirm: handleCAFOReturn,
                })}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                <XCircle className="w-4 h-4" /> Return to Executive Engineer
              </button>
            </div>
          </div>
        )}

        {/* ACEO Actions */}
        {isACEOStage && isACEORole && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Additional CEO Approval Actions</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setActionDialog({
                  title: "Approve Technical Bid",
                  description: "Technical Bid will be finalized. Financial Bid stage will become active.",
                  confirmLabel: "Approve Technical Bids",
                  confirmColor: "green",
                  required: true,
                  onConfirm: handleACEOApprove,
                })}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                <BadgeCheck className="w-4 h-4" /> Approve Technical Bids
              </button>
              <button
                onClick={() => setActionDialog({
                  title: "Return to CAFO",
                  description: "Technical Bid will be returned to CAFO for further review.",
                  confirmLabel: "Return with Remarks",
                  confirmColor: "red",
                  required: true,
                  onConfirm: handleACEOReturn,
                })}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                <XCircle className="w-4 h-4" /> Return to CAFO
              </button>
            </div>
          </div>
        )}

        {/* Finalized — no actions */}
        {isFinalized && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 font-medium">
              <BadgeCheck className="w-4 h-4" />
              Technical Bid Finalized — {qualified.length} qualified bidder{qualified.length !== 1 ? "s" : ""} cleared for Financial Bid
            </div>
          </div>
        )}

      </div>
    </>
  );
}
