import type { SomaticRiskProfile } from "../visit/anesthesiaCalculatorEngine";

export type PediatricAnestheticDrugId = "articaine_4" | "mepivacaine_3";

export interface PediatricAnestheticSpec {
	readonly id: PediatricAnestheticDrugId;
	readonly ssotDrugId: string;
	readonly nameRu: string;
	readonly shortLabelRu: string;
	readonly tradeNamesRu: string;
	readonly concentrationPercent: number;
	readonly mgPerMl: number;
	readonly standardCarpuleVolumeMl: number;
	readonly mgPerCarpule: number;
	readonly maxDoseMgPerKg: number;
	readonly absoluteMaxDoseMg: number;
	readonly vasoconstrictorRu: string;
	readonly minAgeYears: number;
	readonly descriptionRu: string;
}

export const PEDIATRIC_ANESTHETIC_SPECS: Readonly<Record<PediatricAnestheticDrugId, PediatricAnestheticSpec>> = {
	articaine_4: {
		id: "articaine_4", ssotDrugId: "articaine_1_200k", nameRu: "Артикаин 4% с эпинефрином 1:200 000",
		shortLabelRu: "Артикаин 4% (макс 5 мг/кг)", tradeNamesRu: "Ультракаин Д-С / Септанест / Убистезин",
		concentrationPercent: 4.0, mgPerMl: 40.0, standardCarpuleVolumeMl: 1.7, mgPerCarpule: 68.0,
		maxDoseMgPerKg: 5.0, absoluteMaxDoseMg: 500.0, vasoconstrictorRu: "Эпинефрин 1:200 000 (0.0085 мг/карп)",
		minAgeYears: 4, descriptionRu: "Препарат выбора для детской анестезии от 4 лет.",
	},
	mepivacaine_3: {
		id: "mepivacaine_3", ssotDrugId: "mepivacaine_plain", nameRu: "Мепивакаин 3% без вазоконстриктора",
		shortLabelRu: "Мепивакаин 3% (макс 4.4 мг/кг)", tradeNamesRu: "Скандонест 3% / Мепивастезин",
		concentrationPercent: 3.0, mgPerMl: 30.0, standardCarpuleVolumeMl: 1.7, mgPerCarpule: 51.0,
		maxDoseMgPerKg: 4.4, absoluteMaxDoseMg: 300.0, vasoconstrictorRu: "Без вазоконстриктора (Адреналин-free)",
		minAgeYears: 4, descriptionRu: "Для детей с аллергией на сульфиты, астмой, кардиопатологией.",
	},
};

export interface PediatricAnesthesiaCalculationResult {
	readonly drug: PediatricAnestheticSpec;
	readonly patientWeightKg: number;
	readonly carpulesAdministered: number;
	readonly totalVolumeMl: number;
	readonly maxAllowedTotalDoseMg: number;
	readonly totalDoseAdministeredMg: number;
	readonly maxSafeCarpulesCount: number;
	readonly doseUtilizationPercent: number;
	readonly isSafe: boolean;
	readonly isOverdose: boolean;
	readonly isUnderAge: boolean;
	readonly isContraindicated: boolean;
	readonly contraindicationReasonRu?: string | undefined;
	readonly alertMessageRu?: string | undefined;
	readonly formattedClinicalNote: string;
	readonly formattedText043: string;
}

export function checkPediatricAnesthesiaContraindications(somaticProfile?: SomaticRiskProfile, allergies?: string) {
	let articaineBlocked = Boolean(somaticProfile?.hasArticaineAllergy || somaticProfile?.hasSulfiteAllergy || somaticProfile?.hasBronchialAsthma || somaticProfile?.hasThyrotoxicosis);
	let mepivacaineBlocked = Boolean(somaticProfile?.hasMepivacaineAllergy);

	if (typeof allergies === "string" && allergies.trim()) {
		const l = allergies.toLowerCase();
		if (["артикаин", "ультракаин", "септанест", "убистезин", "сульфит", "метабисульфит", "астма"].some((t) => l.includes(t))) articaineBlocked = true;
		if (["мепивакаин", "скандонест", "мепивастезин"].some((t) => l.includes(t))) mepivacaineBlocked = true;
	}

	const reason = articaineBlocked
		? "ПРОТИВОПОКАЗАНИЕ: Аллергия на артикаин/сульфиты или астма/тиреотоксикоз. Рекомендуется Мепивакаин 3%."
		: mepivacaineBlocked ? "ПРОТИВОПОКАЗАНИЕ: Аллергия на мепивакаин (скандонест)!" : undefined;

	return { isArticaineContraindicated: articaineBlocked, isMepivacaineContraindicated: mepivacaineBlocked, contraindicationReasonRu: reason };
}

