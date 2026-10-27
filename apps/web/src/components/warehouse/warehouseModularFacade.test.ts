/**
 * warehouseModularFacade.test.ts — Verification of Warehouse & Inventory Components (Mandate 8b <= 120 lines).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, "../../..");

describe("Warehouse Modular Facade & Inventory Styles", () => {
	it("verifies mobile-inventory.css is a clean import facade <= 25 lines", () => {
		const facadePath = path.join(webRoot, "src/styles/modules/mobile-inventory.css");
		assert.ok(fs.existsSync(facadePath), "mobile-inventory.css must exist");

		const content = fs.readFileSync(facadePath, "utf8");
		const lines = content.split("\n").filter((l) => l.trim().length > 0);
		assert.ok(lines.length <= 25, `mobile-inventory.css must be <= 25 lines, got ${lines.length}`);
	});

	it("verifies inventory.css is a clean import facade <= 25 lines per Mandate 8b", () => {
		const facadePath = path.join(webRoot, "src/styles/modules/inventory.css");
		assert.ok(fs.existsSync(facadePath), "inventory.css must exist");

		const content = fs.readFileSync(facadePath, "utf8");
		const lines = content.split("\n").filter((l) => l.trim().length > 0);
		assert.ok(lines.length <= 25, `inventory.css must be <= 25 lines, got ${lines.length}`);
	});

	it("verifies all modular inventory stylesheets in inventoryStyles/ are strictly <= 120 lines", () => {
		const dir = path.join(webRoot, "src/styles/inventoryStyles");
		assert.ok(fs.existsSync(dir), "inventoryStyles directory must exist");

		const files = fs.readdirSync(dir).filter((f) => f.endsWith(".css"));
		assert.ok(files.length >= 8, `Expected at least 8 modular css files, found ${files.length}`);

		for (const file of files) {
			const fullPath = path.join(dir, file);
			const lines = fs.readFileSync(fullPath, "utf8").split("\n").length;
			assert.ok(lines <= 120, `File ${file} has ${lines} lines, exceeding 120 lines limit!`);
		}
	});

	it("verifies canonical SSOT exports WarehouseView and StockBalanceTable aliases", async () => {
		const mod = await import("../InventoryView.js");
		assert.equal(typeof mod.WarehouseView, "object");
		assert.equal(typeof mod.InventoryView, "object");
		assert.equal(typeof mod.StockBalanceTable, "function");
		assert.equal(typeof mod.InventoryStockTable, "function");
	});
});
