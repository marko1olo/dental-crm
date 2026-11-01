/**
 * financialConcurrentPayments.test.ts
 *
 * Statutory 54-FZ Financial Precision & Concurrent Mutating Payments Idempotency Suite:
 * 1. 54-FZ Banker's Rounding (Round Half to Even) and Hamilton Largest Remainder split;
 * 2. Multi-tender proportional refund exact kopecks arithmetic;
 * 3. Concurrent double-charge / double-tap race conditions on mutating payment endpoints with Idempotency-Key;
 * 4. Case-insensitive support for Idempotency-Key and x-idempotency-key headers;
 * 5. Conflict rejection (409 Conflict) on altered payload with same Idempotency-Key.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

process.env.NODE_ENV = "test";
process.env.KKT_MODEL = "emulator";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	calculateProportionalMultiTenderRefund,
	distributeDiscountProportionally,
	roundHalfEven,
} from "@dental/shared";
import { db } from "../../db/client.js";
import {
	organizations,
	patients,
	payments,
	users,
} from "../../db/schema.js";
import { registerBillingRoutes } from "../../routes/billing.js";
import { registerFiscalReceiptRoutes } from "../../routes/fiscal/fiscalReceiptRoutes.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "finConcPay";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const PATIENT_ID = fixtureUuid(NAMESPACE, 10);
const USER_ID = fixtureUuid(NAMESPACE, 30);

describe("FINANCIAL CONCURRENT PAYMENTS & PRECISION HARDENING SUITE", { concurrency: false }, () => {
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
				name: "Клиника Конкурентных Платежей",
				inn: "7701999881",
			}).onConflictDoNothing();
			await db.insert(users).values({
				id: USER_ID,
				organizationId: ORG_ID,
				fullName: "Главный Кассир Конкуренции",
				role: "admin",
				isActive: true,
			}).onConflictDoNothing();
			await db.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Конкурентов Пётр Петрович",
				phone: "+79998881122",
			}).onConflictDoNothing();
		});
	});

	after(async () => {
		await purgeFixtureOrganizations([ORG_ID]);
		await app.close();
	});

	// =========================================================================
	// 1. STATUTORY 54-FZ FINANCIAL PRECISION & BANKER'S ROUNDING
	// =========================================================================
	describe("1. 54-FZ Banker's Rounding & Hamilton Largest Remainder Stress", () => {
		it("1.1 Banker's Rounding (Round Half to Even) eliminates cumulative rounding drift across 1,000 cases", () => {
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

			for (let i = 0; i < 1000; i++) {
				const val = i + 0.5;
				const rounded = roundHalfEven(val);
				assert.equal(rounded % 2, 0, `Half-way value ${val} must round to even integer, got ${rounded}`);
			}
		});

		it("1.2 Hamilton Largest Remainder split strictly preserves total discount down to 1 kopeck", () => {
			const items = [
				{ priceKopecks: 1333, quantity: 1 },
				{ priceKopecks: 2444, quantity: 1 },
				{ priceKopecks: 3555, quantity: 1 },
				{ priceKopecks: 4666, quantity: 1 },
				{ priceKopecks: 5777, quantity: 1 },
			];
			const totalGross = items.reduce((sum, it) => sum + it.priceKopecks * it.quantity, 0);
			const discountKopecks = 3333;

			const discounts = distributeDiscountProportionally(items, discountKopecks);
			assert.equal(discounts.length, 5);

			const sumDiscounts = discounts.reduce((sum, d) => sum + d, 0);
			assert.equal(sumDiscounts, discountKopecks, "Line discounts sum must exactly equal requested discount");

			const netPrices = items.map((it, idx) => it.priceKopecks * it.quantity - (discounts[idx] ?? 0));
			const sumNet = netPrices.reduce((sum, n) => sum + n, 0);
			assert.equal(sumNet, totalGross - discountKopecks);
		});

		it("1.3 Multi-tender proportional refund preserves exact kopecks across tenders", () => {
			const originalTenders = {
				cashKopecks: 12345,
				cardKopecks: 23456,
				sbpKopecks: 34567,
				advanceOffsetKopecks: 45678,
				totalPaidKopecks: 116046,
			};

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
});
