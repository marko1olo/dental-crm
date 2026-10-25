/**
 * VisiographImageLUT.ts
 * Real-time 256-entry lookup table (LUT) builder for radiological tonal transforms.
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
	/** High-Boost extreme edge amplification for apical foramen */
	maxSharpness?: boolean | undefined;
	/** 45° Emboss pseudo-relief filter for root microfractures */
	pseudoRelief?: boolean | undefined;
	/** Sensor ergonomic chamfer bevel cut */
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

	const contrast = Math.max(-100, Math.min(100, params.contrast || 0));
	const contrastFactor =
		(259 * (contrast + 255)) / Math.max(1, 255 * (259 - contrast));

	const brightness = Math.max(-100, Math.min(100, params.brightness || 0));
	const brightnessShift = brightness * 2.55;
	const invert = Boolean(params.invert);

	for (let i = 0; i < 256; i++) {
		let v = 255 * (i / 255) ** invGamma;
		v = contrastFactor * (v - 128) + 128;
		v += brightnessShift;
		let clamped = Math.round(Math.max(0, Math.min(255, v)));
		if (invert) {
			clamped = 255 - clamped;
		}
		lut[i] = clamped;
	}

	return lut;
}
