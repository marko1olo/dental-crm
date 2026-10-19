/**
 * packages/shared/src/finance/stomxCashFlowCategories.ts
 *
 * DENTE Dental CRM — Канонические категории движения денежных средств и гармонизатор кассовых операций 54-ФЗ.
 *
 * Invariants & Regulatory Compliance:
 * - 54-FZ & FFD 1.2 Calculation Subjects (услуга=4, товар=1, аванс=3, внереализационный=null)
 * - Mandate 8e: Doctor & Staff Autonomy (1-click operations, zero disabled blockers)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (NO mandatory INN for physical persons!)
 * - Money exact to kopecks (all amounts integer kopecks)
 * - Maximum file length strictly <= 800 lines
 */

import { z } from "zod";

// ============================================================================
// 1. CASH RECEIPT / INFLOW TYPES (ПРИХОДНЫЕ ОПЕРАЦИИ КАССЫ)
// ============================================================================

import {
	CASH_RECEIPT_TYPE_ALIASES,
	cashReceiptTypeAliasSchema,
	type CashReceiptTypeAlias,
	CASH_RECEIPT_CATALOG,
	CASH_RECEIPT_BY_ALIAS,
	CASH_RECEIPT_BY_ID,
	CASH_EXPENSE_TYPE_ALIASES,
	cashExpenseTypeAliasSchema,
	type CashExpenseTypeAlias,
	CASH_EXPENSE_CATALOG,
	CASH_EXPENSE_BY_ALIAS,
	CASH_EXPENSE_BY_ID,
	type CashExpenseItem,
	type CashReceiptItem,
	CASH_EXPENSE_PNL_CATEGORIES,
	cashExpensePnlCategorySchema,
	type CashExpensePnlCategory,
	// Backward-compatibility aliases
	STOMX_RECEIPT_TYPE_ALIASES,
	stomxReceiptTypeAliasSchema,
	type StomxReceiptTypeAlias,
	STOMX_CASH_RECEIPT_CATALOG,
	STOMX_CASH_RECEIPT_BY_ALIAS,
	STOMX_CASH_RECEIPT_BY_ID,
	STOMX_EXPENSE_TYPE_ALIASES,
	stomxExpenseTypeAliasSchema,
	type StomxExpenseTypeAlias,
	STOMX_CASH_EXPENSE_CATALOG,
	STOMX_CASH_EXPENSE_BY_ALIAS,
	STOMX_CASH_EXPENSE_BY_ID,
	type StomxCashExpenseItem,
	type StomxCashReceiptItem,
	STOMX_EXPENSE_PNL_CATEGORIES,
	stomxExpensePnlCategorySchema,
	type StomxExpensePnlCategory,
} from "./stomxCashFlowCatalogs.js";

export {
	CASH_RECEIPT_TYPE_ALIASES,
	cashReceiptTypeAliasSchema,
	type CashReceiptTypeAlias,
	CASH_RECEIPT_CATALOG,
	CASH_RECEIPT_BY_ALIAS,
	CASH_RECEIPT_BY_ID,
	CASH_EXPENSE_TYPE_ALIASES,
	cashExpenseTypeAliasSchema,
	type CashExpenseTypeAlias,
	CASH_EXPENSE_CATALOG,
	CASH_EXPENSE_BY_ALIAS,
	CASH_EXPENSE_BY_ID,
	type CashExpenseItem,
	type CashReceiptItem,
	CASH_EXPENSE_PNL_CATEGORIES,
	cashExpensePnlCategorySchema,
	type CashExpensePnlCategory,
	// Backward-compatibility aliases
	STOMX_RECEIPT_TYPE_ALIASES,
	stomxReceiptTypeAliasSchema,
	type StomxReceiptTypeAlias,
	STOMX_CASH_RECEIPT_CATALOG,
	STOMX_CASH_RECEIPT_BY_ALIAS,
	STOMX_CASH_RECEIPT_BY_ID,
	STOMX_EXPENSE_TYPE_ALIASES,
	stomxExpenseTypeAliasSchema,
	type StomxExpenseTypeAlias,
	STOMX_CASH_EXPENSE_CATALOG,
	STOMX_CASH_EXPENSE_BY_ALIAS,
	STOMX_CASH_EXPENSE_BY_ID,
	type StomxCashExpenseItem,
	type StomxCashReceiptItem,
	STOMX_EXPENSE_PNL_CATEGORIES,
	stomxExpensePnlCategorySchema,
	type StomxExpensePnlCategory,
};

/**
 * ФФД 1.2 Признак предмета расчета (тег 1212):
 * 1 = Товар (COMMODITY)
 * 3 = Аванс / Предоплата (ADVANCE)
 * 4 = Услуга (SERVICE)
 * null = Внереализационная операция / Не подлежит фискализации чеком (NON_FISCAL)
 */
