/**
 * DENTE CRM — CBCT CPU Slice Multi-Threaded Web Worker Engine (FEAT-010)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 *
 * Runs computationally intensive 3D sub-voxel trilinear MPR slice extraction
 * in a dedicated background Web Worker thread, eliminating main thread UI freezes.
 *
 * Capabilities:
 * 1. Zero-copy transferable ArrayBuffer pixel pipeline for 60 FPS responsiveness.
 * 2. In-worker voxel volume caching to eliminate redundant data transfer.
 * 3. Arbitrary oblique angle rotation and slab thickness (MIP/MinIP/Average).
 * 4. Exported pure message handler for deterministic testing in Node/SSR.
 */

import type {
	CbctVoxelVolume,
	MprPlane,
	MprSliceMetadata,
	Point3D,
	SlabProjectionMode,
} from "../cbctMprMath";
import type { ObliqueRotationAngles } from "../cbctObliqueMatrixMath";
import {
	extractObliqueMprSlice,
	type ObliqueSliceRenderOptions,
} from "../cbctObliqueSliceMath";

// ─── MESSAGE PROTOCOL TYPES ──────────────────────────────────────────────────

export interface InitVolumePayload {
	volumeId: string;
	dimensions: { width: number; height: number; depth: number };
	spacingMm: { x: number; y: number; z: number };
	originMm: Point3D;
	physicalSizeMm?: { x: number; y: number; z: number } | undefined;
	data: Int16Array;
	minHU: number;
	maxHU: number;
	rescaleSlope?: number | undefined;
	rescaleIntercept?: number | undefined;
	defaultWindowWidth?: number | undefined;
	defaultWindowLevel?: number | undefined;
}

export interface RenderSlicePayload {
	requestId: number;
	volumeId: string;
	plane: MprPlane;
	crosshairMm: Point3D;
	angles: ObliqueRotationAngles;
	options: {
		windowWidth: number;
		windowLevel: number;
		invert?: boolean | undefined;
		slabMode?: SlabProjectionMode | undefined;
		slabThicknessMm?: number | undefined;
		interpolation?: "nearest" | "trilinear" | undefined;
	};
}

export interface RenderAllPlanesPayload {
	requestId: number;
	volumeId: string;
	crosshairMm: Point3D;
	angles: ObliqueRotationAngles;
	options: {
		windowWidth: number;
		windowLevel: number;
		invert?: boolean | undefined;
		slabMode?: SlabProjectionMode | undefined;
		slabThicknessMm?: number | undefined;
		interpolation?: "nearest" | "trilinear" | undefined;
	};
}

export interface DisposeVolumePayload {
	volumeId: string;
}

export type CbctWorkerInboundMessage =
	| ({ type: "INIT_VOLUME" } & InitVolumePayload)
	| ({ type: "RENDER_SLICE" } & RenderSlicePayload)
	| ({ type: "RENDER_ALL_PLANES" } & RenderAllPlanesPayload)
	| ({ type: "DISPOSE_VOLUME" } & DisposeVolumePayload);

export type CbctWorkerOutboundMessage =
	| {
			type: "VOLUME_INITIALIZED";
			volumeId: string;
	  }
	| {
			type: "SLICE_RENDERED";
			requestId: number;
			volumeId: string;
			plane: MprPlane;
			metadata: MprSliceMetadata;
			pixelBuffer: ArrayBufferLike;
	  }
	| {
			type: "ALL_PLANES_RENDERED";
			requestId: number;
			volumeId: string;
			slices: {
				axial: { metadata: MprSliceMetadata; pixelBuffer: ArrayBufferLike };
				coronal: { metadata: MprSliceMetadata; pixelBuffer: ArrayBufferLike };
				sagittal: { metadata: MprSliceMetadata; pixelBuffer: ArrayBufferLike };
			};
	  }
	| {
			type: "VOLUME_DISPOSED";
			volumeId: string;
	  }
	| {
			type: "ERROR";
			requestId?: number | undefined;
			volumeId?: string | undefined;
			error: string;
	  };

// ─── WORKER CACHE & MESSAGE HANDLER ──────────────────────────────────────────

