/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT RADIOLOGY: FAST MARCHING COST FIELD & LANDMARK CALCULATOR
 * ═══════════════════════════════════════════════════════════════════════════
 * Calculates the anisotropic speed cost map V(x) combining Frangi tubeness,
 * radicular dentin envelopes, and soft tissue/air lumen penalties.
 * Identifies anatomical pulp chamber floor orifices and apical foramina.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { CbctVoxelVolume } from "../cbctCropBox.js";
import { isCanalLumenHU, type FrangiVolumeResult } from "../endoCanalFrangiEngine.js";
import {
	voxelToWorldMm,
	type OrificePoint,
	type ApicalForamen,
	type FastMarchingTraceOptions,
	type OrificeCandidateFilter,
	DEFAULT_TRACE_OPTIONS,
} from "./types.js";

// ── Analytical Pulp Chamber Floor & Orifice Detection ─────────────

/**
 * Detects pulp chamber floor and canal orifices by locating local funnels of high Frangi tubeness
 * and hypodense soft tissue/air inside the radicular dentin envelope.
 */
export function detectCanalOrifices(
	frangiResult: FrangiVolumeResult,
	volume: CbctVoxelVolume,
	filter: OrificeCandidateFilter = {},
): OrificePoint[] {
	if (!volume.data) {
		return [];
	}

	const dims = frangiResult.dimensions;
	const spacing = frangiResult.spacingMm;
	const minInterDistMm = filter.minInterOrificeDistMm ?? 1.5;
	const maxCount = filter.maxCanalCount ?? 4;

	// Step 1: Find Z-level of coronal pulp chamber and floor of the pulp chamber.
	// We compute slice-by-slice enclosed pulp lumen area within the tooth cross section.
	const slicePulpCount = new Int32Array(dims.depth);
	const sliceStride = dims.width * dims.height;

	for (let z = 0; z < dims.depth; z++) {
		const zOff = z * sliceStride;
		let pulpCount = 0;
		for (let y = 1; y < dims.height - 1; y++) {
			const yOff = zOff + y * dims.width;
			for (let x = 1; x < dims.width - 1; x++) {
				const idx = yOff + x;
				const hu = volume.data[idx] ?? -1000;
				if (isCanalLumenHU(hu)) {
					// Check if bounded by dentin in X and Y
					let hasLeft = false;
					let hasRight = false;
					let hasUp = false;
					let hasDown = false;
					for (let tx = 0; tx < x; tx++) {
						if (frangiResult.dentinMask[yOff + tx] === 1) { hasLeft = true; break; }
					}
					for (let tx = x + 1; tx < dims.width; tx++) {
						if (frangiResult.dentinMask[yOff + tx] === 1) { hasRight = true; break; }
					}
					for (let ty = 0; ty < y; ty++) {
						if (frangiResult.dentinMask[zOff + ty * dims.width + x] === 1) { hasUp = true; break; }
					}
					for (let ty = y + 1; ty < dims.height; ty++) {
						if (frangiResult.dentinMask[zOff + ty * dims.width + x] === 1) { hasDown = true; break; }
					}
					if (hasLeft && hasRight && hasUp && hasDown) {
						pulpCount++;
					}
				}
			}
		}
		slicePulpCount[z] = pulpCount;
	}

	// Find the peak coronal pulp area in the coronal portion (z >= 25% of depth)
	const minCoronalZ = Math.max(1, Math.floor(dims.depth * 0.25));
	const maxCoronalZ = Math.min(dims.depth - 2, Math.floor(dims.depth * 0.85));
	let maxPulpSliceZ = minCoronalZ;
	let maxPulpVoxels = 0;
	for (let z = minCoronalZ; z <= maxCoronalZ; z++) {
		const count = slicePulpCount[z] ?? 0;
		if (count > maxPulpVoxels) {
			maxPulpVoxels = count;
			maxPulpSliceZ = z;
		}
	}

	if (maxPulpVoxels === 0) {
		maxPulpSliceZ = Math.floor(dims.depth * 0.55);
	}

	// Search for pulpal floor: orifices funnel from pulp chamber towards roots (z slightly below maxPulpSliceZ)
	const searchZRadius = Math.max(3, Math.ceil(3.5 / Math.max(1e-3, spacing.z)));
	const minZ = Math.max(1, maxPulpSliceZ - searchZRadius);
	const maxZ = Math.min(dims.depth - 2, maxPulpSliceZ + Math.ceil(1.5 / Math.max(1e-3, spacing.z)));

	interface Candidate {
		x: number;
		y: number;
		z: number;
		tubeness: number;
		hu: number;
		score: number;
	}

	const candidates: Candidate[] = [];

	for (let z = minZ; z <= maxZ; z++) {
		const zOff = z * sliceStride;
		for (let y = 1; y < dims.height - 1; y++) {
			const yOff = zOff + y * dims.width;
			for (let x = 1; x < dims.width - 1; x++) {
				const idx = yOff + x;
				const tubeness = frangiResult.tubeness[idx] ?? 0;

				if (tubeness < 0.1) continue;

				const hu = volume.data[idx] ?? -1000;
				// Orifices are hypodense lumens
				if (hu > 900) continue;

				// Local 3x3 maximum test in slice
				let isMax = true;
				for (let dy = -1; dy <= 1; dy++) {
					for (let dx = -1; dx <= 1; dx++) {
						if (dx === 0 && dy === 0) continue;
						const nIdx = idx + dy * dims.width + dx;
						if ((frangiResult.tubeness[nIdx] ?? 0) > tubeness) {
							isMax = false;
							break;
						}
					}
					if (!isMax) break;
				}

				if (isMax) {
					// Combined score: high tubeness and negative correlation with dentin HU
					const score = tubeness * (1.0 + Math.max(0, (900 - hu) / 600));
					candidates.push({ x, y, z, tubeness, hu, score });
				}
			}
		}
	}

	// Sort candidates by score descending
	candidates.sort((a, b) => b.score - a.score);

	// Non-maximum suppression with spatial distance clustering
	const selected: OrificePoint[] = [];
	const canalLabels = ["MB1", "ML", "DB", "P", "MB2", "D", "B", "L"];

	for (const cand of candidates) {
		const worldPos = voxelToWorldMm(cand.x, cand.y, cand.z, spacing, volume.originMm);

		let isTooClose = false;
		for (const prev of selected) {
			const dx = worldPos[0] - prev.worldPositionMm[0];
			const dy = worldPos[1] - prev.worldPositionMm[1];
			const dz = worldPos[2] - prev.worldPositionMm[2];
			const distMm = Math.hypot(dx, dy, dz);

			if (distMm < minInterDistMm) {
				isTooClose = true;
				break;
			}
		}

		if (!isTooClose) {
			const label = canalLabels[selected.length] ?? `Canal_${selected.length + 1}`;
			selected.push({
				id: `orifice_${selected.length + 1}`,
				canalName: label,
				worldPositionMm: worldPos,
				voxelCoordinates: [cand.x, cand.y, cand.z],
				tubeness: cand.tubeness,
				hu: cand.hu,
				estimatedDiameterMm: Math.max(0.4, (frangiResult.bestScaleMm[cand.z * sliceStride + cand.y * dims.width + cand.x] ?? 0.6) * 1.5),
			});

			if (selected.length >= maxCount) {
				break;
			}
		}
	}

	return selected;
}

