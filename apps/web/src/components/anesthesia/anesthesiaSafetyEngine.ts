/**
 * anesthesiaSafetyEngine.ts — Clinical Anesthesia Safety & MRD Engine
 */
import {
	ANESTHESIA_DRUG_CATALOG,
	type AnesthesiaCalculationInput,
	type AnesthesiaDrugSpec,
	type AnesthesiaSafetyZone,
	type AnestheticDrugId,
	type ComprehensiveAnesthesiaCalculationResult,
	calculateComprehensiveAnesthesiaSafety,
	calculateEffectiveMgPerKg,
	EPINEPHRINE_CEILINGS_MG,
	isGeriatricPatient,
	isPediatricPatient,
	type PatientAnesthesiaProfile,
	screenPatientContraindications as sharedScreenPatientContraindications,
} from "@dental/shared";

export type {
	AnesthesiaCalculationInput,
	AnesthesiaDrugSpec,
	AnesthesiaSafetyZone,
	AnestheticDrugId,
	PatientAnesthesiaProfile,
};
export type AnestheticDrugKey = AnestheticDrugId;
export type VasoconstrictorRatio = "1:100000" | "1:200000" | "none";
export type AsaClassification = "asa_1" | "asa_2" | "asa_3" | "asa_4";
export type AnesthesiaCalculationResult =
	ComprehensiveAnesthesiaCalculationResult;

export {
	ANESTHESIA_DRUG_CATALOG,
	calculateEffectiveMgPerKg,
	EPINEPHRINE_CEILINGS_MG,
	isGeriatricPatient,
	isPediatricPatient,
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
	const drug =
		ANESTHESIA_DRUG_CATALOG[drugId] ||
		ANESTHESIA_DRUG_CATALOG.articaine_4_epi_100k;
	const warnings = [...base.warnings];
	let recAltId = base.recommendedAlternativeId;

	if (profile.takesBetaBlockers) {
		const is100k = drug.vasoconstrictorRatio === "1:100000";
		warnings.push(
			is100k
				? "ВНИМАНИЕ (Бета-блокаторы): адреналин 1:100 000 повышает риск прессорной реакции. Рекомендован Скандонест."
				: "КАРДИОРИСК: Лимит адреналина 0.04 мг. Контроль АД/ЧСС. Рекомендован Скандонест.",
		);
		recAltId = "mepivacaine_3_plain";
	}

	const hasIhd =
		profile.hasIschemicHeartDisease || profile.hasMyocardialInfarctionHistory;
	if (hasIhd && drug.vasoconstrictorRatio === "1:100000") {
		warnings.push(
			"КАРДИОРИСК: Ишемическая болезнь сердца (ИБС) / перенесенный инфаркт миокарда. Рекомендован Скандонест (Мепивакаин 3% без адреналина). Решение принимает лечащий врач.",
		);
		recAltId = "mepivacaine_3_plain";
	}

	return {
		isBlocked: base.blockingContraindications.length > 0,
		blockingContraindications: base.blockingContraindications,
		warnings,
		recommendedAlternativeId: recAltId,
		recommendedAlternativeKey: recAltId,
	};
}

export function calculateAnesthesiaSafety(
	input: AnesthesiaCalculationInput & {
		takesBetaBlockers?: boolean | undefined;
		hasIschemicHeartDisease?: boolean | undefined;
		hasMyocardialInfarctionHistory?: boolean | undefined;
	},
): ComprehensiveAnesthesiaCalculationResult {
	const hasCardio = Boolean(
		input.hasCardiovascularRisk ||
			input.takesBetaBlockers ||
			input.hasIschemicHeartDisease ||
			input.hasMyocardialInfarctionHistory ||
			(input.bpDiastolic ?? 0) >= 90,
	);
	return calculateComprehensiveAnesthesiaSafety({
		...input,
		hasCardiovascularRisk: hasCardio,
	});
}

export function formatAnesthesiaRemainingDoseRu(
	injected: number,
	maxSafe: number,
	volMl = 1.7,
): string {
	const remaining = Math.max(0, Math.floor((maxSafe - injected) * 10) / 10);
	const vol = (injected * volMl).toFixed(1);
	return `Введено: ${vol} мл (${injected} карп.) · Безопасный остаток: ${remaining} карп. (предел: ${maxSafe} карп.)`;
}