export type FfdCalculationSubjectCode = 1 | 3 | 4 | null;

export type CashReceiptTypeMeta = CashReceiptItem;
export type StomxCashReceiptTypeMeta = CashReceiptTypeMeta;

export const CASH_RECEIPT_CATEGORIES = CASH_RECEIPT_CATALOG;
export const STOMX_CASH_RECEIPT_CATEGORIES = CASH_RECEIPT_CATEGORIES;

// ============================================================================
// 2. CASH EXPENSE / OUTFLOW TYPES (РАСХОДНЫЕ ОПЕРАЦИИ И ИЗЪЯТИЯ КАССЫ)
// ============================================================================

export const CASH_EXPENSE_PNL_LABELS_RU: Record<CashExpensePnlCategory, string> = {
	salaries: "ФОТ и заработная плата персонала",
	materials: "Стоматологические материалы и медикаменты",
	household: "Хозяйственные нужды и клининг",
	rent: "Аренда помещений и коммунальные платежи",
	taxes: "Налоги, банковский эквайринг и сборы",
	lab: "Оплата услуг зуботехнических лабораторий (ЗТЛ)",
	encashment: "Инкассация наличных денежных средств",
	refund: "Возврат денежных средств пациенту",
	other: "Прочие управленческие расходы",
};
export const STOMX_EXPENSE_PNL_LABELS_RU = CASH_EXPENSE_PNL_LABELS_RU;

export type CashExpenseTypeMeta = CashExpenseItem;
export type StomxCashExpenseTypeMeta = CashExpenseTypeMeta;

export const CASH_EXPENSE_CATEGORIES = CASH_EXPENSE_CATALOG;
export const STOMX_CASH_EXPENSE_CATEGORIES = CASH_EXPENSE_CATEGORIES;

// ============================================================================
// 2.1 CASH BOXES & REGISTERS (СПРАВОЧНИК КАСС КЛИНИКИ)
// ============================================================================

export const CASH_BOX_TYPES = [
	"main",     // id: 1, Основная
	"extra",    // id: 2, Дополнительная
	"cashless", // id: 3, Безналичный расчет
	"dms",      // id: 4, ДМС
	"account",  // id: 5, Расчетный счет
	"expenses", // id: 6, Расходы
] as const;
export const STOMX_CASH_BOX_TYPES = CASH_BOX_TYPES;

export const cashBoxTypeSchema = z.enum(CASH_BOX_TYPES);
export const stomxCashBoxTypeSchema = cashBoxTypeSchema;
export type CashBoxType = z.infer<typeof cashBoxTypeSchema>;
export type StomxCashBoxType = CashBoxType;

export interface CashBoxMeta {
	readonly id: number;
	readonly type: CashBoxType;
	readonly name: string;
	readonly isMain: boolean;
	readonly isCashless: boolean;
	readonly order: number;
	readonly descriptionRu: string;
}
export type StomxCashBoxMeta = CashBoxMeta;

export const CASH_BOXES: readonly CashBoxMeta[] = [
	{
		id: 1,
		type: "main",
		name: "Основная",
		isMain: true,
		isCashless: false,
		order: 1,
		descriptionRu: "Основная касса наличных средств и эквайринга клиники",
	},
	{
		id: 2,
		type: "extra",
		name: "Дополнительная",
		isMain: false,
		isCashless: false,
		order: 2,
		descriptionRu: "Дополнительная касса / операционная касса второго администратора",
	},
	{
		id: 3,
		type: "cashless",
		name: "Безналичный расчет",
		isMain: false,
		isCashless: true,
		order: 3,
		descriptionRu: "Безналичные поступления по терминалам эквайринга и СБП",
	},
	{
		id: 4,
		type: "dms",
		name: "ДМС",
		isMain: false,
		isCashless: false,
		order: 4,
		descriptionRu: "Касса расчетов со страховыми компаниями по программам ДМС",
	},
	{
		id: 5,
		type: "account",
		name: "Расчетный счет",
		isMain: false,
		isCashless: true,
		order: 5,
		descriptionRu: "Банковский расчетный счет организации / ИП в банке",
	},
	{
		id: 6,
		type: "expenses",
		name: "Расходы",
		isMain: false,
		isCashless: false,
		order: 6,
		descriptionRu: "Касса операционных расходов и выдачи подотчетных сумм",
	},
] as const;
export const STOMX_CASH_BOXES = CASH_BOXES;

