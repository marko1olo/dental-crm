import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ADULT_FDI_TEETH,
	calculateDistanceMm,
	FDI_TOOTH_NAMES,
	formatRadiationDose,
	LANDMARK_TYPE_LABELS,
} from "../components/radiology/radiologyMath";
import { DEFAULT_WW_WL_PRESETS, RADIOLOGY_MODALITIES } from "../components/radiology/types";

describe("Radiology Ergonomics & Math Suite", () => {
	it("calculates 2-point measurement distance in millimeters with calibration", () => {
		// 1000x1000 image, 0.1 mm/px spacing
		// Point A: (10%, 10%) -> (100px, 100px)
		// Point B: (40%, 50%) -> (400px, 500px)
		// dx = 300px, dy = 400px -> hypotenuse = 500px
		// Distance = 500px * 0.1 mm/px = 50.0 mm
		const dist = calculateDistanceMm(10, 10, 40, 50, 1000, 1000, 0.1);
		assert.equal(dist, 50.0);

		// Zero distance
		const zeroDist = calculateDistanceMm(25, 25, 25, 25, 1000, 1000, 0.1);
		assert.equal(zeroDist, 0.0);

		// Sub-millimeter precision
		const smallDist = calculateDistanceMm(0, 0, 1, 1, 1000, 1000, 0.05);
		assert.ok(smallDist > 0);
	});

	it("formats effective radiation dose according to SanPiN standards", () => {
		// RVG typical dose: 3.0 µSv (0.003 mSv) -> Green zone
		const rvg = formatRadiationDose(3.0);
		assert.equal(rvg.microsvText, "3 мкЗв");
		assert.equal(rvg.safetyZone, "green");

		// CBCT typical dose: 55.0 µSv (0.055 mSv) -> Yellow zone (>= 0.05 mSv)
		const cbct = formatRadiationDose(55.0);
		assert.equal(cbct.microsvText, "55 мкЗв");
		assert.equal(cbct.safetyZone, "yellow");

		// Heavy dose: 600 µSv (0.6 mSv) -> Red zone (>= 0.5 mSv)
		const heavy = formatRadiationDose(600.0);
		assert.equal(heavy.microsvText, "600 мкЗв");
		assert.equal(heavy.safetyZone, "red");
	});

	it("ensures all 32 adult FDI teeth are defined with anatomical names", () => {
		const totalQuadrantsTeeth = [
			...ADULT_FDI_TEETH.quadrant1,
			...ADULT_FDI_TEETH.quadrant2,
			...ADULT_FDI_TEETH.quadrant3,
			...ADULT_FDI_TEETH.quadrant4,
		];
		assert.equal(totalQuadrantsTeeth.length, 32);

		for (const tooth of totalQuadrantsTeeth) {
			assert.ok(FDI_TOOTH_NAMES[tooth], `Tooth ${tooth} must have an anatomical description`);
		}
	});

	it("verifies all Window/Level presets contain valid brightness, contrast, and invert fields", () => {
		assert.ok(DEFAULT_WW_WL_PRESETS.length >= 6);

		const standard = DEFAULT_WW_WL_PRESETS.find((p) => p.id === "standard");
		assert.ok(standard);
		assert.equal(standard.brightness, 100);
		assert.equal(standard.contrast, 100);

		const boneEndo = DEFAULT_WW_WL_PRESETS.find((p) => p.id === "bone_endo");
		assert.ok(boneEndo);
		assert.ok(boneEndo.contrast > 150);

		const invertPreset = DEFAULT_WW_WL_PRESETS.find((p) => p.id === "negative_invert");
		assert.ok(invertPreset);
		assert.equal(invertPreset.invert, true);
	});

	it("verifies radiology modality registry covers all primary dental modalities", () => {
		const expectedModalities = [
			"cbct_3d",
			"optg_panoramic",
			"intraoral_rvg",
			"trg_ceph",
			"bitewing",
			"photo_clinical",
		] as const;

		for (const mod of expectedModalities) {
			assert.ok(RADIOLOGY_MODALITIES[mod]);
			assert.ok(RADIOLOGY_MODALITIES[mod].label.length > 0);
			assert.ok(RADIOLOGY_MODALITIES[mod].typicalDoseMicrosv >= 0);
		}
	});

	it("verifies anatomical landmark types are registered", () => {
		const landmarkTypes = ["tooth", "apex", "canal", "sinus", "nerve", "implant_site", "caries", "custom"] as const;
		for (const t of landmarkTypes) {
			assert.ok(LANDMARK_TYPE_LABELS[t]);
		}
	});
});
