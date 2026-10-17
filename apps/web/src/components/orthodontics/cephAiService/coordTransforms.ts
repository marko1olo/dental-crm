import type { LandmarkKey, LandmarkMap, Point2D } from "../cephalometricMath";

export function mapImageLandmarksToViewBox(
	rawPoints: LandmarkMap,
	imageWidth: number,
	imageHeight: number,
	viewBoxWidth = 800,
	viewBoxHeight = 700,
): LandmarkMap {
	if (!imageWidth || !imageHeight || imageWidth <= 0 || imageHeight <= 0) return { ...rawPoints };
	const scale = Math.min(viewBoxWidth / imageWidth, viewBoxHeight / imageHeight);
	if (scale <= 0) return { ...rawPoints };

	const offsetX = (viewBoxWidth - imageWidth * scale) / 2;
	const offsetY = (viewBoxHeight - imageHeight * scale) / 2;
	const mapped: LandmarkMap = {};

	for (const key of Object.keys(rawPoints) as LandmarkKey[]) {
		const pt = rawPoints[key];
		if (pt) {
			mapped[key] = {
				x: Math.round((offsetX + pt.x * scale) * 10) / 10,
				y: Math.round((offsetY + pt.y * scale) * 10) / 10,
			};
		}
	}
	return mapped;
}

export function mapViewBoxLandmarksToImage(
	viewBoxPoints: LandmarkMap,
	imageWidth: number,
	imageHeight: number,
	viewBoxWidth = 800,
	viewBoxHeight = 700,
): LandmarkMap {
	if (!imageWidth || !imageHeight || imageWidth <= 0 || imageHeight <= 0) return { ...viewBoxPoints };
	const scale = Math.min(viewBoxWidth / imageWidth, viewBoxHeight / imageHeight);
	if (scale <= 0) return { ...viewBoxPoints };

	const offsetX = (viewBoxWidth - imageWidth * scale) / 2;
	const offsetY = (viewBoxHeight - imageHeight * scale) / 2;
	const mapped: LandmarkMap = {};

	for (const key of Object.keys(viewBoxPoints) as LandmarkKey[]) {
		const pt = viewBoxPoints[key];
		if (pt) {
			mapped[key] = {
				x: Math.round(((pt.x - offsetX) / scale) * 10) / 10,
				y: Math.round(((pt.y - offsetY) / scale) * 10) / 10,
			};
		}
	}
	return mapped;
}

export function decodeHeatmaps(
	heatmaps: Float32Array,
	numChannels = 29,
	heatmapHeight = 192,
	heatmapWidth = 192,
	stride = 4,
	targetWidth = 768,
	targetHeight = 768,
): Array<{ x: number; y: number; confidence: number }> {
	const results: Array<{ x: number; y: number; confidence: number }> = [];
	const planeSize = heatmapHeight * heatmapWidth;

	for (let c = 0; c < numChannels; c++) {
		const offset = c * planeSize;
		let maxVal = -Infinity;
		let maxIdx = 0;

		for (let i = 0; i < planeSize; i++) {
			const val = heatmaps[offset + i]!;
			if (val > maxVal) {
				maxVal = val;
				maxIdx = i;
			}
		}

		const peakY = Math.floor(maxIdx / heatmapWidth);
		const peakX = maxIdx % heatmapWidth;
		const finalX = ((peakX * stride) / 768) * targetWidth;
		const finalY = ((peakY * stride) / 768) * targetHeight;

		results.push({
			x: Math.round(finalX * 10) / 10,
			y: Math.round(finalY * 10) / 10,
			confidence: Math.round(Math.min(1.0, Math.max(0, maxVal)) * 1000) / 1000,
		});
	}
	return results;
}
