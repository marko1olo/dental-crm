/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT BONE QUALITY ENGINE — CORTICAL & CANCELLOUS PROFILER (LAYER 1)
 * ═══════════════════════════════════════════════════════════════════════════
 * Volumetric 3D sampling along implant trajectories, concentric mantle evaluation,
 * cortical shell thickness measurement, trabecular bone core densitometry,
 * and Lekholm & Zarb morphological classification (Type I..Type IV).
 *
 * 100% pure TypeScript, zero DOM/VTK dependencies.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { trilinear, AIR_HU, type VolumeSamplingData, type Vec3 } from "../cprMath.js";
import { cross3, normalize3, len3 } from "../implantGeometryEngine.js";
import {
	boneSamplingConfigSchema,
	type BoneSiteAssessment,
	type SampleImplantSiteBoneQualityParams,
	type BoneSample,
	type HUZoneProfile,
	type LekholmZarbType,
} from "./types.js";
import { classifyMischBone, getMischBoneClinicalGuidance } from "./boneDensityClassifier.js";
import { determineOsteotomyProtocol } from "./implantStabilityPredictor.js";

/**
 * Classifies bone architecture according to Lekholm & Zarb (1985) based on
 * measured cortical plate thickness and trabecular core density.
 *
 * - Type I:   Cortical thickness >= 2.5 mm OR trabecular density >= 1000 HU (homogeneous compact)
 * - Type II:  Cortical thickness >= 1.5 mm AND trabecular density >= 500 HU (thick cortex + dense core)
 * - Type III: Cortical thickness < 1.5 mm AND trabecular density >= 400 HU (thin cortex + dense core),
 *             OR thick cortex with moderate core
 * - Type IV:  Cortical thickness < 1.5 mm AND trabecular density < 400 HU (thin cortex + sparse core)
 */
export function classifyLekholmZarb(
	corticalThicknessMm: number,
	trabecularHU: number,
): LekholmZarbType {
	if (corticalThicknessMm >= 2.5 || trabecularHU >= 1000) {
		return "Type_I";
	}
	if (corticalThicknessMm >= 1.5) {
		return trabecularHU >= 500 ? "Type_II" : "Type_III";
	}
	return trabecularHU >= 400 ? "Type_III" : "Type_IV";
}

/**
 * Calculates cortical thickness in millimeters from linear ray samples.
 * Samples are evaluated starting from the initial crest surface inward.
 * Evaluates contiguous run of samples meeting or exceeding corticalThresholdHU.
 * If initial crest surface is below threshold, cortical thickness is 0.
 */
export function calculateCorticalThickness(
	crestSamples: number[],
	voxelSpacingMm: number,
	corticalThresholdHU = 700,
): number {
	if (!crestSamples || crestSamples.length === 0 || voxelSpacingMm <= 0) {
		return 0;
	}

	const first = crestSamples[0];
	if (first === undefined || first === null || isNaN(first) || first < corticalThresholdHU) {
		return 0;
	}

	let contiguousCount = 0;
	for (let i = 0; i < crestSamples.length; i++) {
		const val = crestSamples[i];
		if (val !== undefined && val !== null && !isNaN(val) && val >= corticalThresholdHU) {
			contiguousCount++;
		} else {
			break;
		}
	}

	const thickness = contiguousCount * voxelSpacingMm;
	return Math.round(thickness * 100) / 100;
}

/**
 * Extract HU zone profile from an array of HU samples along the implant axis.
 * Expects samples ordered from coronal neck (crest) to apical tip.
 */
