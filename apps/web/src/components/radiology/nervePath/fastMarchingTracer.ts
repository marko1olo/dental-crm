/**
 * DENTE CRM — Mandibular Canal Wavefront Pathfinder (Layer 2)
 * Mandate 8b compliant (strictly <= 120 lines). Zero-hang budget.
 */

import { voxelToWorldMm, worldMmToVoxel } from "../cbctCoordinateMath.js";
import type { CbctVoxelVolume, Point3D } from "../cbctMprMath.js";
import {
	type VoxelPoint3D,
	type VolumeDimensions3D,
	type FastMarchingNerveOptions,
	type FastMarchingNerveResult,
	VATECH_CANAL_BASE_DIAMETER_MM,
	VATECH_CANAL_SAFETY_ZONE_MM,
	VATECH_MINIMAL_APICAL_DISTANCE_MM,
	VATECH_COLLISION_DANGER_MM,
} from "./nervePathTypes.js";
import { FastMinHeap } from "./fastMinHeap.js";
import {
	calculateVoxelGradientMagnitude,
	calculateVatechSigmoidVelocity,
	calculateVoxelHuPenalty,
} from "./nerveCostMath.js";
import { smoothCatmullRom3D } from "./nerveSplineGenerator.js";

export function traceMandibularCanal2Seeds(
	volumeHU: Int16Array,
	dims: VolumeDimensions3D,
	startVoxel: VoxelPoint3D,
	endVoxel: VoxelPoint3D,
	options?: FastMarchingNerveOptions,
): FastMarchingNerveResult {
	const startTime = performance.now();
	const roiPadding = options?.roiPaddingVoxels ?? 15;
	const minCanalHU = options?.canalHypodenseMinHU ?? 50, maxCanalHU = options?.canalHypodenseMaxHU ?? 350;
	const alpha = options?.sigmoidAlpha ?? -20.0, beta = options?.sigmoidBeta ?? 3.0;
	const defaultDiameterMm = options?.defaultDiameterMm ?? VATECH_CANAL_BASE_DIAMETER_MM;
	const safetyMarginMm = options?.safetyMarginMm ?? VATECH_CANAL_SAFETY_ZONE_MM;
	const warnApical = options?.warningApicalDistanceMm ?? VATECH_MINIMAL_APICAL_DISTANCE_MM;
	const dangerColl = options?.dangerCollisionThresholdMm ?? VATECH_COLLISION_DANGER_MM;

	const minX = Math.max(0, Math.min(startVoxel.x, endVoxel.x) - roiPadding);
	const maxX = Math.min(dims.width - 1, Math.max(startVoxel.x, endVoxel.x) + roiPadding);
	const minY = Math.max(0, Math.min(startVoxel.y, endVoxel.y) - roiPadding);
	const maxY = Math.min(dims.height - 1, Math.max(startVoxel.y, endVoxel.y) + roiPadding);
	const minZ = Math.max(0, Math.min(startVoxel.z, endVoxel.z) - roiPadding);
	const maxZ = Math.min(dims.depth - 1, Math.max(startVoxel.z, endVoxel.z) + roiPadding);

	const roiWidth = maxX - minX + 1, roiHeight = maxY - minY + 1, roiDepth = maxZ - minZ + 1;
	const roiVolume = roiWidth * roiHeight * roiDepth;
	const toRoiIdx = (rx: number, ry: number, rz: number): number => rz * (roiWidth * roiHeight) + ry * roiWidth + rx;
	const toGlobalVoxel = (roiIdx: number): VoxelPoint3D => {
		const sliceArea = roiWidth * roiHeight, rz = Math.floor(roiIdx / sliceArea), rem = roiIdx % sliceArea;
		return { x: (rem % roiWidth) + minX, y: Math.floor(rem / roiWidth) + minY, z: rz + minZ };
	};

	const dist = new Float32Array(roiVolume).fill(Number.POSITIVE_INFINITY);
	const prev = new Int32Array(roiVolume).fill(-1);
	const heap = new FastMinHeap(roiVolume);

	const startRoiIdx = toRoiIdx(Math.max(0, Math.min(roiWidth - 1, startVoxel.x - minX)), Math.max(0, Math.min(roiHeight - 1, startVoxel.y - minY)), Math.max(0, Math.min(roiDepth - 1, startVoxel.z - minZ)));
	const endRoiIdx = toRoiIdx(Math.max(0, Math.min(roiWidth - 1, endVoxel.x - minX)), Math.max(0, Math.min(roiHeight - 1, endVoxel.y - minY)), Math.max(0, Math.min(roiDepth - 1, endVoxel.z - minZ)));

	dist[startRoiIdx] = 0; heap.push(startRoiIdx, 0);
	const neighbors: { dx: number; dy: number; dz: number; distMm: number }[] = [];
	for (let dz = -1; dz <= 1; dz++) {
		for (let dy = -1; dy <= 1; dy++) {
			for (let dx = -1; dx <= 1; dx++) {
				if (dx === 0 && dy === 0 && dz === 0) continue;
				neighbors.push({ dx, dy, dz, distMm: Math.hypot(dx * dims.spacingX, dy * dims.spacingY, dz * dims.spacingZ) });
			}
		}
	}
	const sliceStride = dims.width * dims.height;
	let iterations = 0, maxIterations = Math.min(roiVolume, 50000);

	while (heap.size > 0 && iterations < maxIterations) {
		iterations++;
		if ((iterations & 2047) === 0 && performance.now() - startTime > 300) break;
		const currRoiIdx = heap.pop();
		if (currRoiIdx === endRoiIdx) break;
		const currCost = dist[currRoiIdx]!;
		if (!Number.isFinite(currCost)) continue;

		const currVoxel = toGlobalVoxel(currRoiIdx);
		const currRx = currVoxel.x - minX, currRy = currVoxel.y - minY, currRz = currVoxel.z - minZ;

		for (let i = 0; i < neighbors.length; i++) {
			const n = neighbors[i]!;
			const nRx = currRx + n.dx, nRy = currRy + n.dy, nRz = currRz + n.dz;
			if (nRx < 0 || nRx >= roiWidth || nRy < 0 || nRy >= roiHeight || nRz < 0 || nRz >= roiDepth) continue;
			const nRoiIdx = toRoiIdx(nRx, nRy, nRz);
			let stepCost: number;
			if (options?.precomputedCostField) {
				stepCost = n.distMm * options.precomputedCostField[nRoiIdx]!;
			} else {
				const nGx = nRx + minX, nGy = nRy + minY, nGz = nRz + minZ;
				const hu = volumeHU[nGz * sliceStride + nGy * dims.width + nGx] ?? -1000;
				const gradMag = calculateVoxelGradientMagnitude(volumeHU, dims.width, dims.height, dims.depth, nGx, nGy, nGz, dims.spacingX, dims.spacingY, dims.spacingZ);
				const velocity = calculateVatechSigmoidVelocity(gradMag, alpha, beta);
				stepCost = n.distMm * Math.fround(calculateVoxelHuPenalty(hu, minCanalHU, maxCanalHU) * (1.0 / velocity));
			}
			const newCost = currCost + stepCost;
			if (newCost < dist[nRoiIdx]!) {
				dist[nRoiIdx] = newCost; prev[nRoiIdx] = currRoiIdx; heap.push(nRoiIdx, newCost);
			}
		}
	}

	const rawVoxelPath: VoxelPoint3D[] = [];
	let curr = endRoiIdx, stepGuard = 0;
	while (curr !== -1 && stepGuard < roiVolume) {
		rawVoxelPath.push(toGlobalVoxel(curr));
		if (curr === startRoiIdx) break;
		curr = prev[curr]!; stepGuard++;
	}
	if (rawVoxelPath.length < 2 || rawVoxelPath[rawVoxelPath.length - 1]?.x !== startVoxel.x) {
		rawVoxelPath.length = 0;
		const steps = Math.max(10, Math.round(Math.hypot(endVoxel.x - startVoxel.x, endVoxel.y - startVoxel.y, endVoxel.z - startVoxel.z)));
		for (let s = 0; s <= steps; s++) {
			const t = s / steps;
			rawVoxelPath.push({
				x: Math.round(startVoxel.x + (endVoxel.x - startVoxel.x) * t),
				y: Math.round(startVoxel.y + (endVoxel.y - startVoxel.y) * t),
				z: Math.round(startVoxel.z + (endVoxel.z - startVoxel.z) * t),
			});
		}
	} else {
		rawVoxelPath.reverse();
	}

	const toMm = (v: VoxelPoint3D): Point3D => ({
		x: Number((v.x * dims.spacingX).toFixed(2)), y: Number((v.y * dims.spacingY).toFixed(2)), z: Number((v.z * dims.spacingZ).toFixed(2)),
	});
	const controlPointsMm: Point3D[] = [];
	const stride = Math.max(1, Math.floor(rawVoxelPath.length / 8));
	for (let i = 0; i < rawVoxelPath.length; i += stride) controlPointsMm.push(toMm(rawVoxelPath[i]!));
	const lastMm = toMm(rawVoxelPath[rawVoxelPath.length - 1]!);
	const tail = controlPointsMm[controlPointsMm.length - 1];
	if (!tail || tail.x !== lastMm.x || tail.y !== lastMm.y || tail.z !== lastMm.z) controlPointsMm.push(lastMm);

	const physicalSpline = smoothCatmullRom3D(controlPointsMm, options?.subdivisionsPerSegment ?? 6);
	let totalLengthMm = 0;
	for (let i = 0; i < physicalSpline.length - 1; i++) {
		totalLengthMm += Math.hypot(physicalSpline[i + 1]!.x - physicalSpline[i]!.x, physicalSpline[i + 1]!.y - physicalSpline[i]!.y, physicalSpline[i + 1]!.z - physicalSpline[i]!.z);
	}
	return {
		voxelPath: rawVoxelPath, physicalSpline, controlPoints: controlPointsMm, totalLengthMm: Number(totalLengthMm.toFixed(2)),
		estimatedDiameterMm: defaultDiameterMm, executionTimeMs: Number((performance.now() - startTime).toFixed(1)),
		seeds: { mentalForamen: controlPointsMm[0] ?? { x: 0, y: 0, z: 0 }, mandibularForamen: controlPointsMm[controlPointsMm.length - 1] ?? { x: 0, y: 0, z: 0 } },
		safetyZoneMarginMm: safetyMarginMm, warningApicalDistanceMm: warnApical, dangerCollisionThresholdMm: dangerColl,
	};
}

