import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	DENTAL_MATERIALS_CATALOG,
	getAllWarrantyDefectTemplates,
	getAllWarrantyPresets,
	getWarrantyDefectTemplate,
	getWarrantyPreset,
	MANDATORY_WARRANTY_CONDITIONS,
	STAR_QUICK_PRESETS,
	VITA_SHADES,
	WARRANTY_DEFECT_TEMPLATES,
	WARRANTY_PRESETS,
} from "../index.js";
import * as facadeExports from "../../warrantyPresets.js";

describe("1. 100% Export Parity between Facade and Submodules", () => {
	test("All canonical symbols are exported by facade", () => {
		const requiredSymbols = [
			"WARRANTY_PRESETS",
			"MANDATORY_WARRANTY_CONDITIONS",
			"VITA_SHADES",
			"DENTAL_MATERIALS_CATALOG",
			"getWarrantyPreset",
			"getAllWarrantyPresets",
			"STAR_QUICK_PRESETS",
			"WARRANTY_DEFECT_TEMPLATES",
			"getWarrantyDefectTemplate",
			"getAllWarrantyDefectTemplates",
		];
		for (const sym of requiredSymbols) {
			assert.ok(sym in facadeExports, `Symbol '${sym}' must be exported by root facade`);
		}
	});

	test("Facade references identical objects as modular barrel", () => {
		assert.strictEqual(facadeExports.WARRANTY_PRESETS, WARRANTY_PRESETS);
		assert.strictEqual(facadeExports.MANDATORY_WARRANTY_CONDITIONS, MANDATORY_WARRANTY_CONDITIONS);
		assert.strictEqual(facadeExports.VITA_SHADES, VITA_SHADES);
		assert.strictEqual(facadeExports.DENTAL_MATERIALS_CATALOG, DENTAL_MATERIALS_CATALOG);
		assert.strictEqual(facadeExports.STAR_QUICK_PRESETS, STAR_QUICK_PRESETS);
		assert.strictEqual(facadeExports.WARRANTY_DEFECT_TEMPLATES, WARRANTY_DEFECT_TEMPLATES);
		assert.strictEqual(facadeExports.getWarrantyPreset, getWarrantyPreset);
		assert.strictEqual(facadeExports.getAllWarrantyPresets, getAllWarrantyPresets);
		assert.strictEqual(facadeExports.getWarrantyDefectTemplate, getWarrantyDefectTemplate);
		assert.strictEqual(facadeExports.getAllWarrantyDefectTemplates, getAllWarrantyDefectTemplates);
	});
});
