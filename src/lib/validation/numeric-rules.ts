/**
 * [Web] FIX-04: Numeric Input Rules, Integer Constraints & Range Checks
 *
 * Enforces positive integer rules, keypress blocks, clipboard paste sanitization,
 * and logical range checks for numeric fields:
 * - Children: Min 0, Max 10
 * - Years in Industry: Min 0, Max 65
 * - Founded Years: Min 0, Max Current Year
 */

export const NUMERIC_LIMITS = {
  CHILDREN: { min: 0, max: 10 },
  YEARS_IN_INDUSTRY: { min: 0, max: 65 },
  FOUNDED_YEAR: {
    min: 0,
    get max() {
      return new Date().getFullYear();
    },
  },
} as const;

export const BLOCKED_NUMERIC_KEYS = ["-", "+", ".", ",", "e", "E"];

/**
 * KeyDown handler to block non-integer characters: '-', '+', '.', ',', and 'e'/'E'.
 */
export function handleNumericKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  if (BLOCKED_NUMERIC_KEYS.includes(e.key)) {
    e.preventDefault();
  }
}

/**
 * Sanitizes input to strictly positive integer digits (removes any non-numeric character).
 */
export function sanitizeInteger(val: string): string {
  if (!val) return "";
  return val.replace(/\D/g, "");
}

/**
 * Validates Children input against integer rules and (Min 0, Max 10) range.
 */
export function validateChildren(val: string | number): { isValid: boolean; error: string | null } {
  if (val === "" || val === null || val === undefined) {
    return { isValid: true, error: null }; // Optional unless filled
  }
  const str = String(val).trim();
  if (str === "") return { isValid: true, error: null };

  if (!/^\d+$/.test(str)) {
    return { isValid: false, error: "Children must be a positive integer." };
  }

  const num = parseInt(str, 10);
  if (isNaN(num)) {
    return { isValid: false, error: "Please enter a valid number." };
  }

  if (num < NUMERIC_LIMITS.CHILDREN.min || num > NUMERIC_LIMITS.CHILDREN.max) {
    return {
      isValid: false,
      error: `Number of children must be between ${NUMERIC_LIMITS.CHILDREN.min} and ${NUMERIC_LIMITS.CHILDREN.max}.`,
    };
  }

  return { isValid: true, error: null };
}

/**
 * Validates Years in Industry input against integer rules and (Min 0, Max 65) range.
 */
export function validateYearsInIndustry(val: string | number): { isValid: boolean; error: string | null } {
  if (val === "" || val === null || val === undefined) {
    return { isValid: true, error: null }; // Optional unless filled
  }
  const str = String(val).trim();
  if (str === "") return { isValid: true, error: null };

  if (!/^\d+$/.test(str)) {
    return { isValid: false, error: "Years in industry must be a positive integer." };
  }

  const num = parseInt(str, 10);
  if (isNaN(num)) {
    return { isValid: false, error: "Please enter a valid number." };
  }

  if (num < NUMERIC_LIMITS.YEARS_IN_INDUSTRY.min || num > NUMERIC_LIMITS.YEARS_IN_INDUSTRY.max) {
    return {
      isValid: false,
      error: `Years in industry must be between ${NUMERIC_LIMITS.YEARS_IN_INDUSTRY.min} and ${NUMERIC_LIMITS.YEARS_IN_INDUSTRY.max}.`,
    };
  }

  return { isValid: true, error: null };
}

/**
 * Validates Founded Year input against integer rules and (Min 0, Max Current Year) range.
 */
export function validateFoundedYear(val: string | number): { isValid: boolean; error: string | null } {
  if (val === "" || val === null || val === undefined) {
    return { isValid: true, error: null }; // Optional
  }
  const str = String(val).trim();
  if (str === "") return { isValid: true, error: null };

  if (!/^\d+$/.test(str)) {
    return { isValid: false, error: "Founded year must be a positive integer." };
  }

  const num = parseInt(str, 10);
  const currentYear = NUMERIC_LIMITS.FOUNDED_YEAR.max;

  if (isNaN(num)) {
    return { isValid: false, error: "Please enter a valid year." };
  }

  if (num < NUMERIC_LIMITS.FOUNDED_YEAR.min || num > currentYear) {
    return {
      isValid: false,
      error: `Founded year must be between ${NUMERIC_LIMITS.FOUNDED_YEAR.min} and ${currentYear}.`,
    };
  }

  return { isValid: true, error: null };
}
