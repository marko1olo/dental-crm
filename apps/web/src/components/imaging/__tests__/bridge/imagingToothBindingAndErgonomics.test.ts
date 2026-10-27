/**
 * @file imagingToothBindingAndErgonomics.test.ts
 * @description Clean unit tests for FDI tooth binding and calibration ball scaling.
 * Validates 1-click tooth mapping and zero-barrier calibration math (Mandate 8e, 8n).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateRuler,
	computeCalibration,
} from "../../../visiograph/VisiographMeasurementMath";
import {
	isSupportedToothFdi,
	PERMANENT_TEETH_FDI,
} from "../../imagingToothBindingHelper";

describe("Imaging 2D Viewer — FDI Tooth Binding & Outpatient Ergonomics", () => {
	describe("1-Click FDI Tooth Binding (11..48)", () => {
		it("validates all 32 permanent teeth across 4 quadrants according to FDI standard", () => {
			assert.strictEqual(PERMANENT_TEETH_FDI.length, 32);
			assert.strictEqual(isSupportedToothFdi("11"), true);
			assert.strictEqual(isSupportedToothFdi("16"), true);
			assert.strictEqual(isSupportedToothFdi("26"), true);
			assert.strictEqual(isSupportedToothFdi("36"), true);
			assert.strictEqual(isSupportedToothFdi("48"), true);
		});

		it("rejects non-FDI teeth numbers safely", () => {
			assert.strictEqual(isSupportedToothFdi("99"), false);
			assert.strictEqual(isSupportedToothFdi("0"), false);
			assert.strictEqual(isSupportedToothFdi("abc"), false);
		});
	});

	describe("Outpatient Ergonomics & No Artificial Doctor Blockers (Mandate 8e)", () => {
		it("calibration engine safely handles zero-distance points without NaN", () => {
			const zero = calculateRuler({ x: 200, y: 200 }, { x: 200, y: 200 }, 0.035);
			assert.strictEqual(zero.lengthPx, 0);
			assert.strictEqual(zero.lengthMm, 0);
			assert.strictEqual(Number.isFinite(zero.lengthMm), true);
		});

		it("known calibration ball accurately scales millimeter sphere to pixel pitch", () => {
			// 5.0 mm steel reference sphere measured at 142.857 pixels
			const calib = computeCalibration(
				{ x: 100, y: 100 },
				{ x: 242.857, y: 100 },
				5.0,
				"sphere_5mm"
			);
			assert.strictEqual(Math.round(calib.scaleMmPerPixel * 1000) / 1000, 0.035);
		});
	});
});
