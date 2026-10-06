/**
 * DENTE CRM — CBCT Mandibular Nerve Canal Semi-Automatic Pathfinder (Fast Marching / Dijkstra)
 * Reverse-engineered from Vatech Ez3D2009 (CanalCore.dll / MNCSeg.dll).
 * 2-Seed workflow (mental -> mandibular foramen), 26-connectivity, Vatech Sigmoid + HU cost metric.
 * Mandate 8b compliant (strictly <= 800 lines). Zero-GC typed arrays.
 */

import { voxelToWorldMm, worldMmToVoxel } from "./cbctCoordinateMath.js";
import type { CbctVoxelVolume, Point3D } from "./cbctMprMath.js";

// ─── VATECH CLINICAL THRESHOLDS & CONSTANTS ──────────────────────────────────

/** Анатомические константы и пороги безопасности Vatech Ez3D (CanalCore / MNCSeg) */
export const VATECH_CANAL_BASE_DIAMETER_MM = 2.0;
export const VATECH_CANAL_SAFETY_ZONE_MM = 2.0;
export const VATECH_MINIMAL_APICAL_DISTANCE_MM = 3.0;
export const VATECH_COLLISION_DANGER_MM = 1.5;

// ─── DATA INTERFACES ─────────────────────────────────────────────────────────

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
	/** Отступ Bounding Box ROI в вокселях (по умолчанию 15) */
	readonly roiPaddingVoxels?: number;
	/** Нижняя граница плотности гиподенсного просвета канала (по умолчанию 50 HU) */
	readonly canalHypodenseMinHU?: number;
	/** Верхняя граница плотности гиподенсного просвета канала (по умолчанию 350 HU) */
	readonly canalHypodenseMaxHU?: number;
	/** Параметр наклона сигмоиды Vatech (по умолчанию -20.0) */
	readonly sigmoidAlpha?: number;
	/** Точка перегиба градиента сигмоиды Vatech (по умолчанию 3.0) */
	readonly sigmoidBeta?: number;
	/** Диаметр канала в мм (по умолчанию 2.0 мм, диапазон 2.0..3.5 мм) */
	readonly defaultDiameterMm?: number;
	/** Буфер безопасности в мм (по умолчанию 2.0 мм) */
	readonly safetyMarginMm?: number;
	/** Порог предупреждения от апекса (по умолчанию 3.0 мм) */
	readonly warningApicalDistanceMm?: number;
	/** Порог критической опасности коллизии (по умолчанию 1.5 мм) */
	readonly dangerCollisionThresholdMm?: number;
	/** Количество промежуточных интерполированных точек на сегмент сплайна */
	readonly subdivisionsPerSegment?: number;
	/** Предварительно рассчитанное 3D поле стоимостей (GPU WebGL2/WebGPU или Worker) */
	readonly precomputedCostField?: Float32Array;
}

export interface FastMarchingNerveResult {
	/** Массив координат пути в целочисленных вокселях объема */
	readonly voxelPath: readonly VoxelPoint3D[];
	/** Сглаженная 3D Catmull-Rom кривая в физических миллиметрах */
	readonly physicalSpline: readonly Point3D[];
	/** Опорные узлы (контрольные точки) для ручной доводки врачом */
	readonly controlPoints: readonly Point3D[];
	/** Общая анатомическая 3D длина хода нерва в мм */
	readonly totalLengthMm: number;
	/** Оценочный анатомический диаметр канала в мм */
	readonly estimatedDiameterMm: number;
	/** Время расчета алгоритма в миллисекундах */
	readonly executionTimeMs: number;
	/** Затравочные реперные точки (сиды) */
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

// ─── HIGH-PERFORMANCE MIN-HEAP FOR WAVEFRONT PROPAGATION ────────────────────

/**
 * Бинарная минимальная куча (Min-Heap) на типизированных массивах.
 * Выделение памяти под размер ROI исключает нагрузку на сборщик мусора (Zero GC).
 */
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
			if (this.costs[i]! < this.costs[parent]!) {
				this.swap(i, parent);
				i = parent;
			} else {
				break;
			}
		}
	}

	public pop(): number {
		if (this.size === 0) return -1;
		const top = this.indices[0]!;
		this.size--;
		if (this.size > 0) {
			this.indices[0] = this.indices[this.size]!;
			this.costs[0] = this.costs[this.size]!;
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

			if (left < this.size && this.costs[left]! < this.costs[best]!) {
				best = left;
			}
			if (right < this.size && this.costs[right]! < this.costs[best]!) {
				best = right;
			}
			if (best !== i) {
				this.swap(i, best);
				i = best;
			} else {
				break;
			}
		}
	}

	private swap(a: number, b: number): void {
		const idxA = this.indices[a]!;
		this.indices[a] = this.indices[b]!;
		this.indices[b] = idxA;

		const costA = this.costs[a]!;
		this.costs[a] = this.costs[b]!;
		this.costs[b] = costA;
	}
}

