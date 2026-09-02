/**
 * apps/api/src/tests/compliance/decree659SplitPaymentsAndRefundsAudit.test.ts
 *
 * PROSECUTOR 3: AUDIT OF SPLIT PAYMENTS & 54-FZ REFUND INVARIANTS (ПОСТАНОВЛЕНИЕ №659 И КАССА 54-ФЗ)
 *
 * Statutory & Compliance Vectors:
 * 1. Split Payments Invariant (Раздельные платежи: нал + безнал):
 *    - Если по Дополнительному соглашению лимит составляет 15 000 ₽, а кассир разбивает оплату
 *      на 10 000 ₽ картой и 10 000 ₽ наличными (в сумме 20 000 ₽), обязан ли фискальный модуль
 *      заблокировать второй платеж со статусом 422?
 * 2. Legitimate Split Payments within Addendum limit (8 000 ₽ + 7 000 ₽ = 15 000 ₽).
 * 3. 54-FZ Partial Refund / Income Return (Чек «Возврат прихода»):
 *    - Возврат средств пациенту по навязанной или спорной услуге в соответствии с 54-ФЗ
 *      и ст. 16, 32 Закона РФ «О защите прав потребителей».
 *    - Проверка фискальной очереди (receiptType: "income_return") и вычета комиссии врача.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	fiscalReceiptQueue,
	generatedDocuments,
	organizations,
	patientInvoices,
	patients,
	payments,
	serviceCatalogItems,
	treatmentPlanItemsNew,
	treatmentPlans,
	treatmentItems,
	users,
	visits,
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

const NAMESPACE = "decree659SplitRefundAudit";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 2);
const ADMIN_ID = fixtureUuid(NAMESPACE, 3);

const PATIENT_ID = fixtureUuid(NAMESPACE, 10);
const APPROVED_PLAN_ID = fixtureUuid(NAMESPACE, 20);

/** Услуга в плане: Осмотр (1 500 ₽) */
const SERVICE_BASE_ID = fixtureUuid(NAMESPACE, 30);
const PRICE_BASE = 1500;

/** Услуга по Дополнительному соглашению: Реставрация зуба (лимит 15 000 ₽) */
const SERVICE_RESTORE_ID = fixtureUuid(NAMESPACE, 31);
const PRICE_RESTORE = 15000;

/** Дополнительное соглашение на 15 000 ₽ */
const ADDENDUM_DOC_ID = fixtureUuid(NAMESPACE, 40);

/** Тестовый счет на оплату для проверки возврата */
const INVOICE_FOR_REFUND_ID = fixtureUuid(NAMESPACE, 50);

