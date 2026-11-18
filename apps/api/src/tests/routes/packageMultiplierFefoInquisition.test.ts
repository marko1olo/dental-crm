/**
 * apps/api/src/tests/routes/packageMultiplierFefoInquisition.test.ts
 *
 * RED TEAM INQUISITION: [WH-04] Коэффициент фасовки (упаковка vs карпула/ампула).
 * Проверяет: 5 коробок Септанеста по 50 карпул создают 250 карпул в наличии,
 * списание 1 карпулы процедурой не объявляет ложный овердрафт (остаток 249).
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { inventoryItems, organizations, stockBatches, users } from "../../db/schema.js";
import { inventoryRoutes } from "../../routes/inventory.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { CLINIC_TOKEN_HEADER, STAFF_TOKEN_HEADER } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "pkgMultInquisition";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const STAFF_ID = fixtureUuid(NAMESPACE, 2);
const VISIT_ID = fixtureUuid(NAMESPACE, 3);

function isDbDown(error: unknown): boolean {
	if (isDatabaseUnavailable(error)) return true;
	const cause = (error as { cause?: unknown })?.cause;
	if (cause && isDatabaseUnavailable(cause)) return true;
	const message = error instanceof Error ? error.message : String(error);
	return /ECONNREFUSED|connect|5432/i.test(message);
}

describe("Red Team [WH-04]: Package Multiplier Inbound & Consumption Invariant", () => {
	let app: FastifyInstance;
	let staffToken = "";
	let databaseReady = true;

	function authHeaders(extra: Record<string, string> = {}) {
		return {
			Authorization: `Bearer ${staffToken}`,
			[STAFF_TOKEN_HEADER]: staffToken,
			[CLINIC_TOKEN_HEADER]: staffToken,
			"content-type": "application/json",
			...extra,
		};
	}

	before(async () => {
		process.env.NODE_ENV = "test";

		try {
			await purgeFixtureOrganizations([ORG_ID]);
		} catch (error) {
			if (!isDbDown(error)) throw error;
			databaseReady = false;
		}

		if (databaseReady) {
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx.insert(organizations).values({
					id: ORG_ID,
					name: "Клиника Фасовки Септанеста",
				});

				await tx.insert(users).values({
					id: STAFF_ID,
					organizationId: ORG_ID,
					fullName: "Старшая Медсестра Склада",
					role: "admin",
				});
			});
		}

		app = createTenantTestApp();
		await app.register(inventoryRoutes, { prefix: "/api/inventory" });
		await app.ready();

		staffToken = signToken(
			{
				organizationId: ORG_ID,
				userId: STAFF_ID,
				role: "admin",
			},
			authTokenSecret(),
		);
	});

	after(async () => {
		if (app) await app.close();
		if (databaseReady) {
			try {
				await purgeFixtureOrganizations([ORG_ID]);
			} catch {}
		}
	});

	it("1. Оприходование 5 коробок Септанеста учитывает packageMultiplier = 50 и зачисляет 250 карпул", async (t) => {
		if (!databaseReady) return t.skip("Database is down");

		const waybillRes = await app.inject({
			method: "POST",
			url: `/api/inventory/${ORG_ID}/acceptance-waybill`,
			headers: authHeaders(),
			payload: {
				supplierName: "ООО «Дентал Снаб»",
				supplierInn: "7701234567",
				waybillNumber: "ПРХ-СЕПТ-01",
				receiptDate: new Date().toISOString().slice(0, 10),
				items: [
					{
						name: "Септанест 1:100 000 с адреналином (50 карпул)",
						category: "anesthesia",
						unit: "упак",
						quantity: 5, // 5 коробок
						packageMultiplier: 50, // 50 карпул в коробке
						purchasePricePerUnit: 7250, // 7250 руб за коробку
						batchNumber: "LOT-SEPT-2027",
						expirationDate: "2027-12-31",
					},
					{
						name: "Иглы карпульные стоматологические стерильные (0.3x21 мм G30 / 0.4x35 мм G27)",
						category: "disposables",
						unit: "шт",
						quantity: 100,
						purchasePricePerUnit: 18,
						batchNumber: "LOT-NEEDLE-2027",
						expirationDate: "2027-12-31",
					},
				],
			},
		});

		assert.ok(waybillRes.statusCode === 200 || waybillRes.statusCode === 201, waybillRes.body);
		const data = JSON.parse(waybillRes.body);
		assert.equal(data.success, true);

		// Проверяем остаток в БД
		await withFixtureTenant(ORG_ID, async (tx) => {
			const items = await tx
				.select()
				.from(inventoryItems)
				.where(and(eq(inventoryItems.organizationId, ORG_ID)));

			const septanestItem = items.find((it) => it.name.toLowerCase().includes("септанест"));
			assert.ok(septanestItem, "Карточка Септанеста должна быть создана");
			assert.equal(Number(septanestItem.packageMultiplier), 50, "Коэффициент фасовки должен быть равен 50");
			assert.equal(Number(septanestItem.stockQuantity), 250, "В наличии должно числиться 250 карпул, а не 5 коробок!");

			const batches = await tx
				.select()
				.from(stockBatches)
				.where(and(eq(stockBatches.organizationId, ORG_ID), eq(stockBatches.inventoryItemId, septanestItem.id)));

			assert.ok(batches.length > 0);
			assert.equal(Number(batches[0]?.remainingQty), 250, "В партии должно числиться 250 карпул");
		});
	});

	it("2. Списание 1 карпулы не объявляет ложный овердрафт: остаток становится 249 карпул", async (t) => {
		if (!databaseReady) return t.skip("Database is down");

		const deductRes = await app.inject({
			method: "POST",
			url: `/api/inventory/${ORG_ID}/deduct/visit`,
			headers: authHeaders(),
			payload: {
				visitId: VISIT_ID,
				carpulesCount: 1, // Врач использовал 1 карпулу
				drugName: "Септанест 1:100 000 с адреналином (50 карпул)",
				allowOverdraft: true,
			},
		});

		assert.equal(deductRes.statusCode, 200, deductRes.body);
		const deductData = JSON.parse(deductRes.body);
		assert.equal(deductData.success, true);
		assert.equal(deductData.isOverdraft, false, "Ложный овердрафт не должен срабатывать, так как на складе 250 карпул!");

		// Проверяем остаток в БД: 250 - 1 = 249 карпул
		await withFixtureTenant(ORG_ID, async (tx) => {
			const items = await tx
				.select()
				.from(inventoryItems)
				.where(and(eq(inventoryItems.organizationId, ORG_ID)));

			const septanestItem = items.find((it) => it.name.toLowerCase().includes("септанест"));
			assert.ok(septanestItem);
			assert.equal(Number(septanestItem.stockQuantity), 249, "Остаток должен стать ровно 249 карпул");
		});
	});
});
