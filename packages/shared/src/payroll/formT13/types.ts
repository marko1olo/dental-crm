/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Statutory Form T-13 Timesheet Engine (Госкомстат РФ № 1)
 * Layer 0: Types, Interfaces & Schemas (types.ts)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";

/**
 * Statutory Russian State Statistics Committee (Госкомстат) attendance & absence codes
 * (Постановление Госкомстата РФ от 05.01.2004 № 1, ОКУД 0301008)
 */
export type TimesheetCode =
	| "Я" // 01 — Продолжительность работы в дневное время (Day attendance)
	| "Н" // 02 — Работа в ночное время (Night hours 22:00-06:00)
	| "РВ" // 03 — Работа в выходные и нерабочие праздничные дни (Weekend/Holiday work)
	| "С" // 04 — Сверхурочная работа (Overtime)
	| "В" // 26 — Выходные дни и нерабочие праздничные дни (Day off / Weekend)
	| "ОТ" // 09 — Ежегодный основной оплачиваемый отпуск (Main paid vacation)
	| "ОД" // 10 — Ежегодный дополнительный оплачиваемый отпуск (Additional vacation)
	| "У" // 11 — Учебный отпуск с сохранением заработной платы (Study leave)
	| "Б" // 19 — Временная нетрудоспособность (Больничный лист / Sick leave)
	| "Т" // 20 — Временная нетрудоспособность без назначения пособия (Unpaid sick leave)
	| "ДО" // 16 — Отпуск без сохранения заработной платы (Unpaid leave)
	| "ПР" // 24 — Прогул (Absence without valid reason)
	| "К" // 06 — Служебная командировка (Business trip)
	| "ПК"; // 07 — Повышение квалификации с отрывом от работы (Professional training)

export const timesheetCodeSchema = z.enum([
	"Я",
	"Н",
	"РВ",
	"С",
	"В",
	"ОТ",
	"ОД",
	"У",
	"Б",
	"Т",
	"ДО",
	"ПР",
	"К",
	"ПК",
]);

export interface TimesheetCodeMetadata {
	readonly letterCode: TimesheetCode;
	readonly digitalCode: string;
	readonly descriptionRu: string;
	readonly isWorkTime: boolean;
	readonly isPaidAbsence: boolean;
}

export const TIMESHEET_STATUTORY_CODES: Record<TimesheetCode, TimesheetCodeMetadata> = {
	Я: {
		letterCode: "Я",
		digitalCode: "01",
		descriptionRu: "Продолжительность работы в дневное время",
		isWorkTime: true,
		isPaidAbsence: false,
	},
	Н: {
		letterCode: "Н",
		digitalCode: "02",
		descriptionRu: "Работа в ночное время (22:00–06:00)",
		isWorkTime: true,
		isPaidAbsence: false,
	},
	РВ: {
		letterCode: "РВ",
		digitalCode: "03",
		descriptionRu: "Работа в выходные и нерабочие праздничные дни",
		isWorkTime: true,
		isPaidAbsence: false,
	},
	С: {
		letterCode: "С",
		digitalCode: "04",
		descriptionRu: "Сверхурочная работа",
		isWorkTime: true,
		isPaidAbsence: false,
	},
	В: {
		letterCode: "В",
		digitalCode: "26",
		descriptionRu: "Выходные дни и нерабочие праздничные дни",
		isWorkTime: false,
		isPaidAbsence: false,
	},
	ОТ: {
		letterCode: "ОТ",
		digitalCode: "09",
		descriptionRu: "Ежегодный основной оплачиваемый отпуск",
		isWorkTime: false,
		isPaidAbsence: true,
	},
	ОД: {
		letterCode: "ОД",
		digitalCode: "10",
		descriptionRu: "Ежегодный дополнительный оплачиваемый отпуск",
		isWorkTime: false,
		isPaidAbsence: true,
	},
	У: {
		letterCode: "У",
		digitalCode: "11",
		descriptionRu: "Учебный отпуск с сохранением заработной платы",
		isWorkTime: false,
		isPaidAbsence: true,
	},
	Б: {
		letterCode: "Б",
		digitalCode: "19",
		descriptionRu: "Временная нетрудоспособность (больничный лист)",
		isWorkTime: false,
		isPaidAbsence: true,
	},
	Т: {
		letterCode: "Т",
		digitalCode: "20",
		descriptionRu: "Временная нетрудоспособность без назначения пособия",
		isWorkTime: false,
		isPaidAbsence: false,
	},
	ДО: {
		letterCode: "ДО",
		digitalCode: "16",
		descriptionRu: "Отпуск без сохранения заработной платы",
		isWorkTime: false,
		isPaidAbsence: false,
	},
	ПР: {
		letterCode: "ПР",
		digitalCode: "24",
		descriptionRu: "Прогул (отсутствие на работе без уважительных причин)",
		isWorkTime: false,
		isPaidAbsence: false,
	},
	К: {
		letterCode: "К",
		digitalCode: "06",
		descriptionRu: "Служебная командировка",
		isWorkTime: true,
		isPaidAbsence: true,
	},
	ПК: {
		letterCode: "ПК",
		digitalCode: "07",
		descriptionRu: "Повышение квалификации с отрывом от работы",
		isWorkTime: false,
		isPaidAbsence: true,
	},
};

