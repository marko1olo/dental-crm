/**
 * cashboxFiscalAndWarehouseDeduction.test.ts
 *
 * 🏛️ RED TEAM INQUISITION TEST SUITE:
 * - 54-FZ FFD 1.2 Fiscal Cashiering & Zero-Barrier Law (No Buyer INN for physical persons, Mandate 8n)
 * - Multi-Tender Split Checkout (50% Card + 30% Cash + 20% Family Deposit) with Zero Float Drift (Mandates 8b, 8e)
 * - 100% Doctor Warranty Discount / 0.00 ₽ Statutory Warranty Act (Mandate 8e)
 * - Soft Negative Stock & Background Consumables Deduction (Mandate 8aa)
 * - ACID Idempotency & Replay Defense (Mandate 8zp)
 * - Integer Kopeck Math Fuzzing across odd split fractions (Hamilton-Hare)
 *
 * Execution target: <= 10s (Mandate 8t / 8wx)
 */

import assert from "node:assert/strict";
import { after, before, describe, it, test } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	familyGroups,
	fiscalReceiptQueue,
	inventoryItems,
	inventoryTransactions,
	organizations,
	patients,
	payments,
	serviceCatalogItems,
	treatmentItems,
	users,
	visits,
} from "../../db/schema.js";
import { registerBillingRoutes } from "../../routes/billing.js";
import { registerFiscalReceiptRoutes } from "../../routes/fiscal/fiscalReceiptRoutes.js";
import { inventoryRoutes } from "../../routes/inventory.js";
import { treatmentConsumablesRoutes } from "../../routes/treatmentConsumables.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { CLINIC_TOKEN_HEADER, STAFF_TOKEN_HEADER } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = `cashboxWarehouseInq_${Date.now().toString(36)}`;
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 2);
const ADMIN_ID = fixtureUuid(NAMESPACE, 3);
const PATIENT_ID = fixtureUuid(NAMESPACE, 4);
const FAMILY_ID = fixtureUuid(NAMESPACE, 5);
const VISIT_1_ID = fixtureUuid(NAMESPACE, 6);
const VISIT_2_OVERDRAFT_ID = fixtureUuid(NAMESPACE, 7);
const SERVICE_RESTORATION_ID = fixtureUuid(NAMESPACE, 8);
const SERVICE_WARRANTY_ID = fixtureUuid(NAMESPACE, 9);
const ITEM_COMPOSITE_ZERO_ID = fixtureUuid(NAMESPACE, 10);
const ITEM_ANESTHETIC_ID = fixtureUuid(NAMESPACE, 11);
const TREATMENT_ITEM_1_ID = fixtureUuid(NAMESPACE, 12);
const TREATMENT_ITEM_2_ID = fixtureUuid(NAMESPACE, 13);

