/**
 * DENTE CRM — CBCT Auto-Arch Mathematical Engine
 * Standards: DICOM Part 3, Misch CE, Buser, FDI Two-Digit Notation (11..48)
 *
 * Implements:
 * 1. findOcclusalZPlane: Automated detection of occlusal crown table via Z-density profile and enamel integral (HU >= 2200).
 * 2. extractAxialMIPSlab: 2D Maximum Intensity Projection (MIP) slab extraction (12-15 mm thickness) with metal artifact clipping.
 * 3. detectDentalArchCentroids: Polar ridge density ray-tracing (-pi/6 to 7pi/6) from anatomical jaw center, outlier filtering, and 16 FDI anchor estimation.
 * 4. autoDetectDentalArch: End-to-end calibrated panoramic dental curve reconstruction with Catmull-Rom spline, arc length, and tangents/normals.
 */

import type { Point2D } from "./cbctCaliperNerveMath";
import {
	type CbctVoxelVolume,
	worldMmToVoxel,
} from "./cbctMprMath";
import {
	type DentalArchAnchor,
	type DentalArchCurve,
	DEFAULT_MANDIBULAR_ARCH_ANCHORS,
	DEFAULT_MAXILLARY_ARCH_ANCHORS,
	buildDentalArchCurve,
} from "./dentalCurveEngine";

export interface AxialMIPSlab {
	readonly data: Float32Array;
	readonly width: number;
	readonly height: number;
	readonly originMm: Point2D;
	readonly spacingMm: Point2D;
	readonly centerZMm: number;
	readonly thicknessMm: number;
}

export interface OcclusalDensitySliceProfile {
	readonly zIndex: number;
	readonly zMm: number;
	readonly enamelIntegral: number;
	readonly boneIntegral: number;
	readonly smoothedEnamel: number;
}

export interface PolarRidgeRayResult {
	readonly angleRad: number;
	readonly optimalRadiusMm: number;
	readonly peakHU: number;
	readonly centroidWorldMm: Point2D;
}

// ─── 1. OCCLUSAL Z-PLANE DETECTION ENGINE ───────────────────────────────────

/**
 * Computes Z-axis enamel and cortical bone density profiles across the CBCT volume.
 * Analyzes enamel integral (HU >= 2200) and cortical bone integral (HU >= 1200) with metal artifact clipping (> 4000 HU).
 */
export function computeOcclusalDensityProfile(
	volume: CbctVoxelVolume,
	sampleStepX = 2,
	sampleStepY = 2,
): OcclusalDensitySliceProfile[] {
	if (!volume || !volume.data || volume.isDisposed || volume.dimensions.depth <= 0) {
		return [];
	}

	const { width, height, depth } = volume.dimensions;
	const { z: spacingZ } = volume.spacingMm;
	const originZ = volume.originMm.z;
	const totalSliceVoxels = width * height;
	const data = volume.data;

	const rawProfiles: Array<{
		zIndex: number;
		zMm: number;
		enamelIntegral: number;
		boneIntegral: number;
	}> = new Array(depth);

	for (let z = 0; z < depth; z++) {
		const zOffset = z * totalSliceVoxels;
		const zMm = Number((originZ + z * spacingZ).toFixed(2));
		let enamelSum = 0;
		let boneSum = 0;

		for (let y = 0; y < height; y += sampleStepY) {
			const yOffset = zOffset + y * width;
			for (let x = 0; x < width; x += sampleStepX) {
				const hu = data[yOffset + x] ?? -1000;

				if (hu >= 2200) {
					// Enamel threshold: clip metal streak artifacts to 4000 HU to avoid distorted weights
					const effectiveHU = Math.min(hu, 4000);
					enamelSum += effectiveHU - 2200;
				} else if (hu >= 1200) {
					// Cortical bone threshold
					const effectiveHU = Math.min(hu, 4000);
					boneSum += effectiveHU - 1200;
				}
			}
		}

		rawProfiles[z] = {
			zIndex: z,
			zMm,
			enamelIntegral: enamelSum,
			boneIntegral: boneSum,
		};
	}

	// 1D Gaussian kernel smoothing (sigma = 1.5 slices, radius = 3)
	const kernel = [0.06136, 0.24477, 0.38774, 0.24477, 0.06136];
	const kRadius = 2;

	return rawProfiles.map((p, idx) => {
		let smoothVal = 0;
		let weightSum = 0;

		for (let k = -kRadius; k <= kRadius; k++) {
			const neighborIdx = idx + k;
			if (neighborIdx >= 0 && neighborIdx < depth) {
				const w = kernel[k + kRadius] ?? 0;
				smoothVal += (rawProfiles[neighborIdx]?.enamelIntegral ?? 0) * w;
				weightSum += w;
			}
		}

		const smoothedEnamel = weightSum > 0 ? smoothVal / weightSum : p.enamelIntegral;

		return {
			zIndex: p.zIndex,
			zMm: p.zMm,
			enamelIntegral: p.enamelIntegral,
			boneIntegral: p.boneIntegral,
			smoothedEnamel,
		};
	});
}

