import type { CbctVoxelVolume, MprPlane, Point3D } from "../../../cbctMprMath";
import type { Point2D } from "../../../cbctCaliperNerveMath";
import type { ObliqueRotationAngles } from "../../../cbctObliqueMatrixMath";
import {
	type GlSliceCoordinates,
	type GlSliceRenderOptions,
	computeGlCrossSectionCoordinates,
	computeGlSliceCoordinates,
} from "../CbctVolumeGlTextures";
import type { GlUniformLocations, GlVolumeUploadDim } from "./types";
import { dispatchSliceDrawPipeline } from "./glRenderPipelines";

export class GlSliceRenderManager {
	public lastRenderTimeMs = 0;
	public lastAllPlanesTimeMs = 0;
	public lastCrossSectionRenderTimeMs = 0;

	public dispatchSliceDraw(
		gl: WebGL2RenderingContext,
		canvas: HTMLCanvasElement,
		vao: WebGLVertexArrayObject | null,
		volumeTexture: WebGLTexture | null,
		uploadDim: GlVolumeUploadDim | null,
		prog: WebGLProgram,
		uniforms: GlUniformLocations,
		coords: GlSliceCoordinates,
		options: GlSliceRenderOptions,
		currentColorMap: number,
		currentSharpenAmount: number,
		targetCanvas?: HTMLCanvasElement | null | undefined,
		readPixels?: boolean | undefined,
	): { coords: GlSliceCoordinates; pixelData?: Uint8ClampedArray | undefined; renderTimeMs: number } | null {
		const result = dispatchSliceDrawPipeline(
			gl, canvas, vao, volumeTexture, uploadDim, prog, uniforms, coords,
			options, currentColorMap, currentSharpenAmount, targetCanvas, readPixels,
		);
		if (result) this.lastRenderTimeMs = result.renderTimeMs;
		return result;
	}

	public renderCrossSectionOnGl(
		gl: WebGL2RenderingContext,
		canvas: HTMLCanvasElement,
		vao: WebGLVertexArrayObject | null,
		volumeTexture: WebGLTexture | null,
		uploadDim: GlVolumeUploadDim | null,
		prog: WebGLProgram,
		uniforms: GlUniformLocations,
		volume: CbctVoxelVolume,
		centerMm: Point3D,
		normal2D: Point2D,
		options?: (GlSliceRenderOptions & {
			widthMm?: number | undefined; heightMm?: number | undefined; pixelSpacingMm?: number | undefined;
			slabThicknessMm?: number | undefined; readPixels?: boolean | undefined;
		}) | undefined,
		targetCanvas?: HTMLCanvasElement | null | undefined,
		currentColorMap = 0,
		currentSharpenAmount = 0.0,
	): { coords: GlSliceCoordinates; pixelData?: Uint8ClampedArray | undefined; renderTimeMs: number } | null {
		const coords = computeGlCrossSectionCoordinates(volume, centerMm, normal2D, options);
		const renderOpts: GlSliceRenderOptions = {
			windowWidth: options?.windowWidth ?? volume.defaultWindowWidth ?? 4025,
			windowLevel: options?.windowLevel ?? volume.defaultWindowLevel ?? 525,
			gamma: options?.gamma ?? 1.50, airCutoffHU: options?.airCutoffHU ?? -500.0,
			useSoftKnee: options?.useSoftKnee ?? false, softKneeCeiling: options?.softKneeCeiling ?? 178.0,
			invert: options?.invert ?? false, interpolation: options?.interpolation ?? "trilinear",
			colorMap: options?.colorMap, sharpenAmount: options?.sharpenAmount,
			clampDpr: options?.clampDpr, safeDpr: options?.safeDpr,
		};
		const res = this.dispatchSliceDraw(
			gl, canvas, vao, volumeTexture, uploadDim, prog, uniforms, coords, renderOpts,
			currentColorMap, currentSharpenAmount, targetCanvas, options?.readPixels,
		);
		if (res) this.lastCrossSectionRenderTimeMs = res.renderTimeMs;
		return res;
	}
}