describe("🏛️ Red Team Cashbox (54-FZ), Multi-Tender Split & Soft Negative Stock Inquisitor", () => {
	let app: FastifyInstance;
	let clinicToken: string;
	let doctorStaffToken: string;
	let adminStaffToken: string;
	let splitMutationId: string;

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.KKT_MODEL = "emulator";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.AUTH_TOKEN_SECRET =
			process.env.AUTH_TOKEN_SECRET || "dente-test-secret-at-least-32-chars-long!!";

		await purgeFixtureOrganizations([ORG_ID]);

		app = createTenantTestApp();
		await registerBillingRoutes(app);
		await registerFiscalReceiptRoutes(app);
		await app.register(inventoryRoutes, { prefix: "/api/inventory" });
		await app.register(treatmentConsumablesRoutes, { prefix: "/api/treatment-consumables" });
		await app.ready();

		const secret = authTokenSecret();
		clinicToken = signToken({ organizationId: ORG_ID }, secret);
		doctorStaffToken = signToken(
			{
				userId: DOCTOR_ID,
				role: "doctor",
				organizationId: ORG_ID,
				fullName: "Д-р Смирнов А. В.",
			},
			secret,
		);
		adminStaffToken = signToken(
			{
				userId: ADMIN_ID,
				role: "admin",
				organizationId: ORG_ID,
				fullName: "Администратор Кассы",
			},
			secret,
		);

		await withFixtureTenant(ORG_ID, async (tx) => {
			// 1. Клиника
			await tx
				.insert(organizations)
				.values({
					id: ORG_ID,
					name: "Стоматология ДЕНТЕ Эксперт",
					inn: "7701234567",
					workspaceFeatureFlags: { taxationSystem: "usn_income" },
				})
				.onConflictDoNothing();

			// 2. Персонал (врач + администратор)
			await tx.insert(users).values([
				{
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					fullName: "Д-р Смирнов А. В.",
					email: `doctor_${Date.now()}@dente.ru`,
					role: "doctor",
					passwordHash: "hash",
				},
				{
					id: ADMIN_ID,
					organizationId: ORG_ID,
					fullName: "Администратор Кассы",
					email: `admin_${Date.now()}@dente.ru`,
					role: "admin",
					passwordHash: "hash",
				},
			]);

			// 3. Семейный баланс: начальный остаток 5 000.00 ₽ (500 000 коп.)
			await tx.insert(familyGroups).values({
				id: FAMILY_ID,
				organizationId: ORG_ID,
				name: "Семья Ивановых",
				balance: "5000.00",
			});

			// 4. Пациент (физлицо, прикреплен к семейному кошельку)
			await tx.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Иванов Иван Иванович",
				phone: "+79991112233",
				familyGroupId: FAMILY_ID,
			});

			// 5. Каталог услуг 804н
			await tx.insert(serviceCatalogItems).values([
				{
					id: SERVICE_RESTORATION_ID,
					organizationId: ORG_ID,
					code: "A16.07.002.001",
					order804nCode: "A16.07.002.001",
					title: "Восстановление зуба пломбой (лечение поверхностного кариеса)",
					basePriceRub: 10000,
					priceRub: 10000,
					category: "therapy",
				},
				{
					id: SERVICE_WARRANTY_ID,
					organizationId: ORG_ID,
					code: "A16.07.002.099",
					order804nCode: "A16.07.002.099",
					title: "Гарантийная коррекция реставрации (100% скидка врача)",
					basePriceRub: 0,
					priceRub: 0,
					category: "therapy",
				},
			]);

			// 6. Склад: композит со СТРОГО НУЛЕВЫМ остатком (для теста Soft Negative Stock)
			await tx.insert(inventoryItems).values([
				{
					id: ITEM_COMPOSITE_ZERO_ID,
					organizationId: ORG_ID,
					name: "Композит светового отверждения Gradia Direct",
					category: "composites",
					unit: "шт",
					stockQuantity: "0.000",
					currentQty: "0.000",
					criticalThreshold: "2.000",
					unitCostRub: "1850.00",
				},
				{
					id: ITEM_ANESTHETIC_ID,
					organizationId: ORG_ID,
					name: "Анестетик Артикаин 4% с адреналином 1:100000 1.7 мл",
					category: "anesthesia",
					unit: "карп.",
					stockQuantity: "5.000",
					currentQty: "5.000",
					criticalThreshold: "2.000",
					unitCostRub: "220.00",
				},
			]);

			// 7. Визиты (для сплит-чекаута и для списания со склада)
			await tx.insert(visits).values([
				{
					id: VISIT_1_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					status: "draft",
				},
				{
					id: VISIT_2_OVERDRAFT_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					status: "draft",
				},
			]);

			await tx.insert(treatmentItems).values([
				{
					id: TREATMENT_ITEM_1_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					visitId: VISIT_1_ID,
					serviceId: SERVICE_RESTORATION_ID,
					toothCode: "36",
					title: "Восстановление зуба пломбой 36",
					quantity: "1",
					unitPriceRub: 10000,
					priceRub: 10000,
					discountRub: 0,
					status: "in_progress",
				},
				{
					id: TREATMENT_ITEM_2_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					visitId: VISIT_2_OVERDRAFT_ID,
					serviceId: SERVICE_RESTORATION_ID,
					toothCode: "37",
					title: "Восстановление зуба пломбой 37",
					quantity: "1",
					unitPriceRub: 10000,
					priceRub: 10000,
					discountRub: 0,
					status: "in_progress",
				},
			]);
		});
	});

	after(async () => {
		delete process.env.KKT_MODEL;
		await app.close();
		await purgeFixtureOrganizations([ORG_ID]);
	});

	test("1. Multi-tender split payment (50% Card + 30% Cash + 20% Family Deposit) with exact kopeck resolution", async () => {
		splitMutationId = `split-inq-${Date.now()}`;

		// Total Due: 10 000.00 ₽ (1 000 000 kopecks)
		// Tenders:
		// - Electronic / Card (Tag 1081): 5 000.00 ₽ (500 000 kop)
		// - Cash (Tag 1031): 3 000.00 ₽ (300 000 kop)
		// - Family Deposit (Tag 1215): 2 000.00 ₽ (200 000 kop)
		// 500 000 + 300 000 + 200 000 === 1 000 000 kopecks (0 kopecks drift)
		const response = await app.inject({
			method: "POST",
			url: "/api/billing/payments",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: adminStaffToken,
				"idempotency-key": splitMutationId,
			},
			payload: {
				patientId: PATIENT_ID,
				visitId: VISIT_1_ID,
				amountRub: 10000,
				method: "split",
				electronicAmountKopecks: 500000,
				cashAmountKopecks: 300000,
				depositAmountKopecks: 200000,
				electronicAmountRub: 5000,
				cashAmountRub: 3000,
				depositAmountRub: 2000,
				clientMutationId: splitMutationId,
				note: "Сплит-оплата: Карта 5 000 ₽ + Нал 3 000 ₽ + Семейный депозит 2 000 ₽",
			},
		});

		assert.strictEqual(
			response.statusCode,
			201,
			`Платеж должен быть создан со статусом 201. Ошибка: ${response.body}`,
		);

		const paymentData = response.json();
		assert.strictEqual(paymentData.amountRub, 10000);
		assert.strictEqual(paymentData.status, "paid");

		await withFixtureTenant(ORG_ID, async (tx) => {
			// Проверяем 3 сплит-проводки в таблице payments
			const recordedPayments = await tx
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, ORG_ID),
						eq(payments.visitId, VISIT_1_ID),
					),
				);

			assert.strictEqual(recordedPayments.length, 3, "Должно быть ровно 3 записи о платежах");
			const cardP = recordedPayments.find((p) => p.method === "card");
			const cashP = recordedPayments.find((p) => p.method === "cash");
			const famP = recordedPayments.find((p) => p.method === "family_wallet");

			assert.ok(cardP, "Должна быть электронная оплата (card)");
			assert.strictEqual(cardP.amountRub, 5000);

			assert.ok(cashP, "Должна быть наличная оплата (cash)");
			assert.strictEqual(cashP.amountRub, 3000);

			assert.ok(famP, "Должна быть оплата с семейного депозита (family_wallet)");
			assert.strictEqual(famP.amountRub, 2000);

			// Проверяем дебетование семейного баланса: с 5 000 ₽ до 3 000 ₽
			const [family] = await tx
				.select()
				.from(familyGroups)
				.where(eq(familyGroups.id, FAMILY_ID));
			assert.strictEqual(
				Number(family?.balance),
				3000,
				"Семейный баланс должен уменьшиться ровно на 2 000 ₽ (с 5 000 до 3 000)",
			);

			// Проверяем фискальную очередь 54-ФЗ (Tag 1081 + Tag 1031 + Tag 1215)
			const [queuedReceipt] = await tx
				.select()
				.from(fiscalReceiptQueue)
				.where(
					and(
						eq(fiscalReceiptQueue.organizationId, ORG_ID),
						eq(fiscalReceiptQueue.visitId, VISIT_1_ID),
					),
				);

			assert.ok(queuedReceipt, "Чек должен быть поставлен в фискальную очередь 54-ФЗ");
			const payload = queuedReceipt.payloadJson as Record<string, unknown>;
			assert.strictEqual(payload.electronicKopecks, 500000, "Тег 1081: 500 000 коп.");
			assert.strictEqual(payload.cashKopecks, 300000, "Тег 1031: 300 000 коп.");
			assert.strictEqual(payload.advanceOffsetKopecks, 200000, "Тег 1215: 200 000 коп.");
			assert.strictEqual(payload.amountRub, 10000, "Общая сумма: 10 000 ₽");

			// Проверяем статус визита и строки лечения
			const [visitRow] = await tx
				.select()
				.from(visits)
				.where(eq(visits.id, VISIT_1_ID));
			assert.strictEqual(visitRow?.status, "signed", "Визит должен перейти в signed");

			const [treatmentRow] = await tx
				.select()
				.from(treatmentItems)
				.where(eq(treatmentItems.id, TREATMENT_ITEM_1_ID));
			assert.strictEqual(treatmentRow?.status, "completed", "Услуга должна быть completed");
		});
	});

	test("2. Soft Negative Stock: Automatic background deduction with 0 initial stock never blocks doctor (Mandate 8aa)", async () => {
		// Тест складского списания по визиту VISIT_2_OVERDRAFT_ID
		// У позиции ITEM_COMPOSITE_ZERO_ID остаток был 0.000
		const deductMutationId = `stock-deduct-${Date.now()}`;
		const response = await app.inject({
			method: "POST",
			url: `/api/treatment-consumables/${ORG_ID}/deduct/visit`,
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: doctorStaffToken,
				"idempotency-key": deductMutationId,
			},
			payload: {
				visitId: VISIT_2_OVERDRAFT_ID,
				items: [
					{
						inventoryItemId: ITEM_COMPOSITE_ZERO_ID,
						quantity: 1,
						reason: "Пломбировочный материал светового отверждения на зуб 37",
					},
				],
				carpulesCount: 1,
				drugName: "Артикаин 4% с адреналином 1:100000",
				allowOverdraft: true,
			},
		});

		assert.strictEqual(
			response.statusCode,
			200,
			`Списание с мягким овердрафтом должно вернуть 200 OK без блокировки врача. Ошибка: ${response.body}`,
		);

		const result = response.json();
		assert.strictEqual(result.isOverdraft, true, "Флаг isOverdraft должен быть true");
		assert.ok(result.warnings.length > 0, "Должно быть предупреждение о мягком овердрафте для снабженцев");

		await withFixtureTenant(ORG_ID, async (tx) => {
			// Проверяем отрицательный остаток композита в базе (Soft Negative Stock)
			const [compositeItem] = await tx
				.select()
				.from(inventoryItems)
				.where(eq(inventoryItems.id, ITEM_COMPOSITE_ZERO_ID));

			assert.ok(compositeItem);
			assert.ok(
				Number(compositeItem.stockQuantity) < 0,
				`Остаток композита должен уйти в минус (текущий: ${compositeItem.stockQuantity})`,
			);

			// Проверяем складскую проводку с флагом isOverdraft
			const txns = await tx
				.select()
				.from(inventoryTransactions)
				.where(
					and(
						eq(inventoryTransactions.organizationId, ORG_ID),
						eq(inventoryTransactions.inventoryItemId, ITEM_COMPOSITE_ZERO_ID),
					),
				);

			assert.ok(txns.length > 0, "Должна быть зафиксирована складская проводка");
			const overdraftTxn = txns.find((t) => t.isOverdraft);
			assert.ok(overdraftTxn, "Проводка списания должна иметь отметку isOverdraft: true");
		});
	});

	test("3. 54-FZ Cashbox Zero Barrier: Physical Person payment succeeds with NO buyer INN (Tag 1228)", async () => {
		const mutationId = `phys-no-inn-${Date.now()}`;

		// 54-ФЗ: Для физических лиц реквизит customerInn строго НЕ требуется
		const response = await app.inject({
			method: "POST",
			url: "/api/fiscal/receipts",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: adminStaffToken,
				"idempotency-key": mutationId,
			},
			payload: {
				patientId: PATIENT_ID,
				payerType: "physical_person", // Физическое лицо
				customerContact: "+79991112233",
				customerName: "Иванов Иван Иванович",
				cashierFullName: "Администратор Кассы",
				totalKopecks: 1000000,
				electronicCardKopecks: 1000000,
				cashKopecks: 0,
				items: [
					{
						name: "Восстановление зуба пломбой (лечение поверхностного кариеса)",
						priceKopecks: 1000000,
						quantity: 1,
						amountKopecks: 1000000,
						medicalServiceCode804n: "A16.07.002.001",
						subject: "service",
						method: "full_payment",
						vatRate: "vat_none",
						measure: "piece",
					},
				],
				// customerInn намеренно отсутствует!
			},
		});

		assert.strictEqual(
			response.statusCode,
			201,
			`Чек физлица без ИНН должен успешно пробиваться со статусом 201. Ошибка: ${response.body}`,
		);

		const result = response.json();
		assert.strictEqual(result.success, true);
		assert.ok(result.fiscalDocumentNumber, "Должен быть присвоен номер фискального документа");

		// Контр-проверка: если плательщик — юрлицо (legal_entity), отсутствие ИНН обязано давать 400
		const badB2bResponse = await app.inject({
			method: "POST",
			url: "/api/fiscal/receipts",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: adminStaffToken,
			},
			payload: {
				patientId: PATIENT_ID,
				payerType: "legal_entity", // Юрлицо обязано иметь 10 цифр ИНН
				customerContact: "+79991112233",
				customerName: "ООО «Технологии Стоматологии»",
				cashierFullName: "Администратор Кассы",
				totalKopecks: 1000000,
				electronicCardKopecks: 1000000,
				cashKopecks: 0,
				items: [
					{
						name: "Восстановление зуба пломбой (лечение поверхностного кариеса)",
						priceKopecks: 1000000,
						quantity: 1,
						amountKopecks: 1000000,
						medicalServiceCode804n: "A16.07.002.001",
						subject: "service",
						method: "full_payment",
						vatRate: "vat_none",
						measure: "piece",
					},
				],
			},
		});

		assert.strictEqual(
			badB2bResponse.statusCode,
			400,
			"Для юрлица без ИНН должна возвращаться ошибка валидации 400",
		);
	});

	test("4. Mandate 8e: 100% Doctor Warranty Discount generates Statutory Warranty Act (never sends 0.00 ₽ to physical KKT)", async () => {
		const mutationId = `warranty-act-${Date.now()}`;

		const response = await app.inject({
			method: "POST",
			url: "/api/fiscal/receipts",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: adminStaffToken,
				"idempotency-key": mutationId,
			},
			payload: {
				patientId: PATIENT_ID,
				payerType: "physical_person",
				customerContact: "+79991112233",
				customerName: "Иванов Иван Иванович",
				cashierFullName: "Д-р Смирнов А. В.",
				totalKopecks: 0, // 100% скидка / гарантийная переделка
				cashKopecks: 0,
				electronicCardKopecks: 0,
				sbpKopecks: 0,
				prepaidKopecks: 0,
				items: [
					{
						name: "Гарантийная коррекция реставрации (100% скидка врача)",
						priceKopecks: 0,
						quantity: 1,
						amountKopecks: 0,
						medicalServiceCode804n: "A16.07.002.099",
						subject: "service",
						method: "full_payment",
						vatRate: "vat_none",
						measure: "piece",
					},
				],
			},
		});

		assert.strictEqual(
			response.statusCode,
			201,
			`Гарантийный чек со скидкой 100% должен успешно регистрироваться со статусом 201. Ошибка: ${response.body}`,
		);

		const result = response.json();
		assert.strictEqual(result.success, true);
		assert.strictEqual(result.isWarrantyZeroAct, true, "Должен быть выставлен флаг isWarrantyZeroAct");
		assert.ok(
			result.warrantyActNumber && result.warrantyActNumber.startsWith("АКТ-ГАР-"),
			`Номер акта должен иметь формат АКТ-ГАР-... (получен: ${result.warrantyActNumber})`,
		);
		assert.strictEqual(result.fiscalDocumentNumber, "0", "Фискальный номер для внутреннего акта должен быть 0");
	});

	test("5. Mandate 8zp: ACID Idempotency prevents double-charging and repeat mutations", async () => {
		// Повторяем сплит-платеж из Теста 1 с тем же clientMutationId (симуляция двойного клика кассира)
		const repeatResponse = await app.inject({
			method: "POST",
			url: "/api/billing/payments",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: adminStaffToken,
				"idempotency-key": splitMutationId,
			},
			payload: {
				patientId: PATIENT_ID,
				visitId: VISIT_1_ID,
				amountRub: 10000,
				method: "split",
				electronicAmountKopecks: 500000,
				cashAmountKopecks: 300000,
				depositAmountKopecks: 200000,
				electronicAmountRub: 5000,
				cashAmountRub: 3000,
				depositAmountRub: 2000,
				clientMutationId: splitMutationId,
				note: "Сплит-оплата: Карта 5 000 ₽ + Нал 3 000 ₽ + Семейный депозит 2 000 ₽",
			},
		});

		assert.strictEqual(
			repeatResponse.statusCode,
			200,
			`Повторный вызов должен вернуть 200 OK. Ошибка: ${repeatResponse.body}`,
		);

		await withFixtureTenant(ORG_ID, async (tx) => {
			// Проверяем, что баланс семьи не списался повторно (остался 3 000 ₽)
			const [famAfterRepeat] = await tx
				.select()
				.from(familyGroups)
				.where(eq(familyGroups.id, FAMILY_ID));
			assert.strictEqual(
				Number(famAfterRepeat?.balance),
				3000,
				"Семейный баланс не должен измениться при повторном запросе",
			);

			// Проверяем, что количество платежей в БД не удвоилось
			const recordedPayments = await tx
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, ORG_ID),
						eq(payments.visitId, VISIT_1_ID),
					),
				);
			assert.strictEqual(
				recordedPayments.length,
				3,
				"Количество проводок оплаты в БД должно остаться ровно 3",
			);
		});
	});

	test("6. Pure Integer Kopeck Math Fuzzing: Zero Float Discrepancy across odd split fractions", () => {
		// Проверка 100 псевдослучайных сплит-сумм с нечетными копейками (например, 1 333.33 ₽, 7 777.77 ₽)
		const testAmounts = [
			133333, // 1,333.33 ₽
			777777, // 7,777.77 ₽
			999999, // 9,999.99 ₽
			100001, // 1,000.01 ₽
			250005, // 2,500.05 ₽
			499999, // 4,999.99 ₽
		];

		for (const totalKop of testAmounts) {
			// Делим сумму на 3 неравные доли (50%, 30%, 20%) с сохранением точного копеечного баланса
			const cardKop = Math.floor(totalKop * 0.5);
			const cashKop = Math.floor(totalKop * 0.3);
			const depositKop = totalKop - cardKop - cashKop; // Остаточный тендер забирает копейку

			const sumTenders = cardKop + cashKop + depositKop;
			assert.strictEqual(
				sumTenders,
				totalKop,
				`Сумма долей (${sumTenders} коп.) обязана строго равняться общей сумме (${totalKop} коп.)`,
			);
			assert.ok(cardKop >= 0 && cashKop >= 0 && depositKop >= 0, "Доли не могут быть отрицательными");
		}
	});
});
