/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL RADIOLOGY & CBCT: MEASURE STATS, HU LINE PROFILE & DENSITOMETRY
 * ═══════════════════════════════════════════════════════════════════════════
 * Pure mathematical engine for quantitative osteotomy bed analysis:
 * - ROI intensity statistical distribution (count, mean, stdDev, min, max)
 * - Continuous volumetric line profiling (lineProfileHU) via trilinear voxel interpolation
 * - 2D/3D angular measurements (angleDeg) between anatomical trajectory rays
 * - Carl Misch implant bed densitometry (cortical thickness, trabecular mean, low density warnings)
 *
 * Adapted from DenCT reference core/measureStats.ts.
 * 100% pure TypeScript, zero DOM/Cornerstone dependencies, unit-testable.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { trilinear, type VolumeSamplingData } from "./cprMath.js";
import { classifyBone } from "./boneQuality.js";

export type Vec3 = [number, number, number];

/**
 * Population intensity statistics for a sample array of CT/CBCT Hounsfield Units.
 */
export interface RoiStats {
	count: number;
	mean: number;
	stdDev: number;
	min: number;
	max: number;
}

/**
 * Population mean, standard deviation, min, and max of a set of intensity samples.
 * Returns null for empty inputs.
 */
export function roiStats(values: ArrayLike<number>): RoiStats | null {
	const n = values.length;
	if (n === 0) return null;

	let min = Infinity;
	let max = -Infinity;
	let sum = 0;

	for (let i = 0; i < n; i++) {
		const v = values[i] ?? 0;
		sum += v;
		if (v < min) min = v;
		if (v > max) max = v;
	}

	const mean = sum / n;
	let sse = 0;

	for (let i = 0; i < n; i++) {
		const v = values[i] ?? 0;
		const d = v - mean;
		sse += d * d;
	}

	return {
		count: n,
		mean,
		stdDev: Math.sqrt(sse / n),
		min,
		max,
	};
}

/**
 * Samples CT Hounsfield Units (HU) along a 3D world segment a -> b at `samples`
 * evenly spaced points using trilinear voxel interpolation.
 * Consistent with cross-sectional and panoramic CPR reslicing.
 */
export function lineProfileHU(
	vol: VolumeSamplingData,
	a: Vec3,
	b: Vec3,
	samples = 64,
): number[] {
	const n = Math.max(2, Math.floor(samples));
	const [ox, oy, oz] = vol.origin;
	const out = new Array<number>(n);

	for (let i = 0; i < n; i++) {
		const t = i / (n - 1);
		const wx = a[0] + (b[0] - a[0]) * t;
		const wy = a[1] + (b[1] - a[1]) * t;
		const wz = a[2] + (b[2] - a[2]) * t;

		out[i] = trilinear(
			vol.getVoxel,
			vol.dims,
			(wx - ox) * vol.invSx,
			(wy - oy) * vol.invSy,
			(wz - oz) * vol.invSz,
		);
	}

	return out;
}

/**
 * Angle in degrees at `vertex` between the rays to `a` and `b` (2D or 3D).
 * Returns 0 if either ray has zero length.
 */
export function angleDeg(a: number[], vertex: number[], b: number[]): number {
	const u = a.map((v, i) => v - (vertex[i] ?? 0));
	const w = b.map((v, i) => v - (vertex[i] ?? 0));
	const dot = u.reduce((s, x, i) => s + x * (w[i] ?? 0), 0);
	const lu = Math.hypot(...u);
	const lw = Math.hypot(...w);

	if (lu === 0 || lw === 0) return 0;

	const c = Math.max(-1, Math.min(1, dot / (lu * lw)));
	return (Math.acos(c) * 180) / Math.PI;
}

/**
 * Quantitative densitometric analysis of a planned dental implant osteotomy bed.
 */
export interface ImplantBedDensitometry {
	profile: number[];
	stats: RoiStats;
	boneClass: string;
	corticalThicknessMm: number;
	trabecularMeanHU: number;
	warningLowDensity: boolean;
}

/**
 * Quantitative densitometric analysis of a planned dental implant osteotomy bed:
 * 1. Samples bone HU density profile from crest to apex via lineProfileHU.
 * 2. Calculates comprehensive ROI statistics over the trajectory.
 * 3. Classifies overall bed bone quality according to Carl Misch (D1–D5).
 * 4. Measures cortical plate thickness from crest to point of drop below 850 HU.
 * 5. Computes mean trabecular / cancellous core density.
 * 6. Sets warningLowDensity = true if trabecularMeanHU < 350 HU or min < 150 HU.
 */
export function calculateImplantBedDensitometry(
	vol: VolumeSamplingData,
	crestPoint: Vec3,
	apexPoint: Vec3,
	samples = 64,
): ImplantBedDensitometry {
	const profile = lineProfileHU(vol, crestPoint, apexPoint, samples);
	const n = profile.length;
	const stats = roiStats(profile) ?? {
		count: 0,
		mean: 0,
		stdDev: 0,
		min: 0,
		max: 0,
	};

	const totalLengthMm = Math.hypot(
		apexPoint[0] - crestPoint[0],
		apexPoint[1] - crestPoint[1],
		apexPoint[2] - crestPoint[2],
	);

	// Misch bone classification based on mean density across the osteotomy bed
	const boneClass = classifyBone(stats.mean);

	// Find the first sample index where bone density drops below the cortical threshold (850 HU)
	const dropIndex = profile.findIndex((v) => v < 850);

	let corticalThicknessMm = 0;
	if (n >= 2 && totalLengthMm > 0) {
		if (dropIndex === -1) {
			// Pure cortical bone throughout the entire length (e.g. solid D1)
			corticalThicknessMm = totalLengthMm;
		} else if (dropIndex > 0) {
			// Distance from crest (index 0) to the sample where density drops below 850 HU
			corticalThicknessMm = (dropIndex / (n - 1)) * totalLengthMm;
		} else {
			// Crest point itself is already below 850 HU (no dense crestal cortex)
			corticalThicknessMm = 0;
		}
	}

	// Trabecular bone corresponds to the region beyond the crestal cortical plate
	let trabecularMeanHU = stats.mean;
	if (dropIndex >= 0) {
		const trabecularSamples = profile.slice(dropIndex);
		if (trabecularSamples.length > 0) {
			const trabStats = roiStats(trabecularSamples);
			if (trabStats) {
				trabecularMeanHU = trabStats.mean;
			}
		}
	}

	// Clinical safety warning: trabecular bone density < 350 HU (D4) or localized defect / soft tissue < 150 HU (D5)
	const warningLowDensity = trabecularMeanHU < 350 || stats.min < 150;

	return {
		profile,
		stats,
		boneClass,
		corticalThicknessMm,
		trabecularMeanHU,
		warningLowDensity,
	};
}
