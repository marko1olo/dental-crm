/**
 * DENTE Dental CRM — Canonical Doctor & Staff Payroll CSV Exporter
 * Compliance: Mandate 8x & 8ap (Human Russian Language & Clean Domain Terms without Soviet Form Codes).
 */

import type { ConsolidatedStaffPayrollSummary } from "../payrollStaffTypes";
import type { DoctorPayrollResult } from "@dental/shared/payroll";
import { formatKopecksToRubles } from "@dental/shared";

export function generateDoctorPayrollCsv(results: readonly DoctorPayrollResult[]): string {
	const header = "Табельный ID;Врач;Специальность;Период;Выручка (руб);Вычет Лаб (руб);Вычет Мат (руб);Базовый %;Начислено (руб);KPI %;KPI Премия (руб);НДФЛ 13% (руб);К выплате на руки (руб);Сторно возвратов (руб)\n";
	const rows = results.map((r) => {
		const grossRub = formatKopecksToRubles(r.totalGrossRevenueKop);
		const labRub = formatKopecksToRubles(r.totalLabDeductionsKop);
		const matRub = formatKopecksToRubles(r.totalMaterialDeductionsKop);
		const baseEarnedRub = formatKopecksToRubles(r.earnedBaseCommissionKop);
		const kpiEarnedRub = formatKopecksToRubles(r.kpiBonusEarnedKop);
		const taxRub = formatKopecksToRubles(r.ndflTaxKop ?? r.ndfl13TaxKop);
		const netRub = formatKopecksToRubles(r.netPayoutToDoctorKop);
		const stornoRub = formatKopecksToRubles(r.totalRefundClawbackKop);

		return `${r.doctorId};"${r.doctorName}";"${r.specialtyTitleRu}";"${r.periodLabelRu}";${grossRub};${labRub};${matRub};${r.baseCommissionPercent}%;${baseEarnedRub};${r.kpiBonusPercent}%;${kpiEarnedRub};${taxRub};${netRub};${stornoRub}`;
	});

	return "\uFEFF" + header + rows.join("\n");
}

export function generateStaffPayrollCsv(summary: ConsolidatedStaffPayrollSummary): string {
	const headerLines = [
		`\uFEFFГонорарная ведомость начислений персонала клиники;Расчет вознаграждения сотрудников`,
		`Организация:;"${summary.clinicName}";ИНН/КПП:;"${summary.organizationInn} / ${summary.organizationKpp}"`,
		`Период:;"${summary.periodLabelRu}";Дата составления:;"${summary.generatedAtIso.slice(0, 10)}"`,
		``,
		`№ п/п;Табельный номер;ФИО работника;Должность;Подразделение;Отработано дней;Отработано часов;Базовое начисление (руб);Премии и надбавки (руб);Всего начислено (руб)`,
	];

	const rows = summary.records.map((r, index) => {
		const rowNum = index + 1;
		let days = 0;
		let hours = 0;
		let baseAccruedRub = "0.00";
		let bonusAccruedRub = "0.00";

		if (r.role === "doctor") {
			days = r.daysWorked;
			hours = r.hoursWorked;
			baseAccruedRub = formatKopecksToRubles(r.earnedBaseCommissionKop);
			const bonusesKop =
				r.earnedRetailCommissionKop +
				r.comprehensivePlanBonusKop +
				r.revenueKpiBonusKop +
				(r.guaranteeTopUpKop ?? 0) +
				r.manualAdjustmentKop;
			bonusAccruedRub = formatKopecksToRubles(bonusesKop);
		} else if (r.role === "assistant") {
			days = r.totalShiftsCount;
			hours = r.totalHoursWorked;
			baseAccruedRub = formatKopecksToRubles(r.baseShiftsPayoutKop);
			const bonusesKop =
				r.categoryBonusKop +
				r.sterilizationBonusKop +
				r.radiographsPayoutKop +
				r.surgeriesPayoutKop +
				r.manualAdjustmentKop;
			bonusAccruedRub = formatKopecksToRubles(bonusesKop);
		} else if (r.role === "administrator") {
			days = r.shiftsWorked;
			hours = r.hoursWorked;
			baseAccruedRub = formatKopecksToRubles(r.baseSalaryPayoutKop);
			const bonusesKop =
				r.cashRevenueCommissionKop +
				r.leadConversionBonusKop +
				r.manualAdjustmentKop;
			bonusAccruedRub = formatKopecksToRubles(bonusesKop);
		}

		const grossRub = formatKopecksToRubles(r.grossPayoutBeforeTaxKop);
		return `${rowNum};${r.employeeTabNumber};"${r.employeeFullName}";"${r.positionRu}";"${r.departmentRu}";${days};${hours.toFixed(1)};${baseAccruedRub};${bonusAccruedRub};${grossRub}`;
	});

	const totalGrossRub = formatKopecksToRubles(summary.totalGrossPayoutKop);
	const totalLine = `ИТОГО ПО КЛИНИКЕ;;;;"${summary.totalEmployeesCount} сотр.";;;;${totalGrossRub}`;

	return headerLines.join("\n") + "\n" + rows.join("\n") + "\n" + totalLine;
}

// Canonical Clinical Exports
export const generateStaffPayrollLedgerCsv = generateStaffPayrollCsv;
