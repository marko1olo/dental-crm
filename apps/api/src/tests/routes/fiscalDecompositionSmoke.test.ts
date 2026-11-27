/**
 * fiscalDecompositionSmoke.test.ts
 *
 * Verifies that the decomposed 54-FZ fiscal receipt routes module:
 * 1. Can be imported via the canonical facade apps/api/src/routes/fiscal/fiscalReceiptRoutes.js
 * 2. Successfully registers all 14 statutory FFD 1.2 fiscal endpoints in Fastify
 * 3. Preserves all Layer 0-3 exported symbols, schemas, and helper functions
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Fastify from "fastify";
import {
	DEFAULT_KKT_PING_HOST,
	DEFAULT_KKT_PING_PORT,
	DEFAULT_KKT_PING_TIMEOUT_MS,
	FFD_12_OPERATION_TYPES,
	FFD_12_PAYMENT_METHODS,
	FFD_12_PAYMENT_SUBJECTS,
	FFD_12_VAT_RATES,
	FISCAL_QUEUE_STATUSES,
	applyCashBoxFiscalReceipt,
	applyCashBoxFiscalRefund,
	fiscalQueueIdParamSchema,
	fiscalQueueQuerySchema,
	handleFiscalQueueAutoRetryStart,
	handleFiscalQueueAutoRetryStop,
	handleFiscalQueueList,
	handleFiscalQueueRetry,
	handleFiscalQueueRetryAll,
	handleFiscalReceipt,
	handleFiscalRefund,
	handleFiscalValidate,
	handleKktDeviceStatus,
	handleKktTestConnection,
	handleSbpStatus,
	kktDeviceTestConnectionSchema,
	registerFiscalReceiptRoutes,
	sbpStatusInputSchema,
	verifyAndEnforceCatalogPrices,
} from "../../routes/fiscal/fiscalReceiptRoutes.js";

describe("54-FZ Fiscal Receipt Routes Decomposition Smoke & Parity Suite", () => {
	it("1. Canonical facade validates schemas, enforces dead_letter status & checks catalog prices", async () => {
		const validSbp = sbpStatusInputSchema.safeParse({ operationId: "op-1", action: "check" });
		assert.equal(validSbp.success, false, "Unknown strict field operationId must be rejected");
		const validSbpInput = sbpStatusInputSchema.safeParse({ orderId: "ORD-1", action: "check" });
		assert.equal(validSbpInput.success, true);

		const kktConn = kktDeviceTestConnectionSchema.safeParse({});
		assert.equal(kktConn.success, true);
		assert.equal(kktConn.data.host, "192.168.1.150");
		assert.equal(kktConn.data.port, 16732);

		const queueFilterDeadLetter = fiscalQueueQuerySchema.safeParse({ status: "dead_letter", limit: 25 });
		assert.equal(queueFilterDeadLetter.success, true);
		assert.equal(fiscalQueueIdParamSchema.safeParse({ id: "not-a-uuid" }).success, false);
		assert.equal(fiscalQueueIdParamSchema.safeParse({ id: "01900000-0000-7000-8000-000000000001" }).success, true);

		assert.equal(DEFAULT_KKT_PING_HOST, "192.168.1.150");
		assert.equal(DEFAULT_KKT_PING_PORT, 16732);
		assert.equal(DEFAULT_KKT_PING_TIMEOUT_MS, 3000);
		assert.deepEqual(FISCAL_QUEUE_STATUSES, [
			"pending_print",
			"hardware_offline",
			"offline_pending",
			"printed",
			"failed",
			"dead_letter",
			"all",
		]);
		assert.equal(FFD_12_OPERATION_TYPES.INCOME, 1);
		assert.equal(FFD_12_OPERATION_TYPES.INCOME_RETURN, 2);
		assert.equal(FFD_12_PAYMENT_METHODS.FULL_PAYMENT, 4);
		assert.equal(FFD_12_PAYMENT_SUBJECTS.SERVICE, 4);
		assert.equal(FFD_12_VAT_RATES.NO_VAT, 6);

		const catalogCheck = await verifyAndEnforceCatalogPrices(
			"01900000-0000-7000-8000-000000000001",
			[
				{
					name: "Консультация терапевта",
					priceKopecks: 150000,
					quantity: 1,
					amountKopecks: 150000,
				},
			],
		);
		assert.equal(catalogCheck.success, true);
		assert.equal(Array.isArray(catalogCheck.normalizedItems), true);
		assert.equal(catalogCheck.normalizedItems.length, 1);
	});

	it("2. Registers all 14 statutory FFD 1.2 routes on Fastify instance without router collisions", async () => {
		const app = Fastify();
		const registeredPaths = new Set<string>();

		app.addHook("onRoute", (routeOptions) => {
			registeredPaths.add(`${routeOptions.method} ${routeOptions.url}`);
		});

		await registerFiscalReceiptRoutes(app);
		await app.ready();

		const requiredEndpoints = [
			"GET /api/fiscal/sbp-status",
			"POST /api/fiscal/sbp-status",
			"GET /api/payments/status",
			"POST /api/payments/status",
			"POST /api/fiscal/validate",
			"GET /api/fiscal/devices/status",
			"POST /api/fiscal/devices/test-connection",
			"POST /api/fiscal/receipts",
			"POST /api/finance/receipts",
			"POST /api/fiscal/refund",
			"POST /api/finance/refund",
			"GET /api/fiscal/queue",
			"POST /api/fiscal/queue/:id/retry",
			"POST /api/fiscal/queue/retry-all",
			"POST /api/fiscal/queue/auto-retry/start",
			"POST /api/fiscal/queue/auto-retry/stop",
		];

		for (const route of requiredEndpoints) {
			assert.ok(
				registeredPaths.has(route),
				`Expected endpoint "${route}" to be registered in Fastify. Registered: ${Array.from(registeredPaths).join(", ")}`,
			);
		}

		await app.close();
	});
});
