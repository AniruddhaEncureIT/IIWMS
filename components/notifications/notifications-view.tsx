"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, AlertCircle, Clock, CheckCircle2, FileWarning, Info,
  Search, X, CheckCheck, ArrowRight, Filter, Inbox,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications, type INotification } from "@/hooks/use-notifications";

// ─── helpers ───────────────────────────────────────────────────────────────────

function formatRelativeTime(ts: string): string {
  try {
    const diff = Date.now() - new Date(ts).getTime();
    const m    = Math.floor(diff / 60000);
    if (m < 1)   return "just now";
    if (m < 60)  return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24)  return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7)   return `${d}d ago`;
    return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch { return ""; }
}

function formatAbsoluteTime(ts: string): string {
  try {
    return new Date(ts).toLocaleString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return ts; }
}

function dayGroup(ts: string): "today" | "week" | "earlier" {
  try {
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 86400000)   return "today";
    if (diff < 604800000)  return "week";
    return "earlier";
  } catch { return "earlier"; }
}

// ─── Icon + colours per type ───────────────────────────────────────────────────

const TYPE_CONFIG = {
  urgent:   { icon: AlertCircle,  bg: "bg-red-100 dark:bg-red-900/30",    icon_c: "text-red-500",    badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",    label: "Urgent"   },
  returned: { icon: FileWarning,  bg: "bg-orange-100 dark:bg-orange-900/30", icon_c: "text-orange-500", badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", label: "Returned" },
  pending:  { icon: Clock,        bg: "bg-yellow-100 dark:bg-yellow-900/30", icon_c: "text-yellow-500", badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", label: "Pending"  },
  approved: { icon: CheckCircle2, bg: "bg-green-100 dark:bg-green-900/30",  icon_c: "text-green-500",  badge: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",  label: "Approved" },
  info:     { icon: Info,         bg: "bg-blue-100 dark:bg-blue-900/30",    icon_c: "text-blue-500",   badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",    label: "Info"     },
} as const;

const CAT_LABELS: Record<string, string> = {
  action: "Action Needed",
  update: "Updates",
  system: "System",
};

// ─── Notification Card ─────────────────────────────────────────────────────────

function NotifCard({
  notif, isRead, onMarkRead, onMarkUnread, onNavigate,
}: {
  notif:        INotification;
  isRead:       boolean;
  onMarkRead(): void;
  onMarkUnread(): void;
  onNavigate(): void;
}) {
  const cfg  = TYPE_CONFIG[notif.type];
  const Icon = cfg.icon;

  return (
    <div className={`group rounded-xl border transition-all ${
      isRead
        ? "border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800/60"
        : "border-blue-200 dark:border-blue-700/60 bg-blue-50/40 dark:bg-blue-900/10 shadow-sm"
    }`}>
      <div className="flex items-start gap-4 p-4">
        {/* Unread dot + icon */}
        <div className="relative shrink-0 mt-0.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cfg.bg}`}>
            <Icon className={`w-4.5 h-4.5 ${cfg.icon_c}`} aria-hidden="true" />
          </div>
          {!isRead && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-white dark:border-gray-800" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap mb-1">
            <h3 className={`text-sm font-semibold leading-snug ${isRead ? "text-gray-700 dark:text-gray-200" : "text-gray-900 dark:text-white"}`}>
              {notif.title}
            </h3>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${cfg.badge}`}>
              {cfg.label}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 shrink-0">
              {CAT_LABELS[notif.category] ?? notif.category}
            </span>
          </div>
          <p className={`text-xs leading-relaxed mb-2 ${isRead ? "text-gray-400 dark:text-gray-500" : "text-gray-600 dark:text-gray-300"}`}>
            {notif.message}
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <span title={formatAbsoluteTime(notif.time)} className="text-xs text-gray-400 dark:text-gray-500">
              {formatRelativeTime(notif.time)}
            </span>
            {notif.actionHref && notif.actionLabel && (
              <button onClick={onNavigate}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                {notif.actionLabel} <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Read/unread toggle */}
        <button
          onClick={isRead ? onMarkUnread : onMarkRead}
          title={isRead ? "Mark as unread" : "Mark as read"}
          className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:opacity-100">
          {isRead
            ? <Bell       className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
            : <CheckCheck className="w-3.5 h-3.5 text-blue-500" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}

// ─── Notifications View ────────────────────────────────────────────────────────

type TypeFilter = "all" | INotification["type"];
type CatFilter  = "all" | INotification["category"];

export function NotificationsView() {
  const router = useRouter();
  const { user } = useAuth();
  const { notifications, unreadCount, readIds, markRead, markAllRead, markUnread } = useNotifications(user?.role ?? "");

  const [search,     setSearch]     = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [catFilter,  setCatFilter]  = useState<CatFilter>("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return notifications.filter((n) => {
      const matchQ   = !q || n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
      const matchT   = typeFilter === "all" || n.type === typeFilter;
      const matchC   = catFilter  === "all" || n.category === catFilter;
      return matchQ && matchT && matchC;
    });
  }, [notifications, search, typeFilter, catFilter]);

  const groups = useMemo(() => {
    const today:   INotification[] = [];
    const week:    INotification[] = [];
    const earlier: INotification[] = [];
    filtered.forEach((n) => {
      const g = dayGroup(n.time);
      if (g === "today")   today.push(n);
      else if (g === "week") week.push(n);
      else earlier.push(n);
    });
    return { today, week, earlier };
  }, [filtered]);

  function handleNavigate(notif: INotification) {
    markRead(notif.id);
    if (notif.actionHref) router.push(notif.actionHref);
  }

  // Stats
  const total    = notifications.length;
  const urgent   = notifications.filter((n) => n.type === "urgent").length;
  const actions  = notifications.filter((n) => n.category === "action").length;
  const approved = notifications.filter((n) => n.type === "approved").length;

  const TypeBtn = ({ value, label }: { value: TypeFilter; label: string }) => {
    const count = value === "all" ? notifications.length : notifications.filter((n) => n.type === value).length;
    return (
      <button onClick={() => setTypeFilter(value)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${typeFilter === value ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
        {label}
        {count > 0 && (
          <span className={`px-1.5 py-0 rounded-full text-[10px] font-bold ${typeFilter === value ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}>
            {count}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-3xl mx-auto px-5 py-5">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md relative shrink-0">
                <Bell className="w-5 h-5 text-white" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full border-2 border-white dark:border-gray-800">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Notifications</h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}` : "All caught up"}
                  {user?.role && <> · {user.role}</>}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 text-sm font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors shrink-0">
                <CheckCheck className="w-4 h-4" aria-hidden="true" /> Mark all read
              </button>
            )}
          </div>

          {/* ── Stats ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total",          value: total,    color: "text-gray-900 dark:text-white",  bg: "bg-gray-50 dark:bg-gray-700/40 border-gray-200 dark:border-gray-600" },
              { label: "Unread",         value: unreadCount, color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700" },
              { label: "Action Needed",  value: actions,  color: "text-red-700 dark:text-red-300",  bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700" },
              { label: "Approved",       value: approved, color: "text-green-700 dark:text-green-300", bg: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700" },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`rounded-xl border p-3 ${bg}`}>
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-5 space-y-4">
        {/* ── Filters ───────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications…"
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition" />
            {search && (
              <button onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded">
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Type filter */}
          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />
            <TypeBtn value="all"      label="All" />
            <TypeBtn value="urgent"   label="Urgent" />
            <TypeBtn value="returned" label="Returned" />
            <TypeBtn value="pending"  label="Pending" />
            <TypeBtn value="approved" label="Approved" />
            <TypeBtn value="info"     label="Info" />
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-400 shrink-0">Category:</span>
            {(["all", "action", "update", "system"] as const).map((c) => (
              <button key={c} onClick={() => setCatFilter(c)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${catFilter === c ? "bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
                {c === "all" ? "All Categories" : CAT_LABELS[c]}
              </button>
            ))}
          </div>
        </div>

        {/* ── Notification list ──────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-14 text-center shadow-sm">
            <Inbox className="w-10 h-10 text-gray-200 dark:text-gray-600 mx-auto mb-3" aria-hidden="true" />
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              {search ? `No notifications match "${search}"` : "No notifications here"}
            </p>
            {(search || typeFilter !== "all" || catFilter !== "all") && (
              <button onClick={() => { setSearch(""); setTypeFilter("all"); setCatFilter("all"); }}
                className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {(["today", "week", "earlier"] as const).map((group) => {
              const items = groups[group];
              if (!items.length) return null;
              const groupLabel = group === "today" ? "Today" : group === "week" ? "This Week" : "Earlier";
              return (
                <div key={group}>
                  <div className="flex items-center gap-3 mb-3">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{groupLabel}</p>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    <span className="text-xs text-gray-400">{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((n) => (
                      <NotifCard
                        key={n.id}
                        notif={n}
                        isRead={readIds.has(n.id)}
                        onMarkRead={() => markRead(n.id)}
                        onMarkUnread={() => markUnread(n.id)}
                        onNavigate={() => handleNavigate(n)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filtered.length > 0 && (
          <p className="text-xs text-center text-gray-400 py-2">
            Showing {filtered.length} of {total} notification{total !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
