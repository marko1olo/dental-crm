/**
 * ============================================================================
 * WARRANTY PRESETS DECOMPOSITION INQUISITION TEST SUITE
 * Mandate 8b & Skill /decomposer Comprehensive Health Verification
 * ============================================================================
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
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
	type DentalMaterialMeta,
	type StarQuickPreset,
	type WarrantyCategory,
	type WarrantyDefectTemplate,
	type WarrantyDefectType,
	type WarrantyMaintenanceCondition,
	type WarrantyPreset,
	type WarrantyRemediationMaterialItem,
} from "../index.js";

import * as facadeExports from "../../warrantyPresets.js";

import {
	COMPOSITE_RESTORATION_PRESET,
	CUSTOM_DEFECT_TEMPLATE,
	ENDODONTIC_TREATMENT_PRESET,
	FILLING_LOSS_DEFECT_TEMPLATE,
	OCCLUSAL_DISCOMFORT_DEFECT_TEMPLATE,
	PERIODONTAL_SPLINTING_PRESET,
	STAR_COMPOSITE_QUICK_PRESET,
	THERAPEUTIC_DEFECT_TEMPLATES,
	THERAPEUTIC_MATERIALS,
	THERAPEUTIC_WARRANTY_PRESETS,
} from "../therapeuticWarrantyPresets.js";

import {
	CERAMIC_CHIP_DEFECT_TEMPLATE,
	CERAMIC_CROWN_VENEER_PRESET,
	CROWN_DECEMENTATION_DEFECT_TEMPLATE,
	DENTURE_FRACTURE_DEFECT_TEMPLATE,
	ORTHOPEDIC_DEFECT_TEMPLATES,
	ORTHOPEDIC_MATERIALS,
	ORTHOPEDIC_WARRANTY_PRESETS,
	REMOVABLE_PROSTHESIS_PRESET,
	STAR_EMAX_QUICK_PRESET,
	STAR_ORTHOPEDIC_QUICK_PRESETS,
	STAR_ZIRCONIA_QUICK_PRESET,
	TEMPORARY_PROSTHESIS_PRESET,
} from "../orthopedicWarrantyPresets.js";

import {
	IMPLANT_FIXTURE_PRESET,
	SCREW_LOOSENING_DEFECT_TEMPLATE,
	STAR_IMPLANT_QUICK_PRESET,
	SURGICAL_IMPLANT_DEFECT_TEMPLATES,
	SURGICAL_IMPLANT_MATERIALS,
	SURGICAL_IMPLANT_WARRANTY_PRESETS,
} from "../surgicalAndImplantWarrantyPresets.js";

import {
	ORTHODONTIC_ALIGNERS_PRESET,
	ORTHODONTIC_DEFECT_TEMPLATES,
	ORTHODONTIC_MATERIALS,
	ORTHODONTIC_WARRANTY_PRESETS,
	RETAINER_DEBONDING_DEFECT_TEMPLATE,
} from "../orthodonticWarrantyPresets.js";

describe("1. 100% Export Parity between Facade and Submodules", () => {
	test("All 18 canonical symbols are exported by facade", () => {
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
			assert.ok(
				sym in facadeExports,
				`Symbol '${sym}' must be exported by root facade apps/web/src/components/warranty/warrantyPresets.ts`,
			);
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

describe("2. Therapeutic Presets & Clinical Defect Templates", () => {
	test("Therapeutic presets contain composite, endodontic, periodontal", () => {
		assert.equal(COMPOSITE_RESTORATION_PRESET.category, "composite_restoration");
		assert.equal(COMPOSITE_RESTORATION_PRESET.baseWarrantyMonths, 12);
		assert.equal(COMPOSITE_RESTORATION_PRESET.serviceCode804n, "A16.07.002.010");

		assert.equal(ENDODONTIC_TREATMENT_PRESET.category, "endodontic_treatment");
		assert.equal(ENDODONTIC_TREATMENT_PRESET.baseWarrantyMonths, 12);
		assert.equal(ENDODONTIC_TREATMENT_PRESET.serviceCode804n, "A16.07.008.002");

		assert.equal(PERIODONTAL_SPLINTING_PRESET.category, "periodontal_splinting");
		assert.equal(PERIODONTAL_SPLINTING_PRESET.baseWarrantyMonths, 6);
		assert.equal(PERIODONTAL_SPLINTING_PRESET.serviceCode804n, "A16.07.019");

		assert.equal(Object.keys(THERAPEUTIC_WARRANTY_PRESETS).length, 3);
	});

	test("Therapeutic defect templates contain filling loss, occlusal, custom", () => {
		assert.equal(FILLING_LOSS_DEFECT_TEMPLATE.defectType, "filling_loss");
		assert.equal(OCCLUSAL_DISCOMFORT_DEFECT_TEMPLATE.defectType, "occlusal_discomfort");
		assert.equal(CUSTOM_DEFECT_TEMPLATE.defectType, "custom_defect");

		assert.equal(Object.keys(THERAPEUTIC_DEFECT_TEMPLATES).length, 3);
	});

	test("Therapeutic materials & quick presets", () => {
		assert.equal(THERAPEUTIC_MATERIALS.length, 3);
		assert.equal(STAR_COMPOSITE_QUICK_PRESET.id, "star_composite_1y");
		assert.equal(STAR_COMPOSITE_QUICK_PRESET.warrantyMonths, 12);
	});
});

describe("3. Orthopedic Presets & Clinical Defect Templates", () => {
	test("Orthopedic presets contain ceramic crowns, removable, temporary", () => {
		assert.equal(CERAMIC_CROWN_VENEER_PRESET.category, "ceramic_crown_veneer");
		assert.equal(CERAMIC_CROWN_VENEER_PRESET.baseWarrantyMonths, 36);
		assert.equal(CERAMIC_CROWN_VENEER_PRESET.serviceCode804n, "A16.07.004.002");

		assert.equal(REMOVABLE_PROSTHESIS_PRESET.category, "removable_prosthesis");
		assert.equal(REMOVABLE_PROSTHESIS_PRESET.baseWarrantyMonths, 12);

		assert.equal(TEMPORARY_PROSTHESIS_PRESET.category, "temporary_prosthesis");
		assert.equal(TEMPORARY_PROSTHESIS_PRESET.baseWarrantyMonths, 1);

		assert.equal(Object.keys(ORTHOPEDIC_WARRANTY_PRESETS).length, 3);
	});

	test("Orthopedic defect templates contain crown decementation, ceramic chip, denture fracture", () => {
		assert.equal(CROWN_DECEMENTATION_DEFECT_TEMPLATE.defectType, "crown_decementation");
		assert.equal(CERAMIC_CHIP_DEFECT_TEMPLATE.defectType, "ceramic_chip");
		assert.equal(DENTURE_FRACTURE_DEFECT_TEMPLATE.defectType, "denture_fracture");

		assert.equal(Object.keys(ORTHOPEDIC_DEFECT_TEMPLATES).length, 3);
	});

	test("Orthopedic quick presets contain E.max and Zirconia", () => {
		assert.equal(STAR_EMAX_QUICK_PRESET.id, "star_emax_2y");
		assert.equal(STAR_EMAX_QUICK_PRESET.warrantyMonths, 24);

		assert.equal(STAR_ZIRCONIA_QUICK_PRESET.id, "star_zirconia_3y");
		assert.equal(STAR_ZIRCONIA_QUICK_PRESET.warrantyMonths, 36);

		assert.equal(STAR_ORTHOPEDIC_QUICK_PRESETS.length, 2);
		assert.equal(ORTHOPEDIC_MATERIALS.length, 3);
	});
});

describe("4. Surgical & Implant Presets", () => {
	test("Implant fixture preset has manufacturer lifetime warranty", () => {
		assert.equal(IMPLANT_FIXTURE_PRESET.category, "implant_fixture");
		assert.equal(IMPLANT_FIXTURE_PRESET.isManufacturerLifetimeWarranty, true);
		assert.equal(IMPLANT_FIXTURE_PRESET.baseWarrantyMonths, 24);
		assert.equal(IMPLANT_FIXTURE_PRESET.serviceCode804n, "A16.07.006.002");

		assert.equal(SCREW_LOOSENING_DEFECT_TEMPLATE.defectType, "screw_loosening");
		assert.equal(STAR_IMPLANT_QUICK_PRESET.id, "star_implant_lifetime");
		assert.equal(SURGICAL_IMPLANT_MATERIALS.length, 2);
	});
});

describe("5. Orthodontic Presets", () => {
	test("Orthodontic aligners preset and retainer debonding template", () => {
		assert.equal(ORTHODONTIC_ALIGNERS_PRESET.category, "orthodontic_aligners");
		assert.equal(ORTHODONTIC_ALIGNERS_PRESET.baseWarrantyMonths, 12);
		assert.equal(ORTHODONTIC_ALIGNERS_PRESET.serviceCode804n, "A16.07.048.001");

		assert.equal(RETAINER_DEBONDING_DEFECT_TEMPLATE.defectType, "retainer_debonding");
		assert.equal(ORTHODONTIC_MATERIALS.length, 1);
	});
});

describe("6. Master Registry Integration & Helpers", () => {
	test("WARRANTY_PRESETS integrates all 8 categories", () => {
		const categories = Object.keys(WARRANTY_PRESETS);
		assert.equal(categories.length, 8);
		assert.deepEqual(categories, [
			"composite_restoration",
			"ceramic_crown_veneer",
			"implant_fixture",
			"orthodontic_aligners",
			"removable_prosthesis",
			"endodontic_treatment",
			"periodontal_splinting",
			"temporary_prosthesis",
		]);

		const all = getAllWarrantyPresets();
		assert.equal(all.length, 8);
		assert.equal(getWarrantyPreset("composite_restoration").code, "WAR-COMP-01");
		// Fallback for unknown
		assert.equal(getWarrantyPreset("non_existent" as any).code, "WAR-COMP-01");
	});

	test("WARRANTY_DEFECT_TEMPLATES integrates all 8 defect types", () => {
		const types = Object.keys(WARRANTY_DEFECT_TEMPLATES);
		assert.equal(types.length, 8);
		assert.deepEqual(types, [
			"filling_loss",
			"crown_decementation",
			"ceramic_chip",
			"screw_loosening",
			"denture_fracture",
			"retainer_debonding",
			"occlusal_discomfort",
			"custom_defect",
		]);

		const all = getAllWarrantyDefectTemplates();
		assert.equal(all.length, 8);
		assert.equal(getWarrantyDefectTemplate("filling_loss").code, "DEF-FILL-01");
		// Fallback for unknown
		assert.equal(getWarrantyDefectTemplate("unknown" as any).code, "DEF-FILL-01");
	});

	test("MANDATORY_WARRANTY_CONDITIONS has all 9 conditions", () => {
		assert.equal(MANDATORY_WARRANTY_CONDITIONS.length, 9);
		for (let i = 0; i < 9; i++) {
			assert.equal(MANDATORY_WARRANTY_CONDITIONS[i]?.number, i + 1);
			assert.equal(MANDATORY_WARRANTY_CONDITIONS[i]?.isMandatory, true);
		}
	});

	test("VITA_SHADES has 55 shades", () => {
		assert.equal(VITA_SHADES.length, 55);
		assert.ok(VITA_SHADES.includes("A1"));
		assert.ok(VITA_SHADES.includes("A2"));
		assert.ok(VITA_SHADES.includes("BL1"));
		assert.ok(VITA_SHADES.includes("Universal / Omnichroma"));
	});

	test("DENTAL_MATERIALS_CATALOG has 9 materials with required fields", () => {
		assert.equal(DENTAL_MATERIALS_CATALOG.length, 9);
		for (const mat of DENTAL_MATERIALS_CATALOG) {
			assert.ok(mat.id.startsWith("mat_"));
			assert.ok(mat.name.length > 0);
			assert.ok(mat.manufacturer.length > 0);
			assert.ok(mat.country.length > 0);
			assert.ok(mat.warrantyMonthsDefault >= 1);
		}
	});

	test("STAR_QUICK_PRESETS has all 4 quick presets", () => {
		assert.equal(STAR_QUICK_PRESETS.length, 4);
		assert.equal(STAR_QUICK_PRESETS[0]?.id, "star_composite_1y");
		assert.equal(STAR_QUICK_PRESETS[1]?.id, "star_emax_2y");
		assert.equal(STAR_QUICK_PRESETS[2]?.id, "star_zirconia_3y");
		assert.equal(STAR_QUICK_PRESETS[3]?.id, "star_implant_lifetime");
	});
});

describe("7. Mandate 8b Line Budget & Mandate 8d Zero Emojis", () => {
	const dir = path.resolve(process.cwd(), "apps/web/src/components/warranty/warrantyPresets");
	const facadeFile = path.resolve(process.cwd(), "apps/web/src/components/warranty/warrantyPresets.ts");

	test("Facade line count is strictly <= 25 lines", () => {
		const facadeContent = fs.readFileSync(facadeFile, "utf8");
		const lines = facadeContent.split("\n").length;
		assert.ok(lines <= 25, `Facade must be <= 25 lines, current: ${lines}`);
	});

	test("All module files are strictly <= 800 lines", () => {
		const files = fs.readdirSync(dir).filter((f) => f.endsWith(".ts"));
		for (const file of files) {
			const fullPath = path.join(dir, file);
			const lines = fs.readFileSync(fullPath, "utf8").split("\n").length;
			assert.ok(lines <= 800, `File ${file} exceeds 800 lines: ${lines}`);
		}
	});

	test("Zero cartoon emojis across all warranty presets modules", () => {
		const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
		const files = [
			facadeFile,
			...fs.readdirSync(dir).filter((f) => f.endsWith(".ts")).map((f) => path.join(dir, f)),
		];

		for (const file of files) {
			const content = fs.readFileSync(file, "utf8");
			assert.equal(
				emojiRegex.test(content),
				false,
				`File ${path.basename(file)} contains prohibited cartoon emojis`,
			);
		}
	});
});
