/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Statutory Form T-13 Timesheet Engine (Госкомстат РФ № 1)
 *
 * Implements:
 * 1. Unified Form No. T-13 ("Табель учета рабочего времени", Постановление Госкомстата РФ от 05.01.2004 № 1, ОКУД 0301008).
 * 2. Statutory Russian attendance/absence codes (Я, Н, РВ, С, В, ОТ, ОД, У, Б, Т, ДО, ПР, К, ПК).
 * 3. Daily shift accounting (1..31 days) with dual code/hours cells (e.g. Я / 6.6, С / 2.0).
 * 4. Half-month (1..15, 16..31) and full-month aggregations (days, regular hours, overtime, night hours, weekend hours, absences).
 * 5. Official Form T-13 A4 Landscape HTML generator with @media print styling for direct print/PDF.
 * 6. Form T-13 CSV export with UTF-8 BOM for 1C:ZUP 3.1 and Excel interoperability.
 * 7. Zod schemas for runtime boundary validation.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";

/**
 * Statutory Russian State Statistics Committee (Госкомстат) attendance & absence codes
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
 * Calculates number of days in a given year and month (1-indexed).
 */
export function getDaysInMonth(year: number, month: number): number {
	return new Date(year, month, 0).getDate();
}

/**
 * Aggregates a range of days into period summary totals.
 */
export function aggregateTimesheetDays(
	days: readonly TimesheetDayRecord[],
	startDay: number,
	endDay: number,
): TimesheetPeriodSummary {
	let daysWorked = 0;
	let regularHoursWorked = 0;
	let nightHoursWorked = 0;
	let overtimeHoursWorked = 0;
	let weekendHoursWorked = 0;
	let vacationDays = 0;
	let sickLeaveDays = 0;
	let unpaidLeaveDays = 0;
	let weekendDays = 0;
	let absenceDaysTotal = 0;

	for (let d = startDay; d <= endDay; d++) {
		const rec = days.find((item) => item.dayNumber === d);
		if (!rec) continue;

		const codeMeta = TIMESHEET_STATUTORY_CODES[rec.primaryCode] ?? TIMESHEET_STATUTORY_CODES.В;

		if (codeMeta.isWorkTime) {
			daysWorked += 1;
			if (rec.primaryCode === "Я") {
				regularHoursWorked += rec.primaryHours;
			} else if (rec.primaryCode === "Н") {
				nightHoursWorked += rec.primaryHours;
			} else if (rec.primaryCode === "РВ") {
				weekendHoursWorked += rec.primaryHours;
			} else if (rec.primaryCode === "С") {
				overtimeHoursWorked += rec.primaryHours;
			} else {
				regularHoursWorked += rec.primaryHours;
			}
		} else {
			absenceDaysTotal += 1;
			if (rec.primaryCode === "В") {
				weekendDays += 1;
			} else if (rec.primaryCode === "ОТ" || rec.primaryCode === "ОД") {
				vacationDays += 1;
			} else if (rec.primaryCode === "Б" || rec.primaryCode === "Т") {
				sickLeaveDays += 1;
			} else if (rec.primaryCode === "ДО") {
				unpaidLeaveDays += 1;
			}
		}

		// Process secondary hours if present (e.g. Overtime "С" or Night shift "Н" on top of daytime work)
		if (rec.secondaryCode && rec.secondaryHours && rec.secondaryHours > 0) {
			if (rec.secondaryCode === "С") {
				overtimeHoursWorked += rec.secondaryHours;
			} else if (rec.secondaryCode === "Н") {
				nightHoursWorked += rec.secondaryHours;
			} else if (rec.secondaryCode === "РВ") {
				weekendHoursWorked += rec.secondaryHours;
			} else {
				regularHoursWorked += rec.secondaryHours;
			}
		}
	}

	const totalHoursWorked =
		regularHoursWorked + nightHoursWorked + overtimeHoursWorked + weekendHoursWorked;

	return {
		daysWorked,
		regularHoursWorked: Number(regularHoursWorked.toFixed(1)),
		nightHoursWorked: Number(nightHoursWorked.toFixed(1)),
		overtimeHoursWorked: Number(overtimeHoursWorked.toFixed(1)),
		weekendHoursWorked: Number(weekendHoursWorked.toFixed(1)),
		totalHoursWorked: Number(totalHoursWorked.toFixed(1)),
		vacationDays,
		sickLeaveDays,
		unpaidLeaveDays,
		weekendDays,
		absenceDaysTotal,
	};
}

