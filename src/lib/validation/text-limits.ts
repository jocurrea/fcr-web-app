/**
 * [Web] FIX-03: Text Length Limits, Visual Counters & Layout Overflow Fixes
 *
 * Defines canonical maximum character limits, XSS script injection detection,
 * and text sanitization for user-submitted profile and onboarding content.
 */

export const TEXT_LIMITS = {
  SUMMARY: 1000,
  ADDRESS: 255,
  TRAINING_DETAILS: 500,
  TRAINING_FACILITY: 100,
  TRAINING_TYPE: 100,
  OTHER_PROF_TYPE: 100,
  ADMIN_ROLE_DESCRIPTION: 500,
  EXP_COMPANY: 100,
  EXP_CITY: 100,
  EXP_TITLE: 100,
  EXP_PLANE: 50,
  SKILL_NAME: 60,
  AWARD_NAME: 100,
} as const;

/**
 * Checks if a string contains potentially malicious script or HTML injection patterns.
 */
export function hasScriptInjection(text?: string | null): boolean {
  if (!text || typeof text !== "string") return false;
  try {
    const lower = text.toLowerCase();
    const dangerousPatterns = [
      /<script\b[^>]*>/i,
      /<\/script>/i,
      /javascript:/i,
      /vbscript:/i,
      /data:text\/html/i,
      /onload\s*=/i,
      /onerror\s*=/i,
      /onclick\s*=/i,
      /onmouseover\s*=/i,
      /eval\s*\(/i,
      /<iframe\b[^>]*>/i,
      /<img\b[^>]+onerror/i,
    ];
    return dangerousPatterns.some((pattern) => pattern.test(lower));
  } catch {
    return true;
  }
}

/**
 * Strips dangerous HTML/script tags and trims/clamps text to the maximum permitted length.
 */
export function sanitizeAndClampText(text?: string | null, maxLength?: number): string {
  if (!text || typeof text !== "string") return "";

  // Strip script and html tags
  let cleaned = text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/javascript:/gi, "")
    .trim();

  if (typeof maxLength === "number" && maxLength > 0) {
    cleaned = cleaned.slice(0, maxLength);
  }

  return cleaned;
}

/**
 * Validates text against max length and script injection.
 */
export function validateTextInput(
  text: string | null | undefined,
  maxLength: number,
  fieldName = "Field"
): { isValid: boolean; error?: string } {
  if (!text) return { isValid: true };

  if (hasScriptInjection(text)) {
    return {
      isValid: false,
      error: `Security alert: Potentially malicious script injection detected in ${fieldName}.`,
    };
  }

  if (text.length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName} exceeds maximum length of ${maxLength} characters (currently ${text.length}).`,
    };
  }

  return { isValid: true };
}
