/**
 * ============================================================================
 * SANPIN 3.3686-21 & FORM № 257/U STERILIZATION JOURNAL ENGINE — TYPES (LAYER 0)
 * Контракты данных, интерфейсы циклов стерилизации, параметров автоклава,
 * индикаторов, упаковок, биоконтроля и регламентных отчетов.
 * ============================================================================
 */

import type {
	PackagingTypeId,
	SterilizationRegimeId,
} from "../autoclaveLogPresets.js";

// ─────────────────────────────────────────────────────────────────────────────
// DATA CONTRACTS & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export interface ChamberPointEvaluation {
	readonly pointIndex: 1 | 2 | 3 | 4 | 5;
	readonly code: string;
	readonly nameRu: string;
	readonly indicatorId: string;
	readonly indicatorTradeNameRu: string;
	readonly status: "passed" | "failed" | "untested";
	readonly initialColorRu: string;
	readonly actualColorRu: string;
	readonly notes?: string | undefined;
}

export interface PhysicalSensorsData {
	readonly actualTemperatureCelsius: number;
	readonly actualPressureBar: number;
	readonly actualExposureMinutes: number;
}

export interface SterilizationCycleCompliance {
	readonly isCompliant: boolean;
	readonly isTempCompliant: boolean;
	readonly isPressureCompliant: boolean;
	readonly isTimeCompliant: boolean;
	readonly tempDelta: number;
	readonly pressureDelta: number;
	readonly timeDelta: number;
	readonly failureReasons: readonly string[];
}

export interface BiologicalControlTestRecord {
	readonly id: string;
	readonly sterilizerId: string;
	readonly sterilizerCode: string;
	readonly datePlaced: string;
	readonly dateReadout: string;
	readonly bioIndicatorId: string;
	readonly sporeCultureNameRu: string;
	readonly lotNumber: string;
	readonly incubationHours: number;
	readonly incubationTempCelsius: number;
	readonly testPointIndex: 1 | 2 | 3 | 4 | 5;
	readonly result: "sterile_passed" | "growth_failed" | "pending";
	readonly laboratoryName: string;
	readonly protocolNumber: string;
	readonly responsibleSpecialistFullName: string;
	readonly notes?: string | undefined;
}

export interface Form257Record {
	readonly id: string;
	readonly date: string; // YYYY-MM-DD
	readonly cycleNumber: number;
	readonly sterilizerId: string;
	readonly sterilizerCode: string;
	readonly sterilizerBrandModel: string;
	readonly sterilizerSerialNumber: string;
	readonly regimeId: SterilizationRegimeId;
	readonly regimeNameRu: string;
	readonly targetTemperatureCelsius: number;
	readonly targetPressureBar: number;
	readonly targetExposureMinutes: number;
	readonly actualTemperatureCelsius: number;
	readonly actualPressureBar: number;
	readonly actualExposureMinutes: number;
	readonly itemsDescriptionRu: string;
	readonly packsCount: number;
	readonly bixNumber?: string | undefined;
	readonly packagingType: PackagingTypeId;
	readonly packagingNameRu: string;
	readonly shelfLifeDays: number;
	readonly chamberPoints: readonly ChamberPointEvaluation[];
	readonly areAllPointsPassed: boolean;
	readonly chemicalIndicatorNameRu: string;
	readonly bioTestId?: string | undefined;
	readonly bioTestResult?: "sterile_passed" | "growth_failed" | "pending" | undefined;
	readonly isCyclePassed: boolean;
	readonly status: "sterile_passed" | "rejected_defect" | "quarantine";
	readonly rejectionReason?: string | undefined;
	readonly operatorStaffFullName: string;
	readonly operatorStaffPosition: string;
	readonly headNurseSignatureFullName?: string | undefined;
	readonly isHeadNurseVerified: boolean;
	readonly verificationTimestamp?: string | undefined;
	readonly digitalStampHash: string;
	readonly notes?: string | undefined;
	readonly createdAt: string;
}

export interface ClinicLegalInfo {
	readonly name: string;
	readonly ogrn: string;
	readonly inn: string;
	readonly address: string;
	readonly chiefDoctor: string;
	readonly headNurse: string;
}

export interface Form257FilterCriteria {
	readonly searchQuery?: string | undefined;
	readonly startDate?: string | undefined;
	readonly endDate?: string | undefined;
	readonly sterilizerId?: string | undefined;
	readonly regimeId?: SterilizationRegimeId | "all" | undefined;
	readonly status?: "all" | "sterile_passed" | "rejected_defect" | "quarantine" | undefined;
}

