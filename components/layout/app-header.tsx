"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Menu,
  Search,
  Sun,
  Moon,
  Bell,
  ChevronDown,
  Globe,
  LogOut,
  User,
  Mail,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileWarning,
  Info,
  CheckCheck,
  ArrowRight,
  Command,
  MoreVertical,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications, type INotification } from "@/hooks/use-notifications";
import { ChatTrigger } from "./floating-chat";
import { loadLogo } from "@/lib/logo-storage";

const LANGUAGES = [
  { code: "en", label: "EN", full: "English" },
  { code: "mr", label: "MR", full: "Marathi" },
  { code: "hi", label: "HI", full: "Hindi" },
] satisfies { code: string; label: string; full: string }[];

type Language = (typeof LANGUAGES)[number];

interface AppHeaderProps {
  onMenuOpen:    () => void;
  onChatOpen:    () => void;
  chatOpen:      boolean;
  isProcessing?: boolean;
}

function NotifIcon({ type }: { type: INotification["type"] }) {
  switch (type) {
    case "urgent":   return <AlertCircle  className="w-4 h-4 text-red-500"    />;
    case "returned": return <FileWarning  className="w-4 h-4 text-red-500"    />;
    case "pending":  return <Clock        className="w-4 h-4 text-amber-500"  />;
    case "approved": return <CheckCircle2 className="w-4 h-4 text-green-500"  />;
    default:         return <Info         className="w-4 h-4 text-blue-500"   />;
  }
}

function formatRelativeTime(ts: string): string {
  try {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  } catch {
    return "";
  }
}

