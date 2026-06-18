"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, X, ChevronDown, AlertCircle } from "lucide-react";
import type { RateItem, AppliedCharge } from "./wizard-types";
import type { ICharge } from "@/types/iims.types";

// ── Sample SSR master data — Item Number dropdown ─────────────────────────────
const SSR_ITEMS = [
  {
    itemNumber: "24.01",
    description:
      "Providing and laying Cast in situ/Ready Mix cement concrete in M-10 of trap/granite/quartzite/gneiss metal for foundation and bedding including bailing out water, steel centering, formwork, laying/pumping, compacting, roughening if special finish is required, finishing if required and curing complete, with fully automatic microprocessor based PLC with SCADA enabled reversible Drum Type mixer/concrete Batch mix plant (Pan mixer) etc. complete. With fine aggregate (Natural Sand / Crushed Sand VSI Grade finely washed etc.) : PWD-2022-2023",
  },
  {
    itemNumber: "21.40",
    description:
      "Providing soling using 80 mm size trap metal in 15 cm layer including filling voids with crushed sand/grit, ramming, watering etc. complete.",
  },
  {
    itemNumber: "2.10",
    description:
      "Excavation for roadway in earth, soil of all sorts, sand, gravel or soft murum including dressing section to the required grade, camber and side slopes and conveying the excavated materials with all lifts up to a lead of 50m and spreading for embankment or stacking as directed. By Manual Means. (with prior permission of S.E.)",
  },
] as const;

interface Props {
  items:                  RateItem[];
  onChange:               (items: RateItem[]) => void;
  availableCharges:       ICharge[];       // all active charges from store
  appliedCharges:         AppliedCharge[]; // user-configured selection with editable %
  onAppliedChargesChange: (charges: AppliedCharge[]) => void;
  errors?:                Record<string, string>;
}

// ── Style tokens ──────────────────────────────────────────────────────────────
const input =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 text-sm transition-colors";
const readonlyCls =
  "w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 text-sm cursor-not-allowed";
const fieldLabel =
  "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5";

// ── Rate item calculation ─────────────────────────────────────────────────────
function calcTotal(item: RateItem) {
  return (
    (item.materialComponents || 0) +
    (item.laborComponents    || 0) +
    (item.machineryComponents || 0) +
    (item.baseRate           || 0)
  );
}

// ── Item Number dropdown (3 fixed options, no search) ─────────────────────────
interface ItemDropdownProps {
  value:    string;
  onSelect: (itemNumber: string, description: string) => void;
  hasError?: boolean;
}

