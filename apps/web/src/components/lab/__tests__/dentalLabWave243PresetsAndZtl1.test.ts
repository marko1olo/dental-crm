import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
	EXPRESS_PRESET_ZIRCONIA_CROWN,
	EXPRESS_PRESET_BRIDGE_ZIRCONIA,
	EXPRESS_PRESET_EMAX_INLAY,
	MODAL_EXPRESS_LAB_PRESETS,
} from "../dentalLabCatalogData";

describe("Wave 243 — Presets & Form ZTL-1", () => {
	it("1. 1-Click presets include Single crown ZrO2, Bridge prosthesis, and Inlay E.max", () => {
		assert.ok(EXPRESS_PRESET_ZIRCONIA_CROWN);
		assert.equal(EXPRESS_PRESET_ZIRCONIA_CROWN.constructionType, "single_crown");
		assert.equal(EXPRESS_PRESET_ZIRCONIA_CROWN.materialId, "zirconia_multilayer");
		assert.equal(EXPRESS_PRESET_ZIRCONIA_CROWN.colorVita, "A2");
		assert.equal(EXPRESS_PRESET_ZIRCONIA_CROWN.workingDays, 5);

		assert.ok(EXPRESS_PRESET_BRIDGE_ZIRCONIA);
		assert.equal(EXPRESS_PRESET_BRIDGE_ZIRCONIA.constructionType, "bridge");
		assert.equal(EXPRESS_PRESET_BRIDGE_ZIRCONIA.materialId, "zirconia_multilayer");
		assert.equal(EXPRESS_PRESET_BRIDGE_ZIRCONIA.colorVita, "A2");
		assert.equal(EXPRESS_PRESET_BRIDGE_ZIRCONIA.workingDays, 7);

		assert.ok(EXPRESS_PRESET_EMAX_INLAY);
		assert.equal(EXPRESS_PRESET_EMAX_INLAY.constructionType, "inlay_onlay");
		assert.equal(EXPRESS_PRESET_EMAX_INLAY.materialId, "emax_lithium_disilicate");
		assert.equal(EXPRESS_PRESET_EMAX_INLAY.colorVita, "A2");
		assert.equal(EXPRESS_PRESET_EMAX_INLAY.workingDays, 5);

		const presetIds = MODAL_EXPRESS_LAB_PRESETS.map((p) => p.id);
		assert.ok(presetIds.includes("zirconia_crown_express"));
		assert.ok(presetIds.includes("bridge_zirconia_express"));
		assert.ok(presetIds.includes("emax_inlay_express"));
		assert.ok(presetIds.includes("emax_crown_express"));
	});

	it("4. Form ZTL-1 5-stage tracker and Mandate 8e/8s invariants", () => {
		const currentFile = fileURLToPath(import.meta.url);
		const labDir = path.resolve(path.dirname(currentFile), "..");
		const catalogPath = path.join(labDir, "dentalLabCatalogData.ts");
		const content = fs.readFileSync(catalogPath, "utf-8");

		assert.ok(content.includes("CANONICAL_LAB_STAGES"));
		assert.ok(content.includes("scan_sent"));
		assert.ok(content.includes("in_production"));
		assert.ok(content.includes("fitting_ready"));
		assert.ok(content.includes("in_clinic"));
		assert.ok(content.includes("seated"));
	});
});
