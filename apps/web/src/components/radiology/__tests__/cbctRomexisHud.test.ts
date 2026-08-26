import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ROMEXIS_COLORS,
	calculateSlabVoxelBounds,
	drawCalibratedMillimeterRulers,
	drawRomexisSlabCorridor,
	getViewportOrientationLabels,
} from "../cbctMprMath";
import {
	buildDentalArchCurve,
	DEFAULT_MANDIBULAR_ARCH_ANCHORS,
	getFocalTroughBoundaryCurves,
} from "../dentalCurveEngine";

describe("Planmeca Romexis 6.x & Vatech Ez3D-i 4-Viewport Calibration & HUD Suite", () => {
	describe("1. Standard Romexis Color System & Translucency Helpers", () => {
		it("provides standard Romexis 6.x color hex codes", () => {
			assert.equal(ROMEXIS_COLORS.axial, "#06b6d4"); // Cyan
			assert.equal(ROMEXIS_COLORS.coronal, "#f59e0b"); // Orange / Amber
			assert.equal(ROMEXIS_COLORS.sagittal, "#10b981"); // Emerald Green
			assert.equal(ROMEXIS_COLORS.panoramic, "#a855f7"); // Purple
			assert.equal(ROMEXIS_COLORS.crossSection, "#eab308"); // Yellow
		});

		it("generates correct RGBA strings with alpha channels", () => {
			assert.equal(ROMEXIS_COLORS.axialRgba(0.5), "rgba(6, 182, 212, 0.5)");
			assert.equal(ROMEXIS_COLORS.coronalRgba(0.8), "rgba(245, 158, 11, 0.8)");
			assert.equal(ROMEXIS_COLORS.sagittalRgba(0.65), "rgba(16, 185, 129, 0.65)");
			assert.equal(ROMEXIS_COLORS.panoramicRgba(0.2), "rgba(168, 85, 247, 0.2)");
			assert.equal(ROMEXIS_COLORS.crossSectionRgba(0.9), "rgba(234, 179, 8, 0.9)");
		});
	});

	describe("2. Radiological Invariant Orientation Badges (R on Screen-Left)", () => {
		it("enforces strict radiological rule for Axial viewport (R on Left, L on Right, A on Top, P on Bottom)", () => {
			const labels = getViewportOrientationLabels("axial");
			assert.equal(labels.left, "R");
			assert.ok(labels.leftTooltipRu.includes("Правая сторона пациента"));
			assert.equal(labels.right, "L");
			assert.ok(labels.rightTooltipRu.includes("Левая сторона пациента"));
			assert.equal(labels.top, "A");
			assert.ok(labels.topTooltipRu.includes("Anterior"));
			assert.equal(labels.bottom, "P");
			assert.ok(labels.bottomTooltipRu.includes("Posterior"));
			assert.equal(labels.planeColor, ROMEXIS_COLORS.axial);
		});

		it("enforces strict radiological rule for Coronal viewport (R on Left, L on Right, S on Top, I on Bottom)", () => {
			const labels = getViewportOrientationLabels("coronal");
			assert.equal(labels.left, "R");
			assert.equal(labels.right, "L");
			assert.equal(labels.top, "S");
			assert.ok(labels.topTooltipRu.includes("Superior"));
			assert.equal(labels.bottom, "I");
			assert.ok(labels.bottomTooltipRu.includes("Inferior"));
			assert.equal(labels.planeColor, ROMEXIS_COLORS.coronal);
		});

		it("enforces standard orientation for Sagittal viewport (A on Left, P on Right, S on Top, I on Bottom)", () => {
			const labels = getViewportOrientationLabels("sagittal");
			assert.equal(labels.left, "A");
			assert.equal(labels.right, "P");
			assert.equal(labels.top, "S");
			assert.equal(labels.bottom, "I");
			assert.equal(labels.planeColor, ROMEXIS_COLORS.sagittal);
		});

		it("enforces standard orientation for Panoramic viewport (R on Left, L on Right, S on Top, I on Bottom)", () => {
			const labels = getViewportOrientationLabels("panoramic");
			assert.equal(labels.left, "R");
			assert.equal(labels.right, "L");
			assert.equal(labels.top, "S");
			assert.equal(labels.bottom, "I");
			assert.equal(labels.planeColor, ROMEXIS_COLORS.panoramic);
		});

		it("enforces anatomical orientation for Dental Cross-Section (B on Left, L on Right, S on Top, I on Bottom)", () => {
			const labels = getViewportOrientationLabels("cross_section");
			assert.equal(labels.left, "B");
			assert.ok(labels.leftTooltipRu.includes("Вестибулярно"));
			assert.equal(labels.right, "L");
			assert.ok(labels.rightTooltipRu.includes("Язычно"));
			assert.equal(labels.top, "S");
			assert.ok(labels.topTooltipRu.includes("Вершина альвеолярного гребня"));
			assert.equal(labels.bottom, "I");
			assert.ok(labels.bottomTooltipRu.includes("Базальная кость"));
			assert.equal(labels.planeColor, ROMEXIS_COLORS.crossSection);
		});
	});

	describe("3. Slab MIP Bounding Corridor Math", () => {
		it("returns single slice bounds when slabThickness <= voxelSpacing", () => {
			const bounds = calculateSlabVoxelBounds(50, 0.4, 0.4, 100);
			assert.equal(bounds.startVoxel, 50);
			assert.equal(bounds.endVoxel, 50);
			assert.equal(bounds.halfSlabVoxels, 0);
		});

		it("calculates symmetric voxel span for MIP slab thickness", () => {
			// 10mm slab with 0.4mm spacing = 25 voxels total (half = 12)
			const bounds = calculateSlabVoxelBounds(50, 10.0, 0.4, 100);
			assert.equal(bounds.startVoxel, 38);
			assert.equal(bounds.endVoxel, 62);
			assert.equal(bounds.halfSlabVoxels, 12);
		});

		it("clamps voxel span at volume boundaries", () => {
			const bounds = calculateSlabVoxelBounds(2, 10.0, 0.4, 100);
			assert.equal(bounds.startVoxel, 0); // Clamped at 0
			assert.equal(bounds.endVoxel, 14);
			assert.equal(bounds.halfSlabVoxels, 12);
		});
	});

	describe("4. Focal Trough Normal-Offset Boundary Splines", () => {
		it("calculates equidistant inner and outer boundaries for dental arch spline", () => {
			const archCurve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible", 10.0);
			const { innerBoundary, outerBoundary } = getFocalTroughBoundaryCurves(archCurve.splinePointsMm, 10.0);

			assert.equal(innerBoundary.length, archCurve.splinePointsMm.length);
			assert.equal(outerBoundary.length, archCurve.splinePointsMm.length);

			// Test midpoint offset distance: half thickness = 5.0 mm
			const midIdx = Math.floor(archCurve.splinePointsMm.length / 2);
			const origPt = archCurve.splinePointsMm[midIdx]!;
			const innerPt = innerBoundary[midIdx]!;
			const outerPt = outerBoundary[midIdx]!;

			const distInner = Math.hypot(innerPt.x - origPt.x, innerPt.y - origPt.y);
			const distOuter = Math.hypot(outerPt.x - origPt.x, outerPt.y - origPt.y);

			assert.ok(Math.abs(distInner - 5.0) < 1e-3);
			assert.ok(Math.abs(distOuter - 5.0) < 1e-3);

			// Total width between inner and outer should equal full thickness (10.0 mm)
			const totalWidth = Math.hypot(outerPt.x - innerPt.x, outerPt.y - innerPt.y);
			assert.ok(Math.abs(totalWidth - 10.0) < 1e-3);
		});
	});

	describe("5. Calibrated Millimeter Rulers Canvas Engine (Zero-GC)", () => {
		interface MockCall {
			method: string;
			args: unknown[];
		}

		const createMockCtx = () => {
			const calls: MockCall[] = [];
			const mock = {
				calls,
				beginPath: () => calls.push({ method: "beginPath", args: [] }),
				moveTo: (x: number, y: number) => calls.push({ method: "moveTo", args: [x, y] }),
				lineTo: (x: number, y: number) => calls.push({ method: "lineTo", args: [x, y] }),
				stroke: () => calls.push({ method: "stroke", args: [] }),
				fillRect: (x: number, y: number, w: number, h: number) => calls.push({ method: "fillRect", args: [x, y, w, h] }),
				strokeRect: (x: number, y: number, w: number, h: number) => calls.push({ method: "strokeRect", args: [x, y, w, h] }),
				fillText: (text: string, x: number, y: number) => calls.push({ method: "fillText", args: [text, x, y] }),
				save: () => calls.push({ method: "save", args: [] }),
				restore: () => calls.push({ method: "restore", args: [] }),
				setLineDash: (d: number[]) => calls.push({ method: "setLineDash", args: [d] }),
				fillStyle: "",
				strokeStyle: "",
				lineWidth: 1,
				font: "",
				textAlign: "",
			};
			return mock;
		};

		it("executes drawCalibratedMillimeterRulers without throwing and draws ticks and scale bar", () => {
			const mockCtx = createMockCtx();
			assert.doesNotThrow(() => {
				drawCalibratedMillimeterRulers(mockCtx as unknown as CanvasRenderingContext2D, {
					widthPx: 512,
					heightPx: 512,
					pixelSpacingMmX: 0.4,
					pixelSpacingMmY: 0.4,
					showScaleBar: true,
					showGrid: true,
				});
			});

			const strokeCalls = mockCtx.calls.filter((c) => c.method === "stroke");
			const fillTextCalls = mockCtx.calls.filter((c) => c.method === "fillText");
			assert.ok(strokeCalls.length > 0, "Should generate stroke calls for ruler ticks");
			assert.ok(fillTextCalls.length > 0, "Should generate text labels for 10mm increments");
		});

		it("executes drawRomexisSlabCorridor and draws dashed bounds and fill", () => {
			const mockCtx = createMockCtx();
			assert.doesNotThrow(() => {
				drawRomexisSlabCorridor(mockCtx as unknown as CanvasRenderingContext2D, {
					orientation: "horizontal",
					centerPx: 256,
					thicknessMm: 10.0,
					pixelSpacingMm: 0.4,
					lengthPx: 512,
					colorRgba: ROMEXIS_COLORS.axialRgba(0.6),
					fillColorRgba: ROMEXIS_COLORS.axialRgba(0.08),
				});
			});

			const fillRectCalls = mockCtx.calls.filter((c) => c.method === "fillRect");
			assert.equal(fillRectCalls.length, 1, "Should draw slab corridor background fill");
		});
	});
});
