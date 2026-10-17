import {
	EMBOSS_SHADOW_KERNEL_3X3,
	MAX_RES_KERNEL_3X3,
	SHARPEN_KERNEL_3X3,
	SMOOTH_KERNEL_3X3,
	apply2DConvolutionFilter,
	buildDicomTonalLUT,
	type DicomViewportState,
} from "../rvgViewerEngine.js";
import {
	isLowSpecHardware,
	isHostUnderHeavyLoad,
	getAdaptiveDicomDownscaleFactor,
} from "../../../utils/deviceDetection.js";

export function updateDicomFilteredBuffer(
	img: HTMLImageElement | null,
	filteredCanvas: HTMLCanvasElement | null,
	viewportState: DicomViewportState,
): HTMLCanvasElement | null {
	if (!img || img.width === 0 || img.height === 0) return null;

	let offscreen = filteredCanvas;
	if (!offscreen) {
		offscreen = document.createElement("canvas");
	}

	const isLowSpec = isLowSpecHardware();
	const isHeavyLoad = isHostUnderHeavyLoad();
	const downscaleFactor = getAdaptiveDicomDownscaleFactor();
	let targetWidth = img.width;
	let targetHeight = img.height;
	const maxDimension = isHeavyLoad ? 768 : isLowSpec ? 1024 : 2048;
	const effectiveMax = Math.round(maxDimension * downscaleFactor);

	if (targetWidth > effectiveMax || targetHeight > effectiveMax) {
		const scale = effectiveMax / Math.max(targetWidth, targetHeight);
		targetWidth = Math.max(1, Math.round(targetWidth * scale));
		targetHeight = Math.max(1, Math.round(targetHeight * scale));
	}

	offscreen.width = targetWidth;
	offscreen.height = targetHeight;
	const offCtx = offscreen.getContext("2d");
	if (!offCtx) return offscreen;

	offCtx.imageSmoothingEnabled = true;
	offCtx.imageSmoothingQuality = isLowSpec || isHeavyLoad ? "low" : "high";
	offCtx.drawImage(img, 0, 0, targetWidth, targetHeight);

	try {
		const imgData = offCtx.getImageData(0, 0, targetWidth, targetHeight);
		const lut = buildDicomTonalLUT({
			windowWidth: viewportState.windowWidth,
			windowCenter: viewportState.windowCenter,
			invert: viewportState.invert,
			gamma: viewportState.gamma,
		});

		for (let i = 0; i < imgData.data.length; i += 4) {
			imgData.data[i] = lut[imgData.data[i]!]!;
			imgData.data[i + 1] = lut[imgData.data[i + 1]!]!;
			imgData.data[i + 2] = lut[imgData.data[i + 2]!]!;
		}

		const isWithinLimit = targetWidth <= 2600 && targetHeight <= 2600;
		if (!isLowSpec && isWithinLimit) {
			if ((viewportState as any).smooth) {
				imgData.data.set(apply2DConvolutionFilter(imgData.data, targetWidth, targetHeight, SMOOTH_KERNEL_3X3));
			}
			if ((viewportState as any).maxRes) {
				imgData.data.set(apply2DConvolutionFilter(imgData.data, targetWidth, targetHeight, MAX_RES_KERNEL_3X3));
			}
			if (viewportState.sharpen > 0) {
				imgData.data.set(apply2DConvolutionFilter(imgData.data, targetWidth, targetHeight, SHARPEN_KERNEL_3X3));
			} else if (viewportState.emboss) {
				imgData.data.set(apply2DConvolutionFilter(imgData.data, targetWidth, targetHeight, EMBOSS_SHADOW_KERNEL_3X3, 128));
			}
		}

		offCtx.putImageData(imgData, 0, 0);
	} catch {
		// Fallback retains clean drawImage
	}

	return offscreen;
}
