/**
 * anesthesiaSafetyAutopilotMrd.test.ts — Chairside 1-Click Anesthesia Selector without Weight Interrogation
 * Mandates 8e (Doctor Autonomy), 8n (Solo Doctor Sovereignty), 8y (Zero Pharma Paranoia).
 * Anti-Reality-Simulator Mandate: no Clark/Young weight-based formulas for adult dental filling.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CARDIO_LIMIT_BADGE_TEXT,
	CLINICAL_CHAIRSIDE_ANESTHESIA_PRESETS,
	calculatePatientMrd,
	formatClinicalChairsideEntry,
	get1ClickPhysiologicalNorm,
} from "../anesthesiaCalculatorEngine";

describe("Chairside Anesthesia Autonomy — Weight-Free 1-Click Carpules Selector", () => {
	it("provides 1-click physiological norm preset without weight interrogation (1 carpule, 1.7 ml)", () => {
		const norm = get1ClickPhysiologicalNorm("septanest_100");
		assert.equal(norm.drugKey, "septanest_100");
		assert.equal(norm.carpulesCount, 1);
		assert.equal(norm.volumeMl, 1.7);
		assert.equal(norm.isSafeNorm, true);
	});

	it("exposes primary chairside drug presets: Septanest 1:100 000, Ubistesin/Ultracain Forte, Scandonest 3%, Ultracain DS", () => {
		assert.equal(CLINICAL_CHAIRSIDE_ANESTHESIA_PRESETS.length, 4);
		const septanest = CLINICAL_CHAIRSIDE_ANESTHESIA_PRESETS.find((p) => p.drugKey === "septanest_100");
		assert.ok(septanest);
		assert.equal(septanest.carpulesCount, 1);
		assert.equal(septanest.volumeMl, 1.7);
		assert.match(septanest.labelRu, /Септанест 1:100 000/);

		const scandonest = CLINICAL_CHAIRSIDE_ANESTHESIA_PRESETS.find((p) => p.drugKey === "scandonest_3");
		assert.ok(scandonest);
		assert.equal(scandonest.isAdrenalineFree, true);
		assert.equal(scandonest.isCardioSafe, true);
		assert.match(scandonest.labelRu, /Скандонест 3%/);
	});

	it("supports fast 2-carpule clinical selection (3.4 ml) without disabling buttons", () => {
		const entry = formatClinicalChairsideEntry({
			drugKey: "septanest_100",
			carpulesCount: 2,
			toothNumber: 46,
		});
		assert.match(entry, /Септанест 1:100 000/);
		assert.match(entry, /3\.4 мл/);
		assert.match(entry, /2 карп\./);
		assert.match(entry, /зуба 46/);
		assert.match(entry, /Аспирационная проба отрицательная/);
	});

	it("supports 1-click treatment without anesthesia by patient consent", () => {
		const entry = formatClinicalChairsideEntry({
			drugKey: "none",
			carpulesCount: 0,
		});
		assert.match(entry, /без анестезии/i);
	});

	it("supports safe fallback calculation without forcing doctor to enter body weight", () => {
		const mrd = calculatePatientMrd({
			drugKey: "ultracain_ds_forte",
			carpulesCount: 1,
		});
		assert.ok(mrd.patientWeightKg >= 70, "Uses physiological adult default");
		assert.equal(mrd.isCappedByCardio, false);
	});

	it("flags cardio limit badge passively when cardio risk is flagged without blocking actions", () => {
		const mrdCardio = calculatePatientMrd({
			drugKey: "ultracain_ds_forte",
			isCardioRestricted: true,
		});
		assert.equal(mrdCardio.isCappedByCardio, true);
		assert.equal(mrdCardio.cardioLimitBadgeText, CARDIO_LIMIT_BADGE_TEXT);
	});
});
