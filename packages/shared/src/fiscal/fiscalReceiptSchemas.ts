/**
 * packages/shared/src/fiscal/fiscalReceiptSchemas.ts
 *
 * DENTE Dental CRM — 54-FZ (FFD 1.2 / ФФД 1.2) Fiscal Receipt & Payment Contracts.
 * Single Source of Truth (SSOT) harmonizing statutory Order of FTS ED-7-20/662@
 * with legacy API/DB aliases to eliminate schema drift.
 */

import { z } from "zod";
import { isDateLikeString } from "../datetime/index.js";
import { nonNegativeMoneyRubSchema } from "../money.js";

// ─── 1. PAYMENT METHODS & STATUSES ───────────────────────────────────────────

export const paymentMethodSchema = z.enum([
	"cash",
	"card",
	"bank_transfer",
	"online",
	"insurance",
	"family_wallet",
	"other",
]);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const ledgerPaymentMethodSchema = z.enum([
	"cash",
	"card",
	"dms",
	"installment_balance",
	"family_wallet",
]);
export type LedgerPaymentMethod = z.infer<typeof ledgerPaymentMethodSchema>;

export const paymentStatusSchema = z.enum([
	"planned",
	"paid",
	"refunded",
	"voided",
]);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

/**
 * Statutory Russian labels for payment methods under FFD 1.2 (54-FZ).
 */
export const STATUTORY_PAYMENT_METHOD_LABELS_RU: Record<PaymentMethod, string> = {
	cash: "Наличные (Тег 1031)",
	card: "Банковская карта (Тег 1081)",
	online: "СБП / Электронные средства (Тег 1081)",
	bank_transfer: "Банковский перевод на р/с (Тег 1081)",
	family_wallet: "Аванс / Семейный депозит (Тег 1215)",
	insurance: "Страховая компания ДМС (Тег 1216/1217)",
	other: "Иной способ расчета",
};

/**
 * Normalizes any UI or API payment method alias to statutory PaymentMethod.
 */
export function normalizePaymentMethod(alias: string | null | undefined): PaymentMethod {
	if (!alias) return "cash";
	const normalized = alias.trim().toLowerCase();
	switch (normalized) {
		case "cash":
		case "нал":
		case "наличные":
			return "cash";
		case "card":
		case "bank_card":
		case "card_terminal":
		case "терминал":
		case "карта":
		case "эквайринг":
			return "card";
		case "online":
		case "sbp":
		case "sbp_qr":
		case "sberpay_qr":
		case "biometry":
		case "qr":
		case "сбп":
			return "online";
		case "bank_transfer":
		case "bank_invoice":
		case "расчетный_счет":
		case "безнал":
			return "bank_transfer";
		case "family_wallet":
		case "family_balance":
		case "family_deposit":
		case "patient_deposit":
		case "advance_deposit":
		case "deposit":
		case "аванс":
		case "депозит":
			return "family_wallet";
		case "insurance":
		case "dms_insurance":
		case "дмс":
		case "страховая":
			return "insurance";
		default:
			return "other";
	}
}

/**
 * Resolves statutory FFD 1.2 Tag (1031, 1081, 1215, 1216, 1217) for any payment method or alias.
 */
export function resolveFfd12PaymentTag(alias: string | null | undefined): 1031 | 1081 | 1215 | 1216 | 1217 {
	if (!alias) return 1031;
	const normalized = alias.trim().toLowerCase();
	switch (normalized) {
		case "cash":
		case "нал":
		case "наличные":
			return 1031; // Наличные
		case "card":
		case "bank_card":
		case "card_terminal":
		case "online":
		case "sbp":
		case "sbp_qr":
		case "sberpay_qr":
		case "biometry":
		case "bank_transfer":
		case "bank_invoice":
		case "терминал":
		case "карта":
		case "эквайринг":
		case "qr":
		case "сбп":
		case "безнал":
			return 1081; // Безналичные / электронные
		case "family_wallet":
		case "family_balance":
		case "family_deposit":
		case "patient_deposit":
		case "advance_deposit":
		case "deposit":
		case "advance":
		case "аванс":
		case "депозит":
			return 1215; // Зачет аванса / предоплаты
		case "credit":
		case "рассрочка":
		case "кредит":
			return 1216; // Постоплата / кредит
		case "insurance":
		case "dms_insurance":
		case "certificate_or_bonus":
		case "loyalty_points":
		case "certificate":
		case "bonus":
		case "бонусы":
		case "сертификат":
		case "дмс":
		case "страховая":
			return 1217; // Встречное предоставление
		default:
			return 1081;
	}
}

/**
 * Extended payment method schema supporting compound/split and UI modes.
 */
export const extendedPaymentMethodSchema = z.union([
	paymentMethodSchema,
	z.enum(["split", "mixed", "sbp", "deposit", "credit", "certificate", "bonus"]),
]);
export type ExtendedPaymentMethod = z.infer<typeof extendedPaymentMethodSchema>;

// ─── 2. RECEIPT URL & ISSUE DATE ─────────────────────────────────────────────

export const fiscalReceiptUrlSchema = z
	.string()
	.trim()
	.url()
	.max(500)
	.refine(
		(value) => /^https?:\/\//i.test(value),
		"Ссылка ОФД должна начинаться с http:// или https://",
	);

