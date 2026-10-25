/**
 * VisiographImageSpatialFilters.ts
 * Emboss 45°, High-Boost 13.0, and sensor chamfer corner cut spatial transforms.
 */

export function applyEmboss45ToImageData(imageData: ImageData): void {
	const { width, height, data } = imageData;
	const copy = new Uint8ClampedArray(data);

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
			const idxML = (yOffset + xPrev) << 2;
			const idxMR = (yOffset + xNext) << 2;
			const idxBC = (yNext + x) << 2;
			const idxBR = (yNext + xNext) << 2;

			for (let c = 0; c < 3; c++) {
				const tl = copy[idxTL + c] ?? 0;
				const tc = copy[idxTC + c] ?? 0;
				const ml = copy[idxML + c] ?? 0;
				const mr = copy[idxMR + c] ?? 0;
				const bc = copy[idxBC + c] ?? 0;
				const br = copy[idxBR + c] ?? 0;
				const gradient = -2 * tl - tc - ml + mr + bc + 2 * br;
				const embossed = 128 + gradient * 0.4;
				data[idx + c] = Math.max(0, Math.min(255, Math.round(embossed)));
			}
		}
	}
}

export function applyHighBoostToImageData(imageData: ImageData): void {
	const { width, height, data } = imageData;
	const copy = new Uint8ClampedArray(data);

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
				const tc = copy[idxTC + c] ?? 0;
				const bc = copy[idxBC + c] ?? 0;
				const ml = copy[idxML + c] ?? 0;
				const mr = copy[idxMR + c] ?? 0;
				const tl = copy[idxTL + c] ?? 0;
				const tr = copy[idxTR + c] ?? 0;
				const bl = copy[idxBL + c] ?? 0;
				const br = copy[idxBR + c] ?? 0;
				const val =
					13.0 * center -
					2.0 * (tc + bc + ml + mr) -
					1.0 * (tl + tr + bl + br);
				data[idx + c] = Math.max(0, Math.min(255, Math.round(val)));
			}
		}
	}
}

export function applyChamferCornerCutToImageData(
	imageData: ImageData,
	chamferPx = 65,
): void {
	const { width, height, data } = imageData;
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			if (x + (height - 1 - y) < chamferPx) {
				const idx = (y * width + x) << 2;
				data[idx] = 0;
				data[idx + 1] = 0;
				data[idx + 2] = 0;
				data[idx + 3] = 255;
			}
		}
	}
}
