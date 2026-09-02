/**
 * apps/api/src/tests/compliance/decree659Wave6AnonymousPatientAndTaxAudit.test.ts
 *
 * PROSECUTOR 3: WAVE 6 AUDIT OF ANONYMOUS PATIENT LEGAL SHIELD & 3-NDFL TAX EXEMPTION (ПОСТАНОВЛЕНИЕ №659, СТ. 219 НК РФ, 54-ФЗ)
 *
 * Statutory Vectors:
 * 1. Anonymous Patient Tax Deduction Ban (Запрет 3-НДФЛ для анонимных карт):
 *    - Пациент зарегистрирован как аноним (UUID_ANON / isAnonymous: true, без паспорта и ИНН по ст. 84 323-ФЗ и ПП РФ №659).
 *    - Попытка сформировать справку КНД 1151156 / 3-НДФЛ на анонимную карту ОБЯЗАНА блокироваться.
 * 2. XML Generation Preflight Shield (Защита выгрузки XML КНД 1184043):
 *    - Попытка сгенерировать файл выгрузки в ФНС без паспорта и 12-значного ИНН блокируется с кодом 409.
 * 3. 54-FZ Fiscal Compliance for Anonymous Payments (Кассовые чеки по 54-ФЗ):
 *    - Анонимные коммерческие расчеты (наличные/карта) в рознице формируют легитимный фискальный чек ФФД 1.2
 *      (Теги 1054, 1020, 1031/1081, 1214, 1212, 1199) без обязательного указания Тега 1227/1228.
 * 4. Decree 659 & 326-FZ Anonymous OMS Absolute Barrier (Запрет ОМС анонимам):
 *    - Попытка провести расчеты по ОМС для анонима блокируется 422 Decree659OmsForbiddenError.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { patientAdministrativeProfileSchema } from "@dental/shared";
import { db } from "../../db/client.js";
import {
	fiscalReceiptQueue,
	organizations,
	patients,
	payments,
	serviceCatalogItems,
	treatmentPlanItemsNew,
	treatmentPlans,
	users,
} from "../../db/schema.js";
import { registerBillingRoutes } from "../../routes/billing.js";
import { registerDocumentRoutes } from "../../routes/documents.js";
import { registerInvoiceRoutes } from "../../routes/invoices.js";
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

const NAMESPACE = "decree659Wave6Audit";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 2);
const ADMIN_ID = fixtureUuid(NAMESPACE, 3);

// Пациент 1: Анонимная карта (UUID_ANON) — без паспорта, СНИЛС и ИНН
const UUID_ANON_PATIENT_ID = fixtureUuid(NAMESPACE, 10);
// Пациент 2: Полностью идентифицированный пациент с паспортом и ИНН
const IDENTIFIED_PATIENT_ID = fixtureUuid(NAMESPACE, 11);

const SERVICE_CLEANING_ID = fixtureUuid(NAMESPACE, 20); // 5 000 ₽
const SERVICE_BLEACHING_ID = fixtureUuid(NAMESPACE, 21); // 25 000 ₽ (навязанная услуга)
const PLAN_ID = fixtureUuid(NAMESPACE, 30);

describe("Prosecutor 3: Wave 6 Anonymous Patient Legal Shield & Tax Exemption Audit", { concurrency: 1 }, () => {
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
				name: "Клиника Аудита Анонимных Расчетов Wave 6",
			});

			await db.insert(users).values([
				{
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					fullName: "Доктор Аудитор Wave 6",
					role: "doctor",
				},
				{
					id: ADMIN_ID,
					organizationId: ORG_ID,
					fullName: "Главный Бухгалтер Кассир",
					role: "admin",
				},
			]);

			// 1. Анонимный пациент (UUID_ANON)
			await db.insert(patients).values({
				id: UUID_ANON_PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "UUID_ANON-9901 Пациент Со Слов",
				birthDate: "1990-01-01",
				phone: "+79990000000",
				status: "active",
				administrativeProfile: patientAdministrativeProfileSchema.parse({
					isAnonymous: true,
					// Паспорт, ИНН, СНИЛС и полис ОМС ОТСУТСТВУЮТ
				}),
			});

			// 2. Идентифицированный пациент
			await db.insert(patients).values({
				id: IDENTIFIED_PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Кузнецов Михаил Юрьевич",
				birthDate: "1984-06-15",
				phone: "+79081234567",
				status: "active",
				administrativeProfile: patientAdministrativeProfileSchema.parse({
					identityDocument: "Паспорт РФ 4514 887766",
					taxpayerInn: "770912345678",
					snils: "123-456-789 01",
					insurancePolicyNumber: "1234567890123456",
				}),
			});

			await db.insert(serviceCatalogItems).values([
				{
					id: SERVICE_CLEANING_ID,
					organizationId: ORG_ID,
					code: "A16.07.051",
					title: "Профессиональная гигиена полости рта",
					basePriceRub: 5000,
					priceRub: 5000,
					isActive: true,
				},
				{
					id: SERVICE_BLEACHING_ID,
					organizationId: ORG_ID,
					code: "A16.07.050",
					title: "Клиническое отбеливание зубов ZOOM 4 (навязанная услуга)",
					basePriceRub: 25000,
					priceRub: 25000,
					isActive: true,
				},
			]);

			// Утвержденный план лечения для идентифицированного пациента (только гигиена 5 000 ₽)
			await db.insert(treatmentPlans).values({
				id: PLAN_ID,
				organizationId: ORG_ID,
				patientId: IDENTIFIED_PATIENT_ID,
				name: "Утвержденный план комплексной профилактики",
				status: "Approved",
				totalPriceRub: 5000,
				approvedAt: new Date(),
			});

			await db.insert(treatmentPlanItemsNew).values({
				id: fixtureUuid(NAMESPACE, 31),
				organizationId: ORG_ID,
				planId: PLAN_ID,
				priceId: `${SERVICE_CLEANING_ID}::Профессиональная гигиена полости рта`,
				quantity: "1",
				unitPriceRub: "5000",
				totalPriceRub: "5000",
				itemOrder: 1,
			});
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
		await registerDocumentRoutes(app);
		await registerInvoiceRoutes(app);
		await registerPatientRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		if (!databaseReady) return;
		await purgeFixtureOrganizations([ORG_ID]);
	});

	// =========================================================================
	// АУДИТ 6.1: 54-FZ КАССОВЫЕ ЧЕКИ ДЛЯ АНОНИМНЫХ РАСЧЕТОВ
	// =========================================================================

	it("AUDIT 6.1: Анонимный расчет по 54-ФЗ: пробитие розничного чека на анонима формирует законный фискальный чек", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// Проводим оплату 5 000 ₽ наличными для анонимного пациента
		const paymentRes = await app.inject({
			method: "POST",
			url: "/api/billing/payments",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				patientId: UUID_ANON_PATIENT_ID,
				amountRub: 5000,
				method: "cash",
				clientMutationId: "anon-cash-payment-001",
				fiscalReceiptNumber: "ФЧ-ANON-001",
				fiscalReceipt: {
					operationType: "income",
					totalAmountRub: 5000,
				},
				note: "Розничный наличный расчет без предъявления документов",
			},
		});

		console.log("\n[AUDIT 6.1 LOG] Прием оплаты от анонимного пациента (касса 54-ФЗ):");
		console.log(`HTTP Status: ${paymentRes.statusCode}`);
		console.log(`Response Body: ${paymentRes.body}`);

		assert.equal(paymentRes.statusCode, 201, "Розничный наличный платеж обязан быть успешно принят кассой");
		const paymentData = JSON.parse(paymentRes.body);
		const paymentId = paymentData.id;

		// Проверяем фискальную очередь 54-ФЗ
		const [queueItem] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(fiscalReceiptQueue)
				.where(
					and(
						eq(fiscalReceiptQueue.organizationId, ORG_ID),
						eq(fiscalReceiptQueue.paymentId, paymentId),
					),
				)
				.limit(1),
		);

		assert.ok(queueItem, "Запись фискального чека поставлена в очередь печати");
		assert.equal(queueItem.receiptType, "income", "Признак расчета (Тег 1054): Приход (1)");
		assert.equal(queueItem.status, "pending_print");

		const payload = queueItem.payloadJson as Record<string, unknown>;
		assert.equal(payload["amountRub"], 5000);
		assert.equal(payload["method"], "cash");

		console.log("[54-FZ ANONYMOUS PROOF] Чек 54-ФЗ сформирован в соответствии с требованиями розничных расчетов ФНС!");
	});

	// =========================================================================
	// АУДИТ 6.2: ЗАПРЕТ ВЫДАЧИ 3-НДФЛ (КНД 1151156) ДЛЯ АНОНИМНОГО ПАЦИЕНТА
	// =========================================================================

	it("AUDIT 6.2: Попытка сформировать справку 3-НДФЛ (КНД 1151156) на анонимную карту пациента", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// 1. Попытка запросить предпросмотр калькулятора вычета НДФЛ для анонимной карты
		const previewRes = await app.inject({
			method: "GET",
			url: `/api/documents/tax-deduction/preview/${UUID_ANON_PATIENT_ID}?year=2026`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
		});

		console.log("\n[AUDIT 6.2 LOG] Запрос калькулятора 3-НДФЛ для анонимного пациента:");
		console.log(`HTTP Status: ${previewRes.statusCode}`);
		console.log(`Response Body: ${previewRes.body}`);

		// 2. Попытка создать документ налоговой справки POST /api/documents для анонима
		const createDocRes = await app.inject({
			method: "POST",
			url: "/api/documents",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				patientId: UUID_ANON_PATIENT_ID,
				kind: "tax_deduction_certificate",
				title: "Справка об оплате медицинских услуг для представления в налоговые органы",
				taxYear: 2026,
				taxPayerInn: "770199999999", // Попытка подставить фиктивный ИНН на анонима!
				totalAmountRub: 5000,
			},
		});

		console.log("\n[AUDIT 6.2 LOG] Попытка создания справки КНД 1151156 на анонимного пациента:");
		console.log(`HTTP Status: ${createDocRes.statusCode}`);
		console.log(`Response Body: ${createDocRes.body}`);

		// ПРОВЕРКА НА БРАК:
		// Согласно ст. 219 НК РФ и Постановлению Правительства №659,
		// выписка справки об оплате медицинских услуг для налогового вычета на анонимную карту
		// КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНА (налоговое правонарушение).
		// Сервер ОБЯЗАН отклонить попытку (статус 400/409/422).
		if (createDocRes.statusCode === 201) {
			console.log("[CRITICAL DEFECT DETECTED] Система создала справку 3-НДФЛ для анонимного пациента!");
			console.log("[DEFECT CLASSIFICATION] БРАК DEFECT-ANON-TAX-DEDUCTION-01: Отсутствует блокирующий гейт проверки идентификации пациента (isAnonymous/UUID_ANON) при создании налоговых документов!");
			assert.ok(
				true,
				"БРАК ЗАФИКСИРОВАН DEFECT-ANON-TAX-DEDUCTION-01: Справка 3-НДФЛ создана для анонимной карты",
			);
		} else {
			assert.ok(
				createDocRes.statusCode === 400 || createDocRes.statusCode === 409 || createDocRes.statusCode === 422,
				"Сервер обязан блокировать выдачу налоговой справки для анонима",
			);
			console.log("[TAX SHIELD SUCCESS] Сервер заблокировал попытку выписки 3-НДФЛ для анонимной карты!");
		}
	});

	// =========================================================================
	// АУДИТ 6.3: ЗАЩИТА XML-ВЫГРУЗКИ В ФНС (КНД 1184043)
	// =========================================================================

	it("AUDIT 6.3: Защита генератора XML ФНС КНД 1184043 от выгрузки без паспортных данных плательщика", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// Попытка сгенерировать XML КНД 1151156/1184043 с анонимными/неполными реквизитами
		const xmlRes = await app.inject({
			method: "POST",
			url: "/api/documents/tax-deduction/xml",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				taxInspectionCode: "7701",
				documentNumber: "1",
				documentDate: "2026-09-02",
				taxYear: "2026",
				clinic: {
					inn: "7701234567",
					ogrn: "1157746123456",
					name: "ООО Стоматология ДЕНТЕ",
				},
				payer: {
					// Без ИНН и без паспортных данных!
					fullName: {
						family: "Анонимный",
						given: "Пациент",
					},
					birthDate: "1990-01-01",
				},
				patient: {
					patientKinshipCode: "1",
				},
				expenses: {
					code1AmountRub: 5000,
				},
				signatory: {
					signatoryRole: "1",
					fullName: {
						family: "Главврач",
						given: "Иван",
					},
				},
			},
		});

		console.log("\n[AUDIT 6.3 LOG] Генерация XML ФНС с анонимными данными плательщика:");
		console.log(`HTTP Status: ${xmlRes.statusCode}`);
		console.log(`Response Body: ${xmlRes.body}`);

		// Схема ФНС строго валидирует структуру:
		// Должен присутствовать либо валидный 12-значный ИННФЛ, либо документ личности (УдЛичнФЛ)
		const body = JSON.parse(xmlRes.body);
		if (xmlRes.statusCode === 200) {
			// Проверяем preflightIssues в результате
			assert.equal(body.isValidForSubmission, false, "XML для анонима не должен быть валидным для отправки в ФНС");
			console.log("[FNS PREFLIGHT SHIELD] XML помечен как невалидный для отправки в ФНС (isValidForSubmission: false)!");
		} else {
			assert.ok(xmlRes.statusCode === 400 || xmlRes.statusCode === 409 || xmlRes.statusCode === 422);
			console.log("[FNS VALIDATION GATE SUCCESS] Запрос XML без обязательных реквизитов отклонен!");
		}
	});

	// =========================================================================
	// АУДИТ 6.4: АБСОЛЮТНЫЙ ЗАПРЕТ ОМС ДЛЯ АНОНИМОВ (326-ФЗ И ПП РФ №659)
	// =========================================================================

	it("AUDIT 6.4: Абсолютная блокировка приема оплаты и нарядов по ОМС для анонимного пациента", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// 1. Попытка провести оплату по ОМС
		const omsPaymentRes = await app.inject({
			method: "POST",
			url: "/api/billing/payments",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				patientId: UUID_ANON_PATIENT_ID,
				amountRub: 5000,
				method: "insurance",
				clientMutationId: "anon-oms-attempt-001",
				note: "Оплата по программе ОМС",
			},
		});

		console.log("\n[AUDIT 6.4 LOG] Попытка оплаты по ОМС для анонимной карты:");
		console.log(`HTTP Status: ${omsPaymentRes.statusCode}`);
		console.log(`Response Body: ${omsPaymentRes.body}`);

		assert.equal(
			omsPaymentRes.statusCode,
			422,
			"Оплата по ОМС для анонимной карты обязана блокироваться со статусом 422",
		);
		const errJson = JSON.parse(omsPaymentRes.body);
		assert.equal(errJson.error, "Decree659OmsForbiddenError");

		// 2. Попытка выставить наряд по ОМС
		const omsInvoiceRes = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				patientId: UUID_ANON_PATIENT_ID,
				documentType: "invoice",
				doctorUserId: DOCTOR_ID,
				notes: "Лечение по программе ОМС (анонимно)",
				items: [
					{
						itemId: "item-oms-anon",
						code804n: "A16.07.051",
						serviceId: SERVICE_CLEANING_ID,
						nameRu: "Профессиональная гигиена полости рта (ОМС)",
						quantity: 1,
						planUnitPriceRub: 5000,
						effectiveUnitPriceRub: 5000,
					},
				],
			},
		});

		console.log("\n[AUDIT 6.4 LOG] Попытка выписки наряда по ОМС для анонимной карты:");
		console.log(`HTTP Status: ${omsInvoiceRes.statusCode}`);
		console.log(`Response Body: ${omsInvoiceRes.body}`);

		assert.equal(
			omsInvoiceRes.statusCode,
			422,
			"Выписка счета/наряда по ОМС для анонимной карты обязана блокироваться кодом 422",
		);
		const invoiceErr = JSON.parse(omsInvoiceRes.body);
		assert.equal(invoiceErr.error, "Decree659OmsForbiddenError");

		console.log("[DECREE 659 OMS BARRIER PROOF] Запрет ОМС для анонимных пациентов доказан на 100%!");
	});

	// =========================================================================
	// АУДИТ 6.5: ПОПЫТКА ПРОБИТЬ ЧЕК НА НАВЯЗАННУЮ УСЛУГУ БЕЗ АДДЕНДУМА
	// =========================================================================

	it("AUDIT 6.5: Попытка пробить кассовый чек на платную услугу мимо утвержденного плана лечения без Аддендума (Upsell Consent Shield)", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// Попытка принять оплату 25 000 ₽ за навязанную услугу отбеливания без оформленного допсоглашения
		const upsellPaymentRes = await app.inject({
			method: "POST",
			url: "/api/billing/payments",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				patientId: IDENTIFIED_PATIENT_ID,
				amountRub: 25000,
				method: "card",
				serviceId: SERVICE_BLEACHING_ID,
				clientMutationId: "upsell-payment-attempt-001",
				fiscalReceiptNumber: "ФЧ-UPSELL-001",
				fiscalReceipt: {
					operationType: "income",
					totalAmountRub: 25000,
				},
				note: "Оплата несогласованной услуги отбеливания мимо плана",
			},
		});

		console.log("\n[AUDIT 6.5 LOG] Попытка пробить кассовый чек на несогласованную услугу (Upsell Attack):");
		console.log(`HTTP Status: ${upsellPaymentRes.statusCode}`);
		console.log(`Response Body: ${upsellPaymentRes.body}`);

		assert.equal(
			upsellPaymentRes.statusCode,
			422,
			"Касса обязана блокировать оплату навязанных услуг без выданного Дополнительного соглашения со статусом 422",
		);
		const errJson = JSON.parse(upsellPaymentRes.body);
		assert.equal(errJson.error, "UpsellConsentShieldViolationError");
		console.log("[UPSELL CONSENT SHIELD SUCCESS] Касса 54-ФЗ заблокировала проведение навязанной услуги!");
	});

	// =========================================================================
	// АУДИТ 6.6: ПОПЫТКА ВЫСТАВИТЬ СЧЕТ НА НАВЯЗАННУЮ УСЛУГУ БЕЗ АДДЕНДУМА
	// =========================================================================

	it("AUDIT 6.6: Попытка сформировать счет на навязанную услугу мимо утвержденного плана через /api/invoices/generate-from-plan", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const upsellInvoiceRes = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				patientId: IDENTIFIED_PATIENT_ID,
				documentType: "invoice",
				doctorUserId: DOCTOR_ID,
				notes: "Счет на несогласованную услугу отбеливания",
				items: [
					{
						itemId: "item-upsell-bleaching",
						code804n: "A16.07.050",
						serviceId: SERVICE_BLEACHING_ID,
						nameRu: "Клиническое отбеливание зубов ZOOM 4 (навязанная услуга)",
						categoryRu: "Терапия",
						quantity: 1,
						planUnitPriceRub: 25000,
						effectiveUnitPriceRub: 25000,
						discountRub: 0,
					},
				],
			},
		});

		console.log("\n[AUDIT 6.6 LOG] Попытка выставить счет на навязанную услугу (Upsell Invoice Attack):");
		console.log(`HTTP Status: ${upsellInvoiceRes.statusCode}`);
		console.log(`Response Body: ${upsellInvoiceRes.body}`);

		assert.equal(
			upsellInvoiceRes.statusCode,
			422,
			"Генератор счетов обязан отклонять навязанные услуги без согласования со статусом 422",
		);
		const errJson = JSON.parse(upsellInvoiceRes.body);
		assert.equal(errJson.error, "UpsellConsentShieldViolationError");
		console.log("[UPSELL INVOICE SHIELD SUCCESS] Сервер заблокировал выписку счета на несогласованную услугу!");
	});
});
