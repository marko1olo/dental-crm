/**
 * ============================================================================
 * RETROACTIVE SANPIN 3.3686-21 BATCH TYPES & UTILITIES
 * ============================================================================
 */

import type { TemperatureHumidityLog } from "./sanpinSchemas.js";
import type {
	BactericidalEquipmentRecord,
	BactericidalSessionRecord,
	ClinicLegalInfo,
	Form257Record,
	GeneralCleaningJournalRecord,
	PsoJournalRecord,
} from "./sanpinRegistryEngine.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. CONFIGURATION & CONTRACT INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

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
	readonly workingDaysOfWeek?: readonly number[]; // 0=Вс, 1=Пн, ..., 6=Сб (по умолч. 1..6)
	readonly holidays?: readonly string[]; // ISO YYYY-MM-DD
	readonly dutyDays?: readonly string[]; // дежурные дни с пониженной нагрузкой
	readonly cabinets?: readonly RetroactiveSanpinCabinetConfig[];
	readonly cabinetsCount?: number;
	readonly averagePatientsPerCabinet?: number; // средний поток (по умолч. 12)
	readonly patientsVariationMin?: number; // мин пациентов (по умолч. 8)
	readonly patientsVariationMax?: number; // макс пациентов (по умолч. 20)
	readonly customDailyPatientCounts?: Readonly<Record<string, number>>;
	readonly nurseFullName?: string; // ФИО медсестры (по умолч. 'Иванова М. П.')
	readonly nursePosition?: string; // по умолч. 'Медсестра ЦСО'
	readonly headNurseFullName?: string; // ФИО старшей/главной медсестры (по умолч. 'Смирнова Е. В.')
	readonly chiefDoctorFullName?: string; // ФИО главврача (по умолч. 'Смирнов А. В.')
	readonly autoclaveCode?: string; // по умолч. 'АК-01'
	readonly autoclaveModel?: string; // по умолч. 'Melag Vacuklav 23B+'
	readonly autoclaveSerialNumber?: string; // по умолч. 'VK-2024-8841'
	readonly initialLampHours?: Readonly<Record<string, number>> | number;
	readonly maxLampHours?: number; // по умолч. 8000 ч
	readonly generalCleaningDayOfWeek?: number; // по умолч. 6 (Суббота)
	readonly generalCleaningDisinfectant?: string; // по умолч. 'Оптимакс 2.0%'
	readonly psoDetergentBrand?: string; // по умолч. 'Оптимакс Про 1.0%'
	readonly seed?: number; // для детерминированной генерации в тестах
}

export interface RetroactiveDailySummary {
	readonly date: string; // YYYY-MM-DD
	readonly dayOfWeek: number; // 0=Вс..6=Сб
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

// ─────────────────────────────────────────────────────────────────────────────
// 2. DETERMINISTIC PSEUDO-RANDOM NUMBER GENERATOR (LCG)
// ─────────────────────────────────────────────────────────────────────────────

export class DeterministicRng {
	private state: number;

	constructor(seed = 42) {
		this.state = Math.abs(seed) % 2147483647 || 1;
	}

	nextFloat(): number {
		this.state = (this.state * 16807) % 2147483647;
		return (this.state - 1) / 2147483646;
	}

	nextInt(min: number, max: number): number {
		return Math.floor(this.nextFloat() * (max - min + 1)) + min;
	}

	nextDecimal(min: number, max: number, decimals = 1): number {
		const factor = 10 ** decimals;
		const val = this.nextFloat() * (max - min) + min;
		return Math.round(val * factor) / factor;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. DATE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export function toDateString(val: string | Date): string {
	if (typeof val === "string") {
		const match = val.match(/^\d{4}-\d{2}-\d{2}/);
		if (match) return match[0];
		const parsed = new Date(val);
		if (!Number.isNaN(parsed.getTime())) {
			return parsed.toISOString().slice(0, 10);
		}
		return val;
	}
	const y = val.getUTCFullYear();
	const m = String(val.getUTCMonth() + 1).padStart(2, "0");
	const d = String(val.getUTCDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

export function parseDateUtc(dateStr: string): Date {
	const [year, month, day] = dateStr.split("-").map(Number);
	return new Date(Date.UTC(year!, month! - 1, day!));
}

export function addDaysUtc(dateStr: string, days: number): string {
	const dt = parseDateUtc(dateStr);
	dt.setUTCDate(dt.getUTCDate() + days);
	return dt.toISOString().slice(0, 10);
}

export function getDayOfWeekUtc(dateStr: string): number {
	const dt = parseDateUtc(dateStr);
	return dt.getUTCDay();
}

export function enumerateDateRange(startStr: string, endStr: string): string[] {
	const dates: string[] = [];
	let current = startStr;
	while (current <= endStr) {
		dates.push(current);
		current = addDaysUtc(current, 1);
	}
	return dates;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. DEFAULT CLINIC EQUIPMENT INFRASTRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_CABINETS: readonly RetroactiveSanpinCabinetConfig[] = [
	{
		id: "cab-01",
		name: "Кабинет №1 (Терапевтическая стоматология)",
		roomType: "therapeutic",
		roomVolumeM3: 48,
		dezarModelId: "dezar_4",
		dezarSerialNumber: "DZ4-1042",
	},
	{
		id: "cab-02",
		name: "Кабинет №2 (Хирургическая стоматология)",
		roomType: "surgical",
		roomVolumeM3: 52,
		dezarModelId: "dezar_4",
		dezarSerialNumber: "DZ4-1043",
	},
	{
		id: "cso-01",
		name: "Центральное стерилизационное отделение (ЦСО)",
		roomType: "cso_sterile",
		roomVolumeM3: 65,
		dezarModelId: "dezar_7",
		dezarSerialNumber: "DZ7-0518",
	},
];
