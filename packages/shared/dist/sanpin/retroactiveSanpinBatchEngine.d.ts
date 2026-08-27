/**
 * ============================================================================
 * RETROACTIVE SANPIN 3.3686-21 BATCH GENERATION ENGINE
 * Движок пакетной ретроспективной генерации всех журналов СанПиН:
 * 1. Журнал предстерилизационной очистки (ПСО, Форма № 366/у);
 * 2. Журнал контроля работы стерилизаторов/автоклавов (Форма № 257/у);
 * 3. Журнал наработки бактерицидных установок (Дезар / Р 3.5.1904-04);
 * 4. Журнал генеральных уборок (строго каждые 7 дней);
 * 5. Журнал температурного режима холодильника (утро/вечер, ГОСТ +2..+8°C).
 * ============================================================================
 */
import type { TemperatureHumidityLog } from "../sanpin.js";
import { type BactericidalEquipmentRecord, type BactericidalSessionRecord, type ClinicLegalInfo, type Form257Record, type GeneralCleaningJournalRecord, type PsoJournalRecord } from "./sanpinRegistryEngine.js";
export interface RetroactiveSanpinCabinetConfig {
    readonly id: string;
    readonly name: string;
    readonly roomType: "therapeutic" | "surgical" | "cso_sterile" | "xray" | "utility";
    readonly roomVolumeM3: number;
    readonly dezarModelId: string;
    readonly dezarSerialNumber: string;
}
export interface RetroactiveSanpinBatchOptions {
    readonly startDate: string | Date;
    readonly endDate: string | Date;
    readonly organizationId?: string;
    readonly clinicLegalInfo?: Partial<ClinicLegalInfo>;
    readonly workingDaysOfWeek?: readonly number[];
    readonly holidays?: readonly string[];
    readonly dutyDays?: readonly string[];
    readonly cabinets?: readonly RetroactiveSanpinCabinetConfig[];
    readonly cabinetsCount?: number;
    readonly averagePatientsPerCabinet?: number;
    readonly patientsVariationMin?: number;
    readonly patientsVariationMax?: number;
    readonly customDailyPatientCounts?: Readonly<Record<string, number>>;
    readonly nurseFullName?: string;
    readonly nursePosition?: string;
    readonly headNurseFullName?: string;
    readonly chiefDoctorFullName?: string;
    readonly autoclaveCode?: string;
    readonly autoclaveModel?: string;
    readonly autoclaveSerialNumber?: string;
    readonly initialLampHours?: Readonly<Record<string, number>> | number;
    readonly maxLampHours?: number;
    readonly generalCleaningDayOfWeek?: number;
    readonly generalCleaningDisinfectant?: string;
    readonly psoDetergentBrand?: string;
    readonly seed?: number;
}
export interface RetroactiveDailySummary {
    readonly date: string;
    readonly dayOfWeek: number;
    readonly isWorkingDay: boolean;
    readonly isDutyDay: boolean;
    readonly isGeneralCleaningDay: boolean;
    readonly totalPatients: number;
    readonly psoBatchCount: number;
    readonly psoSampleTestedCount: number;
    readonly autoclaveCyclesCount: number;
    readonly autoclavePacksCount: number;
    readonly bactericidalHoursLogged: number;
    readonly morningTempCelsius: number;
    readonly eveningTempCelsius: number;
    readonly notes?: string;
}
export interface RetroactiveBatchStatistics {
    readonly totalCalendarDays: number;
    readonly totalWorkingDays: number;
    readonly totalWeekendDays: number;
    readonly totalPatientsTreated: number;
    readonly totalPsoItemsProcessed: number;
    readonly totalPsoSamplesTested: number;
    readonly totalAutoclaveCycles: number;
    readonly totalAutoclavePacksSterilized: number;
    readonly totalBactericidalSessions: number;
    readonly totalBactericidalHoursAdded: number;
    readonly totalGeneralCleaningsConducted: number;
    readonly totalTemperatureMeasurements: number;
    readonly allChecksCompliant: boolean;
    readonly validationIssues: readonly string[];
}
export interface RetroactiveSanpinBatch {
    readonly period: {
        readonly startDate: string;
        readonly endDate: string;
        readonly totalCalendarDays: number;
        readonly totalWorkingDays: number;
        readonly totalWeekendDays: number;
    };
    readonly psoRecords: readonly PsoJournalRecord[];
    readonly autoclaveRecords: readonly Form257Record[];
    readonly bactericidalSessions: readonly BactericidalSessionRecord[];
    readonly bactericidalEquipments: readonly BactericidalEquipmentRecord[];
    readonly generalCleaningRecords: readonly GeneralCleaningJournalRecord[];
    readonly refrigeratorRecords: readonly TemperatureHumidityLog[];
    readonly dailySummaries: readonly RetroactiveDailySummary[];
    readonly statistics: RetroactiveBatchStatistics;
    readonly clinicInfo: ClinicLegalInfo;
}
export interface SanpinBatchSummaryReport {
    readonly isValid: boolean;
    readonly summaryMarkdown: string;
    readonly statistics: RetroactiveBatchStatistics;
    readonly complianceAudit: {
        readonly psoSamplingCompliant: boolean;
        readonly psoChemicalTestsNegative: boolean;
        readonly autoclaveParametersCompliant: boolean;
        readonly autoclave5PointsPassed: boolean;
        readonly bactericidalNoOverflow: boolean;
        readonly generalCleaningCadenceCompliant: boolean;
        readonly refrigeratorTempWithinGost: boolean;
        readonly zeroMissingDates: boolean;
    };
    readonly registryTotals: {
        readonly form366uRecordCount: number;
        readonly form257uRecordCount: number;
        readonly dezarSessionCount: number;
        readonly generalCleaningCount: number;
        readonly refrigeratorLogCount: number;
    };
}
/**
 * Генерирует полный комплект юридически выверенных журналов СанПиН 3.3686-21
 * за указанный ретроспективный диапазон дат с учетом реального потока пациентов.
 */
export declare function generateRetroactiveSanpinBatch(options: RetroactiveSanpinBatchOptions): RetroactiveSanpinBatch;
/**
 * Валидирует сгенерированный ретроспективный пакет и строит сводный отчет
 * о санитарно-эпидемиологическом соответствии для надзорных органов (Роспотребнадзор).
 */
export declare function exportBatchToSanpinSummary(batch: RetroactiveSanpinBatch): SanpinBatchSummaryReport;
