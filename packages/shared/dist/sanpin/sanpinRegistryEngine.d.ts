/**
 * ============================================================================
 * SANPIN 3.3686-21 & 2.1.3684-21 DISINFECTION & STERILIZATION REGISTRY ENGINE
 * Цифровой журнал предстерилизационной очистки (ПСО, Форма № 366/у),
 * журнал контроля работы автоклавов и стерилизаторов (Форма № 257/у),
 * учет наработки бактерицидных ламп (Р 3.5.1904-04), генеральные уборки и дезсредства.
 * ============================================================================
 */
import { type CabinetReadinessPreset, type DentalAppointmentType, type PsoChemicalTestId } from "./sanpinJournalsPresets.js";
export interface PsoJournalRecord {
    readonly id: string;
    readonly timestamp: string;
    readonly instrumentName: string;
    readonly categoryId: string;
    readonly batchItemCount: number;
    readonly testedSampleCount: number;
    readonly testType: PsoChemicalTestId;
    readonly isAzopyramNegative: boolean;
    readonly isPhenolphthaleinNegative: boolean;
    readonly isSudanNegative: boolean;
    readonly detergentBrand: string;
    readonly isBatchApproved: boolean;
    readonly rejectionReason?: string | undefined;
    readonly operatorStaffFullName: string;
    readonly operatorStaffPosition: string;
    readonly electronicStampVerified: boolean;
    readonly notes?: string | undefined;
}
export type SterilizationRegimeId = "steam_134_5min" | "steam_134_20min" | "steam_121_20min" | "dry_heat_180_60min";
export interface SterilizationRegimeDefinition {
    readonly id: SterilizationRegimeId;
    readonly nameRu: string;
    readonly methodType: "steam_autoclave" | "dry_heat";
    readonly targetTemperatureCelsius: number;
    readonly targetPressureBar: number;
    readonly exposureTimeMinutes: number;
    readonly tempToleranceCelsius: {
        readonly min: number;
        readonly max: number;
    };
    readonly pressureToleranceBar: {
        readonly min: number;
        readonly max: number;
    };
    readonly recommendedUsageRu: string;
    readonly sanpinStandardClauseRu: string;
}
export declare const STATUTORY_STERILIZATION_REGIMES: readonly SterilizationRegimeDefinition[];
export interface ChamberControlPointDefinition {
    readonly pointIndex: 1 | 2 | 3 | 4 | 5;
    readonly code: string;
    readonly nameRu: string;
    readonly locationDescriptionRu: string;
}
export declare const STATUTORY_CHAMBER_5_POINTS: readonly ChamberControlPointDefinition[];
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
    readonly date: string;
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
export declare const DEFAULT_CLINIC_LEGAL: ClinicLegalInfo;
/**
 * Расчет минимального объема выборки по СанПиН 3.3686-21:
 * Норма: 1% от одновременно обработанной партии, но не менее 3–5 единиц каждого наименования.
 */
export declare function calculatePsoSampleRequirements(batchCount: number, isCriticalSurgical?: boolean): {
    readonly minSampleCount: number;
    readonly formulaDescriptionRu: string;
    readonly ruleRefRu: string;
};
/**
 * Валидация результатов химических проб ПСО (Азопирам, Фенолфталеин, Судан III).
 * - Азопирам: выявление скрытой крови (гемоглобина). Отрицательная — норма. Положительная (фиолетовое окрашивание) — брак.
 * - Фенолфталеин: выявление щелочных моющих средств. Отрицательная — норма. Положительная (розовое окрашивание) — брак.
 * - Судан III: выявление масляных загрязнений.
 */
