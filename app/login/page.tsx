"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Sun,
  Moon,
  Globe,
  Eye,
  EyeOff,
  RefreshCw,
  LogIn,
  ChevronDown,
} from "lucide-react";
import { store } from "@/store/iims.store";
import { authService } from "@/services/auth.service";
import { useAuth } from "@/hooks/use-auth";
import type { UserRole } from "@/types/auth.types";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_ROLES: UserRole[] = [
  "Accountant",
  "Additional Chief Executive Officer",
  "Assistant Accounts Officer",
  "Auditor",
  "Chief Accounts and Finance Officer",
  "Chief Executive Officer",
  "Contractor",
  "Deputy Engineer",
  "Executive Engineer",
  "Sectional Engineer",
  "System Administrator",
  "Technical System Configurator",
  "Tender Clerk",
];

const ROLE_CREDENTIALS: Record<string, { email: string; password: string }> = {
  "Sectional Engineer":                  { email: "se@iims.gov.in",           password: "se123" },
  "Deputy Engineer":                     { email: "de@iims.gov.in",           password: "de123" },
  "Executive Engineer":                  { email: "ee@iims.gov.in",           password: "ee123" },
  "Tender Clerk":                        { email: "clerk@iims.gov.in",        password: "clerk123" },
  "Auditor":                             { email: "auditor@iims.gov.in",      password: "auditor123" },
  "Accountant":                          { email: "accountant@iims.gov.in",   password: "accountant123" },
  "Assistant Accounts Officer":          { email: "aao@iims.gov.in",          password: "aao123" },
  "Chief Accounts and Finance Officer":  { email: "cafo@iims.gov.in",         password: "cafo123" },
  "Additional Chief Executive Officer":  { email: "addl-ceo@iims.gov.in",     password: "addlceo123" },
  "Chief Executive Officer":             { email: "ceo@iims.gov.in",          password: "ceo123" },
  "System Administrator":                { email: "admin@iims.gov.in",        password: "admin123" },
  "Contractor":                          { email: "contractor@iims.gov.in",   password: "contractor123" },
  "Technical System Configurator":       { email: "configurator@iims.gov.in", password: "config123" },
};

const LANGUAGES = [
  { code: "en", label: "EN", full: "English" },
  { code: "mr", label: "MR", full: "Marathi" },
  { code: "hi", label: "HI", full: "Hindi" },
];

// ─── CAPTCHA helper ───────────────────────────────────────────────────────────

