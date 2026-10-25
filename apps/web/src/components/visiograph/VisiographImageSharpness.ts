/**
 * VisiographImageSharpness.ts
 * Adaptive Unsharp Mask convolution kernel with Noise Coring for edge enhancement.
 */

export function applyUnsharpMaskToImageData(
	imageData: ImageData,
	sharpness: number,
	coringThreshold = 5,
): void {
	if (sharpness <= 0) return;
	const { width, height, data } = imageData;
	const copy = new Uint8ClampedArray(data);
	const weight = (Math.max(0, Math.min(100, sharpness)) / 100.0) * 1.6;

	for (let y = 0; y < height; y++) {
		const yOffset = y * width;
		const yPrev = Math.max(0, y - 1) * width;
		const yNext = Math.min(height - 1, y + 1) * width;

		for (let x = 0; x < width; x++) {
			const xPrev = Math.max(0, x - 1);
			const xNext = Math.min(width - 1, x + 1);

			const idx = (yOffset + x) << 2;
			const idxTL = (yPrev + xPrev) << 2;
			const idxTC = (yPrev + x) << 2;
			const idxTR = (yPrev + xNext) << 2;
			const idxML = (yOffset + xPrev) << 2;
			const idxMR = (yOffset + xNext) << 2;
			const idxBL = (yNext + xPrev) << 2;
			const idxBC = (yNext + x) << 2;
			const idxBR = (yNext + xNext) << 2;

			for (let c = 0; c < 3; c++) {
				const center = copy[idx + c] ?? 0;
				const avgNeighbors =
					((copy[idxTL + c] ?? 0) +
						(copy[idxTC + c] ?? 0) +
						(copy[idxTR + c] ?? 0) +
						(copy[idxML + c] ?? 0) +
						(copy[idxMR + c] ?? 0) +
						(copy[idxBL + c] ?? 0) +
						(copy[idxBC + c] ?? 0) +
						(copy[idxBR + c] ?? 0)) *
					0.125;

				const diff = center - avgNeighbors;
				if (Math.abs(diff) > coringThreshold) {
					const coredDiff = Math.sign(diff) * (Math.abs(diff) - coringThreshold);
					const val = center + weight * coredDiff;
					data[idx + c] = Math.max(0, Math.min(255, Math.round(val)));
				} else {
					data[idx + c] = center;
				}
			}
		}
	}
}
