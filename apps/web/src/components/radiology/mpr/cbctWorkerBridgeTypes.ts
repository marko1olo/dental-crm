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
import type {
	DecodeDicomSliceTask,
	GenerateProgressiveLodPayload,
} from "./cbctSliceWorker";

export type { DecodeDicomSliceTask, GenerateProgressiveLodPayload };

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
}

export interface WorkerRenderAllPlanesParams {
	volume: CbctVoxelVolume;
	crosshairMm: Point3D;
	obliqueAngles: ObliqueRotationAngles;
	options: WorkerRenderSliceOptions;
	requestId?: number | undefined;
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
}

export interface PendingSingleSlice {
	resolve: (value: MprSliceExtractionResult) => void;
	reject: (reason: Error) => void;
	volumeId: string;
	plane: MprPlane;
}

export interface PendingMultiPlane {
	resolve: (value: Record<MprPlane, MprSliceExtractionResult>) => void;
	reject: (reason: Error) => void;
	volumeId: string;
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
