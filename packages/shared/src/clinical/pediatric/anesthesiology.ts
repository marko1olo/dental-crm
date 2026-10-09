// ------------------------------------------------------------------------------------------------
// PEDIATRIC LOCAL ANESTHESIOLOGY DOSAGE & SAFETY LIMITS (AAPD & Russian Clinical Standard)
// ------------------------------------------------------------------------------------------------

export interface PediatricAnestheticCalculation {
	readonly drugName: string;
	readonly activeSubstance: string;
	readonly concentrationPercent: number;
	readonly vasoconstrictorRatio: "1:200000" | "1:100000" | "none";
	readonly patientWeightKg: number;
	readonly patientAgeYears: number;
	readonly mrdPerKgMg: number;
	readonly maxAllowedTotalDoseMg: number;
	readonly singleCarpuleDoseMg: number;
	readonly singleCarpuleVolumeMl: number;
	readonly maxSafeCarpulesCount: number;
	readonly carpulesAdministered: number;
	readonly totalDoseAdministeredMg: number;
	readonly totalEpinephrineAdministeredMg: number;
	readonly doseUtilizationPercent: number;
	readonly isSafe: boolean;
	readonly isOverdose: boolean;
	readonly isAgeContraindicated: boolean;
	readonly safetyWarningsRu: readonly string[];
}

export const PEDIATRIC_ANESTHETIC_DOSAGE_LIMITS = {
	articaine4Percent: {
		drugCode: "articaine",
		nameRu: "Артикаин 4% с эпинефрином 1:200 000 (Ультракаин Д-С / Септанест)",
		concentrationPercent: 4.0,
		vasoconstrictorRatio: "1:200000" as const,
		minAgeYears: 4,
		maxDosePerKgMg: 5.0, // 5.0 mg/kg pediatric standard for children 4-12 years
		absoluteMaxDoseMg: 500,
		carpuleVolumeMl: 1.7,
		mgPerCarpule: 68.0, // 40 mg/ml * 1.7 ml = 68 mg
		epinephrinePerCarpuleMg: 0.0085, // 0.005 mg/ml * 1.7 ml = 0.0085 mg
	},
	mepivacaine3Percent: {
		drugCode: "mepivacaine",
		nameRu: "Мепивакаин 3% без вазоконстриктора (Скандонест)",
		concentrationPercent: 3.0,
		vasoconstrictorRatio: "none" as const,
		minAgeYears: 4,
		maxDosePerKgMg: 4.4,
		absoluteMaxDoseMg: 300,
		carpuleVolumeMl: 1.8,
		mgPerCarpule: 54.0,
		epinephrinePerCarpuleMg: 0,
	},
	lidocaine2Percent: {
		drugCode: "lidocaine",
		nameRu: "Лидокаин 2% с адреналином 1:200 000",
		concentrationPercent: 2.0,
		vasoconstrictorRatio: "1:200000" as const,
		minAgeYears: 4,
		maxDosePerKgMg: 4.4,
		absoluteMaxDoseMg: 300,
		carpuleVolumeMl: 2.0,
		mgPerCarpule: 40.0,
		epinephrinePerCarpuleMg: 0.01,
	},
} as const;

/**
 * Расчёт предельно допустимой дозы (MRD) анестетика для детей:
 * - Артикаин 4% с вазоконстриктором 1:200 000: максимум 5.0 мг/кг (детям от 4 лет).
 * - До 4 лет применение артикаина противопоказано.
 */
export function calculatePediatricAnestheticSafety(params: {
	drugType?: "articaine4Percent" | "mepivacaine3Percent" | "lidocaine2Percent";
	patientWeightKg: number;
	patientAgeYears: number;
	carpulesAdministered: number;
	carpuleVolumeMl?: number;
}): PediatricAnestheticCalculation {
	const drugType = params.drugType ?? "articaine4Percent";
	const spec = PEDIATRIC_ANESTHETIC_DOSAGE_LIMITS[drugType];
	const weight = Math.max(5, Math.min(100, params.patientWeightKg));
	const age = params.patientAgeYears;
	const carpules = Math.max(0, params.carpulesAdministered);
	const carpuleVol = params.carpuleVolumeMl ?? spec.carpuleVolumeMl;

	const warnings: string[] = [];
	let isAgeContraindicated = false;

	if (age < spec.minAgeYears) {
		isAgeContraindicated = true;
		warnings.push(`Препарат ${spec.nameRu} противопоказан детям в возрасте до ${spec.minAgeYears} лет.`);
	}

	const mrdPerKg = spec.maxDosePerKgMg;
	const maxAllowedTotalDoseMg = Number(Math.min(spec.absoluteMaxDoseMg, weight * mrdPerKg).toFixed(1));
	const mgPerMl = spec.concentrationPercent * 10;
	const singleCarpuleDoseMg = Number((mgPerMl * carpuleVol).toFixed(1));
	const totalDoseAdministeredMg = Number((carpules * singleCarpuleDoseMg).toFixed(1));

	let epiPerMl = 0;
	if (spec.vasoconstrictorRatio === "1:200000") epiPerMl = 0.005;
	else if ((spec.vasoconstrictorRatio as string) === "1:100000") epiPerMl = 0.01;
	const totalEpinephrineAdministeredMg = Number((carpules * carpuleVol * epiPerMl).toFixed(4));

	const maxSafeCarpulesCount = Number((maxAllowedTotalDoseMg / (singleCarpuleDoseMg || 1)).toFixed(2));
	const doseUtilizationPercent = Number(((totalDoseAdministeredMg / (maxAllowedTotalDoseMg || 1)) * 100).toFixed(1));
	const isOverdose = totalDoseAdministeredMg > maxAllowedTotalDoseMg;

	if (isOverdose) {
		warnings.push(
			`ПРЕВЫШЕНА МАКСИМАЛЬНАЯ ДОЗА АНЕСТЕТИКА: введено ${totalDoseAdministeredMg} мг (лимит ${maxAllowedTotalDoseMg} мг на вес ${weight} кг). Максимум ${maxSafeCarpulesCount} карпул(ы).`,
		);
	}

	if ((spec.vasoconstrictorRatio as string) === "1:100000") {
		warnings.push("В детской практике рекомендуется вазоконстриктор 1:200 000 (снижение кардио-нагрузки).");
	}

	return {
		drugName: spec.nameRu,
		activeSubstance: spec.drugCode,
		concentrationPercent: spec.concentrationPercent,
		vasoconstrictorRatio: spec.vasoconstrictorRatio,
		patientWeightKg: weight,
		patientAgeYears: age,
		mrdPerKgMg: mrdPerKg,
		maxAllowedTotalDoseMg,
		singleCarpuleDoseMg,
		singleCarpuleVolumeMl: carpuleVol,
		maxSafeCarpulesCount,
		carpulesAdministered: carpules,
		totalDoseAdministeredMg,
		totalEpinephrineAdministeredMg,
		doseUtilizationPercent,
		isSafe: !isOverdose && !isAgeContraindicated,
		isOverdose,
		isAgeContraindicated,
		safetyWarningsRu: warnings,
	};
}
