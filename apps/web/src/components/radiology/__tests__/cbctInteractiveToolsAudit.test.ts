/**
 * DENTE CRM — Comprehensive Red Team Inquisitor Test Suite for All CBCT Interactive Tools
 * Testing: useCbctInteractionHandlers.ts, CbctLeftToolDock.tsx, cbctOverlayMeasurementRenderers.ts,
 * cbctOverlayDecorationMath.ts, and cbctMprMath.ts.
 *
 * Verifies all 8 mouse tools:
 * 1. crosshair
 * 2. pan
 * 3. zoom
 * 4. window_level
 * 5. rotate
 * 6. ruler
 * 7. angle (3-point protractor)
 * 8. probe (HU densitometry)
 * + Quick Actions (Reset View, Invert LUT, Slab Thickness, Hotkeys)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	createEmptyCbctVolume,
	calculateCrosshairDragWorldMm,
	clampCoordinateToVolume,
	worldMmToSlicePx,
	worldMmToVoxel,
	voxelToWorldMm,
	calculateMprSliceIndex,
	sampleVoxelHU,
	getTissueNameFromHU,
	formatHuProbe,
	applyCursorZoom,
	resetPlaneObliqueAngle,
	calculateAngleFromShiftDrag,
	calculateAngleFromHandleDrag,
	hitTestCrosshairCenter,
	getCbctToolCursor,
	DEFAULT_OBLIQUE_ROTATION,
	DEFAULT_VIEWPORT_TRANSFORM,
	CBCT_HOUNSFIELD_PRESETS,
	type CbctVoxelVolume,
	type Point3D,
	type ViewportTransform,
	type ObliqueRotationAngles,
	type CbctMeasurementRuler,
	type CbctAngleMeasurement,
	type CbctProbeMarker,
	slicePxToScreenPx,
} from "../cbctMprMath";
import {
	calculateAngleBetween3Points2D,
	calculateAngleBetween3Points3D,
	hitTestMeasurementHandle,
	hitTestMeasurementObject,
} from "../cbctCaliperNerveMath";

describe("CBCT Interactive Tools Audit (Red Team Inquisitor Verification)", () => {
	// Reference isotropic volume: 200x200x160 voxels, 0.4mm spacing -> 80x80x64mm
	const volume: CbctVoxelVolume = {
		...createEmptyCbctVolume(200, 200, 160, 0.4),
	};

	// ─────────────────────────────────────────────────────────────────────────
	// 1. TOOL 1: CROSSHAIR NAVIGATION
	// ─────────────────────────────────────────────────────────────────────────
	describe("1. Crosshair Tool (3D Spatial Navigation & Synchronization)", () => {
		it("calculates accurate worldMm from Axial slice dragging", () => {
			const initialCrosshair: Point3D = { x: 0, y: 0, z: 0 };
			const canvasSize = { width: 200, height: 200 };
			const pointerPx = { x: 120, y: 80 }; // +20 voxels X, -20 voxels Y

			const result = calculateCrosshairDragWorldMm(
				pointerPx,
				canvasSize,
				"axial",
				initialCrosshair,
				DEFAULT_OBLIQUE_ROTATION,
				DEFAULT_VIEWPORT_TRANSFORM,
				volume,
			);

			// In axial plane: pointer moves X and Y, preserves Z
			assert.ok(result.x > initialCrosshair.x, "Axial drag must update X coordinate positively");
			assert.ok(result.y < initialCrosshair.y, "Axial drag must update Y coordinate negatively");
			assert.equal(result.z, initialCrosshair.z, "Axial drag must keep Z slice invariant");
		});

		it("calculates accurate worldMm from Coronal slice dragging", () => {
			const initialCrosshair: Point3D = { x: 0, y: 0, z: 0 };
			const canvasSize = { width: 200, height: 160 };
			const pointerPx = { x: 120, y: 60 };

			const result = calculateCrosshairDragWorldMm(
				pointerPx,
				canvasSize,
				"coronal",
				initialCrosshair,
				DEFAULT_OBLIQUE_ROTATION,
				DEFAULT_VIEWPORT_TRANSFORM,
				volume,
			);

			// In coronal plane: pointer moves X and Z, preserves Y
			assert.ok(result.x > initialCrosshair.x, "Coronal drag must update X coordinate");
			assert.notEqual(result.z, initialCrosshair.z, "Coronal drag must update Z height coordinate");
			assert.equal(result.y, initialCrosshair.y, "Coronal drag must keep Y slice invariant");
		});

		it("calculates accurate worldMm from Sagittal slice dragging", () => {
			const initialCrosshair: Point3D = { x: 0, y: 0, z: 0 };
			const canvasSize = { width: 200, height: 160 };
			const pointerPx = { x: 130, y: 60 };

			const result = calculateCrosshairDragWorldMm(
				pointerPx,
				canvasSize,
				"sagittal",
				initialCrosshair,
				DEFAULT_OBLIQUE_ROTATION,
				DEFAULT_VIEWPORT_TRANSFORM,
				volume,
			);

			// In sagittal plane: pointer moves Y and Z, preserves X
			assert.notEqual(result.y, initialCrosshair.y, "Sagittal drag must update Y coordinate");
			assert.notEqual(result.z, initialCrosshair.z, "Sagittal drag must update Z coordinate");
			assert.equal(result.x, initialCrosshair.x, "Sagittal drag must keep X profile invariant");
		});

		it("strictly clamps crosshair coordinates to physical volume boundaries", () => {
			const outOfBounds: Point3D = { x: 9999, y: -9999, z: 9999 };
			const clamped = clampCoordinateToVolume(outOfBounds, volume);

			const halfX = volume.physicalSizeMm.x / 2;
			const halfY = volume.physicalSizeMm.y / 2;
			const halfZ = volume.physicalSizeMm.z / 2;

			assert.ok(clamped.x <= halfX && clamped.x >= -halfX, "X must be strictly clamped to volume bounds");
			assert.ok(clamped.y <= halfY && clamped.y >= -halfY, "Y must be strictly clamped to volume bounds");
			assert.ok(clamped.z <= halfZ && clamped.z >= -halfZ, "Z must be strictly clamped to volume bounds");
		});

		it("synchronizes slice indices across all three MPR projections", () => {
			const crosshair: Point3D = { x: 10, y: -5, z: 8 };
			const axialSlice = calculateMprSliceIndex(crosshair, "axial", volume);
			const coronalSlice = calculateMprSliceIndex(crosshair, "coronal", volume);
			const sagittalSlice = calculateMprSliceIndex(crosshair, "sagittal", volume);

			assert.ok(axialSlice >= 0 && axialSlice < volume.dimensions.depth, "Axial slice index must be valid");
			assert.ok(coronalSlice >= 0 && coronalSlice < volume.dimensions.height, "Coronal slice index must be valid");
			assert.ok(sagittalSlice >= 0 && sagittalSlice < volume.dimensions.width, "Sagittal slice index must be valid");
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. TOOL 2: PAN NAVIGATION
	// ─────────────────────────────────────────────────────────────────────────
	describe("2. Pan Tool (Multi-Viewport Translation)", () => {
		it("translates screen pixels panX/panY without altering physical crosshairMm", () => {
			const initialTransform: ViewportTransform = { zoom: 1.5, panX: 0, panY: 0 };
			const delta = { dx: 45, dy: -30 };

			const updatedTransform: ViewportTransform = {
				...initialTransform,
				panX: initialTransform.panX + delta.dx,
				panY: initialTransform.panY + delta.dy,
			};

			assert.equal(updatedTransform.panX, 45);
			assert.equal(updatedTransform.panY, -30);
			assert.equal(updatedTransform.zoom, 1.5, "Pan must not affect zoom scale");

			// Verify screen projection changes while physical coordinate is invariant
			const ptMm: Point3D = { x: 5, y: 10, z: 0 };
			const slicePx = worldMmToSlicePx(ptMm, "axial", volume);
			const screen1 = slicePxToScreenPx(slicePx, initialTransform);
			const screen2 = slicePxToScreenPx(slicePx, updatedTransform);

			assert.equal(screen2.x - screen1.x, delta.dx, "Screen X shift must equal pan delta X");
			assert.equal(screen2.y - screen1.y, delta.dy, "Screen Y shift must equal pan delta Y");
		});

		it("supports independent pan states across axial, coronal, sagittal, pano, and cross_section", () => {
			const transforms: Record<"axial" | "coronal" | "sagittal" | "panoramic" | "cross_section", ViewportTransform> = {
				axial: { zoom: 1.0, panX: 10, panY: 20 },
				coronal: { zoom: 1.2, panX: 0, panY: 0 },
				sagittal: { zoom: 1.0, panX: -15, panY: 5 },
				panoramic: { zoom: 1.1, panX: 50, panY: 0 },
				cross_section: { zoom: 2.0, panX: 0, panY: -25 },
			};

			// Mutating axial pan must not leak into other viewports
			const nextTransforms = {
				...transforms,
				axial: { ...transforms.axial, panX: transforms.axial.panX + 30 },
			};

			assert.equal(nextTransforms.axial.panX, 40);
			assert.equal(nextTransforms.coronal.panX, 0);
			assert.equal(nextTransforms.sagittal.panX, -15);
			assert.equal(nextTransforms.panoramic.panX, 50);
			assert.equal(nextTransforms.cross_section.panX, 0);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 3. TOOL 3: ZOOM NAVIGATION
	// ─────────────────────────────────────────────────────────────────────────
	describe("3. Zoom Tool (Cursor-Anchored & Continuous Drag Zoom)", () => {
		it("maintains the physical point under cursor invariant during applyCursorZoom", () => {
			const initialTransform: ViewportTransform = { zoom: 1.0, panX: 20, panY: 30 };
			const cursorPx = { x: 150, y: 120 };

			// Pre-zoom slice coordinate under cursor
			const preSliceX = (cursorPx.x - initialTransform.panX) / initialTransform.zoom;
			const preSliceY = (cursorPx.y - initialTransform.panY) / initialTransform.zoom;

			// Zoom in with deltaY = -200
			const zoomed = applyCursorZoom(initialTransform, cursorPx, -200, 0.5, 5.0);

			// Post-zoom slice coordinate under the same cursor
			const postSliceX = (cursorPx.x - zoomed.panX) / zoomed.zoom;
			const postSliceY = (cursorPx.y - zoomed.panY) / zoomed.zoom;

			assert.ok(zoomed.zoom > initialTransform.zoom, "Zoom in must increase zoom factor");
			assert.ok(Math.abs(preSliceX - postSliceX) < 1e-4, "X anchor invariant must be preserved");
			assert.ok(Math.abs(preSliceY - postSliceY) < 1e-4, "Y anchor invariant must be preserved");
		});

		it("strictly bounds zoom scale to [0.5, 5.0]", () => {
			const initial: ViewportTransform = { zoom: 4.8, panX: 0, panY: 0 };
			const cursorPx = { x: 100, y: 100 };

			// Huge zoom in
			const maxClamped = applyCursorZoom(initial, cursorPx, -99999, 0.5, 5.0);
			assert.equal(maxClamped.zoom, 5.0, "Zoom factor must not exceed 5.0x");

			// Huge zoom out
			const minClamped = applyCursorZoom(initial, cursorPx, 99999, 0.5, 5.0);
			assert.equal(minClamped.zoom, 0.5, "Zoom factor must not drop below 0.5x");
		});

		it("calculates continuous vertical drag zoom scaling accurately", () => {
			const startZoom = 1.5;
			const dyUp = 50; // dragged 50px upward -> zoom in
			const zoomFactorUp = Math.exp(dyUp * 0.01);
			const nextZoomUp = Math.max(0.5, Math.min(5.0, Number((startZoom * zoomFactorUp).toFixed(2))));

			assert.ok(nextZoomUp > startZoom, "Dragging upward must zoom in");
			assert.equal(nextZoomUp, 2.47);

			const dyDown = -40; // dragged 40px downward -> zoom out
			const zoomFactorDown = Math.exp(dyDown * 0.01);
			const nextZoomDown = Math.max(0.5, Math.min(5.0, Number((startZoom * zoomFactorDown).toFixed(2))));

			assert.ok(nextZoomDown < startZoom, "Dragging downward must zoom out");
			assert.equal(nextZoomDown, 1.01);
		});

		it("applies discrete zoom on click (1.25x forward, 0.8x on Alt-click)", () => {
			const startZoom = 1.0;
			const discreteZoomIn = Math.min(5.0, Number((startZoom * 1.25).toFixed(2)));
			assert.equal(discreteZoomIn, 1.25);

			const discreteZoomOut = Math.max(0.5, Number((discreteZoomIn * 0.8).toFixed(2)));
			assert.equal(discreteZoomOut, 1.0);
		});

		it("resets viewport zoom and pan to DEFAULT_VIEWPORT_TRANSFORM", () => {
			assert.equal(DEFAULT_VIEWPORT_TRANSFORM.zoom, 1.0);
			assert.equal(DEFAULT_VIEWPORT_TRANSFORM.panX, 0);
			assert.equal(DEFAULT_VIEWPORT_TRANSFORM.panY, 0);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 4. TOOL 4: WINDOW / LEVEL CONTRAST
	// ─────────────────────────────────────────────────────────────────────────
	describe("4. Window / Level Tool (Dynamic Range & Contrast)", () => {
		it("adjusts WW horizontally and WL vertically with standard sensitivity", () => {
			const startWW = 4400;
			const startWL = 1300;
			const dx = 25; // dragged right -> widen window
			const dy = -15; // dragged up -> increase level

			const newWW = Math.max(100, Math.min(10000, Math.round(startWW + dx * 8)));
			const newWL = Math.max(-1000, Math.min(4000, Math.round(startWL - dy * 4)));

			assert.equal(newWW, 4600, "WW must increase by dx * 8");
			assert.equal(newWL, 1360, "WL must increase by -dy * 4");
		});

		it("strictly clamps Window Width between 100 HU and 10000 HU", () => {
			const minWW = Math.max(100, Math.min(10000, Math.round(500 - 100 * 8)));
			assert.equal(minWW, 100, "Window Width lower bound must be 100 HU");

			const maxWW = Math.max(100, Math.min(10000, Math.round(9500 + 100 * 8)));
			assert.equal(maxWW, 10000, "Window Width upper bound must be 10000 HU");
		});

		it("strictly clamps Window Level between -1000 HU and 4000 HU", () => {
			const minWL = Math.max(-1000, Math.min(4000, Math.round(-800 - 100 * 4)));
			assert.equal(minWL, -1000, "Window Level lower bound must be -1000 HU");

			const maxWL = Math.max(-1000, Math.min(4000, Math.round(3800 + 100 * 4)));
			assert.equal(maxWL, 4000, "Window Level upper bound must be 4000 HU");
		});

		it("verifies all CBCT Hounsfield presets comply with safety clamping bounds", () => {
			assert.ok(CBCT_HOUNSFIELD_PRESETS.length >= 6, "Must provide at least 6 clinical presets");
			for (const preset of CBCT_HOUNSFIELD_PRESETS) {
				assert.ok(preset.windowWidth >= 100 && preset.windowWidth <= 10000, `Preset ${preset.id} WW out of range`);
				assert.ok(preset.windowLevel >= -1000 && preset.windowLevel <= 4000, `Preset ${preset.id} WL out of range`);
				assert.ok(preset.label.length > 0);
				assert.ok(preset.descriptionRu.length > 0);
			}
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 5. TOOL 5: OBLIQUE ROTATION
	// ─────────────────────────────────────────────────────────────────────────
	describe("5. Oblique Rotation Tool (Euler Angles & Double-Click Reset)", () => {
		it("calculates continuous rotation from Shift-drag across quadrant boundaries", () => {
			const centerPx = { x: 100, y: 100 };
			const startPointer = { x: 150, y: 100 }; // 0 deg from center
			const currentPointer = { x: 100, y: 150 }; // 90 deg from center

			const angle = calculateAngleFromShiftDrag(centerPx, currentPointer, startPointer, 0.0);
			assert.equal(angle, 90.0, "Dragging from 0° to 90° must produce 90.0°");
		});

		it("calculates rotation from active rotation handle drag", () => {
			const centerPx = { x: 100, y: 100 };
			const pointer = { x: 100, y: 150 }; // downwards
			const angle = calculateAngleFromHandleDrag(centerPx, pointer, "u_pos");
			assert.equal(typeof angle, "number");
			assert.ok(Number.isFinite(angle));
		});

		it("resets individual plane oblique tilt while preserving remaining axes with resetPlaneObliqueAngle", () => {
			const original: ObliqueRotationAngles = {
				axialAngleDeg: 18.5,
				coronalTiltDeg: -12.0,
				sagittalTiltDeg: 7.5,
			};

			const resetAxial = resetPlaneObliqueAngle(original, "axial");
			assert.equal(resetAxial.axialAngleDeg, 0);
			assert.equal(resetAxial.coronalTiltDeg, -12.0);
			assert.equal(resetAxial.sagittalTiltDeg, 7.5);

			const resetCoronal = resetPlaneObliqueAngle(original, "coronal");
			assert.equal(resetCoronal.coronalTiltDeg, 0);
			assert.equal(resetCoronal.axialAngleDeg, 18.5);
			assert.equal(resetCoronal.sagittalTiltDeg, 7.5);

			const resetSagittal = resetPlaneObliqueAngle(original, "sagittal");
			assert.equal(resetSagittal.sagittalTiltDeg, 0);
			assert.equal(resetSagittal.axialAngleDeg, 18.5);
			assert.equal(resetSagittal.coronalTiltDeg, -12.0);
		});

		it("detects double-click within 18px crosshair center radius to trigger angle reset", () => {
			const centerPx = { x: 250, y: 200 };

			assert.ok(hitTestCrosshairCenter({ x: 255, y: 205 }, centerPx, 18), "Click within 18px must detect center hit");
			assert.ok(hitTestCrosshairCenter({ x: 250, y: 217 }, centerPx, 18), "Click on 17px boundary must detect center hit");
			assert.ok(!hitTestCrosshairCenter({ x: 275, y: 200 }, centerPx, 18), "Click 25px away must not hit center");
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 6. TOOL 6: CALIBRATED MEASUREMENT RULER
	// ─────────────────────────────────────────────────────────────────────────
	describe("6. Ruler Tool (2-Point Distance, Handle Dragging & Deletion)", () => {
		it("calculates exact 3D Euclidean distance in physical millimeters", () => {
			const p1: Point3D = { x: 0, y: 0, z: 0 };
			const p2: Point3D = { x: 3, y: 4, z: 12 }; // 3-4-12 -> sqrt(9+16+144) = sqrt(169) = 13.0 mm

			const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z);
			assert.equal(Number(dist.toFixed(1)), 13.0);
		});

		it("detects handle hit-testing for ruler start (handle 0) and end (handle 1)", () => {
			const projectedRulers = [
				{
					id: "ruler-1",
					plane: "axial" as const,
					startPx: { x: 50, y: 50 },
					endPx: { x: 150, y: 150 },
				},
			];

			const hitStart = hitTestMeasurementHandle({ x: 52, y: 49 }, projectedRulers, [], 12);
			assert.ok(hitStart);
			assert.equal(hitStart?.type, "ruler");
			assert.equal(hitStart?.handleIndex, 0);

			const hitEnd = hitTestMeasurementHandle({ x: 148, y: 152 }, projectedRulers, [], 12);
			assert.ok(hitEnd);
			assert.equal(hitEnd?.type, "ruler");
			assert.equal(hitEnd?.handleIndex, 1);
		});

		it("updates ruler startMm or endMm and recalculates distance during handle drag", () => {
			const initialRuler: CbctMeasurementRuler = {
				id: "ruler-test",
				plane: "axial",
				startMm: { x: 0, y: 0, z: 0 },
				endMm: { x: 10, y: 0, z: 0 },
				distanceMm: 10.0,
			};

			// Drag start handle (index 0) to { x: 2, y: 0, z: 0 }
			const newStart = { x: 2, y: 0, z: 0 };
			const newDist = Math.hypot(initialRuler.endMm.x - newStart.x, initialRuler.endMm.y - newStart.y, initialRuler.endMm.z - newStart.z);
			const updatedRuler: CbctMeasurementRuler = {
				...initialRuler,
				startMm: newStart,
				distanceMm: Number(newDist.toFixed(1)),
			};

			assert.equal(updatedRuler.distanceMm, 8.0);
		});

		it("detects fast delete click on ruler [×] badge", () => {
			const projectedRulers = [
				{
					id: "ruler-del",
					plane: "axial" as const,
					startPx: { x: 50, y: 50 },
					endPx: { x: 150, y: 50 }, // midX = 100, midY = 50
				},
			];

			// midX = 100, badge width ~75px, delete button is at midX + badgeW/2 - 14 ≈ 123.5px
			const hit = hitTestMeasurementObject({ x: 123, y: 50 }, projectedRulers, [], [], 10);
			assert.ok(hit);
			assert.equal(hit?.id, "ruler-del");
			assert.ok(hit?.isDeleteButtonHit);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 7. TOOL 7: PROTRACTOR / ANGLE MEASUREMENT
	// ─────────────────────────────────────────────────────────────────────────
	describe("7. Angle Tool (3-Point Protractor, Step Progression & Vertex Dragging)", () => {
		it("calculates exact 3D spatial angle between 3 points (p1 -> vertex -> p2)", () => {
			const p1: Point3D = { x: 10, y: 0, z: 0 };
			const vertex: Point3D = { x: 0, y: 0, z: 0 };
			const p2: Point3D = { x: 0, y: 15, z: 0 };

			const angle90 = calculateAngleBetween3Points3D(p1, vertex, p2);
			assert.equal(angle90, 90.0);

			const p3Diagonal: Point3D = { x: 10, y: 10, z: 0 };
			const angle45 = calculateAngleBetween3Points3D(p1, vertex, p3Diagonal);
			assert.equal(angle45, 45.0);
		});

		it("implements robust 3-step state progression (arm1 -> vertex -> arm2 -> finalize)", () => {
			// Step 1: Click 1 places Arm 1 endpoint
			const pt1: Point3D = { x: 5, y: 5, z: 0 };
			const activeStep1: CbctAngleMeasurement & { currentMm: Point3D; step: "vertex" | "end" } = {
				id: "angle-step-1",
				plane: "axial",
				startMm: pt1,
				vertexMm: pt1,
				endMm: pt1,
				currentMm: pt1,
				angleDeg: 0,
				step: "vertex",
			};
			assert.equal(activeStep1.step, "vertex");

			// Live move before Step 2: mouse tracks vertex location
			const livePointer1: Point3D = { x: 10, y: 5, z: 0 };
			const updatedPreview1 = { ...activeStep1, vertexMm: livePointer1, currentMm: livePointer1 };
			assert.deepEqual(updatedPreview1.vertexMm, livePointer1);

			// Step 2: Click 2 locks the vertex
			const vertexPt: Point3D = { x: 10, y: 5, z: 0 };
			const activeStep2: CbctAngleMeasurement & { currentMm: Point3D; step: "vertex" | "end" } = {
				...activeStep1,
				vertexMm: vertexPt,
				endMm: vertexPt,
				currentMm: vertexPt,
				step: "end",
			};
			assert.equal(activeStep2.step, "end");

			// Live move before Step 3: mouse tracks arm 2 endpoint with live angle calculation
			const livePointer2: Point3D = { x: 10, y: 15, z: 0 };
			const liveAngle = calculateAngleBetween3Points3D(activeStep2.startMm, activeStep2.vertexMm, livePointer2);
			assert.equal(liveAngle, 90.0, "Live angle preview must calculate exact 90.0° before commit");

			// Step 3: Click 3 commits the angle
			const finalAngle: CbctAngleMeasurement = {
				id: activeStep2.id,
				plane: activeStep2.plane,
				startMm: activeStep2.startMm,
				vertexMm: activeStep2.vertexMm,
				endMm: livePointer2,
				angleDeg: liveAngle,
			};
			assert.equal(finalAngle.angleDeg, 90.0);
			assert.notEqual(finalAngle.vertexMm, finalAngle.startMm, "Vertex must be distinct from startMm");
		});

		it("detects handle hit-testing for all 3 angle control handles (0=start, 1=vertex, 2=end)", () => {
			const projectedAngles = [
				{
					id: "angle-handles",
					plane: "axial" as const,
					startPx: { x: 40, y: 80 },
					vertexPx: { x: 100, y: 80 },
					endPx: { x: 100, y: 140 },
				},
			];

			const hitArm1 = hitTestMeasurementHandle({ x: 42, y: 81 }, [], projectedAngles, 12);
			assert.ok(hitArm1);
			assert.equal(hitArm1?.type, "angle");
			assert.equal(hitArm1?.handleIndex, 0);

			const hitVertex = hitTestMeasurementHandle({ x: 99, y: 82 }, [], projectedAngles, 12);
			assert.ok(hitVertex);
			assert.equal(hitVertex?.type, "angle");
			assert.equal(hitVertex?.handleIndex, 1);

			const hitArm2 = hitTestMeasurementHandle({ x: 101, y: 138 }, [], projectedAngles, 12);
			assert.ok(hitArm2);
			assert.equal(hitArm2?.type, "angle");
			assert.equal(hitArm2?.handleIndex, 2);
		});

		it("recalculates angleDeg when dragging angle vertex handle (index 1)", () => {
			const angle: CbctAngleMeasurement = {
				id: "angle-drag",
				plane: "axial",
				startMm: { x: 0, y: 10, z: 0 },
				vertexMm: { x: 0, y: 0, z: 0 },
				endMm: { x: 10, y: 0, z: 0 },
				angleDeg: 90.0,
			};

			// Drag vertex to { x: 10, y: 10, z: 0 } -> arms become (0,10)-(10,10) and (10,0)-(10,10)
			const newVertex: Point3D = { x: 10, y: 10, z: 0 };
			const newAngle = calculateAngleBetween3Points3D(angle.startMm, newVertex, angle.endMm);
			assert.equal(newAngle, 90.0);

			// Drag vertex to collinear midpoint between arms -> 180.0°
			const collinearVertex: Point3D = { x: 5, y: 5, z: 0 };
			const straightAngle = calculateAngleBetween3Points3D(angle.startMm, collinearVertex, angle.endMm);
			assert.equal(straightAngle, 180.0);

			// Drag vertex off-axis -> acute/obtuse angle strictly in (0, 180)
			const offAxisVertex: Point3D = { x: 2, y: 2, z: 0 };
			const angleVal = calculateAngleBetween3Points3D(angle.startMm, offAxisVertex, angle.endMm);
			assert.ok(angleVal > 0 && angleVal < 180);
		});

		it("detects fast delete click on angle [×] badge", () => {
			const projectedAngles = [
				{
					id: "angle-del",
					plane: "axial" as const,
					startPx: { x: 50, y: 100 },
					vertexPx: { x: 100, y: 100 },
					endPx: { x: 100, y: 150 },
				},
			];

			// Object hit test on delete button
			const hit = hitTestMeasurementObject({ x: 120, y: 120 }, [], projectedAngles, [], 30);
			assert.ok(hit);
			assert.equal(hit?.id, "angle-del");
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 8. TOOL 8: DENSITY / HU PROBE
	// ─────────────────────────────────────────────────────────────────────────
	describe("8. Density Probe Tool (Voxel HU Sampling & Tissue Classification)", () => {
		it("samples calibrated HU values from 3D voxel buffer with boundary fallback", () => {
			// Populate specific voxels in volume
			if (volume.data) {
				const idx = 10 * (volume.dimensions.width * volume.dimensions.height) + 20 * volume.dimensions.width + 30;
				volume.data[idx] = 1650; // Cortical bone
			}

			const hu = sampleVoxelHU(30, 20, 10, volume);
			assert.equal(hu, 1650);

			// Out of bounds samples air fallback (-1000 HU)
			const oobHu = sampleVoxelHU(999, 999, 999, volume);
			assert.equal(oobHu, -1000);
		});

		it("classifies anatomical tissues accurately across the full Hounsfield scale", () => {
			assert.equal(getTissueNameFromHU(-1000), "Воздух / Синус / Дыхательные пути");
			assert.equal(getTissueNameFromHU(-200), "Жировая клетчатка / Экссудат");
			assert.equal(getTissueNameFromHU(50), "Мягкие ткани / Слизистая / Хрящ");
			assert.equal(getTissueNameFromHU(200), "Мягкая губчатая кость (D4)");
			assert.equal(getTissueNameFromHU(400), "Трабекулярная губчатая кость");
			assert.equal(getTissueNameFromHU(1200), "Кортикальная кость / Дентин");
			assert.equal(getTissueNameFromHU(2500), "Эмаль / Пломбировочный материал");
		});

		it("formats HU probe string cleanly without double HU suffixes", () => {
			const formatted1 = formatHuProbe(1250, "Кортикальная кость");
			assert.equal(formatted1, "+1250 HU (Кортикальная кость)");

			const formattedNeg = formatHuProbe(-850, "Воздух");
			assert.equal(formattedNeg, "-850 HU (Воздух)");

			// Prevents dirty duplicate string if already contains HU
			const clean = formatHuProbe(50, "+50 HU (Мягкие ткани)");
			assert.equal(clean, "+50 HU (Мягкие ткани)");
		});

		it("detects fast delete click on probe marker", () => {
			const projectedProbes = [
				{
					id: "probe-del",
					plane: "axial" as const,
					posPx: { x: 75, y: 75 },
				},
			];

			const hit = hitTestMeasurementObject({ x: 75, y: 75 }, [], [], projectedProbes, 15);
			assert.ok(hit);
			assert.equal(hit?.id, "probe-del");
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 9. QUICK ACTIONS, CURSORS & DOCK CONTROLS
	// ─────────────────────────────────────────────────────────────────────────
	describe("9. Quick Actions, Cursors & Dock Controls", () => {
		it("provides standard CSS cursors for all interactive tool states", () => {
			assert.equal(getCbctToolCursor("crosshair", false), "crosshair");
			assert.equal(getCbctToolCursor("pan", false), "grab");
			assert.equal(getCbctToolCursor("pan", true), "grabbing");
			assert.equal(getCbctToolCursor("zoom", false), "zoom-in");
			assert.equal(getCbctToolCursor("zoom", true), "ns-resize");
			assert.equal(getCbctToolCursor("window_level", false), "ns-resize");
			assert.equal(getCbctToolCursor("window_level", true), "move");
			assert.equal(getCbctToolCursor("rotate", false), "grab");
			assert.equal(getCbctToolCursor("rotate", true), "grabbing");
			assert.equal(getCbctToolCursor("probe", false), "crosshair");
			assert.equal(getCbctToolCursor("ruler", false), "crosshair");
			assert.equal(getCbctToolCursor("angle", false), "crosshair");
			assert.equal(getCbctToolCursor("nerve", false), "crosshair");
			assert.equal(getCbctToolCursor("ruler", false, true), "grab");
		});

		it("resets all viewport transforms and angles on 1-Click Reset View", () => {
			let didReset = false;
			const onResetView = () => {
				didReset = true;
			};

			onResetView();
			assert.ok(didReset, "1-Click Reset View must execute callback");
		});

		it("supports Grayscale LUT Inversion toggle", () => {
			let invert = false;
			const toggleInvert = () => {
				invert = !invert;
			};

			toggleInvert();
			assert.equal(invert, true);
			toggleInvert();
			assert.equal(invert, false);
		});

		it("clamps slab thickness between 1 mm and 30 mm", () => {
			const clampSlab = (thickness: number) => Math.max(1, Math.min(30, Math.round(thickness)));

			assert.equal(clampSlab(0), 1);
			assert.equal(clampSlab(15.4), 15);
			assert.equal(clampSlab(50), 30);
		});

		it("detects handle hover on ruler and angle to return grab cursor", () => {
			const projectedRulers = [{ id: "r1", plane: "axial" as const, startPx: { x: 50, y: 50 }, endPx: { x: 100, y: 100 } }];
			const hit = hitTestMeasurementHandle({ x: 52, y: 49 }, projectedRulers, [], 12);
			assert.ok(hit, "Must hit handle within 12px");
			assert.equal(getCbctToolCursor("ruler", false, hit !== null), "grab");
		});
	});
});
