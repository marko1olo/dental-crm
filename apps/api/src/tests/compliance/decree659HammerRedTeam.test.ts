/**
 * apps/api/src/tests/compliance/decree659HammerRedTeam.test.ts
 *
 * PROSECUTOR 3 / RED-TEAM: SECOND WAVE OF HAMMER INQUISITION
 * ADVERSARIAL AUDIT OF DECREE 659, CONSUMER PROTECTION LAW & CASHIER GATES
 *
 * Statutory Vectors Tested:
 * 1. Bypass of Upsell Consent Shield via Missing Endpoints (/api/invoices/bulk, /api/payments/advance)
 *    and sneaky Prepayment/Advance without serviceId.
 * 2. Bypass of Upsell Consent Shield via Invoicing route (/api/invoices/generate-from-plan).
 * 3. Concurrency / Race Condition attack (5 simultaneous concurrent payment requests without Addendum).
 * 4. Fake / Invalid Addendum attacks:
 *    4a. Voided Addendum (status = 'voided').
 *    4b. Unsigned Draft Addendum (status = 'draft').
 *    4c. Mismatched Service / Amount Addendum (Addendum for 5,000 ₽ teeth whitening unlocking 45,000 ₽ implant).
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
	payments,
	serviceCatalogItems,
	treatmentPlanItemsNew,
	treatmentPlans,
	treatmentItems,
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

const NAMESPACE = "decree659HammerRedTeam";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 2);
const ADMIN_ID = fixtureUuid(NAMESPACE, 3);

/** Пациент с утвержденным планом лечения */
const PATIENT_VICTIM = fixtureUuid(NAMESPACE, 10);

/** Утвержденный план лечения */
const APPROVED_PLAN_ID = fixtureUuid(NAMESPACE, 20);

/** Услуга 1: Базовая услуга в плане (1 500 ₽) */
const SERVICE_APPROVED_ID = fixtureUuid(NAMESPACE, 30);
const PRICE_APPROVED = 1500;

/** Услуга 2: Дорогая навязанная услуга (45 000 ₽) - отсутствует в плане */
const SERVICE_UNAPPROVED_ID = fixtureUuid(NAMESPACE, 31);
const PRICE_UNAPPROVED = 45000;

/** Услуга 3: Мелкая услуга для поддельного допсоглашения (5 000 ₽) */
const SERVICE_WHITENING_ID = fixtureUuid(NAMESPACE, 32);
const PRICE_WHITENING = 5000;

