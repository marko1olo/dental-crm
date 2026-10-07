/**
 * DENTE Dental CRM — 1C:Enterprise (1С:Предприятие 8.3 / Бухгалтерия 3.0 / EnterpriseData)
 * CSV Exporters & Accountant Executive Summary for 1C universal exchange.
 */

import {
	TAX_EXEMPTION_ARTICLE_149_RU,
	formatKopToRub,
	formatKopToRubLocale,
	type OneCCommerceMlPackage,
	type OneCMaterialWriteoffDocument,
	type OneCPayrollDocument,
	type OneCRetailSalesDocument,
} from "./oneCCommerceMlTypes.js";

// ═══════════════════════════════════════════════════════════════════════════
// CSV GENERATORS: UNIVERSAL EXCHANGE FOR 1C
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generates CSV string for Retail Sales report with UTF-8 BOM.
 */
export function generateRetailSalesCsv(doc: OneCRetailSalesDocument): string {
	const header =
		"НомерДокумента;Дата;Касса;Склад;Код804н;Номенклатура;Зуб;ЕдИзм;Количество;Цена;Скидка;Сумма;СтавкаНДС;ВрачФИО;СчетУчета;НоменклатурнаяГруппа\n";

	const rows = doc.items.map((it) => {
		const price = formatKopToRub(it.priceKopecks);
		const disc = formatKopToRub(it.discountKopecks);
		const total = formatKopToRub(it.totalKopecks);
		const tooth = it.toothNumber ? String(it.toothNumber) : "";
		const unit = it.unitName || "шт";
		const code804n = it.code804n || "";
		const doctor = it.doctorName || "";
		const group = it.nomenclatureGroup || "Стоматологические услуги";

		return `"${doc.documentNumber}";"${doc.documentDateIso}";"${doc.cashRegisterName}";"${doc.warehouseName}";"${code804n}";"${it.name}";"${tooth}";"${unit}";${it.quantity};${price};${disc};${total};"Без НДС";"${doctor}";"90.01.1";"${group}"`;
	});

	return "\uFEFF" + header + rows.join("\n");
}

/**
 * Generates CSV string for Material Writeoff with UTF-8 BOM.
 */
export function generateMaterialWriteoffCsv(doc: OneCMaterialWriteoffDocument): string {
	const header =
		"НомерДокумента;Дата;СкладОтправитель;ПодразделениеПолучатель;Артикул;Номенклатура;Партия;СрокГодности;ЕдИзм;Количество;Себестоимость;Сумма;СчетДебета;СчетКредита;СтатьяЗатрат\n";

	const rows = doc.items.map((it) => {
		const cost = formatKopToRub(it.unitCostKopecks);
		const total = formatKopToRub(it.totalCostKopecks);
		const batch = it.batchNumber || "";
		const exp = it.expirationDateIso || "";

		return `"${doc.documentNumber}";"${doc.documentDateIso}";"${doc.senderWarehouseName}";"${doc.recipientDepartmentName}";"${it.article}";"${it.name}";"${batch}";"${exp}";"${it.unitName}";${it.quantity};${cost};${total};"${it.debitAccount}";"${it.creditAccount}";"${it.costItemTitleRu}"`;
	});

	return "\uFEFF" + header + rows.join("\n");
}

/**
 * Generates CSV string for Payroll Reflection with UTF-8 BOM.
 */
export function generatePayrollReflectionCsv(doc: OneCPayrollDocument): string {
	const header =
		"НомерДокумента;Дата;Период;ТабельныйНомер;Сотрудник;Должность;Специальность;ВидНачисления;СуммаНачислено;НДФЛ13;СтраховыеВзносы;КВыплате;СчетДт;СчетКт;СтатьяЗатрат\n";

	const rows = doc.employees.map((emp) => {
		const gross = formatKopToRub(emp.grossEarnedKopecks);
		const ndfl = formatKopToRub(emp.ndfl13Kopecks);
		const social = formatKopToRub(emp.socialInsuranceTaxesKopecks);
		const net = formatKopToRub(emp.netPayoutKopecks);

		return `"${doc.documentNumber}";"${doc.documentDateIso}";"${doc.periodLabelRu}";"${emp.employeeTabNumber}";"${emp.employeeName}";"${emp.positionTitleRu}";"${emp.specialtyRu}";"${emp.calculationTypeTitleRu}";${gross};${ndfl};${social};${net};"${emp.debitAccount}";"${emp.creditAccountPayroll}";"${emp.costItemTitleRu}"`;
	});

	return "\uFEFF" + header + rows.join("\n");
}

/**
 * Generates combined 3-file CSV bundle.
 */