/**
 * Daily record for an employee in Form T-13
 */
export interface TimesheetDayRecord {
	readonly dayNumber: number; // 1..31
	readonly primaryCode: TimesheetCode;
	readonly primaryHours: number; // e.g. 6.0, 6.6, 8.0, 12.0
	readonly secondaryCode?: TimesheetCode | undefined; // e.g. "С" (сверхурочные) or "Н" (ночные)
	readonly secondaryHours?: number | undefined; // e.g. 2.0
}

export const timesheetDayRecordSchema = z.object({
	dayNumber: z.number().int().min(1).max(31),
	primaryCode: timesheetCodeSchema,
	primaryHours: z.number().min(0).max(24),
	secondaryCode: timesheetCodeSchema.optional(),
	secondaryHours: z.number().min(0).max(24).optional(),
});

/**
 * Employee timesheet input for a single month
 */
export interface EmployeeTimesheetInput {
	readonly employeeId: string;
	readonly employeeTabNumber: string; // Табельный номер
	readonly employeeFullName: string;
	readonly positionRu: string; // Должность (например, "Врач-стоматолог-терапевт")
	readonly departmentRu: string; // Отделение / Кабинет
	readonly year: number;
	readonly month: number; // 1..12
	readonly days: readonly TimesheetDayRecord[];
	readonly payTypeCode?: string | undefined; // Код вида оплаты (например, "2000" — сдельная)
	readonly correspAccount?: string | undefined; // Корреспондирующий счет (например, "20")
}

export const employeeTimesheetInputSchema = z.object({
	employeeId: z.string().min(1),
	employeeTabNumber: z.string().min(1),
	employeeFullName: z.string().min(1),
	positionRu: z.string().min(1),
	departmentRu: z.string().min(1),
	year: z.number().int().min(2000).max(2100),
	month: z.number().int().min(1).max(12),
	days: z.array(timesheetDayRecordSchema),
	payTypeCode: z.string().optional(),
	correspAccount: z.string().optional(),
});

/**
 * Summary totals for half-month or full month
 */
export interface TimesheetPeriodSummary {
	readonly daysWorked: number; // Дней явок
	readonly regularHoursWorked: number; // Отработано дневных часов
	readonly nightHoursWorked: number; // Ночных часов (код Н)
	readonly overtimeHoursWorked: number; // Сверхурочных часов (код С)
	readonly weekendHoursWorked: number; // Часов в выходные/праздники (код РВ)
	readonly totalHoursWorked: number; // Всего отработано часов
	readonly vacationDays: number; // Дней отпуска (ОТ + ОД)
	readonly sickLeaveDays: number; // Дней больничного (Б + Т)
	readonly unpaidLeaveDays: number; // Дней за свой счет (ДО)
	readonly weekendDays: number; // Выходных дней (В)
	readonly absenceDaysTotal: number; // Всего неявок (дней)
}

/**
 * Full calculated result for an employee timesheet
 */
