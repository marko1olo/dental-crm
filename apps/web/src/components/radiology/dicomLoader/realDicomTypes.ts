/**
 * realDicomTypes.ts — Типы данных и утилиты прямого GPU-стриминга DICOM (Мандат 8b).
 */

import type { CbctVoxelVolume } from "../cbctMprMath";
import type { CbctWorkerBridge } from "../mpr/cbctWorkerBridge";

export interface DicomStreamingUploadTarget {
	gl: WebGL2RenderingContext;
	texture: WebGLTexture;
	allocateStorage?: boolean;
}

export interface DicomVolumeIngestionOptions {
	onProgress?: ((percent: number, message: string) => void) | undefined;
	onSliceDecoded?: ((sliceIndex: number, totalSlices: number, sliceData: Int16Array) => void) | undefined;
	onProgressiveVolumeReady?: ((previewVolume: CbctVoxelVolume) => void) | undefined;
	gpuUploadTarget?: DicomStreamingUploadTarget | null | undefined;
	concurrency?: number | undefined;
	workerBridge?: CbctWorkerBridge | null | undefined;
	enableProgressiveLOD?: boolean | undefined;
}

export async function yieldToEventLoop(): Promise<void> {
	await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

export function uploadSliceTo3dTexture(
	gl: WebGL2RenderingContext,
	targetZ: number,
	width: number,
	height: number,
	sliceData: Int16Array,
): void {
	gl.pixelStorei(gl.UNPACK_ALIGNMENT, 2);
	gl.texSubImage3D(gl.TEXTURE_3D, 0, 0, 0, targetZ, width, height, 1, gl.RED_INTEGER, gl.SHORT, sliceData);
}
