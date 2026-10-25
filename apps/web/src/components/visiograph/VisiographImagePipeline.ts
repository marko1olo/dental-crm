/**
 * VisiographImagePipeline.ts
 * Radiological image processing pipeline with Canvas 2D and CSS filter fallback.
 */

import { type VisiographImageParams, DEFAULT_VISIOGRAPH_IMAGE_PARAMS, buildVisiographLUT } from "./VisiographImageLUT";
import { applyUnsharpMaskToImageData } from "./VisiographImageSharpness";
import {
	applyChamferCornerCutToImageData,
	applyEmboss45ToImageData,
	applyHighBoostToImageData,
} from "./VisiographImageSpatialFilters";

export function processVisiographImageData(
	imageData: ImageData,
	params: VisiographImageParams,
): void {
	if (params.cutCornerChamfer) applyChamferCornerCutToImageData(imageData);
	if (params.pseudoRelief) {
		applyEmboss45ToImageData(imageData);
	} else if (params.maxSharpness) {
		applyHighBoostToImageData(imageData);
	} else if (params.sharpness > 0) {
		applyUnsharpMaskToImageData(imageData, params.sharpness);
	}

	const lut = buildVisiographLUT(params);
	const data = imageData.data;
	const len = data.length;
	for (let i = 0; i < len; i += 4) {
		const r = data[i] ?? 0;
		const g = data[i + 1] ?? 0;
		const b = data[i + 2] ?? 0;
		data[i] = lut[r] ?? r;
		data[i + 1] = lut[g] ?? g;
		data[i + 2] = lut[b] ?? b;
	}
}

export class VisiographImageProcessor {
	public render(
		source: HTMLImageElement | HTMLCanvasElement,
		targetCanvas: HTMLCanvasElement,
		params: VisiographImageParams = DEFAULT_VISIOGRAPH_IMAGE_PARAMS,
	): void {
		const srcWidth = "naturalWidth" in source ? source.naturalWidth || source.width : source.width;
		const srcHeight = "naturalHeight" in source ? source.naturalHeight || source.height : source.height;
		if (!srcWidth || !srcHeight) return;

		targetCanvas.width = srcWidth;
		targetCanvas.height = srcHeight;
		const targetCtx = targetCanvas.getContext("2d", { willReadFrequently: true });
		if (!targetCtx) return;

		targetCtx.drawImage(source, 0, 0, srcWidth, srcHeight);
		const isNeutral =
			params.brightness === 0 &&
			params.contrast === 0 &&
			params.gamma === 1.0 &&
			params.sharpness === 0 &&
			!params.invert &&
			!params.maxSharpness &&
			!params.pseudoRelief &&
			!params.cutCornerChamfer;

		if (isNeutral) return;

		try {
			const imgData = targetCtx.getImageData(0, 0, srcWidth, srcHeight);
			processVisiographImageData(imgData, params);
			targetCtx.putImageData(imgData, 0, 0);
		} catch {
			this.applyCssFilterFallback(targetCanvas, targetCtx, source, params);
		}
	}

	private applyCssFilterFallback(
		targetCanvas: HTMLCanvasElement,
		targetCtx: CanvasRenderingContext2D,
		source: HTMLImageElement | HTMLCanvasElement,
		params: VisiographImageParams,
	): void {
		const filters: string[] = [];
		if (params.brightness !== 0) filters.push(`brightness(${100 + params.brightness}%)`);
		if (params.contrast !== 0) filters.push(`contrast(${100 + params.contrast}%)`);
		if (params.invert) filters.push("invert(100%)");

		targetCtx.save();
		targetCtx.filter = filters.length > 0 ? filters.join(" ") : "none";
		targetCtx.drawImage(source, 0, 0, targetCanvas.width, targetCanvas.height);
		targetCtx.restore();
	}
}
