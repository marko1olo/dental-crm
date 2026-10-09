/**
 * DENTE CRM — CBCT CPU Slice Multi-Threaded Web Worker Bridge (FEAT-010)
 * Decomposed Module Index
 */

export {
	StaleSliceRequestError,
	isStaleSliceRequestError,
} from "./types";

export type {
	DecodeDicomSliceTask,
	GenerateProgressiveLodPayload,
	DecodedSliceResult,
	WorkerRenderSliceOptions,
	WorkerRenderSliceParams,
	WorkerRenderAllPlanesParams,
	WorkerCrossSectionSeriesParams,
	CbctWorkerBridgeOptions,
	QueuedSingleSlice,
	QueuedMultiPlane,
	PendingSingleSlice,
	PendingMultiPlane,
	PendingSeriesRequest,
	PendingDecodeRequest,
	PendingLodRequest,
	InFlightSingleTask,
	InFlightMultiTask,
} from "./types";

export { WorkerPoolManager } from "./workerPoolManager";
export { SliceDispatchEngine } from "./sliceDispatchEngine";
export {
	syncExtractSingleSlice,
	syncExtractAllPlanes,
	syncExtractCrossSectionSeries,
	syncDecodeDicomSlices,
	syncGenerateProgressiveLod,
} from "./syncFallbackReslice";

export {
	CbctWorkerBridge,
	getSharedCbctWorkerBridge,
} from "./cbctWorkerBridgeCore";
