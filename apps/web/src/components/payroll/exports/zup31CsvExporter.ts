import type { ConsolidatedStaffPayrollSummary } from "../engine/staffPayrollAssistantAdminTypes";

/**
 * Generates 1C:ZUP 3.1 compatible tabular CSV format with UTF-8 BOM.
 * Accrual rows only for statutory accountant reconciliation.
 */
export function generate1CZup31Csv(summary: ConsolidatedStaffPayrollSummary): string {
	const header = "ТабельныйНомер;ФИО;Должность;Подразделение;ВидОперации;Сумма;ПериодДействия;КодДоходаНДФЛ\n";

	const rows: string[] = [];

	summary.records.forEach((r) => {
		const grossRub = (r.grossPayoutBeforeTaxKop / 100).toFixed(2);
		const period = summary.periodStartIso.slice(0, 7);

		rows.push(
			`${r.employeeTabNumber};"${r.employeeFullName}";"${r.positionRu}";"${r.departmentRu}";"Начисление";${grossRub};${period};2000`
		);
	});

	return "\uFEFF" + header + rows.join("\n");
}
