/**
 * DENTE CRM — CBCT Curved Viewport Handlers Decomposition Unit Tests
 * Standards: DICOM Part 3, Planmeca Romexis 6.x, Vatech Ez3D-i
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
	CBCT_MAX_WINDOW_LEVEL,
	CBCT_MAX_WINDOW_WIDTH,
	CBCT_MAX_ZOOM,
	CBCT_MIN_WINDOW_LEVEL,
	CBCT_MIN_WINDOW_WIDTH,
	CBCT_MIN_ZOOM,
	CBCT_ZOOM_IN_STEP_FACTOR,
	CBCT_ZOOM_OUT_STEP_FACTOR,
	IMPLANT_MAX_ANGULATION_DEG,
	IMPLANT_MIN_ANGULATION_DEG,
	calculateCrossSectionNerveWorldPoint,
	calculateImplantAngulationDeg,
	computeCurveNormal2D,
	getCrossPointerWorldMm,
	getPanoPointerWorldMm,
	interpolateCatmullRom2D,
	isImplantResetButtonHit,
	useCbctCurvedViewportHandlers,
} from "../components/radiology/mpr/useCbctCurvedViewportHandlers";

describe("CBCT Curved Viewport Handlers Decomposition Invariants", () => {
	it("verifies line count constraint (<= 800 lines per module, <= 50 lines for facade)", () => {
		const curvedDir = path.resolve(
			process.cwd(),
			"src/components/radiology/mpr/curvedViewport",
		);
		const files = fs.readdirSync(curvedDir);

		assert.ok(files.length >= 7, "Expected at least 7 decomposed files");

		for (const file of files) {
			const filePath = path.join(curvedDir, file);
			if (fs.statSync(filePath).isFile() && /\.(ts|tsx)$/.test(file)) {
				const lineCount = fs.readFileSync(filePath, "utf8").split("\n").length;
				assert.ok(
					lineCount <= 800,
					`File ${file} has ${lineCount} lines, exceeding 800 line budget`,
				);
			}
		}

		const facadePath = path.resolve(
			process.cwd(),
			"src/components/radiology/mpr/useCbctCurvedViewportHandlers.ts",
		);
		const facadeLines = fs.readFileSync(facadePath, "utf8").split("\n").length;
		assert.ok(
			facadeLines <= 50,
			`Facade has ${facadeLines} lines, exceeding 50 line ceiling`,
		);
	});

	it("verifies public export parity and function bindings", () => {
		assert.equal(typeof useCbctCurvedViewportHandlers, "function");
		assert.equal(typeof getPanoPointerWorldMm, "function");
		assert.equal(typeof getCrossPointerWorldMm, "function");
		assert.equal(typeof calculateCrossSectionNerveWorldPoint, "function");
		assert.equal(typeof calculateImplantAngulationDeg, "function");
		assert.equal(typeof interpolateCatmullRom2D, "function");
		assert.equal(typeof computeCurveNormal2D, "function");
		assert.equal(typeof isImplantResetButtonHit, "function");

		assert.equal(CBCT_MIN_ZOOM, 0.5);
		assert.equal(CBCT_MAX_ZOOM, 5.0);
		assert.equal(CBCT_ZOOM_IN_STEP_FACTOR, 1.25);
		assert.equal(CBCT_ZOOM_OUT_STEP_FACTOR, 0.8);
		assert.equal(CBCT_MIN_WINDOW_WIDTH, 100);
		assert.equal(CBCT_MAX_WINDOW_WIDTH, 10000);
		assert.equal(CBCT_MIN_WINDOW_LEVEL, -1000);
		assert.equal(CBCT_MAX_WINDOW_LEVEL, 4000);
		assert.equal(IMPLANT_MIN_ANGULATION_DEG, -30);
		assert.equal(IMPLANT_MAX_ANGULATION_DEG, 30);
	});

	it("verifies Catmull-Rom cubic spline interpolation math", () => {
		const p0 = { x: 0, y: 0 };
		const p1 = { x: 10, y: 0 };
		const p2 = { x: 20, y: 10 };
		const p3 = { x: 30, y: 10 };

		const startPt = interpolateCatmullRom2D(p0, p1, p2, p3, 0);
		assert.equal(Math.round(startPt.x), 10);
		assert.equal(Math.round(startPt.y), 0);

		const endPt = interpolateCatmullRom2D(p0, p1, p2, p3, 1);
		assert.equal(Math.round(endPt.x), 20);
		assert.equal(Math.round(endPt.y), 10);

		const midPt = interpolateCatmullRom2D(p0, p1, p2, p3, 0.5);
		assert.ok(midPt.x > 10 && midPt.x < 20);
	});

	it("verifies curve orthogonal normal calculation", () => {
		const pA = { x: 0, y: 0 };
		const pB = { x: 10, y: 0 };

		const { tangent, normal } = computeCurveNormal2D(pA, pB);
		assert.equal(tangent.x, 1);
		assert.equal(tangent.y, 0);
		assert.equal(normal.x, 0);
		assert.equal(normal.y, 1);
	});

	it("verifies virtual implant angulation clamping (-30 to +30 deg)", () => {
		const vertical = calculateImplantAngulationDeg(0, 10);
		assert.equal(vertical, 0);

		const smallTilt = calculateImplantAngulationDeg(5, 10);
		assert.ok(smallTilt > 0 && smallTilt <= 30);

		const extremeTilt = calculateImplantAngulationDeg(50, 10);
		assert.equal(extremeTilt, 30);

		const negativeExtreme = calculateImplantAngulationDeg(-50, 10);
		assert.equal(negativeExtreme, -30);
	});

	it("verifies implant reset button hit detection box", () => {
		const canvasWidth = 400;
		// Reset button box: x in [canvasWidth - 85, canvasWidth - 10], y in [8, 30]
		assert.equal(isImplantResetButtonHit(350, 15, canvasWidth), true);
		assert.equal(isImplantResetButtonHit(315, 8, canvasWidth), true);
		assert.equal(isImplantResetButtonHit(390, 30, canvasWidth), true);
		assert.equal(isImplantResetButtonHit(300, 15, canvasWidth), false);
		assert.equal(isImplantResetButtonHit(350, 35, canvasWidth), false);
		assert.equal(isImplantResetButtonHit(350, 5, canvasWidth), false);
	});

	it("verifies cross-section nerve world 3D projection math", () => {
		const sliceData = {
			index: 5,
			centerPointMm: { x: 20, y: 30, z: -10 },
			normalVector2D: { x: 0, y: 1 },
			tangentVector2D: { x: 1, y: 0 },
			arcDistanceMm: 25,
			widthMm: 40,
			heightMm: 40,
			widthPx: 400,
			heightPx: 400,
			pixelSpacingMm: 0.1,
			sliceGrayData: new Uint8Array(400 * 400),
		};

		const localMm = { x: 5, y: 0, z: 12 };
		const nerve3D = calculateCrossSectionNerveWorldPoint(sliceData, localMm);

		// x: center.x + normal.x * local.x = 20 + 0 = 20
		// y: center.y + normal.y * local.x = 30 + 1 * 5 = 35
		// crestZ: center.z + (heightMm / 2 - 4) = -10 + (20 - 4) = 6
		// z: crestZ - local.z = 6 - 12 = -6
		assert.equal(nerve3D.x, 20);
		assert.equal(nerve3D.y, 35);
		assert.equal(nerve3D.z, -6);
	});
});
