import { formatKopToRub, formatKopToRubLocale, computeCommerceMlSha256 } from "./xmlUtils.js";
import {
	OneCCommerceMlPackage, OneCRetailSalesDocument, OneCMaterialWriteoffDocument, OneCPayrollDocument,
	OneCClinicProfile, OneCChartOfAccounts, DEFAULT_CLINIC_PROFILE_1C, DEFAULT_1C_CHART_OF_ACCOUNTS,
	OneCRetailSaleItem, OneCPaymentBreakdownItem, OneCMaterialWriteoffItem, OneCPayrollEmployeeItem,
	DEFAULT_OKEI_PIECE_CODE, DEFAULT_OKEI_PIECE_NAME, DEFAULT_OKEI_PACK_CODE, OneCMedicalActDocument
} from "./types.js";

export function generateRetailSalesCsv(doc: OneCRetailSalesDocument): string {
	const header = "НомерДокумента;Дата;Касса;Склад;Код804н;Номенклатура;Зуб;ЕдИзм;Количество;Цена;Скидка;Сумма;СтавкаНДС;ВрачФИО;СчетУчета;НоменклатурнаяГруппа\n";
	const rows = doc.items.map((it) => {
		const toothStr = it.toothNumber ? String(it.toothNumber) : "";
		return `"${doc.documentNumber}";"${doc.documentDateIso}";"${doc.cashRegisterName}";"${doc.warehouseName}";"${it.code804n || ""}";"${it.name}";"${toothStr}";"${it.unitName || "шт"}";${it.quantity};${formatKopToRub(it.priceKopecks)};${formatKopToRub(it.discountKopecks)};${formatKopToRub(it.totalKopecks)};"${it.vatRate || "Без НДС"}";"${it.doctorName || ""}";"90.01.1";"${it.nomenclatureGroup || "Стоматологические услуги"}"`;
	});
	return `\uFEFF${header}${rows.join("\n")}`;
}

export function generateMaterialWriteoffCsv(doc: OneCMaterialWriteoffDocument): string {
	const header = "НомерДокумента;Дата;СкладОтправитель;ПодразделениеПолучатель;Артикул;Номенклатура;Партия;СрокГодности;ЕдИзм;Количество;Себестоимость;Сумма;СчетДебета;СчетКредита;СтатьяЗатрат\n";
	const rows = doc.items.map((it) =>
		`"${doc.documentNumber}";"${doc.documentDateIso}";"${doc.senderWarehouseName}";"${doc.recipientDepartmentName}";"${it.article}";"${it.name}";"${it.batchNumber || ""}";"${it.expirationDateIso || ""}";"${it.unitName}";${it.quantity};${formatKopToRub(it.unitCostKopecks)};${formatKopToRub(it.totalCostKopecks)};"${it.debitAccount}";"${it.creditAccount}";"${it.costItemTitleRu}"`,
	);
	return `\uFEFF${header}${rows.join("\n")}`;
}

export function generatePayrollReflectionCsv(doc: OneCPayrollDocument): string {
	const header = "НомерДокумента;Дата;Период;ТабельныйНомер;Сотрудник;Должность;Специальность;ВидНачисления;СуммаНачислено;НДФЛ13;СтраховыеВзносы;КВыплате;СчетДт;СчетКт;СтатьяЗатрат\n";
	const rows = doc.employees.map((emp) =>
		`"${doc.documentNumber}";"${doc.documentDateIso}";"${doc.periodLabelRu}";"${emp.employeeTabNumber}";"${emp.employeeName}";"${emp.positionTitleRu}";"${emp.specialtyRu}";"${emp.calculationTypeTitleRu}";${formatKopToRub(emp.grossEarnedKopecks)};${formatKopToRub(emp.ndfl13Kopecks)};${formatKopToRub(emp.socialInsuranceTaxesKopecks)};${formatKopToRub(emp.netPayoutKopecks)};"${emp.debitAccount}";"${emp.creditAccountPayroll}";"${emp.costItemTitleRu}"`,
	);
	return `\uFEFF${header}${rows.join("\n")}`;
}

export const generateMaterialsWriteoffCsv = generateMaterialWriteoffCsv;
export const generatePayrollCsv = generatePayrollReflectionCsv;

export function generateCombinedCsvBundle(pkg: OneCCommerceMlPackage): {
	retailSalesCsv: string;
	writeoffsCsv: string;
	payrollCsv: string;
} {
	return {
		retailSalesCsv: generateRetailSalesCsv(pkg.retailSalesDocument),
		writeoffsCsv: generateMaterialWriteoffCsv(pkg.materialWriteoffDocument),
		payrollCsv: pkg.payrollDocument ? generatePayrollReflectionCsv(pkg.payrollDocument) : "",
	};
}

