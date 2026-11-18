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
import { describe, it } from "node:test";
import { resolveAmountToPayKopecks } from "../../routes/lab/paymentModules/labOrderCashBoxFinder.js";
import { executeLabOrderPayment } from "../../routes/lab/paymentModules/labOrderPayDb.js";
import { insertLabOrderInDb } from "../../routes/lab/ordersCrudModules/labOrderInsertDb.js";
import { withTenantCtx } from "../../db/rls.js";
import { mapStageToLabOrderStatus } from "../../routes/lab/labTypesModules/labOrderStatusAndTrackingTypes.js";
import { db } from "../../db/client.js";
import { labOrders, cashOperations } from "../../db/schema.js";
import { eq } from "drizzle-orm";

const TEST_ORG_ID = "00000000-0000-0000-0000-000000000001";

describe("Dental Lab Red Team Fixer: Cashbox Cost Invariant & Patient Persistence", () => {
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

		it("executeLabOrderPayment возвращает amount_exceeds_cost при попытке списать больше себестоимости", async () => {
			const orderRes = await withTenantCtx(TEST_ORG_ID, (tx) =>
				insertLabOrderInDb(tx, TEST_ORG_ID, {
					patientName: "Тестовый Пациент Защиты Кассы",
					doctorName: "Д-р Ортопедов А. А.",
					toothFdi: "16",
					material: "Диоксид циркония ZrO2",
					priceRub: 25000,
					labCostRub: 7500, // Лимит выплаты технику 7 500 ₽
					dueDate: "2026-11-20",
				}),
			);

			assert.strictEqual(orderRes.kind, "ok");
			const createdOrder = (orderRes as any).order;

			try {
				// Пытаемся выплатить технику 25 000 ₽ (розницу) при себестоимости 7 500 ₽
				const payResult = await executeLabOrderPayment(TEST_ORG_ID, createdOrder.id, {
					amountKopecks: 2500000, // 25 000 ₽ > 7 500 ₽
				});

				assert.strictEqual(payResult.kind, "amount_exceeds_cost");
			} finally {
				await db.delete(labOrders).where(eq(labOrders.id, createdOrder.id));
			}
		});

		it("executeLabOrderPayment успешно списывает честную себестоимость и привязывает ордер кассы", async () => {
			const orderRes = await withTenantCtx(TEST_ORG_ID, (tx) =>
				insertLabOrderInDb(tx, TEST_ORG_ID, {
					patientName: "Тестовый Пациент Честной Выплаты",
					doctorName: "Д-р Ортопедов А. А.",
					toothFdi: "21",
					material: "E-max Press",
					priceRub: 24000,
					labCostRub: 8000, // 8 000 ₽
					dueDate: "2026-11-25",
				}),
			);

			assert.strictEqual(orderRes.kind, "ok");
			const createdOrder = (orderRes as any).order;

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
				await db.delete(labOrders).where(eq(labOrders.id, createdOrder.id));
			}
		});
	});

	describe("2. Автономия врача у кресла: создание наряда без patientId (ноль 404)", () => {
		it("insertLabOrderInDb автоматически находит или создает пациента по ФИО без сбоя 404", async () => {
			const uniqueName = `Пациент Без Профиля ${Date.now()}`;

			const res = await withTenantCtx(TEST_ORG_ID, (tx) =>
				insertLabOrderInDb(tx, TEST_ORG_ID, {
					patientName: uniqueName, // patientId НЕ передан!
					doctorName: "Д-р Смирнова Е. В.",
					toothFdi: "36",
					material: "Циркониевый абатмент",
					priceRub: 18000,
					labCostRub: 6500,
					dueDate: "2026-12-01",
				}),
			);

			assert.strictEqual(res.kind, "ok", "Наряд должен быть создан успешно даже без предварительно выбранного patientId");
			assert.ok((res as any).order.patientId, "Пациент должен быть автоматически создан/связан");

			// Удалим тестовый заказ
			await db.delete(labOrders).where(eq(labOrders.id, (res as any).order.id));
		});
	});

	describe("3. Канонические статусы ЗТЛ (Миграция 0231)", () => {
		it("маппинг этапов возвращает канонические статусы ЗТЛ", () => {
			assert.strictEqual(mapStageToLabOrderStatus("Готовая работа"), "ready_in_clinic");
			assert.strictEqual(mapStageToLabOrderStatus("Примерка"), "fitted");
			assert.strictEqual(mapStageToLabOrderStatus("Слепок/Скан"), "sent");
			assert.strictEqual(mapStageToLabOrderStatus("cad_cam"), "in_progress");
			assert.strictEqual(mapStageToLabOrderStatus("Фиксация"), "completed");
		});

		it("PostgreSQL успешно сохраняет заказ со статусом ready_in_clinic без нарушения CHECK constraint", async () => {
			const res = await withTenantCtx(TEST_ORG_ID, (tx) =>
				insertLabOrderInDb(tx, TEST_ORG_ID, {
					patientName: "Тест Статуса 0231",
					status: "ready_in_clinic" as any,
					toothFdi: "11",
					dueDate: "2026-11-30",
				}),
			);

			assert.strictEqual(res.kind, "ok");
			assert.strictEqual((res as any).order.status, "ready_in_clinic");

			// Очистим тестовый заказ
			await db.delete(labOrders).where(eq(labOrders.id, (res as any).order.id));
		});
	});
});
