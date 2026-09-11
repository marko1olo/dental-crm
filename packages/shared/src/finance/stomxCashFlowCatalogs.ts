/**
 * packages/shared/src/finance/stomxCashFlowCatalogs.ts
 *
 * Statutory 54-FZ & StomX Cash Desk Operation Catalogs (Cash Expense & Receipt Types).
 * Derived directly from StomX enterprise production fixtures:
 *   - data/catalogs/cash_expense_types.json (14 Canonical Expense Types)
 *   - data/catalogs/cash_receipt_types.json (9 Canonical Receipt Types)
 *
 * Invariants & Regulatory Compliance:
 * - 54-FZ & FFD 1.2 Tag 1054 (Calculation Sign: приход / возврат_прихода / расход / возврат_расхода)
 * - FFD 1.2 Tag 1212 (Calculation Subject: товар=1, аванс=3, услуга=4, non-fiscal=null)
 * - Strict Zod validation schemas (stomxCashExpenseItemSchema, stomxCashReceiptItemSchema)
 * - Mandate 8e: Doctor & Cashier Autonomy (1-click operations, zero disabled blockers)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty
 */

import { z } from "zod";

// ============================================================================
// 1. 54-FZ FFD 1.2 TAG 1054 DEFINITIONS & MAPPINGS
// ============================================================================

export const FFD_1054_OPERATION_SIGNS = [
	"приход",
	"возврат_прихода",
	"расход",
	"возврат_расхода",
	"income",
	"income_return",
	"expense",
	"expense_return",
] as const;

export const ffdTag1054Schema = z.union([
	z.enum(FFD_1054_OPERATION_SIGNS),
	z.null(),
]);
export type FfdTag1054Sign = z.infer<typeof ffdTag1054Schema>;

export interface FfdTag1054Descriptor {
	readonly code: 1 | 2 | 3 | 4;
	readonly signRu: "приход" | "возврат_прихода" | "расход" | "возврат_расхода";
	readonly signEn: "income" | "income_return" | "expense" | "expense_return";
	readonly labelRu: string;
	readonly badgeColor: string;
}

export const FFD_TAG_1054_CATALOG: Record<1 | 2 | 3 | 4, FfdTag1054Descriptor> = {
	1: {
		code: 1,
		signRu: "приход",
		signEn: "income",
		labelRu: "Приход",
		badgeColor: "emerald",
	},
	2: {
		code: 2,
		signRu: "возврат_прихода",
		signEn: "income_return",
		labelRu: "Возврат прихода",
		badgeColor: "amber",
	},
	3: {
		code: 3,
		signRu: "расход",
		signEn: "expense",
		labelRu: "Расход",
		badgeColor: "rose",
	},
	4: {
		code: 4,
		signRu: "возврат_расхода",
		signEn: "expense_return",
		labelRu: "Возврат расхода",
		badgeColor: "purple",
	},
};

// ============================================================================
// 2. CASH EXPENSE / OUTFLOW CATALOG (14 CANONICAL STOMX TYPES)
// ============================================================================

export const STOMX_EXPENSE_TYPE_ALIASES = [
	"family_transfer",    // id: 41, Перевод семейного аванса
	"collection",         // id: 1,  Инкассация
	"return_appointment", // id: 12, Возврат денег за прием
	"return_advance",     // id: 2,  Вернуть аванс
	"payment_employee",   // id: 3,  Выдать ДС сотруднику
	"payment_contractor", // id: 4,  Выдать ДС контрагенту
	"return_product",     // id: 14, Возврат товаров
	"service_charge",     // id: 15, Плата за услуги
	"cash_to_balance",    // id: 18, Возврат денег на баланс
	"payment_lab",        // id: 8,  Оплата услуг лаборатории
	"block",              // id: 9,  Блокировка средств для оплаты приема
	"remainder",          // id: 11, Остатки
	"dms_return",         // id: 21, Возврат услуг через ДМС
	"xray_return",        // id: 32, Возврат рентгена
] as const;

