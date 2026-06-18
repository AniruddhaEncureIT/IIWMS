/**
 * Brand accent system — defines the six preset accent scales and the
 * applyBrandScale() function that applies them at runtime via CSS variables.
 *
 * Each shade value is stored as "H S% L%" (raw HSL arguments).
 * CSS usage:  hsl(var(--brand-600))
 * JS usage:   document.documentElement.style.setProperty("--brand-600", value)
 *
 * Tailwind's `--color-blue-*` utilities are also overridden so that every
 * bg-blue-*, text-blue-*, ring-blue-* class follows the selected accent.
 */

export const DEFAULT_ACCENT = "#2563eb";

const SHADES = ["50","100","200","300","400","500","600","700","800","900","950"] as const;
type Shade = typeof SHADES[number];
type Scale = Record<Shade, string> & { fg: string; fgDark: string };

/**
 * HSL shade scales for each preset accent.
 * fg       = primary-button foreground (light theme)
 * fgDark   = primary-button foreground (dark theme — always dark since brand-400 is light)
 */
export const BRAND_SCALES: Record<string, Scale> = {
  // Government Blue — Tailwind blue
  "#2563eb": {
    "50":  "214 100% 97%", "100": "214 95% 93%",  "200": "213 97% 87%",
    "300": "212 96% 78%",  "400": "213 94% 68%",  "500": "217 91% 60%",
    "600": "221 83% 53%",  "700": "224 76% 48%",  "800": "226 71% 40%",
    "900": "224 64% 33%",  "950": "226 57% 21%",
    fg: "0 0% 100%", fgDark: "222 28% 9%",
  },
  // Forest Green — Tailwind emerald
  "#059669": {
    "50":  "152 81% 96%",  "100": "149 80% 90%",  "200": "152 76% 80%",
    "300": "156 72% 67%",  "400": "158 64% 52%",  "500": "160 84% 39%",
    "600": "161 94% 30%",  "700": "163 94% 24%",  "800": "163 88% 20%",
    "900": "164 86% 16%",  "950": "166 91% 9%",
    fg: "0 0% 100%", fgDark: "222 28% 9%",
  },
  // Royal Purple — Tailwind violet
  "#7c3aed": {
    "50":  "250 100% 98%", "100": "251 86% 95%",  "200": "252 83% 92%",
    "300": "254 96% 85%",  "400": "255 92% 76%",  "500": "258 90% 66%",
    "600": "262 83% 58%",  "700": "263 70% 50%",  "800": "263 69% 42%",
    "900": "263 67% 34%",  "950": "262 69% 22%",
    fg: "0 0% 100%", fgDark: "222 28% 9%",
  },
  // Amber — Tailwind amber (uses dark fg for WCAG contrast)
  "#d97706": {
    "50":  "48 100% 96%",  "100": "45 93% 88%",   "200": "44 87% 77%",
    "300": "42 95% 65%",   "400": "38 92% 56%",   "500": "37 91% 50%",
    "600": "32 95% 44%",   "700": "26 90% 37%",   "800": "20 80% 31%",
    "900": "17 75% 26%",   "950": "18 86% 14%",
    fg: "20 100% 10%", fgDark: "222 28% 9%",
  },
  // Red — Tailwind red
  "#dc2626": {
    "50":  "0 86% 97%",    "100": "0 93% 94%",    "200": "0 96% 89%",
    "300": "0 94% 82%",    "400": "0 91% 71%",    "500": "0 84% 60%",
    "600": "0 72% 51%",    "700": "0 70% 42%",    "800": "0 64% 36%",
    "900": "0 61% 30%",    "950": "0 67% 15%",
    fg: "0 0% 100%", fgDark: "222 28% 9%",
  },
  // Sky Blue — Tailwind sky
  "#0284c7": {
    "50":  "204 100% 97%", "100": "204 94% 94%",  "200": "201 94% 86%",
    "300": "199 89% 74%",  "400": "199 89% 60%",  "500": "199 89% 48%",
    "600": "200 98% 39%",  "700": "201 97% 32%",  "800": "201 88% 28%",
    "900": "200 69% 24%",  "950": "200 72% 16%",
    fg: "0 0% 100%", fgDark: "222 28% 9%",
  },
};

/**
 * Apply an accent color scale to the document root.
 * Sets --brand-* variables (used by globals.css expressions) and
 * overrides --color-blue-* so all Tailwind bg-blue-* / text-blue-* etc. follow the accent.
 * Falls back to Government Blue for unknown hex values.
 */
export function applyBrandScale(hex: string): void {
  const scale = BRAND_SCALES[hex.toLowerCase()] ?? BRAND_SCALES[DEFAULT_ACCENT];
  const root  = document.documentElement;

  for (const shade of SHADES) {
    // --brand-* used in hsl(var(--brand-*)) expressions in CSS
    root.style.setProperty(`--brand-${shade}`, scale[shade]);
    // --color-blue-* consumed by Tailwind bg-blue-*, text-blue-*, etc.
    root.style.setProperty(`--color-blue-${shade}`, `hsl(${scale[shade]})`);
  }

  // Primary-button foreground — varies for Amber which needs dark text
  root.style.setProperty("--primary-foreground-light", scale.fg);
}
