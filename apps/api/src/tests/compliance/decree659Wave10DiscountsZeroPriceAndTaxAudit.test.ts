/**
 * apps/api/src/tests/compliance/decree659Wave10DiscountsZeroPriceAndTaxAudit.test.ts
 *
 * PROSECUTOR 3: WAVE 10 COMPLIANCE AUDIT
 * DISCOUNT INTEGRITY, EXPENSIVE OPERATION ZERO-PRICE DEFENSE & ANONYMOUS TAX DEDUCTION SHIELD
 * (ПОСТАНОВЛЕНИЕ №659, СТ. 219 НК РФ, 54-ФЗ, СТ. 709 ГК РФ, СТ. 16 ЗОЗПП)
 *
 * Vectors:
 * 1. AUDIT 10.1: Защита от манипуляций со скидками в наряде/счете (ст. 16 ЗоЗПП, 54-ФЗ, ПП РФ №659):
 *    - 10.1A: Отрицательная скидка (-500 ₽) отклоняется схемой Zod (400 InvalidGenerateInvoicePayload).
 *    - 10.1B: Скидка > 100% (35 000 ₽ при стоимости услуги 25 000 ₽) блокируется сервером (422 InvalidDiscountError).
 *    - 10.1C: Корректная скидка (5 000 ₽ от 25 000 ₽) регистрируется штатно (201 Created) с totalNetRub = 20 000 ₽.
 * 2. AUDIT 10.2: Защита от обнуления цен за дорогостоящие услуги (имплантация A16.07.054) в обход прайса:
 *    - 10.2A: Попытка выписать наряд с ценой 0.00 ₽ без PIN-кода руководства блокируется кодом 400 (BlockedArchivedServiceError, zeroPriceItemsCount = 1).
 *    - 10.2B: Гарантийное обнуление цены (0.00 ₽) с валидным PIN-кодом управляющего авторизуется (201 Created).
 * 3. AUDIT 10.3: Защита справки для налогового вычета (КНД 1151156 / 3-НДФЛ) от анонимных пациентов (UUID_ANON):
 *    - 10.3A: POST /api/documents (kind: tax_deduction_certificate, requestedForm: knd_1151156) для анонима блокируется 422 Decree659TaxDeductionForbiddenError.
 *    - 10.3B: GET /api/v1/documents/tax-deduction/preview/:patientId для анонима блокируется 422 Decree659TaxDeductionForbiddenError.
 *    - 10.3C: Для идентифицированного пациента со СНИЛС и ИНН расчет справки КНД 1151156 возвращает HTTP 200 OK.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
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
import { hashCredential, signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "decree659Wave10Audit";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 2);
const ADMIN_ID = fixtureUuid(NAMESPACE, 3);

const PATIENT_IDENTIFIED_ID = fixtureUuid(NAMESPACE, 10);
const PATIENT_ANON_ID = fixtureUuid(NAMESPACE, 11);

const SERVICE_IMPLANT_ID = fixtureUuid(NAMESPACE, 20);
const SERVICE_CROWN_ID = fixtureUuid(NAMESPACE, 21);

const PLAN_REGULAR_ID = fixtureUuid(NAMESPACE, 30);
const PLAN_EXPENSIVE_ID = fixtureUuid(NAMESPACE, 31);

const ADMIN_PIN = "7788";

describe("Prosecutor 3: Wave 10 Discount Integrity, Zero-Price & Anonymous Tax Deduction Audit (Decree 659 & 54-FZ)", { concurrency: 1 }, () => {
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
				name: "Клиника Цифровой Стоматологии Волна 10",
				inn: "7701987654",
				kpp: "770101001",
				ogrn: "1157746123456",
				legalAddress: "г. Москва, ул. Прокурорская, д. 10",
				phone: "+74959990010",
			});

			const pinHash = await hashCredential(ADMIN_PIN);

			await db.insert(users).values([
				{
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					role: "doctor",
					fullName: "Д-р Хирург-Ортопед В.В.",
					email: "surgeon10@dente-clinic.ru",
					isActive: true,
				},
				{
					id: ADMIN_ID,
					organizationId: ORG_ID,
					role: "admin",
					fullName: "Управляющий Клиники Волна-10",
					email: "director10@dente-clinic.ru",
					pinCodeHash: pinHash,
					isActive: true,
				},
			]);

			// Пациент 1: Полностью идентифицированный гражданин РФ (СНИЛС, паспорт, ИНН)
			await db.insert(patients).values({
				id: PATIENT_IDENTIFIED_ID,
				organizationId: ORG_ID,
				fullName: "Смирнов Алексей Константинович",
				birthDate: "1988-04-12",
				gender: "male",
				phone: "+79031112233",
				email: "smirnov.ak@mail.ru",
				snils: "123-456-789 01",
				inn: "770123456789",
				isAnonymous: false,
				balanceRub: 0,
			});

			// Пациент 2: Анонимный пациент (UUID_ANON) по ст. 84 323-ФЗ и ПП РФ №659
			await db.insert(patients).values({
				id: PATIENT_ANON_ID,
				organizationId: ORG_ID,
				fullName: `UUID_ANON_${PATIENT_ANON_ID.slice(0, 8)}`,
				birthDate: "1990-01-01",
				gender: "male",
				phone: "+79990000000",
				isAnonymous: true,
				balanceRub: 0,
				administrativeProfile: { isAnonymous: true },
			});

			// Каталог услуг: Дорогостоящая имплантация (код 804н A16.07.054) и коронка (A16.07.004)
			await db.insert(serviceCatalogItems).values([
				{
					id: SERVICE_IMPLANT_ID,
					organizationId: ORG_ID,
					code: "A16.07.054",
					title: "Внутрикостная дентальная имплантация системы Straumann",
					category: "surgery",
					basePriceRub: 55000,
					priceRub: 55000,
					active: true,
					decree458Expensive: true,
				},
				{
					id: SERVICE_CROWN_ID,
					organizationId: ORG_ID,
					code: "A16.07.004",
					title: "Протезирование зуба коронкой из диоксида циркония Prettau",
					category: "prosthetics",
					basePriceRub: 25000,
					priceRub: 25000,
					active: true,
					decree458Expensive: false,
				},
			]);

			// План лечения 1: Коронка 25 000 ₽ (Regular)
			await db.insert(treatmentPlans).values({
				id: PLAN_REGULAR_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_IDENTIFIED_ID,
				authorDoctorId: DOCTOR_ID,
				name: "План ортопедии: Коронка цирконий",
				title: "План ортопедии: Коронка цирконий",
				status: "Approved",
				version: 1,
				planDiscountPercent: "0",
				discountMode: "plan_fixed",
			});

			await db.insert(treatmentPlanItemsNew).values({
				id: fixtureUuid(NAMESPACE, 40),
				organizationId: ORG_ID,
				planId: PLAN_REGULAR_ID,
				priceId: SERVICE_CROWN_ID,
				toothNumber: 16,
				price: "25000.00",
				quantity: 1,
				discount: "0.00",
			});

			// План лечения 2: Имплантация 55 000 ₽ (Expensive)
			await db.insert(treatmentPlans).values({
				id: PLAN_EXPENSIVE_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_IDENTIFIED_ID,
				authorDoctorId: DOCTOR_ID,
				name: "План хирургии: Имплантация Straumann",
				title: "План хирургии: Имплантация Straumann",
				status: "Approved",
				version: 1,
				planDiscountPercent: "0",
				discountMode: "plan_fixed",
			});

			await db.insert(treatmentPlanItemsNew).values({
				id: fixtureUuid(NAMESPACE, 41),
				organizationId: ORG_ID,
				planId: PLAN_EXPENSIVE_ID,
				priceId: SERVICE_IMPLANT_ID,
				toothNumber: 46,
				price: "55000.00",
				quantity: 1,
				discount: "0.00",
			});

			// Создаем оплату для идентифицированного пациента, чтобы была сумма для справки 1151156
			await db.insert(payments).values({
				id: fixtureUuid(NAMESPACE, 50),
				organizationId: ORG_ID,
				patientId: PATIENT_IDENTIFIED_ID,
				amountRub: "25000.00",
				method: "card",
				status: "paid",
				paidAt: new Date("2026-03-15T10:00:00Z"),
				taxDeductionCode: "01",
				clientMutationId: fixtureUuid(NAMESPACE, 51),
			});
		});

		app = createTenantTestApp();
		await registerPatientRoutes(app);
		await registerInvoiceRoutes(app);
		await registerBillingRoutes(app);
		await registerDocumentRoutes(app);
		await app.ready();

		const secret = authTokenSecret();
		clinicToken = signToken({ organizationId: ORG_ID }, secret);
		doctorToken = signToken({ organizationId: ORG_ID, userId: DOCTOR_ID, role: "doctor" }, secret);
		adminToken = signToken({ organizationId: ORG_ID, userId: ADMIN_ID, role: "admin" }, secret);
	});

	after(async () => {
		if (app) await app.close();
		if (databaseReady) {
			await purgeFixtureOrganizations([ORG_ID]);
		}
	});

	// ═════════════════════════════════════════════════════════════════════════
	// AUDIT 10.1: ЗАЩИТА ОТ МАНИПУЛЯЦИЙ СО СКИДКАМИ В НАРЯДЕ / СЧЕТЕ
	// ═════════════════════════════════════════════════════════════════════════
	it("AUDIT 10.1: Попытка выставить отрицательную скидку или скидку > 100% блокируется сервером", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// 10.1A: Отрицательная скидка (discountRub = -500) -> 400 InvalidGenerateInvoicePayload
		const resNegative = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
			payload: {
				patientId: PATIENT_IDENTIFIED_ID,
				planId: PLAN_REGULAR_ID,
				documentType: "work_order",
				items: [
					{
						serviceId: SERVICE_CROWN_ID,
						nameRu: "Протезирование зуба коронкой из диоксида циркония Prettau",
						code804n: "A16.07.004",
						quantity: 1,
						planUnitPriceRub: 25000,
						discountRub: -500, // Вектор атаки: отрицательная скидка
					},
				],
			},
		});

		console.log(`[AUDIT 10.1A LOG] Отрицательная скидка: HTTP ${resNegative.statusCode}`);
		assert.equal(
			resNegative.statusCode,
			400,
			"Отрицательная скидка обязана блокироваться на валидаторе схемы со статусом 400",
		);
		const errNegative = resNegative.json();
		assert.equal(errNegative.error, "InvalidGenerateInvoicePayload");
		console.log("[AUDIT 10.1A PROOF] Отрицательная скидка успешно заблокирована!");

		// 10.1B: Скидка > 100% (discountRub = 35 000 ₽ при стоимости услуги 25 000 ₽) -> 422 InvalidDiscountError
		const resExcessive = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
			payload: {
				patientId: PATIENT_IDENTIFIED_ID,
				planId: PLAN_REGULAR_ID,
				documentType: "work_order",
				items: [
					{
						serviceId: SERVICE_CROWN_ID,
						nameRu: "Протезирование зуба коронкой из диоксида циркония Prettau",
						code804n: "A16.07.004",
						quantity: 1,
						planUnitPriceRub: 25000,
						discountRub: 35000, // Вектор атаки: скидка 140% (> 100%)
					},
				],
			},
		});

		console.log(`[AUDIT 10.1B LOG] Скидка > 100%: HTTP ${resExcessive.statusCode}, body: ${resExcessive.body}`);
		assert.equal(
			resExcessive.statusCode,
			422,
			"Скидка, превышающая 100% стоимости услуги, обязана блокироваться со статусом 422",
		);
		const errExcessive = resExcessive.json();
		assert.equal(errExcessive.error, "InvalidDiscountError");
		assert.equal(errExcessive.code, "Decree659DiscountLimitExceededError");
		console.log("[AUDIT 10.1B PROOF] Скидка > 100% успешно заблокирована по 54-ФЗ и ПП РФ №659!");

		// 10.1C: Корректная скидка (5 000 ₽ от 25 000 ₽, 20%) -> 201 Created, net = 20 000 ₽
		const resValid = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
			payload: {
				patientId: PATIENT_IDENTIFIED_ID,
				planId: PLAN_REGULAR_ID,
				documentType: "work_order",
				items: [
					{
						serviceId: SERVICE_CROWN_ID,
						nameRu: "Протезирование зуба коронкой из диоксида циркония Prettau",
						code804n: "A16.07.004",
						quantity: 1,
						planUnitPriceRub: 25000,
						discountRub: 5000, // Легитимная скидка 20%
					},
				],
			},
		});

		console.log(`[AUDIT 10.1C LOG] Легитимная скидка: HTTP ${resValid.statusCode}`);
		assert.equal(resValid.statusCode, 201);
		const invoiceValid = resValid.json();
		assert.equal(invoiceValid.totalGrossRub, 25000);
		assert.equal(invoiceValid.totalDiscountRub, 5000);
		assert.equal(invoiceValid.totalNetRub, 20000);
		console.log("[AUDIT 10.1C PROOF] Легитимная скидка рассчитана до копейки: 25 000 - 5 000 = 20 000 ₽!");
	});

	// ═════════════════════════════════════════════════════════════════════════
	// AUDIT 10.2: НУЛЕВАЯ ЦЕНА ЗА ДОРОГОСТОЯЩИЕ ОПЕРАЦИИ БЕЗ PIN РУКОВОДСТВА
	// ═════════════════════════════════════════════════════════════════════════
	it("AUDIT 10.2: Обнуление цены (0.00 ₽) за имплантацию без PIN блокируется (400), с PIN — авторизуется (201)", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// 10.2A: Попытка выписать наряд на дентальную имплантацию с ценой 0.00 ₽ без PIN-кода
		const resZeroNoPin = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
			payload: {
				patientId: PATIENT_IDENTIFIED_ID,
				planId: PLAN_EXPENSIVE_ID,
				documentType: "work_order",
				items: [
					{
						serviceId: SERVICE_IMPLANT_ID,
						nameRu: "Внутрикостная дентальная имплантация системы Straumann",
						code804n: "A16.07.054",
						quantity: 1,
						planUnitPriceRub: 0, // Вектор атаки: списание дорогостоящей операции за 0.00 ₽
						effectiveUnitPriceRub: 0,
					},
				],
			},
		});

		console.log(`[AUDIT 10.2A LOG] Выписка имплантации за 0.00 ₽ без PIN: HTTP ${resZeroNoPin.statusCode}`);
		assert.equal(
			resZeroNoPin.statusCode,
			400,
			"Выписка нулевой цены без авторизации управляющего по PIN обязана блокироваться 400",
		);
		const errZero = resZeroNoPin.json();
		assert.equal(errZero.error, "BlockedArchivedServiceError");
		assert.equal(errZero.report.canGenerateWorkOrder, false);
		assert.equal(errZero.report.zeroPriceItemsCount, 1);
		console.log("[AUDIT 10.2A PROOF] Обход прайса через нулевую цену успешно отбит со статусом 400!");

		// 10.2B: Легитимная гарантийная коррекция с авторизацией по PIN-коду управляющего
		const resZeroWithPin = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
			payload: {
				patientId: PATIENT_IDENTIFIED_ID,
				planId: PLAN_EXPENSIVE_ID,
				documentType: "work_order",
				adminOverridePin: ADMIN_PIN, // Валидный PIN управляющего
				adminOverrideReason: "Гарантийная переустановка имплантата по решению врачебной комиссии",
				items: [
					{
						serviceId: SERVICE_IMPLANT_ID,
						nameRu: "Внутрикостная дентальная имплантация системы Straumann",
						code804n: "A16.07.054",
						quantity: 1,
						planUnitPriceRub: 0,
						effectiveUnitPriceRub: 0,
					},
				],
			},
		});

		console.log(`[AUDIT 10.2B LOG] Гарантийная выписка 0.00 ₽ с PIN: HTTP ${resZeroWithPin.statusCode}`);
		assert.equal(
			resZeroWithPin.statusCode,
			201,
			"Гарантийная выписка с PIN управляющего обязана успешно регистрироваться",
		);
		const invoiceWithPin = resZeroWithPin.json();
		assert.equal(invoiceWithPin.totalNetRub, 0);
		assert.equal(invoiceWithPin.validationReport.canGenerateWorkOrder, true);
		assert.equal(invoiceWithPin.validationReport.adminOverrideInfo.isAuthorized, true);
		assert.equal(invoiceWithPin.validationReport.adminOverrideInfo.staffName, "Управляющий Клиники Волна-10");
		console.log("[AUDIT 10.2B PROOF] Гарантийная выписка 0.00 ₽ авторизована с полным аудиторским следом!");
	});

	// ═════════════════════════════════════════════════════════════════════════
	// AUDIT 10.3: ЗАЩИТА СПРАВКИ ДЛЯ НАЛОГОВОГО ВЫЧЕТА (КНД 1151156) ДЛЯ АНОНИМА
	// ═════════════════════════════════════════════════════════════════════════
	it("AUDIT 10.3: Формирование справки налогового вычета (1151156) для анонима блокируется 422", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// 10.3A: POST /api/documents (kind: tax_deduction_certificate, requestedForm: knd_1151156) для анонима
		const resDocAnon = await app.inject({
			method: "POST",
			url: "/api/documents",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
			payload: {
				patientId: PATIENT_ANON_ID,
				kind: "tax_deduction_certificate",
				title: "Справка об оплате медицинских услуг для налогового вычета (КНД 1151156)",
				taxYear: 2026,
				requestedForm: "knd_1151156",
				taxPayerInn: "770123456789",
			},
		});

		console.log(`[AUDIT 10.3A LOG] POST /api/documents для анонима: HTTP ${resDocAnon.statusCode}, body: ${resDocAnon.body}`);
		assert.equal(
			resDocAnon.statusCode,
			422,
			"Создание налоговой справки для анонимного пациента обязано блокироваться со статусом 422",
		);
		const errDocAnon = resDocAnon.json();
		assert.equal(errDocAnon.error, "Decree659TaxDeductionForbiddenError");
		console.log("[AUDIT 10.3A PROOF] Документ КНД 1151156 для анонимного пациента заблокирован 422!");

		// 10.3B: GET /api/v1/documents/tax-deduction/preview/:patientId для анонима
		const resPreviewAnon = await app.inject({
			method: "GET",
			url: `/api/v1/documents/tax-deduction/preview/${PATIENT_ANON_ID}?year=2026`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
		});

		console.log(`[AUDIT 10.3B LOG] Preview справки для анонима: HTTP ${resPreviewAnon.statusCode}, body: ${resPreviewAnon.body}`);
		assert.equal(
			resPreviewAnon.statusCode,
			422,
			"Расчет предпросмотра налогового вычета для анонима обязан блокироваться со статусом 422",
		);
		const errPreviewAnon = resPreviewAnon.json();
		assert.equal(errPreviewAnon.error, "Decree659TaxDeductionForbiddenError");
		console.log("[AUDIT 10.3B PROOF] Предпросмотр налогового вычета для анонима заблокирован 422!");

		// 10.3C: GET /api/v1/documents/tax-deduction/preview/:patientId для идентифицированного пациента -> 200 OK
		const resPreviewIdentified = await app.inject({
			method: "GET",
			url: `/api/v1/documents/tax-deduction/preview/${PATIENT_IDENTIFIED_ID}?year=2026`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
		});

		console.log(`[AUDIT 10.3C LOG] Preview для идентифицированного пациента: HTTP ${resPreviewIdentified.statusCode}`);
		assert.equal(resPreviewIdentified.statusCode, 200);
		const previewIdentified = resPreviewIdentified.json();
		assert.equal(previewIdentified.patientId, PATIENT_IDENTIFIED_ID);
		assert.equal(previewIdentified.totalEligibleRub, 25000);
		assert.equal(previewIdentified.code1TotalRub, 25000);
		console.log("[AUDIT 10.3C PROOF] Предпросмотр справки КНД 1151156 для гражданина РФ успешно рассчитан: 25 000 ₽!");
	});
});