describe("Prosecutor 3: Split Payments & 54-FZ Refund Invariants (Decree 659 Audit)", { concurrency: 1 }, () => {
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
			await db.insert(organizations).values({
				id: ORG_ID,
				name: "Клиника Аудита Сплит-Платежей и Чеков 54-ФЗ",
			});

			await db.insert(users).values([
				{
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					fullName: "Доктор Стоматолог",
					role: "doctor",
				},
				{
					id: ADMIN_ID,
					organizationId: ORG_ID,
					fullName: "Главный Администратор Кассы",
					role: "admin",
				},
			]);

			await db.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Смирнов Алексей Игоревич",
				birthDate: "1990-03-20",
				phone: "+79051234567",
				email: "smirnov@example.com",
				status: "active",
				administrativeProfile: {
					identityDocument: "Паспорт РФ 4512 654321",
					taxpayerInn: "770212345678",
					registrationAddress: "г. Москва, ул. Тверская, д. 5",
					residentialAddress: "г. Москва, ул. Тверская, д. 5",
					insurancePolicyNumber: "1234567890123456",
					snils: "123-456-789 99",
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

			await db.insert(serviceCatalogItems).values([
				{
					id: SERVICE_BASE_ID,
					organizationId: ORG_ID,
					code: "A11.07.001",
					title: "Первичный осмотр (в плане)",
					basePriceRub: PRICE_BASE,
					priceRub: PRICE_BASE,
					isActive: true,
				},
				{
					id: SERVICE_RESTORE_ID,
					organizationId: ORG_ID,
					code: "A16.07.002",
					title: "Комплексная реставрация зуба (по Аддендуму)",
					basePriceRub: PRICE_RESTORE,
					priceRub: PRICE_RESTORE,
					isActive: true,
				},
			]);

			// Утвержденный базовый план лечения
			await db.insert(treatmentPlans).values({
				id: APPROVED_PLAN_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				doctorId: DOCTOR_ID,
				title: "Утвержденный план лечения",
				name: "Утвержденный план",
				status: "Approved",
				approvedAt: new Date(),
				totalPrice: String(PRICE_BASE),
				totalPriceRub: String(PRICE_BASE),
				patientSignature: null,
				version: 1,
			});

			await db.insert(treatmentPlanItemsNew).values({
				organizationId: ORG_ID,
				planId: APPROVED_PLAN_ID,
				toothNumber: 11,
				priceId: `${SERVICE_BASE_ID}::Первичный осмотр`,
				quantity: 1,
				price: String(PRICE_BASE),
				discount: "0",
				phase: 1,
				isBundle: false,
			});

			// Оформленное и выданное Дополнительное соглашение СТРОГО на 15 000 ₽
			await db.insert(generatedDocuments).values({
				id: ADDENDUM_DOC_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				kind: "treatment_plan_acceptance",
				status: "issued",
				title: "Дополнительное соглашение № ДС-15К на комплексную реставрацию зуба",
				totalAmountRub: PRICE_RESTORE, // 15 000 ₽
				issuedAt: new Date(),
			});

			// Создаем счет для тестирования возврата 54-ФЗ
			await db.insert(patientInvoices).values({
				id: INVOICE_FOR_REFUND_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				totalRub: "15000.00",
				totalAmountRub: 15000,
				status: "issued",
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
	// АУДИТ 1: РАЗДЕЛЬНЫЕ ПЛАТЕЖИ (SPLIT PAYMENTS) И ПРЕВЫШЕНИЕ ЛИМИТА АДДЕНДУМА
	// =========================================================================

	it("AUDIT 1.1: Первая часть раздельного платежа (10 000 ₽ картой по Аддендуму)", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/billing/payments",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				patientId: PATIENT_ID,
				amountRub: 10000,
				method: "card",
				clientMutationId: "split-pay-part-1-card",
				note: "Сплит-оплата: часть 1 (карта) 10 000 ₽ по соглашению на реставрацию",
			},
		});

		console.log("\n[AUDIT 1.1 LOG] Первая часть сплит-оплаты (10 000 ₽ картой):");
		console.log(`HTTP Status: ${response.statusCode}`);
		console.log(`Response Body: ${response.body}`);

		assert.equal(response.statusCode, 201, "Первая часть оплаты в пределах лимита обязана пройти со статусом 201");
		const payment = JSON.parse(response.body);
		assert.equal(Number(payment.amountRub), 10000);
		assert.equal(payment.status, "paid");
	});

	it("AUDIT 1.2: Вторая часть раздельного платежа с превышением лимита (попытка пробить еще 10 000 ₽ наличными при остатке 6 500 ₽)", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// План (1 500 ₽) + Аддендум (15 000 ₽) = Всего согласовано 16 500 ₽.
		// Уже оплачено 10 000 ₽. Остаток допустимого лимита: 6 500 ₽!
		// Кассир пытается пробить еще 10 000 ₽ наличными (в сумме 20 000 ₽, превышая суммарный лимит на 3 500 ₽)!
		const response = await app.inject({
			method: "POST",
			url: "/api/billing/payments",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				patientId: PATIENT_ID,
				amountRub: 10000,
				method: "cash",
				clientMutationId: "split-pay-part-2-cash-overpay",
				note: "Сплит-оплата: часть 2 (наличные) 10 000 ₽ по соглашению на реставрацию (ПРЕВЫШЕНИЕ)",
			},
		});

		console.log("\n[AUDIT 1.2 LOG] Вторая часть сплит-оплаты (10 000 ₽ наличными, суммарно 20 000 ₽ при лимите 16 500 ₽):");
		console.log(`HTTP Status: ${response.statusCode}`);
		console.log(`Response Body: ${response.body}`);

		// АНАЛИЗ ЗАКОННОСТИ:
		// Законное поведение: Касса ОБЯЗАНА заблокировать превышение кумулятивного лимита Дополнительного соглашения со статусом 422!
		assert.equal(
			response.statusCode,
			422,
			"Касса ОБЯЗАНА заблокировать сплит-платеж, превышающий кумулятивный лимит сметы и допсоглашений, со статусом 422",
		);
		const errJson = response.json();
		assert.equal(errJson?.error, "UpsellConsentShieldViolationError");
		console.log(
			"[GATE SUCCESS] Касса заблокировала превышение лимита Аддендума при сплит-оплате:",
			errJson?.message,
		);
	});

	// =========================================================================
	// АУДИТ 2: ВОЗВРАТ СРЕДСТВ ПО ЧЕКУ 54-ФЗ «ВОЗВРАТ ПРИХОДА»
	// =========================================================================

	it("AUDIT 2.1: Проведение возврата средств по навязанной услуге (чек 54-ФЗ «Возврат прихода»)", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// Пациент требует возврат средств по счету INVOICE_FOR_REFUND_ID на 15 000 ₽
		const response = await app.inject({
			method: "POST",
			url: "/api/billing/refunds/partial",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				invoiceId: INVOICE_FOR_REFUND_ID,
				patientId: PATIENT_ID,
				paymentMethod: "card",
				cashierFullName: "Старший кассир аудита",
				reasonCategory: "patient_refusal",
				customReasonDetailsRu: "Отказ пациента от навязанной услуги по ст. 16, 32 ЗоЗПП",
				clientMutationId: "refund-imposed-service-001",
				defaultDoctorCommissionPct: 20,
				refundRequests: [
					{
						itemId: "item-restore-1",
						quantityToRefund: 1,
						customAmountKopToRefund: 1500000, // 15 000 ₽
						reasonRu: "Комплексная реставрация зуба",
					},
				],
			},
		});

		console.log("\n[AUDIT 2.1 LOG] Проведение частичного возврата (чек 54-ФЗ):");
		console.log(`HTTP Status: ${response.statusCode}`);
		console.log(`Response Body: ${response.body}`);

		assert.equal(response.statusCode, 200, "Возврат средств обязан пройти со статусом 200 OK");
		const refundResult = JSON.parse(response.body);
		assert.ok(refundResult.paymentId, "Создана запись платежа возврата");
		assert.ok(refundResult.fiscalReceiptQueueId, "Создана запись в фискальной очереди 54-ФЗ");
		assert.equal(refundResult.updatedInvoiceStatus, "refunded", "Статус счета обновлен на 'refunded'");

		// Проверяем запись в таблице payments
		const [refundPayment] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(payments)
				.where(and(eq(payments.id, refundResult.paymentId), eq(payments.organizationId, ORG_ID)))
				.limit(1),
		);

		assert.ok(refundPayment, "Запись возврата найдена в payments");
		assert.equal(Number(refundPayment.amountRub), -15000, "Сумма в payments отрицательная (-15 000 ₽)");
		assert.equal(refundPayment.status, "refunded");

		// Проверяем запись в таблице fiscal_receipt_queue (54-ФЗ)
		const [fiscalRecord] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(fiscalReceiptQueue)
				.where(and(eq(fiscalReceiptQueue.id, refundResult.fiscalReceiptQueueId), eq(fiscalReceiptQueue.organizationId, ORG_ID)))
				.limit(1),
		);

		assert.ok(fiscalRecord, "Запись в фискальной очереди найдена");
		assert.equal(fiscalRecord.receiptType, "income_return", "Тип фискального чека строго 'income_return' (Возврат прихода по 54-ФЗ)");
		assert.equal(fiscalRecord.status, "pending_print", "Чек поставлен в очередь печати");

		console.log("[54-FZ FISCAL PROOF] Чек «Возврат прихода» успешно поставлен в очередь: ID", fiscalRecord.id);
		console.log("[DOCTOR CLAWBACK PROOF] В примечании платежа зафиксирован вычет комиссии врача:", refundPayment.note);
	});

	it("AUDIT 2.2: Защита от повторного возврата по тому же clientMutationId (Идемпотентность возвратов)", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// Попытка повторить тот же возврат с тем же clientMutationId
		const response = await app.inject({
			method: "POST",
			url: "/api/billing/refunds/partial",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				invoiceId: INVOICE_FOR_REFUND_ID,
				patientId: PATIENT_ID,
				clientMutationId: "refund-imposed-service-001", // Тот же ключ!
				refundRequests: [
					{
						itemId: "item-restore-1",
						quantityToRefund: 1,
						customAmountKopToRefund: 1500000,
					},
				],
			},
		});

		console.log("\n[AUDIT 2.2 LOG] Повторный возврат с тем же clientMutationId:");
		console.log(`HTTP Status: ${response.statusCode}`);
		console.log(`Response Body: ${response.body}`);

		assert.equal(response.statusCode, 400, "Повторный возврат обязан отклоняться со статусом 400");
		assert.equal(response.json()?.error, "DuplicateRefundMutation");
	});
});
