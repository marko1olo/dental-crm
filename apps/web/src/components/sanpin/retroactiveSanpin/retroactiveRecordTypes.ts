export type PeriodPreset =
	| "last_week"
	| "current_month"
	| "previous_month"
	| "current_quarter"
	| "custom";

export interface CabinetOption {
	readonly id: string;
	readonly nameRu: string;
	readonly shortName: string;
	readonly volumeM3: number;
	readonly defaultDoctor: string;
}

export interface AutoclaveRegimeConfig {
	readonly id: "steam_134_5min" | "steam_134_20min" | "steam_121_20min" | "dry_heat_180_60min";
	readonly nameRu: string;
	readonly temperatureCelsius: number;
	readonly pressureBar: number;
	readonly durationMinutes: number;
	readonly indicatorClass: string;
	readonly indicatorNameRu: string;
}

export interface RetroactiveGenerationOptions {
	readonly preset: PeriodPreset;
	readonly startDate?: string | undefined;
	readonly endDate?: string | undefined;
	readonly selectedCabinets: readonly string[];
	readonly dutyNurseFullName: string;
	readonly dutyNursePosition: string;
	readonly autoclaveRegimeId: "steam_134_5min" | "steam_134_20min" | "steam_121_20min" | "dry_heat_180_60min";
	readonly sterilizerModelName: string;
	readonly excludeSundays?: boolean | undefined;
	readonly averageVisitsPerCabinetDay?: number | undefined;
}

export interface RetroactiveDayRecord {
	readonly id: string;
	date: string;
	dayOfWeekRu: string;
	isWorkingDay: boolean;
	cabinetsCount: number;
	cabinetsListRu: string;
	visitsCount: number;
	traysProcessedCount: number;
	psoBatchCount: number;
	psoSampleCount: number;
	psoSampleRequirementRu: string;
	isAzopyramNegative: boolean;
	isPhenolphthaleinNegative: boolean;
	isPsoApproved: boolean;
	psoDetergent: string;
	autoclaveCyclesCount: number;
	autoclaveRegimeTitle: string;
	autoclaveTemperature: number;
	autoclavePressure: number;
	autoclaveDuration: number;
	points5Passed: boolean;
	indicatorTradeName: string;
	recirculatorOperatingHours: number;
	isGeneralCleaningDay: boolean;
	cleaningTypeRu: string;
	cleaningDisinfectant: string;
	cabinetsReadinessStatus: "ready_sterile" | "partial" | "not_conducted";
	cabinetsReadinessMessageRu: string;
	wasteClassBWeightKg: number;
	wasteClassAWeightKg: number;
	refrigeratorTempMorning: number;
	refrigeratorTempEvening: number;
	roomTempMorning: number;
	roomHumidityMorning: number;
	sanpinCompliance100: boolean;
	nurseFullName: string;
	electronicStampHash: string;
	isSavedToDb: boolean;
	notes: string;
}
