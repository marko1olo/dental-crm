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
	readonly cancellousIntegral: number;
	readonly smoothedEnamel: number;
	readonly smoothedBone: number;
	readonly smoothedCancellous: number;
}

export interface PolarRidgeRayResult {
	readonly angleRad: number;
	readonly optimalRadiusMm: number;
	readonly peakHU: number;
	readonly centroidWorldMm: Point2D;
}

// ─── 1. OCCLUSAL Z-PLANE DETECTION ENGINE ───────────────────────────────────

/**
 * Computes Z-axis enamel, cortical bone, and cancellous ridge density profiles across the CBCT volume.
 * Multi-tier thresholds:
 * - Enamel integral (HU >= 2000) for dentate crowns
 * - Cortical bone integral (HU >= 800) for alveolar bone crest
 * - Cancellous/trabecular ridge integral (HU >= 350) for edentulous and osteoporotic jaws
 * Metal artifact clipping (<= 3500 HU) prevents streak distortions.
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
		cancellousIntegral: number;
	}> = new Array(depth);

	for (let z = 0; z < depth; z++) {
		const zOffset = z * totalSliceVoxels;
		const zMm = Number((originZ + z * spacingZ).toFixed(2));
		let enamelSum = 0;
		let boneSum = 0;
		let cancellousSum = 0;

		for (let y = 0; y < height; y += sampleStepY) {
			const yOffset = zOffset + y * width;
			for (let x = 0; x < width; x += sampleStepX) {
				const rawHu = data[yOffset + x] ?? -1000;
				// Metal artifact clipping to 3500 HU
				const hu = Math.min(rawHu, 3500);

				if (hu >= 2000) {
					// Enamel threshold (dentate crowns)
					enamelSum += hu - 2000;
					boneSum += hu - 800;
					cancellousSum += hu - 350;
				} else if (hu >= 800) {
					// Cortical bone threshold (alveolar ridge)
					boneSum += hu - 800;
					cancellousSum += hu - 350;
				} else if (hu >= 350) {
					// Cancellous bone / edentulous ridge threshold
					cancellousSum += hu - 350;
				}
			}
		}

		rawProfiles[z] = {
			zIndex: z,
			zMm,
			enamelIntegral: enamelSum,
			boneIntegral: boneSum,
			cancellousIntegral: cancellousSum,
		};
	}

	// 1D Gaussian kernel smoothing (sigma = 1.5 slices, radius = 2)
	const kernel = [0.06136, 0.24477, 0.38774, 0.24477, 0.06136];
	const kRadius = 2;

	return rawProfiles.map((p, idx) => {
		let smoothEnamel = 0;
		let smoothBone = 0;
		let smoothCancellous = 0;
		let weightSum = 0;

		for (let k = -kRadius; k <= kRadius; k++) {
			const neighborIdx = idx + k;
			if (neighborIdx >= 0 && neighborIdx < depth) {
				const w = kernel[k + kRadius] ?? 0;
				smoothEnamel += (rawProfiles[neighborIdx]?.enamelIntegral ?? 0) * w;
				smoothBone += (rawProfiles[neighborIdx]?.boneIntegral ?? 0) * w;
				smoothCancellous += (rawProfiles[neighborIdx]?.cancellousIntegral ?? 0) * w;
				weightSum += w;
			}
		}

		const smoothedEnamel = weightSum > 0 ? smoothEnamel / weightSum : p.enamelIntegral;
		const smoothedBone = weightSum > 0 ? smoothBone / weightSum : p.boneIntegral;
		const smoothedCancellous = weightSum > 0 ? smoothCancellous / weightSum : p.cancellousIntegral;

		return {
			zIndex: p.zIndex,
			zMm: p.zMm,
			enamelIntegral: p.enamelIntegral,
			boneIntegral: p.boneIntegral,
			cancellousIntegral: p.cancellousIntegral,
			smoothedEnamel,
			smoothedBone,
			smoothedCancellous,
		};
	});
}

/**
 * Finds the optimal Z occlusal plane (in physical millimeters) for the specified jaw.
 * Multi-tier evaluation:
 * 1. Enamel density peaks (dentate crowns)
 * 2. Cortical bone density peaks (alveolar crest)
 * 3. Cancellous/edentulous ridge peaks (osteoporotic/edentulous jaws)
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

	// Helper to find local maxima in a 1D smoothed density signal
	const findPeaks = (signalExtractor: (p: OcclusalDensitySliceProfile) => number, minRelativeThreshold = 0.25) => {
		let maxVal = 0;
		for (const p of profile) {
			const val = signalExtractor(p);
			if (val > maxVal) maxVal = val;
		}

		if (maxVal < 10) return [];

		const threshold = maxVal * minRelativeThreshold;
		const peaks: Array<{ zIndex: number; zMm: number; score: number }> = [];

		for (let i = 1; i < profile.length - 1; i++) {
			const prev = signalExtractor(profile[i - 1]!);
			const cur = signalExtractor(profile[i]!);
			const next = signalExtractor(profile[i + 1]!);

			if (cur >= prev && cur >= next && cur >= threshold) {
				peaks.push({
					zIndex: profile[i]!.zIndex,
					zMm: profile[i]!.zMm,
					score: cur,
				});
			}
		}

		return peaks;
	};

	// 1. Primary: Enamel peaks (Dentate patients)
	const enamelPeaks = findPeaks((p) => p.smoothedEnamel, 0.2);
	if (enamelPeaks.length > 0) {
		enamelPeaks.sort((a, b) => a.zMm - b.zMm);
		if (enamelPeaks.length === 1) return enamelPeaks[0]!.zMm;
		return jawType === "mandible" ? enamelPeaks[0]!.zMm : enamelPeaks[enamelPeaks.length - 1]!.zMm;
	}

	// 2. Secondary: Cortical bone peaks (Edentulous with preserved ridge)
	const bonePeaks = findPeaks((p) => p.smoothedBone, 0.25);
	if (bonePeaks.length > 0) {
		bonePeaks.sort((a, b) => a.zMm - b.zMm);
		if (bonePeaks.length === 1) return bonePeaks[0]!.zMm;
		return jawType === "mandible" ? bonePeaks[0]!.zMm : bonePeaks[bonePeaks.length - 1]!.zMm;
	}

	// 3. Tertiary: Cancellous / Trabecular ridge peaks (Severe bone atrophy / Osteoporosis)
	const cancellousPeaks = findPeaks((p) => p.smoothedCancellous, 0.3);
	if (cancellousPeaks.length > 0) {
		cancellousPeaks.sort((a, b) => a.zMm - b.zMm);
		if (cancellousPeaks.length === 1) return cancellousPeaks[0]!.zMm;
		return jawType === "mandible" ? cancellousPeaks[0]!.zMm : cancellousPeaks[cancellousPeaks.length - 1]!.zMm;
	}

	// Fallback to volume Z midpoint
	const midIdx = Math.floor(profile.length / 2);
	return profile[midIdx]?.zMm ?? 0.0;
}

// ─── 2. 2D AXIAL MAXIMUM INTENSITY PROJECTION (MIP) SLAB ENGINE ─────────────

/**
 * Extracts a 2D Axial MIP slab centered around `centerZMm` with the specified physical thickness (typically 12–15 mm).
 * Clips high-density metal artifacts (<= 3500 HU) to preserve fine anatomical ridge boundaries.
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

			// Filter/clip extreme metal spikes <= 3500 HU
			const finalHU = maxHU > 3500 ? 3500 : maxHU < -1000 ? -1000 : maxHU;
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
 * Detects the anatomical dental arch ridge centroids via polar ray casting (-14 deg to +194 deg),
 * applies multi-tier density analysis (enamel >= 2000 HU, cortical bone >= 800 HU, cancellous ridge >= 350 HU),
 * metal artifact clipping (<= 3500 HU), 1D median ray filtering, bilateral symmetry harmonization,
 * and fits 16 standard FDI dental anchors (18..48 / 11..28).
 */
