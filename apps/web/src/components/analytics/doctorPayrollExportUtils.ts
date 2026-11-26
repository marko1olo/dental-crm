/**
 * apps/web/src/components/analytics/doctorPayrollExportUtils.ts
 *
 * Утилиты экспорта, печати и запросов зарплатной ведомости врачей и ассистентов (SSOT).
 * Мандат 8n: Целочисленные копейки, отсутствие float-дрейфа.
 * Мандат 8e: Автономия врача, кнопки экспорта и печати никогда не disabled.
 * Инвариант: отсутствие вызовов toISOString (календарные даты передаются на сервер как есть).
 */

import { formatRubles } from "@dental/shared";
import { denteClinicalReadHeaders } from "../../lib/denteRequestHeaders";

export interface DoctorPayrollItem {
	readonly doctorId: string;
	readonly doctorName: string;
	readonly specialty: string;
	readonly servicesRenderedRub: number;
	readonly servicesRenderedKopecks: number;
	readonly materialsCostRub: number;
	readonly materialsCostKopecks: number;
	readonly labCostRub: number;
	readonly labCostKopecks: number;
	readonly netRevenueRub: number;
	readonly netRevenueKopecks: number;
	readonly commissionPercent: number;
	readonly payoutModel?: "percentage" | "chair_rental" | undefined;
	readonly priorDebtCarryOverKop?: number | undefined;
	readonly priorDebtDeductedKopecks?: number | undefined;
	readonly negativeCarryOverKopecks?: number | undefined;
	readonly payoutRub: number;
	readonly payoutKopecks: number;
	readonly appointmentsCompleted: number;
}

export interface DoctorPayrollTotals {
	readonly totalServicesRenderedRub: number;
	readonly totalServicesRenderedKopecks: number;
	readonly totalMaterialsCostRub: number;
	readonly totalMaterialsCostKopecks: number;
	readonly totalLabCostRub: number;
	readonly totalLabCostKopecks: number;
	readonly totalNetRevenueRub: number;
	readonly totalNetRevenueKopecks: number;
	readonly totalPayoutRub: number;
	readonly totalPayoutKopecks: number;
	readonly totalAppointmentsCompleted: number;
	readonly totalAssistantPayoutRub?: number;
	readonly totalAssistantPayoutKopecks?: number;
	readonly totalClinicPayrollRub?: number;
	readonly totalClinicPayrollKopecks?: number;
}

export interface AssistantPayrollItem {
	readonly assistantId: string;
	readonly assistantName: string;
	readonly role: string;
	readonly appointmentsAssisted: number;
	readonly shiftsCount: number;
	readonly hoursWorked: number;
	readonly radiographCount: number;
	readonly surgeryCount: number;
	readonly baseShiftPayoutRub: number;
	readonly baseShiftPayoutKopecks: number;
	readonly radiographPayoutRub: number;
	readonly radiographPayoutKopecks: number;
	readonly surgeryPayoutRub: number;
	readonly surgeryPayoutKopecks: number;
	readonly grossPayoutRub: number;
	readonly grossPayoutKopecks: number;
	readonly ndflTaxRub: number;
	readonly ndflTaxKopecks: number;
	readonly payoutRub: number;
	readonly payoutKopecks: number;
}

export function formatRub(rub: number): string {
	return formatRubles(rub);
}

export const PERIOD_LABELS: Record<string, string> = {
	day: "Сегодня",
	week: "Неделя",
	month: "Месяц",
	quarter: "Квартал",
	year: "Год",
};

/**
 * Границы зарплатного месяца в виде календарных дат YYYY-MM-DD без вызова toISOString.
 */
export function payoutMonthCalendarBounds(
	monthValue: string,
): { from: string; to: string } | null {
	const match = /^(\d{4})-(\d{2})$/.exec(monthValue);
	if (!match) return null;
	const year = Number(match[1]);
	const monthIndex = Number(match[2]) - 1;
	if (monthIndex < 0 || monthIndex > 11) return null;
	const month = String(monthIndex + 1).padStart(2, "0");
	const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
	return {
		from: `${year}-${month}-01`,
		to: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
	};
}

