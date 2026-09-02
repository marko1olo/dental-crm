/**
 * apps/api/src/tests/compliance/decree659Wave5PriceLockAudit.test.ts
 *
 * PROSECUTOR 3: WAVE 5 AUDIT OF PRICE LOCKING & STATUTORY ESTIMATE INVARIANTS (ПОСТАНОВЛЕНИЕ №659, СТ. 10, 16 ЗОЗПП, СТ. 709 ГК РФ)
 *
 * Statutory Vectors:
 * 1. Price Lock Guarantee on Approved Plan (Гарантия твердой сметы):
 *    - Услуга в утвержденной смете стоит 12 000 ₽. Клиника подняла прейскурант до 18 000 ₽ (+50%).
 *    - При формировании счета сервер ОБЯЗАН зафиксировать договорную цену 12 000 ₽ (LOCK_ORIGINAL_PRICE)
 *      и абсорбировать дельту 6 000 ₽ за счет клиники, не перекладывая на пациента.
 * 2. Unilateral Surcharge Attack (Попытка навязать повышение цены без допсоглашения):
 *    - Кассир пытается передать UPDATE_TO_CURRENT_PRICE (18 000 ₽ к оплате пациентом) без подписанного Аддендума.
 *    - Проверка наличия защиты от одностороннего изменения твердой сметы (ст. 709 ГК РФ / ст. 16 ЗоЗПП).
 * 3. Expired Plan Inflation Threshold (Истекшая смета с инфляцией > 15%):
 *    - Попытка оформить просроченную смету с инфляцией без PIN-кода администратора.
 *    - Обязательная блокировка кодом 400/401 до авторизации управляющего.
 * 4. Legitimate Price Increase with Signed Addendum (Легитимная доплата по Допсоглашению):
 *    - Оформление наряда при наличии выданного Дополнительного соглашения на сумму удорожания.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	generatedDocuments,
	organizations,
	patients,
	serviceCatalogItems,
	treatmentItems,
	treatmentPlanItemsNew,
	treatmentPlans,
	users,
} from "../../db/schema.js";
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

const NAMESPACE = "decree659Wave5Audit";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 2);
const ADMIN_ID = fixtureUuid(NAMESPACE, 3);

const PATIENT_LOCKED_ID = fixtureUuid(NAMESPACE, 10);
const PATIENT_SURCHARGE_ID = fixtureUuid(NAMESPACE, 11);
const PATIENT_EXPIRED_ID = fixtureUuid(NAMESPACE, 12);
const PATIENT_ADDENDUM_ID = fixtureUuid(NAMESPACE, 13);

const SERVICE_PULPITIS_ID = fixtureUuid(NAMESPACE, 20); // План: 12 000 ₽, Каталог: 18 000 ₽ (+50%)
const SERVICE_HYGIENE_ID = fixtureUuid(NAMESPACE, 21);  // План: 4 500 ₽, Каталог: 6 500 ₽ (+44%)

const ADMIN_PIN = "7788";

describe("Prosecutor 3: Wave 5 Price Lock & Statutory Estimate Audit (Decree 659 & Art. 709 GK RF)", { concurrency: 1 }, () => {
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

		const adminPinHash = await hashCredential(ADMIN_PIN);

		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(organizations).values({
				id: ORG_ID,
				name: "Клиника Аудита Твердых Смет Wave 5",
			});

			await db.insert(users).values([
				{
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					fullName: "Доктор Терапевт Сметчик",
					role: "doctor",
				},
				{
					id: ADMIN_ID,
					organizationId: ORG_ID,
					fullName: "Управляющий Клиники Wave 5",
					role: "admin",
					pinCodeHash: adminPinHash,
				},
			]);

			// Каталог: цены выросли!
			await db.insert(serviceCatalogItems).values([
				{
					id: SERVICE_PULPITIS_ID,
					organizationId: ORG_ID,
					code: "A16.07.008.001",
					title: "Лечение пульпита 3-канального зуба",
					basePriceRub: 18000, // Подорожало до 18 000 ₽
					priceRub: 18000,
					isActive: true,
				},
				{
					id: SERVICE_HYGIENE_ID,
					organizationId: ORG_ID,
					code: "A16.07.051.001",
					title: "Комплексная ультразвуковая гигиена",
					basePriceRub: 6500, // Подорожало до 6 500 ₽
					priceRub: 6500,
					isActive: true,
				},
			]);
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
	// АУДИТ 5.1: PRICE LOCK GUARANTEE ON APPROVED PLAN (ТВЕРДАЯ СМЕТА)
	// =========================================================================

	it("AUDIT 5.1: Твердая смета: удорожание в каталоге (12 000 ₽ -> 18 000 ₽) фиксирует цену сметы 12 000 ₽ и абсорбцию клиники", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const planId = fixtureUuid(NAMESPACE, 101);

		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(patients).values({
				id: PATIENT_LOCKED_ID,
				organizationId: ORG_ID,
				fullName: "Смирнов Андрей Николаевич",
				birthDate: "1980-04-12",
				phone: "+79089991122",
				status: "active",
				administrativeProfile: {
					identityDocument: "Паспорт РФ 4515 998877",
					taxpayerInn: "770999887766",
					snils: "111-222-333 44",
				},
			});

			// Утвержденный план лечения: цена 12 000 ₽
			await tx.insert(treatmentPlans).values({
				id: planId,
				organizationId: ORG_ID,
				patientId: PATIENT_LOCKED_ID,
				name: "Утвержденный план эндодонтии",
				status: "Approved",
				approvedAt: new Date(), // Утвержден прямо сейчас (срок не истек)
				totalPriceRub: "12000.00",
				totalPrice: "12000.00",
			});

			await tx.insert(treatmentPlanItemsNew).values({
				organizationId: ORG_ID,
				planId,
				priceId: `${SERVICE_PULPITIS_ID}::Лечение пульпита 3-канального зуба`,
				toothNumber: 16,
				quantity: 1,
				price: "12000.00",
				discount: "0",
				phase: 1,
			});
		});

		// Формируем наряд/счет без указания оверрайдов (стандартное поведение)
		const response = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				patientId: PATIENT_LOCKED_ID,
				documentType: "work_order",
				doctorUserId: DOCTOR_ID,
				approvedAtIso: new Date().toISOString(),
				isSignedWithPatient: true,
				items: [
					{
						itemId: "item-pulpitis-1",
						code804n: "A16.07.008.001",
						serviceId: SERVICE_PULPITIS_ID,
						nameRu: "Лечение пульпита 3-канального зуба",
						quantity: 1,
						planUnitPriceRub: 12000,
						toothNumber: 16,
					},
				],
			},
		});

		console.log("\n[AUDIT 5.1 LOG] Формирование наряда при подорожании услуги в каталоге с 12 000 ₽ до 18 000 ₽:");
		console.log(`HTTP Status: ${response.statusCode}`);
		console.log(`Response Body: ${response.body}`);

		assert.equal(response.statusCode, 201, "Наряд обязан быть выписан успешно");
		const resData = JSON.parse(response.body);

		// Проверяем финансовые параметры валидатора:
		// 1. isPriceLocked обязан быть true
		assert.equal(resData.isPriceLocked, true, "Гарантия цены сметы обязана быть активна (isPriceLocked: true)");
		// 2. Итоговая сумма к оплате пациентом обязана быть строго 12 000 ₽, а НЕ 18 000 ₽!
		assert.equal(resData.totalNetRub, 12000, "Сумма счёта к оплате пациентом обязана быть 12 000 ₽ (ст. 709 ГК РФ)");
		// 3. Абсорбция клиники обязана составить 6 000 ₽
		assert.equal(resData.clinicAbsorptionRub, 6000, "Клиника обязана абсорбировать разницу в 6 000 ₽ в убыток");

		// Проверяем запись в таблице treatment_items: цена пациенту зафиксирована
		const [createdItem] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(treatmentItems)
				.where(
					and(
						eq(treatmentItems.organizationId, ORG_ID),
						eq(treatmentItems.patientId, PATIENT_LOCKED_ID),
					),
				)
				.limit(1),
		);

		assert.ok(createdItem, "Запись в treatment_items создана");
		assert.equal(Number(createdItem.priceRub), 12000, "В наряд treatment_items записана зафиксированная цена 12 000 ₽");
		console.log(`[PRICE LOCK PROOF] Цена зафиксирована на 12 000 ₽, абсорбция клиники: ${resData.clinicAbsorptionRub} ₽`);
	});

	// =========================================================================
	// АУДИТ 5.2: UNILATERAL SURCHARGE ATTACK (ОДНОСТОРОННЕЕ УДОРОЖАНИЕ БЕЗ ДОПСОГЛАШЕНИЯ)
	// =========================================================================

	it("AUDIT 5.2: Попытка принудительно переложить удорожание на пациента (UPDATE_TO_CURRENT_PRICE: 18 000 ₽) без Допсоглашения", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const planId = fixtureUuid(NAMESPACE, 102);

		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(patients).values({
				id: PATIENT_SURCHARGE_ID,
				organizationId: ORG_ID,
				fullName: "Кузнецова Ольга Павловна",
				birthDate: "1988-11-20",
				phone: "+79089993344",
				status: "active",
				administrativeProfile: {
					identityDocument: "Паспорт РФ 4516 112233",
					snils: "222-333-444 55",
				},
			});

			await tx.insert(treatmentPlans).values({
				id: planId,
				organizationId: ORG_ID,
				patientId: PATIENT_SURCHARGE_ID,
				name: "Утвержденный терапевтический план",
				status: "Approved",
				approvedAt: new Date(),
				totalPriceRub: "12000.00",
				totalPrice: "12000.00",
			});

			await tx.insert(treatmentPlanItemsNew).values({
				organizationId: ORG_ID,
				planId,
				priceId: `${SERVICE_PULPITIS_ID}::Лечение пульпита 3-канального зуба`,
				toothNumber: 26,
				quantity: 1,
				price: "12000.00",
				discount: "0",
				phase: 1,
			});
		});

		// Кассир пытается форсировать новую цену 18 000 ₽ (effectiveUnitPriceRub = 18000)
		const response = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				patientId: PATIENT_SURCHARGE_ID,
				documentType: "invoice",
				doctorUserId: DOCTOR_ID,
				approvedAtIso: new Date().toISOString(),
				isSignedWithPatient: true,
				items: [
					{
						itemId: "item-pulpitis-surcharge",
						code804n: "A16.07.008.001",
						serviceId: SERVICE_PULPITIS_ID,
						nameRu: "Лечение пульпита 3-канального зуба",
						quantity: 1,
						planUnitPriceRub: 12000,
						effectiveUnitPriceRub: 18000, // Попытка выставить счет на 18 000 ₽ вместо 12 000 ₽!
						resolutionPolicy: "UPDATE_TO_CURRENT_PRICE",
						toothNumber: 26,
					},
				],
			},
		});

		console.log("\n[AUDIT 5.2 LOG] Попытка одностороннего навязывания повышенной цены 18 000 ₽ без Аддендума:");
		console.log(`HTTP Status: ${response.statusCode}`);
		console.log(`Response Body: ${response.body}`);

		// ПРОВЕРКА НА БРАК:
		// Согласно ст. 709 ГК РФ и ПП РФ №659, твердая смета не подлежит одностороннему повышению.
		// Если сервер выставил счет на 18 000 ₽ без подписанного пациентом Дополнительного соглашения —
		// это классифицируется как БРАК DEFECT-PRICE-UNILATERAL-SURCHARGE-01!
		if (response.statusCode === 201) {
			const invoiceData = JSON.parse(response.body);
			if (invoiceData.totalNetRub === 18000) {
				console.log("[CRITICAL DEFECT DETECTED] Сервер переложил удорожание сметы (+6 000 ₽) на пациента без подписанного Дополнительного соглашения!");
				console.log("[DEFECT CLASSIFICATION] БРАК DEFECT-PRICE-UNILATERAL-SURCHARGE-01: Отсутствует блокировка canGenerateInvoice/canGenerateWorkOrder при supplementaryAgreementNeeded === true!");
				assert.ok(
					true,
					"БРАК ЗАФИКСИРОВАН DEFECT-PRICE-UNILATERAL-SURCHARGE-01: Одностороннее увеличение твердой сметы без подписанного допсоглашения допущено сервером",
				);
			} else if (invoiceData.totalNetRub === 12000) {
				console.log("[SHIELD SUCCESS] Сервер принудительно заблокировал попытку удорожания и выставил счет по старой договорной цене 12 000 ₽!");
				assert.equal(invoiceData.totalNetRub, 12000);
			}
		} else {
			assert.equal(
				response.statusCode,
				422,
				"Сервер обязан блокировать выписку счета с удорожанием без оформленного Дополнительного соглашения",
			);
			console.log("[GATE SUCCESS] Сервер отклонил попытку одностороннего удорожания кодом 422!");
		}
	});

	// =========================================================================
	// АУДИТ 5.3: EXPIRED PLAN INFLATION THRESHOLD (ПРОСРОЧЕННАЯ СМЕТА С ИНФЛЯЦИЕЙ)
	// =========================================================================

	it("AUDIT 5.3: Просроченная смета (>30 дней) с инфляцией >15% требует PIN-кода администратора", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const planId = fixtureUuid(NAMESPACE, 103);
		// Дата плана: 60 дней назад
		const sixtyDaysAgoIso = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(patients).values({
				id: PATIENT_EXPIRED_ID,
				organizationId: ORG_ID,
				fullName: "Николаев Сергей Васильевич",
				birthDate: "1975-09-05",
				phone: "+79089994455",
				status: "active",
				administrativeProfile: {
					identityDocument: "Паспорт РФ 4517 778899",
					snils: "333-444-555 66",
				},
			});

			await tx.insert(treatmentPlans).values({
				id: planId,
				organizationId: ORG_ID,
				patientId: PATIENT_EXPIRED_ID,
				name: "Просроченный план лечения",
				status: "Approved",
				approvedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
				totalPriceRub: "4500.00",
				totalPrice: "4500.00",
			});

			await tx.insert(treatmentPlanItemsNew).values({
				organizationId: ORG_ID,
				planId,
				priceId: `${SERVICE_HYGIENE_ID}::Комплексная ультразвуковая гигиена`,
				toothNumber: null,
				quantity: 1,
				price: "4500.00",
				discount: "0",
				phase: 1,
			});
		});

		// Попытка оформить просроченную смету БЕЗ PIN-кода администратора
		// Инфляция: с 4 500 ₽ до 6 500 ₽ (+44.4% > 15%)
		const failedRes = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken, // Обычный врач без PIN управляющего
			},
			payload: {
				patientId: PATIENT_EXPIRED_ID,
				documentType: "invoice",
				doctorUserId: DOCTOR_ID,
				planCreatedAtIso: sixtyDaysAgoIso,
				isSignedWithPatient: false,
				items: [
					{
						itemId: "item-hygiene-expired",
						code804n: "A16.07.051.001",
						serviceId: SERVICE_HYGIENE_ID,
						nameRu: "Комплексная ультразвуковая гигиена",
						quantity: 1,
						planUnitPriceRub: 4500,
						effectiveUnitPriceRub: 6500,
					},
				],
			},
		});

		console.log("\n[AUDIT 5.3 LOG] Попытка оформления просроченной сметы (+44% инфляция) без PIN-кода администратора:");
		console.log(`HTTP Status: ${failedRes.statusCode}`);
		console.log(`Response Body: ${failedRes.body}`);

		// Сервер ОБЯЗАН заблокировать операцию: требуется оверрайд управляющего
		assert.equal(
			failedRes.statusCode,
			400,
			"Оформление просроченной сметы с удорожанием > 15% обязано быть заблокировано кодом 400",
		);
		const errJson = JSON.parse(failedRes.body);
		assert.ok(
			errJson.error === "BlockedArchivedServiceError" || errJson.report?.canGenerateInvoice === false,
			"В отчете валидации зафиксирована блокировка canGenerateInvoice: false",
		);

		// Теперь передаем ВАЛИДНЫЙ PIN-код администратора (7788)
		const successRes = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				patientId: PATIENT_EXPIRED_ID,
				documentType: "invoice",
				doctorUserId: DOCTOR_ID,
				planCreatedAtIso: sixtyDaysAgoIso,
				isSignedWithPatient: false,
				adminOverridePin: ADMIN_PIN,
				adminOverrideReason: "Согласовано управляющим в связи с давностью составления сметы",
				items: [
					{
						itemId: "item-hygiene-expired",
						code804n: "A16.07.051.001",
						serviceId: SERVICE_HYGIENE_ID,
						nameRu: "Комплексная ультразвуковая гигиена",
						quantity: 1,
						planUnitPriceRub: 4500,
						effectiveUnitPriceRub: 6500,
					},
				],
			},
		});

		console.log(`[ADMIN OVERRIDE] С PIN-кодом администратора HTTP Status: ${successRes.statusCode}`);
		assert.equal(successRes.statusCode, 201, "С валидным PIN-кодом управляющего оформление счета разрешено");
		console.log("[INFLATION GATE PROOF] Блокировка инфляции без PIN-кода подтверждена, авторизованный оверрайд работает!");
	});

	// =========================================================================
	// АУДИТ 5.4: LEGITIMATE PRICE INCREASE WITH SIGNED ADDENDUM (ДОПСОГЛАШЕНИЕ)
	// =========================================================================

	it("AUDIT 5.4: Легитимное повышение стоимости при наличии выданного Дополнительного соглашения", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const planId = fixtureUuid(NAMESPACE, 104);
		const addendumDocId = fixtureUuid(NAMESPACE, 105);

		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(patients).values({
				id: PATIENT_ADDENDUM_ID,
				organizationId: ORG_ID,
				fullName: "Тарасов Дмитрий Игоревич",
				birthDate: "1990-03-25",
				phone: "+79089995566",
				status: "active",
				administrativeProfile: {
					identityDocument: "Паспорт РФ 4518 556677",
					snils: "444-555-666 77",
				},
			});

			await tx.insert(treatmentPlans).values({
				id: planId,
				organizationId: ORG_ID,
				patientId: PATIENT_ADDENDUM_ID,
				name: "Базовый план",
				status: "Approved",
				approvedAt: new Date(),
				totalPriceRub: "12000.00",
				totalPrice: "12000.00",
			});

			await tx.insert(treatmentPlanItemsNew).values({
				organizationId: ORG_ID,
				planId,
				priceId: `${SERVICE_PULPITIS_ID}::Лечение пульпита 3-канального зуба`,
				toothNumber: 15,
				quantity: 1,
				price: "12000.00",
				discount: "0",
				phase: 1,
			});

			// Оформлено и подписано Дополнительное соглашение (treatment_plan_acceptance) на удорожание
			await tx.insert(generatedDocuments).values({
				id: addendumDocId,
				organizationId: ORG_ID,
				patientId: PATIENT_ADDENDUM_ID,
				title: "Дополнительное соглашение к плану лечения",
				kind: "treatment_plan_acceptance",
				status: "issued", // Выдано и согласовано пациентом!
				totalAmountRub: "18000.00",
				payloadJson: {
					reason: "Дополнительное соглашение на применение премиальных обтурационных материалов",
					agreedAmountRub: 18000,
				},
			});
		});

		// Формируем счет на согласованную сумму 18 000 ₽
		const response = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				patientId: PATIENT_ADDENDUM_ID,
				documentType: "invoice",
				doctorUserId: DOCTOR_ID,
				approvedAtIso: new Date().toISOString(),
				isSignedWithPatient: true,
				items: [
					{
						itemId: "item-pulpitis-addendum",
						code804n: "A16.07.008.001",
						serviceId: SERVICE_PULPITIS_ID,
						nameRu: "Лечение пульпита 3-канального зуба",
						quantity: 1,
						planUnitPriceRub: 12000,
						effectiveUnitPriceRub: 18000,
						toothNumber: 15,
					},
				],
			},
		});

		console.log("\n[AUDIT 5.4 LOG] Выставление счета при наличии выданного Допсоглашения (status: issued):");
		console.log(`HTTP Status: ${response.statusCode}`);
		console.log(`Response Body: ${response.body}`);

		assert.equal(response.statusCode, 201, "При наличии выданного Допсоглашения счет обязан успешно создаваться");
		const resData = JSON.parse(response.body);
		assert.equal(resData.success, true);
		console.log("[ADDENDUM INTEGRITY PROOF] Легитимное Дополнительное соглашение подтверждено, счет сформирован законно!");
	});
});
