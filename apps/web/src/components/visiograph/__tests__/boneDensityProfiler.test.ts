import assert from "node:assert";
import { describe, test } from "node:test";
import {
	classifyExtendedBoneDensity,
	classifyMisch,
	extractHUZones,
	generateDrillProtocol,
} from "../../../utils/dicom/boneQualityEngine";

describe("Bone Density Misch Classification & Drill Protocol Profiler", () => {
	test("classifies D1 bone correctly (>1250 HU) and prescribes Cortical Tap", () => {
		const result = classifyExtendedBoneDensity(1450);
		assert.strictEqual(result.mischClass, "D1");
		assert.ok(result.label.includes("D1 (>1250 HU)"));
		assert.ok(result.drillingRecommendation.includes("Cortical Tap"));
		assert.ok(result.drillingRecommendation.includes("остеонекроз"));

		const misch = classifyMisch(1450);
		assert.strictEqual(misch, "D1");

		const protocol = generateDrillProtocol(
			{ corticalHU: 1600, cancellousHU: 1400, apicalHU: 1350 },
			"osstem",
			4.0,
			10.0,
		);
		assert.strictEqual(protocol.mischClass, "D1");
		assert.strictEqual(protocol.corticalTapRequired, true);
		assert.ok(protocol.warnings.some((w) => w.includes("Cortical Tap")));
	});

	test("classifies D2 bone correctly (850–1250 HU) with standard drill protocol", () => {
		const result = classifyExtendedBoneDensity(1050);
		assert.strictEqual(result.mischClass, "D2");
		assert.ok(result.label.includes("D2 (850–1250 HU)"));
		assert.ok(result.drillingRecommendation.includes("Стандартный"));

		const misch = classifyMisch(1050);
		assert.strictEqual(misch, "D2");

		const protocol = generateDrillProtocol(
			{ corticalHU: 1150, cancellousHU: 1000, apicalHU: 950 },
			"straumann",
			4.1,
			10.0,
		);
		assert.strictEqual(protocol.mischClass, "D2");
		assert.strictEqual(protocol.corticalTapRequired, false);
		assert.strictEqual(protocol.underdrillingApplied, false);
	});

	test("classifies D3 bone correctly (350–850 HU)", () => {
		const result = classifyExtendedBoneDensity(600);
		assert.strictEqual(result.mischClass, "D3");
		assert.ok(result.label.includes("D3 (350–850 HU)"));

		const misch = classifyMisch(600);
		assert.strictEqual(misch, "D3");

		const protocol = generateDrillProtocol(
			{ corticalHU: 750, cancellousHU: 550, apicalHU: 500 },
			"nobel",
			4.3,
			11.5,
		);
		assert.strictEqual(protocol.mischClass, "D3");
	});

	test("classifies D4 bone correctly (150–350 HU) and enforces Under-drilling", () => {
		const result = classifyExtendedBoneDensity(280);
		assert.strictEqual(result.mischClass, "D4");
		assert.ok(result.label.includes("D4 (150–350 HU)"));
		assert.ok(result.drillingRecommendation.includes("Недопрепарирование (Under-drilling)"));

		const misch = classifyMisch(280);
		assert.strictEqual(misch, "D4");

		const protocol = generateDrillProtocol(
			{ corticalHU: 320, cancellousHU: 260, apicalHU: 240 },
			"osstem",
			4.5,
			10.0,
		);
		assert.strictEqual(protocol.mischClass, "D4");
		assert.strictEqual(protocol.underdrillingApplied, true);
		assert.ok(protocol.warnings.some((w) => w.includes("Недопрепарирование")));
	});

	test("classifies D5 bone correctly (<150 HU) with critical under-drilling advisory", () => {
		const result = classifyExtendedBoneDensity(95);
		assert.strictEqual(result.mischClass, "D5");
		assert.ok(result.label.includes("D5 (<150 HU)"));
		assert.ok(result.drillingRecommendation.includes("Критическое недопрепарирование"));
	});

	test("extractHUZones correctly partitions coronal, cancellous, and apical zones", () => {
		// 10 samples from coronal to apical
		const samples = [1200, 1100, 800, 750, 700, 650, 600, 550, 500, 450];
		const zones = extractHUZones(samples);

		// Coronal 20% = first 2 items (1200, 1100) -> avg 1150
		assert.strictEqual(zones.corticalHU, 1150);

		// Apical 20% = last 2 items (500, 450) -> avg 475
		assert.strictEqual(zones.apicalHU, 475);

		// Middle 60% = middle 6 items (800, 750, 700, 650, 600, 550) -> avg 675
		assert.strictEqual(zones.cancellousHU, 675);
	});
});
