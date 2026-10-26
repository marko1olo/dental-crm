import type { CbctVoxelVolume, MprPlane, Point3D } from "../../../cbctMprMath";
import type { ObliqueRotationAngles, ViewportTransform } from "../../../cbctObliqueMatrixMath";
import type { RotationHandlePosition } from "../../../cbctObliqueMath";
import { type GlSliceCoordinates, type GlSliceRenderOptions, calculateCrosshairCenterDrag, calculateObliqueRotationFromHandle } from "../CbctVolumeGlTextures";
import { CbctVolumeGlContextRenderOps } from "./CbctVolumeGlContextRenderOps";

export class CbctVolumeGlContext extends CbctVolumeGlContextRenderOps {
	constructor(canvas?: HTMLCanvasElement | null) {
		super();
		if (canvas) {
			this.init(canvas);
		}
	}

	private getResolvedOptions(volume: CbctVoxelVolume, options?: GlSliceRenderOptions): GlSliceRenderOptions {
		return options ?? { windowWidth: volume.defaultWindowWidth ?? 4025, windowLevel: volume.defaultWindowLevel ?? 525 };
	}

	public applyObliqueRotationFromHandle(
		volume: CbctVoxelVolume, plane: MprPlane, handle: RotationHandlePosition,
		centerPx: { readonly x: number; readonly y: number }, pointerPx: { readonly x: number; readonly y: number },
		currentAngles: ObliqueRotationAngles, crosshairMm: Point3D, options?: GlSliceRenderOptions, targetCanvas?: HTMLCanvasElement | null,
	): { newAngles: ObliqueRotationAngles; angleDeg: number; coords: GlSliceCoordinates } | null {
		const { newAngles, angleDeg } = calculateObliqueRotationFromHandle(plane, handle, centerPx, pointerPx, currentAngles);
		this.lastAngles = { ...newAngles }; this.lastCrosshairMm = { ...crosshairMm };
		const coords = this.renderSlice(volume, plane, crosshairMm, newAngles, this.getResolvedOptions(volume, options), targetCanvas);
		return coords ? { newAngles, angleDeg, coords } : null;
	}

	public applyCrosshairCenterDrag(
		volume: CbctVoxelVolume, plane: MprPlane, pointerPx: { readonly x: number; readonly y: number },
		canvasSize: { readonly width: number; readonly height: number }, currentCrosshairMm: Point3D,
		angles: ObliqueRotationAngles, transform: ViewportTransform, options?: GlSliceRenderOptions,
		targets?: { axial?: HTMLCanvasElement | null; coronal?: HTMLCanvasElement | null; sagittal?: HTMLCanvasElement | null },
	): { newCrosshairMm: Point3D; coords: { axial: GlSliceCoordinates; coronal: GlSliceCoordinates; sagittal: GlSliceCoordinates } } | null {
		const newCrosshairMm = calculateCrosshairCenterDrag(plane, pointerPx, canvasSize, currentCrosshairMm, angles, transform, volume);
		this.lastCrosshairMm = { ...newCrosshairMm }; this.lastAngles = { ...angles };
		const coords = this.renderAllPlanes(volume, newCrosshairMm, angles, this.getResolvedOptions(volume, options), targets);
		return coords ? { newCrosshairMm, coords } : null;
	}

	public applyCrosshairFocusSync(
		volume: CbctVoxelVolume, newCrosshairMm: Point3D, angles: ObliqueRotationAngles, options?: GlSliceRenderOptions,
		targets?: { axial?: HTMLCanvasElement | null; coronal?: HTMLCanvasElement | null; sagittal?: HTMLCanvasElement | null },
	): { axial: GlSliceCoordinates; coronal: GlSliceCoordinates; sagittal: GlSliceCoordinates } | null {
		this.lastCrosshairMm = { ...newCrosshairMm }; this.lastAngles = { ...angles };
		return this.renderAllPlanes(volume, newCrosshairMm, angles, this.getResolvedOptions(volume, options), targets);
	}

	public dispose(): void {
		if (this.gl) {
			this.disposeGlResources();
			const loseCtx = this.gl.getExtension ? this.gl.getExtension("WEBGL_lose_context") : null;
			if (loseCtx && typeof (loseCtx as unknown as { loseContext?: () => void }).loseContext === "function") {
				(loseCtx as unknown as { loseContext: () => void }).loseContext();
			}
		}
		this.cleanupListeners?.(); this.cleanupListeners = null;
		this.lifecycle.clear(); this.volState.reset();
		this.lastCoords = null; this.lastOptions = null; this.lastCrosshairMm = null; this.lastAngles = null;
		this.currentColorMap = 0; this.currentSharpenAmount = 0.0; this.gl = null; this.canvas = null; this.isInitialized = false;
	}
}