/**
 * Finds the optimal Z occlusal plane (in physical millimeters) for the specified jaw.
 * Evaluates the enamel density peak: mandibular crowns (lower peak) vs maxillary crowns (upper peak).
 */
export function findOcclusalZPlane(
	volume: CbctVoxelVolume,
	jawType: "mandible" | "maxilla" = "mandible",
): number {
	if (!volume || !volume.data || volume.isDisposed || volume.dimensions.depth <= 0) {
		return 0.0;
	}

	const profile = computeOcclusalDensityProfile(volume);
	if (profile.length === 0) return 0.0;

	// Find local maxima in the smoothed enamel profile
	let maxEnamel = 0;
	for (const p of profile) {
		if (p.smoothedEnamel > maxEnamel) maxEnamel = p.smoothedEnamel;
	}

	const significantThreshold = maxEnamel * 0.25;
	const localPeaks: Array<{ zIndex: number; zMm: number; score: number }> = [];

	for (let i = 1; i < profile.length - 1; i++) {
		const prev = profile[i - 1]?.smoothedEnamel ?? 0;
		const cur = profile[i]?.smoothedEnamel ?? 0;
		const next = profile[i + 1]?.smoothedEnamel ?? 0;

		if (cur >= prev && cur >= next && cur >= significantThreshold) {
			localPeaks.push({
				zIndex: profile[i]!.zIndex,
				zMm: profile[i]!.zMm,
				score: cur,
			});
		}
	}

	// Fallback to bone profile if no significant enamel peak exists (e.g. edentulous patient)
	if (localPeaks.length === 0) {
		let maxBone = 0;
		let bestZIdx = Math.floor(profile.length / 2);

		for (const p of profile) {
			if (p.boneIntegral > maxBone) {
				maxBone = p.boneIntegral;
				bestZIdx = p.zIndex;
			}
		}

		const fallbackEntry = profile[bestZIdx];
		return fallbackEntry ? fallbackEntry.zMm : 0.0;
	}

	if (localPeaks.length > 1) {
		// Sort peaks by physical Z (inferior/mandible -> superior/maxilla)
		localPeaks.sort((a, b) => a.zMm - b.zMm);
		if (jawType === "mandible") {
			return localPeaks[0]!.zMm;
		}
		return localPeaks[localPeaks.length - 1]!.zMm;
	}

	return localPeaks[0]!.zMm;
}

// ─── 2. 2D AXIAL MAXIMUM INTENSITY PROJECTION (MIP) SLAB ENGINE ─────────────

/**
 * Extracts a 2D Axial MIP slab centered around `centerZMm` with the specified physical thickness (typically 12–15 mm).
 * Clips high-density metal artifacts (> 4000 HU) to preserve fine anatomical ridge boundaries.
 */