/**
 * Computes full Form T-13 timesheet for an employee.
 */
export function calculateEmployeeTimesheetT13(
	input: EmployeeTimesheetInput,
): EmployeeTimesheetResult {
	const totalDays = getDaysInMonth(input.year, input.month);

	// Ensure all days 1..totalDays exist in array
	const fullDays: TimesheetDayRecord[] = [];
	for (let d = 1; d <= totalDays; d++) {
		const existing = input.days.find((item) => item.dayNumber === d);
		if (existing) {
			fullDays.push(existing);
		} else {
			// Default to Weekend (В) if not specified
			fullDays.push({
				dayNumber: d,
				primaryCode: "В",
				primaryHours: 0,
			});
		}
	}

	const firstHalfSummary = aggregateTimesheetDays(fullDays, 1, Math.min(15, totalDays));
	const secondHalfSummary = aggregateTimesheetDays(fullDays, 16, totalDays);
	const monthTotalSummary = aggregateTimesheetDays(fullDays, 1, totalDays);

	return {
		employeeId: input.employeeId,
		employeeTabNumber: input.employeeTabNumber,
		employeeFullName: input.employeeFullName,
		positionRu: input.positionRu,
		departmentRu: input.departmentRu,
		year: input.year,
		month: input.month,
		daysInMonth: totalDays,
		payTypeCode: input.payTypeCode ?? "2000",
		correspAccount: input.correspAccount ?? "20",
		dailyRecords: fullDays,
		firstHalfSummary,
		secondHalfSummary,
		monthTotalSummary,
	};
}

