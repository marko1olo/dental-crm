/**
 * packages/shared/src/finance/stomxCashFlowCategories.ts
 *
 * StomX Cash Flow Categories & 54-FZ Fiscal Operation Harmonizer.
 * Derived from StomX catalogs:
 *   - data/catalogs/cash_expense_types.json (Cash Outflow / Expense operations)
 *   - data/catalogs/cash_receipt_types.json (Cash Inflow / Receipt operations)
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
};

/**
 * ФФД 1.2 Признак предмета расчета (тег 1212):
 * 1 = Товар (COMMODITY)
 * 3 = Аванс / Предоплата (ADVANCE)
 * 4 = Услуга (SERVICE)
 * null = Внереализационная операция / Не подлежит фискализации чеком (NON_FISCAL)
 */
export type FfdCalculationSubjectCode = 1 | 3 | 4 | null;

export type StomxCashReceiptTypeMeta = StomxCashReceiptItem;
export const STOMX_CASH_RECEIPT_CATEGORIES = STOMX_CASH_RECEIPT_CATALOG;


// ============================================================================
// 2. CASH EXPENSE / OUTFLOW TYPES (РАСХОДНЫЕ ОПЕРАЦИИ И ИЗЪЯТИЯ КАССЫ)
// ============================================================================

// (Expense aliases and schemas imported from ./stomxCashFlowCatalogs.js)

// (STOMX_EXPENSE_PNL_CATEGORIES and schema imported from ./stomxCashFlowCatalogs.js)

