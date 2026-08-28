/**
 * DENTE Dental CRM — 1C:Enterprise (1С:Предприятие 8.3 / Бухгалтерия 3.0 / Управление торговлей / EnterpriseData)
 * Statutory CommerceML 2.09 & EnterpriseData v1.13 Multi-Document Package Export Engine.
 *
 * Implements Russian statutory export standards for:
 * 1. «Отчет о розничных продажах» (выручка, услуги по 804н, кассы, эквайринг, СБП, освобождение от НДС ст. 149 НК РФ).
 * 2. «Требование-накладная / Списание материалов» (списанные по нормам BOM медикаменты, партии, склады, счета 10.01 / 20.01).
 * 3. «Отражение зарплаты в бухучете» (сдельные начисления врачей, смены ассистентов, НДФЛ 13%, взносы 30%, счета 70 / 68.01 / 69.01 / 20.01).
 *
 * Invariants:
 * - Strict integer kopeck math (Kopecks): line item totals strictly equal document totals.
 * - Multi-tender payments (Cash 50.01, Acquiring 57.03, SBP 51) strictly balance total sales.
 * - Full XML 1.0 entity escaping and UTF-8 compliance.
 * - Multi-format export: CommerceML 2.09 XML, EnterpriseData 1.13 XML, and CSV universal exchange tables.
 */

import { z } from "zod";
import { escapeXml } from "@dental/shared";
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
	phone: "+7 (495) 123-45-67",
	email: "buh@dente-clinic.ru",
	bankAccount: "40702810938000012345",
	bankBik: "044525225",
	bankName: "ПАО СБЕРБАНК Г. МОСКВА",
	bankCorrAccount: "30101810400000000225",
	chiefDoctorName: "Барабаш С.В.",
	chiefAccountantName: "Смирнова Е.А.",
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

