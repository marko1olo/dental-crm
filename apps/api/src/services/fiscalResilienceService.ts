/**
 * fiscalResilienceService.ts — Statutory 2-Phase Fiscal Register Resilience Engine (54-FZ / FFD 1.2).
 * Thin canonical facade delegating to modular implementation in ./fiscalResilience/
 * Compliant with THE HAMMER Master Prompt, Mandate 8b (<= 30 lines), and Zero Mocks.
 */

export type {
	FiscalCheckoutInput,
	FiscalCheckoutResult,
	RetryFiscalizeResult,
} from "./fiscalResilience/types.js";
export {
	FiscalResilienceService,
	FiscalQueueManager,
	FiscalHealthChecker,
	FiscalRetryPolicy,
} from "./fiscalResilience/index.js";
export * from "./fiscalResilience/index.js";
