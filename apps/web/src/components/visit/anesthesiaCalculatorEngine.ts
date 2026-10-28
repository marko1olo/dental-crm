/**
 * anesthesiaCalculatorEngine.ts
 * Clean EBM Local Anesthesia Contract for Dental CRM.
 * Mandates: 8e (Doctor Autonomy), 8n (Solo Doctor Sovereignty), 8y (Zero Pharma Paranoia).
 */

import {
	ANESTHESIA_DRUGS,
	ANESTHESIA_DRUG_CATALOG,
	ANESTHESIA_METHODS,
	CARDIO_LIMIT_BADGE_TEXT,
	CARDIO_MAX_EPINEPHRINE_MG,
	EPINEPHRINE_BLOCKED_BADGE_TEXT,
	HEALTHY_MAX_EPINEPHRINE_MG,
	calculatePatientMrd as calculateCanonicalPatientMrd,
	calculateVisitAnesthesiaSafety,
	checkAnesthesiaSomaticContraindications,
	extractSomaticRiskProfileFromText,
	formatAnesthesiaSoapText,
	resolveAutopilotAnesthesia,
	resolveClinicalDefaultWeightKg,
	type AnesthesiaDrugDefinition,
	type AnesthesiaDrugKey,
	type AnesthesiaMethodKey,
	type AnesthesiaSafetyLevel,
	type AnesthesiaSafetyParams,
	type AnesthesiaSoapRecordParams,
	type AnesthesiaSomaticAlert,
	type AutopilotResolutionResult,
	type PatientMrdCalculation,
	type SomaticAlertSeverity,
	type SomaticCrossCheckResult,
	type SomaticRiskProfile,
	type VisitAnesthesiaCalculationResult,
} from "@dental/shared";

export type {
	AnesthesiaDrugKey,
	AnesthesiaMethodKey,
	AnesthesiaDrugDefinition,
	AnesthesiaSafetyLevel,
	SomaticAlertSeverity,
	SomaticRiskProfile,
	AnesthesiaSomaticAlert,
	SomaticCrossCheckResult,
	AnesthesiaSafetyParams,
	PatientMrdCalculation,
	AutopilotResolutionResult,
	AnesthesiaSoapRecordParams,
};

export type AnesthesiaCalculationResult = VisitAnesthesiaCalculationResult;

export {
	HEALTHY_MAX_EPINEPHRINE_MG,
	CARDIO_MAX_EPINEPHRINE_MG,
	CARDIO_LIMIT_BADGE_TEXT,
	EPINEPHRINE_BLOCKED_BADGE_TEXT,
	ANESTHESIA_DRUGS,
	ANESTHESIA_METHODS,
	ANESTHESIA_DRUG_CATALOG,
	extractSomaticRiskProfileFromText,
	checkAnesthesiaSomaticContraindications,
	calculateCanonicalPatientMrd,
	calculateCanonicalPatientMrd as calculatePatientMrd,
	resolveAutopilotAnesthesia,
	formatAnesthesiaSoapText,
	resolveClinicalDefaultWeightKg,
	calculateVisitAnesthesiaSafety,
};

/**
 * 1-Click Physiological Norm preset (Mandate 8e / 8y)
 * Standard infiltration/conduction for healthy adult: 1 carpule (1.7 ml) Ultracain D-S
 */
export function get1ClickPhysiologicalNorm(drugKey: AnesthesiaDrugKey = "ultracain_ds") {
	const drug = ANESTHESIA_DRUGS[drugKey] ?? ANESTHESIA_DRUGS.ultracain_ds;
	return {
		drugKey,
		carpulesCount: 1,
		volumeMl: drug.volumeMlPerCarpule,
		activeSubstanceMg: drug.mgPerCarpule,
		adrenalineMg: drug.epinephrineMgPerCarpule,
		isSafeNorm: true,
	};
}

/**
 * Passive Non-Blocking Allergy & Somatic warning string (Mandate 8y)
 */