export function generateCombinedCsvBundle(pkg: OneCCommerceMlPackage): {
	readonly retailSalesCsv: string;
	readonly writeoffsCsv: string;
	readonly payrollCsv: string;
} {
	return {
		retailSalesCsv: generateRetailSalesCsv(pkg.retailSalesDocument),
		writeoffsCsv: generateMaterialWriteoffCsv(pkg.materialWriteoffDocument),
		payrollCsv: generatePayrollReflectionCsv(pkg.payrollDocument),
	};
}

function writeoffDocNumberSafe(num: string): string {
	return num || "ТРН-001";
}

/**
 * Generates executive summary text for chief accountant.
 */
export function generateAccountantExecutiveSummary(pkg: OneCCommerceMlPackage): string {
	const clinic = pkg.clinic;
	const sales = pkg.retailSalesDocument;
	const writeoff = pkg.materialWriteoffDocument;
	const payroll = pkg.payrollDocument;

	const paymentsText = sales.payments
		.map(
			(p) =>
				`   • ${p.tenderTitleRu} (счет ${p.accountCode}): ${formatKopToRubLocale(p.amountKopecks)}`,
		)
		.join("\n");

	return `══════════════════════════════════════════════════════════════
ПАКЕТ ВЫГРУЗКИ В 1С:ПРЕДПРИЯТИЕ 8.3 (CommerceML 2.09 / EnterpriseData)
══════════════════════════════════════════════════════════════
Организация: ${clinic.fullName}
ИНН: ${clinic.inn} / КПП: ${clinic.kpp || "—"} / ОГРН: ${clinic.ogrn || "—"}
Банк: ${clinic.bankName || "—"} (БИК ${clinic.bankBik || "—"})
Расчетный счет: ${clinic.bankAccount || "—"}
Период выгрузки: ${pkg.exportPeriodStartIso} — ${pkg.exportPeriodEndIso}
Дата формирования: ${pkg.generatedAtIso}

1. ДОКУМЕНТ «ОТЧЕТ О РОЗНИЧНЫХ ПРОДАЖАХ»
   Номер: ${sales.documentNumber} от ${sales.documentDateIso}
   Касса ККМ: ${sales.cashRegisterName}
   Склад списания: ${sales.warehouseName}
   Оказано услуг: ${sales.items.length} позиций по номенклатуре
   Выручка брутто: ${formatKopToRubLocale(sales.totalRevenueKopecks)} (НДС: Освобождено по ${TAX_EXEMPTION_ARTICLE_149_RU})
   Способы оплаты:
${paymentsText}

2. ДОКУМЕНТ «ТРЕБОВАНИЕ-НАКЛАДНАЯ / СПИСАНИЕ МАТЕРИАЛОВ»
   Номер: ${writeoffDocNumberSafe(writeoff.documentNumber)} от ${writeoff.documentDateIso}
   Склад отправитель: ${writeoff.senderWarehouseName}
   Подразделение: ${writeoff.recipientDepartmentName}
   Списано позиций по BOM: ${writeoff.items.length}
   Себестоимость материалов: ${formatKopToRubLocale(writeoff.totalCostKopecks)}
   Счета учета: Дт ${pkg.chartOfAccounts.accountProductionCost} / Кт ${pkg.chartOfAccounts.accountMaterials}

3. ДОКУМЕНТ «ОТРАЖЕНИЕ ЗАРПЛАТЫ В БУХУЧЕТЕ»
   Номер: ${payroll.documentNumber} от ${payroll.documentDateIso} (Период: ${payroll.periodLabelRu})
   Сотрудников в ведомости: ${payroll.employees.length} чел.
   Начислено (ФОТ): ${formatKopToRubLocale(payroll.totalGrossKopecks)}
   Удержано НДФЛ 13%: ${formatKopToRubLocale(payroll.totalNdflKopecks)} (Кт ${pkg.chartOfAccounts.accountNdfl})
   Страховые взносы 30%: ${formatKopToRubLocale(payroll.totalSocialTaxesKopecks)} (Кт ${pkg.chartOfAccounts.accountSocialTaxes})
   К выплате на руки: ${formatKopToRubLocale(payroll.totalNetPayoutKopecks)} (Кт ${pkg.chartOfAccounts.accountPayroll})

══════════════════════════════════════════════════════════════
ИТОГО ПО ПАКЕТУ:
   • Выручка клиники (Дт 50/51/57.03 Кт 90.01.1): ${formatKopToRubLocale(sales.totalRevenueKopecks)}
   • Прямые затраты на материалы (Дт 20.01 Кт 10.01): ${formatKopToRubLocale(writeoff.totalCostKopecks)}
   • Затраты на оплату труда (Дт 20.01 Кт 70): ${formatKopToRubLocale(payroll.totalGrossKopecks)}
   • Налоговые обязательства (НДФЛ + Взносы): ${formatKopToRubLocale(payroll.totalNdflKopecks + payroll.totalSocialTaxesKopecks)}
══════════════════════════════════════════════════════════════`;
}
