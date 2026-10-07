/**
 * [Web] FIX-01: Emoji & Special Character Input Restrictions
 *
 * Acceptance Criteria & Technical Notes:
 * 1. Character Filtering: Restrict emojis and special characters across target text inputs.
 * 2. Allowed Input: Permit strictly alphanumeric characters combined with spaces and standard address/name punctuation.
 * 3. Clipboard Protection: Block paste operations if the copied text contains emojis or unsupported characters.
 *
 * Regex Rule: ^[a-zA-Z0-9\s.,\--]+$ (with standard Latin accents for international address/name compatibility)
 */

// Strict regex rule allowing alphanumeric characters (including common Latin accents), whitespace, and standard punctuation (. , -)
export const ALLOWED_INPUT_REGEX = /^[a-zA-Z0-9\s.,\-áéíóúÁÉÍÓÚñÑüÜ]+$/;

// User-facing inline error messages
export const RESTRICTED_INPUT_ERROR_MSG =
  "Only letters, numbers, spaces, and standard punctuation (., -) are allowed. Emojis and special characters are not permitted.";

export const CLIPBOARD_RESTRICTED_ERROR_MSG =
  "Paste blocked: Copied text contains emojis or unsupported special characters.";

/**
 * Validates if a text string complies with the allowed characters rule.
 * Empty or whitespace-only strings return true (allowing optional fields).
 */
export function isValidInputText(text?: string | null): boolean {
  if (!text || text.trim().length === 0) return true;
  return ALLOWED_INPUT_REGEX.test(text);
}

/**
 * Checks if a non-empty text string contains any emojis or unsupported characters.
 */
export function hasInvalidCharacters(text?: string | null): boolean {
  if (!text || text.length === 0) return false;
  return !ALLOWED_INPUT_REGEX.test(text);
}

/**
 * Validates whether pasted clipboard text is permissible.
 */
export function isPasteAllowed(pastedText: string): boolean {
  if (!pastedText) return true;
  return ALLOWED_INPUT_REGEX.test(pastedText);
}
