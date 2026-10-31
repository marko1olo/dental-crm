import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import Fastify from "fastify";
import {
	calculateAlertsFromItems,
	itemCatalogRoutes,
	supplierInvoiceRoutes,
} from "../../routes/inventory.js";

describe("Inventory Routes Decomposition & Sweet Spot Architecture (Mandates 8b, 8e, 8n, 8x)", () => {
	const cwd = process.cwd();
	const itemCatalogDir = path.resolve(cwd, "apps/api/src/routes/inventory/itemCatalog");
	const supplierInvoicesDir = path.resolve(cwd, "apps/api/src/routes/inventory/supplierInvoices");
	const itemCatalogFacade = path.resolve(cwd, "apps/api/src/routes/inventory/itemCatalogRoutes.ts");
	const supplierInvoiceFacade = path.resolve(cwd, "apps/api/src/routes/inventory/supplierInvoiceRoutes.ts");

	test("Mandate 8b / 8zi: itemCatalog monolith is split into Sweet Spot modules (< 400 lines) and thin facade (< 50 lines)", () => {
		assert.ok(fs.existsSync(itemCatalogFacade), "itemCatalogRoutes.ts facade must exist");
		const facadeLines = fs.readFileSync(itemCatalogFacade, "utf-8").split("\n").length;
		assert.ok(
			facadeLines <= 50,
			`itemCatalogRoutes.ts facade must be <= 50 lines (actual: ${facadeLines})`,
		);

		assert.ok(fs.existsSync(itemCatalogDir), "itemCatalog directory must exist");
		const catalogFiles = fs.readdirSync(itemCatalogDir).filter((f) => f.endsWith(".ts"));
		assert.ok(catalogFiles.length >= 3, `Expected at least 3 itemCatalog modules, found ${catalogFiles.length}`);

		for (const file of catalogFiles) {
			const fullPath = path.join(itemCatalogDir, file);
			const lineCount = fs.readFileSync(fullPath, "utf-8").split("\n").length;
			assert.ok(
				lineCount < 400,
				`File ${file} has ${lineCount} lines, exceeding the 400 lines ceiling (Sweet Spot: 200-300 lines)`,
			);
		}
	});

	test("Mandate 8b / 8zi: supplierInvoices monolith is split into Sweet Spot modules (< 450 lines) and thin facade (< 50 lines)", () => {
		assert.ok(fs.existsSync(supplierInvoiceFacade), "supplierInvoiceRoutes.ts facade must exist");
		const facadeLines = fs.readFileSync(supplierInvoiceFacade, "utf-8").split("\n").length;
		assert.ok(
			facadeLines <= 50,
			`supplierInvoiceRoutes.ts facade must be <= 50 lines (actual: ${facadeLines})`,
		);

		assert.ok(fs.existsSync(supplierInvoicesDir), "supplierInvoices directory must exist");
		const invoiceFiles = fs.readdirSync(supplierInvoicesDir).filter((f) => f.endsWith(".ts"));
		assert.ok(invoiceFiles.length >= 3, `Expected at least 3 supplierInvoices modules, found ${invoiceFiles.length}`);

		for (const file of invoiceFiles) {
			const fullPath = path.join(supplierInvoicesDir, file);
			const lineCount = fs.readFileSync(fullPath, "utf-8").split("\n").length;
			assert.ok(
				lineCount < 450,
				`File ${file} has ${lineCount} lines, exceeding the 450 lines ceiling (Sweet Spot: 200-300 lines)`,
			);
		}
	});

	test("calculateAlertsFromItems: pure calculation logic correctly handles valuations, deficits, and shelf life", () => {
		const now = new Date();
		const pastDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
		const nearDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
		const farDate = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

		const mockItems: any[] = [
			{
				id: "item-1",
				name: "Боры алмазные 801-014M",
				stockQuantity: "0",
				criticalThreshold: "5",
				unitCostRub: "150.00",
				expirationDate: farDate,
			},
			{
				id: "item-2",
				name: "Пломбировочный материал Filtek Z250",
				stockQuantity: "3",
				criticalThreshold: "10",
				unitCostRub: "3200.50",
				expirationDate: nearDate,
			},
			{
				id: "item-3",
				name: "Просроченный анестетик Ультракаин",
				stockQuantity: "10",
				criticalThreshold: "5",
				unitCostRub: "120.00",
				expirationDate: pastDate,
			},
			{
				id: "item-4",
				name: "Валики ватные хлопковые 500 шт",
				stockQuantity: "50",
				criticalThreshold: "5",
				unitCostRub: "250.00",
				expirationDate: farDate,
			},
		];

		const alerts = calculateAlertsFromItems(mockItems);

		assert.strictEqual(alerts.summary.totalItems, 4);
		assert.strictEqual(alerts.summary.outOfStockCount, 1);
		assert.strictEqual(alerts.summary.lowStockCount, 1);
		assert.strictEqual(alerts.summary.expiredCount, 1);
		assert.strictEqual(alerts.summary.expiringSoonCount, 1);

		// 0*150 + 3*3200.50 + 10*120 + 50*250 = 0 + 9601.5 + 1200 + 12500 = 23301.50
		assert.strictEqual(alerts.summary.totalValuationRub, 23301.5);
		assert.strictEqual(alerts.outOfStockItems[0]?.id, "item-1");
		assert.strictEqual(alerts.lowStockItems[0]?.id, "item-2");
		assert.strictEqual(alerts.expiredItems[0]?.id, "item-3");
		assert.strictEqual(alerts.expiringSoonItems[0]?.id, "item-2");
	});

	test("Fastify route registration and security: itemCatalogRoutes and supplierInvoiceRoutes expose full API contract", async () => {
		const app = Fastify();
		await app.register(itemCatalogRoutes);
		await app.register(supplierInvoiceRoutes);
		await app.ready();

		// 1. GET /alerts requires authentication (returns 401 without auth)
		const resAlerts = await app.inject({
			method: "GET",
			url: "/alerts",
		});
		assert.strictEqual(resAlerts.statusCode, 401);

		// 2. GET /items requires authentication
		const resItems = await app.inject({
			method: "GET",
			url: "/items",
		});
		assert.strictEqual(resItems.statusCode, 401);

		// 3. POST /items requires authentication
		const resPostItem = await app.inject({
			method: "POST",
			url: "/items",
			payload: { name: "Тестовый материал" },
		});
		assert.strictEqual(resPostItem.statusCode, 401);

		// 4. POST /acceptance-waybill requires authentication
		const resPostWaybill = await app.inject({
			method: "POST",
			url: "/acceptance-waybill",
			payload: { waybillNumber: "WB-001" },
		});
		assert.strictEqual(resPostWaybill.statusCode, 401);

		// 5. GET /waybills requires authentication
		const resWaybills = await app.inject({
			method: "GET",
			url: "/waybills",
		});
		assert.strictEqual(resWaybills.statusCode, 401);

		await app.close();
	});
});
