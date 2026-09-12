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

// Scope the worker global explicitly. DedicatedWorkerGlobalScope carries the
// (message, transfer[]) overload needed for zero-copy Transferable Objects transfer.
const ctx = self as DedicatedWorkerGlobalScope;

ctx.onmessage = (e: MessageEvent<MprWorkerRequest>) => {
	const req = e.data;

	// Branch 1: Orthogonal Cross-Section Reconstruction
	if ("type" in req && (req.type === "crossSection" || req.type === "cross_section")) {
		const csReq = req as CrossSectionWorkerRequest;
		try {
			const [nx, ny, nz] = csReq.dimensions;
			const sliceStride = nx * ny;
			const scalar = csReq.scalarData;

			const invSx = 1 / csReq.spacing[0];
			const invSy = 1 / csReq.spacing[1];
			const invSz = 1 / csReq.spacing[2];

			const z0 = csReq.origin[2];
			const z1 = csReq.origin[2] + (nz - 1) * csReq.spacing[2];
			const zMin = Math.min(z0, z1);
			const zMax = Math.max(z0, z1);
			const vSpacing = Math.abs(csReq.spacing[2]);

			const vol: VolumeSamplingData = {
				dims: csReq.dimensions,
				origin: csReq.origin,
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
				controlPoints: csReq.controlPoints as Point2[],
				position: csReq.position,
				tiltDeg: csReq.tiltDeg,
				widthMm: csReq.widthMm,
				resolution: csReq.resolution,
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
	const panReq = req as PanoramicWorkerRequest;
	try {
		const result = generatePanoramicImage(
			panReq.scalarData,
			panReq.dimensions,
			panReq.origin,
			panReq.direction,
			panReq.spacing,
			panReq.splinePoints,
			panReq.zStartWorld,
			panReq.zEndWorld,
			panReq.zStepWorld,
			panReq.thickness,
			panReq.blendMode,
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
};