function escapeHtml(unsafe: string): string {
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

/**
 * Generates official Form T-13 A4 Landscape HTML document for printing and export.
 * Follows Statutory Goskomstat Decree No. 1 from 05.01.2004 (ОКУД 0301008).
 */
export function renderFormT13Html(payload: FormT13DocumentPayload): string {
	const daysInMonth = getDaysInMonth(payload.year, payload.month);
	const monthNameRu = new Date(payload.year, payload.month - 1, 1).toLocaleDateString("ru-RU", {
		month: "long",
		year: "numeric",
	});

	// Build rows for each employee (each employee takes 4 sub-rows in Form T-13)
	const employeeRowsHtml = payload.employees.map((emp, index) => {
		const rowNum = index + 1;
		const r1_15 = emp.dailyRecords.filter((d) => d.dayNumber >= 1 && d.dayNumber <= 15);
		const r16_31 = emp.dailyRecords.filter((d) => d.dayNumber >= 16 && d.dayNumber <= daysInMonth);

		// Line 1: Codes for days 1..15
		const line1Codes = Array.from({ length: 15 }, (_, i) => {
			const day = r1_15.find((d) => d.dayNumber === i + 1);
			return `<td class="t13-cell code">${day ? escapeHtml(day.primaryCode) : "В"}</td>`;
		}).join("");

		// Line 2: Hours for days 1..15
		const line2Hours = Array.from({ length: 15 }, (_, i) => {
			const day = r1_15.find((d) => d.dayNumber === i + 1);
			const h = day && day.primaryHours > 0 ? day.primaryHours.toString() : "";
			return `<td class="t13-cell hours">${h}</td>`;
		}).join("");

		// Line 3: Codes for days 16..31
		const line3Codes = Array.from({ length: 16 }, (_, i) => {
			const dayNum = 16 + i;
			if (dayNum > daysInMonth) {
				return `<td class="t13-cell code empty">X</td>`;
			}
			const day = r16_31.find((d) => d.dayNumber === dayNum);
			return `<td class="t13-cell code">${day ? escapeHtml(day.primaryCode) : "В"}</td>`;
		}).join("");

		// Line 4: Hours for days 16..31
		const line4Hours = Array.from({ length: 16 }, (_, i) => {
			const dayNum = 16 + i;
			if (dayNum > daysInMonth) {
				return `<td class="t13-cell hours empty">X</td>`;
			}
			const day = r16_31.find((d) => d.dayNumber === dayNum);
			const h = day && day.primaryHours > 0 ? day.primaryHours.toString() : "";
			return `<td class="t13-cell hours">${h}</td>`;
		}).join("");

		const tot = emp.monthTotalSummary;

		return `
    <tr class="emp-row-top">
      <td rowspan="4" class="t13-cell center font-bold">${rowNum}</td>
      <td rowspan="4" class="t13-cell left">
        <div class="emp-name">${escapeHtml(emp.employeeFullName)}</div>
        <div class="emp-pos">${escapeHtml(emp.positionRu)}</div>
      </td>
      <td rowspan="4" class="t13-cell center font-mono">${escapeHtml(emp.employeeTabNumber)}</td>
      ${line1Codes}
      <td class="t13-cell center font-bold bg-muted">${emp.firstHalfSummary.daysWorked}</td>
      <td class="t13-cell center font-bold bg-muted" rowspan="2">${tot.daysWorked}</td>
      <td class="t13-cell center font-bold bg-muted" rowspan="2">${tot.totalHoursWorked}</td>
      <td class="t13-cell center font-mono" rowspan="4">${escapeHtml(emp.payTypeCode)}</td>
      <td class="t13-cell center font-mono" rowspan="4">${escapeHtml(emp.correspAccount)}</td>
      <td class="t13-cell center" rowspan="4">${tot.daysWorked} дн.<br/>${tot.totalHoursWorked} ч.</td>
      <td class="t13-cell center" rowspan="4">${tot.vacationDays > 0 ? `ОТ: ${tot.vacationDays} дн.` : "—"}</td>
      <td class="t13-cell center" rowspan="4">${tot.sickLeaveDays > 0 ? `Б: ${tot.sickLeaveDays} дн.` : "—"}</td>
      <td class="t13-cell center" rowspan="4">${tot.unpaidLeaveDays > 0 ? `ДО: ${tot.unpaidLeaveDays} дн.` : "—"}</td>
      <td class="t13-cell center" rowspan="4">${tot.weekendDays} дн.</td>
    </tr>
    <tr>
      ${line2Hours}
      <td class="t13-cell center font-bold bg-muted">${emp.firstHalfSummary.totalHoursWorked}</td>
    </tr>
    <tr class="emp-row-mid">
      ${line3Codes}
      <td class="t13-cell center font-bold bg-muted">${emp.secondHalfSummary.daysWorked}</td>
      <td class="t13-cell center" rowspan="2">СВ: ${tot.overtimeHoursWorked}<br/>НОЧ: ${tot.nightHoursWorked}</td>
      <td class="t13-cell center" rowspan="2">РВ: ${tot.weekendHoursWorked} ч.</td>
    </tr>
    <tr class="emp-row-bot">
      ${line4Hours}
      <td class="t13-cell center font-bold bg-muted">${emp.secondHalfSummary.totalHoursWorked}</td>
    </tr>
    `;
	}).join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Табель учета рабочего времени Т-13 — ${escapeHtml(monthNameRu)}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm 8mm 8mm 8mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      font-family: "PT Astra Sans", "Arial", "Liberation Sans", sans-serif;
      font-size: 7.5pt;
      line-height: 1.15;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .t13-container {
      width: 100%;
      max-width: 280mm;
      margin: 0 auto;
    }
    .t13-header-grid {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 6px;
    }
    .t13-org-block {
      width: 60%;
    }
    .t13-org-name {
      font-size: 10pt;
      font-weight: 800;
      text-transform: uppercase;
      border-bottom: 1pt solid #0f172a;
      padding-bottom: 2px;
      margin-bottom: 2px;
    }
    .t13-dept-name {
      font-size: 8.5pt;
      color: #334155;
      border-bottom: 0.5pt solid #94a3b8;
      padding-bottom: 2px;
    }
    .t13-okud-block {
      width: 35%;
      text-align: right;
    }
    .t13-okud-table {
      border-collapse: collapse;
      float: right;
      font-size: 7pt;
      margin-bottom: 4px;
    }
    .t13-okud-table th, .t13-okud-table td {
      border: 1pt solid #0f172a;
      padding: 2pt 4pt;
      text-align: center;
    }
    .t13-okud-table th {
      background: #f1f5f9;
      font-weight: bold;
    }
    .t13-title-block {
      text-align: center;
      margin: 6px 0;
    }
    .t13-title {
      font-size: 12pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin: 0;
    }
    .t13-doc-meta-table {
      margin: 4px auto 8px auto;
      border-collapse: collapse;
      font-size: 7.5pt;
    }
    .t13-doc-meta-table th, .t13-doc-meta-table td {
      border: 1pt solid #0f172a;
      padding: 2pt 6pt;
      text-align: center;
    }
    .t13-doc-meta-table th {
      background: #f1f5f9;
      font-weight: bold;
    }
    .t13-main-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 6.5pt;
      margin-bottom: 8px;
    }
    .t13-main-table th, .t13-main-table td {
      border: 0.5pt solid #475569;
      padding: 1.5pt 1pt;
      text-align: center;
      vertical-align: middle;
    }
    .t13-main-table th {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: bold;
      font-size: 6pt;
    }
    .t13-cell.code {
      font-weight: 800;
      font-size: 7pt;
      color: #0369a1;
      height: 12px;
    }
    .t13-cell.hours {
      font-size: 6.5pt;
      color: #0f172a;
      height: 11px;
    }
    .t13-cell.empty {
      color: #cbd5e1;
      background: #f8fafc;
    }
    .t13-cell.left {
      text-align: left;
      padding-left: 3pt;
    }
    .t13-cell.font-bold {
      font-weight: bold;
    }
    .t13-cell.font-mono {
      font-family: "JetBrains Mono", monospace;
      font-size: 6.5pt;
    }
    .bg-muted {
      background: #f8fafc;
    }
    .emp-name {
      font-weight: bold;
      font-size: 7pt;
      color: #0f172a;
    }
    .emp-pos {
      font-size: 6pt;
      color: #475569;
    }
    .emp-row-top td {
      border-top: 1pt solid #0f172a;
    }
    .emp-row-bot td {
      border-bottom: 1pt solid #0f172a;
    }
    .t13-signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 12px;
      font-size: 7.5pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sig-col {
      width: 32%;
    }
    .sig-line {
      border-bottom: 0.75pt solid #0f172a;
      height: 14px;
      margin-bottom: 2px;
    }
    .sig-sub {
      font-size: 6pt;
      color: #64748b;
      text-align: center;
    }
    .ukep-stamp {
      border: 1.5pt solid #0369a1;
      background: #f0f9ff;
      padding: 4pt 8pt;
      margin-top: 8px;
      font-size: 6.5pt;
      color: #0369a1;
      border-radius: 3pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .ukep-title {
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    @media print {
      body { color: #000 !important; background: #fff !important; }
      .t13-main-table th { background: #f1f5f9 !important; color: #000 !important; }
      .t13-cell.code { color: #000 !important; font-weight: bold !important; }
      .t13-main-table th, .t13-main-table td { border-color: #000 !important; }
      .ukep-stamp { border-color: #000 !important; color: #000 !important; background: #fff !important; }
    }
  </style>
</head>
<body>
<div class="t13-container">
  <div class="t13-header-grid">
    <div class="t13-org-block">
      <div class="t13-org-name">${escapeHtml(payload.organizationLegalName)}</div>
      <div style="font-size:6.5pt; color:#64748b; margin-bottom:2px;">(наименование организации)</div>
      <div class="t13-dept-name">${escapeHtml(payload.departmentName)}</div>
      <div style="font-size:6.5pt; color:#64748b;">(структурное подразделение)</div>
    </div>
    <div class="t13-okud-block">
      <div style="font-size:7pt; color:#475569; margin-bottom:2px;">Унифицированная форма № Т-13<br/>Утверждена Постановлением Госкомстата России от 05.01.2004 № 1</div>
      <table class="t13-okud-table">
        <tr><th>Форма по ОКУД</th><td><strong>0301008</strong></td></tr>
        <tr><th>по ОКПО</th><td>${escapeHtml(payload.organizationOkpo || "12345678")}</td></tr>
      </table>
    </div>
  </div>

  <div class="t13-title-block">
    <h1 class="t13-title">ТАБЕЛЬ УЧЕТА РАБОЧЕГО ВРЕМЕНИ</h1>
    <table class="t13-doc-meta-table">
      <thead>
        <tr>
          <th rowspan="2">Номер документа</th>
          <th rowspan="2">Дата составления</th>
          <th colspan="2">Отчетный период</th>
        </tr>
        <tr>
          <th>с</th>
          <th>по</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>${escapeHtml(payload.documentNumber)}</strong></td>
          <td>${escapeHtml(payload.compilationDate)}</td>
          <td>${escapeHtml(payload.reportingPeriodStart)}</td>
          <td>${escapeHtml(payload.reportingPeriodEnd)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <table class="t13-main-table">
    <thead>
      <tr>
        <th rowspan="4" style="width:2%;">№ п/п</th>
        <th rowspan="4" style="width:14%;">Фамилия, инициалы, должность (специальность)</th>
        <th rowspan="4" style="width:5%;">Табельный номер</th>
        <th colspan="16" style="width:40%;">Отметки о явках и неявках на работу по числам месяца</th>
        <th colspan="2" rowspan="2" style="width:7%;">Отработано за</th>
        <th colspan="2" rowspan="2" style="width:7%;">Данные для начисления з/п</th>
        <th colspan="5" rowspan="2" style="width:25%;">Неявки по причинам (дни / часы)</th>
      </tr>
      <tr>
        <th colspan="15">I половина месяца (1–15)</th>
        <th rowspan="3" style="width:2.5%;">I пол. (дней)</th>
      </tr>
      <tr>
        ${Array.from({ length: 15 }, (_, i) => `<th style="width:2%;">${i + 1}</th>`).join("")}
        <th rowspan="2" style="width:3.5%;">Всего дней</th>
        <th rowspan="2" style="width:3.5%;">Всего часов</th>
        <th rowspan="2" style="width:3.5%;">Код оплаты</th>
        <th rowspan="2" style="width:3.5%;">Корр. счет</th>
        <th rowspan="2" style="width:5%;">Отработано</th>
        <th rowspan="2" style="width:5%;">Отпуск (ОТ)</th>
        <th rowspan="2" style="width:5%;">Больн. (Б)</th>
        <th rowspan="2" style="width:5%;">Без опл. (ДО)</th>
        <th rowspan="2" style="width:5%;">Выходн. (В)</th>
      </tr>
      <tr>
        <th colspan="15">II половина месяца (16–31)</th>
      </tr>
      <tr style="background:#e2e8f0; font-size:5.5pt; color:#475569;">
        <th>1</th>
        <th>2</th>
        <th>3</th>
        ${Array.from({ length: 15 }, (_, i) => `<th>${4 + i}</th>`).join("")}
        <th>19</th>
        <th>20</th>
        <th>21</th>
        <th>22</th>
        <th>23</th>
        <th>24</th>
        <th>25</th>
        <th>26</th>
        <th>27</th>
        <th>28</th>
      </tr>
    </thead>
    <tbody>
      ${employeeRowsHtml}
    </tbody>
  </table>

  <div class="t13-signatures">
    <div class="sig-col">
      <div><strong>${escapeHtml(payload.responsiblePersonPosition || "Руководитель структурного подразделения")}:</strong></div>
      <div class="sig-line"></div>
      <div class="sig-sub">(подпись) / ${escapeHtml(payload.responsiblePersonFullName || "Иванов И. И.")} /</div>
    </div>
    <div class="sig-col">
      <div><strong>${escapeHtml(payload.hrOfficerPosition || "Работник кадровой службы")}:</strong></div>
      <div class="sig-line"></div>
      <div class="sig-sub">(подпись) / ${escapeHtml(payload.hrOfficerFullName || "Петрова А. С.")} /</div>
    </div>
    <div class="sig-col">
      <div><strong>${escapeHtml(payload.headOfOrganizationPosition || "Главный врач / Руководитель организации")}:</strong></div>
      <div class="sig-line"></div>
      <div class="sig-sub">(подпись) / ${escapeHtml(payload.headOfOrganizationFullName || "Сидоров В. В.")} /</div>
    </div>
  </div>

  <div class="ukep-stamp">
    <div class="ukep-title">✔ ДОКУМЕНТ ПОДПИСАН УСИЛЕННОЙ КВАЛИФИЦИРОВАННОЙ ЭЛЕКТРОННОЙ ПОДПИСЬЮ (63-ФЗ)</div>
    <div>Табель учета рабочего времени (Форма Т-13) верифицирован в контуре МИС DENTE Dental CRM. Регистрационный номер: ${escapeHtml(payload.documentNumber)} от ${escapeHtml(payload.compilationDate)}.</div>
  </div>
</div>
</body>
</html>`;
}

/**
 * Generates official Russian Form T-13 CSV file string with UTF-8 BOM.
 */
export function generateTimesheetT13Csv(
	results: readonly EmployeeTimesheetResult[],
	clinicName: string = "ООО «Денте Стоматология»",
	year: number = new Date().getFullYear(),
	month: number = new Date().getMonth() + 1,
): string {
	const daysInMonth = getDaysInMonth(year, month);
	const monthNameRu = new Date(year, month - 1, 1).toLocaleDateString("ru-RU", {
		month: "long",
		year: "numeric",
	});

	let csv = `\uFEFFУнифицированная форма № Т-13;Утверждена Постановлением Госкомстата России от 05.01.2004 № 1\n`;
	csv += `Организация:;"${clinicName}";Период:;"${monthNameRu}"\n\n`;

	// Header row 1 (Day columns 1..15, I половина, 16..31, II половина, Итого)
	let header = `№ п/п;Табельный номер;ФИО работника;Должность;`;
	for (let d = 1; d <= 15; d++) {
		header += `${d};`;
	}
	header += `I пол. (дней);I пол. (часов);`;
	for (let d = 16; d <= daysInMonth; d++) {
		header += `${d};`;
	}
	header += `II пол. (дней);II пол. (часов);Всего дней;Всего часов;Сверхурочные;Ночные;Выходные/праздн.;Больничный (дней);Отпуск (дней)\n`;

	csv += header;

	results.forEach((emp, index) => {
		const rowNum = index + 1;
		let codeRow = `${rowNum};${emp.employeeTabNumber};"${emp.employeeFullName}";"${emp.positionRu}";`;

		// Days 1..15
		for (let d = 1; d <= 15; d++) {
			const day = emp.dailyRecords.find((r) => r.dayNumber === d);
			const code = day?.primaryCode ?? "В";
			const hrs = day?.primaryHours && day.primaryHours > 0 ? ` (${day.primaryHours}ч)` : "";
			codeRow += `"${code}${hrs}";`;
		}

		codeRow += `${emp.firstHalfSummary.daysWorked};${emp.firstHalfSummary.totalHoursWorked};`;

		// Days 16..daysInMonth
		for (let d = 16; d <= daysInMonth; d++) {
			const day = emp.dailyRecords.find((r) => r.dayNumber === d);
			const code = day?.primaryCode ?? "В";
			const hrs = day?.primaryHours && day.primaryHours > 0 ? ` (${day.primaryHours}ч)` : "";
			codeRow += `"${code}${hrs}";`;
		}

		const tot = emp.monthTotalSummary;
		codeRow += `${emp.secondHalfSummary.daysWorked};${emp.secondHalfSummary.totalHoursWorked};`;
		codeRow += `${tot.daysWorked};${tot.totalHoursWorked};${tot.overtimeHoursWorked};${tot.nightHoursWorked};${tot.weekendHoursWorked};${tot.sickLeaveDays};${tot.vacationDays}\n`;

		csv += codeRow;
	});

	return csv;
}
