/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT RADIOLOGY: FAST MARCHING CENTERLINE BACKTRACKER ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 * Continuous 3D canal centerline extraction using 4th-order Runge-Kutta (RK4)
 * gradient descent along -grad(T) from apical foramen back to canal orifice.
 * Trilinear arrival time and spatial gradient interpolation in sub-voxel metric.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { Vec3 } from "../implantGeometryEngine.js";
import type { VolumeDimensions, VolumeSpacingMm, CbctVoxelVolume } from "../cbctCropBox.js";
import type { FrangiVolumeResult } from "../endoCanalFrangiEngine.js";
import {
	worldToVoxelContinuous,
	type OrificePoint,
	type ApicalForamen,
	type FastMarchingTraceOptions,
	type TracedCanalPath,
	type RootCanalSystem,
	DEFAULT_TRACE_OPTIONS,
} from "./types.js";
import {
	detectCanalOrifices,
	detectApicalForamina,
	computeSpeedMap,
} from "./costFieldCalculator.js";
import { runFastMarching } from "./wavefrontPropagator.js";

// ── Trilinear Arrival Time & Gradient Interpolation ───────────────

/**
 * Trilinearly interpolates arrival time T and computes its spatial gradient grad(T)
 * at continuous coordinates (u, v, w) in voxel space.
 */
export function evaluateTimeAndGradient(
	timeField: Float32Array,
	dimensions: VolumeDimensions,
	spacing: VolumeSpacingMm,
	u: number,
	v: number,
	w: number,
): { T: number; gradMm: Vec3 } {
	const wMax = dimensions.width - 1;
	const hMax = dimensions.height - 1;
	const dMax = dimensions.depth - 1;

	const x0 = Math.max(0, Math.min(wMax - 1, Math.floor(u)));
	const y0 = Math.max(0, Math.min(hMax - 1, Math.floor(v)));
	const z0 = Math.max(0, Math.min(dMax - 1, Math.floor(w)));

	const x1 = x0 + 1;
	const y1 = y0 + 1;
	const z1 = z0 + 1;

	const fu = Math.max(0, Math.min(1, u - x0));
	const fv = Math.max(0, Math.min(1, v - y0));
	const fw = Math.max(0, Math.min(1, w - z0));

	const strideZ = dimensions.width * dimensions.height;
	const strideY = dimensions.width;

	const t000 = timeField[z0 * strideZ + y0 * strideY + x0] ?? Infinity;
	const t100 = timeField[z0 * strideZ + y0 * strideY + x1] ?? Infinity;
	const t010 = timeField[z0 * strideZ + y1 * strideY + x0] ?? Infinity;
	const t110 = timeField[z0 * strideZ + y1 * strideY + x1] ?? Infinity;
	const t001 = timeField[z1 * strideZ + y0 * strideY + x0] ?? Infinity;
	const t101 = timeField[z1 * strideZ + y0 * strideY + x1] ?? Infinity;
	const t011 = timeField[z1 * strideZ + y1 * strideY + x0] ?? Infinity;
	const t111 = timeField[z1 * strideZ + y1 * strideY + x1] ?? Infinity;

	const c00 = t000 * (1 - fu) + t100 * fu;
	const c10 = t010 * (1 - fu) + t110 * fu;
	const c01 = t001 * (1 - fu) + t101 * fu;
	const c11 = t011 * (1 - fu) + t111 * fu;

	const c0 = c00 * (1 - fv) + c10 * fv;
	const c1 = c01 * (1 - fv) + c11 * fv;

	const T = c0 * (1 - fw) + c1 * fw;

	// Partial derivatives with respect to voxel coordinates
	const dTx =
		(1 - fw) * ((1 - fv) * (t100 - t000) + fv * (t110 - t010)) +
		fw * ((1 - fv) * (t101 - t001) + fv * (t111 - t011));

	const dTy =
		(1 - fw) * ((1 - fu) * (t010 - t000) + fu * (t110 - t100)) +
		fw * ((1 - fu) * (t011 - t001) + fu * (t111 - t101));

	const dTz =
		(1 - fv) * ((1 - fu) * (t001 - t000) + fu * (t101 - t100)) +
		fv * ((1 - fu) * (t011 - t010) + fu * (t111 - t110));

	// Convert to physical gradient grad(T)_mm = (1 / spacing) * d/du
	return {
		T,
		gradMm: [
			dTx / Math.max(1e-6, spacing.x),
			dTy / Math.max(1e-6, spacing.y),
			dTz / Math.max(1e-6, spacing.z),
		],
	};
}

// ── 4th Order Runge-Kutta (RK4) Backtracking Engine ──────────────

/**
 * Traces the continuous 3D central canal trajectory from apex back to orifice
 * using 4th-order Runge-Kutta integration along -grad(T).
 */