export function generateAccountantExecutiveSummary(pkg: OneCCommerceMlPackage): string {
	const salesTotal = formatKopToRubLocale(pkg.retailSalesDocument.totalRevenueKopecks);
	const materialsTotal = formatKopToRubLocale(pkg.materialWriteoffDocument.totalCostKopecks);
	const payrollTotal = pkg.payrollDocument ? formatKopToRubLocale(pkg.payrollDocument.totalGrossKopecks) : "0,00 ₽";
	const ndflTotal = pkg.payrollDocument ? formatKopToRubLocale(pkg.payrollDocument.totalNdflKopecks) : "0,00 ₽";
	const netTotal = pkg.payrollDocument ? formatKopToRubLocale(pkg.payrollDocument.totalNetPayoutKopecks) : "0,00 ₽";

	const tenderSum = (t: string) => formatKopToRubLocale(pkg.retailSalesDocument.payments.filter((p) => p.tenderType === t).reduce((s, p) => s + p.amountKopecks, 0));

	return `================================================================================
ПАКЕТ ВЫГРУЗКИ В 1С:ПРЕДПРИЯТИЕ 8.3 (CommerceML 2.09)
Организация: ${pkg.clinic.fullName} (ИНН: ${pkg.clinic.inn}, КПП: ${pkg.clinic.kpp || "—"})
Период: ${pkg.exportPeriodStartIso} — ${pkg.exportPeriodEndIso}
Дата и время формирования: ${pkg.generatedAtIso}
Контрольный хэш пакета (SHA-256): ${computeCommerceMlSha256(pkg)}
================================================================================

1. ДОКУМЕНТ «ОТЧЕТ О РОЗНИЧНЫХ ПРОДАЖАХ» (54-ФЗ)
   Номер: ${pkg.retailSalesDocument.documentNumber} от ${pkg.retailSalesDocument.documentDateIso}
   Касса: ${pkg.retailSalesDocument.cashRegisterName}
   Выручка от медуслуг (Счет 90.01.1): ${salesTotal} (Без НДС, ст. 149 НК РФ)
   Способы оплаты:
     - Наличные в кассу (Счет 50.01): ${tenderSum("cash")}
     - Банковские карты / Эквайринг (Счет 57.03): ${tenderSum("card_acquiring")}
     - СБП / Расчетный счет (Счет 51): ${tenderSum("sbp")}

2. ДОКУМЕНТ «ТРЕБОВАНИЕ-НАКЛАДНАЯ / СПИСАНИЕ МАТЕРИАЛОВ»
   Номер: ${pkg.materialWriteoffDocument.documentNumber} от ${pkg.materialWriteoffDocument.documentDateIso}
   Склад списания (Кредит 10.01/10.06): ${pkg.materialWriteoffDocument.senderWarehouseName}
   Подразделение затрат (Дебет 20.01): ${pkg.materialWriteoffDocument.recipientDepartmentName}
   Сумма списанной себестоимости: ${materialsTotal}

3. ДОКУМЕНТ «ОТРАЖЕНИЕ ЗАРПЛАТЫ В БУХУЧЕТЕ»
   Номер: ${pkg.payrollDocument ? pkg.payrollDocument.documentNumber : "—"}
   Начислено сотрудникам (ФОТ, Кредит 70): ${payrollTotal}
   Удержано НДФЛ 13% (Кредит 68.01): ${ndflTotal}
   К выплате сотрудникам на руки: ${netTotal}

================================================================================
ИТОГО ПО ПАКЕТУ:
  • Доходы клиники: +${salesTotal}
  • Себестоимость материалов: -${materialsTotal}
  • Начисленный ФОТ врачей и ассистентов: -${payrollTotal}
================================================================================`;
}

