/**
 * DENTE Dental CRM — Canonical Doctor & Staff Payroll CSV Exporter
 * Compliance: Mandate 8x & 8ap (Human Russian Language & Clean Domain Terms without Soviet Form Codes).
 */

import type { ConsolidatedStaffPayrollSummary } from "../engine/staffPayrollAssistantAdminTypes";
import type { DoctorPayrollResult } from "@dental/shared/payroll";

export function generateDoctorPayrollCsv(results: readonly DoctorPayrollResult[]): string {
	const header = "Табельный ID;Врач;Специальность;Период;Выручка (руб);Вычет Лаб (руб);Вычет Мат (руб);Базовый %;Начислено (руб);KPI %;KPI Премия (руб);НДФЛ 13% (руб);К выплате на руки (руб);Сторно возвратов (руб)\n";
	const rows = results.map((r) => {
		const grossRub = (r.totalGrossRevenueKop / 100).toFixed(2);
		const labRub = (r.totalLabDeductionsKop / 100).toFixed(2);
		const matRub = (r.totalMaterialDeductionsKop / 100).toFixed(2);
		const baseEarnedRub = (r.earnedBaseCommissionKop / 100).toFixed(2);
		const kpiEarnedRub = (r.kpiBonusEarnedKop / 100).toFixed(2);
		const taxRub = ((r.ndflTaxKop ?? r.ndfl13TaxKop) / 100).toFixed(2);
		const netRub = (r.netPayoutToDoctorKop / 100).toFixed(2);
		const stornoRub = (r.totalRefundClawbackKop / 100).toFixed(2);

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
			baseAccruedRub = (r.earnedBaseCommissionKop / 100).toFixed(2);
			const bonusesKop =
				r.earnedRetailCommissionKop +
				r.comprehensivePlanBonusKop +
				r.revenueKpiBonusKop +
				(r.guaranteeTopUpKop ?? 0) +
				r.manualAdjustmentKop;
			bonusAccruedRub = (bonusesKop / 100).toFixed(2);
		} else if (r.role === "assistant") {
			days = r.totalShiftsCount;
			hours = r.totalHoursWorked;
			baseAccruedRub = (r.baseShiftsPayoutKop / 100).toFixed(2);
			const bonusesKop =
				r.categoryBonusKop +
				r.sterilizationBonusKop +
				r.radiographsPayoutKop +
				r.surgeriesPayoutKop +
				r.manualAdjustmentKop;
			bonusAccruedRub = (bonusesKop / 100).toFixed(2);
		} else if (r.role === "administrator") {
			days = r.shiftsWorked;
			hours = r.hoursWorked;
			baseAccruedRub = (r.baseSalaryPayoutKop / 100).toFixed(2);
			const bonusesKop =
				r.cashRevenueCommissionKop +
				r.leadConversionBonusKop +
				r.manualAdjustmentKop;
			bonusAccruedRub = (bonusesKop / 100).toFixed(2);
		}

		const grossRub = (r.grossPayoutBeforeTaxKop / 100).toFixed(2);
		return `${rowNum};${r.employeeTabNumber};"${r.employeeFullName}";"${r.positionRu}";"${r.departmentRu}";${days};${hours.toFixed(1)};${baseAccruedRub};${bonusAccruedRub};${grossRub}`;
	});

	const totalGrossRub = (summary.totalGrossPayoutKop / 100).toFixed(2);
	const totalLine = `ИТОГО ПО КЛИНИКЕ;;;;"${summary.totalEmployeesCount} сотр.";;;;${totalGrossRub}`;

	return headerLines.join("\n") + "\n" + rows.join("\n") + "\n" + totalLine;
}

// Backward Compatibility Aliases
export const generatePayrollT51Csv = generateDoctorPayrollCsv;
export const generateStaffPayrollT51Csv = generateStaffPayrollCsv;
