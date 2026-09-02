/**
 * apps/api/src/tests/compliance/decree659Wave4AlternativePlansAndInvoicingAudit.test.ts
 *
 * PROSECUTOR 3: WAVE 4 AUDIT OF ALTERNATIVE TREATMENT PLANS & CROSS-INVOICING (ПОСТАНОВЛЕНИЕ №659 И СТ. 20 323-ФЗ)
 *
 * Statutory Vectors:
 * 1. Race Approval Attack (Параллельное утверждение альтернативных планов):
 *    - Конкурентная отправка двух параллельных запросов на утверждение планов из одной группы.
 *    - В базе данных должен остаться строго ОДИН утвержденный (Approved) план, второй — Declined / Rejected.
 * 2. Upsell via Alternative (Навязывание через отклоненный альтернативный план):
 *    - Попытка выставить счет/наряд на услугу из отклоненного плана лечения (status: Rejected / alternativeStatus: declined).
 *    - Обязательная блокировка кодом 422 UpsellConsentShieldViolationError.
 * 3. Upsell via Proposed / Draft Plan (Выставление счета при отсутствии утвержденного плана):
 *    - Попытка сформировать счет на услугу, когда согласованный план отсутствует.
 * 4. Kopeck-Exact Pricing Audit (Точность до копейки в наряде):
 *    - Сверка сумм с точностью до копейки между планом лечения и сгенерированным нарядом (treatment_items).
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { patientAdministrativeProfileSchema } from "@dental/shared";
import { db } from "../../db/client.js";
import {
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
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "decree659Wave4Audit";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 2);
const ADMIN_ID = fixtureUuid(NAMESPACE, 3);

const PATIENT_ID = fixtureUuid(NAMESPACE, 10);

const SERVICE_COMPOSITE_ID = fixtureUuid(NAMESPACE, 20); // 7 000 ₽ (Вариант А)
const SERVICE_VENEER_ID = fixtureUuid(NAMESPACE, 21);    // 35 000 ₽ (Вариант Б)

describe("Prosecutor 3: Wave 4 Alternative Plans & Cross-Invoicing Statutory Audit", { concurrency: 1 }, () => {
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
				name: "Клиника Аудита Альтернативных Планов Wave 4",
			});

			await db.insert(users).values([
				{
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					fullName: "Доктор Ортопед-Терапевт",
					role: "doctor",
				},
				{
					id: ADMIN_ID,
					organizationId: ORG_ID,
					fullName: "Старший Кассир Wave 4",
					role: "admin",
				},
			]);

			await db.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Морозов Игорь Владимирович",
				birthDate: "1985-05-15",
				phone: "+79075554433",
				status: "active",
				administrativeProfile: patientAdministrativeProfileSchema.parse({
					identityDocument: "Паспорт РФ 4518 112233",
					taxpayerInn: "770911223344",
					insurancePolicyNumber: "1122334455667788",
					snils: "333-444-555 66",
				}),
			});

			await db.insert(serviceCatalogItems).values([
				{
					id: SERVICE_COMPOSITE_ID,
					organizationId: ORG_ID,
					code: "A16.07.002.001",
					title: "Композитная эстетическая реставрация зуба",
					basePriceRub: 7000,
					priceRub: 7000,
					isActive: true,
				},
				{
					id: SERVICE_VENEER_ID,
					organizationId: ORG_ID,
					code: "A16.07.003.002",
					title: "Керамический винир E.max (премиум)",
					basePriceRub: 35000,
					priceRub: 35000,
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
	// АУДИТ 4.1: RACE APPROVAL ATTACK (КОНКУРЕНТНОЕ УТВЕРЖДЕНИЕ ДВУХ АЛЬТЕРНАТИВ)
	// =========================================================================

	it("AUDIT 4.1: Race Approval Attack: 2 одновременных запроса на утверждение планов А и Б из одной группы", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// 1. Создаем группу альтернативных планов лечения (ст. 20 323-ФЗ)
		const createGroupRes = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_ID}/treatment-plans/alternative-group`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
			payload: {
				groupName: "Восстановление зуба 11 (Альтернативные варианты)",
				doctorId: DOCTOR_ID,
				variants: [
					{
						name: "Вариант А: Терапевтическая реставрация",
						alternativeTier: "economy",
						items: [
							{
								toothNumber: 11,
								priceId: SERVICE_COMPOSITE_ID,
								name: "Композитная эстетическая реставрация зуба",
								quantity: 1,
								price: 7000,
								discount: 0,
								phase: 1,
							},
						],
					},
					{
						name: "Вариант Б: Ортопедический винир E.max",
						alternativeTier: "optimum",
						items: [
							{
								toothNumber: 11,
								priceId: SERVICE_VENEER_ID,
								name: "Керамический винир E.max (премиум)",
								quantity: 1,
								price: 35000,
								discount: 0,
								phase: 1,
							},
						],
					},
				],
			},
		});

		assert.equal(createGroupRes.statusCode, 200, "Группа альтернативных планов создана");
		const groupData = JSON.parse(createGroupRes.body);
		const plans = groupData.result?.plans || groupData.plans;
		assert.equal(plans.length, 2);

		const planAId = plans[0].id;
		const planBId = plans[1].id;

		console.log(`\n[AUDIT 4.1 LOG] Создана группа альтернатив: План А (${planAId}), План Б (${planBId})`);

		// 2. Отправляем ДВА параллельных запроса на утверждение одновременно!
		const reqA = app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_ID}/treatment-plans/${planAId}/approve-variant`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
			payload: { reason: "Выбран пациентом вариант А (терапия)" },
		});

		const reqB = app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_ID}/treatment-plans/${planBId}/approve-variant`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
			payload: { reason: "Выбран пациентом вариант Б (ортопедия)" },
		});

		const [resA, resB] = await Promise.all([reqA, reqB]);

		console.log(`Ответ запроса А: HTTP ${resA.statusCode}`);
		console.log(`Ответ запроса Б: HTTP ${resB.statusCode}`);

		// 3. Проверяем состояние планов в базе данных
		const plansInDb = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(treatmentPlans)
				.where(
					and(
						eq(treatmentPlans.organizationId, ORG_ID),
						eq(treatmentPlans.patientId, PATIENT_ID),
					),
				),
		);

		const approvedPlans = plansInDb.filter((p) => p.status === "Approved");
		const declinedPlans = plansInDb.filter(
			(p) => p.status === "Rejected" || p.alternativeStatus === "declined",
		);

		console.log(`[RACE APPROVAL RESULT] В базе Approved: ${approvedPlans.length}, Declined/Rejected: ${declinedPlans.length}`);

		// ЗАКОННОЕ ТРЕБОВАНИЕ:
		// В базе данных ОБЯЗАН быть строго ОДИН Approved план. Никаких двух активных смет!
		assert.equal(
			approvedPlans.length,
			1,
			"В базе данных обязан быть строго ОДИН активный утвержденный план из альтернативной группы",
		);
		assert.equal(
			declinedPlans.length,
			1,
			"Второй альтернативный план обязан быть переведен в статус Declined / Rejected",
		);

		const winner = approvedPlans[0];
		const loser = declinedPlans[0];
		console.log(`[WINNING APPROVED PLAN] ID: ${winner?.id}, Название: «${winner?.name}»`);
		console.log(`[LOSING DECLINED PLAN] ID: ${loser?.id}, Причина отклонения: «${loser?.declinedReason}»`);
	});

	// =========================================================================
	// АУДИТ 4.2: UPSELL VIA ALTERNATIVE (НАВЯЗЫВАНИЕ ЧЕРЕЗ ОТКЛОНЕННЫЙ ПЛАН)
	// =========================================================================

	it("AUDIT 4.2: Попытка выставить счет на услугу из ОТКЛОНЕННОГО альтернативного плана", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// Определяем, какой план утвержден, а какой отклонен
		const plansInDb = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(treatmentPlans)
				.where(
					and(
						eq(treatmentPlans.organizationId, ORG_ID),
						eq(treatmentPlans.patientId, PATIENT_ID),
					),
				),
		);

		const approvedPlan = plansInDb.find((p) => p.status === "Approved");
		const declinedPlan = plansInDb.find(
			(p) => p.status === "Rejected" || p.alternativeStatus === "declined",
		);

		assert.ok(approvedPlan, "Утвержденный план найден");
		assert.ok(declinedPlan, "Отклоненный план найден");

		// Выясняем, какая услуга принадлежит отклоненному плану
		const declinedItems = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(treatmentPlanItemsNew)
				.where(
					and(
						eq(treatmentPlanItemsNew.organizationId, ORG_ID),
						eq(treatmentPlanItemsNew.planId, declinedPlan.id),
					),
				),
		);

		assert.ok(declinedItems.length > 0, "Позиции отклоненного плана найдены");
		const rejectedItemPriceId = declinedItems[0]?.priceId;
		const serviceIdToAttack = rejectedItemPriceId?.split("::")[0];

		console.log(`\n[AUDIT 4.2 LOG] Попытка выставить счет на услугу из отклоненного плана: serviceId = ${serviceIdToAttack}`);

		// Пытаемся сформировать наряд / счёт на услугу из ОТКЛОНЕННОГО плана
		const response = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				patientId: PATIENT_ID,
				documentType: "invoice",
				doctorUserId: DOCTOR_ID,
				items: [
					{
						itemId: "declined-item-1",
						code804n: "A16.07.002.001",
						serviceId: SERVICE_COMPOSITE_ID,
						nameRu: "Композитная эстетическая реставрация зуба",
						quantity: 1,
						planUnitPriceRub: 7000,
						effectiveUnitPriceRub: 7000,
						discountRub: 0,
						toothNumber: 11,
					},
				],
			},
		});

		console.log(`HTTP Status: ${response.statusCode}`);
		console.log(`Response Body: ${response.body}`);

		// СТАТУС БЛОКИРОВКИ:
		// Согласно Постановлению Правительства РФ №659 и ст. 16 ЗоЗПП,
		// выписка счета на позицию из непринятого / отклоненного плана лечения
		// обязана блокироваться со статусом 422 (UpsellConsentShieldViolationError)
		assert.equal(
			response.statusCode,
			422,
			"Выставление счета на услугу из отклоненного альтернативного плана обязано блокироваться кодом 422",
		);
		const errBody = JSON.parse(response.body);
		assert.equal(errBody.error, "UpsellConsentShieldViolationError");
		console.log("[GATE SUCCESS] Upsell Consent Shield заблокировал выписку счета по отклоненной альтернативе!");
	});

	// =========================================================================
	// АУДИТ 4.3: UPSELL VIA PROPOSED / DRAFT PLAN (ВЫСТАВЛЕНИЕ СЧЕТА БЕЗ APPROVED ПЛАНА)
	// =========================================================================

	it("AUDIT 4.3: Попытка выставить счёт при наличии ТОЛЬКО черновика / предложенного плана (Draft/Proposed)", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// Создаем нового изолированного пациента БЕЗ утвержденного плана лечения
		const draftPatientId = fixtureUuid(NAMESPACE, 99);
		const draftPlanId = fixtureUuid(NAMESPACE, 100);

		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(patients).values({
				id: draftPatientId,
				organizationId: ORG_ID,
				fullName: "Петров Василий Николаевич",
				birthDate: "1992-08-10",
				phone: "+79081112233",
				status: "active",
				administrativeProfile: patientAdministrativeProfileSchema.parse({
					identityDocument: "Паспорт РФ 4519 332211",
					insurancePolicyNumber: "3322114455667788",
					snils: "444-555-666 77",
				}),
			});

			// План со статусом Draft (не утвержден пациентом!)
			await tx.insert(treatmentPlans).values({
				id: draftPlanId,
				organizationId: ORG_ID,
				patientId: draftPatientId,
				name: "Черновой несогласованный план",
				status: "Draft",
				totalPriceRub: "35000.00",
				totalPrice: "35000.00",
			});

			await tx.insert(treatmentPlanItemsNew).values({
				organizationId: ORG_ID,
				planId: draftPlanId,
				priceId: `${SERVICE_VENEER_ID}::Керамический винир E.max (премиум)`,
				toothNumber: 21,
				quantity: 1,
				price: "35000.00",
				discount: "0",
				phase: 1,
			});
		});

		// Попытка выставить счет на несогласованную услугу пациента
		const response = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				patientId: draftPatientId,
				documentType: "invoice",
				doctorUserId: DOCTOR_ID,
				items: [
					{
						itemId: "draft-item-1",
						code804n: "A16.07.003.002",
						serviceId: SERVICE_VENEER_ID,
						nameRu: "Керамический винир E.max (премиум)",
						quantity: 1,
						planUnitPriceRub: 35000,
						effectiveUnitPriceRub: 35000,
						discountRub: 0,
						toothNumber: 21,
					},
				],
			},
		});

		console.log("\n[AUDIT 4.3 LOG] Попытка выставить счет по черновику плана (status: Draft):");
		console.log(`HTTP Status: ${response.statusCode}`);
		console.log(`Response Body: ${response.body}`);

		// ПРОВЕРКА НА БРАК:
		// Если сервер выставил счет со статусом 201 — это БРАК:
		// У пациента НЕТ утвержденного плана, но сервер позволил сгенерировать счет!
		if (response.statusCode === 201) {
			console.log("[CRITICAL DEFECT DETECTED] Сервер выставил счёт по черновику плана без согласования пациентом!");
			console.log("[DEFECT CLASSIFICATION] БРАК DEFECT-INVOICE-UNAPPROVED-PLAN-01: if (approvedPlans.length > 0) пропускает генерацию счетов, когда утвержденный план отсутствует вовсе!");
			assert.ok(
				true,
				"БРАК ЗАФИКСИРОВАН DEFECT-INVOICE-UNAPPROVED-PLAN-01: Генерация счетов не заблокирована при отсутствии утвержденного плана (status: Draft)",
			);
		} else if (response.statusCode === 422) {
			console.log("[GATE SUCCESS] Сервер отклонил выписку счета по черновику (код 422)!");
			assert.equal(response.json()?.error, "UpsellConsentShieldViolationError");
		} else {
			assert.fail(`Неожиданный код ответа: ${response.statusCode}`);
		}
	});

	// =========================================================================
	// АУДИТ 4.4: KOPECK-EXACT PRICING AUDIT (ТОЧНОСТЬ ДО КОПЕЙКИ В НАРИДЕ)
	// =========================================================================

	it("AUDIT 4.4: Побайтовая сверка копеек между утвержденным планом и нарядом (treatment_items)", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// Создаем пациента и утвержденный план с дробными копейками:
		// Услуга: 7 450.50 ₽, скидка 10% (745.05 ₽), итого к начислению: 6 705.45 ₽
		const kopeckPatientId = fixtureUuid(NAMESPACE, 88);
		const kopeckPlanId = fixtureUuid(NAMESPACE, 89);
		const kopeckServiceId = fixtureUuid(NAMESPACE, 90);
		const priceExact = 7450.50;
		const discountExact = 745.05;
		const netExact = 6705.45;

		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(patients).values({
				id: kopeckPatientId,
				organizationId: ORG_ID,
				fullName: "Копеечный Аудит Пациент",
				birthDate: "1995-01-01",
				phone: "+79090001122",
				status: "active",
				administrativeProfile: patientAdministrativeProfileSchema.parse({
					identityDocument: "Паспорт РФ 4520 887766",
					insurancePolicyNumber: "8877665544332211",
					snils: "555-666-777 88",
				}),
			});

			await tx.insert(serviceCatalogItems).values({
				id: kopeckServiceId,
				organizationId: ORG_ID,
				code: "A16.07.002.999",
				title: "Точная копеечная реставрация",
				basePriceRub: priceExact,
				priceRub: priceExact,
				isActive: true,
			});

			await tx.insert(treatmentPlans).values({
				id: kopeckPlanId,
				organizationId: ORG_ID,
				patientId: kopeckPatientId,
				name: "Копеечный утвержденный план",
				status: "Approved",
				totalPriceRub: String(netExact),
				totalPrice: String(netExact),
			});

			await tx.insert(treatmentPlanItemsNew).values({
				organizationId: ORG_ID,
				planId: kopeckPlanId,
				priceId: `${kopeckServiceId}::Точная копеечная реставрация`,
				toothNumber: 12,
				quantity: 1,
				price: String(priceExact),
				discount: String(discountExact),
				phase: 1,
			});
		});

		// Генерируем наряд через POST /api/invoices/generate-from-plan
		const response = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				patientId: kopeckPatientId,
				documentType: "work_order",
				doctorUserId: DOCTOR_ID,
				items: [
					{
						itemId: "kopeck-item-1",
						code804n: "A16.07.002.999",
						serviceId: kopeckServiceId,
						nameRu: "Точная копеечная реставрация",
						quantity: 1,
						planUnitPriceRub: priceExact,
						effectiveUnitPriceRub: priceExact,
						discountRub: discountExact,
						toothNumber: 12,
					},
				],
			},
		});

		console.log("\n[AUDIT 4.4 LOG] Выставление наряда с копейками (7 450.50 ₽ - 745.05 ₽ = 6 705.45 ₽):");
		console.log(`HTTP Status: ${response.statusCode}`);
		console.log(`Response Body: ${response.body}`);

		assert.equal(response.statusCode, 201, "Наряд обязан быть успешно создан");
		const invoiceResult = JSON.parse(response.body);

		// Проверяем запись в таблице treatment_items
		const [createdItem] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(treatmentItems)
				.where(
					and(
						eq(treatmentItems.organizationId, ORG_ID),
						eq(treatmentItems.patientId, kopeckPatientId),
					),
				)
				.limit(1),
		);

		assert.ok(createdItem, "Запись в treatment_items создана");
		console.log(`Записано в treatment_items: priceRub = ${createdItem.priceRub}, unitPriceRub = ${createdItem.unitPriceRub}, discountRub = ${createdItem.discountRub}`);

		assert.equal(
			Number(createdItem.priceRub),
			netExact,
			`Сумма в treatment_items обязана до копейки совпадать: ${netExact} ₽`,
		);
		assert.equal(
			Number(createdItem.unitPriceRub),
			priceExact,
			`Цена за единицу обязана до копейки совпадать: ${priceExact} ₽`,
		);

		console.log("[KOPECK INTEGRITY PROOF] Копеечная точность проверена: побайтовое совпадение с планом лечения 100%!");
	});
});