export function extractHUZones(huSamples: number[]): HUZoneProfile {
	if (huSamples.length === 0) {
		return { corticalHU: 0, cancellousHU: 0, apicalHU: 0 };
	}

	const n = huSamples.length;
	const corticalCount = Math.max(1, Math.round(n * 0.2));
	const apicalCount = Math.max(1, Math.round(n * 0.2));

	// Neck zone = first 20% (cortical plate at top)
	const corticalSamples = huSamples.slice(0, corticalCount);
	// Apical zone = last 20%
	const apicalSamples = huSamples.slice(n - apicalCount);
	// Middle zone = cancellous
	const cancellousSamples = huSamples.slice(corticalCount, n - apicalCount);

	const avg = (arr: number[]) =>
		arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;

	return {
		corticalHU: avg(corticalSamples),
		cancellousHU: avg(
			cancellousSamples.length > 0 ? cancellousSamples : huSamples,
		),
		apicalHU: avg(apicalSamples),
	};
}

/** Sample one world coordinate; returns null when coordinates fall outside bounds. */
function sampleWorldVoxel(vol: VolumeSamplingData, x: number, y: number, z: number): number | null {
	const ci = (x - vol.origin[0]) * vol.invSx;
	const cj = (y - vol.origin[1]) * vol.invSy;
	const ck = (z - vol.origin[2]) * vol.invSz;

	if (
		ci < 0 ||
		cj < 0 ||
		ck < 0 ||
		ci >= vol.dims[0] - 1 ||
		cj >= vol.dims[1] - 1 ||
		ck >= vol.dims[2] - 1
	) {
		return null;
	}

	const val = trilinear(vol.getVoxel, vol.dims, ci, cj, ck);
	if (val === null || val === undefined || isNaN(val) || val <= AIR_HU) {
		return null;
	}
	return val;
}

/** Sample one world point; returns null when coordinates fall outside the volume bounding box */
function sampleWorldPoint(
	vol: VolumeSamplingData,
	x: number,
	y: number,
	z: number,
): number | null {
	const ci = (x - vol.origin[0]) * vol.invSx;
	const cj = (y - vol.origin[1]) * vol.invSy;
	const ck = (z - vol.origin[2]) * vol.invSz;

	if (
		ci < 0 ||
		cj < 0 ||
		ck < 0 ||
		ci >= vol.dims[0] - 1 ||
		cj >= vol.dims[1] - 1 ||
		ck >= vol.dims[2] - 1
	) {
		return null;
	}

	return trilinear(vol.getVoxel, vol.dims, ci, cj, ck);
}

/**
 * Performs discrete 3D volumetric sampling along the implant vector and concentric
 * radial mantle to evaluate cortical thickness, trabecular density, Misch class,
 * Lekholm-Zarb type, and osteotomy recommendations.
 */
