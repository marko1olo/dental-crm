/**
 * DENTE Dental CRM — Statutory Service Catalog & Nomenclature
 *
 * Service Code Validation & Automatic Category Detection
 */

import type { ServiceCategory } from "../servicePricelistPresets";

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
 *
 * Mandate 8e (Freedom of Clinic): Clinics are never blocked from creating intra-clinic packages or services
 * due to non-conformance with statutory regex.
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

/**
 * Automatically detects the clinical dental category based on statutory code prefix or service title.
 */
export function detectCategoryFromServiceCode(
	code: string,
	title?: string,
): ServiceCategory {
	const trimmed = code.trim().toUpperCase();
	const titleLower = title?.toLowerCase() ?? "";

	if (
		trimmed.startsWith("PKG") ||
		trimmed.startsWith("CLINIC.GIFT") ||
		trimmed.startsWith("CLINIC.KAPA") ||
		titleLower.includes("пакет") ||
		titleLower.includes("комплекс") ||
		titleLower.includes("сертификат") ||
		titleLower.includes("капа")
	) {
		return "package";
	}

	if (trimmed.startsWith("B01.065") || trimmed.startsWith("B01.003")) {
		if (trimmed.startsWith("B01.003")) return "anesthesia";
		return "consultation";
	}
	if (trimmed.startsWith("A06.07") || trimmed.startsWith("A02.07")) {
		return "radiology";
	}
	if (
		trimmed.startsWith("A16.07.051") ||
		trimmed.startsWith("A11.07.012") ||
		trimmed.startsWith("A16.07.050")
	) {
		return "hygiene";
	}
	if (trimmed.startsWith("A16.07.039") || trimmed.startsWith("A16.07.040")) {
		return "periodontics";
	}
	if (
		trimmed.startsWith("A16.07.047") ||
		trimmed.startsWith("A16.07.048") ||
		trimmed.startsWith("A16.07.046")
	) {
		return "orthodontics";
	}
	if (
		trimmed.startsWith("A16.07.006") ||
		trimmed.startsWith("A16.07.035") ||
		trimmed.startsWith("A16.07.036") ||
		trimmed.startsWith("A16.07.037") ||
		trimmed.startsWith("A16.07.049") ||
		trimmed.startsWith("A16.07.053")
	) {
		return "orthopedics";
	}
	if (
		trimmed.startsWith("A16.07.001") ||
		trimmed.startsWith("A16.07.024") ||
		trimmed.startsWith("A16.07.054") ||
		trimmed.startsWith("A16.07.007") ||
		trimmed.startsWith("A16.07.041") ||
		trimmed.startsWith("A16.07.055") ||
		trimmed.startsWith("A16.07.017") ||
		trimmed.startsWith("A16.07.016") ||
		trimmed.startsWith("A16.07.011") ||
		trimmed.startsWith("A16.07.012")
	) {
		return "surgery";
	}
	if (trimmed.startsWith("A16.07.004")) {
		return "anesthesia";
	}
	if (
		trimmed.startsWith("A16.07.002") ||
		trimmed.startsWith("A16.07.008") ||
		trimmed.startsWith("A16.07.030") ||
		trimmed.startsWith("A16.07.082") ||
		trimmed.startsWith("A16.07.091") ||
		trimmed.startsWith("A16.07.003")
	) {
		return "therapy";
	}
	return "other";
}

/** Backwards-compatible alias */
export const detectCategoryFrom804nCode = detectCategoryFromServiceCode;
