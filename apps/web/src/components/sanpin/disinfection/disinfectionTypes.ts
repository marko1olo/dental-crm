export type DisinfectionRoomType =
	| "surgical"
	| "therapeutic"
	| "orthopedic"
	| "sterilization_cso"
	| "xray";

export type DisinfectionApplicationMethod = "wiping" | "spraying" | "immersion";

export interface DisinfectantConcentrationPreset {
	readonly percent: number;
	readonly exposureMinutes: number;
	readonly targetRegimeRu: string;
	readonly recommendedUsageRu: string;
}

export interface DisinfectantBrandPreset {
	readonly id: string;
	readonly nameRu: string;
	readonly activeIngredientRu: string;
	readonly standardWipingRateMlPerM2: number;
	readonly standardSprayingRateMlPerM2: number;
	readonly standardImmersionLitersPerSet: number;
	readonly availableConcentrations: readonly DisinfectantConcentrationPreset[];
}

export interface DisinfectionSolutionCalculationResult {
	readonly treatedAreaM2: number;
	readonly rateMlPerM2: number;
	readonly totalSolutionVolumeLiters: number;
	readonly requiredConcentrateVolumeMl: number;
	readonly requiredWaterVolumeLiters: number;
	readonly concentrationPercent: number;
	readonly exposureMinutes: number;
	readonly applicationMethod: DisinfectionApplicationMethod;
}

export interface ToolImmersionCalculationResult {
	readonly instrumentSetsCount: number;
	readonly litersPerSet: number;
	readonly totalSolutionVolumeLiters: number;
	readonly requiredConcentrateVolumeMl: number;
	readonly requiredWaterVolumeLiters: number;
	readonly concentrationPercent: number;
	readonly exposureMinutes: number;
}

export interface GeneralCleaningScheduleStatus {
	readonly roomName: string;
	readonly roomType: DisinfectionRoomType;
	readonly lastCleaningDate: string;
	readonly nextPlannedDate: string;
	readonly daysElapsed: number;
	readonly daysRemaining: number;
	readonly isOverdue: boolean;
	readonly status: "optimal" | "approaching_limit" | "overdue";
	readonly statusMessageRu: string;
}

export interface DisinfectionJournalRecord {
	readonly id: string;
	readonly logDate: string;
	readonly roomName: string;
	readonly roomType: DisinfectionRoomType;
	readonly cleaningType: "general" | "current_routine";
	readonly treatedAreaM2: number;
	readonly applicationMethod: DisinfectionApplicationMethod;
	readonly disinfectantName: string;
	readonly activeIngredient: string;
	readonly concentrationPercent: number;
	readonly solutionVolumeLiters: number;
	readonly concentrateVolumeMl: number;
	readonly waterVolumeLiters: number;
	readonly exposureMinutes: number;
	readonly uvIrradiationMinutes: number;
	readonly ventilationMinutes: number;
	readonly operatorStaffFullName: string;
	readonly operatorStaffPosition: string;
	readonly isInspectorVerified: boolean;
	readonly inspectorStaffFullName?: string | undefined;
	readonly notes?: string | undefined;
}
