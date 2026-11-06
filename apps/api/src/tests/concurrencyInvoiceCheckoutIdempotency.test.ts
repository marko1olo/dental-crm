/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASTIFY CONCURRENCY AUDIT: INVOICE CHECKOUT, IDEMPOTENCY & SPLIT TENDER SUITE
 * Mandate 8b, 8e, 8n: Exact Kopeck Math, Idempotency-Key Replay, Zero Double-Spend
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import {
	familyGroups,
	organizations,
	patientInvoices,
	patientRelationships,
	patients,
	payments,
	users,
} from "../db/schema.js";
import { registerBillingRoutes } from "../routes/billingRoutes/index.js";
import { registerFamilyFinanceRoutes } from "../routes/finance_family.js";
import { registerInvoiceRoutes } from "../routes/invoiceRoutes/index.js";
import { authTokenSecret } from "../security/authSecret.js";
import { signToken } from "../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "./support/fixtureOrganizations.js";
import { createTenantTestApp } from "./support/tenantTestApp.js";

const NAMESPACE = "concurrencyInvoiceCheckoutIdempotency";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const USER_ADMIN_ID = fixtureUuid(NAMESPACE, 2);
const PATIENT_HEAD_ID = fixtureUuid(NAMESPACE, 10);
const PATIENT_MEMBER_ID = fixtureUuid(NAMESPACE, 11);
const FAMILY_GROUP_ID = fixtureUuid(NAMESPACE, 20);
const INVOICE_ID = fixtureUuid(NAMESPACE, 30);

