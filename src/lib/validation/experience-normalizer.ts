/**
 * Professional Work Experiences Normalizer
 * Enforces PostgreSQL check constraint: user_profiles_professional_work_experiences_check
 * 
 * Constraint requirements for user_profiles.professionalWorkExperiences (jsonb):
 * 1. Must be a JSON array of at most 20 items.
 * 2. Only strictly allowed keys: companyName, role, startDate, endDate, isCurrent.
 *    Any extra property (such as id, roleTitle, jobTitle, description) violates the check constraint.
 * 3. companyName & role must be non-empty strings.
 * 4. startDate must be in valid YYYY-MM-DD format.
 * 5. isCurrent must be boolean. If isCurrent is true, endDate must be null (or omitted).
 * 6. If isCurrent is false, endDate must be a valid YYYY-MM-DD date and >= startDate.
 */

export interface CanonicalWorkExperience {
  companyName: string;
  role: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
}

export function normalizeProfessionalWorkExperiences(
  experiences: any[] | null | undefined
): CanonicalWorkExperience[] {
  if (!Array.isArray(experiences) || experiences.length === 0) {
    return [];
  }

  const formatDate = (val: any): string | null => {
    if (!val || typeof val !== "string") return null;
    const trimmed = val.trim();
    if (!trimmed || trimmed.toLowerCase() === "present") return null;

    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    // YYYY-MM
    if (/^\d{4}-\d{2}$/.test(trimmed)) {
      return `${trimmed}-01`;
    }
    // MM/DD/YYYY or M/D/YYYY
    const slashParts = trimmed.split("/");
    if (slashParts.length === 3) {
      const [m, d, y] = slashParts;
      return `${y.padStart(4, "0")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split("T")[0];
    }
    return null;
  };

  const results: CanonicalWorkExperience[] = [];

  for (const exp of experiences) {
    if (!exp || typeof exp !== "object") continue;

    const companyName = String(exp.companyName || exp.company || "").trim();
    const role = String(exp.role || exp.roleTitle || exp.title || exp.jobTitle || "").trim();

    if (!companyName || !role) continue;

    const isCurrentRole =
      exp.isCurrent === true ||
      !exp.endDate ||
      String(exp.endDate).trim().toLowerCase() === "present";

    const startDate = formatDate(exp.startDate) || "2020-01-01";
    let endDate = isCurrentRole ? null : formatDate(exp.endDate);

    // Ensure chronological integrity (endDate >= startDate)
    if (endDate && endDate < startDate) {
      endDate = startDate;
    }

    results.push({
      companyName: companyName.slice(0, 100),
      role: role.slice(0, 100),
      startDate,
      endDate: isCurrentRole ? null : (endDate || null),
      isCurrent: isCurrentRole,
    });

    if (results.length >= 20) break;
  }

  return results;
}
