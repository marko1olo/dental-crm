/**
 * apps/api/src/tests/compliance/decree659Wave8FinancialRoundingAndRefundAudit.test.ts
 *
 * PROSECUTOR 3: WAVE 8 AUDIT OF FINANCIAL ROUNDING, MULTI-QUANTITY DISCOUNTS & 54-FZ REFUND DEFENSE
 * (ПОСТАНОВЛЕНИЕ №659, 54-ФЗ, СТ. 709 ГК РФ, СТ. 16, 32 ЗОЗПП)
 *
 * Statutory Vectors:
 * 1. Multi-Quantity Discount Scaling (quantity > 1 в режиме plan_fixed):
 *    - План содержит услугу со скидкой 500 ₽ за единицу.
 *    - При генерации наряда на quantity = 3 скидка обязана масштабироваться пропорционально: 1 500 ₽ (150 000 коп.),
 *      исключая как потерю скидки (500 ₽ вместо 1500 ₽), так и завышение (4500 ₽).
 * 2. Evasion Attack on Expired Price Freeze Token (Попытка обхода блокировки просроченного токена):
 *    - Токен фиксации цен истек (>30 дней), каталог вырос на +30% (с 10 000 ₽ до 13 000 ₽).
 *    - Атака А: сокрытие planId в запросе.
 *    - Атака Б: подмена даты создания сметы planCreatedAtIso на текущую дату.
 *    - Атака В: принудительная передача LOCK_ORIGINAL_PRICE без авторизации администратора.
 *    - Сервер обязан заблокировать каждую атаку статусом HTTP 400.
 * 3. 54-FZ Double Refund Defense (Защита от повторного возврата):
 *    - После полного возврата 10 000 ₽ повторный возврат обязан блокироваться статусом 422 (OverRefundExceeded).
 *    - Повтор с тем же ключом мутации блокируется статусом 400 (DuplicateRefundMutation).
 * 4. Kopeck-Exact Split Shares & Over-Refund Shield (Деление на доли и защита от переплаты):
 *    - Возврат частями: 3 333.33 ₽ + 3 333.33 ₽ = 6 666.66 ₽ из 10 000.00 ₽. Остаток: 3 333.34 ₽.
 *    - Попытка вернуть 3 333.35 ₽ (+1 копейка сверх лимита) блокируется статусом 422.
 *    - Возврат ровно 3 333.34 ₽ проходит успешно с финализацией счета (status: 'refunded').
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	fiscalReceiptQueue,
	organizations,
	patientInvoices,
	patients,
	payments,
	serviceCatalogItems,
	treatmentItems,
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

const NAMESPACE = "decree659Wave8Audit";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 2);
const ADMIN_ID = fixtureUuid(NAMESPACE, 3);

const PATIENT_MULTI_ID = fixtureUuid(NAMESPACE, 10);
const PATIENT_EXPIRED_ID = fixtureUuid(NAMESPACE, 11);
const PATIENT_REFUND_ID = fixtureUuid(NAMESPACE, 12);

const SERVICE_FILLING_ID = fixtureUuid(NAMESPACE, 20); // 5 000 ₽ (скидка в плане 500 ₽)
const SERVICE_CROWN_ID = fixtureUuid(NAMESPACE, 21);   // 10 000 ₽ (выросла до 13 000 ₽, +30%)

const PLAN_MULTI_ID = fixtureUuid(NAMESPACE, 30);
const PLAN_EXPIRED_ID = fixtureUuid(NAMESPACE, 31);

const INVOICE_REFUND_ID = fixtureUuid(NAMESPACE, 40);

const ADMIN_PIN = "8899";

describe("Prosecutor 3: Wave 8 Financial Rounding, Multi-Qty & 54-FZ Refund Audit", { concurrency: 1 }, () => {
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
				name: "Клиника Аудита Финансовых Округлений Wave 8",
			});

			const pinHash = await hashCredential(ADMIN_PIN);

			await db.insert(users).values([
				{
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					fullName: "Доктор Терапевт Wave 8",
					role: "doctor",
				},
				{
					id: ADMIN_ID,
					organizationId: ORG_ID,
					fullName: "Главный Администратор Кассы Wave 8",
					role: "admin",
					pinCodeHash: pinHash,
				},
			]);

			// Пациенты
			await db.insert(patients).values([
				{
					id: PATIENT_MULTI_ID,
					organizationId: ORG_ID,
					fullName: "Иванов Дмитрий Сергеевич",
					birthDate: "1985-05-15",
					phone: "+79051112233",
					status: "active",
				},
				{
					id: PATIENT_EXPIRED_ID,
					organizationId: ORG_ID,
					fullName: "Ковалев Игорь Николаевич",
					birthDate: "1978-11-20",
					phone: "+79052223344",
					status: "active",
				},
				{
					id: PATIENT_REFUND_ID,
					organizationId: ORG_ID,
					fullName: "Морозова Анна Павловна",
					birthDate: "1994-02-28",
					phone: "+79053334455",
					status: "active",
				},
			]);

			// Каталог услуг
			await db.insert(serviceCatalogItems).values([
				{
					id: SERVICE_FILLING_ID,
					organizationId: ORG_ID,
					code: "A16.07.002",
					title: "Световая пломба Estelite",
					basePriceRub: 5000,
					priceRub: 5000,
					isActive: true,
				},
				{
					id: SERVICE_CROWN_ID,
					organizationId: ORG_ID,
					code: "A16.07.004",
					title: "Керамическая коронка E-max",
					basePriceRub: 13000, // Каталог вырос до 13 000 ₽ (+30%)
					priceRub: 13000,
					isActive: true,
				},
			]);

			// План 1: Мульти-позиции со скидкой (3 пломбы по 5 000 ₽ со скидкой 500 ₽ за штуку)
			await db.insert(treatmentPlans).values({
				id: PLAN_MULTI_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_MULTI_ID,
				name: "Терапевтический план на 3 пломбы",
				status: "Approved",
				discountMode: "plan_fixed",
				totalPriceRub: 13500, // 3 * (5000 - 500) = 13 500 ₽
				approvedAt: new Date(),
				createdAt: new Date(),
			});

			await db.insert(treatmentPlanItemsNew).values({
				id: fixtureUuid(NAMESPACE, 32),
				organizationId: ORG_ID,
				planId: PLAN_MULTI_ID,
				priceId: `${SERVICE_FILLING_ID}::Световая пломба Estelite`,
				toothNumber: 15,
				quantity: 3,
				price: "5000.00",
				discount: "500.00", // Скидка за единицу 500 ₽ (на 3 штуки = 1 500 ₽)
				itemOrder: 1,
			});

			// План 2: Просроченная смета с токеном фиксации (цена была 10 000 ₽)
			await db.insert(treatmentPlans).values({
				id: PLAN_EXPIRED_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_EXPIRED_ID,
				name: "План ортопедии с истекшим токеном",
				status: "Approved",
				totalPriceRub: 10000,
				approvedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 дней назад
				createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
			});

			await db.insert(treatmentPlanItemsNew).values({
				id: fixtureUuid(NAMESPACE, 33),
				organizationId: ORG_ID,
				planId: PLAN_EXPIRED_ID,
				priceId: `${SERVICE_CROWN_ID}::Керамическая коронка E-max`,
				toothNumber: 24,
				quantity: 1,
				price: "10000.00",
				discount: "0.00",
				itemOrder: 1,
			});

			// Счет для проверки возвратов 54-ФЗ (10 000.00 ₽)
			await db.insert(patientInvoices).values({
				id: INVOICE_REFUND_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_REFUND_ID,
				totalRub: "10000.00",
				totalAmountRub: 10000,
				status: "issued",
			});

			// Проводим оплату этого счета на 10 000 ₽
			await db.insert(payments).values({
				id: fixtureUuid(NAMESPACE, 50),
				organizationId: ORG_ID,
				patientId: PATIENT_REFUND_ID,
				documentId: INVOICE_REFUND_ID,
				amountRub: 10000,
				method: "card",
				status: "paid",
				paidAt: new Date(),
				fiscalReceiptNumber: "ФЧ-REFUND-100",
				fiscalReceiptIssuedAt: new Date().toISOString(),
				note: `Оплата счета ${INVOICE_REFUND_ID}`,
			});
		});

		// Создаем токены фиксации цен
		await withFixtureTenant(ORG_ID, async (tx) => {
			// Активный токен для плана с 3 пломбами
			await issuePriceFreezeToken(tx, {
				organizationId: ORG_ID,
				patientId: PATIENT_MULTI_ID,
				planId: PLAN_MULTI_ID,
				policyKind: "standard_30_days",
				customValidityDays: 30,
			});

			// Просроченный токен для плана ортопедии
			const expToken = await issuePriceFreezeToken(tx, {
				organizationId: ORG_ID,
				patientId: PATIENT_EXPIRED_ID,
				planId: PLAN_EXPIRED_ID,
				policyKind: "standard_30_days",
				customValidityDays: 30,
			});

			await tx
				.update(treatmentPlanPriceFreezeTokens)
				.set({
					validUntil: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 дней назад
					isExpired: true,
					status: "expired",
					updatedAt: new Date(),
				})
				.where(eq(treatmentPlanPriceFreezeTokens.id, expToken.tokenId));
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
	// АУДИТ 8.1: МУЛЬТИ-КОЛИЧЕСТВО И ПРОПОРЦИОНАЛЬНОЕ МАСШТАБИРОВАНИЕ СКИДОК
	// =========================================================================

	it("AUDIT 8.1: Генерация наряда из плана с quantity = 3: пропорциональный расчет скидки (1 500 ₽, а не 500 ₽ и не 4 500 ₽)", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
			payload: {
				planId: PLAN_MULTI_ID,
				patientId: PATIENT_MULTI_ID,
				documentType: "work_order",
				doctorUserId: DOCTOR_ID,
				items: [
					{
						serviceId: SERVICE_FILLING_ID,
						nameRu: "Световая пломба Estelite",
						code804n: "A16.07.002",
						quantity: 3,
					},
				],
			},
		});

		console.log("\n[AUDIT 8.1 LOG] Ответ генерации наряда на quantity=3:");
		console.log(`HTTP Status: ${res.statusCode}`);
		console.log(`Response Body: ${res.body}`);

		assert.equal(res.statusCode, 201, "Наряд обязан успешно создаться со статусом 201");
		const body = res.json();

		// Проверка финансовой математики:
		// 3 пломбы по 5 000 ₽ = 15 000 ₽ Gross
		// Скидка: 500 ₽ за штуку * 3 = 1 500 ₽ Discount (150 000 коп.)
		// К оплате: 13 500 ₽ Net
		assert.equal(body.totalGrossRub, 15000);
		assert.equal(body.totalDiscountRub, 1500);
		assert.equal(body.totalNetRub, 13500);
		assert.equal(body.validationReport.effectiveInvoiceGrossKopecks, 1500000);
		assert.equal(body.validationReport.effectiveInvoiceDiscountKopecks, 150000);
		assert.equal(body.validationReport.effectiveInvoiceNetKopecks, 1350000);

		// Проверяем запись в базу данных treatment_items
		const insertedItems = await withFixtureTenant(ORG_ID, async (tx) => {
			return await tx
				.select()
				.from(treatmentItems)
				.where(
					and(
						eq(treatmentItems.organizationId, ORG_ID),
						eq(treatmentItems.patientId, PATIENT_MULTI_ID),
					),
				);
		});

		assert.equal(insertedItems.length, 1);
		const dbItem = insertedItems[0];
		assert.equal(dbItem.quantity, "3");
		assert.equal(dbItem.unitPriceRub, 5000);
		assert.equal(dbItem.discountRub, 1500);
		assert.equal(dbItem.priceRub, 13500);

		console.log("[AUDIT 8.1 PROOF] Пропорциональное масштабирование скидки на quantity=3 доказано!");
	});

	// =========================================================================
	// АУДИТ 8.2: ПОПЫТКИ ОБХОДА БЛОКИРОВКИ ПРОСРОЧЕННОГО ТОКЕНА ФИКСАЦИИ ЦЕН
	// =========================================================================

	it("AUDIT 8.2: Блокировка всех векторов обхода просроченного токена при росте цен на +30% (>10% порог)", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// Вектор А: Сокрытие planId в теле запроса в надежде обойти проверку токена
		const evasionResA = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
			payload: {
				patientId: PATIENT_EXPIRED_ID,
				documentType: "work_order",
				doctorUserId: DOCTOR_ID,
				items: [
					{
						serviceId: SERVICE_CROWN_ID,
						nameRu: "Керамическая коронка E-max",
						code804n: "A16.07.004",
						quantity: 1,
					},
				],
			},
		});

		console.log(`[AUDIT 8.2A LOG] Вектор А (сокрытие planId): HTTP ${evasionResA.statusCode}`);
		assert.equal(evasionResA.statusCode, 400, "Сервер обязан найти утвержденный план с просроченным токеном и заблокировать операцию");
		const bodyA = evasionResA.json();
		assert.equal(bodyA.error, "BlockedArchivedServiceError");
		assert.equal(bodyA.report.canGenerateWorkOrder, false);

		// Вектор Б: Подмена даты создания плана planCreatedAtIso на текущую дату
		const evasionResB = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
			payload: {
				planId: PLAN_EXPIRED_ID,
				patientId: PATIENT_EXPIRED_ID,
				planCreatedAtIso: new Date().toISOString(), // Фейковая дата создания
				documentType: "work_order",
				doctorUserId: DOCTOR_ID,
				items: [
					{
						serviceId: SERVICE_CROWN_ID,
						nameRu: "Керамическая коронка E-max",
						code804n: "A16.07.004",
						quantity: 1,
					},
				],
			},
		});

		console.log(`[AUDIT 8.2B LOG] Вектор Б (подмена planCreatedAtIso): HTTP ${evasionResB.statusCode}`);
		assert.equal(evasionResB.statusCode, 400, "Фейковая дата не должна отменять факт экспирации токена");
		const bodyB = evasionResB.json();
		assert.equal(bodyB.report.isPlanExpired, true);
		assert.equal(bodyB.report.isPriceLocked, false);

		// Вектор В: Принудительная передача LOCK_ORIGINAL_PRICE без PIN-кода администратора
		const evasionResC = await app.inject({
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
						serviceId: SERVICE_CROWN_ID,
						nameRu: "Керамическая коронка E-max",
						code804n: "A16.07.004",
						quantity: 1,
						resolutionPolicy: "LOCK_ORIGINAL_PRICE", // Попытка заставить клинику оплатить +30%
					},
				],
			},
		});

		console.log(`[AUDIT 8.2C LOG] Вектор В (форсирование LOCK_ORIGINAL_PRICE): HTTP ${evasionResC.statusCode}`);
		assert.equal(evasionResC.statusCode, 400, "Абсорбция инфляции >10% по истекшей смете запрещена без PIN администратора");

		console.log("[AUDIT 8.2 PROOF] Все 3 вектора обхода блокировки просроченного токена отбиты со статусом 400!");
	});

	// =========================================================================
	// АУДИТ 8.3: ЗАЩИТА ОТ ПОВТОРНОГО ВОЗВРАТА (DOUBLE REFUND DEFENSE)
	// =========================================================================

	it("AUDIT 8.3: Защита от повторного возврата (Double Refund): блокировка 422 OverRefundExceeded и 400 DuplicateMutation", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const mutationIdA = "REFUND-MUTATION-801-A";

		// 1. Первый легитимный полный возврат 10 000 ₽
		const firstRefundRes = await app.inject({
			method: "POST",
			url: "/api/billing/refunds/partial",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				invoiceId: INVOICE_REFUND_ID,
				patientId: PATIENT_REFUND_ID,
				cashierFullName: "Кассир Wave 8",
				cashierInn: "770123456789",
				paymentMethod: "card",
				reasonCategory: "patient_refusal",
				customReasonDetailsRu: "Отказ от лечения по ст. 32 ЗоЗПП",
				clientMutationId: mutationIdA,
				refundRequests: [
					{
						itemId: "ITEM-REFUND-1",
						customAmountKopToRefund: 1000000, // 10 000.00 ₽
						quantityToRefund: 1,
						reasonRu: "Возврат по заявлению пациента",
					},
				],
			},
		});

		console.log(`\n[AUDIT 8.3 LOG] Первый возврат (10 000 ₽): HTTP ${firstRefundRes.statusCode}`);
		assert.equal(firstRefundRes.statusCode, 200, "Первый возврат обязан пройти успешно");
		const refundBody = firstRefundRes.json();
		assert.equal(refundBody.success, true);
		assert.equal(refundBody.calculation.totalRefundRub, 10000);
		assert.equal(refundBody.updatedInvoiceStatus, "refunded");

		// 2. Атака повторного списания с другим ключом мутации (попытка украсть еще 10 000 ₽)
		const doubleRefundRes = await app.inject({
			method: "POST",
			url: "/api/billing/refunds/partial",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				invoiceId: INVOICE_REFUND_ID,
				patientId: PATIENT_REFUND_ID,
				cashierFullName: "Кассир Wave 8",
				cashierInn: "770123456789",
				paymentMethod: "card",
				reasonCategory: "patient_refusal",
				clientMutationId: "REFUND-MUTATION-801-ATTACK",
				refundRequests: [
					{
						itemId: "ITEM-REFUND-1",
						customAmountKopToRefund: 1000000, // Повторные 10 000.00 ₽
						quantityToRefund: 1,
					},
				],
			},
		});

		console.log(`[AUDIT 8.3 LOG] Попытка повторного возврата (Double Refund): HTTP ${doubleRefundRes.statusCode}`);
		assert.equal(doubleRefundRes.statusCode, 422, "Повторный возврат обязан блокироваться со статусом 422 (OverRefundExceeded)");
		const doubleBody = doubleRefundRes.json();
		assert.equal(doubleBody.error, "OverRefundExceeded");
		assert.match(doubleBody.message, /превышает доступный лимит по счёту/);

		// 3. Повтор запроса с тем же clientMutationId (Replay Attack)
		const replayRes = await app.inject({
			method: "POST",
			url: "/api/billing/refunds/partial",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				invoiceId: INVOICE_REFUND_ID,
				patientId: PATIENT_REFUND_ID,
				cashierFullName: "Кассир Wave 8",
				cashierInn: "770123456789",
				clientMutationId: mutationIdA,
				refundRequests: [
					{
						itemId: "ITEM-REFUND-1",
						customAmountKopToRefund: 1000000,
						quantityToRefund: 1,
					},
				],
			},
		});

		console.log(`[AUDIT 8.3 LOG] Повтор с тем же clientMutationId: HTTP ${replayRes.statusCode}`);
		assert.equal(replayRes.statusCode, 400, "Повтор с тем же ключом мутации обязан отклоняться как дубликат");
		const replayBody = replayRes.json();
		assert.equal(replayBody.error, "DuplicateRefundMutation");

		console.log("[AUDIT 8.3 PROOF] Защита от повторного возврата доказана на 100%!");
	});

	// =========================================================================
	// АУДИТ 8.4: ДЕЛЕНИЕ НА ДОЛИ, КОПЕЕЧНЫЙ РАСЧЕТ И ЗАЩИТА ОТ OVER-REFUND
	// =========================================================================

	it("AUDIT 8.4: Деление на доли (3 333.33 + 3 333.33 + 3 333.34 = 10 000.00 ₽) и блокировка переплаты на 1 копейку", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// Создаем новый счет на 10 000.00 ₽ и оплачиваем его
		const splitInvoiceId = fixtureUuid(NAMESPACE, 60);
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(patientInvoices).values({
				id: splitInvoiceId,
				organizationId: ORG_ID,
				patientId: PATIENT_REFUND_ID,
				totalRub: "10000.00",
				totalAmountRub: 10000,
				status: "issued",
			});

			await tx.insert(payments).values({
				id: fixtureUuid(NAMESPACE, 61),
				organizationId: ORG_ID,
				patientId: PATIENT_REFUND_ID,
				documentId: splitInvoiceId,
				amountRub: 10000,
				method: "card",
				status: "paid",
				paidAt: new Date(),
				fiscalReceiptNumber: "ФЧ-SPLIT-100",
				fiscalReceiptIssuedAt: new Date().toISOString(),
				note: `Оплата счета ${splitInvoiceId}`,
			});
		});

		// 1. Возврат 1-й доли: 3 333.33 ₽ (333 333 коп.)
		const part1Res = await app.inject({
			method: "POST",
			url: "/api/billing/refunds/partial",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				invoiceId: splitInvoiceId,
				patientId: PATIENT_REFUND_ID,
				cashierFullName: "Кассир Wave 8",
				paymentMethod: "card",
				reasonCategory: "quality_claim",
				clientMutationId: "SPLIT-REFUND-PART-1",
				refundRequests: [
					{
						itemId: "ITEM-SPLIT-1",
						customAmountKopToRefund: 333333, // 3 333.33 ₽
						quantityToRefund: 1,
					},
				],
			},
		});

		assert.equal(part1Res.statusCode, 200);
		assert.equal(part1Res.json().updatedInvoiceStatus, "partially_refunded");

		// 2. Возврат 2-й доли: 3 333.33 ₽ (333 333 коп.)
		const part2Res = await app.inject({
			method: "POST",
			url: "/api/billing/refunds/partial",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				invoiceId: splitInvoiceId,
				patientId: PATIENT_REFUND_ID,
				cashierFullName: "Кассир Wave 8",
				paymentMethod: "card",
				reasonCategory: "quality_claim",
				clientMutationId: "SPLIT-REFUND-PART-2",
				refundRequests: [
					{
						itemId: "ITEM-SPLIT-1",
						customAmountKopToRefund: 333333, // 3 333.33 ₽
						quantityToRefund: 1,
					},
				],
			},
		});

		assert.equal(part2Res.statusCode, 200);
		// Уже возвращено: 333 333 + 333 333 = 666 666 коп. (6 666.66 ₽).
		// Доступный остаток: 1 000 000 - 666 666 = 333 334 коп. (3 333.34 ₽).

		// 3. Попытка вернуть 3 333.35 ₽ (333 335 коп. — превышение ровно на 1 копейку!)
		const overRefund1KopRes = await app.inject({
			method: "POST",
			url: "/api/billing/refunds/partial",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				invoiceId: splitInvoiceId,
				patientId: PATIENT_REFUND_ID,
				cashierFullName: "Кассир Wave 8",
				paymentMethod: "card",
				reasonCategory: "quality_claim",
				clientMutationId: "SPLIT-REFUND-OVER-1KOP",
				refundRequests: [
					{
						itemId: "ITEM-SPLIT-1",
						customAmountKopToRefund: 333335, // 3 333.35 ₽ (> 3 333.34 ₽ на 1 коп.)
						quantityToRefund: 1,
					},
				],
			},
		});

		console.log(`\n[AUDIT 8.4 LOG] Попытка возврата сверх лимита на 1 копейку (3 333.35 ₽ при остатке 3 333.34 ₽): HTTP ${overRefund1KopRes.statusCode}`);
		assert.equal(overRefund1KopRes.statusCode, 422, "Превышение даже на 1 копейку обязано блокироваться со статусом 422");
		const overBody = overRefund1KopRes.json();
		assert.equal(overBody.error, "OverRefundExceeded");
		assert.equal(overBody.details.remainingRefundableKop, 333334);
		assert.equal(overBody.details.requestedTotalKop, 333335);

		// 4. Легитимный возврат точного остатка: ровно 3 333.34 ₽ (333 334 коп.)
		const part3Res = await app.inject({
			method: "POST",
			url: "/api/billing/refunds/partial",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				invoiceId: splitInvoiceId,
				patientId: PATIENT_REFUND_ID,
				cashierFullName: "Кассир Wave 8",
				paymentMethod: "card",
				reasonCategory: "quality_claim",
				clientMutationId: "SPLIT-REFUND-PART-3-FINAL",
				refundRequests: [
					{
						itemId: "ITEM-SPLIT-1",
						customAmountKopToRefund: 333334, // Ровно 3 333.34 ₽
						quantityToRefund: 1,
					},
				],
			},
		});

		console.log(`[AUDIT 8.4 LOG] Легитимный возврат точного остатка (3 333.34 ₽): HTTP ${part3Res.statusCode}`);
		assert.equal(part3Res.statusCode, 200, "Возврат точного остатка обязан пройти успешно");
		const part3Body = part3Res.json();
		assert.equal(part3Body.updatedInvoiceStatus, "refunded", "После возврата 100% остатка статус счета обязан стать 'refunded'");

		console.log("[AUDIT 8.4 PROOF] Копеечная точность деления на доли (3 333.33 + 3 333.33 + 3 333.34 = 10 000.00 ₽) и барьер на 1 копейку доказаны!");
	});
});
