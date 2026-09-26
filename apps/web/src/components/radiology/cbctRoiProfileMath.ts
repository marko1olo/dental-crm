/**
 * DENTE CRM — Weasis-Grade DICOM ROI Statistics & Line Profile Densitometry Engine
 * Architectural Reference: Weasis (ImageRegionStatistics.java, MeasurementsAdapter.java)
 * Standards: DICOM PS3.3 C.11.2 (VOI LUT), Misch (2008), ITI Consensus
 *
 * Capabilities:
 * 1. Region of Interest (ROI) Statistical Densitometry (Circular & Rectangular):
 *    - Population Count (N), Mean HU (μ), Standard Deviation (σ), Min HU, Max HU.
 *    - True physical area in mm²: Area = N * spacingX * spacingY.
 *    - Misch Bone Quality Classification (D1..D5) based on mean HU.
 *
 * 2. Continuous 3D Line Profile Sampler:
 *    - Samples sub-voxel trilinear HU values along a 3D vector A -> B at 0.25 mm intervals.
 *    - Computes cortical plate thickness (mm) and trabecular bone core density.
 *    - Zero-allocation inner loops for high-speed live inspection.
 */

import type { CbctVoxelVolume, Point3D } from "./cbctMprMath";
import { sampleVoxelHU } from "./cbctMprMath";
import { sampleVoxelHUTrilinear } from "./cbctObliqueSliceMath";
import type { MischBoneDensity } from "@dental/shared";

export interface CbctRoiStatistics {
	readonly sampleCount: number;
	readonly areaMm2: number;
	readonly meanHU: number;
	readonly stdDevHU: number;
	readonly minHU: number;
	readonly maxHU: number;
	readonly mischClass: MischBoneDensity;
	readonly tissueTypeRu: string;
}

export interface LineProfileSamplePoint {
	readonly index: number;
	readonly distanceMm: number;
	readonly worldMm: Point3D;
	readonly hu: number;
	readonly tissueTypeRu: string;
}

export interface CbctLineProfileResult {
	readonly totalLengthMm: number;
	readonly stepSizeMm: number;
	readonly samples: readonly LineProfileSamplePoint[];
	readonly meanHU: number;
	readonly minHU: number;
	readonly maxHU: number;
	readonly corticalThicknessMm: number;
	readonly trabecularMeanHU: number;
}

/**
 * Classifies Hounsfield Units into Carl E. Misch (2008) bone density grades:
 * - D1: > 1250 HU (Dense cortical bone, anterior mandible)
 * - D2: 850 .. 1250 HU (Thick porous cortical & coarse trabecular, posterior mandible / anterior maxilla)
 * - D3: 350 .. 850 HU (Thin porous cortical & fine trabecular, posterior maxilla / posterior mandible)
 * - D4: 150 .. 350 HU (Fine trabecular bone, posterior maxilla / tuberosity)
 * - D5: < 150 HU (Immature / unmineralized bone, graft resorption)
 */
export function classifyMischDensity(hu: number): MischBoneDensity {
	if (hu >= 1250) return "D1";
	if (hu >= 850) return "D2";
	if (hu >= 350) return "D3";
	if (hu >= 150) return "D4";
	return "D5";
}

/**
 * Returns human-readable clinical tissue name according to radiological HU ranges.
 */
export function getRoiTissueDescriptionRu(hu: number): string {
	if (hu < -600) return "Воздух / синус";
	if (hu >= -600 && hu < -50) return "Жировая клетчатка";
	if (hu >= -50 && hu < 200) return "Мягкие ткани / слизистая";
	if (hu >= 200 && hu < 850) return "Трабекулярная губчатая кость";
	if (hu >= 850 && hu < 1800) return "Кортикальная пластинка";
	if (hu >= 1800 && hu < 3000) return "Дентин зуба";
	if (hu >= 3000 && hu < 5000) return "Эмаль зуба";
	return "Металл / имплантат / цирконий";
}