export const CASH_BOX_BY_TYPE = Object.freeze(
	Object.fromEntries(
		CASH_BOXES.map((b) => [b.type, b]),
	) as Record<CashBoxType, CashBoxMeta>,
);
export const STOMX_CASH_BOX_BY_TYPE = CASH_BOX_BY_TYPE;

export const CASH_BOX_BY_ID = Object.freeze(
	Object.fromEntries(
		CASH_BOXES.map((b) => [b.id, b]),
	) as Record<number, CashBoxMeta>,
);
export const STOMX_CASH_BOX_BY_ID = CASH_BOX_BY_ID;

export function getCashBoxByType(
	type: string,
): CashBoxMeta | undefined {
	return CASH_BOX_BY_TYPE[type as CashBoxType];
}
export const getStomxCashBoxByType = getCashBoxByType;

export function getCashBoxById(
	id: number,
): CashBoxMeta | undefined {
	return CASH_BOX_BY_ID[id];
}
export const getStomxCashBoxById = getCashBoxById;

// ============================================================================
// 3. PAYMENT METHOD & TENDER SCHEMAS (СПОСОБЫ ОПЛАТЫ И ТЕНДЕРЫ ПО 54-ФЗ)
// ============================================================================

export const CASH_TENDER_METHODS = [
	"cash",           // Наличные
	"card",           // Банковская карта через терминал
	"sbp",            // СБП (QR-код динамический/статический)
	"advance",        // Зачет аванса / Личный баланс
	"family_advance", // Зачет аванса из семейного баланса
	"bank_transfer",  // Безналичный расчет по счету (юрлица / ИП)
	"dms",            // Гарантийное письмо страховой ДМС
	"installment",    // Внутренняя или банковская рассрочка
] as const;

export const cashTenderMethodSchema = z.enum(CASH_TENDER_METHODS);
export type CashTenderMethod = z.infer<typeof cashTenderMethodSchema>;

export const CASH_TENDER_LABELS_RU: Record<CashTenderMethod, string> = {
	cash: "Наличные рубли",
	card: "Банковская карта (эквайринг)",
	sbp: "Система быстрых платежей (СБП)",
	advance: "Личный аванс / депозит",
	family_advance: "Общий семейный аванс",
	bank_transfer: "Безналичный расчет по реквизитам",
	dms: "Страховая компания ДМС",
	installment: "Рассрочка платежа",
};

/**
 * Валидатор физического лица по 54-ФЗ:
 * По закону 54-ФЗ физлицо НЕ ОБЯЗАНО предоставлять ИНН при оплате наличными или картой.
 * Требование ИНН обязательно только для юрлиц и индивидуальных предпринимателей.
 */
export const payerPartySchema = z.object({
	partyType: z.enum(["individual", "legal_entity", "sole_proprietor"]).default("individual"),
	fullName: z.string().min(1, "ФИО или наименование плательщика обязательно"),
	inn: z
		.string()
		.trim()
		.regex(/^(?:\d{10}|\d{12})?$/, "ИНН юрлица должен содержать 10 цифр, ИП — 12 цифр")
		.optional()
		.nullable(),
	email: z.string().email().optional().nullable(),
	phone: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
	// Мандат 8e / 8n: физлицам ИНН никогда не требуется
	if (data.partyType !== "individual" && (!data.inn || data.inn.length === 0)) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: "Для юрлиц и ИП по 54-ФЗ требуется указание ИНН",
			path: ["inn"],
		});
	}
});
export const stomxPayerPartySchema = payerPartySchema;
export type PayerParty = z.infer<typeof payerPartySchema>;
export type StomxPayerParty = PayerParty;

/**
 * Запись приходной кассовой операции
 */
export const cashReceiptRecordSchema = z.object({
	id: z.string().uuid().optional(),
	organizationId: z.string().uuid(),
	branchId: z.string().uuid().optional().nullable(),
	receiptTypeAlias: cashReceiptTypeAliasSchema,
	amountKopecks: z
		.number()
		.int("Сумма должна быть целым числом копеек")
		.positive("Сумма должна быть строго больше нуля"),
	paymentMethod: cashTenderMethodSchema.default("cash"),
	payer: payerPartySchema,
	patientId: z.string().uuid().optional().nullable(),
	appointmentId: z.string().uuid().optional().nullable(),
	invoiceId: z.string().uuid().optional().nullable(),
	comment: z.string().max(1000).optional().nullable(),
	fiscalReceiptNumber: z.string().optional().nullable(),
	isFiscalPrinted: z.boolean().default(false),
	createdAt: z.string().datetime().optional(),
});
export const stomxCashReceiptRecordSchema = cashReceiptRecordSchema;
export type CashReceiptRecord = z.infer<typeof cashReceiptRecordSchema>;
export type StomxCashReceiptRecord = CashReceiptRecord;

