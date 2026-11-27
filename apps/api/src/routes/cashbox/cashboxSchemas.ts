/**
 * cashboxSchemas.ts — Layer 1: Strict Zod Validation Schemas for Cashbox Endpoints.
 *
 * 54-FZ compliant, Mandates 8e/8n.
 */

import {
	nonNegativeMoneyRubSchema,
	positiveMoneyRubSchema,
} from "@dental/shared";
import { z } from "zod";

export const openShiftBodySchema = z.object({
	openedByUserId: z.string().uuid().optional(),
	cashierFullName: z.string().trim().optional(),
	openedAt: z.string().optional(),
}).strict();

const closeShiftParityCheckSchema = z
	.object({
		isValid: z.boolean(),
		diffKopecks: z.number(),
		warningsRu: z.array(z.string()),
	})
	.strict();

export const closeShiftBodySchema = z.object({
	closedByUserId: z.string().uuid().optional(),
	cashierFullName: z.string().trim().optional(),
	zReportNumber: z.string().trim().optional(),
	shiftNumber: z.number().int().optional(),
	closedAt: z.string().optional(),
	countedCashRub: z.number().optional(),
	incomeCashRub: z.number().optional(),
	incomeElectronicRub: z.number().optional(),
	incomeSbpRub: z.number().optional(),
	advanceOffsetRub: z.number().optional(),
	insuranceTotalRub: z.number().optional(),
	returnTotalRub: z.number().optional(),
	netRevenueRub: z.number().optional(),
	differenceRub: z.number().optional(),
	isBalanced: z.boolean().optional(),
	force: z.boolean().optional(),
	allowUnfinishedVisits: z.boolean().optional(),
	idempotencyKey: z.string().trim().max(128).optional(),
	clientMutationId: z.string().trim().max(128).optional(),
	reconciliation: z
		.object({
			parityCheck: closeShiftParityCheckSchema.optional(),
			note: z.string().trim().max(500).optional(),
		})
		.strict()
		.optional(),
	isKktConnected: z.boolean().optional(),
	kktReportData: z
		.object({
			fnSerial: z.string().nullable().optional(),
			fiscalDocNumber: z.string().nullable().optional(),
			fiscalSign: z.string().nullable().optional(),
			qrString: z.string().nullable().optional(),
		})
		.strict()
		.optional(),
}).strict();

export const cashIntroductionBodySchema = z.object({
	cashBoxId: z.string().uuid().optional(),
	amountRub: positiveMoneyRubSchema,
	reasonText: z.string().trim().max(500).optional().default("Служебное внесение разменного фонда"),
	operatorId: z.string().uuid().optional(),
	cashierFullName: z.string().trim().optional(),
	typeAlias: z.string().trim().optional(),
	idempotencyKey: z.string().trim().max(128).optional(),
	clientMutationId: z.string().trim().max(128).optional(),
}).strict();

export const cashWithdrawalBodySchema = z.object({
	cashBoxId: z.string().uuid().optional(),
	amountRub: positiveMoneyRubSchema,
	reasonText: z.string().trim().max(500).optional().default("Инкассация наличных средств в банк"),
	operatorId: z.string().uuid().optional(),
	recipientFio: z.string().trim().optional(),
	cashierFullName: z.string().trim().optional(),
	typeAlias: z.string().trim().optional(),
	idempotencyKey: z.string().trim().max(128).optional(),
	clientMutationId: z.string().trim().max(128).optional(),
}).strict();

export const xReportQueryOrBodySchema = z.object({
	cashierFullName: z.string().trim().optional(),
	shiftNumber: z.coerce.number().int().optional(),
	print: z.coerce.boolean().optional(),
}).strict();

export const cashOperationListQuerySchema = z
	.object({
		cashBoxId: z.string().uuid().optional(),
		operationType: z.string().trim().max(64).optional(),
		dateFrom: z.string().trim().max(64).optional(),
		dateTo: z.string().trim().max(64).optional(),
	})
	.strict();