export function detectDentalArchCentroids(
	mip: AxialMIPSlab | { data: Float32Array; width: number; height: number; originMm: Point2D; spacingMm: Point2D },
	jawType: "mandible" | "maxilla" = "mandible",
): DentalArchAnchor[] {
	const defaultAnchors =
		jawType === "mandible" ? DEFAULT_MANDIBULAR_ARCH_ANCHORS : DEFAULT_MAXILLARY_ARCH_ANCHORS;

	const { width, height, originMm, spacingMm } = mip;

	// 1. Scan MIP slab to assess peak density tier across the slab
	let maxMIPHU = -1000;
	for (let i = 0; i < mip.data.length; i++) {
		const hu = mip.data[i] ?? -1000;
		if (hu > maxMIPHU) maxMIPHU = hu;
	}

	// 2. Multi-tier center of mass calculation
	let threshold = 800;
	let baseline = 700;
	let weightPow = 1.5;

	if (maxMIPHU >= 1800) {
		// Tier 1: Enamel dominant
		threshold = 800;
		baseline = 700;
		weightPow = 1.5;
	} else if (maxMIPHU >= 750) {
		// Tier 2: Cortical bone dominant
		threshold = 550;
		baseline = 450;
		weightPow = 1.2;
	} else if (maxMIPHU >= 350) {
		// Tier 3: Edentulous / cancellous ridge dominant
		threshold = 350;
		baseline = 250;
		weightPow = 1.0;
	}

	let totalWeight = 0;
	let weightedX = 0;
	let weightedY = 0;

	for (let y = 0; y < height; y++) {
		const worldY = originMm.y + y * spacingMm.y;
		const rowOffset = y * width;

		for (let x = 0; x < width; x++) {
			const rawHu = mip.data[rowOffset + x] ?? -1000;
			const hu = Math.min(rawHu, 3500);

			if (hu >= threshold) {
				const w = Math.pow(hu - baseline, weightPow);
				totalWeight += w;
				const worldX = originMm.x + x * spacingMm.x;
				weightedX += w * worldX;
				weightedY += w * worldY;
			}
		}
	}

	let jawCenterX = 0.0;
	let jawCenterY = 0.0;
	let hasSignal = false;

	if (totalWeight > 100) {
		const teethCenterX = weightedX / totalWeight;
		const teethCenterY = weightedY / totalWeight;
		jawCenterX = Math.max(-45.0, Math.min(45.0, teethCenterX));
		// The ray origin sits in oral cavity / tongue center ~25 mm posterior to the arch centroid
		jawCenterY = teethCenterY + 25.0;
		hasSignal = true;
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

	// Polar ray tracing density sampler with multi-tier peak centroid detection
	const rayTraceRidge = (theta: number, defaultRadiusMm: number): number => {
		const dirX = -Math.cos(theta);
		const dirY = -Math.sin(theta);

		const minRadius = hasSignal ? 5.0 : Math.max(12.0, defaultRadiusMm - 16.0);
		const maxRadius = hasSignal ? 68.0 : Math.min(80.0, defaultRadiusMm + 16.0);
		const stepR = 0.5;

		const samples: Array<{ r: number; hu: number }> = [];
		let rayMaxHU = -1000;
		let peakR = defaultRadiusMm;

		for (let r = minRadius; r <= maxRadius; r += stepR) {
			const sampleX = jawCenterX + r * dirX;
			const sampleY = jawCenterY + r * dirY;

			const rawHu = sampleMipHUContinuous(mip, sampleX, sampleY);
			const hu = Math.min(rawHu, 3500);
			samples.push({ r, hu });

			if (hu > rayMaxHU) {
				rayMaxHU = hu;
				peakR = r;
			}
		}

		// Determine ray density tier threshold
		let rayThreshold = 1000;
		let rayBase = 700;
		let rayPower = 1.5;

		if (rayMaxHU >= 1800) {
			// Enamel tier (crowns)
			rayThreshold = 1000;
			rayBase = 700;
			rayPower = 1.5;
		} else if (rayMaxHU >= 750) {
			// Cortical bone tier (ridge)
			rayThreshold = 550;
			rayBase = 400;
			rayPower = 1.2;
		} else if (rayMaxHU >= 350) {
			// Cancellous / edentulous ridge tier
			rayThreshold = 320;
			rayBase = 200;
			rayPower = 1.0;
		} else {
			// No significant ridge signal -> fallback to default
			return defaultRadiusMm;
		}

		// Centroid around peak location (window: peakR +/- 6 mm)
		let sumW = 0;
		let sumWR = 0;

		for (const s of samples) {
			if (Math.abs(s.r - peakR) <= 6.0 && s.hu >= rayThreshold) {
				const w = Math.pow(s.hu - rayBase, rayPower);
				sumW += w;
				sumWR += w * s.r;
			}
		}

		if (sumW > 0) {
			return sumWR / sumW;
		}

		return peakR;
	};

	// 3. Detect radii for each anchor
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

	// 4. Robust 1D 3-point Median Filter to eliminate outlier ray spikes
	const medRadii: number[] = new Array(detectedRadii.length);
	for (let i = 0; i < detectedRadii.length; i++) {
		const rPrev = detectedRadii[Math.max(0, i - 1)] ?? detectedRadii[i]!;
		const rCur = detectedRadii[i]!;
		const rNext = detectedRadii[Math.min(detectedRadii.length - 1, i + 1)] ?? detectedRadii[i]!;

		const sorted = [rPrev, rCur, rNext].sort((a, b) => a - b);
		medRadii[i] = sorted[1]!;
	}

	// 5. Anatomical step clamping: limit radius delta between adjacent teeth to <= 8 mm
	for (let i = 1; i < medRadii.length; i++) {
		const diff = medRadii[i]! - medRadii[i - 1]!;
		if (Math.abs(diff) > 8.0) {
			medRadii[i] = medRadii[i - 1]! + Math.sign(diff) * 8.0;
		}
	}
	for (let i = medRadii.length - 2; i >= 0; i--) {
		const diff = medRadii[i]! - medRadii[i + 1]!;
		if (Math.abs(diff) > 8.0) {
			medRadii[i] = medRadii[i + 1]! + Math.sign(diff) * 8.0;
		}
	}

	// 6. Bilateral Symmetry Harmonization (Pairing tooth i with tooth 15 - i)
	// Balances natural individual asymmetry while preventing unilateral metal artifact flare
	const symRadii: number[] = new Array(medRadii.length);
	for (let i = 0; i < 8; i++) {
		const rightIdx = i;
		const leftIdx = 15 - i;
		const rR = medRadii[rightIdx]!;
		const rL = medRadii[leftIdx]!;
		const rMean = 0.5 * (rR + rL);
		const asymDiff = Math.abs(rR - rL);

		if (asymDiff > 12.0) {
			// Severe unilateral asymmetry (metal artifact or major loss) -> strong symmetry pull
			symRadii[rightIdx] = 0.3 * rR + 0.7 * rMean;
			symRadii[leftIdx] = 0.3 * rL + 0.7 * rMean;
		} else {
			// Natural anatomical variance -> gentle cross-regularization
			symRadii[rightIdx] = 0.85 * rR + 0.15 * rMean;
			symRadii[leftIdx] = 0.85 * rL + 0.15 * rMean;
		}
	}

	// 7. 1D Gaussian smoothing ([0.2, 0.6, 0.2]) across the final radii
	const smoothedRadii: number[] = new Array(symRadii.length);
	for (let i = 0; i < symRadii.length; i++) {
		const rPrev = symRadii[Math.max(0, i - 1)] ?? symRadii[i]!;
		const rCur = symRadii[i]!;
		const rNext = symRadii[Math.min(symRadii.length - 1, i + 1)] ?? symRadii[i]!;
		smoothedRadii[i] = 0.2 * rPrev + 0.6 * rCur + 0.2 * rNext;
	}

	// 8. Construct the final 16 FDI dental arch anchors
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
 * Independent of any visual Window/Level/Invert display parameters.
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

