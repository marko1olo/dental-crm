/**
 * ============================================================================
 * SANPIN 3.3686-21 & 2.1.3684-21 REGISTRY ENGINE TYPES & INTERFACES (LAYER 0)
 * ============================================================================
 */

import type {
	CabinetReadinessPreset,
	DentalAppointmentType,
	PsoChemicalTestId,
} from "../sanpinJournalsPresets.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. PSO TYPES & RECORDS (Форма № 366/у)
// ─────────────────────────────────────────────────────────────────────────────

export interface PsoJournalRecord {
	readonly id: string;
	readonly timestamp: string; // ISO 8601
	readonly instrumentName: string;
	readonly categoryId: string;
	readonly batchItemCount: number;
	readonly testedSampleCount: number;
	readonly testType: PsoChemicalTestId;
	readonly isAzopyramNegative: boolean; // true = отрицательная (норма), false = положительная (фиолетовое окрашивание / кровь)
	readonly isPhenolphthaleinNegative: boolean; // true = отрицательная (норма), false = положительная (розовое окрашивание / щелочь)
	readonly isSudanNegative: boolean; // true = отрицательная (норма), false = положительная (масло)
	readonly detergentBrand: string;
	readonly isBatchApproved: boolean;
	readonly rejectionReason?: string | undefined;
	readonly operatorStaffFullName: string;
	readonly operatorStaffPosition: string;
	readonly electronicStampVerified: boolean;
	readonly notes?: string | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. STERILIZATION & AUTOCLAVE TYPES (Форма № 257/у)
// ─────────────────────────────────────────────────────────────────────────────

export type SterilizationRegimeId =
	| "steam_134_5min"
	| "steam_134_20min"
	| "steam_121_20min"
	| "dry_heat_180_60min";

export interface SterilizationRegimeDefinition {
	readonly id: SterilizationRegimeId;
	readonly nameRu: string;
	readonly methodType: "steam_autoclave" | "dry_heat";
	readonly targetTemperatureCelsius: number;
	readonly targetPressureBar: number;
	readonly exposureTimeMinutes: number;
	readonly tempToleranceCelsius: { readonly min: number; readonly max: number };
	readonly pressureToleranceBar: { readonly min: number; readonly max: number };
	readonly recommendedUsageRu: string;
	readonly sanpinStandardClauseRu: string;
}

export interface ChamberControlPointDefinition {
	readonly pointIndex: 1 | 2 | 3 | 4 | 5;
	readonly code: string;
	readonly nameRu: string;
	readonly locationDescriptionRu: string;
}

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
	readonly packagingType: string;
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

// ─────────────────────────────────────────────────────────────────────────────
// 3. BACTERICIDAL & DISINFECTION TYPES (Р 3.5.1904-04)
// ─────────────────────────────────────────────────────────────────────────────

export interface BactericidalEquipmentRecord {
	readonly id: string;
	readonly roomName: string;
	readonly roomVolumeM3: number;
	readonly deviceBrand: string;
	readonly serialNumber: string;
	readonly deviceType: "recirculator_closed" | "irradiator_open" | "combined";
	readonly lampType: string;
	readonly lampCount: number;
	readonly maxLampHours: number;
	readonly totalOperatingHours: number;
	readonly remainingLampHours: number;
	readonly remainingLampPercent: number;
	readonly lampStatus: "normal" | "warning_replace_soon" | "expired_replace_now";
	readonly isLampCritical: boolean;
	readonly lastLampReplacementDate?: string | undefined;
	readonly notes?: string | undefined;
}

export interface BactericidalSessionRecord {
	readonly id: string;
	readonly equipmentId: string;
	readonly date: string;
	readonly sessionStartTime: string;
	readonly sessionEndTime: string;
	readonly durationMinutes: number;
	readonly durationHours: number;
	readonly operatingMode: "continuous_presence" | "pre_op_preparation" | "post_cleaning" | "intermittent";
	readonly cumulativeHoursAfterSession: number;
	readonly roomName: string;
	readonly deviceBrand: string;
	readonly operatorStaffFullName: string;
	readonly notes?: string | undefined;
}

export interface GeneralCleaningJournalRecord {
	readonly id: string;
	readonly roomType: "surgical" | "therapeutic" | "cso_sterile" | "xray" | "utility";
	readonly roomName: string;
	readonly scheduledDate: string;
	readonly actualDateTime: string;
	readonly treatedAreaM2: number;
	readonly disinfectantName: string;
	readonly activeIngredient: string;
	readonly solutionConcentrationPercent: number;
	readonly applicationMethodRu: string;
	readonly exposureTimeMinutes: number;
	readonly uvIrradiationMinutes: number;
	readonly ventilationMinutes: number;
	readonly operatorStaffFullName: string;
	readonly inspectorStaffFullName?: string | undefined;
	readonly isInspectorVerified: boolean;
	readonly status: "completed" | "verified_by_inspector" | "rescheduled";
	readonly notes?: string | undefined;
}

export interface DisinfectantJournalRecord {
	readonly id: string;
	readonly timestamp: string;
	readonly operationType: "receipt" | "consumption";
	readonly tradeName: string;
	readonly amount: number;
	readonly unit: "л" | "кг";
	readonly invoiceOrObjectInfo: string;
	readonly batchOrExpirationDate?: string | undefined;
	readonly solutionPreparedLiters?: number | undefined;
	readonly concentrationPercent?: number | undefined;
	readonly isConcentrationNormal?: boolean | undefined;
	readonly resultingStockBalance: number;
	readonly operatorStaffFullName: string;
	readonly notes?: string | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CLINIC LEGAL & DOSSIER TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ClinicLegalInfo {
	readonly name: string;
	readonly ogrn: string;
	readonly inn: string;
	readonly address: string;
	readonly chiefDoctor: string;
	readonly headNurse: string;
	readonly licenseNumber?: string | undefined;
	readonly volumeNumber?: number | string | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CABINET READINESS TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface SurfaceDisinfectionCheck {
	readonly isCompleted: boolean;
	readonly disinfectantBrand: string;
	readonly exposureMinutes: number;
	readonly surfacesCleaned?: readonly string[] | undefined;
}

export interface HandpiecesSterilityCheck {
	readonly isCompleted: boolean;
	readonly turbineHandpieceSterile: boolean;
	readonly contraAngleHandpieceSterile: boolean;
	readonly micromotorHandpieceSterile?: boolean | undefined;
	readonly class5IndicatorsVerified: boolean;
	readonly packageIntegrityVerified: boolean;
}

export interface SterileTrayCheck {
	readonly isCompleted: boolean;
	readonly mirrorReady: boolean;
	readonly probeReady: boolean;
	readonly tweezersReady: boolean;
	readonly excavatorReady: boolean;
	readonly spatulaPluggerReady: boolean;
	readonly kraftPackageBatchId?: string | undefined;
}

export interface AspirationSystemCheck {
	readonly isCompleted: boolean;
	readonly salivaEjectorConnected: boolean;
	readonly hveVacuumConnected: boolean;
	readonly bacterialFilterChecked: boolean;
}

export interface CofferdamCheck {
	readonly isCompleted: boolean;
	readonly rubberDamSheetReady: boolean;
	readonly clampsReady: boolean;
	readonly forcepsReady: boolean;
	readonly isNotRequiredForProfile?: boolean | undefined;
}

export interface CabinetReadinessRecord {
	readonly id: string;
	readonly cabinetNumber: string;
	readonly appointmentType: DentalAppointmentType;
	readonly appointmentTypeTitleRu: string;
	readonly timestamp: string; // ISO 8601
	readonly operatorStaffFullName: string;
	readonly operatorStaffPosition: string;
	readonly surfaceDisinfection: SurfaceDisinfectionCheck;
	readonly handpiecesSterility: HandpiecesSterilityCheck;
	readonly sterileTray: SterileTrayCheck;
	readonly aspirationSystem: AspirationSystemCheck;
	readonly isolationCofferdam: CofferdamCheck;
	readonly isFullyReady: boolean;
	readonly statusMessageRu: string;
	readonly summaryBadgeRu: string;
	readonly missingItems: readonly string[];
	readonly digitalStampHash: string;
	readonly notes?: string | undefined;
	readonly createdAt: string;
	readonly isPaperJournalDefault?: boolean | undefined;
}

export interface EvaluateCabinetReadinessParams {
	readonly appointmentType: DentalAppointmentType;
	readonly surfaceDisinfection: SurfaceDisinfectionCheck;
	readonly handpiecesSterility: HandpiecesSterilityCheck;
	readonly sterileTray: SterileTrayCheck;
	readonly aspirationSystem: AspirationSystemCheck;
	readonly isolationCofferdam: CofferdamCheck;
	readonly paperJournalMode?: boolean | undefined;
	readonly nurseBypassedPaperLog?: boolean | undefined;
}

export interface CabinetReadinessEvaluationResult {
	readonly isFullyReady: boolean;
	readonly statusMessageRu: string;
	readonly summaryBadgeRu: string;
	readonly missingItems: readonly string[];
	readonly preset: CabinetReadinessPreset;
	readonly isPaperJournalDefault?: boolean | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. TEMPERATURE & HUMIDITY TYPES (Приказ 706н)
// ─────────────────────────────────────────────────────────────────────────────

export interface TemperatureHumidityLogRecord {
	readonly id: string;
	readonly measurementDate: string;
	readonly measurementPeriod: "morning" | "evening" | string;
	readonly equipmentName: string;
	readonly equipmentType?: string | undefined;
	readonly location: string;
	readonly meterDeviceName: string;
	readonly meterSerialNumber?: string | undefined;
	readonly temperatureCelsius: number;
	readonly relativeHumidityPercent?: number | undefined;
	readonly targetTempMinCelsius: number;
	readonly targetTempMaxCelsius: number;
	readonly isWithinNorm: boolean;
	readonly deviationReason?: string | undefined;
	readonly correctiveAction?: string | undefined;
	readonly operatorStaffFullName: string;
	readonly notes?: string | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. CONSOLIDATED DOSSIER & FLEET TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface SterilizerEquipmentRecord {
	readonly id: string;
	readonly name: string;
	readonly brandModel: string;
	readonly serialNumber: string;
	readonly inventoryNumber?: string | null | undefined;
	readonly deviceType: string;
	readonly deviceClass?: string | null | undefined;
	readonly chamberVolumeLiters?: number | string | null | undefined;
	readonly locationRoom?: string | null | undefined;
	readonly verificationExpiryDate?: string | null | undefined;
	readonly lastMaintenanceDate?: string | null | undefined;
	readonly nextMaintenanceDate?: string | null | undefined;
	readonly status?: string | null | undefined;
	readonly notes?: string | null | undefined;
}

export interface ConsolidatedSanpinJournalData {
	readonly clinicInfo?: ClinicLegalInfo | undefined;
	readonly clinicLegalInfo?: ClinicLegalInfo | undefined;
	readonly periodLabelRu?: string | undefined;
	readonly dateRange?: { readonly from: string; readonly to: string } | undefined;
	readonly volumeNumber?: number | string | undefined;
	readonly totalPagesCount?: number | undefined;
	readonly generatedDateRu?: string | undefined;
	readonly responsibleHeadNurseRu?: string | undefined;
	readonly psoRecords?: readonly PsoJournalRecord[] | undefined;
	readonly form257Records?: readonly Form257Record[] | undefined;
	readonly sterilizationCycles?: readonly any[] | undefined;
	readonly sterilizerEquipments?: readonly SterilizerEquipmentRecord[] | undefined;
	readonly bactericidalSessions?: readonly BactericidalSessionRecord[] | undefined;
	readonly bactericidalEquipments?: readonly BactericidalEquipmentRecord[] | undefined;
	readonly generalCleanings?: readonly GeneralCleaningJournalRecord[] | undefined;
	readonly temperatureLogs?: readonly TemperatureHumidityLogRecord[] | undefined;
}
