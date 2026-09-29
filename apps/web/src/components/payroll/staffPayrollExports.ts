/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Multi-Role Staff Payroll Statutory & 1C:ZUP 3.1 Exports
 *
 * Form T-51 Consolidated Payroll Statement & 1C:ZUP 3.1 XML/CSV Exporters.
 * Invariant: All calculations in integer kopecks (kopeck-exact arithmetic).
 * Mandate 8b: File strictly <= 800 lines.
 * Mandate 8d: Zero cartoon emojis.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type {
	ConsolidatedStaffPayrollSummary,
	StaffPayrollRecord,
} from "./staffPayrollEngine";

/**
 * Escapes XML special characters safely for 1C:ZUP.
 */
export function escapeXml(unsafe: string): string {
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

/**
 * Generates Russian Unified Form T-51 (Расчетная ведомость Т-51) CSV with UTF-8 BOM.
 * Accruals and worked time only (clean CRM operational base for 1C:ZUP).
 */
export function generateStaffPayrollT51Csv(summary: ConsolidatedStaffPayrollSummary): string {
	const headerLines = [
		`\uFEFFУнифицированная форма № Т-51;Утверждена Постановлением Госкомстата России от 05.01.2004 № 1`,
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

	// Summary total line
	const totalGrossRub = (summary.totalGrossPayoutKop / 100).toFixed(2);
	const totalLine = `ИТОГО ПО КЛИНИКЕ;;;;"${summary.totalEmployeesCount} сотр.";;;;${totalGrossRub}`;

	return headerLines.join("\n") + "\n" + rows.join("\n") + "\n" + totalLine;
}

/**
 * Generates official 1C:ZUP 3.1 (1С:Зарплата и управление персоналом 3.1) XML export document.
 * Contains operational accruals and work timesheet data for accountant import into 1C:ZUP.
 */
export function generate1CZup31Xml(
	summary: ConsolidatedStaffPayrollSummary,
	documentNumber: string = "ЗП-001",
	documentDate: string = new Date().toISOString().slice(0, 10)
): string {
	const docDateFormatted = documentDate;
	const totalGrossRub = (summary.totalGrossPayoutKop / 100).toFixed(2);

	// Accruals section
	const accrualsXml = summary.records
		.map((r) => {
			const items: string[] = [];
			if (r.role === "doctor") {
				if (r.earnedBaseCommissionKop > 0) {
					items.push(`\t\t\t<Начисление>
\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>
\t\t\t\t<ВидРасчета>Сдельная оплата труда (стоматология)</ВидРасчета>
\t\t\t\t<Сумма>${(r.earnedBaseCommissionKop / 100).toFixed(2)}</Сумма>
\t\t\t\t<Дней>${r.daysWorked}</Дней>
\t\t\t\t<Часов>${r.hoursWorked.toFixed(1)}</Часов>
\t\t\t</Начисление>`);
				}
				if (r.comprehensivePlanBonusKop > 0) {
					items.push(`\t\t\t<Начисление>
\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>
\t\t\t\t<ВидРасчета>Премия за выполнение KPI (комплексные планы)</ВидРасчета>
\t\t\t\t<Сумма>${(r.comprehensivePlanBonusKop / 100).toFixed(2)}</Сумма>
\t\t\t</Начисление>`);
				}
				if (r.revenueKpiBonusKop > 0) {
					items.push(`\t\t\t<Начисление>
\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>
\t\t\t\t<ВидРасчета>Премия за превышение плана выручки</ВидРасчета>
\t\t\t\t<Сумма>${(r.revenueKpiBonusKop / 100).toFixed(2)}</Сумма>
\t\t\t</Начисление>`);
				}
				if (r.earnedRetailCommissionKop > 0) {
					items.push(`\t\t\t<Начисление>
\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>
\t\t\t\t<ВидРасчета>Комиссия за реализацию средств гигиены</ВидРасчета>
\t\t\t\t<Сумма>${(r.earnedRetailCommissionKop / 100).toFixed(2)}</Сумма>
\t\t\t</Начисление>`);
				}
				if ((r.guaranteeTopUpKop ?? 0) > 0) {
					items.push(`\t\t\t<Начисление>
\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>
\t\t\t\t<ВидРасчета>Доплата до гарантированного оклада (минимальная гарантия)</ВидРасчета>
\t\t\t\t<Сумма>${((r.guaranteeTopUpKop ?? 0) / 100).toFixed(2)}</Сумма>
\t\t\t</Начисление>`);
				}
			} else if (r.role === "assistant") {
				if (r.baseShiftsPayoutKop > 0) {
					items.push(`\t\t\t<Начисление>
\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>
\t\t\t\t<ВидРасчета>Оплата по сменному тарифу (ассистент)</ВидРасчета>
\t\t\t\t<Сумма>${(r.baseShiftsPayoutKop / 100).toFixed(2)}</Сумма>
\t\t\t\t<Смен>${r.totalShiftsCount}</Смен>
\t\t\t\t<Часов>${r.totalHoursWorked.toFixed(1)}</Часов>
\t\t\t</Начисление>`);
				}
				if (r.categoryBonusKop > 0) {
					items.push(`\t\t\t<Начисление>
\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>
\t\t\t\t<ВидРасчета>Надбавка за квалификационную категорию</ВидРасчета>
\t\t\t\t<Сумма>${(r.categoryBonusKop / 100).toFixed(2)}</Сумма>
\t\t\t</Начисление>`);
				}
				if (r.sterilizationBonusKop > 0) {
					items.push(`\t\t\t<Начисление>
\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>
\t\t\t\t<ВидРасчета>Доплата за работу в ЦСО и стерилизацию</ВидРасчета>
\t\t\t\t<Сумма>${(r.sterilizationBonusKop / 100).toFixed(2)}</Сумма>
\t\t\t</Начисление>`);
				}
				if (r.radiographsPayoutKop > 0 || r.surgeriesPayoutKop > 0) {
					items.push(`\t\t\t<Начисление>
\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>
\t\t\t\t<ВидРасчета>Сдельная доплата (снимки / операции)</ВидРасчета>
\t\t\t\t<Сумма>${((r.radiographsPayoutKop + r.surgeriesPayoutKop) / 100).toFixed(2)}</Сумма>
\t\t\t</Начисление>`);
				}
			} else if (r.role === "administrator") {
				if (r.baseSalaryPayoutKop > 0) {
					items.push(`\t\t\t<Начисление>
\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>
\t\t\t\t<ВидРасчета>Оклад по сменам (администратор)</ВидРасчета>
\t\t\t\t<Сумма>${(r.baseSalaryPayoutKop / 100).toFixed(2)}</Сумма>
\t\t\t\t<Смен>${r.shiftsWorked}</Смен>
\t\t\t\t<Часов>${r.hoursWorked.toFixed(1)}</Часов>
\t\t\t</Начисление>`);
				}
				if (r.cashRevenueCommissionKop > 0) {
					items.push(`\t\t\t<Начисление>
\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>
\t\t\t\t<ВидРасчета>Премия от кассовой выручки</ВидРасчета>
\t\t\t\t<Сумма>${(r.cashRevenueCommissionKop / 100).toFixed(2)}</Сумма>
\t\t\t</Начисление>`);
				}
				if (r.leadConversionBonusKop > 0) {
					items.push(`\t\t\t<Начисление>
\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>
\t\t\t\t<ВидРасчета>Премия за конверсию первичных пациентов</ВидРасчета>
\t\t\t\t<Сумма>${(r.leadConversionBonusKop / 100).toFixed(2)}</Сумма>
\t\t\t</Начисление>`);
				}
			}

			if (r.manualAdjustmentKop !== 0) {
				const isPositive = r.manualAdjustmentKop > 0;
				items.push(`\t\t\t<Начисление>
\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>
\t\t\t\t<ВидРасчета>${isPositive ? "Разовая надбавка / премия" : "Удержание / корректировка"}</ВидРасчета>
\t\t\t\t<Сумма>${(r.manualAdjustmentKop / 100).toFixed(2)}</Сумма>
\t\t\t\t<Комментарий>${escapeXml(r.manualAdjustmentNoteRu || "Ручная корректировка")}</Комментарий>
\t\t\t</Начисление>`);
			}

			return items.join("\n");
		})
		.filter((str) => str.length > 0)
		.join("\n");

	return `<?xml version="1.0" encoding="UTF-8"?>
<ЗарплатаКадрыДокумент xmlns="http://v8.1c.ru/edi/edi_stnd/EnterpriseData/1.13" ВерсияФормата="1.13">
\t<Документ ОтражениеЗарплатыВБухучете Номер="${escapeXml(documentNumber)}" Дата="${escapeXml(docDateFormatted)}">
\t\t<Организация>
\t\t\t<Наименование>${escapeXml(summary.clinicName)}</Наименование>
\t\t\t<ИНН>${escapeXml(summary.organizationInn)}</ИНН>
\t\t\t<КПП>${escapeXml(summary.organizationKpp)}</КПП>
\t\t</Организация>
\t\t<ПериодРегистрации>${escapeXml(summary.periodStartIso.slice(0, 7))}-01</ПериодРегистрации>
\t\t<ИтогоНачислено>${totalGrossRub}</ИтогоНачислено>
\t\t<Начисления>
${accrualsXml}
\t\t</Начисления>
\t</Документ>
</ЗарплатаКадрыДокумент>`;
}

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

/**
 * Generates official Form T-51 HTML print view (Accrual & Timesheet summary).
 */
export function generateFormT51Html(summary: ConsolidatedStaffPayrollSummary): string {
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
	<h1>Зарплатная ведомость персонала клиники</h1>
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
