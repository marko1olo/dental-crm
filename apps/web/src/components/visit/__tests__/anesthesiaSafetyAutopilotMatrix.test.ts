/**
 * anesthesiaSafetyAutopilotMatrix.test.ts — Chairside Clinical Matrix & Autopilot Resolution
 * Mandates 8e (Doctor Autonomy), 8x (Clear Russian Clinical Language), 8y (Zero Pharma Paranoia).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CARDIO_LIMIT_BADGE_TEXT,
	formatClinicalChairsideEntry,
	formatAnesthesiaSoapText,
	resolveAutopilotAnesthesia,
} from "../anesthesiaCalculatorEngine";

describe("Chairside Clinical Matrix & 1-Click Autopilot (Mandates 8e, 8x, 8y)", () => {
	it("resolves Healthy Patient -> Ultracain DS Forte 1:100 000 (Standard)", () => {
		const auto = resolveAutopilotAnesthesia({
			somaticProfile: {},
		});
		assert.equal(auto.selectedDrugKey, "ultracain_ds_forte");
		assert.equal(auto.isCardioRestricted, false);
		assert.equal(auto.cardioLimitBadgeText, null);
	});

	it("resolves Hypertension/IHD -> Scandonest 3% (Plain) with cardio badge", () => {
		const auto = resolveAutopilotAnesthesia({
			somaticProfile: { hasHypertension: true, hasIhd: true },
		});
		assert.equal(auto.selectedDrugKey, "scandonest_3");
		assert.equal(auto.cardioLimitBadgeText, CARDIO_LIMIT_BADGE_TEXT);
	});

	it("resolves Bronchial Asthma -> Scandonest 3% (Sulfite-free plain)", () => {
		const auto = resolveAutopilotAnesthesia({
			somaticProfile: { hasBronchialAsthma: true },
		});
		assert.equal(auto.selectedDrugKey, "scandonest_3");
		assert.match(auto.badgeText, /Без сульфитов/);
	});

	it("resolves Pregnancy -> Ultracain DS 1:200 000 (Low Epinephrine)", () => {
		const auto = resolveAutopilotAnesthesia({
			somaticProfile: { isPregnantOrLactating: true, pregnancyTrimester: "trimester_1" },
		});
		assert.equal(auto.selectedDrugKey, "ultracain_ds");
		assert.match(auto.badgeText, /Беременность \/ Лактация/);
	});

	it("generates clean Russian medical record entry without bureaucratic jargon", () => {
		const entry = formatClinicalChairsideEntry({
			drugKey: "septanest_100",
			carpulesCount: 1,
			toothNumber: 36,
		});

		assert.match(entry, /Инфильтрационная анестезия/);
		assert.match(entry, /Септанест 1:100 000/);
		assert.match(entry, /1\.7 мл/);
		assert.match(entry, /1 карп\./);
		assert.match(entry, /зуба 36/);
		assert.match(entry, /Аспирационная проба отрицательная/);
	});

	it("serializes SOAP diary text cleanly with negative aspiration test", () => {
		const soap = formatAnesthesiaSoapText({
			methodKey: "mandibular",
			drugKey: "scandonest_3",
			carpulesCount: 1,
			toothNumber: 47,
			somaticProfile: { hasHypertension: true },
		});

		assert.match(soap, /Проводниковая мандибулярная анестезия в области зуба 47/);
		assert.match(soap, /Скандонест 3%/);
		assert.match(soap, /Аспирационная проба отрицательная/);
	});
});
