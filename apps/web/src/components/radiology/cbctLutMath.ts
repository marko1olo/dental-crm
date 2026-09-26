/**
 * DENTE CRM — CBCT 16-Bit Look-Up Table (LUT) & HU Windowing Engine
 * Standards: DICOM Part 3 PS 3.3 (C.11.2.1.2 VOI LUT Windowing)
 * Extracted from cbctMprMath.ts according to Mandate 8b.
 */


/**
 * Generates a precomputed 65536-entry Uint8Array Look-Up Table (LUT) mapping signed 16-bit
 * HU values (-32768..+32767) to 8-bit grayscale intensities [0..255].
 *
 * Direct index mapping: `lutIndex = (hu + 32768) & 0xffff`.
 *
 * Supports:
 * - Sub-millisecond window width / window level contrast calculations.
 * - Negative / Inverted X-ray LUT (White Paper mode) via `invert = true`.
 * - Anti-blinding dark background: Air voxels (HU < -600) remain deep dark (#090d16 -> 10) on inversion.
 * - Non-linear gamma VOI transfer curve via `gamma`.
 */
export function generate16BitLut(
	windowWidth: number,
	windowLevel: number,
	invert = false,
	gamma = 1.0,
): Uint8Array {
	const lut = new Uint8Array(65536);
	const safeWW = Math.max(1, windowWidth);
	const low = windowLevel - safeWW / 2.0;
	const high = windowLevel + safeWW / 2.0;
	const invWW = 1.0 / safeWW;

	const lowIdx = Math.max(0, Math.min(65536, Math.floor(low + 32768)));
	const highIdx = Math.max(0, Math.min(65536, Math.ceil(high + 32768)));

	// Air threshold for anti-blinding in inverted LUT: HU < -600 keeps deep dark background (#090d16 -> 10)
	const airThresholdHU = -600;
	const airThresholdIdx = Math.max(0, Math.min(65536, Math.floor(airThresholdHU + 32768)));
	const darkAirVal = 10; // #090d16 deep dark background

	const bottomVal = invert ? 255 : 0;
	const topVal = invert ? 0 : 255;

	if (lowIdx > 0) {
		lut.fill(bottomVal, 0, lowIdx);
	}
	if (highIdx < 65536) {
		lut.fill(topVal, highIdx, 65536);
	}

	const isGamma = gamma !== 1.0 && gamma > 0;
	for (let i = lowIdx; i < highIdx; i++) {
		const hu = i - 32768;
		if (hu <= low) {
			lut[i] = bottomVal;
		} else if (hu >= high) {
			lut[i] = topVal;
		} else {
			const normalized = (hu - low) * invWW;
			const corrected = isGamma ? Math.pow(normalized, gamma) : normalized;
			const val = Math.round(corrected * 255);
			lut[i] = invert ? 255 - val : val;
		}
	}

	// Invert LUT: keep ambient air voxels (HU < -600) deep dark (#090d16) to eliminate white background blinding
	if (invert) {
		for (let i = 0; i < airThresholdIdx; i++) {
			lut[i] = darkAirVal;
		}
	}

	return lut;
}

const LUT_CACHE_MAX_SIZE = 64;
const lutCache = new Map<string, Uint8Array>();

/**
 * Retrieves a cached 65536-entry Uint8Array Look-Up Table (LUT) for instantaneous
 * (< 0.05 ms) Window/Level mapping without memory allocation churn.
 */
export function get16BitLut(
	windowWidth: number,
	windowLevel: number,
	invert = false,
	gamma = 1.0,
): Uint8Array {
	const key = `${windowWidth}|${windowLevel}|${invert ? 1 : 0}|${gamma}`;
	let lut = lutCache.get(key);
	if (!lut) {
		lut = generate16BitLut(windowWidth, windowLevel, invert, gamma);
		if (lutCache.size >= LUT_CACHE_MAX_SIZE) {
			const firstKey = lutCache.keys().next().value;
			if (firstKey !== undefined) {
				lutCache.delete(firstKey);
			}
		}
		lutCache.set(key, lut);
	}
	return lut;
}

/**
 * Clears the 16-bit Window/Level LUT cache.
 */
export function clearLutCache(): void {
	lutCache.clear();
}

/**
 * Applies a precomputed 16-bit LUT to a single Hounsfield Unit (HU) or raw voxel value.
 * Indexing: `(clamp(hu, -32768, 32767) + 32768) & 0xffff`.
 */
export function applyLutToHU(lut: Uint8Array, hu: number): number {
	const idx = (Math.max(-32768, Math.min(32767, Math.round(hu))) + 32768) & 0xffff;
	return lut[idx] ?? 0;
}

/**
 * Maps Hounsfield Unit (HU) to 8-bit grayscale intensity [0..255] via linear or gamma windowing.
 * Standards: DICOM Part 3 PS 3.3 (C.11.2.1.2 VOI LUT Windowing), Planmeca Romexis, Vatech Ez3D-i.
 * Uses cached 16-bit LUT for instantaneous sub-microsecond evaluation.
 *
 * Tissue HU Reference under WW 4400 / WL 1300:
 * - Air (-1000 HU) -> 0 (Black)
 * - Pulp / Nerve soft tissue (+50..200 HU) -> 55..64 (Dark gray / black)
 * - Trabecular Bone (+600..900 HU) -> 90..104 (Medium gray)
 * - Cortical Bone (+1300..1600 HU) -> 127..145 (Medium gray)
 * - Dentin (+1800..2500 HU) -> 156..197 (Light gray)
 * - Enamel (+3000..4000 HU) -> 226..255 (Bright white)
 */
export function huToGrayscale(
	hu: number,
	windowWidth: number,
	windowLevel: number,
	invert = false,
	gamma = 1.0,
): number {
	const lut = get16BitLut(windowWidth, windowLevel, invert, gamma);
	const idx = (Math.max(-32768, Math.min(32767, Math.round(hu))) + 32768) & 0xffff;
	return lut[idx] ?? 0;
}

// ─── 3. MULTI-PLANAR RESLICER (MPR) WITH SLAB PROJECTIONS ───────────────────
