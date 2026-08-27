/**
 * ============================================================================
 * SANPIN 3.3686-21 SCHEDULE & APPOINTMENTS SYNCHRONIZATION ENGINE
 * Сопоставление расписания клиники с реальной стерилизационной нагрузкой:
 * - Подсчет пациентов по профилям: терапия, хирургия, ортопедия;
 * - Нормативный расчет инструментария (лотки, боры, наконечники, щипцы, элеваторы);
 * - Формирование точного числа крафт-пакетов и циклов автоклава под каждое кресло;
 * - Ретроспективная генерация записей журналов ПСО (366/у) и Автоклава (257/у).
 * ============================================================================
 */
import { type KraftPackageMaterialId, type KraftPackageRecord } from "./kraftPackageTypes.js";
import { type Form257Record, type PsoJournalRecord, type SterilizationRegimeId } from "./sanpinRegistryEngine.js";
export type SanpinClinicalSpecialty = "therapy" | "surgery" | "orthopedics";
export interface SanpinAppointmentSource {
    readonly id: string;
    readonly startsAt: string;
    readonly endsAt?: string | undefined;
    readonly patientId?: string | null | undefined;
    readonly doctorUserId?: string | null | undefined;
    readonly chairId?: string | null | undefined;
    readonly status?: string | undefined;
    readonly reason?: string | null | undefined;
    readonly comment?: string | null | undefined;
    readonly specialty?: string | null | undefined;
    readonly category?: string | null | undefined;
    readonly serviceTitle?: string | null | undefined;
}
export interface SanpinDateRangeInput {
    readonly startDate: string;
    readonly endDate: string;
}
export interface SanpinSyncOptions {
    /**
     * Вместимость камеры автоклава (стандартный класс B 18-24л: 12-16 крафт-пакетов).
     * По умолчанию: 14 пакетов на цикл.
     */
    readonly autoclaveCapacityPacks?: number | undefined;
    /**
     * Статусы визитов, которые учитываются как состоявшиеся приёмы.
     * По умолчанию: ["completed", "in_progress", "scheduled", "confirmed"]
     * Отмененные ("cancelled") и неявки ("no_show") исключаются.
     */
    readonly allowedStatuses?: readonly string[] | undefined;
    /**
     * Словарь привязки врачей к их специализации: doctorUserId -> "therapy" | "surgery" | "orthopedics".
     */
    readonly doctorSpecialtyMap?: Readonly<Record<string, SanpinClinicalSpecialty | string>> | undefined;
    /**
     * Словарь названий кресел/кабинетов: chairId -> "Кабинет № 1 (Терапия)" и т.д.
     */
    readonly chairNameMap?: Readonly<Record<string, string>> | undefined;
    /**
     * Режим стерилизации по умолчанию для автоклава.
     * По умолчанию: "steam_134_5min" (Режим 134°C / 5 мин / 2.1 бар).
     */
    readonly defaultAutoclaveRegime?: SterilizationRegimeId | undefined;
    /**
     * Код или название автоклава по умолчанию.
     */
    readonly defaultAutoclaveCode?: string | undefined;
    /**
     * ФИО ответственного оператора / медсестры ЦСО.
     */
    readonly defaultOperatorName?: string | undefined;
}
export interface SanpinPerVisitConsumption {
    readonly specialty: SanpinClinicalSpecialty;
    readonly titleRu: string;
    readonly basicTraysCount: number;
    readonly burSetsCount: number;
    readonly handpiecesCount: number;
    readonly surgicalTraysCount: number;
    readonly forcepsCount: number;
    readonly elevatorsCount: number;
    readonly syringesCount: number;
    readonly orthopedicTraysCount: number;
    readonly impressionTraysCount: number;
    readonly totalInstrumentsCount: number;
    readonly totalKraftPackagesCount: number;
    readonly kraftPackagesBySize: {
        readonly size_75x150: number;
        readonly size_100x200: number;
        readonly size_150x250: number;
        readonly size_200x300: number;
    };
}
/**
 * Нормативные коэффициенты расхода инструментов и крафт-пакетов на 1 приём по СанПиН:
 * - Терапия: 1 базовый лоток (100x200) + 1 набор боров (75x150) + 2 наконечника (75x150/100x200) -> 4 пакета;
 * - Хирургия: 1 хирургический лоток (150x250) + 1 щипцы (150x250) + 1 элеваторы (150x250) + 1 шприц (100x200) -> 4 пакета;
 * - Ортопедия: 1 лоток (100x200) + 1 комплект слепочных ложек (150x250) -> 2 пакета.
 */