export const cashRefundBodySchema = z.object({
	cashBoxId: z.string().uuid().optional(),
	amountRub: positiveMoneyRubSchema,
	method: z.enum(["cash", "card", "sbp", "advance_deposit", "bank_transfer"]).optional(),
	reasonText: z.string().trim().max(500).optional().default("Возврат денежных средств покупателю"),
	invoiceId: z.preprocess((val) => (typeof val === "string" && val.trim() === "" ? undefined : val), z.string().uuid("Некорректный UUID счёта.").optional()),
	paymentId: z.preprocess((val) => (typeof val === "string" && val.trim() === "" ? undefined : val), z.string().uuid("Некорректный UUID платежа.").optional()),
	operatorId: z.preprocess((val) => (typeof val === "string" && val.trim() === "" ? undefined : val), z.string().uuid("Некорректный UUID оператора.").optional()),
	patientId: z.preprocess((val) => (typeof val === "string" && val.trim() === "" ? undefined : val), z.string().uuid("Некорректный UUID пациента.").optional()),
	cashierFullName: z.string().trim().optional(),
	idempotencyKey: z.string().trim().max(128).optional(),
	clientMutationId: z.string().trim().max(128).optional(),
}).strict();

export const retryFiscalizeParamsSchema = z
	.object({
		id: z.string().uuid("Некорректный UUID транзакции или чека."),
	})
	.strict();

