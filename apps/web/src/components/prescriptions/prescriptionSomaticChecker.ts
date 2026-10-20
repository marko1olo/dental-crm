/**
 * prescriptionSomaticChecker.ts — Somatic Anamnesis Contraindications Detector
 */

import {
	extractAllergyTerms,
	NSAID_KEYWORDS,
	ULCER_GASTRITIS_KEYWORDS,
} from "./prescriptionAllergyKeywords";
import type {
	PrescriptionDrugItemLike,
	PrescriptionSomaticWarning,
} from "./prescriptionAllergyTypes";

export function hasUlcerGastritisCondition(patientHistory: unknown): boolean {
	const text = extractAllergyTerms(patientHistory);
	return ULCER_GASTRITIS_KEYWORDS.some((kw) => text.includes(kw));
}

export function detectPrescriptionSomaticWarnings(
	patientAnamnesisOrHistory: unknown,
	activeDrugs: readonly PrescriptionDrugItemLike[],
): readonly PrescriptionSomaticWarning[] {
	if (!patientAnamnesisOrHistory || activeDrugs.length === 0) return [];
	const text = extractAllergyTerms(patientAnamnesisOrHistory);
	if (!text) return [];

	const matchedUlcer = ULCER_GASTRITIS_KEYWORDS.find((kw) => text.includes(kw));
	if (!matchedUlcer) return [];

	const nsaidDrugs = activeDrugs.filter((drug) => {
		if (drug.category === "nsaid") return true;
		const drugText =
			`${drug.id} ${drug.tradeName} ${drug.latinName}`.toLowerCase();
		return NSAID_KEYWORDS.some((kw) => drugText.includes(kw));
	});

	if (nsaidDrugs.length === 0) return [];

	return [
		{
			id: "somatic_ulcer_gastritis_nsaid",
			type: "ulcer_gastritis_nsaid",
			messageRu: `У пациента в соматическом анамнезе выявлено поражение ЖКТ («${matchedUlcer}»). Назначены препараты группы НПВП (${nsaidDrugs.map((d) => d.tradeName).join(", ")}).`,
			recommendationRu:
				"Рекомендуется назначить гастропротекцию (Омепразол 20 мг утром за 30 мин до еды) или заменить на Парацетамол.",
			matchedTerm: matchedUlcer,
			affectedDrugs: nsaidDrugs.map((d) => d.id),
		},
	];
}
