/**
 * cashboxSchemas.ts — Layer 1: Strict Zod Validation Schemas for Cashbox Endpoints.
 * 
 * 54-FZ, StomX Reverse Engineering Bible & Mandate 8e/8n compliant.
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
	netRevenueRub: z.number().optional(),
	differenceRub: z.number().optional(),
	isBalanced: z.boolean().optional(),
	reconciliation: z.record(z.any()).optional(),
});

export const cashIntroductionBodySchema = z.object({
	cashBoxId: z.string().uuid().optional(),
	amountRub: positiveMoneyRubSchema,
	reasonText: z.string().trim().max(500).optional().default("Служебное внесение разменного фонда"),
	operatorId: z.string().uuid().optional(),
	cashierFullName: z.string().trim().optional(),
	typeAlias: z.string().trim().optional(),
});

export const cashWithdrawalBodySchema = z.object({
	cashBoxId: z.string().uuid().optional(),
	amountRub: positiveMoneyRubSchema,
	reasonText: z.string().trim().max(500).optional().default("Инкассация наличных средств в банк"),
	operatorId: z.string().uuid().optional(),
	recipientFio: z.string().trim().optional(),
	cashierFullName: z.string().trim().optional(),
	typeAlias: z.string().trim().optional(),
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
