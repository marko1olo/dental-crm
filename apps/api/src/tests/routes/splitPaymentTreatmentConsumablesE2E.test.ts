/**
 * splitPaymentTreatmentConsumablesE2E.test.ts
 *
 * Full End-to-End Integration Test for:
 * "Treatment Plan Payment -> 54-FZ Cash Desk -> Split Payments (Card + SBP + Family Deposit) -> Warehouse Auto-Deductions".
 *
 * Statutory Scenario:
 * - Tooth 48 extraction: 9,000.00 ₽
 * - Split Payment:
 *   * Card (Tag 1081): 5,000.00 ₽ (500,000 kopecks)
 *   * SBP (Tag 1081): 3,000.00 ₽ (300,000 kopecks)
 *   * Family Deposit (Tag 1215): 1,000.00 ₽ (100,000 kopecks)
 * - Zero kopeck discrepancy: Sum of tenders (900,000 kop) === Total Due (900,000 kop).
 * - Family balance debited by 1,000.00 ₽.
 * - Visit status transitioned to "signed".
 * - Treatment item status transitioned to "completed".
 * - Consumables automatically deducted from warehouse:
 *   * Articaine carpule (1 carpule)
 *   * Surgical suture PTFE (1 unit)
 *   * Sterile PPE kit (pairs/units)
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { eq, and } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	familyGroups,
	fiscalReceiptQueue,
	inventoryItems,
	inventoryTransactions,
	medicalWasteLogs,
	organizations,
	patients,
	payments,
	serviceCatalogItems,
	treatmentItems,
	users,
	visits,
} from "../../db/schema.js";
import { registerBillingRoutes } from "../../routes/billing.js";
import { inventoryRoutes } from "../../routes/inventory.js";
import { treatmentConsumablesRoutes } from "../../routes/treatmentConsumables.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = `splitPayConsum_${Date.now()}`;
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 2);
const PATIENT_ID = fixtureUuid(NAMESPACE, 3);
const FAMILY_ID = fixtureUuid(NAMESPACE, 4);
const VISIT_ID = fixtureUuid(NAMESPACE, 5);
const SERVICE_ID = fixtureUuid(NAMESPACE, 6);
const ITEM_ARTICAINE_ID = fixtureUuid(NAMESPACE, 7);
const ITEM_SUTURE_ID = fixtureUuid(NAMESPACE, 8);
const ITEM_PPE_ID = fixtureUuid(NAMESPACE, 9);

describe("E2E Integration: Split Payment (Card + SBP + Family Deposit) -> 54-FZ Receipt -> Warehouse Auto-Deductions", () => {
	let app: FastifyInstance;
	let clinicToken = "";
	let staffToken = "";

	before(async () => {
		process.env.NODE_ENV = "test";
		await purgeFixtureOrganizations([ORG_ID]);

		app = createTenantTestApp();
		await registerBillingRoutes(app);
		await app.register(inventoryRoutes, { prefix: "/api/inventory" });
		await app.register(treatmentConsumablesRoutes, { prefix: "/api/treatment-consumables" });
		await app.ready();

		const secret = authTokenSecret();
		clinicToken = signToken({ organizationId: ORG_ID }, secret);
		staffToken = signToken(
			{
				userId: DOCTOR_ID,
				role: "doctor",
				organizationId: ORG_ID,
				fullName: "Доктор Хирург-Стоматолог",
			},
			secret,
		);

		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx
				.insert(organizations)
				.values({
					id: ORG_ID,
					name: "Стоматология ДЕНТЕ Эксперт",
					inn: "7701234567",
				})
				.onConflictDoNothing();

			await tx.insert(users).values({
				id: DOCTOR_ID,
				organizationId: ORG_ID,
				fullName: "Доктор Хирург-Стоматолог",
				email: "surgeon@dente.ru",
				role: "doctor",
				passwordHash: "hash",
			});

			// 1. Создаем семейную группу с балансом 2,500.00 ₽
			await tx.insert(familyGroups).values({
				id: FAMILY_ID,
				organizationId: ORG_ID,
				name: "Семья Ивановых",
				balance: "2500.00",
			});

			// 2. Создаем пациента, привязанного к семье
			await tx.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Иванов Иван Иванович",
				phone: "+79991234567",
				familyGroupId: FAMILY_ID,
			});

			// 3. Создаем услугу "Удаление постоянного зуба (зуб 48)"
			await tx.insert(serviceCatalogItems).values({
				id: SERVICE_ID,
				organizationId: ORG_ID,
				code: "A16.07.001.001",
				order804nCode: "A16.07.001.001",
				title: "Хирургическое удаление постоянного зуба 48 с ревизией лунки",
				basePriceRub: 9000,
				priceRub: 9000,
				category: "surgery",
			});

			// 4. Создаем позиции склада (номенклатуру и начальный остаток)
			await tx.insert(inventoryItems).values([
				{
					id: ITEM_ARTICAINE_ID,
					organizationId: ORG_ID,
					name: "Анестетик артикаиновый 4% с эпинефрином 1:100000 1.7 мл",
					category: "anesthesia",
					unit: "карп.",
					stockQuantity: "10.000",
					currentQty: "10.000",
					criticalThreshold: "2.000",
					unitCostRub: "220.00",
				},
				{
					id: ITEM_SUTURE_ID,
					organizationId: ORG_ID,
					name: "Шовный материал монофиламентный PTFE / Пролен 4-0",
					category: "surgery",
					unit: "шт.",
					stockQuantity: "10.000",
					currentQty: "10.000",
					criticalThreshold: "2.000",
					unitCostRub: "340.00",
				},
				{
					id: ITEM_PPE_ID,
					organizationId: ORG_ID,
					name: "Перчатки нитриловые неопудренные (пара)",
					category: "ppe",
					unit: "пары",
					stockQuantity: "20.000",
					currentQty: "20.000",
					criticalThreshold: "4.000",
					unitCostRub: "35.00",
				},
			]);

			// 5. Создаем визит со статусом draft
			await tx.insert(visits).values({
				id: VISIT_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				status: "draft",
			});

			// 6. Добавляем позицию лечения в наряд приёма
			await tx.insert(treatmentItems).values({
				id: fixtureUuid(NAMESPACE, 10),
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				visitId: VISIT_ID,
				serviceId: SERVICE_ID,
				toothCode: "48",
				title: "Хирургическое удаление постоянного зуба 48 с ревизией лунки",
				quantity: "1",
				unitPriceRub: 9000,
				priceRub: 9000,
				discountRub: 0,
				status: "in_progress",
			});
		});
	});

	after(async () => {
		await app.close();
		await purgeFixtureOrganizations([ORG_ID]);
	});

	test("Target Scenario: Tooth 48 extraction 9,000 ₽ (Card 5k + SBP 3k + Family Deposit 1k) -> Warehouse Auto-Deductions", async () => {
		const mutationId = `split-e2e-${Date.now()}`;

		// 1. Выполняем сплит-оплату через POST /api/billing/payments
		// 9 000 ₽ всего: 8 000 ₽ безналичные (5 000 ₽ карта + 3 000 ₽ СБП), 1 000 ₽ семейный депозит
		const response = await app.inject({
			method: "POST",
			url: "/api/billing/payments",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": staffToken,
				"idempotency-key": mutationId,
			},
			payload: {
				patientId: PATIENT_ID,
				visitId: VISIT_ID,
				amountRub: 9000,
				method: "split",
				electronicAmountKopecks: 800000, // 8,000.00 ₽ (5,000 Card + 3,000 SBP)
				depositAmountKopecks: 100000,    // 1,000.00 ₽ Family Deposit (Tag 1215)
				electronicAmountRub: 8000,
				depositAmountRub: 1000,
				clientMutationId: mutationId,
				note: "Комбинированная оплата (Доктор Хирург-Стоматолог): карта 5000 ₽ + СБП 3000 ₽ + аванс 1000 ₽ [ДДС: Оплата услуг | Касса: Основная касса]",
			},
		});

		assert.strictEqual(
			response.statusCode,
			201,
			`Платеж должен быть создан со статусом 201. Ошибка: ${response.body}`,
		);

		const paymentData = response.json();
		assert.strictEqual(paymentData.amountRub, 9000);
		assert.strictEqual(paymentData.status, "paid");

		// 2. Проверяем записи в БД под RLS тенанта
		await withFixtureTenant(ORG_ID, async (tx) => {
			const recordedPayments = await tx
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, ORG_ID),
						eq(payments.visitId, VISIT_ID),
					),
				);

			// Созданы 2 сплит-проводки: электронная (8 000 ₽) и с семейного кошелька (1 000 ₽)
			assert.strictEqual(recordedPayments.length, 2, "Должно быть записано ровно 2 сплит-проводки");
			const electronicPayment = recordedPayments.find((p) => p.method === "card");
			const depositPayment = recordedPayments.find((p) => p.method === "family_wallet");

			assert.ok(electronicPayment, "Должна быть электронная оплата (card / SBP)");
			assert.strictEqual(electronicPayment.amountRub, 8000, "Сумма по карте + СБП должна быть 8 000 ₽");

			assert.ok(depositPayment, "Должна быть оплата с семейного депозита (family_wallet)");
			assert.strictEqual(depositPayment.amountRub, 1000, "Сумма с семейного депозита должна быть 1 000 ₽");

			// 3. Проверяем дебетование баланса семьи
			const [updatedFamily] = await tx
				.select()
				.from(familyGroups)
				.where(
					and(
						eq(familyGroups.id, FAMILY_ID),
						eq(familyGroups.organizationId, ORG_ID),
					),
				);

			assert.ok(updatedFamily);
			assert.strictEqual(
				Number(updatedFamily.balance),
				1500,
				"Семейный баланс должен уменьшиться ровно на 1 000 ₽ (с 2 500 ₽ до 1 500 ₽)",
			);

			// 4. Проверяем очередь фискализации 54-ФЗ (Tag 1081 + Tag 1215)
			const [queuedReceipt] = await tx
				.select()
				.from(fiscalReceiptQueue)
				.where(
					and(
						eq(fiscalReceiptQueue.organizationId, ORG_ID),
						eq(fiscalReceiptQueue.visitId, VISIT_ID),
					),
				);

			assert.ok(queuedReceipt, "Чек 54-ФЗ должен быть поставлен в очередь печати");
			const payload = queuedReceipt.payloadJson as Record<string, unknown>;
			assert.strictEqual(payload.electronicKopecks, 800000, "Тег 1081 (безнал): 800 000 копеек");
			assert.strictEqual(payload.advanceOffsetKopecks, 100000, "Тег 1215 (зачет аванса): 100 000 копеек");
			assert.strictEqual(payload.amountRub, 9000, "Общая сумма чека: 9 000 ₽");

			// 5. Проверяем статус визита: переведен в signed
			const [updatedVisit] = await tx
				.select()
				.from(visits)
				.where(
					and(
						eq(visits.id, VISIT_ID),
						eq(visits.organizationId, ORG_ID),
					),
				);

			assert.ok(updatedVisit);
			assert.strictEqual(updatedVisit.status, "signed", "Визит должен быть закрыт и подписан (signed)");

			// 6. Проверяем статус позиции лечения: переведен в completed
			const [updatedTreatmentItem] = await tx
				.select()
				.from(treatmentItems)
				.where(
					and(
						eq(treatmentItems.organizationId, ORG_ID),
						eq(treatmentItems.visitId, VISIT_ID),
					),
				);

			assert.ok(updatedTreatmentItem);
			assert.strictEqual(updatedTreatmentItem.status, "completed", "Услуга удаления зуба должна быть completed");

			// 7. Проверяем автоматическое списание материалов со склада (BOM зуба 48)
			const [articaineItem] = await tx
				.select()
				.from(inventoryItems)
				.where(eq(inventoryItems.id, ITEM_ARTICAINE_ID));
			assert.ok(articaineItem);
			assert.strictEqual(
				Number(articaineItem.stockQuantity),
				9,
				"Остаток карпул артикаина должен уменьшиться с 10 до 9",
			);

			const [sutureItem] = await tx
				.select()
				.from(inventoryItems)
				.where(eq(inventoryItems.id, ITEM_SUTURE_ID));
			assert.ok(sutureItem);
			assert.strictEqual(
				Number(sutureItem.stockQuantity),
				9,
				"Остаток шовного материала должен уменьшиться с 10 до 9",
			);

			const [ppeItem] = await tx
				.select()
				.from(inventoryItems)
				.where(eq(inventoryItems.id, ITEM_PPE_ID));
			assert.ok(ppeItem);
			assert.strictEqual(
				Number(ppeItem.stockQuantity),
				18,
				"Остаток перчаток (2 пары по СанПиН) должен уменьшиться с 20 до 18",
			);

			// 8. Проверяем проводки складского движения
			const warehouseTxns = await tx
				.select()
				.from(inventoryTransactions)
				.where(
					and(
						eq(inventoryTransactions.organizationId, ORG_ID),
						eq(inventoryTransactions.visitId, VISIT_ID),
					),
				);

			assert.ok(warehouseTxns.length >= 3, "Должно быть как минимум 3 складские проводки");
			const articaineTxn = warehouseTxns.find((t) => t.inventoryItemId === ITEM_ARTICAINE_ID);
			const sutureTxn = warehouseTxns.find((t) => t.inventoryItemId === ITEM_SUTURE_ID);
			const ppeTxn = warehouseTxns.find((t) => t.inventoryItemId === ITEM_PPE_ID);

			assert.ok(articaineTxn, "Должна быть проводка по артикаину");
			assert.strictEqual(articaineTxn.transactionType, "auto_deduct");
			assert.strictEqual(articaineTxn.isOverdraft, false);

			assert.ok(sutureTxn, "Должна быть проводка по шовному материалу");
			assert.strictEqual(sutureTxn.transactionType, "auto_deduct");
			assert.strictEqual(sutureTxn.isOverdraft, false);

			assert.ok(ppeTxn, "Должна быть проводка по перчаткам");
			assert.strictEqual(ppeTxn.transactionType, "auto_deduct");
			assert.strictEqual(ppeTxn.isOverdraft, false);

			// Мандат 8e Soft Overdraft: сопутствующие позиции по техкарте 804н без начального остатка списываются как emergency_overdraft без сбоя
			const overdraftTxns = warehouseTxns.filter((t) => t.isOverdraft);
			assert.ok(
				overdraftTxns.length > 0,
				"Мандат 8e: незаведенные сопутствующие материалы фиксируются как мягкий овердрафт без блокировки врача",
			);

			// 9. Проверяем фиксацию в журнале СанПиН медотходов класса Б (СанПиН 2.1.3684-21)
			const wasteRecords = await tx
				.select()
				.from(medicalWasteLogs)
				.where(
					and(
						eq(medicalWasteLogs.organizationId, ORG_ID),
						eq(medicalWasteLogs.wasteClass, "class_B"),
					),
				);
			assert.ok(
				wasteRecords.length >= 1,
				"В СанПиН журнале должна появиться запись об образовании отходов класса Б после удаления зуба 48",
			);
			const classBEntry = wasteRecords[0]!;
			assert.strictEqual(classBEntry.operationType, "accumulation");
			assert.strictEqual(classBEntry.packageType, "yellow_bag");
			assert.strictEqual(Number(classBEntry.weightKg), 0.15);
		});

		// 10. Идемпотентность: повторный вызов с тем же clientMutationId возвращает 200 без повторного списания
		const repeatResponse = await app.inject({
			method: "POST",
			url: "/api/billing/payments",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": staffToken,
				"idempotency-key": mutationId,
			},
			payload: {
				patientId: PATIENT_ID,
				visitId: VISIT_ID,
				amountRub: 9000,
				method: "split",
				electronicAmountKopecks: 800000,
				depositAmountKopecks: 100000,
				electronicAmountRub: 8000,
				depositAmountRub: 1000,
				clientMutationId: mutationId,
				note: "Комбинированная оплата (Доктор Хирург-Стоматолог): карта 5000 ₽ + СБП 3000 ₽ + аванс 1000 ₽ [ДДС: Оплата услуг | Касса: Основная касса]",
			},
		});

		assert.strictEqual(
			repeatResponse.statusCode,
			200,
			`Повторный вызов должен вернуть 200 OK. Ошибка: ${repeatResponse.body}`,
		);

		// Проверяем, что баланс семьи не списался повторно
		const [familyAfterRepeat] = await withFixtureTenant(ORG_ID, async (tx) => {
			return tx
				.select()
				.from(familyGroups)
				.where(eq(familyGroups.id, FAMILY_ID));
		});
		assert.strictEqual(Number(familyAfterRepeat?.balance), 1500, "Баланс не должен меняться при повторном запросе");
	});
});
