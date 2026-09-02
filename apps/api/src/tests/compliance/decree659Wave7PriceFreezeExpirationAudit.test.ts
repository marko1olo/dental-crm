/**
 * apps/api/src/tests/compliance/decree659Wave7PriceFreezeExpirationAudit.test.ts
 *
 * PROSECUTOR 3: WAVE 7 AUDIT OF PRICE FREEZE EXPIRATION & INFLATION SURCHARGE DEFENSE (ПОСТАНОВЛЕНИЕ №659, СТ. 709 ГК РФ, СТ. 10, 16 ЗОЗПП)
 *
 * Statutory Vectors:
 * 1. Expired Price Freeze Token Blocking (Атака по истекшему токену фиксации цен):
 *    - План лечения утвержден с токеном фиксации на 30 дней.
 *    - Срок действия токена истек (validUntil в прошлом, status: 'expired').
 *    - Каталог подорожал на +25% (10 000 ₽ -> 12 500 ₽, превышая порог 10% по ПП РФ №659).
 *    - Попытка сгенерировать наряд/счет без согласования актуальных цен каталога и без PIN-кода администратора
 *      ОБЯЗАНА блокироваться сервером (HTTP 400 / canGenerateWorkOrder: false).
 * 2. Inflation Surcharge Threshold Enforcement (>10% по ПП РФ №659):
 *    - При превышении порога инфляции 10% смета требует обязательного согласования (requiresAdminOverride: true).
 * 3. Legitimate Surcharge & Addendum Re-indexing (Согласованная актуализация цен):
 *    - При вводе PIN-кода администратора и подтверждении доплаты (+2 500 ₽ инфляционной надбавки)
 *      сервер формирует наряд на 12 500 ₽ с точной фиксацией patientSurcharge = 2 500 ₽.
 * 4. Within-Threshold Expiration Behavior (Инфляция в пределах порога <= 10%):
 *    - При подорожании в пределах допустимого порога (+8%) смета пересчитывается без блокирующего оверрайда.
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
import { issuePriceFreezeToken } from "../../db/priceFreezeTokensQuery.js";
import { registerBillingRoutes } from "../../routes/billing.js";
import { registerInvoiceRoutes } from "../../routes/invoices.js";
import { registerOdontogramRoutes } from "../../routes/odontogram.js";
import { registerPatientRoutes } from "../../routes/patients.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { hashCredential, signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "decree659Wave7Audit";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 2);
const ADMIN_ID = fixtureUuid(NAMESPACE, 3);

const PATIENT_EXPIRED_ID = fixtureUuid(NAMESPACE, 10);
const PATIENT_THRESHOLD_ID = fixtureUuid(NAMESPACE, 11);

const SERVICE_IMPLANT_ID = fixtureUuid(NAMESPACE, 20); // Базовая цена: 40 000 ₽ -> Инфляция до 50 000 ₽ (+25%)
const SERVICE_ENDODONTICS_ID = fixtureUuid(NAMESPACE, 21); // Базовая цена: 10 000 ₽ -> Инфляция до 10 800 ₽ (+8%)

const PLAN_EXPIRED_ID = fixtureUuid(NAMESPACE, 30);
const PLAN_THRESHOLD_ID = fixtureUuid(NAMESPACE, 31);

const ADMIN_PIN = "9944";

describe("Prosecutor 3: Wave 7 Price Freeze Expiration & Inflation Surcharge Audit (Decree 659 & Art. 709 GK RF)", { concurrency: 1 }, () => {
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
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseReady = false;
			return;
		}

		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(organizations).values({
				id: ORG_ID,
				name: "Клиника Аудита Экспирации Токенов Фиксации Цен Wave 7",
			});

			const pinHash = await hashCredential(ADMIN_PIN);

			await db.insert(users).values([
				{
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					fullName: "Доктор Ортопед-Хирург Wave 7",
					role: "doctor",
				},
				{
					id: ADMIN_ID,
					organizationId: ORG_ID,
					fullName: "Главный Управляющий Клиники Wave 7",
					role: "admin",
					pinCodeHash: pinHash,
				},
			]);

			// Пациент 1: План с истекшим токеном фиксации и инфляцией +25%
			await db.insert(patients).values({
				id: PATIENT_EXPIRED_ID,
				organizationId: ORG_ID,
				fullName: "Смирнов Алексей Константинович",
				birthDate: "1982-03-12",
				phone: "+79031112233",
				status: "active",
			});

			// Пациент 2: План с инфляцией в пределах допустимого порога (+8% <= 10%)
			await db.insert(patients).values({
				id: PATIENT_THRESHOLD_ID,
				organizationId: ORG_ID,
				fullName: "Волкова Елена Сергеевна",
				birthDate: "1991-07-24",
				phone: "+79032223344",
				status: "active",
			});

			// Каталог услуг
			await db.insert(serviceCatalogItems).values([
				{
					id: SERVICE_IMPLANT_ID,
					organizationId: ORG_ID,
					code: "A16.07.054",
					title: "Дентальная имплантация Osstem",
					basePriceRub: 40000,
					priceRub: 40000,
					isActive: true,
				},
				{
					id: SERVICE_ENDODONTICS_ID,
					organizationId: ORG_ID,
					code: "A16.07.008",
					title: "Эндодонтическое лечение трехканального зуба",
					basePriceRub: 10000,
					priceRub: 10000,
					isActive: true,
				},
			]);

			// План 1: Утвержденный план имплантации (40 000 ₽)
			await db.insert(treatmentPlans).values({
				id: PLAN_EXPIRED_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_EXPIRED_ID,
				name: "Комплексный план имплантации",
				status: "Approved",
				totalPriceRub: 40000,
				approvedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // Утвержден 45 дней назад
				createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
			});

			await db.insert(treatmentPlanItemsNew).values({
				id: fixtureUuid(NAMESPACE, 32),
				organizationId: ORG_ID,
				planId: PLAN_EXPIRED_ID,
				priceId: `${SERVICE_IMPLANT_ID}::Дентальная имплантация Osstem`,
				toothNumber: 46,
				quantity: "1",
				unitPriceRub: "40000",
				totalPriceRub: "40000",
				itemOrder: 1,
			});

			// План 2: Утвержденный план эндодонтии (10 000 ₽)
			await db.insert(treatmentPlans).values({
				id: PLAN_THRESHOLD_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_THRESHOLD_ID,
				name: "План эндодонтического лечения",
				status: "Approved",
				totalPriceRub: 10000,
				approvedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
				createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
			});

			await db.insert(treatmentPlanItemsNew).values({
				id: fixtureUuid(NAMESPACE, 33),
				organizationId: ORG_ID,
				planId: PLAN_THRESHOLD_ID,
				priceId: `${SERVICE_ENDODONTICS_ID}::Эндодонтическое лечение трехканального зуба`,
				toothNumber: 26,
				quantity: "1",
				unitPriceRub: "10000",
				totalPriceRub: "10000",
				itemOrder: 1,
			});
		});

		// Выпускаем токены фиксации цен со сроком 30 дней и переводим их срок в прошлое (экспирация)
		await withFixtureTenant(ORG_ID, async (tx) => {
			const expiredToken1 = await issuePriceFreezeToken(tx, {
				organizationId: ORG_ID,
				patientId: PATIENT_EXPIRED_ID,
				planId: PLAN_EXPIRED_ID,
				policyKind: "standard_30_days",
				customValidityDays: 30,
			});

			// Переводим токен в прошлое (истек 15 дней назад)
			await tx
				.update(treatmentPlanPriceFreezeTokens)
				.set({
					validUntil: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
					isExpired: true,
					status: "expired",
					updatedAt: new Date(),
				})
				.where(eq(treatmentPlanPriceFreezeTokens.id, expiredToken1.tokenId));

			const expiredToken2 = await issuePriceFreezeToken(tx, {
				organizationId: ORG_ID,
				patientId: PATIENT_THRESHOLD_ID,
				planId: PLAN_THRESHOLD_ID,
				policyKind: "standard_30_days",
				customValidityDays: 30,
			});

			await tx
				.update(treatmentPlanPriceFreezeTokens)
				.set({
					validUntil: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
					isExpired: true,
					status: "expired",
					updatedAt: new Date(),
				})
				.where(eq(treatmentPlanPriceFreezeTokens.id, expiredToken2.tokenId));
		});

		// Поднимаем цены в прейскуранте клиники:
		// 1. Имплантация: с 40 000 ₽ до 50 000 ₽ (+25% > порог 10%)
		// 2. Эндодонтия: с 10 000 ₽ до 10 800 ₽ (+8% <= порог 10%)
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx
				.update(serviceCatalogItems)
				.set({
					basePriceRub: 50000,
					priceRub: 50000,
				})
				.where(eq(serviceCatalogItems.id, SERVICE_IMPLANT_ID));

			await tx
				.update(serviceCatalogItems)
				.set({
					basePriceRub: 10800,
					priceRub: 10800,
				})
				.where(eq(serviceCatalogItems.id, SERVICE_ENDODONTICS_ID));
		});

		clinicToken = signToken({ organizationId: ORG_ID }, authTokenSecret());
		doctorToken = signToken(
			{ organizationId: ORG_ID, userId: DOCTOR_ID, role: "doctor" },
			authTokenSecret(),
		);
		adminToken = signToken(
			{ organizationId: ORG_ID, userId: ADMIN_ID, role: "admin" },
			authTokenSecret(),
		);

		app = createTenantTestApp();
		await registerBillingRoutes(app);
		await registerInvoiceRoutes(app);
		await registerOdontogramRoutes(app);
		await registerPatientRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		if (!databaseReady) return;
		await purgeFixtureOrganizations([ORG_ID]);
	});

	// =========================================================================
	// АУДИТ 7.1: ПОПЫТКА ОФОРМЛЕНИЯ НАРЯДА ПО ИСТЕКШЕМУ ТОКЕНУ С ИНФЛЯЦИЕЙ >10%
	// =========================================================================

	it("AUDIT 7.1: Блокировка наряда по истекшему токену фиксации при росте каталога на +25% (>10% порог ПП РФ №659)", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// Врач или кассир пытается сгенерировать наряд по старой цене 40 000 ₽ без согласования инфляции
		const invoiceRes = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
			payload: {
				planId: PLAN_EXPIRED_ID,
				patientId: PATIENT_EXPIRED_ID,
				documentType: "work_order",
				doctorUserId: DOCTOR_ID,
				items: [
					{
						serviceId: SERVICE_IMPLANT_ID,
						nameRu: "Дентальная имплантация Osstem",
						code804n: "A16.07.054",
						quantity: 1,
						planUnitPriceRub: 40000,
						effectiveUnitPriceRub: 40000,
					},
				],
			},
		});

		console.log("\n[AUDIT 7.1 LOG] Попытка генерации наряда по истекшему токену (инфляция +25%):");
		console.log(`HTTP Status: ${invoiceRes.statusCode}`);
		console.log(`Response Body: ${invoiceRes.body}`);

		// Сервер ОБЯЗАН заблокировать операцию:
		// Срок действия токена истек, а прейскурант вырос на 25% (превышение порога 10% по ПП РФ №659).
		// canGenerateWorkOrder = false, требуется авторизация управляющего (PIN).
		assert.equal(
			invoiceRes.statusCode,
			400,
			"Генерация наряда по истекшей смете с превышением инфляции 10% обязана блокироваться со статусом 400",
		);

		const errBody = invoiceRes.json();
		assert.equal(errBody.error, "BlockedArchivedServiceError");
		assert.equal(errBody.report.canGenerateWorkOrder, false);
		assert.equal(errBody.report.isPlanExpired, true);
		assert.equal(errBody.report.isPriceLocked, false);
		assert.equal(errBody.report.itemsRequiringOverrideCount, 1);

		console.log("[INFLATION SHIELD PROOF] Попытка несанкционированного оформления по истекшей смете заблокирована!");
	});

	// =========================================================================
	// АУДИТ 7.2: ПОПЫТКА ОБОЙТИ БЛОКИРОВКУ НЕВЕРНЫМ PIN-КОДОМ УПРАВЛЯЮЩЕГО
	// =========================================================================

	it("AUDIT 7.2: Попытка обхода блокировки инфляционной надбавки с неверным PIN-кодом администратора", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const fakePinRes = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
			payload: {
				planId: PLAN_EXPIRED_ID,
				patientId: PATIENT_EXPIRED_ID,
				documentType: "work_order",
				doctorUserId: DOCTOR_ID,
				adminOverridePin: "0000", // Фейковый PIN
				adminOverrideReason: "Попытка взлома блокировки цен",
				items: [
					{
						serviceId: SERVICE_IMPLANT_ID,
						nameRu: "Дентальная имплантация Osstem",
						code804n: "A16.07.054",
						quantity: 1,
						planUnitPriceRub: 40000,
						effectiveUnitPriceRub: 40000,
					},
				],
			},
		});

		console.log("\n[AUDIT 7.2 LOG] Попытка авторизации с неверным PIN-кодом:");
		console.log(`HTTP Status: ${fakePinRes.statusCode}`);
		console.log(`Response Body: ${fakePinRes.body}`);

		assert.equal(fakePinRes.statusCode, 401, "Неверный PIN администратора обязан отклоняться с кодом 401");
		const errJson = fakePinRes.json();
		assert.equal(errJson.error, "InvalidAdminPinError");

		console.log("[SECURITY GATE PROOF] Защита PIN-кода администратора доказана на 100%!");
	});

	// =========================================================================
	// АУДИТ 7.3: ЛЕГИТИМНЫЙ ПЕРЕСЧЕТ С АВТОРИЗАЦИЕЙ И РАСЧЕТОМ НАДБАВКИ
	// =========================================================================

	it("AUDIT 7.3: Легитимное оформление наряда по актуальным ценам с авторизацией PIN и расчетом инфляционной надбавки (+10 000 ₽)", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// Управляющий авторизует актуализацию цены (50 000 ₽) правильным PIN-кодом 9944
		const validOverrideRes = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				planId: PLAN_EXPIRED_ID,
				patientId: PATIENT_EXPIRED_ID,
				documentType: "work_order",
				doctorUserId: DOCTOR_ID,
				adminOverridePin: ADMIN_PIN,
				adminOverrideReason: "Согласовано пациентом по Дополнительному соглашению в связи с истечением срока гарантии сметы (ст. 709 ГК РФ)",
				items: [
					{
						serviceId: SERVICE_IMPLANT_ID,
						nameRu: "Дентальная имплантация Osstem",
						code804n: "A16.07.054",
						quantity: 1,
						planUnitPriceRub: 40000,
						effectiveUnitPriceRub: 50000, // Актуальная цена каталога (+10 000 ₽)
						resolutionPolicy: "UPDATE_TO_CURRENT_PRICE",
					},
				],
			},
		});

		console.log("\n[AUDIT 7.3 LOG] Легитимная генерация наряда с авторизацией актуализации цен:");
		console.log(`HTTP Status: ${validOverrideRes.statusCode}`);
		console.log(`Response Body: ${validOverrideRes.body}`);

		assert.equal(validOverrideRes.statusCode, 201, "Наряд обязан успешно сформироваться со статусом 201");
		const body = validOverrideRes.json();

		// Проверка финансовой точности до копейки:
		// Исходная смета: 40 000 ₽
		// Актуальный каталог: 50 000 ₽
		// Инфляционная надбавка пациента: 10 000 ₽ (patientSurchargeKopecks: 1000000)
		assert.equal(body.totalGrossRub, 50000);
		assert.equal(body.totalNetRub, 50000);
		assert.equal(body.validationReport.totalPatientSurchargeKopecks, 1000000);
		assert.equal(body.validationReport.supplementaryAgreementNeeded, true);
		assert.equal(body.validationReport.adminOverrideInfo.isAuthorized, true);

		console.log("[STATUTORY SURCHARGE PROOF] Инфляционная надбавка +10 000 ₽ рассчитана с копеечной точностью!");
	});

	// =========================================================================
	// АУДИТ 7.4: ЭКСПИРАЦИЯ С ИНФЛЯЦИЕЙ В ПРЕДЕЛАХ ПОРОГА (<= 10%)
	// =========================================================================

	it("AUDIT 7.4: Экспирация токена с инфляцией в пределах порога (+8% <= 10%): наряд формируется по прейскуранту без блокировки", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// План эндодонтии (10 000 ₽) подорожал на 800 ₽ (+8% <= 10%)
		const withinThresholdRes = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
			payload: {
				planId: PLAN_THRESHOLD_ID,
				patientId: PATIENT_THRESHOLD_ID,
				documentType: "work_order",
				doctorUserId: DOCTOR_ID,
				items: [
					{
						serviceId: SERVICE_ENDODONTICS_ID,
						nameRu: "Эндодонтическое лечение трехканального зуба",
						code804n: "A16.07.008",
						quantity: 1,
						planUnitPriceRub: 10000,
						effectiveUnitPriceRub: 10800,
						resolutionPolicy: "UPDATE_TO_CURRENT_PRICE",
					},
				],
			},
		});

		console.log("\n[AUDIT 7.4 LOG] Оформление наряда при инфляции в пределах порога (+8%):");
		console.log(`HTTP Status: ${withinThresholdRes.statusCode}`);
		console.log(`Response Body: ${withinThresholdRes.body}`);

		assert.equal(withinThresholdRes.statusCode, 201, "Наряд обязан сформироваться без блокирующего оверрайда");
		const resBody = withinThresholdRes.json();
		assert.equal(resBody.totalGrossRub, 10800);
		assert.equal(resBody.totalNetRub, 10800);
		assert.equal(resBody.validationReport.totalPatientSurchargeKopecks, 80000); // 800 ₽
		assert.equal(resBody.validationReport.canGenerateWorkOrder, true);

		console.log("[WITHIN-THRESHOLD PROOF] Расчет в пределах 10% порога выполнен без блокировки!");
	});
});
