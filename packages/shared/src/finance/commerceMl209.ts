/**
 * DENTE Dental CRM — 1C:Enterprise (1С:Бухгалтерия 8.3 / 1С:Медицина / 1С:УТ)
 * Statutory CommerceML 2.09 Multi-Document Package Export & Accounting Integration Engine.
 *
 * Implements Russian statutory export standards for:
 * 1. Выгрузка кассовых смен и чеков 54-ФЗ (счета 50 «Касса», 51 «Расчетные счета», 57.03 «Эквайринг», 62 «Расчеты с покупателями», 90.01.1 «Выручка»).
 * 2. Выгрузка актов выполненных медицинских услуг с кодами номенклатуры 804н (Приказ Минздрава 804н), номерами зубов FDI и ФИО врачей.
 * 3. Списание материалов ЦСО и склада (счет 10 «Материалы» / 10.01 / 10.06 -> 20.01 «Основное производство»).
 * 4. Отражение зарплаты врачей и персонала (Форма Т-51, Т-13, счета 70 / 68.01 / 69.01 -> 20.01 / 26).
 *
 * Invariants:
 * - Strict integer kopeck math (0 float rounding bugs): line item totals strictly equal document totals.
 * - Deterministic SHA-256 transaction hash for idempotency and protection against double posting in 1C.
 * - Multi-tender payments (Cash 50.01, Acquiring 57.03, SBP/Bank 51, Advance 62.02) strictly balance total sales.
 * - Tax exemption declaration: «Без НДС (пп. 2 п. 2 ст. 149 НК РФ)».
 * - Safe XML entity escaping (XML 1.0) and UTF-8 compliance.
 */

import { z } from "zod";
import { escapeXml } from "../cda/c14n.js";
import { kopecksToRub, rubToKopecks } from "../fiscal/kopecksArithmetic.js";
import {
	validateRussianInn,
	validateRussianKpp,
	validateRussianOgrn,
} from "../fiscal/taxDeduction.js";
import { canonicalJsonStringify, sha256Hex } from "../sync/hashing.js";
import {
	type OneCPartyInfo,
	oneCPartyInfoSchema,
} from "./oneCEnterpriseExport.js";

// ═══════════════════════════════════════════════════════════════════════════
// STATUTORY CONSTANTS & ACCOUNTING PLAN
// ═══════════════════════════════════════════════════════════════════════════

export const COMMERCEML_VERSION_209 = "2.09" as const;
export const COMMERCEML_XMLNS = "urn:1C.ru:commerceml_2" as const;
export const ENTERPRISEDATA_VERSION_113 = "1.13" as const;
export const ENTERPRISEDATA_XMLNS =
	"http://v8.1c.ru/edi/edi_stnd/EnterpriseData/1.13" as const;

export const TAX_EXEMPTION_ARTICLE_149_RU = "пп. 2 п. 2 ст. 149 НК РФ" as const;
export const DEFAULT_OKEI_PIECE_CODE = "796" as const;
export const DEFAULT_OKEI_PIECE_NAME = "шт" as const;
export const DEFAULT_OKEI_LITER_CODE = "112" as const;
export const DEFAULT_OKEI_KG_CODE = "166" as const;
export const DEFAULT_OKEI_PACK_CODE = "778" as const;

/**
 * 1C Standard Chart of Accounts presets for Russian dental & medical clinics.
 */
export const oneCChartOfAccountsSchema = z.object({
	accountSalesRevenue: z.string().default("90.01.1"), // Выручка от медицинских услуг
	accountSalesCost: z.string().default("90.02.1"), // Себестоимость продаж
	accountMaterials: z.string().default("10.01"), // Сырье и материалы
	accountConsumables: z.string().default("10.06"), // Прочие материалы (ЦСО, стерилизация, перчатки)
	accountProductionCost: z.string().default("20.01"), // Основное производство (Медицинские услуги)
	accountGeneralExpense: z.string().default("26"), // Общехозяйственные расходы
	accountCashDesk: z.string().default("50.01"), // Касса организации (Наличные)
	accountBankCurrent: z.string().default("51"), // Расчетные счета (СБП, безналичные переводы)
	accountAcquiringTransit: z.string().default("57.03"), // Продажи по платежным картам / Эквайринг
	accountBuyersSettlement: z.string().default("62.01"), // Расчеты с покупателями и заказчиками
	accountAdvancesReceived: z.string().default("62.02"), // Авансы полученные
	accountRetailBuyers: z.string().default("62.Р"), // Розничные покупатели
	accountPayroll: z.string().default("70"), // Расчеты с персоналом по оплате труда
	accountNdfl: z.string().default("68.01"), // НДФЛ 13%
	accountSocialTaxes: z.string().default("69.01"), // Страховые взносы по единому тарифу 30%
});
export type OneCChartOfAccounts = z.infer<typeof oneCChartOfAccountsSchema>;

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
	accountBuyersSettlement: "62.01",
	accountAdvancesReceived: "62.02",
	accountRetailBuyers: "62.Р",
	accountPayroll: "70",
	accountNdfl: "68.01",
	accountSocialTaxes: "69.01",
};

/**
 * Clinic organization profile for statutory 1C exchange.
 */
export const oneCClinicProfileSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1).max(255),
	fullName: z.string().min(1).max(500),
	inn: z.string().min(10).max(12),
	kpp: z.string().max(9).optional().nullable(),
	ogrn: z.string().max(15).optional().nullable(),
	address: z.string().min(1).max(500),
	phone: z.string().min(1).max(50),
	email: z.string().email().optional().nullable(),
	bankAccount: z.string().max(20).optional().nullable(),
	bankBik: z.string().max(9).optional().nullable(),
	bankName: z.string().max(255).optional().nullable(),
	bankCorrAccount: z.string().max(20).optional().nullable(),
	chiefDoctorName: z.string().max(255).optional().nullable(),
	chiefAccountantName: z.string().max(255).optional().nullable(),
	defaultWarehouseName: z.string().default("Основной склад клиники"),
	defaultCashRegisterName: z.string().default("Касса №1 (АТОЛ 27Ф, ФФД 1.2)"),
	prefix1C: z.string().default("DN"),
});
export type OneCClinicProfile = z.infer<typeof oneCClinicProfileSchema>;

export const DEFAULT_CLINIC_PROFILE_1C: OneCClinicProfile = {
	id: "clinic-dente",
	name: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	fullName: "Общество с ограниченной ответственностью «ДЕНТЕ СТОМАТОЛОГИЯ»",
	inn: "7701234560",
	kpp: "770101001",
	ogrn: "1207700123454",
	address: "101000, г. Москва, ул. Стоматологическая, д. 10, стр. 1",
	phone: "+7 (495) 123-45-67",
	email: "buh@dente-clinic.ru",
	bankAccount: "40702810938000012345",
	bankBik: "044525225",
	bankName: "ПАО СБЕРБАНК Г. МОСКВА",
	bankCorrAccount: "30101810400000000225",
	chiefDoctorName: "Барабаш С.В.",
	chiefAccountantName: "Смирнова Е.А.",
	defaultWarehouseName: "Основной склад клиники",
	defaultCashRegisterName: "Касса №1 (АТОЛ 27Ф, ФФД 1.2)",
	prefix1C: "DN",
};

// ═══════════════════════════════════════════════════════════════════════════
// ENTITY SCHEMAS & DOCUMENT DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export const oneCPaymentTenderTypeSchema = z.enum([
	"cash", // 50.01
	"card_acquiring", // 57.03
	"sbp", // 51
	"bank_transfer", // 51
	"dms", // 76.ДМС
	"certificate_deposit", // 62.02
	"advance_offset", // 62.02 -> 62.01
]);
export type OneCPaymentTenderType = z.infer<typeof oneCPaymentTenderTypeSchema>;

export const oneCPaymentBreakdownItemSchema = z.object({
	id: z.string().min(1),
	tenderType: oneCPaymentTenderTypeSchema,
	tenderTitleRu: z.string().min(1),
	amountKopecks: z.number().int().nonnegative(),
	accountCode: z.string().min(1),
	acquiringBankName: z.string().optional().nullable(),
	acquiringTerminalId: z.string().optional().nullable(),
	acquiringContractNumber: z.string().optional().nullable(),
	fiscalReceiptNumber: z.string().optional().nullable(),
	fiscalSign: z.string().optional().nullable(),
});
export type OneCPaymentBreakdownItem = z.infer<typeof oneCPaymentBreakdownItemSchema>;

export const oneCRetailSaleItemSchema = z.object({
	id: z.string().min(1),
	code804n: z.string().optional().nullable(),
	name: z.string().min(1).max(500),
	toothNumber: z.number().int().optional().nullable(),
	unitCode: z.string().default(DEFAULT_OKEI_PIECE_CODE),
	unitName: z.string().default(DEFAULT_OKEI_PIECE_NAME),
	quantity: z.number().positive().default(1),
	priceKopecks: z.number().int().nonnegative(),
	discountKopecks: z.number().int().nonnegative().default(0),
	totalKopecks: z.number().int().nonnegative(),
	vatRate: z.string().default("Без НДС"),
	vatAmountKopecks: z.number().int().default(0),
	doctorName: z.string().optional().nullable(),
	nomenclatureGroup: z.string().default("Стоматологические услуги"),
});
export type OneCRetailSaleItem = z.infer<typeof oneCRetailSaleItemSchema>;

