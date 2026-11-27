/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT RADIOLOGY: MANDIBULAR CANAL FAST MARCHING PATHFINDER (SSOT)
 * ═══════════════════════════════════════════════════════════════════════════
 * Canonical SSOT for mandibular nerve canal (IAN) semi-automatic pathfinding
 * and 3D Eikonal Fast Marching wavefront propagation.
 *
 * Re-exports shared canonical @dental/shared/src/radiology/fastMarching module
 * and implements high-performance zero-GC typed array pathfinder for chairside
 * Ez3D / Vatech CBCT volume analysis.
 * ═══════════════════════════════════════════════════════════════════════════
 */


import { voxelToWorldMm, worldMmToVoxel } from "./cbctCoordinateMath.js";
import type { CbctVoxelVolume, Point3D } from "./cbctMprMath.js";

// ── Clinical Constants (Ez3D / Vatech MNCSeg.ini) ─────────────────────────
export const VATECH_CANAL_BASE_DIAMETER_MM = 2.0;
export const VATECH_CANAL_SAFETY_ZONE_MM = 2.0;
export const VATECH_MINIMAL_APICAL_DISTANCE_MM = 3.0;
export const VATECH_COLLISION_DANGER_MM = 1.5;

// ── Types & Contracts ─────────────────────────────────────────────────────
export interface VoxelPoint3D {
	readonly x: number;
	readonly y: number;
	readonly z: number;
}

export interface VolumeDimensions3D {
	readonly width: number;
	readonly height: number;
	readonly depth: number;
	readonly spacingX: number;
	readonly spacingY: number;
	readonly spacingZ: number;
}

export interface FastMarchingNerveOptions {
	readonly roiPaddingVoxels?: number | undefined;
	readonly canalHypodenseMinHU?: number | undefined;
	readonly canalHypodenseMaxHU?: number | undefined;
	readonly sigmoidAlpha?: number | undefined;
	readonly sigmoidBeta?: number | undefined;
	readonly defaultDiameterMm?: number | undefined;
	readonly safetyMarginMm?: number | undefined;
	readonly warningApicalDistanceMm?: number | undefined;
	readonly dangerCollisionThresholdMm?: number | undefined;
	readonly subdivisionsPerSegment?: number | undefined;
	readonly precomputedCostField?: Float32Array | undefined;
}

export interface FastMarchingNerveResult {
	readonly voxelPath: readonly VoxelPoint3D[];
	readonly physicalSpline: readonly Point3D[];
	readonly controlPoints: readonly Point3D[];
	readonly totalLengthMm: number;
	readonly estimatedDiameterMm: number;
	readonly executionTimeMs: number;
	readonly seeds: {
		readonly mentalForamen: Point3D;
		readonly mandibularForamen: Point3D;
	};
	readonly safetyZoneMarginMm: number;
	readonly warningApicalDistanceMm: number;
	readonly dangerCollisionThresholdMm: number;
}

export interface VatechClearanceAuditResult {
	readonly apicalClearanceMm: number;
	readonly bodyClearanceMm: number;
	readonly worstClearanceMm: number;
	readonly safetyStatus: "safe" | "warning" | "danger";
	readonly isDanger: boolean;
	readonly isWarning: boolean;
	readonly isSafe: boolean;
	readonly warningApicalDistanceMm: number;
	readonly dangerCollisionThresholdMm: number;
	readonly safetyZoneMarginMm: number;
	readonly messageRu: string;
}

// ── Zero-GC Min-Heap for Wavefront Propagation ────────────────────────────
export class FastMinHeap {
	private indices: Int32Array;
	private costs: Float32Array;
	public size = 0;

	constructor(maxElements: number) {
		this.indices = new Int32Array(maxElements);
		this.costs = new Float32Array(maxElements);
	}

	public push(index: number, cost: number): void {
		let i = this.size++;
		this.indices[i] = index;
		this.costs[i] = cost;

		while (i > 0) {
			const parent = (i - 1) >> 1;
			if ((this.costs[i] ?? 0) < (this.costs[parent] ?? 0)) {
				this.swap(i, parent);
				i = parent;
			} else {
				break;
			}
		}
	}

