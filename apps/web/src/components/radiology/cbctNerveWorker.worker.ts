/// <reference lib="webworker" />
/**
 * DENTE CRM — CBCT Mandibular Nerve Canal (IAN) Dedicated Web Worker
 * Offloads 3D Fast Marching / Dijkstra wavefront propagation from React UI thread.
 *
 * Clinical domain:
 * - 2-Seed semi-automatic Mandibular Canal pathfinding (Mental -> Mandibular foramen)
 * - 26-connectivity anisotropic voxel wavefront
 * - Vatech Sigmoid gradient velocity (alpha = -20.0, beta = 3.0) + HU cost metric
 * - Catmull-Rom 3D spline reconstruction in physical millimeters
 * - Vatech safety thresholds: 3.0 mm apical warning, 1.5 mm collision danger
 *
 * Guarantees zero UI freezing, sustaining 60 FPS in 3D MPR viewports.
 * Mandate 8b: Декомпозиция монолитов (строго <= 800 строк).
 */

import { voxelToWorldMm, worldMmToVoxel } from "./cbctCoordinateMath.js";
import type { Point3D } from "./cbctMprMath.js";
import { computeCostFieldAccelerated } from "./cbctNerveCostShader.js";
import {
	type FastMarchingNerveOptions,
	type FastMarchingNerveResult,
	smoothCatmullRom3D,
	traceMandibularCanal2Seeds,
	VATECH_CANAL_BASE_DIAMETER_MM,
	VATECH_CANAL_SAFETY_ZONE_MM,
	VATECH_COLLISION_DANGER_MM,
	VATECH_MINIMAL_APICAL_DISTANCE_MM,
	type VolumeDimensions3D,
} from "./fastMarchingNerve.js";

// ─── MESSAGE PROTOCOL INTERFACES ─────────────────────────────────────────────

export interface NerveWorkerComputePayload {
	readonly type: "compute_nerve";
	readonly requestId: string;
	readonly volumeDimensions: {
		readonly width: number;
		readonly height: number;
		readonly depth: number;
	};
	readonly volumeSpacingMm: {
		readonly x: number;
		readonly y: number;
		readonly z: number;
	};
	readonly volumeOriginMm?: {
		readonly x: number;
		readonly y: number;
		readonly z: number;
	};
	readonly voxelData: Int16Array;
	readonly startSeedMm: Point3D;
	readonly endSeedMm: Point3D;
	readonly options?: FastMarchingNerveOptions;
	readonly precomputedCostField?: Float32Array;
}

export interface NerveWorkerPingPayload {
	readonly type: "ping";
	readonly requestId?: string;
}

export type NerveWorkerInboundMessage =
	| NerveWorkerComputePayload
	| NerveWorkerPingPayload;

export interface NerveWorkerComputeSuccessResponse {
	readonly success: true;
	readonly type: "compute_nerve_result";
	readonly requestId: string;
	readonly result: FastMarchingNerveResult;
	readonly telemetry: {
		readonly workerDurationMs: number;
		readonly executionTimeMs: number;
		readonly voxelCount: number;
		readonly isCostFieldAccelerated: boolean;
	};
}

export interface NerveWorkerErrorResponse {
	readonly success: false;
	readonly type: "error";
	readonly requestId: string;
	readonly error: string;
}

export interface NerveWorkerPongResponse {
	readonly success: true;
	readonly type: "pong";
	readonly requestId?: string;
	readonly timestamp: number;
}

export type NerveWorkerOutboundMessage =
	| NerveWorkerComputeSuccessResponse
	| NerveWorkerErrorResponse
	| NerveWorkerPongResponse;

// Dedicated Worker global scope
const ctx = (
	typeof self !== "undefined" ? self : {}
) as DedicatedWorkerGlobalScope;

/**
 * Основной обработчик сообщений Web Worker
 */
