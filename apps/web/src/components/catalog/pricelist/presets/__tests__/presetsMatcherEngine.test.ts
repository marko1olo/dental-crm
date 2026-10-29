import assert from "node:assert/strict";
import { describe, it as test } from "node:test";
import {
	BASELINE_804N_PRICELIST_SERVICES,
	findPresetsByComplaint,
	findPresetsByIcd10,
	findPresetsByToothContext,
	getRecommendedPresetsForSpecialty,
	matchPresets,
	normalizeCode804n,
	STATUTORY_ORDER_804N_PRESETS,
} from "../index";

describe("Layer 2 Preset Matcher Engine Tests", () => {
	test("normalizeCode804n normalizes messy codes correctly", () => {
		assert.strictEqual(normalizeCode804n("A16.07.002.010"), "A1607002010");
		assert.strictEqual(normalizeCode804n("a16-07-002"), "A1607002");
		assert.strictEqual(normalizeCode804n("  B01.065.001  "), "B01065001");
	});

	test("findPresetsByIcd10 finds services matching ICD-10 diagnosis", () => {
		const cariesPresets = findPresetsByIcd10(STATUTORY_ORDER_804N_PRESETS, "K02.1");
		assert.ok(cariesPresets.length > 0);
		assert.ok(cariesPresets.some((p) => p.commercialTitle.includes("кариес")));

		const pulpitisPresets = findPresetsByIcd10(STATUTORY_ORDER_804N_PRESETS, "K04.0");
		assert.ok(pulpitisPresets.length > 0);
		assert.ok(pulpitisPresets.some((p) => p.tags.includes("эндодонтия") || p.tags.includes("пульпит")));
	});

	test("findPresetsByToothContext handles milk teeth and scalable root canals", () => {
		const pedMatches = findPresetsByToothContext(STATUTORY_ORDER_804N_PRESETS, 54, { isTemporary: true });
		assert.ok(pedMatches.length > 0);
		assert.ok(pedMatches.every((p) => p.category === "pediatric"));

		const canalMatches = findPresetsByToothContext(BASELINE_804N_PRICELIST_SERVICES, 36, { canals: 3 });
		assert.ok(canalMatches.length > 0);
		assert.ok(canalMatches.some((p) => p.commercialTitle.includes("3 корневых каналов")));
	});

	test("findPresetsByComplaint matches patient complaints intelligently", () => {
		const wisdomMatches = findPresetsByComplaint(BASELINE_804N_PRICELIST_SERVICES, "Беспокоит зуб мудрости");
		assert.ok(wisdomMatches.length > 0);
		assert.ok(wisdomMatches.some((p) => p.commercialTitle.includes("зуба мудрости")));

		const hygieneMatches = findPresetsByComplaint(BASELINE_804N_PRICELIST_SERVICES, "Нужно снять зубной камень и налет");
		assert.ok(hygieneMatches.length > 0);
		assert.ok(hygieneMatches.some((p) => p.category === "hygiene"));
	});

	test("matchPresets auto-scores multi-criteria query", () => {
		const results = matchPresets(STATUTORY_ORDER_804N_PRESETS, {
			category: "therapy",
			icd10Code: "K02.1",
			complaintText: "болит зуб, средний кариес",
		});
		assert.ok(results.length > 0);
		const first = results[0];
		assert.ok(first && first.score >= 50);
		assert.strictEqual(first?.item.category, "therapy");
	});

	test("getRecommendedPresetsForSpecialty filters active presets for doctor specialty", () => {
		const orthopedistPresets = getRecommendedPresetsForSpecialty(STATUTORY_ORDER_804N_PRESETS, "orthopedist");
		assert.ok(orthopedistPresets.length > 0);
		assert.ok(orthopedistPresets.every((p) => p.specialty === "orthopedist" && p.isActive));
	});
});
