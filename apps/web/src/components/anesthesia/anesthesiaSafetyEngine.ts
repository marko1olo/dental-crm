/**
 * anesthesiaSafetyEngine.ts — Clinical Anesthesia Safety & Maximum Recommended Dose (MRD) Engine
 * Re-exported from canonical @dental/shared/anesthesia module.
 */

import {
	ANESTHESIA_DRUG_CATALOG,
	EPINEPHRINE_CEILINGS_MG,
	calculateComprehensiveAnesthesiaSafety,
	calculateEffectiveMgPerKg,
	isGeriatricPatient,
	isPediatricPatient,
	screenPatientContraindications as sharedScreenPatientContraindications,
	type AnesthesiaCalculationInput,
	type AnesthesiaDrugSpec,
	type AnesthesiaSafetyZone,
	type AnestheticDrugId,
	type ComprehensiveAnesthesiaCalculationResult,
	type PatientAnesthesiaProfile,
} from "@dental/shared";

export type {
	AnestheticDrugId,
	AnesthesiaDrugSpec,
	AnesthesiaSafetyZone,
	PatientAnesthesiaProfile,
	AnesthesiaCalculationInput,
};

export type AnestheticDrugKey = AnestheticDrugId;
export type VasoconstrictorRatio = "1:100000" | "1:200000" | "none";
export type AsaClassification = "asa_1" | "asa_2" | "asa_3" | "asa_4";
export type AnesthesiaCalculationResult = ComprehensiveAnesthesiaCalculationResult;

export {
	ANESTHESIA_DRUG_CATALOG,
	EPINEPHRINE_CEILINGS_MG,
	isPediatricPatient,
	isGeriatricPatient,
	calculateEffectiveMgPerKg,
};

export function screenPatientContraindications(
	profile: PatientAnesthesiaProfile & {
		takesBetaBlockers?: boolean | undefined;
		hasIschemicHeartDisease?: boolean | undefined;
		hasMyocardialInfarctionHistory?: boolean | undefined;
	},
	drugId: AnestheticDrugId = "articaine_4_epi_100k",
) {
	const base = sharedScreenPatientContraindications(profile, drugId);
	const drug = ANESTHESIA_DRUG_CATALOG[drugId] || ANESTHESIA_DRUG_CATALOG.articaine_4_epi_100k;
	const blockingContraindications = [...base.blockingContraindications];
	const warnings = [...base.warnings];
	let recommendedAlternativeId = base.recommendedAlternativeId;

	// Cardiovascular risk & Beta-blockers guidance (Mandate 8e: Doctor Autonomy — non-blocking warning, never block!)
	if (profile.takesBetaBlockers) {
		if (drug.vasoconstrictorRatio === "1:100000") {
			warnings.push(
				"ВНИМАНИЕ (Бета-блокаторы): Прием бета-блокаторов при высокой концентрации адреналина 1:100 000 повышает риск прессорной реакции. Рекомендован Скандонест (Мепивакаин 3% без адреналина). Решение принимает лечащий врач.",
			);
			recommendedAlternativeId = "mepivacaine_3_plain";
		} else if (!drug.isAdrenalineFree) {
			warnings.push(
				"КАРДИОРИСК (Бета-блокаторы): Лимит адреналина строго ограничен 0.04 мг (максимум 4 карпулы 1:200 000). Необходим контроль АД и ЧСС. Рекомендован Скандонест (Мепивакаин 3% без адреналина).",
			);
			recommendedAlternativeId = "mepivacaine_3_plain";
		}
	}

	if ((profile.hasIschemicHeartDisease || profile.hasMyocardialInfarctionHistory) && drug.vasoconstrictorRatio === "1:100000") {
		warnings.push(
			"КАРДИОРИСК: Ишемическая болезнь сердца (ИБС) / перенесенный инфаркт миокарда. Рекомендован Скандонест (Мепивакаин 3% без адреналина). Решение принимает лечащий врач.",
		);
		recommendedAlternativeId = "mepivacaine_3_plain";
	}

	return {
		isBlocked: blockingContraindications.length > 0,
		blockingContraindications,
		warnings,
		recommendedAlternativeId,
		recommendedAlternativeKey: recommendedAlternativeId,
	};
}

export function calculateAnesthesiaSafety(
	input: AnesthesiaCalculationInput & {
		takesBetaBlockers?: boolean | undefined;
		hasIschemicHeartDisease?: boolean | undefined;
		hasMyocardialInfarctionHistory?: boolean | undefined;
	},
): ComprehensiveAnesthesiaCalculationResult {
	const enrichedInput: AnesthesiaCalculationInput = {
		...input,
		hasCardiovascularRisk: Boolean(
			input.hasCardiovascularRisk ||
			input.takesBetaBlockers ||
			input.hasIschemicHeartDisease ||
			input.hasMyocardialInfarctionHistory ||
			(typeof input.bpDiastolic === "number" && input.bpDiastolic >= 90)
		),
	};
	return calculateComprehensiveAnesthesiaSafety(enrichedInput);
}

export function formatAnesthesiaRemainingDoseRu(
	injectedCarpules: number,
	maxSafeCarpules: number,
	volumeMlPerCarpule = 1.7,
): string {
	const remaining = Math.max(0, Math.floor((maxSafeCarpules - injectedCarpules) * 10) / 10);
	const injectedVolumeMl = (injectedCarpules * volumeMlPerCarpule).toFixed(1);
	return `Введено: ${injectedVolumeMl} мл (${injectedCarpules} карп.) · Безопасный остаток: ${remaining} карп. (предел: ${maxSafeCarpules} карп.)`;
}