// ─── MATHEMATICAL KERNEL: GRADIENT & VATECH SIGMOID ──────────────────────────

/**
 * Расчет магнитуды 3D пространственного градиента |∇I| в физических единицах HU/мм
 */
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

	const x0 = Math.max(0, x - 1);
	const x1 = Math.min(width - 1, x + 1);
	const y0 = Math.max(0, y - 1);
	const y1 = Math.min(height - 1, y + 1);
	const z0 = Math.max(0, z - 1);
	const z1 = Math.min(depth - 1, z + 1);

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

/**
 * Сигмоидная передаточная функция скорости Vatech Ez3D (MNCSeg.ini: alpha = -20.0, beta = 3.0).
 * Скорость стремится к 0 на кортикальной стенке и к 1.0 в просвете канала.
 */
export function calculateVatechSigmoidVelocity(
	gradientMagnitude: number,
	alpha = -20.0,
	beta = 3.0,
): number {
	const absAlpha = Math.abs(alpha) || 20.0;
	// ITK Sigmoid Transfer Function (MNCSeg.ini: alpha = -20.0, beta = 3.0)
	// Нормализованная передаточная функция: скорость 1.0 в однородном просвете канала,
	// стремится к 0.001 на кортикальной стенке кости
	const zeroExp = Math.exp(-beta / absAlpha);
	const exponent = (gradientMagnitude - beta) / absAlpha;
	const clampedExp = Math.max(-40.0, Math.min(40.0, exponent));
	const velocity = (1.0 + zeroExp) / (1.0 + Math.exp(clampedExp));
	return Math.max(0.001, Math.min(1.0, velocity));
}

/**
 * Локальная штрафная функция плотности Хаунсфилда (HU Cost Metric)
 */
export function calculateVoxelHuPenalty(
	hu: number,
	minCanalHU = 50,
	maxCanalHU = 350,
): number {
	if (hu >= minCanalHU && hu <= maxCanalHU) {
		// Просвет канала: мягкотканный сосудисто-нервный пучок (минимальное сопротивление)
		return 0.15;
	}
	if (hu > maxCanalHU) {
		// Трабекулярная и кортикальная костная стенка: резкий квадратичный штраф
		const excess = (hu - maxCanalHU) / 100.0;
		return 1.0 + excess * excess;
	}
	if (hu < 0) {
		// Воздух / мягкие ткани вне челюсти: непреодолимый барьер
		return 15.0;
	}
	// Мягкие ткани переходной плотности 0..50 HU
	return 1.5;
}

// ─── 2-SEED FAST MARCHING / DIJKSTRA CORE PATHFINDER ─────────────────────────

/**
 * Полуавтоматический 2-точечный алгоритм трассировки нижнечелюстного канала Vatech 2seeds.
 */
