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
	worldMmToSlicePx,
	slicePxToScreenPx,
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
	updateDentalArchAnchorPosition,
	hitTestDentalArchControlPoint,
	drawDentalArchControlPointManipulators,
	reconstructPanoramicView,
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

	describe("5. Immutable Anchor Coordinate Updates (updateDentalArchAnchorPosition)", () => {
		it("updates anchor position by numeric index and recalculates Catmull-Rom spline", () => {
			const originalArch = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");
			const targetIdx = 4;
			const oldPos = originalArch.anchors[targetIdx]!.positionMm;
			const newPos = { x: oldPos.x + 5.0, y: oldPos.y - 3.0 };

			const updatedArch = updateDentalArchAnchorPosition(originalArch, targetIdx, newPos);

			assert.notStrictEqual(updatedArch, originalArch);
			assert.notStrictEqual(updatedArch.anchors, originalArch.anchors);
			assert.strictEqual(originalArch.anchors[targetIdx]!.positionMm.x, oldPos.x);

			assert.strictEqual(updatedArch.anchors[targetIdx]!.positionMm.x, newPos.x);
			assert.strictEqual(updatedArch.anchors[targetIdx]!.positionMm.y, newPos.y);

			assert.strictEqual(updatedArch.anchors[0]!.positionMm.x, originalArch.anchors[0]!.positionMm.x);
			assert.strictEqual(updatedArch.anchors[8]!.positionMm.x, originalArch.anchors[8]!.positionMm.x);

			assert.ok(updatedArch.splinePointsMm.length > 0);
			assert.ok(updatedArch.totalArcLengthMm > 0);
		});

		it("updates anchor position by FDI tooth number", () => {
			const originalArch = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");
			const targetFdi = 46;
			const anchor = originalArch.anchors.find((a) => a.toothFdi === "46");
			assert.ok(anchor);

			const newPos = { x: -25.0, y: -15.0 };
			const updatedArch = updateDentalArchAnchorPosition(originalArch, targetFdi, newPos);

			const updatedAnchor = updatedArch.anchors.find((a) => a.toothFdi === "46");
			assert.ok(updatedAnchor);
			assert.strictEqual(updatedAnchor.positionMm.x, -25.0);
			assert.strictEqual(updatedAnchor.positionMm.y, -15.0);
		});

		it("updates anchor position by string ID", () => {
			const originalArch = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");
			const targetId = originalArch.anchors[2]!.id;
			const newPos = { x: -18.5, y: 2.0 };

			const updatedArch = updateDentalArchAnchorPosition(originalArch, targetId, newPos);
			const updatedAnchor = updatedArch.anchors.find((a) => a.id === targetId);

			assert.ok(updatedAnchor);
			assert.strictEqual(updatedAnchor.positionMm.x, -18.5);
			assert.strictEqual(updatedAnchor.positionMm.y, 2.0);
		});

		it("returns identical arch reference when target anchor index is out of range or not found", () => {
			const originalArch = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");
			const resOutOfBounds = updateDentalArchAnchorPosition(originalArch, 999, { x: 0, y: 0 });
			assert.strictEqual(resOutOfBounds, originalArch);

			const resInvalidFdi = updateDentalArchAnchorPosition(originalArch, 99, { x: 0, y: 0 });
			assert.strictEqual(resInvalidFdi, originalArch);

			const resInvalidId = updateDentalArchAnchorPosition(originalArch, "non-existent-id", { x: 0, y: 0 });
			assert.strictEqual(resInvalidId, originalArch);
		});
	});

	describe("6. 24x24px Precision Hit-Testing (hitTestDentalArchControlPoint)", () => {
		const calVolume: CbctVoxelVolume = {
			...createEmptyCbctVolume(200, 200, 60, 0.5, -1000),
		};
		(calVolume as { originMm: { x: number; y: number; z: number } }).originMm = {
			x: -50.0,
			y: -80.0,
			z: -15.0,
		};

		it("detects anchor hit with standard radius 12 px (24px touch target) under identity transform", () => {
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");
			const transform: ViewportTransform = { zoom: 1.0, panX: 0, panY: 0 };
			const crosshairZMm = 0;

			const targetAnchor = curve.anchors[0]!;
			const slicePx = worldMmToSlicePx(
				{ x: targetAnchor.positionMm.x, y: targetAnchor.positionMm.y, z: crosshairZMm },
				"axial",
				calVolume,
			);
			const screenPx = slicePxToScreenPx(slicePx, transform);

			const exactHit = hitTestDentalArchControlPoint(screenPx, curve, calVolume, transform, 12, crosshairZMm);
			assert.ok(exactHit);
			assert.strictEqual(exactHit.index, 0);
			assert.strictEqual(exactHit.anchor.toothFdi, targetAnchor.toothFdi);
			assert.ok(exactHit.distancePx < 0.01);

			const edgeHit = hitTestDentalArchControlPoint(
				{ x: screenPx.x + 10, y: screenPx.y + 4 },
				curve,
				calVolume,
				transform,
				12,
				crosshairZMm,
			);
			assert.ok(edgeHit);
			assert.strictEqual(edgeHit.index, 0);
			assert.ok(edgeHit.distancePx <= 12);

			const miss = hitTestDentalArchControlPoint(
				{ x: screenPx.x + 15, y: screenPx.y + 5 },
				curve,
				calVolume,
				transform,
				12,
				crosshairZMm,
			);
			assert.strictEqual(miss, null);
		});

		it("maintains accurate hit-testing under zoom and pan viewport transforms", () => {
			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");
			const transform: ViewportTransform = { zoom: 2.2, panX: 45.0, panY: -30.0 };
			const crosshairZMm = 0;

			for (let i = 0; i < curve.anchors.length; i++) {
				const anchor = curve.anchors[i]!;
				const slicePx = worldMmToSlicePx(
					{ x: anchor.positionMm.x, y: anchor.positionMm.y, z: crosshairZMm },
					"axial",
					calVolume,
				);
				const screenPx = slicePxToScreenPx(slicePx, transform);

				const hit = hitTestDentalArchControlPoint(screenPx, curve, calVolume, transform, 12, crosshairZMm);
				assert.ok(hit, `Failed to hit anchor idx ${i} (FDI ${anchor.toothFdi}) under transform`);
				assert.strictEqual(hit.index, i);
			}
		});

		it("returns the closest anchor when two control points have overlapping hit regions", () => {
			const closeAnchors = [
				{ id: "a1", toothFdi: "41", labelRu: "41", positionMm: { x: -1.0, y: -50.0 }, isQuadrantRight: true },
				{ id: "a2", toothFdi: "31", labelRu: "31", positionMm: { x: 1.0, y: -50.0 }, isQuadrantRight: false },
			];
			const curve = buildDentalArchCurve(closeAnchors, "mandible");
			const transform = DEFAULT_VIEWPORT_TRANSFORM;

			const slicePx1 = worldMmToSlicePx({ x: -1.0, y: -50.0, z: 0 }, "axial", calVolume);
			const screenPx1 = slicePxToScreenPx(slicePx1, transform);

			const clickNear1 = { x: screenPx1.x + 1, y: screenPx1.y };
			const hit1 = hitTestDentalArchControlPoint(clickNear1, curve, calVolume, transform, 12, 0);
			assert.ok(hit1);
			assert.strictEqual(hit1.anchor.toothFdi, "41");
		});
	});

	describe("7. Canvas Screen Space Rendering Engine (drawDentalArchControlPointManipulators)", () => {
		it("executes manipulator drawing without throwing and exercises all visual states", () => {
			const drawCalls: string[] = [];
			const mockCtx = {
				save: () => drawCalls.push("save"),
				restore: () => drawCalls.push("restore"),
				beginPath: () => drawCalls.push("beginPath"),
				arc: () => drawCalls.push("arc"),
				fill: () => drawCalls.push("fill"),
				stroke: () => drawCalls.push("stroke"),
				fillText: (text: string) => drawCalls.push(`fillText:${text}`),
				measureText: (text: string) => ({ width: text.length * 7 }),
				roundRect: () => drawCalls.push("roundRect"),
				fillStyle: "",
				strokeStyle: "",
				lineWidth: 0,
				font: "",
				textAlign: "",
				textBaseline: "",
				shadowColor: "",
				shadowBlur: 0,
			} as unknown as CanvasRenderingContext2D;

			const curve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");

			assert.doesNotThrow(() => {
				drawDentalArchControlPointManipulators(mockCtx, {
					archCurve: curve,
					volume: mockVolume,
					transform: DEFAULT_VIEWPORT_TRANSFORM,
					crosshairZMm: 0,
					selectedAnchorIdx: 2,
					hoveredAnchorIdx: 3,
					draggingAnchorIdx: 2,
					activeToothFdi: "41",
					invertColors: false,
				});
			});

			assert.ok(drawCalls.length > 0);
			assert.ok(drawCalls.includes("save"));
			assert.ok(drawCalls.includes("restore"));
			assert.ok(drawCalls.some((c) => c.startsWith("fillText:")));

			assert.doesNotThrow(() => {
				drawDentalArchControlPointManipulators(mockCtx, {
					archCurve: curve,
					volume: mockVolume,
					transform: DEFAULT_VIEWPORT_TRANSFORM,
					crosshairZMm: 0,
					selectedAnchorIdx: null,
					hoveredAnchorIdx: null,
					draggingAnchorIdx: null,
					activeToothFdi: null,
					invertColors: true,
				});
			});
		});
	});

	describe("8. Dynamic Cross-Section & Panoramic Real-Time Recomputation", () => {
		it("regenerates cross-sections with updated tangents and normals when arch is modified", () => {
			const initialArch = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");
			const initialSections = generateCrossSectionSlices(mockVolume, initialArch, 2.0);

			const modifiedArch = updateDentalArchAnchorPosition(initialArch, 4, {
				x: initialArch.anchors[4]!.positionMm.x,
				y: initialArch.anchors[4]!.positionMm.y + 10.0,
			});
			const modifiedSections = generateCrossSectionSlices(mockVolume, modifiedArch, 2.0);

			assert.ok(modifiedSections.length > 0);
			const midIdx = Math.floor(modifiedSections.length / 2);
			assert.notStrictEqual(modifiedSections[midIdx]!.centerPointMm.y, initialSections[midIdx]!.centerPointMm.y);
		});

		it("reconstructs panoramic view along edited arch spline without throwing", () => {
			const arch = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");
			const editedArch = updateDentalArchAnchorPosition(arch, 0, { x: -35.0, y: -25.0 });

			const pano = reconstructPanoramicView(mockVolume, editedArch, {
				heightPx: 100,
				windowWidth: 4000,
				windowLevel: 1000,
			});

			assert.ok(pano);
			assert.ok(pano.widthPx > 0);
			assert.strictEqual(pano.heightPx, 100);
			assert.strictEqual(pano.pixelData.length, pano.widthPx * pano.heightPx * 4);
		});
	});
});

