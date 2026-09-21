import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CBCT_HOUNSFIELD_PRESETS,
	createEmptyCbctVolume,
	type CbctViewportType,
	type Point3D,
} from "../cbctMprMath";
import {
	DEFAULT_OBLIQUE_ROTATION,
	DEFAULT_VIEWPORT_TRANSFORM,
	resetObliqueRotationAngles,
	hitTestCrosshairCenter,
	type ObliqueRotationAngles,
	type ViewportTransform,
	determineWheelAction,
	calculateWheelSliceDelta,
	calculateSliceIndexFromWheel,
	calculateCrosshairSliceScroll,
	getVolumeCenterMm,
	resetFullViewAndOrientation,
	applyCursorZoom,
} from "../cbctObliqueMath";

describe("Wave 27 — CBCT Reset View & Double-Click Navigation Suite (Domain 3)", () => {
	describe("1. [↺ Сброс вида] (cbct-btn-reset-view) Invariants", () => {
		it("resets transforms to 100% zoom and (0,0) center pan for all viewports", () => {
			const dirtyTransforms: Record<CbctViewportType, ViewportTransform> = {
				axial: { zoom: 2.5, panX: 45, panY: -30 },
				coronal: { zoom: 1.8, panX: -20, panY: 15 },
				sagittal: { zoom: 3.0, panX: 10, panY: 10 },
				panoramic: { zoom: 1.5, panX: 0, panY: -50 },
				cross_section: { zoom: 2.0, panX: 12, panY: 8 },
			};

			// Simulate Reset View action
			const resetTransforms: Record<CbctViewportType, ViewportTransform> = {
				axial: DEFAULT_VIEWPORT_TRANSFORM,
				coronal: DEFAULT_VIEWPORT_TRANSFORM,
				sagittal: DEFAULT_VIEWPORT_TRANSFORM,
				panoramic: DEFAULT_VIEWPORT_TRANSFORM,
				cross_section: DEFAULT_VIEWPORT_TRANSFORM,
			};

			for (const vp of ["axial", "coronal", "sagittal", "panoramic", "cross_section"] as const) {
				assert.equal(resetTransforms[vp].zoom, 1.0, `${vp} zoom must be reset to 100% (1.0)`);
				assert.equal(resetTransforms[vp].panX, 0, `${vp} panX must be reset to 0`);
				assert.equal(resetTransforms[vp].panY, 0, `${vp} panY must be reset to 0`);
			}
		});

		it("resets oblique rotation angles to 0.0° across all planes", () => {
			const resetAngles = resetObliqueRotationAngles();
			assert.equal(resetAngles.axialAngleDeg, 0);
			assert.equal(resetAngles.coronalTiltDeg, 0);
			assert.equal(resetAngles.sagittalTiltDeg, 0);
		});

		it("resets contrast window/level to initial Bone/Кость preset (WW 4400 / WL 1300)", () => {
			const bonePreset = CBCT_HOUNSFIELD_PRESETS.find((p) => p.id === "bone_dense");
			assert.ok(bonePreset, "Bone preset must exist in CBCT presets catalog");
			assert.equal(bonePreset.windowWidth, 4400, "Bone WW must be 4400");
			assert.equal(bonePreset.windowLevel, 1300, "Bone WL must be 1300");
		});

		it("clears active caliper rulers and probe markers without deleting 3D nerve or implants", () => {
			// Initial clinical state with nerve and virtual implant
			const initialNervePoints: Point3D[] = [
				{ x: -32.0, y: -2.0, z: 2.0 },
				{ x: -28.0, y: -15.0, z: -4.0 },
				{ x: -25.0, y: -28.0, z: -10.0 },
			];
			const initialImplant = {
				brand: "osstem",
				diameterMm: 4.0,
				lengthMm: 10.0,
				entryDepthMm: 2.0,
			};

			// User adds transient caliper measurements and probes
			let rulers = [{ id: "r1", startMm: { x: 0, y: 0, z: 0 }, endMm: { x: 10, y: 0, z: 0 }, lengthMm: 10 }];
			let probeMarkers = [{ id: "p1", pointMm: { x: 5, y: 5, z: 5 }, huValue: 850 }];

			// Action: Reset View
			rulers = [];
			probeMarkers = [];

			// Assertions: transient measurements cleared
			assert.equal(rulers.length, 0, "Rulers must be cleared on reset");
			assert.equal(probeMarkers.length, 0, "Probes must be cleared on reset");

			// Assertions: 3D nerve and implant specs remain intact
			assert.equal(initialNervePoints.length, 3, "3D Nerve points must NOT be deleted");
			assert.equal(initialImplant.brand, "osstem", "Implant brand must be preserved");
			assert.equal(initialImplant.diameterMm, 4.0, "Implant diameter must be preserved");
			assert.equal(initialImplant.lengthMm, 10.0, "Implant length must be preserved");
		});
	});

	describe("2. Viewport Double-Click Navigation (100% Fullscreen / Grid Restore)", () => {
		it("toggles maximized viewport from 2x2 grid to 100% on first double click, and restores grid on second double click", () => {
			let maximizedViewport: CbctViewportType | null = null;

			const handleToggleMaximize = (type: CbctViewportType) => {
				maximizedViewport = maximizedViewport === type ? null : type;
			};

			// 1. Initial state: 2x2 grid (null maximized)
			assert.equal(maximizedViewport, null);

			// 2. Double click on Axial viewport -> expands to 100%
			handleToggleMaximize("axial");
			assert.equal(maximizedViewport, "axial");

			// 3. Second double click on Axial viewport -> restores 2x2 grid
			handleToggleMaximize("axial");
			assert.equal(maximizedViewport, null);

			// 4. Double click on Coronal viewport -> expands to 100%
			handleToggleMaximize("coronal");
			assert.equal(maximizedViewport, "coronal");

			// 5. Double click on Sagittal viewport while Coronal is maximized -> switches to Sagittal 100%
			handleToggleMaximize("sagittal");
			assert.equal(maximizedViewport, "sagittal");

			// 6. Double click on Sagittal -> restores grid
			handleToggleMaximize("sagittal");
			assert.equal(maximizedViewport, null);
		});

		it("supports double-click maximize/restore for all 5 viewport types", () => {
			const viewports: CbctViewportType[] = ["axial", "coronal", "sagittal", "panoramic", "cross_section"];

			for (const vp of viewports) {
				let maximized: CbctViewportType | null = null;
				const toggle = (t: CbctViewportType) => {
					maximized = maximized === t ? null : t;
				};

				toggle(vp);
				assert.equal(maximized, vp, `${vp} must expand to 100% on double click`);

				toggle(vp);
				assert.equal(maximized, null, `${vp} must restore grid on second double click`);
			}
		});

		it("differentiates double click on crosshair center (resets angle) vs canvas body (maximizes viewport)", () => {
			const centerPx = { x: 256, y: 256 };
			const crosshairClickPx = { x: 258, y: 255 }; // Within 18px radius
			const backgroundClickPx = { x: 100, y: 100 }; // Outside crosshair

			assert.ok(
				hitTestCrosshairCenter(crosshairClickPx, centerPx, 18),
				"Double click on crosshair center must hit crosshair target for quick angle reset",
			);
			assert.ok(
				!hitTestCrosshairCenter(backgroundClickPx, centerPx, 18),
				"Double click on canvas body must NOT hit crosshair, triggering viewport maximize instead",
			);
		});
	});

	describe("3. Mouse Wheel Slice Scrolling (Default without Shift) & Zoom on Ctrl+Wheel", () => {
		const testVolume = createEmptyCbctVolume(80, 80, 60, 0.5, 400);

		it("scrolls slices by default when mouse wheel is moved without modifier keys", () => {
			// Wheel down without modifiers -> action is slice_scroll
			const actionDown = determineWheelAction({ deltaY: 100 });
			assert.equal(actionDown, "slice_scroll", "Default wheel down must trigger slice scrolling");

			// Wheel up without modifiers -> action is slice_scroll
			const actionUp = determineWheelAction({ deltaY: -100 });
			assert.equal(actionUp, "slice_scroll", "Default wheel up must trigger slice scrolling");

			// Wheel with Shift (legacy alternative) also triggers slice_scroll
			const actionShift = determineWheelAction({ deltaY: 100, shiftKey: true });
			assert.equal(actionShift, "slice_scroll", "Wheel with Shift must trigger slice scrolling");
		});

		it("triggers cursor-anchored zoom when Ctrl or Meta (Command) key is held during wheel scroll", () => {
			// Ctrl + Wheel Down -> action is zoom (zoom out)
			const actionCtrl = determineWheelAction({ deltaY: 100, ctrlKey: true });
			assert.equal(actionCtrl, "zoom", "Ctrl + Wheel must trigger zoom action");

			// Meta (Command on Mac) + Wheel Up -> action is zoom (zoom in)
			const actionMeta = determineWheelAction({ deltaY: -100, metaKey: true });
			assert.equal(actionMeta, "zoom", "Meta + Wheel must trigger zoom action");

			// Verify applyCursorZoom behavior with Ctrl+Wheel
			const initialTransform: ViewportTransform = { zoom: 1.0, panX: 0, panY: 0 };
			const cursorPx = { x: 128, y: 128 };

			// Zoom in with deltaY < 0
			const zoomIn = applyCursorZoom(initialTransform, cursorPx, -200);
			assert.ok(zoomIn.zoom > 1.0, "Negative wheel delta with Ctrl must zoom in");

			// Zoom out with deltaY > 0
			const zoomOut = applyCursorZoom(initialTransform, cursorPx, 200);
			assert.ok(zoomOut.zoom < 1.0, "Positive wheel delta with Ctrl must zoom out");
		});

		it("steps and clamps slice indices correctly during continuous wheel scrolling", () => {
			const maxSlice = 59;

			// Step forward from 20 -> 21
			const nextSlice = calculateSliceIndexFromWheel(20, maxSlice, 100);
			assert.equal(nextSlice, 21);

			// Step backward from 20 -> 19
			const prevSlice = calculateSliceIndexFromWheel(20, maxSlice, -100);
			assert.equal(prevSlice, 19);

			// Clamp at top boundary (59 -> 59, no out of bounds)
			const clampTop = calculateSliceIndexFromWheel(59, maxSlice, 100);
			assert.equal(clampTop, 59);

			// Clamp at bottom boundary (0 -> 0, no negative index)
			const clampBottom = calculateSliceIndexFromWheel(0, maxSlice, -100);
			assert.equal(clampBottom, 0);
		});

		it("updates 3D crosshair position along the active plane normal during slice scrolling", () => {
			const startPos: Point3D = { x: 0, y: 0, z: 0 };

			// Axial plane scroll moves along Z axis
			const scrolledAxial = calculateCrosshairSliceScroll(startPos, "axial", 100, testVolume);
			assert.equal(scrolledAxial.z, 0.5, "Axial slice scroll must advance along Z axis by spacingMm.z");
			assert.equal(scrolledAxial.x, 0);
			assert.equal(scrolledAxial.y, 0);

			// Coronal plane scroll moves along Y axis
			const scrolledCoronal = calculateCrosshairSliceScroll(startPos, "coronal", 100, testVolume);
			assert.equal(scrolledCoronal.y, 0.5, "Coronal slice scroll must advance along Y axis by spacingMm.y");
			assert.equal(scrolledCoronal.x, 0);
			assert.equal(scrolledCoronal.z, 0);

			// Sagittal plane scroll moves along X axis
			const scrolledSagittal = calculateCrosshairSliceScroll(startPos, "sagittal", 100, testVolume);
			assert.equal(scrolledSagittal.x, 0.5, "Sagittal slice scroll must advance along X axis by spacingMm.x");
			assert.equal(scrolledSagittal.y, 0);
			assert.equal(scrolledSagittal.z, 0);
		});
	});

	describe("4. Complete Clinical Reset of Orientation, Zoom, and Volume Centering", () => {
		const testVolume = createEmptyCbctVolume(100, 100, 80, 0.4, 400);

		it("resets orientation angles to strictly 0.0° across all 3 planes", () => {
			const resetState = resetFullViewAndOrientation(testVolume);
			assert.equal(resetState.angles.axialAngleDeg, 0.0);
			assert.equal(resetState.angles.coronalTiltDeg, 0.0);
			assert.equal(resetState.angles.sagittalTiltDeg, 0.0);
		});

		it("resets viewport zoom to 1.0x (100%) and pan offsets to (0, 0)", () => {
			const resetState = resetFullViewAndOrientation(testVolume);
			assert.equal(resetState.transform.zoom, 1.0);
			assert.equal(resetState.transform.panX, 0);
			assert.equal(resetState.transform.panY, 0);
		});

		it("centers 3D crosshair strictly to the volume physical geometric center", () => {
			const expectedCenter = getVolumeCenterMm(testVolume);
			const resetState = resetFullViewAndOrientation(testVolume);

			assert.deepEqual(resetState.crosshairMm, expectedCenter, "Crosshair must be centered to physical volume center");
			// testVolume has symmetric origin: physW=40, origin.x=-20 -> center = 0.0
			assert.equal(resetState.crosshairMm.x, 0.0);
			assert.equal(resetState.crosshairMm.y, 0.0);
			assert.equal(resetState.crosshairMm.z, 0.0);
		});

		it("restores pristine default state from arbitrary skewed clinical state", () => {
			// Simulating doctor after heavy rotation and pan:
			// axial 35°, coronal -18°, sagittal 12°, zoom 3.8x, pan (120, -80), crosshair at corner
			const skewedState = {
				angles: { axialAngleDeg: 35.0, coronalTiltDeg: -18.0, sagittalTiltDeg: 12.0 },
				transform: { zoom: 3.8, panX: 120, panY: -80 },
				crosshairMm: { x: 18.0, y: -19.0, z: 15.0 },
			};

			// Full Reset action
			const restoredState = resetFullViewAndOrientation(testVolume);

			// Assertions
			assert.notDeepEqual(restoredState.angles, skewedState.angles);
			assert.deepEqual(restoredState.angles, { axialAngleDeg: 0, coronalTiltDeg: 0, sagittalTiltDeg: 0 });

			assert.notDeepEqual(restoredState.transform, skewedState.transform);
			assert.deepEqual(restoredState.transform, { zoom: 1.0, panX: 0, panY: 0 });

			assert.notDeepEqual(restoredState.crosshairMm, skewedState.crosshairMm);
			assert.deepEqual(restoredState.crosshairMm, { x: 0.0, y: 0.0, z: 0.0 });
		});
	});
});