function ItemNumberDropdown({ value, onSelect, hasError }: ItemDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref             = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const selected = SSR_ITEMS.find((s) => s.itemNumber === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={hasError || undefined}
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 ${
          hasError
            ? "border-red-500 dark:border-red-400 focus:ring-red-500/40 focus:border-red-500 bg-white dark:bg-gray-700"
            : open
            ? "border-blue-500 focus:ring-blue-500/40 bg-white dark:bg-gray-700"
            : "border-gray-300 dark:border-gray-600 focus:ring-blue-500/40 bg-white dark:bg-gray-700"
        } text-gray-900 dark:text-gray-100`}
      >
        <span className={selected ? "font-mono font-semibold text-blue-700 dark:text-blue-300" : "text-gray-400 dark:text-gray-500"}>
          {selected ? selected.itemNumber : "Select item number…"}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-150 shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div role="listbox" className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black/5 overflow-hidden">
          {SSR_ITEMS.map((s) => (
            <button
              key={s.itemNumber}
              type="button"
              role="option"
              aria-selected={s.itemNumber === value}
              onClick={() => { onSelect(s.itemNumber, s.description); setOpen(false); }}
              className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 last:border-0 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
                s.itemNumber === value ? "bg-blue-50 dark:bg-blue-900/30" : ""
              }`}
            >
              <span className={`font-mono text-sm font-bold ${s.itemNumber === value ? "text-blue-700 dark:text-blue-300" : "text-blue-600 dark:text-blue-400"}`}>
                {s.itemNumber}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Charge row — searchable type dropdown + editable % ────────────────────────
interface ChargeRowProps {
  charge:           AppliedCharge;
  rowIndex:         number;
  availableCharges: ICharge[];
  allApplied:       AppliedCharge[];
  onChange:         (patch: AppliedCharge) => void;
  onRemove:         () => void;
}

function ChargeRow({ charge, rowIndex, availableCharges, allApplied, onChange, onRemove }: ChargeRowProps) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState("");
  const dropRef             = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  // Exclude charge types selected in other rows to prevent duplicates
  const otherIds = allApplied
    .filter((_, i) => i !== rowIndex)
    .map((a) => a.chargeId);

  const options = availableCharges
    .filter((c) => !otherIds.includes(c.id))
    .filter((c) => !search || c.type.toLowerCase().includes(search.toLowerCase()));

  return (
    // Flat row — no card, no overflow-hidden — lets the dropdown escape freely
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_9rem_auto] gap-3 items-end py-3 border-b border-gray-100 dark:border-gray-700/60 last:border-0">
      {/* Charge Type — searchable dropdown */}
      <div>
        <label className={fieldLabel}>
          Charge Type <span className="text-red-500">*</span>
        </label>
        <div ref={dropRef} className="relative">
          <input
            type="text"
            className={`${input} pr-8`}
            placeholder="Search or select charge type…"
            value={open ? search : charge.type}
            onFocus={() => { setOpen(true); setSearch(""); }}
            onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
            aria-autocomplete="list"
            aria-expanded={open}
          />
          <ChevronDown
            className={`w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 transition-transform duration-150 pointer-events-none ${open ? "rotate-180" : ""}`}
          />
          {open && (
            <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black/5 max-h-48 overflow-y-auto">
              {options.length === 0 ? (
                <p className="px-3 py-2.5 text-sm text-gray-400 dark:text-gray-500">
                  {search ? "No matching charges" : "All charges already applied"}
                </p>
              ) : (
                options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onChange({ chargeId: opt.id, type: opt.type, percentage: opt.percentage });
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`w-full text-left px-3 py-2.5 text-sm border-b border-gray-100 dark:border-gray-700/50 last:border-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${
                      opt.id === charge.chargeId
                        ? "bg-blue-50 dark:bg-blue-900/30 font-semibold text-blue-700 dark:text-blue-300"
                        : "text-gray-800 dark:text-gray-200"
                    }`}
                  >
                    <span>{opt.type}</span>
                    <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">({opt.percentage}% configured)</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Percentage — editable */}
      <div>
        <label className={fieldLabel}>Percentage (%)</label>
        <div className="relative">
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            className={`${input} pr-7`}
            value={charge.percentage}
            onChange={(e) =>
              onChange({ ...charge, percentage: parseFloat(e.target.value) || 0 })
            }
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs select-none">%</span>
        </div>
      </div>

      {/* Remove button — aligned with inputs */}
      <button
        type="button"
        onClick={onRemove}
        className="self-end mb-0.5 p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        aria-label={`Remove charge ${rowIndex + 1}`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Main Step ─────────────────────────────────────────────────────────────────
export function Step4RateAnalysis({
  items,
  onChange,
  availableCharges,
  appliedCharges,
  onAppliedChargesChange,
  errors,
}: Props) {
  // ── Rate item helpers ──────────────────────────────────────────────────────
  function add() {
    onChange([
      ...items,
      {
        id: `ra-${Date.now()}`,
        itemNumber: "",
        itemDescription: "",
        materialComponents: 0,
        laborComponents: 0,
        machineryComponents: 0,
        baseRate: 0,
        totalRate: 0,
        remarks: "",
      },
    ]);
  }

  function remove(id: string) {
    onChange(items.filter((i) => i.id !== id));
  }

  function update(id: string, patch: Partial<RateItem>) {
    onChange(
      items.map((i) => {
        if (i.id !== id) return i;
        const updated = { ...i, ...patch };
        updated.totalRate = calcTotal(updated);
        return updated;
      })
    );
  }

  // ── Charge helpers ─────────────────────────────────────────────────────────
  function addCharge() {
    const next = availableCharges.find(
      (c) => !appliedCharges.some((a) => a.chargeId === c.id)
    );
    if (!next) return;
    onAppliedChargesChange([
      ...appliedCharges,
      { chargeId: next.id, type: next.type, percentage: next.percentage },
    ]);
  }

  function removeCharge(idx: number) {
    onAppliedChargesChange(appliedCharges.filter((_, i) => i !== idx));
  }

  function updateCharge(idx: number, patch: AppliedCharge) {
    onAppliedChargesChange(
      appliedCharges.map((c, i) => (i === idx ? patch : c))
    );
  }

  // ── Derived totals ─────────────────────────────────────────────────────────
  const baseAmount    = items.reduce((s, i) => s + (i.totalRate || 0), 0);
  const chargeDetails = appliedCharges.map((ac) => ({
    ...ac,
    amount: (baseAmount * ac.percentage) / 100,
  }));
  const totalCharges  = chargeDetails.reduce((s, c) => s + c.amount, 0);
  const tsAmount      = baseAmount + totalCharges;

  const canAddMore =
    availableCharges.length > 0 &&
    appliedCharges.length < availableCharges.length;

  return (
    <div className="space-y-6">
      {/* Step header */}
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0 mt-0.5"
          aria-hidden="true"
        >
          4
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Rate Analysis</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Define rate components for each work item.
          </p>
        </div>
      </div>

      {/* ── Rate items ── */}
      <div className="space-y-4">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden"
          >
            {/* Card header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Rate Item {idx + 1}
              </span>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="p-1 rounded text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  aria-label={`Remove rate item ${idx + 1}`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Card body */}
            <div className="p-4 space-y-4">
              {/* Row 1: Item Number */}
              <div>
                <label className={fieldLabel}>
                  Item Number <span className="text-red-500">*</span>
                </label>
                <ItemNumberDropdown
                  value={item.itemNumber}
                  onSelect={(num, desc) =>
                    update(item.id, { itemNumber: num, itemDescription: desc })
                  }
                  hasError={!!errors?.[`itemNumber_${item.id}`]}
                />
                {errors?.[`itemNumber_${item.id}`] && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
                    {errors[`itemNumber_${item.id}`]}
                  </p>
                )}
              </div>

              {/* Row 2: Description — full-width, read-only */}
              <div>
                <label className={fieldLabel}>Description</label>
                {item.itemDescription ? (
                  <div
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg
                               bg-gray-50 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300
                               text-sm leading-relaxed break-words whitespace-pre-wrap min-h-[3rem]"
                    aria-readonly="true"
                  >
                    {item.itemDescription}
                  </div>
                ) : (
                  <div className="w-full px-3 py-2.5 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg text-gray-400 dark:text-gray-600 text-sm italic min-h-[2.5rem] flex items-center">
                    Description will appear after selecting an item number
                  </div>
                )}
              </div>

              {/* Remaining rate component fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={fieldLabel}>Material Components (₹)</label>
                  <input
                    type="number" min="0" className={input} placeholder="0"
                    value={item.materialComponents || ""}
                    onChange={(e) => update(item.id, { materialComponents: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className={fieldLabel}>Labor Components (₹)</label>
                  <input
                    type="number" min="0" className={input} placeholder="0"
                    value={item.laborComponents || ""}
                    onChange={(e) => update(item.id, { laborComponents: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className={fieldLabel}>Machinery Components (₹)</label>
                  <input
                    type="number" min="0" className={input} placeholder="0"
                    value={item.machineryComponents || ""}
                    onChange={(e) => update(item.id, { machineryComponents: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className={fieldLabel}>Base Rate (₹)</label>
                  <input
                    type="number" min="0" className={input} placeholder="0"
                    value={item.baseRate || ""}
                    onChange={(e) => update(item.id, { baseRate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className={fieldLabel}>Total Rate (₹)</label>
                  <input type="text" className={readonlyCls} readOnly value={`₹${item.totalRate.toLocaleString("en-IN")}`} />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">= material + labor + machinery + base</p>
                </div>
                <div>
                  <label className={fieldLabel}>Remarks</label>
                  <textarea
                    rows={2} className={input} placeholder="Optional remarks"
                    value={item.remarks}
                    onChange={(e) => update(item.id, { remarks: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button" onClick={add}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <Plus className="w-4 h-4" aria-hidden="true" /> Add Another Rate Item
      </button>

      {/* ── Percentage-Based Charges — configurable charge engine ── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
        <div className="rounded-t-xl px-4 py-3 bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Percentage-Based Charges
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Charges from Charges Management. Percentage can be adjusted per project requirements.
          </p>
        </div>

        <div className="p-4 space-y-3">
          {/* No charges configured in store */}
          {availableCharges.length === 0 && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              No active charges configured. Ask the System Administrator to add charges in Charges Management.
            </div>
          )}

          {/* Applied charge rows */}
          {appliedCharges.map((ac, idx) => (
            <ChargeRow
              key={`${ac.chargeId}-${idx}`}
              charge={ac}
              rowIndex={idx}
              availableCharges={availableCharges}
              allApplied={appliedCharges}
              onChange={(patch) => updateCharge(idx, patch)}
              onRemove={() => removeCharge(idx)}
            />
          ))}

          {/* Empty state when no charges applied yet */}
          {appliedCharges.length === 0 && availableCharges.length > 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-2">
              No charges applied yet. Click <strong>Add Charge</strong> to configure.
            </p>
          )}

          {/* Add Charge button */}
          {canAddMore && (
            <button
              type="button" onClick={addCharge}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <Plus className="w-4 h-4" aria-hidden="true" /> Add Charge
            </button>
          )}
        </div>
      </div>

      {/* ── Calculation Summary Card ── */}
      {appliedCharges.length > 0 && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-900/10 overflow-hidden">
          <div className="px-4 py-3 border-b border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/20">
            <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200">
              Calculation Summary
            </h3>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
              Updates automatically as you add or modify charges.
            </p>
          </div>

          <div className="p-4 space-y-2.5">
            {/* Base amount row */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Base Estimated Amount</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                ₹{baseAmount.toLocaleString("en-IN")}
              </span>
            </div>

            {/* Per-charge rows */}
            {chargeDetails.map((cd) => (
              <div key={cd.chargeId} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  + {cd.type}
                  <span className="ml-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 tabular-nums">
                    ({cd.percentage}%)
                  </span>
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300 tabular-nums">
                  ₹{cd.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </span>
              </div>
            ))}

            {/* Divider */}
            <div className="border-t border-blue-200 dark:border-blue-800 pt-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  Technical Sanction Amount
                </span>
                <span className="text-base font-bold text-blue-700 dark:text-blue-300 tabular-nums">
                  ₹{tsAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                = Base Amount + Applied Charges
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
