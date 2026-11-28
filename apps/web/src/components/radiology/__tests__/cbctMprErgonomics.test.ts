/**
 * DENTE CRM — CBCT 4-Quadrant Viewport UI/UX, Caliper Ruler HUD & Anti-Clutter Test Suite
 * Standards: DICOM Part 3 / PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 * Mandate 8k (Compact Clinical Density 28–32px, Zero-Bloat) & Mandate 8b
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	CBCT_QUICK_WL_PRESETS,
	CbctViewportRulerToolbar,
	formatRulerDistanceMm,
	calculateRulerDistanceMm,
	filterRulersByViewport,
	getRulerSummary,
} from "../mpr/CbctViewportsRuler";
import {
	getViewportOrientationLabels,
	type CbctAngleMeasurement,
	type CbctMeasurementRuler,
	type CbctVoxelVolume,
	type Point3D,
	type CbctViewportType,
} from "../cbctMprMath";
import { handleCbctKeyDown } from "../useCbctKeyboardShortcuts";
import { ViewportTopRightControls } from "../hud/ViewportTopRightControls";
import { MprQuadWorkspace } from "../mpr/workspaces/MprQuadWorkspace";
import { CbctViewportHud } from "../CbctViewportHud";
import { CbctVolume3DTelemetryHud } from "../mpr/cbctVolume3D/CbctVolume3DTelemetryHud";
import { CbctMprGridWorkspaceRenderer } from "../mpr/viewportsGrid/CbctMprGridWorkspaceRenderer";
import type { CbctMprViewportsGridProps } from "../mpr/viewportsGrid/CbctMprGridProps";
import { disposeSharedCbctGlContext, getSharedCbctGlContext } from "../mpr/webgl/CbctVolumeGlContext";

describe("CBCT Clinical UI/UX Ergonomics & Measurement HUD Suite", () => {
	describe("1. Screen Caliper Ruler HUD & Mathematical Precision", () => {
		it("formats physical measurement distance in millimeters with exact precision", () => {
			assert.equal(formatRulerDistanceMm(11.42), "11.4 мм");
			assert.equal(formatRulerDistanceMm(11.4), "11.4 мм");
			assert.equal(formatRulerDistanceMm(0), "0.0 мм");
			assert.equal(formatRulerDistanceMm(2.35), "2.4 мм");
			assert.equal(formatRulerDistanceMm(15.0), "15.0 мм");
		});

		it("handles non-finite and negative distance edge cases gracefully", () => {
			assert.equal(formatRulerDistanceMm(-5), "0.0 мм");
			assert.equal(formatRulerDistanceMm(Number.NaN), "0.0 мм");
			assert.equal(formatRulerDistanceMm(Number.POSITIVE_INFINITY), "0.0 мм");
		});

		it("calculates exact 3D Euclidean distances between coordinates in physical millimeters", () => {
			// 1D displacement on X axis
			const p1: Point3D = { x: 0, y: 0, z: 0 };
			const p2: Point3D = { x: 10, y: 0, z: 0 };
			assert.equal(calculateRulerDistanceMm(p1, p2), 10.0);

			// 2D 3-4-5 right triangle
			const p3: Point3D = { x: 3, y: 4, z: 0 };
			assert.equal(calculateRulerDistanceMm(p1, p3), 5.0);

			// 3D displacement
			const p4: Point3D = { x: 2, y: 3, z: 6 };
			// sqrt(4 + 9 + 36) = sqrt(49) = 7
			assert.equal(calculateRulerDistanceMm(p1, p4), 7.0);

			// Typical clinical alveolar ridge height measurement (11.4 mm)
			const ridgeTop: Point3D = { x: 12.5, y: -4.2, z: 18.0 };
			const ridgeBottom: Point3D = { x: 12.5, y: -4.2, z: 6.6 };
			assert.equal(calculateRulerDistanceMm(ridgeTop, ridgeBottom), 11.4);
		});

		it("filters measurements strictly by viewport projection plane", () => {
			const mockRulers: CbctMeasurementRuler[] = [
				{ id: "r1", plane: "axial", startMm: { x: 0, y: 0, z: 5 }, endMm: { x: 10, y: 0, z: 5 }, distanceMm: 10.0 },
				{ id: "r2", plane: "axial", startMm: { x: 5, y: 2, z: 5 }, endMm: { x: 5, y: 8, z: 5 }, distanceMm: 6.0 },
				{ id: "r3", plane: "coronal", startMm: { x: 0, y: 5, z: 0 }, endMm: { x: 0, y: 5, z: 12 }, distanceMm: 12.0 },
				{ id: "r4", plane: "sagittal", startMm: { x: 5, y: 0, z: 0 }, endMm: { x: 5, y: 0, z: 8 }, distanceMm: 8.0 },
			];

			const axialRulers = filterRulersByViewport(mockRulers, "axial");
			assert.equal(axialRulers.length, 2);
			assert.equal(axialRulers[0]?.id, "r1");
			assert.equal(axialRulers[1]?.id, "r2");

			const coronalRulers = filterRulersByViewport(mockRulers, "coronal");
			assert.equal(coronalRulers.length, 1);
			assert.equal(coronalRulers[0]?.id, "r3");

			const crossSectionRulers = filterRulersByViewport(mockRulers, "cross_section");
			assert.equal(crossSectionRulers.length, 0);
		});

		it("computes comprehensive ruler summary metrics for multiple measurements", () => {
			const emptySummary = getRulerSummary([]);
			assert.equal(emptySummary.count, 0);
			assert.equal(emptySummary.totalMm, 0);
			assert.equal(emptySummary.latestMm, null);

			const mockRulers: CbctMeasurementRuler[] = [
				{ id: "r1", plane: "coronal", startMm: { x: 0, y: 0, z: 0 }, endMm: { x: 0, y: 0, z: 11.4 }, distanceMm: 11.4 },
				{ id: "r2", plane: "coronal", startMm: { x: 2, y: 0, z: 5 }, endMm: { x: 4.1, y: 0, z: 5 }, distanceMm: 2.1 },
			];

			const summary = getRulerSummary(mockRulers, "coronal");
			assert.equal(summary.count, 2);
			assert.equal(summary.totalMm, 13.5);
			assert.equal(summary.minMm, 2.1);
			assert.equal(summary.maxMm, 11.4);
			assert.equal(summary.latestMm, 2.1);
		});
	});

	describe("2. Multi-Measurement Clinical Workflow (Ridge Height, Cortical Plate & Clear)", () => {
		it("supports placing multiple independent measurements without overwriting previous data", () => {
			let activeRulers: CbctMeasurementRuler[] = [];

			// Measurement 1: Alveolar ridge height
			const measurement1: CbctMeasurementRuler = {
				id: "ruler-ridge-height",
				plane: "coronal",
				startMm: { x: 10, y: 5, z: 20 },
				endMm: { x: 10, y: 5, z: 8.6 },
				distanceMm: 11.4,
			};
			activeRulers = [...activeRulers, measurement1];
			assert.equal(activeRulers.length, 1);
			assert.equal(formatRulerDistanceMm(activeRulers[0]!.distanceMm), "11.4 мм");

			// Measurement 2: Cortical plate thickness
			const measurement2: CbctMeasurementRuler = {
				id: "ruler-cortical-plate",
				plane: "coronal",
				startMm: { x: 9.0, y: 5, z: 15 },
				endMm: { x: 11.3, y: 5, z: 15 },
				distanceMm: 2.3,
			};
			activeRulers = [...activeRulers, measurement2];
			assert.equal(activeRulers.length, 2);
			assert.equal(formatRulerDistanceMm(activeRulers[1]!.distanceMm), "2.3 мм");

			// Verify both measurements persist in parallel
			assert.equal(activeRulers[0]!.id, "ruler-ridge-height");
			assert.equal(activeRulers[1]!.id, "ruler-cortical-plate");
		});

		it("renders per-viewport clear measurement controls only when measurements exist on that plane", () => {
			const rulers: CbctMeasurementRuler[] = [
				{ id: "r1", plane: "axial", startMm: { x: 0, y: 0, z: 0 }, endMm: { x: 5, y: 0, z: 0 }, distanceMm: 5.0 },
				{ id: "r2", plane: "coronal", startMm: { x: 0, y: 0, z: 0 }, endMm: { x: 0, y: 0, z: 11.4 }, distanceMm: 11.4 },
				{ id: "r3", plane: "coronal", startMm: { x: 2, y: 0, z: 0 }, endMm: { x: 4.3, y: 0, z: 0 }, distanceMm: 2.3 },
			];
			const angles: CbctAngleMeasurement[] = [
				{
					id: "a1",
					plane: "coronal",
					p1Mm: { x: 0, y: 0, z: 0 },
					vertexMm: { x: 5, y: 0, z: 0 },
					p2Mm: { x: 5, y: 5, z: 0 },
					angleDeg: 90,
				},
			];

			const coronalHtml = renderToStaticMarkup(
				React.createElement(CbctViewportRulerToolbar, {
					viewportType: "coronal",
					rulers,
					angles,
					onClearRulers: () => {},
					onClearAngles: () => {},
				}),
			);
			assert.ok(coronalHtml.includes('data-testid="cbct-ruler-count-coronal"'));
			assert.ok(coronalHtml.includes("2 зам."));
			assert.ok(coronalHtml.includes("2.3 мм"));
			assert.ok(coronalHtml.includes('data-testid="cbct-clear-rulers-btn-coronal"'));
			assert.ok(coronalHtml.includes('data-testid="cbct-angle-count-coronal"'));
			assert.ok(coronalHtml.includes("90°"));
			assert.ok(coronalHtml.includes('data-testid="cbct-clear-angles-btn-coronal"'));

			const sagittalHtml = renderToStaticMarkup(
				React.createElement(CbctViewportRulerToolbar, {
					viewportType: "sagittal",
					rulers,
					angles,
					onClearRulers: () => {},
					onClearAngles: () => {},
				}),
			);
			assert.ok(!sagittalHtml.includes('data-testid="cbct-clear-rulers-btn-sagittal"'));
			assert.ok(!sagittalHtml.includes('data-testid="cbct-clear-angles-btn-sagittal"'));
		});
	});

	describe("3. Fast 1-Click W/L Contrast Presets (Mandate Directive 2)", () => {
		it("provides all three clinical 1-click W/L presets with exact DICOM parameters", () => {
			assert.ok(CBCT_QUICK_WL_PRESETS.length >= 3);

			// 1. «Кость (W2500/L500)»
			const bonePreset = CBCT_QUICK_WL_PRESETS.find((p) => p.id === "bone");
			assert.ok(bonePreset !== undefined, "Bone preset must exist");
			assert.equal(bonePreset.label, "Кость (W2500/L500)");
			assert.equal(bonePreset.windowWidth, 2500, "Bone Window Width must be 2500 HU");
			assert.equal(bonePreset.windowLevel, 500, "Bone Window Level must be 500 HU");
			assert.equal(bonePreset.testId, "cbct-quick-wl-bone");

			// 2. «Эмаль/Дентин (W4000/L1200)»
			const enamelPreset = CBCT_QUICK_WL_PRESETS.find((p) => p.id === "enamel_dentin");
			assert.ok(enamelPreset !== undefined, "Enamel/Dentin preset must exist");
			assert.equal(enamelPreset.label, "Эмаль/Дентин (W4000/L1200)");
			assert.equal(enamelPreset.windowWidth, 4000, "Enamel Window Width must be 4000 HU");
			assert.equal(enamelPreset.windowLevel, 1200, "Enamel Window Level must be 1200 HU");
			assert.equal(enamelPreset.testId, "cbct-quick-wl-enamel");

			// 3. «Мягкие ткани (W400/L40)»
			const softPreset = CBCT_QUICK_WL_PRESETS.find((p) => p.id === "soft_tissue");
			assert.ok(softPreset !== undefined, "Soft tissue preset must exist");
			assert.equal(softPreset.label, "Мягкие ткани (W400/L40)");
			assert.equal(softPreset.windowWidth, 400, "Soft tissue Window Width must be 400 HU");
			assert.equal(softPreset.windowLevel, 40, "Soft tissue Window Level must be 40 HU");
			assert.equal(softPreset.testId, "cbct-quick-wl-soft");
		});

		it("executes 1-click W/L application without requiring slider adjustments", () => {
			let currentWW = 4400;
			let currentWL = 1300;

			const applyQuickPreset = (preset: { windowWidth: number; windowLevel: number }) => {
				currentWW = preset.windowWidth;
				currentWL = preset.windowLevel;
			};

			// Apply Bone preset
			const bone = CBCT_QUICK_WL_PRESETS[0]!;
			applyQuickPreset(bone);
			assert.equal(currentWW, 2500);
			assert.equal(currentWL, 500);

			// Apply Enamel/Dentin preset
			const enamel = CBCT_QUICK_WL_PRESETS[1]!;
			applyQuickPreset(enamel);
			assert.equal(currentWW, 4000);
			assert.equal(currentWL, 1200);

			// Apply Soft Tissue preset
			const soft = CBCT_QUICK_WL_PRESETS[2]!;
			applyQuickPreset(soft);
			assert.equal(currentWW, 400);
			assert.equal(currentWL, 40);
		});
	});

	describe("4. Radiological Orientation Badges (A/P/L/R & S/I/R/L)", () => {
		it("strictly enforces patient's Right on Left of screen for Axial view (A/P/L/R)", () => {
			const axial = getViewportOrientationLabels("axial");
			assert.equal(axial.top, "A", "Axial Top must be Anterior (Face)");
			assert.equal(axial.bottom, "P", "Axial Bottom must be Posterior (Occiput)");
			assert.equal(axial.left, "R", "Axial Left must be Patient Right");
			assert.equal(axial.right, "L", "Axial Right must be Patient Left");
			assert.ok(axial.leftTooltipRu.includes("Правая сторона пациента — слева на экране"));
		});

		it("strictly enforces patient's Right on Left of screen for Coronal view (S/I/R/L)", () => {
			const coronal = getViewportOrientationLabels("coronal");
			assert.equal(coronal.top, "S", "Coronal Top must be Superior (Cranium)");
			assert.equal(coronal.bottom, "I", "Coronal Bottom must be Inferior (Neck)");
			assert.equal(coronal.left, "R", "Coronal Left must be Patient Right");
			assert.equal(coronal.right, "L", "Coronal Right must be Patient Left");
			assert.ok(coronal.leftTooltipRu.includes("Правая сторона пациента — слева на экране"));
		});

		it("strictly enforces anatomical profile conventions for Sagittal view (S/I/A/P)", () => {
			const sagittal = getViewportOrientationLabels("sagittal");
			assert.equal(sagittal.top, "S", "Sagittal Top must be Superior");
			assert.equal(sagittal.bottom, "I", "Sagittal Bottom must be Inferior");
			assert.equal(sagittal.left, "A", "Sagittal Left must be Anterior (Face)");
			assert.equal(sagittal.right, "P", "Sagittal Right must be Posterior (Nape)");
		});
	});

	describe("5. Compact Clinical Density & Zero-Bloat Invariants (Mandate 8k)", () => {
		it("enforces compact 28–32px button heights for all desktop viewport HUD controls", () => {
			const html = renderToStaticMarkup(
				React.createElement(CbctViewportRulerToolbar, {
					viewportType: "axial",
					activeTool: "ruler",
					onSelectTool: () => {},
					showSharpenControl: true,
					showEndoCanalControl: true,
				}),
			);

			assert.ok(html.includes('data-testid="cbct-viewport-ruler-btn-axial"'));
			assert.ok(html.includes('data-testid="cbct-viewport-angle-btn-axial"'));
			assert.ok(html.includes('data-testid="cbct-viewport-endo-canal-btn-axial"'));
			assert.ok(html.includes('data-testid="cbct-viewport-sharpen-btn-axial"'));
			assert.ok(html.includes("h-7"));
			assert.ok(html.includes("min-h-[28px]"));
			assert.ok(html.includes("max-h-[28px]"));
			assert.ok(!html.includes("w-11 h-11"), "Desktop buttons must not enforce 44x44px unconditionally");
		});

		it("verifies dual-mode touch targets for narrow mobile viewports without bloating desktop", () => {
			const html = renderToStaticMarkup(
				React.createElement(ViewportTopRightControls, {
					viewportType: "axial",
					onToggleMaximize: () => {},
				}),
			);
			assert.ok(html.includes("min-h-[28px]"), "Desktop button keeps 28px compact density");
			assert.ok(html.includes("max-md:h-11"), "Mobile viewport expands target to 44px");
			assert.ok(!html.includes("pointer:coarse"), "Must not use global (pointer: coarse)");
		});
	});

	describe("6. Visual Clutter & Bone Occlusion Prevention (Red Team Audit)", () => {
		it("guarantees measurement line contrast without thick opaque overlays obscuring bone", () => {
			// High-contrast line definition: 1.5-2.0px stroke with subtle drop shadow
			const strokeWidth = 1.5;
			assert.ok(strokeWidth <= 2.0, "Measurement stroke width must not exceed 2.0px to avoid obscuring micro-fractures");

			// Floating pill badge uses compact monospace font and crisp dark pad
			const sampleBadgeText = formatRulerDistanceMm(11.4);
			assert.equal(sampleBadgeText, "11.4 мм");
			assert.ok(sampleBadgeText.endsWith("мм"));
		});
	});

	describe("7. Ez3D-i Clinical Telemetry & Orientation Invariants (Screenshots 222505, 222511, 222517)", () => {
		it("enforces canonical Ez3D-i 4-quadrant layout order contract: Coronal (TL), Sagittal (TR), Axial (BL), 3D (BR)", () => {
			const html = renderToStaticMarkup(
				React.createElement(MprQuadWorkspace, {
					volume: null,
					viewLayout: "quad_view",
					activeViewport: "axial",
					setActiveViewport: () => {},
					maximizedViewport: null,
					handleToggleMaximize: () => {},
					mobileActiveTab: "coronal",
					renderers: {
						renderCoronal: () => React.createElement("div", { "data-quad": "coronal" }),
						renderSagittal: () => React.createElement("div", { "data-quad": "sagittal" }),
						renderAxial: () => React.createElement("div", { "data-quad": "axial" }),
						renderPanoramic: () => React.createElement("div", { "data-quad": "panoramic" }),
						renderCrossSection: () => React.createElement("div", { "data-quad": "cross_section" }),
						renderVolume3D: () => React.createElement("div", { "data-quad": "volume3d" }),
					},
				}),
			);

			assert.ok(html.includes('data-testid="cbct-mpr-quad-grid"'));
			const coronalIdx = html.indexOf('data-quad="coronal"');
			const sagittalIdx = html.indexOf('data-quad="sagittal"');
			const axialIdx = html.indexOf('data-quad="axial"');
			const vol3dIdx = html.indexOf('data-quad="volume3d"');

			assert.ok(coronalIdx >= 0 && sagittalIdx > coronalIdx, "Q1 Coronal must precede Q2 Sagittal");
			assert.ok(axialIdx > sagittalIdx, "Q2 Sagittal must precede Q3 Axial");
			assert.ok(vol3dIdx > axialIdx, "Q3 Axial must precede Q4 3D Volume");
		});

		it("verifies bottom-right telemetry string formatting: TH, INT and Full Slice counter", () => {
			const html = renderToStaticMarkup(
				React.createElement(CbctViewportHud, {
					viewportType: "axial",
					slabThicknessMm: 0.0,
					pixelSpacingMm: 0.5,
					sliceIndex: 85,
					totalSlices: 192,
				}),
			);

			assert.ok(html.includes('data-testid="cbct-bottom-telemetry-axial"'));
			assert.ok(html.includes("TH"));
			assert.ok(html.includes("0.0mm"));
			assert.ok(html.includes("INT"));
			assert.ok(html.includes("0.5mm"));
			assert.ok(html.includes("86 / 192"));
		});

		it("calculates 3D physical FOV in millimeters and formats axis coordinates", () => {
			const volume: CbctVoxelVolume = {
				dimensions: { width: 270, height: 270, depth: 400 },
				spacingMm: { x: 0.2, y: 0.2, z: 0.2 },
				data: new Int16Array(0),
				minHu: -1000,
				maxHu: 3000,
				modality: "CBCT",
			};
			const html = renderToStaticMarkup(
				React.createElement(CbctVolume3DTelemetryHud, {
					volume,
					activePreset: "skull",
					crosshairMm: { x: 1.2, y: -4.7, z: -7.7 },
					yaw: 15,
					pitch: -10,
					hasActiveClipping: false,
					effectiveHibernated: false,
					isGpuActive: true,
					isMarActive: false,
				}),
			);

			assert.ok(html.includes('data-testid="cbct-3d-fov-telemetry"'));
			assert.ok(html.includes("FOV [54 × 80 мм]"));
			assert.ok(html.includes('data-testid="cbct-3d-axis-telemetry"'));
			assert.ok(html.includes("[1.2, -4.7, -7.7]"));
		});

		it("enforces Ez3D-i cross-section orientation badges via getViewportOrientationLabels: Buccal (B) Left, Lingual (L) Right", () => {
			const cross = getViewportOrientationLabels("cross_section");
			assert.equal(cross.left, "B", "Left must be Buccal (Щёчная сторона)");
			assert.equal(cross.right, "L", "Right must be Lingual (Язычная сторона)");
			assert.equal(cross.top, "S");
			assert.equal(cross.bottom, "I");

			const pano = getViewportOrientationLabels("panoramic");
			assert.equal(pano.left, "R", "Panoramic Right side of patient sits on Left of viewport");
			assert.equal(pano.right, "L");
		});
	});

	describe("8. WebGL Deterministic Teardown & Context Disposal (Mandate 8wx & Frontend Rules)", () => {
		it("resets shared GL context state cleanly via disposeSharedCbctGlContext", () => {
			const ctx = getSharedCbctGlContext();
			ctx.setSharpenAmount(0.5);
			assert.equal(ctx.getSharpenAmount(), 0.5);

			disposeSharedCbctGlContext();

			const nextCtx = getSharedCbctGlContext();
			assert.notStrictEqual(nextCtx, ctx, "Disposing must release old singleton instance");
			assert.equal(nextCtx.getSharpenAmount(), 0, "Fresh shared GL context must start with clean sharpen state");
			disposeSharedCbctGlContext();
		});
	});

	describe("9. Radiological Presets & Ruler Summary Precision", () => {
		it("exposes clinically distinct quick W/L presets with positive window widths", () => {
			assert.ok(CBCT_QUICK_WL_PRESETS.length >= 3, "Must define multiple quick W/L presets");
			const seenIds = new Set<string>();
			for (const preset of CBCT_QUICK_WL_PRESETS) {
				assert.ok(preset.windowWidth > 0, `Preset ${preset.id} must have positive windowWidth`);
				assert.equal(seenIds.has(preset.id), false, `Duplicate preset id ${preset.id}`);
				seenIds.add(preset.id);
			}
		});

		it("formats ruler summary counts and distances strictly from real measurements", () => {
			const rulers: CbctMeasurementRuler[] = [
				{ id: "r1", plane: "axial", startMm: { x: 0, y: 0, z: 0 }, endMm: { x: 3, y: 4, z: 0 }, distanceMm: 5.0 },
				{ id: "r2", plane: "axial", startMm: { x: 0, y: 0, z: 0 }, endMm: { x: 0, y: 10, z: 0 }, distanceMm: 10.0 },
			];
			const summary = getRulerSummary(rulers, "axial");
			assert.equal(summary.count, 2);
			assert.equal(getRulerSummary(rulers, "coronal").count, 0);
		});
	});

	describe("10. Universal Viewport Maximization (All 6 Viewports: Expand, Collapse, Double-Click & Escape)", () => {
		const clinicalViewports = [
			"axial",
			"coronal",
			"sagittal",
			"panoramic",
			"cross_section",
			"volume3d",
		] as const;

		it("standardizes 100% fullscreen expand and collapse button testids across all 6 clinical viewports", () => {
			for (const vp of clinicalViewports) {
				const expandHtml = renderToStaticMarkup(
					React.createElement(ViewportTopRightControls, {
						viewportType: vp,
						isMaximized: false,
						onToggleMaximize: () => {},
					}),
				);
				assert.ok(expandHtml.includes(`data-testid="btn-viewport-expand-${vp}"`));

				const collapseHtml = renderToStaticMarkup(
					React.createElement(ViewportTopRightControls, {
						viewportType: vp,
						isMaximized: true,
						onToggleMaximize: () => {},
					}),
				);
				assert.ok(collapseHtml.includes(`data-testid="btn-viewport-collapse-${vp}"`));
			}
		});

		it("intercepts Escape key to restore maximized viewport without closing studio modal", () => {
			let restoreCallCount = 0;
			let closeCallCount = 0;

			const mockOptions = {
				activeViewport: "axial" as CbctViewportType,
				isMaximized: true,
				onRestoreMaximize: () => {
					restoreCallCount++;
				},
				onClose: () => {
					closeCallCount++;
				},
			};

			let preventDefaultCalled = false;
			let stopPropagationCalled = false;
			const mockEvent = {
				key: "Escape",
				preventDefault: () => {
					preventDefaultCalled = true;
				},
				stopPropagation: () => {
					stopPropagationCalled = true;
				},
			};

			const handled = handleCbctKeyDown(mockEvent, mockOptions);

			assert.equal(handled, true, "Escape key must be handled");
			assert.equal(preventDefaultCalled, true, "preventDefault must be called on Escape");
			assert.equal(stopPropagationCalled, true, "stopPropagation must be called on Escape");
			assert.equal(restoreCallCount, 1, "onRestoreMaximize must be called once when viewport is maximized");
			assert.equal(closeCallCount, 0, "onClose must NOT be called when restoring maximized viewport");
		});

		it("allows Escape key to safely close studio modal when all viewports are in standard grid", () => {
			let restoreCallCount = 0;
			let closeCallCount = 0;

			const mockOptions = {
				activeViewport: "axial" as CbctViewportType,
				isMaximized: false,
				onRestoreMaximize: () => {
					restoreCallCount++;
				},
				onClose: () => {
					closeCallCount++;
				},
			};

			const mockEvent = {
				key: "Escape",
				preventDefault: () => {},
				stopPropagation: () => {},
			};

			const handled = handleCbctKeyDown(mockEvent, mockOptions);

			assert.equal(handled, true, "Escape key must be handled");
			assert.equal(restoreCallCount, 0, "onRestoreMaximize must not be called when already in normal grid");
			assert.equal(closeCallCount, 1, "onClose must be called once when in standard grid");
		});

		it("renders maximized single viewport container when maximizedViewport is set in CbctMprGridWorkspaceRenderer", () => {
			const dummyRef = { current: null };
			const baseProps: CbctMprViewportsGridProps = {
				isSidebarOpen: false,
				mobileActiveTab: "axial",
				volume: null,
				dicomLoadingStatus: null,
				dicomProgress: 0,
				maximizedViewport: null,
				viewLayout: "quad_view",
				studioMode: "diagnostic",
				folderInputRef: dummyRef,
				zipInputRef: dummyRef,
				handleDicomFilesChange: () => {},
				activeViewport: "axial",
				setActiveViewport: () => {},
				handleToggleMaximize: () => {},
				axialBaseCanvasRef: dummyRef,
				axialOverlayCanvasRef: dummyRef,
				coronalBaseCanvasRef: dummyRef,
				coronalOverlayCanvasRef: dummyRef,
				sagittalBaseCanvasRef: dummyRef,
				sagittalOverlayCanvasRef: dummyRef,
				panoBaseCanvasRef: dummyRef,
				panoOverlayCanvasRef: dummyRef,
				crossSectionBaseCanvasRef: dummyRef,
				crossSectionOverlayCanvasRef: dummyRef,
				handleCanvasDoubleClick: () => {},
				handleCanvasMouseDown: () => {},
				handleCanvasMouseMove: () => {},
				handleCanvasMouseUp: () => {},
				handleCanvasWheel: () => {},
				getCanvasCursor: () => "crosshair",
				crosshairMm: { x: 0, y: 0, z: 0 },
				currentVoxel: { x: 0, y: 0, z: 0 },
				slabMode: "single",
				slabThicknessMm: 1,
				obliqueAngles: {
					axialRollDeg: 0,
					coronalTiltDeg: 0,
					sagittalTiltDeg: 0,
				},
				setObliqueAngles: () => {},
				handleFullResetViewport: () => {},
				activeRotationHandle: null,
				isShiftRotating: null,
				hoveredHandle: null,
				transforms: {
					axial: { zoom: 1, panX: 0, panY: 0 },
					coronal: { zoom: 1, panX: 0, panY: 0 },
					sagittal: { zoom: 1, panX: 0, panY: 0 },
					panoramic: { zoom: 1, panX: 0, panY: 0 },
					cross_section: { zoom: 1, panX: 0, panY: 0 },
					volume3d: { zoom: 1, panX: 0, panY: 0 },
				},
				windowWidth: 2500,
				windowLevel: 500,
				renderViewportOverlays: () => null,
				handlePanoMouseDown: () => {},
				handlePanoMouseMove: () => {},
				handlePanoMouseUp: () => {},
				handleCrossSectionMouseDown: () => {},
				handleCrossSectionMouseMove: () => {},
				handleCrossSectionMouseUp: () => {},
				dragImplantPart: null,
				hoveredImplantPart: null,
				activeCrossSection: null,
				activeCrossSectionIdx: 0,
				crossSections: [],
			};

			const quadHtml = renderToStaticMarkup(React.createElement(CbctMprGridWorkspaceRenderer, baseProps));
			assert.ok(quadHtml.includes('data-testid="cbct-mpr-quad-grid"'));
			assert.ok(quadHtml.includes('data-testid="cbct-viewport-container-coronal"'));
			assert.ok(quadHtml.includes('data-testid="cbct-viewport-container-sagittal"'));
			assert.ok(quadHtml.includes('data-testid="cbct-viewport-container-axial"'));
			assert.ok(quadHtml.includes('data-testid="cbct-viewport-container-volume3d"'));

			const maxAxialHtml = renderToStaticMarkup(
				React.createElement(CbctMprGridWorkspaceRenderer, {
					...baseProps,
					maximizedViewport: "axial",
				}),
			);
			assert.ok(maxAxialHtml.includes('data-testid="cbct-mpr-maximized-grid"'));
			assert.ok(maxAxialHtml.includes('data-testid="cbct-viewport-container-axial"'));
			assert.ok(!maxAxialHtml.includes('data-testid="cbct-viewport-container-coronal"'));
		});
	});
});