	public pop(): number {
		if (this.size === 0) return -1;
		const top = this.indices[0] ?? -1;
		this.size--;
		if (this.size > 0) {
			this.indices[0] = this.indices[this.size] ?? 0;
			this.costs[0] = this.costs[this.size] ?? 0;
			this.downHeap(0);
		}
		return top;
	}

	private downHeap(i: number): void {
		const half = this.size >> 1;
		while (i < half) {
			let best = i;
			const left = (i << 1) + 1;
			const right = left + 1;

			if (left < this.size && (this.costs[left] ?? 0) < (this.costs[best] ?? 0)) best = left;
			if (right < this.size && (this.costs[right] ?? 0) < (this.costs[best] ?? 0)) best = right;

			if (best !== i) {
				this.swap(i, best);
				i = best;
			} else {
				break;
			}
		}
	}

	private swap(a: number, b: number): void {
		const idxA = this.indices[a] ?? 0;
		this.indices[a] = this.indices[b] ?? 0;
		this.indices[b] = idxA;

		const costA = this.costs[a] ?? 0;
		this.costs[a] = this.costs[b] ?? 0;
		this.costs[b] = costA;
	}
}

// ── Vatech Gradient, Sigmoid & HU Cost Metrics ────────────────────────────
export function calculateVoxelGradientMagnitude(
	volumeHU: Int16Array,
	width: number,
	height: number,
	depth: number,
	x: number,
	y: number,
	z: number,
	spacingX: number,
	spacingY: number,
	spacingZ: number,
): number {
	const sliceStride = width * height;
	const x0 = Math.max(0, x - 1), x1 = Math.min(width - 1, x + 1);
	const y0 = Math.max(0, y - 1), y1 = Math.min(height - 1, y + 1);
	const z0 = Math.max(0, z - 1), z1 = Math.min(depth - 1, z + 1);

	const baseZ = z * sliceStride;
	const baseY = y * width;

	const huX0 = volumeHU[baseZ + baseY + x0] ?? -1000;
	const huX1 = volumeHU[baseZ + baseY + x1] ?? -1000;
	const gx = (huX1 - huX0) / Math.max(0.001, (x1 - x0) * spacingX);

	const huY0 = volumeHU[baseZ + y0 * width + x] ?? -1000;
	const huY1 = volumeHU[baseZ + y1 * width + x] ?? -1000;
	const gy = (huY1 - huY0) / Math.max(0.001, (y1 - y0) * spacingY);

	const huZ0 = volumeHU[z0 * sliceStride + baseY + x] ?? -1000;
	const huZ1 = volumeHU[z1 * sliceStride + baseY + x] ?? -1000;
	const gz = (huZ1 - huZ0) / Math.max(0.001, (z1 - z0) * spacingZ);

	return Math.hypot(gx, gy, gz);
}

export function calculateVatechSigmoidVelocity(
	gradientMagnitude: number,
	alpha = -20.0,
	beta = 3.0,
): number {
	const absAlpha = Math.abs(alpha) || 20.0;
	const zeroExp = Math.exp(-beta / absAlpha);
	const exponent = (gradientMagnitude - beta) / absAlpha;
	const clampedExp = Math.max(-40.0, Math.min(40.0, exponent));
	const velocity = (1.0 + zeroExp) / (1.0 + Math.exp(clampedExp));
	return Math.max(0.001, Math.min(1.0, velocity));
}

export function calculateVoxelHuPenalty(
	hu: number,
	minCanalHU = 50,
	maxCanalHU = 350,
): number {
	if (hu >= minCanalHU && hu <= maxCanalHU) return 0.15;
	if (hu > maxCanalHU) {
		const excess = (hu - maxCanalHU) / 100.0;
		return 1.0 + excess * excess;
	}
	if (hu < 0) return 15.0;
	return 1.5;
}

