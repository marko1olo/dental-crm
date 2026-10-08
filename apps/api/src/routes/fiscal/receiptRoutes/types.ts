/**
 * types.ts — Layer 0: Schemas, DTOs & Fiscal Types for 54-FZ Fastify Routes.
 */

import { z } from "zod";
import type { FiscalQueueStatus } from "./constants.js";

export const sbpStatusInputSchema = z.object({
	orderId: z.string().trim().max(128).optional(),
	qrId: z.string().trim().max(128).optional(),
	invoiceId: z.string().trim().max(128).optional(),
	paymentId: z.string().trim().max(128).optional(),
	clientMutationId: z.string().trim().max(128).optional(),
	action: z.enum(["check", "confirm_manual"]).optional(),
	confirm: z.string().trim().optional(),
});

export type SbpStatusInput = z.infer<typeof sbpStatusInputSchema>;

export const kktDeviceTestConnectionSchema = z.object({
	host: z.string().trim().min(1).default("192.168.1.150"),
	port: z.number().int().min(1).max(65535).default(16732),
	timeoutMs: z.number().int().min(500).max(10000).default(3000),
});

export type KktDeviceTestConnectionInput = z.infer<typeof kktDeviceTestConnectionSchema>;

export const fiscalQueueQuerySchema = z.object({
	status: z
		.enum([
			"pending_print",
			"hardware_offline",
			"offline_pending",
			"printed",
			"failed",
			"all",
		])
		.optional(),
	limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type FiscalQueueQueryInput = z.infer<typeof fiscalQueueQuerySchema>;

export const fiscalQueueIdParamSchema = z.object({
	id: z.string().uuid(),
});

export type FiscalQueueIdParam = z.infer<typeof fiscalQueueIdParamSchema>;

export interface ApplyCashBoxReceiptParams {
	patientId?: string | null | undefined;
	cashBoxId?: string | null | undefined;
	operationType: string;
	cashKopecks: number;
	electronicCardKopecks: number;
	sbpKopecks: number;
	prepaidKopecks: number;
	creditKopecks: number;
	totalKopecks: number;
	cashierFullName?: string | null | undefined;
}

export interface ApplyCashBoxRefundParams {
	patientId?: string | null | undefined;
	refundCashKopecks: number;
	refundElectronicKopecks: number;
	refundPrepaidKopecks: number;
	totalRefundKopecks: number;
	cashierFullName?: string | null | undefined;
	originalReceiptNumber?: string | null | undefined;
}

export interface PrintResultMetadata {
	fiscalDocumentNumber?: number | string | null | undefined;
	ofdVerificationUrl?: string | null | undefined;
}
