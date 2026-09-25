/**
 * DENTE Dental CRM — 1C:Enterprise (1С:Предприятие 8.3 / Бухгалтерия 3.0 / EnterpriseData)
 * Realistic Clinical Shift Export Package Generator.
 *
 * Implements realistic clinical shift data with exact kopeck math:
 * - Retail Services (Nomenclature 804n)
 * - BOM Materials write-offs with batch numbers and expiration dates
 * - Piece-rate and staff payroll calculations (Т-51)
 */

import {
	DEFAULT_1C_CHART_OF_ACCOUNTS,
	DEFAULT_CLINIC_PROFILE_1C,
	type OneCChartOfAccounts,
	type OneCClinicProfile,
	type OneCCommerceMlPackage,
	type OneCMaterialWriteoffDocument,
	type OneCMaterialWriteoffItem,
	type OneCPayrollDocument,
	type OneCPayrollEmployeeItem,
	type OneCPaymentBreakdownItem,
	type OneCRetailSaleItem,
	type OneCRetailSalesDocument,
} from "./oneCCommerceMlTypes.js";

/**
 * Creates a 100% complete, realistic clinical shift package with strict kopeck math.
 */
export function createRealisticShiftExportPackage(
	dateIso: string,
	customClinic?: Partial<OneCClinicProfile>,
	customAccounts?: Partial<OneCChartOfAccounts>,
): OneCCommerceMlPackage {
	const clinic: OneCClinicProfile = {
		...DEFAULT_CLINIC_PROFILE_1C,
		...customClinic,
	};
	const chartOfAccounts: OneCChartOfAccounts = {
		...DEFAULT_1C_CHART_OF_ACCOUNTS,
		...customAccounts,
	};

	const dateClean = dateIso.replace(/-/g, "");
	const prefix = clinic.prefix1C || "DN";

	// 1. Realistic Retail Services (Nomenclature 804n)
	const items: OneCRetailSaleItem[] = [
		{
			id: "srv-01",
			code804n: "A16.07.002.001",
			name: "Восстановление зуба пломбой световой полимеризации (глубокий кариес)",
			toothNumber: 16,
			unitCode: "796",
			unitName: "шт",
			quantity: 1,
			priceKopecks: 650000, // 6,500.00 RUB
			discountKopecks: 0,
			totalKopecks: 650000,
			vatRate: "Без НДС",
			vatAmountKopecks: 0,
			doctorName: "Морозов А.В.",
			nomenclatureGroup: "Стоматологическая терапия",
		},
		{
			id: "srv-02",
			code804n: "A16.07.030.001",
			name: "Инструментальная и медикаментозная обработка корневого канала (эндодонтия)",
			toothNumber: 16,
			unitCode: "796",
			unitName: "шт",
			quantity: 3,
			priceKopecks: 280000, // 2,800.00 RUB x 3 = 8,400.00
			discountKopecks: 40000, // 400.00 RUB discount
			totalKopecks: 800000, // 8,000.00 RUB
			vatRate: "Без НДС",
			vatAmountKopecks: 0,
			doctorName: "Морозов А.В.",
			nomenclatureGroup: "Стоматологическая терапия",
		},
		{
			id: "srv-03",
			code804n: "A16.07.054.001",
			name: "Внутрикостная дентальная имплантация системы Straumann BLX (Швейцария)",
			toothNumber: 46,
			unitCode: "796",
			unitName: "шт",
			quantity: 1,
			priceKopecks: 6500000, // 65,000.00 RUB
			discountKopecks: 0,
			totalKopecks: 6500000,
			vatRate: "Без НДС",
			vatAmountKopecks: 0,
			doctorName: "Васильев Д.М.",
			nomenclatureGroup: "Хирургическая стоматология и имплантация",
		},
		{
			id: "srv-04",
			code804n: "A16.07.041.002",
			name: "Синус-лифтинг закрытый (субантральная аугментация)",
			toothNumber: 16,
			unitCode: "796",
			unitName: "шт",
			quantity: 1,
			priceKopecks: 2500000, // 25,000.00 RUB
			discountKopecks: 0,
			totalKopecks: 2500000,
			vatRate: "Без НДС",
			vatAmountKopecks: 0,
			doctorName: "Васильев Д.М.",
			nomenclatureGroup: "Хирургическая стоматология и имплантация",
		},
		{
			id: "srv-05",
			code804n: "A16.07.051",
			name: "Профессиональная гигиена полости рта комплексная (Air-Flow + УЗ)",
			toothNumber: undefined,
			unitCode: "796",
			unitName: "чел",
			quantity: 2,
			priceKopecks: 600000, // 6,000.00 RUB x 2 = 12,000.00
			discountKopecks: 100000, // 1,000.00 RUB discount
			totalKopecks: 1100000, // 11,000.00 RUB
			vatRate: "Без НДС",
			vatAmountKopecks: 0,
			doctorName: "Смирнова Е.А.",
			nomenclatureGroup: "Профилактическая стоматология",
		},
		{
			id: "srv-06",
			code804n: "A16.07.004.004",
			name: "Восстановление зуба цельнокерамической коронкой E.max CAD/CAM",
			toothNumber: 21,
			unitCode: "796",
			unitName: "шт",
			quantity: 1,
			priceKopecks: 3200000, // 32,000.00 RUB
			discountKopecks: 0,
			totalKopecks: 3200000,
			vatRate: "Без НДС",
			vatAmountKopecks: 0,
			doctorName: "Кузнецов А.П.",
			nomenclatureGroup: "Ортопедическая стоматология",
		},
	];

	// Total Sales = 6,500 + 8,000 + 65,000 + 25,000 + 11,000 + 32,000 = 147,500.00 RUB = 14,750,000 kop
	const totalRevenueKop = items.reduce((sum, i) => sum + i.totalKopecks, 0);
	const totalDiscountKop = items.reduce((sum, i) => sum + i.discountKopecks, 0);

	// Payments Breakdown strictly matching totalRevenueKop (14,750,000 kop):
	// Cash 50.01: 30,000.00 (3,000,000 kop)
	// Acquiring 57.03: 85,000.00 (8,500,000 kop)
	// SBP 51: 32,500.00 (3,250,000 kop)
	const payments: OneCPaymentBreakdownItem[] = [
		{
			id: "pay-01",
			tenderType: "cash",
			tenderTitleRu: "Наличные в кассу (50.01)",
			amountKopecks: 3000000,
			accountCode: chartOfAccounts.accountCashDesk,
		},
		{
			id: "pay-02",
			tenderType: "card_acquiring",
			tenderTitleRu: "Оплата банковской картой / Эквайринг (57.03)",
			amountKopecks: 8500000,
			accountCode: chartOfAccounts.accountAcquiringTransit,
			acquiringBankName: "ПАО СБЕРБАНК",
			acquiringTerminalId: "POS-7701928",
			acquiringContractNumber: "ЭКВ-9874",
		},
		{
			id: "pay-03",
			tenderType: "sbp",
			tenderTitleRu: "Система быстрых платежей / QR (51)",
			amountKopecks: 3250000,
			accountCode: chartOfAccounts.accountBankCurrent,
		},
	];

	const retailSalesDoc: OneCRetailSalesDocument = {
		id: `doc-sales-${dateClean}-001`,
		documentNumber: `${prefix}-ОРП-${dateClean}-01`,
		documentDateIso: dateIso,
		documentTime: "20:30:00",
		periodLabelRu: `Смена от ${dateIso}`,
		cashRegisterName: clinic.defaultCashRegisterName || "Касса №1 (АТОЛ 27Ф)",
		warehouseName: clinic.defaultWarehouseName || "Основной склад клиники",
		items,
		payments,
		totalRevenueKopecks: totalRevenueKop,
		totalDiscountKopecks: totalDiscountKop,
		totalVatKopecks: 0,
		cashierName: "Иванова О.Н.",
		comment: "Выгрузка смены из CRM DENTE",
	};

	// 2. BOM Materials Writeoff Items
	const writeoffItems: OneCMaterialWriteoffItem[] = [
		{
			id: "mat-01",
			article: "MAT-FLT-250",
			name: "Композит световой Filtek Z250 шприц 4г (3M ESPE)",
			batchNumber: "Партия №2408-A",
			expirationDateIso: "2028-06-30",
			unitCode: "796",
			unitName: "шприц",
			quantity: 0.25,
			unitCostKopecks: 75000, // 750.00 RUB
			totalCostKopecks: 18750, // 187.50 RUB
			debitAccount: chartOfAccounts.accountProductionCost,
			creditAccount: chartOfAccounts.accountMaterials,
			costItemTitleRu: "Списание стоматологических расходных материалов (BOM)",
			relatedServiceCode804n: "A16.07.002.001",
		},
		{
			id: "mat-02",
			article: "MAT-SEPT-100",
			name: "Анестетик Септанест 1:100000 1.7мл (Septodont)",
			batchNumber: "Партия №9820-S",
			expirationDateIso: "2027-12-31",
			unitCode: "796",
			unitName: "амп",
			quantity: 4,
			unitCostKopecks: 12000, // 120.00 RUB
			totalCostKopecks: 48000, // 480.00 RUB
			debitAccount: chartOfAccounts.accountProductionCost,
			creditAccount: chartOfAccounts.accountMaterials,
			costItemTitleRu: "Списание медикаментов и анестезии",
		},
		{
			id: "mat-03",
			article: "MAT-STRAUM-BLX",
			name: "Дентальный имплантат Straumann BLX Roxolid SLActive d=4.0 L=10mm",
			batchNumber: "LOT-CH-778912",
			expirationDateIso: "2030-01-15",
			unitCode: "796",
			unitName: "шт",
			quantity: 1,
			unitCostKopecks: 1850000, // 18,500.00 RUB
			totalCostKopecks: 1850000, // 18,500.00 RUB
			debitAccount: chartOfAccounts.accountProductionCost,
			creditAccount: chartOfAccounts.accountMaterials,
			costItemTitleRu: "Списание дорогостоящих имплантационных систем",
			relatedServiceCode804n: "A16.07.054.001",
		},
		{
			id: "mat-04",
			article: "MAT-BIOSS-05",
			name: "Костнозамещающий материал Geistlich Bio-Oss 0.5g",
			batchNumber: "LOT-BIO-4412",
			expirationDateIso: "2028-09-30",
			unitCode: "796",
			unitName: "флакон",
			quantity: 1,
			unitCostKopecks: 540000, // 5,400.00 RUB
			totalCostKopecks: 540000, // 5,400.00 RUB
			debitAccount: chartOfAccounts.accountProductionCost,
			creditAccount: chartOfAccounts.accountMaterials,
			costItemTitleRu: "Списание остеопластических материалов",
			relatedServiceCode804n: "A16.07.041.002",
		},
	];

	const totalWriteoffCostKop = writeoffItems.reduce((sum, it) => sum + it.totalCostKopecks, 0);

	const writeoffDoc: OneCMaterialWriteoffDocument = {
		id: `doc-writeoff-${dateClean}-001`,
		documentNumber: `${prefix}-ТРН-${dateClean}-01`,
		documentDateIso: dateIso,
		documentTime: "20:35:00",
		periodLabelRu: `Смена от ${dateIso}`,
		senderWarehouseName: clinic.defaultWarehouseName || "Основной склад клиники",
		recipientDepartmentName: "Лечебное отделение",
		items: writeoffItems,
		totalCostKopecks: totalWriteoffCostKop,
		responsiblePersonName: "Петрова С.И. (Старшая медсестра)",
		reasonRu: "Автоматическое списание по нормам BOM за клиническую смену",
	};

	// 3. Piece-Rate Payroll reflection items
	const employees: OneCPayrollEmployeeItem[] = [
		{
			id: "emp-01",
			employeeTabNumber: "ВР-001",
			employeeName: "Морозов А.В.",
			positionTitleRu: "Врач-стоматолог терапевт",
			specialtyRu: "Терапевтическая стоматология",
			calculationTypeTitleRu: "Сдельная оплата труда (25% от выручки терапевта)",
			grossRevenueGeneratedKopecks: 1450000, // 14,500.00 RUB
			grossEarnedKopecks: 362500, // 3,625.00 RUB (25%)
			ndfl13Kopecks: 47125, // 471.25 -> round = 47125 kop (471.25 RUB)
			socialInsuranceTaxesKopecks: 108750, // 30% = 1,087.50 RUB
			netPayoutKopecks: 315375, // 3,153.75 RUB
			debitAccount: chartOfAccounts.accountProductionCost,
			creditAccountPayroll: chartOfAccounts.accountPayroll,
			creditAccountNdfl: chartOfAccounts.accountNdfl,
			creditAccountSocial: chartOfAccounts.accountSocialTaxes,
			costItemTitleRu: "Оплата труда врачебного персонала (сдельная)",
		},
		{
			id: "emp-02",
			employeeTabNumber: "ВР-002",
			employeeName: "Васильев Д.М.",
			positionTitleRu: "Врач-стоматолог хирург-имплантолог",
			specialtyRu: "Хирургическая стоматология",
			calculationTypeTitleRu: "Сдельная оплата труда (20% от имплантации)",
			grossRevenueGeneratedKopecks: 9000000, // 90,000.00 RUB
			grossEarnedKopecks: 1800000, // 18,000.00 RUB (20%)
			ndfl13Kopecks: 234000, // 13% = 2,340.00 RUB
			socialInsuranceTaxesKopecks: 540000, // 30% = 5,400.00 RUB
			netPayoutKopecks: 1566000, // 15,660.00 RUB
			debitAccount: chartOfAccounts.accountProductionCost,
			creditAccountPayroll: chartOfAccounts.accountPayroll,
			creditAccountNdfl: chartOfAccounts.accountNdfl,
			creditAccountSocial: chartOfAccounts.accountSocialTaxes,
			costItemTitleRu: "Оплата труда врачебного персонала (сдельная)",
		},
		{
			id: "emp-03",
			employeeTabNumber: "ВР-003",
			employeeName: "Кузнецов А.П.",
			positionTitleRu: "Врач-стоматолог ортопед",
			specialtyRu: "Ортопедическая стоматология",
			calculationTypeTitleRu: "Сдельная оплата труда (25% за вычетом лаборатории)",
			grossRevenueGeneratedKopecks: 3200000, // 32,000.00 RUB
			grossEarnedKopecks: 800000, // 8,000.00 RUB
			ndfl13Kopecks: 104000, // 13% = 1,040.00 RUB
			socialInsuranceTaxesKopecks: 240000, // 30% = 2,400.00 RUB
			netPayoutKopecks: 696000, // 6,960.00 RUB
			debitAccount: chartOfAccounts.accountProductionCost,
			creditAccountPayroll: chartOfAccounts.accountPayroll,
			creditAccountNdfl: chartOfAccounts.accountNdfl,
			creditAccountSocial: chartOfAccounts.accountSocialTaxes,
			costItemTitleRu: "Оплата труда врачебного персонала (сдельная)",
		},
		{
			id: "emp-04",
			employeeTabNumber: "ВР-004",
			employeeName: "Смирнова Е.А.",
			positionTitleRu: "Гигиенист стоматологический",
			specialtyRu: "Профилактическая стоматология",
			calculationTypeTitleRu: "Сдельная оплата труда (30% от гигиены)",
			grossRevenueGeneratedKopecks: 1100000, // 11,000.00 RUB
			grossEarnedKopecks: 330000, // 3,300.00 RUB (30%)
			ndfl13Kopecks: 42900, // 13% = 429.00 RUB
			socialInsuranceTaxesKopecks: 99000, // 30% = 990.00 RUB
			netPayoutKopecks: 287100, // 2,871.00 RUB
			debitAccount: chartOfAccounts.accountProductionCost,
			creditAccountPayroll: chartOfAccounts.accountPayroll,
			creditAccountNdfl: chartOfAccounts.accountNdfl,
			creditAccountSocial: chartOfAccounts.accountSocialTaxes,
			costItemTitleRu: "Оплата труда среднего медперсонала",
		},
		{
			id: "emp-05",
			employeeTabNumber: "АСС-01",
			employeeName: "Ковалева М.В.",
			positionTitleRu: "Ассистент врача-стоматолога",
			specialtyRu: "Сестринское дело",
			calculationTypeTitleRu: "Оплата за смену + надбавка за операцию",
			grossRevenueGeneratedKopecks: 0,
			grossEarnedKopecks: 370000, // 3,500 shift + 200 surgery = 3,700.00 RUB
			ndfl13Kopecks: 48100, // 13% = 481.00 RUB
			socialInsuranceTaxesKopecks: 111000, // 30% = 1,110.00 RUB
			netPayoutKopecks: 321900, // 3,219.00 RUB
			debitAccount: chartOfAccounts.accountGeneralExpense,
			creditAccountPayroll: chartOfAccounts.accountPayroll,
			creditAccountNdfl: chartOfAccounts.accountNdfl,
			creditAccountSocial: chartOfAccounts.accountSocialTaxes,
			costItemTitleRu: "Оплата труда вспомогательного персонала",
		},
	];

	const totalGrossKop = employees.reduce((sum, e) => sum + e.grossEarnedKopecks, 0);
	const totalNdflKop = employees.reduce((sum, e) => sum + e.ndfl13Kopecks, 0);
	const totalSocialKop = employees.reduce((sum, e) => sum + e.socialInsuranceTaxesKopecks, 0);
	const totalNetKop = employees.reduce((sum, e) => sum + e.netPayoutKopecks, 0);

	const payrollDoc: OneCPayrollDocument = {
		id: `doc-payroll-${dateClean}-001`,
		documentNumber: `${prefix}-ЗП-${dateClean}-01`,
		documentDateIso: dateIso,
		documentTime: "20:40:00",
		registrationPeriodIso: `${dateIso.slice(0, 7)}-01`,
		periodLabelRu: `Смена ${dateIso}`,
		employees,
		totalGrossKopecks: totalGrossKop,
		totalNdflKopecks: totalNdflKop,
		totalSocialTaxesKopecks: totalSocialKop,
		totalNetPayoutKopecks: totalNetKop,
		comment: "Отражение зарплаты за смену из CRM DENTE",
	};

	return {
		packageId: `pkg-${dateClean}-${Date.now().toString(36)}`,
		generatedAtIso: new Date().toISOString(),
		exportPeriodStartIso: dateIso,
		exportPeriodEndIso: dateIso,
		clinic,
		chartOfAccounts,
		retailSalesDocument: retailSalesDoc,
		materialWriteoffDocument: writeoffDoc,
		payrollDocument: payrollDoc,
	};
}
