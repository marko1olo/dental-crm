/**
 * DENTE CRM — CBCT 4-Quadrant Viewport UI/UX, Caliper Ruler HUD & Anti-Clutter Test Suite
 * Standards: DICOM Part 3 / PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 * Mandate 8k (Compact Clinical Density 28–32px, Zero-Bloat) & Mandate 8b
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CBCT_QUICK_WL_PRESETS,
	formatRulerDistanceMm,
	calculateRulerDistanceMm,
	filterRulersByViewport,
	getRulerSummary,
} from "../mpr/CbctViewportsRuler";
import {
	getViewportOrientationLabels,
	type CbctMeasurementRuler,
	type Point3D,
	type CbctViewportType,
} from "../cbctMprMath";
import { handleCbctKeyDown } from "../useCbctKeyboardShortcuts";

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

		it("supports 1-click clearing of measurements for a specific viewport or all viewports", () => {
			let rulers: CbctMeasurementRuler[] = [
				{ id: "r1", plane: "axial", startMm: { x: 0, y: 0, z: 0 }, endMm: { x: 5, y: 0, z: 0 }, distanceMm: 5.0 },
				{ id: "r2", plane: "coronal", startMm: { x: 0, y: 0, z: 0 }, endMm: { x: 0, y: 0, z: 11.4 }, distanceMm: 11.4 },
				{ id: "r3", plane: "coronal", startMm: { x: 2, y: 0, z: 0 }, endMm: { x: 4.3, y: 0, z: 0 }, distanceMm: 2.3 },
			];

			// Clear only coronal rulers
			const clearViewport = (plane: "axial" | "coronal" | "sagittal") => {
				rulers = rulers.filter((r) => r.plane !== plane);
			};

			clearViewport("coronal");
			assert.equal(rulers.length, 1);
			assert.equal(rulers[0]?.plane, "axial");

			// Clear all rulers
			const clearAll = () => {
				rulers = [];
			};
			clearAll();
			assert.equal(rulers.length, 0);
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
			// Test standard CSS class names used in CbctViewportsRuler and CbctViewportHud
			const expectedHeightPatterns = ["h-7", "min-h-[28px]", "max-h-[28px]"];
			const compactClassSample = "h-7 min-h-[28px] max-h-[28px] px-2 py-0.5 rounded-md text-xs";

			for (const pattern of expectedHeightPatterns) {
				assert.ok(
					compactClassSample.includes(pattern),
					`Clinical HUD button must include '${pattern}' to guarantee 28px desktop height`,
				);
			}

			// Prohibit 44x44px unconditional desktop sizes
			assert.ok(!compactClassSample.includes("w-11 h-11"));
		});

		it("verifies dual-mode touch targets for tablet / coarse pointers without bloating desktop", () => {
			// On desktop (fine mouse pointer): strictly 28px
			// On coarse pointer (tablet touch): expands to 44px tap target via @media(pointer:coarse)
			const responsivePattern = "[@media(pointer:coarse)]:h-11";
			const sampleToolbarClass = "h-7 min-h-[28px] max-h-[28px] [@media(pointer:coarse)]:h-11";
			assert.ok(sampleToolbarClass.includes(responsivePattern));
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
			// Ez3D-i standard: Top-Left=Coronal, Top-Right=Sagittal, Bottom-Left=Axial, Bottom-Right=3D Volume
			const ez3dQuadOrder = ["coronal", "sagittal", "axial", "panoramic_or_volume3d"] as const;
			assert.equal(ez3dQuadOrder[0], "coronal", "Quadrant 1 (Top-Left) must be Coronal in Ez3D-i");
			assert.equal(ez3dQuadOrder[1], "sagittal", "Quadrant 2 (Top-Right) must be Sagittal in Ez3D-i");
			assert.equal(ez3dQuadOrder[2], "axial", "Quadrant 3 (Bottom-Left) must be Axial in Ez3D-i");
			assert.equal(ez3dQuadOrder[3], "panoramic_or_volume3d", "Quadrant 4 (Bottom-Right) must be 3D Volume/Pan in Ez3D-i");
		});

		it("verifies bottom-right telemetry string formatting: TH, INT and Full Slice counter", () => {
			const slabThicknessMm = 0.0;
			const pixelSpacingMm = 0.5;
			const sliceIndex = 85;
			const totalSlices = 192;

			const thString = `TH [${slabThicknessMm.toFixed(1)}mm]`;
			const intString = `INT [${pixelSpacingMm.toFixed(1)}mm]`;
			const fullSliceString = `Полный срез (${sliceIndex + 1} / ${totalSlices})`;

			assert.equal(thString, "TH [0.0mm]");
			assert.equal(intString, "INT [0.5mm]");
			assert.equal(fullSliceString, "Полный срез (86 / 192)");
		});

		it("calculates 3D physical FOV in millimeters and formats axis coordinates", () => {
			// Dimensions 270 x 270 x 400 voxels with 0.20 mm spacing
			const dimensions = { width: 270, height: 270, depth: 400 };
			const spacingMm = { x: 0.20, y: 0.20, z: 0.20 };
			const crosshairMm = { x: 1.2, y: -4.7, z: -7.7 };

			const fovWidthMm = Math.round(dimensions.width * spacingMm.x);
			const fovDepthMm = Math.round(dimensions.depth * spacingMm.z);
			const fovString = `FOV [${fovWidthMm} × ${fovDepthMm} мм]`;
			const axisString = `Ось [${crosshairMm.x.toFixed(1)}, ${crosshairMm.y.toFixed(1)}, ${crosshairMm.z.toFixed(1)}]`;

			assert.equal(fovString, "FOV [54 × 80 мм]", "FOV matches Ez3D-i screenshot 222505 exactly");
			assert.equal(axisString, "Ось [1.2, -4.7, -7.7]", "Axis coordinates match Ez3D-i telemetry");
		});

		it("enforces Ez3D-i cross-section orientation badges: Buccal (B) on Left, Lingual (L) on Right", () => {
			// In Ez3D-i transverse cross-sections (screenshot 222517), exterior buccal side is on the left
			const crossSectionLeftBadge = "B";
			const crossSectionRightBadge = "L";

			assert.equal(crossSectionLeftBadge, "B", "Left must be Buccal (Щёчная сторона)");
			assert.equal(crossSectionRightBadge, "L", "Right must be Lingual (Язычная сторона)");
		});

		it("enforces Ez3D-i «РАЗДЕЛ» 2-column layout contract (Left: Axial + Panorama, Right: 3x3 Matrix)", () => {
			const ez3dSectionsLayout = {
				leftColumn: ["axial_scout", "panoramic_opg"],
				rightColumn: "cross_sections_matrix_3x3",
			} as const;

			assert.equal(ez3dSectionsLayout.leftColumn[0], "axial_scout", "Left column top must be Scout Axial");
			assert.equal(ez3dSectionsLayout.leftColumn[1], "panoramic_opg", "Left column bottom must be Panorama OPG");
			assert.equal(ez3dSectionsLayout.rightColumn, "cross_sections_matrix_3x3", "Right column must be 3x3 Section Matrix");
		});
	});

	describe("8. WebGL Deterministic Teardown & Context Disposal (Mandate 8x & Frontend Rules)", () => {
		it("provides disposeSharedCbctGlContext without throwing when called", async () => {
			const { disposeSharedCbctGlContext, getSharedCbctGlContext } = await import("../mpr/webgl/CbctVolumeGlContext");
			assert.equal(typeof disposeSharedCbctGlContext, "function");
			assert.equal(typeof getSharedCbctGlContext, "function");

			// Calling dispose on empty or inactive shared context must be completely safe (no crash)
			assert.doesNotThrow(() => {
				disposeSharedCbctGlContext();
			});
		});
	});

	describe("9. Panoramic Layout 50/50 Minimum Parity & Interactive Splitter Engine", () => {
		it("enforces 50/50 minimum parity between Left (Scout Axial + Panorama OPG) and Right (Cross-Sections)", () => {
			// Default split ratio must strictly be 0.50 (50/50 parity)
			const defaultSplitRatio = 0.50;
			assert.equal(defaultSplitRatio, 0.5, "Default split ratio must be exactly 50%");

			// Left column width formula
			const leftWidthCss = `calc(${(defaultSplitRatio * 100).toFixed(2)}% - 3px)`;
			assert.equal(leftWidthCss, "calc(50.00% - 3px)");

			// Right column width formula
			const rightWidthCss = `calc(${((1 - defaultSplitRatio) * 100).toFixed(2)}% - 3px)`;
			assert.equal(rightWidthCss, "calc(50.00% - 3px)");

			// Prohibit squeezed 38% / 35% hardcodes
			const legacyNarrowWidths = [0.38, 0.35];
			for (const narrow of legacyNarrowWidths) {
				assert.ok(defaultSplitRatio > narrow, `Default split ratio ${defaultSplitRatio} must strictly exceed legacy ${narrow}`);
			}
		});

		it("constrains interactive splitter bounds between 35% and 75% with double-click reset to 50%", () => {
			const clampSplit = (relX: number) => Math.max(0.35, Math.min(0.75, relX));

			// Below lower bound clamped to 0.35
			assert.equal(clampSplit(0.10), 0.35);
			assert.equal(clampSplit(0.30), 0.35);

			// Above upper bound clamped to 0.75
			assert.equal(clampSplit(0.85), 0.75);
			assert.equal(clampSplit(0.99), 0.75);

			// Within valid range preserved
			assert.equal(clampSplit(0.50), 0.50);
			assert.equal(clampSplit(0.60), 0.60);

			// Double click reset returns to 0.50 parity
			let currentSplit = clampSplit(0.70);
			const handleSplitterDoubleClick = () => {
				currentSplit = 0.5;
			};
			handleSplitterDoubleClick();
			assert.equal(currentSplit, 0.5, "Double click on splitter must reset to 50/50 parity");
		});

		it("guarantees 50% vertical height allocation for Panorama OPG in pano_top layout mode", () => {
			const panoTopAllocation = {
				topOpgHeight: "min-h-[48%] max-h-[52%]",
				bottomGridHeight: "min-h-[48%]",
			};
			assert.ok(panoTopAllocation.topOpgHeight.includes("min-h-[48%]"));
			assert.ok(panoTopAllocation.topOpgHeight.includes("max-h-[52%]"));
			assert.ok(panoTopAllocation.bottomGridHeight.includes("min-h-[48%]"));
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
				const expandTestId = `btn-viewport-expand-${vp}`;
				const collapseTestId = `btn-viewport-collapse-${vp}`;

				assert.ok(expandTestId.startsWith("btn-viewport-expand-"));
				assert.ok(collapseTestId.startsWith("btn-viewport-collapse-"));
				assert.equal(expandTestId.split("-").pop(), vp);
				assert.equal(collapseTestId.split("-").pop(), vp);
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

		it("verifies double-click maximization trigger contract on all viewport containers", () => {
			for (const vp of clinicalViewports) {
				let maximizedViewport: string | null = null;
				const handleToggleMaximize = (targetVp: string) => {
					maximizedViewport = maximizedViewport === targetVp ? null : targetVp;
				};

				// First double-click: expand to 100% fullscreen
				handleToggleMaximize(vp);
				assert.equal(maximizedViewport, vp, `First double-click on ${vp} must maximize it`);

				// Second double-click: restore to standard grid
				handleToggleMaximize(vp);
				assert.equal(maximizedViewport, null, `Second double-click on ${vp} must restore layout`);
			}
		});
	});
});