export interface SterilizerStatisticsSummary {
	readonly totalCycles: number;
	readonly successfulCycles: number;
	readonly failedCycles: number;
	readonly successRatePercent: number;
	readonly totalPacksProcessed: number;
	readonly cyclesByRegime: Readonly<Record<string, number>>;
	readonly cyclesBySterilizer: Readonly<Record<string, number>>;
	readonly bioTestsTotal: number;
	readonly bioTestsPassed: number;
	readonly bioTestsFailed: number;
	readonly nextBioControlOverdue: boolean;
	readonly daysUntilNextBioControl: number;
}

export interface CreateForm257RecordParams {
	readonly date: string;
	readonly cycleNumber: number;
	readonly sterilizerId: string;
	readonly sterilizerCode?: string | undefined;
	readonly sterilizerBrandModel?: string | undefined;
	readonly sterilizerSerialNumber?: string | undefined;
	readonly regimeId: SterilizationRegimeId;
	readonly sensors: PhysicalSensorsData;
	readonly itemsDescriptionRu: string;
	readonly packsCount: number;
	readonly bixNumber?: string | undefined;
	readonly packagingType: PackagingTypeId;
	readonly chamberPoints: readonly ChamberPointEvaluation[];
	readonly operatorStaffFullName: string;
	readonly operatorStaffPosition?: string | undefined;
	readonly headNurseSignatureFullName?: string | undefined;
	readonly isHeadNurseVerified?: boolean | undefined;
	readonly bioTestId?: string | undefined;
	readonly bioTestResult?: "sterile_passed" | "growth_failed" | "pending" | undefined;
	readonly notes?: string | undefined;
}

export interface MissingSterilizationDaysAuditResult {
	readonly auditedDatesCount: number;
	readonly missingDatesCount: number;
	readonly missingDates: readonly string[];
	readonly isMissingAutoclaveLog: boolean;
	readonly warningMessageRu?: string | undefined;
	readonly recommendationRu?: string | undefined;
}

export interface RegulatoryPsoRecord {
	readonly id: string;
	readonly date: string;
	readonly instrumentName: string;
	readonly batchItemCount: number;
	readonly testedSampleCount: number;
	readonly isAzopyramNegative: boolean;
	readonly isPhenolphthaleinNegative: boolean;
	readonly isBatchApproved: boolean;
	readonly detergentBrand?: string | undefined;
	readonly operatorFullName: string;
	readonly notes?: string | undefined;
}

export interface RegulatoryInspectionData {
	readonly clinicInfo?: ClinicLegalInfo | undefined;
	readonly periodLabelRu?: string | undefined;
	readonly form257Records: readonly Form257Record[];
	readonly psoRecords?: readonly RegulatoryPsoRecord[] | undefined;
}

export interface GenerateBatchForm257Options {
	readonly startDate?: string | undefined; // YYYY-MM-DD
	readonly endDate?: string | undefined; // YYYY-MM-DD
	readonly targetDates?: readonly string[] | undefined; // Explicit list of dates (e.g. from missing days audit)
	readonly excludeSundays?: boolean | undefined; // default true
	readonly cyclesPerDay?: number | undefined; // default 2
	readonly packsPerCycle?: number | undefined; // default 14
	readonly sterilizerId?: string | undefined;
	readonly sterilizerCode?: string | undefined;
	readonly sterilizerBrandModel?: string | undefined;
	readonly sterilizerSerialNumber?: string | undefined;
	readonly operatorStaffFullName?: string | undefined;
	readonly operatorStaffPosition?: string | undefined;
	readonly headNurseSignatureFullName?: string | undefined;
	readonly isHeadNurseVerified?: boolean | undefined;
}

export interface PackageBarcodePayloadParams {
	readonly batchId: string;
	readonly cycleNumber: number;
	readonly sterilizerCode: string;
	readonly packDate: string;
	readonly packIndex: number;
	readonly shelfLifeDays?: number | undefined;
	readonly itemsDescriptionRu?: string | undefined;
	readonly operatorStaffFullName?: string | undefined;
}

export interface PackageBarcodeInfo {
	readonly serialNumber: string;
	readonly barcodePayload: string;
	readonly packDate: string;
	readonly expirationDate: string;
	readonly shelfLifeDays: number;
	readonly cycleId: string;
}