export declare const SANPIN_VISIT_CONSUMPTION_STANDARDS: Record<SanpinClinicalSpecialty, SanpinPerVisitConsumption>;
export interface SanpinAppointmentLoadItem {
    readonly id: string;
    readonly startsAt: string;
    readonly endsAt: string;
    readonly patientId: string | null;
    readonly doctorUserId: string | null;
    readonly chairId: string | null;
    readonly chairName: string;
    readonly specialty: SanpinClinicalSpecialty;
    readonly status: string;
    readonly reason: string | null;
    readonly comment: string | null;
    readonly kraftPackagesCount: number;
}
export interface SanpinChairDailyLoad {
    readonly chairId: string;
    readonly chairName: string;
    readonly therapyPatientsCount: number;
    readonly surgeryPatientsCount: number;
    readonly orthopedicsPatientsCount: number;
    readonly totalPatientsCount: number;
    readonly basicTraysCount: number;
    readonly burSetsCount: number;
    readonly handpiecesCount: number;
    readonly surgicalTraysCount: number;
    readonly forcepsCount: number;
    readonly elevatorsCount: number;
    readonly syringesCount: number;
    readonly orthopedicTraysCount: number;
    readonly impressionTraysCount: number;
    readonly totalInstrumentsCount: number;
    readonly kraftPackagesCount: number;
    readonly kraftPackagesBySize: {
        readonly size_75x150: number;
        readonly size_100x200: number;
        readonly size_150x250: number;
        readonly size_200x300: number;
    };
    readonly autoclaveCyclesCount: number;
    readonly appointments: readonly SanpinAppointmentLoadItem[];
}
export interface SanpinProposedAutoclaveCycle {
    readonly cycleNumber: number;
    readonly cycleCode: string;
    readonly autoclaveRegime: SterilizationRegimeId;
    readonly targetTemperatureCelsius: number;
    readonly targetPressureBar: number;
    readonly exposureTimeMinutes: number;
    readonly packagesCount: number;
    readonly descriptionRu: string;
    readonly itemsListRu: readonly string[];
    readonly chemicalIndicatorsCount: number;
}
export interface SanpinDailyLoad {
    readonly date: string;
    readonly dayOfWeekRu: string;
    readonly isWorkingDay: boolean;
    readonly therapyPatientsCount: number;
    readonly surgeryPatientsCount: number;
    readonly orthopedicsPatientsCount: number;
    readonly totalPatientsCount: number;
    readonly totalBasicTraysCount: number;
    readonly totalBurSetsCount: number;
    readonly totalHandpiecesCount: number;
    readonly totalSurgicalTraysCount: number;
    readonly totalForcepsCount: number;
    readonly totalElevatorsCount: number;
    readonly totalSyringesCount: number;
    readonly totalOrthopedicTraysCount: number;
    readonly totalImpressionTraysCount: number;
    readonly totalInstrumentsCount: number;
    readonly totalKraftPackagesCount: number;
    readonly kraftPackagesBySize: {
        readonly size_75x150: number;
        readonly size_100x200: number;
        readonly size_150x250: number;
        readonly size_200x300: number;
    };
    readonly autoclaveCapacityPacks: number;
    readonly totalAutoclaveCyclesCount: number;
    readonly proposedAutoclaveCycles: readonly SanpinProposedAutoclaveCycle[];
    readonly psoBatchTotalCount: number;
    readonly psoMinSampleRequired: number;
    readonly psoAzopyramReagentMl: number;
    readonly psoPhenolphthaleinMl: number;
    readonly estimatedDetergentSolutionLiters: number;
    readonly totalChemicalIndicatorsCount: number;
    readonly chairs: Readonly<Record<string, SanpinChairDailyLoad>>;
    readonly chairList: readonly SanpinChairDailyLoad[];
}
export interface SanpinScheduleDailyLoadReport {
    readonly dateRange: {
        readonly startDate: string;
        readonly endDate: string;
    };
    readonly totalDays: number;
    readonly activeWorkingDaysCount: number;
    readonly summary: {
        readonly totalAppointments: number;
        readonly totalTherapyPatients: number;
        readonly totalSurgeryPatients: number;
        readonly totalOrthopedicsPatients: number;
        readonly totalInstruments: number;
        readonly totalBasicTrays: number;
        readonly totalBurSets: number;
        readonly totalHandpieces: number;
        readonly totalSurgicalTrays: number;
        readonly totalForceps: number;
        readonly totalElevators: number;
        readonly totalSyringes: number;
        readonly totalOrthopedicTrays: number;
        readonly totalImpressionTrays: number;
        readonly totalKraftPackages: number;
        readonly totalAutoclaveCycles: number;
        readonly totalPsoSamplesRequired: number;
        readonly totalChemicalIndicators: number;
    };
    readonly dailyLoads: readonly SanpinDailyLoad[];
}
/**
 * Интеллектуальная классификация визита по специализации на основе:
 * 1. Явного поля `specialty` / `category`;
 * 2. Маппинга врача `doctorSpecialtyMap`;
 * 3. Семантического анализа причины приёма (`reason`), комментария (`comment`) и названия услуги (`serviceTitle`).
 */
