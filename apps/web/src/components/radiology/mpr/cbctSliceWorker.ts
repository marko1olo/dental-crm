/**
 * cbctSliceWorker.ts — Фоновый воркер MPR реслайсинга КЛКТ (Мандат 8b <= 120 строк).
 */

import type { CbctVoxelVolume } from "../cbctMprMath";
import type { CbctWorkerInboundMessage, CbctWorkerOutboundMessage } from "./sliceWorker/cbctSliceWorkerTypes";
import {
	clearCancelledRequests,
	handleAbortRequest,
	handleDisposeVolume,
	handleInitVolume,
	workerVolumeCache,
} from "./sliceWorker/cbctWorkerVolumeLifecycle";
import {
	handleRenderAllPlanes,
	handleRenderCrossSectionSeries,
	handleRenderSlice,
} from "./sliceWorker/cbctWorkerRenderHandlers";
import {
	handleDecodeDicomSlices,
	handleGenerateProgressiveLod,
} from "./sliceWorker/cbctWorkerDicomHandlers";

export * from "./sliceWorker/cbctSliceWorkerTypes";
export * from "./sliceWorker/cbctWorkerVolumeLifecycle";

export function handleWorkerMessage(
	msg: CbctWorkerInboundMessage,
	postMessage: (response: CbctWorkerOutboundMessage, transfer?: Transferable[]) => void,
	cache: Map<string, CbctVoxelVolume> = workerVolumeCache,
): void {
	if (!msg || typeof msg !== "object" || !("type" in msg)) {
		postMessage({ type: "ERROR", error: "Invalid worker message: missing type" });
		return;
	}

	switch (msg.type) {
		case "INIT_VOLUME":
			handleInitVolume(msg, postMessage, cache);
			break;
		case "ABORT_REQUEST":
			handleAbortRequest(msg, postMessage);
			break;
		case "RENDER_SLICE":
			handleRenderSlice(msg, postMessage, cache);
			break;
		case "RENDER_ALL_PLANES":
			handleRenderAllPlanes(msg, postMessage, cache);
			break;
		case "RENDER_CROSS_SECTION_SERIES":
			handleRenderCrossSectionSeries(msg, postMessage, cache);
			break;
		case "DECODE_DICOM_SLICES":
			handleDecodeDicomSlices(msg, postMessage);
			break;
		case "GENERATE_PROGRESSIVE_LOD":
			handleGenerateProgressiveLod(msg, postMessage);
			break;
		case "DISPOSE_VOLUME":
			handleDisposeVolume(msg, postMessage, cache);
			break;
	}
}

if (typeof self !== "undefined" && typeof (self as unknown as Worker).postMessage === "function") {
	self.onmessage = (event: MessageEvent<CbctWorkerInboundMessage>) => {
		handleWorkerMessage(event.data, (resp, transfer) => {
			if (transfer && transfer.length > 0) {
				(self as unknown as Worker).postMessage(resp, transfer);
			} else {
				(self as unknown as Worker).postMessage(resp);
			}
		});
	};
}