export declare function evaluatePsoTrialResult(params: {
    batchCount: number;
    testedSampleCount: number;
    isAzopyramNegative: boolean;
    isPhenolphthaleinNegative: boolean;
    isSudanNegative?: boolean | undefined;
    isCriticalSurgical?: boolean | undefined;
}): {
    readonly isBatchApproved: boolean;
    readonly minSampleRequired: number;
    readonly samplingSatisfied: boolean;
    readonly rejectionReason: string | null;
    readonly complianceNoteRu: string;
};
export declare function generatePsoRecordId(dateStr?: string, seq?: number): string;
/**
 * Проверка физических параметров цикла стерилизации:
 * - 134°C / 2.0-2.2 атм / 5 мин (или 20 мин)
 * - 121°C / 1.1 атм / 20 мин
 * - 180°C / 60 мин (сухожар)
 */
export declare function evaluateCycleParameters(regimeId: SterilizationRegimeId, sensors: PhysicalSensorsData): SterilizationCycleCompliance;
/**
 * Оценка результатов химических индикаторов (Интеграл, Медтест, Винар) во всех 5 контрольных точках камеры.
 */
export declare function evaluate5ChamberPoints(points: readonly ChamberPointEvaluation[]): {
    readonly areAllPointsPassed: boolean;
    readonly passedPointsCount: number;
    readonly failedPointsCount: number;
    readonly failedPointIndices: readonly number[];
    readonly summaryRu: string;
};
export declare function createDefault5ChamberPoints(indicatorTradeNameRu?: string, allPassed?: boolean): ChamberPointEvaluation[];
export declare function generateForm257RecordId(date: string, cycleNumber: number, sterilizerCode: string): string;
export declare function calculateDigitalStampHash(data: {
    id: string;
    date: string;
    cycleNumber: number;
    sterilizerCode: string;
    actualTemp: number;
    actualPressure: number;
    actualTime: number;
    isPassed: boolean;
    operatorName: string;
}): string;
export declare function createForm257Record(params: {
    date: string;
    cycleNumber: number;
    sterilizerId: string;
    sterilizerCode?: string | undefined;
    sterilizerBrandModel?: string | undefined;
    sterilizerSerialNumber?: string | undefined;
    regimeId: SterilizationRegimeId;
    sensors: PhysicalSensorsData;
    itemsDescriptionRu: string;
    packsCount: number;
    packagingType?: string | undefined;
    packagingNameRu?: string | undefined;
    shelfLifeDays?: number | undefined;
    chamberPoints: readonly ChamberPointEvaluation[];
    operatorStaffFullName: string;
    operatorStaffPosition?: string | undefined;
    headNurseSignatureFullName?: string | undefined;
    isHeadNurseVerified?: boolean | undefined;
    bioTestId?: string | undefined;
    bioTestResult?: "sterile_passed" | "growth_failed" | "pending" | undefined;
    notes?: string | undefined;
}): Form257Record;
export declare function calculateLampOperatingHours(currentOperatingHours: number, sessionDurationMinutes: number, maxHours?: number): {
    readonly sessionHours: number;
    readonly cumulativeHoursAfterSession: number;
    readonly remainingHours: number;
    readonly remainingPercent: number;
    readonly lampStatus: "normal" | "warning_replace_soon" | "expired_replace_now";
    readonly isCritical: boolean;
    readonly warningMessage: string | null;
};
export declare function calculateAirDecontaminationDuration(roomVolumeM3: number, productivityM3PerHour: number, targetEfficiencyPercent?: 95 | 99 | 99.9): {
    readonly requiredDurationMinutes: number;
    readonly recommendedDurationMinutes: number;
    readonly airExchangesCount: number;
    readonly formulaExplanationRu: string;
};
export declare function evaluateLampFleetHealth(equipments: readonly {
    id: string;
    deviceBrand: string;
    roomName: string;
    totalOperatingHours: number;
    maxLampHours: number;
}[]): {
    readonly totalEquipments: number;
    readonly normalCount: number;
    readonly warningCount: number;
    readonly expiredCount: number;
    readonly overallHealthStatus: "optimal" | "attention_needed" | "critical_violation";
    readonly summaryMessageRu: string;
};
export declare function calculateNextGeneralCleaningDate(lastCleaningDate: string, roomType?: "surgical" | "therapeutic" | "cso_sterile" | "xray" | "utility"): string;
export declare function validateCleaningScheduleCompliance(scheduledDate: string, actualDateTime: string, roomType?: "surgical" | "therapeutic" | "cso_sterile" | "xray" | "utility"): {
    readonly isCompliant: boolean;
    readonly daysDifference: number;
    readonly status: "on_schedule" | "early" | "overdue" | "critical_overdue";
    readonly statusMessageRu: string;
};
export declare function calculateDisinfectantSolutionMath(concentrateLiters: number, targetConcentrationPercent: number): {
    readonly solutionVolumeLiters: number;
    readonly waterVolumeLiters: number;
    readonly activeAgentVolumeLiters: number;
    readonly formulaRu: string;
};
export declare function calculateRequiredConcentrateForVolume(desiredSolutionVolumeLiters: number, targetConcentrationPercent: number): {
    readonly concentrateLiters: number;
    readonly concentrateMilliliters: number;
    readonly waterLiters: number;
    readonly formulaRu: string;
};
/**
 * 1-клик генерация официального печатного макета Журнала ПСО (Форма № 366/у)
 */