export declare function classifyAppointmentSpecialty(appointment: SanpinAppointmentSource, doctorSpecialtyMap?: Readonly<Record<string, SanpinClinicalSpecialty | string>> | undefined): SanpinClinicalSpecialty;
/**
 * Извлекает календарную дату в формате YYYY-MM-DD из ISO строки или Date.
 */
export declare function extractIsoDateString(value: string | Date): string;
/**
 * Генерирует массив всех календарных дат между startDate и endDate (включительно).
 */
export declare function generateDateSequence(startDateStr: string, endDateStr: string): string[];
/**
 * Главная функция сопоставления расписания визитов и расчета суточной стерилизационной нагрузки:
 * 1. Фильтрует визиты по диапазону дат и статусам (исключая cancelled/no_show);
 * 2. Классифицирует визиты по профилям (терапия, хирургия, ортопедия);
 * 3. Рассчитывает точный расход лотков, боров, наконечников, щипцов и элеваторов;
 * 4. Формирует крафт-пакеты по типоразмерам и рассчитывает необходимое число циклов автоклава под каждое кресло.
 */
export declare function mapScheduleAppointmentsToSanpinDailyLoad(appointments: readonly SanpinAppointmentSource[], dateRange: SanpinDateRangeInput, options?: SanpinSyncOptions): SanpinScheduleDailyLoadReport;
export interface RetrospectiveGenerationOptions {
    readonly operatorStaffFullName?: string | undefined;
    readonly operatorStaffPosition?: string | undefined;
    readonly headNurseFullName?: string | undefined;
    readonly autoclaveBrandModel?: string | undefined;
    readonly autoclaveSerialNumber?: string | undefined;
    readonly detergentBrand?: string | undefined;
    readonly packageMaterial?: KraftPackageMaterialId | undefined;
}
/**
 * Генерирует ретроспективные записи журнала ПСО (Форма № 366/у)
 * на основе рассчитанной суточной нагрузки инструментов по расписанию.
 */
export declare function generateRetrospectivePsoRecordsFromDailyLoad(dailyLoad: SanpinDailyLoad, options?: RetrospectiveGenerationOptions): PsoJournalRecord[];
/**
 * Генерирует ретроспективные записи журнала контроля работы автоклавов (Форма № 257/у)
 * на основе предложенных циклов стерилизации по фактической дневной загрузке.
 */
export declare function generateRetrospectiveAutoclaveRecordsFromDailyLoad(dailyLoad: SanpinDailyLoad, options?: RetrospectiveGenerationOptions): Form257Record[];
/**
 * Генерирует массив крафт-пакетов (KraftPackageRecord) со штрихкодами
 * для всей дневной партии по реальной структуре визитов.
 */
export declare function generateRetrospectiveKraftPackagesFromDailyLoad(dailyLoad: SanpinDailyLoad, options?: RetrospectiveGenerationOptions): KraftPackageRecord[];
