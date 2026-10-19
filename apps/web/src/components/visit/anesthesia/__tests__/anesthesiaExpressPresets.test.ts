/**
 * anesthesiaExpressPresets.test.ts — Unit Tests for 1-Click Chairside Express Anesthesia Presets
 * Standards: Минздрав РФ, СтАР. Mandates: 8e, 8k, 8n, 8b (<= 120 lines).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	EXPRESS_ANESTHESIA_PRESETS,
	getExpressPresetById,
} from "../anesthesiaExpressPresets";
import {
	getAnestheticDrugSpecification,
	getNeedleSpecification,
	getTechniqueSpecification,
} from "../anesthesiaTechniqueMath";

describe("Anesthesia Express Presets Engine (Mandates 8e, 8k, 8n)", () => {
	it("should define exactly 7 chairside express presets matching clinical standards", () => {
		assert.equal(EXPRESS_ANESTHESIA_PRESETS.length, 7);
		const ids = EXPRESS_ANESTHESIA_PRESETS.map((p) => p.id);
		assert.ok(ids.includes("infiltration_articaine_1_7"));
		assert.ok(ids.includes("mandibular_weisbrem_articaine_1_7"));
		assert.ok(ids.includes("torusal_articaine_1_7"));
		assert.ok(ids.includes("mandibular_cardio_scandonest_1_7"));
		assert.ok(ids.includes("intraligamentary_articaine_0_4"));
		assert.ok(ids.includes("mandibular_plus_infiltration_ultracaine_forte"));
		assert.ok(ids.includes("infiltration_septanest_1_7"));
	});

	it("should correctly configure Preset 1: Infiltration 1.7 ml (Articaine 1:100k, 30G 21mm)", () => {
		const preset = getExpressPresetById("infiltration_articaine_1_7");
		assert.ok(preset);
		assert.equal(preset.techniqueId, "infiltration_supraperiosteal");
		assert.equal(preset.needleId, "gauge_30_short_21mm");
		assert.equal(preset.drugKey, "articaine_1_100k");
		assert.equal(preset.volumeMl, 1.7);
		assert.equal(preset.isTwoPlaneRequired, false);

		const needle = getNeedleSpecification(preset.needleId);
		assert.equal(needle.gauge, "30G");
		assert.equal(needle.lengthMm, 21);

		const drug = getAnestheticDrugSpecification(preset.drugKey);
		assert.equal(drug.vasoconstrictorRatio, "1:100000");
		assert.equal(drug.activeConcentrationPercent, 4.0);
	});

	it("should correctly configure Preset 2: Mandibular 1.7 ml Weisbrem (Articaine 1:100k, 27G 35mm)", () => {
		const preset = getExpressPresetById("mandibular_weisbrem_articaine_1_7");
		assert.ok(preset);
		assert.equal(preset.techniqueId, "mandibular_weisbrem");
		assert.equal(preset.needleId, "gauge_27_long_35mm");
		assert.equal(preset.drugKey, "articaine_1_100k");
		assert.equal(preset.volumeMl, 1.7);
		assert.equal(preset.isTwoPlaneRequired, true);

		const needle = getNeedleSpecification(preset.needleId);
		assert.equal(needle.gauge, "27G");
		assert.equal(needle.lengthMm, 35);
		assert.equal(needle.aspirationLumenSafety, "high");
	});

	it("should correctly configure Preset 3: Torusal 1.7 ml (Articaine 1:100k, 27G 35mm)", () => {
		const preset = getExpressPresetById("torusal_articaine_1_7");
		assert.ok(preset);
		assert.equal(preset.techniqueId, "torusal");
		assert.equal(preset.needleId, "gauge_27_long_35mm");
		assert.equal(preset.drugKey, "articaine_1_100k");
		assert.equal(preset.volumeMl, 1.7);
		assert.equal(preset.isTwoPlaneRequired, true);

		const tech = getTechniqueSpecification(preset.techniqueId);
		assert.equal(tech.aspirationPlanesRequired, 2);
		assert.equal(tech.requiresBoneContact, true);
	});

	it("should correctly configure Preset 4: Mandibular Cardio (Scandonest 3% Plain, 27G 35mm)", () => {
		const preset = getExpressPresetById("mandibular_cardio_scandonest_1_7");
		assert.ok(preset);
		assert.equal(preset.techniqueId, "mandibular_weisbrem");
		assert.equal(preset.needleId, "gauge_27_long_35mm");
		assert.equal(preset.drugKey, "mepivacaine_plain_3");
		assert.equal(preset.volumeMl, 1.7);
		assert.equal(preset.isTwoPlaneRequired, true);

		const drug = getAnestheticDrugSpecification(preset.drugKey);
		assert.equal(drug.isAdrenalineFree, true);
		assert.equal(drug.vasoconstrictorRatio, "none");
		assert.equal(drug.containsSulfites, false);
	});

	it("should correctly configure Preset 5: Intraligamentary 0.4 ml PDL (Articaine 1:100k, 30G 12mm)", () => {
		const preset = getExpressPresetById("intraligamentary_articaine_0_4");
		assert.ok(preset);
		assert.equal(preset.techniqueId, "intraligamentary_pdl");
		assert.equal(preset.needleId, "gauge_30_ultrashort_12mm");
		assert.equal(preset.drugKey, "articaine_1_100k");
		assert.equal(preset.volumeMl, 0.4);
		assert.equal(preset.isTwoPlaneRequired, false);

		const tech = getTechniqueSpecification(preset.techniqueId);
		assert.equal(tech.targetPressureAtm.isHighPressure, true);
	});
});
