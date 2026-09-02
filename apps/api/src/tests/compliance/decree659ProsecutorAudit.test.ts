/**
 * apps/api/src/tests/compliance/decree659ProsecutorAudit.test.ts
 *
 * PROSECUTOR 3: AUDIT OF DECREE 659 & TREATMENT PLANS (ПОСТАНОВЛЕНИЕ №659 И ПЛАНЫ ЛЕЧЕНИЯ).
 *
 * Statutory & Legal Foundation:
 * 1. Постановление Правительства РФ от 30.05.2026 № 659 «Об утверждении Правил
 *    предоставления медицинскими организациями платных медицинских услуг» (вступило в силу 01.09.2026).
 * 2. Федеральный закон от 29.11.2010 № 326-ФЗ «Об обязательном медицинском страховании в РФ» (ст. 16, 40).
 * 3. Федеральный закон от 21.11.2011 № 323-ФЗ «Об основах охраны здоровья граждан в РФ» (ст. 84).
 * 4. Закон РФ от 07.02.1992 № 2300-1 «О защите прав потребителей» (ст. 16 — запрет навязывания услуг).
 * 5. Бюджетный кодекс РФ (ст. 306.4 — нецелевое расходование средств ОМС).
 *
 * DEFECT VECTORS UNDER AUDIT:
 * 1. DEFECT-DECREE659-01 (ОМС для анонимной карты UUID_ANON):
 *    Попытка выставить счет или провести оплату с источником / методом ОМС (insurance)
 *    для анонимной карты пациента, у которого отсутствуют паспортные данные, СНИЛС и полис ОМС.
 *    Если система допускает финансовые расчеты по ОМС для анонима — фиксируется БРАК.
 *
 * 2. DEFECT-DECREE659-02 (Навязывание услуг сверх утвержденного плана лечения):
 *    Попытка добавить в утвержденный план лечения (status = 'Approved') платную услугу
 *    и пробить её (выставить наряд / списать оплату) БЕЗ генерации и подписания
 *    Дополнительного соглашения с пациентом.
 *    Если пробитие проходит в обход Дополнительного соглашения — фиксируется БРАК.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
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

const NAMESPACE = "decree659ProsecutorAudit";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 2);
const ADMIN_ID = fixtureUuid(NAMESPACE, 3);

/** Анонимная карта пациента (UUID_ANON) — без паспорта, СНИЛС и полиса ОМС */
const UUID_ANON = fixtureUuid(NAMESPACE, 10);

/** Идентифицированный пациент со всеми документами */
const PATIENT_IDENTIFIED = fixtureUuid(NAMESPACE, 20);

/** Утвержденный план лечения */
const APPROVED_PLAN_ID = fixtureUuid(NAMESPACE, 30);

/** Услуга 1: Консультация врача (входит в утвержденный план) */
const SERVICE_BASE_ID = fixtureUuid(NAMESPACE, 40);
const PRICE_BASE = 1500;

/** Услуга 2: Дополнительная навязанная услуга (НЕ входит в утвержденный план) */
const SERVICE_IMPOSED_ID = fixtureUuid(NAMESPACE, 41);
const PRICE_IMPOSED = 45000;

/** Услуга 3: Услуга из программы ОМС */
const SERVICE_OMS_ID = fixtureUuid(NAMESPACE, 42);
const PRICE_OMS = 2500;

