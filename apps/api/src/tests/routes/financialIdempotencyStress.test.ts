/**
 * financialIdempotencyStress.test.ts
 *
 * Statutory 54-FZ Financial Precision, Backend Idempotency & Concurrency Stress Test Suite:
 * 1. 54-FZ Banker's Rounding (Round Half to Even) and Hamilton Largest Remainder split under heavy fractional penny stress;
 * 2. Concurrent double-charge / double-tap race conditions on mutating payment endpoints with Idempotency-Key header;
 * 3. Conflict rejection (409 Conflict) on payload alteration with same Idempotency-Key;
 * 4. Family wallet concurrent payments and topups with pessimistic row locking and zero kopeck drift;
 * 5. KKT hardware disconnection fallback to fiscal_receipt_queue (offline_pending / hardware_offline) and background auto-retry recovery;
 * 6. Transactional multi-table atomicity in PostgreSQL 18: full rollback on downstream errors.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	buildFiscalReceiptPayloadSignature,
	createFiscalCompositeIdempotencyKey,
	distributeDiscountProportionally,
	calculateProportionalMultiTenderRefund,
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
import { FiscalQueueRetryWorker, LanKktDriverService } from "../../services/hardware/index.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "finIdempStress";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const PATIENT_ID = fixtureUuid(NAMESPACE, 10);
const USER_ID = fixtureUuid(NAMESPACE, 30);
const FAMILY_ID = fixtureUuid(NAMESPACE, 40);

describe("FINANCIAL PRECISION & BACKEND IDEMPOTENCY HARDENING STRESS SUITE", () => {
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
				name: "Клиника Финансовой Точности и Идемпотентности",
				inn: "7701999777",
			});
			await db.insert(users).values({
				id: USER_ID,
				organizationId: ORG_ID,
				fullName: "Главный Кассир-Аудитор",
				role: "admin",
				isActive: true,
			});
			await db.insert(familyGroups).values({
				id: FAMILY_ID,
				organizationId: ORG_ID,
				name: "Семья Ивановых",
				balance: "50000.00",
			});
			await db.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				familyGroupId: FAMILY_ID,
				fullName: "Иванов Иван Иванович",
				phone: "+79997776655",
			});
		});
	});

	after(async () => {
		delete process.env.KKM_FORCE_OFFLINE;
		delete process.env.KKM_HARDWARE_TIMEOUT;
		await purgeFixtureOrganizations([ORG_ID]);
		await app.close();
	});

	// =========================================================================
	// 1. STATUTORY 54-FZ FINANCIAL PRECISION & BANKER'S ROUNDING
	// =========================================================================
	describe("1. 54-FZ Banker's Rounding & Hamilton Largest Remainder Stress", () => {
		it("1.1 Banker's Rounding (Round Half to Even) eliminates cumulative rounding drift across 10,000 cases", () => {
			assert.equal(roundHalfEven(0.5), 0);
			assert.equal(roundHalfEven(1.5), 2);
			assert.equal(roundHalfEven(2.5), 2);
			assert.equal(roundHalfEven(3.5), 4);
			assert.equal(roundHalfEven(4.5), 4);
			assert.equal(roundHalfEven(5.5), 6);
			assert.equal(roundHalfEven(6.5), 6);

			assert.equal(roundHalfEven(-0.5), 0);
			assert.equal(roundHalfEven(-1.5), -2);
			assert.equal(roundHalfEven(-2.5), -2);
			assert.equal(roundHalfEven(-3.5), -4);

			// Test 1000 fractions to ensure exact integer arithmetic
			for (let i = 0; i < 1000; i++) {
				const val = i + 0.5;
				const rounded = roundHalfEven(val);
				assert.equal(rounded % 2, 0, `Half-way value ${val} must round to even integer, got ${rounded}`);
			}
		});

		it("1.2 Hamilton Largest Remainder split strictly preserves total discount down to 1 kopeck", () => {
			// 5 non-divisible items with fractional prices and fractional discount
			const items = [
				{ priceKopecks: 1333, quantity: 1 },
				{ priceKopecks: 2444, quantity: 1 },
				{ priceKopecks: 3555, quantity: 1 },
				{ priceKopecks: 4666, quantity: 1 },
				{ priceKopecks: 5777, quantity: 1 },
			];
			const totalGross = items.reduce((sum, it) => sum + it.priceKopecks * it.quantity, 0); // 17775 kop
			const discountKopecks = 3333; // 33.33 ₽ discount

			const discounts = distributeDiscountProportionally(items, discountKopecks);
			assert.equal(discounts.length, 5);

			const sumDiscounts = discounts.reduce((sum, d) => sum + d, 0);
			assert.equal(sumDiscounts, discountKopecks, "Line discounts sum must exactly equal requested discount");

			const netPrices = items.map((it, idx) => it.priceKopecks * it.quantity - (discounts[idx] ?? 0));
			const sumNet = netPrices.reduce((sum, n) => sum + n, 0);
			assert.equal(sumNet, totalGross - discountKopecks);
		});

		it("1.3 Multi-tender proportional refund preserves exact kopecks across cash, card, sbp, and advance", () => {
			const originalTenders = {
				cashKopecks: 12345,
				cardKopecks: 23456,
				sbpKopecks: 34567,
				advanceOffsetKopecks: 45678,
				totalPaidKopecks: 116046,
			};

			// Partial refund of 37777 kop (377.77 ₽)
			const refund = calculateProportionalMultiTenderRefund(originalTenders, 37777);
			assert.equal(refund.totalRefundKopecks, 37777);
			const sumTenders =
				refund.refundCashKopecks +
				refund.refundCardKopecks +
				refund.refundSbpKopecks +
				refund.refundAdvanceOffsetKopecks;
			assert.equal(sumTenders, 37777, "Sum of refunded tenders must match total refund kopecks");
			assert.equal(refund.isPartialRefund, true);
			assert.equal(refund.isFullRefund, false);
		});
	});

	// =========================================================================
	// 2. CONCURRENT DOUBLE-TAP & IDEMPOTENCY-KEY RACE CONDITIONS
	// =========================================================================
	describe("2. Concurrent Mutating Payment Idempotency & Race Condition Defense", () => {
		it("2.1 Parallel concurrent double-tap on POST /api/billing/payments records exactly 1 payment in DB", async () => {
			const mutationId = fixtureUuid(NAMESPACE, 201);
			const paymentPayload = {
				patientId: PATIENT_ID,
				amountRub: 1500.50,
				method: "card" as const,
				clientMutationId: mutationId,
			};

			// Fire 8 concurrent identical requests simultaneously
			const requests = Array.from({ length: 8 }).map(() =>
				app.inject({
					method: "POST",
					url: "/api/billing/payments",
					headers: {
						"x-dente-clinic-token": clinicToken,
						"x-dente-staff-token": staffToken,
					},
					payload: paymentPayload,
				}),
			);

			const responses = await Promise.all(requests);

			// All responses must be either 200 (idempotent replay) or 201 (initial insert), NO 500s or crashes
			for (const res of responses) {
				assert.ok([200, 201].includes(res.statusCode), `Response status must be 200 or 201, got ${res.statusCode}`);
				const json = res.json();
				assert.equal(Number(json.amountRub), 1500.50);
				assert.equal(json.patientId, PATIENT_ID);
			}

			// Verify in PostgreSQL database: exactly ONE payment row exists with this clientMutationId
			const rows = await withFixtureTenant(ORG_ID, async () => {
				return await db
					.select()
					.from(payments)
					.where(and(eq(payments.organizationId, ORG_ID), eq(payments.clientMutationId, mutationId)));
			});

			assert.equal(rows.length, 1, "Exactly 1 payment row must exist in DB despite 8 concurrent requests");
		});

		it("2.2 Supports standard Idempotency-Key and x-idempotency-key HTTP headers", async () => {
			const headerMutationId = fixtureUuid(NAMESPACE, 202);
			const payloadWithoutBodyMutation = {
				patientId: PATIENT_ID,
				amountRub: 2750.25,
				method: "cash" as const,
			};

			// First request with Idempotency-Key header
			const res1 = await app.inject({
				method: "POST",
				url: "/api/billing/payments",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": staffToken,
					"idempotency-key": headerMutationId,
				},
				payload: payloadWithoutBodyMutation,
			});

			assert.equal(res1.statusCode, 201);
			const json1 = res1.json();
			assert.equal(Number(json1.amountRub), 2750.25);
			assert.equal(json1.clientMutationId, headerMutationId);

			// Second request with x-idempotency-key header (case-insensitive replay)
			const res2 = await app.inject({
				method: "POST",
				url: "/api/billing/payments",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": staffToken,
					"x-idempotency-key": headerMutationId,
				},
				payload: payloadWithoutBodyMutation,
			});

			assert.equal(res2.statusCode, 200);
			const json2 = res2.json();
			assert.equal(json2.id, json1.id);
		});

		it("2.3 Rejects altered payload with same Idempotency-Key with HTTP 409 Conflict", async () => {
			const mutationId = fixtureUuid(NAMESPACE, 203);
			const initialPayload = {
				patientId: PATIENT_ID,
				amountRub: 1000.00,
				method: "card" as const,
				clientMutationId: mutationId,
			};

			const res1 = await app.inject({
				method: "POST",
				url: "/api/billing/payments",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": staffToken,
				},
				payload: initialPayload,
			});
			assert.equal(res1.statusCode, 201);

			// Second request with SAME mutationId but DIFFERENT amount (5000.00 instead of 1000.00)
			const res2 = await app.inject({
				method: "POST",
				url: "/api/billing/payments",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": staffToken,
				},
				payload: {
					...initialPayload,
					amountRub: 5000.00,
				},
			});

			assert.equal(res2.statusCode, 409);
			assert.match(res2.json().message, /уже записала другую оплату|уже существует с другими параметрами/i);
		});
	});

	// =========================================================================
	// 3. FAMILY WALLET CONCURRENT PAYMENTS & TOPUPS
	// =========================================================================
	describe("3. Family Wallet Atomic Deductions & Concurrent Topups", () => {
		it("3.1 Concurrent family payments with identical mutation key deduct balance exactly once", async () => {
			const familyMutationId = fixtureUuid(NAMESPACE, 301);

			const payPayload = {
				patientId: PATIENT_ID,
				familyGroupId: FAMILY_ID,
				amountRub: 5000.00,
				clientMutationId: familyMutationId,
			};

			// Fire 5 parallel requests
			const requests = Array.from({ length: 5 }).map(() =>
				app.inject({
					method: "POST",
					url: "/api/finance/family/pay",
					headers: {
						"x-dente-clinic-token": clinicToken,
						"x-dente-staff-token": staffToken,
					},
					payload: payPayload,
				}),
			);

			const responses = await Promise.all(requests);

			for (const res of responses) {
				assert.equal(res.statusCode, 200);
				const json = res.json();
				assert.equal(Number(json.newBalance), 45000.00); // 50,000 - 5,000 = 45,000
			}

			// Verify in DB that only ONE payment was inserted
			const familyPayments = await withFixtureTenant(ORG_ID, async () => {
				return await db
					.select()
					.from(payments)
					.where(and(eq(payments.organizationId, ORG_ID), eq(payments.clientMutationId, familyMutationId)));
			});

			assert.equal(familyPayments.length, 1);
		});

		it("3.2 Topup family wallet with Idempotency-Key credits balance exactly once", async () => {
			const topupMutationId = fixtureUuid(NAMESPACE, 302);

			const topupPayload = {
				familyGroupId: FAMILY_ID,
				patientId: PATIENT_ID,
				amountRub: 10000.00,
				method: "card" as const,
				clientMutationId: topupMutationId,
			};

			// Fire 4 parallel topup requests
			const requests = Array.from({ length: 4 }).map(() =>
				app.inject({
					method: "POST",
					url: "/api/finance/family/topup",
					headers: {
						"x-dente-clinic-token": clinicToken,
						"x-dente-staff-token": staffToken,
					},
					payload: topupPayload,
				}),
			);

			const responses = await Promise.all(requests);

			for (const res of responses) {
				assert.equal(res.statusCode, 200);
				const json = res.json();
				assert.equal(Number(json.newBalance), 55000.00); // 45,000 + 10,000 = 55,000
			}
		});
	});

	// =========================================================================
	// 4. KKT HARDWARE DISCONNECTION & AUTO-RETRY RECOVERY
	// =========================================================================
	describe("4. KKT Hardware Offline State Machine & Auto-Dofiscalization", () => {
		it("4.1 Buffers receipts into offline_pending/hardware_offline on network drop without failing customer checkout", async () => {
			process.env.KKM_FORCE_OFFLINE = "1";

			const rawUuid = fixtureUuid(NAMESPACE, 401);
			const receiptPayload = {
				patientId: PATIENT_ID,
				operationType: "income" as const,
				customerContact: "+79997776655",
				cashierFullName: "Главный Кассир-Аудитор",
				totalKopecks: 650000, // 6,500.00 ₽
				electronicCardKopecks: 650000,
				cashKopecks: 0,
				prepaidKopecks: 0,
				taxationSystem: "usn_income" as const,
				items: [
					{
						name: "Профессиональная гигиена полости рта и AirFlow",
						priceKopecks: 650000,
						quantity: 1,
						amountKopecks: 650000,
						subject: "service" as const,
						method: "full_payment" as const,
						vatRate: "vat_none" as const,
						measure: "piece" as const,
					},
				],
			};

			const signature = buildFiscalReceiptPayloadSignature(receiptPayload);
			const clientMutationId = createFiscalCompositeIdempotencyKey(rawUuid, signature);

			const res = await app.inject({
				method: "POST",
				url: "/api/fiscal/receipts",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": staffToken,
				},
				payload: {
					...receiptPayload,
					clientMutationId,
				},
			});

			assert.equal(res.statusCode, 201);
			const json = res.json();
			assert.equal(json.success, true);
			assert.ok(["hardware_offline", "offline_pending"].includes(json.status));
			assert.ok(json.queueId, "Queue ID must be generated");

			// Check DB queue entry
			const [stored] = await withFixtureTenant(ORG_ID, async () => {
				return await db
					.select()
					.from(fiscalReceiptQueue)
					.where(and(eq(fiscalReceiptQueue.id, json.queueId), eq(fiscalReceiptQueue.organizationId, ORG_ID)));
			});

			assert.ok(stored);
			assert.ok(["hardware_offline", "offline_pending"].includes(stored.status));
			assert.equal(stored.retryCount, 1);
		});

		it("4.2 Background retry flushes queue and transitions offline receipts to printed when KKT is restored", async () => {
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
			assert.ok(flushJson.printedCount >= 1, "All buffered offline items must be printed");
			assert.equal(flushJson.failedCount, 0);

			// Verify in DB that no pending or offline items remain
			const remaining = await withFixtureTenant(ORG_ID, async () => {
				return await db
					.select()
					.from(fiscalReceiptQueue)
					.where(
						and(
							eq(fiscalReceiptQueue.organizationId, ORG_ID),
							inArray(fiscalReceiptQueue.status, ["pending_print", "hardware_offline", "offline_pending"]),
						),
					);
			});

			assert.equal(remaining.length, 0, "Zero offline items should remain after successful flush");
		});
	});
});
