/**
 * pricelistCatalogInquisition.test.ts
 * Полный Red Team тест прейскуранта, каталога услуг, автономии врача (Мандат 8e / 8n),
 * техкарт BOM (Мандат 8aa) и ликвидации 403-блокировки [PRC-01..08].
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { registerPricelistRoutes } from "../../routes/pricelist.js";
import { registerSettingsRoutes } from "../../routes/settings.js";
import { registerAuthRoutes } from "../../routes/auth.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { eq } from "drizzle-orm";

let app: FastifyInstance;
let testOrgId: string;
let doctorToken: string;
let assistantToken: string;
let adminToken: string;
let testInventoryItemId: string;

before(async () => {
	process.env.AUTH_TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || "test-auth-secret-for-inquisition-token-32b";
	app = Fastify();
	await registerPricelistRoutes(app);
	await registerSettingsRoutes(app);
	await registerAuthRoutes(app);
	await app.ready();

	// Находим или создаем тестовую организацию
	const [org] = await db.select().from(schema.organizations).limit(1);
	testOrgId = org?.id || "00000000-0000-0000-0000-000000000001";

	// Создаем тестовый материал на складе для BOM
	const [invItem] = await db
		.insert(schema.inventoryItems)
		.values({
			organizationId: testOrgId,
			name: "Тестовый композит Gradia Direct (шприц)",
			category: "materials",
			unit: "шт",
			pricePerUnit: 2500,
			unitCostRub: 2500,
			currentQty: "10",
			minQty: "1",
		})
		.returning();
	testInventoryItemId = invItem!.id;

	const secret = authTokenSecret();

	// Подписываем токены для разных ролей
	doctorToken = signToken(
		{
			userId: "00000000-0000-0000-0000-000000000002",
			organizationId: testOrgId,
			role: "doctor",
			fullName: "Доктор Тестов",
		},
		secret,
	);

	assistantToken = signToken(
		{
			userId: "00000000-0000-0000-0000-000000000003",
			organizationId: testOrgId,
			role: "assistant",
			fullName: "Ассистент Тестов",
		},
		secret,
	);

	adminToken = signToken(
		{
			userId: "00000000-0000-0000-0000-000000000004",
			organizationId: testOrgId,
			role: "admin",
			fullName: "Администратор Тестов",
		},
		secret,
	);
});

after(async () => {
	// Очищаем тестовый материал
	if (testInventoryItemId) {
		await db.delete(schema.inventoryItems).where(eq(schema.inventoryItems.id, testInventoryItemId));
	}
	await app.close();
});

describe("Red Team: Автономия врача и объединение маршрутов прейскуранта [PRC-01..08]", () => {
	let createdServiceId: string;

	test("Врач у кресла (role=doctor) создает услугу без 403 Forbidden (Мандат 8e / 8n)", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/pricelist",
			headers: {
				"x-dente-staff-token": doctorToken,
				"content-type": "application/json",
			},
			payload: {
				code: "TEST-A16-001",
				title: "Сложная реставрация жевательного зуба композитом",
				category: "therapy",
				specialty: "therapist",
				basePriceRub: 5500.5,
				durationMinutes: 60,
				taxDeductible: true,
				active: true,
				order804nCode: "A16.07.002.001",
				materialsCostRub: 350,
				labCostRub: 1200,
				tierPrices: { vip: 7500, dms: 4800 },
			},
		});

		assert.equal(res.statusCode, 201, `Врач должен иметь возможность создать услугу, ответ: ${res.body}`);
		const created = JSON.parse(res.body);
		assert.ok(created.id, "Услуга должна получить id");
		assert.equal(created.basePriceRub, 5500.5);
		assert.equal(created.materialsCostRub, 350);
		assert.equal(created.labCostRub, 1200, "labCostRub обязан сохраняться в БД [PRC-06]");
		assert.equal(created.tierPrices?.vip, 7500, "tierPrices обязаны сохраняться в БД [PRC-08]");
		assert.equal(created.priceKopecks, 550050, "Копейки обязаны быть точными (Мандат 8b)");

		createdServiceId = created.id;
	});

	test("Чтение отдельной услуги через GET /api/pricelist/:serviceId", async () => {
		assert.ok(createdServiceId, "createdServiceId должен быть определен");
		const res = await app.inject({
			method: "GET",
			url: `/api/pricelist/${createdServiceId}`,
			headers: {
				"x-dente-staff-token": doctorToken,
			},
		});

		assert.equal(res.statusCode, 200, `Ответ: ${res.body}`);
		const data = JSON.parse(res.body);
		assert.equal(data.item.id, createdServiceId);
		assert.equal(data.item.labCostRub, 1200);
		assert.equal(data.item.tierPrices?.vip, 7500);
	});

	test("Врач обновляет услугу через PUT /api/pricelist/:serviceId без 403 Forbidden", async () => {
		const res = await app.inject({
			method: "PUT",
			url: `/api/pricelist/${createdServiceId}`,
			headers: {
				"x-dente-staff-token": doctorToken,
				"content-type": "application/json",
			},
			payload: {
				basePriceRub: 6000,
				labCostRub: 1500,
				tierPrices: { vip: 8000, dms: 5000, promo: 4500 },
			},
		});

		assert.equal(res.statusCode, 200, `Ответ: ${res.body}`);
		const updated = JSON.parse(res.body);
		assert.equal(updated.basePriceRub, 6000);
		assert.equal(updated.labCostRub, 1500, "labCostRub успешно обновлен");
		assert.equal(updated.tierPrices?.promo, 4500, "tierPrices успешно обновлен");
	});

	test("Ассистент (role=assistant) блокируется с 403 Forbidden при попытке изменить прейскурант", async () => {
		const res = await app.inject({
			method: "PUT",
			url: `/api/pricelist/${createdServiceId}`,
			headers: {
				"x-dente-staff-token": assistantToken,
				"content-type": "application/json",
			},
			payload: {
				basePriceRub: 100,
			},
		});

		assert.equal(res.statusCode, 403, `Ассистенту должно быть запрещено, ответ: ${res.body}`);
		const body = JSON.parse(res.body);
		assert.equal(body.error, "PermissionDenied");
		assert.ok(body.message.includes("прейскуранта"), "Понятное русское объяснение");
	});

	test("Легаси роут /api/settings/catalog/:serviceId работает как прозрачный прокси", async () => {
		const res = await app.inject({
			method: "PUT",
			url: `/api/settings/catalog/${createdServiceId}`,
			headers: {
				"x-dente-staff-token": doctorToken,
				"content-type": "application/json",
			},
			payload: {
				title: "Обновленная реставрация зуба через легаси роут",
			},
		});

		assert.equal(res.statusCode, 200, `Легаси роут обязан отвечать 200, ответ: ${res.body}`);
		const updated = JSON.parse(res.body);
		assert.equal(updated.title, "Обновленная реставрация зуба через легаси роут");
	});

	test("Привязка техкарты списания материалов (BOM) к услуге через PUT /api/pricelist/:serviceId/bom [PRC-04..07]", async () => {
		const res = await app.inject({
			method: "PUT",
			url: `/api/pricelist/${createdServiceId}/bom`,
			headers: {
				"x-dente-staff-token": doctorToken,
				"content-type": "application/json",
			},
			payload: {
				title: "Техкарта: Реставрация светоотверждаемым композитом",
				status: "active",
				description: "Норма расхода материалов на 1 зуб",
				items: [
					{
						inventoryItemId: testInventoryItemId,
						quantity: 0.1, // 0.1 шприца
						unit: "шт",
						isMdlpRequired: false,
						notes: "Основной пломбировочный материал",
					},
				],
			},
		});

		assert.equal(res.statusCode, 200, `Техкарта должна сохраниться, ответ: ${res.body}`);
		const data = JSON.parse(res.body);
		assert.ok(data.success);
		assert.ok(data.bom.techCardId);
		assert.equal(data.bom.items.length, 1);
		// 0.1 * 2500 руб = 250 руб
		assert.equal(data.bom.totalMaterialsCostRub, 250, "Себестоимость материалов обязана посчитаться [PRC-07]");

		// Проверяем, что materialsCostRub на услуге обновился до 250 руб
		const serviceRes = await app.inject({
			method: "GET",
			url: `/api/pricelist/${createdServiceId}`,
			headers: {
				"x-dente-staff-token": doctorToken,
			},
		});
		const serviceData = JSON.parse(serviceRes.body);
		assert.equal(serviceData.item.materialsCostRub, 250, "materialsCostRub на услуге автоматически синхронизируется с BOM");
	});

	test("Чтение техкарты BOM через GET /api/pricelist/:serviceId/bom", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/api/pricelist/${createdServiceId}/bom`,
			headers: {
				"x-dente-staff-token": doctorToken,
			},
		});

		assert.equal(res.statusCode, 200, `Ответ: ${res.body}`);
		const data = JSON.parse(res.body);
		assert.ok(data.bom);
		assert.equal(data.bom.items[0].inventoryItemId, testInventoryItemId);
		assert.equal(data.bom.items[0].quantity, 0.1);
	});

	test("Мягкая архивация услуги через DELETE /api/pricelist/:serviceId (active: false)", async () => {
		const res = await app.inject({
			method: "DELETE",
			url: `/api/pricelist/${createdServiceId}`,
			headers: {
				"x-dente-staff-token": doctorToken,
			},
		});

		assert.equal(res.statusCode, 200, `Ответ: ${res.body}`);
		const deactivated = JSON.parse(res.body);
		assert.equal(deactivated.active, false, "Услуга должна стать неактивной, но остаться в базе");

		// Окончательно удаляем тестовую услугу и связанные техкарты из базы
		await db.delete(schema.procedureTechCards).where(eq(schema.procedureTechCards.serviceId, createdServiceId));
		await db.delete(schema.serviceCatalogItems).where(eq(schema.serviceCatalogItems.id, createdServiceId));
	});
});
