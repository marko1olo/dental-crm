/**
 * apps/api/src/tests/compliance/decree659FiscalSplitAndTaxExemptionAudit.test.ts
 *
 * PROSECUTOR 3: STATUTORY AUDIT OF 54-FZ SPLIT PAYMENTS, INCOME RETURNS & DECREE 659 TAX EXEMPTION BARRIER
 * (54-ФЗ, СТ. 219 НК РФ, ПОСТАНОВЛЕНИЕ ПРАВИТЕЛЬСТВА РФ №659, ПРИКАЗ ФНС РОССИИ № ЕА-7-11/824@)
 *
 * Vectors Verified:
 * 1. Split Payments (Сплит-оплата 50 000 ₽: 20 000 ₽ нал + 20 000 ₽ безнал/карта + 10 000 ₽ СБП):
 *    - Формируются 3 отдельных фискальных чека в очереди 54-ФЗ с признаком 'income' (Тег 1054 = 1).
 * 2. Overpayment Defense:
 *    - Запрет внесения 4-го платежа сверх согласованного лимита документа (BillingOverpaymentError / UpsellConsentShield).
 * 3. Return Receipt 54-FZ (Чек «Возврат прихода», operationType: income_return, Тег 1054 = 2):
 *    - Запрет на закрытие долга через возврат и жесткий контроль лимита возвращаемого аванса (OverRefundExceeded).
 * 4. Absolute Tax Exemption Shield for Anonymous Patients (UUID_ANON):
 *    - GET /api/documents/tax-deduction/preview/:patientId и GET /api/billing/tax-deduction/preview/:patientId -> isBlocked: true.
 *    - POST /api/documents/tax-deduction/xml и POST /api/billing/tax-deduction/xml -> 422 Decree659TaxDeductionForbiddenError.
 *    - POST /api/billing/tax-deduction -> 422 Decree659TaxDeductionForbiddenError.
 *    - POST /api/documents (kind: 'tax_deduction_certificate') -> 422 Decree659TaxDeductionForbiddenError.
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

const NAMESPACE = "decree659FiscalSplitAudit";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 2);
const ADMIN_ID = fixtureUuid(NAMESPACE, 3);

const IDENT_PATIENT_ID = fixtureUuid(NAMESPACE, 10);
const ANON_PATIENT_ID = fixtureUuid(NAMESPACE, 11);

const SERVICE_CROWN_ID = fixtureUuid(NAMESPACE, 20);
const INVOICE_50K_ID = fixtureUuid(NAMESPACE, 30);
const ADDENDUM_50K_ID = fixtureUuid(NAMESPACE, 31);
const PLAN_50K_ID = fixtureUuid(NAMESPACE, 32);

describe("Prosecutor 3: 54-FZ Split Payments, Income Returns & Decree 659 Tax Exemption Audit", { concurrency: 1 }, () => {
	let app: FastifyInstance;
	let clinicToken = "";
	let adminToken = "";
	let doctorToken = "";
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
				name: "Клиника Аудита Кассы 54-ФЗ и Вычетов",
			});

			await db.insert(users).values([
				{
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					fullName: "Доктор Ортопед Аудита",
					role: "doctor",
				},
				{
					id: ADMIN_ID,
					organizationId: ORG_ID,
					fullName: "Старший Кассир-Администратор",
					role: "admin",
				},
			]);

			// 1. Идентифицированный пациент со всеми паспортными данными
			await db.insert(patients).values({
				id: IDENT_PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Кузнецов Дмитрий Сергеевич",
				birthDate: "1988-11-12",
				phone: "+79031112233",
				email: "kuznetsov@example.com",
				status: "active",
				balanceRub: 0,
				administrativeProfile: {
					identityDocument: "Паспорт РФ 4515 987654",
					snils: "123-456-789 00",
					taxpayerInn: "770399887766",
					registrationAddress: "г. Москва, ул. Ленина, д. 10",
					isAnonymous: false,
				},
			});

			// 2. Анонимный пациент (UUID_ANON) по Постановлению Правительства РФ №659
			await db.insert(patients).values({
				id: ANON_PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "UUID_ANON_9921_АНОНИМ",
				birthDate: "1995-01-01",
				phone: "+79990000000",
				status: "active",
				balanceRub: 0,
				administrativeProfile: {
					isAnonymous: true,
					identityDocument: null,
					snils: null,
					taxpayerInn: null,
				},
			});

			// Услуга коронки керамической: 50 000 ₽
			await db.insert(serviceCatalogItems).values({
				id: SERVICE_CROWN_ID,
				organizationId: ORG_ID,
				code: "A16.07.004.002",
				title: "Коронка из диоксида циркония с нанесением",
				basePriceRub: 50000,
				priceRub: 50000,
				category: "prosthetics",
				isActive: true,
			});

			// План лечения на 50 000 ₽
			await db.insert(treatmentPlans).values({
				id: PLAN_50K_ID,
				organizationId: ORG_ID,
				patientId: IDENT_PATIENT_ID,
				doctorId: DOCTOR_ID,
				title: "План ортопедического лечения (Коронка)",
				name: "Ортопедический план",
				status: "Approved",
				approvedAt: new Date(),
				totalPrice: "50000",
				totalPriceRub: "50000",
				version: 1,
			});

			await db.insert(treatmentPlanItemsNew).values({
				organizationId: ORG_ID,
				planId: PLAN_50K_ID,
				toothNumber: 26,
				priceId: `${SERVICE_CROWN_ID}::Коронка цирконий`,
				quantity: 1,
				price: "50000",
				discount: "0",
				phase: 1,
				isBundle: false,
			});

			// Документ-счет (generatedDocuments) на 50 000 ₽ для сплит-оплаты
			await db.insert(generatedDocuments).values({
				id: ADDENDUM_50K_ID,
				organizationId: ORG_ID,
				patientId: IDENT_PATIENT_ID,
				kind: "payment_invoice",
				status: "issued",
				title: "Счет на оплату № СЧ-50К (ортопедическая коронка)",
				totalAmountRub: 50000,
				issuedAt: new Date(),
			});

			// Счет patientInvoices для возвратов
			await db.insert(patientInvoices).values({
				id: INVOICE_50K_ID,
				organizationId: ORG_ID,
				patientId: IDENT_PATIENT_ID,
				totalRub: "50000.00",
				totalAmountRub: 50000,
				status: "issued",
			});
		});

		clinicToken = signToken({ organizationId: ORG_ID }, authTokenSecret());
		adminToken = signToken(
			{ organizationId: ORG_ID, userId: ADMIN_ID, role: "admin" },
			authTokenSecret(),
		);
		doctorToken = signToken(
			{ organizationId: ORG_ID, userId: DOCTOR_ID, role: "doctor" },
			authTokenSecret(),
		);

		app = createTenantTestApp();
		await registerBillingRoutes(app);
		await registerInvoiceRoutes(app);
		await registerPatientRoutes(app);
		await registerDocumentRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		if (!databaseReady) return;
		await purgeFixtureOrganizations([ORG_ID]);
	});

	// =========================================================================
	// АУДИТ 8.1: СПЛИТ-ОПЛАТА 50 000 ₽ (20K НАЛ + 20K КАРТА + 10K СБП)
	// =========================================================================

	it("AUDIT 8.1: Сплит-оплата 50 000 ₽ (20 000 ₽ нал + 20 000 ₽ карта + 10 000 ₽ СБП): формирование 3 фискальных чеков", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// ЧАСТЬ 1: 20 000 ₽ Наличными в кассу
		const payPart1 = await app.inject({
			method: "POST",
			url: "/api/billing/payments",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				patientId: IDENT_PATIENT_ID,
				documentId: ADDENDUM_50K_ID,
				amountRub: 20000,
				method: "cash",
				clientMutationId: "split-50k-part-1-cash",
				fiscalReceiptNumber: "ФЧ-SPLIT-01-CASH",
				fiscalReceipt: {
					fn: "9999078900011111",
					fd: "1001",
					fpd: "1111111111",
					operationType: "income",
					totalAmountRub: 20000,
				},
				note: "Сплит-оплата счета 50 000 ₽: часть 1 (наличные)",
			},
		});

		assert.equal(payPart1.statusCode, 201, "Часть 1 (наличные 20 000 ₽) обязана быть принята");
		const p1 = JSON.parse(payPart1.body);
		assert.equal(p1.amountRub, 20000);
		assert.equal(p1.method, "cash");

		// ЧАСТЬ 2: 20 000 ₽ Банковской картой
		const payPart2 = await app.inject({
			method: "POST",
			url: "/api/billing/payments",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				patientId: IDENT_PATIENT_ID,
				documentId: ADDENDUM_50K_ID,
				amountRub: 20000,
				method: "card",
				clientMutationId: "split-50k-part-2-card",
				fiscalReceiptNumber: "ФЧ-SPLIT-02-CARD",
				fiscalReceipt: {
					fn: "9999078900011111",
					fd: "1002",
					fpd: "2222222222",
					operationType: "income",
					totalAmountRub: 20000,
				},
				note: "Сплит-оплата счета 50 000 ₽: часть 2 (банковская карта)",
			},
		});

		assert.equal(payPart2.statusCode, 201, "Часть 2 (карта 20 000 ₽) обязана быть принята");
		const p2 = JSON.parse(payPart2.body);
		assert.equal(p2.amountRub, 20000);
		assert.equal(p2.method, "card");

		// ЧАСТЬ 3: 10 000 ₽ Через Систему Быстрых Платежей (СБП)
		const payPart3 = await app.inject({
			method: "POST",
			url: "/api/billing/payments",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				patientId: IDENT_PATIENT_ID,
				documentId: ADDENDUM_50K_ID,
				amountRub: 10000,
				method: "online",
				clientMutationId: "split-50k-part-3-sbp",
				fiscalReceiptNumber: "ФЧ-SPLIT-03-SBP",
				fiscalReceipt: {
					fn: "9999078900011111",
					fd: "1003",
					fpd: "3333333333",
					operationType: "income",
					totalAmountRub: 10000,
				},
				note: "Сплит-оплата счета 50 000 ₽: часть 3 (онлайн через СБП НСПК)",
			},
		});

		assert.equal(payPart3.statusCode, 201, "Часть 3 (СБП 10 000 ₽) обязана быть принята");
		const p3 = JSON.parse(payPart3.body);
		assert.equal(p3.amountRub, 10000);
		assert.equal(p3.method, "online");

		// ПРОВЕРКА ФИСКАЛЬНОЙ ОЧЕРЕДИ 54-ФЗ: ровно 3 отдельных чека 'income'!
		const queuedReceipts = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(fiscalReceiptQueue)
				.where(eq(fiscalReceiptQueue.organizationId, ORG_ID)),
		);

		assert.equal(queuedReceipts.length, 3, "В фискальной очереди обязано быть ровно 3 отдельных чека");
		for (const r of queuedReceipts) {
			assert.equal(r.receiptType, "income", "Признак расчета строго 'income' (Приход, Тег 1054 = 1)");
			assert.equal(r.status, "pending_print", "Чек поставлен в очередь печати 54-ФЗ");
		}

		console.log("\n[SPLIT PAYMENT PROOF] Сплит-оплата счета 50 000 ₽ успешно завершена:");
		console.log(`- Чек 1 (Наличные): 20 000 ₽ [ID: ${queuedReceipts[0]?.id}]`);
		console.log(`- Чек 2 (Карта): 20 000 ₽ [ID: ${queuedReceipts[1]?.id}]`);
		console.log(`- Чек 3 (СБП): 10 000 ₽ [ID: ${queuedReceipts[2]?.id}]`);
	});

	// =========================================================================
	// АУДИТ 8.2: ЗАПРЕТ ПЕРЕПЛАТЫ ПО СЧЕТУ (OVERPAYMENT DEFENSE)
	// =========================================================================

	it("AUDIT 8.2: Попытка внести 4-й платеж сверх 50 000 ₽ блокируется кассой (BillingOverpaymentError)", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// Счет на 50 000 ₽ полностью оплачен (20k + 20k + 10k).
		// Попытка внести еще 1 000 ₽ обязана быть отклонена!
		const payOver = await app.inject({
			method: "POST",
			url: "/api/billing/payments",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				patientId: IDENT_PATIENT_ID,
				documentId: ADDENDUM_50K_ID,
				amountRub: 1000,
				method: "cash",
				clientMutationId: "split-50k-part-4-overpay",
				note: "Попытка переплаты счета сверх 50 000 ₽",
			},
		});

		console.log("\n[AUDIT 8.2 LOG] Попытка переплаты по закрытому сплит-счету:");
		console.log(`HTTP Status: ${payOver.statusCode}`);
		console.log(`Response Body: ${payOver.body}`);

		assert.ok(
			payOver.statusCode === 400 || payOver.statusCode === 409 || payOver.statusCode === 422,
			"Касса обязана заблокировать переплату по закрытому документу (400/409/422)",
		);
		const err = JSON.parse(payOver.body);
		assert.ok(
			err.error === "BillingOverpaymentError" ||
				err.error === "BillingPaymentScopeError" ||
				err.error === "UpsellConsentShieldViolationError",
			"Ошибка классифицирована как переплата / ограничение скоупа",
		);
		console.log("[OVERPAYMENT PROOF] Касса заблокировала избыточный платеж!");
	});

	// =========================================================================
	// АУДИТ 8.3: ВОЗВРАТНЫЕ ЧЕКИ (INCOME_RETURN) И КОНТРОЛЬ БАЛАНСА АВАНСА
	// =========================================================================

	it("AUDIT 8.3: Возвратные чеки (operationType: income_return): запрет закрытия долга и контроль баланса аванса", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// Оформляем частичный возврат 10 000 ₽ по счету INVOICE_50K_ID
		const refundRes = await app.inject({
			method: "POST",
			url: "/api/billing/refunds/partial",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				invoiceId: INVOICE_50K_ID,
				patientId: IDENT_PATIENT_ID,
				paymentMethod: "card",
				cashierFullName: "Старший Кассир",
				reasonCategory: "patient_refusal",
				customReasonDetailsRu: "Отказ от части услуг по ортопедической смете",
				clientMutationId: "refund-50k-part-10k",
				refundRequests: [
					{
						itemId: "item-crown-1",
						quantityToRefund: 1,
						customAmountKopToRefund: 1000000, // 10 000 ₽
						reasonRu: "Коррекция стоимости коронки",
					},
				],
			},
		});

		assert.equal(refundRes.statusCode, 200, "Частичный возврат обязан пройти со статусом 200");
		const refundData = JSON.parse(refundRes.body);
		assert.ok(refundData.fiscalReceiptQueueId);

		// Проверяем запись в fiscalReceiptQueue: receiptType строго 'income_return'!
		const [refundReceipt] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(fiscalReceiptQueue)
				.where(eq(fiscalReceiptQueue.id, refundData.fiscalReceiptQueueId))
				.limit(1),
		);

		assert.ok(refundReceipt);
		assert.equal(refundReceipt.receiptType, "income_return", "Фискальный чек строго 'income_return' (Тег 1054 = 2)");
		assert.equal(refundReceipt.status, "pending_print");

		// Проверяем запись в payments: отрицательная сумма (-10 000 ₽)
		const [refundPayment] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(payments)
				.where(eq(payments.id, refundData.paymentId))
				.limit(1),
		);

		assert.ok(refundPayment);
		assert.equal(Number(refundPayment.amountRub), -10000, "Сумма в payments строго отрицательная (-10 000 ₽)");
		assert.equal(refundPayment.status, "refunded");

		// КОНТРОЛЬ БАЛАНСА АВАНСА: Попытка вернуть больше оставшегося лимита (счет 50 000 ₽, возвращено 10 000 ₽, остаток 40 000 ₽).
		// Попытка вернуть 45 000 ₽ обязана быть отклонена со статусом 422 OverRefundExceeded!
		const overRefundRes = await app.inject({
			method: "POST",
			url: "/api/billing/refunds/partial",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				invoiceId: INVOICE_50K_ID,
				patientId: IDENT_PATIENT_ID,
				paymentMethod: "card",
				clientMutationId: "refund-50k-excess",
				refundRequests: [
					{
						itemId: "item-crown-1",
						quantityToRefund: 1,
						customAmountKopToRefund: 4500000, // 45 000 ₽ при лимите 40 000 ₽!
					},
				],
			},
		});

		assert.ok(
			overRefundRes.statusCode === 400 || overRefundRes.statusCode === 422,
			"Попытка превышения возвращаемого аванса обязана блокироваться (400/422)",
		);
		assert.equal(overRefundRes.json()?.error, "OverRefundExceeded");
		console.log("[INCOME RETURN PROOF] Чек 'income_return' сформирован, контроль лимита возврата подтвержден!");
	});

	// =========================================================================
	// АУДИТ 8.4: ЗАПРЕТ СПРАВОК КНД 1151156 ДЛЯ АНОНИМНЫХ ПАЦИЕНТОВ (PREVIEW)
	// =========================================================================

	it("AUDIT 8.4: Запрет справки для налогового вычета КНД 1151156 для анонимов в GET /api/documents/tax-deduction/preview и /api/billing/tax-deduction", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// 1. Проверка через /api/documents/tax-deduction/preview/:patientId
		const previewDocRes = await app.inject({
			method: "GET",
			url: `/api/documents/tax-deduction/preview/${ANON_PATIENT_ID}?year=2026`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
		});

		assert.equal(previewDocRes.statusCode, 422, "Предпросмотр справки для анонима ОБЯЗАН блокироваться со статусом 422");
		const docPreview = JSON.parse(previewDocRes.body);
		assert.equal(docPreview.error, "Decree659TaxDeductionForbiddenError");
		assert.ok(docPreview.message?.includes("анонимных карт"), "Причина блокировки указывает на запрет анонимных вычетов");

		// 2. Проверка через /api/billing/tax-deduction/preview/:patientId
		const previewBillingRes = await app.inject({
			method: "GET",
			url: `/api/billing/tax-deduction/preview/${ANON_PATIENT_ID}?year=2026`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
		});

		assert.equal(previewBillingRes.statusCode, 422, "Предпросмотр вычета в биллинге для анонима ОБЯЗАН блокироваться 422");
		const billingPreview = JSON.parse(previewBillingRes.body);
		assert.equal(billingPreview.error, "Decree659TaxDeductionForbiddenError");
		console.log("[TAX DEDUCTION PREVIEW PROOF] Запрет предпросмотра КНД 1151156 для анонима подтвержден!");
	});

	// =========================================================================
	// АУДИТ 8.5: ЗАПРЕТ ГЕНЕРАЦИИ XML КНД 1184043 / 1151156 ДЛЯ АНОНИМА
	// =========================================================================

	it("AUDIT 8.5: Запрет генерации XML КНД 1184043 для анонима через /api/documents/tax-deduction/xml и /api/billing/tax-deduction/xml (422)", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const anonXmlPayload = {
			taxInspectionCode: "7701",
			taxYear: 2026,
			certificateKind: "1",
			correctionNumber: 0,
			clinic: {
				inn: "7701234567",
				kpp: "770101001",
				ogrn: "1027700123456",
				name: "ООО СТОМАТОЛОГИЯ ДЕНТЕ",
				directorName: "Смирнов Алексей Владимирович",
			},
			payer: {
				fullName: {
					family: "UUID_ANON_9921_АНОНИМ",
					given: "Пациент",
				},
				birthDate: "1995-01-01",
				isAnonymous: true,
			},
			patient: {
				patientKinshipCode: "1",
				fullName: {
					family: "UUID_ANON_9921_АНОНИМ",
					given: "Пациент",
				},
				birthDate: "1995-01-01",
				isAnonymous: true,
			},
			expenses: {
				code1AmountRub: 15000,
			},
		};

		// 1. Через /api/documents/tax-deduction/xml
		const docXmlRes = await app.inject({
			method: "POST",
			url: "/api/documents/tax-deduction/xml",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
			payload: anonXmlPayload,
		});

		console.log("\n[DEBUG AUDIT 8.5]", docXmlRes.statusCode, docXmlRes.body);
		assert.equal(docXmlRes.statusCode, 422, "Генерация XML на анонима обязана отклоняться со статусом 422");
		assert.equal(docXmlRes.json()?.error, "Decree659TaxDeductionForbiddenError");

		// 2. Через /api/billing/tax-deduction/xml
		const billingXmlRes = await app.inject({
			method: "POST",
			url: "/api/billing/tax-deduction/xml",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: anonXmlPayload,
		});

		assert.equal(billingXmlRes.statusCode, 422, "Генерация XML в биллинге на анонима обязана отклоняться 422");
		assert.equal(billingXmlRes.json()?.error, "Decree659TaxDeductionForbiddenError");
		console.log("[TAX DEDUCTION XML PROOF] Генерация XML КНД 1184043 для анонима заблокирована со статусом 422!");
	});

	// =========================================================================
	// АУДИТ 8.6: ЗАПРЕТ ЭНДПОИНТА /api/billing/tax-deduction ДЛЯ АНОНИМОВ
	// =========================================================================

	it("AUDIT 8.6: POST /api/billing/tax-deduction для анонимного пациента блокируется со статусом 422", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const billingTaxRes = await app.inject({
			method: "POST",
			url: "/api/billing/tax-deduction",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				patientId: ANON_PATIENT_ID,
				year: 2026,
			},
		});

		assert.equal(billingTaxRes.statusCode, 422, "POST /api/billing/tax-deduction для анонима обязан возвращать 422");
		assert.equal(billingTaxRes.json()?.error, "Decree659TaxDeductionForbiddenError");
		console.log("[BILLING TAX DEDUCTION ENDPOINT PROOF] Запрос в /api/billing/tax-deduction заблокирован!");
	});

	// =========================================================================
	// АУДИТ 8.7: ЗАПРЕТ ВЫПУСКА tax_deduction_certificate ДЛЯ АНОНИМОВ
	// =========================================================================

	it("AUDIT 8.7: Создание официального документа tax_deduction_certificate для анонима блокируется 422", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const createDocRes = await app.inject({
			method: "POST",
			url: "/api/documents",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorToken,
			},
			payload: {
				patientId: ANON_PATIENT_ID,
				kind: "tax_deduction_certificate",
				title: "Справка для налогового вычета по форме КНД 1151156",
				taxYear: 2026,
				taxPayerInn: "770399887766",
				payload: {
					taxPaymentSelection: {
						selectedPaymentIds: [fixtureUuid(NAMESPACE, 99)],
					},
				},
			},
		});

		console.log("\n[AUDIT 8.7 LOG] Создание tax_deduction_certificate для анонима:");
		console.log(`HTTP Status: ${createDocRes.statusCode}`);
		console.log(`Response Body: ${createDocRes.body}`);

		assert.equal(createDocRes.statusCode, 422, "Создание tax_deduction_certificate для анонима обязано блокироваться 422");
		assert.equal(createDocRes.json()?.error, "Decree659TaxDeductionForbiddenError");
		console.log("[DOCUMENT CREATION SHIELD PROOF] Блокировка создания tax_deduction_certificate подтверждена!");
	});
});
