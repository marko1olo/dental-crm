import assert from "node:assert";
import { describe, test } from "node:test";
import {
	calculateOlearyPcr,
	type OlearyToothData,
} from "../oleary.js";

describe("calculateOlearyPcr", () => {
	test("calculates 0% plaque on completely clean dentition", () => {
		const teeth: OlearyToothData[] = Array.from({ length: 28 }, (_, i) => ({
			toothFdi: 11 + i,
			isPresent: true,
			surfacesWithPlaque: [],
			surfacesWithBleeding: [],
		}));

		const res = calculateOlearyPcr(teeth);
		assert.strictEqual(res.presentTeethCount, 28);
		assert.strictEqual(res.totalSurfaces, 112); // 28 * 4
		assert.strictEqual(res.plaqueSurfacesCount, 0);
		assert.strictEqual(res.pcrPercent, 0.0);
		assert.strictEqual(res.rating, "excellent");
		assert.strictEqual(res.isSurgicalClearanceMet, true);
	});

	test("calculates correct PCR percentage, ratings and quadrant localization", () => {
		// 10 present teeth = 40 total surfaces
		// 8 surfaces with plaque = 8 / 40 = 20.0% (rating "good")
		const teeth: OlearyToothData[] = [
			{ toothFdi: 11, isPresent: true, surfacesWithPlaque: ["mesial", "distal"] },
			{ toothFdi: 12, isPresent: true, surfacesWithPlaque: ["buccal"] },
			{ toothFdi: 13, isPresent: true, surfacesWithPlaque: ["buccal", "lingual"] },
			{ toothFdi: 21, isPresent: true, surfacesWithPlaque: ["mesial"] },
			{ toothFdi: 22, isPresent: true, surfacesWithPlaque: ["distal"] },
			{ toothFdi: 31, isPresent: true, surfacesWithPlaque: ["lingual"] },
			{ toothFdi: 32, isPresent: true, surfacesWithPlaque: [] },
			{ toothFdi: 41, isPresent: true, surfacesWithPlaque: [] },
			{ toothFdi: 42, isPresent: true, surfacesWithPlaque: [] },
			{ toothFdi: 43, isPresent: true, surfacesWithPlaque: [] },
			{ toothFdi: 48, isPresent: false, surfacesWithPlaque: ["buccal"] }, // Missing tooth must not count
		];

		const res = calculateOlearyPcr(teeth);
		assert.strictEqual(res.presentTeethCount, 10);
		assert.strictEqual(res.totalSurfaces, 40);
		assert.strictEqual(res.plaqueSurfacesCount, 8);
		assert.strictEqual(res.pcrPercent, 20.0);
		assert.strictEqual(res.rating, "good");
		assert.strictEqual(res.highestPlaqueQuadrant, 1); // Q1 has 5 plaque sites
	});

	test("flags inadequate plaque control above 30%", () => {
		// 4 teeth = 16 surfaces. 8 plaque surfaces = 50.0%
		const teeth: OlearyToothData[] = [
			{ toothFdi: 11, isPresent: true, surfacesWithPlaque: ["mesial", "distal", "buccal", "lingual"] },
			{ toothFdi: 12, isPresent: true, surfacesWithPlaque: ["mesial", "distal", "buccal", "lingual"] },
			{ toothFdi: 21, isPresent: true, surfacesWithPlaque: [] },
			{ toothFdi: 22, isPresent: true, surfacesWithPlaque: [] },
		];

		const res = calculateOlearyPcr(teeth);
		assert.strictEqual(res.pcrPercent, 50.0);
		assert.strictEqual(res.rating, "inadequate");
		assert.strictEqual(res.isSurgicalClearanceMet, false);
	});
});
