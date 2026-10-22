/**
 * DENTE Dental CRM — Staff Payroll Ledger Printable HTML Exporter
 * Compliance: Mandate 8x & 8ap (Clean Russian Clinical Terminology without Bureaucratic Codes).
 */

import { escapeXml } from "./escapeXml";
import type { ConsolidatedStaffPayrollSummary } from "../engine/staffPayrollAssistantAdminTypes";

export function generateStaffPayrollLedgerHtml(summary: ConsolidatedStaffPayrollSummary): string {
	const totalGrossRub = (summary.totalGrossPayoutKop / 100).toFixed(2);

	const rowsHtml = summary.records
		.map((r, i) => {
			let days = 0;
			let hours = 0;
			let baseRub = "0.00";
			let bonusRub = "0.00";

			if (r.role === "doctor") {
				days = r.daysWorked;
				hours = r.hoursWorked;
				baseRub = (r.earnedBaseCommissionKop / 100).toFixed(2);
				const bonusesKop =
					r.earnedRetailCommissionKop +
					r.comprehensivePlanBonusKop +
					r.revenueKpiBonusKop +
					r.manualAdjustmentKop;
				bonusRub = (bonusesKop / 100).toFixed(2);
			} else if (r.role === "assistant") {
				days = r.totalShiftsCount;
				hours = r.totalHoursWorked;
				baseRub = (r.baseShiftsPayoutKop / 100).toFixed(2);
				const bonusesKop =
					r.categoryBonusKop +
					r.sterilizationBonusKop +
					r.radiographsPayoutKop +
					r.surgeriesPayoutKop +
					r.manualAdjustmentKop;
				bonusRub = (bonusesKop / 100).toFixed(2);
			} else if (r.role === "administrator") {
				days = r.shiftsWorked;
				hours = r.hoursWorked;
				baseRub = (r.baseSalaryPayoutKop / 100).toFixed(2);
				const bonusesKop =
					r.cashRevenueCommissionKop +
					r.leadConversionBonusKop +
					r.manualAdjustmentKop;
				bonusRub = (bonusesKop / 100).toFixed(2);
			}

			const gross = (r.grossPayoutBeforeTaxKop / 100).toFixed(2);
			return `<tr>
				<td>${i + 1}</td>
				<td>${escapeXml(r.employeeTabNumber)}</td>
				<td>${escapeXml(r.employeeFullName)}</td>
				<td>${escapeXml(r.positionRu)}</td>
				<td style="text-align:center">${days} дн (${hours.toFixed(1)} ч)</td>
				<td style="text-align:right">${baseRub}</td>
				<td style="text-align:right">${bonusRub}</td>
				<td style="text-align:right;font-weight:bold">${gross}</td>
			</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Зарплатная ведомость персонала — ${escapeXml(summary.clinicName)}</title>
	<style>
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11px; margin: 20px; color: var(--ink, #111827); }
		h1 { font-size: 14px; margin: 0 0 4px 0; text-align: center; }
		.sub { font-size: 11px; text-align: center; color: var(--muted, #6b7280); margin-bottom: 16px; }
		table { width: 100%; border-collapse: collapse; margin-top: 10px; }
		th, td { border: 1px solid var(--line, #d1d5db); padding: 4px 6px; text-align: left; }
		th { background-color: var(--paper-soft, #f3f4f6); font-weight: 600; }
		.total-row { font-weight: bold; background-color: var(--paper-soft, #f9fafb); }
	</style>
</head>
<body>
	<h1>Сдельная зарплатная ведомость персонала клиники</h1>
	<div class="sub">${escapeXml(summary.clinicName)} • ИНН: ${escapeXml(summary.organizationInn)} • Период: ${escapeXml(summary.periodLabelRu)}</div>
	<table>
		<thead>
			<tr>
				<th>№</th>
				<th>Таб. №</th>
				<th>ФИО</th>
				<th>Должность</th>
				<th>Отработано</th>
				<th>Базовое начисление (руб)</th>
				<th>Премии и надбавки (руб)</th>
				<th>Всего начислено (руб)</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml}
			<tr class="total-row">
				<td colspan="4">ИТОГО ПО КЛИНИКЕ (${summary.totalEmployeesCount} сотр.)</td>
				<td style="text-align:center">—</td>
				<td style="text-align:right">—</td>
				<td style="text-align:right">—</td>
				<td style="text-align:right">${totalGrossRub}</td>
			</tr>
		</tbody>
	</table>
</body>
</html>`;
}

// Backward Compatibility Alias
export const generateFormT51Html = generateStaffPayrollLedgerHtml;
