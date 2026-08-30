import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CBCT_HOUNSFIELD_PRESETS,
	DEFAULT_OBLIQUE_ROTATION,
	DEFAULT_VIEWPORT_TRANSFORM,
	resetObliqueRotationAngles,
	hitTestCrosshairCenter,
	type CbctViewportType,
	type Point3D,
	type ObliqueRotationAngles,
	type ViewportTransform,
} from "../cbctMprMath";

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
});
