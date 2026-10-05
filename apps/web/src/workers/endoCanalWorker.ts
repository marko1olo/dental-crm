/// <reference lib="webworker" />
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT: ENDODONTIC ROOT CANAL ANALYSIS WEB WORKER (FEAT-ENDO-3D)
 * ═══════════════════════════════════════════════════════════════════════════
 * Dedicated off-main-thread Web Worker for heavy volumetric endodontic analysis:
 * - 3D Multi-scale Hessian Frangi tubeness calculation (sigma 0.35, 0.60 mm)
 * - 26-Connected Anisotropic Fast Marching Method (FMM Eikonal PDE solver)
 * - 4th-Order Runge-Kutta (RK4) geodesic lumen backtracing
 * - Catmull-Rom spline arc-length reparameterization (0.1 mm precision)
 * - Schneider curvature angle & Pruett minimum radius of curvature
 * - Vertucci root canal morphology classification (Types I through VIII)
 *
 * Keeps the React UI completely responsive at 60 FPS without dropping frames.
 * Standards: ITI Endodontics, ESE CBCT Consensus, Order 804n.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
	computeMultiscaleFrangiVolume,
	extractRootCanalSystem,
	buildEndoToothClinicalReport,
	type CbctVoxelVolume,
	type EndoToothClinicalReport,
	type TracedCanalPath,
	type FrangiParameters,
} from "@dental/shared";

export interface EndoCanalWorkerComputePayload {
	readonly type: "compute_endo";
	readonly requestId: string;
	readonly toothFdi: number;
	readonly dimensions: [number, number, number];
	readonly spacingMm: [number, number, number];
	readonly originMm: [number, number, number];
	readonly voxelData: Int16Array;
	readonly options?: {
		readonly scalesMm?: number[] | undefined;
		readonly darkTubeness?: boolean | undefined;
		readonly expectedCanalCount?: number | undefined;
		readonly alpha?: number | undefined;
		readonly beta?: number | undefined;
		readonly c?: number | undefined;
	} | undefined;
}

export interface EndoCanalWorkerPingPayload {
	readonly type: "ping";
	readonly requestId?: string;
}

export type EndoCanalWorkerInboundMessage =
	| EndoCanalWorkerComputePayload
	| EndoCanalWorkerPingPayload;

export interface EndoCanalWorkerComputeSuccessResponse {
	readonly success: true;
	readonly type: "compute_endo";
	readonly requestId: string;
	readonly toothFdi: number;
	readonly report: EndoToothClinicalReport;
	readonly canals: TracedCanalPath[];
	readonly telemetry: {
		readonly frangiMs: number;
		readonly fmmMs: number;
		readonly totalMs: number;
		readonly voxelCount: number;
	};
}

export interface EndoCanalWorkerErrorResponse {
	readonly success: false;
	readonly type: "error";
	readonly requestId: string;
	readonly error: string;
}

export interface EndoCanalWorkerPongResponse {
	readonly success: true;
	readonly type: "pong";
	readonly requestId?: string;
	readonly timestamp: number;
}

export type EndoCanalWorkerOutboundMessage =
	| EndoCanalWorkerComputeSuccessResponse
	| EndoCanalWorkerErrorResponse
	| EndoCanalWorkerPongResponse;

// Dedicated Worker global scope
const ctx = (typeof self !== "undefined" ? self : {}) as DedicatedWorkerGlobalScope;

if (typeof ctx.addEventListener === "function") {
	ctx.addEventListener("message", (event: MessageEvent<EndoCanalWorkerInboundMessage>) => {
		const req = event.data;
		if (!req || typeof req !== "object") {
			return;
		}

		if (req.type === "ping") {
			const pong: EndoCanalWorkerPongResponse = {
				success: true,
				type: "pong",
				...(req.requestId !== undefined ? { requestId: req.requestId } : {}),
				timestamp: Date.now(),
			};
			ctx.postMessage(pong);
			return;
		}

		if (req.type === "compute_endo") {
			const tStart = performance.now();
			const { requestId, toothFdi, dimensions, spacingMm, originMm, voxelData, options } = req;

			try {
				const [nx, ny, nz] = dimensions;
				const [sx, sy, sz] = spacingMm;
				const [ox, oy, oz] = originMm;

				const subVolume: CbctVoxelVolume = {
					id: `sub_${toothFdi}_${Date.now()}`,
					data: voxelData,
					dimensions: { width: nx, height: ny, depth: nz },
					spacingMm: { x: sx, y: sy, z: sz },
					originMm: { x: ox, y: oy, z: oz },
					physicalSizeMm: { x: nx * sx, y: ny * sy, z: nz * sz },
					minHU: -1024,
					maxHU: 3071,
					isDisposed: false,
				};

				const frangiParams: FrangiParameters = {
					alpha: options?.alpha ?? 0.5,
					beta: options?.beta ?? 0.5,
					c: options?.c ?? 15.0,
					scalesMm: options?.scalesMm ?? [0.35, 0.60],
					darkTubeness: options?.darkTubeness ?? true,
				};

				const tFrangiStart = performance.now();
				const frangiRes = computeMultiscaleFrangiVolume(subVolume, undefined, frangiParams);
				const frangiMs = performance.now() - tFrangiStart;

				const expectedCount = options?.expectedCanalCount ?? ([16, 17, 26, 27].includes(toothFdi) ? 4 : [36, 37, 46, 47].includes(toothFdi) ? 3 : 1);

				const tFmmStart = performance.now();
				const canalSystem = extractRootCanalSystem(subVolume, frangiRes, expectedCount);
				const fmmMs = performance.now() - tFmmStart;

				const report = buildEndoToothClinicalReport(canalSystem.canals, toothFdi);
				const totalMs = performance.now() - tStart;

				const successResponse: EndoCanalWorkerComputeSuccessResponse = {
					success: true,
					type: "compute_endo",
					requestId,
					toothFdi,
					report,
					canals: canalSystem.canals,
					telemetry: {
						frangiMs: Number(frangiMs.toFixed(1)),
						fmmMs: Number(fmmMs.toFixed(1)),
						totalMs: Number(totalMs.toFixed(1)),
						voxelCount: nx * ny * nz,
					},
				};

				ctx.postMessage(successResponse);
			} catch (err) {
				const errMessage = err instanceof Error ? err.message : String(err);
				const errorResponse: EndoCanalWorkerErrorResponse = {
					success: false,
					type: "error",
					requestId,
					error: errMessage,
				};
				ctx.postMessage(errorResponse);
			}
		}
	});
}
