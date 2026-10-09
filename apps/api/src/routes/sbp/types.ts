import type {
	createFiscalReceiptPayloadSchema,
	generateSbpDynamicQrSchema,
	SbpQrEngine,
} from "@dental/shared";
import { z } from "zod";
import type { payments, sberbankTransactions } from "../../db/schema.js";

/** Schema for validating SBP URL / payload verification request */
export const verifyPayloadBodySchema = z.object({
	payloadUrl: z.string().trim().url(),
});

export type VerifyPayloadInput = z.infer<typeof verifyPayloadBodySchema>;
export type GenerateSbpDynamicQrInput = z.infer<typeof generateSbpDynamicQrSchema>;
export type CreateFiscalReceiptPayloadInput = z.infer<typeof createFiscalReceiptPayloadSchema>;

export type Tag1054OperationType =
	| "income"
	| "income_return"
	| "expense"
	| "expense_return";

export interface FiscalSignParams {
	readonly fn: string;
	readonly fd: string;
	readonly date: Date;
	readonly amountKopecks: number;
}

export interface OfdVerificationUrlParams {
	readonly fn: string;
	readonly fd: string;
	readonly fpd: string;
	readonly amountKopecks: number;
	readonly operationType: string;
}

export interface ItemizedFfd12Tag {
	readonly name: string;
	readonly priceKopecks: number;
	readonly quantity: number;
	readonly amountKopecks: number;
	readonly tag1212_paymentSubject: number;
	readonly tag1214_paymentMethod: number;
	readonly tag1199_vatRate: number;
	readonly tag2108_quantityMeasure: number;
	readonly medicalServiceCode804n: string | null;
}

export interface SbpWebhookTargetContext {
	readonly source: "sberbankTransactions" | "payments" | "payload";
	readonly organizationId: string;
	readonly patientId: string | null;
	readonly visitId: string | null;
	readonly documentId: string | null;
	readonly invoiceId: string | null;
	readonly amountKopecks: number | null;
	readonly sberTx?: typeof sberbankTransactions.$inferSelect | undefined;
	readonly existingPayment?: typeof payments.$inferSelect | undefined;
}

export interface GenerateQrResponse {
	readonly success: boolean;
	readonly payloadUrl: string;
	readonly operationId: string;
	readonly crc16: string;
	readonly amountKopecks: number;
	readonly amountRub: number;
	readonly currency: string;
	readonly qrSvg: string | null;
	readonly ttlSeconds: number;
	readonly expiresAt: string;
}

export interface VerifyPayloadResponse {
	readonly success: boolean;
	readonly verification: ReturnType<typeof SbpQrEngine.verifyNspkPayload>;
}

export interface FiscalReceiptResponse {
	readonly success: boolean;
	readonly payment: typeof payments.$inferSelect;
	readonly fiscalReceiptNumber: string | null;
	readonly queueId?: string | undefined;
	readonly queueStatus: "printed" | "hardware_offline";
	readonly ffd12Tags: {
		readonly tag1054_operationType: number;
		readonly tag1055_taxationSystem: number;
		readonly tag1008_customerContact: string;
		readonly tag1021_cashier: string;
		readonly tag1031_cashSumKopecks: number;
		readonly tag1081_electronicSumKopecks: number;
		readonly tag1215_prepaidSumKopecks: number;
		readonly items: readonly ItemizedFfd12Tag[];
	};
}

export interface SbpWebhookResult {
	readonly success: boolean;
	readonly processed: boolean;
	readonly status: "PAID" | "REFUNDED" | "FAILED";
	readonly reason?: string | undefined;
	readonly paymentId?: string | undefined;
	readonly amount?: number | undefined;
}
