/**
 * Validates an email address.
 * Returns an error message string, or null if valid.
 */
export function validateEmail(value: string): string | null {
  const v = value.trim();
  if (!v) return "Email address is required.";
  if (/\s/.test(v)) return "Please enter a valid email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Please enter a valid email address.";
  return null;
}

/**
 * Validates a 10-digit Indian mobile number.
 * - Must be exactly 10 digits.
 * - First digit must be 6, 7, 8, or 9.
 * Returns an error message string, or null if valid.
 */
export function validateMobile(value: string): string | null {
  const v = value.trim();
  if (!v) return "Mobile number is required.";
  if (!/^\d{10}$/.test(v)) return "Please enter a valid 10-digit mobile number.";
  if (!/^[6-9]/.test(v))  return "Please enter a valid 10-digit mobile number.";
  return null;
}

/**
 * Validates a combined email-or-mobile input.
 * Returns an error message string, or null if valid.
 */
export function validateContact(value: string): string | null {
  const v = value.trim();
  if (!v) return "Enter your email address or mobile number.";
  if (v.includes("@")) return validateEmail(v);
  if (/^\d+$/.test(v))  return validateMobile(v);
  return "Enter a valid email address or 10-digit mobile number.";
}

/**
 * Normalises an email for storage: trims whitespace and lowercases.
 */
export function normaliseEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Strips non-digit characters and limits to 10 digits.
 * Use as the onChange handler value transformer for mobile inputs.
 */
export function sanitiseMobile(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}
