import type { SomaticRiskProfile } from "../../visit/anesthesiaCalculatorEngine";

export type PediatricAnestheticDrugId = "articaine_4" | "mepivacaine_3";

export interface PediatricAnestheticSpec {
	readonly id: PediatricAnestheticDrugId;
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
		id: "articaine_4",
		nameRu: "Артикаин 4% с эпинефрином 1:200 000",
		shortLabelRu: "Артикаин 4% (макс 5 мг/кг)",
		tradeNamesRu: "Ультракаин Д-С / Септанест / Убистезин",
		concentrationPercent: 4.0,
		mgPerMl: 40.0,
		standardCarpuleVolumeMl: 1.7,
		mgPerCarpule: 68.0,
		maxDoseMgPerKg: 5.0,
		absoluteMaxDoseMg: 500.0,
		vasoconstrictorRu: "Эпинефрин 1:200 000 (0.0085 мг/карп)",
		minAgeYears: 4,
		descriptionRu: "Препарат выбора для детской инфильтрационной и проводниковой анестезии от 4 лет.",
	},
	mepivacaine_3: {
		id: "mepivacaine_3",
		nameRu: "Мепивакаин 3% без вазоконстриктора",
		shortLabelRu: "Мепивакаин 3% (макс 4.4 мг/кг)",
		tradeNamesRu: "Скандонест 3% / Мепивастезин",
		concentrationPercent: 3.0,
		mgPerMl: 30.0,
		standardCarpuleVolumeMl: 1.7,
		mgPerCarpule: 51.0,
		maxDoseMgPerKg: 4.4,
		absoluteMaxDoseMg: 300.0,
		vasoconstrictorRu: "Без вазоконстриктора (Адреналин-free)",
		minAgeYears: 4,
		descriptionRu: "Для детей с аллергией на сульфиты, бронхиальной астмой, кардиопатологией и тиреотоксикозом.",
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
	readonly isContraindicated?: boolean | undefined;
	readonly contraindicationReasonRu?: string | undefined;
	readonly alertMessageRu?: string | undefined;
	readonly formattedClinicalNote: string;
	readonly formattedText043: string;
}

export interface PediatricAnesthesiaCalculatorProps {
	readonly initialWeightKg?: number | undefined;
	readonly patientAgeYears?: number | undefined;
	readonly somaticProfile?: SomaticRiskProfile | undefined;
	readonly allergies?: string | undefined;
	readonly onCalculationChange?: ((result: PediatricAnesthesiaCalculationResult) => void) | undefined;
	readonly onApplyToProtocol?: ((formattedText: string, result: PediatricAnesthesiaCalculationResult) => void) | undefined;
	readonly className?: string | undefined;
}
