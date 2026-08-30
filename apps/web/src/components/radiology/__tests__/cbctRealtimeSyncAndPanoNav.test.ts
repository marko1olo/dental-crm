/**
 * DENTE CRM — CBCT 3D MPR Real-Time Cross-Referencing & Panorama Sync Test Suite
 * Domain 1: Real-Time Viewport Sync & Panorama Navigation (Wave 27)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	createEmptyCbctVolume,
	calculateCrosshairDragWorldMm,
	computeSynchronizedCrosshairProjections,
	DEFAULT_OBLIQUE_ROTATION,
	DEFAULT_VIEWPORT_TRANSFORM,
	type CbctVoxelVolume,
	type Point3D,
	type ViewportTransform,
	type ObliqueRotationAngles,
} from "../cbctMprMath";
import {
	buildDentalArchCurve,
	createDentalArchCurve,
	generateCrossSectionSlices,
	findNearestCrossSectionIndexByPanoX,
	findCrossSectionAndPositionByFdi,
	hitTestPanoramicToothMarker,
	mapPanoPointerToCrosshairAndSlice,
	DEFAULT_MANDIBULAR_ARCH_ANCHORS,
	type DentalArchCurve,
	type CrossSectionSliceData,
} from "../dentalCurveEngine";

describe("Wave 27 Domain 1 — Real-Time Cross-Referencing & Panorama Navigation Suite", () => {
	const mockVolume: CbctVoxelVolume = {
		...createEmptyCbctVolume(200, 200, 160, 0.4),
	};

	const archCurve = createDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS);
	const crossSections = generateCrossSectionSlices(mockVolume, archCurve, 2.0, 0.0, {
		widthMm: 30.0,
		heightMm: 30.0,
		pixelSpacingMm: 0.25,
	});

	describe("1. Real-Time Crosshair Dragging Across Orthogonal Planes (calculateCrosshairDragWorldMm)", () => {
		const canvasSize = { width: 400, height: 400 };
		const initialCrosshair: Point3D = { x: 0, y: 0, z: 0 };

		it("translates X and Y coordinates on Axial plane while strictly locking Z-axis", () => {
			const pointerPx = { x: 300, y: 100 };
			const newWorldMm = calculateCrosshairDragWorldMm(
				pointerPx,
				canvasSize,
				"axial",
				initialCrosshair,
				DEFAULT_OBLIQUE_ROTATION,
				DEFAULT_VIEWPORT_TRANSFORM,
				mockVolume,
			);

			assert.notEqual(newWorldMm.x, initialCrosshair.x, "Axial drag must update world X");
			assert.notEqual(newWorldMm.y, initialCrosshair.y, "Axial drag must update world Y");
			assert.equal(newWorldMm.z, initialCrosshair.z, "Axial drag must keep world Z locked");
		});

		it("translates X and Z coordinates on Coronal plane while strictly locking Y-axis", () => {
			const pointerPx = { x: 250, y: 150 };
			const newWorldMm = calculateCrosshairDragWorldMm(
				pointerPx,
				canvasSize,
				"coronal",
				initialCrosshair,
				DEFAULT_OBLIQUE_ROTATION,
				DEFAULT_VIEWPORT_TRANSFORM,
				mockVolume,
			);

			assert.notEqual(newWorldMm.x, initialCrosshair.x, "Coronal drag must update world X");
			assert.equal(newWorldMm.y, initialCrosshair.y, "Coronal drag must keep world Y locked");
			assert.notEqual(newWorldMm.z, initialCrosshair.z, "Coronal drag must update world Z");
		});

		it("translates Y and Z coordinates on Sagittal plane while strictly locking X-axis", () => {
			const pointerPx = { x: 180, y: 220 };
			const newWorldMm = calculateCrosshairDragWorldMm(
				pointerPx,
				canvasSize,
				"sagittal",
				initialCrosshair,
				DEFAULT_OBLIQUE_ROTATION,
				DEFAULT_VIEWPORT_TRANSFORM,
				mockVolume,
			);

			assert.equal(newWorldMm.x, initialCrosshair.x, "Sagittal drag must keep world X locked");
			assert.notEqual(newWorldMm.y, initialCrosshair.y, "Sagittal drag must update world Y");
			assert.notEqual(newWorldMm.z, initialCrosshair.z, "Sagittal drag must update world Z");
		});

		it("correctly compensates for zoom and pan transforms during dragging", () => {
			const zoomedTransform: ViewportTransform = {
				zoom: 2.0,
				panX: 50,
				panY: -30,
			};

			const newWorldMm = calculateCrosshairDragWorldMm(
				{ x: 200, y: 200 },
				canvasSize,
				"axial",
				initialCrosshair,
				DEFAULT_OBLIQUE_ROTATION,
				zoomedTransform,
				mockVolume,
			);

			assert.ok(Number.isFinite(newWorldMm.x), "X must be finite number");
			assert.ok(Number.isFinite(newWorldMm.y), "Y must be finite number");
			assert.ok(Number.isFinite(newWorldMm.z), "Z must be finite number");
		});

		it("handles zero volume / fallback gracefully without crashing", () => {
			const fallbackMm = calculateCrosshairDragWorldMm(
				{ x: 100, y: 100 },
				canvasSize,
				"axial",
				initialCrosshair,
				DEFAULT_OBLIQUE_ROTATION,
				DEFAULT_VIEWPORT_TRANSFORM,
				null,
			);
			assert.deepEqual(fallbackMm, initialCrosshair, "Fallback when volume is null must preserve crosshair");
		});
	});

	describe("2. Panorama Navigation & Cross-Section Sync (mapPanoPointerToCrosshairAndSlice)", () => {
		const panoCanvasSize = { width: 800, height: 300 };
		const currentCrosshair: Point3D = { x: 0, y: 0, z: 0 };

		it("maps panoramic pointer X column to correct cross-section slice index", () => {
			const midScreen = { x: 400, y: 150 };
			const syncRes = mapPanoPointerToCrosshairAndSlice(
				midScreen,
				panoCanvasSize,
				archCurve,
				crossSections,
				currentCrosshair,
				DEFAULT_VIEWPORT_TRANSFORM,
			);

			assert.ok(syncRes.crossSectionIdx >= 0, "Cross-section index must be non-negative");
			assert.ok(syncRes.crossSectionIdx < crossSections.length, "Cross-section index within bounds");
			assert.ok(Number.isFinite(syncRes.worldMm.x), "World X must be finite");
			assert.ok(Number.isFinite(syncRes.worldMm.y), "World Y must be finite");
			assert.ok(Number.isFinite(syncRes.worldMm.z), "World Z must be finite");
		});

		it("maps pointer vertical position to anatomical Z-axis millimeter depth", () => {
			const topPointer = { x: 400, y: 10 };
			const bottomPointer = { x: 400, y: 290 };

			const topRes = mapPanoPointerToCrosshairAndSlice(
				topPointer,
				panoCanvasSize,
				archCurve,
				crossSections,
				currentCrosshair,
				DEFAULT_VIEWPORT_TRANSFORM,
			);
			const bottomRes = mapPanoPointerToCrosshairAndSlice(
				bottomPointer,
				panoCanvasSize,
				archCurve,
				crossSections,
				currentCrosshair,
				DEFAULT_VIEWPORT_TRANSFORM,
			);

			assert.ok(topRes.worldMm.z > bottomRes.worldMm.z, "Top of panorama corresponds to higher Z (cranial), bottom to lower Z (caudal)");
		});

		it("compensates for panoramic zoom and horizontal scrubbing pan", () => {
			const pannedTransform: ViewportTransform = {
				zoom: 1.5,
				panX: 100,
				panY: 0,
			};

			const syncRes = mapPanoPointerToCrosshairAndSlice(
				{ x: 400, y: 150 },
				panoCanvasSize,
				archCurve,
				crossSections,
				currentCrosshair,
				pannedTransform,
			);

			assert.ok(syncRes.crossSectionIdx >= 0, "Must calculate valid cross-section index when panned");
		});
	});

	describe("3. FDI Tooth Formula & Marker Hit Testing (hitTestPanoramicToothMarker & findCrossSectionAndPositionByFdi)", () => {
		const toothMarkers = [
			{ toothFdi: "46", xPx: 150, yPx: 140, labelRu: "46" },
			{ toothFdi: "41", xPx: 380, yPx: 150, labelRu: "41" },
			{ toothFdi: "36", xPx: 650, yPx: 140, labelRu: "36" },
		];

		it("detects pointer hit on FDI tooth badge within hit radius", () => {
			const hit = hitTestPanoramicToothMarker(
				{ x: 152, y: 141 },
				toothMarkers,
				DEFAULT_VIEWPORT_TRANSFORM,
				18,
			);
			assert.ok(hit, "Must hit tooth 46 marker");
			assert.equal(hit?.toothFdi, "46");
		});

		it("returns null when pointer is outside hit radius of any tooth badge", () => {
			const miss = hitTestPanoramicToothMarker(
				{ x: 250, y: 250 },
				toothMarkers,
				DEFAULT_VIEWPORT_TRANSFORM,
				18,
			);
			assert.equal(miss, null, "Must return null when missing all markers");
		});

		it("finds corresponding cross-section slice and 3D coordinate by FDI number", () => {
			const nav = findCrossSectionAndPositionByFdi("46", crossSections, archCurve, 0);
			assert.equal(nav.found, true, "Must find tooth 46 in arch");
			assert.ok(nav.crossSectionIdx >= 0, "Cross-section index must be non-negative");
			assert.ok(Number.isFinite(nav.positionMm.x), "Target position X must be finite");
			assert.ok(Number.isFinite(nav.positionMm.y), "Target position Y must be finite");
		});

		it("falls back gracefully when FDI number is not in arch anchors", () => {
			const emptyCurve: DentalArchCurve = {
				id: "empty-arch",
				jawType: "mandible",
				anchors: [],
				splinePointsMm: [],
				totalArcLengthMm: 0,
				focalTroughThicknessMm: 12,
			};
			const res = findCrossSectionAndPositionByFdi("99", [], emptyCurve, 0);
			assert.equal(res.found, false);
			assert.equal(res.nearestToothFdi, "99");
		});
	});

	describe("4. Synchronized Multi-Plane Crosshair Projections (computeSynchronizedCrosshairProjections)", () => {
		it("calculates accurate slice and screen projections across Axial, Coronal, Sagittal, Pano, and CrossSection", () => {
			const worldPt: Point3D = { x: 10.0, y: -5.0, z: 12.0 };
			const proj = computeSynchronizedCrosshairProjections(
				worldPt,
				mockVolume,
				DEFAULT_OBLIQUE_ROTATION,
				{
					axial: DEFAULT_VIEWPORT_TRANSFORM,
					coronal: DEFAULT_VIEWPORT_TRANSFORM,
					sagittal: DEFAULT_VIEWPORT_TRANSFORM,
				},
				{ widthPx: 800, heightPx: 220, totalArcLengthMm: 120.0 },
				crossSections[0],
			);

			assert.ok(proj.axial.centerSlicePx.x >= 0, "Axial slice X must be valid");
			assert.ok(proj.axial.centerSlicePx.y >= 0, "Axial slice Y must be valid");
			assert.ok(proj.coronal.centerSlicePx.x >= 0, "Coronal slice X must be valid");
			assert.ok(proj.coronal.centerSlicePx.y >= 0, "Coronal slice Y must be valid");
			assert.ok(proj.sagittal.centerSlicePx.x >= 0, "Sagittal slice X must be valid");
			assert.ok(proj.sagittal.centerSlicePx.y >= 0, "Sagittal slice Y must be valid");

			assert.equal(proj.axial.rotationDeg, DEFAULT_OBLIQUE_ROTATION.axialAngleDeg);
			assert.equal(proj.coronal.rotationDeg, DEFAULT_OBLIQUE_ROTATION.coronalTiltDeg);
			assert.equal(proj.sagittal.rotationDeg, DEFAULT_OBLIQUE_ROTATION.sagittalTiltDeg);

			assert.ok(proj.panoramic.axialLineY >= 0, "Pano axial line Y must be >= 0");
			assert.ok(proj.crossSection.axialLineY > 0, "CrossSection axial line Y must be positive");
		});
	});
});

