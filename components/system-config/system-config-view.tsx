"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Settings, Upload, Image as ImageIcon, X, Check, Save, AlertCircle, Sun, Moon, Monitor, Globe, Clock, Building2, Palette, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { applyBrandScale } from "@/lib/brand";
import { saveLogo, loadLogo, removeLogo } from "@/lib/logo-storage";

// ─── Persistence keys ──────────────────────────────────────────────────────────

const LS_LOGO_KEY      = "iims_org_logo";
const LS_LOGO_DARK_KEY = "iims_org_logo_dark";
const LS_CONFIG_KEY    = "iims_general_config";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface GeneralConfig {
  orgName:         string;
  orgNameMarathi:  string;
  address:         string;
  phone:           string;
  email:           string;
  website:         string;
  sessionTimeout:  number;
  theme:           "light" | "dark" | "system";
  primaryColor:    string;
  dateFormat:      "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
  financialYearStart: string;
}

const DEFAULT_CONFIG: GeneralConfig = {
  orgName:            "Zilla Parishad, Pune",
  orgNameMarathi:     "जिल्हा परिषद, पुणे",
  address:            "701, Dr. Annie Besant Road, Shivajinagar, Pune, Maharashtra 411005",
  phone:              "+91 (020) 2552-3000",
  email:              "ceozp.pune@maharashtra.gov.in",
  website:            "www.punezilaparishad.in",
  sessionTimeout:     480,
  theme:              "light",
  primaryColor:       "#2563eb",
  dateFormat:         "DD/MM/YYYY",
  financialYearStart: "April",
};

