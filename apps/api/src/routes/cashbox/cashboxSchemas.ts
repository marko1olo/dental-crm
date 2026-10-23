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
});

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
	reconciliation: z.record(z.any()).optional(),
});

export const cashIntroductionBodySchema = z.object({
	cashBoxId: z.string().uuid().optional(),
	amountRub: positiveMoneyRubSchema,
	reasonText: z.string().trim().max(500).optional().default("Служебное внесение разменного фонда"),
	operatorId: z.string().uuid().optional(),
	cashierFullName: z.string().trim().optional(),
	typeAlias: z.string().trim().optional(),
	idempotencyKey: z.string().trim().max(128).optional(),
	clientMutationId: z.string().trim().max(128).optional(),
});

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
});

export const xReportQueryOrBodySchema = z.object({
	cashierFullName: z.string().trim().optional(),
	shiftNumber: z.coerce.number().int().optional(),
});

export const cashOperationListQuerySchema = z.object({
	cashBoxId: z.string().uuid().optional(),
	operationType: z.string().optional(),
	dateFrom: z.string().optional(),
	dateTo: z.string().optional(),
});

export const cashRefundBodySchema = z.object({
	cashBoxId: z.string().uuid().optional(),
	amountRub: positiveMoneyRubSchema,
	reasonText: z.string().trim().max(500).optional().default("Возврат денежных средств покупателю"),
	invoiceId: z.string().uuid().optional(),
	paymentId: z.string().uuid().optional(),
	operatorId: z.string().uuid().optional(),
	cashierFullName: z.string().trim().optional(),
});

export const retryFiscalizeParamsSchema = z.object({
	id: z.string(),
});

export const cashboxPaymentRequestSchema = z.object({
	patientId: z.string().uuid().optional(),
	visitId: z.string().uuid().optional(),
	orderId: z.string().trim().max(128).optional(),
	amountKopecks: z.union([z.number().int().nonnegative(), z.bigint()]).optional(),
	amountRub: nonNegativeMoneyRubSchema.optional(),
	method: z.enum([
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
	]).optional().default("card"),
	cashAmountKopecks: z.number().int().nonnegative().optional(),
	electronicAmountKopecks: z.number().int().nonnegative().optional(),
	depositAmountKopecks: z.number().int().nonnegative().optional(),
	clientMutationId: z.string().trim().max(128).optional(),
	idempotencyKey: z.string().trim().max(128).optional(),
	cashierFullName: z.string().trim().max(256).optional(),
	note: z.string().trim().max(500).optional(),
	isElectronicReceiptOnly: z.boolean().optional(),
	customerContact: z.string().trim().max(128).optional(),
});
