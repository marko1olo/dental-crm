import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { describe } from "node:test";
import {
	DENTAL_MATERIALS_CATALOG,
	getAllWarrantyDefectTemplates,
	getAllWarrantyPresets,
	MANDATORY_WARRANTY_CONDITIONS,
	STAR_QUICK_PRESETS,
	VITA_SHADES,
	WARRANTY_DEFECT_TEMPLATES,
	WARRANTY_PRESETS,
} from "../index.js";

describe("6 & 7. Master Registry & Budget Integrity", () => {
	const dir = path.resolve(process.cwd(), "apps/web/src/components/warranty/warrantyPresets");
	const facadeFile = path.resolve(process.cwd(), "apps/web/src/components/warranty/warrantyPresets.ts");

	test("WARRANTY_PRESETS integrates 8 categories & defect templates", () => {
		assert.equal(Object.keys(WARRANTY_PRESETS).length, 8);
		assert.equal(getAllWarrantyPresets().length, 8);
		assert.equal(Object.keys(WARRANTY_DEFECT_TEMPLATES).length, 8);
		assert.equal(getAllWarrantyDefectTemplates().length, 8);
	});

	test("Conditions, shades and materials catalog", () => {
		assert.equal(MANDATORY_WARRANTY_CONDITIONS.length, 9);
		assert.equal(VITA_SHADES.length, 55);
		assert.equal(DENTAL_MATERIALS_CATALOG.length, 9);
		assert.equal(STAR_QUICK_PRESETS.length, 4);
	});

	test("Facade line count is strictly <= 25 lines", () => {
		const facadeContent = fs.readFileSync(facadeFile, "utf8");
		const lines = facadeContent.split("\n").length;
		assert.ok(lines <= 25, `Facade must be <= 25 lines, current: ${lines}`);
	});

	test("Zero cartoon emojis across all warranty presets modules", () => {
		const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
		const files = [
			facadeFile,
			...fs.readdirSync(dir).filter((f) => f.endsWith(".ts")).map((f) => path.join(dir, f)),
		];
		for (const file of files) {
			const content = fs.readFileSync(file, "utf8");
			assert.equal(emojiRegex.test(content), false);
		}
	});
});