export const workerVolumeCache = new Map<string, CbctVoxelVolume>();

/**
 * Pure message processing function decoupled from worker globals.
 * Enables 100% deterministic test coverage in Node.js and headless environments.
 */
export function handleWorkerMessage(
	msg: CbctWorkerInboundMessage,
	postMessage: (response: CbctWorkerOutboundMessage, transfer?: Transferable[]) => void,
	cache: Map<string, CbctVoxelVolume> = workerVolumeCache,
): void {
	if (!msg || typeof msg !== "object" || !("type" in msg)) {
		postMessage({
			type: "ERROR",
			error: "Invalid worker message: missing type property.",
		});
		return;
	}

	switch (msg.type) {
		case "INIT_VOLUME": {
			try {
				const vol: CbctVoxelVolume = {
					id: msg.volumeId,
					dimensions: msg.dimensions,
					spacingMm: msg.spacingMm,
					originMm: msg.originMm,
					physicalSizeMm: msg.physicalSizeMm ?? {
						x: msg.dimensions.width * msg.spacingMm.x,
						y: msg.dimensions.height * msg.spacingMm.y,
						z: msg.dimensions.depth * msg.spacingMm.z,
					},
					data: msg.data,
					minHU: msg.minHU,
					maxHU: msg.maxHU,
					...(msg.rescaleSlope !== undefined ? { rescaleSlope: msg.rescaleSlope } : {}),
					...(msg.rescaleIntercept !== undefined ? { rescaleIntercept: msg.rescaleIntercept } : {}),
					...(msg.defaultWindowWidth !== undefined ? { defaultWindowWidth: msg.defaultWindowWidth } : {}),
					...(msg.defaultWindowLevel !== undefined ? { defaultWindowLevel: msg.defaultWindowLevel } : {}),
					isDisposed: false,
				};
				cache.set(msg.volumeId, vol);
				postMessage({
					type: "VOLUME_INITIALIZED",
					volumeId: msg.volumeId,
				});
			} catch (err) {
				postMessage({
					type: "ERROR",
					volumeId: msg.volumeId,
					error: `Failed to initialize volume: ${err instanceof Error ? err.message : String(err)}`,
				});
			}
			break;
		}

		case "RENDER_SLICE": {
			const vol = cache.get(msg.volumeId);
			if (!vol || !vol.data || vol.isDisposed) {
				postMessage({
					type: "ERROR",
					requestId: msg.requestId,
					volumeId: msg.volumeId,
					error: `Volume "${msg.volumeId}" is not cached or has been disposed.`,
				});
				return;
			}

			try {
				const renderOpts: ObliqueSliceRenderOptions = {
					windowWidth: msg.options.windowWidth,
					windowLevel: msg.options.windowLevel,
					...(msg.options.invert !== undefined ? { invert: msg.options.invert } : {}),
					...(msg.options.slabMode !== undefined ? { slabMode: msg.options.slabMode } : {}),
					...(msg.options.slabThicknessMm !== undefined ? { slabThicknessMm: msg.options.slabThicknessMm } : {}),
					...(msg.options.interpolation !== undefined ? { interpolation: msg.options.interpolation } : {}),
				};

				const result = extractObliqueMprSlice(
					vol,
					msg.plane,
					msg.crosshairMm,
					msg.angles,
					renderOpts,
				);

				const pixelBuffer = result.data.buffer;
				const transferList: Transferable[] =
					typeof ArrayBuffer !== "undefined" && pixelBuffer instanceof ArrayBuffer
						? [pixelBuffer]
						: [];

				postMessage(
					{
						type: "SLICE_RENDERED",
						requestId: msg.requestId,
						volumeId: msg.volumeId,
						plane: msg.plane,
						metadata: result.metadata,
						pixelBuffer,
					},
					transferList,
				);
			} catch (err) {
				postMessage({
					type: "ERROR",
					requestId: msg.requestId,
					volumeId: msg.volumeId,
					error: `Failed to render slice: ${err instanceof Error ? err.message : String(err)}`,
				});
			}
			break;
		}

		case "RENDER_ALL_PLANES": {
			const vol = cache.get(msg.volumeId);
			if (!vol || !vol.data || vol.isDisposed) {
				postMessage({
					type: "ERROR",
					requestId: msg.requestId,
					volumeId: msg.volumeId,
					error: `Volume "${msg.volumeId}" is not cached or has been disposed.`,
				});
				return;
			}

			try {
				const renderOpts: ObliqueSliceRenderOptions = {
					windowWidth: msg.options.windowWidth,
					windowLevel: msg.options.windowLevel,
					...(msg.options.invert !== undefined ? { invert: msg.options.invert } : {}),
					...(msg.options.slabMode !== undefined ? { slabMode: msg.options.slabMode } : {}),
					...(msg.options.slabThicknessMm !== undefined ? { slabThicknessMm: msg.options.slabThicknessMm } : {}),
					...(msg.options.interpolation !== undefined ? { interpolation: msg.options.interpolation } : {}),
				};

				const axialRes = extractObliqueMprSlice(vol, "axial", msg.crosshairMm, msg.angles, renderOpts);
				const coronalRes = extractObliqueMprSlice(vol, "coronal", msg.crosshairMm, msg.angles, renderOpts);
				const sagittalRes = extractObliqueMprSlice(vol, "sagittal", msg.crosshairMm, msg.angles, renderOpts);

				const axialBuf = axialRes.data.buffer;
				const coronalBuf = coronalRes.data.buffer;
				const sagittalBuf = sagittalRes.data.buffer;

				const transferList: Transferable[] = [];
				if (typeof ArrayBuffer !== "undefined") {
					if (axialBuf instanceof ArrayBuffer) transferList.push(axialBuf);
					if (coronalBuf instanceof ArrayBuffer) transferList.push(coronalBuf);
					if (sagittalBuf instanceof ArrayBuffer) transferList.push(sagittalBuf);
				}

				postMessage(
					{
						type: "ALL_PLANES_RENDERED",
						requestId: msg.requestId,
						volumeId: msg.volumeId,
						slices: {
							axial: { metadata: axialRes.metadata, pixelBuffer: axialBuf },
							coronal: { metadata: coronalRes.metadata, pixelBuffer: coronalBuf },
							sagittal: { metadata: sagittalRes.metadata, pixelBuffer: sagittalBuf },
						},
					},
					transferList,
				);
			} catch (err) {
				postMessage({
					type: "ERROR",
					requestId: msg.requestId,
					volumeId: msg.volumeId,
					error: `Failed to render all planes: ${err instanceof Error ? err.message : String(err)}`,
				});
			}
			break;
		}

		case "DISPOSE_VOLUME": {
			const vol = cache.get(msg.volumeId);
			if (vol) {
				vol.data = null;
				(vol as { isDisposed: boolean }).isDisposed = true;
				cache.delete(msg.volumeId);
			}
			postMessage({
				type: "VOLUME_DISPOSED",
				volumeId: msg.volumeId,
			});
			break;
		}

		default: {
			const unknownMsg = msg as { type?: string };
			postMessage({
				type: "ERROR",
				error: `Unrecognized message type: "${unknownMsg.type}"`,
			});
			break;
		}
	}
}

// ─── AUTOMATIC WORKER RUNTIME HOOK ───────────────────────────────────────────

const isDedicatedWorkerScope =
	typeof self !== "undefined" &&
	typeof (self as unknown as { postMessage?: unknown }).postMessage === "function" &&
	typeof (self as unknown as { document?: unknown }).document === "undefined";

if (isDedicatedWorkerScope) {
	self.onmessage = (event: MessageEvent<CbctWorkerInboundMessage>) => {
		handleWorkerMessage(
			event.data,
			(response, transfer) => {
				if (transfer && transfer.length > 0) {
					(self as unknown as { postMessage: (msg: unknown, transfer: Transferable[]) => void }).postMessage(
						response,
						transfer,
					);
				} else {
					(self as unknown as { postMessage: (msg: unknown) => void }).postMessage(response);
				}
			},
			workerVolumeCache,
		);
	};
}
