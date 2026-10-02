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
	DoctorPayrollResult,
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

/**
 * Generates Russian T-51 compatible payroll summary CSV string with UTF-8 BOM
 * for an array of doctor piece-rate payroll results.
 */
export function generatePayrollT51Csv(results: readonly DoctorPayrollResult[]): string {
	const header = "Табельный ID;Врач;Специальность;Период;Выручка (руб);Вычет Лаб (руб);Вычет Мат (руб);Базовый %;Начислено (руб);KPI %;KPI Премия (руб);НДФЛ 13% (руб);К выплате на руки (руб);Сторно возвратов (руб)\n";
	const rows = results.map((r) => {
		const grossRub = (r.totalGrossRevenueKop / 100).toFixed(2);
		const labRub = (r.totalLabDeductionsKop / 100).toFixed(2);
		const matRub = (r.totalMaterialDeductionsKop / 100).toFixed(2);
		const baseEarnedRub = (r.earnedBaseCommissionKop / 100).toFixed(2);
		const kpiEarnedRub = (r.kpiBonusEarnedKop / 100).toFixed(2);
		const taxRub = (r.ndfl13TaxKop / 100).toFixed(2);
		const netRub = (r.netPayoutToDoctorKop / 100).toFixed(2);
		const stornoRub = (r.totalRefundClawbackKop / 100).toFixed(2);

		return `${r.doctorId};"${r.doctorName}";"${r.specialtyTitleRu}";"${r.periodLabelRu}";${grossRub};${labRub};${matRub};${r.baseCommissionPercent}%;${baseEarnedRub};${r.kpiBonusPercent}%;${kpiEarnedRub};${taxRub};${netRub};${stornoRub}`;
	});

	return "\uFEFF" + header + rows.join("\n");
}

/**
 * Generates official Russian statutory payslip (Расчетный листок по ст. 136 ТК РФ)
 * for a doctor with explicit lab (ЗТЛ), material deductions, and NDFL 13% rounding.
 */
export function generateDoctorPayslipHtml(
	payrollResult: DoctorPayrollResult,
	clinicName: string = "ООО «Денте Стоматология»"
): string {
	const grossRub = (payrollResult.totalGrossRevenueKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
	const labRub = (payrollResult.totalLabDeductionsKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
	const matRub = (payrollResult.totalMaterialDeductionsKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
	const netBaseRub = (payrollResult.totalNetBaseKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
	const baseCommRub = (payrollResult.earnedBaseCommissionKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
	const retailRub = (payrollResult.earnedRetailCommissionKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
	const kpiRub = (payrollResult.kpiBonusEarnedKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
	const grossPayoutRub = (payrollResult.grossPayoutBeforeTaxKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
	const ndflRub = (payrollResult.ndfl13TaxKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });
	const netToDocRub = (payrollResult.netPayoutToDoctorKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 });

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Расчетный листок — ${escapeXml(payrollResult.doctorName)}</title>
	<style>
		@page { size: A4; margin: 15mm; }
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11pt; color: #111827; margin: 0; padding: 10px; }
		.header { text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 8px; margin-bottom: 16px; }
		.header h1 { font-size: 16pt; margin: 0 0 4px 0; color: #0f172a; }
		.header p { font-size: 10pt; color: #475569; margin: 0; }
		.meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; background: #f8fafc; padding: 10px; border-radius: 6px; font-size: 10pt; }
		.table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
		.table th, .table td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
		.table th { background: #f1f5f9; font-weight: 600; font-size: 9pt; }
		.table td.num { text-align: right; }
		.summary-box { background: #f0fdfa; border: 1px solid #99f6e4; padding: 12px; border-radius: 6px; margin-bottom: 20px; }
		.summary-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 10pt; }
		.summary-row.total { font-size: 13pt; font-weight: bold; border-top: 1px solid #0d9488; padding-top: 8px; color: #0f766e; }
		.signatures { display: flex; justify-content: space-between; margin-top: 40px; font-size: 10pt; }
		.signature-line { width: 200px; border-bottom: 1px solid #475569; margin-top: 25px; }
	</style>
</head>
<body>
	<div class="header">
		<h1>РАСЧЕТНЫЙ ЛИСТОК ЗА ПЕРИОД</h1>
		<p>${escapeXml(clinicName)} • Ст. 136 ТК РФ</p>
	</div>

	<div class="meta-grid">
		<div><strong>Сотрудник:</strong> ${escapeXml(payrollResult.doctorName)}</div>
		<div><strong>Период:</strong> ${escapeXml(payrollResult.periodLabelRu)}</div>
		<div><strong>Специальность:</strong> ${escapeXml(payrollResult.specialtyTitleRu)}</div>
		<div><strong>Ставка сдельная:</strong> ${payrollResult.baseCommissionPercent}%</div>
	</div>

	<table class="table">
		<thead>
			<tr>
				<th>Показатель начисления / удержания</th>
				<th style="width: 140px; text-align: right;">Сумма (руб.)</th>
			</tr>
		</thead>
		<tbody>
			<tr><td>Выручка от оказанных услуг (Gross)</td><td class="num">${grossRub} ₽</td></tr>
			<tr><td>Удержание: Зуботехническая лаборатория (ЗТЛ)</td><td class="num" style="color: #b91c1c;">-${labRub} ₽</td></tr>
			<tr><td>Удержание: Дорогостоящие расходные материалы</td><td class="num" style="color: #b91c1c;">-${matRub} ₽</td></tr>
			<tr style="background: #f8fafc; font-weight: 600;"><td>Чистая сдельная база (Net Base)</td><td class="num">${netBaseRub} ₽</td></tr>
			<tr><td>Начислено: Сдельная оплата (${payrollResult.baseCommissionPercent}%)</td><td class="num">${baseCommRub} ₽</td></tr>
			<tr><td>Начислено: Продажа средств гигиены (Retail)</td><td class="num">${retailRub} ₽</td></tr>
			<tr><td>Премия: Выполнение нормативов KPI (${escapeXml(payrollResult.kpiTierBadgeRu)})</td><td class="num">${kpiRub} ₽</td></tr>
			${payrollResult.manualAdjustmentKop !== 0 ? `<tr><td>Корректировка / Аванс</td><td class="num">${(payrollResult.manualAdjustmentKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</td></tr>` : ""}
		</tbody>
	</table>

	<div class="summary-box">
		<div class="summary-row">
			<span>Всего начислено (до налогообложения):</span>
			<strong>${grossPayoutRub} ₽</strong>
		</div>
		<div class="summary-row" style="color: #b91c1c;">
			<span>Удержан НДФЛ 13% (п. 6 ст. 225 НК РФ):</span>
			<span>-${ndflRub} ₽</span>
		</div>
		<div class="summary-row total">
			<span>К ВЫПЛАТЕ («НА РУКИ»):</span>
			<span>${netToDocRub} ₽</span>
		</div>
	</div>

	<div class="signatures">
		<div>
			<div>Руководитель клиники / Главврач:</div>
			<div class="signature-line"></div>
		</div>
		<div>
			<div>Врач-специалист (подпись):</div>
			<div class="signature-line"></div>
		</div>
	</div>

	<script>
		window.onload = function() {
			window.print();
		};
	</script>
</body>
</html>`;
}