export function extractAxialMIPSlab(
	volume: CbctVoxelVolume,
	centerZMm: number,
	thicknessMm = 14.0,
): AxialMIPSlab {
	const width = volume.dimensions?.width ?? 64;
	const height = volume.dimensions?.height ?? 64;
	const depth = volume.dimensions?.depth ?? 32;
	const originMm: Point2D = { x: volume.originMm?.x ?? 0, y: volume.originMm?.y ?? 0 };
	const spacingMm: Point2D = { x: volume.spacingMm?.x ?? 0.25, y: volume.spacingMm?.y ?? 0.25 };

	const mipBuffer = new Float32Array(width * height).fill(-1000);

	if (!volume || !volume.data || volume.isDisposed || depth <= 0) {
		return {
			data: mipBuffer,
			width,
			height,
			originMm,
			spacingMm,
			centerZMm,
			thicknessMm,
		};
	}

	const originZ = volume.originMm.z;
	const spacingZ = volume.spacingMm.z || 0.25;

	const minZMm = centerZMm - thicknessMm / 2.0;
	const maxZMm = centerZMm + thicknessMm / 2.0;

	const zStart = Math.max(0, Math.min(depth - 1, Math.floor((minZMm - originZ) / spacingZ)));
	const zEnd = Math.max(0, Math.min(depth - 1, Math.ceil((maxZMm - originZ) / spacingZ)));
	const zMinIdx = Math.min(zStart, zEnd);
	const zMaxIdx = Math.max(zStart, zEnd);

	const totalSliceVoxels = width * height;
	const data = volume.data;

	for (let y = 0; y < height; y++) {
		const rowOffset = y * width;
		for (let x = 0; x < width; x++) {
			let maxHU = -32768;

			for (let z = zMinIdx; z <= zMaxIdx; z++) {
				const idx = z * totalSliceVoxels + rowOffset + x;
				const hu = data[idx] ?? -1000;
				if (hu > maxHU) {
					maxHU = hu;
				}
			}

			// Filter/clip extreme metal spikes > 4000 HU
			const finalHU = maxHU > 4000 ? 4000 : maxHU < -1000 ? -1000 : maxHU;
			mipBuffer[rowOffset + x] = finalHU;
		}
	}

	return {
		data: mipBuffer,
		width,
		height,
		originMm,
		spacingMm,
		centerZMm,
		thicknessMm,
	};
}

// ─── 3. POLAR RIDGE DENSITY TRACING & FDI ANCHOR FITTING ─────────────────────

/**
 * Bilinearly samples HU density from 2D Axial MIP slab given world coordinates in physical millimeters.
 */
export function sampleMipHUContinuous(
	mip: AxialMIPSlab | { data: Float32Array; width: number; height: number; originMm: Point2D; spacingMm: Point2D },
	worldX: number,
	worldY: number,
): number {
	const vx = (worldX - mip.originMm.x) / (mip.spacingMm.x || 0.25);
	const vy = (worldY - mip.originMm.y) / (mip.spacingMm.y || 0.25);

	if (vx < 0 || vx > mip.width - 1 || vy < 0 || vy > mip.height - 1) {
		return -1000;
	}

	const x0 = Math.floor(vx);
	const y0 = Math.floor(vy);
	const x1 = Math.min(mip.width - 1, x0 + 1);
	const y1 = Math.min(mip.height - 1, y0 + 1);

	const dx = vx - x0;
	const dy = vy - y0;

	const w = mip.width;
	const d = mip.data;

	const v00 = d[y0 * w + x0] ?? -1000;
	const v10 = d[y0 * w + x1] ?? -1000;
	const v01 = d[y1 * w + x0] ?? -1000;
	const v11 = d[y1 * w + x1] ?? -1000;

	const top = v00 + dx * (v10 - v00);
	const bottom = v01 + dx * (v11 - v01);

	return top + dy * (bottom - top);
}

/**
 * Detects the anatomical dental arch ridge centroids via polar ray casting (-pi/6 to 7pi/6),
 * applies outlier filtering, and fits 16 standard FDI dental anchors (18..48 / 11..28).
 */
