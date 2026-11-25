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
import { registerCashboxPaymentRoutes } from "../routes/cashbox/cashboxPaymentRoutes.js";
import { registerCashboxRefundRoutes } from "../routes/cashbox/cashboxRefundRoutes.js";
import { registerCashTransferRoutes } from "../routes/cashbox/cashboxShiftModules/cashTransferRoutes.js";
import { registerFiscalReceiptRoutes } from "../routes/fiscal/receiptRoutes/index.js";
import { registerSbpRoutes } from "../routes/sbp/sbpRouteHandlers.js";
import { sberbankPayBodySchema } from "../routes/sberbankRoutes/types.js";
import { FiscalReceiptFactory } from "../services/kkt/FiscalReceiptFactory.js";
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
					paymentId: "00000000-0000-7000-8000-000000000002",
					visitId: null,
					receiptType: "income",
					status: "printed",
					payloadJson: {
						clientMutationId: "00000000-0000-7000-8000-000000000888",
						fiscalReceiptNumber: "0001",
						fiscalDocumentNumber: "101",
						fiscalSign: "12345678",
						kktSerialNumber: "00106700000001",
						fnSerialNumber: "9999078900000001",
						ofdQrPayload: "t=20261124T120000&s=1500.00&fn=9999078900000001&i=101&fp=12345678&n=1",
					},
					retryCount: 2,
					lastError: null,
					printedAt: new Date(),
					createdAt: new Date(),
					updatedAt: new Date(),
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

		// Test FiscalReceiptFactory SSOT item builder
		const receipt = FiscalReceiptFactory.buildFfd12Receipt({
			patientId: "00000000-0000-7000-8000-000000000001",
			customerContact: "+79991112233",
			cashierFullName: "Кассир Иванова М.С.",
			taxationSystem: "usn_income",
			operationType: "income",
			cashKopecks: 370368,
			totalKopecks: 370368,
			items: [
				{
					name: "Стоматологическая процедура",
					priceKopecks: 123456,
					quantity: 3,
					amountKopecks: 370368,
					vatRate: "vat_none",
					subject: "service",
					method: "full_payment",
					measure: "piece",
				},
			],
		});

		assert.equal(receipt.totalKopecks, 370368);
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

	it("6. POST /api/cashbox/payments enforces mandatory UUID Idempotency-Key", async () => {
		const app = Fastify();
		await registerCashboxPaymentRoutes(app);
		await app.ready();

		try {
			// 6a. Missing Idempotency-Key
			const resMissing = await app.inject({
				method: "POST",
				url: "/api/cashbox/payments",
				headers: {
					"x-dente-clinic-token": "demo-showcase-clinic-token",
					"x-dente-staff-token": "demo-showcase-staff-token",
					organizationid: "00000000-0000-7000-8000-000000000099",
				},
				payload: {
					patientId: "00000000-0000-7000-8000-000000000001",
					amountKopecks: 100000,
					method: "cash",
				},
			});
			assert.equal(resMissing.statusCode, 400);
			const jsonMissing = resMissing.json();
			assert.equal(jsonMissing.error, "IdempotencyKeyRequired");

			// 6b. Non-UUID Idempotency-Key
			const resInvalid = await app.inject({
				method: "POST",
				url: "/api/cashbox/payments",
				headers: {
					"idempotency-key": "not-a-valid-uuid",
					"x-dente-clinic-token": "demo-showcase-clinic-token",
					"x-dente-staff-token": "demo-showcase-staff-token",
					organizationid: "00000000-0000-7000-8000-000000000099",
				},
				payload: {
					patientId: "00000000-0000-7000-8000-000000000001",
					amountKopecks: 100000,
					method: "cash",
				},
			});
			assert.equal(resInvalid.statusCode, 400);
			const jsonInvalid = resInvalid.json();
			assert.equal(jsonInvalid.error, "ValidationError");
		} finally {
			await app.close();
		}
	});

	it("7. POST /api/cash/refund enforces mandatory UUID Idempotency-Key", async () => {
		const app = Fastify();
		await registerCashboxRefundRoutes(app);
		await app.ready();

		try {
			// 7a. Missing Idempotency-Key
			const resMissing = await app.inject({
				method: "POST",
				url: "/api/cash/refund",
				headers: {
					"x-dente-clinic-token": "demo-showcase-clinic-token",
					"x-dente-staff-token": "demo-showcase-staff-token",
					organizationid: "00000000-0000-7000-8000-000000000099",
				},
				payload: {
					amountRub: 500,
					reasonText: "Отказ от процедуры",
				},
			});
			assert.equal(resMissing.statusCode, 400);
			const jsonMissing = resMissing.json();
			assert.equal(jsonMissing.error, "IdempotencyKeyRequired");

			// 7b. Non-UUID Idempotency-Key
			const resInvalid = await app.inject({
				method: "POST",
				url: "/api/cash/refund",
				headers: {
					"idempotency-key": "invalid-refund-idempotency-key",
					"x-dente-clinic-token": "demo-showcase-clinic-token",
					"x-dente-staff-token": "demo-showcase-staff-token",
					organizationid: "00000000-0000-7000-8000-000000000099",
				},
				payload: {
					amountRub: 500,
					reasonText: "Отказ от процедуры",
				},
			});
			assert.equal(resInvalid.statusCode, 400);
			const jsonInvalid = resInvalid.json();
			assert.equal(jsonInvalid.error, "ValidationError");
		} finally {
			await app.close();
		}
	});

	it("8. POST /api/fiscal/refund enforces mandatory UUID Idempotency-Key", async () => {
		const app = Fastify();
		await registerFiscalReceiptRoutes(app);
		await app.ready();

		try {
			// 8a. Missing Idempotency-Key
			const resMissing = await app.inject({
				method: "POST",
				url: "/api/fiscal/refund",
				headers: {
					"x-dente-clinic-token": "demo-showcase-clinic-token",
					"x-dente-staff-token": "demo-showcase-staff-token",
					organizationid: "00000000-0000-7000-8000-000000000099",
				},
				payload: {
					patientId: "00000000-0000-7000-8000-000000000001",
					totalRefundKopecks: 100000,
					refundCashKopecks: 100000,
					refundElectronicKopecks: 0,
					refundPrepaidKopecks: 0,
					items: [
						{
							name: "Консультация",
							priceKopecks: 100000,
							quantity: 1,
							amountKopecks: 100000,
							vatRate: "vat_none",
						},
					],
				},
			});
			assert.equal(resMissing.statusCode, 400);

			// 8b. Non-UUID Idempotency-Key
			const resInvalid = await app.inject({
				method: "POST",
				url: "/api/fiscal/refund",
				headers: {
					"idempotency-key": "invalid-fiscal-refund-key",
					"x-dente-clinic-token": "demo-showcase-clinic-token",
					"x-dente-staff-token": "demo-showcase-staff-token",
					organizationid: "00000000-0000-7000-8000-000000000099",
				},
				payload: {
					patientId: "00000000-0000-7000-8000-000000000001",
					totalRefundKopecks: 100000,
					refundCashKopecks: 100000,
					refundElectronicKopecks: 0,
					refundPrepaidKopecks: 0,
					items: [
						{
							name: "Консультация",
							priceKopecks: 100000,
							quantity: 1,
							amountKopecks: 100000,
							vatRate: "vat_none",
						},
					],
				},
			});
			assert.equal(resInvalid.statusCode, 400);
			const jsonInvalid = resInvalid.json();
			assert.equal(jsonInvalid.error, "ValidationError");
		} finally {
			await app.close();
		}
	});

	it("9. POST /api/cash/cash-withdrawal enforces mandatory UUID Idempotency-Key", async () => {
		const app = Fastify();
		registerCashTransferRoutes(app);
		await app.ready();

		try {
			// 9a. Missing Idempotency-Key
			const resMissing = await app.inject({
				method: "POST",
				url: "/api/cash/cash-withdrawal",
				headers: {
					"x-dente-clinic-token": "demo-showcase-clinic-token",
					"x-dente-staff-token": "demo-showcase-staff-token",
					organizationid: "00000000-0000-7000-8000-000000000099",
				},
				payload: {
					amountRub: 2000,
					reasonText: "Инкассация выручки",
				},
			});
			assert.equal(resMissing.statusCode, 400);
			const jsonMissing = resMissing.json();
			assert.equal(jsonMissing.error, "IdempotencyKeyRequired");

			// 9b. Non-UUID Idempotency-Key
			const resInvalid = await app.inject({
				method: "POST",
				url: "/api/cash/cash-withdrawal",
				headers: {
					"idempotency-key": "malformed-withdrawal-key",
					"x-dente-clinic-token": "demo-showcase-clinic-token",
					"x-dente-staff-token": "demo-showcase-staff-token",
					organizationid: "00000000-0000-7000-8000-000000000099",
				},
				payload: {
					amountRub: 2000,
					reasonText: "Инкассация выручки",
				},
			});
			assert.equal(resInvalid.statusCode, 400);
			const jsonInvalid = resInvalid.json();
			assert.equal(jsonInvalid.error, "ValidationError");
		} finally {
			await app.close();
		}
	});

	it("10. POST /api/sbp/create-qr enforces mandatory UUID Idempotency-Key and tenant context", async () => {
		const app = Fastify();
		registerSbpRoutes(app);
		await app.ready();

		try {
			// 10a. Missing Idempotency-Key
			const resMissing = await app.inject({
				method: "POST",
				url: "/api/sbp/create-qr",
				headers: {
					"x-dente-clinic-token": "demo-showcase-clinic-token",
					organizationid: "00000000-0000-7000-8000-000000000099",
				},
				payload: {
					operationId: "10000000-0000-0000-0000-000000000001",
					bankMemberId: "100000000111",
					amountKopecks: 500000,
					currency: "RUB",
					ttlSeconds: 600,
				},
			});
			assert.equal(resMissing.statusCode, 400);
			const jsonMissing = resMissing.json();
			assert.equal(jsonMissing.error, "IdempotencyKeyRequired");

			// 10b. Non-UUID Idempotency-Key
			const resInvalid = await app.inject({
				method: "POST",
				url: "/api/sbp/create-qr",
				headers: {
					"idempotency-key": "not-a-valid-sbp-qr-uuid",
					"x-dente-clinic-token": "demo-showcase-clinic-token",
					organizationid: "00000000-0000-7000-8000-000000000099",
				},
				payload: {
					operationId: "10000000-0000-0000-0000-000000000001",
					bankMemberId: "100000000111",
					amountKopecks: 500000,
					currency: "RUB",
					ttlSeconds: 600,
				},
			});
			assert.equal(resInvalid.statusCode, 400);
			const jsonInvalid = resInvalid.json();
			assert.equal(jsonInvalid.error, "ValidationError");

			// 10c. Valid UUID Idempotency-Key generates QR and echoes header
			const validKey = "00000000-0000-7000-8000-000000000555";
			const resValid = await app.inject({
				method: "POST",
				url: "/api/sbp/create-qr",
				headers: {
					"idempotency-key": validKey,
					"x-dente-clinic-token": "demo-showcase-clinic-token",
					organizationid: "00000000-0000-7000-8000-000000000099",
				},
				payload: {
					operationId: "10000000-0000-0000-0000-000000000001",
					bankMemberId: "100000000111",
					amountKopecks: 500000,
					currency: "RUB",
					ttlSeconds: 600,
				},
			});
			assert.equal(resValid.statusCode, 201);
			assert.equal(resValid.headers["idempotency-key"], validKey);
			const jsonValid = resValid.json();
			assert.equal(jsonValid.success, true);
			assert.equal(jsonValid.amountKopecks, 500000);
			assert.ok(jsonValid.payloadUrl?.includes("qr.nspk.ru"));
		} finally {
			await app.close();
		}
	});
});