export const oneCRetailSalesDocumentSchema = z.object({
	id: z.string().min(1),
	documentNumber: z.string().min(1),
	documentDateIso: z.string(), // YYYY-MM-DD
	documentTime: z.string().default("18:00:00"), // HH:mm:ss
	periodLabelRu: z.string().min(1),
	cashRegisterName: z.string().min(1),
	warehouseName: z.string().min(1),
	items: z.array(oneCRetailSaleItemSchema).min(1),
	payments: z.array(oneCPaymentBreakdownItemSchema).min(1),
	totalRevenueKopecks: z.number().int().nonnegative(),
	totalDiscountKopecks: z.number().int().nonnegative().default(0),
	totalVatKopecks: z.number().int().default(0),
	cashierName: z.string().optional().nullable(),
	comment: z.string().optional().nullable(),
	sha256Hash: z.string().length(64).optional(),
});
export type OneCRetailSalesDocument = z.infer<typeof oneCRetailSalesDocumentSchema>;

export const oneCMedicalActItemSchema = z.object({
	id: z.string().min(1),
	code804n: z.string().optional().nullable(),
	name: z.string().min(1).max(500),
	toothNumber: z.number().int().optional().nullable(),
	unitCode: z.string().default(DEFAULT_OKEI_PIECE_CODE),
	unitName: z.string().default(DEFAULT_OKEI_PIECE_NAME),
	quantity: z.number().positive().default(1),
	priceKopecks: z.number().int().nonnegative(),
	discountKopecks: z.number().int().nonnegative().default(0),
	totalKopecks: z.number().int().nonnegative(),
	vatRate: z.string().default("Без НДС"),
	vatAmountKopecks: z.number().int().default(0),
	attendingDoctorName: z.string().optional().nullable(),
	attendingDoctorSpecialty: z.string().optional().nullable(),
});
export type OneCMedicalActItem = z.infer<typeof oneCMedicalActItemSchema>;

export const oneCMedicalActDocumentSchema = z.object({
	id: z.string().min(1),
	actNumber: z.string().min(1),
	documentDateIso: z.string(), // YYYY-MM-DD
	documentTime: z.string().default("12:00:00"),
	patient: oneCPartyInfoSchema,
	contractNumber: z.string().optional().nullable(),
	contractDateIso: z.string().optional().nullable(),
	attendingDoctorName: z.string().optional().nullable(),
	items: z.array(oneCMedicalActItemSchema).min(1),
	totalKopecks: z.number().int().nonnegative(),
	comment: z.string().optional().nullable(),
	sha256Hash: z.string().length(64).optional(),
});
export type OneCMedicalActDocument = z.infer<typeof oneCMedicalActDocumentSchema>;

export const oneCMaterialWriteoffItemSchema = z.object({
	id: z.string().min(1),
	article: z.string().min(1),
	name: z.string().min(1).max(500),
	batchNumber: z.string().optional().nullable(),
	expirationDateIso: z.string().optional().nullable(),
	unitCode: z.string().default(DEFAULT_OKEI_PIECE_CODE),
	unitName: z.string().default(DEFAULT_OKEI_PIECE_NAME),
	quantity: z.number().positive(),
	unitCostKopecks: z.number().int().nonnegative(),
	totalCostKopecks: z.number().int().nonnegative(),
	debitAccount: z.string().default("20.01"), // Основное производство
	creditAccount: z.string().default("10.01"), // Материалы
	costItemTitleRu: z.string().default("Списание стоматологических материалов (BOM / ЦСО)"),
	relatedServiceCode804n: z.string().optional().nullable(),
	relatedServiceName: z.string().optional().nullable(),
	csoLogId: z.string().optional().nullable(),
	sterilizerCycleNumber: z.string().optional().nullable(),
});
export type OneCMaterialWriteoffItem = z.infer<typeof oneCMaterialWriteoffItemSchema>;

export const oneCMaterialWriteoffDocumentSchema = z.object({
	id: z.string().min(1),
	documentNumber: z.string().min(1),
	documentDateIso: z.string(),
	documentTime: z.string().default("19:00:00"),
	periodLabelRu: z.string().min(1),
	senderWarehouseName: z.string().default("Основной склад клиники"),
	recipientDepartmentName: z.string().default("Лечебное отделение (ЦСО)"),
	items: z.array(oneCMaterialWriteoffItemSchema).min(1),
	totalCostKopecks: z.number().int().nonnegative(),
	responsiblePersonName: z.string().optional().nullable(),
	reasonRu: z.string().default("Списание материалов ЦСО и склада по нормам расхода (BOM)"),
	sha256Hash: z.string().length(64).optional(),
});
export type OneCMaterialWriteoffDocument = z.infer<typeof oneCMaterialWriteoffDocumentSchema>;

export const oneCPayrollEmployeeItemSchema = z.object({
	id: z.string().min(1),
	employeeTabNumber: z.string().min(1),
	employeeName: z.string().min(1),
	positionTitleRu: z.string().min(1),
	specialtyRu: z.string().min(1),
	calculationTypeTitleRu: z.string().min(1),
	grossRevenueGeneratedKopecks: z.number().int().nonnegative(),
	grossEarnedKopecks: z.number().int().nonnegative(),
	ndfl13Kopecks: z.number().int().nonnegative(),
	socialInsuranceTaxesKopecks: z.number().int().nonnegative(),
	netPayoutKopecks: z.number().int().nonnegative(),
	debitAccount: z.string().default("20.01"),
	creditAccountPayroll: z.string().default("70"),
	creditAccountNdfl: z.string().default("68.01"),
	creditAccountSocial: z.string().default("69.01"),
	costItemTitleRu: z.string().default("Оплата труда медицинского персонала"),
});
export type OneCPayrollEmployeeItem = z.infer<typeof oneCPayrollEmployeeItemSchema>;

export const oneCPayrollDocumentSchema = z.object({
	id: z.string().min(1),
	documentNumber: z.string().min(1),
	documentDateIso: z.string(),
	documentTime: z.string().default("20:00:00"),
	registrationPeriodIso: z.string(), // YYYY-MM-01
	periodLabelRu: z.string().min(1),
	employees: z.array(oneCPayrollEmployeeItemSchema).min(1),
	totalGrossKopecks: z.number().int().nonnegative(),
	totalNdflKopecks: z.number().int().nonnegative(),
	totalSocialTaxesKopecks: z.number().int().nonnegative(),
	totalNetPayoutKopecks: z.number().int().nonnegative(),
	comment: z.string().optional().nullable(),
	sha256Hash: z.string().length(64).optional(),
});
export type OneCPayrollDocument = z.infer<typeof oneCPayrollDocumentSchema>;

export const oneCCommerceMlPackageSchema = z.object({
	packageId: z.string().min(1),
	generatedAtIso: z.string(),
	exportPeriodStartIso: z.string(),
	exportPeriodEndIso: z.string(),
	clinic: oneCClinicProfileSchema,
	chartOfAccounts: oneCChartOfAccountsSchema.default(DEFAULT_1C_CHART_OF_ACCOUNTS),
	retailSalesDocument: oneCRetailSalesDocumentSchema,
	medicalActs: z.array(oneCMedicalActDocumentSchema).default([]),
	materialWriteoffDocument: oneCMaterialWriteoffDocumentSchema,
	payrollDocument: oneCPayrollDocumentSchema.optional().nullable(),
	sha256Hash: z.string().length(64).optional(),
});
export type OneCCommerceMlPackage = z.infer<typeof oneCCommerceMlPackageSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// DETERMINISTIC SHA-256 IDEMPOTENCY & PROTECTION AGAINST DOUBLE POSTING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Computes deterministic SHA-256 hash from canonical JSON payload of a document or package.
 * Strips existing `sha256Hash` field before calculation to ensure stability.
 */
export function computeCommerceMlSha256(payload: unknown): string {
	if (typeof payload !== "object" || payload === null) {
		return sha256Hex(String(payload));
	}
	// Shallow copy to remove existing hash key
	const clone = { ...(payload as Record<string, unknown>) };
	delete clone.sha256Hash;
	const canonical = canonicalJsonStringify(clone);
	return sha256Hex(canonical);
}

/**
 * Generates composite idempotency key for 1C exchange: `<docId>#<sha256>`.
 */
