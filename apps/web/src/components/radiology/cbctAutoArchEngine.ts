/**
 * DENTE CRM — CBCT Auto-Arch Mathematical Engine (Facade)
 * Standards: DICOM Part 3, Misch CE, Buser, FDI Two-Digit Notation (11..48)
 * Mandate 8b: Декомпозиция монолитов (строго <= 120 строк).
 */

import type { CbctVoxelVolume } from "./cbctMprMath";
import { type DentalArchCurve, buildDentalArchCurve } from "./dentalCurveEngine";
import type { AxialMIPSlab, OcclusalDensitySliceProfile, PolarRidgeRayResult } from "./cbctAutoArchTypes";
import { computeOcclusalDensityProfile } from "./cbctAutoArchTypes";
import { extractAxialMIPSlab, sampleMipHUContinuous } from "./autoArch/axialMipExtractor";
import { findOcclusalZPlane } from "./autoArch/occlusalZPlaneDetector";
import { detectDentalArchCentroids } from "./autoArch/fdiAnchorHarmonizer";
import { traceAdaptiveBoneRidgeTails } from "./autoArch/adaptiveBoneTails";

export type { AxialMIPSlab, OcclusalDensitySliceProfile, PolarRidgeRayResult };
export {
	computeOcclusalDensityProfile,
	findOcclusalZPlane,
	extractAxialMIPSlab,
	sampleMipHUContinuous,
	detectDentalArchCentroids,
	traceAdaptiveBoneRidgeTails,
};

/**
 * Fully automated end-to-end analytical dental arch curve detection pipeline.
 * Computes optimal Z occlusal plane, extracts 2D Axial MIP slab, traces polar dental ridge centroids,
 * and builds a calibrated DentalArchCurve with Catmull-Rom spline, normal/tangent vectors, and arc length.
 */
export function autoDetectDentalArch(
	volume: CbctVoxelVolume,
	jawType: "mandible" | "maxilla" = "mandible",
	focalTroughThicknessMm = 12.0,
	extendRetromolarMm = 0,
): DentalArchCurve {
	const centerZMm = findOcclusalZPlane(volume, jawType);
	const mipSlab = extractAxialMIPSlab(volume, centerZMm, 6.0);
	const anchors = detectDentalArchCentroids(mipSlab, jawType);
	const extraControlPoints =
		extendRetromolarMm > 0 ? traceAdaptiveBoneRidgeTails(mipSlab, anchors, extendRetromolarMm) : undefined;

	return buildDentalArchCurve(
		anchors,
		jawType,
		focalTroughThicknessMm,
		centerZMm,
		extendRetromolarMm,
		extraControlPoints,
	);
}