export const fiscalReceiptIssuedAtSchema = z
	.string()
	.trim()
	.max(80)
	.refine((value) => {
		const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
		if (iso) return !Number.isNaN(Date.parse(value));
		const ru = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
		if (ru) {
			return !Number.isNaN(Date.parse(`${ru[3]}-${ru[2]}-${ru[1]}T00:00:00Z`));
		}
		return false;
	}, "Дата фискального чека должна быть корректной датой.");

export const strictFiscalReceiptIssuedAtSchema = fiscalReceiptIssuedAtSchema.refine(
	isDateLikeString,
	"Дата фискального чека должна быть реальной календарной датой.",
);

// ─── 3. HARMONIZED CALCULATION METHOD & SUBJECT (TAG 1214 & TAG 1212) ────────

/**
 * FFD 1.2 Tag 1214: Признак способа расчета.
 * Harmonizes statutory FFD 1.2 values and legacy aliases:
 * - full_prepayment (Предоплата 100%)
 * - prepayment / partial_prepayment (Частичная предоплата)
 * - advance (Аванс)
 * - full_payment / full_settlement (Полный расчет)
 * - partial_payment_and_credit (Частичный расчет и кредит)
 * - credit_handover / credit (Передача в кредит)
 * - credit_payment / credit_settlement (Оплата кредита)
 */
export const fiscalCalculationMethodSchema = z.enum([
	"full_prepayment",
	"prepayment",
	"partial_prepayment",
	"advance",
	"full_payment",
	"full_settlement",
	"partial_payment_and_credit",
	"credit_handover",
	"credit",
	"credit_payment",
	"credit_settlement",
]);
export type FiscalCalculationMethod = z.infer<typeof fiscalCalculationMethodSchema>;

/**
 * FFD 1.2 Tag 1212: Признак предмета расчета.
 * Harmonizes statutory FFD 1.2 values and legacy aliases:
 * - commodity / goods (Товар)
 * - job (Работа)
 * - service (Услуга)
 * - payment (Платеж / Аванс)
 * - agency_fee (Агентское вознаграждение)
 * - composite (Составной предмет расчета)
 * - other (Иной предмет расчета)
 * - excisable_goods_with_marking (Подакцизный товар с маркировкой)
 * - excisable_goods_without_marking (Подакцизный товар без маркировки)
 * - goods_with_marking (Товар с маркировкой Честный ЗНАК / МДЛП)
 * - goods_without_marking (Товар, подлежащий маркировке, но без кода)
 */
export const fiscalCalculationSubjectSchema = z.enum([
	"commodity",
	"goods",
	"job",
	"service",
	"payment",
	"agency_fee",
	"composite",
	"other",
	"excisable_goods_with_marking",
	"excisable_goods_without_marking",
	"goods_with_marking",
	"goods_without_marking",
]);
export type FiscalCalculationSubject = z.infer<typeof fiscalCalculationSubjectSchema>;

// ─── 4. FISCAL RECEIPT DETAILS ───────────────────────────────────────────────

export const fiscalReceiptDetailsSchema = z.object({
	fn: z.string().trim().max(32).nullable().optional(),
	fd: z.string().trim().max(32).nullable().optional(),
	fpd: z.string().trim().max(32).nullable().optional(),
	cashierName: z.string().trim().max(160).nullable().optional(),
	receiptUrl: fiscalReceiptUrlSchema.nullable().optional(),
	operationType: z
		.enum(["income", "income_return", "expense", "expense_return"])
		.nullable()
		.optional(),
	/** Тег 1214: Признак способа расчета */
	calculationMethod: fiscalCalculationMethodSchema.nullable().optional(),
	/** Тег 1212: Признак предмета расчета */
	calculationSubject: fiscalCalculationSubjectSchema.nullable().optional(),
	/** Тег 2108: Мера количества предмета расчета (0 = шт, 255 = иное) */
	quantityMeasure: z.number().int().min(0).max(255).nullable().optional(),
	/** Тег 1215: Сумма зачета ранее внесенного аванса / предоплаты */
	advancePaymentRub: nonNegativeMoneyRubSchema.nullable().optional(),
});
export type FiscalReceiptDetails = z.infer<typeof fiscalReceiptDetailsSchema>;

// ─── 5. PAYMENT ENTITY SCHEMA ────────────────────────────────────────────────

export const paymentSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	patientId: z.string().uuid(),
	visitId: z.string().uuid().nullable(),
	documentId: z.string().uuid().nullable(),
	amountRub: nonNegativeMoneyRubSchema,
	method: paymentMethodSchema,
	status: paymentStatusSchema,
	paidAt: z.string().nullable(),
	createdAt: z.string(),
	fiscalReceiptNumber: z.string().nullable().optional(),
	fiscalReceiptIssuedAt: z.string().nullable().optional(),
	fiscalReceiptUrl: z.string().nullable().optional(),
	fiscalReceipt: fiscalReceiptDetailsSchema.nullable().optional(),
	clientMutationId: z.string().nullable().optional(),
	payerFullName: z.string().nullable().optional(),
	payerInn: z.string().nullable().optional(),
	payerBirthDate: z.string().nullable().optional(),
	payerIdentityDocument: z.string().nullable().optional(),
	payerRelationship: z.string().nullable().optional(),
	taxDeductionCode: z.enum(["1", "2"]).nullable().optional(),
	note: z.string().nullable(),
});
export type Payment = z.infer<typeof paymentSchema>;