export function calculatePediatricAnesthesia(params: {
	readonly drug: PediatricAnestheticSpec; readonly selectedDrugId: PediatricAnestheticDrugId;
	readonly weightKg: number; readonly carpules: number; readonly patientAgeYears: number;
	readonly articaineContraindicated: boolean; readonly mepivacaineContraindicated: boolean;
}): PediatricAnesthesiaCalculationResult {
	const { drug, selectedDrugId, weightKg, carpules, patientAgeYears, articaineContraindicated, mepivacaineContraindicated } = params;
	const safeWeight = Math.max(5, Math.min(120, weightKg));
	const maxAllowedTotalDoseMg = Number(Math.min(drug.absoluteMaxDoseMg, safeWeight * drug.maxDoseMgPerKg).toFixed(1));
	const totalVolumeMl = Number((carpules * drug.standardCarpuleVolumeMl).toFixed(2));
	const totalDoseAdministeredMg = Number((carpules * drug.mgPerCarpule).toFixed(1));
	const maxSafeCarpulesCount = Number((maxAllowedTotalDoseMg / drug.mgPerCarpule).toFixed(2));
	const doseUtilizationPercent = Number(((totalDoseAdministeredMg / (maxAllowedTotalDoseMg || 1)) * 100).toFixed(1));

	const isOverdose = totalDoseAdministeredMg > maxAllowedTotalDoseMg;
	const isUnderAge = patientAgeYears < drug.minAgeYears;
	const isContraindicated = (selectedDrugId === "articaine_4" && articaineContraindicated) || (selectedDrugId === "mepivacaine_3" && mepivacaineContraindicated);

	const contraindicationReasonRu = selectedDrugId === "articaine_4" && articaineContraindicated
		? "ПРОТИВОПОКАЗАНИЕ: Аллергия на артикаин/сульфиты или астма/тиреотоксикоз. Рекомендован Мепивакаин 3%."
		: selectedDrugId === "mepivacaine_3" && mepivacaineContraindicated ? "ПРОТИВОПОКАЗАНИЕ: Аллергия на мепивакаин (скандонест)!" : undefined;

	const warning = isContraindicated ? `\n• ВНИМАНИЕ: Противопоказание (${contraindicationReasonRu}). Введено под ответственность врача.`
		: isOverdose ? `\n• ВНИМАНИЕ: Превышение расчетной дозы (${totalDoseAdministeredMg} мг > МРД ${maxAllowedTotalDoseMg} мг). Решение врача.` : "";

	const note = [
		`Анестезиологическое пособие: ${drug.nameRu}.`,
		`• Введено: ${carpules} карп. (${totalVolumeMl} мл / ${totalDoseAdministeredMg} мг активного вещества).`,
		`• Вес ребенка: ${safeWeight} кг. Предельно допустимая доза: ${maxAllowedTotalDoseMg} мг (${drug.maxDoseMgPerKg} мг/кг).`,
		`• Расход дозы: ${doseUtilizationPercent}% (макс. ${maxSafeCarpulesCount} карп.) ${isOverdose ? "— ПРЕВЫШЕНИЕ МРД" : "— ДОЗА БЕЗОПАСНА"}.`,
		`• Вазоконстриктор: ${drug.vasoconstrictorRu}.${warning}`,
	].join("\n");

	return {
		drug, patientWeightKg: safeWeight, carpulesAdministered: carpules, totalVolumeMl,
		maxAllowedTotalDoseMg, totalDoseAdministeredMg, maxSafeCarpulesCount, doseUtilizationPercent,
		isSafe: !isOverdose && !isUnderAge && !isContraindicated, isOverdose, isUnderAge, isContraindicated,
		contraindicationReasonRu, alertMessageRu: contraindicationReasonRu || (isOverdose ? "Превышение расчетной дозы" : undefined),
		formattedClinicalNote: note, formattedText043: note,
	};
}