export declare function generatePsoJournalPrintHtml(params: {
    records: readonly PsoJournalRecord[];
    clinicInfo?: ClinicLegalInfo | undefined;
    dateRange?: {
        from: string;
        to: string;
    } | undefined;
}): string;
/**
 * 1-клик генерация официального печатного макета Журнала работы стерилизаторов (Форма № 257/у)
 */
export declare function generateForm257PrintHtml(records: readonly Form257Record[], clinicInfo?: ClinicLegalInfo, periodLabelRu?: string): string;
export declare function exportPsoJournalToCsv(records: readonly PsoJournalRecord[]): string;
export declare function exportForm257ToCsv(records: readonly Form257Record[]): string;
export declare function exportBactericidalJournalToCsv(sessions: readonly BactericidalSessionRecord[]): string;
export declare function exportGeneralCleaningJournalToCsv(records: readonly GeneralCleaningJournalRecord[]): string;
export declare function exportDisinfectantJournalToCsv(records: readonly DisinfectantJournalRecord[]): string;
export declare function generateBactericidalJournalPrintHtml(params: {
    equipment: BactericidalEquipmentRecord;
    sessions: readonly BactericidalSessionRecord[];
    clinicInfo?: ClinicLegalInfo | undefined;
}): string;
export declare function generateGeneralCleaningJournalPrintHtml(params: {
    records: readonly GeneralCleaningJournalRecord[];
    clinicInfo?: ClinicLegalInfo | undefined;
}): string;
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
    readonly timestamp: string;
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
}
export interface EvaluateCabinetReadinessParams {
    readonly appointmentType: DentalAppointmentType;
    readonly surfaceDisinfection: SurfaceDisinfectionCheck;
    readonly handpiecesSterility: HandpiecesSterilityCheck;
    readonly sterileTray: SterileTrayCheck;
    readonly aspirationSystem: AspirationSystemCheck;
    readonly isolationCofferdam: CofferdamCheck;
}
export interface CabinetReadinessEvaluationResult {
    readonly isFullyReady: boolean;
    readonly statusMessageRu: string;
    readonly summaryBadgeRu: string;
    readonly missingItems: readonly string[];
    readonly preset: CabinetReadinessPreset;
}
/**
 * Оценивает выполнение всех обязательных пунктов чек-листа подготовки кабинета.
 */
