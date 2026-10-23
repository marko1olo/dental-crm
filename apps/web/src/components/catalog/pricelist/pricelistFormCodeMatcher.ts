/**
 * DENTE Dental CRM — Statutory Service Catalog & Nomenclature
 *
 * Form Code Matcher against canonical service presets
 */

import { detectCategoryFromServiceCode } from "./servicePricelistEngine";
import {
	CANONICAL_SERVICE_PRESETS,
	type DoctorSpecialty,
	type ServiceCategory,
} from "./servicePricelistPresets";

export interface MatchedCodeInfo {
	statutoryTitle?: string;
	category?: ServiceCategory;
	specialty?: DoctorSpecialty;
	icd10?: string;
	durationMin?: number;
	detectedCategory?: ServiceCategory;
}

export function matchServiceCode(
	newCode: string,
	commercialTitle: string,
	currentStatutoryTitle: string,
	hasEditingItem: boolean,
): MatchedCodeInfo | null {
	const trimmed = newCode.trim().toUpperCase();
	if (!trimmed) return null;

	const match = CANONICAL_SERVICE_PRESETS.find(
		(p) => (p.statutoryCode || p.code804n).toUpperCase() === trimmed,
	);

	if (match) {
		const title = match.statutoryTitle || match.statutoryTitle804n;
		return {
			statutoryTitle:
				!currentStatutoryTitle || currentStatutoryTitle === commercialTitle
					? title
					: undefined,
			category: match.category,
			specialty: match.specialty,
			icd10: match.icd10Indications.length > 0 ? match.icd10Indications.join(", ") : undefined,
			durationMin: !hasEditingItem ? match.estimatedDurationMin : undefined,
		};
	}

	const detected = detectCategoryFromServiceCode(trimmed, commercialTitle);
	return { detectedCategory: detected !== "other" ? detected : undefined };
}
