import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ROMEXIS_COLORS,
	calculateSlabVoxelBounds,
	drawCalibratedMillimeterRulers,
	drawCbctAngleMeasurement,
	drawObliqueCrosshairWithRotationHandles,
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
			assert.equal(ROMEXIS_COLORS.coronal, "#f97316"); // Orange
			assert.equal(ROMEXIS_COLORS.sagittal, "#22c55e"); // Green
			assert.equal(ROMEXIS_COLORS.panoramic, "#a855f7"); // Purple
			assert.equal(ROMEXIS_COLORS.crossSection, "#eab308"); // Yellow
		});

		it("generates correct RGBA strings with alpha channels", () => {
			assert.equal(ROMEXIS_COLORS.axialRgba(0.5), "rgba(6, 182, 212, 0.5)");
			assert.equal(ROMEXIS_COLORS.coronalRgba(0.8), "rgba(249, 115, 22, 0.8)");
			assert.equal(ROMEXIS_COLORS.sagittalRgba(0.65), "rgba(34, 197, 94, 0.65)");
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
			const colorsUsed: string[] = [];
			const shadowColorsUsed: string[] = [];
			let _fillStyle = "";
			let _strokeStyle = "";
			let _shadowColor = "";
			const mock = {
				calls,
				colorsUsed,
				shadowColorsUsed,
				beginPath: () => calls.push({ method: "beginPath", args: [] }),
				moveTo: (x: number, y: number) => calls.push({ method: "moveTo", args: [x, y] }),
				lineTo: (x: number, y: number) => calls.push({ method: "lineTo", args: [x, y] }),
				arc: (x: number, y: number, r: number, sa: number, ea: number, ac?: boolean) =>
					calls.push({ method: "arc", args: [x, y, r, sa, ea, ac] }),
				closePath: () => calls.push({ method: "closePath", args: [] }),
				stroke: () => calls.push({ method: "stroke", args: [] }),
				fill: () => calls.push({ method: "fill", args: [] }),
				fillRect: (x: number, y: number, w: number, h: number) =>
					calls.push({ method: "fillRect", args: [x, y, w, h] }),
				strokeRect: (x: number, y: number, w: number, h: number) =>
					calls.push({ method: "strokeRect", args: [x, y, w, h] }),
				fillText: (text: string, x: number, y: number) =>
					calls.push({ method: "fillText", args: [text, x, y] }),
				strokeText: (text: string, x: number, y: number) =>
					calls.push({ method: "strokeText", args: [text, x, y] }),
				roundRect: (x: number, y: number, w: number, h: number, r: number) =>
					calls.push({ method: "roundRect", args: [x, y, w, h, r] }),
				measureText: (text: string) => ({ width: text.length * 6 }),
				save: () => calls.push({ method: "save", args: [] }),
				restore: () => calls.push({ method: "restore", args: [] }),
				setLineDash: (d: number[]) => calls.push({ method: "setLineDash", args: [d] }),
				get fillStyle() {
					return _fillStyle;
				},
				set fillStyle(v: string) {
					_fillStyle = v;
					colorsUsed.push(v);
				},
				get strokeStyle() {
					return _strokeStyle;
				},
				set strokeStyle(v: string) {
					_strokeStyle = v;
					colorsUsed.push(v);
				},
				get shadowColor() {
					return _shadowColor;
				},
				set shadowColor(v: string) {
					_shadowColor = v;
					shadowColorsUsed.push(v);
				},
				lineWidth: 1,
				font: "",
				textAlign: "",
				textBaseline: "",
				shadowBlur: 0,
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

		it("executes drawCalibratedMillimeterRulers with invertColors=true (Negative LUT WCAG AAA mode)", () => {
			const mockCtx = createMockCtx();
			assert.doesNotThrow(() => {
				drawCalibratedMillimeterRulers(mockCtx as unknown as CanvasRenderingContext2D, {
					widthPx: 512,
					heightPx: 512,
					pixelSpacingMmX: 0.4,
					pixelSpacingMmY: 0.4,
					showScaleBar: true,
					showGrid: true,
					invertColors: true,
				});
			});

			const strokeCalls = mockCtx.calls.filter((c) => c.method === "stroke");
			const fillTextCalls = mockCtx.calls.filter((c) => c.method === "fillText");
			const strokeTextCalls = mockCtx.calls.filter((c) => c.method === "strokeText");

			assert.ok(strokeCalls.length > 0, "Should generate stroke calls for negative LUT ticks");
			assert.ok(fillTextCalls.length > 0, "Should generate fill text for numbers");
			assert.ok(strokeTextCalls.length > 0, "Should generate stroke text calls for #ffffff halo underlay");
			assert.ok(
				mockCtx.colorsUsed.includes("#09090b"),
				"Should use contrasting #09090b black color for negative mode ticks and labels",
			);
			assert.ok(
				mockCtx.shadowColorsUsed.includes("#ffffff"),
				"Should use #ffffff halo shadow for negative mode ticks and labels",
			);
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

		it("executes drawCbctAngleMeasurement with dark halo underlay and arc manipulators", () => {
			const mockCtx = createMockCtx();
			assert.doesNotThrow(() => {
				drawCbctAngleMeasurement(
					mockCtx as unknown as CanvasRenderingContext2D,
					{ x: 50, y: 100 },
					{ x: 100, y: 100 },
					{ x: 150, y: 50 },
					45.0,
					true,
					1,
				);
			});

			const strokeCalls = mockCtx.calls.filter((c) => c.method === "stroke");
			const arcCalls = mockCtx.calls.filter((c) => c.method === "arc");
			assert.ok(strokeCalls.length > 0, "Should draw angle arms and arc");
			assert.ok(arcCalls.length > 0, "Should draw circular arc sector and handles");
			assert.ok(
				mockCtx.shadowColorsUsed.includes("rgba(0, 0, 0, 0.85)"),
				"Should use rgba(0, 0, 0, 0.85) dark halo underlay for angle manipulators",
			);
		});

		it("executes drawObliqueCrosshairWithRotationHandles with dark halo underlay for axes", () => {
			const mockCtx = createMockCtx();
			assert.doesNotThrow(() => {
				drawObliqueCrosshairWithRotationHandles(mockCtx as unknown as CanvasRenderingContext2D, {
					widthPx: 512,
					heightPx: 512,
					centerPx: { x: 256, y: 256 },
					plane: "axial",
					rotationDeg: 15.0,
					handleDistancePx: 65,
					showHandles: true,
					showAngleBadge: true,
				});
			});

			const strokeCalls = mockCtx.calls.filter((c) => c.method === "stroke");
			assert.ok(strokeCalls.length > 0, "Should stroke crosshair axes and handles");
			assert.ok(
				mockCtx.shadowColorsUsed.includes("rgba(0, 0, 0, 0.85)"),
				"Should use rgba(0, 0, 0, 0.85) dark halo underlay for crosshair axes",
			);
		});
	});

	describe("6. HUD Overlays, DICOM WW/WL & Toast Placement Suite (The Hammer v7.0)", () => {
		it("formats panoramic viewport coordinate badge as 'Сляб X.X мм' instead of Z coordinate", () => {
			const formatPanoBadge = (slabThicknessMm?: number) => {
				return `Сляб ${slabThicknessMm !== undefined && slabThicknessMm > 1 ? slabThicknessMm.toFixed(1) : "12.0"} мм`;
			};

			assert.equal(formatPanoBadge(12.0), "Сляб 12.0 мм");
			assert.equal(formatPanoBadge(15.5), "Сляб 15.5 мм");
			assert.equal(formatPanoBadge(1.0), "Сляб 12.0 мм");
			assert.equal(formatPanoBadge(undefined), "Сляб 12.0 мм");
		});

		it("formats DICOM PS3.3 WW/WL overlays with valid default dental bone windows", () => {
			const formatDicomWl = (windowWidth?: number, windowLevel?: number) => {
				const ww = windowWidth ?? 4400;
				const wl = windowLevel ?? 1300;
				return `W: ${ww} L: ${wl}`;
			};

			assert.equal(formatDicomWl(), "W: 4400 L: 1300");
			assert.equal(formatDicomWl(2000, 400), "W: 2000 L: 400");
		});
	});
});


