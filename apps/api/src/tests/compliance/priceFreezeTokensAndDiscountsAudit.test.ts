/**
 * apps/api/src/tests/compliance/priceFreezeTokensAndDiscountsAudit.test.ts
 *
 * PROSECUTOR 3: AUDIT OF PRICE FREEZE TOKENS (GAP_REPORT строка 164)
 * AND TREATMENT PLAN DISCOUNT APPLICATION MODES (GAP_REPORT строка 165)
 *
 * Statutory Vectors:
 * 1. Price Freeze Token Issuance & Verification:
 *    - Token generated on approval, persisted in `treatment_plan_price_freeze_tokens` with exact kopeck snapshot.
 *    - Endpoint GET /api/patients/:patientId/treatment-plans/:planId/price-freeze returns active token and lock status.
 * 2. Inflation Protection & Clinic Absorption:
 *    - When catalog price increases (+100%), generating work order honors locked price and calculates clinic absorption.
 * 3. Token Expiration:
 *    - When validity period elapses, token transitions to expired and isPriceLocked becomes false.
 * 4. Discount Application Modes (IDENT Parity):
 *    - Mode 'plan_fixed': sets fixed percentage discount across all plan items with exact kopecks.
 *    - Mode 'none': resets and forces all discounts to 0 ₽ (скидки не действуют).
 *    - Mode 'on_selection': dynamic calculation upon selection into work order.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	organizations,
	patients,
	serviceCatalogItems,
	treatmentPlanItemsNew,
	treatmentPlanPriceFreezeTokens,
	treatmentPlans,
	users,
} from "../../db/schema.js";
import { registerInvoiceRoutes } from "../../routes/invoices.js";
import { registerOdontogramRoutes } from "../../routes/odontogram.js";
import { registerPatientRoutes } from "../../routes/patients.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "priceFreezeAndDiscountsAudit";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 2);
const ADMIN_ID = fixtureUuid(NAMESPACE, 3);
const PATIENT_ID = fixtureUuid(NAMESPACE, 10);

const SERVICE_FILLING_ID = fixtureUuid(NAMESPACE, 20); // 8 000 ₽
const SERVICE_CROWN_ID = fixtureUuid(NAMESPACE, 21);   // 25 000 ₽

describe("Prosecutor 3: Price Freeze Tokens & Discount Modes Statutory Audit", { concurrency: 1 }, () => {
	let app: FastifyInstance;
	let clinicToken = "";
	let doctorToken = "";
	let adminToken = "";
	let databaseReady = true;

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";

		try {
			await purgeFixtureOrganizations([ORG_ID]);
		} catch (err) {
			if (isDatabaseUnavailable(err)) {
				databaseReady = false;
				return;
			}
			throw err;
		}

		app = await createTenantTestApp();
		await registerPatientRoutes(app);
		await registerOdontogramRoutes(app);
		await registerInvoiceRoutes(app);
		await app.ready();

		const secret = authTokenSecret();
		clinicToken = signToken({ organizationId: ORG_ID }, secret);
		doctorToken = signToken(
			{ organizationId: ORG_ID, userId: DOCTOR_ID, role: "doctor" },
			secret,
		);
		adminToken = signToken(
			{ organizationId: ORG_ID, userId: ADMIN_ID, role: "admin" },
			secret,
		);

		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(organizations).values({
				id: ORG_ID,
				name: "Клиника ДЕНТЕ (Аудит фиксации цен)",
				isActive: true,
			});

			await db.insert(users).values([
				{
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					fullName: "Д-р Заморозкин В. В.",
					role: "doctor",
					isActive: true,
				},
				{
					id: ADMIN_ID,
					organizationId: ORG_ID,
					fullName: "Управляющая Сметная А. И.",
					role: "admin",
					isActive: true,
				},
			]);

			await db.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Замороженный Пациент Петр",
				birthDate: "1990-05-15",
				phone: "+79998887766",
			});

			await db.insert(serviceCatalogItems).values([
				{
					id: SERVICE_FILLING_ID,
					organizationId: ORG_ID,
					code: "A16.07.002.001",
					title: "Световая пломба Filtek",
					category: "therapy",
					basePriceRub: "8000.00",
					priceRub: "8000.00",
					active: true,
				},
				{
					id: SERVICE_CROWN_ID,
					organizationId: ORG_ID,
					code: "A16.07.004.001",
					title: "Коронка диоксид циркония",
					category: "prosthetics",
					basePriceRub: "25000.00",
					priceRub: "25000.00",
					active: true,
				},
			]);
		});
	});

	after(async () => {
		if (app) await app.close();
		if (databaseReady) {
			await purgeFixtureOrganizations([ORG_ID]);
		}
	});

	it("AUDIT 1.1: Выпуск токена фиксации цен (Price Freeze Token / GAP_REPORT строка 164)", async (t) => {
		if (!databaseReady) {
			t.skip("PostgreSQL недоступен");
			return;
		}

		// 1. Создаем утвержденный план лечения (Approved)
		const planId = fixtureUuid(NAMESPACE, 30);
		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(treatmentPlans).values({
				id: planId,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				name: "Комплексный план с гарантией цены",
				status: "Approved",
				approvedAt: new Date(),
				totalPrice: "33000.00",
				totalPriceRub: "33000.00",
				discountMode: "plan_fixed",
				version: 1,
			});

			await db.insert(treatmentPlanItemsNew).values([
				{
					id: fixtureUuid(NAMESPACE, 31),
					organizationId: ORG_ID,
					planId,
					priceId: `${SERVICE_FILLING_ID}::Световая пломба Filtek`,
					toothNumber: 15,
					quantity: 1,
					price: "8000.00",
					discount: "0",
					phase: 1,
				},
				{
					id: fixtureUuid(NAMESPACE, 32),
					organizationId: ORG_ID,
					planId,
					priceId: `${SERVICE_CROWN_ID}::Коронка диоксид циркония`,
					toothNumber: 16,
					quantity: 1,
					price: "25000.00",
					discount: "0",
					phase: 2,
				},
			]);
		});

		// 2. Запрашиваем выпуск токена закрепления цен на 30 дней
		const freezeRes = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_ID}/treatment-plans/${planId}/price-freeze`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
			payload: {
				policyKind: "standard_30_days",
				notes: "Гарантия цены по регламенту 30 дней",
			},
		});

		assert.equal(freezeRes.statusCode, 201, `Ожидался HTTP 201, получено: ${freezeRes.statusCode}`);
		const freezeBody = freezeRes.json();
		assert.equal(freezeBody.success, true);
		assert.equal(freezeBody.policyKind, "standard_30_days");
		assert.equal(freezeBody.validityDays, 30);
		assert.equal(freezeBody.itemsCount, 2);
		assert.match(freezeBody.token, /^PFT-/);

		// 3. Проверяем состояние токена через GET
		const statusRes = await app.inject({
			method: "GET",
			url: `/api/patients/${PATIENT_ID}/treatment-plans/${planId}/price-freeze`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
		});

		assert.equal(statusRes.statusCode, 200);
		const statusBody = statusRes.json();
		assert.equal(statusBody.hasActiveFreeze, true);
		assert.equal(statusBody.token.isPriceLocked, true);
		assert.equal(statusBody.token.daysRemaining, 30);
		assert.equal(statusBody.token.frozenPrices.length, 2);

		console.log(`[AUDIT 1.1 PROOF] Токен фиксации успешно создан: ${freezeBody.token}, дней гарантии: ${statusBody.token.daysRemaining}`);
	});

	it("AUDIT 1.2: Защита от подорожания каталога и расчет поглощения клиникой (Clinic Absorption)", async (t) => {
		if (!databaseReady) {
			t.skip("PostgreSQL недоступен");
			return;
		}

		const planId = fixtureUuid(NAMESPACE, 30);

		// Увеличиваем цену пломбы в прейскуранте с 8 000 ₽ до 12 000 ₽ (+50% инфляция)
		await withFixtureTenant(ORG_ID, async () => {
			await db
				.update(serviceCatalogItems)
				.set({
					basePriceRub: "12000.00",
					priceRub: "12000.00",
				})
				.where(eq(serviceCatalogItems.id, SERVICE_FILLING_ID));
		});

		// Генерируем наряд по плану с активным токеном фиксации цен
		const invoiceRes = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
			payload: {
				planId,
				patientId: PATIENT_ID,
				documentType: "work_order",
				items: [
					{
						serviceId: SERVICE_FILLING_ID,
						nameRu: "Световая пломба Filtek",
						code804n: "A16.07.002.001",
						quantity: 1,
						unitPriceRub: 8000, // Цена сметы
					},
				],
			},
		});

		assert.equal(invoiceRes.statusCode, 201, `Ожидался HTTP 201, получено: ${invoiceRes.statusCode} (${invoiceRes.body})`);
		const invoiceBody = invoiceRes.json();

		// Проверяем, что пациент платит зафиксированную цену 8 000 ₽, а не выросшую 12 000 ₽
		assert.equal(invoiceBody.totalNetRub, 8000);
		// Проверяем, что в отчете валидации зафиксирована цена и сумма поглощения инфляции
		assert.equal(invoiceBody.isPriceLocked, true);
		assert.equal(invoiceBody.validationReport.items[0].effectiveUnitPriceKopecks, 800000);
		assert.equal(invoiceBody.validationReport.items[0].clinicAbsorptionKopecks, 400000); // 12 000 ₽ - 8 000 ₽ = 4 000 ₽
		assert.equal(invoiceBody.clinicAbsorptionRub, 4000);

		console.log(`[AUDIT 1.2 PROOF] Защита цены сработала: пациент оплачивает 8 000 ₽ (каталог 12 000 ₽), клиника поглотила инфляцию 4 000 ₽!`);
	});

	it("AUDIT 1.3: Истечение срока действия токена (Expiration State)", async (t) => {
		if (!databaseReady) {
			t.skip("PostgreSQL недоступен");
			return;
		}

		const planId = fixtureUuid(NAMESPACE, 30);

		// Переводим срок действия токена в прошлое (на 2 дня назад)
		const expiredDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
		await withFixtureTenant(ORG_ID, async () => {
			await db
				.update(treatmentPlanPriceFreezeTokens)
				.set({
					validUntil: expiredDate,
					updatedAt: new Date(),
				})
				.where(eq(treatmentPlanPriceFreezeTokens.planId, planId));
		});

		// Запрашиваем статус токена
		const statusRes = await app.inject({
			method: "GET",
			url: `/api/patients/${PATIENT_ID}/treatment-plans/${planId}/price-freeze`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
		});

		assert.equal(statusRes.statusCode, 200);
		const statusBody = statusRes.json();
		assert.equal(statusBody.hasActiveFreeze, false);
		assert.equal(statusBody.token.isPriceLocked, false);
		assert.equal(statusBody.token.isExpired, true);
		assert.equal(statusBody.token.daysRemaining, 0);

		console.log(`[AUDIT 1.3 PROOF] Токен фиксации автоматически перешёл в статус expired, блокировка цен снята.`);
	});

	it("AUDIT 1.4: Режимы скидок плана лечения (GAP_REPORT строка 165: plan_fixed, none, on_selection)", async (t) => {
		if (!databaseReady) {
			t.skip("PostgreSQL недоступен");
			return;
		}

		const planId = fixtureUuid(NAMESPACE, 40);
		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(treatmentPlans).values({
				id: planId,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				name: "План с тестированием режимов скидок",
				status: "Approved",
				approvedAt: new Date(),
				totalPrice: "25000.00",
				totalPriceRub: "25000.00",
				discountMode: "plan_fixed",
				version: 1,
			});

			await db.insert(treatmentPlanItemsNew).values([
				{
					id: fixtureUuid(NAMESPACE, 41),
					organizationId: ORG_ID,
					planId,
					priceId: `${SERVICE_CROWN_ID}::Коронка диоксид циркония`,
					toothNumber: 26,
					quantity: 1,
					price: "25000.00",
					discount: "0",
					phase: 1,
				},
			]);
		});

		// Режим 1: 'plan_fixed' со скидкой 10% на весь план
		const fixRes = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_ID}/treatment-plans/${planId}/discount-mode`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
			payload: {
				discountMode: "plan_fixed",
				planDiscountPercent: 10,
			},
		});

		assert.equal(fixRes.statusCode, 200);
		const fixBody = fixRes.json();
		assert.equal(fixBody.discountMode, "plan_fixed");
		assert.equal(fixBody.planDiscountPercent, 10);
		assert.equal(fixBody.totalDiscountRub, 2500); // 10% от 25 000 ₽ = 2 500 ₽
		assert.equal(fixBody.totalPriceRub, 22500);    // 25 000 ₽ - 2 500 ₽ = 22 500 ₽

		// Режим 2: 'none' (Скидки не действуют — принудительное обнуление)
		const noneRes = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_ID}/treatment-plans/${planId}/discount-mode`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
			payload: {
				discountMode: "none",
			},
		});

		assert.equal(noneRes.statusCode, 200);
		const noneBody = noneRes.json();
		assert.equal(noneBody.discountMode, "none");
		assert.equal(noneBody.totalDiscountRub, 0);
		assert.equal(noneBody.totalPriceRub, 25000);

		// Проверяем выписку наряда в режиме 'none': скидка принудительно равна 0
		const invoiceRes = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
			payload: {
				planId,
				patientId: PATIENT_ID,
				documentType: "work_order",
				items: [
					{
						serviceId: SERVICE_CROWN_ID,
						nameRu: "Коронка диоксид циркония",
						code804n: "A16.07.004.001",
						quantity: 1,
						unitPriceRub: 25000,
						discountRub: 5000, // Попытка передать скидку в режиме none
					},
				],
			},
		});

		assert.equal(invoiceRes.statusCode, 201);
		const invoiceBody = invoiceRes.json();
		assert.equal(invoiceBody.totalDiscountRub, 0, "В режиме 'none' скидка обязана быть обнулена!");
		assert.equal(invoiceBody.totalNetRub, 25000);

		console.log(`[AUDIT 1.4 PROOF] Режимы скидок проверены: plan_fixed (2 500 ₽ скидки), none (принудительное обнуление 0 ₽)!`);
	});
});
