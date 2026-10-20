/**
 * prescriptionAllergyDetector.ts — Batch Prescription Allergy Conflicts Detector
 * Decomposed module <= 120 lines (Mandate 8b).
 */

import {
	ANESTHETIC_KEYWORDS,
	extractAllergyTerms,
	NSAID_KEYWORDS,
	PENICILLIN_KEYWORDS,
} from "./prescriptionAllergyKeywords";
import type {
	PrescriptionAllergyConflict,
	PrescriptionAllergyType,
	PrescriptionDrugItemLike,
} from "./prescriptionAllergyTypes";

const ALLERGY_CHECKS: {
	type: PrescriptionAllergyType;
	keywords: readonly string[];
	filter: (d: PrescriptionDrugItemLike) => boolean;
}[] = [
	{
		type: "penicillin",
		keywords: PENICILLIN_KEYWORDS,
		filter: (d) =>
			PENICILLIN_KEYWORDS.some((kw) =>
				`${d.id} ${d.tradeName} ${d.latinName}`.toLowerCase().includes(kw),
			),
	},
	{
		type: "nsaid",
		keywords: NSAID_KEYWORDS,
		filter: (d) =>
			d.category === "nsaid" ||
			NSAID_KEYWORDS.some((kw) =>
				`${d.id} ${d.tradeName} ${d.latinName}`.toLowerCase().includes(kw),
			),
	},
	{
		type: "anesthetic",
		keywords: ANESTHETIC_KEYWORDS,
		filter: (d) =>
			d.category === "anesthetic" ||
			ANESTHETIC_KEYWORDS.some((kw) =>
				`${d.id} ${d.tradeName} ${d.latinName}`.toLowerCase().includes(kw),
			),
	},
];

export function detectPrescriptionAllergyConflicts(
	patientAllergies: readonly string[] | string[] | string | null | undefined,
	activeDrugs: readonly PrescriptionDrugItemLike[],
): readonly PrescriptionAllergyConflict[] {
	if (!patientAllergies || activeDrugs.length === 0) return [];
	const combinedText = extractAllergyTerms(patientAllergies);
	if (!combinedText) return [];

	const conflicts: PrescriptionAllergyConflict[] = [];

	for (const check of ALLERGY_CHECKS) {
		const matched = check.keywords.find((kw) => combinedText.includes(kw));
		if (matched) {
			const matchingDrugs = activeDrugs.filter(check.filter);
			if (matchingDrugs.length > 0) {
				conflicts.push({
					type: check.type,
					matchedAllergyTerm: matched,
					conflictingDrugs: matchingDrugs.map((d) => ({
						id: d.id,
						tradeName: d.tradeName,
						latinName: d.latinName,
					})),
				});
			}
		}
	}
	return conflicts;
}
