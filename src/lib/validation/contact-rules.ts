/**
 * Contact Validation Rules (Email & Phone)
 * FIX-05: Email & Phone Active Validation & Error Handling (Anti-Silent Failure)
 */

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const PHONE_REGEX = /^[+]?[\d\s().-]{7,25}$/;

export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

/**
 * Validates email according to RFC / standard strict format
 * Rejects missing domain, missing TLD, invalid symbols, or spaces.
 */
export function validateEmail(email: string, required = true): ValidationResult {
  const trimmed = email ? email.trim() : "";
  if (!trimmed) {
    if (required) {
      return { isValid: false, error: "Email address is required." };
    }
    return { isValid: true, error: null };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return {
      isValid: false,
      error: "Please enter a valid email address format (e.g. user@domain.com).",
    };
  }

  return { isValid: true, error: null };
}

/**
 * Validates phone number according to standard international & domestic formatting
 * Rejects letters, symbols like '#', and enforces at least 7 digits.
 */
export function validatePhone(phone: string, required = true): ValidationResult {
  const trimmed = phone ? phone.trim() : "";
  if (!trimmed) {
    if (required) {
      return { isValid: false, error: "Phone number is required." };
    }
    return { isValid: true, error: null };
  }

  // Check for letters or unexpected special characters (e.g. #, $, @, !, letters)
  if (/[a-zA-Z#$@!%^&*_=~`?<>{}[\]|/\\]/.test(trimmed)) {
    return {
      isValid: false,
      error: "Phone number contains invalid characters. Only digits, +, spaces, and () - are allowed.",
    };
  }

  const digitsOnly = trimmed.replace(/\D/g, "");
  if (digitsOnly.length < 7) {
    return {
      isValid: false,
      error: "Please enter a valid phone number (at least 7 digits, e.g. +1234567890).",
    };
  }

  if (digitsOnly.length > 15) {
    return {
      isValid: false,
      error: "Phone number is too long (maximum 15 digits).",
    };
  }

  if (!PHONE_REGEX.test(trimmed)) {
    return {
      isValid: false,
      error: "Please enter a valid phone number format.",
    };
  }

  return { isValid: true, error: null };
}

/**
 * Validates both contact fields together
 */
export function validateContactInfo(
  phone: string,
  email: string,
  required = true
): {
  isValid: boolean;
  phoneError: string | null;
  emailError: string | null;
} {
  const phoneRes = validatePhone(phone, required);
  const emailRes = validateEmail(email, required);

  return {
    isValid: phoneRes.isValid && emailRes.isValid,
    phoneError: phoneRes.error,
    emailError: emailRes.error,
  };
}