export const cashboxPaymentRequestSchema = z.object({
	patientId: z.preprocess(
		(val) => (typeof val === "string" && (val.trim() === "" || val === "pat-walkin") ? undefined : val),
		z.string().trim().uuid("Некорректный UUID пациента.").optional().nullable(),
	),
	isRetailSale: z.boolean().optional(),
	visitId: z.preprocess(
		(val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
		z.string().trim().uuid("Некорректный UUID приёма.").optional().nullable(),
	),
	invoiceId: z.preprocess(
		(val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
		z.string().trim().uuid("Некорректный UUID счёта.").optional().nullable(),
	),
	serviceId: z.preprocess(
		(val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
		z.string().trim().uuid("Некорректный UUID услуги.").optional().nullable(),
	),
	catalogItemId: z.preprocess(
		(val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
		z.string().trim().uuid("Некорректный UUID позиции прайса.").optional().nullable(),
	),
	documentId: z.preprocess(
		(val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
		z.string().trim().uuid("Некорректный UUID документа.").optional().nullable(),
	),
	orderId: z.string().trim().max(128).optional(),
	amountKopecks: z.union([z.number().int().nonnegative(), z.bigint()]).optional(),
	amountRub: nonNegativeMoneyRubSchema.optional(),
	method: z.preprocess(
		(val) => (typeof val === "string" && (val === "bonus" || val === "loyalty_points") ? "loyalty" : val),
		z.enum([
			"card",
			"cash",
			"sbp",
			"family_wallet",
			"deposit",
			"loyalty",
			"split",
			"warranty",
			"online",
			"insurance",
			"certificate",
		]).optional().default("card"),
	),
	discountPercent: z.number().min(0).max(100).optional().nullable(),
	discountRub: nonNegativeMoneyRubSchema.optional().nullable(),
	discountKopecks: z.number().int().nonnegative().optional().nullable(),
	isWarranty: z.boolean().optional(),
	familyGroupId: z.preprocess(
		(val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
		z.string().trim().uuid("Некорректный UUID семейного счёта.").optional().nullable(),
	),
	payerFullName: z.string().trim().max(256).optional().nullable(),
	payerInn: z.preprocess(
		(val) => (typeof val === "string" && val.trim() === "" ? null : val),
		z.string().trim().optional().nullable(),
	),
	payerBirthDate: z.preprocess(
		(val) => (typeof val === "string" && val.trim() === "" ? null : val),
		z.string().trim().optional().nullable(),
	),
	payerIdentityDocument: z.preprocess(
		(val) => (typeof val === "string" && val.trim() === "" ? null : val),
		z.string().trim().optional().nullable(),
	),
	payerRelationship: z.preprocess(
		(val) => (typeof val === "string" && val.trim() === "" ? null : val),
		z.string().trim().optional().nullable(),
	),
	guaranteeLetterId: z.string().trim().optional().nullable(),
	allowOverdraft: z.boolean().optional(),
	isUrgentCare: z.boolean().optional(),
	isEmergency: z.boolean().optional(),
	hasAcutePain: z.boolean().optional(),
	dmsAmountKopecks: z.number().int().nonnegative().optional(),
	dmsAmountRub: nonNegativeMoneyRubSchema.optional(),
	certificateNumber: z.string().trim().optional(),
	certificateAmountKopecks: z.number().int().nonnegative().optional(),
	certificateAmountRub: nonNegativeMoneyRubSchema.optional(),
	cashAmountKopecks: z.number().int().nonnegative().optional(),
	electronicAmountKopecks: z.number().int().nonnegative().optional(),
	sbpAmountKopecks: z.number().int().nonnegative().optional(),
	depositAmountKopecks: z.number().int().nonnegative().optional(),
	familyDepositAmountKopecks: z.number().int().nonnegative().optional(),
	bonusAmountKopecks: z.number().int().nonnegative().optional(),
	cashAmountRub: nonNegativeMoneyRubSchema.optional(),
	electronicAmountRub: nonNegativeMoneyRubSchema.optional(),
	sbpAmountRub: nonNegativeMoneyRubSchema.optional(),
	depositAmountRub: nonNegativeMoneyRubSchema.optional(),
	familyDepositAmountRub: nonNegativeMoneyRubSchema.optional(),
	bonusAmountRub: nonNegativeMoneyRubSchema.optional(),
	carpulesCount: z.number().int().nonnegative().optional(),
	drugName: z.string().trim().max(256).optional(),
	mdlpItems: z
		.array(
			z
				.object({
					rawBarcode: z.string().nullable().optional(),
					sgtin: z.string().nullable().optional(),
					gtin: z.string().nullable().optional(),
					serialNumber: z.string().nullable().optional(),
					costRub: z.number().nullable().optional(),
					tradeName: z.string().nullable().optional(),
					inn: z.string().nullable().optional(),
					series: z.string().nullable().optional(),
				})
				.strict(),
		)
		.optional(),
	splitTenders: z.array(
		z.object({
			method: z.string(),
			amountKopecks: z.number().int().nonnegative().optional(),
			amountRub: nonNegativeMoneyRubSchema.optional(),
			certificateNumber: z.string().trim().optional(),
			guaranteeLetterId: z.string().trim().optional().nullable(),
			allowOverdraft: z.boolean().optional(),
			isUrgentCare: z.boolean().optional(),
			isEmergency: z.boolean().optional(),
			hasAcutePain: z.boolean().optional(),
		}).strict(),
	).optional(),
	clientMutationId: z.string().trim().max(128).optional().nullable(),
	idempotencyKey: z.string().trim().max(128).optional(),
	taxCategory: z.enum(["1", "2", "01", "02"]).optional().nullable(),
	taxDeductionCode: z.enum(["1", "2", "01", "02"]).optional().nullable(),
	cashierFullName: z.string().trim().max(256).optional(),
	cashierUserId: z.string().uuid().optional(),
	operatorId: z.string().uuid().optional(),
	note: z.string().trim().max(500).optional().nullable(),
	isElectronicReceiptOnly: z.boolean().optional(),
	customerContact: z.string().trim().max(128).optional(),
	isAdvanceDeposit: z.boolean().optional(),
	advanceDepositTarget: z.enum(["family", "patient"]).optional(),
	clientType: z.preprocess(
		(val) => (typeof val === "string" && val.trim() === "" ? null : val),
		z.string().trim().optional().nullable(),
	),
	buyerInn: z.preprocess(
		(val) => (typeof val === "string" && val.trim() === "" ? null : val),
		z.string().trim().optional().nullable(),
	),
	fiscalReceiptNumber: z.preprocess(
		(val) => (typeof val === "string" && val.trim() === "" ? null : val),
		z.string().trim().optional().nullable(),
	),
	fiscalReceiptIssuedAt: z.preprocess(
		(val) => (typeof val === "string" && val.trim() === "" ? null : val),
		z.string().trim().optional().nullable(),
	),
	printFormat: z.string().trim().optional(),
}).strict();

export type CashboxPaymentRequest = z.infer<typeof cashboxPaymentRequestSchema>;
