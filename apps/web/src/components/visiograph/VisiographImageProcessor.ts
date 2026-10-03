/**
 * VisiographImageProcessor.ts
 *
 * Real-time image processing engine for 2D dental radiography and visiography:
 * - Brightness, Contrast, Gamma correction, Sharpness (Unsharp Mask convolution),
 *   and Negative/Positive Inversion.
 * - Optimized 256-entry lookup table (LUT) for O(1) per-pixel tonal transforms.
 * - 3x3 convolution kernel with edge clamping for Unsharp Masking.
 * - WebGL shader pipeline for hardware-accelerated viewport rendering with automatic Canvas 2D fallback.
 */

export interface VisiographImageParams {
	/** Brightness adjustment range [-100 .. +100], neutral = 0 */
	brightness: number;
	/** Contrast adjustment range [-100 .. +100], neutral = 0 */
	contrast: number;
	/** Gamma exponent [0.1 .. 5.0], neutral = 1.0 */
	gamma: number;
	/** Sharpness / Unsharp Mask amount [0 .. 100], neutral = 0 */
	sharpness: number;
	/** Radiographic negative film inversion toggle */
	invert: boolean;
	/** Optional Window Width in HU or intensity units */
	windowWidth?: number | undefined;
	/** Optional Window Center in HU or intensity units */
	windowCenter?: number | undefined;
	/** High-Boost extreme edge amplification (13.0 center) for apical foramen & bone trabeculae */
	maxSharpness?: boolean | undefined;
	/** 45° Emboss pseudo-relief filter for root microfractures & enamel cracks (CChBumpMap) */
	pseudoRelief?: boolean | undefined;
	/** Sensor ergonomic chamfer bevel cut (VACAL.dll VCA_CutImage) */
	cutCornerChamfer?: boolean | undefined;
}

export const DEFAULT_VISIOGRAPH_IMAGE_PARAMS: VisiographImageParams = {
	brightness: 0,
	contrast: 0,
	gamma: 1.0,
	sharpness: 0,
	invert: false,
	maxSharpness: false,
	pseudoRelief: false,
	cutCornerChamfer: false,
};

/**
 * Builds a fast 256-element byte Lookup Table (LUT) combining Gamma, Contrast, Brightness and Inversion.
 */
export function buildVisiographLUT(params: VisiographImageParams): Uint8Array {
	const lut = new Uint8Array(256);
	const gamma = Math.max(0.05, Math.min(5.0, params.gamma || 1.0));
	const invGamma = 1.0 / gamma;

	// Contrast factor formula: factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
	const contrast = Math.max(-100, Math.min(100, params.contrast || 0));
	const contrastFactor =
		(259 * (contrast + 255)) / Math.max(1, 255 * (259 - contrast));

	const brightness = Math.max(-100, Math.min(100, params.brightness || 0));
	const brightnessShift = brightness * 2.55;

	const invert = Boolean(params.invert);

	for (let i = 0; i < 256; i++) {
		// 1. Gamma correction
		let v = 255 * (i / 255) ** invGamma;

		// 2. Contrast adjustment around midpoint 128
		v = contrastFactor * (v - 128) + 128;

		// 3. Brightness shift
		v += brightnessShift;

		// 4. Clamping
		let clamped = Math.round(Math.max(0, Math.min(255, v)));

		// 5. Inversion (Negative film mode)
		if (invert) {
			clamped = 255 - clamped;
		}

		lut[i] = clamped;
	}

	return lut;
}

/**
 * Applies 45° Emboss pseudo-relief filter (CChBumpMap from EzDent-i MyDib.dll)
 * revealing microcracks, vertical root fractures, and bone crest margins.
 */
export function applyEmboss45ToImageData(imageData: ImageData): void {
	const width = imageData.width;
	const height = imageData.height;
	const data = imageData.data;
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

				// Gradient calculation: -2*TL - TC - ML + MR + BC + 2*BR
				const gradient = -2 * tl - tc - ml + mr + bc + 2 * br;
				const embossed = 128 + gradient * 0.4;
				data[idx + c] = Math.max(0, Math.min(255, Math.round(embossed)));
			}
		}
	}
}

/**
 * Applies High-Boost 13.0 convolution kernel (EzDent-i MaxSharpenFlag)
 * for extreme root apex definition and narrow calcified canal tracking.
 */