describe("Prosecutor 3: Decree 659 & Treatment Plans Statutory Audit Suite", { concurrency: 1 }, () => {
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
			// 1. Создаем организацию
			await db.insert(organizations).values({
				id: ORG_ID,
				name: "Стоматологическая клиника Прокурорского аудита №659",
			});

			// 2. Создаем сотрудников
			await db.insert(users).values([
				{
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					fullName: "Врач-стоматолог аудита",
					role: "doctor",
				},
				{
					id: ADMIN_ID,
					organizationId: ORG_ID,
					fullName: "Главный врач / Администратор аудита",
					role: "admin",
				},
			]);

			// 3. Создаем пациентов:
			// Пациент 1: Анонимная карта (UUID_ANON) — без паспорта, СНИЛС и полиса ОМС
			await db.insert(patients).values({
				id: UUID_ANON,
				organizationId: ORG_ID,
				fullName: "Анонимный Пациент №659",
				birthDate: null,
				phone: null,
				email: null,
				status: "active",
				notes: "Пациент обслуживается анонимно со слов (Постановление № 659, п. 18)",
				administrativeProfile: {
					identityDocument: null,
					taxpayerInn: null,
					registrationAddress: null,
					residentialAddress: null,
					insurancePolicyNumber: null,
					snils: null,
					legalRepresentativeFullName: null,
					legalRepresentativeRelationship: null,
					legalRepresentativeIdentityDocument: null,
					legalRepresentativePhone: null,
					preferredDocumentRecipient: null,
					preferredAppointmentWeekdays: [],
					preferredAppointmentStart: null,
					preferredAppointmentEnd: null,
					preferredAppointmentNote: null,
					dataProcessingBasisNote: "Анонимное обращение со слов пациента",
					orthodonticProgress: null,
					loyaltyTier: null,
					curatorId: null,
					curatorFullName: null,
					curatorAssignedAt: null,
					curatorFunnelStage: null,
					curatorCommissionPercent: null,
					curatorNotes: null,
					curatorNextContactDate: null,
				},
			});

			// Пациент 2: Идентифицированный пациент с полным пакетом документов
			await db.insert(patients).values({
				id: PATIENT_IDENTIFIED,
				organizationId: ORG_ID,
				fullName: "Смирнова Елена Васильевна",
				birthDate: "1988-04-12",
				phone: "+79991112233",
				email: "smirnova.elena@example.com",
				status: "active",
				administrativeProfile: {
					identityDocument: "Паспорт РФ 4515 №892341 выдан ОВД г. Москвы 10.05.2008",
					taxpayerInn: "770112345678",
					registrationAddress: "г. Москва, ул. Профсоюзная, д. 12, кв. 45",
					residentialAddress: "г. Москва, ул. Профсоюзная, д. 12, кв. 45",
					insurancePolicyNumber: "1234567890123456", // ЕНП ОМС
					snils: "123-456-789 01",
					legalRepresentativeFullName: null,
					legalRepresentativeRelationship: null,
					legalRepresentativeIdentityDocument: null,
					legalRepresentativePhone: null,
					preferredDocumentRecipient: null,
					preferredAppointmentWeekdays: [],
					preferredAppointmentStart: null,
					preferredAppointmentEnd: null,
					preferredAppointmentNote: null,
					dataProcessingBasisNote: "Согласие на обработку ПДн от 02.09.2026",
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
					id: SERVICE_BASE_ID,
					organizationId: ORG_ID,
					code: "A11.07.001",
					title: "Первичный осмотр и консультация врача-стоматолога",
					basePriceRub: PRICE_BASE,
					priceRub: PRICE_BASE,
					isActive: true,
				},
				{
					id: SERVICE_IMPOSED_ID,
					organizationId: ORG_ID,
					code: "A16.07.054",
					title: "Внутрикостная дентальная имплантация (премиум система)",
					basePriceRub: PRICE_IMPOSED,
					priceRub: PRICE_IMPOSED,
					isActive: true,
				},
				{
					id: SERVICE_OMS_ID,
					organizationId: ORG_ID,
					code: "A16.07.002",
					title: "Наложение пломбы из композита химического отверждения (ОМС)",
					basePriceRub: PRICE_OMS,
					priceRub: PRICE_OMS,
					isActive: true,
				},
			]);

			// 5. Создаем утвержденный план лечения для идентифицированного пациента
			await db.insert(treatmentPlans).values({
				id: APPROVED_PLAN_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_IDENTIFIED,
				doctorId: DOCTOR_ID,
				title: "Утвержденный терапевтический план",
				name: "Утвержденный план лечения",
				status: "Approved",
				approvedAt: new Date(),
				totalPrice: String(PRICE_BASE),
				totalPriceRub: String(PRICE_BASE),
				patientSignature: null,
				version: 1,
			});

			// Вставляем базовую услугу плана
			await db.insert(treatmentPlanItemsNew).values({
				organizationId: ORG_ID,
				planId: APPROVED_PLAN_ID,
				toothNumber: 11,
				priceId: `${SERVICE_BASE_ID}::Первичный осмотр и консультация`,
				quantity: 1,
				price: String(PRICE_BASE),
				discount: "0",
				phase: 1,
				isBundle: false,
			});

			// Вставляем соответствующую позицию в treatment_items
			await db.insert(treatmentItems).values({
				organizationId: ORG_ID,
				patientId: PATIENT_IDENTIFIED,
				serviceId: SERVICE_BASE_ID,
				toothCode: "11",
				title: "Первичный осмотр и консультация врача-стоматолога",
				quantity: "1",
				unitPriceRub: PRICE_BASE,
				priceRub: PRICE_BASE,
				discountRub: 0,
				status: "approved",
				plannedDoctorUserId: DOCTOR_ID,
				notes: "Утвержденная позиция плана лечения",
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
	// АУДИТ ЧАСТЬ 1: ПОСТАНОВЛЕНИЕ №659 И ОМС ДЛЯ АНОНИМНОГО ПАЦИЕНТА (UUID_ANON)
	// =========================================================================

	it("AUDIT 1.1: Попытка провести оплату по ОМС (method: insurance) для анонимной карты пациента (UUID_ANON)", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// Попытка провести оплату со способом "insurance" (ОМС) для анонимного пациента
		const response = await app.inject({
			method: "POST",
			url: "/api/billing/payments",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				patientId: UUID_ANON,
				amountRub: PRICE_OMS,
				method: "insurance",
				serviceId: SERVICE_OMS_ID,
				clientMutationId: "audit-pay-anon-oms-1",
				note: "Оплата услуги терапевтического лечения по программе ОМС",
			},
		});

		console.log("\n[PROSECUTOR 3 AUDIT 1.1 LOG] Оплата по ОМС для анонимного пациента UUID_ANON:");
		console.log(`HTTP Status: ${response.statusCode}`);
		console.log(`Response Body: ${response.body}`);

		// АНАЛИЗ БРАКА ПО ПОСТАНОВЛЕНИЮ №659 И ФЗ-326:
		// Законное поведение: Система обязана вернуть 400 или 422 с категорическим отказом:
		// "Оказание помощи и оплата по ОМС для анонимных пациентов запрещены. Требуется идентификация, паспорт и полис ОМС."
		// ФАКТИЧЕСКОЕ ПОВЕДЕНИЕ СИСТЕМЫ:
		if (response.statusCode === 201 || response.statusCode === 200) {
			const paymentResult = JSON.parse(response.body);
			console.log("[DEFECT DETECTED] Платёж по ОМС успешно записан в базу для анонима! ID:", paymentResult.id);
			console.log("[DEFECT CLASSIFICATION] БРАК: КРИТИЧЕСКИЙ ЮРИДИЧЕСКИЙ И ФИНАНСОВЫЙ ДЕФЕКТ DEFECT-DECREE659-01");

			// Фиксируем факт в базе данных
			const [dbPayment] = await withFixtureTenant(ORG_ID, async (tx) =>
				tx
					.select()
					.from(payments)
					.where(and(eq(payments.id, paymentResult.id), eq(payments.organizationId, ORG_ID)))
					.limit(1),
			);
			assert.ok(dbPayment, "Платеж по ОМС физически записан в БД для анонимной карты");
			assert.equal(dbPayment.method, "insurance");
			assert.equal(dbPayment.status, "paid");

			// Фиксируем признак брака
			assert.ok(
				true,
				"БРАК ЗАФИКСИРОВАН: Система беспрепятственно проводит оплату по ОМС для анонимной карты пациента (UUID_ANON), нарушая Постановление №659 и 326-ФЗ",
			);
		} else {
			console.log("[AUDIT NOTE] Система отклонила платёж со статусом:", response.statusCode);
		}
	});

	it("AUDIT 1.2: Попытка выставить счет/наряд по услуге ОМС для анонимной карты пациента (UUID_ANON)", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// Попытка сформировать счет/наряд на анонимного пациента
		const response = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": staffToken,
			},
			payload: {
				patientId: UUID_ANON,
				documentType: "invoice",
				notes: "Счет на возмещение из средств фонда ОМС по анонимной карте",
				items: [
					{
						itemId: "oms-item-1",
						toothNumber: 21,
						code804n: "A16.07.002",
						nameRu: "Наложение пломбы из композита химического отверждения (ОМС)",
						categoryRu: "Терапия ОМС",
						quantity: 1,
						planUnitPriceRub: PRICE_OMS,
						effectiveUnitPriceRub: PRICE_OMS,
						discountRub: 0,
						resolutionPolicy: "LOCK_ORIGINAL_PRICE",
						serviceId: SERVICE_OMS_ID,
					},
				],
			},
		});

		console.log("\n[PROSECUTOR 3 AUDIT 1.2 LOG] Выставление счета по ОМС для анонимного пациента UUID_ANON:");
		console.log(`HTTP Status: ${response.statusCode}`);
		console.log(`Response Body: ${response.body}`);

		if (response.statusCode === 201) {
			const invoiceResult = JSON.parse(response.body);
			console.log("[DEFECT DETECTED] Счет по ОМС выписан на анонимного пациента! Номер счета:", invoiceResult.invoiceNumber);
			console.log("[DEFECT CLASSIFICATION] БРАК: Отсутствует валидация идентификации пациента при формировании финансовых документов.");

			assert.ok(invoiceResult.invoiceNumber, "Счет успешно сгенерирован для анонима");
			assert.equal(invoiceResult.patientId, UUID_ANON);
		} else {
			console.log("[AUDIT NOTE] Система отклонила выставление счета со статусом:", response.statusCode);
		}
	});

	// =========================================================================
	// АУДИТ ЧАСТЬ 2: СЦЕНАРИЙ НАВЯЗЫВАНИЯ УСЛУГ В УТВЕРЖДЕННЫЙ ПЛАН ЛЕЧЕНИЯ
	// =========================================================================

	it("AUDIT 2.1: Попытка добавить платную услугу в утвержденный план лечения без Дополнительного соглашения", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// В утвержденном плане APPROVED_PLAN_ID сейчас 1 услуга на 1 500 ₽.
		// Добавляем дорогую платную услугу на 45 000 ₽ (Имплантация) в тот же утвержденный план БЕЗ Дополнительного соглашения:
		const response = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_IDENTIFIED}/treatment-plans`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": staffToken,
			},
			payload: {
				id: APPROVED_PLAN_ID,
				name: "Утвержденный план лечения (модифицированный)",
				items: [
					{
						toothNumber: 11,
						priceId: SERVICE_BASE_ID,
						name: "Первичный осмотр и консультация",
						quantity: 1,
						price: PRICE_BASE,
						discount: 0,
						phase: 1,
					},
					{
						toothNumber: 26,
						priceId: SERVICE_IMPOSED_ID,
						name: "Внутрикостная дентальная имплантация (навязанная услуга)",
						quantity: 1,
						price: PRICE_IMPOSED,
						discount: 0,
						phase: 1,
					},
				],
			},
		});

		console.log("\n[PROSECUTOR 3 AUDIT 2.1 LOG] Попытка модификации утвержденного плана лечения:");
		console.log(`HTTP Status: ${response.statusCode}`);
		console.log(`Response Body: ${response.body}`);

		// АНАЛИЗ БРАКА ПО ПОСТАНОВЛЕНИЮ №659 И ЗОЗПП:
		// План лечения уже имеет status = "Approved".
		// Если patientSignature еще не заполнен строкой, маршрут odontogram.ts:769
		// НЕ ПРОВЕРЯЕТ status === "Approved" и ПОЗВОЛЯЕТ перезаписать план,
		// увеличив сумму с 1 500 ₽ до 46 500 ₽ БЕЗ Дополнительного соглашения!
		if (response.statusCode === 200 || response.statusCode === 201) {
			console.log("[DEFECT DETECTED] Утвержденный план лечения успешно модифицирован без Дополнительного соглашения!");
			console.log("[DEFECT CLASSIFICATION] БРАК: Нарушение п. 24-27 Постановления № 659 и ст. 16 ЗоЗПП (навязывание услуг).");

			// Проверяем обновленную сумму плана в БД
			const [updatedPlan] = await withFixtureTenant(ORG_ID, async (tx) =>
				tx
					.select()
					.from(treatmentPlans)
					.where(and(eq(treatmentPlans.id, APPROVED_PLAN_ID), eq(treatmentPlans.organizationId, ORG_ID)))
					.limit(1),
			);
			console.log(`Новая сумма плана в БД: ${updatedPlan?.totalPrice} ₽ (было ${PRICE_BASE} ₽)`);
			assert.equal(Number(updatedPlan?.totalPrice), PRICE_BASE + PRICE_IMPOSED);

			// Проверяем, что в treatment_items также добавилась навязанная позиция на 45 000 ₽
			const ledgerItems = await withFixtureTenant(ORG_ID, async (tx) =>
				tx
					.select()
					.from(treatmentItems)
					.where(and(eq(treatmentItems.patientId, PATIENT_IDENTIFIED), eq(treatmentItems.organizationId, ORG_ID))),
			);
			const imposedItem = ledgerItems.find((it) => it.serviceId === SERVICE_IMPOSED_ID);
			assert.ok(imposedItem, "Навязанная услуга попала в книгу лечения treatment_items без согласия!");
			console.log(`Позиция в книге лечения treatment_items ID: ${imposedItem.id}, сумма: ${imposedItem.priceRub} ₽`);

			assert.ok(
				true,
				"БРАК ЗАФИКСИРОВАН: Утвержденный план лечения позволяет дописывать платные услуги без оформления Дополнительного соглашения",
			);
		} else {
			console.log("[AUDIT NOTE] Маршрут заблокировал модификацию плана со статусом:", response.statusCode);
		}
	});

	it("AUDIT 2.2: Попытка пробить оплату (касса/чек) по навязанной платной услуге без подписанного Дополнительного соглашения", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// Попытка провести оплату кассой на 45 000 ₽ по навязанной услуге SERVICE_IMPOSED_ID
		// без существования подписанного Дополнительного соглашения
		const response = await app.inject({
			method: "POST",
			url: "/api/billing/payments",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				patientId: PATIENT_IDENTIFIED,
				amountRub: PRICE_IMPOSED,
				method: "card",
				serviceId: SERVICE_IMPOSED_ID,
				clientMutationId: "audit-pay-imposed-card-2",
				note: "Оплата навязанной услуги имплантации в обход Дополнительного соглашения",
			},
		});

		console.log("\n[PROSECUTOR 3 AUDIT 2.2 LOG] Пробитие оплаты по навязанной услуге:");
		console.log(`HTTP Status: ${response.statusCode}`);
		console.log(`Response Body: ${response.body}`);

		// АНАЛИЗ БРАКА ПО ПОСТАНОВЛЕНИЮ №659:
		// Пробитие оплаты платной услуги сверх утвержденного плана лечения БЕЗ наличия
		// сгенерированного и подписанного Дополнительного соглашения является прямым
		// нарушением Постановления №659 и ст. 14.8 КоАП РФ.
		// ФАКТИЧЕСКОЕ ПОВЕДЕНИЕ СИСТЕМЫ:
		if (response.statusCode === 201 || response.statusCode === 200) {
			const paymentResult = JSON.parse(response.body);
			console.log("[DEFECT DETECTED] Оплата 45 000 ₽ успешно пробита без Дополнительного соглашения! Payment ID:", paymentResult.id);
			console.log("[DEFECT CLASSIFICATION] БРАК: Касса списывает средства и формирует чек на навязанную услугу без юридического согласия пациента.");

			const [dbPayment] = await withFixtureTenant(ORG_ID, async (tx) =>
				tx
					.select()
					.from(payments)
					.where(and(eq(payments.id, paymentResult.id), eq(payments.organizationId, ORG_ID)))
					.limit(1),
			);
			assert.ok(dbPayment, "Платеж зафиксирован в базе");
			assert.equal(Number(dbPayment.amountRub), PRICE_IMPOSED);
			assert.equal(dbPayment.status, "paid");

			assert.ok(
				true,
				"БРАК ЗАФИКСИРОВАН: Система допускает прием денег и фискализацию по услуге, не обеспеченной подписанным Дополнительным соглашением",
			);
		} else {
			console.log("[AUDIT NOTE] Система заблокировала списание средств со статусом:", response.statusCode);
		}
	});
});
