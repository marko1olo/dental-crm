import type {
	CbctVoxelVolume,
	MprPlane,
	MprSliceExtractionResult,
	Point3D,
	SlabProjectionMode,
} from "../cbctMprMath";
import type { ObliqueRotationAngles } from "../cbctObliqueMatrixMath";
import type {
	CrossSectionSeriesOptions,
	CrossSectionSliceData,
} from "../cbctCrossSectionResliceMath";
import type { DentalArchCurve } from "../cbctArchSplineMath";
import type { CbctInterpolationMethod } from "../cbctLutMath";
import type {
	DecodeDicomSliceTask,
	GenerateProgressiveLodPayload,
} from "./cbctSliceWorker";

export type { DecodeDicomSliceTask, GenerateProgressiveLodPayload };

export class StaleSliceRequestError extends Error {
	readonly requestId: number;
	readonly plane?: MprPlane | undefined;

	constructor(requestId: number, plane?: MprPlane | undefined) {
		super(
			`Stale slice request ${requestId}${plane ? ` on plane ${plane}` : ""} was superseded`,
		);
		this.name = "StaleSliceRequestError";
		this.requestId = requestId;
		this.plane = plane;
		Object.setPrototypeOf(this, StaleSliceRequestError.prototype);
	}
}

export function isStaleSliceRequestError(
	error: unknown,
): error is StaleSliceRequestError {
	return (
		error instanceof StaleSliceRequestError ||
		(typeof error === "object" &&
			error !== null &&
			"name" in error &&
			(error as { name: string }).name === "StaleSliceRequestError")
	);
}

export interface DecodedSliceResult {
	sliceIndex: number;
	data: Int16Array;
	minHU: number;
	maxHU: number;
}

export interface WorkerRenderSliceOptions {
	windowWidth: number;
	windowLevel: number;
	invert?: boolean | undefined;
	slabMode?: SlabProjectionMode | undefined;
	slabThicknessMm?: number | undefined;
	interpolation?: "nearest" | "trilinear" | undefined;
	gamma?: number | undefined;
	useSoftKnee?: boolean | undefined;
	softKneeCeiling?: number | undefined;
	airCutoffHU?: number | undefined;
}

export interface WorkerRenderSliceParams {
	volume: CbctVoxelVolume;
	plane: MprPlane;
	crosshairMm: Point3D;
	obliqueAngles: ObliqueRotationAngles;
	options: WorkerRenderSliceOptions;
	requestId?: number | undefined;
	signal?: AbortSignal | undefined;
	supersedePrevious?: boolean | undefined;
}

export interface WorkerRenderAllPlanesParams {
	volume: CbctVoxelVolume;
	crosshairMm: Point3D;
	obliqueAngles: ObliqueRotationAngles;
	options: WorkerRenderSliceOptions;
	requestId?: number | undefined;
	signal?: AbortSignal | undefined;
	supersedePrevious?: boolean | undefined;
}

export interface WorkerCrossSectionSeriesParams {
	volume: CbctVoxelVolume;
	archCurve: DentalArchCurve;
	options?: CrossSectionSeriesOptions | undefined;
	requestId?: number | undefined;
}

export interface CbctWorkerBridgeOptions {
	forceFallback?: boolean | undefined;
	workerFactory?: (() => Worker) | undefined;
	poolSize?: number | undefined;
}

export interface PendingSingleSlice {
	resolve: (value: MprSliceExtractionResult) => void;
	reject: (reason: Error) => void;
	volumeId: string;
	plane: MprPlane;
	requestId?: number | undefined;
	onAbortCleanup?: (() => void) | undefined;
}

export interface PendingMultiPlane {
	resolve: (value: Record<MprPlane, MprSliceExtractionResult>) => void;
	reject: (reason: Error) => void;
	volumeId: string;
	requestId?: number | undefined;
	onAbortCleanup?: (() => void) | undefined;
}

export interface QueuedSingleSlice {
	params: WorkerRenderSliceParams;
	requestId: number;
	resolve: (value: MprSliceExtractionResult) => void;
	reject: (reason: Error) => void;
	onAbortCleanup?: (() => void) | undefined;
}

export interface QueuedMultiPlane {
	params: WorkerRenderAllPlanesParams;
	requestId: number;
	resolve: (value: Record<MprPlane, MprSliceExtractionResult>) => void;
	reject: (reason: Error) => void;
	onAbortCleanup?: (() => void) | undefined;
}

export interface PendingSeriesRequest {
	resolve: (value: CrossSectionSliceData[]) => void;
	reject: (reason: Error) => void;
	volumeId: string;
}

export interface PendingDecodeRequest {
	resolve: (value: DecodedSliceResult[]) => void;
	reject: (reason: Error) => void;
}

export interface PendingLodRequest {
	resolve: (value: CbctVoxelVolume) => void;
	reject: (reason: Error) => void;
}