export function sampleImplantSiteBoneQuality(
	params: SampleImplantSiteBoneQualityParams,
): BoneSiteAssessment {
	const { vol, entry, apex, radiusMm } = params;
	const config = boneSamplingConfigSchema.parse(params.config ?? {});
	const implantId = params.implantId ?? "IMP-PLAN-01";
	const toothNumber = params.toothNumber ?? 36;

	const dir: Vec3 = [
		apex[0] - entry[0],
		apex[1] - entry[1],
		apex[2] - entry[2],
	];
	const len = len3(dir);

	// Degenerate geometry guard
	if (len < 1e-6) {
		const defaultRec = determineOsteotomyProtocol("D5", 0);
		return {
			implantId,
			toothNumber,
			meanHU: 0,
			mischClass: "D5",
			lekholmZarbType: "Type_IV",
			corticalThicknessCrestMm: 0,
			corticalThicknessApicalMm: 0,
			trabecularDensityHU: 0,
			osteotomyRecommendation: defaultRec,
			sampleCount: 0,
			minHU: 0,
			maxHU: 0,
			stdDevHU: 0,
			assessmentDate: new Date().toISOString().slice(0, 10),
		};
	}

	const u = normalize3(dir);
	const ref: Vec3 = Math.abs(u[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
	const p1 = normalize3(cross3(u, ref));
	const p2 = normalize3(cross3(u, p1));
	const rr = Math.max(0.1, radiusMm * config.radialFraction);

	const allSamples: number[] = [];
	const trabecularSamples: number[] = [];
	let minHU = Infinity;
	let maxHU = -Infinity;

	// Centerline and radial cylinder sampling
	for (let a = 0; a <= config.axialSteps; a++) {
		const t = a / config.axialSteps;
		const cx = entry[0] + dir[0] * t;
		const cy = entry[1] + dir[1] * t;
		const cz = entry[2] + dir[2] * t;

		const cVal = sampleWorldVoxel(vol, cx, cy, cz);
		if (cVal !== null) {
			allSamples.push(cVal);
			if (cVal < minHU) minHU = cVal;
			if (cVal > maxHU) maxHU = cVal;
			if (t >= 0.2 && t <= 0.8) {
				trabecularSamples.push(cVal);
			}
		}

		for (let r = 0; r < config.radialSteps; r++) {
			const ang = (2 * Math.PI * r) / config.radialSteps;
			const ca = Math.cos(ang) * rr;
			const sa = Math.sin(ang) * rr;
			const px = cx + p1[0] * ca + p2[0] * sa;
			const py = cy + p1[1] * ca + p2[1] * sa;
			const pz = cz + p1[2] * ca + p2[2] * sa;

			const rVal = sampleWorldVoxel(vol, px, py, pz);
			if (rVal !== null) {
				allSamples.push(rVal);
				if (rVal < minHU) minHU = rVal;
				if (rVal > maxHU) maxHU = rVal;
				if (t >= 0.2 && t <= 0.8) {
					trabecularSamples.push(rVal);
				}
			}
		}
	}

	// Cortical thickness sampling (Crestal & Apical)
	const vSpacing = Math.max(0.1, vol.vSpacing || 0.5);
	const searchSteps = Math.max(3, Math.ceil(config.corticalSearchRadiusMm / vSpacing));

	// Crest samples penetrating from entry along implant direction
	const crestSamples: number[] = [];
	for (let s = 0; s < searchSteps; s++) {
		const dist = s * vSpacing;
		const sx = entry[0] + u[0] * dist;
		const sy = entry[1] + u[1] * dist;
		const sz = entry[2] + u[2] * dist;
		const val = sampleWorldVoxel(vol, sx, sy, sz);
		if (val !== null) {
			crestSamples.push(val);
		}
	}
	const corticalThicknessCrestMm = calculateCorticalThickness(
		crestSamples,
		vSpacing,
		config.corticalThresholdHU,
	);

	// Apical samples extending around the apex along the trajectory
	const apicalSamples: number[] = [];
	for (let s = -Math.floor(searchSteps / 2); s <= searchSteps; s++) {
		const dist = s * vSpacing;
		const sx = apex[0] + u[0] * dist;
		const sy = apex[1] + u[1] * dist;
		const sz = apex[2] + u[2] * dist;
		const val = sampleWorldVoxel(vol, sx, sy, sz);
		if (val !== null) {
			apicalSamples.push(val);
		}
	}
	const corticalThicknessApicalMm = calculateCorticalThickness(
		apicalSamples,
		vSpacing,
		config.corticalThresholdHU,
	);

	// Statistical computation
	const count = allSamples.length;
	let meanHU = 0;
	let stdDevHU = 0;

	if (count > 0) {
		const sum = allSamples.reduce((acc, v) => acc + v, 0);
		meanHU = Math.round((sum / count) * 10) / 10;

		const varSum = allSamples.reduce((acc, v) => acc + (v - meanHU) ** 2, 0);
		stdDevHU = Math.round(Math.sqrt(varSum / count) * 10) / 10;
	} else {
		minHU = 0;
		maxHU = 0;
	}

	const trabecularDensityHU = trabecularSamples.length > 0
		? Math.round((trabecularSamples.reduce((a, b) => a + b, 0) / trabecularSamples.length) * 10) / 10
		: meanHU;

	const mischClass = classifyMischBone(meanHU);
	const lekholmZarbType = classifyLekholmZarb(corticalThicknessCrestMm, trabecularDensityHU);
	const osteotomyRecommendation = determineOsteotomyProtocol(mischClass, corticalThicknessCrestMm);

	return {
		implantId,
		toothNumber,
		meanHU,
		mischClass,
		lekholmZarbType,
		corticalThicknessCrestMm,
		corticalThicknessApicalMm,
		trabecularDensityHU,
		osteotomyRecommendation,
		sampleCount: count,
		minHU: minHU === Infinity ? 0 : Math.round(minHU * 10) / 10,
		maxHU: maxHU === -Infinity ? 0 : Math.round(maxHU * 10) / 10,
		stdDevHU,
		assessmentDate: new Date().toISOString().slice(0, 10),
	};
}

/**
 * Volumetric sampling of bone density along the planned implant bed:
 * - Centerline plus a concentric ring of radial samples at 60% radius (representing
 *   the intimate implant-bone contact zone) over the full entry -> apex length.
 * - Samples outside the volume bounding box are ignored.
 * - Calculates mean HU, min, max, standard deviation, and attaches the matching Misch profile.
 *
 * Returns null if the implant length is negligible (< 1e-6) or if zero samples lie within the volume.
 */
export function sampleImplantBoneHU(
	vol: VolumeSamplingData,
	entry: Vec3,
	apex: Vec3,
	radius: number,
	axialSteps = 12,
	radialSteps = 4,
): BoneSample | null {
	const dir: Vec3 = [
		apex[0] - entry[0],
		apex[1] - entry[1],
		apex[2] - entry[2],
	];
	const len = Math.hypot(dir[0], dir[1], dir[2]);
	if (len < 1e-6) return null;

	const u: Vec3 = [dir[0] / len, dir[1] / len, dir[2] / len];
	const ref: Vec3 = Math.abs(u[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
	const p1 = normalize3(cross3(u, ref));
	const p2 = cross3(u, p1);
	const rr = radius * 0.6;

	let sum = 0;
	let n = 0;
	let min = Infinity;
	let max = -Infinity;
	const collected: number[] = [];

	for (let a = 0; a <= axialSteps; a++) {
		const t = a / axialSteps;
		const cx = entry[0] + dir[0] * t;
		const cy = entry[1] + dir[1] * t;
		const cz = entry[2] + dir[2] * t;

		const c = sampleWorldPoint(vol, cx, cy, cz);
		if (c !== null) {
			sum += c;
			n++;
			collected.push(c);
			if (c < min) min = c;
			if (c > max) max = c;
		}

		for (let r = 0; r < radialSteps; r++) {
			const ang = (2 * Math.PI * r) / radialSteps;
			const ca = Math.cos(ang) * rr;
			const sa = Math.sin(ang) * rr;
			const px = cx + p1[0] * ca + p2[0] * sa;
			const py = cy + p1[1] * ca + p2[1] * sa;
			const pz = cz + p1[2] * ca + p2[2] * sa;
			const v = sampleWorldPoint(vol, px, py, pz);
			if (v !== null) {
				sum += v;
				n++;
				collected.push(v);
				if (v < min) min = v;
				if (v > max) max = v;
			}
		}
	}

	if (n === 0) return null;

	const meanHU = sum / n;

	let varSum = 0;
	for (const v of collected) {
		const diff = v - meanHU;
		varSum += diff * diff;
	}
	const stdDevHU = Math.sqrt(varSum / n);
	const bone = classifyMischBone(meanHU);

	const cleanMin = min !== Infinity ? min : meanHU;
	const cleanMax = max !== -Infinity ? max : meanHU;

	return {
		meanHU: Math.abs(meanHU - Math.round(meanHU)) < 1e-6 ? Math.round(meanHU) : meanHU,
		bone,
		samples: n,
		minHU: Math.abs(cleanMin - Math.round(cleanMin)) < 1e-6 ? Math.round(cleanMin) : cleanMin,
		maxHU: Math.abs(cleanMax - Math.round(cleanMax)) < 1e-6 ? Math.round(cleanMax) : cleanMax,
		stdDevHU: Math.abs(stdDevHU - Math.round(stdDevHU)) < 1e-6 ? Math.round(stdDevHU) : stdDevHU,
		profile: getMischBoneClinicalGuidance(bone),
	};
}