export function createRealisticShiftExportPackage(
	dateIso = "2026-08-28",
	clinicOverrides?: Partial<OneCClinicProfile>,
	chartOverrides?: Partial<OneCChartOfAccounts>,
): OneCCommerceMlPackage {
	const clinic: OneCClinicProfile = { ...DEFAULT_CLINIC_PROFILE_1C, ...clinicOverrides };
	const chartOfAccounts: OneCChartOfAccounts = { ...DEFAULT_1C_CHART_OF_ACCOUNTS, ...chartOverrides };
	const prefix = clinic.prefix1C || "DN";
	const cleanDate = dateIso.replace(/-/g, "");

	const sale = (id: string, code804n: string, name: string, toothNumber: number | undefined, quantity: number, priceKopecks: number, discountKopecks: number, doctorName: string, nomenclatureGroup: string): OneCRetailSaleItem => ({
		id, code804n, name, toothNumber, unitCode: DEFAULT_OKEI_PIECE_CODE, unitName: DEFAULT_OKEI_PIECE_NAME,
		quantity, priceKopecks, discountKopecks, totalKopecks: priceKopecks * quantity - discountKopecks,
		vatRate: "Без НДС", vatAmountKopecks: 0, doctorName, nomenclatureGroup,
	});

	const salesItems: OneCRetailSaleItem[] = [
		sale("srv-001", "A16.07.002.001", "Наложение временной пломбы (световой композит)", 16, 1, 120000, 0, "Барабаш С.В.", "Терапевтическая стоматология"),
		sale("srv-002", "A16.07.030.002", "Механическая и медикаментозная обработка 3 корневых каналов", 16, 3, 350000, 50000, "Барабаш С.В.", "Эндодонтия"),
		sale("srv-003", "A16.07.054.001", "Установка дентального имплантата Straumann BLX Roxolid SLA", 46, 1, 6500000, 0, "Васильев Д.М.", "Хирургическая стоматология / Имплантация"),
		sale("srv-004", "A16.07.006.002", "Изготовление коронки из диоксида циркония Prettau (CAD/CAM)", 21, 2, 2800000, 100000, "Васильев Д.М.", "Ортопедическая стоматология"),
		sale("srv-005", "A16.07.051", "Профессиональная гигиена полости рта и AirFlow (комплекс)", undefined, 1, 1630000, 0, "Барабаш С.В.", "Профилактическая стоматология"),
	];

	const totalSalesKopecks = salesItems.reduce((s, it) => s + it.totalKopecks, 0);

	const payments: OneCPaymentBreakdownItem[] = [
		{ id: "pay-001", tenderType: "cash", tenderTitleRu: "Наличные в кассу (50.01)", amountKopecks: 3250000, accountCode: chartOfAccounts.accountCashDesk, fiscalReceiptNumber: "ЧЕК-00042", fiscalSign: "99401284" },
		{ id: "pay-002", tenderType: "card_acquiring", tenderTitleRu: "Оплата банковской картой / Эквайринг (57.03)", amountKopecks: 8500000, accountCode: chartOfAccounts.accountAcquiringTransit, acquiringBankName: "ПАО СБЕРБАНК", acquiringTerminalId: "POS-00847291", acquiringContractNumber: "ACQ-2026-981", fiscalReceiptNumber: "ЧЕК-00043", fiscalSign: "99401285" },
		{ id: "pay-003", tenderType: "sbp", tenderTitleRu: "Система быстрых платежей / QR (51)", amountKopecks: 3000000, accountCode: chartOfAccounts.accountBankCurrent, fiscalReceiptNumber: "ЧЕК-00044", fiscalSign: "99401286" },
	];

	const salesDoc: OneCRetailSalesDocument = {
		id: `doc-sales-${cleanDate}`,
		documentNumber: `${prefix}-РОЗН-${cleanDate}`,
		documentDateIso: dateIso,
		documentTime: "20:00:00",
		periodLabelRu: `Смена ${dateIso}`,
		cashRegisterName: clinic.defaultCashRegisterName || "Касса №1 (АТОЛ 27Ф)",
		warehouseName: clinic.defaultWarehouseName || "Основной склад клиники",
		items: salesItems,
		payments,
		totalRevenueKopecks: totalSalesKopecks,
		totalDiscountKopecks: 150000,
		totalVatKopecks: 0,
		cashierName: "Смирнова Е.А.",
		comment: "Кассовая смена закрыта штатно. Выручка фискализирована в ОФД по ФФД 1.2.",
	};
	salesDoc.sha256Hash = computeCommerceMlSha256(salesDoc);

	const mat = (id: string, article: string, name: string, unitCode: string, unitName: string, quantity: number, unitCostKopecks: number, totalCostKopecks: number, debitAccount: string, creditAccount: string, costItemTitleRu: string, opt: Partial<OneCMaterialWriteoffItem> = {}): OneCMaterialWriteoffItem => ({
		id, article, name, unitCode, unitName, quantity, unitCostKopecks, totalCostKopecks, debitAccount, creditAccount, costItemTitleRu, ...opt,
	});

	const writeoffItems: OneCMaterialWriteoffItem[] = [
		mat("mat-001", "MAT-FLT-250", "Композит светового отверждения Filtek Supreme XTE Body A2 (шприц 3г)", DEFAULT_OKEI_PIECE_CODE, "шт", 1, 425000, 425000, chartOfAccounts.accountProductionCost, chartOfAccounts.accountMaterials, "Списание расходных материалов на терапевтический прием", { batchNumber: "Партия №2408-A", expirationDateIso: "2027-11-30", relatedServiceCode804n: "A16.07.002.001", csoLogId: "CSO-2026-0828-01", sterilizerCycleNumber: "Ц-142" }),
		mat("mat-002", "MAT-STRAUM-BLX", "Имплантат Straumann BLX Ø 4.0mm SLActive 10mm (титан Roxolid)", DEFAULT_OKEI_PIECE_CODE, "шт", 1, 1850000, 1850000, chartOfAccounts.accountProductionCost, chartOfAccounts.accountMaterials, "Списание имплантационных систем (Хирургия)", { batchNumber: "LOT-849201", expirationDateIso: "2029-06-30", relatedServiceCode804n: "A16.07.054.001", csoLogId: "CSO-2026-0828-02", sterilizerCycleNumber: "Ц-143" }),
		mat("mat-003", "MAT-SEPT-100", "Анестетик Септанест с адреналином 1:100 000 (упаковка 50 карпул)", DEFAULT_OKEI_PACK_CODE, "упак", 0.1, 550000, 55000, chartOfAccounts.accountProductionCost, chartOfAccounts.accountConsumables, "Списание анестетиков и расходников ЦСО", { batchNumber: "B-202604", expirationDateIso: "2028-04-30", relatedServiceCode804n: "A16.07.002.001" }),
		mat("mat-004", "MAT-STER-KRAFT", "Крафт-пакеты самоклеящиеся для стерилизации 100х200 мм (ЦСО)", DEFAULT_OKEI_PIECE_CODE, "шт", 15, 8500, 127500, chartOfAccounts.accountProductionCost, chartOfAccounts.accountConsumables, "Списание материалов ЦСО и стерилизации (СанПиН)", { batchNumber: "KP-202601", expirationDateIso: "2028-12-31", csoLogId: "CSO-2026-0828-03", sterilizerCycleNumber: "Ц-144" }),
	];

	const totalMaterialsCost = writeoffItems.reduce((s, it) => s + it.totalCostKopecks, 0);

	const writeoffDoc: OneCMaterialWriteoffDocument = {
		id: `doc-writeoff-${cleanDate}`,
		documentNumber: `${prefix}-СПИС-${cleanDate}`,
		documentDateIso: dateIso,
		documentTime: "20:30:00",
		periodLabelRu: `Списание материалов за ${dateIso}`,
		senderWarehouseName: clinic.defaultWarehouseName || "Основной склад клиники",
		recipientDepartmentName: "Лечебное отделение",
		items: writeoffItems,
		totalCostKopecks: totalMaterialsCost,
		responsiblePersonName: "Смирнова Е.А.",
		reasonRu: "Автоматическое списание по нормам BOM и актам стерилизации ЦСО за смену",
	};
	writeoffDoc.sha256Hash = computeCommerceMlSha256(writeoffDoc);

	const emp = (id: string, tab: string, name: string, pos: string, spec: string, calc: string, rev: number, gross: number, costTitle: string): OneCPayrollEmployeeItem => {
		const ndfl = Math.round(gross * 0.13);
		const social = Math.round(gross * 0.3);
		return {
			id, employeeTabNumber: tab, employeeName: name, positionTitleRu: pos, specialtyRu: spec, calculationTypeTitleRu: calc,
			grossRevenueGeneratedKopecks: rev, grossEarnedKopecks: gross, ndfl13Kopecks: ndfl, socialInsuranceTaxesKopecks: social,
			netPayoutKopecks: gross - ndfl, debitAccount: chartOfAccounts.accountProductionCost, creditAccountPayroll: chartOfAccounts.accountPayroll,
			creditAccountNdfl: chartOfAccounts.accountNdfl, creditAccountSocial: chartOfAccounts.accountSocialTaxes, costItemTitleRu: costTitle,
		};
	};

	const payrollEmployees: OneCPayrollEmployeeItem[] = [
		emp("emp-001", "ВР-001", "Барабаш С.В.", "Врач стоматолог-терапевт", "Терапевтическая стоматология", "Сдельная оплата труда (25% от чистой выручки)", 14500000, 3625000, "Оплата труда врачебного персонала"),
		emp("emp-002", "ВР-002", "Васильев Д.М.", "Врач стоматолог-хирург-имплантолог", "Хирургическая стоматология", "Сдельная оплата труда (30% от хирургии)", 6500000, 1950000, "Оплата труда врачебного персонала"),
		emp("emp-003", "АС-001", "Ковалева О.И.", "Ассистент стоматолога", "Сестринское дело в стоматологии", "Почасовая оплата за смену (12 часов)", 0, 360000, "Оплата труда среднего медицинского персонала"),
	];

	const payrollDoc: OneCPayrollDocument = {
		id: `doc-payroll-${cleanDate}`,
		documentNumber: `${prefix}-ФОТ-${cleanDate}`,
		documentDateIso: dateIso,
		documentTime: "21:00:00",
		registrationPeriodIso: `${dateIso.slice(0, 7)}-01`,
		periodLabelRu: `Смена ${dateIso}`,
		employees: payrollEmployees,
		totalGrossKopecks: payrollEmployees.reduce((s, e) => s + e.grossEarnedKopecks, 0),
		totalNdflKopecks: payrollEmployees.reduce((s, e) => s + e.ndfl13Kopecks, 0),
		totalSocialTaxesKopecks: payrollEmployees.reduce((s, e) => s + e.socialInsuranceTaxesKopecks, 0),
		totalNetPayoutKopecks: payrollEmployees.reduce((s, e) => s + e.netPayoutKopecks, 0),
		comment: "Отражение заработной платы по итогам смены (Форма Т-51 / Т-13)",
	};
	payrollDoc.sha256Hash = computeCommerceMlSha256(payrollDoc);

	const medicalActs: OneCMedicalActDocument[] = [
		{
			id: `act-${cleanDate}-001`,
			actNumber: `${prefix}-АКТ-${cleanDate}-01`,
			documentDateIso: dateIso,
			documentTime: "14:30:00",
			patient: {
				id: "pat-101",
				name: "Иванов Иван Иванович",
				fullName: "Иванов Иван Иванович",
				isLegalEntity: false,
				inn: "770412345678",
				phone: "+7 (916) 111-22-33",
				address: "г. Москва, ул. Ленина, д. 12, кв. 45",
			},
			contractNumber: "ДОГ-2026-101",
			contractDateIso: "2026-01-15",
			attendingDoctorName: "Барабаш С.В.",
			items: [
				{
					id: "act-it-1", code804n: "A16.07.002.001", name: "Наложение временной пломбы (световой композит)", toothNumber: 16,
					unitCode: DEFAULT_OKEI_PIECE_CODE, unitName: DEFAULT_OKEI_PIECE_NAME, quantity: 1, priceKopecks: 120000,
					discountKopecks: 0, totalKopecks: 120000, vatRate: "Без НДС", vatAmountKopecks: 0,
					attendingDoctorName: "Барабаш С.В.", attendingDoctorSpecialty: "Стоматолог-терапевт",
				},
				{
					id: "act-it-2", code804n: "A16.07.030.002", name: "Механическая и медикаментозная обработка 3 корневых каналов", toothNumber: 16,
					unitCode: DEFAULT_OKEI_PIECE_CODE, unitName: DEFAULT_OKEI_PIECE_NAME, quantity: 3, priceKopecks: 350000,
					discountKopecks: 50000, totalKopecks: 1000000, vatRate: "Без НДС", vatAmountKopecks: 0,
					attendingDoctorName: "Барабаш С.В.", attendingDoctorSpecialty: "Стоматолог-терапевт",
				},
			],
			totalKopecks: 1120000,
			comment: "Акт выполненных терапевтических услуг по плану лечения",
		},
	];
	medicalActs[0]!.sha256Hash = computeCommerceMlSha256(medicalActs[0]!);

	const pkg: OneCCommerceMlPackage = {
		packageId: `pkg-${cleanDate}-${prefix}`,
		generatedAtIso: `${dateIso}T21:30:00.000Z`,
		exportPeriodStartIso: dateIso,
		exportPeriodEndIso: dateIso,
		clinic,
		chartOfAccounts,
		retailSalesDocument: salesDoc,
		medicalActs,
		materialWriteoffDocument: writeoffDoc,
		payrollDocument: payrollDoc,
	};
	pkg.sha256Hash = computeCommerceMlSha256(pkg);

	return pkg;
}
