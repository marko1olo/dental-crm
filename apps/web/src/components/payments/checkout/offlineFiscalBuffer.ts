/**
 * offlineFiscalBuffer.ts
 *
 * DENTE Dental CRM — 54-FZ Offline Fiscal Buffer Engine.
 * Compliant with Mandate 8e: Zero-Wait Patient Intake & Offline Queue Resilience.
 */

import type { ClientLegalType } from "../../../types/payment.js";
import type { Ffd12FiscalPayload } from "./fastCheckoutEngine.js";

export interface OfflineFiscalBufferItem {
	readonly orderId: string;
	readonly totalRub: number;
	readonly totalKop: number;
	readonly paymentsDistribution: Ffd12FiscalPayload["paymentsDistribution"];
	readonly customerContact: string;
	readonly isElectronicReceiptOnly: boolean;
	readonly idempotencyKey: string;
	readonly clientType: ClientLegalType;
	readonly buyerInn?: string | undefined;
	readonly queuedAt: string;
	readonly reason: string;
}

/**
 * Creates an offline fiscal buffer record when KKT hardware is offline,
 * ensuring zero patient wait time at the reception counter (Mandate 8e).
 */
export function createOfflineFiscalBufferItem(
	payload: Ffd12FiscalPayload,
	reason = "ККТ временно недоступна (автосохранение в буфер отложенной фискализации)",
): OfflineFiscalBufferItem {
	return {
		orderId: payload.orderId,
		totalRub: payload.totalSumKop / 100,
		totalKop: payload.totalSumKop,
		paymentsDistribution: payload.paymentsDistribution,
		customerContact: payload.clientContact || "",
		isElectronicReceiptOnly: payload.isElectronicReceiptOnly,
		idempotencyKey: payload.idempotencyKey || `offline-${Date.now()}`,
		clientType: payload.clientType,
		buyerInn: payload.buyerInn,
		queuedAt: new Date().toISOString(),
		reason,
	};
}
