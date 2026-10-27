import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	COMPOSITE_RESTORATION_PRESET,
	CUSTOM_DEFECT_TEMPLATE,
	FILLING_LOSS_DEFECT_TEMPLATE,
	THERAPEUTIC_DEFECT_TEMPLATES,
	THERAPEUTIC_WARRANTY_PRESETS,
} from "../therapeuticWarrantyPresets.js";
import {
	CERAMIC_CROWN_VENEER_PRESET,
	CROWN_DECEMENTATION_DEFECT_TEMPLATE,
	ORTHOPEDIC_DEFECT_TEMPLATES,
	ORTHOPEDIC_WARRANTY_PRESETS,
	STAR_EMAX_QUICK_PRESET,
	STAR_ZIRCONIA_QUICK_PRESET,
} from "../orthopedicWarrantyPresets.js";
import {
	IMPLANT_FIXTURE_PRESET,
	SCREW_LOOSENING_DEFECT_TEMPLATE,
	STAR_IMPLANT_QUICK_PRESET,
} from "../surgicalAndImplantWarrantyPresets.js";
import {
	ORTHODONTIC_ALIGNERS_PRESET,
	RETAINER_DEBONDING_DEFECT_TEMPLATE,
} from "../orthodonticWarrantyPresets.js";

describe("2-5. Clinical Categories & Defect Templates", () => {
	test("Therapeutic presets and defect templates", () => {
		assert.equal(COMPOSITE_RESTORATION_PRESET.category, "composite_restoration");
		assert.equal(COMPOSITE_RESTORATION_PRESET.baseWarrantyMonths, 12);
		assert.equal(FILLING_LOSS_DEFECT_TEMPLATE.defectType, "filling_loss");
		assert.equal(CUSTOM_DEFECT_TEMPLATE.defectType, "custom_defect");
		assert.equal(Object.keys(THERAPEUTIC_WARRANTY_PRESETS).length, 3);
		assert.equal(Object.keys(THERAPEUTIC_DEFECT_TEMPLATES).length, 3);
	});

	test("Orthopedic presets and defect templates", () => {
		assert.equal(CERAMIC_CROWN_VENEER_PRESET.category, "ceramic_crown_veneer");
		assert.equal(CERAMIC_CROWN_VENEER_PRESET.baseWarrantyMonths, 36);
		assert.equal(CROWN_DECEMENTATION_DEFECT_TEMPLATE.defectType, "crown_decementation");
		assert.equal(STAR_EMAX_QUICK_PRESET.warrantyMonths, 24);
		assert.equal(STAR_ZIRCONIA_QUICK_PRESET.warrantyMonths, 36);
		assert.equal(Object.keys(ORTHOPEDIC_WARRANTY_PRESETS).length, 3);
		assert.equal(Object.keys(ORTHOPEDIC_DEFECT_TEMPLATES).length, 3);
	});

	test("Surgical & Implant presets", () => {
		assert.equal(IMPLANT_FIXTURE_PRESET.category, "implant_fixture");
		assert.equal(IMPLANT_FIXTURE_PRESET.isManufacturerLifetimeWarranty, true);
		assert.equal(SCREW_LOOSENING_DEFECT_TEMPLATE.defectType, "screw_loosening");
		assert.equal(STAR_IMPLANT_QUICK_PRESET.id, "star_implant_lifetime");
	});

	test("Orthodontic presets", () => {
		assert.equal(ORTHODONTIC_ALIGNERS_PRESET.category, "orthodontic_aligners");
		assert.equal(ORTHODONTIC_ALIGNERS_PRESET.baseWarrantyMonths, 12);
		assert.equal(RETAINER_DEBONDING_DEFECT_TEMPLATE.defectType, "retainer_debonding");
	});
});
