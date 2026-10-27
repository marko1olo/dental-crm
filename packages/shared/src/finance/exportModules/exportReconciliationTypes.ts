/**
 * exportReconciliationTypes.ts — Acquiring Reconciliation Zod Schemas & Types.
 * Wave 130 & Mandate 8b (<= 120 lines). Integer kopecks arithmetic.
 */

import { z } from "zod";

export const ACQUIRING_PROVIDERS = ["sberbank", "tbank", "vtb", "alfabank", "other"] as const;
export type AcquiringProvider = (typeof ACQUIRING_PROVIDERS)[number];

export const ACQUIRING_PROVIDER_NAMES_RU: Record<AcquiringProvider, string> = {
	sberbank: "ПАО Сбербанк",
	tbank: "АО «ТБанк»",
	vtb: "Банк ВТБ (ПАО)",
	alfabank: "АО «Альфа-Банк»",
	other: "Коммерческий банк",
};

export const paymentEntrySchema = z.object({
	id: z.string().min(1),
	date: z.string().min(8),
	amountKopecks: z.number().int().positive(),
	rrn: z.string().optional().nullable(),
	authCode: z.string().optional().nullable(),
	terminalId: z.string().optional().nullable(),
	cardLast4: z.string().optional().nullable(),
	paymentMethod: z.enum(["card", "sbp", "qr"]).default("card"),
	acquirerName: z.enum(ACQUIRING_PROVIDERS).default("sberbank"),
	expectedFeeRatePercent: z.number().min(0).max(100).optional().nullable(),
	expectedFeeKopecks: z.number().int().nonnegative().optional().nullable(),
	patientName: z.string().optional().nullable(),
	receiptNumber: z.string().optional().nullable(),
});
export type PaymentEntry = z.infer<typeof paymentEntrySchema>;

export const acquirerStatementItemSchema = z.object({
	id: z.string().min(1),
	date: z.string().min(8),
	terminalId: z.string().optional().nullable(),
	rrn: z.string().optional().nullable(),
	authCode: z.string().optional().nullable(),
	cardMask: z.string().optional().nullable(),
	paymentSystem: z.string().optional().nullable(),
	grossAmountKopecks: z.number().int().positive(),
	feeKopecks: z.number().int().nonnegative(),
	netAmountKopecks: z.number().int().positive(),
	feeRatePercent: z.number().min(0).max(100).optional().nullable(),
});
export type AcquirerStatementItem = z.infer<typeof acquirerStatementItemSchema>;

export const matchedTransactionRecordSchema = z.object({
	systemPaymentId: z.string(),
	acquirerStatementId: z.string(),
	rrn: z.string().optional().nullable(),
	authCode: z.string().optional().nullable(),
	terminalId: z.string().optional().nullable(),
	date: z.string(),
	grossAmountKopecks: z.number().int(),
	actualFeeKopecks: z.number().int(),
	expectedFeeKopecks: z.number().int(),
	feeDiscrepancyKopecks: z.number().int(),
	netAmountKopecks: z.number().int(),
	hasFeeDiscrepancy: z.boolean(),
	cardMaskOrLast4: z.string().optional().nullable(),
});
export type MatchedTransactionRecord = z.infer<typeof matchedTransactionRecordSchema>;

export const reconciliationSummarySchema = z.object({
	systemCount: z.number().int().nonnegative(),
	systemTotalKopecks: z.number().int().nonnegative(),
	acquirerCount: z.number().int().nonnegative(),
	acquirerGrossKopecks: z.number().int().nonnegative(),
	acquirerFeeKopecks: z.number().int().nonnegative(),
	acquirerNetKopecks: z.number().int().nonnegative(),
	matchedCount: z.number().int().nonnegative(),
	matchedGrossKopecks: z.number().int().nonnegative(),
	feeDiscrepancyCount: z.number().int().nonnegative(),
	feeDiscrepancyKopecks: z.number().int(),
	missingInBankCount: z.number().int().nonnegative(),
	missingInBankKopecks: z.number().int().nonnegative(),
	missingInCrmCount: z.number().int().nonnegative(),
	missingInCrmKopecks: z.number().int().nonnegative(),
});
export type ReconciliationSummary = z.infer<typeof reconciliationSummarySchema>;

export const acquirerReconciliationSchema = z.object({
	reconciliationId: z.string().min(1),
	reconciliationDate: z.string(),
	periodFrom: z.string(),
	periodTo: z.string(),
	acquirerName: z.string(),
	status: z.enum(["balanced", "discrepancies_found"]),
	summary: reconciliationSummarySchema,
	matchedRecords: z.array(matchedTransactionRecordSchema),
	missingInBankRecords: z.array(paymentEntrySchema),
	missingInCrmRecords: z.array(acquirerStatementItemSchema),
});
export type ReconciliationResult = z.infer<typeof acquirerReconciliationSchema>;

export const reconciliationOptionsSchema = z.object({
	reconciliationId: z.string().optional(),
	reconciliationDate: z.string().optional(),
	periodFrom: z.string().optional(),
	periodTo: z.string().optional(),
	acquirerName: z.string().optional(),
	defaultFeeRatePercent: z.number().min(0).max(100).optional(),
});
export type ReconciliationOptions = z.infer<typeof reconciliationOptionsSchema>;

export const reconciliationProtocolOptionsSchema = z.object({
	protocolNumber: z.string().optional(),
	chiefAccountant: z.string().optional(),
	cashier: z.string().optional(),
	notes: z.string().optional(),
});
export type ReconciliationProtocolOptions = z.infer<typeof reconciliationProtocolOptionsSchema>;