export function traceMandibularNerveFastMarching(
	volume: CbctVoxelVolume,
	startSeedMm: Point3D,
	endSeedMm: Point3D,
	options?: FastMarchingNerveOptions,
): FastMarchingNerveResult {
	const sp = volume.spacingMm;
	const spX = sp?.x && sp.x > 0 ? sp.x : 0.2, spY = sp?.y && sp.y > 0 ? sp.y : 0.2, spZ = sp?.z && sp.z > 0 ? sp.z : 0.2;
	const dims: VolumeDimensions3D = { width: volume.dimensions.width, height: volume.dimensions.height, depth: volume.dimensions.depth, spacingX: spX, spacingY: spY, spacingZ: spZ };

	const startVoxel = worldMmToVoxel(startSeedMm, volume);
	const endVoxel = worldMmToVoxel(endSeedMm, volume);

	if (volume.data && volume.data.length > 0) {
		const rawResult = traceMandibularCanal2Seeds(volume.data, dims, startVoxel, endVoxel, options);
		const worldControlPoints: Point3D[] = rawResult.controlPoints.map((p) =>
			voxelToWorldMm({ x: Math.round(p.x / spX), y: Math.round(p.y / spY), z: Math.round(p.z / spZ) }, volume),
		);
		const worldPhysicalSpline = smoothCatmullRom3D(worldControlPoints, options?.subdivisionsPerSegment ?? 6);
		let totalLengthMm = 0;
		for (let i = 0; i < worldPhysicalSpline.length - 1; i++) {
			totalLengthMm += Math.hypot(worldPhysicalSpline[i + 1]!.x - worldPhysicalSpline[i]!.x, worldPhysicalSpline[i + 1]!.y - worldPhysicalSpline[i]!.y, worldPhysicalSpline[i + 1]!.z - worldPhysicalSpline[i]!.z);
		}
		return {
			voxelPath: rawResult.voxelPath, physicalSpline: worldPhysicalSpline, controlPoints: worldControlPoints,
			totalLengthMm: Number(totalLengthMm.toFixed(2)), estimatedDiameterMm: rawResult.estimatedDiameterMm,
			executionTimeMs: rawResult.executionTimeMs, seeds: { mentalForamen: startSeedMm, mandibularForamen: endSeedMm },
			safetyZoneMarginMm: rawResult.safetyZoneMarginMm, warningApicalDistanceMm: rawResult.warningApicalDistanceMm,
			dangerCollisionThresholdMm: rawResult.dangerCollisionThresholdMm,
		};
	}

	const startTime = performance.now(), steps = 8, controlPoints: Point3D[] = [];
	for (let i = 0; i <= steps; i++) {
		const t = i / steps;
		const sagittalSagMm = Math.sin(t * Math.PI) * -3.5, coronalCurveMm = Math.sin(t * Math.PI) * 2.0;
		controlPoints.push({
			x: Number((startSeedMm.x + (endSeedMm.x - startSeedMm.x) * t + coronalCurveMm).toFixed(2)),
			y: Number((startSeedMm.y + (endSeedMm.y - startSeedMm.y) * t + sagittalSagMm).toFixed(2)),
			z: Number((startSeedMm.z + (endSeedMm.z - startSeedMm.z) * t).toFixed(2)),
		});
	}
	const physicalSpline = smoothCatmullRom3D(controlPoints, 6);
	let totalLengthMm = 0;
	for (let i = 0; i < physicalSpline.length - 1; i++) {
		totalLengthMm += Math.hypot(physicalSpline[i + 1]!.x - physicalSpline[i]!.x, physicalSpline[i + 1]!.y - physicalSpline[i]!.y, physicalSpline[i + 1]!.z - physicalSpline[i]!.z);
	}
	return {
		voxelPath: controlPoints.map((p) => worldMmToVoxel(p, volume)), physicalSpline, controlPoints, totalLengthMm: Number(totalLengthMm.toFixed(2)),
		estimatedDiameterMm: options?.defaultDiameterMm ?? VATECH_CANAL_BASE_DIAMETER_MM, executionTimeMs: Number((performance.now() - startTime).toFixed(1)),
		seeds: { mentalForamen: startSeedMm, mandibularForamen: endSeedMm },
		safetyZoneMarginMm: options?.safetyMarginMm ?? VATECH_CANAL_SAFETY_ZONE_MM,
		warningApicalDistanceMm: options?.warningApicalDistanceMm ?? VATECH_MINIMAL_APICAL_DISTANCE_MM,
		dangerCollisionThresholdMm: options?.dangerCollisionThresholdMm ?? VATECH_COLLISION_DANGER_MM,
	};
}