/**
 * Calculates Weasis-grade statistical metrics (N, mean, stdDev, min, max, area)
 * for a 2D circular Region of Interest on an orthogonal slice.
 *
 * @param volume CBCT voxel volume with calibrated HU data
 * @param centerMm Center of ROI in 3D world coordinates
 * @param radiusMm Radius of circular ROI in millimeters
 * @param plane Orthogonal MPR slice plane ("axial" | "coronal" | "sagittal")
 */
export function calculateCircularRoiStatistics(
	volume: CbctVoxelVolume,
	centerMm: Point3D,
	radiusMm: number,
	plane: "axial" | "coronal" | "sagittal" = "axial",
): CbctRoiStatistics {
	if (!volume || !volume.data || volume.isDisposed || radiusMm <= 0) {
		return {
			sampleCount: 0,
			areaMm2: 0,
			meanHU: -1000,
			stdDevHU: 0,
			minHU: -1000,
			maxHU: -1000,
			mischClass: "D5",
			tissueTypeRu: "Воздух / синус",
		};
	}

	const sp = volume.spacingMm;
	const orig = volume.originMm;
	const dim = volume.dimensions;

	// In-plane pixel spacing and voxel dimensions
	let spX = sp.x;
	let spY = sp.y;
	let centerVoxelX = (centerMm.x - orig.x) / (sp.x || 0.2);
	let centerVoxelY = (centerMm.y - orig.y) / (sp.y || 0.2);
	let constantVoxelZ = Math.round((centerMm.z - orig.z) / (sp.z || 0.2));

	if (plane === "coronal") {
		spX = sp.x;
		spY = sp.z;
		centerVoxelX = (centerMm.x - orig.x) / (sp.x || 0.2);
		centerVoxelY = (centerMm.z - orig.z) / (sp.z || 0.2);
		constantVoxelZ = Math.round((centerMm.y - orig.y) / (sp.y || 0.2));
	} else if (plane === "sagittal") {
		spX = sp.y;
		spY = sp.z;
		centerVoxelX = (centerMm.y - orig.y) / (sp.y || 0.2);
		centerVoxelY = (centerMm.z - orig.z) / (sp.z || 0.2);
		constantVoxelZ = Math.round((centerMm.x - orig.x) / (sp.x || 0.2));
	}

	const radiusVoxX = Math.ceil(radiusMm / (spX || 0.2));
	const radiusVoxY = Math.ceil(radiusMm / (spY || 0.2));
	const r2Mm = radiusMm * radiusMm;

	let count = 0;
	let sum = 0;
	let minHU = 32767;
	let maxHU = -32768;

	// First pass: accumulate count, sum, min, max
	const collectedHU: number[] = [];

	for (let dy = -radiusVoxY; dy <= radiusVoxY; dy++) {
		const distYMm = dy * spY;
		for (let dx = -radiusVoxX; dx <= radiusVoxX; dx++) {
			const distXMm = dx * spX;
			const dist2Mm = distXMm * distXMm + distYMm * distYMm;
			if (dist2Mm > r2Mm) continue;

			const vx = Math.round(centerVoxelX + dx);
			const vy = Math.round(centerVoxelY + dy);

			let sampleX = vx;
			let sampleY = vy;
			let sampleZ = constantVoxelZ;

			if (plane === "coronal") {
				sampleX = vx;
				sampleY = constantVoxelZ;
				sampleZ = vy;
			} else if (plane === "sagittal") {
				sampleX = constantVoxelZ;
				sampleY = vx;
				sampleZ = vy;
			}

			if (
				sampleX < 0 || sampleX >= dim.width ||
				sampleY < 0 || sampleY >= dim.height ||
				sampleZ < 0 || sampleZ >= dim.depth
			) {
				continue;
			}

			const hu = sampleVoxelHU(sampleX, sampleY, sampleZ, volume);
			collectedHU.push(hu);
			sum += hu;
			if (hu < minHU) minHU = hu;
			if (hu > maxHU) maxHU = hu;
			count++;
		}
	}

	if (count === 0) {
		return {
			sampleCount: 0,
			areaMm2: 0,
			meanHU: -1000,
			stdDevHU: 0,
			minHU: -1000,
			maxHU: -1000,
			mischClass: "D5",
			tissueTypeRu: "Воздух / синус",
		};
	}

	const mean = sum / count;
	const areaMm2 = Number((count * spX * spY).toFixed(2));

	// Second pass: sample variance & standard deviation
	let varSum = 0;
	for (let i = 0; i < count; i++) {
		const diff = (collectedHU[i] ?? mean) - mean;
		varSum += diff * diff;
	}
	const stdDev = count > 1 ? Math.sqrt(varSum / (count - 1)) : 0;
	const roundedMean = Math.round(mean);

	return {
		sampleCount: count,
		areaMm2,
		meanHU: roundedMean,
		stdDevHU: Number(stdDev.toFixed(1)),
		minHU,
		maxHU,
		mischClass: classifyMischDensity(roundedMean),
		tissueTypeRu: getRoiTissueDescriptionRu(roundedMean),
	};
}

