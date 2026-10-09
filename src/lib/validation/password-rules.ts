/**
 * [Web] FIX-07: Authentication Security Policy & Password Validation Rules
 *
 * Acceptance Criteria & Technical Notes:
 * 1. Password Policy: Enforce minimum 8 characters, min 1 uppercase, 1 number, and 1 special character.
 * 2. Reject inputs consisting only of spaces or whitespace strings.
 */

export const MIN_PASSWORD_LENGTH = 8;
export const UPPERCASE_REGEX = /[A-Z]/;
export const LOWERCASE_REGEX = /[a-z]/;
export const NUMBER_REGEX = /[0-9]/;
export const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/;

export interface PasswordValidationResult {
  isValid: boolean;
  error: string | null;
  reasons: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    specialChar: boolean;
    notOnlySpaces: boolean;
  };
}

/**
 * Validates password according to FIX-07 Security Policy
 */
export function validatePassword(password: string): PasswordValidationResult {
  const notOnlySpaces = typeof password === "string" && password.trim().length > 0;
  const length = typeof password === "string" && password.length >= MIN_PASSWORD_LENGTH;
  const uppercase = UPPERCASE_REGEX.test(password || "");
  const lowercase = LOWERCASE_REGEX.test(password || "");
  const number = NUMBER_REGEX.test(password || "");
  const specialChar = SPECIAL_CHAR_REGEX.test(password || "");

  let error: string | null = null;

  if (!password || !notOnlySpaces) {
    error = "Password cannot be empty or contain only spaces.";
  } else if (!length) {
    error = `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
  } else if (!uppercase) {
    error = "Password must contain at least one uppercase letter (A-Z).";
  } else if (!lowercase) {
    error = "Password must contain at least one lowercase letter (a-z).";
  } else if (!number) {
    error = "Password must contain at least one number (0-9).";
  } else if (!specialChar) {
    error = "Password must contain at least one special character (!@#$%^&*()_+-=[]{};':\"|<>?,./`~).";
  }

  const isValid = notOnlySpaces && length && uppercase && lowercase && number && specialChar;

  return {
    isValid,
    error,
    reasons: {
      length,
      uppercase,
      lowercase,
      number,
      specialChar,
      notOnlySpaces,
    },
  };
}