export function detectDentalArchCentroids(
	mip: AxialMIPSlab | { data: Float32Array; width: number; height: number; originMm: Point2D; spacingMm: Point2D },
	jawType: "mandible" | "maxilla" = "mandible",
): DentalArchAnchor[] {
	const defaultAnchors =
		jawType === "mandible" ? DEFAULT_MANDIBULAR_ARCH_ANCHORS : DEFAULT_MAXILLARY_ARCH_ANCHORS;

	// Compute high-density center of mass on the MIP slab
	let totalWeight = 0;
	let weightedX = 0;
	let weightedY = 0;
	let posteriorYMax = -Infinity;

	const { width, height, originMm, spacingMm } = mip;

	for (let y = 0; y < height; y++) {
		const worldY = originMm.y + y * spacingMm.y;
		const rowOffset = y * width;

		for (let x = 0; x < width; x++) {
			const hu = mip.data[rowOffset + x] ?? -1000;
			if (hu >= 800) {
				const w = Math.min(hu, 3500) - 700;
				totalWeight += w;
				const worldX = originMm.x + x * spacingMm.x;
				weightedX += w * worldX;
				weightedY += w * worldY;

				if (worldY > posteriorYMax) {
					posteriorYMax = worldY;
				}
			}
		}
	}

	let jawCenterX = 0.0;
	let jawCenterY = 0.0;
	let hasEnamel = false;

	if (totalWeight > 5000) {
		jawCenterX = weightedX / totalWeight;
		// Allow real patient lateral translation up to scanner boundaries (+/- 45 mm)
		jawCenterX = Math.max(-45.0, Math.min(45.0, jawCenterX));
		// The ray origin sits in oral cavity / tongue center ~25 mm posterior to the high-density teeth centroid
		const teethCenterY = weightedY / totalWeight;
		jawCenterY = teethCenterY + 25.0;
		hasEnamel = true;
	}

	// Standard FDI tooth angles in radians covering the full dental arch from Right Molar 3 to Left Molar 3
	// Coordinate system: u_x = -cos(theta), u_y = -sin(theta)
	// theta = -14 deg -> Right posterior quadrant (48/18)
	// theta = +90 deg -> Direct anterior / central incisors (41, 31 / 11, 21)
	// theta = +194 deg -> Left posterior quadrant (38/28)
	const toothAngleSpecs = [
		{ fdi: jawType === "mandible" ? "48" : "18", angleRad: (-14 * Math.PI) / 180, isRight: true },
		{ fdi: jawType === "mandible" ? "47" : "17", angleRad: (0 * Math.PI) / 180, isRight: true },
		{ fdi: jawType === "mandible" ? "46" : "16", angleRad: (16 * Math.PI) / 180, isRight: true },
		{ fdi: jawType === "mandible" ? "45" : "15", angleRad: (30 * Math.PI) / 180, isRight: true },
		{ fdi: jawType === "mandible" ? "44" : "14", angleRad: (45 * Math.PI) / 180, isRight: true },
		{ fdi: jawType === "mandible" ? "43" : "13", angleRad: (60 * Math.PI) / 180, isRight: true },
		{ fdi: jawType === "mandible" ? "42" : "12", angleRad: (74 * Math.PI) / 180, isRight: true },
		{ fdi: jawType === "mandible" ? "41" : "11", angleRad: (87 * Math.PI) / 180, isRight: true },
		{ fdi: jawType === "mandible" ? "31" : "21", angleRad: (93 * Math.PI) / 180, isRight: false },
		{ fdi: jawType === "mandible" ? "32" : "22", angleRad: (106 * Math.PI) / 180, isRight: false },
		{ fdi: jawType === "mandible" ? "33" : "23", angleRad: (120 * Math.PI) / 180, isRight: false },
		{ fdi: jawType === "mandible" ? "34" : "24", angleRad: (135 * Math.PI) / 180, isRight: false },
		{ fdi: jawType === "mandible" ? "35" : "25", angleRad: (150 * Math.PI) / 180, isRight: false },
		{ fdi: jawType === "mandible" ? "36" : "26", angleRad: (164 * Math.PI) / 180, isRight: false },
		{ fdi: jawType === "mandible" ? "37" : "27", angleRad: (180 * Math.PI) / 180, isRight: false },
		{ fdi: jawType === "mandible" ? "38" : "28", angleRad: (194 * Math.PI) / 180, isRight: false },
	];

	// Polar ray tracing density sampler
	const rayTraceRidge = (theta: number, defaultRadiusMm: number): number => {
		const dirX = -Math.cos(theta);
		const dirY = -Math.sin(theta);

		let maxIntensity = -1000;
		let optimalRadius = defaultRadiusMm;
		let peakWeightedSum = 0;
		let peakWeight = 0;

		const minRadius = hasEnamel ? 5.0 : Math.max(12.0, defaultRadiusMm - 16.0);
		const maxRadius = hasEnamel ? 65.0 : Math.min(80.0, defaultRadiusMm + 16.0);
		const stepR = 0.5;

		for (let r = minRadius; r <= maxRadius; r += stepR) {
			const sampleX = jawCenterX + r * dirX;
			const sampleY = jawCenterY + r * dirY;

			const hu = sampleMipHUContinuous(mip, sampleX, sampleY);

			if (hu >= 800) {
				const w = Math.pow(Math.min(hu, 4000) - 700, 1.5);
				peakWeightedSum += w * r;
				peakWeight += w;

				if (hu > maxIntensity) {
					maxIntensity = hu;
				}
			}
		}

		if (peakWeight > 0 && maxIntensity >= 1000) {
			optimalRadius = peakWeightedSum / peakWeight;
		}

		return optimalRadius;
	};

	// Detect radii for each anchor
	const detectedRadii: number[] = new Array(toothAngleSpecs.length);
	for (let i = 0; i < toothAngleSpecs.length; i++) {
		const spec = toothAngleSpecs[i]!;
		const defaultAnchor = defaultAnchors[i] ?? defaultAnchors[0]!;
		const defaultR = Math.hypot(
			defaultAnchor.positionMm.x - jawCenterX,
			defaultAnchor.positionMm.y - jawCenterY,
		);
		detectedRadii[i] = rayTraceRidge(spec.angleRad, defaultR);
	}

	// Apply 1D 3-point median filter followed by gentle smoothing to eliminate outlier spikes
	const smoothedRadii: number[] = new Array(detectedRadii.length);
	for (let i = 0; i < detectedRadii.length; i++) {
		const rPrev = detectedRadii[Math.max(0, i - 1)] ?? detectedRadii[i]!;
		const rCur = detectedRadii[i]!;
		const rNext = detectedRadii[Math.min(detectedRadii.length - 1, i + 1)] ?? detectedRadii[i]!;

		// Median of 3
		const sorted = [rPrev, rCur, rNext].sort((a, b) => a - b);
		const med = sorted[1]!;

		smoothedRadii[i] = 0.25 * rPrev + 0.5 * med + 0.25 * rNext;
	}

	// Construct the final 16 FDI dental arch anchors
	const resultAnchors: DentalArchAnchor[] = [];

	for (let i = 0; i < toothAngleSpecs.length; i++) {
		const spec = toothAngleSpecs[i]!;
		const defaultAnchor = defaultAnchors[i] ?? defaultAnchors[0]!;
		const r = smoothedRadii[i] ?? 40.0;

		const dirX = -Math.cos(spec.angleRad);
		const dirY = -Math.sin(spec.angleRad);

		const posX = Number((jawCenterX + r * dirX).toFixed(2));
		const posY = Number((jawCenterY + r * dirY).toFixed(2));

		resultAnchors.push({
			id: `a-${spec.fdi}`,
			toothFdi: spec.fdi,
			labelRu: defaultAnchor.labelRu,
			positionMm: { x: posX, y: posY },
			isQuadrantRight: spec.isRight,
		});
	}

	return resultAnchors;
}

// ─── 4. END-TO-END AUTOMATIC DENTAL ARCH PIPELINE ───────────────────────────

/**
 * Fully automated end-to-end analytical dental arch curve detection pipeline.
 * Computes the optimal Z occlusal plane, extracts the 2D Axial MIP slab, traces polar dental ridge centroids,
 * and builds a calibrated DentalArchCurve with Catmull-Rom spline, normal/tangent vectors, and arc length.
 */
export function autoDetectDentalArch(
	volume: CbctVoxelVolume,
	jawType: "mandible" | "maxilla" = "mandible",
): DentalArchCurve {
	// 1. Find optimal Z occlusal plane
	const centerZMm = findOcclusalZPlane(volume, jawType);

	// 2. Extract 2D Axial MIP slab (14 mm thickness)
	const mipSlab = extractAxialMIPSlab(volume, centerZMm, 14.0);

	// 3. Detect dental arch centroids and fit 16 FDI anchors
	const anchors = detectDentalArchCentroids(mipSlab, jawType);

	// 4. Construct smooth Catmull-Rom spline dental arch curve
	return buildDentalArchCurve(anchors, jawType, 12.0);
}
