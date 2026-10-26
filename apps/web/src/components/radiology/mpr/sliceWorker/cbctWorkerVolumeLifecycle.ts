/**
 * cbctWorkerVolumeLifecycle.ts — Управление жизненным циклом и кэшем объемов воркера (Мандат 8b).
 */

import type { CbctVoxelVolume } from "../../cbctMprMath";
import type { AbortRequestPayload, CbctWorkerOutboundMessage, DisposeVolumePayload, InitVolumePayload } from "./cbctSliceWorkerTypes";

export const workerVolumeCache = new Map<string, CbctVoxelVolume>();
export const cancelledRequestIds = new Set<number>();

export function clearCancelledRequests(): void {
	cancelledRequestIds.clear();
}

export function handleInitVolume(
	msg: InitVolumePayload,
	postMessage: (resp: CbctWorkerOutboundMessage) => void,
	cache = workerVolumeCache,
): void {
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
		postMessage({ type: "VOLUME_INITIALIZED", volumeId: msg.volumeId });
	} catch (err) {
		postMessage({ type: "ERROR", volumeId: msg.volumeId, error: `Init error: ${err instanceof Error ? err.message : String(err)}` });
	}
}

export function handleDisposeVolume(
	msg: DisposeVolumePayload,
	postMessage: (resp: CbctWorkerOutboundMessage) => void,
	cache = workerVolumeCache,
): void {
	cache.delete(msg.volumeId);
	postMessage({ type: "VOLUME_DISPOSED", volumeId: msg.volumeId });
}

export function handleAbortRequest(
	msg: AbortRequestPayload,
	postMessage: (resp: CbctWorkerOutboundMessage) => void,
): void {
	cancelledRequestIds.add(msg.requestId);
	postMessage({ type: "REQUEST_ABORTED", requestId: msg.requestId, ...(msg.plane ? { plane: msg.plane } : {}) });
}