export declare function evaluateCabinetReadiness(params: EvaluateCabinetReadinessParams): CabinetReadinessEvaluationResult;
export declare function generateCabinetReadinessId(dateStr?: string, cabinetNumber?: string, seq?: number): string;
export declare function calculateCabinetStampHash(data: {
    id: string;
    cabinetNumber: string;
    appointmentType: string;
    timestamp: string;
    operatorStaffFullName: string;
    isFullyReady: boolean;
}): string;
export declare function createCabinetReadinessRecord(params: {
    cabinetNumber: string;
    appointmentType: DentalAppointmentType;
    operatorStaffFullName: string;
    operatorStaffPosition?: string | undefined;
    surfaceDisinfection: SurfaceDisinfectionCheck;
    handpiecesSterility: HandpiecesSterilityCheck;
    sterileTray: SterileTrayCheck;
    aspirationSystem: AspirationSystemCheck;
    isolationCofferdam: CofferdamCheck;
    notes?: string | undefined;
    timestamp?: string | undefined;
}): CabinetReadinessRecord;
export declare function exportCabinetReadinessToCsv(records: readonly CabinetReadinessRecord[]): string;
export declare function generateCabinetReadinessPrintHtml(params: {
    records: readonly CabinetReadinessRecord[];
    clinicInfo?: ClinicLegalInfo | undefined;
}): string;
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
export declare function exportTemperatureHumidityJournalToCsv(records: readonly TemperatureHumidityLogRecord[]): string;
export declare function generateTemperatureHumidityJournalPrintHtml(params: {
    records: readonly TemperatureHumidityLogRecord[];
    clinicInfo?: ClinicLegalInfo | undefined;
    periodLabelRu?: string | undefined;
}): string;
export interface ConsolidatedSanpinJournalData {
    readonly clinicInfo?: ClinicLegalInfo | undefined;
    readonly periodLabelRu?: string | undefined;
    readonly dateRange?: {
        readonly from: string;
        readonly to: string;
    } | undefined;
    readonly volumeNumber?: number | string | undefined;
    readonly totalPagesCount?: number | undefined;
    readonly psoRecords: readonly PsoJournalRecord[];
    readonly form257Records: readonly Form257Record[];
    readonly bactericidalSessions: readonly BactericidalSessionRecord[];
    readonly bactericidalEquipments?: readonly BactericidalEquipmentRecord[] | undefined;
    readonly generalCleanings: readonly GeneralCleaningJournalRecord[];
    readonly temperatureLogs: readonly TemperatureHumidityLogRecord[];
}
export declare function integerToRussianWords(num: number): string;
export { integerToRussianWords as numberToRussianWords };
export declare function formatRussianSheetsCount(count: number): {
    readonly count: number;
    readonly countInWords: string;
    readonly declensionRu: string;
    readonly formattedRu: string;
};
/**
 * Генератор сшива журналов «Сводный журнал производственного контроля СанПиН за период» (А4 Альбомная):
 * - Титульный лист с реквизитами клиники, лицензии № ЛО41-01137-77/00368421, номером тома и подписью главного врача;
 * - Раздел 1: Журнал предстерилизационной очистки (Форма № 366/у);
 * - Раздел 2: Журнал работы стерилизаторов (Форма № 257/у);
 * - Раздел 3: Журнал бактерицидных установок и генеральных уборок;
 * - Раздел 4: Журнал температурного режима холодильников;
 * - Лист сшива и заверения («В настоящем журнале пронумеровано, прошнуровано и скреплено печатью X листов»).
 */
export declare function generateSanpinConsolidatedInspectionHtml(data: ConsolidatedSanpinJournalData): string;
/**
 * 1-клик экспорт в единый многостраничный CSV/Excel архив с разделителями страниц и разделов:
 * - Метаданные клиники и лицензии № ЛО41-01137-77/00368421;
 * - Раздел 1: ПСО (Форма № 366/у);
 * - Раздел 2: Автоклавы (Форма № 257/у);
 * - Раздел 3: Бактерицидные установки и Генеральные уборки;
 * - Раздел 4: Температурный режим холодильников;
 * - Лист сшива и заверения тома.
 */
export declare function exportSanpinConsolidatedArchiveToCsv(data: ConsolidatedSanpinJournalData): string;