export function getPassiveAllergyNotice(
	drugKey: AnesthesiaDrugKey,
	somaticProfile?: SomaticRiskProfile,
): string | null {
	if (!somaticProfile) return null;
	const check = checkAnesthesiaSomaticContraindications({ drugKey, somaticProfile });
	const dangerAlerts = check.alerts.filter((a) => a.severity === "danger" || a.severity === "warning");
	if (dangerAlerts.length === 0) return null;
	const msg = dangerAlerts.map((a) => a.message).join("; ");
	return msg.startsWith("⚠️") ? msg : `⚠️ ${msg}`;
}

export function calculateAnesthesiaSafety(
	params: AnesthesiaSafetyParams,
): VisitAnesthesiaCalculationResult {
	const effectiveWeight = resolveClinicalDefaultWeightKg(
		params.patientWeightKg,
		params.patientAgeYears,
		params.isPediatric,
	);
	return calculateVisitAnesthesiaSafety({
		...params,
		patientWeightKg: effectiveWeight,
	});
}

export interface ClinicalCarpulePreset {
	readonly drugKey: AnesthesiaDrugKey;
	readonly labelRu: string;
	readonly carpulesCount: 1 | 2;
	readonly volumeMl: number;
	readonly isAdrenalineFree: boolean;
	readonly isCardioSafe: boolean;
	readonly defaultTechnique: AnesthesiaMethodKey;
}

export const CLINICAL_CHAIRSIDE_ANESTHESIA_PRESETS: readonly ClinicalCarpulePreset[] = [
	{
		drugKey: "septanest_100",
		labelRu: "Септанест 1:100 000 (1 карп. 1.7 мл)",
		carpulesCount: 1,
		volumeMl: 1.7,
		isAdrenalineFree: false,
		isCardioSafe: false,
		defaultTechnique: "infiltration",
	},
	{
		drugKey: "ultracain_ds_forte",
		labelRu: "Убистезин / Ультракаин Д-С форте 1:100 000 (1 карп. 1.7 мл)",
		carpulesCount: 1,
		volumeMl: 1.7,
		isAdrenalineFree: false,
		isCardioSafe: false,
		defaultTechnique: "infiltration",
	},
	{
		drugKey: "scandonest_3",
		labelRu: "Скандонест 3% (без адреналина, 1 карп. 1.7 мл) • Кардио",
		carpulesCount: 1,
		volumeMl: 1.7,
		isAdrenalineFree: true,
		isCardioSafe: true,
		defaultTechnique: "infiltration",
	},
	{
		drugKey: "ultracain_ds",
		labelRu: "Ультракаин Д-С 1:200 000 (1 карп. 1.7 мл) • Щадящий",
		carpulesCount: 1,
		volumeMl: 1.7,
		isAdrenalineFree: false,
		isCardioSafe: false,
		defaultTechnique: "infiltration",
	},
];

/**
 * 1-клик запись в карту приёма без псевдонаучных симуляций
 */
export function formatClinicalChairsideEntry(params: {
	drugKey: AnesthesiaDrugKey | "none";
	carpulesCount?: number;
	toothNumber?: number | string;
	technique?: string;
}): string {
	if (params.drugKey === "none" || params.carpulesCount === 0) {
		return "Анестезия не проводилась (лечение проведено без анестезии по согласию пациента).";
	}
	const count = params.carpulesCount ?? 1;
	const vol = Math.round(count * 1.7 * 10) / 10;
	const drugName =
		params.drugKey === "scandonest_3"
			? "Скандонест 3% (Мепивакаин без адреналина)"
			: params.drugKey === "ultracain_ds"
				? "Ультракаин Д-С (Артикаин 4% + адреналин 1:200 000)"
				: params.drugKey === "septanest_100"
					? "Септанест 1:100 000 (Артикаин 4% + адреналин 1:100 000)"
					: "Убистезин форте / Ультракаин Д-С форте (Артикаин 4% + адреналин 1:100 000)";
	const tech = params.technique ?? "Инфильтрационная";
	const toothArea = params.toothNumber ? ` в области зуба ${params.toothNumber}` : "";
	return `${tech} анестезия препаратом ${drugName} ${vol} мл (${count} карп.)${toothArea}. Аспирационная проба отрицательная. Обезболивание глубокое, без осложнений.`;
}

export * from "../anesthesia/anesthesiaCatalog.js";
export * from "../anesthesia/anesthesiaEngine.js";
