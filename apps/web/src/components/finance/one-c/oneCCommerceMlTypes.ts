/**
 * DENTE Dental CRM — 1C:Enterprise (1С:Предприятие 8.3 / Бухгалтерия 3.0 / EnterpriseData)
 * CommerceML & EnterpriseData Types, Constants, Validation & Monetary Formatters.
 *
 * Statutory Russian export standards:
 * - пп. 2 п. 2 ст. 149 НК РФ (освобождение медицинских услуг от НДС)
 * - Strict integer kopeck math
 * - Standard 1C chart of accounts (10.01, 20.01, 26, 50.01, 51, 57.03, 68.01, 69.01, 70, 90.01.1, 90.02.1)
 */

import {
	validateRussianInn,
	validateRussianKpp,
	validateRussianOgrn,
} from "@dental/shared";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS & SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

export const COMMERCEML_VERSION_209 = "2.09";
export const ENTERPRISEDATA_VERSION_113 = "1.13";
export const TAX_EXEMPTION_ARTICLE_149_RU = "пп. 2 п. 2 ст. 149 НК РФ";
export const DEFAULT_OKEI_PIECE_CODE = "796";
export const DEFAULT_OKEI_PIECE_NAME = "шт";

/**
 * 1C Chart of Accounts standard presets for dental clinics.
 */
export interface OneCChartOfAccounts {
	readonly accountSalesRevenue: string; // 90.01.1 (Выручка от медицинских услуг)
	readonly accountSalesCost: string; // 90.02.1 (Себестоимость продаж)
	readonly accountMaterials: string; // 10.01 (Сырье и материалы)
	readonly accountConsumables: string; // 10.06 (Прочие материалы)
	readonly accountProductionCost: string; // 20.01 (Основное производство / Медуслуги)
	readonly accountGeneralExpense: string; // 26 (Общехозяйственные расходы)
	readonly accountCashDesk: string; // 50.01 (Касса организации)
	readonly accountBankCurrent: string; // 51 (Расчетные счета)
	readonly accountAcquiringTransit: string; // 57.03 (Продажи по платежным картам / Эквайринг)
	readonly accountPayroll: string; // 70 (Расчеты с персоналом по оплате труда)
	readonly accountNdfl: string; // 68.01 (НДФЛ при фактической выплате)
	readonly accountSocialTaxes: string; // 69.01 (Страховые взносы по единому тарифу 30%)
}

export const DEFAULT_1C_CHART_OF_ACCOUNTS: OneCChartOfAccounts = {
	accountSalesRevenue: "90.01.1",
	accountSalesCost: "90.02.1",
	accountMaterials: "10.01",
	accountConsumables: "10.06",
	accountProductionCost: "20.01",
	accountGeneralExpense: "26",
	accountCashDesk: "50.01",
	accountBankCurrent: "51",
	accountAcquiringTransit: "57.03",
	accountPayroll: "70",
	accountNdfl: "68.01",
	accountSocialTaxes: "69.01",
};

/**
 * Clinic organization requisites profile for 1C exchange.
 */
export interface OneCClinicProfile {
	readonly id: string;
	readonly name: string;
	readonly fullName: string;
	readonly inn: string;
	readonly kpp?: string | undefined;
	readonly ogrn?: string | undefined;
	readonly address: string;
	readonly phone: string;
	readonly email?: string | undefined;
	readonly bankAccount?: string | undefined;
	readonly bankBik?: string | undefined;
	readonly bankName?: string | undefined;
	readonly bankCorrAccount?: string | undefined;
	readonly chiefDoctorName?: string | undefined;
	readonly chiefAccountantName?: string | undefined;
	readonly defaultWarehouseName?: string | undefined;
	readonly defaultCashRegisterName?: string | undefined;
	readonly prefix1C?: string | undefined;
}

export const DEFAULT_CLINIC_PROFILE_1C: OneCClinicProfile = {
	id: "clinic-dente",
	name: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	fullName: "Общество с ограниченной ответственностью «ДЕНТЕ СТОМАТОЛОГИЯ»",
	inn: "7701234560",
	kpp: "770101001",
	ogrn: "1207700123454",
	address: "101000, г. Москва, ул. Стоматологическая, д. 10, стр. 1",
	phone: "",
	email: "buh@dente-clinic.ru",
	bankAccount: "40702810938000012345",
	bankBik: "044525225",
	bankName: "ПАО СБЕРБАНК Г. МОСКВА",
	bankCorrAccount: "30101810400000000225",
	chiefDoctorName: "",
	chiefAccountantName: "",
	defaultWarehouseName: "Основной склад клиники",
	defaultCashRegisterName: "Касса №1 (АТОЛ 27Ф, ФН 9960440302)",
	prefix1C: "DN",
};

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENT 1: RETAIL SALES REPORT («ОТЧЕТ О РОЗНИЧНЫХ ПРОДАЖАХ»)
// ═══════════════════════════════════════════════════════════════════════════