export function handleNerveWorkerMessage(
	eventData: NerveWorkerInboundMessage,
	postMessageFn: (
		msg: NerveWorkerOutboundMessage,
		transfer?: Transferable[],
	) => void = (m) => ctx.postMessage(m),
): void {
	if (!eventData || typeof eventData !== "object") return;

	if (eventData.type === "ping") {
		postMessageFn({
			success: true,
			type: "pong",
			...(eventData.requestId ? { requestId: eventData.requestId } : {}),
			timestamp: Date.now(),
		});
		return;
	}

	if (eventData.type === "compute_nerve") {
		const tStart = performance.now();
		const {
			requestId,
			volumeDimensions,
			volumeSpacingMm,
			volumeOriginMm,
			voxelData,
			startSeedMm,
			endSeedMm,
			options,
			precomputedCostField,
		} = eventData;

		try {
			const spX = volumeSpacingMm.x > 0 ? volumeSpacingMm.x : 0.2;
			const spY = volumeSpacingMm.y > 0 ? volumeSpacingMm.y : 0.2;
			const spZ = volumeSpacingMm.z > 0 ? volumeSpacingMm.z : 0.2;

			const dims: VolumeDimensions3D = {
				width: volumeDimensions.width,
				height: volumeDimensions.height,
				depth: volumeDimensions.depth,
				spacingX: spX,
				spacingY: spY,
				spacingZ: spZ,
			};

			const mockVolume = {
				id: `worker_vol_${requestId}`,
				dimensions: volumeDimensions,
				spacingMm: volumeSpacingMm,
				originMm: volumeOriginMm ?? { x: 0, y: 0, z: 0 },
				physicalSizeMm: {
					x: volumeDimensions.width * spX,
					y: volumeDimensions.height * spY,
					z: volumeDimensions.depth * spZ,
				},
				data: voxelData,
				minHU: -1024,
				maxHU: 3071,
				isDisposed: false,
			};

			const startVoxel = worldMmToVoxel(startSeedMm, mockVolume);
			const endVoxel = worldMmToVoxel(endSeedMm, mockVolume);

			let costFieldToUse = precomputedCostField;
			let isCostFieldAccelerated = false;

			// Если готовое поле стоимостей не передано, вычисляем его в фоновом воркере
			if (!costFieldToUse) {
				const roiPadding = options?.roiPaddingVoxels ?? 15;
				const minX = Math.max(
					0,
					Math.min(startVoxel.x, endVoxel.x) - roiPadding,
				);
				const maxX = Math.min(
					dims.width - 1,
					Math.max(startVoxel.x, endVoxel.x) + roiPadding,
				);
				const minY = Math.max(
					0,
					Math.min(startVoxel.y, endVoxel.y) - roiPadding,
				);
				const maxY = Math.min(
					dims.height - 1,
					Math.max(startVoxel.y, endVoxel.y) + roiPadding,
				);
				const minZ = Math.max(
					0,
					Math.min(startVoxel.z, endVoxel.z) - roiPadding,
				);
				const maxZ = Math.min(
					dims.depth - 1,
					Math.max(startVoxel.z, endVoxel.z) + roiPadding,
				);

				const roiWidth = maxX - minX + 1;
				const roiHeight = maxY - minY + 1;
				const roiDepth = maxZ - minZ + 1;

				const costRes = computeCostFieldAccelerated(voxelData, {
					roiDimensions: {
						width: roiWidth,
						height: roiHeight,
						depth: roiDepth,
					},
					fullDimensions: {
						width: dims.width,
						height: dims.height,
						depth: dims.depth,
					},
					roiOffset: { minX, minY, minZ },
					spacing: { x: spX, y: spY, z: spZ },
					alpha: options?.sigmoidAlpha ?? -20.0,
					beta: options?.sigmoidBeta ?? 3.0,
					minCanalHU: options?.canalHypodenseMinHU ?? 50.0,
					maxCanalHU: options?.canalHypodenseMaxHU ?? 350.0,
				});

				costFieldToUse = costRes.costField;
				isCostFieldAccelerated = true;
			}

			// Выполняем 2-seed волновое распространение с полем стоимостей
			const rawResult = traceMandibularCanal2Seeds(
				voxelData,
				dims,
				startVoxel,
				endVoxel,
				{
					...options,
					precomputedCostField: costFieldToUse,
				},
			);

			// Перевод опорных контрольных узлов обратно в мировые мм
			const worldControlPoints: Point3D[] = rawResult.controlPoints.map((p) =>
				voxelToWorldMm(
					{
						x: Math.round(p.x / spX),
						y: Math.round(p.y / spY),
						z: Math.round(p.z / spZ),
					},
					mockVolume,
				),
			);

			// 3D Catmull-Rom интерполяция сплайна
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

			const workerDurationMs = Number((performance.now() - tStart).toFixed(1));

			const finalResult: FastMarchingNerveResult = {
				voxelPath: rawResult.voxelPath,
				physicalSpline: worldPhysicalSpline,
				controlPoints: worldControlPoints,
				totalLengthMm: Number(totalLengthMm.toFixed(2)),
				estimatedDiameterMm:
					rawResult.estimatedDiameterMm ?? VATECH_CANAL_BASE_DIAMETER_MM,
				executionTimeMs: workerDurationMs,
				seeds: {
					mentalForamen: startSeedMm,
					mandibularForamen: endSeedMm,
				},
				safetyZoneMarginMm:
					rawResult.safetyZoneMarginMm ?? VATECH_CANAL_SAFETY_ZONE_MM,
				warningApicalDistanceMm:
					rawResult.warningApicalDistanceMm ??
					VATECH_MINIMAL_APICAL_DISTANCE_MM,
				dangerCollisionThresholdMm:
					rawResult.dangerCollisionThresholdMm ?? VATECH_COLLISION_DANGER_MM,
			};

			postMessageFn({
				success: true,
				type: "compute_nerve_result",
				requestId,
				result: finalResult,
				telemetry: {
					workerDurationMs,
					executionTimeMs: rawResult.executionTimeMs,
					voxelCount: rawResult.voxelPath.length,
					isCostFieldAccelerated,
				},
			});
		} catch (err: unknown) {
			postMessageFn({
				success: false,
				type: "error",
				requestId,
				error: err instanceof Error ? err.message : String(err),
			});
		}
	}
}

// Автоматическая подписка при работе в нативном Web Worker
if (typeof ctx.addEventListener === "function") {
	ctx.addEventListener(
		"message",
		(event: MessageEvent<NerveWorkerInboundMessage>) => {
			handleNerveWorkerMessage(event.data);
		},
	);
}