export function AppHeader({ onMenuOpen, onChatOpen, chatOpen, isProcessing = false }: AppHeaderProps) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { user, logout } = useAuth();

  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen,  setUserOpen]  = useState(false);
  const [langOpen,  setLangOpen]  = useState(false);
  const [moreOpen,  setMoreOpen]  = useState(false);
  const [lang, setLang]           = useState<Language>(LANGUAGES[0]);
  const [search, setSearch]       = useState("");
  const [mounted,      setMounted]      = useState(false);
  const [orgLogoLight, setOrgLogoLight] = useState<string | null>(null);
  const [orgLogoDark,  setOrgLogoDark]  = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    loadLogo("iims_org_logo").then(setOrgLogoLight);
    loadLogo("iims_org_logo_dark").then(setOrgLogoDark);
    function onStorage(e: StorageEvent) {
      if (e.key === "iims_org_logo")      setOrgLogoLight(e.newValue);
      if (e.key === "iims_org_logo_dark") setOrgLogoDark(e.newValue);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef  = useRef<HTMLDivElement>(null);
  const langRef  = useRef<HTMLDivElement>(null);
  const moreRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current  && !userRef.current.contains(e.target as Node))  setUserOpen(false);
      if (langRef.current  && !langRef.current.contains(e.target as Node))  setLangOpen(false);
      if (moreRef.current  && !moreRef.current.contains(e.target as Node))  setMoreOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const { notifications, unreadCount: unread, readIds, markRead, markAllRead } = useNotifications(user?.role ?? "");
  const pendingCount = notifications.filter((n) => n.category === "action").length;
  const [panelTab, setPanelTab] = useState<"all" | "action" | "system">("all");

  const isDark    = mounted && resolvedTheme === "dark";
  const uploadedLogo = isDark ? (orgLogoDark ?? orgLogoLight) : orgLogoLight;
  const orgLogo   = uploadedLogo ?? (isDark ? "/iims_light.png" : "/iims_dark.png");

  const initials = user?.name
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "??";

  const handleLogout = async () => {
    setUserOpen(false);
    await logout();
    toast.success("Signed out successfully.");
    // Hard redirect — forces full page reload so middleware re-evaluates
    // the cleared cookie. Soft navigation leaves stale auth state.
    window.location.href = "/login";
  };

  const handleSearch = (e: { preventDefault(): void }) => {
    e.preventDefault();
    const q = search.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
      setSearch("");
    } else {
      router.push("/search");
    }
  };

  // Global Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        router.push("/search");
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <header
      role="banner"
      className="h-14 fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 lg:px-5"
    >
      {/* ── Hamburger (mobile + tablet, hidden on lg+) ─────────────── */}
      <button
        type="button"
        onClick={onMenuOpen}
        className="lg:hidden p-1.5 sm:p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shrink-0"
        aria-label="Open navigation menu"
        aria-expanded="false"
      >
        <Menu className="w-5 h-5" aria-hidden="true" />
      </button>

      {/* ── Logo zone — desktop: fixed w-64 matching sidebar width ─── */}
      <div className="hidden lg:flex items-center w-64 flex-shrink-0 -ml-5 px-4 h-full border-r border-gray-200 dark:border-gray-800">
        {mounted && (
          <img
            src={orgLogo}
            alt="Organisation logo"
            className="h-9 w-auto max-w-full object-contain"
          />
        )}
      </div>

      {/* ── Logo (mobile + tablet) ─────────────────────────────────── */}
      {mounted && (
        <img
          src={orgLogo}
          alt="Organisation logo"
          className="lg:hidden h-7 sm:h-8 w-auto max-w-[56px] sm:max-w-[100px] object-contain shrink-0 rounded"
        />
      )}

      {/* ── Search bar — hidden on mobile, shown sm+ ────────────────── */}
      <form
        onSubmit={handleSearch}
        role="search"
        aria-label="Search projects and tenders"
        className="hidden sm:block flex-1 min-w-0 max-w-md lg:ml-5"
      >
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects, tenders, MBs…"
            aria-label="Search"
            className="w-full pl-9 pr-14 sm:pr-16 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
          />
          {/* ⌘K hint — md+ only to prevent cramping on sm */}
          <kbd
            className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded pointer-events-none"
            aria-hidden="true"
          >
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </div>
      </form>

      {/* ── Right action cluster ───────────────────────────────────────── */}
      <div className="ml-auto flex items-center gap-0.5 shrink-0" role="toolbar" aria-label="Header actions">

        {/* Mobile-only search icon — navigates to /search page */}
        <button
          type="button"
          onClick={() => router.push("/search")}
          className="sm:hidden p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Search"
        >
          <Search className="w-4 h-4" aria-hidden="true" />
        </button>

        {/* IIMS Assistant */}
        <ChatTrigger
          onClick={onChatOpen}
          active={chatOpen}
          pendingCount={pendingCount}
          isProcessing={isProcessing}
        />

        {/* Language picker — sm+ only (mobile uses More menu) */}
        <div className="relative hidden sm:block" ref={langRef}>
          <button
            type="button"
            onClick={() => { setLangOpen((o) => !o); setNotifOpen(false); setUserOpen(false); setMoreOpen(false); }}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label={`Language: ${lang.full}`}
            aria-haspopup="true"
            aria-expanded={langOpen}
          >
            <Globe className="w-4 h-4" aria-hidden="true" />
            <span className="hidden md:inline tracking-wide">{lang.label}</span>
          </button>
          {langOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-1.5 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in"
            >
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  role="menuitem"
                  onClick={() => { setLang(l); setLangOpen(false); }}
                  className={[
                    "w-full text-left px-3 py-2.5 text-xs transition-colors",
                    lang.code === l.code
                      ? "text-blue-700 dark:text-blue-400 font-semibold bg-blue-50/60 dark:bg-blue-900/20"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700",
                  ].join(" ")}
                >
                  <span className="font-semibold">{l.label}</span>
                  <span className="ml-1.5 text-gray-400 font-normal">— {l.full}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme toggle — sm+ only (mobile uses More menu) */}
        <button
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="hidden sm:block p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
        >
          {mounted
            ? isDark
              ? <Sun  className="w-4 h-4" aria-hidden="true" />
              : <Moon className="w-4 h-4" aria-hidden="true" />
            : <Moon className="w-4 h-4" aria-hidden="true" />
          }
        </button>

        {/* More menu — mobile only: contains Language + Theme ──────── */}
        <div className="relative sm:hidden" ref={moreRef}>
          <button
            type="button"
            onClick={() => { setMoreOpen((o) => !o); setNotifOpen(false); setUserOpen(false); setLangOpen(false); }}
            className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="More options"
            aria-haspopup="true"
            aria-expanded={moreOpen}
          >
            <MoreVertical className="w-4 h-4" aria-hidden="true" />
          </button>

          {moreOpen && (
            <div
              role="menu"
              aria-label="More options"
              className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in"
            >
              {/* Display section */}
              <div className="px-3 pt-3 pb-2 border-b border-gray-100 dark:border-gray-700">
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
                  Display
                </p>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setTheme(isDark ? "light" : "dark"); setMoreOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-2 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {mounted ? (
                    isDark
                      ? <Sun  className="w-4 h-4 text-amber-500 shrink-0" aria-hidden="true" />
                      : <Moon className="w-4 h-4 text-indigo-500 shrink-0" aria-hidden="true" />
                  ) : (
                    <Moon className="w-4 h-4 text-indigo-500 shrink-0" aria-hidden="true" />
                  )}
                  <span>{isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}</span>
                </button>
              </div>

              {/* Language section */}
              <div className="px-3 pt-2.5 pb-2">
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
                  Language
                </p>
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    role="menuitem"
                    onClick={() => { setLang(l); setMoreOpen(false); }}
                    className={[
                      "w-full flex items-center gap-2 px-2 py-2 text-xs rounded-lg transition-colors",
                      lang.code === l.code
                        ? "text-blue-700 dark:text-blue-400 font-semibold bg-blue-50/60 dark:bg-blue-900/20"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700",
                    ].join(" ")}
                  >
                    <Globe className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span className="font-semibold">{l.label}</span>
                    <span className="text-gray-400 dark:text-gray-500 font-normal">— {l.full}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notifications bell ───────────────────────────────────────── */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => { setNotifOpen((o) => !o); setUserOpen(false); setLangOpen(false); setMoreOpen(false); }}
            className="relative p-1.5 sm:p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label={`Notifications — ${unread} unread`}
            aria-haspopup="true"
            aria-expanded={notifOpen}
          >
            <Bell className="w-4 h-4" aria-hidden="true" />
            {unread > 0 && (
              <span
                className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center text-[9px] font-bold bg-red-500 text-white rounded-full leading-none select-none"
                aria-label={`${unread} unread notifications`}
              >
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {notifOpen && (
            <div
              role="dialog"
              aria-label="Notifications panel"
              className="fixed left-2 right-2 top-[3.5rem] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:w-96 sm:mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in"
            >
              {/* Panel header */}
              <div className="px-4 pt-3.5 pb-0 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Notifications</h3>
                    {unread > 0 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-red-500 text-white rounded-full">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </div>
                  {unread > 0 && (
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      <CheckCheck className="w-3 h-3" aria-hidden="true" /> Mark all read
                    </button>
                  )}
                </div>
                {/* Filter tabs */}
                <div className="flex gap-0" role="tablist">
                  {(["all", "action", "system"] as const).map((tab) => {
                    const count = tab === "all"
                      ? notifications.length
                      : notifications.filter((n) => n.category === tab || (tab === "action" && n.category === "update")).length;
                    return (
                      <button
                        key={tab}
                        type="button"
                        role="tab"
                        aria-selected={panelTab === tab}
                        onClick={() => setPanelTab(tab)}
                        className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                          panelTab === tab
                            ? "border-blue-600 text-blue-700 dark:text-blue-400"
                            : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        }`}
                      >
                        {tab === "all" ? "All" : tab === "action" ? "Actions" : "System"}
                        {count > 0 && (
                          <span className="ml-1 text-[10px] text-gray-400">({count})</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notification list */}
              <ul
                role="tabpanel"
                className="max-h-[55vh] sm:max-h-[340px] overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/50"
              >
                {(() => {
                  const visible = notifications.filter((n) => {
                    if (panelTab === "all")    return true;
                    if (panelTab === "action") return n.category === "action" || n.category === "update";
                    return n.category === "system";
                  });
                  if (!visible.length) return (
                    <li className="px-4 py-10 text-center">
                      <Bell className="w-8 h-8 text-gray-200 dark:text-gray-700 mx-auto mb-2" aria-hidden="true" />
                      <p className="text-xs font-medium text-gray-400">No notifications here</p>
                    </li>
                  );
                  return visible.map((n) => {
                    const isRead = readIds.has(n.id);
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
                            !isRead ? "bg-blue-50/40 dark:bg-blue-900/10" : ""
                          }`}
                          onClick={() => {
                            markRead(n.id);
                            setNotifOpen(false);
                            if (n.actionHref) router.push(n.actionHref);
                            else if (n.projectId) router.push(`/project/${n.projectId}`);
                          }}
                        >
                          {!isRead && (
                            <span
                              className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-600 rounded-full"
                              aria-label="Unread"
                            />
                          )}
                          <div className="flex items-start gap-3 pl-2">
                            <div className="mt-0.5 shrink-0" aria-hidden="true">
                              <NotifIcon type={n.type} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs font-semibold truncate ${isRead ? "text-gray-600 dark:text-gray-300" : "text-gray-900 dark:text-white"}`}>
                                {n.title}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
                                {n.message}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <p className="text-[10px] text-gray-400 dark:text-gray-500">
                                  {formatRelativeTime(n.time)}
                                </p>
                                {n.actionLabel && (
                                  <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
                                    {n.actionLabel} <ArrowRight className="w-2.5 h-2.5" aria-hidden="true" />
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  });
                })()}
              </ul>

              {/* Panel footer */}
              <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <Link
                  href="/notifications"
                  onClick={() => setNotifOpen(false)}
                  className="flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors py-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  View all notifications <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5 sm:mx-1 shrink-0" aria-hidden="true" />

        {/* User dropdown ──────────────────────────────────────────────── */}
        <div className="relative" ref={userRef}>
          <button
            type="button"
            onClick={() => { setUserOpen((o) => !o); setNotifOpen(false); setLangOpen(false); setMoreOpen(false); }}
            className="flex items-center gap-1 sm:gap-2 pl-1.5 sm:pl-2 pr-1 sm:pr-1.5 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="User account menu"
            aria-haspopup="true"
            aria-expanded={userOpen}
          >
            {/* Avatar */}
            <div
              className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-[11px] font-bold shrink-0 select-none"
              aria-hidden="true"
            >
              {initials}
            </div>
            {/* Name + role — md+ only */}
            <div className="hidden md:flex flex-col items-start">
              <span className="text-xs font-semibold text-gray-900 dark:text-white leading-tight max-w-[110px] truncate">
                {user?.name}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight max-w-[110px] truncate">
                {user?.role}
              </span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 shrink-0 ${userOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>

          {userOpen && (
            <div
              role="menu"
              aria-label="User account options"
              className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in"
            >
              {/* User identity card */}
              <div className="px-4 py-4 bg-gradient-to-br from-blue-50 to-indigo-50/60 dark:from-blue-900/20 dark:to-indigo-900/15 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-sm font-bold select-none shrink-0"
                    aria-hidden="true"
                  >
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate leading-tight">{user?.name}</p>
                    <span className="inline-flex items-center mt-1 px-2 py-0.5 text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded-full">
                      {user?.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Account details */}
              <div className="px-4 py-3 space-y-2 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <User className="w-3.5 h-3.5 shrink-0 text-gray-400" aria-hidden="true" />
                  <span className="truncate">{user?.name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <Mail className="w-3.5 h-3.5 shrink-0 text-gray-400" aria-hidden="true" />
                  <span className="truncate">{user?.email}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="px-2 py-2">
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