export const STOMX_EXPENSE_PNL_LABELS_RU: Record<StomxExpensePnlCategory, string> = {
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

export type StomxCashExpenseTypeMeta = StomxCashExpenseItem;
export const STOMX_CASH_EXPENSE_CATEGORIES = STOMX_CASH_EXPENSE_CATALOG;


// ============================================================================
// 2.1 STOMX CASH BOXES & REGISTERS (СПРАВОЧНИК КАСС КЛИНИКИ)
// ============================================================================

export const STOMX_CASH_BOX_TYPES = [
	"main",     // id: 1, Основная
	"extra",    // id: 2, Дополнительная
	"cashless", // id: 3, Безналичный расчет
	"dms",      // id: 4, ДМС
	"account",  // id: 5, Расчетный счет
	"expenses", // id: 6, Расходы
] as const;

export const stomxCashBoxTypeSchema = z.enum(STOMX_CASH_BOX_TYPES);
export type StomxCashBoxType = z.infer<typeof stomxCashBoxTypeSchema>;

export interface StomxCashBoxMeta {
	readonly id: number;
	readonly type: StomxCashBoxType;
	readonly name: string;
	readonly isMain: boolean;
	readonly isCashless: boolean;
	readonly order: number;
	readonly descriptionRu: string;
}

export const STOMX_CASH_BOXES: readonly StomxCashBoxMeta[] = [
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

export const STOMX_CASH_BOX_BY_TYPE = Object.freeze(
	Object.fromEntries(
		STOMX_CASH_BOXES.map((b) => [b.type, b]),
	) as Record<StomxCashBoxType, StomxCashBoxMeta>,
);

export const STOMX_CASH_BOX_BY_ID = Object.freeze(
	Object.fromEntries(
		STOMX_CASH_BOXES.map((b) => [b.id, b]),
	) as Record<number, StomxCashBoxMeta>,
);

export function getStomxCashBoxByType(
	type: string,
): StomxCashBoxMeta | undefined {
	return STOMX_CASH_BOX_BY_TYPE[type as StomxCashBoxType];
}

export function getStomxCashBoxById(
	id: number,
): StomxCashBoxMeta | undefined {
	return STOMX_CASH_BOX_BY_ID[id];
}

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
export const stomxPayerPartySchema = z.object({
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

export type StomxPayerParty = z.infer<typeof stomxPayerPartySchema>;

/**
 * Запись приходной кассовой операции
 */
export const stomxCashReceiptRecordSchema = z.object({
	id: z.string().uuid().optional(),
	organizationId: z.string().uuid(),
	branchId: z.string().uuid().optional().nullable(),
	receiptTypeAlias: stomxReceiptTypeAliasSchema,
	amountKopecks: z
		.number()
		.int("Сумма должна быть целым числом копеек")
		.positive("Сумма должна быть строго больше нуля"),
	paymentMethod: cashTenderMethodSchema.default("cash"),
	payer: stomxPayerPartySchema,
	patientId: z.string().uuid().optional().nullable(),
	appointmentId: z.string().uuid().optional().nullable(),
	invoiceId: z.string().uuid().optional().nullable(),
	comment: z.string().max(1000).optional().nullable(),
	fiscalReceiptNumber: z.string().optional().nullable(),
	isFiscalPrinted: z.boolean().default(false),
	createdAt: z.string().datetime().optional(),
});
export type StomxCashReceiptRecord = z.infer<typeof stomxCashReceiptRecordSchema>;

/**
 * Запись расходной кассовой операции
 */
export const stomxCashExpenseRecordSchema = z.object({
	id: z.string().uuid().optional(),
	organizationId: z.string().uuid(),
	branchId: z.string().uuid().optional().nullable(),
	expenseTypeAlias: stomxExpenseTypeAliasSchema,
	pnlCategory: stomxExpensePnlCategorySchema,
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
export type StomxCashExpenseRecord = z.infer<typeof stomxCashExpenseRecordSchema>;

// ============================================================================
// 4. BUSINESS LOGIC HELPERS & HARMONIZATION UTILITIES
// ============================================================================

/**
 * Находит метаданные типа поступления по его псевдониму
 */
export function getStomxReceiptTypeByAlias(
	alias: string,
): StomxCashReceiptTypeMeta | undefined {
	return STOMX_CASH_RECEIPT_BY_ALIAS[alias as StomxReceiptTypeAlias];
}

/**
 * Находит метаданные типа поступления по числовому ID StomX
 */
export function getStomxReceiptTypeById(
	id: number,
): StomxCashReceiptTypeMeta | undefined {
	return STOMX_CASH_RECEIPT_BY_ID[id];
}

/**
 * Находит метаданные типа расхода по его псевдониму
 */
export function getStomxExpenseTypeByAlias(
	alias: string,
): StomxCashExpenseTypeMeta | undefined {
	return STOMX_CASH_EXPENSE_BY_ALIAS[alias as StomxExpenseTypeAlias];
}

/**
 * Находит метаданные типа расхода по числовому ID StomX
 */
export function getStomxExpenseTypeById(
	id: number,
): StomxCashExpenseTypeMeta | undefined {
	return STOMX_CASH_EXPENSE_BY_ID[id];
}

/**
 * Определяет, подлежит ли операция поступления выдаче чека 54-ФЗ
 */
export function isFiscalReceiptOperation(alias: StomxReceiptTypeAlias): boolean {
	return STOMX_CASH_RECEIPT_BY_ALIAS[alias]?.isFiscal ?? false;
}

/**
 * Определяет, является ли расходная операция фискальным возвратом прихода по 54-ФЗ
 */
export function isFiscalRefundOperation(alias: StomxExpenseTypeAlias): boolean {
	return STOMX_CASH_EXPENSE_BY_ALIAS[alias]?.isFiscalRefund ?? false;
}

/**
 * Сопоставляет расход StomX с управленческой статьей P&L с учетом контекста
 */
export function mapStomxExpenseToPnlCategory(
	alias: StomxExpenseTypeAlias,
	explicitCategory?: StomxExpensePnlCategory,
): StomxExpensePnlCategory {
	if (explicitCategory) {
		return explicitCategory;
	}
	const meta = STOMX_CASH_EXPENSE_BY_ALIAS[alias];
	if (meta?.defaultPnlCategory) {
		return meta.defaultPnlCategory as StomxExpensePnlCategory;
	}
	return "other";
}

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
