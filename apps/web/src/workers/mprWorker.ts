/// <reference lib="webworker" />
import {
	computeCrossSection,
	type VolumeSamplingData,
	type Point2,
} from "@dental/shared";
import {
	generatePanoramicImage,
	type MprWorkerRequest,
	type MprWorkerResponse,
	type CrossSectionWorkerRequest,
	type CrossSectionWorkerResponse,
	type PanoramicWorkerRequest,
	type PanoramicWorkerResponse,
} from "../utils/math/mprMath";

declare const self: DedicatedWorkerGlobalScope;

// Scope the worker global explicitly. DedicatedWorkerGlobalScope carries the
// (message, transfer[]) overload needed for zero-copy Transferable Objects transfer.
const ctx: DedicatedWorkerGlobalScope = self;

function isCrossSectionRequest(req: unknown): req is CrossSectionWorkerRequest {
	return (
		typeof req === "object" &&
		req !== null &&
		"type" in req &&
		(req.type === "crossSection" || req.type === "cross_section")
	);
}

function isPanoramicRequest(req: unknown): req is PanoramicWorkerRequest & { type?: string } {
	return (
		typeof req === "object" &&
		req !== null &&
		("splinePoints" in req ||
			("type" in req && (req.type === "panoramic" || req.type === "panoramic_opg")))
	);
}

ctx.onmessage = (e: MessageEvent<MprWorkerRequest>) => {
	const req = e.data;

	if (!req || typeof req !== "object") {
		ctx.postMessage({ success: false, error: "Невалидный запрос к Web Worker" });
		return;
	}

	const reqType = "type" in req && typeof req.type === "string" ? req.type : undefined;

	// Branch 0: Liveness & Health Check
	if (reqType === "ping") {
		ctx.postMessage({ success: true, type: "pong", timestamp: Date.now() });
		return;
	}

	// Branch 1: Orthogonal Cross-Section Reconstruction
	if (isCrossSectionRequest(req)) {
		try {
			if (!req.dimensions || !req.spacing || !req.scalarData || !req.controlPoints) {
				throw new Error("Неполные данные объема для расчета ортогонального среза");
			}

			const [nx, ny, nz] = req.dimensions;
			const sliceStride = nx * ny;
			const scalar = req.scalarData;

			const invSx = 1 / req.spacing[0];
			const invSy = 1 / req.spacing[1];
			const invSz = 1 / req.spacing[2];

			const z0 = req.origin[2];
			const z1 = req.origin[2] + (nz - 1) * req.spacing[2];
			const zMin = Math.min(z0, z1);
			const zMax = Math.max(z0, z1);
			const vSpacing = Math.abs(req.spacing[2]);

			const vol: VolumeSamplingData = {
				dims: req.dimensions,
				origin: req.origin,
				invSx,
				invSy,
				invSz,
				zMin,
				zMax,
				vSpacing,
				getVoxel: (i: number, j: number, k: number) => {
					if (i < 0 || i >= nx || j < 0 || j >= ny || k < 0 || k >= nz) {
						return -1024;
					}
					return scalar[k * sliceStride + j * nx + i] ?? -1024;
				},
			};

			const result = computeCrossSection(vol, {
				controlPoints: req.controlPoints,
				position: req.position,
				tiltDeg: req.tiltDeg,
				widthMm: req.widthMm,
				resolution: req.resolution,
			});

			if (!result) {
				throw new Error("Не удалось рассчитать ортогональный срез кросс-секции");
			}

			// Zero-copy: transfer the pixel buffer ownership via Transferable Objects
			const ok: CrossSectionWorkerResponse = {
				success: true,
				type: "crossSection",
				width: result.width,
				height: result.height,
				horizontalSpacing: result.horizontalSpacing,
				verticalSpacing: result.verticalSpacing,
				pixelData: result.pixelData,
			};
			ctx.postMessage(ok, [result.pixelData.buffer]);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			const fail: CrossSectionWorkerResponse = {
				success: false,
				type: "crossSection",
				error: message,
			};
			ctx.postMessage(fail);
		}
		return;
	}

	// Branch 2: Panoramic Curved Planar Reformation (OPG unwrap)
	if (isPanoramicRequest(req)) {
		try {
			if (!req.scalarData || !req.dimensions || !req.spacing || !req.splinePoints) {
				throw new Error("Неполные данные объема для построения панорамной реконструкции ОПТГ");
			}

			const result = generatePanoramicImage(
				req.scalarData,
				req.dimensions,
				req.origin,
				req.direction,
				req.spacing,
				req.splinePoints,
				req.zStartWorld,
				req.zEndWorld,
				req.zStepWorld,
				req.thickness,
				req.blendMode,
			);

			// Zero-copy: transfer the pixel buffer ownership to the main UI thread
			const ok: PanoramicWorkerResponse = {
				success: true,
				type: "panoramic",
				width: result.width,
				height: result.height,
				pixels: result.pixels,
			};
			ctx.postMessage(ok, [result.pixels.buffer]);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			const fail: PanoramicWorkerResponse = {
				success: false,
				type: "panoramic",
				error: message,
			};
			ctx.postMessage(fail);
		}
		return;
	}

	// Unknown message type fallback
	ctx.postMessage({
		success: false,
		error: `Неизвестный тип запроса Web Worker: ${reqType ?? "не указан"}`,
	});
};
