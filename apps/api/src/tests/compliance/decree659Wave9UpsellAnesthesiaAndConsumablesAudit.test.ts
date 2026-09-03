/**
 * apps/api/src/tests/compliance/decree659Wave9UpsellAnesthesiaAndConsumablesAudit.test.ts
 *
 * PROSECUTOR 3: WAVE 9 PEN-TEST & COMPLIANCE AUDIT
 * UPSELL CONSENT SHIELD & HARD ESTIMATE PROTECTION AGAINST UNAPPROVED ANESTHETICS & CONSUMABLES
 * (ПОСТАНОВЛЕНИЕ №659, ПП РФ №736 П. 23, СТ. 709 ГК РФ, СТ. 16, 33 ЗОЗПП)
 *
 * Vectors:
 * 1. AUDIT 9.1: Защита твердой сметы от навязывания неутвержденных платных анестетиков в наряде (POST /api/invoices/generate-from-plan).
 *    - Попытка включить анестезию «Ультракаин Д-С 1.7 мл» (850 ₽), не входящую в план, блокируется кодом 422 (UpsellConsentShieldViolationError).
 *    - После выдачи Дополнительного соглашения наряд формируется легитимно.
 * 2. AUDIT 9.2: Защита от навязывания неутвержденных расходных материалов (коффердам, оптрагейт).
 *    - Попытка включить расходники блокируется кодом 422 (UpsellConsentShieldViolationError).
 * 3. AUDIT 9.3: Атака раздувания количества анестетиков в твердой смете (Quantity Inflation Attack & ст. 709 ГК РФ):
 *    - При превышении количества карпул (quantity 3 вместо 1) без допсоглашения клиника обязана поглотить разницу.
 *    - Пациент оплачивает ровно согласованную сумму сметы 4 600.00 ₽ (переплата 0.00 ₽).
 * 4. AUDIT 9.4: Защита кассы 54-ФЗ от скрытого апселла анестетиков/расходников через авансы (POST /api/billing/payments):
 *    - Попытка провести аванс с примечанием «Оплата за дополнительную анестезию Ультракаин» без допсоглашения блокируется кодом 422.
 *    - Оформление допсоглашения открывает легитимный прием оплаты.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	generatedDocuments,
	organizations,
	patientInvoices,
	patients,
	payments,
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

const NAMESPACE = "decree659Wave9UpsellAudit";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 2);
const ADMIN_ID = fixtureUuid(NAMESPACE, 3);

const PATIENT_91_ID = fixtureUuid(NAMESPACE, 10);
const PATIENT_92_ID = fixtureUuid(NAMESPACE, 11);
const PATIENT_93_ID = fixtureUuid(NAMESPACE, 12);
const PATIENT_94_ID = fixtureUuid(NAMESPACE, 13);

const SERVICE_CARIES_ID = fixtureUuid(NAMESPACE, 20);
const SERVICE_ANESTHESIA_ID = fixtureUuid(NAMESPACE, 21);
const SERVICE_ENDO_ID = fixtureUuid(NAMESPACE, 22);
const SERVICE_COFFERDAM_ID = fixtureUuid(NAMESPACE, 23);
const SERVICE_OPTRAGATE_ID = fixtureUuid(NAMESPACE, 24);
const SERVICE_EXTRACTION_ID = fixtureUuid(NAMESPACE, 25);
const SERVICE_ARTICAINE_ID = fixtureUuid(NAMESPACE, 26);

const PLAN_91_ID = fixtureUuid(NAMESPACE, 30);
const PLAN_92_ID = fixtureUuid(NAMESPACE, 31);
const PLAN_93_ID = fixtureUuid(NAMESPACE, 32);
const PLAN_94_ID = fixtureUuid(NAMESPACE, 33);

const ADMIN_PIN = "9999";

describe("Prosecutor 3: Wave 9 Upsell Consent Shield & Consumables Audit (Decree 659 & Art. 709 GK RF)", { concurrency: 1 }, () => {
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
				name: "Клиника Аудита Навязывания Услуг Wave 9",
			});

			const passwordHash = await hashCredential("Password123!");
			const adminPinHash = await hashCredential(ADMIN_PIN);

			await db.insert(users).values([
				{
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					fullName: "Доктор Стоматолог Wave 9",
					username: `doctor_wave9_${Date.now()}`,
					role: "doctor",
					passwordHash,
					isActive: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				{
					id: ADMIN_ID,
					organizationId: ORG_ID,
					fullName: "Главный Администратор Wave 9",
					username: `admin_wave9_${Date.now()}`,
					role: "admin",
					passwordHash,
					adminPinHash,
					isActive: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			]);

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
		});

		app = createTenantTestApp();
		await registerBillingRoutes(app);
		await registerInvoiceRoutes(app);
		await registerOdontogramRoutes(app);
		await registerPatientRoutes(app);
		await app.ready();
	});

	after(async () => {
		if (app) await app.close();
		if (databaseReady) {
			await purgeFixtureOrganizations([ORG_ID]);
		}
	});

	it("AUDIT 9.1: Блокировка навязывания неутвержденной платной анестезии (Ультракаин) в наряде и разблокировка по Дополнительному соглашению", async () => {
		if (!databaseReady) return;

		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(patients).values({
				id: PATIENT_91_ID,
				organizationId: ORG_ID,
				fullName: "Пациент Защищенный От Навязывания Анестезии",
				phone: "+79001112233",
				birthDate: "1990-01-15",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			await db.insert(serviceCatalogItems).values([
				{
					id: SERVICE_CARIES_ID,
					organizationId: ORG_ID,
					code: "A16.07.002",
					title: "Лечение глубокого кариеса светоотверждаемым композитом",
					category: "therapy",
					basePriceRub: "6000.00",
					priceRub: "6000.00",
					active: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				{
					id: SERVICE_ANESTHESIA_ID,
					organizationId: ORG_ID,
					code: "B01.003.004.001",
					title: "Анестезия инфильтрационная Ультракаин Д-С 1.7 мл",
					category: "other",
					basePriceRub: "850.00",
					priceRub: "850.00",
					active: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			]);

			await db.insert(treatmentPlans).values({
				id: PLAN_91_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_91_ID,
				name: "План лечения зуба 16",
				title: "План лечения зуба 16",
				status: "Approved",
				totalPriceRub: "6000.00",
				discountMode: "plan_fixed",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			await db.insert(treatmentPlanItemsNew).values({
				id: fixtureUuid(NAMESPACE, 101),
				organizationId: ORG_ID,
				planId: PLAN_91_ID,
				priceId: SERVICE_CARIES_ID,
				nameRu: "Лечение глубокого кариеса светоотверждаемым композитом",
				toothNumber: 16,
				quantity: 1,
				price: "6000.00",
				discount: "0.00",
				orderIndex: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		});

		// 1. АТАКА: Врач пытается добавить неутвержденную анестезию в наряд
		const attackResponse = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
				"content-type": "application/json",
			},
			payload: {
				planId: PLAN_91_ID,
				patientId: PATIENT_91_ID,
				items: [
					{
						serviceId: SERVICE_CARIES_ID,
						code804n: "A16.07.002",
						nameRu: "Лечение глубокого кариеса светоотверждаемым композитом",
						toothNumber: 16,
						quantity: 1,
						unitPriceRub: 6000,
						discountRub: 0,
					},
					{
						serviceId: SERVICE_ANESTHESIA_ID,
						code804n: "B01.003.004.001",
						nameRu: "Анестезия инфильтрационная Ультракаин Д-С 1.7 мл",
						quantity: 1,
						unitPriceRub: 850,
						discountRub: 0,
					},
				],
			},
		});

		console.log(`[AUDIT 9.1 LOG] Атака навязывания анестезии: HTTP ${attackResponse.statusCode}`);
		const attackBody = attackResponse.json();
		assert.equal(attackResponse.statusCode, 422, "Навязывание неутвержденной анестезии обязано блокироваться 422");
		assert.equal(attackBody.error, "UpsellConsentShieldViolationError");
		assert.match(attackBody.message, /не входит в утвержденный план лечения/i);

		// 2. ЛЕГИТИМАЦИЯ: Оформляем выданное Дополнительное соглашение с пациентом
		const addendumId = fixtureUuid(NAMESPACE, 201);
		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(generatedDocuments).values({
				id: addendumId,
				organizationId: ORG_ID,
				patientId: PATIENT_91_ID,
				kind: "treatment_plan_acceptance",
				status: "issued",
				title: "Дополнительное соглашение №1 на проведение анестезии Ультракаин Д-С",
				totalAmountRub: "1000.00",
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		});

		// 3. ПОВТОРНЫЙ ЗАПРОС С ДОПОЛНИТЕЛЬНЫМ СОГЛАШЕНИЕМ
		const validResponse = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
				"content-type": "application/json",
			},
			payload: {
				planId: PLAN_91_ID,
				patientId: PATIENT_91_ID,
				items: [
					{
						serviceId: SERVICE_CARIES_ID,
						code804n: "A16.07.002",
						nameRu: "Лечение глубокого кариеса светоотверждаемым композитом",
						toothNumber: 16,
						quantity: 1,
						unitPriceRub: 6000,
						discountRub: 0,
					},
					{
						serviceId: SERVICE_ANESTHESIA_ID,
						code804n: "B01.003.004.001",
						nameRu: "Анестезия инфильтрационная Ультракаин Д-С 1.7 мл",
						quantity: 1,
						unitPriceRub: 850,
						discountRub: 0,
					},
				],
			},
		});

		assert.equal(validResponse.statusCode, 201, "После оформления Дополнительного соглашения наряд выписывается легитимно");
		const validBody = validResponse.json();
		assert.equal(validBody.totalNetRub, 6850, "Итоговая сумма наряда равна 6 850 ₽ (6000 + 850)");
		console.log("[AUDIT 9.1 PROOF] Upsell Consent Shield для анестезии доказан: 422 без допсоглашения, 201 с допсоглашением!");
	});

	it("AUDIT 9.2: Блокировка навязывания неутвержденных платных расходников (коффердам и оптрагейт)", async () => {
		if (!databaseReady) return;

		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(patients).values({
				id: PATIENT_92_ID,
				organizationId: ORG_ID,
				fullName: "Пациент Защищенный От Расходников",
				phone: "+79001112234",
				birthDate: "1988-03-22",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			await db.insert(serviceCatalogItems).values([
				{
					id: SERVICE_ENDO_ID,
					organizationId: ORG_ID,
					code: "A16.07.008",
					title: "Эндодонтическое лечение корневого канала",
					category: "therapy",
					basePriceRub: "8000.00",
					priceRub: "8000.00",
					active: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				{
					id: SERVICE_COFFERDAM_ID,
					organizationId: ORG_ID,
					code: "A16.07.008.002",
					title: "Изоляция рабочего поля системой Коффердам / Раббердам",
					category: "other",
					basePriceRub: "1200.00",
					priceRub: "1200.00",
					active: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				{
					id: SERVICE_OPTRAGATE_ID,
					organizationId: ORG_ID,
					code: "A16.07.008.003",
					title: "Изоляция губ и щек ретрактором Оптрагейт",
					category: "other",
					basePriceRub: "600.00",
					priceRub: "600.00",
					active: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			]);

			await db.insert(treatmentPlans).values({
				id: PLAN_92_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_92_ID,
				name: "Эндодонтия 26",
				title: "Эндодонтия 26",
				status: "Approved",
				totalPriceRub: "8000.00",
				discountMode: "plan_fixed",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			await db.insert(treatmentPlanItemsNew).values({
				id: fixtureUuid(NAMESPACE, 102),
				organizationId: ORG_ID,
				planId: PLAN_92_ID,
				priceId: SERVICE_ENDO_ID,
				nameRu: "Эндодонтическое лечение корневого канала",
				toothNumber: 26,
				quantity: 1,
				price: "8000.00",
				discount: "0.00",
				orderIndex: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		});

		// Попытка навязать коффердам и оптрагейт сверх сметы
		const attackResponse = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
				"content-type": "application/json",
			},
			payload: {
				planId: PLAN_92_ID,
				patientId: PATIENT_92_ID,
				items: [
					{
						serviceId: SERVICE_ENDO_ID,
						code804n: "A16.07.008",
						nameRu: "Эндодонтическое лечение корневого канала",
						toothNumber: 26,
						quantity: 1,
						unitPriceRub: 8000,
					},
					{
						serviceId: SERVICE_COFFERDAM_ID,
						code804n: "A16.07.008.002",
						nameRu: "Изоляция рабочего поля системой Коффердам / Раббердам",
						quantity: 1,
						unitPriceRub: 1200,
					},
					{
						serviceId: SERVICE_OPTRAGATE_ID,
						code804n: "A16.07.008.003",
						nameRu: "Изоляция губ и щек ретрактором Оптрагейт",
						quantity: 1,
						unitPriceRub: 600,
					},
				],
			},
		});

		console.log(`[AUDIT 9.2 LOG] Атака навязывания расходников: HTTP ${attackResponse.statusCode}`);
		const attackBody = attackResponse.json();
		assert.equal(attackResponse.statusCode, 422, "Навязывание расходных материалов обязано блокироваться 422");
		assert.equal(attackBody.error, "UpsellConsentShieldViolationError");
		console.log("[AUDIT 9.2 PROOF] Защита от навязывания платных расходных материалов доказана на 100%!");
	});

	it("AUDIT 9.3: Атака раздувания количества анестетиков в твердой смете (Quantity Inflation Attack & ст. 709 ГК РФ)", async () => {
		if (!databaseReady) return;

		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(patients).values({
				id: PATIENT_93_ID,
				organizationId: ORG_ID,
				fullName: "Пациент Твердой Сметы Хирургия",
				phone: "+79001112235",
				birthDate: "1975-06-10",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			await db.insert(serviceCatalogItems).values([
				{
					id: SERVICE_EXTRACTION_ID,
					organizationId: ORG_ID,
					code: "A16.07.001",
					title: "Сложное удаление зуба с разъединением корней",
					category: "surgery",
					basePriceRub: "4000.00",
					priceRub: "4000.00",
					active: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				{
					id: SERVICE_ARTICAINE_ID,
					organizationId: ORG_ID,
					code: "B01.003.004.002",
					title: "Анестезия Артикаин с адреналином 1.7 мл",
					category: "other",
					basePriceRub: "600.00",
					priceRub: "600.00",
					active: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			]);

			// План лечения утвержден (твердая смета): 1 удаление (4 000 ₽) + 1 карпула анестетика (600 ₽) = 4 600 ₽
			await db.insert(treatmentPlans).values({
				id: PLAN_93_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_93_ID,
				name: "Удаление 38",
				title: "Удаление 38",
				status: "Approved",
				totalPriceRub: "4600.00",
				discountMode: "plan_fixed",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			await db.insert(treatmentPlanItemsNew).values([
				{
					id: fixtureUuid(NAMESPACE, 103),
					organizationId: ORG_ID,
					planId: PLAN_93_ID,
					priceId: SERVICE_EXTRACTION_ID,
					nameRu: "Сложное удаление зуба с разъединением корней",
					toothNumber: 38,
					quantity: 1,
					price: "4000.00",
					discount: "0.00",
					orderIndex: 0,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				{
					id: fixtureUuid(NAMESPACE, 104),
					organizationId: ORG_ID,
					planId: PLAN_93_ID,
					priceId: SERVICE_ARTICAINE_ID,
					nameRu: "Анестезия Артикаин с адреналином 1.7 мл",
					quantity: 1,
					price: "600.00",
					discount: "0.00",
					orderIndex: 1,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			]);
		});

		// Врач в ходе сложной операции израсходовал 3 карпулы вместо 1 (quantity = 3).
		// Без допсоглашения и без PIN руководства: ст. 709 ГК РФ защищает твердую цену!
		// Клиника поглощает 2 лишние карпулы (1 200 ₽), с пациента взимается ровно 4 600.00 ₽!
		const protectedResponse = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
				"content-type": "application/json",
			},
			payload: {
				planId: PLAN_93_ID,
				patientId: PATIENT_93_ID,
				items: [
					{
						serviceId: SERVICE_EXTRACTION_ID,
						code804n: "A16.07.001",
						nameRu: "Сложное удаление зуба с разъединением корней",
						toothNumber: 38,
						quantity: 1,
						unitPriceRub: 4000,
					},
					{
						serviceId: SERVICE_ARTICAINE_ID,
						code804n: "B01.003.004.002",
						nameRu: "Анестезия Артикаин с адреналином 1.7 мл",
						quantity: 3, // Запрошено 3 карпулы вместо согласованной 1!
						unitPriceRub: 600,
					},
				],
			},
		});

		assert.equal(protectedResponse.statusCode, 201, "Наряд формируется с соблюдением твердой цены сметы");
		const protectedBody = protectedResponse.json();
		console.log(`[AUDIT 9.3 LOG] Итого наряда без допсоглашения: ${protectedBody.totalNetRub} ₽`);

		// Проверяем: сумма наряда ровно 4 600 ₽ (4000 + 600), а не 5 800 ₽!
		assert.equal(protectedBody.totalNetRub, 4600, "Твердая смета защищена: переплата пациента равна ровно 0.00 ₽!");

		// Проверяем treatment_items в БД:
		let createdItems: (typeof treatmentItems.$inferSelect)[] = [];
		await withFixtureTenant(ORG_ID, async () => {
			createdItems = await db
				.select()
				.from(treatmentItems)
				.where(
					and(
						eq(treatmentItems.organizationId, ORG_ID),
						eq(treatmentItems.patientId, PATIENT_93_ID),
					),
				);
		});

		const anesthesiaItem = createdItems.find(
			(it) => it.serviceId === SERVICE_ARTICAINE_ID || it.title?.includes("Артикаин"),
		);
		assert.ok(anesthesiaItem, "Позиция анестезии создана в treatment_items");
		assert.equal(anesthesiaItem.quantity, "3", "Количество отражает реальный клинический расход: 3 карпулы");
		assert.equal(Number(anesthesiaItem.priceRub), 600, "Общая стоимость анестезии для пациента зафиксирована на 600 ₽");
		assert.equal(Number(anesthesiaItem.unitPriceRub), 200, "Эффективная цена за единицу скорректирована до 200 ₽ (600 / 3)");

		console.log("[AUDIT 9.3 PROOF] Защита твердой сметы по ст. 709 ГК РФ доказана до копейки: 4 600.00 ₽!");
	});

	it("AUDIT 9.4: Защита кассы 54-ФЗ от скрытого апселла анестетиков/расходников через авансы (POST /api/billing/payments)", async () => {
		if (!databaseReady) return;

		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(patients).values({
				id: PATIENT_94_ID,
				organizationId: ORG_ID,
				fullName: "Пациент Кассовой Защиты 54-ФЗ",
				phone: "+79001112236",
				birthDate: "1995-11-04",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			await db.insert(treatmentPlans).values({
				id: PLAN_94_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_94_ID,
				name: "Терапевтический план",
				title: "Терапевтический план",
				status: "Approved",
				totalPriceRub: "10000.00",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			await db.insert(payments).values({
				id: fixtureUuid(NAMESPACE, 301),
				organizationId: ORG_ID,
				patientId: PATIENT_94_ID,
				amountRub: "5000.00",
				type: "advance",
				method: "card",
				paymentMethod: "card",
				note: "Первоначальный аванс по плану",
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		});

		// 1. АТАКА: Администратор пытается провести доплату 1 500 ₽ за неутвержденную анестезию без допсоглашения
		const attackPayResponse = await app.inject({
			method: "POST",
			url: "/api/billing/payments",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
				"content-type": "application/json",
			},
			payload: {
				clientMutationId: fixtureUuid(NAMESPACE, 303),
				patientId: PATIENT_94_ID,
				amountRub: 1500,
				method: "card",
				type: "advance",
				note: "Оплата за дополнительную анестезию Ультракаин 2 карпулы",
			},
		});

		console.log(`[AUDIT 9.4 LOG] Атака кассового апселла анестезии: HTTP ${attackPayResponse.statusCode}`);
		const attackPayBody = attackPayResponse.json();
		assert.equal(attackPayResponse.statusCode, 422, "Кассовый прием оплаты за неутвержденную анестезию обязан блокироваться 422");
		assert.equal(attackPayBody.error, "UpsellConsentShieldViolationError");
		assert.match(attackPayBody.message, /Upsell Consent Shield/i);

		// 2. ЛЕГИТИМАЦИЯ: Выдаем Дополнительное соглашение на анестезию
		const addendumId = fixtureUuid(NAMESPACE, 302);
		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(generatedDocuments).values({
				id: addendumId,
				organizationId: ORG_ID,
				patientId: PATIENT_94_ID,
				kind: "treatment_plan_acceptance",
				status: "issued",
				title: "Дополнительное соглашение №2 на дополнительное обезболивание (анестезия Ультракаин)",
				totalAmountRub: "2000.00",
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		});

		// 3. ПОВТОРНЫЙ ПРИЕМ ПЛАТЕЖА С ДОПОЛНИТЕЛЬНЫМ СОГЛАШЕНИЕМ
		const validPayResponse = await app.inject({
			method: "POST",
			url: "/api/billing/payments",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
				"content-type": "application/json",
			},
			payload: {
				clientMutationId: fixtureUuid(NAMESPACE, 304),
				patientId: PATIENT_94_ID,
				amountRub: 1500,
				method: "card",
				type: "advance",
				note: "Оплата за дополнительную анестезию Ультракаин 2 карпулы",
			},
		});

		assert.equal(validPayResponse.statusCode, 201, "После подписания Дополнительного соглашения платеж принимается кассой");
		const validPayBody = validPayResponse.json();
		assert.equal(validPayBody.amountRub, 1500, "Сумма принятого платежа равна 1 500.00 ₽");
		console.log("[AUDIT 9.4 PROOF] Кассовая защита 54-ФЗ от навязывания доказана на 100%!");
	});
});
