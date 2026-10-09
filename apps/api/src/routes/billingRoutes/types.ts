import { z } from "zod";

export const paymentValidationMessage =
	"Ни одно поле оплаты не прошло проверку. Проверьте сумму, дату, способ оплаты, фискальный чек и данные плательщика и повторите запись оплаты.";

export const billingPaymentScopeError = "BillingPaymentScopeError" as const;

export const paymentClientMutationConstraint = "payments_org_client_mutation_unique";

/**
 * Названия полей оплаты по-русски, чтобы отказ указывал на конкретное поле.
 */
export const paymentFieldLabels: Record<string, string> = {
	amountRub: "сумма оплаты",
	patientId: "пациент",
	visitId: "прием",
	documentId: "документ",
	serviceId: "услуга прайс-листа",
	catalogItemId: "позиция каталога",
	discountRub: "скидка на услугу в рублях",
	discountPercent: "процент скидки на услугу",
	method: "способ оплаты",
	fiscalReceiptNumber: "номер фискального чека",
	fiscalReceiptIssuedAt: "дата фискального чека",
	fiscalReceiptUrl: "ссылка на чек",
	fiscalReceipt: "фискальный чек",
	clientMutationId: "ключ операции",
	payerFullName: "плательщик",
	payerInn: "ИНН плательщика",
	payerBirthDate: "дата рождения плательщика",
	payerIdentityDocument: "документ плательщика",
	payerRelationship: "родство плательщика",
	taxDeductionCode: "код налогового вычета",
	note: "примечание",
};

/** Параметры расчёта выплат. Обе даты необязательны — умолчание месяц. */
export const payoutQuerySchema = z.object({
	from: z.string().min(1).optional(),
	to: z.string().min(1).optional(),
});

export type PayoutAccess = {
	organizationId: string;
	userId: string;
	role: string;
	/** "all" — все врачи клиники, "own" — только свои строки. */
	scope: "all" | "own";
};

export const partialRefundBodySchema = z.object({
	invoiceId: z.string().uuid(),
	invoiceNumber: z.string().optional(),
	patientId: z.string().uuid(),
	patientName: z.string().optional(),
	cashierFullName: z.string().default("Кассир-администратор"),
	cashierInn: z.string().optional(),
	customerContact: z.string().optional(),
	paymentMethod: z
		.enum(["cash", "card", "sbp", "advance_deposit", "bank_transfer"])
		.default("card"),
	refundRequests: z
		.array(
			z.object({
				itemId: z.string().min(1),
				quantityToRefund: z
					.number()
					.int()
					.positive()
					.refine((val) => typeof val === "number" && Number.isFinite(val) && !Number.isNaN(val))
					.default(1),
				customAmountKopToRefund: z
					.number()
					.int()
					.positive()
					.refine((val) => typeof val === "number" && Number.isFinite(val) && !Number.isNaN(val))
					.optional(),
				reasonRu: z.string().optional(),
			}),
		)
		.min(1),
	reasonCategory: z
		.enum([
			"warranty_case",
			"patient_refusal",
			"billing_error",
			"quality_claim",
			"clinical_contraindication",
		])
		.default("patient_refusal"),
	customReasonDetailsRu: z.string().optional(),
	clientMutationId: z.string().optional(),
	defaultDoctorCommissionPct: z
		.number()
		.min(0)
		.max(100)
		.refine((val) => typeof val === "number" && Number.isFinite(val) && !Number.isNaN(val))
		.optional(),
});

export type PartialRefundBody = z.infer<typeof partialRefundBodySchema>;

export const fiscalQueueQuerySchema = z.object({
	status: z
		.enum(["pending_print", "hardware_offline", "printed", "failed", "all"])
		.optional(),
	limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const fiscalQueueParamsSchema = z.object({
	id: z.string().uuid(),
});