export interface EmployeeTimesheetResult {
	readonly employeeId: string;
	readonly employeeTabNumber: string;
	readonly employeeFullName: string;
	readonly positionRu: string;
	readonly departmentRu: string;
	readonly year: number;
	readonly month: number;
	readonly daysInMonth: number;
	readonly payTypeCode: string;
	readonly correspAccount: string;
	readonly dailyRecords: readonly TimesheetDayRecord[];
	readonly firstHalfSummary: TimesheetPeriodSummary; // 1..15 число
	readonly secondHalfSummary: TimesheetPeriodSummary; // 16..31 число
	readonly monthTotalSummary: TimesheetPeriodSummary; // Итого за месяц
}

/**
 * Canonical alias for employee record in Form T-13
 */
export type T13EmployeeRecord = EmployeeTimesheetResult;

/**
 * Full Form T-13 document payload for rendering and reporting
 */
export interface FormT13DocumentPayload {
	readonly organizationLegalName: string;
	readonly organizationOkpo?: string | undefined;
	readonly departmentName: string;
	readonly documentNumber: string;
	readonly compilationDate: string;
	readonly reportingPeriodStart: string;
	readonly reportingPeriodEnd: string;
	readonly year: number;
	readonly month: number;
	readonly employees: readonly EmployeeTimesheetResult[];
	readonly responsiblePersonPosition?: string | undefined;
	readonly responsiblePersonFullName?: string | undefined;
	readonly hrOfficerPosition?: string | undefined;
	readonly hrOfficerFullName?: string | undefined;
	readonly headOfOrganizationPosition?: string | undefined;
	readonly headOfOrganizationFullName?: string | undefined;
}

export const formT13DocumentPayloadSchema = z.object({
	organizationLegalName: z.string().min(1),
	organizationOkpo: z.string().optional(),
	departmentName: z.string().min(1),
	documentNumber: z.string().min(1),
	compilationDate: z.string().min(1),
	reportingPeriodStart: z.string().min(1),
	reportingPeriodEnd: z.string().min(1),
	year: z.number().int().min(2000).max(2100),
	month: z.number().int().min(1).max(12),
	employees: z.array(z.custom<EmployeeTimesheetResult>()),
	responsiblePersonPosition: z.string().optional(),
	responsiblePersonFullName: z.string().optional(),
	hrOfficerPosition: z.string().optional(),
	hrOfficerFullName: z.string().optional(),
	headOfOrganizationPosition: z.string().optional(),
	headOfOrganizationFullName: z.string().optional(),
});

/**
 * Weekly working hours norms per Russian labor law:
 * - 33h: Dentists / Врачи-стоматологи всех специальностей (ст. 350 ТК РФ, Постановление Правительства РФ № 101)
 * - 36h: Medical personnel in hazardous conditions / вредные условия (ст. 92, 350 ТК РФ)
 * - 39h: Paramedical staff & dental assistants / средний медперсонал, ассистенты (ст. 350 ТК РФ)
 * - 40h: Administrative, cashier & technical staff / общий персонал (ст. 91 ТК РФ)
 */
export type WorkWeekHoursNorm = 33 | 36 | 39 | 40;

/**
 * Monthly calendar work hours breakdown
 */
export interface MonthlyCalendarNorm {
	readonly month: number; // 1..12
	readonly monthNameRu: string;
	readonly calendarDays: number;
	readonly workingDays: number;
	readonly weekendAndHolidayDays: number;
	readonly preHolidayDays: number; // Shortened by 1h
	readonly hours40: number; // 40h week norm
	readonly hours39: number; // 39h week norm (assistants)
	readonly hours36: number; // 36h week norm
	readonly hours33: number; // 33h week norm (dentists)
}

/**
 * Annual production calendar totals summary
 */
export interface AnnualCalendarSummary2026 {
	readonly year: number;
	readonly totalCalendarDays: number;
	readonly totalWorkingDays: number;
	readonly totalWeekendAndHolidayDays: number;
	readonly totalPreHolidayDays: number;
	readonly annualHours40: number;
	readonly annualHours39: number;
	readonly annualHours36: number;
	readonly annualHours33: number;
}

/**
 * Shift hours calculation breakdown
 */
export interface ShiftHoursCalculationResult {
	readonly regularHours: number;
	readonly nightHours: number;
	readonly overtimeHours: number;
	readonly weekendHours: number;
	readonly totalHours: number;
}
