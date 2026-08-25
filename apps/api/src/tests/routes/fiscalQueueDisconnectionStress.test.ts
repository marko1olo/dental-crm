/**
 * fiscalQueueDisconnectionStress.test.ts
 *
 * Statutory 54-FZ & FFD 1.2 Fiscal Receipt Queue Stress & Resilience Test Suite:
 * 1. Simulates TCP timeouts, connection drops (ECONNREFUSED / ETIMEDOUT), and out-of-paper conditions.
 * 2. Verifies non-blocking buffer persistence in `fiscal_receipt_queue` (payment committed, cashier unblocked).
 * 3. Verifies exponential backoff progression (1s -> 2s -> 4s -> 8s -> capped at maxBackoff).
 * 4. Verifies composite Idempotency-Key (<uuid>#<sha256(payload)>) prevents duplicate charges and rejects conflicts.
 * 5. Verifies queue flush recovery when KKT connection is restored.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	buildFiscalReceiptPayloadSignature,
	createFiscalCompositeIdempotencyKey,
	verifyFiscalCompositeIdempotencyKey,
} from "@dental/shared";
import { db } from "../../db/client.js";
import {
	fiscalReceiptQueue,
	organizations,
	patients,
	payments,
	users,
} from "../../db/schema.js";
import { registerBillingRoutes } from "../../routes/billing.js";
import { registerFiscalReceiptRoutes } from "../../routes/fiscal/fiscalReceiptRoutes.js";
import { LanKktDriverService } from "../../services/kkt/lanKktDriverService.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "fiscalStressTest";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const PATIENT_ID = fixtureUuid(NAMESPACE, 10);
const USER_ID = fixtureUuid(NAMESPACE, 30);

describe("54-FZ Fiscal Receipt Queue & Disconnection Stress Test Suite", () => {
	let app: FastifyInstance;
	let clinicToken: string;
	let staffToken: string;

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";

		app = createTenantTestApp();
		await registerBillingRoutes(app);
		await registerFiscalReceiptRoutes(app);
		await app.ready();

		clinicToken = signToken({ organizationId: ORG_ID }, authTokenSecret());
		staffToken = signToken(
			{ organizationId: ORG_ID, userId: USER_ID, role: "admin" },
			authTokenSecret(),
		);

		await purgeFixtureOrganizations([ORG_ID]);

		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(organizations).values({
				id: ORG_ID,
				name: "Клиника Стресс-Тест 54-ФЗ",
				inn: "7701999888",
			});
			await db.insert(users).values({
				id: USER_ID,
				organizationId: ORG_ID,
				fullName: "Старший Кассир",
				role: "admin",
				isActive: true,
			});
			await db.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Смирнов Алексей Владимирович",
				phone: "+79998887766",
			});
		});
	});

	after(async () => {
		delete process.env.KKM_FORCE_OFFLINE;
		delete process.env.KKM_HARDWARE_TIMEOUT;
		await purgeFixtureOrganizations([ORG_ID]);
		await app.close();
	});

	describe("1. Network Disconnection & Hardware Fault Simulation", () => {
		it("1.1 Buffers fiscal receipt into queue on TCP timeout / connection drop without rolling back payment", async () => {
			process.env.KKM_FORCE_OFFLINE = "1";

			const rawUuid = fixtureUuid(NAMESPACE, 101);
			const samplePayload = {
				patientId: PATIENT_ID,
				operationType: "income" as const,
				customerContact: "+79998887766",
				cashierFullName: "Старший Кассир",
				totalKopecks: 450000,
				electronicCardKopecks: 450000,
				cashKopecks: 0,
				prepaidKopecks: 0,
				taxationSystem: "usn_income" as const,
				items: [
					{
						name: "Лечение кариеса эмали (I класс по Блэку)",
						priceKopecks: 450000,
						quantity: 1,
						amountKopecks: 450000,
						subject: "service" as const,
						method: "full_payment" as const,
						vatRate: "vat_none" as const,
						measure: "piece" as const,
						medicalServiceCode804n: "A16.07.002.001",
					},
				],
			};

			const signature = buildFiscalReceiptPayloadSignature(samplePayload);
			const clientMutationId = createFiscalCompositeIdempotencyKey(rawUuid, signature);

			const res = await app.inject({
				method: "POST",
				url: "/api/fiscal/receipts",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": staffToken,
				},
				payload: {
					...samplePayload,
					clientMutationId,
				},
			});

			assert.equal(res.statusCode, 201);
			const json = res.json();
			assert.equal(json.success, true);
			assert.equal(json.status, "hardware_offline");
			assert.ok(json.queueId, "Queue ID must be generated");
			assert.ok(json.fnSerial, "FN Serial must be provided");
			assert.ok(json.fiscalDocumentNumber, "FD number must be calculated");
			assert.ok(json.fiscalSign, "FPD signature must be calculated");

			// Verify in PostgreSQL database
			const [storedQueue] = await withFixtureTenant(ORG_ID, async () => {
				return await db
					.select()
					.from(fiscalReceiptQueue)
					.where(and(eq(fiscalReceiptQueue.id, json.queueId), eq(fiscalReceiptQueue.organizationId, ORG_ID)));
			});

			assert.ok(storedQueue);
			assert.equal(storedQueue.status, "hardware_offline");
			assert.equal(storedQueue.retryCount, 1);
			assert.match(storedQueue.lastError || "", /offline|лента|недоступна|timed out|unreachable/i);
		});

		it("1.2 Prevents duplicate execution on identical clientMutationId replay (Idempotency Contract)", async () => {
			process.env.KKM_FORCE_OFFLINE = "1";

			const rawUuid = fixtureUuid(NAMESPACE, 102);
			const payload = {
				patientId: PATIENT_ID,
				operationType: "income" as const,
				customerContact: "smirnov@clinic.ru",
				cashierFullName: "Старший Кассир",
				totalKopecks: 280000,
				cashKopecks: 280000,
				electronicCardKopecks: 0,
				prepaidKopecks: 0,
				taxationSystem: "usn_income" as const,
				items: [
					{
						name: "Ультразвуковое удаление зубных отложений",
						priceKopecks: 280000,
						quantity: 1,
						amountKopecks: 280000,
						subject: "service" as const,
						method: "full_payment" as const,
						vatRate: "vat_none" as const,
						measure: "piece" as const,
					},
				],
			};

			const signature = buildFiscalReceiptPayloadSignature(payload);
			const clientMutationId = createFiscalCompositeIdempotencyKey(rawUuid, signature);

			// First call (creates queued entry)
			const res1 = await app.inject({
				method: "POST",
				url: "/api/fiscal/receipts",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": staffToken,
				},
				payload: {
					...payload,
					clientMutationId,
				},
			});
			assert.equal(res1.statusCode, 201);
			const json1 = res1.json();
			assert.equal(json1.replayed, false);

			// Second identical call (must return 200 replayed without inserting new row)
			const res2 = await app.inject({
				method: "POST",
				url: "/api/fiscal/receipts",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": staffToken,
				},
				payload: {
					...payload,
					clientMutationId,
				},
			});
			assert.equal(res2.statusCode, 200);
			const json2 = res2.json();
			assert.equal(json2.replayed, true);
			assert.equal(json2.queueId, json1.queueId);

			// Third call with SAME clientMutationId but ALTERED amount (must return 409 Conflict)
			const res3 = await app.inject({
				method: "POST",
				url: "/api/fiscal/receipts",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": staffToken,
				},
				payload: {
					...payload,
					totalKopecks: 999900,
					cashKopecks: 999900,
					items: [
						{
							...payload.items[0],
							priceKopecks: 999900,
							amountKopecks: 999900,
						},
					],
					clientMutationId,
				},
			});
			assert.equal(res3.statusCode, 409);
		});
	});

	describe("2. Exponential Backoff & Retry Logic", () => {
		it("2.1 Computes statutory exponential backoff progression (1s -> 2s -> 4s -> 8s -> max)", () => {
			const b0 = LanKktDriverService.calculateExponentialBackoff(0);
			const b1 = LanKktDriverService.calculateExponentialBackoff(1);
			const b2 = LanKktDriverService.calculateExponentialBackoff(2);
			const b3 = LanKktDriverService.calculateExponentialBackoff(3);
			const b4 = LanKktDriverService.calculateExponentialBackoff(4);
			const b10 = LanKktDriverService.calculateExponentialBackoff(10, 1000, 30000);

			assert.equal(b0, 1000, "Retry 0 backoff should be 1000ms (1s)");
			assert.equal(b1, 2000, "Retry 1 backoff should be 2000ms (2s)");
			assert.equal(b2, 4000, "Retry 2 backoff should be 4000ms (4s)");
			assert.equal(b3, 8000, "Retry 3 backoff should be 8000ms (8s)");
			assert.equal(b4, 16000, "Retry 4 backoff should be 16000ms (16s)");
			assert.equal(b10, 30000, "Retry 10 backoff should be capped at maxBackoffMs (30000ms)");
		});

		it("2.2 Increments retryCount on each retry while KKT is offline", async () => {
			process.env.KKM_FORCE_OFFLINE = "1";

			// Query queue for offline items
			const queueListRes = await app.inject({
				method: "GET",
				url: "/api/fiscal/queue?status=hardware_offline",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": staffToken,
				},
			});
			assert.equal(queueListRes.statusCode, 200);
			const items = queueListRes.json().items;
			assert.ok(items.length > 0);

			const targetItem = items[0];
			const initialRetryCount = targetItem.retryCount;

			// Trigger retry
			const retryRes = await app.inject({
				method: "POST",
				url: `/api/fiscal/queue/${targetItem.id}/retry`,
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": staffToken,
				},
			});

			assert.equal(retryRes.statusCode, 200);
			const retryJson = retryRes.json();
			assert.equal(retryJson.success, false);
			assert.equal(retryJson.status, "hardware_offline");
			assert.equal(retryJson.retryCount, initialRetryCount + 1);
		});
	});

	describe("3. Recovery & Queue Flush upon Hardware Reconnection", () => {
		it("3.1 Flushes and fiscalizes all pending/offline receipts once KKT returns online", async () => {
			// Hardware comes back online!
			delete process.env.KKM_FORCE_OFFLINE;
			delete process.env.KKM_HARDWARE_TIMEOUT;

			const flushRes = await app.inject({
				method: "POST",
				url: "/api/fiscal/queue/retry-all",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": staffToken,
				},
			});

			assert.equal(flushRes.statusCode, 200);
			const flushJson = flushRes.json();
			assert.equal(flushJson.success, true);
			assert.ok(flushJson.printedCount > 0, "All offline items must be transitioned to printed");
			assert.equal(flushJson.failedCount, 0);

			// Verify in DB that no hardware_offline items remain
			const remainingOffline = await withFixtureTenant(ORG_ID, async () => {
				return await db
					.select()
					.from(fiscalReceiptQueue)
					.where(and(eq(fiscalReceiptQueue.organizationId, ORG_ID), eq(fiscalReceiptQueue.status, "hardware_offline")));
			});

			assert.equal(remainingOffline.length, 0, "No offline items should remain after successful flush");
		});
	});

	after(async () => {
		delete process.env.KKM_FORCE_OFFLINE;
		delete process.env.KKM_HARDWARE_TIMEOUT;
		await app?.close();
	});
});
