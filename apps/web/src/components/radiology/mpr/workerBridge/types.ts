/**
 * DENTE CRM — CBCT Worker Bridge Layer 0 Types & Contracts
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 */

import type {
	CbctVoxelVolume,
	MprPlane,
	MprSliceExtractionResult,
	Point3D,
	SlabProjectionMode,
} from "../../cbctMprMath";
import type { ObliqueRotationAngles } from "../../cbctObliqueMatrixMath";
import type {
	CrossSectionSeriesOptions,
	CrossSectionSliceData,
} from "../../cbctCrossSectionResliceMath";
import type { DentalArchCurve } from "../../cbctArchSplineMath";
import type { CbctInterpolationMethod } from "../../cbctLutMath";
import type {
	CbctWorkerInboundMessage,
	CbctWorkerOutboundMessage,
	DecodeDicomSliceTask,
	GenerateProgressiveLodPayload,
} from "../cbctSliceWorker";

import {
	type DecodedSliceResult,
	type WorkerRenderSliceOptions,
	type WorkerRenderSliceParams,
	type WorkerRenderAllPlanesParams,
	type WorkerCrossSectionSeriesParams,
	type CbctWorkerBridgeOptions,
	type PendingSingleSlice,
	type PendingMultiPlane,
	type PendingSeriesRequest,
	type PendingDecodeRequest,
	type PendingLodRequest,
	type QueuedSingleSlice,
	type QueuedMultiPlane,
	StaleSliceRequestError,
	isStaleSliceRequestError,
} from "../cbctWorkerBridgeTypes";

export { StaleSliceRequestError, isStaleSliceRequestError };

export type {
	CbctVoxelVolume,
	MprPlane,
	MprSliceExtractionResult,
	Point3D,
	SlabProjectionMode,
	ObliqueRotationAngles,
	CrossSectionSeriesOptions,
	CrossSectionSliceData,
	DentalArchCurve,
	CbctInterpolationMethod,
	CbctWorkerInboundMessage,
	CbctWorkerOutboundMessage,
	DecodeDicomSliceTask,
	GenerateProgressiveLodPayload,
	DecodedSliceResult,
	WorkerRenderSliceOptions,
	WorkerRenderSliceParams,
	WorkerRenderAllPlanesParams,
	WorkerCrossSectionSeriesParams,
	CbctWorkerBridgeOptions,
	PendingSingleSlice,
	PendingMultiPlane,
	PendingSeriesRequest,
	PendingDecodeRequest,
	PendingLodRequest,
	QueuedSingleSlice,
	QueuedMultiPlane,
};

export interface InFlightSingleTask {
	requestId: number;
	worker: Worker;
	abortNotified?: boolean;
}

export interface InFlightMultiTask {
	requestId: number;
	worker: Worker;
	abortNotified?: boolean;
}
