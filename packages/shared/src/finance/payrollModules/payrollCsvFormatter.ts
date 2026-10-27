/**
 * packages/shared/src/finance/payrollModules/payrollCsvFormatter.ts
 * Generates Russian doctor payroll summary CSV string with UTF-8 BOM.
 * Mandate 8b: <= 120 lines.
 */

import type { DoctorPayrollResult } from "./payrollTypes.js";

/**
 * Generates Russian doctor payroll summary CSV string with UTF-8 BOM
 */
export function generateDoctorPayrollCsv(results: readonly DoctorPayrollResult[]): string {
	const header = "Табельный ID;Врач;Специальность;Период;Выручка (руб);Вычет Лаб (руб);Вычет Мат (руб);Базовый %;Начислено (руб);KPI %;KPI Премия (руб);НДФЛ 13% (руб);К выплате на руки (руб)\n";
	const rows = results.map((r) => {
		const grossRub = (r.totalGrossRevenueKop / 100).toFixed(2);
		const labRub = (r.totalLabDeductionsKop / 100).toFixed(2);
		const matRub = (r.totalMaterialDeductionsKop / 100).toFixed(2);
		const baseEarnedRub = (r.earnedBaseCommissionKop / 100).toFixed(2);
		const kpiEarnedRub = (r.kpiBonusEarnedKop / 100).toFixed(2);
		const taxRub = (r.ndfl13TaxKop / 100).toFixed(2);
		const netRub = (r.netPayoutToDoctorKop / 100).toFixed(2);

		return `${r.doctorId};"${r.doctorName}";"${r.specialtyTitleRu}";"${r.periodLabelRu}";${grossRub};${labRub};${matRub};${r.baseCommissionPercent}%;${baseEarnedRub};${r.kpiBonusPercent}%;${kpiEarnedRub};${taxRub};${netRub}`;
	});

	return "\uFEFF" + header + rows.join("\n");
}

/** Алиас для обратной совместимости (устаревший ГосКомСтат код) */
export const generatePayrollT51Csv = generateDoctorPayrollCsv;