function generateCaptchaText(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function drawCaptcha(canvas: HTMLCanvasElement, text: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;

  // Background
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#f0f4ff";
  ctx.fillRect(0, 0, w, h);

  // Noise lines
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = `hsl(${Math.random() * 360},60%,70%)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.random() * w, Math.random() * h);
    ctx.lineTo(Math.random() * w, Math.random() * h);
    ctx.stroke();
  }

  // Noise dots
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `hsl(${Math.random() * 360},60%,60%)`;
    ctx.beginPath();
    ctx.arc(Math.random() * w, Math.random() * h, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Characters
  const charW = w / (text.length + 1);
  text.split("").forEach((ch, i) => {
    ctx.save();
    ctx.font = `bold ${18 + Math.random() * 6}px monospace`;
    ctx.fillStyle = `hsl(${220 + Math.random() * 40},60%,30%)`;
    ctx.translate(charW * (i + 0.8), h / 2 + 6);
    ctx.rotate((Math.random() - 0.5) * 0.5);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });
}

// ─── Login Page (inner — needs Suspense for useSearchParams) ─────────────────

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTheme, resolvedTheme } = useTheme();
  const { login: contextLogin } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Form state
  const [selectedRole, setSelectedRole] = useState<UserRole | "">("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // CAPTCHA state — initialized in effect to avoid SSR/client mismatch
  const [captchaText, setCaptchaText]   = useState("AAAAAA");
  const [captchaInput, setCaptchaInput] = useState("");

  // UI state
  const [submitting, setSubmitting]       = useState(false);
  const [langOpen, setLangOpen]           = useState(false);
  const [roleOpen, setRoleOpen]           = useState(false);
  const [lang, setLang]                   = useState(LANGUAGES[0]);
  const [mounted, setMounted]             = useState(false);

  // Logo state — read from localStorage (uploaded by System Admin)
  const [orgLogoLight, setOrgLogoLight] = useState<string | null>(null);
  const [orgLogoDark,  setOrgLogoDark]  = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const text = generateCaptchaText();
    setCaptchaText(text);
    setOrgLogoLight(localStorage.getItem("iims_org_logo"));
    setOrgLogoDark(localStorage.getItem("iims_org_logo_dark"));
    function onStorage(e: StorageEvent) {
      if (e.key === "iims_org_logo")      setOrgLogoLight(e.newValue);
      if (e.key === "iims_org_logo_dark") setOrgLogoDark(e.newValue);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Redirect if already logged in — respects token expiry
  useEffect(() => {
    if (authService.getStoredSession()) router.replace("/dashboard");
  }, [router]);

  // Draw CAPTCHA whenever text changes
  useEffect(() => {
    if (canvasRef.current) drawCaptcha(canvasRef.current, captchaText);
  }, [captchaText, mounted]);

  const refreshCaptcha = useCallback(() => {
    const next = generateCaptchaText();
    setCaptchaText(next);
    setCaptchaInput("");
  }, []);

  // Auto-fill credentials and CAPTCHA when role is selected
  const handleRoleSelect = useCallback((role: UserRole) => {
    setSelectedRole(role);
    setRoleOpen(false);
    const creds = ROLE_CREDENTIALS[role];
    if (creds) {
      setEmail(creds.email);
      setPassword(creds.password);
    }
    setCaptchaInput(captchaText);
  }, [captchaText]);

  const handleSubmit = useCallback(
    async (e: { preventDefault(): void }) => {
      e.preventDefault();

      if (!selectedRole) {
        toast.error("Please select your role.");
        return;
      }
      if (!email.trim() || !password.trim()) {
        toast.error("Email and password are required.");
        return;
      }
      if (captchaInput.trim().toLowerCase() !== captchaText.toLowerCase()) {
        toast.error("Incorrect CAPTCHA. Please try again.");
        refreshCaptcha();
        return;
      }

      setSubmitting(true);

      try {
        // authService validates credentials, stores tokens with 8-hour expiry,
        // sets the middleware cookie, and updates AuthProvider state
        await contextLogin({ email: email.trim(), password: password.trim() });

        // Update lastLogin timestamp for admin display
        const iUsers = store.getAllUsers();
        const iUser = iUsers.find((u) => u.email === email.trim());
        if (iUser) store.updateLastLogin(iUser.id);

        const session = authService.getStoredSession();
        toast.success(`Welcome, ${session?.user.name ?? "User"}!`, {
          description: session?.user.role,
        });

        // Hard redirect — forces middleware to re-evaluate the new auth cookie.
        // Soft navigation (router.push) skips middleware and leaves the page stale.
        const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
        await new Promise(resolve => setTimeout(resolve, 600)); // let toast render
        window.location.href = callbackUrl;
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Invalid credentials. Please check your email and password."
        );
        setSubmitting(false);
        refreshCaptcha();
      }
    },
    [selectedRole, email, password, captchaInput, captchaText, refreshCaptcha, router, searchParams, contextLogin]
  );

  const isDark = mounted && resolvedTheme === "dark";
  const uploadedLogo = isDark ? (orgLogoDark ?? orgLogoLight) : orgLogoLight;
  const orgLogo = uploadedLogo ?? (isDark ? "/iims_light.png" : "/iims_dark.png");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-[hsl(222,28%,9%)] dark:to-gray-900 flex flex-col">
      {/* ── Top Controls ─────────────────────────────────────────────────── */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        {/* Language picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setLangOpen((o) => !o); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
          >
            <Globe className="w-3.5 h-3.5" />
            {lang.label}
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>
          {langOpen && (
            <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-50">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => { setLang(l); setLangOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors ${
                    lang.code === l.code
                      ? "text-blue-600 dark:text-blue-400 font-medium bg-blue-50/50 dark:bg-gray-700/50"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {l.label} — {l.full}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
          aria-label="Toggle theme"
        >
          {mounted ? (
            isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* ── Center card ───────────────────────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center p-4 pt-16">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-600 overflow-hidden">
            {/* ── Logo / IIMS header ────────────────────────────────── */}
            <div className="px-8 pt-8 pb-6 border-b border-gray-100 dark:border-gray-800 text-center">
              <div className="inline-flex flex-col items-center">
                {mounted && (
                  <img
                    src={orgLogo}
                    alt="Organisation logo"
                    className="h-16 w-auto max-w-[260px] object-contain mb-2"
                  />
                )}
                <span className="mt-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-[0.14em] leading-tight">
                  Integrated Infrastructure Management System
                </span>
                <span className="mt-1.5 text-[10px] text-gray-400 dark:text-gray-500 tracking-wide">
                  Zilla Parishad · Pune Division · Government of Maharashtra
                </span>
              </div>
            </div>

            <div className="px-8 py-6">
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* ── Role dropdown ─────────────────────────────────────── */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Select Role <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setRoleOpen((o) => !o)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-sm border rounded-lg bg-white dark:bg-gray-800 transition-colors text-left ${
                        roleOpen
                          ? "border-blue-500 ring-2 ring-blue-500/20"
                          : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                      } ${selectedRole ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}`}
                    >
                      <span className="truncate">
                        {selectedRole || "Select your official role"}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${roleOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {roleOpen && (
                      <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden">
                        <div className="max-h-56 overflow-y-auto">
                          {ALL_ROLES.map((role) => (
                            <button
                              key={role}
                              type="button"
                              onClick={() => handleRoleSelect(role)}
                              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-50 dark:border-gray-700/50 last:border-0 ${
                                selectedRole === role
                                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium"
                                  : "text-gray-700 dark:text-gray-300"
                              }`}
                            >
                              {role}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Email ─────────────────────────────────────────────── */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5"
                  >
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.name@iims.gov.in"
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
                  />
                </div>

                {/* ── Password ──────────────────────────────────────────── */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5"
                  >
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* ── CAPTCHA ───────────────────────────────────────────── */}
                <div>
                  <label
                    htmlFor="captcha"
                    className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5"
                  >
                    CAPTCHA Verification <span className="text-red-500">*</span>
                  </label>

                  <div className="flex items-center gap-3 mb-2">
                    {/* Canvas */}
                    <canvas
                      ref={canvasRef}
                      width={160}
                      height={44}
                      className="rounded-lg border border-gray-200 dark:border-gray-600 select-none"
                    />
                    {/* Refresh */}
                    <button
                      type="button"
                      onClick={refreshCaptcha}
                      className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
                      aria-label="Refresh CAPTCHA"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>

                  <input
                    id="captcha"
                    type="text"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                    placeholder="Enter the characters above"
                    maxLength={6}
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors tracking-widest font-mono"
                  />
                </div>

                {/* ── Submit ────────────────────────────────────────────── */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm mt-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      Sign In to IIMS
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
            © 2026 Zilla Parishad, Pune Division &mdash; Government of Maharashtra
          </p>
        </div>
      </main>
    </div>
  );
}

// ─── Page export — Suspense required for useSearchParams() in Next.js 15 ─────

function LoginSkeleton() {
  return (
    <div className="min-h-screen bg-blue-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}
