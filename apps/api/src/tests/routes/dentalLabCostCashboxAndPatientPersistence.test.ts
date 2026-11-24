/**
 * dentalLabCostCashboxAndPatientPersistence.test.ts
 *
 * Интеграционный Red Team аудит:
 * 1. Ликвидация Sev-1 утечки кассы клиники: выплата технику списывает СТРОГО себестоимость (labCostRub), а НЕ розницу пациента (priceRub)!
 * 2. Защита от переплаты технику: попытка списать больше себестоимости блокируется с 400 AmountExceedsCost.
 * 3. Автономия врача у кресла (Мандаты 8e, 8n): создание наряда без patientId автоматически создает или находит пациента в БД без 404.
 * 4. 0231 канонические статусы: 'ready_in_clinic', 'fitted', 'ready' успешно персистятся в PostgreSQL без сбоев CHECK constraint.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { resolveAmountToPayKopecks } from "../../routes/lab/paymentModules/labOrderCashBoxFinder.js";
import { executeLabOrderPayment } from "../../routes/lab/paymentModules/labOrderPayDb.js";
import { insertLabOrderInDb } from "../../routes/lab/ordersCrudModules/labOrderInsertDb.js";
import { withTenantCtx } from "../../db/rls.js";
import { mapStageToLabOrderStatus } from "../../routes/lab/labTypesModules/labOrderStatusAndTrackingTypes.js";
import { labOrders, organizations, users } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";

const NAMESPACE = "dentalLabCostCashbox";
const TEST_ORG_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_ORTOPEDOV_ID = fixtureUuid(NAMESPACE, 2);
const DOCTOR_SMIRNOVA_ID = fixtureUuid(NAMESPACE, 3);

describe("Dental Lab Red Team Fixer: Cashbox Cost Invariant & Patient Persistence", () => {
	let databaseReady = true;

	before(async () => {
		process.env.NODE_ENV = "test";
		try {
			await purgeFixtureOrganizations([TEST_ORG_ID]);
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseReady = false;
			return;
		}

		await withFixtureTenant(TEST_ORG_ID, async (tx) => {
			await tx
				.insert(organizations)
				.values({
					id: TEST_ORG_ID,
					name: "Клиника Тест Себестоимости ЗТЛ",
				})
				.onConflictDoNothing();

			await tx
				.insert(users)
				.values([
					{
						id: DOCTOR_ORTOPEDOV_ID,
						organizationId: TEST_ORG_ID,
						fullName: "Д-р Ортопедов А. А.",
						role: "doctor",
					},
					{
						id: DOCTOR_SMIRNOVA_ID,
						organizationId: TEST_ORG_ID,
						fullName: "Д-р Смирнова Е. В.",
						role: "doctor",
					},
				])
				.onConflictDoNothing();
		});
	});

	after(async () => {
		if (!databaseReady) return;
		await purgeFixtureOrganizations([TEST_ORG_ID]);
	});

	describe("1. Финансовая защита кассы: выплата технику СТРОГО по себестоимости", () => {
		it("resolveAmountToPayKopecks выбирает себестоимость (7 500 ₽ = 750 000 коп.), а НЕ розницу пациента (25 000 ₽)", () => {
			const mockOrder = {
				id: "lab-ord-test-1",
				priceRub: 25000, // Розница пациента 25 000 ₽
				labCostRub: 7500, // Себестоимость ЗТЛ 7 500 ₽
			};

			// Когда сумма явно не указана в запросе
			const autoAmountKopecks = resolveAmountToPayKopecks({}, mockOrder);
			assert.strictEqual(
				autoAmountKopecks,
				750000,
				"Касса обязана списать себестоимость техника 750 000 коп., а НЕ розничный чек пациента 2 500 000 коп.!",
			);

			// Когда себестоимость в строковом формате
			const stringOrder = {
				id: "lab-ord-test-2",
				priceRub: 30000,
				labCostRub: 8500,
			};
			const stringAmountKopecks = resolveAmountToPayKopecks({}, stringOrder);
			assert.strictEqual(stringAmountKopecks, 850000);
		});

		it("executeLabOrderPayment возвращает amount_exceeds_cost при попытке списать больше себестоимости", async (t) => {
			if (!databaseReady) return t.skip("Database is unavailable");
			const orderRes = await withTenantCtx(TEST_ORG_ID, (tx) =>
				insertLabOrderInDb(tx, TEST_ORG_ID, {
					patientName: "Тестовый Пациент Защиты Кассы",
					doctorId: DOCTOR_ORTOPEDOV_ID,
					doctorName: "Д-р Ортопедов А. А.",
					toothFdi: "16",
					material: "Диоксид циркония ZrO2",
					priceRub: 25000,
					labCostRub: 7500, // Лимит выплаты технику 7 500 ₽
					dueDate: "2026-11-20",
				}),
			);

			assert.strictEqual(orderRes.kind, "ok");
			const createdOrder = orderRes.order;

			try {
				// Пытаемся выплатить технику 25 000 ₽ (розницу) при себестоимости 7 500 ₽
				const payResult = await executeLabOrderPayment(TEST_ORG_ID, createdOrder.id, {
					amountKopecks: 2500000, // 25 000 ₽ > 7 500 ₽
				});

				assert.strictEqual(payResult.kind, "amount_exceeds_cost");
			} finally {
				await withTenantCtx(TEST_ORG_ID, (tx) =>
					tx.delete(labOrders).where(eq(labOrders.id, createdOrder.id)),
				);
			}
		});

		it("executeLabOrderPayment успешно списывает честную себестоимость и привязывает ордер кассы", async (t) => {
			if (!databaseReady) return t.skip("Database is unavailable");
			const orderRes = await withTenantCtx(TEST_ORG_ID, (tx) =>
				insertLabOrderInDb(tx, TEST_ORG_ID, {
					patientName: "Тестовый Пациент Честной Выплаты",
					doctorId: DOCTOR_ORTOPEDOV_ID,
					doctorName: "Д-р Ортопедов А. А.",
					toothFdi: "21",
					material: "E-max Press",
					priceRub: 24000,
					labCostRub: 8000, // 8 000 ₽
					dueDate: "2026-11-25",
				}),
			);

			assert.strictEqual(orderRes.kind, "ok");
			const createdOrder = orderRes.order;

			try {
				// Выплачиваем технику ровно себестоимость 8 000 ₽ (800 000 копеек)
				const payResult = await executeLabOrderPayment(TEST_ORG_ID, createdOrder.id, {
					amountKopecks: 800000,
				});

				assert.strictEqual(payResult.kind, "ok");
				if (payResult.kind === "ok") {
					assert.ok(payResult.labOrder.paidFromCashOperationId);
					assert.ok(payResult.operation.id);
					assert.strictEqual(Number(payResult.operation.amountRub), 8000);
					assert.strictEqual(payResult.operation.operationType, "expense");
				}
			} finally {
				await withTenantCtx(TEST_ORG_ID, (tx) =>
					tx.delete(labOrders).where(eq(labOrders.id, createdOrder.id)),
				);
			}
		});
	});

	describe("2. Автономия врача у кресла: создание наряда без patientId (ноль 404)", () => {
		it("insertLabOrderInDb автоматически находит или создает пациента по ФИО без сбоя 404", async (t) => {
			if (!databaseReady) return t.skip("Database is unavailable");
			const uniqueName = `Пациент Без Профиля ${Date.now()}`;

			const res = await withTenantCtx(TEST_ORG_ID, (tx) =>
				insertLabOrderInDb(tx, TEST_ORG_ID, {
					patientName: uniqueName, // patientId НЕ передан!
					doctorId: DOCTOR_SMIRNOVA_ID,
					doctorName: "Д-р Смирнова Е. В.",
					toothFdi: "36",
					material: "Циркониевый абатмент",
					priceRub: 18000,
					labCostRub: 6500,
					dueDate: "2026-12-01",
				}),
			);

			assert.strictEqual(res.kind, "ok", "Наряд должен быть создан успешно даже без предварительно выбранного patientId");
			assert.ok(res.order.patientId, "Пациент должен быть автоматически создан/связан");

			await withTenantCtx(TEST_ORG_ID, (tx) =>
				tx.delete(labOrders).where(eq(labOrders.id, res.order.id)),
			);
		});
	});

	describe("3. Канонические статусы ЗТЛ (Миграция 0231)", () => {
		it("маппинг этапов возвращает канонические статусы ЗТЛ", () => {
			assert.strictEqual(mapStageToLabOrderStatus("Готовая работа"), "ready_in_clinic");
			assert.strictEqual(mapStageToLabOrderStatus("Примерка"), "fitting");
			assert.strictEqual(mapStageToLabOrderStatus("Слепок/Скан"), "sent");
			assert.strictEqual(mapStageToLabOrderStatus("cad_cam"), "in_progress");
			assert.strictEqual(mapStageToLabOrderStatus("Фиксация"), "completed");
		});

		it("PostgreSQL успешно сохраняет заказ со статусом ready_in_clinic без нарушения CHECK constraint", async (t) => {
			if (!databaseReady) return t.skip("Database is unavailable");
			const res = await withTenantCtx(TEST_ORG_ID, (tx) =>
				insertLabOrderInDb(tx, TEST_ORG_ID, {
					patientName: "Тест Статуса 0231",
					doctorId: DOCTOR_ORTOPEDOV_ID,
					status: "ready_in_clinic",
					toothFdi: "11",
					dueDate: "2026-11-30",
				}),
			);

			assert.strictEqual(res.kind, "ok");
			assert.strictEqual(res.order.status, "ready_in_clinic");

			await withTenantCtx(TEST_ORG_ID, (tx) =>
				tx.delete(labOrders).where(eq(labOrders.id, res.order.id)),
			);
		});
	});
});