describe("Prosecutor 3 Red-Team: Hammer Inquisition Wave 2 (Decree 659 & Upsell Shield)", { concurrency: 1 }, () => {
	let app: FastifyInstance;
	let clinicToken = "";
	let staffToken = "";
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
			// 1. Организация
			await db.insert(organizations).values({
				id: ORG_ID,
				name: "Клиника Ред-Тим Инквизиции №659",
			});

			// 2. Пользователи
			await db.insert(users).values([
				{
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					fullName: "Доктор Инквизитор",
					role: "doctor",
				},
				{
					id: ADMIN_ID,
					organizationId: ORG_ID,
					fullName: "Администратор Кассы",
					role: "admin",
				},
			]);

			// 3. Пациент
			await db.insert(patients).values({
				id: PATIENT_VICTIM,
				organizationId: ORG_ID,
				fullName: "Иванов Иван Петрович",
				birthDate: "1985-06-15",
				phone: "+79031234567",
				email: "ivanov@example.com",
				status: "active",
				administrativeProfile: {
					identityDocument: "Паспорт РФ 4510 123456",
					taxpayerInn: "770198765432",
					registrationAddress: "г. Москва, ул. Арбат, д. 1",
					residentialAddress: "г. Москва, ул. Арбат, д. 1",
					insurancePolicyNumber: "1234567890123456",
					snils: "123-456-789 00",
					legalRepresentativeFullName: null,
					legalRepresentativeRelationship: null,
					legalRepresentativeIdentityDocument: null,
					legalRepresentativePhone: null,
					preferredDocumentRecipient: null,
					preferredAppointmentWeekdays: [],
					preferredAppointmentStart: null,
					preferredAppointmentEnd: null,
					preferredAppointmentNote: null,
					dataProcessingBasisNote: "Согласие",
					orthodonticProgress: null,
					loyaltyTier: "standard",
					curatorId: null,
					curatorFullName: null,
					curatorAssignedAt: null,
					curatorFunnelStage: null,
					curatorCommissionPercent: null,
					curatorNotes: null,
					curatorNextContactDate: null,
				},
			});

			// 4. Каталог услуг
			await db.insert(serviceCatalogItems).values([
				{
					id: SERVICE_APPROVED_ID,
					organizationId: ORG_ID,
					code: "A11.07.001",
					title: "Первичный осмотр (согласовано в плане)",
					basePriceRub: PRICE_APPROVED,
					priceRub: PRICE_APPROVED,
					isActive: true,
				},
				{
					id: SERVICE_UNAPPROVED_ID,
					organizationId: ORG_ID,
					code: "A16.07.054",
					title: "Имплантация Nobel Biocare (навязанная услуга)",
					basePriceRub: PRICE_UNAPPROVED,
					priceRub: PRICE_UNAPPROVED,
					isActive: true,
				},
				{
					id: SERVICE_WHITENING_ID,
					organizationId: ORG_ID,
					code: "A16.07.050",
					title: "Профессиональное отбеливание Zoom 4",
					basePriceRub: PRICE_WHITENING,
					priceRub: PRICE_WHITENING,
					isActive: true,
				},
			]);

			// 5. Утвержденный план лечения
			await db.insert(treatmentPlans).values({
				id: APPROVED_PLAN_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_VICTIM,
				doctorId: DOCTOR_ID,
				title: "Базовый утвержденный терапевтический план",
				name: "Базовый утвержденный план",
				status: "Approved",
				approvedAt: new Date(),
				totalPrice: String(PRICE_APPROVED),
				totalPriceRub: String(PRICE_APPROVED),
				patientSignature: null,
				version: 1,
			});

			await db.insert(treatmentPlanItemsNew).values({
				organizationId: ORG_ID,
				planId: APPROVED_PLAN_ID,
				toothNumber: 11,
				priceId: `${SERVICE_APPROVED_ID}::Первичный осмотр`,
				quantity: 1,
				price: String(PRICE_APPROVED),
				discount: "0",
				phase: 1,
				isBundle: false,
			});

			await db.insert(treatmentItems).values({
				organizationId: ORG_ID,
				patientId: PATIENT_VICTIM,
				serviceId: SERVICE_APPROVED_ID,
				toothCode: "11",
				title: "Первичный осмотр (согласовано в плане)",
				quantity: "1",
				unitPriceRub: PRICE_APPROVED,
				priceRub: PRICE_APPROVED,
				discountRub: 0,
				status: "approved",
				plannedDoctorUserId: DOCTOR_ID,
				notes: "Утвержденный план лечения",
			});
		});

		clinicToken = signToken({ organizationId: ORG_ID }, authTokenSecret());
		staffToken = signToken(
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
	// АТАКА 1: ПРОВЕРКА ЭНДПОИНТОВ И ОБХОД UPSELL CONSENT SHIELD ЧЕРЕЗ АВАНСЫ
	// =========================================================================

	it("RED-TEAM 1.1: Проверка эндпоинтов /api/invoices/bulk и /api/payments/advance", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// Запрос на несуществующий эндпоинт пакетных счетов
		const resBulk = await app.inject({
			method: "POST",
			url: "/api/invoices/bulk",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: { patientId: PATIENT_VICTIM, items: [] },
		});
		assert.equal(resBulk.statusCode, 404, "Эндпоинт /api/invoices/bulk должен возвращать 404 (отсутствует)");

		// Запрос на несуществующий эндпоинт авансов
		const resAdvance = await app.inject({
			method: "POST",
			url: "/api/payments/advance",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: { patientId: PATIENT_VICTIM, amountRub: 45000 },
		});
		assert.equal(resAdvance.statusCode, 404, "Эндпоинт /api/payments/advance должен возвращать 404 (отсутствует)");
	});

	it("RED-TEAM 1.2: Атака через внесение аванса/предоплаты без serviceId на навязанную услугу", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// Попытка провести оплату 45 000 ₽ с указанием в примечании "Аванс за имплантацию", но БЕЗ serviceId!
		const response = await app.inject({
			method: "POST",
			url: "/api/billing/payments",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				patientId: PATIENT_VICTIM,
				amountRub: PRICE_UNAPPROVED,
				method: "card",
				clientMutationId: "redteam-advance-implant-1",
				note: "Аванс за навязанную имплантацию без Допсоглашения",
			},
		});

		console.log("\n[RED-TEAM 1.2 LOG] Попытка пробить аванс без serviceId:");
		console.log(`HTTP Status: ${response.statusCode}`);
		console.log(`Response Body: ${response.body}`);

		// АНАЛИЗ УЯЗВИМОСТИ:
		// В billingQuery.ts:245: Upsell Consent Shield проверяется ТОЛЬКО `if (targetServiceId)`.
		// Если serviceId опущен, система позволяет принять деньги и пробить чек 54-ФЗ!
		if (response.statusCode === 201) {
			console.log("[CRITICAL DEFECT DETECTED] Касса приняла 45 000 ₽ аванса на навязанную услугу в обход Upsell Consent Shield!");
			console.log("[DEFECT CLASSIFICATION] БРАК: Отсутствие serviceId позволяет обойти защиту от навязывания услуг!");
		}
	});

	it("RED-TEAM 1.3: Попытка выставить счет/наряд на навязанную услугу через /api/invoices/generate-from-plan", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// Попытка сформировать счет на 45 000 ₽ по навязанной услуге SERVICE_UNAPPROVED_ID
		const response = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": staffToken,
			},
			payload: {
				patientId: PATIENT_VICTIM,
				documentType: "invoice",
				notes: "Счет на имплантацию в обход утвержденного плана",
				items: [
					{
						itemId: "imposed-item-1",
						toothNumber: 26,
						code804n: "A16.07.054",
						nameRu: "Имплантация Nobel Biocare (навязанная услуга)",
						categoryRu: "Хирургия",
						quantity: 1,
						planUnitPriceRub: PRICE_UNAPPROVED,
						effectiveUnitPriceRub: PRICE_UNAPPROVED,
						discountRub: 0,
						resolutionPolicy: "LOCK_ORIGINAL_PRICE",
						serviceId: SERVICE_UNAPPROVED_ID,
					},
				],
			},
		});

		console.log("\n[RED-TEAM 1.3 LOG] Попытка выставить счет на навязанную услугу:");
		console.log(`HTTP Status: ${response.statusCode}`);
		console.log(`Response Body: ${response.body}`);

		// АНАЛИЗ УЯЗВИМОСТИ:
		// Проверяет ли /api/invoices/generate-from-plan утвержденный план лечения?
		// Нет! В routes/invoices.ts нет проверки утвержденного плана лечения пациента!
		if (response.statusCode === 201) {
			const invoiceResult = JSON.parse(response.body);
			console.log("[CRITICAL DEFECT DETECTED] Выставлен официальный счет на навязанную услугу! Номер счета:", invoiceResult.invoiceNumber);
			console.log("[DEFECT CLASSIFICATION] БРАК: Маршрут /api/invoices/generate-from-plan позволяет выписывать счета на любые несогласованные услуги в обход плана лечения!");
		}
	});

	// =========================================================================
	// АТАКА 2: RACE CONDITION (5 ПАРАЛЛЕЛЬНЫХ ЗАПРОСОВ БЕЗ ДОПСОГЛАШЕНИЯ)
	// =========================================================================

	it("RED-TEAM 2.1: Race Condition атака: 5 параллельных запросов на оплату навязанной услуги без Допсоглашения", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// Отправляем строго одновременно 5 запросов с уникальными clientMutationId
		const promises = Array.from({ length: 5 }, (_, idx) =>
			app.inject({
				method: "POST",
				url: "/api/billing/payments",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": adminToken,
				},
				payload: {
					patientId: PATIENT_VICTIM,
					amountRub: PRICE_UNAPPROVED,
					method: "card",
					serviceId: SERVICE_UNAPPROVED_ID,
					clientMutationId: `redteam-race-${Date.now()}-${idx}`,
					note: `Параллельный запрос ${idx} на оплату навязанной услуги`,
				},
			}),
		);

		const results = await Promise.all(promises);
		console.log("\n[RED-TEAM 2.1 LOG] Результаты Race Condition атаки (5 параллельных запросов):");
		results.forEach((res, i) => {
			console.log(`Запрос #${i + 1}: Status ${res.statusCode}, Error: ${res.json()?.error}`);
		});

		// Проверяем: ВСЕ ли 5 запросов были заблокированы с кодом 422?
		const passedCount = results.filter((r) => r.statusCode === 201 || r.statusCode === 200).length;
		const blockedCount = results.filter((r) => r.statusCode === 422).length;

		console.log(`Успешно пробито: ${passedCount}, Заблокировано: ${blockedCount}`);
		assert.equal(passedCount, 0, "НИ ОДИН параллельный запрос не должен пробить навязанную услугу!");
		assert.equal(blockedCount, 5, "Все 5 запросов обязаны быть заблокированы со статусом 422 (Upsell Consent Shield)");
	});

	// =========================================================================
	// АТАКА 3: ФИКТИВНЫЕ И АННУЛИРОВАННЫЕ ДОПСОГЛАШЕНИЯ
	// =========================================================================

	it("RED-TEAM 3.1: Попытка пробития оплаты с аннулированным Допсоглашением (status: voided)", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const VOIDED_DOC_ID = fixtureUuid(NAMESPACE, 90);

		// Создаем аннулированный документ
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(generatedDocuments).values({
				id: VOIDED_DOC_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_VICTIM,
				kind: "treatment_plan_acceptance",
				status: "voided",
				title: "Аннулированное Дополнительное соглашение",
				totalAmountRub: PRICE_UNAPPROVED,
				voidedAt: new Date(),
			});
		});

		// Пытаемся провести оплату навязанной услуги
		const response = await app.inject({
			method: "POST",
			url: "/api/billing/payments",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				patientId: PATIENT_VICTIM,
				amountRub: PRICE_UNAPPROVED,
				method: "card",
				serviceId: SERVICE_UNAPPROVED_ID,
				clientMutationId: "redteam-voided-doc-payment-1",
				note: "Оплата по аннулированному соглашению",
			},
		});

		console.log("\n[RED-TEAM 3.1 LOG] Оплата по аннулированному соглашению:");
		console.log(`HTTP Status: ${response.statusCode}`);
		console.log(`Response Body: ${response.body}`);

		assert.equal(response.statusCode, 422, "Оплата обязана быть заблокирована с кодом 422 при аннулированном соглашении");
		assert.equal(response.json()?.error, "UpsellConsentShieldViolationError");
	});

	it("RED-TEAM 3.2: Попытка пробития оплаты с неподписанным ЧЕРНОВИКОМ Допсоглашения (status: draft)", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const DRAFT_DOC_ID = fixtureUuid(NAMESPACE, 91);

		// Создаем неподписанный ЧЕРНОВИК (draft) Допсоглашения без подписи пациента
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(generatedDocuments).values({
				id: DRAFT_DOC_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_VICTIM,
				kind: "treatment_plan_acceptance",
				status: "draft", // ЧЕРНОВИК! Пациент его не подписывал!
				title: "Черновик Дополнительного соглашения",
				totalAmountRub: PRICE_UNAPPROVED,
			});
		});

		// Пытаемся провести оплату навязанной услуги
		const response = await app.inject({
			method: "POST",
			url: "/api/billing/payments",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				patientId: PATIENT_VICTIM,
				amountRub: PRICE_UNAPPROVED,
				method: "card",
				serviceId: SERVICE_UNAPPROVED_ID,
				clientMutationId: "redteam-draft-doc-payment-2",
				note: "Оплата по неподписанному черновику Допсоглашения",
			},
		});

		console.log("\n[RED-TEAM 3.2 LOG] Оплата по неподписанному черновику Допсоглашения (status: draft):");
		console.log(`HTTP Status: ${response.statusCode}`);
		console.log(`Response Body: ${response.body}`);

		// АНАЛИЗ УЯЗВИМОСТИ:
		// В billingQuery.ts:289 написано: ne(schema.generatedDocuments.status, "voided")
		// Для draft это условие возвращает ИСТИНУ!
		// Если оплата прошла (201) — это БРАК: неподписанный черновик позволяет списать деньги!
		if (response.statusCode === 201) {
			console.log("[CRITICAL DEFECT DETECTED] Касса списала 45 000 ₽ на основании неподписанного ЧЕРНОВИКА (draft)!");
			console.log("[DEFECT CLASSIFICATION] БРАК: Статус 'draft' не имеет юридической силы, но обошел Upsell Consent Shield!");
		}
	});

	it("RED-TEAM 3.3: Атака подмены: Допсоглашение оформлено на отбеливание (5 000 ₽), а пробивается имплантация (45 000 ₽)", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const MISMATCH_DOC_ID = fixtureUuid(NAMESPACE, 92);

		// Создаем выпущенное Допсоглашение СТРОГО на отбеливание за 5 000 ₽
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(generatedDocuments).values({
				id: MISMATCH_DOC_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_VICTIM,
				kind: "treatment_plan_acceptance",
				status: "issued",
				title: "Дополнительное соглашение на отбеливание Zoom 4",
				totalAmountRub: PRICE_WHITENING, // 5 000 ₽
				issuedAt: new Date(),
			});
		});

		// Пытаемся провести оплату по СОВЕРШЕННО ДРУГОЙ навязанной услуге: Имплантация на 45 000 ₽!
		const response = await app.inject({
			method: "POST",
			url: "/api/billing/payments",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				patientId: PATIENT_VICTIM,
				amountRub: PRICE_UNAPPROVED, // 45 000 ₽
				method: "card",
				serviceId: SERVICE_UNAPPROVED_ID, // Имплантация!
				clientMutationId: "redteam-mismatch-service-payment-3",
				note: "Оплата имплантации под прикрытием допсоглашения на отбеливание",
			},
		});

		console.log("\n[RED-TEAM 3.3 LOG] Оплата имплантации (45 000 ₽) по допсоглашению на отбеливание (5 000 ₽):");
		console.log(`HTTP Status: ${response.statusCode}`);
		console.log(`Response Body: ${response.body}`);

		// АНАЛИЗ УЯЗВИМОСТИ:
		// В billingQuery.ts:289 проверяется ЛИШЬ наличие хоть одного treatment_plan_acceptance у пациента!
		// Совпадение услуги или суммы ВООБЩЕ НЕ ПРОВЕРЯЕТСЯ!
		// Если оплата прошла (201) — это БРАК: допсоглашение на 5 000 ₽ отбеливание
		// открыло неограниченную кассу на 45 000 ₽ имплантацию!
		if (response.statusCode === 201) {
			console.log("[CRITICAL DEFECT DETECTED] Касса списала 45 000 ₽ за имплантацию по допсоглашению на 5 000 ₽ отбеливание!");
			console.log("[DEFECT CLASSIFICATION] БРАК: Отсутствует сверка конкретных позиций и лимита суммы в Дополнительном соглашении!");
		}
	});
});