// ── Root Apex & Apical Foramen Detection ──────────────────────────

/**
 * Detects the root apex and apical foramen by finding the radicular extremity of the dentin root
 * and locating the canal exit lumen.
 */
export function detectApicalForamina(
	frangiResult: FrangiVolumeResult,
	volume: CbctVoxelVolume,
	expectedCount = 1,
): ApicalForamen[] {
	if (!volume.data) return [];

	const dims = frangiResult.dimensions;
	const spacing = frangiResult.spacingMm;
	const sliceStride = dims.width * dims.height;

	// In dental CBCT (mandible or maxilla), root apices lie at the extreme Z slices of the dentin mask.
	// Find the bounding slices containing radicular dentin
	let minDentinZ = dims.depth - 1;
	let maxDentinZ = 0;

	for (let z = 0; z < dims.depth; z++) {
		const zOff = z * sliceStride;
		for (let i = 0; i < sliceStride; i++) {
			if (frangiResult.dentinMask[zOff + i] === 1) {
				if (z < minDentinZ) minDentinZ = z;
				if (z > maxDentinZ) maxDentinZ = z;
				break;
			}
		}
	}

	if (minDentinZ > maxDentinZ) {
		return [];
	}

	// Determine whether apex is towards minZ (mandible) or maxZ (maxilla)
	// by comparing dentin cross-section area (apices have smaller cross-section area than crowns)
	let areaMinZ = 0;
	let areaMaxZ = 0;
	const checkDepth = Math.max(4, Math.min(22, Math.floor((maxDentinZ - minDentinZ) * 0.35)));

	for (let z = minDentinZ; z <= minDentinZ + Math.min(5, checkDepth); z++) {
		for (let i = 0; i < sliceStride; i++) {
			if (frangiResult.dentinMask[z * sliceStride + i] === 1) areaMinZ++;
		}
	}
	for (let z = maxDentinZ - Math.min(5, checkDepth); z <= maxDentinZ; z++) {
		for (let i = 0; i < sliceStride; i++) {
			if (frangiResult.dentinMask[z * sliceStride + i] === 1) areaMaxZ++;
		}
	}

	// Apical region has smaller dentin cross section
	const apicalIsAtMinZ = areaMinZ < areaMaxZ;
	const apicalZStart = apicalIsAtMinZ ? minDentinZ : Math.max(0, maxDentinZ - checkDepth);
	const apicalZEnd = apicalIsAtMinZ ? Math.min(dims.depth - 1, minDentinZ + checkDepth) : maxDentinZ;

	interface ApexCandidate {
		x: number;
		y: number;
		z: number;
		tubeness: number;
		hu: number;
		score: number;
	}

	const candidates: ApexCandidate[] = [];

	for (let z = apicalZStart; z <= apicalZEnd; z++) {
		const zOff = z * sliceStride;
		for (let y = 1; y < dims.height - 1; y++) {
			const yOff = zOff + y * dims.width;
			for (let x = 1; x < dims.width - 1; x++) {
				const idx = yOff + x;
				const hu = volume.data[idx] ?? -1000;
				const tubeness = frangiResult.tubeness[idx] ?? 0;

				// Apex foramen: dentin/pdl junction with lumen
				if (hu <= 1100 && hu >= -350) {
					const distFromTip = apicalIsAtMinZ ? z - minDentinZ : maxDentinZ - z;
					const score = tubeness * 2.0 + 1.0 / (distFromTip + 1.0);
					candidates.push({ x, y, z, tubeness, hu, score });
				}
			}
		}
	}

	candidates.sort((a, b) => b.score - a.score);

	const apices: ApicalForamen[] = [];
	const minInterApexDistMm = 2.0;

	for (const cand of candidates) {
		const worldPos = voxelToWorldMm(cand.x, cand.y, cand.z, spacing, volume.originMm);

		let tooClose = false;
		for (const prev of apices) {
			const dx = worldPos[0] - prev.worldPositionMm[0];
			const dy = worldPos[1] - prev.worldPositionMm[1];
			const dz = worldPos[2] - prev.worldPositionMm[2];
			if (Math.hypot(dx, dy, dz) < minInterApexDistMm) {
				tooClose = true;
				break;
			}
		}

		if (!tooClose) {
			apices.push({
				id: `apex_${apices.length + 1}`,
				canalName: `Apex_${apices.length + 1}`,
				worldPositionMm: worldPos,
				voxelCoordinates: [cand.x, cand.y, cand.z],
				tubeness: cand.tubeness,
				hu: cand.hu,
			});

			if (apices.length >= expectedCount) break;
		}
	}

	return apices;
}

