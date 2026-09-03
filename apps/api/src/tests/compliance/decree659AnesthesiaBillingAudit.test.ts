/**
 * apps/api/src/tests/compliance/decree659AnesthesiaBillingAudit.test.ts
 *
 * PROSECUTOR 3: DECREE 659 & ANESTHESIA BILLING STATUTORY INTERSECTION AUDIT
 * (ПОСТАНОВЛЕНИЕ ПРАВИТЕЛЬСТВА РФ №659, СТ. 16 ФЗ-326, 54-ФЗ, СТ. 219 НК РФ, СТ. 84 323-ФЗ)
 *
 * Statutory Vectors Tested:
 * 1. Anesthesia Clinical Protocol for Anonymous Patient:
 *    - Врач регистрирует протокол введения анестетика (POST /api/anesthesia/patients/:id/logs)
 *      для анонимного пациента с контролем дозировки и витальных функций (ст. 84 323-ФЗ).
 * 2. Absolute OMS Barrier for Anesthesia Invoices:
 *    - Попытка сформировать счет/наряд на анестезию по программе ОМС для анонимной карты
 *      блокируется со статусом 422 Decree659OmsForbiddenError.
 * 3. Absolute OMS Barrier in Cash Register 54-FZ for Anesthesia:
 *    - Попытка оплаты анестезии через метод 'insurance' или примечание ОМС блокируется
 *      со статусом 422 Decree659OmsForbiddenError.
 * 4. 3-NDFL Tax Deduction Shield for Anonymous Anesthesia Payments:
 *    - Попытка привязать код вычета 01/02 к анонимному платежу блокируется 422 Decree659TaxDeductionForbiddenError.
 * 5. Commercial Work Order & 54-FZ Fiscal Receipt Compliance:
 *    - Услуга анестезии оформляется через платный наряд (201 Created) и оплачивается наличными/картой
 *      с формированием фискального чека ФФД 1.2 без персональных тегов покупателя (Теги 1227/1228).
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { patientAdministrativeProfileSchema } from "@dental/shared";
import { db } from "../../db/client.js";
import {
	anesthesiaLogs,
	fiscalReceiptQueue,
	organizations,
	patients,
	payments,
	serviceCatalogItems,
	treatmentPlanItemsNew,
	treatmentPlans,
	users,
} from "../../db/schema.js";
import { registerAnesthesiaRoutes } from "../../routes/anesthesia.js";
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

const NAMESPACE = "decree659AnesthesiaAudit";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 2);
const ADMIN_ID = fixtureUuid(NAMESPACE, 3);

// Пациент: Анонимная карта (UUID_ANON / isAnonymous: true)
const ANON_PATIENT_ID = fixtureUuid(NAMESPACE, 10);

// Услуги каталога
const SERVICE_ANESTHESIA_ID = fixtureUuid(NAMESPACE, 20); // 1 500 ₽ - Инфильтрационная анестезия
const SERVICE_CROWN_ID = fixtureUuid(NAMESPACE, 21); // 25 000 ₽ - Коронка
const PLAN_ID = fixtureUuid(NAMESPACE, 30);

describe("Prosecutor 3: Decree 659 & Anesthesia Statutory Billing Audit", { concurrency: 1 }, () => {
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
			if (isDatabaseUnavailable(error)) {
				databaseReady = false;
				return;
			}
			throw error;
		}

		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(organizations).values({
				id: ORG_ID,
				name: "Клиника Аудита Анестезии и Постановления №659",
			});

			await db.insert(users).values([
				{
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					fullName: "Врач-Стоматолог Анестезиолог",
					role: "doctor",
				},
				{
					id: ADMIN_ID,
					organizationId: ORG_ID,
					fullName: "Администратор-Кассир Клиники",
					role: "admin",
				},
			]);

			// 1. Анонимный пациент (UUID_ANON)
			await db.insert(patients).values({
				id: ANON_PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "UUID_ANON-5544 Пациент Со Слов",
				birthDate: "1992-04-12",
				phone: "+79998885544",
				status: "active",
				administrativeProfile: patientAdministrativeProfileSchema.parse({
					isAnonymous: true,
					// Паспорт, ИНН, СНИЛС и полис ОМС отсутствуют по ст. 84 323-ФЗ
				}),
			});

			// 2. Услуга анестезии в каталоге
			await db.insert(serviceCatalogItems).values([
				{
					id: SERVICE_ANESTHESIA_ID,
					organizationId: ORG_ID,
					code: "B01.003.004.005",
					title: "Инфильтрационная анестезия (Ультракаин Д-С 4%)",
					basePriceRub: 1500,
					priceRub: 1500,
					category: "surgery",
				},
				{
					id: SERVICE_CROWN_ID,
					organizationId: ORG_ID,
					code: "A16.07.004.001",
					title: "Коронка керамическая",
					basePriceRub: 25000,
					priceRub: 25000,
					category: "prosthetics",
				},
			]);

			// 3. Утвержденный план лечения с анестезией
			await db.insert(treatmentPlans).values({
				id: PLAN_ID,
				organizationId: ORG_ID,
				patientId: ANON_PATIENT_ID,
				name: "План терапевтического лечения зуба 16",
				status: "Approved",
				approvedAt: new Date(),
				totalPrice: "26500.00",
				totalPriceRub: "26500.00",
				discountMode: "none",
				version: 1,
			});

			await db.insert(treatmentPlanItemsNew).values([
				{
					id: fixtureUuid(NAMESPACE, 31),
					organizationId: ORG_ID,
					planId: PLAN_ID,
					priceId: `${SERVICE_ANESTHESIA_ID}::Инфильтрационная анестезия`,
					toothNumber: 16,
					quantity: 1,
					price: "1500.00",
					discount: "0",
					phase: 1,
					itemOrder: 1,
				},
				{
					id: fixtureUuid(NAMESPACE, 32),
					organizationId: ORG_ID,
					planId: PLAN_ID,
					priceId: `${SERVICE_CROWN_ID}::Коронка керамическая`,
					toothNumber: 16,
					quantity: 1,
					price: "25000.00",
					discount: "0",
					phase: 1,
					itemOrder: 2,
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
		await registerAnesthesiaRoutes(app);
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
	// АУДИТ 7.1: КЛИНИЧЕСКИЙ ПРОТОКОЛ АНЕСТЕЗИИ ДЛЯ АНОНИМНОГО ПАЦИЕНТА
	// =========================================================================

	it("AUDIT 7.1: Клинический протокол анестезии (POST /api/anesthesia/patients/:id/logs) для анонима фиксирует расчет токсичности и дозы", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const logRes = await app.inject({
			method: "POST",
			url: `/api/anesthesia/patients/${ANON_PATIENT_ID}/logs`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
			payload: {
				doctorId: DOCTOR_ID,
				technique: "infiltration",
				drug: "articaine",
				drugBrandName: "Ультракаин Д-С",
				concentrationPct: 4.0,
				vasoconstrictor: "1:200000",
				carpuleVolumeMl: 1.7,
				carpulesAdministered: 1.5,
				patientWeightKg: 75,
				patientAgeYears: 34,
				asaClass: "ASA_I",
				toothNumbers: [16],
				notes: "Анонимный прием. Анестезия проведена без осложнений.",
			},
		});

		assert.equal(logRes.statusCode, 201, "Протокол анестезии обязан быть создан (клиническая безопасность)");
		const logBody = JSON.parse(logRes.body);
		assert.equal(logBody.success, true);
		assert.ok(logBody.safety);
		assert.equal(logBody.safety.totalAnestheticMg, 102); // 1.7 * 1.5 * 40 мг/мл = 102 мг

		// Проверяем запись в БД
		const [dbLog] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(anesthesiaLogs)
				.where(
					and(
						eq(anesthesiaLogs.organizationId, ORG_ID),
						eq(anesthesiaLogs.patientId, ANON_PATIENT_ID),
					),
				)
				.limit(1),
		);

		assert.ok(dbLog);
		assert.equal(dbLog.drugBrandName, "Ультракаин Д-С");
		console.log("[ANESTHESIA PROTOCOL PROOF] Протокол анестезии успешно создан с расчетом токсичности!");
	});

	// =========================================================================
	// АУДИТ 7.2: ЗАПРЕТ ОФОРМЛЕНИЯ АНЕСТЕЗИИ ПО ОМС В НАРЯДАХ/СЧЕТАХ
	// =========================================================================

	it("AUDIT 7.2: Попытка выписать наряд/счет на анестезию по программе ОМС для анонима блокируется 422 Decree659OmsForbiddenError", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// Оператор пытается выписать наряд с пометкой ОМС на анестезию
		const invoiceRes = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
			payload: {
				planId: PLAN_ID,
				patientId: ANON_PATIENT_ID,
				documentType: "work_order",
				notes: "Оплата анестезии по программе ОМС",
				items: [
					{
						serviceId: SERVICE_ANESTHESIA_ID,
						nameRu: "Инфильтрационная анестезия (по программе ОМС)",
						categoryRu: "ОМС",
						code804n: "B01.003.004.005",
						quantity: 1,
						unitPriceRub: 1500,
					},
				],
			},
		});

		console.log("\n[AUDIT 7.2 LOG] Попытка выписки наряда на анестезию по ОМС для анонима:");
		console.log(`HTTP Status: ${invoiceRes.statusCode}`);
		console.log(`Response Body: ${invoiceRes.body}`);

		assert.equal(invoiceRes.statusCode, 422, "Выписка наряда по ОМС для анонима обязана блокироваться со статусом 422");
		const errBody = JSON.parse(invoiceRes.body);
		assert.equal(errBody.error, "Decree659OmsForbiddenError");
		console.log("[ANESTHESIA INVOICE OMS SHIELD PROOF] Блокировка наряда на анестезию по ОМС подтверждена на 100%!");
	});

	// =========================================================================
	// АУДИТ 7.3: ЗАПРЕТ ОПЛАТЫ АНЕСТЕЗИИ ПО ОМС В КАССЕ
	// =========================================================================

	it("AUDIT 7.3: Попытка провести оплату анестезии по ОМС через кассу блокируется 422 Decree659OmsForbiddenError", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// Попытка провести оплату анестезии методом 'insurance'
		const paymentRes = await app.inject({
			method: "POST",
			url: "/api/billing/payments",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				patientId: ANON_PATIENT_ID,
				amountRub: 1500,
				method: "insurance",
				clientMutationId: "anon-anesthesia-oms-pay",
				serviceId: SERVICE_ANESTHESIA_ID,
				note: "Оплата анестезии по ОМС",
			},
		});

		console.log("\n[AUDIT 7.3 LOG] Попытка оплаты анестезии по ОМС в кассе:");
		console.log(`HTTP Status: ${paymentRes.statusCode}`);
		console.log(`Response Body: ${paymentRes.body}`);

		assert.equal(paymentRes.statusCode, 422, "Оплата по ОМС в кассе для анонима обязана блокироваться");
		const errPayment = JSON.parse(paymentRes.body);
		assert.equal(errPayment.error, "Decree659OmsForbiddenError");
		console.log("[ANESTHESIA BILLING OMS SHIELD PROOF] Блокировка оплаты анестезии по ОМС в кассе подтверждена!");
	});

	// =========================================================================
	// АУДИТ 7.4: ЗАПРЕТ НАЛОГОВОГО ВЫЧЕТА ПО НДФЛ ДЛЯ АНОНИМНОЙ АНЕСТЕЗИИ
	// =========================================================================

	it("AUDIT 7.4: Попытка заявить код вычета 3-НДФЛ (01/02) при оплате анестезии анонимом блокируется 422 Decree659TaxDeductionForbiddenError", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const taxPayRes = await app.inject({
			method: "POST",
			url: "/api/billing/payments",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				patientId: ANON_PATIENT_ID,
				amountRub: 1500,
				method: "cash",
				clientMutationId: "anon-anesthesia-tax-pay",
				serviceId: SERVICE_ANESTHESIA_ID,
				taxDeductionCode: "1", // Попытка заявить вычет НДФЛ для анонима!
				payerFullName: "Подставной Налогоплательщик",
				payerBirthDate: "1985-05-15",
				payerInn: "770199999999",
				payerIdentityDocument: "Паспорт РФ 4510 123456",
				payerRelationship: "self",
				fiscalReceiptNumber: "ФЧ-ANON-TAX-01",
				fiscalReceiptIssuedAt: new Date().toISOString(),
				fiscalReceipt: {
					fn: "9999078900012345",
					fd: "12345",
					fpd: "3892019482",
					operationType: "income",
					totalAmountRub: 1500,
				},
				note: "Попытка оформления вычета на анонима",
			},
		});

		console.log("\n[AUDIT 7.4 LOG] Попытка заявить налоговый вычет на анонимную оплату:");
		console.log(`HTTP Status: ${taxPayRes.statusCode}`);
		console.log(`Response Body: ${taxPayRes.body}`);

		assert.equal(taxPayRes.statusCode, 422, "Заявление вычета 3-НДФЛ на анонима обязано блокироваться");
		const errTax = JSON.parse(taxPayRes.body);
		assert.equal(errTax.error, "Decree659TaxDeductionForbiddenError");
		console.log("[ANESTHESIA TAX SHIELD PROOF] Блокировка налогового вычета для анонимной анестезии подтверждена!");
	});

	// =========================================================================
	// АУДИТ 7.5: ПЛАТНЫЙ НАРЯД НА АНЕСТЕЗИЮ УСПЕШНО ФОРМИРУЕТСЯ
	// =========================================================================

	it("AUDIT 7.5: Коммерческий наряд на анестезию (documentType: 'work_order') успешно выставляется по утвержденному плану", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const workOrderRes = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
			payload: {
				planId: PLAN_ID,
				patientId: ANON_PATIENT_ID,
				documentType: "work_order",
				notes: "Коммерческий наряд на терапевтическую анестезию",
				items: [
					{
						serviceId: SERVICE_ANESTHESIA_ID,
						nameRu: "Инфильтрационная анестезия (Ультракаин Д-С 4%)",
						code804n: "B01.003.004.005",
						quantity: 1,
						unitPriceRub: 1500,
					},
				],
			},
		});

		assert.equal(workOrderRes.statusCode, 201, "Коммерческий наряд на анестезию обязан быть создан");
		const workOrderData = JSON.parse(workOrderRes.body);
		assert.equal(workOrderData.totalNetRub, 1500);
		assert.equal(workOrderData.totalGrossRub, 1500);
		assert.equal(workOrderData.totalDiscountRub, 0);
		assert.ok(workOrderData.invoiceId);
		assert.ok(workOrderData.invoiceNumber);
		console.log(`[ANESTHESIA WORK ORDER PROOF] Платный наряд на анестезию создан (№: ${workOrderData.invoiceNumber}, Сумма: ${workOrderData.totalNetRub} ₽)!`);
	});

	// =========================================================================
	// АУДИТ 7.6: КАССА 54-ФЗ И ФИСКАЛЬНЫЙ ЧЕК ДЛЯ ПЛАТНОЙ АНЕСТЕЗИИ
	// =========================================================================

	it("AUDIT 7.6: Оплата платной анестезии в кассе 54-ФЗ формирует законный фискальный чек (ФФД 1.2 без персональных тегов покупателя)", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const paymentRes = await app.inject({
			method: "POST",
			url: "/api/billing/payments",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				patientId: ANON_PATIENT_ID,
				amountRub: 1500,
				method: "card",
				clientMutationId: "anon-anesthesia-card-pay-001",
				serviceId: SERVICE_ANESTHESIA_ID,
				fiscalReceiptNumber: "ФЧ-ANON-ANESTH-01",
				fiscalReceipt: {
					operationType: "income",
					totalAmountRub: 1500,
				},
				note: "Розничная безналичная оплата анестезии 54-ФЗ",
			},
		});

		assert.equal(paymentRes.statusCode, 201, "Оплата платной анестезии обязана пройти успешно");
		const paymentData = JSON.parse(paymentRes.body);
		assert.equal(paymentData.amountRub, 1500);
		assert.equal(paymentData.method, "card");
		assert.equal(paymentData.status, "paid");

		// Проверяем фискальную очередь ККТ
		const [receipt] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(fiscalReceiptQueue)
				.where(
					and(
						eq(fiscalReceiptQueue.organizationId, ORG_ID),
						eq(fiscalReceiptQueue.paymentId, paymentData.id),
					),
				)
				.limit(1),
		);

		assert.ok(receipt, "Фискальный чек поставлен в очередь ККТ 54-ФЗ");
		assert.equal(receipt.receiptType, "income", "Тег 1054: Приход");
		assert.equal(receipt.status, "pending_print");

		const payload = receipt.payloadJson as Record<string, unknown>;
		assert.equal(payload["amountRub"], 1500);
		assert.equal(payload["method"], "card");
		// Проверяем: персональные теги покупателя (1227 / 1228) отсутствуют
		assert.equal(payload["payerInn"], undefined);
		assert.equal(payload["payerFullName"], undefined);
		assert.equal(payload["taxDeductionCode"], undefined);

		console.log("[54-FZ ANESTHESIA FISCAL PROOF] Фискальный чек 54-ФЗ на платную анестезию поставлен в очередь печати!");
	});
});
