import { useCallback } from "react";
import {
	apply2DSpatialConvolution,
	UNSHARP_MASK_KERNEL_3X3,
	HIGH_BOOST_KERNEL_3X3,
	EMBOSS_45_KERNEL_3X3,
} from "../../dentalViewerMath.js";
import type { RadiologyQuickFilterState } from "../../RadiologyQuickFiltersPanel.js";

export function useSensorViewerFilterBuffer(
	rawImageRef: React.RefObject<HTMLImageElement | null>,
	filteredCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>,
	filters: RadiologyQuickFilterState,
	brightnessPct: number,
	contrastPct: number,
) {
	const updateFilteredBuffer = useCallback(() => {
		const img = rawImageRef.current;
		if (!img || img.width === 0 || img.height === 0) return;

		let offscreen = filteredCanvasRef.current;
		if (!offscreen) {
			offscreen = document.createElement("canvas");
			filteredCanvasRef.current = offscreen;
		}

		offscreen.width = img.width;
		offscreen.height = img.height;
		const offCtx = offscreen.getContext("2d");
		if (!offCtx) return;

		offCtx.drawImage(img, 0, 0);

		const hasActiveFilter =
			filters.sharpness ||
			filters.maxSharpness ||
			filters.invert ||
			filters.pseudoRelief ||
			brightnessPct !== 0 ||
			contrastPct !== 0;

		if (!hasActiveFilter) return;

		try {
			const imgData = offCtx.getImageData(0, 0, img.width, img.height);
			let pixels: Uint8ClampedArray = imgData.data;

			if (brightnessPct !== 0 || contrastPct !== 0) {
				const bFactor = (brightnessPct + 100) / 100;
				const cFactor = (contrastPct + 100) / 100;
				for (let i = 0; i < pixels.length; i += 4) {
					pixels[i] = Math.min(255, Math.max(0, Math.round(((pixels[i]! - 128) * cFactor + 128) * bFactor)));
					pixels[i + 1] = Math.min(255, Math.max(0, Math.round(((pixels[i + 1]! - 128) * cFactor + 128) * bFactor)));
					pixels[i + 2] = Math.min(255, Math.max(0, Math.round(((pixels[i + 2]! - 128) * cFactor + 128) * bFactor)));
				}
			}

			const isWithinLimit = img.width <= 2600 && img.height <= 2600;
			if (filters.maxSharpness && isWithinLimit) {
				pixels = apply2DSpatialConvolution(pixels, img.width, img.height, HIGH_BOOST_KERNEL_3X3);
			} else if (filters.sharpness && isWithinLimit) {
				pixels = apply2DSpatialConvolution(pixels, img.width, img.height, UNSHARP_MASK_KERNEL_3X3);
			} else if (filters.pseudoRelief && isWithinLimit) {
				pixels = apply2DSpatialConvolution(pixels, img.width, img.height, EMBOSS_45_KERNEL_3X3, 128);
			}

			if (filters.invert) {
				for (let i = 0; i < pixels.length; i += 4) {
					pixels[i] = 255 - pixels[i]!;
					pixels[i + 1] = 255 - pixels[i + 1]!;
					pixels[i + 2] = 255 - pixels[i + 2]!;
				}
			}

			imgData.data.set(pixels);
			offCtx.putImageData(imgData, 0, 0);
		} catch {
			// Fallback keeps raw image
		}
	}, [rawImageRef, filteredCanvasRef, filters, brightnessPct, contrastPct]);

	return { updateFilteredBuffer };
}