export const stomxExpenseTypeAliasSchema = z.enum(STOMX_EXPENSE_TYPE_ALIASES);
export type StomxExpenseTypeAlias = z.infer<typeof stomxExpenseTypeAliasSchema>;

export const STOMX_EXPENSE_PNL_CATEGORIES = [
	"salaries",    // Зарплата и ФОТ персонала
	"materials",   // Стоматологические расходные материалы и медикаменты
	"household",   // Хозяйственные нужды, клининг, канцелярия, чай/кофе
	"rent",        // Аренда помещений и коммунальные услуги
	"taxes",       // Налоги, эквайринг и банковские комиссии
	"lab",         // Зуботехническая лаборатория (ЗТЛ наряды)
	"encashment",  // Инкассация наличных в банк
	"refund",      // Возврат пациенту (деньги за прием, товар, аванс)
	"other",       // Прочие расходы
] as const;

export const stomxExpensePnlCategorySchema = z.enum(STOMX_EXPENSE_PNL_CATEGORIES);
export type StomxExpensePnlCategory = z.infer<typeof stomxExpensePnlCategorySchema>;

export const stomxCashExpenseItemSchema = z.object({
	id: z.number().int().positive(),
	alias: stomxExpenseTypeAliasSchema,
	name: z.string().min(1),
	isPredefined: z.boolean(),
	isLocked: z.boolean(),
	isFiscalRefund: z.boolean().optional(),
	ffdTag1054: z.enum([
		"приход",
		"расход",
		"возврат_прихода",
		"возврат_расхода",
		"income",
		"expense",
		"income_return",
		"expense_return",
	]).nullable(),
	ffdTag1054En: z.enum(["income", "expense", "income_return", "expense_return"]).nullable().optional(),
	ffdTag1054Code: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).nullable().optional(),
	defaultPnlCategory: stomxExpensePnlCategorySchema.optional(),
	descriptionRu: z.string().optional(),
});
export type StomxCashExpenseItem = z.infer<typeof stomxCashExpenseItemSchema>;


