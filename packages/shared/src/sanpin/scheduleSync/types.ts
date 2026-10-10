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

import {
	generateKraftBatchRecords,
	getDentalToolSetDefinition,
	getKraftMaterialDefinition,
	getKraftSizeDefinition,
} from "../kraftPackageGenerator.js";
import {
	type KraftPackageMaterialId,
	type KraftPackageRecord,
	type KraftPackageSizeId,
} from "../kraftPackageTypes.js";
import {
	calculateDigitalStampHash,
	calculatePsoSampleRequirements,
	createDefault5ChamberPoints,
	generateForm257RecordId,
	generatePsoRecordId,
	type Form257Record,
	type PsoJournalRecord,
	type SterilizationRegimeId,
} from "../sanpinRegistryEngine.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. DATA CONTRACTS & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

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
	readonly startDate: string; // YYYY-MM-DD or ISO
	readonly endDate: string; // YYYY-MM-DD or ISO
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
export const SANPIN_VISIT_CONSUMPTION_STANDARDS: Record<SanpinClinicalSpecialty, SanpinPerVisitConsumption> = {
	therapy: {
		specialty: "therapy",
		titleRu: "Терапевтический приём",
		basicTraysCount: 1,
		burSetsCount: 1,
		handpiecesCount: 2,
		surgicalTraysCount: 0,
		forcepsCount: 0,
		elevatorsCount: 0,
		syringesCount: 0,
		orthopedicTraysCount: 0,
		impressionTraysCount: 0,
		totalInstrumentsCount: 4,
		totalKraftPackagesCount: 4,
		kraftPackagesBySize: {
			size_75x150: 2, // 1 набор боров + 1 турбинный наконечник
			size_100x200: 2, // 1 базовый смотровой лоток + 1 микромоторный наконечник
			size_150x250: 0,
			size_200x300: 0,
		},
	},
	surgery: {
		specialty: "surgery",
		titleRu: "Хирургический приём",
		basicTraysCount: 0,
		burSetsCount: 0,
		handpiecesCount: 0,
		surgicalTraysCount: 1,
		forcepsCount: 1,
		elevatorsCount: 1,
		syringesCount: 1,
		orthopedicTraysCount: 0,
		impressionTraysCount: 0,
		totalInstrumentsCount: 4,
		totalKraftPackagesCount: 4,
		kraftPackagesBySize: {
			size_75x150: 0,
			size_100x200: 1, // 1 карпульный шприц / ирригатор
			size_150x250: 3, // 1 хирургический лоток + 1 щипцы + 1 элеваторы
			size_200x300: 0,
		},
	},
	orthopedics: {
		specialty: "orthopedics",
		titleRu: "Ортопедический приём",
		basicTraysCount: 0,
		burSetsCount: 0,
		handpiecesCount: 0,
		surgicalTraysCount: 0,
		forcepsCount: 0,
		elevatorsCount: 0,
		syringesCount: 0,
		orthopedicTraysCount: 1,
		impressionTraysCount: 1,
		totalInstrumentsCount: 2,
		totalKraftPackagesCount: 2,
		kraftPackagesBySize: {
			size_75x150: 0,
			size_100x200: 1, // 1 ортопедический смотровой лоток
			size_150x250: 1, // 1 комплект слепочных ложек
			size_200x300: 0,
		},
	},
};

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

	// Спецификация инструментов
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

	// Крафт-пакеты
	readonly kraftPackagesCount: number;
	readonly kraftPackagesBySize: {
		readonly size_75x150: number;
		readonly size_100x200: number;
		readonly size_150x250: number;
		readonly size_200x300: number;
	};

	// Циклы автоклава для данного кресла
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
	readonly chemicalIndicatorsCount: number; // 5 контрольных точек камеры КТ-1..КТ-5
}

export interface SanpinDailyLoad {
	readonly date: string; // YYYY-MM-DD
	readonly dayOfWeekRu: string;
	readonly isWorkingDay: boolean;

	// Подсчет пациентов по профилям
	readonly therapyPatientsCount: number;
	readonly surgeryPatientsCount: number;
	readonly orthopedicsPatientsCount: number;
	readonly totalPatientsCount: number;

	// Суммарный расход инструментария
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

	// Суммарные крафт-пакеты
	readonly totalKraftPackagesCount: number;
	readonly kraftPackagesBySize: {
		readonly size_75x150: number;
		readonly size_100x200: number;
		readonly size_150x250: number;
		readonly size_200x300: number;
	};

	// Автоклавирование
	readonly autoclaveCapacityPacks: number;
	readonly totalAutoclaveCyclesCount: number;
	readonly proposedAutoclaveCycles: readonly SanpinProposedAutoclaveCycle[];

	// Контроль ПСО (Форма № 366/у)
	readonly psoBatchTotalCount: number;
	readonly psoMinSampleRequired: number; // 1% или минимум 3-5 шт.
	readonly psoAzopyramReagentMl: number;
	readonly psoPhenolphthaleinMl: number;
	readonly estimatedDetergentSolutionLiters: number;

	// Химические индикаторы (Класс 4/5)
	readonly totalChemicalIndicatorsCount: number;

	// Разбивка по креслам
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

	// Сводные метрики за весь период
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
