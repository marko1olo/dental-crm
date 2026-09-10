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

export const STOMX_RECEIPT_TYPE_ALIASES = [
	"installment_payment", // id: 50, Оплата по рассрочке
	"appointment_payment",   // id: 5,  Оплата приема
	"sale_product",          // id: 13, Продажа товаров
	"xray_payment",          // id: 31, Оплата рентгена
	"dms_pay",               // id: 20, Оплата услуг через ДМС
	"advance_payment",       // id: 19, Внесение аванса
	"cash_deposit",          // id: 40, Внесение для размена
	"income_employee",       // id: 6,  Внесение ДС сотрудником (подотчет/возврат)
	"income_contractor",     // id: 7,  Внесение ДС контрагентом (бонус/предоплата)
] as const;

export const stomxReceiptTypeAliasSchema = z.enum(STOMX_RECEIPT_TYPE_ALIASES);
export type StomxReceiptTypeAlias = z.infer<typeof stomxReceiptTypeAliasSchema>;

/**
 * ФФД 1.2 Признак предмета расчета (тег 1212):
 * 1 = Товар (COMMODITY)
 * 3 = Аванс / Предоплата (ADVANCE)
 * 4 = Услуга (SERVICE)
 * null = Внереализационная операция / Не подлежит фискализации чеком (NON_FISCAL)
 */
export type FfdCalculationSubjectCode = 1 | 3 | 4 | null;

export interface StomxCashReceiptTypeMeta {
	readonly id: number;
	readonly alias: StomxReceiptTypeAlias;
	readonly name: string;
	readonly isPredefined: boolean;
	readonly isLocked: boolean;
	readonly isFiscal: boolean; // Подлежит ли формированию чека по 54-ФЗ
	readonly ffdCalculationSubject: FfdCalculationSubjectCode;
	readonly defaultAccountType: "cash_box" | "bank_account" | "deposit" | "insurance";
	readonly descriptionRu: string;
}

export const STOMX_CASH_RECEIPT_CATALOG: readonly StomxCashReceiptTypeMeta[] = [
	{
		id: 50,
		alias: "installment_payment",
		name: "Оплата по рассрочке",
		isPredefined: true,
		isLocked: true,
		isFiscal: true,
		ffdCalculationSubject: 3, // Платеж в счет рассрочки / аванс
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
		defaultAccountType: "cash_box",
		descriptionRu: "Оплата диагностических рентгеновских снимков (КЛКТ, ОПТГ, прицельная визиография)",
	},
	{
		id: 20,
		alias: "dms_pay",
		name: "Оплата услуг через ДМС",
		isPredefined: true,
		isLocked: true,
		isFiscal: false, // Оплата от юрлица/страховой по безналичному расчету (ст. 2 п. 9 54-ФЗ)
		ffdCalculationSubject: 4,
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
		defaultAccountType: "deposit",
		descriptionRu: "Пополнение пациентом личного или семейного депозита перед началом лечения",
	},
	{
		id: 40,
		alias: "cash_deposit",
		name: "Внесение для размена",
		isPredefined: false,
		isLocked: true,
		isFiscal: false, // Внереализационное кассовое внесение
		ffdCalculationSubject: null,
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
		defaultAccountType: "bank_account",
		descriptionRu: "Возврат предоплаты, премия поставщика или взаиморасчет контрагента",
	},
];

export const STOMX_CASH_RECEIPT_BY_ALIAS = Object.freeze(
	Object.fromEntries(
		STOMX_CASH_RECEIPT_CATALOG.map((item) => [item.alias, item]),
	) as Record<StomxReceiptTypeAlias, StomxCashReceiptTypeMeta>,
);

export const STOMX_CASH_RECEIPT_BY_ID = Object.freeze(
	Object.fromEntries(
		STOMX_CASH_RECEIPT_CATALOG.map((item) => [item.id, item]),
	) as Record<number, StomxCashReceiptTypeMeta>,
);