export interface OneCRetailSaleItem {
	readonly id: string;
	readonly code804n?: string | undefined;
	readonly name: string;
	readonly toothNumber?: number | undefined;
	readonly unitCode?: string | undefined; // OKEI code (796 = piece)
	readonly unitName?: string | undefined;
	readonly quantity: number;
	readonly priceKopecks: number;
	readonly discountKopecks: number;
	readonly totalKopecks: number;
	readonly vatRate?: string | undefined;
	readonly vatAmountKopecks?: number | undefined;
	readonly doctorName?: string | undefined;
	readonly nomenclatureGroup?: string | undefined;
}

export type OneCPaymentTenderType =
	| "cash"
	| "card_acquiring"
	| "sbp"
	| "bank_transfer"
	| "dms"
	| "certificate_deposit";

export interface OneCPaymentBreakdownItem {
	readonly id: string;
	readonly tenderType: OneCPaymentTenderType;
	readonly tenderTitleRu: string;
	readonly amountKopecks: number;
	readonly accountCode: string;
	readonly acquiringBankName?: string | undefined;
	readonly acquiringTerminalId?: string | undefined;
	readonly acquiringContractNumber?: string | undefined;
}

export interface OneCRetailSalesDocument {
	readonly id: string;
	readonly documentNumber: string;
	readonly documentDateIso: string; // YYYY-MM-DD
	readonly documentTime: string; // HH:mm:ss
	readonly periodLabelRu: string;
	readonly cashRegisterName: string;
	readonly warehouseName: string;
	readonly items: readonly OneCRetailSaleItem[];
	readonly payments: readonly OneCPaymentBreakdownItem[];
	readonly totalRevenueKopecks: number;
	readonly totalDiscountKopecks: number;
	readonly totalVatKopecks: number;
	readonly cashierName?: string | undefined;
	readonly comment?: string | undefined;
}

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENT 2: MATERIAL WRITEOFF / BOM («ТРЕБОВАНИЕ-НАКЛАДНАЯ / СПИСАНИЕ»)
// ═══════════════════════════════════════════════════════════════════════════

export interface OneCMaterialWriteoffItem {
	readonly id: string;
	readonly article: string;
	readonly name: string;
	readonly batchNumber?: string | undefined;
	readonly expirationDateIso?: string | undefined;
	readonly unitCode: string; // OKEI code (796 шт, 112 л, 166 кг, etc.)
	readonly unitName: string;
	readonly quantity: number;
	readonly unitCostKopecks: number;
	readonly totalCostKopecks: number;
	readonly debitAccount: string; // e.g. "20.01"
	readonly creditAccount: string; // e.g. "10.01" or "10.06"
	readonly costItemTitleRu: string; // e.g. "Списание стоматологических расходных материалов (BOM)"
	readonly relatedServiceCode804n?: string | undefined;
	readonly relatedServiceName?: string | undefined;
}

export interface OneCMaterialWriteoffDocument {
	readonly id: string;
	readonly documentNumber: string;
	readonly documentDateIso: string;
	readonly documentTime: string;
	readonly periodLabelRu: string;
	readonly senderWarehouseName: string;
	readonly recipientDepartmentName: string;
	readonly items: readonly OneCMaterialWriteoffItem[];
	readonly totalCostKopecks: number;
	readonly responsiblePersonName?: string | undefined;
	readonly reasonRu?: string | undefined;
}

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENT 3: PAYROLL REFLECTION («ОТРАЖЕНИЕ ЗАРПЛАТЫ В БУХУЧЕТЕ»)
// ═══════════════════════════════════════════════════════════════════════════

