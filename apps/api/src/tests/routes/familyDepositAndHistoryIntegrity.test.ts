/**
 * familyDepositAndHistoryIntegrity.test.ts
 *
 * Verifies:
 * 1. Single-tender 100% payment with method "family_wallet" atomically debits familyGroups.balance
 * 2. Overdraft attempt on family wallet throws error on insufficient balance
 * 3. GET /api/finance/family/:familyGroupId/history returns actual payment history
 * 4. Chairside invoice creation for unplanned service succeeds without blocking 422 error (Mandate 8e/8n)
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	familyGroups,
	organizations,
	patients,
	payments,
	serviceCatalogItems,
	users,
	visits,
} from "../../db/schema.js";
import { createPaymentInDb } from "../../db/billingQuery.js";
import { registerFamilyFinanceRoutes } from "../../routes/finance_family.js";
import { registerInvoiceRoutes } from "../../routes/invoices.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = `famInteg_${Date.now()}`;
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const FAMILY_ID = fixtureUuid(NAMESPACE, 2);
const HEAD_PATIENT_ID = fixtureUuid(NAMESPACE, 3);
const MEMBER_PATIENT_ID = fixtureUuid(NAMESPACE, 4);
const STAFF_USER_ID = fixtureUuid(NAMESPACE, 5);

describe("Family Deposit Atomic Deduction & History Route Integrity", () => {
	let app: FastifyInstance;
	let clinicToken = "";
	let staffToken = "";

	before(async () => {
		process.env.NODE_ENV = "test";
		await purgeFixtureOrganizations([ORG_ID]);

		app = createTenantTestApp();
		await registerFamilyFinanceRoutes(app);
		await registerInvoiceRoutes(app);
		await app.ready();

		const secret = authTokenSecret();
		clinicToken = signToken({ organizationId: ORG_ID }, secret);
		staffToken = signToken(
			{
				userId: STAFF_USER_ID,
				role: "admin",
				organizationId: ORG_ID,
				fullName: "Главный Врач / Администратор",
			},
			secret,
		);

		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(organizations).values({
				id: ORG_ID,
				name: "Клиника Семейного Здоровья",
			});

			await tx.insert(users).values({
				id: STAFF_USER_ID,
				organizationId: ORG_ID,
				fullName: "Главный Врач / Администратор",
				email: `admin_${Date.now()}@dente.ru`,
				role: "admin",
				passwordHash: "hash",
			});

			await tx.insert(familyGroups).values({
				id: FAMILY_ID,
				organizationId: ORG_ID,
				name: "Семья Ивановых",
				balance: "15000.00",
				headPatientId: HEAD_PATIENT_ID,
			});

			await tx.insert(patients).values([
				{
					id: HEAD_PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Иванов Иван Иванович",
					phone: "+79001112244",
					familyGroupId: FAMILY_ID,
				},
				{
					id: MEMBER_PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Иванова Анна Ивановна",
					phone: "+79001112255",
					familyGroupId: FAMILY_ID,
				},
			]);

			await tx.insert(serviceCatalogItems).values({
				id: fixtureUuid(NAMESPACE, 99),
				organizationId: ORG_ID,
				code: "A16.07.001",
				title: "Экстренное удаление стенки зуба",
				priceRub: 3500,
				basePriceRub: 3500,
				isActive: true,
			});
		});
	});

	after(async () => {
		if (app) await app.close();
		await purgeFixtureOrganizations([ORG_ID]);
	});

	it("single-tender family_wallet payment debits familyGroups.balance atomically", async () => {
		// 1. Создаем визит для члена семьи на сумму 4000 ₽
		let visitId = "";
		await withFixtureTenant(ORG_ID, async (tx) => {
			const [visit] = await tx
				.insert(visits)
				.values({
					organizationId: ORG_ID,
					patientId: MEMBER_PATIENT_ID,
					status: "signed",
				})
				.returning();
			if (!visit) throw new Error("visit not created");
			visitId = visit.id;
		});

		// 2. Проводим 100% оплату визита с семейного депозита (tenderCount === 1)
		const payment = await createPaymentInDb(ORG_ID, {
			patientId: MEMBER_PATIENT_ID,
			visitId,
			amountRub: 4000,
			method: "family_wallet",
			note: "100% оплата с семейного депозита",
		});

		assert.equal(payment.amountRub, 4000);
		assert.equal(payment.status, "paid");
		assert.equal(payment.method, "family_wallet");

		// 3. Проверяем, что с баланса семьи списано ровно 4000 ₽ (было 15000 -> стало 11000)
		await withFixtureTenant(ORG_ID, async (tx) => {
			const [fam] = await tx
				.select()
				.from(familyGroups)
				.where(
					and(
						eq(familyGroups.id, FAMILY_ID),
						eq(familyGroups.organizationId, ORG_ID),
					),
				);
			assert.ok(fam);
			assert.equal(Number(fam.balance), 11000);
		});
	});

	it("overdraft attempt on family wallet throws error when funds are insufficient", async () => {
		let visitId = "";
		await withFixtureTenant(ORG_ID, async (tx) => {
			const [visit] = await tx
				.insert(visits)
				.values({
					organizationId: ORG_ID,
					patientId: MEMBER_PATIENT_ID,
					status: "signed",
				})
				.returning();
			if (!visit) throw new Error("visit not created");
			visitId = visit.id;
		});

		// Пытаемся списать 50 000 ₽ при текущем балансе 11 000 ₽
		await assert.rejects(
			async () => {
				await createPaymentInDb(ORG_ID, {
					patientId: MEMBER_PATIENT_ID,
					visitId,
					amountRub: 50000,
					method: "family_wallet",
					note: "Попытка перерасхода семейного депозита",
				});
			},
			(err: Error) => {
				assert.match(err.message, /Недостаточно средств на семейном счете/);
				return true;
			},
		);

		// Баланс остался 11 000 ₽
		await withFixtureTenant(ORG_ID, async (tx) => {
			const [fam] = await tx
				.select()
				.from(familyGroups)
				.where(
					and(
						eq(familyGroups.id, FAMILY_ID),
						eq(familyGroups.organizationId, ORG_ID),
					),
				);
			assert.ok(fam);
			assert.equal(Number(fam.balance), 11000);
		});
	});

	it("GET /api/finance/family/:familyGroupId/history returns real transaction history", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/api/finance/family/${FAMILY_ID}/history`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": staffToken,
			},
		});

		assert.equal(res.statusCode, 200);
		const history = res.json();
		assert.ok(Array.isArray(history));
		assert.ok(history.length >= 1, "Должна быть как минимум 1 транзакция списания");

		const spendTx = history.find((h: any) => h.operationType === "spend");
		assert.ok(spendTx);
		assert.equal(spendTx.amountRub, 4000);
		assert.equal(spendTx.targetPatientId, MEMBER_PATIENT_ID);
		assert.equal(spendTx.targetName, "Иванова Анна Ивановна");
	});

	it("chairside invoice creation for unplanned service succeeds without blocking 422 error", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: {
				"content-type": "application/json",
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": staffToken,
			},
			payload: {
				patientId: MEMBER_PATIENT_ID,
				documentType: "completed_act",
				items: [
					{
						serviceId: fixtureUuid(NAMESPACE, 99),
						nameRu: "Экстренное удаление стенки зуба",
						code804n: "A16.07.001",
						quantity: 1,
						priceRub: 3500,
					},
				],
			},
		});

		if (res.statusCode !== 201) console.log("INVOICE ERROR BODY:", res.body);
		assert.notEqual(res.statusCode, 422, "Не должно быть 422 UpsellConsentShieldViolationError");
		assert.equal(res.statusCode, 201, `Наряд должен успешно создаться со статусом 201: ${res.body}`);
		const data = res.json();
		assert.equal(data.success, true);
		assert.equal(data.totalNetRub, 3500);
	});
});