// ============================================================================
// 2. CASH EXPENSE / OUTFLOW TYPES (РАСХОДНЫЕ ОПЕРАЦИИ И ИЗЪЯТИЯ КАССЫ)
// ============================================================================

export const STOMX_EXPENSE_TYPE_ALIASES = [
	"family_transfer",    // id: 41, Перевод семейного аванса
	"collection",         // id: 1,  Инкассация
	"return_appointment", // id: 12, Возврат денег за прием
	"return_advance",     // id: 2,  Вернуть аванс
	"payment_employee",   // id: 3,  Выдать ДС сотруднику (зарплата/под отчет)
	"payment_contractor", // id: 4,  Выдать ДС контрагенту (материалы/хознужды/аренда/налоги)
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

/**
 * Категории управленческого учета P&L для расходных операций кассы
 */
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

export interface StomxCashExpenseTypeMeta {
	readonly id: number;
	readonly alias: StomxExpenseTypeAlias;
	readonly name: string;
	readonly isPredefined: boolean;
	readonly isLocked: boolean;
	readonly isFiscalRefund: boolean; // Является ли чеком «Возврат прихода» по 54-ФЗ
	readonly defaultPnlCategory: StomxExpensePnlCategory;
	readonly descriptionRu: string;
}

export const STOMX_CASH_EXPENSE_CATALOG: readonly StomxCashExpenseTypeMeta[] = [
	{
		id: 41,
		alias: "family_transfer",
		name: "Перевод семейного аванса",
		isPredefined: true,
		isLocked: true,
		isFiscalRefund: false,
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
		defaultPnlCategory: "encashment",
		descriptionRu: "Изъятие наличной выручки из кассы для передачи инкассаторам в банк",
	},
	{
		id: 12,
		alias: "return_appointment",
		name: "Возврат денег за прием",
		isPredefined: false,
		isLocked: true,
		isFiscalRefund: true, // Чек «Возврат прихода»
		defaultPnlCategory: "refund",
		descriptionRu: "Возврат средств пациенту за неоказанные или гарантийные медицинские услуги",
	},
	{
		id: 2,
		alias: "return_advance",
		name: "Вернуть аванс",
		isPredefined: false,
		isLocked: true,
		isFiscalRefund: true, // Чек «Возврат прихода»
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
		defaultPnlCategory: "materials", // Чаще всего материалы, хознужды, аренда
		descriptionRu: "Оплата счетов поставщиков материалов, хозяйственных нужд, аренды или налогов",
	},
	{
		id: 14,
		alias: "return_product",
		name: "Возврат товаров",
		isPredefined: true,
		isLocked: true,
		isFiscalRefund: true, // Чек «Возврат прихода»
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
		defaultPnlCategory: "refund",
		descriptionRu: "Сторнирование оказанных услуг по ДМС и возврат акта страховой компании",
	},
	{
		id: 32,
		alias: "xray_return",
		name: "Возврат рентгена",
		isPredefined: true,
		isLocked: true,
		isFiscalRefund: true, // Чек «Возврат прихода»
		defaultPnlCategory: "refund",
		descriptionRu: "Возврат средств за невыполненный или дефектный рентгеновский снимок",
	},
];

export const STOMX_CASH_EXPENSE_BY_ALIAS = Object.freeze(
	Object.fromEntries(
		STOMX_CASH_EXPENSE_CATALOG.map((item) => [item.alias, item]),
	) as Record<StomxExpenseTypeAlias, StomxCashExpenseTypeMeta>,
);

export const STOMX_CASH_EXPENSE_BY_ID = Object.freeze(
	Object.fromEntries(
		STOMX_CASH_EXPENSE_CATALOG.map((item) => [item.id, item]),
	) as Record<number, StomxCashExpenseTypeMeta>,
);

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
	return meta ? meta.defaultPnlCategory : "other";
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