// ═══════════════════════════════════════════════════════════════════════════
// XML GENERATOR: COMMERCEML 2.09 PACKAGE
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

			return `\t\t\t\t<Оплата>
\t\t\t\t\t<Ид>${escapeXml(p.id)}</Ид>
\t\t\t\t\t<ВидОплаты>${escapeXml(p.tenderTitleRu)}</ВидОплаты>
\t\t\t\t\t<ТипОплаты>${escapeXml(p.tenderType)}</ТипОплаты>
\t\t\t\t\t<Сумма>${sumRub}</Сумма>
\t\t\t\t\t<СчетУчета>${escapeXml(p.accountCode)}</СчетУчета>${acquiringInfo}${terminalInfo}
\t\t\t\t</Оплата>`;
		})
		.join("\n");
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
\t\t\t\t\t<СтатьяЗатрат>${escapeXml(it.costItemTitleRu)}</СтатьяЗатрат>${batchInfo}${expInfo}
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
export function generateCommerceMl209Xml(pkg: OneCCommerceMlPackage): string {
	const clinic = pkg.clinic;
	const salesDoc = pkg.retailSalesDocument;
	const writeoffDoc = pkg.materialWriteoffDocument;
	const payrollDoc = pkg.payrollDocument;

	const salesTotalRub = formatKopToRub(salesDoc.totalRevenueKopecks);
	const writeoffTotalRub = formatKopToRub(writeoffDoc.totalCostKopecks);
	const payrollTotalRub = formatKopToRub(payrollDoc.totalGrossKopecks);

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

	return `<?xml version="1.0" encoding="UTF-8"?>
<КоммерческаяИнформация
	xmlns="urn:1C.ru:commerceml_2"
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

	<!-- Документ 1: Отчет о розничных продажах -->
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
				<Значение>${escapeXml(pkg.chartOfAccounts.accountSalesRevenue)}</Значение>
			</ЗначениеРеквизита>
			<ЗначениеРеквизита>
				<Наименование>СчетРасходов</Наименование>
				<Значение>${escapeXml(pkg.chartOfAccounts.accountSalesCost)}</Значение>
			</ЗначениеРеквизита>
			<ЗначениеРеквизита>
				<Наименование>Проведен</Наименование>
				<Значение>true</Значение>
			</ЗначениеРеквизита>
		</ЗначенияРеквизитов>
	</Документ>

	<!-- Документ 2: Требование-накладная / Списание материалов по нормам BOM -->
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
		<Материалы>
${renderMaterialWriteoffItemsCommerceMl(writeoffDoc.items)}
		</Материалы>
		<ЗначенияРеквизитов>
			<ЗначениеРеквизита>
				<Наименование>ОснованиеСписания</Наименование>
				<Значение>${escapeXml(writeoffDoc.reasonRu || "Автоматическое списание по нормам BOM")}</Значение>
			</ЗначениеРеквизита>
			<ЗначениеРеквизита>
				<Наименование>СчетЗатратДебет</Наименование>
				<Значение>${escapeXml(pkg.chartOfAccounts.accountProductionCost)}</Значение>
			</ЗначениеРеквизита>
			<ЗначениеРеквизита>
				<Наименование>СчетМатериаловКредит</Наименование>
				<Значение>${escapeXml(pkg.chartOfAccounts.accountMaterials)}</Значение>
			</ЗначениеРеквизита>
			<ЗначениеРеквизита>
				<Наименование>Проведен</Наименование>
				<Значение>true</Значение>
			</ЗначениеРеквизита>
		</ЗначенияРеквизитов>
	</Документ>

	<!-- Документ 3: Отражение зарплаты в бухучете -->
	<Документ>
		<Ид>${escapeXml(payrollDoc.id)}</Ид>
		<Номер>${escapeXml(payrollDoc.documentNumber)}</Номер>
		<Дата>${escapeXml(payrollDoc.documentDateIso)}</Дата>
		<Время>${escapeXml(payrollDoc.documentTime)}</Время>
		<ХозяйственнаяОперация>Отражение зарплаты в бухучете</ХозяйственнаяОперация>
		<ПериодРегистрации>${escapeXml(payrollDoc.registrationPeriodIso)}</ПериодРегистрации>
		<Валюта>руб</Валюта>
		<Курс>1</Курс>
		<Сумма>${payrollTotalRub}</Сумма>
		<Начисления>
${renderPayrollEmployeesCommerceMl(payrollDoc.employees)}
		</Начисления>
		<ЗначенияРеквизитов>
			<ЗначениеРеквизита>
				<Наименование>Основание</Наименование>
				<Значение>Расчетная ведомость по форме Т-51 (${escapeXml(payrollDoc.periodLabelRu)})</Значение>
			</ЗначениеРеквизита>
			<ЗначениеРеквизита>
				<Наименование>СчетЗарплатыКт</Наименование>
				<Значение>${escapeXml(pkg.chartOfAccounts.accountPayroll)}</Значение>
			</ЗначениеРеквизита>
			<ЗначениеРеквизита>
				<Наименование>СчетНдфлКт</Наименование>
				<Значение>${escapeXml(pkg.chartOfAccounts.accountNdfl)}</Значение>
			</ЗначениеРеквизита>
			<ЗначениеРеквизита>
				<Наименование>СчетВзносовКт</Наименование>
				<Значение>${escapeXml(pkg.chartOfAccounts.accountSocialTaxes)}</Значение>
			</ЗначениеРеквизита>
			<ЗначениеРеквизита>
				<Наименование>Проведен</Наименование>
				<Значение>true</Значение>
			</ЗначениеРеквизита>
		</ЗначенияРеквизитов>
	</Документ>
</КоммерческаяИнформация>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// XML GENERATOR: ENTERPRISEDATA v1.13 XML
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generates official 1C:Enterprise EnterpriseData v1.13 XML Package.
 */
export function generateEnterpriseData113Xml(pkg: OneCCommerceMlPackage): string {
	const clinic = pkg.clinic;
	const salesDoc = pkg.retailSalesDocument;
	const writeoffDoc = pkg.materialWriteoffDocument;
	const payrollDoc = pkg.payrollDocument;

	return `<?xml version="1.0" encoding="UTF-8"?>
<Message
	xmlns="http://v8.1c.ru/edi/edi_stnd/EnterpriseData/${ENTERPRISEDATA_VERSION_113}"
	xmlns:xs="http://www.w3.org/2001/XMLSchema"
	xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
	<Header>
		<Format>http://v8.1c.ru/edi/edi_stnd/EnterpriseData/${ENTERPRISEDATA_VERSION_113}</Format>
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
		</Document.ТребованиеНакладная>

		<Document.ОтражениеЗарплатыВБухучете>
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
		</Document.ОтражениеЗарплатыВБухучете>
	</Body>
</Message>`;
}

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
   Оказано услуг: ${sales.items.length} позиций по номенклатуре 804н
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

function writeoffDocNumberSafe(num: string): string {
	return num || "ТРН-001";
}

// ═══════════════════════════════════════════════════════════════════════════
// REALISTIC CLINICAL SHIFT PACKAGE MOCK GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

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
			doctorName: "Барабаш С.В.",
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
			doctorName: "Барабаш С.В.",
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
			employeeName: "Барабаш С.В.",
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
		packageId: `pkg-${dateClean}-${Math.random().toString(36).slice(2, 8)}`,
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
