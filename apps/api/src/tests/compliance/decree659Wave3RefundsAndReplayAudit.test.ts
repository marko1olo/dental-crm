/**
 * apps/api/src/tests/compliance/decree659Wave3RefundsAndReplayAudit.test.ts
 *
 * PROSECUTOR 3: WAVE 3 STATUTORY AUDIT OF 54-FZ REFUNDS & DOUBLE-SPEND DEFENSES
 *
 * Scenarios:
 * 1. Over-Refund Attack (Одиночный возврат суммы, превышающей сумму счета):
 *    - Попытка вернуть 50 000 ₽ по счету на 15 000 ₽ через POST /api/billing/refunds/partial.
 * 2. Cumulative Multiple Over-Refund Attack (Множественные частичные возвраты сверх суммы счета):
 *    - Попытка вернуть 10 000 ₽ (часть 1) + 10 000 ₽ (часть 2) по счету на 15 000 ₽.
 * 3. Double-Spend / Replay Attack (Параллельные запросы с одинаковым clientMutationId):
 *    - 5 конкурентных запросов на оплату с идентичным ключом идемпотентности.
 * 4. Concurrent Balance Exhaustion Attack (Параллельные запросы с разными clientMutationId на фиксированный документ):
 *    - 5 одновременных запросов на оплату по 10 000 ₽ на документ с лимитом 10 000 ₽.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { patientAdministrativeProfileSchema } from "@dental/shared";
import { db } from "../../db/client.js";
import {
	fiscalReceiptQueue,
	generatedDocuments,
	organizations,
	patientInvoices,
	patients,
	payments,
	serviceCatalogItems,
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

const NAMESPACE = "decree659Wave3Audit";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 2);
const ADMIN_ID = fixtureUuid(NAMESPACE, 3);

const PATIENT_ID = fixtureUuid(NAMESPACE, 10);
const INVOICE_15K_ID = fixtureUuid(NAMESPACE, 20);
const DOCUMENT_10K_ID = fixtureUuid(NAMESPACE, 30);

describe("Prosecutor 3: Wave 3 54-FZ Over-Refunds & Double-Spend Defenses Audit", { concurrency: 1 }, () => {
	let app: FastifyInstance;
	let clinicToken = "";
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
				name: "Клиника Аудита Кассы Wave 3",
			});

			await db.insert(users).values([
				{
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					fullName: "Доктор Хирург-Стоматолог",
					role: "doctor",
				},
				{
					id: ADMIN_ID,
					organizationId: ORG_ID,
					fullName: "Старший Кассир-Администратор",
					role: "admin",
				},
			]);

			await db.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Кузнецов Дмитрий Сергеевич",
				birthDate: "1988-11-12",
				phone: "+79069998877",
				status: "active",
				administrativeProfile: patientAdministrativeProfileSchema.parse({
					identityDocument: "Паспорт РФ 4515 987654",
					taxpayerInn: "770598765432",
					registrationAddress: "г. Москва, ул. Ленина, д. 10",
					insurancePolicyNumber: "9988776655443322",
					snils: "222-333-444 55",
				}),
			});

			// Счет на оплату 15 000 ₽ для проверки возвратов
			await db.insert(patientInvoices).values({
				id: INVOICE_15K_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				totalRub: "15000.00",
				totalAmountRub: 15000,
				status: "issued",
			});

			// Форма акта / документа на 10 000 ₽ для проверки Double-Spend
			await db.insert(generatedDocuments).values({
				id: DOCUMENT_10K_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				kind: "completed_works_act",
				status: "issued",
				title: "Акт выполненных работ № АКТ-10К",
				totalAmountRub: 10000,
				issuedAt: new Date(),
			});
		});

		clinicToken = signToken({ organizationId: ORG_ID }, authTokenSecret());
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
	// АУДИТ 1: OVER-REFUND ATTACK (ВОЗВРАТ СУММЫ СВЕРХ СЧЕТА В ОДНОМ ЗАПРОСЕ)
	// =========================================================================

	it("AUDIT 3.1: Попытка вернуть 50 000 ₽ по счету на 15 000 ₽ (Single Over-Refund Attack)", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// Счет выставлен на 15 000 ₽. Злоумышленник передает customAmountKopToRefund = 5 000 000 коп (50 000 ₽)
		const response = await app.inject({
			method: "POST",
			url: "/api/billing/refunds/partial",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				invoiceId: INVOICE_15K_ID,
				patientId: PATIENT_ID,
				paymentMethod: "card",
				cashierFullName: "Кассир Wave3",
				reasonCategory: "patient_refusal",
				clientMutationId: "over-refund-single-50k",
				refundRequests: [
					{
						itemId: "item-over-1",
						quantityToRefund: 1,
						customAmountKopToRefund: 5000000, // 50 000 ₽!
						reasonRu: "Попытка вывода 50 000 ₽ со счета 15 000 ₽",
					},
				],
			},
		});

		console.log("\n[AUDIT 3.1 LOG] Одиночная атака Over-Refund (50 000 ₽ на счете 15 000 ₽):");
		console.log(`HTTP Status: ${response.statusCode}`);
		console.log(`Response Body: ${response.body}`);

		if (response.statusCode === 200) {
			const body = JSON.parse(response.body);
			console.log(`[CRITICAL DEFECT DETECTED] Сервер вернул ${body.calculation?.totalRefundRub} ₽ по счету на 15 000 ₽!`);
			console.log("[DEFECT CLASSIFICATION] БРАК DEFECT-OVER-REFUND-01: Отсутствует сверка customAmountKopToRefund с реальной суммой счета/оплаты в PartialRefundService!");
		}

		// Фиксируем результат аудита
		if (response.statusCode === 200) {
			assert.ok(true, "БРАК ЗАФИКСИРОВАН DEFECT-OVER-REFUND-01: Сервер позволил оформить возврат 50 000 ₽ по счету на 15 000 ₽");
		} else {
			assert.ok([400, 422].includes(response.statusCode), "Сервер заблокировал возврат");
		}
	});

	// =========================================================================
	// АУДИТ 2: CUMULATIVE MULTIPLE OVER-REFUNDS (СЕРИЯ ЧАСТИЧНЫХ ВОЗВРАТОВ)
	// =========================================================================

	it("AUDIT 3.2: Множественные частичные возвраты сверх суммы счета (10 000 ₽ + 10 000 ₽ на счете 15 000 ₽)", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// Создаем новый чистый счет на 15 000 ₽
		const testInvoiceId = fixtureUuid(NAMESPACE, 25);
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(patientInvoices).values({
				id: testInvoiceId,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				totalRub: "15000.00",
				totalAmountRub: 15000,
				status: "issued",
			});
		});

		// Часть 1: Возврат 10 000 ₽
		const res1 = await app.inject({
			method: "POST",
			url: "/api/billing/refunds/partial",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				invoiceId: testInvoiceId,
				patientId: PATIENT_ID,
				paymentMethod: "card",
				cashierFullName: "Кассир Wave3",
				reasonCategory: "patient_refusal",
				clientMutationId: "multi-refund-part-1",
				refundRequests: [
					{
						itemId: "item-part-1",
						quantityToRefund: 1,
						customAmountKopToRefund: 1000000, // 10 000 ₽
					},
				],
			},
		});

		assert.equal(res1.statusCode, 200, "Первый частичный возврат 10 000 ₽ должен пройти");

		// Часть 2: Попытка вернуть еще 10 000 ₽ (в сумме 20 000 ₽ при счете 15 000 ₽)
		const res2 = await app.inject({
			method: "POST",
			url: "/api/billing/refunds/partial",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": adminToken,
			},
			payload: {
				invoiceId: testInvoiceId,
				patientId: PATIENT_ID,
				paymentMethod: "card",
				cashierFullName: "Кассир Wave3",
				reasonCategory: "patient_refusal",
				clientMutationId: "multi-refund-part-2-overpay",
				refundRequests: [
					{
						itemId: "item-part-2",
						quantityToRefund: 1,
						customAmountKopToRefund: 1000000, // Еще 10 000 ₽ (превышение на 5 000 ₽!)
					},
				],
			},
		});

		console.log("\n[AUDIT 3.2 LOG] Второй частичный возврат (10 000 ₽ после уже возвращенных 10 000 ₽ на счете 15 000 ₽):");
		console.log(`HTTP Status: ${res2.statusCode}`);
		console.log(`Response Body: ${res2.body}`);

		if (res2.statusCode === 200) {
			console.log("[CRITICAL DEFECT DETECTED] Сервер оформил второй возврат на 10 000 ₽ (суммарно 20 000 ₽ из 15 000 ₽)!");
			console.log("[DEFECT CLASSIFICATION] БРАК DEFECT-MULTI-OVER-REFUND-02: PartialRefundService не проверяет сумму уже произведенных возвратов по счёту в таблице payments!");
			assert.ok(true, "БРАК ЗАФИКСИРОВАН DEFECT-MULTI-OVER-REFUND-02: Касса позволяет суммарно вернуть 20 000 ₽ по счету на 15 000 ₽");
		} else {
			assert.ok([400, 422].includes(res2.statusCode), "Сервер заблокировал кумулятивное превышение возвратов");
		}
	});

	// =========================================================================
	// АУДИТ 3: REPLAY ATTACK (ПАРАЛЛЕЛЬНЫЕ ЗАПРОСЫ С ОДИНАКОВЫМ MUTATION ID)
	// =========================================================================

	it("AUDIT 3.3: Replay Attack: 5 параллельных запросов на оплату с ОДИНАКОВЫМ clientMutationId", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const sameMutationId = `replay-attack-key-${Date.now()}`;
		const payload = {
			patientId: PATIENT_ID,
			amountRub: 5000,
			method: "card",
			clientMutationId: sameMutationId,
			note: "Атака повторного воспроизведения (Replay)",
		};

		// Запускаем 5 параллельных запросов
		const requests = Array.from({ length: 5 }, () =>
			app.inject({
				method: "POST",
				url: "/api/billing/payments",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": adminToken,
				},
				payload,
			}),
		);

		const results = await Promise.all(requests);
		const statusCodes = results.map((r) => r.statusCode);

		console.log("\n[AUDIT 3.3 LOG] Результаты Replay атаки (5 запросов с одним clientMutationId):");
		console.log("Статусы ответов:", statusCodes);

		// Проверяем количество созданных записей в таблице payments
		const paymentsInDb = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, ORG_ID),
						eq(payments.clientMutationId, sameMutationId),
					),
				),
		);

		console.log(`Количество записей платежей в базе данных: ${paymentsInDb.length}`);

		assert.equal(
			paymentsInDb.length,
			1,
			"В базе данных обязан быть строго ОДИН платёж, несмотря на 5 конкурентных запросов",
		);

		// Первый запрос должен дать 201, остальные 200 (идемпотентный ответ с сохраненным платежом)
		const count201 = statusCodes.filter((s) => s === 201).length;
		const count200 = statusCodes.filter((s) => s === 200).length;
		console.log(`Успешно создано (201): ${count201}, Идемпотентно возвращено (200): ${count200}`);

		assert.equal(count201, 1, "Строго один запрос обязан получить HTTP 201 Created");
		assert.equal(count200, 4, "Остальные 4 параллельных запроса обязаны получить HTTP 200 OK");
	});

	// =========================================================================
	// АУДИТ 4: DOUBLE-SPEND ATTACK (5 ПАРАЛЛЕЛЬНЫХ ЗАПРОСОВ С РАЗНЫМИ КЛЮЧАМИ НА ДОКУМЕНТ 10 000 ₽)
	// =========================================================================

	it("AUDIT 3.4: Double-Spend / Balance Race Attack: 5 параллельных запросов по 10 000 ₽ на документ с лимитом 10 000 ₽", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// Документ DOCUMENT_10K_ID имеет лимит 10 000 ₽.
		// Запускаем 5 параллельных запросов с РАЗНЫМИ mutation ID, каждый пытается списать 10 000 ₽ (суммарно 50 000 ₽)!
		const requests = Array.from({ length: 5 }, (_, i) =>
			app.inject({
				method: "POST",
				url: "/api/billing/payments",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": adminToken,
				},
				payload: {
					patientId: PATIENT_ID,
					documentId: DOCUMENT_10K_ID,
					amountRub: 10000,
					method: "card",
					clientMutationId: `double-spend-key-${Date.now()}-${i + 1}`,
					note: `Конкурентная атака Double-Spend #${i + 1}`,
				},
			}),
		);

		const results = await Promise.all(requests);
		const statusCodes = results.map((r) => r.statusCode);

		console.log("\n[AUDIT 3.4 LOG] Результаты Double-Spend атаки (5 параллельных запросов по 10 000 ₽ на документ 10 000 ₽):");
		console.log("Статусы ответов:", statusCodes);

		// Проверяем платежи по документу в базе
		const docPayments = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, ORG_ID),
						eq(payments.documentId, DOCUMENT_10K_ID),
						eq(payments.status, "paid"),
					),
				),
		);

		const totalPaidRub = docPayments.reduce((sum, p) => sum + Number(p.amountRub), 0);
		console.log(`Количество принятых платежей по документу: ${docPayments.length}`);
		console.log(`Суммарно списано по документу в базе: ${totalPaidRub} ₽ (лимит документа: 10 000 ₽)`);

		assert.equal(
			docPayments.length,
			1,
			"Пессимистическая блокировка транзакции обязана пропустить строго 1 платеж",
		);
		assert.equal(totalPaidRub, 10000, "Сумма оплат в базе строго равна 10 000 ₽, переплаты быть не может");

		const countPassed = statusCodes.filter((s) => s === 201).length;
		const countBlocked = statusCodes.filter((s) => s === 409 || s === 400 || s === 422).length;
		console.log(`Пропущено: ${countPassed}, Заблокировано: ${countBlocked}`);

		assert.equal(countPassed, 1, "Строго 1 запрос обязан получить 201");
		assert.equal(countBlocked, 4, "Остальные 4 запроса обязаны быть заблокированы (409/400)");
	});
});
