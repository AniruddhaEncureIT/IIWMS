"use client";

import {
  useState, useEffect, useRef, useCallback, useMemo,
  type KeyboardEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search, X, FolderOpen, FileText, Gavel, FileCheck, ClipboardList,
  ArrowRight, Clock, Trash2, Command, CornerDownLeft, ChevronUp, ChevronDown,
  Hash, Building2, AlertCircle,
} from "lucide-react";
import {
  useGlobalSearch,
  addRecentSearch, getRecentSearches, clearRecentSearches,
  type ResultType, type SearchResult,
} from "@/hooks/use-global-search";
import { StatusBadge } from "@/components/dashboard/dash-shared";

// ─── Constants ─────────────────────────────────────────────────────────────────

type Category = "all" | ResultType;

const CATEGORY_META: Record<Category, {
  label: string; icon: React.ElementType;
  color: string; emptyHint: string; examples: string[];
}> = {
  all: {
    label: "All Results", icon: Search,
    color: "text-gray-600 dark:text-gray-300",
    emptyHint: "Try searching by project name, tender ID, or work order number.",
    examples: ["Bridge widening", "WO/2024", "MB/0042", "TEN-2024"],
  },
  project: {
    label: "Projects", icon: FolderOpen,
    color: "text-blue-600 dark:text-blue-400",
    emptyHint: "Search by project name, ID, division, taluka, or status.",
    examples: ["Nashik Road", "Pune Division", "LOA Issued", "PROJ-"],
  },
  document: {
    label: "Documents", icon: FileText,
    color: "text-green-600 dark:text-green-400",
    emptyHint: "Search by document name or type.",
    examples: ["LOA Signed", "Work Order", "DTP", "Agreement"],
  },
  tender: {
    label: "Tenders", icon: Gavel,
    color: "text-amber-600 dark:text-amber-400",
    emptyHint: "Search by tender ID or MahaTender reference.",
    examples: ["TEN-2024", "MH-GEM", "Class I", "Financial Bid"],
  },
  work_order: {
    label: "Work Orders", icon: FileCheck,
    color: "text-violet-600 dark:text-violet-400",
    emptyHint: "Search by work order number or contractor name.",
    examples: ["WO/2024", "Raj Constructions", "LOA Issued"],
  },
  mb: {
    label: "MB Numbers", icon: ClipboardList,
    color: "text-rose-600 dark:text-rose-400",
    emptyHint: "Search by MB number, status, or approver.",
    examples: ["MB/0042/001", "Verified by DE", "Net Payable"],
  },
};

const TYPE_ICON: Record<ResultType, React.ElementType> = {
  project:    FolderOpen,
  document:   FileText,
  tender:     Gavel,
  work_order: FileCheck,
  mb:         ClipboardList,
};

const TYPE_BADGE: Record<ResultType, string> = {
  project:    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  document:   "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  tender:     "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  work_order: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  mb:         "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
};

// ─── Highlight ─────────────────────────────────────────────────────────────────

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <>{text}</>;
  const escaped = query.trim().split(/\s+/).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const regex   = new RegExp(`(${escaped})`, "gi");
  const parts   = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part)
          ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-700/60 text-gray-900 dark:text-yellow-100 rounded-sm px-0.5 not-italic">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

// ─── Result card ───────────────────────────────────────────────────────────────

function ResultCard({
  result, query, isActive, onActivate, onOpen,
}: {
  result:     SearchResult;
  query:      string;
  isActive:   boolean;
  onActivate: () => void;
  onOpen:     () => void;
}) {
  const meta  = CATEGORY_META[result.type];
  const Icon  = TYPE_ICON[result.type];
  const ref   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive) ref.current?.scrollIntoView({ block: "nearest" });
  }, [isActive]);

  return (
    <div
      ref={ref}
      onMouseEnter={onActivate}
      onClick={onOpen}
      className={`group flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors rounded-xl border ${
        isActive
          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 shadow-sm"
          : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-700 hover:bg-blue-50/40 dark:hover:bg-blue-900/10"
      }`}
    >
      {/* Type icon */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
        isActive ? "bg-blue-100 dark:bg-blue-900/40" : "bg-gray-100 dark:bg-gray-700"
      }`}>
        <Icon className={`w-4 h-4 ${isActive ? meta.color : "text-gray-400"}`} aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${TYPE_BADGE[result.type]}`}>
            {CATEGORY_META[result.type].label.replace(/s$/, "")}
          </span>
          <span className="text-xs text-gray-400">matched on {result.matchedField}</span>
        </div>

        <p className={`text-sm font-semibold leading-snug mb-1 ${
          isActive ? "text-blue-900 dark:text-blue-100" : "text-gray-900 dark:text-white"
        }`}>
          <Highlight text={result.title} query={query} />
        </p>

        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mb-2">
          <Highlight text={result.subtitle} query={query} />
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          {result.meta.slice(0, 2).map((m) => (
            <span key={m} className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              {m}
            </span>
          ))}
          {result.type !== "project" && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Building2 className="w-3 h-3 shrink-0" aria-hidden="true" />
              <Highlight text={result.projectName} query={query} />
            </span>
          )}
        </div>
      </div>

      {/* Arrow */}
      <ArrowRight className={`w-4 h-4 shrink-0 mt-2.5 transition-transform ${
        isActive ? "text-blue-600 dark:text-blue-400 translate-x-0.5" : "text-gray-300 dark:text-gray-600"
      }`} aria-hidden="true" />
    </div>
  );
}

