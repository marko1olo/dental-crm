/**
 * panoramicReconstruction.test.ts — Unit tests for Panoramic Reconstruction & Cross-Sectional Slicing.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { autoDetectDentalArch } from "@dental/shared";
import { autoDetectPanoramicArch } from "../panoramicArch.js";
import {
	classifyMischBoneDensity,
	createAnatomicalJawControlPoints,
	generateCatmullRomArch,
	generateCrossSectionSlicePlanes,
	type Point3D,
	synchronizeMprCoordinates,
} from "../panoramicMprMath.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Panoramic Reconstruction & Cross-Sectional Slicing (Mandates 8s, 8j, 8d)", () => {
	it("1. Generates anatomical jaw landmarks and smooth Catmull-Rom dental arch", () => {
		const landmarks = createAnatomicalJawControlPoints();
		assert.ok(
			landmarks.length >= 7,
			"Must contain at least 7 anatomical landmarks",
		);

		const archCurve = generateCatmullRomArch(landmarks, 0.5);
		assert.ok(archCurve.length > 50, "Curve must be densely sampled");
		const lastPoint = archCurve[archCurve.length - 1];
		assert.ok(
			lastPoint && lastPoint.arcLengthMm > 80,
			"Total dental arch length must exceed 80mm",
		);

		// Tangent and normal vectors must be unit length
		for (const pt of archCurve.slice(0, 10)) {
			const tLen = Math.hypot(pt.tangent.x, pt.tangent.y, pt.tangent.z);
			const nLen = Math.hypot(pt.normal.x, pt.normal.y, pt.normal.z);
			assert.ok(
				Math.abs(tLen - 1.0) < 1e-3,
				"Tangent vector must be normalized",
			);
			assert.ok(
				Math.abs(nLen - 1.0) < 1e-3,
				"Normal vector must be normalized",
			);
		}
	});

	it("2. Generates equidistant perpendicular cross-sectional slice planes along the arch", () => {
		const landmarks = createAnatomicalJawControlPoints();
		const archCurve = generateCatmullRomArch(landmarks, 0.5);
		const stepIntervalMm = 1.5;
		const thicknessMm = 2.0;

		const slices = generateCrossSectionSlicePlanes(archCurve, {
			stepIntervalMm,
			thicknessMm,
			widthMm: 32.0,
			heightMm: 40.0,
		});

		assert.ok(
			slices.length > 30,
			"Must generate adequate cross-sectional slices for dental arch",
		);
		const firstSlice = slices[0];
		assert.ok(firstSlice, "First slice must exist");
		assert.equal(firstSlice.sliceIndex, 0);
		assert.equal(firstSlice.thicknessMm, thicknessMm);
		assert.equal(firstSlice.widthMm, 32.0);
		assert.equal(firstSlice.heightMm, 40.0);

		// Slices must be ordered by arcLengthMm
		for (let i = 1; i < slices.length; i++) {
			const prev = slices[i - 1];
			const curr = slices[i];
			assert.ok(
				prev && curr && curr.arcLengthMm >= prev.arcLengthMm,
				"Cross-section slices must be monotonically ordered by arcLength",
			);
		}
	});

	it("3. Synchronizes 3D coordinates between MPR viewports and cross-section indices", () => {
		const landmarks = createAnatomicalJawControlPoints();
		const archCurve = generateCatmullRomArch(landmarks, 0.5);
		const slices = generateCrossSectionSlicePlanes(archCurve, {
			stepIntervalMm: 1.5,
		});

		const testPos: Point3D = { x: 0, y: 40, z: 10 };
		const sync = synchronizeMprCoordinates(testPos, archCurve, slices);

		assert.equal(sync.axialSliceZ, 10);
		assert.equal(sync.coronalSliceY, 40);
		assert.equal(sync.sagittalSliceX, 0);
		assert.ok(
			sync.activeCrossSectionIndex >= 0 &&
				sync.activeCrossSectionIndex < slices.length,
		);
		assert.ok(sync.distanceToArchMm >= 0);
	});

	it("4. Classifies Misch bone density and provides evidence-based implant protocols", () => {
		const d1 = classifyMischBoneDensity(1300);
		assert.equal(d1.mischClass, "D1");
		assert.equal(d1.corticalTap, true);

		const d2 = classifyMischBoneDensity(950);
		assert.equal(d2.mischClass, "D2");

		const d3 = classifyMischBoneDensity(500);
		assert.equal(d3.mischClass, "D3");

		const d4 = classifyMischBoneDensity(250);
		assert.equal(d4.mischClass, "D4");
		assert.equal(d4.underDrilling, true);

		const d5 = classifyMischBoneDensity(50);
		assert.equal(d5.mischClass, "D5");
		assert.equal(d5.underDrilling, true);
	});

	it("5. PanoramicRendererWindow mounts crossSectionCanvasRef in JSX with 240x240 viewport", () => {
		const source = fs.readFileSync(
			path.resolve(__dirname, "../PanoramicRendererWindow.tsx"),
			"utf-8",
		);

		// Must mount crossSectionCanvasRef in JSX
		assert.ok(
			source.includes("ref={crossSectionCanvasRef}"),
			"PanoramicRendererWindow must mount ref={crossSectionCanvasRef} in JSX",
		);
		// Must include 240x240px cross-section viewport
		assert.ok(
			source.includes("240"),
			"PanoramicRendererWindow must contain 240x240 cross-section canvas dimensions",
		);
		// Must include active cross-section index label
		assert.ok(
			source.includes("activeCrossSectionIdx"),
			"PanoramicRendererWindow must display active cross-section index",
		);
	});

	it("6. autoDetectDentalArch and autoDetectPanoramicArch adapt MIP ray-tracing with Zero Dead-Ends fallback", () => {
		// Degenerate/empty volume fallback test
		const emptyVol = new Float32Array(32 * 32 * 8);
		const dims: [number, number, number] = [32, 32, 8];
		const spacing: [number, number, number] = [0.5, 0.5, 0.5];

		const archPts = autoDetectDentalArch(emptyVol, dims, spacing);
		assert.ok(Array.isArray(archPts), "Must return Point2[] array");
		assert.ok(
			archPts.length >= 7,
			"Fallback must provide at least 7 anatomical control points",
		);
		for (const pt of archPts) {
			assert.equal(pt.length, 2, "Each point must be [x, y]");
			assert.ok(
				Number.isFinite(pt[0]) && Number.isFinite(pt[1]),
				"Coordinates must be finite",
			);
		}

		// Web helper autoDetectPanoramicArch test
		const panoramicPts = autoDetectPanoramicArch({
			scalarData: emptyVol,
			dimensions: dims,
			spacing,
		});
		assert.ok(Array.isArray(panoramicPts), "Must return Point2D[] array");
		assert.ok(
			panoramicPts.length >= 7,
			"Must provide >= 7 control points for panoramic unwrap",
		);
		assert.ok(
			"x" in (panoramicPts[0] ?? {}) && "y" in (panoramicPts[0] ?? {}),
			"Points must be Point2D objects",
		);

		// Null volume safety check (Mandate 8e: Doctor Autonomy)
		const nullFallback = autoDetectPanoramicArch(null);
		assert.ok(
			nullFallback.length >= 7,
			"Null volume must gracefully return canonical jaw landmarks",
		);
	});

	it("7. PanoramicRendererWindow contains 1-click 'Авто-дуга' button in the toolbar", () => {
		const source = fs.readFileSync(
			path.resolve(__dirname, "../PanoramicRendererWindow.tsx"),
			"utf-8",
		);

		assert.ok(
			source.includes("handleAutoDetectArch"),
			"PanoramicRendererWindow must include handleAutoDetectArch handler",
		);
		assert.ok(
			source.includes("Авто-дуга"),
			"PanoramicRendererWindow must contain 'Авто-дуга' button in the toolbar",
		);
		assert.ok(
			source.includes("Sparkles"),
			"PanoramicRendererWindow must use Sparkles icon for 1-click auto-detection",
		);
	});

	it("8. PanoramicRendererWindow uses canonical computeCrossSection from @dental/shared for 3D MPR sampling (Mandate 8s)", () => {
		const source = fs.readFileSync(
			path.resolve(__dirname, "../PanoramicRendererWindow.tsx"),
			"utf-8",
		);

		assert.ok(
			source.includes("computeCrossSection"),
			"PanoramicRendererWindow must import and invoke canonical computeCrossSection from @dental/shared",
		);
		assert.equal(
			source.includes("raw.pixels[panY * raw.width + panX]"),
			false,
			"PanoramicRendererWindow must NOT use fake 2D panorama pixel column stretching",
		);
	});
});
