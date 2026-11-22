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

/**
 * Генерация чистого HTML бланка расчётного листка врача.
 */
export function generateDoctorPayslipHtml(
	row: DoctorPayrollItem,
	periodLabel: string,
): string {
	return `
<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Расчётный листок — ${row.doctorName}</title>
	<style>
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 24px; color: #1e293b; font-size: 13px; line-height: 1.5; }
		.header { border-bottom: 2px solid #0d9488; padding-bottom: 12px; margin-bottom: 16px; }
		h1 { font-size: 18px; margin: 0 0 4px 0; color: #0f172a; }
		.subtitle { font-size: 12px; color: #64748b; }
		table { width: 100%; border-collapse: collapse; margin-top: 16px; }
		th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
		th { background: #f8fafc; color: #475569; font-weight: 600; font-size: 12px; }
		.text-right { text-align: right; }
		.font-bold { font-weight: 700; }
		.total-row { background: #f0fdfa; font-weight: 700; color: #0f766e; }
		.footer { margin-top: 32px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 16px; }
		@media print { body { margin: 0; } }
	</style>
</head>
<body>
	<div class="header">
		<h1>Расчётный листок врача</h1>
		<div class="subtitle">Сотрудник: <strong>${row.doctorName}</strong> (${row.specialty}) • Период: <strong>${periodLabel}</strong></div>
	</div>

	<table>
		<thead>
			<tr>
				<th>Показатель начисления</th>
				<th class="text-right">Значение</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td>Завершённых приёмов пациентов</td>
				<td class="text-right">${row.appointmentsCompleted}</td>
			</tr>
			<tr>
				<td>Валовая выручка по услугам (Gross)</td>
				<td class="text-right">${formatRub(row.servicesRenderedRub)}</td>
			</tr>
			<tr>
				<td>Списано расходных материалов (по техкартам)</td>
				<td class="text-right">-${formatRub(row.materialsCostRub)}</td>
			</tr>
			<tr>
				<td>Расходы зуботехнической лаборатории (ЗТЛ)</td>
				<td class="text-right">-${formatRub(row.labCostRub || 0)}</td>
			</tr>
			<tr>
				<td>Чистая база начисления (Net Revenue)</td>
				<td class="text-right font-bold">${formatRub(row.netRevenueRub)}</td>
			</tr>
			<tr>
				<td>Процентная ставка комиссии</td>
				<td class="text-right">${row.commissionPercent.toFixed(1)}%</td>
			</tr>
			<tr class="total-row">
				<td>Итого к выплате:</td>
				<td class="text-right font-bold">${formatRub(row.payoutRub)}</td>
			</tr>
		</tbody>
	</table>

	<div class="footer">
		<div>Подпись руководителя: __________________</div>
		<div>Подпись сотрудника: __________________</div>
	</div>
</body>
</html>
`.trim();
}
