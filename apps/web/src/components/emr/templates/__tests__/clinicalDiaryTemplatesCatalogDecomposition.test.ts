import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	CLINICAL_1CLICK_TEMPLATES_CATALOG,
	PHYSIOLOGICAL_NORM_PRESET,
	CLINICAL_CATEGORY_LABELS,
	THERAPY_DIARY_TEMPLATES,
	ENDODONTIC_DIARY_TEMPLATES,
	SURGICAL_DIARY_TEMPLATES,
	ORTHOPEDIC_DIARY_TEMPLATES,
	PERIODONTIC_DIARY_TEMPLATES,
	PEDIATRIC_DIARY_TEMPLATES,
} from "../clinicalDiaryTemplatesCatalogData";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("Clinical Diary Templates Catalog — Mandate 8b Decomposition & EBM Inquisition", () => {
	const catalogDir = path.resolve(__dirname, "../catalog");
	const facadePath = path.resolve(__dirname, "../clinicalDiaryTemplatesCatalogData.ts");

	it("1. Mandate 8b: Root facade must be <= 80 lines", () => {
		const facadeContent = fs.readFileSync(facadePath, "utf-8");
		const lines = facadeContent.split("\n").length;
		assert.ok(lines <= 80, `Facade length (${lines}) exceeds Mandate 8b limit of 80 lines`);
	});

	it("2. Mandate 8b / 8zi: Every specialized catalog module must be <= 350 lines", () => {
		const expectedModules = [
			"clinicalDiaryTypes.ts",
			"therapyDiaryTemplates.ts",
			"endodonticDiaryTemplates.ts",
			"surgicalDiaryTemplates.ts",
			"orthopedicDiaryTemplates.ts",
			"periodonticDiaryTemplates.ts",
			"pediatricDiaryTemplates.ts",
			"physiologicalNormPreset.ts",
		];

		for (const mod of expectedModules) {
			const modPath = path.join(catalogDir, mod);
			assert.ok(fs.existsSync(modPath), `Module ${mod} must exist in catalog/`);
			const lines = fs.readFileSync(modPath, "utf-8").split("\n").length;
			assert.ok(
				lines <= 350,
				`Module ${mod} has ${lines} lines, exceeding healthy limit of 350 lines`,
			);
		}
	});

	it("3. Mandate 8e & 8x: Absence of Soviet bureaucratic forms in clinical texts and templates", () => {
		for (const tmpl of CLINICAL_1CLICK_TEMPLATES_CATALOG) {
			assert.ok(!tmpl.title.includes("043/у"), `Title ${tmpl.title} must not contain 043/у`);
			assert.ok(!tmpl.defaultProcedureProtocol.includes("043/у"), `Protocol for ${tmpl.id} must not contain 043/у`);
		}
		assert.ok(!PHYSIOLOGICAL_NORM_PRESET.defaultProcedureProtocol.includes("043/у"));
	});

	it("4. Integrity: all specialized arrays compose the full catalog accurately", () => {
		const totalCount =
			THERAPY_DIARY_TEMPLATES.length +
			ENDODONTIC_DIARY_TEMPLATES.length +
			SURGICAL_DIARY_TEMPLATES.length +
			ORTHOPEDIC_DIARY_TEMPLATES.length +
			PERIODONTIC_DIARY_TEMPLATES.length +
			PEDIATRIC_DIARY_TEMPLATES.length;

		assert.equal(CLINICAL_1CLICK_TEMPLATES_CATALOG.length, totalCount);
		assert.equal(CLINICAL_1CLICK_TEMPLATES_CATALOG.length, 13);
		assert.equal(PHYSIOLOGICAL_NORM_PRESET.id, "somatic_healthy_norm");
	});

	it("5. Categories & labels match defined category set", () => {
		const categories = Object.keys(CLINICAL_CATEGORY_LABELS);
		assert.ok(categories.includes("therapy"));
		assert.ok(categories.includes("endodontics"));
		assert.ok(categories.includes("surgery"));
		assert.ok(categories.includes("orthopedics"));
		assert.ok(categories.includes("periodontics"));
		assert.ok(categories.includes("pediatric"));
	});
});
