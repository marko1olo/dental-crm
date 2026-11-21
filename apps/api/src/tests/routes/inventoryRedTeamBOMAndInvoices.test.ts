/**
 * apps/api/src/tests/routes/inventoryRedTeamBOMAndInvoices.test.ts
 *
 * Red Team Inquisitor Test Suite:
 * 1. Defect 1: Tech cards SSOT (procedure_tech_cards & procedure_tech_card_items synchronization).
 * 2. Defect 2: Relational supplier invoices (inventory_supplier_invoices & items without regex parsing).
 * 3. Defect 4: Idempotency-Key preservation across shift batch write-offs.
 * 4. Defect 5: Shift consumables calculation via real completed visits & procedure BOMs.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	inventoryItems,
	inventorySupplierInvoices,
	inventorySupplierInvoiceItems,
	inventoryTransactions,
	organizations,
	procedureMaterialRules,
	procedureTechCards,
	procedureTechCardItems,
	serviceCatalogItems,
	users,
} from "../../db/schema.js";
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

const NAMESPACE = "invRedTeamBom";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const STAFF_ID = fixtureUuid(NAMESPACE, 2);
const SERVICE_ID = fixtureUuid(NAMESPACE, 3);
const ITEM_ID = fixtureUuid(NAMESPACE, 4);
const ITEM_GLOVES_ID = fixtureUuid(NAMESPACE, 5);

function isDbDown(error: unknown): boolean {
	if (isDatabaseUnavailable(error)) return true;
	const cause = (error as { cause?: unknown })?.cause;
	if (cause && isDatabaseUnavailable(cause)) return true;
	const message = error instanceof Error ? error.message : String(error);
	return /ECONNREFUSED|connect|5432/i.test(message);
}

describe("Inventory Red Team: BOM SSOT, Relational Invoices & Idempotency", () => {
	let app: FastifyInstance;
	let staffToken = "";
	let databaseReady = true;

	function authHeaders(extra: Record<string, string> = {}) {
		return {
			Authorization: `Bearer ${staffToken}`,
			[STAFF_TOKEN_HEADER]: staffToken,
			[CLINIC_TOKEN_HEADER]: staffToken,
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
				await tx.delete(inventorySupplierInvoices).where(eq(inventorySupplierInvoices.organizationId, ORG_ID));

				await tx.insert(organizations).values({
					id: ORG_ID,
					name: "Клиника Red Team Склада",
				});

				await tx.insert(users).values({
					id: STAFF_ID,
					organizationId: ORG_ID,
					fullName: "Заведующий складом",
					role: "admin",
				});

				await tx.insert(serviceCatalogItems).values({
					id: SERVICE_ID,
					organizationId: ORG_ID,
					code: "A16.07.002.011",
					title: "Лечение кариеса нанокомпозитом",
					category: "therapy",
					basePriceRub: 4500,
					priceRub: 4500,
				});

				await tx.insert(inventoryItems).values({
					id: ITEM_ID,
					organizationId: ORG_ID,
					name: "Композит Filtek Z250",
					category: "composite",
					unit: "г",
					stockQuantity: "10.000",
					currentQty: "10.000",
					unitCostRub: "1300.00",
				});

				await tx.insert(inventoryItems).values({
					id: ITEM_GLOVES_ID,
					organizationId: ORG_ID,
					name: "Перчатки нитриловые",
					category: "ppe",
					unit: "пар",
					stockQuantity: "50.000",
					currentQty: "50.000",
					unitCostRub: "35.00",
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
			} catch {
				// Ignore
			}
		}
	});

	it("1. Defect 1: POST /rules синхронизирует procedure_material_rules и procedure_tech_cards", async (t) => {
		if (!databaseReady) return t.skip("Database is down");

		const res = await app.inject({
			method: "POST",
			url: `/api/inventory/${ORG_ID}/rules`,
			headers: authHeaders({ "content-type": "application/json" }),
			payload: {
				serviceId: SERVICE_ID,
				inventoryItemId: ITEM_ID,
				quantityToDeduct: 0.35,
			},
		});

		assert.equal(res.statusCode, 200, res.body);
		const data = JSON.parse(res.body);
		assert.equal(data.serviceId, SERVICE_ID);

		// Проверяем физическое наличие в канонической таблице procedure_tech_cards
		await withFixtureTenant(ORG_ID, async (tx) => {
			const [techCard] = await tx
				.select()
				.from(procedureTechCards)
				.where(
					and(
						eq(procedureTechCards.organizationId, ORG_ID),
						eq(procedureTechCards.serviceId, SERVICE_ID),
					),
				);
			assert.ok(techCard, "Техкарта должна быть создана в procedure_tech_cards");

			const items = await tx
				.select()
				.from(procedureTechCardItems)
				.where(eq(procedureTechCardItems.techCardId, techCard.id));
			assert.equal(items.length, 1);
			assert.equal(items[0]!.inventoryItemId, ITEM_ID);
			assert.equal(Number(items[0]!.quantity), 0.35);
		});

		// Проверяем получение через эндпоинт GET /:orgId/tech-cards
		const getCardsRes = await app.inject({
			method: "GET",
			url: `/api/inventory/${ORG_ID}/tech-cards?serviceId=${SERVICE_ID}`,
			headers: authHeaders(),
		});
		assert.equal(getCardsRes.statusCode, 200);
		const cards = JSON.parse(getCardsRes.body);
		assert.ok(Array.isArray(cards));
		assert.ok(cards.length >= 1);
		assert.equal(cards[0].serviceId, SERVICE_ID);
		assert.equal(cards[0].items[0].inventoryItemId, ITEM_ID);
	});

	it("2. Defect 2: Приход накладной сохраняется в реляционных таблицах без regex-парсинга", async (t) => {
		if (!databaseReady) return t.skip("Database is down");

		const WAYBILL_NUM = "ВЫП-2026-999";
		const SUPPLIER_NAME = "ООО СтомПоставка РедТим";

		const postRes = await app.inject({
			method: "POST",
			url: `/api/inventory/${ORG_ID}/waybills`,
			headers: authHeaders({ "content-type": "application/json" }),
			payload: {
				waybillNumber: WAYBILL_NUM,
				supplierName: SUPPLIER_NAME,
				supplierInn: "7701234567",
				receiptDate: "2026-11-21",
				items: [
					{
						name: "Перчатки нитриловые",
						inventoryItemId: ITEM_GLOVES_ID,
						quantity: 20,
						unitPriceKopecks: 3500,
						unit: "пар",
						category: "ppe",
						batchNumber: "LOT-GLV-01",
						expirationDate: "2028-01-01",
					},
				],
			},
		});

		assert.equal(postRes.statusCode, 201, postRes.body);
		const postData = JSON.parse(postRes.body);
		assert.equal(postData.success, true);
		assert.equal(postData.waybillNumber, WAYBILL_NUM);

		// Проверяем, что в БД создана запись в inventory_supplier_invoices
		await withFixtureTenant(ORG_ID, async (tx) => {
			const [inv] = await tx
				.select()
				.from(inventorySupplierInvoices)
				.where(
					and(
						eq(inventorySupplierInvoices.organizationId, ORG_ID),
						eq(inventorySupplierInvoices.invoiceNumber, WAYBILL_NUM),
					),
				);
			assert.ok(inv, "Запись накладной должна физически существовать в inventory_supplier_invoices");
			assert.equal(inv.supplierName, SUPPLIER_NAME);
			assert.equal(inv.supplierInn, "7701234567");

			const invItems = await tx
				.select()
				.from(inventorySupplierInvoiceItems)
				.where(eq(inventorySupplierInvoiceItems.invoiceId, inv.id));
			assert.equal(invItems.length, 1);
			assert.equal(Number(invItems[0]!.quantity), 20);
			assert.equal(Number(invItems[0]!.unitPriceKopecks), 3500);
		});

		// Проверяем чтение через GET /waybills — должно вернуть чистый реляционный объект
		const getWbRes = await app.inject({
			method: "GET",
			url: `/api/inventory/${ORG_ID}/waybills`,
			headers: authHeaders(),
		});
		assert.equal(getWbRes.statusCode, 200);
		const wbData = JSON.parse(getWbRes.body);
		assert.equal(wbData.success, true);
		const foundWb = wbData.waybills.find((w: any) => w.waybillNumber === WAYBILL_NUM);
		assert.ok(foundWb, "Накладная должна возвращаться в реестре");
		assert.equal(foundWb.supplier.name, SUPPLIER_NAME);
		assert.equal(foundWb.supplier.inn, "7701234567");
		assert.equal(foundWb.items.length, 1);
		assert.equal(foundWb.items[0].name, "Перчатки нитриловые");
	});

	it("3. Defect 4: Idempotency-Key предотвращает повторные списания расходников за смену", async (t) => {
		if (!databaseReady) return t.skip("Database is down");

		const IDEM_KEY = "11111111-2222-3333-4444-555555555555";

		// Первое списание с Idempotency-Key
		const res1 = await app.inject({
			method: "POST",
			url: `/api/inventory/${ORG_ID}/shift-deduct`,
			headers: authHeaders({
				"content-type": "application/json",
				"idempotency-key": IDEM_KEY,
			}),
			payload: {
				notes: "Списание под тест идемпотентности",
				items: [{ itemId: ITEM_GLOVES_ID, qty: 5, name: "Перчатки нитриловые" }],
			},
		});

		assert.equal(res1.statusCode, 200, res1.body);
		const data1 = JSON.parse(res1.body);
		assert.equal(data1.success, true);

		// Проверяем остаток в БД (было 50 + 20 от прихода = 70, списали 5 -> 65)
		await withFixtureTenant(ORG_ID, async (tx) => {
			const [itemDb] = await tx
				.select()
				.from(inventoryItems)
				.where(and(eq(inventoryItems.id, ITEM_GLOVES_ID), eq(inventoryItems.organizationId, ORG_ID)));
			assert.ok(itemDb);
			assert.equal(Number(itemDb.stockQuantity), 65);
		});

		// Повторный запрос с тем же Idempotency-Key (симулируем сетевой повтор)
		const res2 = await app.inject({
			method: "POST",
			url: `/api/inventory/${ORG_ID}/shift-deduct`,
			headers: authHeaders({
				"content-type": "application/json",
				"idempotency-key": IDEM_KEY,
			}),
			payload: {
				notes: "Списание под тест идемпотентности",
				items: [{ itemId: ITEM_GLOVES_ID, qty: 5, name: "Перчатки нитриловые" }],
			},
		});

		assert.equal(res2.statusCode, 200, res2.body);
		const data2 = JSON.parse(res2.body);
		assert.equal(data2.success, true);
		assert.ok(data2.message.includes("дедуплицирована") || data2.message.includes("Повторный запрос"));

		// Остаток в БД обязан остаться 65 (ноль двойных списаний!)
		await withFixtureTenant(ORG_ID, async (tx) => {
			const [itemDb] = await tx
				.select()
				.from(inventoryItems)
				.where(and(eq(inventoryItems.id, ITEM_GLOVES_ID), eq(inventoryItems.organizationId, ORG_ID)));
			assert.ok(itemDb);
			assert.equal(Number(itemDb.stockQuantity), 65, "Остаток не должен списаться повторно!");
		});
	});
});