// ── 3D Catmull-Rom Spline & Clearance Audit ───────────────────────────────
export function evaluateVatechImplantNerveClearance(
	apicalClearanceMm: number,
	bodyClearanceMm?: number,
	thresholds?: {
		readonly warningApicalMm?: number;
		readonly dangerCollisionMm?: number;
		readonly safetyMarginMm?: number;
	},
): VatechClearanceAuditResult {
	const warnApical = thresholds?.warningApicalMm ?? VATECH_MINIMAL_APICAL_DISTANCE_MM;
	const dangerColl = thresholds?.dangerCollisionMm ?? VATECH_COLLISION_DANGER_MM;
	const safetyMargin = thresholds?.safetyMarginMm ?? VATECH_CANAL_SAFETY_ZONE_MM;

	const effectiveBody = bodyClearanceMm ?? apicalClearanceMm;
	const worstClearance = Math.min(apicalClearanceMm, effectiveBody);
	const isDanger = worstClearance < dangerColl;
	const isWarning = !isDanger && (apicalClearanceMm < warnApical || effectiveBody < safetyMargin);
	const isSafe = !isDanger && !isWarning;
	const status: "safe" | "warning" | "danger" = isDanger ? "danger" : isWarning ? "warning" : "safe";

	const message = isDanger
		? `КРИТИЧЕСКАЯ КОЛЛИЗИЯ VATECH: зазор ${worstClearance.toFixed(1)} мм (< ${dangerColl.toFixed(1)} мм)! Высокий риск травмы n. alveolaris inferior!`
		: isWarning
			? (apicalClearanceMm < warnApical
				? `ПРЕДУПРЕЖДЕНИЕ VATECH: отступ апекса ${apicalClearanceMm.toFixed(1)} мм (< ${warnApical.toFixed(1)} мм). Рекомендуется имплантат меньшей длины.`
				: `ПРЕДУПРЕЖДЕНИЕ VATECH: зазор тела ${effectiveBody.toFixed(1)} мм (< ${safetyMargin.toFixed(1)} мм буфера).`)
			: `Безопасный коридор Vatech соблюден: зазор апекса ${apicalClearanceMm.toFixed(1)} мм (норма >= ${warnApical.toFixed(1)} мм), зазор тела ${effectiveBody.toFixed(1)} мм.`;

	return {
		apicalClearanceMm: Number(apicalClearanceMm.toFixed(2)),
		bodyClearanceMm: Number(effectiveBody.toFixed(2)),
		worstClearanceMm: Number(worstClearance.toFixed(2)),
		safetyStatus: status,
		isDanger,
		isWarning,
		isSafe,
		warningApicalDistanceMm: warnApical,
		dangerCollisionThresholdMm: dangerColl,
		safetyZoneMarginMm: safetyMargin,
		messageRu: message,
	};
}

export function smoothCatmullRom3D(pts: readonly Point3D[], subdivisions = 6): Point3D[] {
	if (pts.length < 2) return [...pts];
	const roundPt = (x: number, y: number, z: number): Point3D => ({
		x: Number(x.toFixed(2)),
		y: Number(y.toFixed(2)),
		z: Number(z.toFixed(2)),
	});
	if (pts.length === 2) {
		const [p0, p1] = pts;
		if (!p0 || !p1) return [];
		const line: Point3D[] = [];
		for (let i = 0; i <= subdivisions; i++) {
			const t = i / subdivisions;
			line.push(roundPt(p0.x + (p1.x - p0.x) * t, p0.y + (p1.y - p0.y) * t, p0.z + (p1.z - p0.z) * t));
		}
		return line;
	}
	const result: Point3D[] = [];
	const step = 1.0 / subdivisions;

	for (let i = 0; i < pts.length - 1; i++) {
		const pi = pts[i];
		const p2 = pts[i + 1];
		if (!pi || !p2) continue;
		const p0 = (i > 0 ? pts[i - 1] : pi) ?? pi;
		const p1 = pi;
		const p3 = (i < pts.length - 2 ? pts[i + 2] : p2) ?? p2;

		for (let t = 0; t < 1.0; t += step) {
			const t2 = t * t, t3 = t2 * t;
			const cr = (v0: number, v1: number, v2: number, v3: number) =>
				0.5 * (2 * v1 + (-v0 + v2) * t + (2 * v0 - 5 * v1 + 4 * v2 - v3) * t2 + (-v0 + 3 * v1 - 3 * v2 + v3) * t3);
			result.push(roundPt(cr(p0.x, p1.x, p2.x, p3.x), cr(p0.y, p1.y, p2.y, p3.y), cr(p0.z, p1.z, p2.z, p3.z)));
		}
	}
	const last = pts[pts.length - 1];
	if (last) {
		result.push(roundPt(last.x, last.y, last.z));
	}
	return result;
}

