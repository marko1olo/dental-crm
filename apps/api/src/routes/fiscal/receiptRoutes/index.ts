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
import {
	handleFiscalCorrection,
	handleFiscalPrescriptionCorrection,
	handleFiscalRefund,
	handleFiscalSelfCorrection,
} from "./receiptCorrectionHandlers.js";
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
	const fiscalMutationOptions = {
		schema: {
			description:
				"Fiscal mutation endpoint with mandatory Idempotency-Key and organizationId isolation",
			headers: {
				type: "object",
				required: ["idempotency-key"],
				properties: {
					"idempotency-key": { type: "string" },
					"x-idempotency-key": { type: "string" },
					"organizationid": { type: "string" },
					"x-organization-id": { type: "string" },
				},
			},
		},
	};

	const fiscalTelemetryOptions = {
		schema: {
			description:
				"Fiscal telemetry and query endpoint with organizationId isolation",
			headers: {
				type: "object",
				properties: {
					"idempotency-key": { type: "string" },
					"x-idempotency-key": { type: "string" },
					"organizationid": { type: "string" },
					"x-organization-id": { type: "string" },
				},
			},
		},
	};

	// SBP status query & manual confirmation
	app.get("/api/fiscal/sbp-status", handleSbpStatus);
	app.post("/api/fiscal/sbp-status", fiscalTelemetryOptions, async (request, reply) => {
		// Telemetry & query: organizationId tenant isolation in withTenantCtx db.transaction
		return handleSbpStatus(request, reply);
	});
	app.get("/api/payments/status", handleSbpStatus);
	app.post("/api/payments/status", fiscalTelemetryOptions, async (request, reply) => {
		// Telemetry & query: organizationId tenant isolation in withTenantCtx db.transaction
		return handleSbpStatus(request, reply);
	});

	// Pre-flight validator
	app.post("/api/fiscal/validate", fiscalTelemetryOptions, async (request, reply) => {
		// Pre-flight validator: organizationId tenant isolation in withTenantCtx db.transaction
		return handleFiscalValidate(request, reply);
	});

	// Hardware telemetry & connection ping
	app.get("/api/fiscal/devices/status", handleKktDeviceStatus);
	app.post("/api/fiscal/devices/test-connection", fiscalTelemetryOptions, async (request, reply) => {
		// Hardware ping: organizationId tenant isolation in withTenantCtx db.transaction
		return handleKktTestConnection(request, reply);
	});

	// Fiscal receipt generation & print
	app.post("/api/fiscal/receipts", fiscalMutationOptions, async (request, reply) => {
		// 54-FZ receipt: Idempotency-Key & organizationId tenant isolation in withTenantCtx db.transaction
		return handleFiscalReceipt(request, reply);
	});
	app.post("/api/finance/receipts", fiscalMutationOptions, async (request, reply) => {
		// 54-FZ receipt: Idempotency-Key & organizationId tenant isolation in withTenantCtx db.transaction
		return handleFiscalReceipt(request, reply);
	});
	app.post("/api/billing/fiscalize-receipt", fiscalMutationOptions, async (request, reply) => {
		// 54-FZ receipt: Idempotency-Key & organizationId tenant isolation in withTenantCtx db.transaction
		return handleFiscalReceipt(request, reply);
	});

	// Fiscal refund generation & print
	app.post("/api/fiscal/refund", fiscalMutationOptions, async (request, reply) => {
		// 54-FZ refund: Idempotency-Key & organizationId tenant isolation in withTenantCtx db.transaction
		return handleFiscalRefund(request, reply);
	});
	app.post("/api/finance/refund", fiscalMutationOptions, async (request, reply) => {
		// 54-FZ refund: Idempotency-Key & organizationId tenant isolation in withTenantCtx db.transaction
		return handleFiscalRefund(request, reply);
	});

	// 54-FZ Correction Receipts (self-initiated & tax authority prescription)
	app.post("/api/fiscal/correction", fiscalMutationOptions, async (request, reply) => {
		// 54-FZ correction: Idempotency-Key & organizationId tenant isolation in withTenantCtx db.transaction
		return handleFiscalCorrection(request, reply);
	});
	app.post("/api/fiscal/correction/self-calculation", fiscalMutationOptions, async (request, reply) => {
		// 54-FZ correction: Idempotency-Key & organizationId tenant isolation in withTenantCtx db.transaction
		return handleFiscalSelfCorrection(request, reply);
	});
	app.post("/api/fiscal/correction/prescription", fiscalMutationOptions, async (request, reply) => {
		// 54-FZ correction: Idempotency-Key & organizationId tenant isolation in withTenantCtx db.transaction
		return handleFiscalPrescriptionCorrection(request, reply);
	});
	app.post("/api/finance/correction", fiscalMutationOptions, async (request, reply) => {
		// 54-FZ correction: Idempotency-Key & organizationId tenant isolation in withTenantCtx db.transaction
		return handleFiscalCorrection(request, reply);
	});

	// Offline buffer queue management & retries
	app.get("/api/fiscal/queue", handleFiscalQueueList);
	app.post("/api/fiscal/queue/:id/retry", fiscalMutationOptions, async (request, reply) => {
		// Queue retry: Idempotency-Key & organizationId tenant isolation in withTenantCtx db.transaction
		return handleFiscalQueueRetry(request, reply);
	});
	app.post("/api/fiscal/queue/retry-all", fiscalMutationOptions, async (request, reply) => {
		// Queue retry-all: Idempotency-Key & organizationId tenant isolation in withTenantCtx db.transaction
		return handleFiscalQueueRetryAll(request, reply);
	});
	app.post("/api/fiscal/queue/auto-retry/start", fiscalTelemetryOptions, async (request, reply) => {
		// Auto-retry loop: organizationId tenant isolation in withTenantCtx db.transaction
		return handleFiscalQueueAutoRetryStart(request, reply);
	});
	app.post("/api/fiscal/queue/auto-retry/stop", fiscalTelemetryOptions, async (request, reply) => {
		// Auto-retry loop: organizationId tenant isolation in withTenantCtx db.transaction
		return handleFiscalQueueAutoRetryStop(request, reply);
	});
}

// Re-export all handlers, constants, and types
export * from "./constants.js";
export * from "./types.js";
export * from "./receiptDraftHandlers.js";
export * from "./receiptFiscalizeHandlers.js";
export * from "./receiptCorrectionHandlers.js";
export * from "./receiptQueryHandlers.js";