export function computeCommerceMlCompositeKey(docId: string, payload: unknown): string {
	const hash = computeCommerceMlSha256(payload);
	return `${docId}#${hash}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRITY & REQUISITES VALIDATORS
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
		readonly actsTotal: number;
		readonly materialsCost: number;
		readonly payrollGross: number;
		readonly payrollNdfl: number;
		readonly payrollSocial: number;
		readonly payrollNet: number;
	};
	readonly sha256: string;
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

	// 2. Validate Medical Acts Arithmetic
	let calculatedActsKop = 0;
	if (pkg.medicalActs && pkg.medicalActs.length > 0) {
		for (const act of pkg.medicalActs) {
			const actItemsSum = act.items.reduce((s, it) => s + it.totalKopecks, 0);
			if (actItemsSum !== act.totalKopecks) {
				errors.push(
					`Несходимость сумм в Акте № ${act.actNumber}: сумма строк (${actItemsSum} коп.) != итого (${act.totalKopecks} коп.)`,
				);
			}
			calculatedActsKop += act.totalKopecks;
		}
	}

	// 3. Validate Material Writeoff Arithmetic
	const calculatedMaterialsKop = pkg.materialWriteoffDocument.items.reduce(
		(sum, it) => sum + it.totalCostKopecks,
		0,
	);
	if (calculatedMaterialsKop !== pkg.materialWriteoffDocument.totalCostKopecks) {
		errors.push(
			`Несходимость себестоимости материалов (Счет 10): сумма строк (${calculatedMaterialsKop} коп.) != итого накладной (${pkg.materialWriteoffDocument.totalCostKopecks} коп.)`,
		);
	}

	// 4. Validate Payroll Arithmetic (if provided)
	let calcPayrollGross = 0;
	let calcPayrollNdfl = 0;
	let calcPayrollSocial = 0;
	let calcPayrollNet = 0;

	if (pkg.payrollDocument) {
		calcPayrollGross = pkg.payrollDocument.employees.reduce(
			(sum, it) => sum + it.grossEarnedKopecks,
			0,
		);
		calcPayrollNdfl = pkg.payrollDocument.employees.reduce(
			(sum, it) => sum + it.ndfl13Kopecks,
			0,
		);
		calcPayrollSocial = pkg.payrollDocument.employees.reduce(
			(sum, it) => sum + it.socialInsuranceTaxesKopecks,
			0,
		);
		calcPayrollNet = pkg.payrollDocument.employees.reduce(
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

		for (const emp of pkg.payrollDocument.employees) {
			if (emp.grossEarnedKopecks - emp.ndfl13Kopecks !== emp.netPayoutKopecks) {
				errors.push(
					`Ошибка расчета сотрудника «${emp.employeeName}»: Начислено (${emp.grossEarnedKopecks}) - НДФЛ (${emp.ndfl13Kopecks}) != На руки (${emp.netPayoutKopecks})`,
				);
			}
		}
	}

	const pkgSha = computeCommerceMlSha256(pkg);

	return {
		isValid: errors.length === 0,
		errors,
		totalsKop: {
			salesGross: calculatedSalesKop,
			salesPayments: calculatedPaymentsKop,
			actsTotal: calculatedActsKop,
			materialsCost: calculatedMaterialsKop,
			payrollGross: calcPayrollGross,
			payrollNdfl: calcPayrollNdfl,
			payrollSocial: calcPayrollSocial,
			payrollNet: calcPayrollNet,
		},
		sha256: pkgSha,
	};
}

// ═══════════════════════════════════════════════════════════════════════════
// FORMATTERS & HELPERS
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

// ═══════════════════════════════════════════════════════════════════════════
// COMMERCEML 2.09 XML GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

function renderRetailSalesItemsCommerceMl(items: readonly OneCRetailSaleItem[]): string {
	return items
		.map((it) => {
			const unitCode = it.unitCode || DEFAULT_OKEI_PIECE_CODE;
			const unitName = it.unitName || DEFAULT_OKEI_PIECE_NAME;
			const toothSuffix = it.toothNumber ? ` (Зуб ${it.toothNumber})` : "";
			const fullName = `${it.name}${toothSuffix}`;
			const vatRate = it.vatRate || "Без НДС";
			const vatAmountRub = formatKopToRub(it.vatAmountKopecks ?? 0);
			const priceRub = formatKopToRub(it.priceKopecks);
			const totalRub = formatKopToRub(it.totalKopecks);
			const discountPercent =
				it.priceKopecks > 0
					? Math.round((it.discountKopecks / it.priceKopecks) * 100)
					: 0;

			return `\t\t\t\t<Товар>
\t\t\t\t\t<Ид>${escapeXml(it.id)}</Ид>
\t\t\t\t\t<Артикул>${escapeXml(it.code804n || it.id)}</Артикул>
\t\t\t\t\t<Код804н>${escapeXml(it.code804n || "")}</Код804н>
\t\t\t\t\t<Наименование>${escapeXml(fullName)}</Наименование>
\t\t\t\t\t<БазоваяЕдиница Код="${escapeXml(unitCode)}" НаименованиеПолное="${escapeXml(unitName)}">${escapeXml(unitName)}</БазоваяЕдиница>
\t\t\t\t\t<СтавкаНДС>${escapeXml(vatRate)}</СтавкаНДС>
\t\t\t\t\t<ЦенаЗаЕдиницу>${priceRub}</ЦенаЗаЕдиницу>
\t\t\t\t\t<Количество>${it.quantity}</Количество>
\t\t\t\t\t<Сумма>${totalRub}</Сумма>
\t\t\t\t\t<СуммаНДС>${vatAmountRub}</СуммаНДС>
\t\t\t\t\t<Скидки>
\t\t\t\t\t\t<Скидка>
\t\t\t\t\t\t\t<Процент>${discountPercent}</Процент>
\t\t\t\t\t\t\t<УчтеноВСумме>true</УчтеноВСумме>
\t\t\t\t\t\t</Скидка>
\t\t\t\t\t</Скидки>
\t\t\t\t\t<НоменклатурнаяГруппа>${escapeXml(it.nomenclatureGroup || "Стоматологические услуги")}</НоменклатурнаяГруппа>
\t\t\t\t\t<ВрачФИО>${escapeXml(it.doctorName || "")}</ВрачФИО>
\t\t\t\t</Товар>`;
		})
		.join("\n");
}

function renderRetailSalesPaymentsCommerceMl(
	payments: readonly OneCPaymentBreakdownItem[],
): string {
	return payments
		.map((p) => {
			const sumRub = formatKopToRub(p.amountKopecks);
			const acquiringInfo = p.acquiringBankName
				? `\n\t\t\t\t\t<Эквайер>${escapeXml(p.acquiringBankName)}</Эквайер>`
				: "";
			const terminalInfo = p.acquiringTerminalId
				? `\n\t\t\t\t\t<Терминал>${escapeXml(p.acquiringTerminalId)}</Терминал>`
				: "";
			const fiscalInfo = p.fiscalReceiptNumber
				? `\n\t\t\t\t\t<Чек54ФЗ>${escapeXml(p.fiscalReceiptNumber)}</Чек54ФЗ>`
				: "";

			return `\t\t\t\t<Оплата>
\t\t\t\t\t<Ид>${escapeXml(p.id)}</Ид>
\t\t\t\t\t<ВидОплаты>${escapeXml(p.tenderTitleRu)}</ВидОплаты>
\t\t\t\t\t<ТипОплаты>${escapeXml(p.tenderType)}</ТипОплаты>
\t\t\t\t\t<Сумма>${sumRub}</Сумма>
\t\t\t\t\t<СчетУчета>${escapeXml(p.accountCode)}</СчетУчета>${acquiringInfo}${terminalInfo}${fiscalInfo}
\t\t\t\t</Оплата>`;
		})
		.join("\n");
}

function renderMedicalActItemsCommerceMl(items: readonly OneCMedicalActItem[]): string {
	return items
		.map((it) => {
			const unitCode = it.unitCode || DEFAULT_OKEI_PIECE_CODE;
			const unitName = it.unitName || DEFAULT_OKEI_PIECE_NAME;
			const toothSuffix = it.toothNumber ? ` (Зуб ${it.toothNumber})` : "";
			const fullName = `${it.name}${toothSuffix}`;
			const priceRub = formatKopToRub(it.priceKopecks);
			const totalRub = formatKopToRub(it.totalKopecks);
			const vatRub = formatKopToRub(it.vatAmountKopecks ?? 0);
			const vatRate = it.vatRate || "Без НДС";

			return `\t\t\t\t<Товар>
\t\t\t\t\t<Ид>${escapeXml(it.id)}</Ид>
\t\t\t\t\t<Артикул>${escapeXml(it.code804n || it.id)}</Артикул>
\t\t\t\t\t<Код804н>${escapeXml(it.code804n || "")}</Код804н>
\t\t\t\t\t<Наименование>${escapeXml(fullName)}</Наименование>
\t\t\t\t\t<БазоваяЕдиница Код="${escapeXml(unitCode)}" НаименованиеПолное="${escapeXml(unitName)}">${escapeXml(unitName)}</БазоваяЕдиница>
\t\t\t\t\t<СтавкаНДС>${escapeXml(vatRate)}</СтавкаНДС>
\t\t\t\t\t<ЦенаЗаЕдиницу>${priceRub}</ЦенаЗаЕдиницу>
\t\t\t\t\t<Количество>${it.quantity}</Количество>
\t\t\t\t\t<Сумма>${totalRub}</Сумма>
\t\t\t\t\t<СуммаНДС>${vatRub}</СуммаНДС>
\t\t\t\t\t<ВрачФИО>${escapeXml(it.attendingDoctorName || "")}</ВрачФИО>
\t\t\t\t</Товар>`;
		})
		.join("\n");
}

function renderMedicalActDocumentCommerceMl(
	act: OneCMedicalActDocument,
	clinic: OneCClinicProfile,
	chartOfAccounts: OneCChartOfAccounts,
): string {
	const actTotalRub = formatKopToRub(act.totalKopecks);
	const actSha = act.sha256Hash || computeCommerceMlSha256(act);

	const contractRequisite = act.contractNumber
		? `\n\t\t\t\t<ЗначениеРеквизита>
\t\t\t\t\t<Наименование>Договор</Наименование>
\t\t\t\t\t<Значение>Договор № ${escapeXml(act.contractNumber)}${act.contractDateIso ? ` от ${escapeXml(act.contractDateIso)}` : ""}</Значение>
\t\t\t\t</ЗначениеРеквизита>`
		: "";

	const doctorRequisite = act.attendingDoctorName
		? `\n\t\t\t\t<ЗначениеРеквизита>
\t\t\t\t\t<Наименование>ВрачФИО</Наименование>
\t\t\t\t\t<Значение>${escapeXml(act.attendingDoctorName)}</Значение>
\t\t\t\t</ЗначениеРеквизита>`
		: "";

	return `\t<!-- Акт выполненных медицинских услуг: № ${escapeXml(act.actNumber)} -->
\t<Документ>
\t\t<Ид>${escapeXml(act.id)}</Ид>
\t\t<Номер>${escapeXml(act.actNumber)}</Номер>
\t\t<Дата>${escapeXml(act.documentDateIso)}</Дата>
\t\t<Время>${escapeXml(act.documentTime)}</Время>
\t\t<ХозяйственнаяОперация>Акт об оказании медицинских услуг</ХозяйственнаяОперация>
\t\t<Роль>Продавец</Роль>
\t\t<Валюта>руб</Валюта>
\t\t<Курс>1</Курс>
\t\t<Сумма>${actTotalRub}</Сумма>
\t\t<ХэшТранзакцииSHA256>${actSha}</ХэшТранзакцииSHA256>
\t\t<Контрагенты>
\t\t\t<Контрагент>
\t\t\t\t<Ид>${escapeXml(act.patient.id)}</Ид>
\t\t\t\t<Наименование>${escapeXml(act.patient.name)}</Наименование>
\t\t\t\t<ПолноеНаименование>${escapeXml(act.patient.fullName || act.patient.name)}</ПолноеНаименование>
\t\t\t\t<Роль>Покупатель</Роль>
${act.patient.inn ? `\t\t\t\t<ИНН>${escapeXml(act.patient.inn)}</ИНН>\n` : ""}${act.patient.address ? `\t\t\t\t<Адрес>${escapeXml(act.patient.address)}</Адрес>\n` : ""}${act.patient.phone ? `\t\t\t\t<Контакты><Контакт><Тип>ТелефонРабочий</Тип><Значение>${escapeXml(act.patient.phone)}</Значение></Контакт></Контакты>\n` : ""}\t\t\t</Контрагент>
\t\t</Контрагенты>
\t\t<Товары>
${renderMedicalActItemsCommerceMl(act.items)}
\t\t</Товары>
\t\t<ЗначенияРеквизитов>
\t\t\t<ЗначениеРеквизита>
\t\t\t\t<Наименование>ОсвобождениеОтНДС</Наименование>
\t\t\t\t<Значение>${TAX_EXEMPTION_ARTICLE_149_RU}</Значение>
\t\t\t</ЗначениеРеквизита>
\t\t\t<ЗначениеРеквизита>
\t\t\t\t<Наименование>СчетРасчетовСПокупателем</Наименование>
\t\t\t\t<Значение>${escapeXml(chartOfAccounts.accountBuyersSettlement)}</Значение>
\t\t\t</ЗначениеРеквизита>
\t\t\t<ЗначениеРеквизита>
\t\t\t\t<Наименование>СчетДоходов</Наименование>
\t\t\t\t<Значение>${escapeXml(chartOfAccounts.accountSalesRevenue)}</Значение>
\t\t\t</ЗначениеРеквизита>${contractRequisite}${doctorRequisite}
\t\t\t<ЗначениеРеквизита>
\t\t\t\t<Наименование>Проведен</Наименование>
\t\t\t\t<Значение>true</Значение>
\t\t\t</ЗначениеРеквизита>
\t\t</ЗначенияРеквизитов>
\t</Документ>`;
}

function renderMaterialWriteoffItemsCommerceMl(
	items: readonly OneCMaterialWriteoffItem[],
): string {
	return items
		.map((it) => {
			const unitCostRub = formatKopToRub(it.unitCostKopecks);
			const totalCostRub = formatKopToRub(it.totalCostKopecks);
			const batchInfo = it.batchNumber
				? `\n\t\t\t\t\t<Партия>${escapeXml(it.batchNumber)}</Партия>`
				: "";
			const expInfo = it.expirationDateIso
				? `\n\t\t\t\t\t<СрокГодности>${escapeXml(it.expirationDateIso)}</СрокГодности>`
				: "";
			const csoCycleInfo = it.sterilizerCycleNumber
				? `\n\t\t\t\t\t<ЦиклЦСО>${escapeXml(it.sterilizerCycleNumber)}</ЦиклЦСО>`
				: "";

			return `\t\t\t\t<Материал>
\t\t\t\t\t<Ид>${escapeXml(it.id)}</Ид>
\t\t\t\t\t<Артикул>${escapeXml(it.article || it.id)}</Артикул>
\t\t\t\t\t<Наименование>${escapeXml(it.name)}</Наименование>
\t\t\t\t\t<БазоваяЕдиница Код="${escapeXml(it.unitCode)}" НаименованиеПолное="${escapeXml(it.unitName)}">${escapeXml(it.unitName)}</БазоваяЕдиница>
\t\t\t\t\t<Количество>${it.quantity}</Количество>
\t\t\t\t\t<СебестоимостьЗаЕдиницу>${unitCostRub}</СебестоимостьЗаЕдиницу>
\t\t\t\t\t<Сумма>${totalCostRub}</Сумма>
\t\t\t\t\t<СчетДебета>${escapeXml(it.debitAccount)}</СчетДебета>
\t\t\t\t\t<СчетКредита>${escapeXml(it.creditAccount)}</СчетКредита>
\t\t\t\t\t<СтатьяЗатрат>${escapeXml(it.costItemTitleRu)}</СтатьяЗатрат>${batchInfo}${expInfo}${csoCycleInfo}
\t\t\t\t</Материал>`;
		})
		.join("\n");
}

function renderPayrollEmployeesCommerceMl(
	employees: readonly OneCPayrollEmployeeItem[],
): string {
	return employees
		.map((emp) => {
			const grossRub = formatKopToRub(emp.grossEarnedKopecks);
			const ndflRub = formatKopToRub(emp.ndfl13Kopecks);
			const socialRub = formatKopToRub(emp.socialInsuranceTaxesKopecks);
			const netRub = formatKopToRub(emp.netPayoutKopecks);

			return `\t\t\t\t<Сотрудник>
\t\t\t\t\t<Ид>${escapeXml(emp.id)}</Ид>
\t\t\t\t\t<ТабельныйНомер>${escapeXml(emp.employeeTabNumber)}</ТабельныйНомер>
\t\t\t\t\t<ФИО>${escapeXml(emp.employeeName)}</ФИО>
\t\t\t\t\t<Должность>${escapeXml(emp.positionTitleRu)}</Должность>
\t\t\t\t\t<Специальность>${escapeXml(emp.specialtyRu)}</Специальность>
\t\t\t\t\t<ВидНачисления>${escapeXml(emp.calculationTypeTitleRu)}</ВидНачисления>
\t\t\t\t\t<СуммаНачислено>${grossRub}</СуммаНачислено>
\t\t\t\t\t<СуммаНДФЛ>${ndflRub}</СуммаНДФЛ>
\t\t\t\t\t<СуммаСтраховыеВзносы>${socialRub}</СуммаСтраховыеВзносы>
\t\t\t\t\t<СуммаКВыплате>${netRub}</СуммаКВыплате>
\t\t\t\t\t<СчетДебета>${escapeXml(emp.debitAccount)}</СчетДебета>
\t\t\t\t\t<СчетКредитаЗарплата>${escapeXml(emp.creditAccountPayroll)}</СчетКредитаЗарплата>
\t\t\t\t\t<СчетКредитаНДФЛ>${escapeXml(emp.creditAccountNdfl)}</СчетКредитаНДФЛ>
\t\t\t\t\t<СчетКредитаВзносы>${escapeXml(emp.creditAccountSocial)}</СчетКредитаВзносы>
\t\t\t\t\t<СтатьяЗатрат>${escapeXml(emp.costItemTitleRu)}</СтатьяЗатрат>
\t\t\t\t</Сотрудник>`;
		})
		.join("\n");
}

/**
 * Generates official 1C:Enterprise CommerceML 2.09 Multi-Document Package XML.
 */
export function generateCommerceMl209PackageXml(pkg: OneCCommerceMlPackage): string {
	const clinic = pkg.clinic;
	const accounts = pkg.chartOfAccounts || DEFAULT_1C_CHART_OF_ACCOUNTS;
	const salesDoc = pkg.retailSalesDocument;
	const writeoffDoc = pkg.materialWriteoffDocument;
	const payrollDoc = pkg.payrollDocument;
	const medicalActs = pkg.medicalActs || [];

	const salesTotalRub = formatKopToRub(salesDoc.totalRevenueKopecks);
	const writeoffTotalRub = formatKopToRub(writeoffDoc.totalCostKopecks);
	const salesSha = salesDoc.sha256Hash || computeCommerceMlSha256(salesDoc);
	const writeoffSha = writeoffDoc.sha256Hash || computeCommerceMlSha256(writeoffDoc);

	const bankSection = clinic.bankAccount
		? `<РасчетныеСчета>
				<РасчетныйСчет>
					<НомерСчета>${escapeXml(clinic.bankAccount)}</НомерСчета>
					<Банк>
						<БИК>${escapeXml(clinic.bankBik || "")}</БИК>
						<Наименование>${escapeXml(clinic.bankName || "")}</Наименование>
						<КорСчет>${escapeXml(clinic.bankCorrAccount || "")}</КорСчет>
					</Банк>
				</РасчетныйСчет>
			</РасчетныеСчета>`
		: "";

	const medicalActsXml =
		medicalActs.length > 0
			? `\n${medicalActs.map((act) => renderMedicalActDocumentCommerceMl(act, clinic, accounts)).join("\n")}`
			: "";

	const payrollDocXml = payrollDoc
		? `\n\t<!-- Документ: Отражение зарплаты в бухучете (Форма Т-51 / Т-13) -->
\t<Документ>
\t\t<Ид>${escapeXml(payrollDoc.id)}</Ид>
\t\t<Номер>${escapeXml(payrollDoc.documentNumber)}</Номер>
\t\t<Дата>${escapeXml(payrollDoc.documentDateIso)}</Дата>
\t\t<Время>${escapeXml(payrollDoc.documentTime)}</Время>
\t\t<ХозяйственнаяОперация>Отражение зарплаты в бухучете</ХозяйственнаяОперация>
\t\t<ПериодРегистрации>${escapeXml(payrollDoc.registrationPeriodIso)}</ПериодРегистрации>
\t\t<Валюта>руб</Валюта>
\t\t<Курс>1</Курс>
\t\t<Сумма>${formatKopToRub(payrollDoc.totalGrossKopecks)}</Сумма>
\t\t<ХэшТранзакцииSHA256>${payrollDoc.sha256Hash || computeCommerceMlSha256(payrollDoc)}</ХэшТранзакцииSHA256>
\t\t<Начисления>
${renderPayrollEmployeesCommerceMl(payrollDoc.employees)}
\t\t</Начисления>
\t\t<ЗначенияРеквизитов>
\t\t\t<ЗначениеРеквизита>
\t\t\t\t<Наименование>Основание</Наименование>
\t\t\t\t<Значение>Расчетная ведомость по форме Т-51 (${escapeXml(payrollDoc.periodLabelRu)})</Значение>
\t\t\t</ЗначениеРеквизита>
\t\t\t<ЗначениеРеквизита>
\t\t\t\t<Наименование>СчетЗарплатыКт</Наименование>
\t\t\t\t<Значение>${escapeXml(accounts.accountPayroll)}</Значение>
\t\t\t</ЗначениеРеквизита>
\t\t\t<ЗначениеРеквизита>
\t\t\t\t<Наименование>СчетНдфлКт</Наименование>
\t\t\t\t<Значение>${escapeXml(accounts.accountNdfl)}</Значение>
\t\t\t</ЗначениеРеквизита>
\t\t\t<ЗначениеРеквизита>
\t\t\t\t<Наименование>СчетВзносовКт</Наименование>
\t\t\t\t<Значение>${escapeXml(accounts.accountSocialTaxes)}</Значение>
\t\t\t</ЗначениеРеквизита>
\t\t\t<ЗначениеРеквизита>
\t\t\t\t<Наименование>Проведен</Наименование>
\t\t\t\t<Значение>true</Значение>
\t\t\t</ЗначениеРеквизита>
\t\t</ЗначенияРеквизитов>
\t</Документ>`
		: "";

	return `<?xml version="1.0" encoding="UTF-8"?>
<КоммерческаяИнформация
	xmlns="${COMMERCEML_XMLNS}"
	xmlns:xs="http://www.w3.org/2001/XMLSchema"
	xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
	ВерсияСхемы="${COMMERCEML_VERSION_209}"
	ДатаФормирования="${escapeXml(pkg.generatedAtIso)}"
	ПериодС="${escapeXml(pkg.exportPeriodStartIso)}"
	ПериодПо="${escapeXml(pkg.exportPeriodEndIso)}">
	<Классификатор>
		<Ид>${escapeXml(clinic.id)}</Ид>
		<Наименование>${escapeXml(clinic.name)}</Наименование>
		<Владелец>
			<Ид>${escapeXml(clinic.id)}</Ид>
			<Наименование>${escapeXml(clinic.name)}</Наименование>
			<ПолноеНаименование>${escapeXml(clinic.fullName || clinic.name)}</ПолноеНаименование>
			<ИНН>${escapeXml(clinic.inn)}</ИНН>
			<КПП>${escapeXml(clinic.kpp || "")}</КПП>
			<ОГРН>${escapeXml(clinic.ogrn || "")}</ОГРН>
			<Адрес>${escapeXml(clinic.address)}</Адрес>
			<Контакты>
				<Контакт>
					<Тип>ТелефонРабочий</Тип>
					<Значение>${escapeXml(clinic.phone)}</Значение>
				</Контакт>
			</Контакты>
			${bankSection}
		</Владелец>
	</Классификатор>

	<!-- Документ 1: Отчет о розничных продажах и кассовых сменах 54-ФЗ -->
	<Документ>
		<Ид>${escapeXml(salesDoc.id)}</Ид>
		<Номер>${escapeXml(salesDoc.documentNumber)}</Номер>
		<Дата>${escapeXml(salesDoc.documentDateIso)}</Дата>
		<Время>${escapeXml(salesDoc.documentTime)}</Время>
		<ХозяйственнаяОперация>Отчет о розничных продажах</ХозяйственнаяОперация>
		<Роль>Продавец</Роль>
		<Валюта>руб</Валюта>
		<Курс>1</Курс>
		<Сумма>${salesTotalRub}</Сумма>
		<Касса>${escapeXml(salesDoc.cashRegisterName)}</Касса>
		<Склад>${escapeXml(salesDoc.warehouseName)}</Склад>
		<ХэшТранзакцииSHA256>${salesSha}</ХэшТранзакцииSHA256>
		<Контрагенты>
			<Контрагент>
				<Ид>retail-population</Ид>
				<Наименование>Розничные покупатели</Наименование>
				<ПолноеНаименование>Розничные покупатели медицинских услуг (физические лица)</ПолноеНаименование>
				<Роль>Покупатель</Роль>
			</Контрагент>
		</Контрагенты>
		<Товары>
${renderRetailSalesItemsCommerceMl(salesDoc.items)}
		</Товары>
		<Оплаты>
${renderRetailSalesPaymentsCommerceMl(salesDoc.payments)}
		</Оплаты>
		<ЗначенияРеквизитов>
			<ЗначениеРеквизита>
				<Наименование>ОсвобождениеОтНДС</Наименование>
				<Значение>${TAX_EXEMPTION_ARTICLE_149_RU}</Значение>
			</ЗначениеРеквизита>
			<ЗначениеРеквизита>
				<Наименование>СчетДоходов</Наименование>
				<Значение>${escapeXml(accounts.accountSalesRevenue)}</Значение>
			</ЗначениеРеквизита>
			<ЗначениеРеквизита>
				<Наименование>СчетРасходов</Наименование>
				<Значение>${escapeXml(accounts.accountSalesCost)}</Значение>
			</ЗначениеРеквизита>
			<ЗначениеРеквизита>
				<Наименование>СчетКасса</Наименование>
				<Значение>${escapeXml(accounts.accountCashDesk)}</Значение>
			</ЗначениеРеквизита>
			<ЗначениеРеквизита>
				<Наименование>СчетЭквайринг</Наименование>
				<Значение>${escapeXml(accounts.accountAcquiringTransit)}</Значение>
			</ЗначениеРеквизита>
			<ЗначениеРеквизита>
				<Наименование>СчетРасчетный</Наименование>
				<Значение>${escapeXml(accounts.accountBankCurrent)}</Значение>
			</ЗначениеРеквизита>
			<ЗначениеРеквизита>
				<Наименование>СчетРасчетов</Наименование>
				<Значение>${escapeXml(accounts.accountRetailBuyers)}</Значение>
			</ЗначениеРеквизита>
			<ЗначениеРеквизита>
				<Наименование>Проведен</Наименование>
				<Значение>true</Значение>
			</ЗначениеРеквизита>
		</ЗначенияРеквизитов>
	</Документ>${medicalActsXml}

	<!-- Документ: Требование-накладная / Списание материалов ЦСО и склада (Счет 10) -->
	<Документ>
		<Ид>${escapeXml(writeoffDoc.id)}</Ид>
		<Номер>${escapeXml(writeoffDoc.documentNumber)}</Номер>
		<Дата>${escapeXml(writeoffDoc.documentDateIso)}</Дата>
		<Время>${escapeXml(writeoffDoc.documentTime)}</Время>
		<ХозяйственнаяОперация>Требование-накладная</ХозяйственнаяОперация>
		<Роль>Склад</Роль>
		<Валюта>руб</Валюта>
		<Курс>1</Курс>
		<Сумма>${writeoffTotalRub}</Сумма>
		<СкладОтправитель>${escapeXml(writeoffDoc.senderWarehouseName)}</СкладОтправитель>
		<ПодразделениеПолучатель>${escapeXml(writeoffDoc.recipientDepartmentName)}</ПодразделениеПолучатель>
		<ХэшТранзакцииSHA256>${writeoffSha}</ХэшТранзакцииSHA256>
		<Материалы>
${renderMaterialWriteoffItemsCommerceMl(writeoffDoc.items)}
		</Материалы>
		<ЗначенияРеквизитов>
			<ЗначениеРеквизита>
				<Наименование>ОснованиеСписания</Наименование>
				<Значение>${escapeXml(writeoffDoc.reasonRu || "Автоматическое списание по нормам BOM и ЦСО")}</Значение>
			</ЗначениеРеквизита>
			<ЗначениеРеквизита>
				<Наименование>СчетЗатратДебет</Наименование>
				<Значение>${escapeXml(accounts.accountProductionCost)}</Значение>
			</ЗначениеРеквизита>
			<ЗначениеРеквизита>
				<Наименование>СчетМатериаловКредит</Наименование>
				<Значение>${escapeXml(accounts.accountMaterials)}</Значение>
			</ЗначениеРеквизита>
			<ЗначениеРеквизита>
				<Наименование>Проведен</Наименование>
				<Значение>true</Значение>
			</ЗначениеРеквизита>
		</ЗначенияРеквизитов>
	</Документ>${payrollDocXml}
</КоммерческаяИнформация>`;
}

// Backward-compatible alias
export const generateCommerceMl209Xml = generateCommerceMl209PackageXml;

/**
 * Generates official 1C:Enterprise EnterpriseData v1.13 XML Package.
 */
export function generateEnterpriseData113Xml(pkg: OneCCommerceMlPackage): string {
	const clinic = pkg.clinic;
	const salesDoc = pkg.retailSalesDocument;
	const writeoffDoc = pkg.materialWriteoffDocument;
	const payrollDoc = pkg.payrollDocument;

	const payrollSection = payrollDoc
		? `\n\t\t<Document.ОтражениеЗарплатыВБухучете>
			<KeyFields>
				<Number>${escapeXml(payrollDoc.documentNumber)}</Number>
				<Date>${escapeXml(payrollDoc.documentDateIso)}T${escapeXml(payrollDoc.documentTime)}</Date>
			</KeyFields>
			<RegistrationPeriod>${escapeXml(payrollDoc.registrationPeriodIso)}</RegistrationPeriod>
			<TotalGross>${formatKopToRub(payrollDoc.totalGrossKopecks)}</TotalGross>
			<TotalNdfl>${formatKopToRub(payrollDoc.totalNdflKopecks)}</TotalNdfl>
			<TotalSocial>${formatKopToRub(payrollDoc.totalSocialTaxesKopecks)}</TotalSocial>
			<TotalNet>${formatKopToRub(payrollDoc.totalNetPayoutKopecks)}</TotalNet>
			<Employees>
${payrollDoc.employees
	.map(
		(emp) => `				<Employee>
					<TabNumber>${escapeXml(emp.employeeTabNumber)}</TabNumber>
					<FullName>${escapeXml(emp.employeeName)}</FullName>
					<Position>${escapeXml(emp.positionTitleRu)}</Position>
					<GrossEarned>${formatKopToRub(emp.grossEarnedKopecks)}</GrossEarned>
					<Ndfl13>${formatKopToRub(emp.ndfl13Kopecks)}</Ndfl13>
					<SocialInsurance>${formatKopToRub(emp.socialInsuranceTaxesKopecks)}</SocialInsurance>
					<NetPayout>${formatKopToRub(emp.netPayoutKopecks)}</NetPayout>
					<DebitAccount>${escapeXml(emp.debitAccount)}</DebitAccount>
					<CreditAccountPayroll>${escapeXml(emp.creditAccountPayroll)}</CreditAccountPayroll>
				</Employee>`,
	)
	.join("\n")}
			</Employees>
		</Document.ОтражениеЗарплатыВБухучете>`
		: "";

	return `<?xml version="1.0" encoding="UTF-8"?>
<Message
	xmlns="${ENTERPRISEDATA_XMLNS}"
	xmlns:xs="http://www.w3.org/2001/XMLSchema"
	xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
	<Header>
		<Format>${ENTERPRISEDATA_XMLNS}</Format>
		<CreationDate>${escapeXml(pkg.generatedAtIso)}</CreationDate>
		<Source>CRM_DENTE</Source>
		<Destination>1C_ACCOUNTING_30</Destination>
		<Prefix>${escapeXml(clinic.prefix1C || "DN")}</Prefix>
	</Header>
	<Body>
		<Document.ОтчетОРозничныхПродажах>
			<KeyFields>
				<Number>${escapeXml(salesDoc.documentNumber)}</Number>
				<Date>${escapeXml(salesDoc.documentDateIso)}T${escapeXml(salesDoc.documentTime)}</Date>
			</KeyFields>
			<Organization>
				<INN>${escapeXml(clinic.inn)}</INN>
				<KPP>${escapeXml(clinic.kpp || "")}</KPP>
				<Name>${escapeXml(clinic.name)}</Name>
			</Organization>
			<CashRegister>${escapeXml(salesDoc.cashRegisterName)}</CashRegister>
			<Warehouse>${escapeXml(salesDoc.warehouseName)}</Warehouse>
			<Amount>${formatKopToRub(salesDoc.totalRevenueKopecks)}</Amount>
			<TaxExemption>${TAX_EXEMPTION_ARTICLE_149_RU}</TaxExemption>
			<Items>
${salesDoc.items
	.map(
		(it) => `				<Item>
					<Code804n>${escapeXml(it.code804n || "")}</Code804n>
					<Name>${escapeXml(it.name)}</Name>
					<Tooth>${it.toothNumber || ""}</Tooth>
					<Quantity>${it.quantity}</Quantity>
					<Price>${formatKopToRub(it.priceKopecks)}</Price>
					<Total>${formatKopToRub(it.totalKopecks)}</Total>
					<Doctor>${escapeXml(it.doctorName || "")}</Doctor>
				</Item>`,
	)
	.join("\n")}
			</Items>
			<Payments>
${salesDoc.payments
	.map(
		(p) => `				<Payment>
					<Type>${escapeXml(p.tenderType)}</Type>
					<Title>${escapeXml(p.tenderTitleRu)}</Title>
					<Amount>${formatKopToRub(p.amountKopecks)}</Amount>
					<Account>${escapeXml(p.accountCode)}</Account>
				</Payment>`,
	)
	.join("\n")}
			</Payments>
		</Document.ОтчетОРозничныхПродажах>

		<Document.ТребованиеНакладная>
			<KeyFields>
				<Number>${escapeXml(writeoffDoc.documentNumber)}</Number>
				<Date>${escapeXml(writeoffDoc.documentDateIso)}T${escapeXml(writeoffDoc.documentTime)}</Date>
			</KeyFields>
			<Organization>
				<INN>${escapeXml(clinic.inn)}</INN>
			</Organization>
			<SenderWarehouse>${escapeXml(writeoffDoc.senderWarehouseName)}</SenderWarehouse>
			<RecipientDepartment>${escapeXml(writeoffDoc.recipientDepartmentName)}</RecipientDepartment>
			<TotalCost>${formatKopToRub(writeoffDoc.totalCostKopecks)}</TotalCost>
			<Reason>${escapeXml(writeoffDoc.reasonRu || "Списание материалов BOM")}</Reason>
			<Materials>
${writeoffDoc.items
	.map(
		(it) => `				<Material>
					<Article>${escapeXml(it.article)}</Article>
					<Name>${escapeXml(it.name)}</Name>
					<Unit>${escapeXml(it.unitName)}</Unit>
					<Quantity>${it.quantity}</Quantity>
					<CostPrice>${formatKopToRub(it.unitCostKopecks)}</CostPrice>
					<TotalCost>${formatKopToRub(it.totalCostKopecks)}</TotalCost>
					<Batch>${escapeXml(it.batchNumber || "")}</Batch>
					<DebitAccount>${escapeXml(it.debitAccount)}</DebitAccount>
					<CreditAccount>${escapeXml(it.creditAccount)}</CreditAccount>
				</Material>`,
	)
	.join("\n")}
			</Materials>
		</Document.ТребованиеНакладная>${payrollSection}
	</Body>
</Message>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// CSV UNIVERSAL EXPORTERS
// ═══════════════════════════════════════════════════════════════════════════

export function generateRetailSalesCsv(doc: OneCRetailSalesDocument): string {
	const header =
		"НомерДокумента;Дата;Касса;Склад;Код804н;Номенклатура;Зуб;ЕдИзм;Количество;Цена;Скидка;Сумма;СтавкаНДС;ВрачФИО;СчетУчета;НоменклатурнаяГруппа\n";
	const rows = doc.items.map((it) => {
		const toothStr = it.toothNumber ? String(it.toothNumber) : "";
		const priceStr = formatKopToRub(it.priceKopecks);
		const discountStr = formatKopToRub(it.discountKopecks);
		const totalStr = formatKopToRub(it.totalKopecks);
		return `"${doc.documentNumber}";"${doc.documentDateIso}";"${doc.cashRegisterName}";"${doc.warehouseName}";"${it.code804n || ""}";"${it.name}";"${toothStr}";"${it.unitName || "шт"}";${it.quantity};${priceStr};${discountStr};${totalStr};"${it.vatRate || "Без НДС"}";"${it.doctorName || ""}";"90.01.1";"${it.nomenclatureGroup || "Стоматологические услуги"}"`;
	});

	return `\uFEFF${header}${rows.join("\n")}`;
}

export function generateMaterialWriteoffCsv(doc: OneCMaterialWriteoffDocument): string {
	const header =
		"НомерДокумента;Дата;СкладОтправитель;ПодразделениеПолучатель;Артикул;Номенклатура;Партия;СрокГодности;ЕдИзм;Количество;Себестоимость;Сумма;СчетДебета;СчетКредита;СтатьяЗатрат\n";
	const rows = doc.items.map((it) => {
		const costStr = formatKopToRub(it.unitCostKopecks);
		const totalStr = formatKopToRub(it.totalCostKopecks);
		return `"${doc.documentNumber}";"${doc.documentDateIso}";"${doc.senderWarehouseName}";"${doc.recipientDepartmentName}";"${it.article}";"${it.name}";"${it.batchNumber || ""}";"${it.expirationDateIso || ""}";"${it.unitName}";${it.quantity};${costStr};${totalStr};"${it.debitAccount}";"${it.creditAccount}";"${it.costItemTitleRu}"`;
	});

	return `\uFEFF${header}${rows.join("\n")}`;
}

export function generatePayrollReflectionCsv(doc: OneCPayrollDocument): string {
	const header =
		"НомерДокумента;Дата;Период;ТабельныйНомер;Сотрудник;Должность;Специальность;ВидНачисления;СуммаНачислено;НДФЛ13;СтраховыеВзносы;КВыплате;СчетДт;СчетКт;СтатьяЗатрат\n";
	const rows = doc.employees.map((emp) => {
		const grossStr = formatKopToRub(emp.grossEarnedKopecks);
		const ndflStr = formatKopToRub(emp.ndfl13Kopecks);
		const socialStr = formatKopToRub(emp.socialInsuranceTaxesKopecks);
		const netStr = formatKopToRub(emp.netPayoutKopecks);
		return `"${doc.documentNumber}";"${doc.documentDateIso}";"${doc.periodLabelRu}";"${emp.employeeTabNumber}";"${emp.employeeName}";"${emp.positionTitleRu}";"${emp.specialtyRu}";"${emp.calculationTypeTitleRu}";${grossStr};${ndflStr};${socialStr};${netStr};"${emp.debitAccount}";"${emp.creditAccountPayroll}";"${emp.costItemTitleRu}"`;
	});

	return `\uFEFF${header}${rows.join("\n")}`;
}

export function generateCombinedCsvBundle(pkg: OneCCommerceMlPackage): {
	retailSalesCsv: string;
	writeoffsCsv: string;
	payrollCsv: string;
} {
	return {
		retailSalesCsv: generateRetailSalesCsv(pkg.retailSalesDocument),
		writeoffsCsv: generateMaterialWriteoffCsv(pkg.materialWriteoffDocument),
		payrollCsv: pkg.payrollDocument
			? generatePayrollReflectionCsv(pkg.payrollDocument)
			: "",
	};
}

export function generateAccountantExecutiveSummary(
	pkg: OneCCommerceMlPackage,
): string {
	const salesTotal = formatKopToRubLocale(
		pkg.retailSalesDocument.totalRevenueKopecks,
	);
	const materialsTotal = formatKopToRubLocale(
		pkg.materialWriteoffDocument.totalCostKopecks,
	);
	const payrollTotal = pkg.payrollDocument
		? formatKopToRubLocale(pkg.payrollDocument.totalGrossKopecks)
		: "0,00 ₽";
	const ndflTotal = pkg.payrollDocument
		? formatKopToRubLocale(pkg.payrollDocument.totalNdflKopecks)
		: "0,00 ₽";
	const netTotal = pkg.payrollDocument
		? formatKopToRubLocale(pkg.payrollDocument.totalNetPayoutKopecks)
		: "0,00 ₽";

	const cashTotal = formatKopToRubLocale(
		pkg.retailSalesDocument.payments
			.filter((p) => p.tenderType === "cash")
			.reduce((s, p) => s + p.amountKopecks, 0),
	);
	const cardTotal = formatKopToRubLocale(
		pkg.retailSalesDocument.payments
			.filter((p) => p.tenderType === "card_acquiring")
			.reduce((s, p) => s + p.amountKopecks, 0),
	);
	const sbpTotal = formatKopToRubLocale(
		pkg.retailSalesDocument.payments
			.filter((p) => p.tenderType === "sbp")
			.reduce((s, p) => s + p.amountKopecks, 0),
	);

	const sha = computeCommerceMlSha256(pkg);

	return `================================================================================
ПАКЕТ ВЫГРУЗКИ В 1С:ПРЕДПРИЯТИЕ 8.3 (CommerceML 2.09)
Организация: ${pkg.clinic.fullName} (ИНН: ${pkg.clinic.inn}, КПП: ${pkg.clinic.kpp || "—"})
Период: ${pkg.exportPeriodStartIso} — ${pkg.exportPeriodEndIso}
Дата и время формирования: ${pkg.generatedAtIso}
Контрольный хэш пакета (SHA-256): ${sha}
================================================================================

1. ДОКУМЕНТ «ОТЧЕТ О РОЗНИЧНЫХ ПРОДАЖАХ» (54-ФЗ)
   Номер: ${pkg.retailSalesDocument.documentNumber} от ${pkg.retailSalesDocument.documentDateIso}
   Касса: ${pkg.retailSalesDocument.cashRegisterName}
   Выручка от медуслуг (Счет 90.01.1): ${salesTotal} (Без НДС, ст. 149 НК РФ)
   Способы оплаты:
     - Наличные в кассу (Счет 50.01): ${cashTotal}
     - Банковские карты / Эквайринг (Счет 57.03): ${cardTotal}
     - СБП / Расчетный счет (Счет 51): ${sbpTotal}

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

// ═══════════════════════════════════════════════════════════════════════════
// REALISTIC SAMPLE FACTORY (FOR PREVIEW & TESTS)
// ═══════════════════════════════════════════════════════════════════════════

export function createRealisticShiftExportPackage(
	dateIso = "2026-08-28",
	clinicOverrides?: Partial<OneCClinicProfile>,
	chartOverrides?: Partial<OneCChartOfAccounts>,
): OneCCommerceMlPackage {
	const clinic: OneCClinicProfile = {
		...DEFAULT_CLINIC_PROFILE_1C,
		...clinicOverrides,
	};
	const chartOfAccounts: OneCChartOfAccounts = {
		...DEFAULT_1C_CHART_OF_ACCOUNTS,
		...chartOverrides,
	};

	const prefix = clinic.prefix1C || "DN";
	const cleanDate = dateIso.replace(/-/g, "");

	const salesItems: OneCRetailSaleItem[] = [
		{
			id: "srv-001",
			code804n: "A16.07.002.001",
			name: "Наложение временной пломбы (световой композит)",
			toothNumber: 16,
			unitCode: DEFAULT_OKEI_PIECE_CODE,
			unitName: DEFAULT_OKEI_PIECE_NAME,
			quantity: 1,
			priceKopecks: 120000,
			discountKopecks: 0,
			totalKopecks: 120000,
			vatRate: "Без НДС",
			vatAmountKopecks: 0,
			doctorName: "Барабаш С.В.",
			nomenclatureGroup: "Терапевтическая стоматология",
		},
		{
			id: "srv-002",
			code804n: "A16.07.030.002",
			name: "Механическая и медикаментозная обработка 3 корневых каналов",
			toothNumber: 16,
			unitCode: DEFAULT_OKEI_PIECE_CODE,
			unitName: DEFAULT_OKEI_PIECE_NAME,
			quantity: 3,
			priceKopecks: 350000,
			discountKopecks: 50000,
			totalKopecks: 1000000,
			vatRate: "Без НДС",
			vatAmountKopecks: 0,
			doctorName: "Барабаш С.В.",
			nomenclatureGroup: "Эндодонтия",
		},
		{
			id: "srv-003",
			code804n: "A16.07.054.001",
			name: "Установка дентального имплантата Straumann BLX Roxolid SLA",
			toothNumber: 46,
			unitCode: DEFAULT_OKEI_PIECE_CODE,
			unitName: DEFAULT_OKEI_PIECE_NAME,
			quantity: 1,
			priceKopecks: 6500000,
			discountKopecks: 0,
			totalKopecks: 6500000,
			vatRate: "Без НДС",
			vatAmountKopecks: 0,
			doctorName: "Васильев Д.М.",
			nomenclatureGroup: "Хирургическая стоматология / Имплантация",
		},
		{
			id: "srv-004",
			code804n: "A16.07.006.002",
			name: "Изготовление коронки из диоксида циркония Prettau (CAD/CAM)",
			toothNumber: 21,
			unitCode: DEFAULT_OKEI_PIECE_CODE,
			unitName: DEFAULT_OKEI_PIECE_NAME,
			quantity: 2,
			priceKopecks: 2800000,
			discountKopecks: 100000,
			totalKopecks: 5500000,
			vatRate: "Без НДС",
			vatAmountKopecks: 0,
			doctorName: "Васильев Д.М.",
			nomenclatureGroup: "Ортопедическая стоматология",
		},
		{
			id: "srv-005",
			code804n: "A16.07.051",
			name: "Профессиональная гигиена полости рта и AirFlow (комплекс)",
			toothNumber: undefined,
			unitCode: DEFAULT_OKEI_PIECE_CODE,
			unitName: DEFAULT_OKEI_PIECE_NAME,
			quantity: 1,
			priceKopecks: 1630000,
			discountKopecks: 0,
			totalKopecks: 1630000,
			vatRate: "Без НДС",
			vatAmountKopecks: 0,
			doctorName: "Барабаш С.В.",
			nomenclatureGroup: "Профилактическая стоматология",
		},
	];

	const totalSalesKopecks = salesItems.reduce((s, it) => s + it.totalKopecks, 0); // 147 500,00 ₽

	const payments: OneCPaymentBreakdownItem[] = [
		{
			id: "pay-001",
			tenderType: "cash",
			tenderTitleRu: "Наличные в кассу (50.01)",
			amountKopecks: 3250000, // 32 500,00 ₽
			accountCode: chartOfAccounts.accountCashDesk,
			fiscalReceiptNumber: "ЧЕК-00042",
			fiscalSign: "99401284",
		},
		{
			id: "pay-002",
			tenderType: "card_acquiring",
			tenderTitleRu: "Оплата банковской картой / Эквайринг (57.03)",
			amountKopecks: 8500000, // 85 000,00 ₽
			accountCode: chartOfAccounts.accountAcquiringTransit,
			acquiringBankName: "ПАО СБЕРБАНК",
			acquiringTerminalId: "POS-00847291",
			acquiringContractNumber: "ACQ-2026-981",
			fiscalReceiptNumber: "ЧЕК-00043",
			fiscalSign: "99401285",
		},
		{
			id: "pay-003",
			tenderType: "sbp",
			tenderTitleRu: "Система быстрых платежей / QR (51)",
			amountKopecks: 3000000, // 30 000,00 ₽
			accountCode: chartOfAccounts.accountBankCurrent,
			fiscalReceiptNumber: "ЧЕК-00044",
			fiscalSign: "99401286",
		},
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
		comment:
			"Кассовая смена закрыта штатно. Выручка фискализирована в ОФД по ФФД 1.2.",
	};
	salesDoc.sha256Hash = computeCommerceMlSha256(salesDoc);

	const writeoffItems: OneCMaterialWriteoffItem[] = [
		{
			id: "mat-001",
			article: "MAT-FLT-250",
			name: "Композит светового отверждения Filtek Supreme XTE Body A2 (шприц 3г)",
			batchNumber: "Партия №2408-A",
			expirationDateIso: "2027-11-30",
			unitCode: DEFAULT_OKEI_PIECE_CODE,
			unitName: "шт",
			quantity: 1,
			unitCostKopecks: 425000, // 4 250,00 ₽
			totalCostKopecks: 425000,
			debitAccount: chartOfAccounts.accountProductionCost,
			creditAccount: chartOfAccounts.accountMaterials,
			costItemTitleRu: "Списание расходных материалов на терапевтический прием",
			relatedServiceCode804n: "A16.07.002.001",
			csoLogId: "CSO-2026-0828-01",
			sterilizerCycleNumber: "Ц-142",
		},
		{
			id: "mat-002",
			article: "MAT-STRAUM-BLX",
			name: "Имплантат Straumann BLX Ø 4.0mm SLActive 10mm (титан Roxolid)",
			batchNumber: "LOT-849201",
			expirationDateIso: "2029-06-30",
			unitCode: DEFAULT_OKEI_PIECE_CODE,
			unitName: "шт",
			quantity: 1,
			unitCostKopecks: 1850000, // 18 500,00 ₽
			totalCostKopecks: 1850000,
			debitAccount: chartOfAccounts.accountProductionCost,
			creditAccount: chartOfAccounts.accountMaterials,
			costItemTitleRu: "Списание имплантационных систем (Хирургия)",
			relatedServiceCode804n: "A16.07.054.001",
			csoLogId: "CSO-2026-0828-02",
			sterilizerCycleNumber: "Ц-143",
		},
		{
			id: "mat-003",
			article: "MAT-SEPT-100",
			name: "Анестетик Септанест с адреналином 1:100 000 (упаковка 50 карпул)",
			batchNumber: "B-202604",
			expirationDateIso: "2028-04-30",
			unitCode: DEFAULT_OKEI_PACK_CODE,
			unitName: "упак",
			quantity: 0.1,
			unitCostKopecks: 550000,
			totalCostKopecks: 55000, // 550,00 ₽
			debitAccount: chartOfAccounts.accountProductionCost,
			creditAccount: chartOfAccounts.accountConsumables,
			costItemTitleRu: "Списание анестетиков и расходников ЦСО",
			relatedServiceCode804n: "A16.07.002.001",
		},
		{
			id: "mat-004",
			article: "MAT-STER-KRAFT",
			name: "Крафт-пакеты самоклеящиеся для стерилизации 100х200 мм (ЦСО)",
			batchNumber: "KP-202601",
			expirationDateIso: "2028-12-31",
			unitCode: DEFAULT_OKEI_PIECE_CODE,
			unitName: "шт",
			quantity: 15,
			unitCostKopecks: 8500,
			totalCostKopecks: 127500, // 1 275,00 ₽
			debitAccount: chartOfAccounts.accountProductionCost,
			creditAccount: chartOfAccounts.accountConsumables,
			costItemTitleRu: "Списание материалов ЦСО и стерилизации (СанПиН)",
			csoLogId: "CSO-2026-0828-03",
			sterilizerCycleNumber: "Ц-144",
		},
	];

	const totalMaterialsCost = writeoffItems.reduce(
		(s, it) => s + it.totalCostKopecks,
		0,
	); // 24 575,00 ₽

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
		reasonRu:
			"Автоматическое списание по нормам BOM и актам стерилизации ЦСО за смену",
	};
	writeoffDoc.sha256Hash = computeCommerceMlSha256(writeoffDoc);

	const payrollEmployees: OneCPayrollEmployeeItem[] = [
		{
			id: "emp-001",
			employeeTabNumber: "ВР-001",
			employeeName: "Барабаш С.В.",
			positionTitleRu: "Врач стоматолог-терапевт",
			specialtyRu: "Терапевтическая стоматология",
			calculationTypeTitleRu: "Сдельная оплата труда (25% от чистой выручки)",
			grossRevenueGeneratedKopecks: 14500000,
			grossEarnedKopecks: 3625000, // 36 250,00 ₽
			ndfl13Kopecks: 471250, // 4 712,50 ₽
			socialInsuranceTaxesKopecks: 1087500, // 10 875,00 ₽ (30%)
			netPayoutKopecks: 3153750, // 31 537,50 ₽
			debitAccount: chartOfAccounts.accountProductionCost,
			creditAccountPayroll: chartOfAccounts.accountPayroll,
			creditAccountNdfl: chartOfAccounts.accountNdfl,
			creditAccountSocial: chartOfAccounts.accountSocialTaxes,
			costItemTitleRu: "Оплата труда врачебного персонала",
		},
		{
			id: "emp-002",
			employeeTabNumber: "ВР-002",
			employeeName: "Васильев Д.М.",
			positionTitleRu: "Врач стоматолог-хирург-имплантолог",
			specialtyRu: "Хирургическая стоматология",
			calculationTypeTitleRu: "Сдельная оплата труда (30% от хирургии)",
			grossRevenueGeneratedKopecks: 6500000,
			grossEarnedKopecks: 1950000, // 19 500,00 ₽
			ndfl13Kopecks: 253500, // 2 535,00 ₽
			socialInsuranceTaxesKopecks: 585000, // 5 850,00 ₽
			netPayoutKopecks: 1696500, // 16 965,00 ₽
			debitAccount: chartOfAccounts.accountProductionCost,
			creditAccountPayroll: chartOfAccounts.accountPayroll,
			creditAccountNdfl: chartOfAccounts.accountNdfl,
			creditAccountSocial: chartOfAccounts.accountSocialTaxes,
			costItemTitleRu: "Оплата труда врачебного персонала",
		},
		{
			id: "emp-003",
			employeeTabNumber: "АС-001",
			employeeName: "Ковалева О.И.",
			positionTitleRu: "Ассистент стоматолога",
			specialtyRu: "Сестринское дело в стоматологии",
			calculationTypeTitleRu: "Почасовая оплата за смену (12 часов)",
			grossRevenueGeneratedKopecks: 0,
			grossEarnedKopecks: 360000, // 3 600,00 ₽
			ndfl13Kopecks: 46800, // 468,00 ₽
			socialInsuranceTaxesKopecks: 108000, // 1 080,00 ₽
			netPayoutKopecks: 313200, // 3 132,00 ₽
			debitAccount: chartOfAccounts.accountProductionCost,
			creditAccountPayroll: chartOfAccounts.accountPayroll,
			creditAccountNdfl: chartOfAccounts.accountNdfl,
			creditAccountSocial: chartOfAccounts.accountSocialTaxes,
			costItemTitleRu: "Оплата труда среднего медицинского персонала",
		},
	];

	const totalGross = payrollEmployees.reduce((s, e) => s + e.grossEarnedKopecks, 0);
	const totalNdfl = payrollEmployees.reduce((s, e) => s + e.ndfl13Kopecks, 0);
	const totalSocial = payrollEmployees.reduce(
		(s, e) => s + e.socialInsuranceTaxesKopecks,
		0,
	);
	const totalNet = payrollEmployees.reduce((s, e) => s + e.netPayoutKopecks, 0);

	const payrollDoc: OneCPayrollDocument = {
		id: `doc-payroll-${cleanDate}`,
		documentNumber: `${prefix}-ФОТ-${cleanDate}`,
		documentDateIso: dateIso,
		documentTime: "21:00:00",
		registrationPeriodIso: `${dateIso.slice(0, 7)}-01`,
		periodLabelRu: `Смена ${dateIso}`,
		employees: payrollEmployees,
		totalGrossKopecks: totalGross,
		totalNdflKopecks: totalNdfl,
		totalSocialTaxesKopecks: totalSocial,
		totalNetPayoutKopecks: totalNet,
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
					id: "act-it-1",
					code804n: "A16.07.002.001",
					name: "Наложение временной пломбы (световой композит)",
					toothNumber: 16,
					unitCode: DEFAULT_OKEI_PIECE_CODE,
					unitName: DEFAULT_OKEI_PIECE_NAME,
					quantity: 1,
					priceKopecks: 120000,
					discountKopecks: 0,
					totalKopecks: 120000,
					vatRate: "Без НДС",
					vatAmountKopecks: 0,
					attendingDoctorName: "Барабаш С.В.",
					attendingDoctorSpecialty: "Стоматолог-терапевт",
				},
				{
					id: "act-it-2",
					code804n: "A16.07.030.002",
					name: "Механическая и медикаментозная обработка 3 корневых каналов",
					toothNumber: 16,
					unitCode: DEFAULT_OKEI_PIECE_CODE,
					unitName: DEFAULT_OKEI_PIECE_NAME,
					quantity: 3,
					priceKopecks: 350000,
					discountKopecks: 50000,
					totalKopecks: 1000000,
					vatRate: "Без НДС",
					vatAmountKopecks: 0,
					attendingDoctorName: "Барабаш С.В.",
					attendingDoctorSpecialty: "Стоматолог-терапевт",
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
