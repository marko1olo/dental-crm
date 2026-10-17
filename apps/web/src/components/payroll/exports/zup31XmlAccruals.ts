import { escapeXml } from "./escapeXml";
import type { StaffPayrollRecord } from "../engine/staffPayrollAssistantAdminTypes";

export function renderStaffRecordAccrualsXml(r: StaffPayrollRecord): string[] {
	const items: string[] = [];
	if (r.role === "doctor") {
		if (r.earnedBaseCommissionKop > 0) {
			items.push(`\t\t\t<Начисление>\n\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>\n\t\t\t\t<ВидРасчета>Сдельная оплата труда (стоматология)</ВидРасчета>\n\t\t\t\t<Сумма>${(r.earnedBaseCommissionKop / 100).toFixed(2)}</Сумма>\n\t\t\t\t<Дней>${r.daysWorked}</Дней>\n\t\t\t\t<Часов>${r.hoursWorked.toFixed(1)}</Часов>\n\t\t\t</Начисление>`);
		}
		if (r.comprehensivePlanBonusKop > 0) {
			items.push(`\t\t\t<Начисление>\n\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>\n\t\t\t\t<ВидРасчета>Премия за выполнение KPI (комплексные планы)</ВидРасчета>\n\t\t\t\t<Сумма>${(r.comprehensivePlanBonusKop / 100).toFixed(2)}</Сумма>\n\t\t\t</Начисление>`);
		}
		if (r.revenueKpiBonusKop > 0) {
			items.push(`\t\t\t<Начисление>\n\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>\n\t\t\t\t<ВидРасчета>Премия за превышение плана выручки</ВидРасчета>\n\t\t\t\t<Сумма>${(r.revenueKpiBonusKop / 100).toFixed(2)}</Сумма>\n\t\t\t</Начисление>`);
		}
		if (r.earnedRetailCommissionKop > 0) {
			items.push(`\t\t\t<Начисление>\n\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>\n\t\t\t\t<ВидРасчета>Комиссия за реализацию средств гигиены</ВидРасчета>\n\t\t\t\t<Сумма>${(r.earnedRetailCommissionKop / 100).toFixed(2)}</Сумма>\n\t\t\t</Начисление>`);
		}
		if ((r.guaranteeTopUpKop ?? 0) > 0) {
			items.push(`\t\t\t<Начисление>\n\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>\n\t\t\t\t<ВидРасчета>Доплата до гарантированного оклада (минимальная гарантия)</ВидРасчета>\n\t\t\t\t<Сумма>${((r.guaranteeTopUpKop ?? 0) / 100).toFixed(2)}</Сумма>\n\t\t\t</Начисление>`);
		}
	} else if (r.role === "assistant") {
		if (r.baseShiftsPayoutKop > 0) {
			items.push(`\t\t\t<Начисление>\n\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>\n\t\t\t\t<ВидРасчета>Оплата по сменному тарифу (ассистент)</ВидРасчета>\n\t\t\t\t<Сумма>${(r.baseShiftsPayoutKop / 100).toFixed(2)}</Сумма>\n\t\t\t\t<Смен>${r.totalShiftsCount}</Смен>\n\t\t\t\t<Часов>${r.totalHoursWorked.toFixed(1)}</Часов>\n\t\t\t</Начисление>`);
		}
		if (r.categoryBonusKop > 0) {
			items.push(`\t\t\t<Начисление>\n\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>\n\t\t\t\t<ВидРасчета>Надбавка за квалификационную категорию</ВидРасчета>\n\t\t\t\t<Сумма>${(r.categoryBonusKop / 100).toFixed(2)}</Сумма>\n\t\t\t</Начисление>`);
		}
		if (r.sterilizationBonusKop > 0) {
			items.push(`\t\t\t<Начисление>\n\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>\n\t\t\t\t<ВидРасчета>Доплата за работу в ЦСО и стерилизацию</ВидРасчета>\n\t\t\t\t<Сумма>${(r.sterilizationBonusKop / 100).toFixed(2)}</Сумма>\n\t\t\t</Начисление>`);
		}
		if (r.radiographsPayoutKop > 0 || r.surgeriesPayoutKop > 0) {
			items.push(`\t\t\t<Начисление>\n\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>\n\t\t\t\t<ВидРасчета>Сдельная доплата (снимки / операции)</ВидРасчета>\n\t\t\t\t<Сумма>${((r.radiographsPayoutKop + r.surgeriesPayoutKop) / 100).toFixed(2)}</Сумма>\n\t\t\t</Начисление>`);
		}
	} else if (r.role === "administrator") {
		if (r.baseSalaryPayoutKop > 0) {
			items.push(`\t\t\t<Начисление>\n\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>\n\t\t\t\t<ВидРасчета>Оклад по сменам (администратор)</ВидРасчета>\n\t\t\t\t<Сумма>${(r.baseSalaryPayoutKop / 100).toFixed(2)}</Сумма>\n\t\t\t\t<Смен>${r.shiftsWorked}</Смен>\n\t\t\t\t<Часов>${r.hoursWorked.toFixed(1)}</Часов>\n\t\t\t</Начисление>`);
		}
		if (r.cashRevenueCommissionKop > 0) {
			items.push(`\t\t\t<Начисление>\n\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>\n\t\t\t\t<ВидРасчета>Премия от кассовой выручки</ВидРасчета>\n\t\t\t\t<Сумма>${(r.cashRevenueCommissionKop / 100).toFixed(2)}</Сумма>\n\t\t\t</Начисление>`);
		}
		if (r.leadConversionBonusKop > 0) {
			items.push(`\t\t\t<Начисление>\n\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>\n\t\t\t\t<ВидРасчета>Премия за конверсию первичных пациентов</ВидРасчета>\n\t\t\t\t<Сумма>${(r.leadConversionBonusKop / 100).toFixed(2)}</Сумма>\n\t\t\t</Начисление>`);
		}
	}

	if (r.manualAdjustmentKop !== 0) {
		const isPositive = r.manualAdjustmentKop > 0;
		items.push(`\t\t\t<Начисление>\n\t\t\t\t<Сотрудник ТабельныйНомер="${escapeXml(r.employeeTabNumber)}" ФИО="${escapeXml(r.employeeFullName)}"/>\n\t\t\t\t<ВидРасчета>${isPositive ? "Разовая надбавка / премия" : "Удержание / корректировка"}</ВидРасчета>\n\t\t\t\t<Сумма>${(r.manualAdjustmentKop / 100).toFixed(2)}</Сумма>\n\t\t\t\t<Комментарий>${escapeXml(r.manualAdjustmentNoteRu || "Ручная корректировка")}</Комментарий>\n\t\t\t</Начисление>`);
	}

	return items;
}
