/**
 * challengerFinancialConcurrencyStress.test.ts
 *
 * EMPIRICAL ADVERSARIAL STRESS TEST:
 * 100 Concurrent Parallel Requests on Mutating Payment and Fiscal Endpoints:
 * - POST /api/billing/payments (100 simultaneous requests with identical Idempotency-Key)
 * - POST /api/fiscal/receipts (100 simultaneous requests with identical composite Idempotency-Key)
 * - POST /api/finance/family/pay (100 simultaneous requests with identical clientMutationId)
 *
 * Verifies:
 * - Exactly 1 request performs the creation/deduction
 * - Exactly 99 requests return idempotent 200 OK replay
 * - DB row count strictly === 1
 * - Balance deductions strictly === single operation
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	buildFiscalReceiptPayloadSignature,
	createFiscalCompositeIdempotencyKey,
	roundHalfEven,
	kopecksToRub,
	rubToKopecks,
} from "@dental/shared";
import { db } from "../../db/client.js";
import {
	familyGroups,
	fiscalReceiptQueue,
	organizations,
	patients,
	payments,
	users,
} from "../../db/schema.js";
import { registerBillingRoutes } from "../../routes/billing.js";
import { registerFamilyFinanceRoutes } from "../../routes/finance_family.js";
import { registerFiscalReceiptRoutes } from "../../routes/fiscal/fiscalReceiptRoutes.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "chal100Conc";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const PATIENT_ID = fixtureUuid(NAMESPACE, 10);
const USER_ID = fixtureUuid(NAMESPACE, 30);
const FAMILY_ID = fixtureUuid(NAMESPACE, 40);

describe("CHALLENGER 2: 100 CONCURRENT MUTATING PAYMENT REQUESTS & IDEMPOTENCY STRESS", () => {
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
		await registerFamilyFinanceRoutes(app);
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
				name: "Клиника 100 Concurrency Stress Test",
				inn: "7701999888",
			});
			await db.insert(users).values({
				id: USER_ID,
				organizationId: ORG_ID,
				fullName: "Главный Аудитор 100 Потоков",
				role: "admin",
				isActive: true,
			});
			await db.insert(familyGroups).values({
				id: FAMILY_ID,
				organizationId: ORG_ID,
				name: "Семья 100 Параллельных Потоков",
				balance: "100000.00",
			});
			await db.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				familyGroupId: FAMILY_ID,
				fullName: "Стресс-Пациент 100 Запросов",
				phone: "+79998881122",
			});
		});
	});

	after(async () => {
		await purgeFixtureOrganizations([ORG_ID]);
		await app.close();
	});

	it("1.1 100 concurrent parallel payment requests with identical Idempotency-Key produce exactly 1 insert (201) and 99 idempotent replays (200)", async () => {
		const paymentMutationKey = fixtureUuid(NAMESPACE, 101);
		const paymentPayload = {
			patientId: PATIENT_ID,
			amountRub: 3500.50,
			method: "card" as const,
			clientMutationId: paymentMutationKey,
		};

		const startTime = performance.now();
		const paymentPromises = Array.from({ length: 100 }).map(() =>
			app.inject({
				method: "POST",
				url: "/api/billing/payments",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": staffToken,
					"idempotency-key": paymentMutationKey,
				},
				payload: paymentPayload,
			}),
		);

		const paymentResponses = await Promise.all(paymentPromises);
		const duration = (performance.now() - startTime).toFixed(2);
		console.log(`\n  [CHALLENGE 1.1] Completed 100 concurrent requests in ${duration}ms.`);

		let count201 = 0;
		let count200 = 0;
		const otherCodes: Record<number, number> = {};
		const returnedPaymentIds = new Set<string>();

		for (const res of paymentResponses) {
			if (res.statusCode === 201) count201++;
			else if (res.statusCode === 200) count200++;
			else {
				otherCodes[res.statusCode] = (otherCodes[res.statusCode] || 0) + 1;
			}
			const json = res.json();
			if (json.id) returnedPaymentIds.add(json.id);
			assert.equal(Number(json.amountRub), 3500.50);
		}

		console.log(`  [CHALLENGE 1.1] Status Breakdown: 201 Created: ${count201}, 200 OK (Idempotent): ${count200}, Other: ${JSON.stringify(otherCodes)}`);
		console.log(`  [CHALLENGE 1.1] Unique Payment IDs returned: ${returnedPaymentIds.size}`);

		assert.equal(count201 + count200, 100, `All 100 responses must be either 201 or 200. Got: ${JSON.stringify(otherCodes)}`);
		assert.equal(count201, 1, `Exactly 1 request must succeed with 201 Created. Got: ${count201}`);
		assert.equal(count200, 99, `Exactly 99 requests must return 200 OK idempotent replay. Got: ${count200}`);
		assert.equal(returnedPaymentIds.size, 1, "All 100 responses must return the EXACT same payment entity ID");

		// Direct Database Census
		const dbPaymentRows = await withFixtureTenant(ORG_ID, async () => {
			return await db
				.select()
				.from(payments)
				.where(and(eq(payments.organizationId, ORG_ID), eq(payments.clientMutationId, paymentMutationKey)));
		});

		console.log(`  [CHALLENGE 1.1] PostgreSQL Database Record Count: ${dbPaymentRows.length} row(s) in 'payments' table.`);
		assert.equal(dbPaymentRows.length, 1, "PostgreSQL MUST contain strictly 1 payment record!");
		assert.equal(Number(dbPaymentRows[0]!.amountRub), 3500.50);
	});

	it("1.2 100 concurrent parallel fiscal receipt requests with composite Idempotency-Key produce exactly 1 queue record (201) and 99 replays (200)", async () => {
		const fiscalBaseUuid = fixtureUuid(NAMESPACE, 201);
		const fiscalPayload = {
			patientId: PATIENT_ID,
			customerContact: "+79998881122",
			visitId: null,
			cashierFullName: "Кассир Стресс-Теста",
			cashierInn: "770199988811",
			operationType: "income" as const,
			taxationSystem: "usn_income" as const,
			items: [
				{
					name: "Первичная консультация ортодонта",
					priceKopecks: 350050,
					quantity: 1,
					amountKopecks: 350050,
					vatRate: "vat_none" as const,
					method: "full_payment" as const,
					subject: "service" as const,
				},
			],
			electronicCardKopecks: 350050,
			totalKopecks: 350050,
		};

		const sig = buildFiscalReceiptPayloadSignature(fiscalPayload);
		const compositeFiscalKey = createFiscalCompositeIdempotencyKey(fiscalBaseUuid, sig);

		const startTime = performance.now();
		const fiscalPromises = Array.from({ length: 100 }).map(() =>
			app.inject({
				method: "POST",
				url: "/api/fiscal/receipts",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": staffToken,
					"idempotency-key": compositeFiscalKey,
				},
				payload: {
					...fiscalPayload,
					clientMutationId: compositeFiscalKey,
				},
			}),
		);

		const fiscalResponses = await Promise.all(fiscalPromises);
		const duration = (performance.now() - startTime).toFixed(2);
		console.log(`\n  [CHALLENGE 1.2] Completed 100 concurrent fiscal requests in ${duration}ms.`);

		let fiscal201 = 0;
		let fiscal200 = 0;
		const fiscalOther: Record<number, number> = {};
		const fiscalQueueIds = new Set<string>();

		for (const res of fiscalResponses) {
			if (res.statusCode === 201) fiscal201++;
			else if (res.statusCode === 200) fiscal200++;
			else {
				fiscalOther[res.statusCode] = (fiscalOther[res.statusCode] || 0) + 1;
			}
			const json = res.json();
			if (json.queueId) fiscalQueueIds.add(json.queueId);
		}

		if (fiscalOther["500"]) {
			console.log("  [CHALLENGE 1.2] 500 error payload:", fiscalResponses[0]!.json());
		}
		console.log(`  [CHALLENGE 1.2] Status Breakdown: 201 Created: ${fiscal201}, 200 OK (Idempotent): ${fiscal200}, Other: ${JSON.stringify(fiscalOther)}`);
		console.log(`  [CHALLENGE 1.2] Unique Fiscal Queue IDs returned: ${fiscalQueueIds.size}`);

		assert.equal(fiscal201 + fiscal200, 100, `All 100 responses must be 201 or 200. Got: ${JSON.stringify(fiscalOther)}`);
		assert.equal(fiscal201, 1, `Exactly 1 request must create the queue row (201). Got: ${fiscal201}`);
		assert.equal(fiscal200, 99, `Exactly 99 requests must return 200 OK replayed receipt. Got: ${fiscal200}`);
		assert.equal(fiscalQueueIds.size, 1, "All 100 fiscal responses must refer to the exact same queue ID");

		const dbFiscalRows = await withFixtureTenant(ORG_ID, async () => {
			return await db
				.select()
				.from(fiscalReceiptQueue)
				.where(eq(fiscalReceiptQueue.organizationId, ORG_ID));
		});

		console.log(`  [CHALLENGE 1.2] PostgreSQL Database Record Count: ${dbFiscalRows.length} row(s) in 'fiscal_receipt_queue' table.`);
		assert.equal(dbFiscalRows.length, 1, "PostgreSQL MUST contain strictly 1 fiscal receipt queue record!");
	});

	it("1.3 100 concurrent parallel family wallet payment requests deduct balance exactly once (zero double-deduction)", async () => {
		const familyPayMutationKey = fixtureUuid(NAMESPACE, 301);
		const familyPayPayload = {
			patientId: PATIENT_ID,
			familyGroupId: FAMILY_ID,
			amountRub: 12500.00,
			clientMutationId: familyPayMutationKey,
		};

		const startTime = performance.now();
		const familyPromises = Array.from({ length: 100 }).map(() =>
			app.inject({
				method: "POST",
				url: "/api/finance/family/pay",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": staffToken,
				},
				payload: familyPayPayload,
			}),
		);

		const familyResponses = await Promise.all(familyPromises);
		const duration = (performance.now() - startTime).toFixed(2);
		console.log(`\n  [CHALLENGE 1.3] Completed 100 concurrent family payment requests in ${duration}ms.`);

		for (const res of familyResponses) {
			assert.equal(res.statusCode, 200, `Family pay response must be 200, got ${res.statusCode}`);
			const json = res.json();
			// Starting balance 100,000.00 - 12,500.00 = 87,500.00
			assert.equal(Number(json.newBalance), 87500.00, `Balance must be exactly 87500.00, got ${json.newBalance}`);
		}

		// Direct Database Check on Family Group Balance and Payments Table
		const [famRow] = await withFixtureTenant(ORG_ID, async () => {
			return await db
				.select()
				.from(familyGroups)
				.where(and(eq(familyGroups.id, FAMILY_ID), eq(familyGroups.organizationId, ORG_ID)));
		});
		console.log(`  [CHALLENGE 1.3] Database Family Group Final Balance: ${famRow!.balance} RUB`);
		assert.equal(Number(famRow!.balance), 87500.00, "PostgreSQL family balance must be deducted exactly ONCE (87500.00)!");

		const dbFamilyPayments = await withFixtureTenant(ORG_ID, async () => {
			return await db
				.select()
				.from(payments)
				.where(and(eq(payments.organizationId, ORG_ID), eq(payments.clientMutationId, familyPayMutationKey)));
		});
		console.log(`  [CHALLENGE 1.3] Database Family Payment Records: ${dbFamilyPayments.length}`);
		assert.equal(dbFamilyPayments.length, 1, "Exactly 1 payment row inserted in payments table!");
	});
});
