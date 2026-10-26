import type {
	AnestheticDrugId,
	AnestheticDrugInfo,
	InjectionTechniqueId,
	NeedleGaugeType,
} from "../anesthesiaCatalog.js";

export type AsaPhysicalStatus = "asa_1" | "asa_2" | "asa_3" | "asa_4";

export type PatientAgeCategory = "adult" | "pediatric" | "geriatric";

export type AnesthesiaSafetyZone =
	| "safe"
	| "caution"
	| "warning"
	| "overdose_danger";

export interface AnesthesiaCalculationInput {
	drugId: AnestheticDrugId;
	carpulesCount: number;
	patientWeightKg?: number | null | undefined;
	patientAgeYears: number;
	asaStatus: AsaPhysicalStatus;
	hasCardiovascularRisk: boolean;
	hasHypertension?: boolean | undefined;
	hasCardiacArrhythmia?: boolean | undefined;
	hasIschemicHeartDisease?: boolean | undefined;
	hasMyocardialInfarctionHistory?: boolean | undefined;
	takesBetaBlockers?: boolean | undefined;
	takesTricyclicAntidepressants?: boolean | undefined;
	takesMaoInhibitors?: boolean | undefined;
	hasThyrotoxicosis?: boolean | undefined;
	hasSulfiteAllergy: boolean;
	hasBronchialAsthma: boolean;
	isPregnantOrLactating: boolean;
	isSomaticallyHealthy?: boolean | undefined;
	techniqueId: InjectionTechniqueId;
	needleType: NeedleGaugeType;
	targetToothNumberFdi?: number | string | undefined;
	aspirationNegativeConfirmed: boolean;
	carpuleBatch?:
		| {
				seriesNumber: string;
				batchNumber: string;
				expirationDate: string;
		  }
		| undefined;
	nurseFullName?: string | undefined;
	bpSystolic?: number | undefined;
	bpDiastolic?: number | undefined;
	heartRateBpm?: number | undefined;
	spo2Percent?: number | undefined;
	overrideReason?: string | undefined;
}

export interface AnesthesiaCalculationResult {
	drug: AnestheticDrugInfo;
	carpulesCount: number;
	injectedVolumeMl: number;
	injectedActiveMg: number;
	injectedEpinephrineMg: number;
	maxSafeActiveMg: number;
	maxSafeEpinephrineMg: number;
	maxSafeCarpulesCount: number;
	remainingSafeCarpulesCount: number;
	percentOfMaxDose: number;
	percentOfEpiMaxDose: number;
	safetyZone: AnesthesiaSafetyZone;
	isOverdose: boolean;
	isEpinephrineOverdose: boolean;
	isCardioRisk: boolean;
	isSomaticallyHealthy: boolean;
	cardioRiskReasons: string[];
	ageCategory: PatientAgeCategory;
	ageDoseReductionFactor: number;
	contraindicationsTriggered: string[];
	warnings: string[];
	diaryEntryRu: string;
}

export const EPINEPHRINE_CEILINGS_MG = {
	healthyAdult: 0.2, // 200 mcg for ASA I & II
	cardiovascularRisk: 0.04, // 40 mcg for ASA III & IV, IHD, Beta-blockers
} as const;

export const ASA_CLASSIFICATIONS: Record<
	AsaPhysicalStatus,
	{ nameRu: string; epiLimitMg: number; descriptionRu: string }
> = {
	asa_1: {
		nameRu: "ASA I: Здоровый пациент",
		epiLimitMg: 0.2,
		descriptionRu: "Без системных патологий, физиологическая норма.",
	},
	asa_2: {
		nameRu: "ASA II: Легкое системное заболевание",
		epiLimitMg: 0.2,
		descriptionRu:
			"Компенсированная гипертония, легкая астма, курение, контролируемый диабет 2 типа.",
	},
	asa_3: {
		nameRu: "ASA III: Тяжелое системное заболевание",
		epiLimitMg: 0.04,
		descriptionRu:
			"ИБС, стенокардия напряжения, перенесенный инфаркт (>6 мес), ХОБЛ, инсулинозависимый диабет.",
	},
	asa_4: {
		nameRu: "ASA IV: Заболевание, угрожающее жизни",
		epiLimitMg: 0.04,
		descriptionRu:
			"Нестабильная стенокардия, недавний инфаркт (<6 мес), декомпенсированная сердечная недостаточность.",
	},
};
