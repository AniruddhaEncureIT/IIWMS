"use client";

import { useRef } from "react";
import { Upload, FileText, Image, BarChart2, X } from "lucide-react";
import { toast } from "sonner";
import type { UploadedFile, UploadedDocumentSet } from "./wizard-types";

const MB = 1024 * 1024;

interface Props {
  documentSets: UploadedDocumentSet;
  onChange: (sets: UploadedDocumentSet) => void;
  errors?: Record<string, string>;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / MB).toFixed(1)} MB`;
}

// ── Zone config ──────────────────────────────────────────────────────────────

interface ZoneConfig {
  key: keyof UploadedDocumentSet;
  label: string;
  accept: string;
  acceptLabel: string;
  maxBytes: number;
  Icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  borderColor: string;
  hoverBorder: string;
  hoverBg: string;
}

const ZONES: ZoneConfig[] = [
  {
    key: "drawings",
    label: "Upload Drawings",
    accept: ".pdf,.dwg",
    acceptLabel: "PDF, DWG · Max 20 MB each · Multiple files",
    maxBytes: 20 * MB,
    Icon: FileText,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-50 dark:bg-blue-900/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    hoverBorder: "hover:border-blue-400 dark:hover:border-blue-500",
    hoverBg: "hover:bg-blue-50/30 dark:hover:bg-blue-900/10",
  },
  {
    key: "sitePhotos",
    label: "Upload Site Photos",
    accept: ".png,.jpg,.jpeg",
    acceptLabel: "PNG, JPG · Max 10 MB each · Multiple files",
    maxBytes: 10 * MB,
    Icon: Image,
    iconColor: "text-green-500",
    iconBg: "bg-green-50 dark:bg-green-900/30",
    borderColor: "border-green-200 dark:border-green-800",
    hoverBorder: "hover:border-green-400 dark:hover:border-green-500",
    hoverBg: "hover:bg-green-50/30 dark:hover:bg-green-900/10",
  },
  {
    key: "surveyReports",
    label: "Upload Survey Reports",
    accept: ".pdf",
    acceptLabel: "PDF · Max 20 MB each · Multiple files",
    maxBytes: 20 * MB,
    Icon: BarChart2,
    iconColor: "text-purple-500",
    iconBg: "bg-purple-50 dark:bg-purple-900/30",
    borderColor: "border-purple-200 dark:border-purple-800",
    hoverBorder: "hover:border-purple-400 dark:hover:border-purple-500",
    hoverBg: "hover:bg-purple-50/30 dark:hover:bg-purple-900/10",
  },
];

// ── Upload Zone ──────────────────────────────────────────────────────────────

interface UploadZoneProps {
  zone: ZoneConfig;
  files: UploadedFile[];
  onAdd: (files: UploadedFile[]) => void;
  onRemove: (id: string) => void;
  error?: string;
}

function UploadZone({ zone, files, onAdd, onRemove, error }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function processFiles(raw: FileList | null) {
    if (!raw) return;
    const added: UploadedFile[] = [];
    const allowed = zone.accept.split(",").map((a) => a.trim().toLowerCase());
    const allowedLabel = allowed.map((a) => a.replace(".", "").toUpperCase()).join(", ");
    for (const f of Array.from(raw)) {
      const ext = "." + (f.name.split(".").pop() ?? "").toLowerCase();
      if (!allowed.includes(ext)) {
        toast.error(`Invalid file type. Allowed types: ${allowedLabel}`);
        continue;
      }
      if (f.size > zone.maxBytes) {
        toast.error(`${f.name} exceeds ${zone.maxBytes / MB} MB limit`);
        continue;
      }
      const url = URL.createObjectURL(f);
      added.push({ id: `doc-${Date.now()}-${Math.random()}`, name: f.name, size: f.size, url, type: f.type });
    }
    if (added.length) onAdd(added);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    processFiles(e.target.files);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    processFiles(e.dataTransfer.files);
  }

  const { Icon, iconColor, iconBg, borderColor, hoverBorder, hoverBg } = zone;

  return (
    <div className={`rounded-xl border ${error ? "border-red-400 dark:border-red-600" : borderColor} bg-white dark:bg-gray-800 shadow-sm overflow-hidden`}>
      {/* Zone header */}
      <div className={`flex items-center gap-2 px-5 py-3.5 border-b ${error ? "border-red-200 dark:border-red-800" : borderColor} bg-gray-50/80 dark:bg-gray-800/60`}>
        <Icon className={`w-4 h-4 ${iconColor}`} aria-hidden="true" />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{zone.label}</h3>
        {files.length > 0 && (
          <span className={`ml-auto text-xs font-semibold ${iconColor}`}>
            {files.length} file{files.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Drop zone */}
        <div
          role="button"
          tabIndex={0}
          aria-label={`${zone.label} — click or drag and drop`}
          className={`border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center ${hoverBorder} ${hoverBg} transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <input ref={inputRef} type="file" multiple accept={zone.accept} className="hidden" onChange={handleChange} />
          <div className="flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center`}>
              <Upload className={`w-5 h-5 ${iconColor}`} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                <span className={`font-semibold ${iconColor}`}>Choose Files</span> or drag and drop
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{zone.acceptLabel}</p>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400" role="alert">{error}</p>
        )}

        {/* File list */}
        {files.length > 0 && (
          <ul className="space-y-1.5">
            {files.map((file) => (
              <li key={file.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                <div className={`w-7 h-7 rounded-md ${iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-3.5 h-3.5 ${iconColor}`} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{file.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{file.size !== undefined ? formatBytes(file.size) : "—"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(file.id)}
                  className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  title="Remove"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Step 7 ───────────────────────────────────────────────────────────────────

export function Step7UploadDocuments({ documentSets, onChange, errors }: Props) {
  function addFiles(key: keyof UploadedDocumentSet, added: UploadedFile[]) {
    onChange({ ...documentSets, [key]: [...documentSets[key], ...added] });
  }

  function removeFile(key: keyof UploadedDocumentSet, id: string) {
    const file = documentSets[key].find((f) => f.id === id);
    if (file) URL.revokeObjectURL(file.url);
    onChange({ ...documentSets, [key]: documentSets[key].filter((f) => f.id !== id) });
  }

  return (
    <div className="space-y-6">
      {/* Step header */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0 mt-0.5" aria-hidden="true">7</div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Upload Documents</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Upload drawings, site photos, and survey reports. Multiple files supported per category.
          </p>
        </div>
      </div>

      {ZONES.map((zone) => (
        <UploadZone
          key={zone.key}
          zone={zone}
          files={documentSets[zone.key]}
          onAdd={(added) => addFiles(zone.key, added)}
          onRemove={(id) => removeFile(zone.key, id)}
          error={errors?.[zone.key]}
        />
      ))}
    </div>
  );
}
