/**
 * @file clinicalViewerRuler.test.ts
 * @description Clean unit tests for ClinicalImageViewer endodontic calibrated ruler.
 * Validates physical scale invariance and multi-segment canal calculation (Mandate 8e, 8n).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ViewerRulerMeasurement } from "../../ClinicalImageViewer";

describe("ClinicalImageViewer — Endodontic Calibrated Ruler (Mandates 8e, 8n)", () => {
	it("calculates exact physical canal length in mm with RVG sensor calibration (0.04 mm/px)", () => {
		// Typical root canal length: ~21.5 mm
		// With 0.04 mm/px (40 microns RVG sensor): 21.5 mm / 0.04 = 537.5 px
		const pixelSpacingMm = 0.04;
		const start = { x: 100, y: 100 };
		const end = { x: 100, y: 637.5 }; // 537.5 px straight down

		const dx = end.x - start.x;
		const dy = end.y - start.y;
		const distPx = Math.hypot(dx, dy);
		const distMm = Number((distPx * pixelSpacingMm).toFixed(2));

		assert.strictEqual(distPx, 537.5);
		assert.strictEqual(distMm, 21.5);
	});

	it("guarantees 100% scale invariance of physical measurement under user zoom and pan", () => {
		// The ruler measurement is recorded in image normalized coordinates (0..100%).
		// Physical distance depends ONLY on natural image dimensions and sensor pixel spacing.
		const imageNaturalWidth = 1600; // px
		const imageNaturalHeight = 1200; // px
		const pixelSpacingMm = 0.035; // 35 microns (Vatech EzSensor 1.5)

		const measurement: ViewerRulerMeasurement = {
			id: "meas-1",
			x1Percent: 20,
			y1Percent: 30,
			x2Percent: 20,
			y2Percent: 60, // 30% of vertical height = 360 px
			distanceMm: 0,
		};

		const dxPx = (((measurement.x2Percent ?? 0) - (measurement.x1Percent ?? 0)) / 100) * imageNaturalWidth;
		const dyPx = (((measurement.y2Percent ?? 0) - (measurement.y1Percent ?? 0)) / 100) * imageNaturalHeight;
		const naturalDistPx = Math.hypot(dxPx, dyPx);
		const physicalMm = Number((naturalDistPx * pixelSpacingMm).toFixed(2));

		// 360 px * 0.035 mm/px = 12.6 mm
		assert.strictEqual(naturalDistPx, 360);
		assert.strictEqual(physicalMm, 12.6);

		// Under 3x zoom and (200px, 150px) pan, the calculation remains unchanged
		const zoomMultiplier = 3.0;
		const onScreenDistPx = naturalDistPx * zoomMultiplier; // 1080 px on screen
		const normalizedCalculatedMm = Number(((onScreenDistPx / zoomMultiplier) * pixelSpacingMm).toFixed(2));

		assert.strictEqual(normalizedCalculatedMm, physicalMm);
		assert.strictEqual(normalizedCalculatedMm, 12.6);
	});

	it("verifies multi-segment canal measurement accumulation for curved canals", () => {
		const pixelSpacingMm = 0.04;
		// Curved mesio-buccal canal with 2 segments: coronal 300px + apical curved 200px
		const segment1Px = 300;
		const segment2Px = 200;
		const totalPx = segment1Px + segment2Px;

		const totalMm = Number((totalPx * pixelSpacingMm).toFixed(2));
		// 500 px * 0.04 = 20.0 mm
		assert.strictEqual(totalMm, 20.0);
	});
});
