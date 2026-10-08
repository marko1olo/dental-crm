/**
 * DICOM Measurement & Caliper Tools (Layer 2)
 *
 * Precision radiological calculation tools:
 * - 2D / 3D Euclidean distances in millimeters (scaled by Pixel Spacing).
 * - Caliper angle & Cobb angle in degrees.
 * - Region-Of-Interest (ROI) statistical densitometry (Hounsfield Units).
 * - Misch bone density quality grading (D1-D5).
 */

import { BONE_DENSITY_THRESHOLDS } from "./constants";
import type {
	BoneDensityQualityClass,
	DicomPoint2D,
	RoiHounsfieldStats,
} from "./types";

/**
 * Calculate Euclidean physical distance between two 2D points in millimeters.
 * Takes optional Pixel Spacing [rowSpacingMm, columnSpacingMm].
 * Defaults to 1.0 mm/pixel isotropic if not supplied.
 */
export function calculateEuclideanDistanceMm(
	p1: DicomPoint2D,
	p2: DicomPoint2D,
	pixelSpacing: [number, number] = [1.0, 1.0],
): number {
	const [rowSpacingMm, colSpacingMm] = pixelSpacing;
	const dx = (p2.x - p1.x) * colSpacingMm;
	const dy = (p2.y - p1.y) * rowSpacingMm;
	const distance = Math.hypot(dx, dy);
	return Number.isFinite(distance) ? Math.round(distance * 100) / 100 : 0;
}

/**
 * Calculate the angle between two intersecting line segments in degrees (0..180°).
 * Line 1: [A, B], Line 2: [C, D].
 * Common vertex if B === C.
 */
export function calculateCobbAngleDeg(
	line1: [DicomPoint2D, DicomPoint2D],
	line2: [DicomPoint2D, DicomPoint2D],
): number {
	const v1x = line1[1].x - line1[0].x;
	const v1y = line1[1].y - line1[0].y;
	const v2x = line2[1].x - line2[0].x;
	const v2y = line2[1].y - line2[0].y;

	const dotProduct = v1x * v2x + v1y * v2y;
	const mag1 = Math.hypot(v1x, v1y);
	const mag2 = Math.hypot(v2x, v2y);

	if (mag1 === 0 || mag2 === 0) return 0;

	const cosine = Math.max(-1, Math.min(1, dotProduct / (mag1 * mag2)));
	const angleRad = Math.acos(cosine);
	const angleDeg = (angleRad * 180) / Math.PI;

	return Math.round(angleDeg * 10) / 10;
}

/**
 * Calculate statistical densitometry (Mean, Min, Max, StdDev) in Hounsfield Units (HU)
 * across an array of sampled pixels inside an elliptical or polygonal ROI.
 */
export function calculateRoiHounsfieldStats(
	pixels: ArrayLike<number>,
	rescaleSlope = 1,
	rescaleIntercept = 0,
): RoiHounsfieldStats {
	const length = pixels.length;
	if (length === 0) {
		return {
			meanHu: 0,
			minHu: 0,
			maxHu: 0,
			stdDev: 0,
			pixelCount: 0,
		};
	}

	let sum = 0;
	let minHu = Number.POSITIVE_INFINITY;
	let maxHu = Number.NEGATIVE_INFINITY;

	for (let i = 0; i < length; i++) {
		const raw = pixels[i] ?? 0;
		const hu = raw * rescaleSlope + rescaleIntercept;
		sum += hu;
		if (hu < minHu) minHu = hu;
		if (hu > maxHu) maxHu = hu;
	}

	const meanHu = sum / length;

	let varianceSum = 0;
	for (let i = 0; i < length; i++) {
		const raw = pixels[i] ?? 0;
		const hu = raw * rescaleSlope + rescaleIntercept;
		varianceSum += (hu - meanHu) ** 2;
	}
	const stdDev = Math.sqrt(varianceSum / length);

	return {
		meanHu: Math.round(meanHu * 10) / 10,
		minHu: Math.round(minHu),
		maxHu: Math.round(maxHu),
		stdDev: Math.round(stdDev * 10) / 10,
		pixelCount: length,
	};
}

/**
 * Classify bone density based on mean HU according to Misch Bone Density Scale:
 * - D1: > 1250 HU (dense cortical)
 * - D2: 850..1250 HU (thick porous cortical & coarse trabecular)
 * - D3: 350..850 HU (thin porous cortical & fine trabecular)
 * - D4: 150..350 HU (fine trabecular)
 * - D5: < 150 HU (unmineralized / defect)
 */
export function classifyBoneDensity(meanHu: number): BoneDensityQualityClass {
	if (meanHu >= BONE_DENSITY_THRESHOLDS.D1.min) return "D1";
	if (meanHu >= BONE_DENSITY_THRESHOLDS.D2.min) return "D2";
	if (meanHu >= BONE_DENSITY_THRESHOLDS.D3.min) return "D3";
	if (meanHu >= BONE_DENSITY_THRESHOLDS.D4.min) return "D4";
	return "D5";
}