export function traceCanalCenterlineRK4(
	timeField: Float32Array,
	dimensions: VolumeDimensions,
	spacing: VolumeSpacingMm,
	origin: { x: number; y: number; z: number },
	orifice: OrificePoint,
	apex: ApicalForamen,
	options: FastMarchingTraceOptions = DEFAULT_TRACE_OPTIONS,
): Vec3[] {
	const trajectoryMm: Vec3[] = [];
	let currentMm: Vec3 = [apex.worldPositionMm[0], apex.worldPositionMm[1], apex.worldPositionMm[2]];
	trajectoryMm.push([currentMm[0], currentMm[1], currentMm[2]]);

	const minSpacingMm = Math.min(spacing.x, spacing.y, spacing.z);
	const ds = options.rk4StepFactor * minSpacingMm;
	const toleranceMm = options.arrivalToleranceMm;
	const maxSteps = options.maxTraceSteps;

	const targetMm = orifice.worldPositionMm;

	// Evaluation helper for vector field f(x) = -grad(T) / ||grad(T)||
	const evalDirection = (posMm: Vec3): Vec3 | null => {
		const vox = worldToVoxelContinuous(posMm, spacing, origin);
		if (
			vox[0] < 0 ||
			vox[0] >= dimensions.width - 1 ||
			vox[1] < 0 ||
			vox[1] >= dimensions.height - 1 ||
			vox[2] < 0 ||
			vox[2] >= dimensions.depth - 1
		) {
			return null;
		}

		const { gradMm } = evaluateTimeAndGradient(timeField, dimensions, spacing, vox[0], vox[1], vox[2]);
		const norm = Math.hypot(gradMm[0], gradMm[1], gradMm[2]);
		if (norm < 1e-8 || !Number.isFinite(norm)) {
			return null;
		}

		// Downhill direction along -grad T
		return [-gradMm[0] / norm, -gradMm[1] / norm, -gradMm[2] / norm];
	};

	let prevDist = Math.hypot(currentMm[0] - targetMm[0], currentMm[1] - targetMm[1], currentMm[2] - targetMm[2]);
	let prevT = Infinity;
	const effectiveTolerance = Math.max(toleranceMm, minSpacingMm * 2.0);

	for (let step = 0; step < Math.min(1000, maxSteps); step++) {
		const distToOrifice = Math.hypot(
			currentMm[0] - targetMm[0],
			currentMm[1] - targetMm[1],
			currentMm[2] - targetMm[2],
		);

		// Stop conditions:
		// 1. Within tolerance (e.g. 0.8-1.0mm)
		if (distToOrifice <= effectiveTolerance) {
			break;
		}

		// 2. Distance starts increasing after approaching near target
		if (distToOrifice < 2.0 && distToOrifice > prevDist + 0.05) {
			break;
		}

		// 3. Arrival time checks: stop if arrival time reaches seed well or ceases decreasing
		const vox = worldToVoxelContinuous(currentMm, spacing, origin);
		if (
			vox[0] >= 0 && vox[0] < dimensions.width - 1 &&
			vox[1] >= 0 && vox[1] < dimensions.height - 1 &&
			vox[2] >= 0 && vox[2] < dimensions.depth - 1
		) {
			const { T } = evaluateTimeAndGradient(timeField, dimensions, spacing, vox[0], vox[1], vox[2]);
			if (T <= 0.05 || (step > 10 && T >= prevT - 1e-5)) {
				break;
			}
			prevT = T;
		}

		prevDist = distToOrifice;

		// RK4 Stage 1
		const k1 = evalDirection(currentMm);
		if (!k1) break;

		// RK4 Stage 2
		const p2: Vec3 = [
			currentMm[0] + 0.5 * ds * k1[0],
			currentMm[1] + 0.5 * ds * k1[1],
			currentMm[2] + 0.5 * ds * k1[2],
		];
		const k2 = evalDirection(p2);
		if (!k2) break;

		// RK4 Stage 3
		const p3: Vec3 = [
			currentMm[0] + 0.5 * ds * k2[0],
			currentMm[1] + 0.5 * ds * k2[1],
			currentMm[2] + 0.5 * ds * k2[2],
		];
		const k3 = evalDirection(p3);
		if (!k3) break;

		// RK4 Stage 4
		const p4: Vec3 = [
			currentMm[0] + ds * k3[0],
			currentMm[1] + ds * k3[1],
			currentMm[2] + ds * k3[2],
		];
		const k4 = evalDirection(p4);
		if (!k4) break;

		// RK4 Update
		const nextX = currentMm[0] + (ds / 6.0) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
		const nextY = currentMm[1] + (ds / 6.0) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
		const nextZ = currentMm[2] + (ds / 6.0) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);

		currentMm = [nextX, nextY, nextZ];
		trajectoryMm.push([nextX, nextY, nextZ]);
	}

	// Reverse so trajectory runs from orifice (coronal) to apex (apical)
	trajectoryMm.reverse();

	// Ensure exact orifice and apex endpoints are anchored
	if (trajectoryMm.length > 1) {
		trajectoryMm[0] = [targetMm[0], targetMm[1], targetMm[2]];
		trajectoryMm[trajectoryMm.length - 1] = [apex.worldPositionMm[0], apex.worldPositionMm[1], apex.worldPositionMm[2]];
	} else if (trajectoryMm.length === 1) {
		trajectoryMm.push([apex.worldPositionMm[0], apex.worldPositionMm[1], apex.worldPositionMm[2]]);
		trajectoryMm[0] = [targetMm[0], targetMm[1], targetMm[2]];
	}

	return trajectoryMm;
}

