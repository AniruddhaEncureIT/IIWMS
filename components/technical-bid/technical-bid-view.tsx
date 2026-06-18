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

  const [project, setProject] = useState<IProject | null>(null);
  const [userRole, setUserRole] = useState("");
  const [saving, setSaving] = useState(false);

  // bidder state
  const [bidders, setBidders] = useState<IBidder[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // office note + docs
  const [officeNote, setOfficeNote] = useState("");
  const [docs, setDocs] = useState<LocalDoc[]>([]);
  const [dragActive, setDragActive] = useState(false);

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

  const tenderData   = project.tenderData;
  const techBid      = tenderData?.technicalBid;
  const isForwarded  = techBid?.status === "Forwarded for Financial Bid";
  const canEdit      = !isForwarded; // editable until forwarded

  const qualified    = bidders.filter((b) => b.technicalEligibilityStatus === "Qualified");
  const disqualified = bidders.filter((b) => b.technicalEligibilityStatus === "Disqualified");
  const pending      = bidders.filter((b) => b.technicalEligibilityStatus === "Under Review");
  const emdVerified  = bidders.filter((b) => b.emdStatus === "Verified");

  // ── file handlers ──────────────────────────────────────────────────────────

  function addFiles(files: FileList | null) {
    if (!files || !canEdit) return;
    const next: LocalDoc[] = [];
    Array.from(files).forEach((f) => {
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

  // ── bidder CRUD ────────────────────────────────────────────────────────────

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

  // ── inline status update ───────────────────────────────────────────────────

  function updateField<K extends keyof IBidder>(id: string, key: K, value: IBidder[K]) {
    setBidders((prev) => prev.map((b) => b.id === id ? { ...b, [key]: value } : b));
  }

  // ── save / forward ─────────────────────────────────────────────────────────

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

  async function handleForward() {
    if (!project || !tenderData) return;
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
        status: "Forwarded for Financial Bid",
        approvedBy: store.getCurrentUser()?.name,
      };
      store.updateProject(project.id, { tenderData: { ...tenderData, technicalBid: tb } });
      const fwdResult = store.forwardProject(project.id, "Executive Engineer", "Technical bid evaluation forwarded for EE review", "Technical Bid - EE Review");
      if (!fwdResult.ok) { toast.error(fwdResult.error); return; }
      toast.success("Technical bid forwarded for EE review!");
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
            {isForwarded && (
              <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <BadgeCheck className="w-3.5 h-3.5" /> Forwarded
              </span>
            )}
            <StatusBadge status={tenderData?.status ?? project.status} />
          </div>
        </div>

        {/* Project / Tender Summary */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Tender Information</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Tender ID",        value: tenderData?.tenderId ?? "—" },
              { label: "Estimate Amount",  value: formatINR(project.estimatedAmount ?? 0) },
              { label: "Closing Date",     value: tenderData?.closingDate
                  ? new Date(tenderData.closingDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                  : "—" },
              { label: "EMD Required",     value: formatINR(tenderData?.emdAmount ?? 0) },
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
            <StatCard label="Under Review"    value={pending.length}      sub={pending.length > 0 ? "Complete before forwarding" : undefined}
              color={pending.length > 0 ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"} />
          </div>
        )}

        {/* Forwarded notice */}
        {isForwarded && (
          <div className="flex gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4">
            <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">Technical Evaluation Complete</p>
              <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                {qualified.length} bidder{qualified.length !== 1 ? "s" : ""} qualified and forwarded for financial bid evaluation.
                {techBid?.approvedBy && <span className="ml-1">Approved by: {techBid.approvedBy}</span>}
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
                Bidder Management
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
                    <th className="px-4 py-3 w-20"></th>
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

                      {/* EMD inline selector */}
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

                      {/* Doc verification inline selector */}
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

                      {/* Technical eligibility inline selector */}
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

                      <td className="px-4 py-3.5">
                        {canEdit && (
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
                        )}
                      </td>
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
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Office Note</h3>
          </div>
          {canEdit ? (
            <>
              <textarea
                rows={5}
                value={officeNote}
                onChange={(e) => setOfficeNote(e.target.value)}
                placeholder="Record observations, discrepancies, committee decisions, or any special conditions noted during the technical bid evaluation…"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 resize-none transition"
              />
              <p className="text-xs text-gray-400 text-right mt-1">{officeNote.length} chars</p>
            </>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/40 rounded-lg p-4 whitespace-pre-wrap">
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
                  {dragActive ? "Drop files here" : "Click or drag & drop — EMD receipts, bid documents, committee minutes"}
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
              !canEdit && (
                <p className="text-sm text-gray-400 text-center py-4">No documents attached.</p>
              )
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
          <div className="flex flex-wrap gap-3">
            {canEdit && (
              <>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors disabled:opacity-60">
                  {saving ? <Clock className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  Save Progress
                </button>
                <button onClick={handleForward} disabled={saving || qualified.length === 0 || pending.length > 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                  <Send className="w-4 h-4" /> Forward for Financial Bid
                </button>
              </>
            )}

            {isForwarded && (
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Forwarded for financial bid — {qualified.length} qualified bidder{qualified.length !== 1 ? "s" : ""}
              </div>
            )}
          </div>

          {/* Validation hints */}
          {canEdit && bidders.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-1">
              {qualified.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> Mark at least one bidder as Qualified to forward.
                </p>
              )}
              {pending.length > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> {pending.length} bidder{pending.length !== 1 ? "s" : ""} still Under Review — complete evaluation before forwarding.
                </p>
              )}
              {qualified.length > 0 && pending.length === 0 && (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> Ready to forward — {qualified.length} qualified, {disqualified.length} disqualified.
                </p>
              )}
            </div>
          )}
        </div>

      </div>
    </>
  );
}
