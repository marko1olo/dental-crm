import type {
	ViewerPoint2D,
	ViewerRulerMeasurement,
	ViewerCurvedMeasurement,
	ViewerAreaMeasurement,
} from "../dentalViewerMath.js";
import {
	drawRuler,
	drawCurvedCanal,
	drawLesionContour,
} from "../dentalViewerCanvasDraw.js";

export interface RenderMeasurementsOptions {
	readonly ctx: CanvasRenderingContext2D;
	readonly measurements: readonly ViewerRulerMeasurement[];
	readonly draftStart: ViewerPoint2D | null;
	readonly draftCurrent: ViewerPoint2D | null;
	readonly curvedCanals: readonly ViewerCurvedMeasurement[];
	readonly draftCurvedPoints: readonly ViewerPoint2D[];
	readonly lesionContours: readonly ViewerAreaMeasurement[];
	readonly draftLesionPoints: readonly ViewerPoint2D[];
	readonly draftRulerMm?: number | undefined;
	readonly draftCanalMm?: number | undefined;
	readonly draftLesionMm2?: number | undefined;
}

/**
 * Draws all calibrated clinical straight rulers, curved root canals (WL),
 * and periapical lesion contours onto the viewport canvas context.
 */
export function renderMeasurementsOverlay(options: RenderMeasurementsOptions): void {
	const {
		ctx,
		measurements,
		draftStart,
		draftCurrent,
		curvedCanals,
		draftCurvedPoints,
		lesionContours,
		draftLesionPoints,
		draftRulerMm,
		draftCanalMm,
		draftLesionMm2,
	} = options;

	// 1. Draw completed straight rulers
	for (const r of measurements) {
		drawRuler(ctx, { x: r.startX, y: r.startY }, { x: r.endX, y: r.endY }, r.label || `${r.lengthMm.toFixed(1)} мм`);
	}

	// 2. Draw draft straight ruler in progress
	if (draftStart && draftCurrent && draftRulerMm !== undefined) {
		drawRuler(ctx, draftStart, draftCurrent, `${draftRulerMm.toFixed(1)} мм`, "#f59e0b");
	}

	// 3. Draw completed curved canals (WL)
	for (const canal of curvedCanals) {
		drawCurvedCanal(ctx, canal.points, canal.totalLengthMm, canal.label, canal.color);
	}

	// 4. Draw draft curved canal in progress
	if (draftCurvedPoints.length > 0 && draftCanalMm !== undefined) {
		drawCurvedCanal(ctx, draftCurvedPoints, draftCanalMm, `WL: ${draftCanalMm.toFixed(1)} мм (в процессе)`, "#f59e0b", true);
	}

	// 5. Draw completed periapical lesion contours
	for (const lesion of lesionContours) {
		drawLesionContour(ctx, lesion.points, lesion.areaMm2, lesion.perimeterMm, lesion.label, lesion.color);
	}

	// 6. Draw draft lesion contour in progress
	if (draftLesionPoints.length > 0 && draftLesionMm2 !== undefined) {
		drawLesionContour(
			ctx,
			draftLesionPoints,
			draftLesionMm2,
			undefined,
			draftLesionMm2 > 0 ? `Очаг: ${draftLesionMm2.toFixed(1)} мм²` : "Очаг...",
			"#f59e0b",
			true,
		);
	}
}