export const STOMX_CASH_EXPENSE_CATALOG: readonly StomxCashExpenseItem[] = [
	{
		id: 41,
		alias: "family_transfer",
		name: "Перевод семейного аванса",
		isPredefined: true,
		isLocked: true,
		isFiscalRefund: false,
		ffdTag1054: null,
		ffdTag1054En: null,
		ffdTag1054Code: null,
		defaultPnlCategory: "other",
		descriptionRu: "Внутреннее перемещение средств между балансами членов одной семьи",
	},
	{
		id: 1,
		alias: "collection",
		name: "Инкассация",
		isPredefined: true,
		isLocked: false,
		isFiscalRefund: false,
		ffdTag1054: null,
		ffdTag1054En: null,
		ffdTag1054Code: null,
		defaultPnlCategory: "encashment",
		descriptionRu: "Изъятие наличной выручки из кассы для передачи инкассаторам в банк",
	},
	{
		id: 12,
		alias: "return_appointment",
		name: "Возврат денег за прием",
		isPredefined: false,
		isLocked: true,
		isFiscalRefund: true,
		ffdTag1054: "возврат_прихода",
		ffdTag1054En: "income_return",
		ffdTag1054Code: 2,
		defaultPnlCategory: "refund",
		descriptionRu: "Возврат средств пациенту за неоказанные или гарантийные медицинские услуги",
	},
	{
		id: 2,
		alias: "return_advance",
		name: "Вернуть аванс",
		isPredefined: false,
		isLocked: true,
		isFiscalRefund: true,
		ffdTag1054: "возврат_прихода",
		ffdTag1054En: "income_return",
		ffdTag1054Code: 2,
		defaultPnlCategory: "refund",
		descriptionRu: "Возврат неиспользованного остатка личного/семейного депозита пациенту",
	},
	{
		id: 3,
		alias: "payment_employee",
		name: "Выдать ДС сотруднику",
		isPredefined: false,
		isLocked: false,
		isFiscalRefund: false,
		ffdTag1054: "расход",
		ffdTag1054En: "expense",
		ffdTag1054Code: 3,
		defaultPnlCategory: "salaries",
		descriptionRu: "Выдача наличных под отчет, выплата аванса или зарплаты сотруднику",
	},
	{
		id: 4,
		alias: "payment_contractor",
		name: "Выдать ДС контрагенту",
		isPredefined: false,
		isLocked: false,
		isFiscalRefund: false,
		ffdTag1054: "расход",
		ffdTag1054En: "expense",
		ffdTag1054Code: 3,
		defaultPnlCategory: "materials",
		descriptionRu: "Оплата счетов поставщиков материалов, хозяйственных нужд, аренды или налогов",
	},
	{
		id: 14,
		alias: "return_product",
		name: "Возврат товаров",
		isPredefined: true,
		isLocked: true,
		isFiscalRefund: true,
		ffdTag1054: "возврат_прихода",
		ffdTag1054En: "income_return",
		ffdTag1054Code: 2,
		defaultPnlCategory: "refund",
		descriptionRu: "Возврат средств пациенту при возврате сопутствующих средств гигиены",
	},
	{
		id: 15,
		alias: "service_charge",
		name: "Плата за услуги",
		isPredefined: true,
		isLocked: true,
		isFiscalRefund: false,
		ffdTag1054: "расход",
		ffdTag1054En: "expense",
		ffdTag1054Code: 3,
		defaultPnlCategory: "taxes",
		descriptionRu: "Оплата банковского обслуживания, связи, IT-сервисов и терминалов",
	},
	{
		id: 18,
		alias: "cash_to_balance",
		name: "Возврат денег на баланс",
		isPredefined: true,
		isLocked: true,
		isFiscalRefund: false,
		ffdTag1054: null,
		ffdTag1054En: null,
		ffdTag1054Code: null,
		defaultPnlCategory: "other",
		descriptionRu: "Зачисление сданных наличных средств обратно на виртуальный депозит пациента",
	},
	{
		id: 8,
		alias: "payment_lab",
		name: "Оплата услуг лаборатории",
		isPredefined: true,
		isLocked: true,
		isFiscalRefund: false,
		ffdTag1054: "расход",
		ffdTag1054En: "expense",
		ffdTag1054Code: 3,
		defaultPnlCategory: "lab",
		descriptionRu: "Оплата нарядов зуботехнических лабораторий (коронки, протезы, элайнеры)",
	},
	{
		id: 9,
		alias: "block",
		name: "Блокировка средств для оплаты приема",
		isPredefined: true,
		isLocked: true,
		isFiscalRefund: false,
		ffdTag1054: null,
		ffdTag1054En: null,
		ffdTag1054Code: null,
		defaultPnlCategory: "other",
		descriptionRu: "Резервирование депозита под запланированный дорогостоящий прием",
	},
	{
		id: 11,
		alias: "remainder",
		name: "Остатки",
		isPredefined: true,
		isLocked: true,
		isFiscalRefund: false,
		ffdTag1054: null,
		ffdTag1054En: null,
		ffdTag1054Code: null,
		defaultPnlCategory: "other",
		descriptionRu: "Корректировка остатка денежных средств по результатам ревизии кассы",
	},
	{
		id: 21,
		alias: "dms_return",
		name: "Возврат услуг через ДМС",
		isPredefined: true,
		isLocked: true,
		isFiscalRefund: false,
		ffdTag1054: null,
		ffdTag1054En: null,
		ffdTag1054Code: null,
		defaultPnlCategory: "refund",
		descriptionRu: "Сторнирование оказанных услуг по ДМС и возврат акта страховой компании",
	},
	{
		id: 32,
		alias: "xray_return",
		name: "Возврат рентгена",
		isPredefined: true,
		isLocked: true,
		isFiscalRefund: true,
		ffdTag1054: "возврат_прихода",
		ffdTag1054En: "income_return",
		ffdTag1054Code: 2,
		defaultPnlCategory: "refund",
		descriptionRu: "Возврат средств за невыполненный или дефектный рентгеновский снимок",
	},
];