function loadConfig(): GeneralConfig {
  try {
    const raw = localStorage.getItem(LS_CONFIG_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch { return DEFAULT_CONFIG; }
}

function saveConfig(cfg: GeneralConfig) {
  localStorage.setItem(LS_CONFIG_KEY, JSON.stringify(cfg));
  window.dispatchEvent(new StorageEvent("storage", { key: LS_CONFIG_KEY, newValue: JSON.stringify(cfg) }));
}


function dispatchLogoEvent(key: string, value: string | null) {
  window.dispatchEvent(new StorageEvent("storage", { key, newValue: value }));
}

// ─── Single logo slot ──────────────────────────────────────────────────────────

// Default IIMS product logo paths — treated as system assets, never removed
const DEFAULT_LOGO_LIGHT = "/iims_dark.png";   // colored logo for light theme
const DEFAULT_LOGO_DARK  = "/iims_light.png";  // white logo for dark theme

interface LogoSlotProps {
  storageKey:  string;
  label:       string;
  bgClass:     string;
  defaultSrc:  string;  // IIMS product logo — always shown when no custom logo uploaded
}

function LogoSlot({ storageKey, label, bgClass, defaultSrc }: LogoSlotProps) {
  const [customUrl, setCustomUrl] = useState<string | null>(null);
  const [dragging,  setDragging]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadLogo(storageKey).then(setCustomUrl); }, [storageKey]);

  // Always display something — custom upload takes precedence; IIMS default is the fallback
  const displayUrl = customUrl ?? defaultSrc;
  const isCustom   = customUrl !== null;

  const ALLOWED   = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
  const MAX_BYTES = 2 * 1024 * 1024;

  function validate(file: File): string | null {
    if (!ALLOWED.includes(file.type)) return "Only PNG, JPG, or SVG.";
    if (file.type !== "image/svg+xml" && file.size > MAX_BYTES) return "Max 2 MB.";
    return null;
  }

  const processFile = useCallback((file: File) => {
    const err = validate(file);
    if (err) { setError(err); return; }
    setError(null);
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      await saveLogo(storageKey, dataUrl);
      dispatchLogoEvent(storageKey, dataUrl);
      setCustomUrl(dataUrl);
      setUploading(false);
      toast.success(`${label} custom logo uploaded.`);
    };
    reader.onerror = () => { setError("Failed to read file."); setUploading(false); };
    reader.readAsDataURL(file);
  }, [storageKey, label]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  async function revertToDefault() {
    await removeLogo(storageKey);
    dispatchLogoEvent(storageKey, null);
    setCustomUrl(null);
    toast.success(`${label} reverted to IIMS default logo.`);
  }

  return (
    <div className="flex-1 min-w-0">
      {/* Label row with state badge */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
        {isCustom ? (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400">
            Custom
          </span>
        ) : (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
            IIMS Default
          </span>
        )}
      </div>

      {/* Preview — always shows a logo (default or custom) */}
      <div className={`w-full h-24 rounded-xl border-2 ${isCustom ? "border-blue-300 dark:border-blue-700" : "border-gray-200 dark:border-gray-600"} flex items-center justify-center overflow-hidden mb-3 ${bgClass}`}>
        <img src={displayUrl} alt={`${label} logo`} className="h-16 w-auto max-w-full object-contain p-1" />
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors text-xs font-medium ${
          dragging
            ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-600"
            : "border-gray-200 dark:border-gray-600 text-gray-400 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-700/30 hover:text-blue-500"
        }`}>
        {uploading
          ? <span className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
          : <><Upload className="w-3.5 h-3.5" />{dragging ? "Drop here" : isCustom ? "Replace" : "Upload custom logo"}</>
        }
        <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.svg" className="hidden" onChange={onFileChange} />
      </div>

      {error && <p className="text-[11px] text-red-500 mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3 shrink-0" />{error}</p>}

      {/* Revert button — only shown when a custom logo overrides the default */}
      {isCustom && (
        <button
          onClick={revertToDefault}
          className="mt-2 flex items-center gap-1 text-[11px] font-medium text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 transition-colors">
          <RotateCcw className="w-3 h-3" /> Revert to IIMS Default
        </button>
      )}
    </div>
  );
}

// ─── Logo Upload Section ───────────────────────────────────────────────────────

function LogoUploadSection() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
          <ImageIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Organization Branding</h3>
          <p className="text-xs text-gray-400 mt-0.5">Upload your organization logos to replace the IIMS defaults — shown in header, login, and documents</p>
        </div>
      </div>

      <div className="p-6 flex flex-col sm:flex-row gap-6">
        <LogoSlot
          storageKey={LS_LOGO_KEY}
          label="Light Theme"
          bgClass="bg-white"
          defaultSrc={DEFAULT_LOGO_LIGHT}
        />
        <div className="hidden sm:block w-px bg-gray-100 dark:bg-gray-700 self-stretch" />
        <LogoSlot
          storageKey={LS_LOGO_DARK_KEY}
          label="Dark Theme"
          bgClass="bg-gray-900"
          defaultSrc={DEFAULT_LOGO_DARK}
        />
      </div>

      <div className="px-6 pb-4 text-xs text-gray-400 space-y-1">
        <p>· PNG, JPG or SVG · Max 2 MB · Recommended: 300 × 80 px or wider</p>
        <p>· Uploaded logos replace the IIMS defaults — use &quot;Revert to IIMS Default&quot; to restore them</p>
        <p>· Changes apply to the header and login screen immediately</p>
      </div>
    </div>
  );
}

// ─── General Settings Section ──────────────────────────────────────────────────

const THEME_OPTIONS: { value: GeneralConfig["theme"]; label: string; icon: React.ElementType }[] = [
  { value: "light",  label: "Light",  icon: Sun     },
  { value: "dark",   label: "Dark",   icon: Moon    },
  { value: "system", label: "System", icon: Monitor },
];

const DATE_FORMATS: GeneralConfig["dateFormat"][] = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"];
const FY_MONTHS = ["April", "January", "July", "October"];
const TIMEOUT_OPTIONS = [
  { value: 60,   label: "1 hour" },
  { value: 120,  label: "2 hours" },
  { value: 240,  label: "4 hours" },
  { value: 480,  label: "8 hours (default)" },
  { value: 720,  label: "12 hours" },
  { value: 1440, label: "24 hours" },
];

const PRIMARY_COLORS = [
  { value: "#2563eb", label: "Government Blue" },
  { value: "#059669", label: "Forest Green" },
  { value: "#7c3aed", label: "Royal Purple" },
  { value: "#d97706", label: "Amber" },
  { value: "#dc2626", label: "Red" },
  { value: "#0284c7", label: "Sky Blue" },
];

function GeneralSettingsSection() {
  const { setTheme } = useTheme();
  const [config,  setConfig]  = useState<GeneralConfig>(DEFAULT_CONFIG);
  const [dirty,   setDirty]   = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState<Partial<Record<keyof GeneralConfig, string>>>({});

  useEffect(() => {
    const saved = loadConfig();
    setConfig(saved);
    applyBrandScale(saved.primaryColor);
  }, []);

  function set<K extends keyof GeneralConfig>(key: K, value: GeneralConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setDirty(true);
    if (key === "theme")        setTheme(value as string);
    if (key === "primaryColor") applyBrandScale(value as string);
  }

  function validate(): boolean {
    const e: Partial<Record<keyof GeneralConfig, string>> = {};
    if (!config.orgName.trim())        e.orgName        = "Organization name is required.";
    if (!config.orgNameMarathi.trim()) e.orgNameMarathi = "Marathi name is required.";
    if (!config.address.trim())        e.address        = "Address is required.";
    if (config.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.email)) e.email = "Invalid email address.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 300));
      saveConfig(config);
      setDirty(false);
      toast.success("General settings saved successfully.");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setConfig(DEFAULT_CONFIG);
    setErrors({});
    setDirty(true);
  }

  const inputCls = (err?: string) =>
    `w-full rounded-lg border ${err ? "border-red-400 dark:border-red-600 focus:ring-red-500" : "border-gray-200 dark:border-gray-600 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"} bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 transition`;

  return (
    <div className="space-y-5">
      {/* Organisation Identity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Organisation Identity</h3>
            <p className="text-xs text-gray-400 mt-0.5">Name and contact details displayed on official documents</p>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Org Name English */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Organisation Name (English) *</label>
            <input value={config.orgName} onChange={(e) => set("orgName", e.target.value)} placeholder="e.g. Zilla Parishad, Pune" className={inputCls(errors.orgName)} />
            {errors.orgName && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.orgName}</p>}
          </div>
          {/* Org Name Marathi */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Organisation Name (Marathi / मराठी) *</label>
            <input value={config.orgNameMarathi} onChange={(e) => set("orgNameMarathi", e.target.value)} placeholder="जिल्हा परिषद, पुणे" className={inputCls(errors.orgNameMarathi)} />
            {errors.orgNameMarathi && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.orgNameMarathi}</p>}
          </div>
          {/* Address */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Registered Address *</label>
            <textarea value={config.address} onChange={(e) => set("address", e.target.value)} rows={2} placeholder="Full office address…" className={`${inputCls(errors.address)} resize-none`} />
            {errors.address && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.address}</p>}
          </div>
          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Phone</label>
            <input value={config.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 (020) 2552-3000" className={inputCls()} />
          </div>
          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Official Email</label>
            <input type="email" value={config.email} onChange={(e) => set("email", e.target.value)} placeholder="ceo@zilaparishad.gov.in" className={inputCls(errors.email)} />
            {errors.email && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.email}</p>}
          </div>
          {/* Website */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Website</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input value={config.website} onChange={(e) => set("website", e.target.value)} placeholder="www.zilaparishad.gov.in" className={`${inputCls()} pl-9`} />
            </div>
          </div>
        </div>
      </div>

      {/* Theme Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
            <Palette className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Theme Settings</h3>
            <p className="text-xs text-gray-400 mt-0.5">Color theme and primary accent color for the interface</p>
          </div>
        </div>
        <div className="p-6 space-y-6">
          {/* Theme toggle */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2.5">Color Mode</label>
            <div className="flex gap-2">
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button key={value} type="button" onClick={() => set("theme", value)}
                  className={`flex-1 flex flex-col items-center gap-2 py-3 px-2 rounded-xl border-2 text-xs font-semibold transition-colors ${
                    config.theme === value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                      : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}>
                  <Icon className="w-5 h-5" />
                  {label}
                  {config.theme === value && <Check className="w-3.5 h-3.5 text-blue-500" />}
                </button>
              ))}
            </div>
          </div>

          {/* Primary color */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2.5">Primary Accent Color</label>
            <div className="flex flex-wrap gap-2">
              {PRIMARY_COLORS.map(({ value, label }) => (
                <button key={value} type="button" title={label} onClick={() => set("primaryColor", value)}
                  className={`w-9 h-9 rounded-lg border-2 transition-all ${config.primaryColor === value ? "border-gray-900 dark:border-white scale-110" : "border-transparent hover:scale-105"}`}
                  style={{ backgroundColor: value }}>
                  {config.primaryColor === value && <Check className="w-4 h-4 text-white mx-auto" />}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">Selected: {PRIMARY_COLORS.find((c) => c.value === config.primaryColor)?.label ?? config.primaryColor}</p>
          </div>
        </div>
      </div>

      {/* System Preferences */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">System Preferences</h3>
            <p className="text-xs text-gray-400 mt-0.5">Session, date format, and financial year settings</p>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Session timeout */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Session Timeout</label>
            <div className="relative">
              <select value={config.sessionTimeout} onChange={(e) => set("sessionTimeout", Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition">
                {TIMEOUT_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </select>
              <Clock className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Date format */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Date Format</label>
            <div className="relative">
              <select value={config.dateFormat} onChange={(e) => set("dateFormat", e.target.value as GeneralConfig["dateFormat"])}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition">
                {DATE_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <Globe className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Financial year start */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Financial Year Start</label>
            <div className="relative">
              <select value={config.financialYearStart} onChange={(e) => set("financialYearStart", e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 px-3 py-2.5 appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition">
                {FY_MONTHS.map((m) => <option key={m}>{m}</option>)}
              </select>
              <Globe className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Save bar */}
      {dirty && (
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg px-5 py-3.5">
          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            You have unsaved changes.
          </p>
          <div className="flex gap-2">
            <button onClick={handleReset} disabled={saving}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
              Reset to defaults
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
              {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              Save Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── System Config View (main export) ─────────────────────────────────────────

export function SystemConfigView() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Page header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-600 to-gray-700 flex items-center justify-center shadow-md">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">System Configuration</h1>
              <p className="text-sm text-gray-400 mt-0.5">Organization identity, logo, and interface preferences</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <LogoUploadSection />
        <GeneralSettingsSection />
      </div>
    </div>
  );
}
