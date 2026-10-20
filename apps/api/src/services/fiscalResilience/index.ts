/**
 * index.ts — Modular Fiscal Register Resilience Service Barrel.
 *
 * Coordinates:
 * - Layer 0: Types & DTO Contracts (types.ts)
 * - Layer 1: Fiscal Queue & Resilient Checkout (fiscalQueueManager.ts)
 * - Layer 2: Fiscal Health & Background Poller (fiscalHealthChecker.ts)
 * - Layer 3: Exponential Retry & Idempotency Guard (fiscalRetryPolicy.ts)
 *
 * Compliant with THE HAMMER Master Prompt, Mandate 8b, and Zero Mocks.
 */

import { FiscalHealthChecker } from "./fiscalHealthChecker.js";
import { FiscalQueueManager } from "./fiscalQueueManager.js";
import { FiscalRetryPolicy } from "./fiscalRetryPolicy.js";

// Register default retry executor for the background poller
FiscalHealthChecker.setRetryExecutor(FiscalRetryPolicy.retryFiscalizeTransaction);

export class FiscalResilienceService {
	public static processFiscalCheckout = FiscalQueueManager.processFiscalCheckout;
	public static retryFiscalizeTransaction = FiscalRetryPolicy.retryFiscalizeTransaction;
	public static handleRetryFiscalizeRoute = FiscalRetryPolicy.handleRetryFiscalizeRoute;

	public static startBackgroundWorker(
		organizationId: string,
		intervalMs = 15000,
	): void {
		FiscalHealthChecker.startBackgroundWorker(
			organizationId,
			intervalMs,
			FiscalRetryPolicy.retryFiscalizeTransaction,
		);
	}

	public static stopBackgroundWorker(): void {
		FiscalHealthChecker.stopBackgroundWorker();
	}
}

export { FiscalQueueManager } from "./fiscalQueueManager.js";
export { FiscalHealthChecker } from "./fiscalHealthChecker.js";
export { FiscalRetryPolicy, FISCAL_RETRY_SCHEDULE_MS } from "./fiscalRetryPolicy.js";
export * from "./types.js";
