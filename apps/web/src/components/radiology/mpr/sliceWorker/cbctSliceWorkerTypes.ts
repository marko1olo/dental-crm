/**
 * cbctSliceWorkerTypes.ts — Типы сообщений и протокола фонового воркера КЛКТ (Мандат 8b).
 */

import type {
	CbctVoxelVolume, MprPlane, MprSliceMetadata, Point3D, SlabProjectionMode,
} from "../../cbctMprMath";
import type { ObliqueRotationAngles } from "../../cbctObliqueMatrixMath";
import type { CrossSectionSeriesOptions, CrossSectionSliceData } from "../../cbctCrossSectionResliceMath";
import type { DentalArchCurve } from "../../cbctArchSplineMath";

export interface MprRenderSliceOptions {
	windowWidth: number;
	windowLevel: number;
	invert?: boolean | undefined;
	slabMode?: SlabProjectionMode | undefined;
	slabThicknessMm?: number | undefined;
	interpolation?: "nearest" | "trilinear" | undefined;
}

export interface InitVolumePayload {
	volumeId: string;
	dimensions: { width: number; height: number; depth: number };
	spacingMm: { x: number; y: number; z: number };
	originMm: Point3D;
	physicalSizeMm?: { x: number; y: number; z: number } | undefined;
	data: Int16Array;
	minHU: number;
	maxHU: number;
	rescaleSlope?: number | undefined; rescaleIntercept?: number | undefined;
	defaultWindowWidth?: number | undefined; defaultWindowLevel?: number | undefined;
}

export interface RenderSlicePayload {
	requestId: number;
	volumeId: string;
	plane: MprPlane;
	crosshairMm: Point3D;
	angles: ObliqueRotationAngles;
	options: MprRenderSliceOptions;
}

export interface RenderAllPlanesPayload {
	requestId: number;
	volumeId: string;
	crosshairMm: Point3D;
	angles: ObliqueRotationAngles;
	options: MprRenderSliceOptions;
}

export interface RenderCrossSectionSeriesPayload {
	requestId: number;
	volumeId: string;
	archCurve: DentalArchCurve;
	options?: CrossSectionSeriesOptions | undefined;
}

export interface DecodeDicomSliceTask {
	sliceIndex: number;
	buffer: ArrayBuffer;
	pixelDataByteOffset: number;
	width: number;
	height: number;
	bitsStored: number;
	isSigned: boolean;
	rescaleSlope: number;
	rescaleIntercept: number;
	flipX?: boolean | undefined;
	flipY?: boolean | undefined;
}

export interface DecodeDicomSlicesPayload {
	requestId: number;
	tasks: DecodeDicomSliceTask[];
}

export interface GenerateProgressiveLodPayload {
	requestId: number;
	seriesId: string;
	width: number;
	height: number;
	depth: number;
	spacingMm: { x: number; y: number; z: number };
	originMm: Point3D;
	physicalSizeMm: { x: number; y: number; z: number };
	rescaleSlope: number;
	rescaleIntercept: number;
	defaultWindowWidth?: number | undefined;
	defaultWindowLevel?: number | undefined;
	bitsStored: number;
	isSigned: boolean;
	flipX?: boolean | undefined;
	flipY?: boolean | undefined;
	sampledSlices: Array<{ lodZ: number; buffer: ArrayBuffer; pixelDataByteOffset: number }>;
}

export interface DisposeVolumePayload { volumeId: string; }
export interface AbortRequestPayload { requestId: number; plane?: MprPlane | undefined; volumeId?: string | undefined; }

export type CbctWorkerInboundMessage =
	| ({ type: "INIT_VOLUME" } & InitVolumePayload)
	| ({ type: "RENDER_SLICE" } & RenderSlicePayload)
	| ({ type: "RENDER_ALL_PLANES" } & RenderAllPlanesPayload)
	| ({ type: "RENDER_CROSS_SECTION_SERIES" } & RenderCrossSectionSeriesPayload)
	| ({ type: "DECODE_DICOM_SLICES" } & DecodeDicomSlicesPayload)
	| ({ type: "GENERATE_PROGRESSIVE_LOD" } & GenerateProgressiveLodPayload)
	| ({ type: "DISPOSE_VOLUME" } & DisposeVolumePayload)
	| ({ type: "ABORT_REQUEST" } & AbortRequestPayload);

export type CbctWorkerOutboundMessage =
	| { type: "VOLUME_INITIALIZED"; volumeId: string }
	| { type: "SLICE_RENDERED"; requestId: number; volumeId: string; plane: MprPlane; metadata: MprSliceMetadata; pixelBuffer: ArrayBufferLike }
	| { type: "ALL_PLANES_RENDERED"; requestId: number; volumeId: string; slices: { axial: { metadata: MprSliceMetadata; pixelBuffer: ArrayBufferLike }; coronal: { metadata: MprSliceMetadata; pixelBuffer: ArrayBufferLike }; sagittal: { metadata: MprSliceMetadata; pixelBuffer: ArrayBufferLike } } }
	| { type: "REQUEST_ABORTED"; requestId: number; plane?: MprPlane | undefined }
	| { type: "CROSS_SECTION_SERIES_RENDERED"; requestId: number; volumeId: string; slices: CrossSectionSliceData[] }
	| { type: "DICOM_SLICES_DECODED"; requestId: number; results: Array<{ sliceIndex: number; pixelBuffer: ArrayBufferLike; minHU: number; maxHU: number }> }
	| { type: "PROGRESSIVE_LOD_GENERATED"; requestId: number; volume: CbctVoxelVolume }
	| { type: "VOLUME_DISPOSED"; volumeId: string }
	| { type: "ERROR"; requestId?: number | undefined; volumeId?: string | undefined; error: string };
