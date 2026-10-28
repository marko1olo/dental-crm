/**
 * Misch Bone Density Profiling & Cross-Section Trilinear HU Sampling Engine
 * Standards: Misch CE (2008), DICOM Part 3, Mandate 8b (<= 200 lines).
 */

import {
	computeHUZoneProfile,
	type HUZoneSampling,
} from "./boneDensityMischMath.js";
import {
	type CbctVoxelVolume,
	sampleVoxelTrilinearHU,
	worldMmToVoxelContinuous,
} from "./cbctMprMath.js";
import type { CrossSectionImplantPose } from "./implantNerveSafetyAudit.js";
import type { Implant3DWorldProjection } from "./implantSafetyEngine.js";

/**
 * Samples cylindrical osteotomy zones (coronal crest, trabecular core, apical engagement)
 * using trilinear sub-voxel HU interpolation from the 3D volume.
 */
export function sampleCrossSectionHUProfile(
	volume?: CbctVoxelVolume | null,
	implantPose?: CrossSectionImplantPose,
	implant3DWorld?: Implant3DWorldProjection | null,
): HUZoneSampling {
	// If a real 3D voxel volume and implant pose are provided, compute true HU via trilinear interpolation
	if (
		volume &&
		volume.data &&
		!volume.isDisposed &&
		volume.dimensions.width > 0 &&
		volume.dimensions.height > 0 &&
		volume.dimensions.depth > 0 &&
		implant3DWorld
	) {
		const { entry3D, apex3D, lengthMm, platformDiameterMm, apexDiameterMm } = implant3DWorld;
		const dx = apex3D.x - entry3D.x;
		const dy = apex3D.y - entry3D.y;
		const dz = apex3D.z - entry3D.z;
		const len = Math.hypot(dx, dy, dz) || lengthMm || 10.0;
		const dir = { x: dx / len, y: dy / len, z: dz / len };

		// Orthogonal basis vectors for cylindrical volume sampling
		const up = Math.abs(dir.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 };
		const n1x = dir.y * up.z - dir.z * up.y;
		const n1y = dir.z * up.x - dir.x * up.z;
		const n1z = dir.x * up.y - dir.y * up.x;
		const n1Len = Math.hypot(n1x, n1y, n1z) || 1.0;
		const n1 = { x: n1x / n1Len, y: n1y / n1Len, z: n1z / n1Len };

		const n2x = dir.y * n1.z - dir.z * n1.y;
		const n2y = dir.z * n1.x - dir.x * n1.z;
		const n2z = dir.x * n1.y - dir.y * n1.x;
		const n2 = { x: n2x, y: n2y, z: n2z };

		const sampleAt = (sMm: number, radialFraction: number, angleRad: number): number => {
			const sRatio = Math.max(0, Math.min(1, sMm / len));
			const currentRadius = (platformDiameterMm / 2.0) * (1 - sRatio) + (apexDiameterMm / 2.0) * sRatio;
			const r = currentRadius * radialFraction;

			const px = entry3D.x + dir.x * sMm + r * (Math.cos(angleRad) * n1.x + Math.sin(angleRad) * n2.x);
			const py = entry3D.y + dir.y * sMm + r * (Math.cos(angleRad) * n1.y + Math.sin(angleRad) * n2.y);
			const pz = entry3D.z + dir.z * sMm + r * (Math.cos(angleRad) * n1.z + Math.sin(angleRad) * n2.z);

			const vox = worldMmToVoxelContinuous({ x: px, y: py, z: pz }, volume);
			return sampleVoxelTrilinearHU(vox.x, vox.y, vox.z, volume);
		};

		// 1. Coronal Crestal Zone (0..20% length): 5 depth steps, central + 4 radial probes
		const coronalSamples: number[] = [];
		const coronalSteps = [0.04 * len, 0.08 * len, 0.12 * len, 0.16 * len, 0.20 * len];
		for (const s of coronalSteps) {
			coronalSamples.push(sampleAt(s, 0.0, 0));
			for (let a = 0; a < 4; a++) {
				coronalSamples.push(sampleAt(s, 0.7, (a * Math.PI) / 2));
			}
		}

		// 2. Trabecular Core Zone (25..75% length): 6 depth steps, central + 4 radial probes
		const trabecularSamples: number[] = [];
		const trabecularSteps = [0.25 * len, 0.35 * len, 0.45 * len, 0.55 * len, 0.65 * len, 0.75 * len];
		for (const s of trabecularSteps) {
			trabecularSamples.push(sampleAt(s, 0.0, 0));
			for (let a = 0; a < 4; a++) {
				trabecularSamples.push(sampleAt(s, 0.5, (a * Math.PI) / 2 + Math.PI / 4));
			}
		}

		// 3. Apical Engagement Zone (80..100% length): 4 depth steps, central + 4 radial probes
		const apicalSamples: number[] = [];
		const apicalSteps = [0.80 * len, 0.86 * len, 0.93 * len, 1.00 * len];
		for (const s of apicalSteps) {
			apicalSamples.push(sampleAt(s, 0.0, 0));
			for (let a = 0; a < 4; a++) {
				apicalSamples.push(sampleAt(s, 0.6, (a * Math.PI) / 2));
			}
		}

		const calcAverageHU = (samples: number[]): number => {
			if (samples.length === 0) return 0;
			const validSamples = samples.filter((v) => v > -600);
			const pool = validSamples.length >= 3 ? validSamples : samples;
			const sum = pool.reduce((acc, val) => acc + val, 0);
			return Math.round(sum / pool.length);
		};

		const coronalHU = calcAverageHU(coronalSamples);
		const trabecularHU = calcAverageHU(trabecularSamples);
		const apicalHU = calcAverageHU(apicalSamples);

		if (coronalHU > -400 || trabecularHU > -400 || apicalHU > -400) {
			return computeHUZoneProfile(
				coronalHU,
				trabecularHU,
				apicalHU,
				"measured",
			);
		}
	}

	// Clinical honest state: when CBCT volume is absent or area is unmeasured,
	// return unmeasured status. Never generate fake D1/D2 bone density!
	return {
		coronalCrestalHU: 0,
		trabecularCoreHU: 0,
		apicalBaseHU: 0,
		overallMeanHU: 0,
		status: "unmeasured",
	};
}
