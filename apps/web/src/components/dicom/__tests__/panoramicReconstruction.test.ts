/**
 * panoramicReconstruction.test.ts — Unit tests for Panoramic Reconstruction & Cross-Sectional Slicing.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
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
});
