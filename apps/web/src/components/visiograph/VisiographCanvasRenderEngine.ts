/**
 * VisiographCanvasRenderEngine.ts
 * Radiological offscreen cache & canvas rendering routines (Mandates 8b, 8e).
 */

import { disposeWebGlRenderingContext } from "@dental/shared";
import type { VisiographImageParams, VisiographImageProcessor } from "./VisiographImageProcessor";
import { renderMeasurementsOverlay } from "./VisiographLegalWatermark";
import { drawInteractiveOverlay, type ActiveVisiographToolType } from "./VisiographInteractiveOverlay";
import type { CalibrationReference, RulerMeasurement, AngleMeasurement, PeriapicalLesion, Point2D } from "./VisiographMeasurementMath";

export function areParamsEqual(a: VisiographImageParams | null, b: VisiographImageParams): boolean {
	if (!a) return false;
	return (
		a.brightness === b.brightness &&
		a.contrast === b.contrast &&
		a.gamma === b.gamma &&
		a.sharpness === b.sharpness &&
		a.invert === b.invert &&
		a.windowWidth === b.windowWidth &&
		a.windowCenter === b.windowCenter
	);
}

export function cleanupCanvasBackingStore(
	canvas: HTMLCanvasElement | null,
	offscreen: HTMLCanvasElement | null,
	img: HTMLImageElement | null,
): void {
	if (canvas) {
		try {
			const gl = canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
			if (gl) disposeWebGlRenderingContext(gl);
		} catch { /* Canvas already disposed */ }
		canvas.width = 0;
		canvas.height = 0;
	}
	if (offscreen) {
		try {
			const offGl = offscreen.getContext("webgl2") || offscreen.getContext("webgl") || offscreen.getContext("experimental-webgl");
			if (offGl) disposeWebGlRenderingContext(offGl);
		} catch { /* Offscreen already disposed */ }
		offscreen.width = 0;
		offscreen.height = 0;
	}
	if (img) {
		img.onload = null;
		img.src = "";
	}
}

export interface RenderVisiographFrameOptions {
	canvas: HTMLCanvasElement;
	offscreen: HTMLCanvasElement | null;
	img: HTMLImageElement;
	processor: VisiographImageProcessor;
	params: VisiographImageParams;
	rulers: RulerMeasurement[];
	angles: AngleMeasurement[];
	lesions: PeriapicalLesion[];
	calibration: CalibrationReference;
	isCalibrated: boolean;
	activeTool: ActiveVisiographToolType;
	drawingPoints: Point2D[];
	hoverPos: Point2D | null;
}

export function renderVisiographFrame(opts: RenderVisiographFrameOptions): void {
	const { canvas, offscreen, img, processor, params, rulers, angles, lesions, calibration, isCalibrated, activeTool, drawingPoints, hoverPos } = opts;
	if (!offscreen) {
		processor.render(img, canvas, params);
	} else {
		if (canvas.width !== offscreen.width || canvas.height !== offscreen.height) {
			canvas.width = offscreen.width;
			canvas.height = offscreen.height;
		}
		const ctx = canvas.getContext("2d", { willReadFrequently: true });
		if (!ctx) return;
		ctx.drawImage(offscreen, 0, 0);
	}

	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) return;

	renderMeasurementsOverlay(ctx, { rulers, angles, lesions, calibration: isCalibrated ? calibration : undefined });
	drawInteractiveOverlay(ctx, { activeTool, drawingPoints, hoverPos, calibration });
}