export const STOMX_CASH_EXPENSE_BY_ALIAS = Object.freeze(
	Object.fromEntries(
		STOMX_CASH_EXPENSE_CATALOG.map((item) => [item.alias, item]),
	) as Record<StomxExpenseTypeAlias, StomxCashExpenseItem>,
);

export const STOMX_CASH_EXPENSE_BY_ID = Object.freeze(
	Object.fromEntries(
		STOMX_CASH_EXPENSE_CATALOG.map((item) => [item.id, item]),
	) as Record<number, StomxCashExpenseItem>,
);

// ============================================================================
// 3. CASH RECEIPT / INFLOW CATALOG (9 CANONICAL STOMX TYPES)
// ============================================================================

export const STOMX_RECEIPT_TYPE_ALIASES = [
	"installment_payment", // id: 50, Оплата по рассрочке
	"appointment_payment", // id: 5,  Оплата приема
	"sale_product",        // id: 13, Продажа товаров
	"xray_payment",        // id: 31, Оплата рентгена
	"dms_pay",             // id: 20, Оплата услуг через ДМС
	"advance_payment",     // id: 19, Внесение аванса
	"cash_deposit",        // id: 40, Внесение для размена
	"income_employee",     // id: 6,  Внесение ДС сотрудником
	"income_contractor",   // id: 7,  Внесение ДС контрагентом
] as const;

export const stomxReceiptTypeAliasSchema = z.enum(STOMX_RECEIPT_TYPE_ALIASES);
export type StomxReceiptTypeAlias = z.infer<typeof stomxReceiptTypeAliasSchema>;

export const stomxCashReceiptItemSchema = z.object({
	id: z.number().int().positive(),
	alias: stomxReceiptTypeAliasSchema,
	name: z.string().min(1),
	isPredefined: z.boolean(),
	isLocked: z.boolean(),
	isFiscal: z.boolean().optional(),
	ffdCalculationSubject: z.union([z.literal(1), z.literal(3), z.literal(4)]).nullable().optional(),
	ffdTag1054: z.enum([
		"приход",
		"расход",
		"возврат_прихода",
		"возврат_расхода",
		"income",
		"expense",
		"income_return",
		"expense_return",
	]).nullable(),
	ffdTag1054En: z.enum(["income", "expense", "income_return", "expense_return"]).nullable().optional(),
	ffdTag1054Code: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).nullable().optional(),
	defaultAccountType: z.string().optional(),
	descriptionRu: z.string().optional(),
});
export type StomxCashReceiptItem = z.infer<typeof stomxCashReceiptItemSchema>;

