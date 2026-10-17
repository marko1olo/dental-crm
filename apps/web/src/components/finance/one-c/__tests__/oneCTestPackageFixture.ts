/**
 * Test fixture for 1C:Enterprise CommerceML 2.09 & EnterpriseData 1.13 tests.
 * Clean, lightweight test data fixture (Mandate 8b <= 120 lines).
 */
import {
	DEFAULT_1C_CHART_OF_ACCOUNTS,
	DEFAULT_CLINIC_PROFILE_1C,
	type OneCChartOfAccounts,
	type OneCClinicProfile,
	type OneCCommerceMlPackage,
	type OneCMaterialWriteoffItem,
	type OneCPayrollEmployeeItem,
	type OneCRetailSaleItem,
} from "../oneCCommerceMlTypes.js";

export function createRealisticShiftExportPackage(
	dateIso: string,
	customClinic?: Partial<OneCClinicProfile>,
	customAccounts?: Partial<OneCChartOfAccounts>,
): OneCCommerceMlPackage {
	const clinic: OneCClinicProfile = { ...DEFAULT_CLINIC_PROFILE_1C, ...customClinic };
	const accounts: OneCChartOfAccounts = { ...DEFAULT_1C_CHART_OF_ACCOUNTS, ...customAccounts };
	const dateClean = dateIso.replace(/-/g, "");
	const prefix = clinic.prefix1C || "DN";

	const items: OneCRetailSaleItem[] = [
		{ id: "srv-01", code804n: "A16.07.002.001", name: "Восстановление зуба пломбой световой полимеризации (глубокий кариес)", toothNumber: 16, unitCode: "796", unitName: "шт", quantity: 1, priceKopecks: 650000, discountKopecks: 0, totalKopecks: 650000, vatRate: "Без НДС", vatAmountKopecks: 0, doctorName: "Морозов А.В.", nomenclatureGroup: "Стоматологическая терапия" },
		{ id: "srv-02", code804n: "A16.07.030.001", name: "Инструментальная обработка корневого канала", toothNumber: 16, unitCode: "796", unitName: "шт", quantity: 3, priceKopecks: 280000, discountKopecks: 40000, totalKopecks: 800000, vatRate: "Без НДС", vatAmountKopecks: 0, doctorName: "Морозов А.В.", nomenclatureGroup: "Стоматологическая терапия" },
		{ id: "srv-03", code804n: "A16.07.054.001", name: "Внутрикостная дентальная имплантация системы Straumann BLX", toothNumber: 46, unitCode: "796", unitName: "шт", quantity: 1, priceKopecks: 6500000, discountKopecks: 0, totalKopecks: 6500000, vatRate: "Без НДС", vatAmountKopecks: 0, doctorName: "Васильев Д.М.", nomenclatureGroup: "Хирургическая стоматология" },
		{ id: "srv-04", code804n: "A16.07.041.002", name: "Синус-лифтинг закрытый", toothNumber: 16, unitCode: "796", unitName: "шт", quantity: 1, priceKopecks: 2500000, discountKopecks: 0, totalKopecks: 2500000, vatRate: "Без НДС", vatAmountKopecks: 0, doctorName: "Васильев Д.М.", nomenclatureGroup: "Хирургическая стоматология" },
		{ id: "srv-05", code804n: "A16.07.051", name: "Профессиональная гигиена полости рта комплексная", unitCode: "796", unitName: "чел", quantity: 2, priceKopecks: 600000, discountKopecks: 100000, totalKopecks: 1100000, vatRate: "Без НДС", vatAmountKopecks: 0, doctorName: "Смирнова Е.А.", nomenclatureGroup: "Профилактическая стоматология" },
		{ id: "srv-06", code804n: "A16.07.004.004", name: "Восстановление зуба цельнокерамической коронкой", toothNumber: 21, unitCode: "796", unitName: "шт", quantity: 1, priceKopecks: 3200000, discountKopecks: 0, totalKopecks: 3200000, vatRate: "Без НДС", vatAmountKopecks: 0, doctorName: "Кузнецов А.П.", nomenclatureGroup: "Ортопедическая стоматология" },
	];

	const writeoffItems: OneCMaterialWriteoffItem[] = [
		{ id: "mat-01", article: "MAT-FLT-250", name: "Композит Filtek Z250", batchNumber: "Партия №2408-A", expirationDateIso: "2028-06-30", unitCode: "796", unitName: "шприц", quantity: 0.25, unitCostKopecks: 75000, totalCostKopecks: 18750, debitAccount: accounts.accountProductionCost, creditAccount: accounts.accountMaterials, costItemTitleRu: "Списание расходных материалов", relatedServiceCode804n: "A16.07.002.001" },
		{ id: "mat-02", article: "MAT-SEPT-100", name: "Анестетик Септанест", batchNumber: "Партия №9820-S", expirationDateIso: "2027-12-31", unitCode: "796", unitName: "амп", quantity: 4, unitCostKopecks: 12000, totalCostKopecks: 48000, debitAccount: accounts.accountProductionCost, creditAccount: accounts.accountMaterials, costItemTitleRu: "Списание медикаментов" },
		{ id: "mat-03", article: "MAT-STRAUM-BLX", name: "Имплантат Straumann BLX", batchNumber: "LOT-CH-778912", expirationDateIso: "2030-01-15", unitCode: "796", unitName: "шт", quantity: 1, unitCostKopecks: 1850000, totalCostKopecks: 1850000, debitAccount: accounts.accountProductionCost, creditAccount: accounts.accountMaterials, costItemTitleRu: "Списание имплантов", relatedServiceCode804n: "A16.07.054.001" },
		{ id: "mat-04", article: "MAT-BIOSS-05", name: "Био-материал Bio-Oss 0.5g", batchNumber: "LOT-BIO-4412", expirationDateIso: "2028-09-30", unitCode: "796", unitName: "флакон", quantity: 1, unitCostKopecks: 540000, totalCostKopecks: 540000, debitAccount: accounts.accountProductionCost, creditAccount: accounts.accountMaterials, costItemTitleRu: "Списание остеоматериалов", relatedServiceCode804n: "A16.07.041.002" },
	];

	const employees: OneCPayrollEmployeeItem[] = [
		{ id: "emp-01", employeeTabNumber: "ВР-001", employeeName: "Морозов А.В.", positionTitleRu: "Врач-стоматолог терапевт", specialtyRu: "Терапевтическая стоматология", calculationTypeTitleRu: "Сдельная", grossRevenueGeneratedKopecks: 1450000, grossEarnedKopecks: 362500, ndfl13Kopecks: 47125, socialInsuranceTaxesKopecks: 108750, netPayoutKopecks: 315375, debitAccount: accounts.accountProductionCost, creditAccountPayroll: accounts.accountPayroll, creditAccountNdfl: accounts.accountNdfl, creditAccountSocial: accounts.accountSocialTaxes, costItemTitleRu: "ФОТ" },
		{ id: "emp-02", employeeTabNumber: "ВР-002", employeeName: "Васильев Д.М.", positionTitleRu: "Врач-стоматолог хирург", specialtyRu: "Хирургическая стоматология", calculationTypeTitleRu: "Сдельная", grossRevenueGeneratedKopecks: 9000000, grossEarnedKopecks: 1800000, ndfl13Kopecks: 234000, socialInsuranceTaxesKopecks: 540000, netPayoutKopecks: 1566000, debitAccount: accounts.accountProductionCost, creditAccountPayroll: accounts.accountPayroll, creditAccountNdfl: accounts.accountNdfl, creditAccountSocial: accounts.accountSocialTaxes, costItemTitleRu: "ФОТ" },
		{ id: "emp-03", employeeTabNumber: "ВР-003", employeeName: "Кузнецов А.П.", positionTitleRu: "Врач-ортопед", specialtyRu: "Ортопедия", calculationTypeTitleRu: "Сдельная", grossRevenueGeneratedKopecks: 3200000, grossEarnedKopecks: 800000, ndfl13Kopecks: 104000, socialInsuranceTaxesKopecks: 240000, netPayoutKopecks: 696000, debitAccount: accounts.accountProductionCost, creditAccountPayroll: accounts.accountPayroll, creditAccountNdfl: accounts.accountNdfl, creditAccountSocial: accounts.accountSocialTaxes, costItemTitleRu: "ФОТ" },
		{ id: "emp-04", employeeTabNumber: "ВР-004", employeeName: "Смирнова Е.А.", positionTitleRu: "Гигиенист", specialtyRu: "Профилактика", calculationTypeTitleRu: "Сдельная", grossRevenueGeneratedKopecks: 1100000, grossEarnedKopecks: 330000, ndfl13Kopecks: 42900, socialInsuranceTaxesKopecks: 99000, netPayoutKopecks: 287100, debitAccount: accounts.accountProductionCost, creditAccountPayroll: accounts.accountPayroll, creditAccountNdfl: accounts.accountNdfl, creditAccountSocial: accounts.accountSocialTaxes, costItemTitleRu: "ФОТ" },
		{ id: "emp-05", employeeTabNumber: "АСС-01", employeeName: "Ковалева М.В.", positionTitleRu: "Ассистент", specialtyRu: "Сестринское дело", calculationTypeTitleRu: "Смена", grossRevenueGeneratedKopecks: 0, grossEarnedKopecks: 370000, ndfl13Kopecks: 48100, socialInsuranceTaxesKopecks: 111000, netPayoutKopecks: 321900, debitAccount: accounts.accountGeneralExpense, creditAccountPayroll: accounts.accountPayroll, creditAccountNdfl: accounts.accountNdfl, creditAccountSocial: accounts.accountSocialTaxes, costItemTitleRu: "ФОТ" },
	];

	return {
		packageId: `pkg-${dateClean}-test`,
		generatedAtIso: new Date().toISOString(),
		exportPeriodStartIso: dateIso,
		exportPeriodEndIso: dateIso,
		clinic,
		chartOfAccounts: accounts,
		retailSalesDocument: {
			id: `doc-sales-${dateClean}-001`,
			documentNumber: `${prefix}-ОРП-${dateClean}-01`,
			documentDateIso: dateIso,
			documentTime: "20:30:00",
			periodLabelRu: `Смена от ${dateIso}`,
			cashRegisterName: clinic.defaultCashRegisterName || "Касса №1 (АТОЛ 27Ф)",
			warehouseName: clinic.defaultWarehouseName || "Основной склад клиники",
			items,
			payments: [
				{ id: "p-1", tenderType: "cash", tenderTitleRu: "Наличные в кассу (50.01)", amountKopecks: 3000000, accountCode: accounts.accountCashDesk },
				{ id: "p-2", tenderType: "card_acquiring", tenderTitleRu: "Оплата банковской картой / Эквайринг (57.03)", amountKopecks: 8500000, accountCode: accounts.accountAcquiringTransit, acquiringBankName: "ПАО СБЕРБАНК", acquiringTerminalId: "POS-7701928", acquiringContractNumber: "ЭКВ-9874" },
				{ id: "p-3", tenderType: "sbp", tenderTitleRu: "Система быстрых платежей / QR (51)", amountKopecks: 3250000, accountCode: accounts.accountBankCurrent },
			],
			totalRevenueKopecks: 14750000,
			totalDiscountKopecks: 140000,
			totalVatKopecks: 0,
			cashierName: "Иванова О.Н.",
			comment: "Выгрузка смены из CRM DENTE",
		},
		materialWriteoffDocument: {
			id: `doc-writeoff-${dateClean}-001`,
			documentNumber: `${prefix}-ТРН-${dateClean}-01`,
			documentDateIso: dateIso,
			documentTime: "20:35:00",
			periodLabelRu: `Смена от ${dateIso}`,
			senderWarehouseName: clinic.defaultWarehouseName || "Основной склад клиники",
			recipientDepartmentName: "Лечебное отделение",
			items: writeoffItems,
			totalCostKopecks: 2456750,
			responsiblePersonName: "Петрова С.И. (Старшая медсестра)",
			reasonRu: "Автоматическое списание по нормам BOM за клиническую смену",
		},
		payrollDocument: {
			id: `doc-payroll-${dateClean}-001`,
			documentNumber: `${prefix}-ЗП-${dateClean}-01`,
			documentDateIso: dateIso,
			documentTime: "20:40:00",
			registrationPeriodIso: `${dateIso.slice(0, 7)}-01`,
			periodLabelRu: `Смена ${dateIso}`,
			employees,
			totalGrossKopecks: 3662500,
			totalNdflKopecks: 476125,
			totalSocialTaxesKopecks: 1098750,
			totalNetPayoutKopecks: 3186375,
			comment: "Отражение зарплаты за смену из CRM DENTE",
		},
	};
}
