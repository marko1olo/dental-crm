/**
 * DENTE Dental CRM — Service Catalog & Nomenclature Presets
 *
 * Layer 2: Core Preset Filters by ICD-10, Tooth Context & Doctor Specialty
 */

import type { DoctorSpecialty, ServicePricelistItem } from "./types";

/**
 * Normalizes a statutory nomenclature code removing dots, spaces and case variations
 */
export function normalizeCode804n(code: string): string {
	return code.replace(/[.\s-]/g, "").toUpperCase();
}

/**
 * Finds all presets indicated for a specific ICD-10 diagnosis code
 */
export function findPresetsByIcd10(
	presets: readonly ServicePricelistItem[],
	icd10Code: string,
): ServicePricelistItem[] {
	const cleanIcd = icd10Code.trim().toUpperCase();
	if (!cleanIcd) return [];
	return presets.filter((item) =>
		item.icd10Indications.some(
			(icd) =>
				icd.toUpperCase() === cleanIcd ||
				cleanIcd.startsWith(icd.toUpperCase()),
		),
	);
}

/**
 * Finds presets matching tooth clinical context (canals, temporary teeth, incisor vs molar)
 */
export function findPresetsByToothContext(
	presets: readonly ServicePricelistItem[],
	toothNumber: number,
	options?: { canals?: number; isTemporary?: boolean },
): ServicePricelistItem[] {
	if (
		toothNumber < 11 ||
		(toothNumber > 48 && toothNumber < 51) ||
		toothNumber > 85
	) {
		return [];
	}

	const isTemporary =
		options?.isTemporary ?? (toothNumber >= 51 && toothNumber <= 85);

	if (isTemporary) {
		const pediatrics = presets.filter((p) => p.category === "pediatric");
		if (pediatrics.length > 0) return pediatrics;
	}

	if (options?.canals && options.canals >= 1 && options.canals <= 4) {
		const canalSuffix = `${options.canals} корнево`;
		const canalMatches = presets.filter(
			(p) =>
				p.isAnatomicalCanalScalable ||
				p.commercialTitle.toLowerCase().includes(canalSuffix) ||
				p.statutoryTitle804n.toLowerCase().includes(canalSuffix),
		);
		if (canalMatches.length > 0) return canalMatches;
	}

	return presets.filter(
		(p) => p.category === "therapy" || p.category === "surgery",
	);
}

/**
 * Recommended presets for specialty
 */
export function getRecommendedPresetsForSpecialty(
	presets: readonly ServicePricelistItem[],
	specialty: DoctorSpecialty,
): ServicePricelistItem[] {
	return presets.filter(
		(p) => p.specialty === specialty && p.isActive && !p.isArchived,
	);
}