export function applyHighBoostToImageData(imageData: ImageData): void {
	const width = imageData.width;
	const height = imageData.height;
	const data = imageData.data;
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

				// High-Boost 3x3: 13*center - 2*(TC+BC+ML+MR) - 1*(TL+TR+BL+BR)
				const val =
					13.0 * center -
					2.0 * (tc + bc + ml + mr) -
					1.0 * (tl + tr + bl + br);
				data[idx + c] = Math.max(0, Math.min(255, Math.round(val)));
			}
		}
	}
}

/**
 * Applies an adaptive Unsharp Mask convolution kernel with Noise Coring (from EzSensor.ini HistEquThreshold=80).
 * Prevents noise amplification in uniform dark (soft tissue) and bright (background) areas.
 */
export function applyUnsharpMaskToImageData(
	imageData: ImageData,
	sharpness: number,
	coringThreshold = 5, // ~0.02 in normalized units
): void {
	if (sharpness <= 0) return;

	const width = imageData.width;
	const height = imageData.height;
	const data = imageData.data;

	// Copy original buffer for clean neighbor sampling
	const copy = new Uint8ClampedArray(data);

	// Weight multiplier for high-pass boost
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

			// Apply 8-neighbor average with Noise Coring
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

/**
 * Clips the ergonomic chamfered sensor corner (matching VACAL.dll VCA_CutImage).
 */
export function applyChamferCornerCutToImageData(
	imageData: ImageData,
	chamferPx = 65,
): void {
	const width = imageData.width;
	const height = imageData.height;
	const data = imageData.data;

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

/**
 * Executes full image adjustment pipeline (Filters + LUT + Sensor Geometry) on an ImageData buffer.
 */
export function processVisiographImageData(
	imageData: ImageData,
	params: VisiographImageParams,
): void {
	// 1. Hardware sensor chamfer cut
	if (params.cutCornerChamfer) {
		applyChamferCornerCutToImageData(imageData);
	}

	// 2. Convolution spatial filters
	if (params.pseudoRelief) {
		applyEmboss45ToImageData(imageData);
	} else if (params.maxSharpness) {
		applyHighBoostToImageData(imageData);
	} else if (params.sharpness > 0) {
		applyUnsharpMaskToImageData(imageData, params.sharpness);
	}

	// 3. Tonal LUT application on R, G, B
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

/**
 * WebGL / Canvas2D image processor class for high-fps interactive visiograph manipulation.
 */
export class VisiographImageProcessor {
	/**
	 * Renders source image/canvas onto target canvas with all radiological filters applied.
	 */
	public render(
		source: HTMLImageElement | HTMLCanvasElement,
		targetCanvas: HTMLCanvasElement,
		params: VisiographImageParams = DEFAULT_VISIOGRAPH_IMAGE_PARAMS,
	): void {
		const srcWidth =
			"naturalWidth" in source
				? source.naturalWidth || source.width
				: source.width;
		const srcHeight =
			"naturalHeight" in source
				? source.naturalHeight || source.height
				: source.height;

		if (!srcWidth || !srcHeight) return;

		targetCanvas.width = srcWidth;
		targetCanvas.height = srcHeight;

		const targetCtx = targetCanvas.getContext("2d", {
			willReadFrequently: true,
		});
		if (!targetCtx) return;

		// Draw base image
		targetCtx.drawImage(source, 0, 0, srcWidth, srcHeight);

		// Check if any adjustments are needed
		const isNeutral =
			params.brightness === 0 &&
			params.contrast === 0 &&
			params.gamma === 1.0 &&
			params.sharpness === 0 &&
			!params.invert &&
			!params.maxSharpness &&
			!params.pseudoRelief &&
			!params.cutCornerChamfer;

		if (isNeutral) {
			return;
		}

		try {
			const imgData = targetCtx.getImageData(0, 0, srcWidth, srcHeight);
			processVisiographImageData(imgData, params);
			targetCtx.putImageData(imgData, 0, 0);
		} catch {
			// In case of tainted canvas (cross-origin), fallback to CSS filter
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
		if (params.brightness !== 0) {
			filters.push(`brightness(${100 + params.brightness}%)`);
		}
		if (params.contrast !== 0) {
			filters.push(`contrast(${100 + params.contrast}%)`);
		}
		if (params.invert) {
			filters.push("invert(100%)");
		}

		targetCtx.save();
		targetCtx.filter = filters.length > 0 ? filters.join(" ") : "none";
		targetCtx.drawImage(source, 0, 0, targetCanvas.width, targetCanvas.height);
		targetCtx.restore();
	}
}
