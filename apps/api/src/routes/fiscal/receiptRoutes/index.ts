/**
 * index.ts — Layer 5: Fastify Plugin & Master Coordinator for Fiscal Receipt Routes.
 *
 * Statutory 54-FZ (FFD 1.2 / ФФД 1.2) Fiscal & Split Payment Routes:
 * - POST /api/fiscal/receipts & POST /api/finance/receipts
 * - POST /api/fiscal/validate
 * - POST /api/fiscal/refund & POST /api/finance/refund
 * - GET  /api/fiscal/sbp-status & POST /api/fiscal/sbp-status (also /api/payments/status)
 * - GET  /api/fiscal/devices/status
 * - POST /api/fiscal/devices/test-connection
 * - GET  /api/fiscal/queue
 * - POST /api/fiscal/queue/:id/retry
 * - POST /api/fiscal/queue/retry-all
 * - POST /api/fiscal/queue/auto-retry/start
 * - POST /api/fiscal/queue/auto-retry/stop
 */

import type { FastifyInstance } from "fastify";
import { handleFiscalValidate } from "./receiptDraftHandlers.js";
import { handleFiscalReceipt } from "./receiptFiscalizeHandlers.js";
import { handleFiscalRefund } from "./receiptCorrectionHandlers.js";
import {
	handleFiscalQueueAutoRetryStart,
	handleFiscalQueueAutoRetryStop,
	handleFiscalQueueList,
	handleFiscalQueueRetry,
	handleFiscalQueueRetryAll,
	handleKktDeviceStatus,
	handleKktTestConnection,
	handleSbpStatus,
} from "./receiptQueryHandlers.js";

export async function registerFiscalReceiptRoutes(
	app: FastifyInstance,
	_opts?: Record<string, unknown>,
): Promise<void> {
	// SBP status query & manual confirmation
	app.get("/api/fiscal/sbp-status", handleSbpStatus);
	app.post("/api/fiscal/sbp-status", handleSbpStatus);
	app.get("/api/payments/status", handleSbpStatus);
	app.post("/api/payments/status", handleSbpStatus);

	// Pre-flight validator
	app.post("/api/fiscal/validate", handleFiscalValidate);

	// Hardware telemetry & connection ping
	app.get("/api/fiscal/devices/status", handleKktDeviceStatus);
	app.post("/api/fiscal/devices/test-connection", handleKktTestConnection);

	// Fiscal receipt generation & print
	app.post("/api/fiscal/receipts", handleFiscalReceipt);
	app.post("/api/finance/receipts", handleFiscalReceipt);

	// Fiscal refund generation & print
	app.post("/api/fiscal/refund", handleFiscalRefund);
	app.post("/api/finance/refund", handleFiscalRefund);

	// Offline buffer queue management & retries
	app.get("/api/fiscal/queue", handleFiscalQueueList);
	app.post("/api/fiscal/queue/:id/retry", handleFiscalQueueRetry);
	app.post("/api/fiscal/queue/retry-all", handleFiscalQueueRetryAll);
	app.post("/api/fiscal/queue/auto-retry/start", handleFiscalQueueAutoRetryStart);
	app.post("/api/fiscal/queue/auto-retry/stop", handleFiscalQueueAutoRetryStop);
}

// Re-export all handlers, constants, and types
export * from "./constants.js";
export * from "./types.js";
export * from "./receiptDraftHandlers.js";
export * from "./receiptFiscalizeHandlers.js";
export * from "./receiptCorrectionHandlers.js";
export * from "./receiptQueryHandlers.js";
