/**
 * periodontalPsrSextants.test.ts — Посекстантный скрининг PSR (S1..S6, коды 0..4, астериск *).
 * Мандат 8b: <= 120 строк.
 */

import { calculatePsrSextants, createDefaultPerioTeeth } from "@dental/shared";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	applyHealthyPeriodontiumPreset,
	applyPsrSextantCode,
	getPsrMaxCode,
} from "../perioMath";

describe("7. Per-Sextant PSR Screening & Asterisk Marking", () => {
	const initialTeeth = createDefaultPerioTeeth();

	it("applies PSR codes to sextants S1..S6 isolatedly and supports asterisk *", () => {
		let currentTeeth = applyHealthyPeriodontiumPreset(initialTeeth);

		// S1 (17..14) -> Code 3 (pocket 5 mm, calculus, BOP)
		currentTeeth = applyPsrSextantCode(currentTeeth, "S1", 3);

		const tooth16 = currentTeeth.find((t) => t.toothNumber === 16);
		assert.ok(tooth16);
		assert.strictEqual(tooth16.distoBuccal.probingDepthMm, 5);
		assert.strictEqual(tooth16.distoBuccal.bleedingOnProbing, true);
		assert.strictEqual(tooth16.distoBuccal.calculus, true);

		// Neighbour tooth 13 in S2 remains intact (code 0, depth 2)
		const tooth13 = currentTeeth.find((t) => t.toothNumber === 13);
		assert.ok(tooth13);
		assert.strictEqual(tooth13.distoBuccal.probingDepthMm, 2);
		assert.strictEqual(tooth13.distoBuccal.bleedingOnProbing, false);

		// S5 (33..43) -> Code 4 with asterisk * (pocket 7 mm, suppuration, mobility II)
		currentTeeth = applyPsrSextantCode(currentTeeth, "S5", 4, true);

		const tooth41 = currentTeeth.find((t) => t.toothNumber === 41);
		assert.ok(tooth41);
		assert.strictEqual(tooth41.midBuccal.probingDepthMm, 7);
		assert.strictEqual(tooth41.midBuccal.suppuration, true);
		assert.strictEqual(tooth41.mobility, 2);

		const psr = calculatePsrSextants(currentTeeth);
		assert.strictEqual(psr.S1?.code, 3);
		assert.strictEqual(psr.S5?.code, 4);
		assert.strictEqual(psr.S5?.asterisk, true);
		assert.strictEqual(getPsrMaxCode(psr), 4);
	});
});