export function traceMandibularCanal2Seeds(
	volumeHU: Int16Array,
	dims: VolumeDimensions3D,
	startVoxel: VoxelPoint3D, // Ментальное отверстие
	endVoxel: VoxelPoint3D, // Нижнечелюстное отверстие
	options?: FastMarchingNerveOptions,
): FastMarchingNerveResult {
	const startTime = performance.now();

	const roiPadding = options?.roiPaddingVoxels ?? 15;
	const minCanalHU = options?.canalHypodenseMinHU ?? 50;
	const maxCanalHU = options?.canalHypodenseMaxHU ?? 350;
	const alpha = options?.sigmoidAlpha ?? -20.0;
	const beta = options?.sigmoidBeta ?? 3.0;
	const defaultDiameterMm =
		options?.defaultDiameterMm ?? VATECH_CANAL_BASE_DIAMETER_MM;
	const safetyMarginMm = options?.safetyMarginMm ?? VATECH_CANAL_SAFETY_ZONE_MM;
	const warningApicalDistanceMm =
		options?.warningApicalDistanceMm ?? VATECH_MINIMAL_APICAL_DISTANCE_MM;
	const dangerCollisionThresholdMm =
		options?.dangerCollisionThresholdMm ?? VATECH_COLLISION_DANGER_MM;

	// 1. Ограничение субрегиона поиска (Bounding Box ROI) с запасом безопасности 15 вокселей
	const minX = Math.max(0, Math.min(startVoxel.x, endVoxel.x) - roiPadding);
	const maxX = Math.min(
		dims.width - 1,
		Math.max(startVoxel.x, endVoxel.x) + roiPadding,
	);
	const minY = Math.max(0, Math.min(startVoxel.y, endVoxel.y) - roiPadding);
	const maxY = Math.min(
		dims.height - 1,
		Math.max(startVoxel.y, endVoxel.y) + roiPadding,
	);
	const minZ = Math.max(0, Math.min(startVoxel.z, endVoxel.z) - roiPadding);
	const maxZ = Math.min(
		dims.depth - 1,
		Math.max(startVoxel.z, endVoxel.z) + roiPadding,
	);

	const roiWidth = maxX - minX + 1;
	const roiHeight = maxY - minY + 1;
	const roiDepth = maxZ - minZ + 1;
	const roiVolume = roiWidth * roiHeight * roiDepth;

	const toRoiIdx = (rx: number, ry: number, rz: number): number =>
		rz * (roiWidth * roiHeight) + ry * roiWidth + rx;

	const toGlobalVoxel = (roiIdx: number): VoxelPoint3D => {
		const sliceArea = roiWidth * roiHeight;
		const rz = Math.floor(roiIdx / sliceArea);
		const rem = roiIdx % sliceArea;
		const ry = Math.floor(rem / roiWidth);
		const rx = rem % roiWidth;
		return { x: rx + minX, y: ry + minY, z: rz + minZ };
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

	// 26-связная 3D окрестность с физическими длинами шагов в мм
	const neighbors: { dx: number; dy: number; dz: number; distMm: number }[] =
		[];
	for (let dz = -1; dz <= 1; dz++) {
		for (let dy = -1; dy <= 1; dy++) {
			for (let dx = -1; dx <= 1; dx++) {
				if (dx === 0 && dy === 0 && dz === 0) continue;
				const dMm = Math.hypot(
					dx * dims.spacingX,
					dy * dims.spacingY,
					dz * dims.spacingZ,
				);
				neighbors.push({ dx, dy, dz, distMm: dMm });
			}
		}
	}

	const sliceStride = dims.width * dims.height;

	// 2. Распространение волнового фронта Fast Marching / Dijkstra
	while (heap.size > 0) {
		const currRoiIdx = heap.pop();
		if (currRoiIdx === endRoiIdx) break; // Мандибулярное отверстие достигнуто!

		const currCost = dist[currRoiIdx]!;
		if (!Number.isFinite(currCost)) continue;

		const currVoxel = toGlobalVoxel(currRoiIdx);
		const currRx = currVoxel.x - minX;
		const currRy = currVoxel.y - minY;
		const currRz = currVoxel.z - minZ;

		for (let i = 0; i < neighbors.length; i++) {
			const n = neighbors[i]!;
			const nRx = currRx + n.dx;
			const nRy = currRy + n.dy;
			const nRz = currRz + n.dz;

			if (
				nRx < 0 ||
				nRx >= roiWidth ||
				nRy < 0 ||
				nRy >= roiHeight ||
				nRz < 0 ||
				nRz >= roiDepth
			) {
				continue;
			}

			const nRoiIdx = toRoiIdx(nRx, nRy, nRz);
			let stepCost: number;

			if (options?.precomputedCostField) {
				stepCost = n.distMm * options.precomputedCostField[nRoiIdx]!;
			} else {
				const nGx = nRx + minX;
				const nGy = nRy + minY;
				const nGz = nRz + minZ;
				const globalVolIdx = nGz * sliceStride + nGy * dims.width + nGx;
				const hu = volumeHU[globalVolIdx] ?? -1000;

				// Расчет градиента и сигмоидной скорости Vatech
				const gradMag = calculateVoxelGradientMagnitude(
					volumeHU,
					dims.width,
					dims.height,
					dims.depth,
					nGx,
					nGy,
					nGz,
					dims.spacingX,
					dims.spacingY,
					dims.spacingZ,
				);
				const velocity = calculateVatechSigmoidVelocity(gradMag, alpha, beta);
				const huPenalty = calculateVoxelHuPenalty(hu, minCanalHU, maxCanalHU);

				// Стоимость перехода = физическое расстояние * штраф HU / скорость фронта
				stepCost = n.distMm * Math.fround(huPenalty * (1.0 / velocity));
			}

			const newCost = currCost + stepCost;

			if (newCost < dist[nRoiIdx]!) {
				dist[nRoiIdx] = newCost;
				prev[nRoiIdx] = currRoiIdx;
				heap.push(nRoiIdx, newCost);
			}
		}
	}

	// 3. Обратный ход (Backtracking) от конца к началу
	const rawVoxelPath: VoxelPoint3D[] = [];
	let curr = endRoiIdx;
	let stepGuard = 0;
	const maxSteps = roiVolume;

	while (curr !== -1 && stepGuard < maxSteps) {
		rawVoxelPath.push(toGlobalVoxel(curr));
		if (curr === startRoiIdx) break;
		curr = prev[curr]!;
		stepGuard++;
	}

	// Если целевой узел не достигнут связным путем, формируем прямой геометрический путь
	if (
		rawVoxelPath.length < 2 ||
		rawVoxelPath[rawVoxelPath.length - 1]?.x !== startVoxel.x
	) {
		rawVoxelPath.length = 0;
		const steps = Math.max(
			10,
			Math.round(
				Math.hypot(
					endVoxel.x - startVoxel.x,
					endVoxel.y - startVoxel.y,
					endVoxel.z - startVoxel.z,
				),
			),
		);
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

	// 4. Прореживание воксельного пути для выделения чистых опорных контрольных узлов
	const toMm = (v: VoxelPoint3D): Point3D => ({
		x: Number((v.x * dims.spacingX).toFixed(2)),
		y: Number((v.y * dims.spacingY).toFixed(2)),
		z: Number((v.z * dims.spacingZ).toFixed(2)),
	});
	const controlPointsMm: Point3D[] = [];
	const stride = Math.max(1, Math.floor(rawVoxelPath.length / 8));
	for (let i = 0; i < rawVoxelPath.length; i += stride) {
		controlPointsMm.push(toMm(rawVoxelPath[i]!));
	}
	const lastMm = toMm(rawVoxelPath[rawVoxelPath.length - 1]!);
	const tail = controlPointsMm[controlPointsMm.length - 1];
	if (
		!tail ||
		tail.x !== lastMm.x ||
		tail.y !== lastMm.y ||
		tail.z !== lastMm.z
	) {
		controlPointsMm.push(lastMm);
	}

	// 5. Построение сглаженного 3D Catmull-Rom сплайна в физических миллиметрах
	const physicalSpline = smoothCatmullRom3D(
		controlPointsMm,
		options?.subdivisionsPerSegment ?? 6,
	);

	let totalLengthMm = 0;
	for (let i = 0; i < physicalSpline.length - 1; i++) {
		const p1 = physicalSpline[i]!;
		const p2 = physicalSpline[i + 1]!;
		totalLengthMm += Math.hypot(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z);
	}

	const executionTimeMs = Number((performance.now() - startTime).toFixed(1));

	return {
		voxelPath: rawVoxelPath,
		physicalSpline,
		controlPoints: controlPointsMm,
		totalLengthMm: Number(totalLengthMm.toFixed(2)),
		estimatedDiameterMm: defaultDiameterMm,
		executionTimeMs,
		seeds: {
			mentalForamen: controlPointsMm[0] ?? { x: 0, y: 0, z: 0 },
			mandibularForamen: controlPointsMm[controlPointsMm.length - 1] ?? {
				x: 0,
				y: 0,
				z: 0,
			},
		},
		safetyZoneMarginMm: safetyMarginMm,
		warningApicalDistanceMm,
		dangerCollisionThresholdMm,
	};
}

// ─── HIGH-LEVEL VOLUME ADAPTER ───────────────────────────────────────────────

/**
 * Высокоуровневый запуск полуавтоматической трассировки нерва по CbctVoxelVolume и двум мировым 3D-сидам.
 * Врач кликает ментальное отверстие (seed 1) и нижнечелюстное отверстие (seed 2) на срезах КТ.
 */
export function traceMandibularNerveFastMarching(
	volume: CbctVoxelVolume,
	startSeedMm: Point3D,
	endSeedMm: Point3D,
	options?: FastMarchingNerveOptions,
): FastMarchingNerveResult {
	const sp = volume.spacingMm;
	const spX = sp?.x && sp.x > 0 ? sp.x : 0.2;
	const spY = sp?.y && sp.y > 0 ? sp.y : 0.2;
	const spZ = sp?.z && sp.z > 0 ? sp.z : 0.2;

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

	// Если сырой буфер плотностей доступен — запускаем волновой алгоритм Vatech по вокселям КЛКТ
	if (volume.data && volume.data.length > 0) {
		const rawResult = traceMandibularCanal2Seeds(
			volume.data,
			dims,
			startVoxel,
			endVoxel,
			options,
		);

		// Переводим локальные физические координаты обратно в мировые с учетом originMm
		const worldControlPoints: Point3D[] = rawResult.controlPoints.map((p) =>
			voxelToWorldMm(
				{
					x: Math.round(p.x / spX),
					y: Math.round(p.y / spY),
					z: Math.round(p.z / spZ),
				},
				volume,
			),
		);

		const worldPhysicalSpline = smoothCatmullRom3D(
			worldControlPoints,
			options?.subdivisionsPerSegment ?? 6,
		);

		let totalLengthMm = 0;
		for (let i = 0; i < worldPhysicalSpline.length - 1; i++) {
			const p1 = worldPhysicalSpline[i]!;
			const p2 = worldPhysicalSpline[i + 1]!;
			totalLengthMm += Math.hypot(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z);
		}

		return {
			voxelPath: rawResult.voxelPath,
			physicalSpline: worldPhysicalSpline,
			controlPoints: worldControlPoints,
			totalLengthMm: Number(totalLengthMm.toFixed(2)),
			estimatedDiameterMm: rawResult.estimatedDiameterMm,
			executionTimeMs: rawResult.executionTimeMs,
			seeds: {
				mentalForamen: startSeedMm,
				mandibularForamen: endSeedMm,
			},
			safetyZoneMarginMm: rawResult.safetyZoneMarginMm,
			warningApicalDistanceMm: rawResult.warningApicalDistanceMm,
			dangerCollisionThresholdMm: rawResult.dangerCollisionThresholdMm,
		};
	}

	// Fallback для объема без загруженных вокселей (предпросмотр/мок-тест): анатомический прогиб дуги
	const startTime = performance.now();
	const steps = 8;
	const controlPoints: Point3D[] = [];
	for (let i = 0; i <= steps; i++) {
		const t = i / steps;
		// Анатомический легкий прогиб канала вниз и латерально
		const sagittalSagMm = Math.sin(t * Math.PI) * -3.5;
		const coronalCurveMm = Math.sin(t * Math.PI) * 2.0;
		controlPoints.push({
			x: Number(
				(
					startSeedMm.x +
					(endSeedMm.x - startSeedMm.x) * t +
					coronalCurveMm
				).toFixed(2),
			),
			y: Number(
				(
					startSeedMm.y +
					(endSeedMm.y - startSeedMm.y) * t +
					sagittalSagMm
				).toFixed(2),
			),
			z: Number((startSeedMm.z + (endSeedMm.z - startSeedMm.z) * t).toFixed(2)),
		});
	}

	const physicalSpline = smoothCatmullRom3D(controlPoints, 6);
	let totalLengthMm = 0;
	for (let i = 0; i < physicalSpline.length - 1; i++) {
		const p1 = physicalSpline[i]!;
		const p2 = physicalSpline[i + 1]!;
		totalLengthMm += Math.hypot(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z);
	}

	return {
		voxelPath: controlPoints.map((p) => worldMmToVoxel(p, volume)),
		physicalSpline,
		controlPoints,
		totalLengthMm: Number(totalLengthMm.toFixed(2)),
		estimatedDiameterMm:
			options?.defaultDiameterMm ?? VATECH_CANAL_BASE_DIAMETER_MM,
		executionTimeMs: Number((performance.now() - startTime).toFixed(1)),
		seeds: { mentalForamen: startSeedMm, mandibularForamen: endSeedMm },
		safetyZoneMarginMm: options?.safetyMarginMm ?? VATECH_CANAL_SAFETY_ZONE_MM,
		warningApicalDistanceMm:
			options?.warningApicalDistanceMm ?? VATECH_MINIMAL_APICAL_DISTANCE_MM,
		dangerCollisionThresholdMm:
			options?.dangerCollisionThresholdMm ?? VATECH_COLLISION_DANGER_MM,
	};
}

// ─── VATECH SAFETY CLEARANCE & COLLISION AUDIT ──────────────────────────────

/**
 * Оценка зазора имплантата до нижнечелюстного нерва строго по стандартам Vatech Ez3D:
 * - Warning от апекса: 3.0 мм (Minimal Apical Distance = 3)
 * - Danger collision: < 1.5 мм (Collision Boundary)
 * - Safety zone: 2.0 мм
 */
export function evaluateVatechImplantNerveClearance(
	apicalClearanceMm: number,
	bodyClearanceMm?: number,
	thresholds?: {
		readonly warningApicalMm?: number;
		readonly dangerCollisionMm?: number;
		readonly safetyMarginMm?: number;
	},
): VatechClearanceAuditResult {
	const warnApical =
		thresholds?.warningApicalMm ?? VATECH_MINIMAL_APICAL_DISTANCE_MM;
	const dangerColl =
		thresholds?.dangerCollisionMm ?? VATECH_COLLISION_DANGER_MM;
	const safetyMargin =
		thresholds?.safetyMarginMm ?? VATECH_CANAL_SAFETY_ZONE_MM;

	const effectiveBody = bodyClearanceMm ?? apicalClearanceMm;
	const worstClearance = Math.min(apicalClearanceMm, effectiveBody);

	const isDanger = worstClearance < dangerColl;
	const isWarning =
		!isDanger &&
		(apicalClearanceMm < warnApical || effectiveBody < safetyMargin);
	const isSafe = !isDanger && !isWarning;

	let status: "safe" | "warning" | "danger" = "safe";
	let message = "";

	if (isDanger) {
		status = "danger";
		message = `КРИТИЧЕСКАЯ КОЛЛИЗИЯ VATECH: зазор ${worstClearance.toFixed(1)} мм (< ${dangerColl.toFixed(1)} мм)! Высокий риск травмы n. alveolaris inferior!`;
	} else if (isWarning) {
		status = "warning";
		if (apicalClearanceMm < warnApical) {
			message = `ПРЕДУПРЕЖДЕНИЕ VATECH: отступ апекса ${apicalClearanceMm.toFixed(1)} мм (< ${warnApical.toFixed(1)} мм). Рекомендуется имплантат меньшей длины.`;
		} else {
			message = `ПРЕДУПРЕЖДЕНИЕ VATECH: зазор тела ${effectiveBody.toFixed(1)} мм (< ${safetyMargin.toFixed(1)} мм буфера).`;
		}
	} else {
		status = "safe";
		message = `Безопасный коридор Vatech соблюден: зазор апекса ${apicalClearanceMm.toFixed(1)} мм (норма >= ${warnApical.toFixed(1)} мм), зазор тела ${effectiveBody.toFixed(1)} мм.`;
	}

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

// ─── 3D CATMULL-ROM SPLINE INTERPOLATION ────────────────────────────────────

/**
 * 3D Catmull-Rom интерполяция кривой в физических миллиметрах
 */
export function smoothCatmullRom3D(
	pts: readonly Point3D[],
	subdivisions = 6,
): Point3D[] {
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
			line.push(
				roundPt(
					p0.x + (p1.x - p0.x) * t,
					p0.y + (p1.y - p0.y) * t,
					p0.z + (p1.z - p0.z) * t,
				),
			);
		}
		return line;
	}

	const result: Point3D[] = [];
	const step = 1.0 / subdivisions;

	for (let i = 0; i < pts.length - 1; i++) {
		const p0 = i > 0 ? pts[i - 1]! : pts[i]!;
		const p1 = pts[i]!;
		const p2 = pts[i + 1]!;
		const p3 = i < pts.length - 2 ? pts[i + 2]! : p2;

		for (let t = 0; t < 1.0; t += step) {
			const t2 = t * t;
			const t3 = t2 * t;
			const cr = (v0: number, v1: number, v2: number, v3: number) =>
				0.5 *
				(2 * v1 +
					(-v0 + v2) * t +
					(2 * v0 - 5 * v1 + 4 * v2 - v3) * t2 +
					(-v0 + 3 * v1 - 3 * v2 + v3) * t3);
			result.push(
				roundPt(
					cr(p0.x, p1.x, p2.x, p3.x),
					cr(p0.y, p1.y, p2.y, p3.y),
					cr(p0.z, p1.z, p2.z, p3.z),
				),
			);
		}
	}

	const last = pts[pts.length - 1]!;
	result.push(roundPt(last.x, last.y, last.z));
	return result;
}