export interface OneCPayrollEmployeeItem {
	readonly id: string;
	readonly employeeTabNumber: string;
	readonly employeeName: string;
	readonly positionTitleRu: string;
	readonly specialtyRu: string;
	readonly calculationTypeTitleRu: string; // e.g. "Сдельная оплата труда (врачи)" / "Оклад за смены (ассистенты)"
	readonly grossRevenueGeneratedKopecks: number;
	readonly grossEarnedKopecks: number;
	readonly ndfl13Kopecks: number;
	readonly socialInsuranceTaxesKopecks: number; // 30% единый тариф
	readonly netPayoutKopecks: number; // "На руки"
	readonly debitAccount: string; // e.g. "20.01" or "26"
	readonly creditAccountPayroll: string; // e.g. "70"
	readonly creditAccountNdfl: string; // e.g. "68.01"
	readonly creditAccountSocial: string; // e.g. "69.01"
	readonly costItemTitleRu: string;
}

export interface OneCPayrollDocument {
	readonly id: string;
	readonly documentNumber: string;
	readonly documentDateIso: string;
	readonly documentTime: string;
	readonly registrationPeriodIso: string; // YYYY-MM-01
	readonly periodLabelRu: string;
	readonly employees: readonly OneCPayrollEmployeeItem[];
	readonly totalGrossKopecks: number;
	readonly totalNdflKopecks: number;
	readonly totalSocialTaxesKopecks: number;
	readonly totalNetPayoutKopecks: number;
	readonly comment?: string | undefined;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPLETE COMMERCEML PACKAGE BUNDLE
// ═══════════════════════════════════════════════════════════════════════════

export interface OneCCommerceMlPackage {
	readonly packageId: string;
	readonly generatedAtIso: string;
	readonly exportPeriodStartIso: string;
	readonly exportPeriodEndIso: string;
	readonly clinic: OneCClinicProfile;
	readonly chartOfAccounts: OneCChartOfAccounts;
	readonly retailSalesDocument: OneCRetailSalesDocument;
	readonly materialWriteoffDocument: OneCMaterialWriteoffDocument;
	readonly payrollDocument: OneCPayrollDocument;
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

export interface OneCCredentialValidationResult {
	readonly isValid: boolean;
	readonly errors: readonly string[];
}

export function validateOneCClinicCredentials(
	profile: OneCClinicProfile,
): OneCCredentialValidationResult {
	const errors: string[] = [];

	if (!profile.name || profile.name.trim().length === 0) {
		errors.push("Не указано краткое наименование организации");
	}

	const innResult = validateRussianInn(profile.inn);
	if (!innResult.isValid) {
		errors.push(innResult.errorMessageRu || `Некорректный ИНН клиники: ${profile.inn}`);
	}

	if (profile.kpp) {
		const kppResult = validateRussianKpp(profile.kpp);
		if (!kppResult.isValid) {
			errors.push(kppResult.errorMessageRu || `Некорректный КПП клиники: ${profile.kpp}`);
		}
	}

	if (profile.ogrn) {
		const ogrnResult = validateRussianOgrn(profile.ogrn);
		if (!ogrnResult.isValid) {
			errors.push(ogrnResult.errorMessageRu || `Некорректный ОГРН клиники: ${profile.ogrn}`);
		}
	}

	if (profile.bankBik && !/^\d{9}$/.test(profile.bankBik.trim())) {
		errors.push("БИК банка должен состоять строго из 9 цифр");
	}

	if (profile.bankAccount && !/^\d{20}$/.test(profile.bankAccount.trim())) {
		errors.push("Расчетный счет организации должен состоять строго из 20 цифр");
	}

	if (profile.bankCorrAccount && !/^\d{20}$/.test(profile.bankCorrAccount.trim())) {
		errors.push("Корреспондентский счет банка должен состоять строго из 20 цифр");
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

export interface OneCPackageIntegrityResult {
	readonly isValid: boolean;
	readonly errors: readonly string[];
	readonly totalsKop: {
		readonly salesGross: number;
		readonly salesPayments: number;
		readonly materialsCost: number;
		readonly payrollGross: number;
		readonly payrollNdfl: number;
		readonly payrollSocial: number;
		readonly payrollNet: number;
	};
}

export function validatePackageIntegrity(
	pkg: OneCCommerceMlPackage,
): OneCPackageIntegrityResult {
	const errors: string[] = [];

	// 1. Validate Sales Document Arithmetic
	const calculatedSalesKop = pkg.retailSalesDocument.items.reduce(
		(sum, it) => sum + it.totalKopecks,
		0,
	);
	if (calculatedSalesKop !== pkg.retailSalesDocument.totalRevenueKopecks) {
		errors.push(
			`Несходимость выручки в Отчете о розничных продажах: сумма строк (${calculatedSalesKop} коп.) != итого документа (${pkg.retailSalesDocument.totalRevenueKopecks} коп.)`,
		);
	}

	const calculatedPaymentsKop = pkg.retailSalesDocument.payments.reduce(
		(sum, p) => sum + p.amountKopecks,
		0,
	);
	if (calculatedPaymentsKop !== pkg.retailSalesDocument.totalRevenueKopecks) {
		errors.push(
			`Несходимость оплат в Отчете о розничных продажах: сумма способов оплат (${calculatedPaymentsKop} коп.) != сумма выручки (${pkg.retailSalesDocument.totalRevenueKopecks} коп.)`,
		);
	}

	// 2. Validate Material Writeoff Arithmetic
	const calculatedMaterialsKop = pkg.materialWriteoffDocument.items.reduce(
		(sum, it) => sum + it.totalCostKopecks,
		0,
	);
	if (calculatedMaterialsKop !== pkg.materialWriteoffDocument.totalCostKopecks) {
		errors.push(
			`Несходимость себестоимости материалов: сумма строк (${calculatedMaterialsKop} коп.) != итого накладной (${pkg.materialWriteoffDocument.totalCostKopecks} коп.)`,
		);
	}

	// 3. Validate Payroll Arithmetic
	const calcPayrollGross = pkg.payrollDocument.employees.reduce(
		(sum, it) => sum + it.grossEarnedKopecks,
		0,
	);
	const calcPayrollNdfl = pkg.payrollDocument.employees.reduce(
		(sum, it) => sum + it.ndfl13Kopecks,
		0,
	);
	const calcPayrollSocial = pkg.payrollDocument.employees.reduce(
		(sum, it) => sum + it.socialInsuranceTaxesKopecks,
		0,
	);
	const calcPayrollNet = pkg.payrollDocument.employees.reduce(
		(sum, it) => sum + it.netPayoutKopecks,
		0,
	);

	if (calcPayrollGross !== pkg.payrollDocument.totalGrossKopecks) {
		errors.push(
			`Несходимость ФОТ зарплаты: сумма начислений (${calcPayrollGross} коп.) != итого документа (${pkg.payrollDocument.totalGrossKopecks} коп.)`,
		);
	}
	if (calcPayrollNdfl !== pkg.payrollDocument.totalNdflKopecks) {
		errors.push(
			`Несходимость НДФЛ: сумма налога (${calcPayrollNdfl} коп.) != итого документа (${pkg.payrollDocument.totalNdflKopecks} коп.)`,
		);
	}
	if (calcPayrollSocial !== pkg.payrollDocument.totalSocialTaxesKopecks) {
		errors.push(
			`Несходимость страховых взносов: сумма взносов (${calcPayrollSocial} коп.) != итого документа (${pkg.payrollDocument.totalSocialTaxesKopecks} коп.)`,
		);
	}
	if (calcPayrollNet !== pkg.payrollDocument.totalNetPayoutKopecks) {
		errors.push(
			`Несходимость выплаты на руки: сумма выплат (${calcPayrollNet} коп.) != итого документа (${pkg.payrollDocument.totalNetPayoutKopecks} коп.)`,
		);
	}

	// Check that Gross - NDFL === Net for each employee
	for (const emp of pkg.payrollDocument.employees) {
		if (emp.grossEarnedKopecks - emp.ndfl13Kopecks !== emp.netPayoutKopecks) {
			errors.push(
				`Ошибка расчета сотрудника «${emp.employeeName}»: Начислено (${emp.grossEarnedKopecks}) - НДФЛ (${emp.ndfl13Kopecks}) != На руки (${emp.netPayoutKopecks})`,
			);
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
		totalsKop: {
			salesGross: calculatedSalesKop,
			salesPayments: calculatedPaymentsKop,
			materialsCost: calculatedMaterialsKop,
			payrollGross: calcPayrollGross,
			payrollNdfl: calcPayrollNdfl,
			payrollSocial: calcPayrollSocial,
			payrollNet: calcPayrollNet,
		},
	};
}

// ═══════════════════════════════════════════════════════════════════════════
// FORMATTERS
// ═══════════════════════════════════════════════════════════════════════════

export function formatKopToRub(kopecks: number): string {
	const rub = Math.max(0, Math.round(kopecks)) / 100;
	return rub.toFixed(2);
}

export function formatKopToRubLocale(kopecks: number): string {
	const rub = Math.max(0, Math.round(kopecks)) / 100;
	return `${rub.toLocaleString("ru-RU", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})} ₽`;
}
