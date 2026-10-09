/**
 * Date Validation Rules
 * [Web] FIX-06: Chronological Date Logic & Age Restriction Checks (#34)
 */

export function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

export function getMinAgeDateString(minAge = 18): string {
  const today = new Date();
  const maxDateObj = new Date(
    today.getFullYear() - minAge,
    today.getMonth(),
    today.getDate()
  );
  return maxDateObj.toISOString().split("T")[0];
}

export interface DateValidationResult {
  isValid: boolean;
  error: string | null;
}

/**
 * Validates Date of Birth:
 * - Must be at least 18 years old (DOB <= Today - 18 Years)
 * - Cannot be today or in the future
 */
export function validateDateOfBirth(
  dob: string | null | undefined,
  required = true
): DateValidationResult {
  const trimmed = dob ? dob.trim() : "";
  if (!trimmed) {
    if (required) {
      return { isValid: false, error: "Date of birth is required." };
    }
    return { isValid: true, error: null };
  }

  const birthDate = new Date(trimmed);
  if (isNaN(birthDate.getTime())) {
    return { isValid: false, error: "Please enter a valid date." };
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // Block future or current date
  const todayOnlyDate = new Date();
  todayOnlyDate.setHours(0, 0, 0, 0);
  if (birthDate >= todayOnlyDate) {
    return {
      isValid: false,
      error: "Date of birth cannot be today or in the future.",
    };
  }

  // Calculate age accurately
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  if (age < 18) {
    return {
      isValid: false,
      error: "You must be at least 18 years old.",
    };
  }

  if (age > 120) {
    return {
      isValid: false,
      error: "Please enter a realistic date of birth.",
    };
  }

  return { isValid: true, error: null };
}

/**
 * Validates Experience chronological dates:
 * - Start_Date <= Today
 * - End_Date >= Start_Date (if provided)
 * - If End_Date is empty / null / "Present", it represents current employment
 */
export function validateExperienceDates(
  startDate: string | null | undefined,
  endDate?: string | null | undefined,
  required = true
): DateValidationResult {
  const startTrimmed = startDate ? startDate.trim() : "";
  if (!startTrimmed) {
    if (required) {
      return { isValid: false, error: "Start date is required." };
    }
    return { isValid: true, error: null };
  }

  const startObj = new Date(startTrimmed);
  if (isNaN(startObj.getTime())) {
    return { isValid: false, error: "Please enter a valid start date." };
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // Start Date cannot exceed current date
  if (startObj > today) {
    return {
      isValid: false,
      error: "Start date cannot be in the future.",
    };
  }

  const endTrimmed = endDate ? endDate.trim() : "";

  // If End Date is empty, null or "Present", it represents current employment
  if (!endTrimmed || endTrimmed.toLowerCase() === "present") {
    return { isValid: true, error: null };
  }

  const endObj = new Date(endTrimmed);
  if (isNaN(endObj.getTime())) {
    return { isValid: false, error: "Please enter a valid end date." };
  }

  // End Date must be strictly equal to or after Start Date
  if (endObj < startObj) {
    return {
      isValid: false,
      error: "End date cannot be earlier than start date.",
    };
  }

  return { isValid: true, error: null };
}