/**
 * Запись расходной кассовой операции
 */
export const cashExpenseRecordSchema = z.object({
	id: z.string().uuid().optional(),
	organizationId: z.string().uuid(),
	branchId: z.string().uuid().optional().nullable(),
	expenseTypeAlias: cashExpenseTypeAliasSchema,
	pnlCategory: cashExpensePnlCategorySchema,
	amountKopecks: z
		.number()
		.int("Сумма должна быть целым числом копеек")
		.positive("Сумма должна быть строго больше нуля"),
	recipientName: z.string().min(1, "Получатель денежных средств обязателен"),
	employeeId: z.string().uuid().optional().nullable(),
	contractorId: z.string().uuid().optional().nullable(),
	patientId: z.string().uuid().optional().nullable(),
	comment: z.string().max(1000).optional().nullable(),
	isFiscalRefundPrinted: z.boolean().default(false),
	createdAt: z.string().datetime().optional(),
});
export const stomxCashExpenseRecordSchema = cashExpenseRecordSchema;
export type CashExpenseRecord = z.infer<typeof cashExpenseRecordSchema>;
export type StomxCashExpenseRecord = CashExpenseRecord;

// ============================================================================
// 4. BUSINESS LOGIC HELPERS & HARMONIZATION UTILITIES
// ============================================================================

/**
 * Находит метаданные типа поступления по его псевдониму
 */
export function getCashReceiptTypeByAlias(
	alias: string,
): CashReceiptTypeMeta | undefined {
	return CASH_RECEIPT_BY_ALIAS[alias as CashReceiptTypeAlias];
}
export const getStomxReceiptTypeByAlias = getCashReceiptTypeByAlias;

/**
 * Находит метаданные типа поступления по числовому ID
 */
export function getCashReceiptTypeById(
	id: number,
): CashReceiptTypeMeta | undefined {
	return CASH_RECEIPT_BY_ID[id];
}
export const getStomxReceiptTypeById = getCashReceiptTypeById;

/**
 * Находит метаданные типа расхода по его псевдониму
 */
export function getCashExpenseTypeByAlias(
	alias: string,
): CashExpenseTypeMeta | undefined {
	return CASH_EXPENSE_BY_ALIAS[alias as CashExpenseTypeAlias];
}
export const getStomxExpenseTypeByAlias = getCashExpenseTypeByAlias;

/**
 * Находит метаданные типа расхода по числовому ID
 */
export function getCashExpenseTypeById(
	id: number,
): CashExpenseTypeMeta | undefined {
	return CASH_EXPENSE_BY_ID[id];
}
export const getStomxExpenseTypeById = getCashExpenseTypeById;

/**
 * Определяет, подлежит ли операция поступления выдаче чека 54-ФЗ
 */
export function isFiscalReceiptOperation(alias: CashReceiptTypeAlias): boolean {
	return CASH_RECEIPT_BY_ALIAS[alias]?.isFiscal ?? false;
}

/**
 * Определяет, является ли расходная операция фискальным возвратом прихода по 54-ФЗ
 */
export function isFiscalRefundOperation(alias: CashExpenseTypeAlias): boolean {
	return CASH_EXPENSE_BY_ALIAS[alias]?.isFiscalRefund ?? false;
}

/**
 * Сопоставляет расход с управленческой статьей P&L с учетом контекста
 */
export function mapCashExpenseToPnlCategory(
	alias: CashExpenseTypeAlias,
	explicitCategory?: CashExpensePnlCategory,
): CashExpensePnlCategory {
	if (explicitCategory) {
		return explicitCategory;
	}
	const meta = CASH_EXPENSE_BY_ALIAS[alias];
	if (meta?.defaultPnlCategory) {
		return meta.defaultPnlCategory as CashExpensePnlCategory;
	}
	return "other";
}
export const mapStomxExpenseToPnlCategory = mapCashExpenseToPnlCategory;

/**
 * Мандат 8e / 8n: Проверка оплаты физического лица.
 * Физические лица не блокируются при отсутствии ИНН.
 * Проверяет, что сумма строго в копейках и положительна.
 */
export function validatePhysicalPersonPayment(
	amountKopecks: number,
	payerName: string,
): { isValid: boolean; error?: string } {
	if (!Number.isInteger(amountKopecks) || amountKopecks <= 0) {
		return {
			isValid: false,
			error: "Сумма операции должна быть положительным целым числом копеек",
		};
	}
	if (!payerName || payerName.trim().length === 0) {
		return {
			isValid: false,
			error: "Имя или ФИО плательщика не может быть пустым",
		};
	}
	return { isValid: true };
}