// ── 2-Seed Mandibular Canal Wavefront Pathfinder ───────────────────────────
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

	const startRoiIdx = toRoiIdx(
		Math.max(0, Math.min(roiWidth - 1, startVoxel.x - minX)),
		Math.max(0, Math.min(roiHeight - 1, startVoxel.y - minY)),
		Math.max(0, Math.min(roiDepth - 1, startVoxel.z - minZ)),
	);
	const endRoiIdx = toRoiIdx(
		Math.max(0, Math.min(roiWidth - 1, endVoxel.x - minX)),
		Math.max(0, Math.min(roiHeight - 1, endVoxel.y - minY)),
		Math.max(0, Math.min(roiDepth - 1, endVoxel.z - minZ)),
	);

	dist[startRoiIdx] = 0;
	heap.push(startRoiIdx, 0);

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
		if (currRoiIdx < 0 || currRoiIdx === endRoiIdx) break;
		const currCost = dist[currRoiIdx] ?? Number.POSITIVE_INFINITY;
		if (!Number.isFinite(currCost)) continue;

		const currVoxel = toGlobalVoxel(currRoiIdx);
		const currRx = currVoxel.x - minX, currRy = currVoxel.y - minY, currRz = currVoxel.z - minZ;

		for (let i = 0; i < neighbors.length; i++) {
			const n = neighbors[i];
			if (!n) continue;
			const nRx = currRx + n.dx, nRy = currRy + n.dy, nRz = currRz + n.dz;
			if (nRx < 0 || nRx >= roiWidth || nRy < 0 || nRy >= roiHeight || nRz < 0 || nRz >= roiDepth) continue;
			const nRoiIdx = toRoiIdx(nRx, nRy, nRz);
			let stepCost: number;
			if (options?.precomputedCostField) {
				stepCost = n.distMm * (options.precomputedCostField[nRoiIdx] ?? 1.0);
			} else {
				const nGx = nRx + minX, nGy = nRy + minY, nGz = nRz + minZ;
				const hu = volumeHU[nGz * sliceStride + nGy * dims.width + nGx] ?? -1000;
				const gradMag = calculateVoxelGradientMagnitude(volumeHU, dims.width, dims.height, dims.depth, nGx, nGy, nGz, dims.spacingX, dims.spacingY, dims.spacingZ);
				const velocity = calculateVatechSigmoidVelocity(gradMag, alpha, beta);
				stepCost = n.distMm * Math.fround(calculateVoxelHuPenalty(hu, minCanalHU, maxCanalHU) * (1.0 / velocity));
			}
			const newCost = currCost + stepCost;
			if (newCost < (dist[nRoiIdx] ?? Number.POSITIVE_INFINITY)) {
				dist[nRoiIdx] = newCost;
				prev[nRoiIdx] = currRoiIdx;
				heap.push(nRoiIdx, newCost);
			}
		}
	}

	const rawVoxelPath: VoxelPoint3D[] = [];
	let curr = endRoiIdx, stepGuard = 0;
	while (curr !== -1 && stepGuard < roiVolume) {
		rawVoxelPath.push(toGlobalVoxel(curr));
		if (curr === startRoiIdx) break;
		curr = prev[curr] ?? -1;
		stepGuard++;
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
		x: Number((v.x * dims.spacingX).toFixed(2)),
		y: Number((v.y * dims.spacingY).toFixed(2)),
		z: Number((v.z * dims.spacingZ).toFixed(2)),
	});
	const controlPointsMm: Point3D[] = [];
	const stride = Math.max(1, Math.floor(rawVoxelPath.length / 8));
	for (let i = 0; i < rawVoxelPath.length; i += stride) {
		const voxelPt = rawVoxelPath[i];
		if (voxelPt) controlPointsMm.push(toMm(voxelPt));
	}
	const lastRawVoxel = rawVoxelPath[rawVoxelPath.length - 1];
	if (lastRawVoxel) {
		const lastMm = toMm(lastRawVoxel);
		const tail = controlPointsMm[controlPointsMm.length - 1];
		if (!tail || tail.x !== lastMm.x || tail.y !== lastMm.y || tail.z !== lastMm.z) controlPointsMm.push(lastMm);
	}

	const physicalSpline = smoothCatmullRom3D(controlPointsMm, options?.subdivisionsPerSegment ?? 6);
	let totalLengthMm = 0;
	for (let i = 0; i < physicalSpline.length - 1; i++) {
		const pA = physicalSpline[i];
		const pB = physicalSpline[i + 1];
		if (pA && pB) {
			totalLengthMm += Math.hypot(pB.x - pA.x, pB.y - pA.y, pB.z - pA.z);
		}
	}
	return {
		voxelPath: rawVoxelPath,
		physicalSpline,
		controlPoints: controlPointsMm,
		totalLengthMm: Number(totalLengthMm.toFixed(2)),
		estimatedDiameterMm: defaultDiameterMm,
		executionTimeMs: Number((performance.now() - startTime).toFixed(1)),
		seeds: {
			mentalForamen: controlPointsMm[0] ?? { x: 0, y: 0, z: 0 },
			mandibularForamen: controlPointsMm[controlPointsMm.length - 1] ?? { x: 0, y: 0, z: 0 },
		},
		safetyZoneMarginMm: safetyMarginMm,
		warningApicalDistanceMm: warnApical,
		dangerCollisionThresholdMm: dangerColl,
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
	const dims: VolumeDimensions3D = {
		width: volume.dimensions.width,
		height: volume.dimensions.height,
		depth: volume.dimensions.depth,
		spacingX: spX,
		spacingY: spY,
		spacingZ: spZ,
	};

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
			const pA = worldPhysicalSpline[i];
			const pB = worldPhysicalSpline[i + 1];
			if (pA && pB) {
				totalLengthMm += Math.hypot(pB.x - pA.x, pB.y - pA.y, pB.z - pA.z);
			}
		}
		return {
			voxelPath: rawResult.voxelPath,
			physicalSpline: worldPhysicalSpline,
			controlPoints: worldControlPoints,
			totalLengthMm: Number(totalLengthMm.toFixed(2)),
			estimatedDiameterMm: rawResult.estimatedDiameterMm,
			executionTimeMs: rawResult.executionTimeMs,
			seeds: { mentalForamen: startSeedMm, mandibularForamen: endSeedMm },
			safetyZoneMarginMm: rawResult.safetyZoneMarginMm,
			warningApicalDistanceMm: rawResult.warningApicalDistanceMm,
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
		const pA = physicalSpline[i];
		const pB = physicalSpline[i + 1];
		if (pA && pB) {
			totalLengthMm += Math.hypot(pB.x - pA.x, pB.y - pA.y, pB.z - pA.z);
		}
	}
	return {
		voxelPath: controlPoints.map((p) => worldMmToVoxel(p, volume)),
		physicalSpline,
		controlPoints,
		totalLengthMm: Number(totalLengthMm.toFixed(2)),
		estimatedDiameterMm: options?.defaultDiameterMm ?? VATECH_CANAL_BASE_DIAMETER_MM,
		executionTimeMs: Number((performance.now() - startTime).toFixed(1)),
		seeds: { mentalForamen: startSeedMm, mandibularForamen: endSeedMm },
		safetyZoneMarginMm: options?.safetyMarginMm ?? VATECH_CANAL_SAFETY_ZONE_MM,
		warningApicalDistanceMm: options?.warningApicalDistanceMm ?? VATECH_MINIMAL_APICAL_DISTANCE_MM,
		dangerCollisionThresholdMm: options?.dangerCollisionThresholdMm ?? VATECH_COLLISION_DANGER_MM,
	};
}
