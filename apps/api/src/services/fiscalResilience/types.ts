/**
 * types.ts — Layer 0: Statutory 54-FZ Fiscal Register Resilience Types & DTO Contracts.
 * Zero runtime dependencies, pure interfaces and types.
 */

import type { Ffd12ReceiptPayload } from "../kkt/FiscalReceiptFactory.js";
import type {
	KktDeviceStatus,
	KktLanConfig,
} from "../hardware/types.js";

export type FiscalQueueStatus =
	| "pending_print"
	| "hardware_offline"
	| "offline_pending"
	| "printed"
	| "failed"
	| "all";

export interface FiscalCheckoutInput {
	organizationId: string;
	patientId: string;
	visitId?: string | null | undefined;
	amountRub: number;
	method: "cash" | "card" | "sbp" | "online" | "family_wallet";
	receiptPayload?: Ffd12ReceiptPayload | undefined;
	cashierFullName?: string | undefined;
	cashierInn?: string | undefined;
	clientContact?: string | undefined;
	items?: Array<{
		name: string;
		priceKopecks: number;
		quantity: number;
		amountKopecks: number;
		vatRate?: string | undefined;
		taxDeductionCode?: string | undefined;
	}> | undefined;
	clientMutationId?: string | undefined;
	kktConfig?: Partial<KktLanConfig> | undefined;
}

export interface FiscalCheckoutResult {
	success: boolean;
	status: "printed" | "fiscalization_pending";
	paymentId: string;
	queueItemId: string;
	amountRub: number;
	fiscalReceiptNumber?: string | undefined;
	fiscalSign?: string | undefined;
	ofdUrl?: string | undefined;
	receiptIssuedAt?: string | undefined;
	autoRetryToken?: string | undefined;
	error?: string | null | undefined;
	hardwareStatus: {
		online: boolean;
		paperOk: boolean;
		error?: string | null | undefined;
	};
}

export interface RetryFiscalizeResult {
	success: boolean;
	status: "printed" | "hardware_offline" | "already_fiscalized";
	paymentId: string;
	queueItemId?: string | undefined;
	fiscalReceiptNumber?: string | undefined;
	fiscalSign?: string | undefined;
	ofdUrl?: string | undefined;
	receiptIssuedAt?: string | undefined;
	autoRetryToken?: string | undefined;
	error?: string | null | undefined;
	deviceStatus: KktDeviceStatus;
}

export interface FiscalHealthTelemetry {
	online: boolean;
	paperOk: boolean;
	shiftOpen: boolean;
	shiftExpired24h: boolean;
	fnDaysRemaining?: number | undefined;
	error?: string | null | undefined;
	checkedAt: string;
}

export type FiscalRetryExecutor = (
	organizationId: string,
	transactionOrPaymentId: string,
	options?: { kktConfig?: Partial<KktLanConfig> },
) => Promise<RetryFiscalizeResult>;
