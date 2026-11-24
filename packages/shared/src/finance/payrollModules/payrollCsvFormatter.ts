/**
 * packages/shared/src/finance/payrollModules/payrollCsvFormatter.ts
 * Generates Russian doctor payroll summary CSV string with UTF-8 BOM.
 * Mandate 8b: <= 120 lines.
 */

import { formatKopecksToRubles } from "../../money.js";
import type { DoctorPayrollResult } from "./payrollTypes.js";

/**
 * Generates Russian doctor payroll summary CSV string with UTF-8 BOM
 */
export function generateDoctorPayrollCsv(results: readonly DoctorPayrollResult[]): string {
	const header = "Табельный ID;Врач;Специальность;Период;Выручка (руб);Вычет Лаб (руб);Вычет Мат (руб);Базовый %;Начислено (руб);KPI %;KPI Премия (руб);НДФЛ 13% (руб);К выплате на руки (руб)\n";
	const rows = results.map((r) => {
		const grossRub = formatKopecksToRubles(r.totalGrossRevenueKop);
		const labRub = formatKopecksToRubles(r.totalLabDeductionsKop);
		const matRub = formatKopecksToRubles(r.totalMaterialDeductionsKop);
		const baseEarnedRub = formatKopecksToRubles(r.earnedBaseCommissionKop);
		const kpiEarnedRub = formatKopecksToRubles(r.kpiBonusEarnedKop);
		const taxRub = formatKopecksToRubles(r.ndfl13TaxKop);
		const netRub = formatKopecksToRubles(r.netPayoutToDoctorKop);

		return `${r.doctorId};"${r.doctorName}";"${r.specialtyTitleRu}";"${r.periodLabelRu}";${grossRub};${labRub};${matRub};${r.baseCommissionPercent}%;${baseEarnedRub};${r.kpiBonusPercent}%;${kpiEarnedRub};${taxRub};${netRub}`;
	});

	return "\uFEFF" + header + rows.join("\n");
}