describe("Fastify Concurrency: Invoice Checkout Idempotency & Split Payment Anti-Double-Spend", () => {
	let app: FastifyInstance;
	let clinicToken: string;
	let staffToken: string;

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";

		await purgeFixtureOrganizations([ORG_ID]);

		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx
				.insert(organizations)
				.values({
					id: ORG_ID,
					name: "Клиника Финансового Стресс-Теста Fastify",
				})
				.onConflictDoNothing();

			await tx
				.insert(users)
				.values({
					id: USER_ADMIN_ID,
					organizationId: ORG_ID,
					fullName: "Главный Кассир Администратор",
					role: "admin",
					isActive: true,
				})
				.onConflictDoNothing();

			await tx
				.insert(familyGroups)
				.values({
					id: FAMILY_GROUP_ID,
					organizationId: ORG_ID,
					name: "Семья Смирновых Fastify",
					headPatientId: PATIENT_HEAD_ID,
					balance: "6000.00", // 6 000 ₽ (600 000 коп)
				})
				.onConflictDoNothing();

			await tx
				.insert(patients)
				.values([
					{
						id: PATIENT_HEAD_ID,
						organizationId: ORG_ID,
						fullName: "Смирнов Алексей Петрович",
						phone: "+79998881122",
						status: "active",
						familyGroupId: FAMILY_GROUP_ID,
					},
					{
						id: PATIENT_MEMBER_ID,
						organizationId: ORG_ID,
						fullName: "Смирнова Елена Сергеевна",
						phone: "+79998881123",
						status: "active",
						familyGroupId: FAMILY_GROUP_ID,
					},
				])
				.onConflictDoNothing();

			await tx
				.insert(patientRelationships)
				.values({
					id: fixtureUuid(NAMESPACE, 25),
					organizationId: ORG_ID,
					patientId: PATIENT_HEAD_ID,
					relatedPatientId: PATIENT_MEMBER_ID,
					relationshipType: "spouse",
					canSpendFamilyWallet: true,
					isPrimaryPayer: true,
				})
				.onConflictDoNothing();

			await tx
				.insert(patientInvoices)
				.values({
					id: INVOICE_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_HEAD_ID,
					totalRub: "4500.00",
					totalAmountRub: 4500,
					status: "draft",
				})
				.onConflictDoNothing();
		});

		app = createTenantTestApp();
		await registerBillingRoutes(app);
		await registerFamilyFinanceRoutes(app);
		await registerInvoiceRoutes(app);
		await app.ready();

		clinicToken = signToken(
			{
				organizationId: ORG_ID,
				role: "owner",
				scope: "clinic",
			},
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
	});

	after(async () => {
		await app.close();
		await purgeFixtureOrganizations([ORG_ID]);
	});

	test("1. Multi-click Storm: 10 concurrent requests to pay an invoice with identical Idempotency-Key execute exactly once with Idempotency-Replayed header", async () => {
		const idempotencyKey = `idem-checkout-uuidv7-${Date.now()}`;

		const responses = await Promise.all(
			Array.from({ length: 10 }, () =>
				app.inject({
					method: "POST",
					url: `/api/invoices/${INVOICE_ID}/pay`,
					headers: {
						"x-dente-clinic-token": clinicToken,
						"x-dente-staff-token": staffToken,
						"idempotency-key": idempotencyKey,
					},
					payload: {
						patientId: PATIENT_HEAD_ID,
						amountRub: 4500,
						method: "card",
						clientMutationId: idempotencyKey,
					},
				}),
			),
		);

		for (const r of responses) {
			assert.ok(
				r.statusCode === 200 || r.statusCode === 201,
				`Каждый запрос с одинаковым ключом обязан вернуть 200 или 201, получили ${r.statusCode}: ${r.body}`,
			);
		}

		const created = responses.filter((r) => r.statusCode === 201);
		const replayed = responses.filter((r) => r.statusCode === 200);

		assert.equal(
			created.length,
			1,
			"Ровно 1 первичный запрос обязан завершиться с кодом 201 Created",
		);
		assert.equal(
			replayed.length,
			9,
			"Все остальные 9 повторных параллельных запросов обязаны вернуть 200 OK (кэшированный результат)",
		);

		for (const replayRes of replayed) {
			const replayHeader = replayRes.headers["idempotency-replayed"] || replayRes.headers["x-idempotency-replayed"];
			assert.equal(
				replayHeader,
				"true",
				"Повторный идемпотентный ответ обязан содержать заголовок idempotency-replayed: true",
			);
		}

		// Verify that all 10 responses return the exact same payment ID
		const paymentIds = responses.map((r) => JSON.parse(r.body).id);
		const uniqueIds = Array.from(new Set(paymentIds));
		assert.equal(uniqueIds.length, 1, "Все 10 ответов обязаны содержать идентичный payment.id");

		// Verify database row count
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
			"В базе данных PostgreSQL обязана быть создана ровно 1 запись платежа (Zero Double-Spend)",
		);
		assert.equal(dbPayments[0]?.status, "paid");
		assert.equal(Number(dbPayments[0]?.amountRub), 4500);

		// Verify invoice status
		const [invoice] = await db
			.select()
			.from(patientInvoices)
			.where(
				and(
					eq(patientInvoices.organizationId, ORG_ID),
					eq(patientInvoices.id, INVOICE_ID),
				),
			);

		assert.equal(invoice?.status, "paid", "Счет обязан перейти в статус paid");
	});

	test("2. Concurrent Split Payment on Depleted Family Balance: 10 parallel requests of 4,000 ₽ on 6,000 ₽ balance yield 1 success, 9 HTTP 402", async () => {
		// Reset family balance to 6,000.00 ₽ in DB
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx
				.update(familyGroups)
				.set({ balance: "6000.00", updatedAt: new Date() })
				.where(
					and(
						eq(familyGroups.id, FAMILY_GROUP_ID),
						eq(familyGroups.organizationId, ORG_ID),
					),
				);
		});

		const responses = await Promise.all(
			Array.from({ length: 10 }, (_, idx) =>
				app.inject({
					method: "POST",
					url: "/api/finance/family/pay",
					headers: {
						"x-dente-clinic-token": clinicToken,
						"x-dente-staff-token": staffToken,
					},
					payload: {
						organizationId: ORG_ID,
						familyGroupId: FAMILY_GROUP_ID,
						patientId: PATIENT_MEMBER_ID,
						amountRub: 4000,
						clientMutationId: `mutation-split-race-${idx + 1}-${Date.now()}`,
					},
				}),
			),
		);

		const success = responses.filter((r) => r.statusCode === 200);
		const insufficientFunds = responses.filter((r) => r.statusCode === 402);

		assert.equal(
			success.length,
			1,
			"Ровно 1 списание на 4 000 ₽ должно пройти успешно при балансе 6 000 ₽",
		);
		assert.equal(
			insufficientFunds.length,
			9,
			"Остальные 9 запросов обязаны получить 402 Insufficient Funds",
		);

		for (const errRes of insufficientFunds) {
			const body = JSON.parse(errRes.body);
			assert.match(
				body.message,
				/Недостаточно средств/i,
				"Ответ 402 обязан содержать понятное сообщение о нехватке средств",
			);
		}

		// Verify database final balance
		const [dbFamily] = await db
			.select()
			.from(familyGroups)
			.where(
				and(
					eq(familyGroups.id, FAMILY_GROUP_ID),
					eq(familyGroups.organizationId, ORG_ID),
				),
			);

		assert.equal(
			Number(dbFamily?.balance),
			2000,
			"Итоговый баланс семьи в базе данных обязан быть строго 2 000.00 ₽ (200 000 копеек)",
		);
	});

	test("3. Exact Kopeck Integrity: 10 concurrent topups of 155.55 ₽ yield exact ending balance without float drift", async () => {
		const initialBalanceRow = await db
			.select()
			.from(familyGroups)
			.where(
				and(
					eq(familyGroups.id, FAMILY_GROUP_ID),
					eq(familyGroups.organizationId, ORG_ID),
				),
			);
		const startBalKop = Math.round(Number(initialBalanceRow[0]?.balance ?? 0) * 100);

		const topupAmountRub = 155.55; // 15 555 копеек

		const responses = await Promise.all(
			Array.from({ length: 10 }, (_, idx) =>
				app.inject({
					method: "POST",
					url: "/api/finance/family/topup",
					headers: {
						"x-dente-clinic-token": clinicToken,
						"x-dente-staff-token": staffToken,
					},
					payload: {
						organizationId: ORG_ID,
						familyGroupId: FAMILY_GROUP_ID,
						patientId: PATIENT_HEAD_ID,
						amountRub: topupAmountRub,
						clientMutationId: `topup-kopeck-storm-${idx + 1}-${Date.now()}`,
					},
				}),
			),
		);

		for (const r of responses) {
			assert.equal(r.statusCode, 200, `Пополнение обязано быть успешным: ${r.body}`);
		}

		const endingBalanceRow = await db
			.select()
			.from(familyGroups)
			.where(
				and(
					eq(familyGroups.id, FAMILY_GROUP_ID),
					eq(familyGroups.organizationId, ORG_ID),
				),
			);
		const endBalKop = Math.round(Number(endingBalanceRow[0]?.balance ?? 0) * 100);

		const expectedDiffKop = 10 * 15555; // 155 550 копеек
		assert.equal(
			endBalKop - startBalKop,
			expectedDiffKop,
			"Баланс в копейках обязан вырасти ровно на 155 550 копеек без погрешности округления",
		);
	});
});
