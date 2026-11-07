/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RED TEAM ACID CONCURRENCY & STRESS TEST SUITE: INVOICE & CASHBOX PAYMENTS
 * Exact Kopeck Math, Multi-Thread Race Condition Immunity & Idempotency
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Governed by:
 * - Mandate 8b: Integer kopeck arithmetic, zero float drift.
 * - Mandate 8e: Doctor & cashier autonomy, zero double-spending.
 * - Mandate 8n: Solo doctor & small clinic sovereignty.
 * - 54-FZ: Exact cash register operations, fiscal receipt queue consistency.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	cashBoxes,
	cashOperations,
	organizations,
	patientInvoices,
	patients,
	payments,
	users,
} from "../../db/schema.js";
import { registerBillingRoutes } from "../../routes/billingRoutes/index.js";
import { registerCashboxPaymentRoutes } from "../../routes/cashbox/cashboxPaymentRoutes.js";
import { registerInvoiceRoutes } from "../../routes/invoiceRoutes/index.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "invCbxAcidStress";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const USER_ADMIN_ID = fixtureUuid(NAMESPACE, 2);
const PATIENT_ALPHA_ID = fixtureUuid(NAMESPACE, 10);
const PATIENT_BETA_ID = fixtureUuid(NAMESPACE, 11);
const INVOICE_ALPHA_ID = fixtureUuid(NAMESPACE, 30);
const INVOICE_BETA_ID = fixtureUuid(NAMESPACE, 31);
const CASH_BOX_DESK_ID = fixtureUuid(NAMESPACE, 40);
const CASH_BOX_CASHLESS_ID = fixtureUuid(NAMESPACE, 41);

