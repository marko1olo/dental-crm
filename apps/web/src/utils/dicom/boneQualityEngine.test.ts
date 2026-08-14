import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	classifyMisch,
	extractHUZones,
	generateDrillProtocol,
} from "./boneQualityEngine";

describe("Bone Quality and Misch Classification Engine", () => {
	it("classifies bone density according to Misch criteria", () => {
		assert.equal(classifyMisch(1400), "D1", "> 1250 HU is D1 dense cortical");
		assert.equal(classifyMisch(1000), "D2", "850-1250 HU is D2 thick porous cortical and coarse trabecular");
		assert.equal(classifyMisch(600), "D3", "350-850 HU is D3 thin porous cortical and fine trabecular");
		assert.equal(classifyMisch(200), "D4", "< 350 HU is D4 fine trabecular");
	});

	it("extracts anatomical HU zones (cortical crest, cancellous core, apical base)", () => {
		const samples = [1200, 1100, 700, 650, 600, 550, 800, 850];
		const zones = extractHUZones(samples);

		assert.ok(zones.corticalHU > 0, "Calculated cortical HU");
		assert.ok(zones.cancellousHU > 0, "Calculated cancellous HU");
		assert.ok(zones.apicalHU > 0, "Calculated apical HU");
	});

	it("generates clinical drilling protocol with underdrilling for soft D4 bone", () => {
		const d4Zones = { corticalHU: 250, cancellousHU: 180, apicalHU: 200 };
		const protocol = generateDrillProtocol(d4Zones, "osstem", 4.0, 10.0);

		assert.equal(protocol.mischClass, "D4");
		assert.ok(protocol.underdrillingApplied, "Underdrilling should be applied in soft D4 bone");
		assert.ok(protocol.steps.length > 0, "Generated drilling steps");
	});

	it("requires cortical bone tapping for dense D1 bone", () => {
		const d1Zones = { corticalHU: 1500, cancellousHU: 1300, apicalHU: 1400 };
		const protocol = generateDrillProtocol(d1Zones, "straumann", 4.1, 10.0);

		assert.equal(protocol.mischClass, "D1");
		assert.ok(protocol.corticalTapRequired, "Cortical tapping required in dense D1 bone to prevent overheating/over-torque");
	});
});