// ── Complete Endodontic Canal Extraction Pipeline ────────────────

/**
 * Extracts all root canals within a tooth CBCT volume, returning complete 3D trajectories,
 * orifices, and apices.
 */
export function extractRootCanalSystem(
	volume: CbctVoxelVolume,
	frangiResult: FrangiVolumeResult,
	expectedCanalCount = 3,
	options: FastMarchingTraceOptions = DEFAULT_TRACE_OPTIONS,
): RootCanalSystem {
	if (!volume.data) throw new Error("Volume data is unallocated");

	// Step 1: Detect orifices
	const orifices = detectCanalOrifices(frangiResult, volume, {
		maxCanalCount: expectedCanalCount,
		minInterOrificeDistMm: 1.5,
	});

	// Step 2: Detect apices
	const apices = detectApicalForamina(frangiResult, volume, Math.min(orifices.length, expectedCanalCount));

	if (orifices.length === 0 || apices.length === 0) {
		return {
			rootCount: 1,
			canals: [],
			detectedOrifices: orifices,
			detectedApices: apices,
		};
	}

	// Step 3: Compute speed map
	const speedMap = computeSpeedMap(frangiResult, volume, options);

	// Step 4: Run Fast Marching and trace canals
	const strideZ = frangiResult.dimensions.width * frangiResult.dimensions.height;
	const strideY = frangiResult.dimensions.width;
	const canals: TracedCanalPath[] = [];
	const assignedApexIds = new Set<string>();

	for (let i = 0; i < orifices.length; i++) {
		const orifice = orifices[i]!;
		const seedIdx =
			orifice.voxelCoordinates[2] * strideZ +
			orifice.voxelCoordinates[1] * strideY +
			orifice.voxelCoordinates[0];

		// Solve dedicated arrival time field for this orifice
		const timeField = runFastMarching(speedMap, frangiResult.dimensions, frangiResult.spacingMm, [seedIdx]);

		// Find best matching apex by lowest arrival time (geodesic proximity)
		let bestApex = apices[0]!;
		let minArrivalTime = Infinity;

		for (const apex of apices) {
			const aIdx =
				apex.voxelCoordinates[2] * strideZ +
				apex.voxelCoordinates[1] * strideY +
				apex.voxelCoordinates[0];
			const t = timeField[aIdx] ?? Infinity;

			// Strongly prefer unassigned apex to avoid duplicates
			const penalty = assignedApexIds.has(apex.id) ? 1000 : 0;
			const cost = t + penalty;
			if (cost < minArrivalTime) {
				minArrivalTime = cost;
				bestApex = apex;
			}
		}

		assignedApexIds.add(bestApex.id);

		const polylineMm = traceCanalCenterlineRK4(
			timeField,
			frangiResult.dimensions,
			frangiResult.spacingMm,
			volume.originMm,
			orifice,
			bestApex,
			options,
		);

		// Calculate geodesic length
		let totalLengthMm = 0;
		for (let p = 1; p < polylineMm.length; p++) {
			const p0 = polylineMm[p - 1]!;
			const p1 = polylineMm[p]!;
			totalLengthMm += Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
		}

		// Calculate mean tubeness and HU along trajectory
		let sumTubeness = 0;
		let sumHU = 0;
		for (const pt of polylineMm) {
			const vox = worldToVoxelContinuous(pt, frangiResult.spacingMm, volume.originMm);
			const vx = Math.round(vox[0]);
			const vy = Math.round(vox[1]);
			const vz = Math.round(vox[2]);
			const idx = vz * strideZ + vy * strideY + vx;
			sumTubeness += frangiResult.tubeness[idx] ?? 0;
			sumHU += volume.data[idx] ?? -1000;
		}

		const numPoints = Math.max(1, polylineMm.length);
		const lastPt = polylineMm[0] ?? orifice.worldPositionMm;
		const reached =
			Math.hypot(
				lastPt[0] - orifice.worldPositionMm[0],
				lastPt[1] - orifice.worldPositionMm[1],
				lastPt[2] - orifice.worldPositionMm[2],
			) <= Math.max(options.arrivalToleranceMm, 1.0);

		canals.push({
			canalId: `canal_${i + 1}`,
			canalName: orifice.canalName,
			orifice,
			apicalForamen: bestApex,
			polylineMm,
			geodesicLengthMm: totalLengthMm,
			meanTubeness: sumTubeness / numPoints,
			meanHU: sumHU / numPoints,
			reachedOrifice: reached,
		});
	}

	return {
		rootCount: Math.max(1, apices.length),
		canals,
		detectedOrifices: orifices,
		detectedApices: apices,
	};
}
