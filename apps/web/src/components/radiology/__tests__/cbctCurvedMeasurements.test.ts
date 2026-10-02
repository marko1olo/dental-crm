/**
 * DENTE CRM — Unit Tests for CBCT Measurements across All 5 Viewports
 * (Panoramic OPG, Axial, Coronal, Sagittal, and Alveolar Ridge Cross-Section)
 * Standards: DICOM Part 3, Planmeca Romexis 6.x, Mandates 8b & 8e
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	panoramicWorldMmToSlicePx,
	panoramicSlicePxToWorldMm,
	crossSectionWorldMmToSlicePx,
	crossSectionSlicePxToWorldMm,
} from "../cbctCoordinateMath";
import {
	calculateAngleBetween3Points2D,
	calculateAngleBetween3Points3D,
	slicePxToScreenPx,
	type CbctMeasurementRuler,
	type CbctAngleMeasurement,
} from "../cbctMprMath";
import {
	filterRulersByViewport,
	getRulerSummary,
	filterAnglesByViewport,
	getAngleSummary,
	formatRulerDistanceMm,
	calculateRulerDistanceMm,
} from "../mpr/CbctViewportsRuler";

describe("CBCT 5-Viewport Measurement System (Panoramic, Axial, Coronal, Sagittal, Cross-Section)", () => {
	describe("1. Panoramic Coordinate Transformation Invariance", () => {
		const panoDims = { widthPx: 1000, heightPx: 500, heightMm: 74.0, centerZMm: -10.0 };
		const totalArcMm = 110.0;

		it("round-trips world mm -> slice px -> world mm accurately on panoramic OPG", () => {
			const originalPt = { x: 55.0, y: 0, z: -10.0 };
			const slicePx = panoramicWorldMmToSlicePx(originalPt, panoDims, totalArcMm);
			// Center of panorama: x should be 500px, y should be 250px
			assert.equal(Math.round(slicePx.x), 500);
			assert.equal(Math.round(slicePx.y), 250);

			const recoveredPt = panoramicSlicePxToWorldMm(slicePx, panoDims, totalArcMm);
			assert.equal(recoveredPt.x, 55.0);
			assert.equal(recoveredPt.z, -10.0);
		});

		it("correctly handles panoramic bounds (top-left and bottom-right)", () => {
			// Top-left: x=0, z = centerZ + heightMm/2 = -10 + 37 = 27
			const topLeft = { x: 0, y: 0, z: 27.0 };
			const pxTopLeft = panoramicWorldMmToSlicePx(topLeft, panoDims, totalArcMm);
			assert.equal(Math.round(pxTopLeft.x), 0);
			assert.equal(Math.round(pxTopLeft.y), 0);

			// Bottom-right: x=totalArc, z = centerZ - heightMm/2 = -10 - 37 = -47
			const bottomRight = { x: 110.0, y: 0, z: -47.0 };
			const pxBottomRight = panoramicWorldMmToSlicePx(bottomRight, panoDims, totalArcMm);
			assert.equal(Math.round(pxBottomRight.x), 1000);
			assert.equal(Math.round(pxBottomRight.y), 500);
		});

		it("calculates accurate vertical ridge height on panoramic view", () => {
			const crest = { x: 45.0, y: 0, z: -5.0 };
			const base = { x: 45.0, y: 0, z: -22.5 };
			const distance = calculateRulerDistanceMm(crest, base);
			assert.equal(distance, 17.5);
			assert.equal(formatRulerDistanceMm(distance), "17.5 мм");
		});
	});

	describe("2. Cross-Section Alveolar Ridge Coordinate Invariance", () => {
		const crossDims = { widthPx: 400, heightPx: 400, pixelSpacingMm: 0.25 };
		const canvasWidth = 400;

		it("round-trips world mm -> slice px -> world mm accurately on transverse cut", () => {
			// 3.0 mm bucco-lingual offset, 12.0 mm depth
			const originalPt = { x: 3.0, y: 0, z: 12.0 };
			const slicePx = crossSectionWorldMmToSlicePx(originalPt, crossDims, canvasWidth);
			// centerX = 200, 3 / 0.25 = 12 -> 212px
			// topY = 20, 12 / 0.25 = 48 -> 68px
			assert.equal(slicePx.x, 212);
			assert.equal(slicePx.y, 68);

			const recoveredPt = crossSectionSlicePxToWorldMm(slicePx, crossDims, canvasWidth);
			assert.equal(recoveredPt.x, 3.0);
			assert.equal(recoveredPt.z, 12.0);
		});

		it("measures exact bone width and alveolar ridge height on cross-section", () => {
			const buccalPlate = { x: -4.0, y: 0, z: 10.0 };
			const lingualPlate = { x: 3.5, y: 0, z: 10.0 };
			const ridgeWidthMm = calculateRulerDistanceMm(buccalPlate, lingualPlate);
			assert.equal(ridgeWidthMm, 7.5);

			const crestPeak = { x: 0.0, y: 0, z: 2.0 };
			const canalRoof = { x: 0.0, y: 0, z: 16.5 };
			const boneHeightAboveCanalMm = calculateRulerDistanceMm(crestPeak, canalRoof);
			assert.equal(boneHeightAboveCanalMm, 14.5);
		});

		it("measures alveolar inclination angle on cross-section (Protractor)", () => {
			// Vertex at alveolar crest peak, arm 1 along vertical axis, arm 2 along buccal cortical plate
			const verticalRef = { x: 0.0, y: 0, z: 20.0 };
			const crestVertex = { x: 0.0, y: 0, z: 2.0 };
			const buccalSlope = { x: 10.0, y: 0, z: 12.0 };

			const angleDeg = calculateAngleBetween3Points3D(verticalRef, crestVertex, buccalSlope);
			// Vector 1: (0, 0, 18), Vector 2: (10, 0, 10). Dot product = 180. Magnitude 1 = 18, Magnitude 2 = sqrt(200) = 14.142
			// cos(theta) = 180 / (18 * 14.142) = 10 / 14.142 = 0.7071 => 45.0°
			assert.equal(angleDeg, 45);
		});
	});

	describe("3. Viewport Transform & Screen Projection", () => {
		it("transforms slice pixels to screen pixels under pan and zoom", () => {
			const slicePx = { x: 100, y: 200 };
			const transform = { panX: 50, panY: -30, zoom: 2.0 };
			const screenPx = slicePxToScreenPx(slicePx, transform);
			assert.equal(screenPx.x, 100 * 2.0 + 50); // 250
			assert.equal(screenPx.y, 200 * 2.0 - 30); // 370
		});
	});

	describe("4. Multi-Viewport Filter & Metric Aggregations", () => {
		const sampleRulers: CbctMeasurementRuler[] = [
			{ id: "r-ax1", plane: "axial", startMm: { x: 0, y: 0, z: 0 }, endMm: { x: 10, y: 0, z: 0 }, distanceMm: 10.0 },
			{ id: "r-co1", plane: "coronal", startMm: { x: 0, y: 0, z: 0 }, endMm: { x: 0, y: 15, z: 0 }, distanceMm: 15.0 },
			{ id: "r-sa1", plane: "sagittal", startMm: { x: 0, y: 0, z: 0 }, endMm: { x: 0, y: 0, z: 8 }, distanceMm: 8.0 },
			{ id: "r-pa1", plane: "panoramic", startMm: { x: 10, y: 0, z: 0 }, endMm: { x: 30, y: 0, z: 0 }, distanceMm: 20.0 },
			{ id: "r-pa2", plane: "panoramic", startMm: { x: 10, y: 0, z: 0 }, endMm: { x: 10, y: 0, z: -12 }, distanceMm: 12.0 },
			{ id: "r-cs1", plane: "cross_section", startMm: { x: -3, y: 0, z: 5 }, endMm: { x: 4, y: 0, z: 5 }, distanceMm: 7.0 },
		];

		const sampleAngles: CbctAngleMeasurement[] = [
			{ id: "a-ax1", plane: "axial", startMm: { x: 10, y: 0, z: 0 }, vertexMm: { x: 0, y: 0, z: 0 }, endMm: { x: 0, y: 10, z: 0 }, angleDeg: 90.0 },
			{ id: "a-pa1", plane: "panoramic", startMm: { x: 10, y: 0, z: 0 }, vertexMm: { x: 0, y: 0, z: 0 }, endMm: { x: 10, y: 0, z: 10 }, angleDeg: 45.0 },
			{ id: "a-cs1", plane: "cross_section", startMm: { x: 0, y: 0, z: 15 }, vertexMm: { x: 0, y: 0, z: 0 }, endMm: { x: 5, y: 0, z: 10 }, angleDeg: 26.6 },
		];

		it("filters rulers strictly by plane across all 5 viewports", () => {
			assert.equal(filterRulersByViewport(sampleRulers, "axial").length, 1);
			assert.equal(filterRulersByViewport(sampleRulers, "coronal").length, 1);
			assert.equal(filterRulersByViewport(sampleRulers, "sagittal").length, 1);
			assert.equal(filterRulersByViewport(sampleRulers, "panoramic").length, 2);
			assert.equal(filterRulersByViewport(sampleRulers, "cross_section").length, 1);
		});

		it("calculates ruler summary metrics (count, totalMm, max, min, latest)", () => {
			const panoSummary = getRulerSummary(sampleRulers, "panoramic");
			assert.equal(panoSummary.count, 2);
			assert.equal(panoSummary.totalMm, 32.0);
			assert.equal(panoSummary.maxMm, 20.0);
			assert.equal(panoSummary.minMm, 12.0);
			assert.equal(panoSummary.latestMm, 12.0);

			const crossSummary = getRulerSummary(sampleRulers, "cross_section");
			assert.equal(crossSummary.count, 1);
			assert.equal(crossSummary.totalMm, 7.0);
			assert.equal(crossSummary.latestMm, 7.0);
		});

		it("filters angles strictly by plane and computes angle summaries", () => {
			assert.equal(filterAnglesByViewport(sampleAngles, "axial").length, 1);
			assert.equal(filterAnglesByViewport(sampleAngles, "panoramic").length, 1);
			assert.equal(filterAnglesByViewport(sampleAngles, "cross_section").length, 1);
			assert.equal(filterAnglesByViewport(sampleAngles, "coronal").length, 0);

			const panoAngleSummary = getAngleSummary(sampleAngles, "panoramic");
			assert.equal(panoAngleSummary.count, 1);
			assert.equal(panoAngleSummary.latestDeg, 45.0);

			const crossAngleSummary = getAngleSummary(sampleAngles, "cross_section");
			assert.equal(crossAngleSummary.count, 1);
			assert.equal(crossAngleSummary.latestDeg, 26.6);
		});
	});
});
