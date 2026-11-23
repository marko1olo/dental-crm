/**
 * redteamFixerSurgeonLab.test.ts
 *
 * Бескомпромиссный Red Team аудит исправлений Зуботехнической лаборатории (ЗТЛ CAD/CAM):
 * 1. SEV-1 #1: Колонка `orderNumber` физически сохраняется в PostgreSQL 18 в формате ЗТЛ-YYMM-XXXX.
 *    selectLabOrdersQuery выбирает реальный orderNumber, а НЕ 36-значный secureToken!
 * 2. SEV-1 #2: handleUpdatePipelineStage физически обновляет stage в таблице lab_orders в PostgreSQL 18.
 * 3. SEV-2 #3: Аудит-лог labOrderEvents изолирован через withTenantCtx (защита RLS между организациями).
 * 4. SEV-2 #4: Гарантийный паспорт ортопедической конструкции связывается с реальным номером наряда и партией со склада.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { withTenantCtx } from "../db/rls.js";
import {
	inventoryItems,
	labOrders,
	stockBatches,
} from "../db/schema.js";
import { insertLabOrderInDb } from "../routes/lab/ordersCrudModules/labOrderInsertDb.js";
import { selectLabOrdersQuery } from "../routes/lab/ordersCrudModules/labOrderQueryDb.js";
import {
	handleCreateLabOrderEvent,
	handleGetLabOrderEvents,
} from "../routes/lab/pipelineModules/labOrderEventsHandlers.js";
import { handleUpdatePipelineStage } from "../routes/lab/pipelineModules/pipelineStageHandler.js";
import { handleGetWarrantyPassport } from "../routes/lab/pipelineModules/warrantyPassportHandler.js";

const ORG_A = "00000000-0000-0000-0000-000000000001";
const ORG_B = "00000000-0000-0000-0000-000000000002";

function createFakeRequest(params: { id: string }, body: unknown, orgId: string) {
	return {
		params,
		body,
		headers: {},
		__denteIdentity: {
			organizationId: orgId,
			userId: "00000000-0000-0000-0000-000000000001",
			role: "doctor",
			fullName: "Д-р Тестов",
			sessionId: "sess-1",
			verified: true,
		},
		user: {
			id: "00000000-0000-0000-0000-000000000001",
			role: "doctor",
			organizationId: orgId,
		},
		log: { error: () => {}, info: () => {}, warn: () => {} },
		ip: "127.0.0.1",
		method: "POST",
		url: `/api/lab/orders/${params.id}`,
	};
}

describe("Red Team Fixer Surgeon Lab: ZTL & CAD/CAM Backend Verification", () => {
	it("SEV-1 #1: orderNumber физически сохраняется в lab_orders в PostgreSQL 18 и выбирается в запросах", async () => {
		const insertRes = await withTenantCtx(ORG_A, (tx) =>
			insertLabOrderInDb(tx, ORG_A, {
				patientName: "Редтим Пациент Наряда",
				doctorName: "Д-р Тестов О. П.",
				toothFdi: "11",
				material: "Диоксид циркония ZrO2 Multilayer",
				priceRub: 35000,
				labCostRub: 9000,
				dueDate: "2026-12-01",
			}),
		);

		assert.strictEqual(insertRes.kind, "ok");
		const createdOrder = (insertRes as { kind: "ok"; order: typeof labOrders.$inferSelect }).order;
		assert.ok(createdOrder.id, "Заказ должен иметь валидный UUID id");

		try {
			// Проверяем физическое сохранение в PostgreSQL 18
			const [dbRow] = await withTenantCtx(ORG_A, (tx) =>
				tx
					.select({
						id: labOrders.id,
						orderNumber: labOrders.orderNumber,
						secureToken: labOrders.secureToken,
					})
					.from(labOrders)
					.where(eq(labOrders.id, createdOrder.id)),
			);

			assert.ok(dbRow, "Заказ должен присутствовать в БД");
			assert.ok(dbRow.orderNumber, "Колонка order_number в БД обязана быть заполнена!");
			assert.match(
				dbRow.orderNumber,
				/^ЗТЛ-\d{4}-[A-Z0-9]{4}$/,
				`orderNumber должен иметь клинический формат ЗТЛ-YYMM-XXXX, получено: ${dbRow.orderNumber}`,
			);
			assert.notStrictEqual(
				dbRow.orderNumber,
				dbRow.secureToken,
				"orderNumber НЕ должен равняться 36-значному UUID secureToken!",
			);

			// Проверяем выборку через selectLabOrdersQuery
			const queryRows = await withTenantCtx(ORG_A, (tx) =>
				selectLabOrdersQuery(tx, ORG_A, createdOrder.patientId),
			);
			const found = queryRows.find((r) => r.id === createdOrder.id);
			assert.ok(found, "Заказ должен возвращаться в selectLabOrdersQuery");
			assert.strictEqual(
				found.orderNumber,
				dbRow.orderNumber,
				"selectLabOrdersQuery обязан отдавать реальный orderNumber из БД",
			);
			assert.doesNotMatch(
				found.orderNumber,
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
				"orderNumber не должен быть 36-значным UUID токена!",
			);
		} finally {
			await withTenantCtx(ORG_A, (tx) =>
				tx.delete(labOrders).where(eq(labOrders.id, createdOrder.id)),
			);
		}
	});

	it("SEV-1 #2: handleUpdatePipelineStage физически сохраняет stage в PostgreSQL 18", async () => {
		const insertRes = await withTenantCtx(ORG_A, (tx) =>
			insertLabOrderInDb(tx, ORG_A, {
				patientName: "Редтим Пациент Этапа",
				doctorName: "Д-р Ортопедов А. А.",
				toothFdi: "24",
				material: "E-max CAD",
				priceRub: 28000,
				labCostRub: 8000,
				stage: "impression_scan",
			}),
		);
		assert.strictEqual(insertRes.kind, "ok");
		const createdOrder = (insertRes as { kind: "ok"; order: typeof labOrders.$inferSelect }).order;

		try {
			let responseCode = 200;
			let responseBody: any = null;
			const fakeReply = {
				code(c: number) {
					responseCode = c;
					return this;
				},
				status(c: number) {
					responseCode = c;
					return this;
				},
				send(data: any) {
					responseBody = data;
					return this;
				},
			};

			const fakeRequest = createFakeRequest(
				{ id: createdOrder.id },
				{
					stage: "cad_modeling",
					notes: "Завершено 3D-моделирование каркаса",
					scheduledDate: "2026-11-28",
				},
				ORG_A,
			);

			await handleUpdatePipelineStage(fakeRequest as any, fakeReply as any);

			assert.strictEqual(responseCode, 200, "Обновление этапа должно возвращать 200 OK");
			assert.strictEqual(responseBody?.success, true);
			assert.strictEqual(responseBody?.stage, "cad_modeling");

			// Проверяем прямое чтение из PostgreSQL 18: колонка stage обязана обновиться!
			const [freshDbOrder] = await withTenantCtx(ORG_A, (tx) =>
				tx
					.select({
						id: labOrders.id,
						stage: labOrders.stage,
						status: labOrders.status,
					})
					.from(labOrders)
					.where(eq(labOrders.id, createdOrder.id)),
			);

			assert.ok(freshDbOrder, "Заказ должен существовать в БД");
			assert.strictEqual(
				freshDbOrder.stage,
				"cad_modeling",
				"Этап ЗТЛ (stage) в строке PostgreSQL 18 ОБЯЗАН быть обновлен на 'cad_modeling'!",
			);
			assert.strictEqual(freshDbOrder.status, "in_progress");
		} finally {
			await withTenantCtx(ORG_A, (tx) =>
				tx.delete(labOrders).where(eq(labOrders.id, createdOrder.id)),
			);
		}
	});

	it("SEV-2 #3: Аудит-события labOrderEvents изолированы в tenant context (ноль утечек между клиниками)", async () => {
		const insertRes = await withTenantCtx(ORG_A, (tx) =>
			insertLabOrderInDb(tx, ORG_A, {
				patientName: "Редтим Пациент Аудита",
				doctorName: "Д-р Инквизитор Т. С.",
				toothFdi: "46",
				material: "ZrO2",
				priceRub: 30000,
				labCostRub: 7000,
			}),
		);
		assert.strictEqual(insertRes.kind, "ok");
		const createdOrder = (insertRes as { kind: "ok"; order: typeof labOrders.$inferSelect }).order;

		try {
			// Создаем событие через handleCreateLabOrderEvent для ORG_A
			let createBody: any = null;
			const fakeReply = {
				code(c: number) { return this; },
				status(c: number) { return this; },
				send(data: any) { createBody = data; return this; },
			};

			const createRequest = createFakeRequest(
				{ id: createdOrder.id },
				{
					milestone: "framework_fitting",
					actorType: "clinic_doctor",
					actorName: "Д-р Инквизитор Т. С.",
					notes: "Каркас припасован без зазоров",
					photoUrls: [],
				},
				ORG_A,
			);

			await handleCreateLabOrderEvent(createRequest as any, fakeReply as any);
			assert.strictEqual(createBody?.success, true);
			assert.ok(createBody?.event?.id, "Событие должно быть создано");

			// Читаем события для ORG_A
			let getEventsA: any = null;
			const getReplyA = {
				send(d: any) { getEventsA = d; return this; },
				code() { return this; },
			};
			const getReqA = createFakeRequest({ id: createdOrder.id }, null, ORG_A);
			await handleGetLabOrderEvents(getReqA as any, getReplyA as any);
			assert.ok(getEventsA?.events?.length >= 1, "Клиника ORG_A должна видеть свое событие");

			// Проверяем изоляцию тенантов: клиника ORG_B НЕ ДОЛЖНА видеть события ORG_A!
			let getEventsB: any = null;
			const getReplyB = {
				send(d: any) { getEventsB = d; return this; },
				code() { return this; },
			};
			const getReqB = createFakeRequest({ id: createdOrder.id }, null, ORG_B);
			await handleGetLabOrderEvents(getReqB as any, getReplyB as any);
			assert.strictEqual(
				getEventsB?.events?.length || 0,
				0,
				"Клиника ORG_B ни при каких обстоятельствах не должна видеть события клиники ORG_A!",
			);
		} finally {
			await withTenantCtx(ORG_A, (tx) =>
				tx.delete(labOrders).where(eq(labOrders.id, createdOrder.id)),
			);
		}
	});

	it("SEV-2 #4: Гарантийный паспорт ортопедической конструкции связывается с реальным orderNumber и партией склада", async () => {
		// Создаем активную партию на складе для диоксида циркония
		let testItemId: string | null = null;
		let testBatchId: string | null = null;
		const TEST_LOT_NUMBER = "BATCH-ZRO2-2026-99";

		await withTenantCtx(ORG_A, async (tx) => {
			const [item] = await tx
				.insert(inventoryItems)
				.values({
					organizationId: ORG_A,
					name: "Диоксид циркония ZrO2 диск 98мм",
					sku: `SKU-ZRO2-${Date.now()}`,
					category: "materials",
					unit: "pcs",
					stockQuantity: "5.000",
					priceRub: "6500.00",
				})
				.returning({ id: inventoryItems.id });
			if (item) {
				testItemId = item.id;
				const [batch] = await tx
					.insert(stockBatches)
					.values({
						organizationId: ORG_A,
						inventoryItemId: item.id,
						batchNumber: TEST_LOT_NUMBER,
						expirationDate: "2029-12-31",
						initialQty: "5.000",
						remainingQty: "5.000",
						status: "active",
					})
					.returning({ id: stockBatches.id });
				if (batch) testBatchId = batch.id;
			}
		});

		const insertRes = await withTenantCtx(ORG_A, (tx) =>
			insertLabOrderInDb(tx, ORG_A, {
				patientName: "Редтим Пациент Гарантии",
				doctorName: "Д-р Протезов С. С.",
				toothFdi: "26",
				material: "Диоксид циркония ZrO2",
				priceRub: 40000,
				labCostRub: 12000,
				status: "completed",
			}),
		);
		assert.strictEqual(insertRes.kind, "ok");
		const createdOrder = (insertRes as { kind: "ok"; order: typeof labOrders.$inferSelect }).order;

		try {
			let passportRes: any = null;
			let passportStatus = 200;
			const fakeReply = {
				code(c: number) { passportStatus = c; return this; },
				status(c: number) { passportStatus = c; return this; },
				send(d: any) { passportRes = d; return this; },
			};
			const fakeReq = createFakeRequest({ id: createdOrder.id }, null, ORG_A);

			await handleGetWarrantyPassport(fakeReq as any, fakeReply as any);

			assert.strictEqual(passportStatus, 200);
			assert.strictEqual(passportRes?.success, true);
			const passport = passportRes?.passport;
			assert.ok(passport, "Паспорт должен быть успешно сформирован");

			// 1. Проверяем честный номер наряда (не UUID токена!)
			assert.match(
				passport.orderNumber,
				/^ЗТЛ-\d{4}-[A-Z0-9]{4}$/,
				`Номер в паспорте обязан иметь формат ЗТЛ-YYMM-XXXX, получено: ${passport.orderNumber}`,
			);
			assert.notStrictEqual(
				passport.orderNumber,
				createdOrder.secureToken,
				"Номер в паспорте не должен быть UUID крипто-токена!",
			);

			// 2. Проверяем связку с реальной партией склада
			assert.strictEqual(
				passport.batchCode,
				TEST_LOT_NUMBER,
				`batchCode в паспорте обязан подтягивать реальный номер партии из stockBatches (${TEST_LOT_NUMBER}), получено: ${passport.batchCode}`,
			);
			assert.doesNotMatch(
				passport.batchCode,
				/^LOT-\d{4}-[0-9A-F]{8}$/,
				"batchCode не должен быть синтетическим фиктивным хэшем!",
			);

			// 3. Проверяем кросс-тенантную изоляцию certificateNumber
			assert.ok(passportRes.certificateNumber, "certificateNumber должен возвращаться");
			assert.match(
				passportRes.certificateNumber,
				/^WP-[A-Z0-9]{6}-ЗТЛ-\d{4}-[A-Z0-9]{4}$/,
				`certificateNumber обязан иметь формат WP-{orgShortHash}-{orderNum}, получено: ${passportRes.certificateNumber}`,
			);
		} finally {
			await withTenantCtx(ORG_A, async (tx) => {
				await tx.delete(labOrders).where(eq(labOrders.id, createdOrder.id));
				if (testBatchId) {
					await tx.delete(stockBatches).where(eq(stockBatches.id, testBatchId));
				}
				if (testItemId) {
					await tx.delete(inventoryItems).where(eq(inventoryItems.id, testItemId));
				}
			});
		}
	});

	it("SEV-2 #5: Симметричный алиас /api/lab/orders/:id/items зарегистрирован в Fastify", async () => {
		const fastifyModule = await import("fastify");
		const app = fastifyModule.default();
		const { registerOrderItemsRoutes } = await import("../routes/lab/orderItemsRoutes.js");
		await registerOrderItemsRoutes(app);

		assert.ok(app.hasRoute({ method: "GET", url: "/api/lab/orders/:id/items" }), "GET /api/lab/orders/:id/items must be registered");
		assert.ok(app.hasRoute({ method: "POST", url: "/api/lab/orders/:id/items" }), "POST /api/lab/orders/:id/items must be registered");
		assert.ok(app.hasRoute({ method: "PUT", url: "/api/lab/orders/:id/items/:itemId" }), "PUT /api/lab/orders/:id/items/:itemId must be registered");
		assert.ok(app.hasRoute({ method: "DELETE", url: "/api/lab/orders/:id/items/:itemId" }), "DELETE /api/lab/orders/:id/items/:itemId must be registered");
		assert.ok(app.hasRoute({ method: "GET", url: "/api/clinical/lab-orders/:id/items" }), "GET /api/clinical/lab-orders/:id/items must be registered");
		assert.ok(app.hasRoute({ method: "POST", url: "/api/clinical/lab-orders/:id/items" }), "POST /api/clinical/lab-orders/:id/items must be registered");
		assert.ok(app.hasRoute({ method: "PUT", url: "/api/clinical/lab-orders/:id/items/:itemId" }), "PUT /api/clinical/lab-orders/:id/items/:itemId must be registered");
		assert.ok(app.hasRoute({ method: "DELETE", url: "/api/clinical/lab-orders/:id/items/:itemId" }), "DELETE /api/clinical/lab-orders/:id/items/:itemId must be registered");
	});

	it("SEV-1 #6: ACID транзакция и синхронизация позиций ЗТЛ без схлопывания себестоимости и розницы", async () => {
		const { insertLabItem, updateLabItem, deleteLabItem } = await import("../routes/lab/orderItemsCrud.js");

		const insertRes = await withTenantCtx(ORG_A, (tx) =>
			insertLabOrderInDb(tx, ORG_A, {
				patientName: "Редтим Пациент Себестоимости",
				doctorName: "Д-р Ортопедов И. И.",
				toothFdi: "16",
				material: "ZrO2",
				priceRub: 0,
				labCostRub: 3500,
			}),
		);
		assert.strictEqual(insertRes.kind, "ok");
		const createdOrder = (insertRes as { kind: "ok"; order: typeof labOrders.$inferSelect }).order;

		try {
			// 1. Добавляем позицию 1: зуб 16 на 8 500 ₽ (850 000 копеек розничной цены пациента)
			const item1 = await insertLabItem(ORG_A, createdOrder.id, {
				toothFdi: 16,
				restorationType: "crown_monolithic",
				material: "zirconia_multilayer_gradient",
				shadeSystem: "VITA_CLASSICAL",
				shadeFinal: "A2",
				priceKopecks: 850000,
			});
			assert.ok(item1?.id, "Позиция 1 создана");

			// Проверяем актуализацию родительского наряда: priceKopecks становится 850 000, а labCostKopecks сохраняет себестоимость 350 000 (не схлопывается с розницей!)
			const [orderAfterItem1] = await withTenantCtx(ORG_A, (tx) =>
				tx.select().from(labOrders).where(eq(labOrders.id, createdOrder.id)),
			);
			assert.strictEqual(Number(orderAfterItem1?.labCostKopecks), 350000);
			assert.strictEqual(Number(orderAfterItem1?.priceKopecks), 850000);
			assert.strictEqual(orderAfterItem1?.toothFdi, "16");

			// 2. Добавляем позицию 2: зуб 17 на 9 000 ₽ (900 000 копеек)
			const item2 = await insertLabItem(ORG_A, createdOrder.id, {
				toothFdi: 17,
				restorationType: "crown_monolithic",
				material: "zirconia_multilayer_gradient",
				shadeSystem: "VITA_CLASSICAL",
				shadeFinal: "A2",
				priceKopecks: 900000,
			});
			assert.ok(item2?.id, "Позиция 2 создана");

			// Проверяем перерасчет родительского наряда: сумма розницы должна стать 1 750 000 копеек, зубы "16,17", а себестоимость сохраняется
			const [orderAfterItem2] = await withTenantCtx(ORG_A, (tx) =>
				tx.select().from(labOrders).where(eq(labOrders.id, createdOrder.id)),
			);
			assert.strictEqual(Number(orderAfterItem2?.labCostKopecks), 350000);
			assert.strictEqual(Number(orderAfterItem2?.priceKopecks), 1750000);
			assert.strictEqual(orderAfterItem2?.toothFdi, "16,17");

			// 3. Обновляем позицию 1: меняем цену зуба 16 на 10 000 ₽ (1 000 000 копеек)
			await updateLabItem(ORG_A, createdOrder.id, item1.id, {
				priceKopecks: 1000000,
			});
			const [orderAfterUpdate] = await withTenantCtx(ORG_A, (tx) =>
				tx.select().from(labOrders).where(eq(labOrders.id, createdOrder.id)),
			);
			assert.strictEqual(Number(orderAfterUpdate?.labCostKopecks), 350000);
			assert.strictEqual(Number(orderAfterUpdate?.priceKopecks), 1900000);

			// 4. Удаляем позицию 2 (зуб 17)
			await deleteLabItem(ORG_A, createdOrder.id, item2.id);
			const [orderAfterDelete] = await withTenantCtx(ORG_A, (tx) =>
				tx.select().from(labOrders).where(eq(labOrders.id, createdOrder.id)),
			);
			assert.strictEqual(Number(orderAfterDelete?.labCostKopecks), 350000);
			assert.strictEqual(Number(orderAfterDelete?.priceKopecks), 1000000);
			assert.strictEqual(orderAfterDelete?.toothFdi, "16");
		} finally {
			await withTenantCtx(ORG_A, (tx) =>
				tx.delete(labOrders).where(eq(labOrders.id, createdOrder.id)),
			);
		}
	});

	it("SEV-1 #7: Портал техника обезличивает персональные данные (152-ФЗ / BOLA)", async () => {
		const { handleGetPortalOrder } = await import("../routes/lab/portalModules/technicianPortalGetAndPhotoHandlers.js");

		const insertRes = await withTenantCtx(ORG_A, (tx) =>
			insertLabOrderInDb(tx, ORG_A, {
				patientName: "Александров Константин Дмитриевич",
				doctorName: "Д-р Протезов С. С.",
				toothFdi: "11",
				material: "ZrO2",
				priceRub: 30000,
				labCostRub: 8000,
			}),
		);
		assert.strictEqual(insertRes.kind, "ok");
		const createdOrder = (insertRes as { kind: "ok"; order: typeof labOrders.$inferSelect }).order;

		try {
			const fakeReq = {
				params: { token: createdOrder.secureToken },
				log: { error: () => {}, info: () => {}, warn: () => {} },
			};
			const fakeReply = {
				code(c: number) { return this; },
				send(data: any) { return data; },
			};

			const portalResult = await handleGetPortalOrder(fakeReq as any, fakeReply as any);
			assert.ok(portalResult, "Результат должен быть получен");
			assert.strictEqual(
				portalResult.patientInitials,
				"Александров К. Д.",
				"Инициалы пациента должны быть в формате Фамилия И. О.",
			);
			assert.strictEqual(
				portalResult.patientFullName,
				"Александров К. Д.",
				"patientFullName для внешнего портала обязан быть обезличен по 152-ФЗ",
			);
			assert.strictEqual((portalResult as any).phone, undefined, "Телефон не должен отдаваться внешнему технику");
			assert.strictEqual((portalResult as any).passport, undefined, "Паспортные данные не должны отдаваться");
		} finally {
			await withTenantCtx(ORG_A, (tx) =>
				tx.delete(labOrders).where(eq(labOrders.id, createdOrder.id)),
			);
		}
	});

	it("SEV-3 #8: Chromascop санитизация префиксов в normalizeVitaShade и isValidVitaShade", async () => {
		const { normalizeVitaShade, isValidVitaShade } = await import("@dental/shared");
		const { getVitaShadeHex } = await import("@dental/shared");

		// Санитизация префиксов Chromascop / Хромаскоп
		assert.strictEqual(normalizeVitaShade("Хромаскоп 140"), "140");
		assert.strictEqual(normalizeVitaShade("Chromascop 210"), "210");
		assert.strictEqual(normalizeVitaShade("chromascop-540"), "540");
		assert.strictEqual(normalizeVitaShade("хрома 320"), "320");

		assert.strictEqual(isValidVitaShade("Хромаскоп 140"), true);
		assert.strictEqual(isValidVitaShade("Chromascop 210"), true);
		assert.strictEqual(isValidVitaShade("chromascop-540"), true);

		// Проверка получения HEX
		assert.ok(getVitaShadeHex("Хромаскоп 140"), "HEX для Хромаскоп 140 должен быть найден");
		assert.ok(getVitaShadeHex("Chromascop 210"), "HEX для Chromascop 210 должен быть найден");
	});

	it("SEV-1 #9: executeLabOrderPatchTx при рекламации обнуляет цену пациента и сбрасывает isLockedInstalled (DEFECT-LAB-01, Mandate 8e)", async () => {
		const { executeLabOrderPatchTx } = await import("../routes/lab/patchModules/labOrderPatchDb.js");

		const insertRes = await withTenantCtx(ORG_A, (tx) =>
			insertLabOrderInDb(tx, ORG_A, {
				patientName: "Тест Рекламации Пациент",
				doctorName: "Д-р Гарантиев Г. Г.",
				toothFdi: "25",
				material: "ZrO2",
				priceRub: 25000,
				priceKopecks: 2500000,
				labCostRub: 6000,
				labCostKopecks: 600000,
			}),
		);
		assert.strictEqual(insertRes.kind, "ok");
		const createdOrder = (insertRes as { kind: "ok"; order: typeof labOrders.$inferSelect }).order;

		try {
			// Выполняем рекламацию по браку лаборатории (lab_defect)
			const patchRes = await withTenantCtx(ORG_A, (tx) =>
				executeLabOrderPatchTx(
					tx,
					ORG_A,
					createdOrder.id,
					{
						stage: "warranty_rework",
						isWarranty: true,
						warrantyLiabilityType: "lab_defect",
						isRemake: true,
						remakeReason: "Скол керамики по вине лаборатории",
					},
					"refitting",
				),
			);

			assert.strictEqual(patchRes.kind, "ok");
			if (patchRes.kind === "ok") {
				assert.strictEqual(patchRes.updated.isWarranty, true, "isWarranty должен быть true");
				assert.strictEqual(patchRes.updated.isLockedInstalled, false, "isLockedInstalled должен быть false");
				assert.strictEqual(Number(patchRes.updated.priceKopecks), 0, "Цена для пациента должна быть 0 копеек");
				assert.strictEqual(Number(patchRes.updated.priceRub), 0, "Цена в рублях должна быть 0");
				assert.strictEqual(Number(patchRes.updated.labCostKopecks), 0, "При lab_defect себестоимость ЗТЛ 0 копеек");
				assert.strictEqual(Number(patchRes.updated.labCostRub), 0, "При lab_defect себестоимость ЗТЛ 0 руб");
				assert.ok(patchRes.updated.clinicalNotes?.includes("Гарантийная рекламация"), "Заметка о гарантии должна быть добавлена");
			}
		} finally {
			await withTenantCtx(ORG_A, (tx) =>
				tx.delete(labOrders).where(eq(labOrders.id, createdOrder.id)),
			);
		}
	});
});