// ─── Category tab ──────────────────────────────────────────────────────────────

function CatTab({ cat, count, active, onClick }: {
  cat: Category; count: number; active: boolean; onClick: () => void;
}) {
  const meta = CATEGORY_META[cat];
  const Icon = meta.icon;
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
        active
          ? "bg-blue-600 text-white shadow-sm"
          : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
      }`}>
      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span className="flex-1 truncate">{meta.label}</span>
      {count > 0 && (
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
          active ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
        }`}>{count}</span>
      )}
    </button>
  );
}

// ─── Global search view ────────────────────────────────────────────────────────

export function GlobalSearchView() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const initialQ     = searchParams.get("q") ?? "";

  const [query,    setQuery]    = useState(initialQ);
  const [category, setCategory] = useState<Category>("all");
  const [activeIdx, setActiveIdx] = useState(0);
  const [recent,   setRecent]   = useState<string[]>([]);
  const inputRef   = useRef<HTMLInputElement>(null);

  // Load recent searches on mount
  useEffect(() => { setRecent(getRecentSearches()); }, []);

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Sync URL param → local query when navigating back/forward
  useEffect(() => { setQuery(initialQ); }, [initialQ]);

  const results  = useGlobalSearch(query);
  const hasQuery = query.trim().length > 0;

  // Displayed list (filtered by category)
  const displayed: SearchResult[] = useMemo(
    () => (category === "all" ? results.all : results[category]),
    [results, category]
  );

  // Reset activeIdx when displayed list changes
  useEffect(() => setActiveIdx(0), [displayed]);

  // Update URL (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      const next = query.trim()
        ? `/search?q=${encodeURIComponent(query.trim())}`
        : "/search";
      router.replace(next, { scroll: false });
    }, 200);
    return () => clearTimeout(t);
  }, [query, router]);

  const openResult = useCallback((r: SearchResult) => {
    addRecentSearch(query);
    setRecent(getRecentSearches());
    router.push(r.href);
  }, [query, router]);

  const openActive = useCallback(() => {
    if (displayed[activeIdx]) openResult(displayed[activeIdx]);
  }, [activeIdx, displayed, openResult]);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, displayed.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        openActive();
        break;
      case "Escape":
        e.preventDefault();
        setQuery("");
        inputRef.current?.focus();
        break;
    }
  }

  function setRecentQuery(q: string) {
    setQuery(q);
    inputRef.current?.focus();
  }

  function handleClearRecent() {
    clearRecentSearches();
    setRecent([]);
  }

  // Group all results by type for the "All" view
  const groups: { type: ResultType; items: SearchResult[] }[] = (
    [
      { type: "project"    as ResultType, items: results.project },
      { type: "tender"     as ResultType, items: results.tender },
      { type: "work_order" as ResultType, items: results.work_order },
      { type: "mb"         as ResultType, items: results.mb },
      { type: "document"   as ResultType, items: results.document },
    ] satisfies { type: ResultType; items: SearchResult[] }[]
  ).filter((g) => g.items.length > 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ── Search header ─────────────────────────────────────────── */}
      <div className="sticky top-14 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-5xl mx-auto px-5 py-4">
          <div className="relative flex items-center gap-3">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" aria-hidden="true" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search projects, documents, tenders, work orders, MB numbers…"
              className="flex-1 pl-12 pr-12 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-base text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 focus:border-transparent transition shadow-sm"
            />
            {query && (
              <button onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                aria-label="Clear search"
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Keyboard hints */}
          <div className="flex items-center gap-4 mt-2 px-1">
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-[10px] font-mono">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-[10px] font-mono flex items-center gap-0.5"><CornerDownLeft className="w-2.5 h-2.5" /></kbd> open
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-[10px] font-mono">Esc</kbd> clear
            </span>
            {hasQuery && results.total > 0 && (
              <span className="ml-auto text-xs text-gray-400">
                <strong className="text-gray-700 dark:text-gray-200">{results.total}</strong> result{results.total !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-5 py-6">
        {!hasQuery ? (
          /* ── Empty / start state ──────────────────────────────── */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent searches */}
            {recent.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" aria-hidden="true" />
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Recent Searches</h2>
                  </div>
                  <button onClick={handleClearRecent}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                    <Trash2 className="w-3 h-3" aria-hidden="true" /> Clear
                  </button>
                </div>
                <div className="space-y-1">
                  {recent.map((q) => (
                    <button key={q} onClick={() => setRecentQuery(q)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left group">
                      <Clock className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 shrink-0" aria-hidden="true" />
                      <span className="text-sm text-gray-700 dark:text-gray-200 flex-1 truncate">{q}</span>
                      <ArrowRight className="w-3 h-3 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search tips */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Hash className="w-4 h-4 text-gray-400" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Search Tips</h2>
              </div>
              <div className="space-y-3">
                {(Object.entries(CATEGORY_META) as [Category, typeof CATEGORY_META[Category]][])
                  .filter(([k]) => k !== "all")
                  .map(([type, meta]) => {
                    const Icon = meta.icon;
                    return (
                      <div key={type} className="flex items-start gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${TYPE_BADGE[type as ResultType]}`}>
                          <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{meta.label}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {meta.examples.map((ex, i) => (
                              <span key={ex}>
                                <button onClick={() => setRecentQuery(ex)}
                                  className="text-blue-500 dark:text-blue-400 hover:underline font-mono">{ex}</button>
                                {i < meta.examples.length - 1 ? ", " : ""}
                              </span>
                            ))}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        ) : results.total === 0 ? (
          /* ── No results ───────────────────────────────────────── */
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-14 text-center">
            <AlertCircle className="w-10 h-10 text-gray-200 dark:text-gray-600 mx-auto mb-3" aria-hidden="true" />
            <p className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-1">
              No results for &ldquo;{query}&rdquo;
            </p>
            <p className="text-sm text-gray-400 mb-5">Try a project name, tender ID, work order number, or MB number.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {CATEGORY_META.all.examples.map((ex) => (
                <button key={ex} onClick={() => setQuery(ex)}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-mono text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ── Results ──────────────────────────────────────────── */
          <div className="flex gap-6">
            {/* Sidebar: category filters */}
            <aside className="w-48 shrink-0">
              <div className="sticky top-36 space-y-1">
                <CatTab cat="all"        count={results.total}              active={category === "all"}        onClick={() => setCategory("all")} />
                <CatTab cat="project"    count={results.project.length}     active={category === "project"}    onClick={() => setCategory("project")} />
                <CatTab cat="tender"     count={results.tender.length}      active={category === "tender"}     onClick={() => setCategory("tender")} />
                <CatTab cat="work_order" count={results.work_order.length}  active={category === "work_order"} onClick={() => setCategory("work_order")} />
                <CatTab cat="mb"         count={results.mb.length}          active={category === "mb"}         onClick={() => setCategory("mb")} />
                <CatTab cat="document"   count={results.document.length}    active={category === "document"}   onClick={() => setCategory("document")} />
              </div>
            </aside>

            {/* Results list */}
            <div className="flex-1 min-w-0 space-y-3">
              {category === "all" ? (
                /* Grouped by type */
                groups.map(({ type, items }) => (
                  <div key={type}>
                    {/* Group header */}
                    <div className="flex items-center gap-2 mb-2">
                      {(() => { const Icon = TYPE_ICON[type]; return <Icon className={`w-3.5 h-3.5 ${CATEGORY_META[type].color}`} aria-hidden="true" />; })()}
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {CATEGORY_META[type].label}
                      </p>
                      <span className="text-xs text-gray-300 dark:text-gray-600">({items.length})</span>
                      <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
                      {items.length > 3 && (
                        <button onClick={() => setCategory(type)}
                          className="text-xs text-blue-500 dark:text-blue-400 hover:underline shrink-0 flex items-center gap-0.5">
                          All {items.length} <ArrowRight className="w-3 h-3" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                    <div className="space-y-2 mb-5">
                      {items.slice(0, 3).map((r, i) => {
                        // global index within the flat all-results list
                        const globalIdx = results.all.indexOf(r);
                        return (
                          <ResultCard
                            key={r.id}
                            result={r}
                            query={query}
                            isActive={activeIdx === globalIdx}
                            onActivate={() => setActiveIdx(globalIdx)}
                            onOpen={() => openResult(r)}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                /* Flat filtered list */
                <>
                  <p className="text-xs text-gray-400 mb-3">
                    {displayed.length} {CATEGORY_META[category].label.toLowerCase()} matching &ldquo;{query}&rdquo;
                  </p>
                  {displayed.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-10 text-center">
                      {(() => { const Icon = CATEGORY_META[category].icon; return <Icon className="w-8 h-8 text-gray-200 dark:text-gray-600 mx-auto mb-3" aria-hidden="true" />; })()}
                      <p className="text-sm text-gray-400">{CATEGORY_META[category].emptyHint}</p>
                    </div>
                  ) : (
                    displayed.map((r, i) => (
                      <ResultCard
                        key={r.id}
                        result={r}
                        query={query}
                        isActive={activeIdx === i}
                        onActivate={() => setActiveIdx(i)}
                        onOpen={() => openResult(r)}
                      />
                    ))
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
