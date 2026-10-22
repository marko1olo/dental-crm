/**
 * panoramicTypes.ts — типы, структуры данных и рендеринг пикселей для панорамного окна DICOM.
 * Mandate 8b: Модульность, строго < 120 строк.
 */

import type { Point2D } from "../../../utils/math/mprMath";
import {
	huToGrayscale,
	type VisiographWindowPreset,
} from "../../visiograph/VisiographWindowPresets";

export interface PanoramicVolumeInput {
	scalarData: Float32Array | Uint16Array;
	dimensions: [number, number, number];
	origin: [number, number, number];
	direction: Float32Array; // 16-element mat4 layout
	spacing: [number, number, number];
}

export interface PanoramicRendererWindowProps {
	/** Curve control points in the axial world plane (from SplineROITool or anatomical auto-tracer). */
	splinePoints: Point2D[];
	/**
	 * Volume slab to unwrap. When null the pipeline is not yet ready (volume
	 * still decoding) and the window shows a loading state instead of rendering.
	 */
	volume: PanoramicVolumeInput | null;
	onClose: () => void;
	thickness?: number | undefined;
	blendMode?: "mip" | "average" | undefined;
	/** World-space Z extent of the unwrap. Defaults derived from the volume. */
	zStartWorld?: number | undefined;
	zEndWorld?: number | undefined;
	zStepWorld?: number | undefined;
	patientId?: string | null | undefined;
	authHeaders?: Record<string, string> | undefined;
}

/**
 * Paints a Float32 HU panorama or cross-section slice into the canvas via windowed grayscale ramp.
 */
export function paintHuPixelsToCanvas(
	canvas: HTMLCanvasElement,
	width: number,
	height: number,
	pixels: Float32Array,
	preset: VisiographWindowPreset,
): void {
	const ctx = canvas.getContext("2d");
	if (!ctx) return;
	canvas.width = width;
	canvas.height = height;

	const { windowWidth, windowCenter } = preset;
	const img = ctx.createImageData(width, height);
	const rgba = img.data;

	for (let i = 0; i < pixels.length; i++) {
		const v = pixels[i] ?? 0;
		const g = huToGrayscale(v, windowWidth, windowCenter);
		const o = i * 4;
		rgba[o] = g;
		rgba[o + 1] = g;
		rgba[o + 2] = g;
		rgba[o + 3] = 255;
	}
	ctx.putImageData(img, 0, 0);
}
