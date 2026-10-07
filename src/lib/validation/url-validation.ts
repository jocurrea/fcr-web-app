/**
 * [Web] FIX-02: Strict URL Formatting & XSS Sanitization
 *
 * Acceptance Criteria & Technical Notes:
 * 1. Strict Format Validation: Validate strict URL format via Regex (must explicitly include http:// or https:// and a valid domain).
 * 2. Security Sanitization: Sanitize input on both frontend and backend to prevent XSS attacks and code injection.
 * 3. UI Feedback: Display an inline validation error message if the URL format is invalid and disable submit.
 *
 * Regex Rule: ^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$
 * Test Cases: javascript:alert(1), user@email.com, mywebsite
 */

export const STRICT_URL_REGEX =
  /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

export const INVALID_URL_ERROR_MSG =
  "Please enter a valid website URL including http:// or https:// (e.g. https://www.example.com).";

export const XSS_SECURITY_ERROR_MSG =
  "Security alert: Malicious code injection or invalid URL scheme detected.";

/**
 * Checks whether the URL contains potential XSS or script injection patterns.
 */
export function hasXssOrInjection(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    const decoded = decodeURIComponent(url).toLowerCase();
    const dangerousPatterns = [
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /<script/i,
      /<\/script>/i,
      /onerror=/i,
      /onload=/i,
      /onclick=/i,
      /eval\(/i,
      /document\./i,
      /window\./i,
    ];
    return dangerousPatterns.some((pattern) => pattern.test(decoded));
  } catch {
    return true;
  }
}

/**
 * Validates strict URL format and ensures no XSS/code injection.
 * Returns true if valid, false otherwise.
 */
export function isValidStrictUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (hasXssOrInjection(trimmed)) return false;
  return STRICT_URL_REGEX.test(trimmed);
}

/**
 * Sanitizes a URL by trimming, blocking unsafe schemes and XSS patterns.
 * Returns the clean URL if valid, or null if invalid/unsafe.
 */
export function sanitizeUrl(url?: string | null): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (hasXssOrInjection(trimmed)) return null;
  if (!STRICT_URL_REGEX.test(trimmed)) return null;
  return trimmed;
}
