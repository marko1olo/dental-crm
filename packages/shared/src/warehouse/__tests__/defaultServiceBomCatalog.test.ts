/**
 * defaultServiceBomCatalog.test.ts — Unit Tests for Service BOM Catalog & Batch Deduction.
 * Mandate 8b (<=120 lines per submodule), Mandate 8e (Doctor Autonomy), Mandate 8n (Soft Negative Stock).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
	calculateBatchBomDeduction,
	DEFAULT_804N_CONSUMABLE_LINKS,
	DEFAULT_SERVICE_CONSUMABLE_LINKS,
	getDefaultBomLinksForService,
	getDefaultBomLinksForService804n,
	HYGIENE_BOM_LINKS,
	ORTHODONTIC_BOM_LINKS,
	ORTHOPEDIC_BOM_LINKS,
	SURGICAL_BOM_LINKS,
	THERAPEUTIC_BOM_LINKS,
} from "../defaultServiceBomCatalog.js";

describe("defaultServiceBomCatalog & bomModules Test Suite", () => {
	it("1. Catalog integrity & backward compatibility", () => {
		assert.equal(DEFAULT_SERVICE_CONSUMABLE_LINKS.length, 50);
		assert.equal(DEFAULT_804N_CONSUMABLE_LINKS.length, 50);
		assert.deepEqual(DEFAULT_SERVICE_CONSUMABLE_LINKS, DEFAULT_804N_CONSUMABLE_LINKS);

		assert.equal(THERAPEUTIC_BOM_LINKS.length, 18);
		assert.equal(SURGICAL_BOM_LINKS.length, 15);
		assert.equal(ORTHOPEDIC_BOM_LINKS.length, 4);
		assert.equal(ORTHODONTIC_BOM_LINKS.length, 3);
		assert.equal(HYGIENE_BOM_LINKS.length, 10);
	});

	it("2. Service BOM link resolution by code & base code fallback", () => {
		const cariesLinks = getDefaultBomLinksForService("A16.07.002.011");
		assert.equal(cariesLinks.length, 4);
		assert.ok(cariesLinks.some((l) => l.inventoryItemId === "mat-composite-filtek"));

		const anesLinks = getDefaultBomLinksForService804n("A11.07.012");
		assert.equal(anesLinks.length, 3);
		assert.ok(anesLinks.some((l) => l.inventoryItemId === "mat-anes-art-100k"));

		// Fallback to base code A16.07.002 if subcode not explicitly found
		const fallbackLinks = getDefaultBomLinksForService("A16.07.002.999");
		assert.equal(fallbackLinks.length, 2);
		assert.equal(fallbackLinks[0]?.service804nCode, "A16.07.002");
	});

	it("3. Batch BOM deduction calculator respects soft negative stock (Mandate 8n)", () => {
		const result = calculateBatchBomDeduction([
			{ serviceCode: "A11.07.012", quantity: 2 }, // 2 carpules anesthesia
			{ serviceCode: "A16.07.002.011", quantity: 1 }, // 1 caries composite
		]);

		assert.equal(result.totalServicesCount, 2);
		assert.equal(result.softNegativeStockAllowed, true);
		assert.ok(result.totalCostPriceKopecks > 0);

		// Anesthetic carpule quantity must be 2 * 1 = 2
		const carpuleItem = result.items.find((i) => i.inventoryItemId === "mat-anes-art-100k");
		assert.ok(carpuleItem);
		assert.equal(carpuleItem.totalQuantity, 2);
		assert.equal(carpuleItem.totalCostPriceKopecks, 29000); // 14500 * 2 = 29000 kopecks
	});

	it("4. Mandate 8b file limits (submodules <= 120 lines, facades <= 15 lines)", () => {
		const root = process.cwd();
		const bomModulesDir = path.join(root, "packages/shared/src/warehouse/bomModules");
		const moduleFiles = fs.readdirSync(bomModulesDir).filter((f) => f.endsWith(".ts"));

		for (const file of moduleFiles) {
			const filePath = path.join(bomModulesDir, file);
			const lineCount = fs.readFileSync(filePath, "utf-8").split("\n").length;
			assert.ok(
				lineCount <= 120,
				`bomModules/${file} has ${lineCount} lines (limit: <= 120 lines)`,
			);
		}

		const facadePath = path.join(root, "packages/shared/src/warehouse/defaultServiceBomCatalog.ts");
		const facadeLines = fs.readFileSync(facadePath, "utf-8").split("\n").length;
		assert.ok(facadeLines <= 15, `defaultServiceBomCatalog.ts has ${facadeLines} lines (limit: <= 15)`);

		const legacyFacadePath = path.join(root, "packages/shared/src/warehouse/default804nBomCatalog.ts");
		const legacyLines = fs.readFileSync(legacyFacadePath, "utf-8").split("\n").length;
		assert.ok(legacyLines <= 10, `default804nBomCatalog.ts has ${legacyLines} lines (limit: <= 10)`);
	});
});