/**
 * Запрос расчёта выплат врачам (вынесен ради проверяемости календарных границ).
 * Обращается к каноническому маршруту /api/v1/payroll/calculations.
 */
export async function requestDoctorPayouts(
	bounds: { readonly from: string; readonly to: string },
	headers: Record<string, string>,
): Promise<Response> {
	const query = new URLSearchParams({ from: bounds.from, to: bounds.to });
	const authHeaders = denteClinicalReadHeaders(headers);
	return fetch(`/api/v1/payroll/calculations?${query.toString()}`, { headers: authHeaders });
}

/**
 * Экспорт ведомости врачей в формате CSV (RFC 4180 с UTF-8 BOM для Excel).
 */
export function exportDoctorPayrollToCsv(
	rows: readonly DoctorPayrollItem[],
	totals: DoctorPayrollTotals | null,
	periodLabel: string,
): void {
	const headers = [
		"Врач",
		"Специализация",
		"Приёмов",
		"Оказано услуг (руб)",
		"Списано материалов (руб)",
		"Лаборатория ЗТЛ (руб)",
		"Чистая выручка Net (руб)",
		"Ставка (%)",
		"К выплате (руб)",
	];

	const csvLines: string[] = [
		`"Ведомость начисления заработной платы врачам — ${periodLabel}"`,
		headers.map((h) => `"${h}"`).join(";"),
	];

	for (const row of rows) {
		csvLines.push(
			[
				`"${row.doctorName.replace(/"/g, '""')}"`,
				`"${row.specialty.replace(/"/g, '""')}"`,
				row.appointmentsCompleted,
				Math.round(row.servicesRenderedRub),
				Math.round(row.materialsCostRub),
				Math.round(row.labCostRub || 0),
				Math.round(row.netRevenueRub),
				`${row.commissionPercent.toFixed(1)}%`,
				Math.round(row.payoutRub),
			].join(";"),
		);
	}

	if (totals) {
		csvLines.push(
			[
				`"Итого по клинике"`,
				`"-"`,
				totals.totalAppointmentsCompleted,
				Math.round(totals.totalServicesRenderedRub),
				Math.round(totals.totalMaterialsCostRub),
				Math.round(totals.totalLabCostRub),
				Math.round(totals.totalNetRevenueRub),
				`"-"`,
				Math.round(totals.totalPayoutRub),
			].join(";"),
		);
	}

	downloadCsvFile(csvLines.join("\r\n"), `Vedomost_vrachei_${periodLabel}.csv`);
}

/**
 * Экспорт ведомости ассистентов в формате CSV.
 */
export function exportAssistantPayrollToCsv(
	rows: readonly AssistantPayrollItem[],
	periodLabel: string,
): void {
	const headers = [
		"Ассистент",
		"Должность",
		"Смен",
		"Часов",
		"Приёмов с врачами",
		"Снимков RVG",
		"Хирургических операций",
		"Базовая ставка (руб)",
		"Доплаты (руб)",
		"НДФЛ 13% (руб)",
		"К выплате на руки (руб)",
	];

	const csvLines: string[] = [
		`"Ведомость начисления заработной платы ассистентам — ${periodLabel}"`,
		headers.map((h) => `"${h}"`).join(";"),
	];

	for (const row of rows) {
		csvLines.push(
			[
				`"${row.assistantName.replace(/"/g, '""')}"`,
				`"${row.role.replace(/"/g, '""')}"`,
				row.shiftsCount,
				row.hoursWorked,
				row.appointmentsAssisted,
				row.radiographCount,
				row.surgeryCount,
				Math.round(row.baseShiftPayoutRub),
				Math.round(row.radiographPayoutRub + row.surgeryPayoutRub),
				Math.round(row.ndflTaxRub),
				Math.round(row.payoutRub),
			].join(";"),
		);
	}

	downloadCsvFile(csvLines.join("\r\n"), `Vedomost_assistentov_${periodLabel}.csv`);
}

function downloadCsvFile(content: string, filename: string): void {
	if (typeof window === "undefined" || !window.Blob) return;
	const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

