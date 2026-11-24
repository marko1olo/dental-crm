/**
 * cashboxFixerSurgeon.test.ts — Unit & Integration Test Suite for Cashbox 54-FZ, Sberbank, and Fiscal Queue.
 *
 * Verifies:
 * 1. handleFiscalQueueRetry delegates real hardware execution to FiscalQueueRetryWorker.retrySingleReceipt.
 * 2. POST /api/fiscal/receipts enforces mandatory Idempotency-Key / clientMutationId (400 Bad Request / IdempotencyKeyRequired).
 * 3. Exact kopeck arithmetic via multiplyKopecks & multiplyKopecksFractional without IEEE-754 drift.
 * 4. Sberbank acquiring schema parses canonical amountKopecks and legacy amount alias.
 * 5. Complete removal of orphan cashLedger table from schema exports.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Fastify from "fastify";
import type { Kopecks } from "@dental/shared";
import { multiplyKopecks, multiplyKopecksFractional } from "@dental/shared";
import * as schema from "../db/schema.js";
import { registerFiscalReceiptRoutes } from "../routes/fiscal/receiptRoutes/index.js";
import { sberbankPayBodySchema } from "../routes/sberbankRoutes/types.js";
import { Fiscal54FzService } from "../services/billing/fiscal54fzService.js";
import { FiscalQueueRetryWorker } from "../services/hardware/index.js";

describe("Cashbox & Payments Fixer Surgeon Suite (Domain 1)", () => {
	it("1. handleFiscalQueueRetry delegates to FiscalQueueRetryWorker.retrySingleReceipt", async () => {
		const app = Fastify();
		await registerFiscalReceiptRoutes(app);
		await app.ready();

		const testOrgId = "01a00000-0000-0000-0000-000000000000";
		const testQueueId = "00000000-0000-7000-8000-000000000001";
		let capturedOrgId: string | null = null;
		let capturedQueueId: string | null = null;

		const originalRetry = FiscalQueueRetryWorker.retrySingleReceipt;
		try {
			FiscalQueueRetryWorker.retrySingleReceipt = async (orgId: string, id: string) => {
				capturedOrgId = orgId;
				capturedQueueId = id;
				const mockRecord: typeof schema.fiscalReceiptQueue.$inferSelect = {
					id,
					organizationId: orgId,
					cashierId: null,
					patientId: "00000000-0000-7000-8000-000000000002",
					patientInvoiceId: null,
					status: "printed",
					retryCount: 2,
					lastError: null,
					idempotencyKey: "test-idem-key",
					fiscalReceiptNumber: "0001",
					fiscalDocumentNumber: "101",
					fiscalSign: "12345678",
					kktSerialNumber: "00106700000001",
					fnSerialNumber: "9999078900000001",
					deviceModel: "ATOL-25F",
					ofdName: "OFD-Я",
					ofdQrPayload: "t=20261124T120000&s=1500.00&fn=9999078900000001&i=101&fp=12345678&n=1",
					ofdTransmissionStatus: "buffered",
					ofdLastTransmissionAt: null,
					offlineBufferHash: null,
					printedAt: new Date(),
					createdAt: new Date(),
					updatedAt: new Date(),
					receiptPayload: {},
				};
				return {
					success: true,
					status: "printed",
					item: mockRecord,
					retryCount: 2,
					error: null,
				};
			};

			const res = await app.inject({
				method: "POST",
				url: `/api/fiscal/queue/${testQueueId}/retry`,
				headers: {
					"idempotency-key": "00000000-0000-7000-8000-000000000888",
					"x-dente-clinic-token": "demo-showcase-clinic-token",
					"x-dente-staff-token": "demo-showcase-token",
					organizationid: testOrgId,
				},
			});

			assert.equal(res.statusCode, 200);
			const json = res.json();
			assert.equal(json.success, true);
			assert.equal(json.status, "printed");
			assert.equal(json.retryCount, 2);
			assert.equal(capturedOrgId, testOrgId);
			assert.equal(capturedQueueId, testQueueId);
		} finally {
			FiscalQueueRetryWorker.retrySingleReceipt = originalRetry;
			await app.close();
		}
	});

	it("2. POST /api/fiscal/receipts rejects missing Idempotency-Key with HTTP 400", async () => {
		const app = Fastify();
		await registerFiscalReceiptRoutes(app);
		await app.ready();

		try {
			// Fastify schema validation requires "idempotency-key" header
			const resWithoutHeader = await app.inject({
				method: "POST",
				url: "/api/fiscal/receipts",
				headers: {
					organizationid: "00000000-0000-7000-8000-000000000099",
				},
				payload: {
					patientId: "00000000-0000-7000-8000-000000000001",
					operationType: "income",
					customerContact: "+79991112233",
					cashierFullName: "Кассир Иванова М.С.",
					totalKopecks: 100000,
					cashKopecks: 100000,
					items: [
						{
							name: "Консультация врача-стоматолога",
							priceKopecks: 100000,
							quantity: 1,
							amountKopecks: 100000,
							subject: "service",
							method: "full_payment",
							vatRate: "vat_none",
						},
					],
				},
			});

			assert.equal(resWithoutHeader.statusCode, 400);
			const jsonWithoutHeader = resWithoutHeader.json();
			assert.ok(
				jsonWithoutHeader.message?.includes("idempotency-key") ||
				jsonWithoutHeader.error === "IdempotencyKeyRequired" ||
				jsonWithoutHeader.error === "Bad Request",
			);
		} finally {
			await app.close();
		}
	});

	it("3. Receipt item calculations strictly use multiplyKopecks without float drift", () => {
		const unitPrice = 123456 as Kopecks; // 1,234.56 RUB
		const quantity = 3;
		const totalKopecks = multiplyKopecks(unitPrice, quantity);
		assert.equal(totalKopecks, 370368); // 3,703.68 RUB exact

		const fractionalQty = 2.5;
		const fractionalTotal = multiplyKopecksFractional(unitPrice, fractionalQty);
		assert.equal(fractionalTotal, 308640); // 3,086.40 RUB exact

		// Test Fiscal54FzService item builder
		const receipt = Fiscal54FzService.buildStatutoryFiscalReceipt({
			organizationId: "00000000-0000-7000-8000-000000000099",
			patientId: "00000000-0000-7000-8000-000000000001",
			customerContact: "+79991112233",
			cashierFullName: "Кассир Иванова М.С.",
			taxationSystem: "usn_income",
			positions: [
				{
					name: "Стоматологическая процедура",
					priceRub: 1234.56,
					quantity: 3,
					vatRate: "vat_none",
					subject: "service",
					method: "full_payment",
				},
			],
			tenderSplits: {
				cashRub: 3703.68,
			},
		});

		assert.equal(receipt.tag1020_totalKopecks, 370368);
		assert.equal(receipt.items[0]?.amountKopecks, 370368);
	});

	it("4. Sberbank pay body schema accepts amountKopecks (canonical) and amount (legacy alias)", () => {
		const patientId = "00000000-0000-7000-8000-000000000001";

		// Canonical DTO
		const canonical = sberbankPayBodySchema.parse({
			patientId,
			amountKopecks: 50000,
		});
		assert.equal(canonical.amountKopecks, 50000);

		// Legacy DTO with alias
		const legacy = sberbankPayBodySchema.parse({
			patientId,
			amount: 75000,
		});
		assert.equal(legacy.amountKopecks, 75000);

		// Rejects non-positive or missing
		assert.throws(() => sberbankPayBodySchema.parse({ patientId, amountKopecks: -100 }));
		assert.throws(() => sberbankPayBodySchema.parse({ patientId }));
	});

	it("5. Orphan table cashLedger is completely removed from database schema exports", () => {
		const schemaExports = schema as Record<string, unknown>;
		assert.equal(schemaExports.cashLedger, undefined);
	});
});