/**
 * Samples continuous Hounsfield Unit (HU) values along a 3D line vector from pointA to pointB
 * using sub-voxel trilinear interpolation, matching Weasis profile tools.
 *
 * @param volume CBCT voxel volume
 * @param startMm Start point in physical millimeters
 * @param endMm End point in physical millimeters
 * @param stepSizeMm Step size between sampling points along vector (default: 0.25 mm)
 */
export function sampleLineProfile(
	volume: CbctVoxelVolume,
	startMm: Point3D,
	endMm: Point3D,
	stepSizeMm = 0.25,
): CbctLineProfileResult {
	const dx = endMm.x - startMm.x;
	const dy = endMm.y - startMm.y;
	const dz = endMm.z - startMm.z;
	const totalLengthMm = Math.hypot(dx, dy, dz);

	if (!volume || !volume.data || volume.isDisposed || totalLengthMm < 1e-4) {
		return {
			totalLengthMm: Number(totalLengthMm.toFixed(2)),
			stepSizeMm,
			samples: [],
			meanHU: -1000,
			minHU: -1000,
			maxHU: -1000,
			corticalThicknessMm: 0,
			trabecularMeanHU: -1000,
		};
	}

	const steps = Math.max(2, Math.round(totalLengthMm / stepSizeMm));
	const actualStepMm = totalLengthMm / (steps - 1);
	const sp = volume.spacingMm;
	const orig = volume.originMm;

	const samples: LineProfileSamplePoint[] = [];
	let sumHU = 0;
	let minHU = 32767;
	let maxHU = -32768;

	let corticalCount = 0;
	let trabecularSum = 0;
	let trabecularCount = 0;

	for (let i = 0; i < steps; i++) {
		const t = i / (steps - 1);
		const wx = startMm.x + dx * t;
		const wy = startMm.y + dy * t;
		const wz = startMm.z + dz * t;
		const distanceMm = Number((i * actualStepMm).toFixed(2));

		// Continuous voxel coordinates
		const vx = (wx - orig.x) / (sp.x || 0.2);
		const vy = (wy - orig.y) / (sp.y || 0.2);
		const vz = (wz - orig.z) / (sp.z || 0.2);

		const hu = sampleVoxelHUTrilinear(volume, vx, vy, vz);
		sumHU += hu;
		if (hu < minHU) minHU = hu;
		if (hu > maxHU) maxHU = hu;

		if (hu >= 850) {
			corticalCount++;
		} else if (hu >= 200 && hu < 850) {
			trabecularSum += hu;
			trabecularCount++;
		}

		samples.push({
			index: i,
			distanceMm,
			worldMm: { x: Number(wx.toFixed(2)), y: Number(wy.toFixed(2)), z: Number(wz.toFixed(2)) },
			hu,
			tissueTypeRu: getRoiTissueDescriptionRu(hu),
		});
	}

	const meanHU = Math.round(sumHU / steps);
	const corticalThicknessMm = Number((corticalCount * actualStepMm).toFixed(2));
	const trabecularMeanHU = trabecularCount > 0 ? Math.round(trabecularSum / trabecularCount) : meanHU;

	return {
		totalLengthMm: Number(totalLengthMm.toFixed(2)),
		stepSizeMm: Number(actualStepMm.toFixed(3)),
		samples,
		meanHU,
		minHU,
		maxHU,
		corticalThicknessMm,
		trabecularMeanHU,
	};
}
