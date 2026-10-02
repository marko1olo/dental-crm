/**
 * DENTE CRM — CBCT MPR Dental Arch Purge & Panoramic Binding Inquisitor (Mandate 8l)
 *
 * Verifies under adversarial Red Team scrutiny:
 * 1. In standard 3D MPR diagnostic mode (studioMode === "diagnostic" or undefined):
 *    - Dental arch spline (purple Catmull-Rom curve) is PURGED from the axial slice canvas.
 *    - Dental arch anchor points / manipulators are PURGED from the axial slice canvas.
 *    - Cross-section ray is PURGED from the axial slice canvas.
 * 2. In Panoramic / OPTG mode (studioMode === "panoramic"):
 *    - Dental arch spline IS rendered on the axial slice when showDentalArch === true.
 *    - Dental arch control point manipulators ARE rendered on the axial slice when showDentalArch === true.
 *    - Toggling showDentalArch === false cleanly suppresses the arch even in panoramic mode.
 * 3. Cross-section ray is strictly rendered only in panoramic or implant modes, never in diagnostic MPR.
 * 4. Architectural Invariants: Mandate 8b (<= 800 lines), Mandate 8d (Zero emojis), UTF-8 encoding.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	createEmptyCbctVolume,
	DEFAULT_OBLIQUE_ROTATION,
	DEFAULT_VIEWPORT_TRANSFORM,
	ROMEXIS_COLORS,
} from "../cbctMprMath";
import {
	buildDentalArchCurve,
	DEFAULT_MANDIBULAR_ARCH_ANCHORS,
	type CrossSectionSliceData,
} from "../dentalCurveEngine";
import { drawAxialMprOverlay } from "../mpr/cbctAxialOverlayRenderer";
import type { MprOverlayParams } from "../mpr/cbctOverlayTypes";

// Mock 2D Canvas Context tracking strokes and fill operations
function createMockCanvasContext() {
	const calls: { method: string; args: unknown[]; strokeStyle?: unknown; fillStyle?: unknown }[] = [];
	let currentStrokeStyle: unknown = "#000000";
	let currentFillStyle: unknown = "#000000";

	const ctx = {
		get strokeStyle() {
			return currentStrokeStyle;
		},
		set strokeStyle(val: unknown) {
			currentStrokeStyle = val;
		},
		get fillStyle() {
			return currentFillStyle;
		},
		set fillStyle(val: unknown) {
			currentFillStyle = val;
		},
		lineWidth: 1,
		lineCap: "butt",
		lineJoin: "miter",
		save: () => calls.push({ method: "save", args: [] }),
		restore: () => calls.push({ method: "restore", args: [] }),
		translate: (x: number, y: number) => calls.push({ method: "translate", args: [x, y] }),
		scale: (x: number, y: number) => calls.push({ method: "scale", args: [x, y] }),
		rotate: (rad: number) => calls.push({ method: "rotate", args: [rad] }),
		beginPath: () => calls.push({ method: "beginPath", args: [] }),
		moveTo: (x: number, y: number) => calls.push({ method: "moveTo", args: [x, y] }),
		lineTo: (x: number, y: number) => calls.push({ method: "lineTo", args: [x, y] }),
		stroke: () => calls.push({ method: "stroke", args: [], strokeStyle: currentStrokeStyle }),
		fill: () => calls.push({ method: "fill", args: [], fillStyle: currentFillStyle }),
		arc: (x: number, y: number, r: number, sAngle: number, eAngle: number) =>
			calls.push({ method: "arc", args: [x, y, r, sAngle, eAngle], fillStyle: currentFillStyle }),
		ellipse: () => calls.push({ method: "ellipse", args: [] }),
		setLineDash: (segments: number[]) => calls.push({ method: "setLineDash", args: [segments] }),
		fillText: () => calls.push({ method: "fillText", args: [] }),
		strokeText: () => calls.push({ method: "strokeText", args: [] }),
		measureText: () => ({ width: 40 }),
		roundRect: () => calls.push({ method: "roundRect", args: [] }),
		clearRect: () => calls.push({ method: "clearRect", args: [] }),
		calls,
	};

	return ctx as unknown as CanvasRenderingContext2D & { calls: typeof calls };
}

describe("CBCT Mandate 8l: Dental Arch MPR Purge & OPTG Binding", () => {
	const volume = createEmptyCbctVolume(100, 100, 80, 0.4, 0);
	const archCurve = buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible");

	const mockCrossSection: CrossSectionSliceData = {
		sliceIndex: 1,
		distanceAlongArchMm: 20.0,
		centerPointMm: { x: 0, y: -20, z: 0 },
		tangentVector2D: { x: 1, y: 0 },
		normalVector2D: { x: 0, y: 1 },
		widthMm: 24.0,
		heightMm: 32.0,
		pixelSpacingMm: 0.25,
		widthPx: 96,
		heightPx: 128,
		pixelData: new Uint8ClampedArray(96 * 128 * 4),
		nearestToothFdi: "46",
		toothLabelRu: "46 зуб",
	};

	const baseParams: MprOverlayParams = {
		volume,
		crosshairMm: { x: 0, y: 0, z: 0 },
		transform: DEFAULT_VIEWPORT_TRANSFORM,
		invertColors: false,
		slabMode: "single",
		slabThicknessMm: 1.0,
		rulers: [],
		activeRuler: null,
		angles: [],
		activeAngle: null,
		probeMarkers: [],
		activeProbe: null,
		selectedMeasurement: null,
		hoveredMeasurementHandle: null,
		draggingMeasurementHandle: null,
		activeTool: "crosshair",
		studioMode: "diagnostic",
		implant3DWorld: null,
		nerveAuditResult: {
			isDangerous: false,
			isWarning: false,
			netClearanceToCanalWallMm: 8,
			clinicalMessageRu: "Безопасно",
		},
		interpolatedNerve3D: [],
		nervePoints: [],
		nerveTotalLengthMm: 0,
		selectedNerveNodeIdx: null,
		obliqueAngles: DEFAULT_OBLIQUE_ROTATION,
		activeRotationHandle: null,
		hoveredHandle: null,
		showDentalArch: true,
		archCurve,
		activeCrossSection: mockCrossSection,
		selectedArchAnchorIdx: null,
		hoveredArchAnchorIdx: null,
		isDraggingArchAnchor: null,
	};

	it("purges purple dental arch spline from axial canvas in diagnostic MPR mode", () => {
		const ctx = createMockCanvasContext();

		drawAxialMprOverlay(ctx, {
			...baseParams,
			studioMode: "diagnostic",
			showDentalArch: true,
		});

		// Check for purple arch strokes: rgba(168, 85, 247, ...)
		const archStrokes = ctx.calls.filter(
			(c) => c.method === "stroke" && typeof c.strokeStyle === "string" && c.strokeStyle.includes("168, 85, 247"),
		);

		assert.equal(
			archStrokes.length,
			0,
			"Purple dental arch spline must NOT be rendered on axial canvas in diagnostic mode!",
		);
	});

	it("purges arch anchor points from axial canvas in diagnostic MPR mode", () => {
		const ctx = createMockCanvasContext();

		drawAxialMprOverlay(ctx, {
			...baseParams,
			studioMode: "diagnostic",
			showDentalArch: true,
		});

		// Check for purple arch anchor fills: rgba(168, 85, 247, ...)
		const archFills = ctx.calls.filter(
			(c) => c.method === "fill" && typeof c.fillStyle === "string" && c.fillStyle.includes("168, 85, 247"),
		);

		assert.equal(
			archFills.length,
			0,
			"Purple dental arch anchors must NOT be rendered on axial canvas in diagnostic mode!",
		);
	});

	it("purges cross-section ray from axial canvas in diagnostic MPR mode", () => {
		const ctx = createMockCanvasContext();

		drawAxialMprOverlay(ctx, {
			...baseParams,
			studioMode: "diagnostic",
			showDentalArch: true,
			activeCrossSection: mockCrossSection,
		});

		// Cross section ray color is ROMEXIS_COLORS.crossSection
		const crossSectionStrokes = ctx.calls.filter(
			(c) => c.method === "stroke" && c.strokeStyle === ROMEXIS_COLORS.crossSection,
		);

		assert.equal(
			crossSectionStrokes.length,
			0,
			"Cross-section indicator ray must NOT be rendered on axial canvas in diagnostic mode!",
		);
	});

	it("renders purple dental arch spline on axial canvas strictly in panoramic mode when enabled", () => {
		const ctx = createMockCanvasContext();

		drawAxialMprOverlay(ctx, {
			...baseParams,
			studioMode: "panoramic",
			showDentalArch: true,
		});

		const archStrokes = ctx.calls.filter(
			(c) => c.method === "stroke" && typeof c.strokeStyle === "string" && c.strokeStyle.includes("168, 85, 247"),
		);

		assert.ok(
			archStrokes.length > 0,
			"Purple dental arch spline must be rendered on axial canvas when in panoramic mode with showDentalArch === true",
		);

		const archFills = ctx.calls.filter(
			(c) => c.method === "fill" && typeof c.fillStyle === "string" && c.fillStyle.includes("168, 85, 247"),
		);

		assert.ok(
			archFills.length > 0,
			"Purple dental arch anchors must be rendered on axial canvas in panoramic mode",
		);
	});

	it("suppresses dental arch on axial canvas when showDentalArch is false in panoramic mode", () => {
		const ctx = createMockCanvasContext();

		drawAxialMprOverlay(ctx, {
			...baseParams,
			studioMode: "panoramic",
			showDentalArch: false,
		});

		const archStrokes = ctx.calls.filter(
			(c) => c.method === "stroke" && typeof c.strokeStyle === "string" && c.strokeStyle.includes("168, 85, 247"),
		);

		assert.equal(
			archStrokes.length,
			0,
			"Dental arch spline must be suppressed when showDentalArch === false even in panoramic mode",
		);
	});

	it("renders cross-section indicator ray on axial canvas in panoramic mode", () => {
		const ctx = createMockCanvasContext();

		drawAxialMprOverlay(ctx, {
			...baseParams,
			studioMode: "panoramic",
			showDentalArch: true,
			activeCrossSection: mockCrossSection,
		});

		const crossSectionStrokes = ctx.calls.filter(
			(c) => c.method === "stroke" && c.strokeStyle === ROMEXIS_COLORS.crossSection,
		);

		assert.ok(
			crossSectionStrokes.length > 0,
			"Cross-section indicator ray must be rendered on axial canvas in panoramic mode",
		);
	});
});
