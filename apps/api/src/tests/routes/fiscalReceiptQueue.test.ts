import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	fiscalReceiptQueue,
	organizations,
	patients,
	payments,
	users,
} from "../../db/schema.js";
import { registerBillingRoutes } from "../../routes/billing.js";
import { registerSbpQrRoutes } from "../../routes/sbpQr.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "fiscalQueueTest";
const ORG_A_ID = fixtureUuid(NAMESPACE, 1);
const ORG_B_ID = fixtureUuid(NAMESPACE, 2);
const PATIENT_A_ID = fixtureUuid(NAMESPACE, 10);
const PATIENT_B_ID = fixtureUuid(NAMESPACE, 20);
const USER_A_ID = fixtureUuid(NAMESPACE, 30);
const USER_B_ID = fixtureUuid(NAMESPACE, 40);

describe("Milestone 1: Offline 54-FZ KKT Fiscal Print Buffer (TASK-1.3)", () => {
	let app: FastifyInstance;
	let clinicTokenA: string;
	let staffTokenA: string;
	let clinicTokenB: string;
	let staffTokenB: string;

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";

		app = createTenantTestApp();
		await registerBillingRoutes(app);
		await registerSbpQrRoutes(app);
		await app.ready();

		clinicTokenA = signToken({ organizationId: ORG_A_ID }, authTokenSecret());
		staffTokenA = signToken(
			{ organizationId: ORG_A_ID, userId: USER_A_ID, role: "admin" },
			authTokenSecret(),
		);

		clinicTokenB = signToken({ organizationId: ORG_B_ID }, authTokenSecret());
		staffTokenB = signToken(
			{ organizationId: ORG_B_ID, userId: USER_B_ID, role: "admin" },
			authTokenSecret(),
		);

		await purgeFixtureOrganizations([ORG_A_ID, ORG_B_ID]);

		// Seed Org A
		await withFixtureTenant(ORG_A_ID, async () => {
			await db.insert(organizations).values({
				id: ORG_A_ID,
				name: "Клиника А (Фискальный Буфер)",
				inn: "7701111111",
			});
			await db.insert(users).values({
				id: USER_A_ID,
				organizationId: ORG_A_ID,
				fullName: "Кассир Клиники А",
				role: "admin",
				isActive: true,
			});
			await db.insert(patients).values({
				id: PATIENT_A_ID,
				organizationId: ORG_A_ID,
				fullName: "Иванов Иван Иванович",
				phone: "+79991112233",
			});
		});

		// Seed Org B
		await withFixtureTenant(ORG_B_ID, async () => {
			await db.insert(organizations).values({
				id: ORG_B_ID,
				name: "Клиника Б (Фискальный Буфер)",
				inn: "7702222222",
			});
			await db.insert(users).values({
				id: USER_B_ID,
				organizationId: ORG_B_ID,
				fullName: "Кассир Клиники Б",
				role: "admin",
				isActive: true,
			});
			await db.insert(patients).values({
				id: PATIENT_B_ID,
				organizationId: ORG_B_ID,
				fullName: "Петров Петр Петрович",
				phone: "+79994445566",
			});
		});
	});

	after(async () => {
		delete process.env.KKM_FORCE_OFFLINE;
		delete process.env.KKM_HARDWARE_TIMEOUT;
		await purgeFixtureOrganizations([ORG_A_ID, ORG_B_ID]);
		await app.close();
	});

	it("1.1 Successfully fiscalizes receipt and updates queue status to printed when KKT is online", async () => {
		delete process.env.KKM_FORCE_OFFLINE;

		const response = await app.inject({
			method: "POST",
			url: "/api/billing/fiscalize-receipt",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": staffTokenA,
			},
			payload: {
				patientId: PATIENT_A_ID,
				operationType: "income",
				customerContact: "ivanov@example.com",
				cashierFullName: "Кассир Клиники А",
				totalKopecks: 120000,
				cashKopecks: 120000,
				items: [
					{
						name: "Первичный осмотр и консультация",
						priceKopecks: 120000,
						quantity: 1,
						amountKopecks: 120000,
						subject: "service",
						method: "full_payment",
						vatRate: "vat_none",
						measure: "piece",
					},
				],
			},
		});

		assert.equal(response.statusCode, 201);
		const json = response.json();
		assert.equal(json.success, true);
		assert.equal(json.queueStatus, "printed");
		assert.ok(json.queueId, "queueId should be returned");

		// Verify in database
		const [queueItem] = await withFixtureTenant(ORG_A_ID, async () => {
			return await db
				.select()
				.from(fiscalReceiptQueue)
				.where(
					and(
						eq(fiscalReceiptQueue.id, json.queueId),
						eq(fiscalReceiptQueue.organizationId, ORG_A_ID),
					),
				);
		});

		assert.ok(queueItem);
		assert.equal(queueItem.status, "printed");
		assert.ok(queueItem.printedAt);
		assert.equal(queueItem.retryCount, 0);
	});

	it("1.2 Buffers receipt as hardware_offline on KKT failure without rolling back payment transaction", async () => {
		// Simulate offline KKT hardware
		process.env.KKM_FORCE_OFFLINE = "1";

		const mutationId = `mut-offline-${Date.now()}`;
		const response = await app.inject({
			method: "POST",
			url: "/api/billing/fiscalize-receipt",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": staffTokenA,
			},
			payload: {
				clientMutationId: mutationId,
				patientId: PATIENT_A_ID,
				operationType: "income",
				customerContact: "+79991112233",
				cashierFullName: "Кассир Клиники А",
				totalKopecks: 350000,
				electronicCardKopecks: 350000,
				items: [
					{
						name: "Профессиональная гигиена полости рта",
						priceKopecks: 350000,
						quantity: 1,
						amountKopecks: 350000,
						subject: "service",
						method: "full_payment",
						vatRate: "vat_none",
						measure: "piece",
					},
				],
			},
		});

		assert.equal(response.statusCode, 201);
		const json = response.json();
		assert.equal(json.success, true);
		assert.equal(json.queueStatus, "hardware_offline");
		assert.ok(json.queueId);

		// Verify payment is COMMITTED and valid in database
		const [storedPayment] = await withFixtureTenant(ORG_A_ID, async () => {
			return await db
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, ORG_A_ID),
						eq(payments.clientMutationId, mutationId),
					),
				);
		});
		assert.ok(storedPayment, "Payment must exist and be committed!");
		assert.equal(storedPayment.status, "paid");
		assert.equal(Number(storedPayment.amountRub), 3500);

		// Verify fiscal_receipt_queue item is in hardware_offline state
		const [queueItem] = await withFixtureTenant(ORG_A_ID, async () => {
			return await db
				.select()
				.from(fiscalReceiptQueue)
				.where(
					and(
						eq(fiscalReceiptQueue.id, json.queueId),
						eq(fiscalReceiptQueue.organizationId, ORG_A_ID),
					),
				);
		});

		assert.ok(queueItem);
		assert.equal(queueItem.status, "hardware_offline");
		assert.equal(queueItem.retryCount, 1);
		assert.match(queueItem.lastError || "", /offline|timed out/i);
	});

	it("1.3 GET /api/billing/fiscal-queue/pending returns pending and offline buffer items", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/api/billing/fiscal-queue/pending",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": staffTokenA,
			},
		});

		assert.equal(response.statusCode, 200);
		const json = response.json();
		assert.ok(Array.isArray(json.items));
		assert.ok(json.total >= 1);
		const offlineItem = json.items.find(
			(i: { status: string }) => i.status === "hardware_offline",
		);
		assert.ok(offlineItem, "Should include the hardware_offline item");
	});

	it("1.4 POST /api/billing/fiscal-queue/:id/retry increments retryCount if hardware still offline", async () => {
		process.env.KKM_FORCE_OFFLINE = "1";

		// Get pending offline item
		const pendingRes = await app.inject({
			method: "GET",
			url: "/api/billing/fiscal-queue/pending",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": staffTokenA,
			},
		});
		const offlineItem = pendingRes
			.json()
			.items.find((i: { status: string }) => i.status === "hardware_offline");
		assert.ok(offlineItem);

		const retryRes = await app.inject({
			method: "POST",
			url: `/api/billing/fiscal-queue/${offlineItem.id}/retry`,
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": staffTokenA,
			},
		});

		assert.equal(retryRes.statusCode, 200);
		const retryJson = retryRes.json();
		assert.equal(retryJson.success, false);
		assert.equal(retryJson.status, "hardware_offline");
		assert.equal(retryJson.retryCount, offlineItem.retryCount + 1);
	});

	it("1.5 POST /api/billing/fiscal-queue/:id/retry successfully transitions to printed upon hardware recovery", async () => {
		// Hardware comes back online
		delete process.env.KKM_FORCE_OFFLINE;
		delete process.env.KKM_HARDWARE_TIMEOUT;

		const pendingRes = await app.inject({
			method: "GET",
			url: "/api/billing/fiscal-queue/pending",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": staffTokenA,
			},
		});
		const offlineItem = pendingRes
			.json()
			.items.find((i: { status: string }) => i.status === "hardware_offline");
		assert.ok(offlineItem);

		const retryRes = await app.inject({
			method: "POST",
			url: `/api/billing/fiscal-queue/${offlineItem.id}/retry`,
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": staffTokenA,
			},
		});

		assert.equal(retryRes.statusCode, 200);
		const retryJson = retryRes.json();
		assert.equal(retryJson.success, true);
		assert.equal(retryJson.status, "printed");
		assert.ok(retryJson.item?.printedAt);

		// Second retry on already printed item is idempotent
		const repeatRetry = await app.inject({
			method: "POST",
			url: `/api/billing/fiscal-queue/${offlineItem.id}/retry`,
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": staffTokenA,
			},
		});
		assert.equal(repeatRetry.statusCode, 200);
		assert.equal(repeatRetry.json().status, "printed");
	});

	it("1.6 Enforces strict multi-tenant isolation across organizations", async () => {
		// Create offline item in Org A
		process.env.KKM_FORCE_OFFLINE = "1";
		const orgARes = await app.inject({
			method: "POST",
			url: "/api/billing/fiscalize-receipt",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": staffTokenA,
			},
			payload: {
				patientId: PATIENT_A_ID,
				operationType: "income",
				customerContact: "orgA@example.com",
				cashierFullName: "Кассир А",
				totalKopecks: 100000,
				cashKopecks: 100000,
				items: [
					{
						name: "Услуга А",
						priceKopecks: 100000,
						quantity: 1,
						amountKopecks: 100000,
					},
				],
			},
		});
		const orgAQueueId = orgARes.json().queueId;
		assert.ok(orgAQueueId);

		// Org B attempts to read pending queue: Org A's item must NOT be present
		const orgBListRes = await app.inject({
			method: "GET",
			url: "/api/billing/fiscal-queue/pending",
			headers: {
				"x-dente-clinic-token": clinicTokenB,
				"x-dente-staff-token": staffTokenB,
			},
		});
		assert.equal(orgBListRes.statusCode, 200);
		const orgBItems = orgBListRes.json().items;
		const leak = orgBItems.find((i: { id: string }) => i.id === orgAQueueId);
		assert.equal(leak, undefined, "Org B must NOT see Org A queue items!");

		// Org B attempts to retry Org A's queue item: must return 404
		const orgBRetryRes = await app.inject({
			method: "POST",
			url: `/api/billing/fiscal-queue/${orgAQueueId}/retry`,
			headers: {
				"x-dente-clinic-token": clinicTokenB,
				"x-dente-staff-token": staffTokenB,
			},
		});
		assert.equal(orgBRetryRes.statusCode, 404);
		assert.equal(orgBRetryRes.json().error, "FiscalQueueItemNotFound");
	});

	it("1.7 POST /api/billing/fiscal-queue/retry-all flushes all pending items for the organization", async () => {
		delete process.env.KKM_FORCE_OFFLINE;

		const retryAllRes = await app.inject({
			method: "POST",
			url: "/api/billing/fiscal-queue/retry-all",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": staffTokenA,
			},
		});

		assert.equal(retryAllRes.statusCode, 200);
		const json = retryAllRes.json();
		assert.equal(json.success, true);
		assert.ok(json.processedCount >= 1);
		assert.equal(json.failedCount, 0);

		// Verify queue is now empty of pending items
		const pendingRes = await app.inject({
			method: "GET",
			url: "/api/billing/fiscal-queue/pending",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": staffTokenA,
			},
		});
		assert.equal(pendingRes.statusCode, 200);
		assert.equal(pendingRes.json().items.length, 0);
	});

	after(async () => {
		delete process.env.KKM_FORCE_OFFLINE;
		delete process.env.KKM_HARDWARE_TIMEOUT;
		await app?.close();
	});
});