describe("RED TEAM: Invoice & Cashbox Payment ACID Concurrency Suite (PostgreSQL 18)", () => {
	let app: FastifyInstance;
	let clinicToken: string;
	let staffToken: string;
	let databaseAvailable = true;

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";

		app = createTenantTestApp();
		await registerBillingRoutes(app);
		await registerCashboxPaymentRoutes(app);
		await registerInvoiceRoutes(app);
		await app.ready();

		clinicToken = signToken(
			{ organizationId: ORG_ID, role: "owner", scope: "clinic" },
			authTokenSecret(),
		);

		staffToken = signToken(
			{
				organizationId: ORG_ID,
				userId: USER_ADMIN_ID,
				role: "admin",
				scope: "staff",
				permissions: [
					"finance.write",
					"finance.read",
					"payments.write",
					"patients.read",
				],
			},
			authTokenSecret(),
		);

		try {
			await purgeFixtureOrganizations([ORG_ID]);
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx
					.insert(organizations)
					.values({
						id: ORG_ID,
						name: "Клиника Финансового ACID Стресс-Теста Fastify",
					})
					.onConflictDoNothing();

				await tx
					.insert(users)
					.values({
						id: USER_ADMIN_ID,
						organizationId: ORG_ID,
						fullName: "Старший Кассир Регистратор",
						role: "admin",
						isActive: true,
					})
					.onConflictDoNothing();

				await tx
					.insert(patients)
					.values([
						{
							id: PATIENT_ALPHA_ID,
							organizationId: ORG_ID,
							fullName: "Кузнецов Виктор Иванович",
							phone: "+79993332211",
							status: "active",
						},
						{
							id: PATIENT_BETA_ID,
							organizationId: ORG_ID,
							fullName: "Морозова Татьяна Павловна",
							phone: "+79993332212",
							status: "active",
						},
					])
					.onConflictDoNothing();

				await tx
					.insert(cashBoxes)
					.values([
						{
							id: CASH_BOX_DESK_ID,
							organizationId: ORG_ID,
							name: "Основная касса (наличные)",
							type: "main",
							balanceRub: 0,
							isCashless: false,
							isMain: true,
							displayOrder: 1,
						},
						{
							id: CASH_BOX_CASHLESS_ID,
							organizationId: ORG_ID,
							name: "Безналичный расчет (эквайринг)",
							type: "cashless",
							balanceRub: 0,
							isCashless: true,
							isMain: false,
							displayOrder: 3,
						},
					])
					.onConflictDoNothing();

				await tx
					.insert(patientInvoices)
					.values([
						{
							id: INVOICE_ALPHA_ID,
							organizationId: ORG_ID,
							patientId: PATIENT_ALPHA_ID,
							totalRub: "5000.00",
							totalAmountRub: 5000,
							status: "draft",
						},
						{
							id: INVOICE_BETA_ID,
							organizationId: ORG_ID,
							patientId: PATIENT_BETA_ID,
							totalRub: "7500.00",
							totalAmountRub: 7500,
							status: "draft",
						},
					])
					.onConflictDoNothing();
			});
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseAvailable = false;
		}
	});

	after(async () => {
		await app?.close();
		if (databaseAvailable) {
			await purgeFixtureOrganizations([ORG_ID]);
		}
	});

	// ── 1. Cashbox Invoice Concurrency (5-Thread Race Storm) ──
	it("1. Concurrent Cashbox Invoice Payment: 5 parallel requests to pay Invoice Alpha yield exactly 1 x 200 OK, 4 x 409 Conflict without double receipts", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const concurrencyCount = 5;

		// 5 concurrent requests attempting to pay the exact same invoice with different clientMutationIds
		const requests = Array.from({ length: concurrencyCount }, (_, idx) =>
			app.inject({
				method: "POST",
				url: "/api/cashbox/payments",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": staffToken,
				},
				payload: {
					patientId: PATIENT_ALPHA_ID,
					invoiceId: INVOICE_ALPHA_ID,
					amountRub: 5000,
					method: "card",
					cashierFullName: `Кассир Поток #${idx + 1}`,
					clientMutationId: `cashbox-race-storm-${idx + 1}-${Date.now()}`,
				},
			}),
		);

		const responses = await Promise.all(requests);

		const successResponses = responses.filter((r) => r.statusCode === 200);
		const conflictResponses = responses.filter((r) => r.statusCode === 409);

		assert.equal(
			successResponses.length,
			1,
			`Ровно 1 кассовый запрос должен завершиться успехом (200 OK). Получено: ${successResponses.length}`,
		);
		assert.equal(
			conflictResponses.length,
			concurrencyCount - 1,
			`Остальные ${concurrencyCount - 1} параллельных запросов обязаны быть отклонены с 409 Conflict. Получено: ${conflictResponses.length}`,
		);

		for (const conf of conflictResponses) {
			const body = JSON.parse(conf.body);
			assert.equal(body.error, "InvoiceAlreadyPaidConflict");
			assert.match(body.message, /уже был полностью оплачен/i);
		}

		// Verify database rows in PostgreSQL 18
		const dbPayments = await db
			.select()
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, ORG_ID),
					eq(payments.documentId, INVOICE_ALPHA_ID),
				),
			);

		assert.equal(
			dbPayments.length,
			1,
			"В таблице payments должна существовать ровно 1 запись для оплаченного счёта (Zero Double-Spend)",
		);
		assert.equal(dbPayments[0]?.status, "paid");
		assert.equal(Number(dbPayments[0]?.amountRub), 5000);

		const dbOps = await db
			.select()
			.from(cashOperations)
			.where(
				and(
					eq(cashOperations.organizationId, ORG_ID),
					eq(cashOperations.patientId, PATIENT_ALPHA_ID),
				),
			);

		assert.equal(
			dbOps.length,
			1,
			"В кассовом журнале cashOperations должна быть создана ровно 1 проводка прихода (Zero Receipt Duplicate)",
		);
		assert.equal(Number(dbOps[0]?.amountRub), 5000);

		// Verify invoice status in PostgreSQL 18
		const [invoice] = await db
			.select()
			.from(patientInvoices)
			.where(
				and(
					eq(patientInvoices.organizationId, ORG_ID),
					eq(patientInvoices.id, INVOICE_ALPHA_ID),
				),
			);

		assert.equal(invoice?.status, "paid", "Счёт обязан находиться в статусе paid");
	});

	// ── 2. Idempotency Key Multi-Click Guard (10 Parallel Requests) ──
	it("2. Client Mutation Idempotency: 10 parallel identical requests with same Idempotency-Key return 200 OK with idempotency-replayed header and zero duplicate DB rows", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const idempotencyKey = `idem-key-storm-${Date.now()}`;

		const responses = await Promise.all(
			Array.from({ length: 10 }, () =>
				app.inject({
					method: "POST",
					url: "/api/cashbox/payments",
					headers: {
						"x-dente-clinic-token": clinicToken,
						"x-dente-staff-token": staffToken,
						"idempotency-key": idempotencyKey,
					},
					payload: {
						patientId: PATIENT_BETA_ID,
						amountRub: 1200,
						method: "card",
						clientMutationId: idempotencyKey,
					},
				}),
			),
		);

		for (const r of responses) {
			assert.equal(r.statusCode, 200, `Каждый запрос с одинаковым ключом обязан вернуть 200 OK: ${r.body}`);
		}

		// Count replayed responses with idempotency header
		const replayed = responses.filter(
			(r) =>
				r.headers["idempotency-replayed"] === "true" ||
				r.headers["x-idempotency-replayed"] === "true",
		);

		assert.ok(
			replayed.length >= 9,
			`Минимум 9 повторных запросов обязаны содержать заголовок idempotency-replayed: true. Получено: ${replayed.length}`,
		);

		// Verify all responses return identical payment ID
		const paymentIds = responses.map((r) => JSON.parse(r.body).data.id);
		const uniqueIds = Array.from(new Set(paymentIds));
		assert.equal(uniqueIds.length, 1, "Все 10 ответов возвращают строго один и тот же payment.id");

		// Verify PostgreSQL row count
		const dbPayments = await db
			.select()
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, ORG_ID),
					eq(payments.clientMutationId, idempotencyKey),
				),
			);

		assert.equal(
			dbPayments.length,
			1,
			"В базе данных создана ровно 1 запись платежа с этим Idempotency-Key",
		);
	});

	// ── 3. Exact Kopeck Arithmetic & Cashbox Balance Preservation ──
	it("3. Exact Kopeck Integrity: 10 concurrent payments of 123.45 ₽ yield exact ending balance without float drift", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const [initialBox] = await withFixtureTenant(ORG_ID, (tx) =>
			tx
				.select()
				.from(cashBoxes)
				.where(
					and(
						eq(cashBoxes.organizationId, ORG_ID),
						eq(cashBoxes.type, "cashless"),
					),
				),
		);

		const startBalRub = Number(initialBox?.balanceRub || 0);

		const responses = await Promise.all(
			Array.from({ length: 10 }, (_, idx) =>
				app.inject({
					method: "POST",
					url: "/api/cashbox/payments",
					headers: {
						"x-dente-clinic-token": clinicToken,
						"x-dente-staff-token": staffToken,
					},
					payload: {
						patientId: PATIENT_BETA_ID,
						amountRub: 123.45,
						method: "card",
						clientMutationId: `kopeck-storm-${idx + 1}-${Date.now()}`,
					},
				}),
			),
		);

		for (const r of responses) {
			assert.equal(r.statusCode, 200, `Платеж обязан пройти успешно: ${r.body}`);
		}

		const [endingBox] = await withFixtureTenant(ORG_ID, (tx) =>
			tx
				.select()
				.from(cashBoxes)
				.where(
					and(
						eq(cashBoxes.organizationId, ORG_ID),
						eq(cashBoxes.type, "cashless"),
					),
				),
		);

		const endBalRub = Number(endingBox?.balanceRub || 0);
		const expectedDiffRub = 10 * 123.45; // 1 234.50 ₽ (123 450 коп)

		assert.equal(
			Math.round((endBalRub - startBalRub) * 100),
			Math.round(expectedDiffRub * 100),
			`Баланс безналичной кассы обязан увеличиться ровно на 1 234.50 ₽ без погрешности float. Ожидалось: ${expectedDiffRub}, получено: ${endBalRub - startBalRub}`,
		);
	});

	// ── 4. Standardized Error Payloads & Zero Stack Leakage ──
	it("4. Error Hardening: Non-existent invoice or invalid UUID returns RFC 7807 structured JSON without leaking stack traces or internal paths", async () => {
		const nonExistentUuid = fixtureUuid(NAMESPACE, 99);

		const response = await app.inject({
			method: "POST",
			url: "/api/cashbox/payments",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": staffToken,
			},
			payload: {
				patientId: PATIENT_ALPHA_ID,
				invoiceId: nonExistentUuid,
				amountRub: 1000,
				method: "card",
			},
		});

		assert.equal(response.statusCode, 404);
		const body = JSON.parse(response.body);
		assert.equal(body.error, "InvoiceNotFound");
		assert.match(body.message, /не найден в данной клинике/i);

		// Verify zero stack trace or internal path leakage
		assert.equal(body.stack, undefined, "Ответ клиенту не должен содержать свойство stack");
		const rawText = response.body;
		assert.ok(!rawText.includes("node_modules"), "Ответ не должен содержать пути node_modules");
		assert.ok(!rawText.includes("C:\\"), "Ответ не должен содержать локальные файловые пути Windows");
		assert.ok(!rawText.includes("/Users"), "Ответ не должен содержать пути /Users");
	});
});
