import type { CbctVoxelVolume, MprPlane, Point3D } from "../../../cbctMprMath";
import type { ObliqueRotationAngles, ViewportTransform } from "../../../cbctObliqueMatrixMath";
import type { RotationHandlePosition } from "../../../cbctObliqueMath";
import {
	type GlSliceCoordinates,
	type GlSliceRenderOptions,
	calculateCrosshairCenterDrag,
	calculateObliqueRotationFromHandle,
} from "../CbctVolumeGlTextures";

export function handleObliqueRotation(
	plane: MprPlane,
	handle: RotationHandlePosition,
	centerPx: { readonly x: number; readonly y: number },
	pointerPx: { readonly x: number; readonly y: number },
	currentAngles: ObliqueRotationAngles,
): { newAngles: ObliqueRotationAngles; angleDeg: number } {
	return calculateObliqueRotationFromHandle(plane, handle, centerPx, pointerPx, currentAngles);
}

export function handleCrosshairCenterDrag(
	plane: MprPlane,
	pointerPx: { readonly x: number; readonly y: number },
	canvasSize: { readonly width: number; readonly height: number },
	currentCrosshairMm: Point3D,
	angles: ObliqueRotationAngles,
	transform: ViewportTransform,
	volume: CbctVoxelVolume,
): Point3D {
	return calculateCrosshairCenterDrag(plane, pointerPx, canvasSize, currentCrosshairMm, angles, transform, volume);
}
