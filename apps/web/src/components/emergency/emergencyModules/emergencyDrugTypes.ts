/**
 * Emergency Drug Types (Layer 0)
 * Single Source of Truth for resuscitation pharmacopeia.
 */

export type EmergencyDrugId =
	| 'adrenaline_epi_01'
	| 'prednisolone_30mg'
	| 'dexamethasone_4mg'
	| 'diazepam_relanium'
	| 'glucose_dextrose_40'
	| 'lipid_emulsion_20'
	| 'salbutamol_spray'
	| 'nitroglycerin_sublingual'
	| 'captopril_sublingual'
	| 'moxonidine_sublingual'
	| 'aminophylline_euphylline'
	| 'suprastin_2_percent'
	| 'atropine_01';

export interface EmergencyDosageResult {
	drugId: EmergencyDrugId;
	drugNameRu: string;
	concentrationRu: string;
	routeRu: string;
	calculatedDoseMg: number;
	calculatedVolumeMl: number;
	numberOfAmpoules: number;
	instructionsRu: string;
	repeatIntervalMinutes?: number | undefined;
	maxSingleDoseRu?: string | undefined;
	maxDailyDoseRu?: string | undefined;
	contraindicationsRu: string[];
	isPediatricDose: boolean;
}

export interface LipidRescueDoseCalculation {
	weightKg: number;
	bolusVolumeMl: number;
	bolusDurationMinutes: number;
	repeatBolusVolumeMl: number;
	maxRepeatBoluses: number;
	infusionRateMlPerMin: number;
	infusionRateMlPerHour: number;
	maxTotalDoseMl: number;
	protocolInstructionsRu: string;
}

export interface StatutoryEmergencyKitItem {
	readonly drugId: EmergencyDrugId;
	readonly tradeNameRu: string;
	readonly dosageStandardRu: string;
	readonly routeRu: string;
	readonly indicationsRu: string;
	readonly statutoryOrderRu: string;
}
