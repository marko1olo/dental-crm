/**
 * ============================================================================
 * RETROACTIVE SANPIN TYPES (Layer 0)
 * Типы ретроспективных записей, циклов стерилизации и аудита журналов СанПиН:
 * - Форма № 366/у (ПСО, азопирам, фенолфталеин)
 * - Форма № 257/у (Автоклавы, 5 точек КТ-1..5, индикаторы)
 * - Санитарный аудит по СП 2.1.3678-20 и СанПиН 3.3686-21
 * ============================================================================
 */

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
	readonly startDate?: string | undefined; // YYYY-MM-DD
	readonly endDate?: string | undefined; // YYYY-MM-DD
	readonly selectedCabinets: readonly string[]; // IDs
	readonly dutyNurseFullName: string;
	readonly dutyNursePosition: string;
	readonly autoclaveRegimeId: "steam_134_5min" | "steam_134_20min" | "steam_121_20min" | "dry_heat_180_60min";
	readonly sterilizerModelName: string;
	readonly excludeSundays?: boolean | undefined;
	readonly averageVisitsPerCabinetDay?: number | undefined;
}

export interface RetroactiveDayRecord {
	readonly id: string;
	date: string; // YYYY-MM-DD
	dayOfWeekRu: string;
	isWorkingDay: boolean;
	cabinetsCount: number;
	cabinetsListRu: string;
	visitsCount: number;
	traysProcessedCount: number;
	// PSO
	psoBatchCount: number;
	psoSampleCount: number;
	psoSampleRequirementRu: string;
	isAzopyramNegative: boolean;
	isPhenolphthaleinNegative: boolean;
	isPsoApproved: boolean;
	psoDetergent: string;
	// Autoclave 257/u
	autoclaveCyclesCount: number;
	autoclaveRegimeTitle: string;
	autoclaveTemperature: number;
	autoclavePressure: number;
	autoclaveDuration: number;
	points5Passed: boolean;
	indicatorTradeName: string;
	// Recirculators
	recirculatorOperatingHours: number;
	// Cleanings
	isGeneralCleaningDay: boolean;
	cleaningTypeRu: string;
	cleaningDisinfectant: string;
	// Cabinet Readiness
	cabinetsReadinessStatus: "ready_sterile" | "partial" | "not_conducted";
	cabinetsReadinessMessageRu: string;
	// Waste
	wasteClassBWeightKg: number;
	wasteClassAWeightKg: number;
	// Temperature
	refrigeratorTempMorning: number;
	refrigeratorTempEvening: number;
	roomTempMorning: number;
	roomHumidityMorning: number;
	// Status & Stamp
	sanpinCompliance100: boolean;
	nurseFullName: string;
	electronicStampHash: string;
	isSavedToDb: boolean;
	notes: string;
}

export interface RetroactiveBatchStats {
	readonly totalDays: number;
	readonly workingDaysCount: number;
	readonly totalTraysProcessed: number;
	readonly totalPsoSamplesTested: number;
	readonly totalAutoclaveCycles: number;
	readonly totalRecirculatorHours: number;
	readonly generalCleaningsCount: number;
	readonly totalWasteKg: number;
	readonly compliancePercentage: number;
}

export interface DossierPrintMeta {
	readonly clinicName?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly chiefDoctorName?: string | undefined;
	readonly headNurseName?: string | undefined;
	readonly periodLabelRu?: string | undefined;
}

export interface RetroactiveValidationIssue {
	readonly code: string;
	readonly messageRu: string;
	readonly severity: "error" | "warning";
	readonly statutoryNorm: string;
}

export interface RetroactiveValidationResult {
	readonly recordId: string;
	readonly date: string;
	readonly isCompliant: boolean;
	readonly issues: readonly RetroactiveValidationIssue[];
}

export interface RetroactiveComplianceAudit {
	readonly totalDaysAudited: number;
	readonly compliantDaysCount: number;
	readonly complianceRatePercent: number;
	readonly totalIssuesFound: number;
	readonly results: readonly RetroactiveValidationResult[];
}