// ── Speed Map Computation ─────────────────────────────────────────

/**
 * Computes the speed map V(x) across the subvolume:
 * V(x) = V_frangi(x) * exp(-(max(0, I(x) - 1100) / 400)^2) * 1_dentin(x)
 */
export function computeSpeedMap(
	frangiResult: FrangiVolumeResult,
	volume: CbctVoxelVolume,
	options: FastMarchingTraceOptions = DEFAULT_TRACE_OPTIONS,
): Float32Array {
	if (!volume.data) throw new Error("Volume data is null");

	const totalVoxels = frangiResult.dimensions.width * frangiResult.dimensions.height * frangiResult.dimensions.depth;
	const speed = new Float32Array(totalVoxels);
	const cutoffHU = options.dentinPenaltyCutoffHU;
	const scaleHU = options.dentinPenaltyScaleHU;
	const minEps = options.minSpeedEpsilon;

	for (let i = 0; i < totalVoxels; i++) {
		const tubeness = frangiResult.tubeness[i] ?? 0;
		const hu = volume.data[i] ?? -1000;
		const inDentin = frangiResult.dentinMask[i] === 1;

		// Soft dentin penalty: drops exponentially as HU exceeds cutoffHU (1100)
		const excessHU = Math.max(0, hu - cutoffHU);
		const dentinPenalty = Math.exp(-((excessHU / scaleHU) * (excessHU / scaleHU)));

		// Base travel speed
		let s = tubeness * dentinPenalty;

		// Boundary indicator: if outside dentin mask and not hypodense lumen, heavily penalize
		if (!inDentin && !isCanalLumenHU(hu)) {
			s *= 0.01;
		}

		speed[i] = Math.max(minEps, s);
	}

	return speed;
}
