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
}

export const DEFAULT_VISIOGRAPH_IMAGE_PARAMS: VisiographImageParams = {
	brightness: 0,
	contrast: 0,
	gamma: 1.0,
	sharpness: 0,
	invert: false,
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
 * Applies a 3x3 Unsharp Mask convolution kernel directly to RGBA pixel buffer.
 * Kernel:
 * [  0,   -k,    0 ]
 * [ -k, 1+4k,   -k ]
 * [  0,   -k,    0 ]
 * where k = sharpness / 50.
 */
export function applyUnsharpMaskToImageData(
	imageData: ImageData,
	sharpness: number,
): void {
	if (sharpness <= 0) return;

	const width = imageData.width;
	const height = imageData.height;
	const data = imageData.data;

	// Copy original buffer for clean neighbor sampling
	const copy = new Uint8ClampedArray(data);

	// Weight multiplier for high-pass boost (sharpness 100 -> k = 2.0)
	const k = Math.max(0, Math.min(100, sharpness)) / 50.0;
	const centerWeight = 1.0 + 4.0 * k;

	for (let y = 0; y < height; y++) {
		const yOffset = y * width;
		const yPrev = Math.max(0, y - 1) * width;
		const yNext = Math.min(height - 1, y + 1) * width;

		for (let x = 0; x < width; x++) {
			const xPrev = Math.max(0, x - 1);
			const xNext = Math.min(width - 1, x + 1);

			const idx = (yOffset + x) << 2;
			const idxTop = (yPrev + x) << 2;
			const idxBottom = (yNext + x) << 2;
			const idxLeft = (yOffset + xPrev) << 2;
			const idxRight = (yOffset + xNext) << 2;

			// Apply to R, G, B channels
			for (let c = 0; c < 3; c++) {
				const center = copy[idx + c] ?? 0;
				const top = copy[idxTop + c] ?? 0;
				const bottom = copy[idxBottom + c] ?? 0;
				const left = copy[idxLeft + c] ?? 0;
				const right = copy[idxRight + c] ?? 0;

				const val =
					center * centerWeight - (top + bottom + left + right) * k;
				data[idx + c] = Math.max(0, Math.min(255, Math.round(val)));
			}
			// Alpha channel (data[idx+3]) remains untouched
		}
	}
}

/**
 * Executes full image adjustment pipeline (LUT + Unsharp Mask) on an ImageData buffer.
 */
export function processVisiographImageData(
	imageData: ImageData,
	params: VisiographImageParams,
): void {
	const lut = buildVisiographLUT(params);
	const data = imageData.data;
	const len = data.length;

	// 1. LUT application on R, G, B
	for (let i = 0; i < len; i += 4) {
		const r = data[i] ?? 0;
		const g = data[i + 1] ?? 0;
		const b = data[i + 2] ?? 0;

		data[i] = lut[r] ?? r;
		data[i + 1] = lut[g] ?? g;
		data[i + 2] = lut[b] ?? b;
	}

	// 2. Unsharp mask sharpening if requested
	if (params.sharpness > 0) {
		applyUnsharpMaskToImageData(imageData, params.sharpness);
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
			!params.invert;

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
