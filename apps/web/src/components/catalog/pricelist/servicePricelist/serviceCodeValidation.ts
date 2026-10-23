/**
 * DENTE Dental CRM — Statutory Service Catalog & Nomenclature
 * Service Code Validation Rules & Clinic Package Identifiers
 */

const STATUTORY_CODE_REGEX = /^[AB]\d{2}\.\d{2,3}\.\d{2,3}(?:\.\d{2,3})?$/i;

/**
 * Validates whether a code conforms to statutory syntax (e.g. A16.07.002.001 or B01.065.001).
 */
export function isValidStatutoryCode(code: string): boolean {
	if (!code || typeof code !== "string") return false;
	return STATUTORY_CODE_REGEX.test(code.trim());
}

/** Backwards-compatible alias */
export const isValidOrder804nCode = isValidStatutoryCode;

/**
 * Checks whether a service code is valid for catalog use (either standard code OR custom clinic package identifier).
 * Mandate 8e (Freedom of Clinic): Clinics are never blocked from creating intra-clinic packages or services.
 */
export function isValidCatalogServiceCode(code: string): boolean {
	if (!code || typeof code !== "string") return false;
	return code.trim().length > 0;
}

/**
 * Checks if a code represents an intra-clinic custom service/package rather than standard statutory code.
 */
export function isClinicPackageOrCustomService(code: string): boolean {
	return !isValidStatutoryCode(code);
}
