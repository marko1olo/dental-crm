/**
 * cbctWorkerRenderHandlers.ts — Обработчики рендеринга срезов MPR и серий кросс-секций (Мандат 8b).
 */

import type { CbctVoxelVolume } from "../../cbctMprMath";
import { extractObliqueMprSlice } from "../../cbctObliqueSliceMath";
import { extractArchCrossSectionSeries } from "../../cbctCrossSectionResliceMath";
import type {
	CbctWorkerOutboundMessage,
	RenderAllPlanesPayload,
	RenderCrossSectionSeriesPayload,
	RenderSlicePayload,
} from "./cbctSliceWorkerTypes";
import { cancelledRequestIds } from "./cbctWorkerVolumeLifecycle";

export function handleRenderSlice(
	msg: RenderSlicePayload,
	postMessage: (resp: CbctWorkerOutboundMessage, transfer?: Transferable[]) => void,
	cache: Map<string, CbctVoxelVolume>,
): void {
	if (cancelledRequestIds.has(msg.requestId)) {
		cancelledRequestIds.delete(msg.requestId);
		postMessage({ type: "REQUEST_ABORTED", requestId: msg.requestId, plane: msg.plane });
		return;
	}
	const vol = cache.get(msg.volumeId);
	if (!vol || !vol.data || vol.isDisposed) {
		postMessage({ type: "ERROR", requestId: msg.requestId, volumeId: msg.volumeId, error: "Volume not found or disposed." });
		return;
	}
	try {
		const slice = extractObliqueMprSlice(vol, msg.plane, msg.crosshairMm, msg.angles, msg.options);
		const rawBuf = slice.data.buffer as ArrayBuffer;
		const copyBuf = rawBuf.slice(slice.data.byteOffset, slice.data.byteOffset + slice.data.byteLength);
		postMessage(
			{ type: "SLICE_RENDERED", requestId: msg.requestId, volumeId: msg.volumeId, plane: msg.plane, metadata: slice.metadata, pixelBuffer: copyBuf },
			[copyBuf],
		);
	} catch (err) {
		postMessage({ type: "ERROR", requestId: msg.requestId, volumeId: msg.volumeId, error: `Render failed: ${err instanceof Error ? err.message : String(err)}` });
	}
}

export function handleRenderAllPlanes(
	msg: RenderAllPlanesPayload,
	postMessage: (resp: CbctWorkerOutboundMessage, transfer?: Transferable[]) => void,
	cache: Map<string, CbctVoxelVolume>,
): void {
	if (cancelledRequestIds.has(msg.requestId)) {
		cancelledRequestIds.delete(msg.requestId);
		postMessage({ type: "REQUEST_ABORTED", requestId: msg.requestId });
		return;
	}
	const vol = cache.get(msg.volumeId);
	if (!vol || !vol.data || vol.isDisposed) {
		postMessage({ type: "ERROR", requestId: msg.requestId, volumeId: msg.volumeId, error: "Volume not found or disposed." });
		return;
	}
	try {
		const ax = extractObliqueMprSlice(vol, "axial", msg.crosshairMm, msg.angles, msg.options);
		const cor = extractObliqueMprSlice(vol, "coronal", msg.crosshairMm, msg.angles, msg.options);
		const sag = extractObliqueMprSlice(vol, "sagittal", msg.crosshairMm, msg.angles, msg.options);
		const bufAx = (ax.data.buffer as ArrayBuffer).slice(ax.data.byteOffset, ax.data.byteOffset + ax.data.byteLength);
		const bufCor = (cor.data.buffer as ArrayBuffer).slice(cor.data.byteOffset, cor.data.byteOffset + cor.data.byteLength);
		const bufSag = (sag.data.buffer as ArrayBuffer).slice(sag.data.byteOffset, sag.data.byteOffset + sag.data.byteLength);
		postMessage(
			{
				type: "ALL_PLANES_RENDERED",
				requestId: msg.requestId,
				volumeId: msg.volumeId,
				slices: {
					axial: { metadata: ax.metadata, pixelBuffer: bufAx },
					coronal: { metadata: cor.metadata, pixelBuffer: bufCor },
					sagittal: { metadata: sag.metadata, pixelBuffer: bufSag },
				},
			},
			[bufAx, bufCor, bufSag],
		);
	} catch (err) {
		postMessage({ type: "ERROR", requestId: msg.requestId, volumeId: msg.volumeId, error: `AllPlanes failed: ${err instanceof Error ? err.message : String(err)}` });
	}
}

export function handleRenderCrossSectionSeries(
	msg: RenderCrossSectionSeriesPayload,
	postMessage: (resp: CbctWorkerOutboundMessage, transfer?: Transferable[]) => void,
	cache: Map<string, CbctVoxelVolume>,
): void {
	const vol = cache.get(msg.volumeId);
	if (!vol || !vol.data || vol.isDisposed) {
		postMessage({ type: "ERROR", requestId: msg.requestId, volumeId: msg.volumeId, error: "Volume not found or disposed." });
		return;
	}
	try {
		const series = extractArchCrossSectionSeries(vol, msg.archCurve, msg.options);
		const transferList: Transferable[] = [];
		for (const s of series) {
			if (s.pixelData && s.pixelData.buffer) {
				transferList.push(s.pixelData.buffer);
			}
		}
		postMessage(
			{ type: "CROSS_SECTION_SERIES_RENDERED", requestId: msg.requestId, volumeId: msg.volumeId, slices: series },
			transferList.length > 0 ? transferList : undefined,
		);
	} catch (err) {
		postMessage({ type: "ERROR", requestId: msg.requestId, volumeId: msg.volumeId, error: `Series failed: ${err instanceof Error ? err.message : String(err)}` });
	}
}