export const STOMX_CASH_RECEIPT_CATALOG: readonly StomxCashReceiptItem[] = [
	{
		id: 50,
		alias: "installment_payment",
		name: "Оплата по рассрочке",
		isPredefined: true,
		isLocked: true,
		isFiscal: true,
		ffdCalculationSubject: 3, // Платеж в счет рассрочки / аванс
		ffdTag1054: "приход",
		ffdTag1054En: "income",
		ffdTag1054Code: 1,
		defaultAccountType: "cash_box",
		descriptionRu: "Погашение очередного транша или досрочное закрытие рассрочки",
	},
	{
		id: 5,
		alias: "appointment_payment",
		name: "Оплата приема",
		isPredefined: false,
		isLocked: true,
		isFiscal: true,
		ffdCalculationSubject: 4, // Услуга
		ffdTag1054: "приход",
		ffdTag1054En: "income",
		ffdTag1054Code: 1,
		defaultAccountType: "cash_box",
		descriptionRu: "Прямая оплата оказанных терапевтических, ортопедических или хирургических услуг",
	},
	{
		id: 13,
		alias: "sale_product",
		name: "Продажа товаров",
		isPredefined: true,
		isLocked: true,
		isFiscal: true,
		ffdCalculationSubject: 1, // Товар
		ffdTag1054: "приход",
		ffdTag1054En: "income",
		ffdTag1054Code: 1,
		defaultAccountType: "cash_box",
		descriptionRu: "Розничная продажа сопутствующих средств гигиены (щетки, пасты, ирригаторы)",
	},
	{
		id: 31,
		alias: "xray_payment",
		name: "Оплата рентгена",
		isPredefined: true,
		isLocked: true,
		isFiscal: true,
		ffdCalculationSubject: 4, // Услуга
		ffdTag1054: "приход",
		ffdTag1054En: "income",
		ffdTag1054Code: 1,
		defaultAccountType: "cash_box",
		descriptionRu: "Оплата диагностических рентгеновских снимков (КЛКТ, ОПТГ, прицельная визиография)",
	},
	{
		id: 20,
		alias: "dms_pay",
		name: "Оплата услуг через ДМС",
		isPredefined: true,
		isLocked: true,
		isFiscal: false,
		ffdCalculationSubject: 4,
		ffdTag1054: null,
		ffdTag1054En: null,
		ffdTag1054Code: null,
		defaultAccountType: "insurance",
		descriptionRu: "Поступление денежных средств от страховой компании по гарантийному письму ДМС",
	},
	{
		id: 19,
		alias: "advance_payment",
		name: "Внесение аванса",
		isPredefined: false,
		isLocked: true,
		isFiscal: true,
		ffdCalculationSubject: 3, // Аванс
		ffdTag1054: "приход",
		ffdTag1054En: "income",
		ffdTag1054Code: 1,
		defaultAccountType: "deposit",
		descriptionRu: "Пополнение пациентом личного или семейного депозита перед началом лечения",
	},
	{
		id: 40,
		alias: "cash_deposit",
		name: "Внесение для размена",
		isPredefined: false,
		isLocked: true,
		isFiscal: false,
		ffdCalculationSubject: null,
		ffdTag1054: null,
		ffdTag1054En: null,
		ffdTag1054Code: null,
		defaultAccountType: "cash_box",
		descriptionRu: "Внесение разменного фонда в денежный ящик кассы в начале смены",
	},
	{
		id: 6,
		alias: "income_employee",
		name: "Внесение ДС сотрудником",
		isPredefined: false,
		isLocked: false,
		isFiscal: false,
		ffdCalculationSubject: null,
		ffdTag1054: null,
		ffdTag1054En: null,
		ffdTag1054Code: null,
		defaultAccountType: "cash_box",
		descriptionRu: "Возврат неизрасходованных подотчетных сумм сотрудником клиники",
	},
	{
		id: 7,
		alias: "income_contractor",
		name: "Внесение ДС контрагентом",
		isPredefined: false,
		isLocked: false,
		isFiscal: false,
		ffdCalculationSubject: null,
		ffdTag1054: null,
		ffdTag1054En: null,
		ffdTag1054Code: null,
		defaultAccountType: "bank_account",
		descriptionRu: "Возврат предоплаты, премия поставщика или взаиморасчет контрагента",
	},
];

export const STOMX_CASH_RECEIPT_BY_ALIAS = Object.freeze(
	Object.fromEntries(
		STOMX_CASH_RECEIPT_CATALOG.map((item) => [item.alias, item]),
	) as Record<StomxReceiptTypeAlias, StomxCashReceiptItem>,
);

export const STOMX_CASH_RECEIPT_BY_ID = Object.freeze(
	Object.fromEntries(
		STOMX_CASH_RECEIPT_CATALOG.map((item) => [item.id, item]),
	) as Record<number, StomxCashReceiptItem>,
);

// ============================================================================
// 4. HELPER FUNCTIONS
// ============================================================================

export function getFfd1054Label(tag: FfdTag1054Sign): string {
	switch (tag) {
		case "приход":
		case "income":
			return "Приход (Тег 1054 = 1)";
		case "возврат_прихода":
		case "income_return":
			return "Возврат прихода (Тег 1054 = 2)";
		case "расход":
		case "expense":
			return "Расход (Тег 1054 = 3)";
		case "возврат_расхода":
		case "expense_return":
			return "Возврат расхода (Тег 1054 = 4)";
		default:
			return "Внереализационная / Без чека";
	}
}

export function isFiscal54FzOperation(item: StomxCashExpenseItem | StomxCashReceiptItem): boolean {
	return item.ffdTag1054 !== null;
}
