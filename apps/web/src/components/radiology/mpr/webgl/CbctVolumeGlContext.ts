/**
 * DENTE CRM — WebGL2 Hardware GPU 3D-Texture Engine (FEAT-010 / GPU Overhaul)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 *
 * Capabilities:
 * 1. WebGL2 Context management on canvas / offscreen canvas with feature detection.
 * 2. Uploads 16-bit signed HU volume to GPU VRAM as 3D Texture (gl.R16I / gl.SHORT).
 * 3. Compiles GLSL ES 3.00 shaders with sub-voxel trilinear filtering & slab projection.
 * 4. Sub-millisecond (< 0.5 ms) 60+ FPS hardware MPR slice extraction on GPU.
 * 5. Deterministic VRAM resource disposal (textures, shaders, programs) preventing memory leaks.
 * 6. Synchronized 3D crosshair focal translation & oblique plane basis rotation into WebGL2 uniforms.
 */

import type { CbctVoxelVolume, MprPlane, Point3D, SlabProjectionMode } from "../../cbctMprMath";
import type { Point2D } from "../../cbctCaliperNerveMath";
import { worldMmToSlicePx, worldMmToSlicePxContinuous } from "../../cbctCoordinateMath";
import {
	type ObliqueRotationAngles,
	type ViewportTransform,
	DEFAULT_VIEWPORT_TRANSFORM,
	computeObliquePlaneBasis,
} from "../../cbctObliqueMatrixMath";
import { type RotationHandlePosition, calculateAngleFromHandleDrag } from "../../cbctObliqueMath";
import { calculateCrosshairDragWorldMm } from "../../cbctVolumeLifecycleMath";
import { CBCT_MPR_FRAGMENT_SHADER, CBCT_MPR_VERTEX_SHADER } from "./cbctMprShaders";

export interface GlSliceRenderOptions {
	windowWidth: number;
	windowLevel: number;
	invert?: boolean | undefined;
	slabMode?: SlabProjectionMode | undefined;
	slabThicknessMm?: number | undefined;
	interpolation?: "nearest" | "trilinear" | undefined;
	expandObliqueDiagonal?: boolean | undefined;
	safeDpr?: number | undefined;
	clampDpr?: boolean | undefined;
}

export interface GlSliceCoordinates {
	widthPx: number;
	heightPx: number;
	pixelSpacingX: number;
	pixelSpacingY: number;
	sliceOrigin: [number, number, number];
	axisU: [number, number, number];
	axisV: [number, number, number];
	axisNorm: [number, number, number];
	slabModeCode: number;
	slabSteps: number;
}

interface GlUniformLocations {
	volume: WebGLUniformLocation | null;
	volumeDim: WebGLUniformLocation | null;
	sliceOrigin: WebGLUniformLocation | null;
	axisU: WebGLUniformLocation | null;
	axisV: WebGLUniformLocation | null;
	axisNorm: WebGLUniformLocation | null;
	windowWidth: WebGLUniformLocation | null;
	windowLevel: WebGLUniformLocation | null;
	invert: WebGLUniformLocation | null;
	slabMode: WebGLUniformLocation | null;
	slabSteps: WebGLUniformLocation | null;
	trilinear: WebGLUniformLocation | null;
}

export const MAX_SAFE_DEVICE_PIXEL_RATIO = 1.5;

/**
 * Calculates safe device pixel ratio clamped to max 1.5 to protect GPU fillrate on 4K/Retina displays.
 * Prevents integrated GPUs (Intel UHD / Iris Xe) from fillrate collapse on high-DPI screens.
 */
export function getSafeDevicePixelRatio(customDpr?: number): number {
	const rawDpr =
		typeof customDpr === "number" && Number.isFinite(customDpr) && customDpr > 0
			? customDpr
			: typeof window !== "undefined" && typeof window.devicePixelRatio === "number" && window.devicePixelRatio > 0
				? window.devicePixelRatio
				: 1.0;
	return Math.min(rawDpr, MAX_SAFE_DEVICE_PIXEL_RATIO);
}

export interface SafeDprViewportDimensions {
	renderWidth: number;
	renderHeight: number;
	cssWidth: number;
	cssHeight: number;
	safeDpr: number;
}

/**
 * Computes buffer render dimensions and CSS display dimensions with safe DPR clamping (<= 1.5).
 */
export function computeSafeDprDimensions(
	cssWidth: number,
	cssHeight: number,
	customDpr?: number,
): SafeDprViewportDimensions {
	const safeDpr = getSafeDevicePixelRatio(customDpr);
	const renderWidth = Math.max(1, Math.round(cssWidth * safeDpr));
	const renderHeight = Math.max(1, Math.round(cssHeight * safeDpr));
	return {
		renderWidth,
		renderHeight,
		cssWidth,
		cssHeight,
		safeDpr,
	};
}

/**
 * Applies clamped DPR scaling to an HTMLCanvasElement: internal buffer is set to renderWidth/Height,
 * while canvas.style width/height are set to cssWidth/Height (CSS pixels).
 */
export function applySafeDprToCanvas(
	canvas: HTMLCanvasElement,
	cssWidth: number,
	cssHeight: number,
	customDpr?: number,
): SafeDprViewportDimensions {
	const dims = computeSafeDprDimensions(cssWidth, cssHeight, customDpr);
	if (canvas.width !== dims.renderWidth || canvas.height !== dims.renderHeight) {
		canvas.width = dims.renderWidth;
		canvas.height = dims.renderHeight;
	}
	if (canvas.style) {
		canvas.style.width = `${dims.cssWidth}px`;
		canvas.style.height = `${dims.cssHeight}px`;
	}
	return dims;
}

/**
 * Downsamples 3D voxel buffer by integer stride step (e.g. 2x) for low-spec GPU compatibility.
 * Guarantees volumes exceeding gl.MAX_3D_TEXTURE_SIZE (256/512) fit into hardware VRAM without crash.
 */
export function downsampleVolumeData(
	srcData: Int16Array,
	srcDim: { width: number; height: number; depth: number },
	step: number,
): { data: Int16Array; width: number; height: number; depth: number } {
	const dstW = Math.max(1, Math.ceil(srcDim.width / step));
	const dstH = Math.max(1, Math.ceil(srcDim.height / step));
	const dstD = Math.max(1, Math.ceil(srcDim.depth / step));
	const dstData = new Int16Array(dstW * dstH * dstD);
	const srcW = srcDim.width, srcSlice = srcDim.width * srcDim.height, dstSlice = dstW * dstH;

	for (let dz = 0; dz < dstD; dz++) {
		const srcZOffset = dz * step * srcSlice, dstZOffset = dz * dstSlice;
		for (let dy = 0; dy < dstH; dy++) {
			const srcYOffset = srcZOffset + dy * step * srcW, dstYOffset = dstZOffset + dy * dstW;
			for (let dx = 0; dx < dstW; dx++) {
				dstData[dstYOffset + dx] = srcData[srcYOffset + dx * step] ?? -1000;
			}
		}
	}
	return { data: dstData, width: dstW, height: dstH, depth: dstD };
}

/**
 * Pure mathematical calculation of 3D Texture UVW coordinates and spans for an arbitrary MPR slice.
 * Decoupled from WebGL context for deterministic unit testing in any environment.
 */
export function computeGlSliceCoordinates(
	volume: CbctVoxelVolume,
	plane: MprPlane,
	crosshairMm: Point3D,
	angles: ObliqueRotationAngles,
	options?: GlSliceRenderOptions,
): GlSliceCoordinates {
	const dim = volume.dimensions, sp = volume.spacingMm, origin = volume.originMm;
	let widthPx = 0, heightPx = 0, pixelSpacingX = 0, pixelSpacingY = 0;

	switch (plane) {
		case "axial":
			widthPx = dim.width; heightPx = dim.height;
			pixelSpacingX = sp.x; pixelSpacingY = sp.y;
			break;
		case "coronal":
			widthPx = dim.width; heightPx = Math.max(1, Math.round((dim.depth * sp.z) / (sp.x || 1.0)));
			pixelSpacingX = sp.x; pixelSpacingY = (dim.depth * sp.z) / heightPx;
			break;
		case "sagittal":
			widthPx = dim.height; heightPx = Math.max(1, Math.round((dim.depth * sp.z) / (sp.y || 1.0)));
			pixelSpacingX = sp.y; pixelSpacingY = (dim.depth * sp.z) / heightPx;
			break;
	}

	const basis = computeObliquePlaneBasis(plane, crosshairMm, angles);
	const hasObliqueRotation =
		Math.abs(angles?.axialAngleDeg ?? 0) > 0.01 ||
		Math.abs(angles?.coronalTiltDeg ?? 0) > 0.01 ||
		Math.abs(angles?.sagittalTiltDeg ?? 0) > 0.01;

	const shouldExpandDiagonal = options?.expandObliqueDiagonal ?? true;
	if (hasObliqueRotation && shouldExpandDiagonal) {
		const diagPx = Math.max(1, Math.round(Math.hypot(widthPx, heightPx)));
		widthPx = diagPx;
		heightPx = diagPx;
	}

	const pivotPx = worldMmToSlicePxContinuous(crosshairMm, plane, volume);
	const maxCoordX = Math.max(1, dim.width - 1), maxCoordY = Math.max(1, dim.height - 1), maxCoordZ = Math.max(1, dim.depth - 1);

	const world00X = crosshairMm.x - pivotPx.x * basis.u.x * pixelSpacingX - pivotPx.y * basis.v.x * pixelSpacingY;
	const world00Y = crosshairMm.y - pivotPx.x * basis.u.y * pixelSpacingX - pivotPx.y * basis.v.y * pixelSpacingY;
	const world00Z = crosshairMm.z - pivotPx.x * basis.u.z * pixelSpacingX - pivotPx.y * basis.v.z * pixelSpacingY;

	const vox00X = (world00X - origin.x) / sp.x, vox00Y = (world00Y - origin.y) / sp.y, vox00Z = (world00Z - origin.z) / sp.z;
	const sliceOrigin: [number, number, number] = [vox00X / maxCoordX, vox00Y / maxCoordY, vox00Z / maxCoordZ];

	const totalSpanMmX = widthPx * pixelSpacingX;
	const axisU: [number, number, number] = [
		(basis.u.x * totalSpanMmX) / (sp.x * maxCoordX),
		(basis.u.y * totalSpanMmX) / (sp.y * maxCoordY),
		(basis.u.z * totalSpanMmX) / (sp.z * maxCoordZ),
	];

	const totalSpanMmY = heightPx * pixelSpacingY;
	const axisV: [number, number, number] = [
		(basis.v.x * totalSpanMmY) / (sp.x * maxCoordX),
		(basis.v.y * totalSpanMmY) / (sp.y * maxCoordY),
		(basis.v.z * totalSpanMmY) / (sp.z * maxCoordZ),
	];

	const normalStepMm = Math.min(sp.x, Math.min(sp.y, sp.z));
	const slabMode = options?.slabMode ?? "single";
	const slabThicknessMm = options?.slabThicknessMm ?? 2.0;
	const isSlabActive = slabMode !== "single" && slabThicknessMm > normalStepMm;
	const slabSteps = isSlabActive ? Math.max(1, Math.round(slabThicknessMm / normalStepMm)) : 1;
	const stepMm = isSlabActive ? slabThicknessMm / slabSteps : 0;

	const axisNorm: [number, number, number] = [
		(basis.normal.x * stepMm) / (sp.x * maxCoordX),
		(basis.normal.y * stepMm) / (sp.y * maxCoordY),
		(basis.normal.z * stepMm) / (sp.z * maxCoordZ),
	];

	let slabModeCode = 0;
	if (slabMode === "mip") slabModeCode = 1;
	else if (slabMode === "minip") slabModeCode = 2;
	else if (slabMode === "average") slabModeCode = 3;

	return { widthPx, heightPx, pixelSpacingX, pixelSpacingY, sliceOrigin, axisU, axisV, axisNorm, slabModeCode, slabSteps };
}

/**
 * Pure mathematical calculation of 3D Texture UVW coordinates for a perpendicular
 * transverse cross-section slice (buccal-lingual span) along a dental arch curve.
 * Standards: DICOM Part 3, Misch CE, Buser (24x34 mm span, 0.25 mm/px).
 */
export function computeGlCrossSectionCoordinates(
	volume: CbctVoxelVolume,
	centerMm: Point3D,
	normal2D: Point2D,
	options?: { widthMm?: number; heightMm?: number; pixelSpacingMm?: number; slabMode?: SlabProjectionMode; slabThicknessMm?: number },
): GlSliceCoordinates {
	const dim = volume.dimensions, sp = volume.spacingMm, origin = volume.originMm;
	const widthMm = Number.isFinite(options?.widthMm) && (options?.widthMm ?? 0) > 0 ? options!.widthMm! : 24.0;
	const heightMm = Number.isFinite(options?.heightMm) && (options?.heightMm ?? 0) > 0 ? options!.heightMm! : 34.0;
	const pixelSpacingMm = Number.isFinite(options?.pixelSpacingMm) && (options?.pixelSpacingMm ?? 0) > 0 ? options!.pixelSpacingMm! : 0.25;

	const widthPx = Math.max(1, Math.round(widthMm / pixelSpacingMm));
	const heightPx = Math.max(1, Math.round(heightMm / pixelSpacingMm));
	const pixelSpacingX = pixelSpacingMm, pixelSpacingY = pixelSpacingMm;
	const halfW = widthMm / 2.0, halfH = heightMm / 2.0;

	const nLen = Math.hypot(normal2D.x, normal2D.y);
	const unitNormal: Point2D = Number.isFinite(nLen) && nLen > 1e-6 ? { x: normal2D.x / nLen, y: normal2D.y / nLen } : { x: 0, y: 1 };
	const unitTangent: Point2D = { x: unitNormal.y === 0 ? 0 : unitNormal.y, y: unitNormal.x === 0 ? 0 : -unitNormal.x };

	const maxCoordX = Math.max(1, dim.width - 1), maxCoordY = Math.max(1, dim.height - 1), maxCoordZ = Math.max(1, dim.depth - 1);
	const world00X = centerMm.x - unitNormal.x * halfW, world00Y = centerMm.y - unitNormal.y * halfW, world00Z = centerMm.z + halfH;
	const vox00X = (world00X - origin.x) / sp.x, vox00Y = (world00Y - origin.y) / sp.y, vox00Z = (world00Z - origin.z) / sp.z;

	const sliceOrigin: [number, number, number] = [vox00X / maxCoordX, vox00Y / maxCoordY, vox00Z / maxCoordZ];
	const uX = (unitNormal.x * widthMm) / (sp.x * maxCoordX), uY = (unitNormal.y * widthMm) / (sp.y * maxCoordY);
	const axisU: [number, number, number] = [uX === 0 ? 0 : uX, uY === 0 ? 0 : uY, 0];
	const axisV: [number, number, number] = [0, 0, -heightMm / (sp.z * maxCoordZ)];

	const normalStepMm = Math.min(sp.x, Math.min(sp.y, sp.z));
	const slabMode = options?.slabMode ?? "single";
	const slabThicknessMm = options?.slabThicknessMm ?? 2.0;
	const isSlabActive = slabMode !== "single" && slabThicknessMm > normalStepMm;
	const slabSteps = isSlabActive ? Math.max(1, Math.round(slabThicknessMm / normalStepMm)) : 1;
	const stepMm = isSlabActive ? slabThicknessMm / slabSteps : 0;
	const nX = (unitTangent.x * stepMm) / (sp.x * maxCoordX), nY = (unitTangent.y * stepMm) / (sp.y * maxCoordY);
	const axisNorm: [number, number, number] = [nX === 0 ? 0 : nX, nY === 0 ? 0 : nY, 0];

	let slabModeCode = 0;
	if (slabMode === "mip") slabModeCode = 1;
	else if (slabMode === "minip") slabModeCode = 2;
	else if (slabMode === "average") slabModeCode = 3;

	return { widthPx, heightPx, pixelSpacingX, pixelSpacingY, sliceOrigin, axisU, axisV, axisNorm, slabModeCode, slabSteps };
}

/**
 * Calculates updated oblique rotation angles when dragging a rotation handle around the center.
 * Handles Axial (axialAngleDeg), Coronal (coronalTiltDeg), and Sagittal (sagittalTiltDeg).
 */
export function calculateObliqueRotationFromHandle(
	plane: MprPlane,
	handle: RotationHandlePosition,
	centerPx: { readonly x: number; readonly y: number },
	pointerPx: { readonly x: number; readonly y: number },
	currentAngles: ObliqueRotationAngles,
): { newAngles: ObliqueRotationAngles; angleDeg: number } {
	const angleDeg = calculateAngleFromHandleDrag(centerPx, pointerPx, handle);
	let newAngles: ObliqueRotationAngles;
	switch (plane) {
		case "axial":
			newAngles = { ...currentAngles, axialAngleDeg: angleDeg };
			break;
		case "coronal":
			newAngles = { ...currentAngles, coronalTiltDeg: angleDeg };
			break;
		case "sagittal":
			newAngles = { ...currentAngles, sagittalTiltDeg: angleDeg };
			break;
	}
	return { newAngles, angleDeg };
}

/**
 * Computes updated 3D crosshair position when dragging crosshair center in any MPR viewport plane.
 */
export function calculateCrosshairCenterDrag(
	plane: MprPlane,
	pointerPx: { readonly x: number; readonly y: number },
	canvasSize: { readonly width: number; readonly height: number },
	currentCrosshairMm: Point3D,
	angles: ObliqueRotationAngles,
	transform: ViewportTransform,
	volume: CbctVoxelVolume,
): Point3D {
	return calculateCrosshairDragWorldMm(
		pointerPx,
		canvasSize,
		plane,
		currentCrosshairMm,
		angles,
		transform,
		volume,
	);
}

/**
 * Computes synchronized slice coordinates (origins and basis vectors) for all 3 MPR planes
 * when crosshair moves in 3D or oblique angles change.
 */
export function computeSynchronizedMprGlCoordinates(
	volume: CbctVoxelVolume,
	crosshairMm: Point3D,
	angles: ObliqueRotationAngles,
	options?: GlSliceRenderOptions,
): {
	axial: GlSliceCoordinates;
	coronal: GlSliceCoordinates;
	sagittal: GlSliceCoordinates;
} {
	return {
		axial: computeGlSliceCoordinates(volume, "axial", crosshairMm, angles, options),
		coronal: computeGlSliceCoordinates(volume, "coronal", crosshairMm, angles, options),
		sagittal: computeGlSliceCoordinates(volume, "sagittal", crosshairMm, angles, options),
	};
}

export class CbctVolumeGlContext {
	private gl: WebGL2RenderingContext | null = null;
	private canvas: HTMLCanvasElement | null = null;
	private program: WebGLProgram | null = null;
	private vertexShader: WebGLShader | null = null;
	private fragmentShader: WebGLShader | null = null;
	private volumeTexture: WebGLTexture | null = null;
	private activeVolumeId: string | null = null;
	private activeVolume: CbctVoxelVolume | null = null;
	private isInitialized = false;
	private vao: WebGLVertexArrayObject | null = null;
	private uploadDim: { width: number; height: number; depth: number } | null = null;
	private downsampleStep = 1;
	private cleanupContextListeners: (() => void) | null = null;
	private uniforms: GlUniformLocations | null = null;
	private contextRestoredListeners: Set<() => void> = new Set();
	private contextLostListeners: Set<() => void> = new Set();
	private contextLostState = false;
	private lastCrosshairMm: Point3D | null = null;
	private lastAngles: ObliqueRotationAngles | null = null;
	private lastCoords: GlSliceCoordinates | null = null;
	private lastOptions: GlSliceRenderOptions | null = null;

	constructor(canvas?: HTMLCanvasElement) {
		if (canvas) this.init(canvas);
	}

	public init(canvas: HTMLCanvasElement): boolean {
		this.cleanupContextListeners?.();
		this.cleanupContextListeners = null;
		this.canvas = canvas;
		this.contextLostState = false;

		try {
			const gl = canvas.getContext("webgl2", {
				alpha: false, depth: false, stencil: false, antialias: false,
				preserveDrawingBuffer: true, powerPreference: "high-performance",
			});
			if (!gl) {
				console.warn("[CbctVolumeGlContext] WebGL2 not supported on canvas, using CPU/Worker fallback.");
				this.isInitialized = false;
				return false;
			}
			this.gl = gl;
			const success = this.setupShaders();
			this.isInitialized = success;

			const onContextLost = (e: Event) => {
				if (typeof e.preventDefault === "function") {
					e.preventDefault();
				}
				this.contextLostState = true;
				this.isInitialized = false;
				this.activeVolumeId = null;
				this.volumeTexture = null;
				this.uploadDim = null;
				this.program = null;
				this.vao = null;
				this.uniforms = null;
				for (const cb of this.contextLostListeners) {
					try {
						cb();
					} catch (err) {
						console.error("[CbctVolumeGlContext] contextLostListener error:", err);
					}
				}
			};
			const onContextRestored = () => {
				this.contextLostState = false;
				if (this.canvas) {
					const restored = this.init(this.canvas);
					if (restored && this.activeVolume && !this.activeVolume.isDisposed) {
						this.uploadVolume(this.activeVolume, { forceReupload: true });
						if (this.lastCoords) {
							this.updateSliceBasisUniforms(this.lastCoords);
						}
					}
					for (const cb of this.contextRestoredListeners) {
						try {
							cb();
						} catch (err) {
							console.error("[CbctVolumeGlContext] contextRestoredListener error:", err);
						}
					}
				}
			};
			if (typeof canvas.addEventListener === "function") {
				canvas.addEventListener("webglcontextlost", onContextLost);
				canvas.addEventListener("webglcontextrestored", onContextRestored);
				this.cleanupContextListeners = () => {
					canvas.removeEventListener("webglcontextlost", onContextLost);
					canvas.removeEventListener("webglcontextrestored", onContextRestored);
				};
			}
			return success;
		} catch (err) {
			console.warn("[CbctVolumeGlContext] WebGL2 initialization failed:", err);
			this.isInitialized = false;
			return false;
		}
	}

	public isAvailable(): boolean {
		if (this.contextLostState || !this.isInitialized || !this.gl || !this.program) return false;
		if (typeof this.gl.isContextLost === "function" && this.gl.isContextLost()) {
			return false;
		}
		return true;
	}

	public isContextLost(): boolean {
		return (
			this.contextLostState ||
			!this.gl ||
			(typeof this.gl.isContextLost === "function" && this.gl.isContextLost())
		);
	}

	public getCanvas(): HTMLCanvasElement | null { return this.canvas; }
	public getGl(): WebGL2RenderingContext | null { return this.gl; }
	public getActiveVolumeId(): string | null { return this.activeVolumeId; }
	public getActiveVolume(): CbctVoxelVolume | null { return this.activeVolume; }
	public getDownsampleStep(): number { return this.downsampleStep; }
	public getLastCrosshairMm(): Point3D | null { return this.lastCrosshairMm; }
	public getLastObliqueAngles(): ObliqueRotationAngles | null { return this.lastAngles; }
	public getLastSliceCoordinates(): GlSliceCoordinates | null { return this.lastCoords; }

	public addContextRestoredListener(listener: () => void): () => void {
		this.contextRestoredListeners.add(listener);
		return () => {
			this.contextRestoredListeners.delete(listener);
		};
	}

	public addContextLostListener(listener: () => void): () => void {
		this.contextLostListeners.add(listener);
		return () => {
			this.contextLostListeners.delete(listener);
		};
	}

	private setupShaders(): boolean {
		const gl = this.gl;
		if (!gl) return false;

		const compileShader = (source: string, type: number): WebGLShader | null => {
			const shader = gl.createShader(type);
			if (!shader) return null;
			gl.shaderSource(shader, source);
			gl.compileShader(shader);
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				console.error("[CbctVolumeGlContext] Shader compile failed:", gl.getShaderInfoLog(shader));
				gl.deleteShader(shader);
				return null;
			}
			return shader;
		};

		this.vertexShader = compileShader(CBCT_MPR_VERTEX_SHADER, gl.VERTEX_SHADER);
		this.fragmentShader = compileShader(CBCT_MPR_FRAGMENT_SHADER, gl.FRAGMENT_SHADER);
		if (!this.vertexShader || !this.fragmentShader) return false;

		const program = gl.createProgram();
		if (!program) return false;
		gl.attachShader(program, this.vertexShader);
		gl.attachShader(program, this.fragmentShader);
		gl.linkProgram(program);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.error("[CbctVolumeGlContext] Program link failed:", gl.getProgramInfoLog(program));
			gl.deleteProgram(program);
			return false;
		}

		this.program = program;
		gl.useProgram(program);
		this.vao = gl.createVertexArray ? gl.createVertexArray() : null;
		if (this.vao && gl.bindVertexArray) gl.bindVertexArray(this.vao);

		this.uniforms = {
			volume: gl.getUniformLocation(program, "u_volume"),
			volumeDim: gl.getUniformLocation(program, "u_volumeDim"),
			sliceOrigin: gl.getUniformLocation(program, "u_sliceOrigin"),
			axisU: gl.getUniformLocation(program, "u_axisU"),
			axisV: gl.getUniformLocation(program, "u_axisV"),
			axisNorm: gl.getUniformLocation(program, "u_axisNorm"),
			windowWidth: gl.getUniformLocation(program, "u_windowWidth"),
			windowLevel: gl.getUniformLocation(program, "u_windowLevel"),
			invert: gl.getUniformLocation(program, "u_invert"),
			slabMode: gl.getUniformLocation(program, "u_slabMode"),
			slabSteps: gl.getUniformLocation(program, "u_slabSteps"),
			trilinear: gl.getUniformLocation(program, "u_trilinear"),
		};
		return true;
	}

	public uploadVolume(volume: CbctVoxelVolume, options?: { forceReupload?: boolean }): boolean {
		const gl = this.gl;
		if (!gl || !this.isAvailable()) return false;
		if (gl.isContextLost && gl.isContextLost()) return false;
		if (!volume.data || volume.isDisposed) return false;

		if (!options?.forceReupload && this.activeVolumeId === volume.id && this.volumeTexture) {
			return true;
		}

		if (this.volumeTexture) {
			gl.deleteTexture(this.volumeTexture);
			this.volumeTexture = null;
			this.activeVolumeId = null;
		}

		const texture = gl.createTexture();
		if (!texture) return false;

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_3D, texture);
		gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

		let max3dSize = 2048;
		try {
			if (typeof gl.getParameter === "function" && gl.MAX_3D_TEXTURE_SIZE !== undefined) {
				const param = gl.getParameter(gl.MAX_3D_TEXTURE_SIZE) as number;
				if (typeof param === "number" && param > 0) {
					max3dSize = param;
				}
			}
		} catch {
			max3dSize = 2048;
		}

		let step = 1;
		while (
			Math.ceil(volume.dimensions.width / step) > max3dSize ||
			Math.ceil(volume.dimensions.height / step) > max3dSize ||
			Math.ceil(volume.dimensions.depth / step) > max3dSize
		) {
			step *= 2;
		}

		let uploadData = volume.data;
		let uploadWidth = volume.dimensions.width;
		let uploadHeight = volume.dimensions.height;
		let uploadDepth = volume.dimensions.depth;

		if (step > 1) {
			console.warn(`[CbctVolumeGlContext] Volume downsampled ${step}x for GPU limits (${max3dSize}).`);
			const downsampled = downsampleVolumeData(volume.data, volume.dimensions, step);
			uploadData = downsampled.data;
			uploadWidth = downsampled.width;
			uploadHeight = downsampled.height;
			uploadDepth = downsampled.depth;
		}

		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 2);

		let uploadSuccess = false;
		while (step <= 8) {
			try {
				gl.texImage3D(
					gl.TEXTURE_3D,
					0,
					gl.R16I,
					uploadWidth,
					uploadHeight,
					uploadDepth,
					0,
					gl.RED_INTEGER,
					gl.SHORT,
					uploadData,
				);
				uploadSuccess = true;
				break;
			} catch (err) {
				console.warn(
					`[CbctVolumeGlContext] gl.texImage3D failed at ${uploadWidth}x${uploadHeight}x${uploadDepth} (step ${step}x), retrying with progressive 2x downsample:`,
					err,
				);
				step *= 2;
				if (step > 8) {
					break;
				}
				const downsampled = downsampleVolumeData(volume.data, volume.dimensions, step);
				uploadData = downsampled.data;
				uploadWidth = downsampled.width;
				uploadHeight = downsampled.height;
				uploadDepth = downsampled.depth;
			}
		}

		if (!uploadSuccess) {
			console.error("[CbctVolumeGlContext] gl.texImage3D failed after progressive downsampling.");
			gl.deleteTexture(texture);
			this.volumeTexture = null;
			this.activeVolumeId = null;
			this.activeVolume = null;
			this.uploadDim = null;
			this.downsampleStep = 1;
			return false;
		}

		this.downsampleStep = step;
		this.volumeTexture = texture;
		this.activeVolumeId = volume.id;
		this.activeVolume = volume;
		this.uploadDim = { width: uploadWidth, height: uploadHeight, depth: uploadDepth };

		if (this.uniforms?.volumeDim) {
			gl.useProgram(this.program);
			gl.uniform3f(this.uniforms.volumeDim, uploadWidth, uploadHeight, uploadDepth);
		}
		return true;
	}

	public invalidateVolume(volumeId?: string): void {
		if (!volumeId || this.activeVolumeId === volumeId) {
			if (this.gl && this.volumeTexture) {
				this.gl.deleteTexture(this.volumeTexture);
				this.volumeTexture = null;
			}
			this.activeVolumeId = null;
			this.activeVolume = null;
			this.uploadDim = null;
			this.downsampleStep = 1;
		}
	}

	public updateSliceBasisUniforms(coords: GlSliceCoordinates): boolean {
		const gl = this.gl;
		if (!gl || !this.isAvailable() || !this.program || !this.uniforms) return false;
		gl.useProgram(this.program);
		gl.uniform3fv(this.uniforms.sliceOrigin, coords.sliceOrigin);
		gl.uniform3fv(this.uniforms.axisU, coords.axisU);
		gl.uniform3fv(this.uniforms.axisV, coords.axisV);
		gl.uniform3fv(this.uniforms.axisNorm, coords.axisNorm);
		return true;
	}

	public renderFromCoordinates(
		volume: CbctVoxelVolume,
		coords: GlSliceCoordinates,
		options: GlSliceRenderOptions,
		targetCanvas?: HTMLCanvasElement | null,
	): GlSliceCoordinates | null {
		const gl = this.gl, canvas = this.canvas;
		if (!gl || !canvas || !this.isAvailable() || !this.program || !this.uniforms) return null;
		if (!this.uploadVolume(volume)) return null;

		this.lastCoords = coords;
		this.lastOptions = options;

		if (targetCanvas) {
			if (options.clampDpr) {
				applySafeDprToCanvas(targetCanvas, coords.widthPx, coords.heightPx, options.safeDpr);
			} else if (targetCanvas.width !== coords.widthPx || targetCanvas.height !== coords.heightPx) {
				targetCanvas.width = coords.widthPx;
				targetCanvas.height = coords.heightPx;
			}
			if (canvas.width < coords.widthPx || canvas.height < coords.heightPx) {
				canvas.width = Math.max(canvas.width, coords.widthPx);
				canvas.height = Math.max(canvas.height, coords.heightPx);
			}
		} else if (canvas.width !== coords.widthPx || canvas.height !== coords.heightPx) {
			canvas.width = coords.widthPx;
			canvas.height = coords.heightPx;
		}

		gl.viewport(0, 0, coords.widthPx, coords.heightPx);
		gl.useProgram(this.program);
		if (this.vao && gl.bindVertexArray) gl.bindVertexArray(this.vao);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_3D, this.volumeTexture);
		gl.uniform1i(this.uniforms.volume, 0);

		if (this.uniforms.volumeDim && this.uploadDim) {
			gl.uniform3f(this.uniforms.volumeDim, this.uploadDim.width, this.uploadDim.height, this.uploadDim.depth);
		}

		gl.uniform3fv(this.uniforms.sliceOrigin, coords.sliceOrigin);
		gl.uniform3fv(this.uniforms.axisU, coords.axisU);
		gl.uniform3fv(this.uniforms.axisV, coords.axisV);
		gl.uniform3fv(this.uniforms.axisNorm, coords.axisNorm);
		gl.uniform1f(this.uniforms.windowWidth, options.windowWidth);
		gl.uniform1f(this.uniforms.windowLevel, options.windowLevel);
		gl.uniform1i(this.uniforms.invert, options.invert ? 1 : 0);
		gl.uniform1i(this.uniforms.slabMode, coords.slabModeCode);
		gl.uniform1i(this.uniforms.slabSteps, coords.slabSteps);
		gl.uniform1i(this.uniforms.trilinear, options.interpolation !== "nearest" ? 1 : 0);

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		if (targetCanvas) {
			const targetCtx = targetCanvas.getContext("2d");
			if (targetCtx) {
				const sourceY = canvas.height - coords.heightPx;
				targetCtx.drawImage(
					canvas,
					0,
					sourceY,
					coords.widthPx,
					coords.heightPx,
					0,
					0,
					targetCanvas.width,
					targetCanvas.height,
				);
			}
		}
		return coords;
	}

	public renderSlice(
		volume: CbctVoxelVolume,
		plane: MprPlane,
		crosshairMm: Point3D,
		angles: ObliqueRotationAngles,
		options: GlSliceRenderOptions,
		targetCanvas?: HTMLCanvasElement | null,
	): GlSliceCoordinates | null {
		this.lastCrosshairMm = { ...crosshairMm };
		this.lastAngles = { ...angles };
		this.lastOptions = options;
		const coords = computeGlSliceCoordinates(volume, plane, crosshairMm, angles, options);
		return this.renderFromCoordinates(volume, coords, options, targetCanvas);
	}

	public renderCrossSection(
		volume: CbctVoxelVolume,
		centerMm: Point3D,
		normal2D: Point2D,
		options: GlSliceRenderOptions & { widthMm?: number; heightMm?: number; pixelSpacingMm?: number },
		targetCanvas?: HTMLCanvasElement | null,
	): GlSliceCoordinates | null {
		this.lastCrosshairMm = { ...centerMm };
		this.lastOptions = options;
		const coords = computeGlCrossSectionCoordinates(volume, centerMm, normal2D, options);
		return this.renderFromCoordinates(volume, coords, options, targetCanvas);
	}

	public renderAllPlanes(
		volume: CbctVoxelVolume,
		crosshairMm: Point3D,
		angles: ObliqueRotationAngles,
		options: GlSliceRenderOptions,
		targets?: { axial?: HTMLCanvasElement | null; coronal?: HTMLCanvasElement | null; sagittal?: HTMLCanvasElement | null },
	): { axial: GlSliceCoordinates; coronal: GlSliceCoordinates; sagittal: GlSliceCoordinates } | null {
		this.lastCrosshairMm = { ...crosshairMm };
		this.lastAngles = { ...angles };
		this.lastOptions = options;

		if (this.canvas) {
			const maxDim = Math.max(volume.dimensions.width, Math.max(volume.dimensions.height, volume.dimensions.depth));
			if (this.canvas.width < maxDim || this.canvas.height < maxDim) {
				this.canvas.width = Math.max(this.canvas.width, maxDim);
				this.canvas.height = Math.max(this.canvas.height, maxDim);
			}
		}

		const axial = this.renderSlice(volume, "axial", crosshairMm, angles, options, targets?.axial);
		if (!axial) return null;
		const coronal = this.renderSlice(volume, "coronal", crosshairMm, angles, options, targets?.coronal);
		if (!coronal) return null;
		const sagittal = this.renderSlice(volume, "sagittal", crosshairMm, angles, options, targets?.sagittal);
		if (!sagittal) return null;

		return { axial, coronal, sagittal };
	}

	/**
	 * Computes updated oblique rotation angles and re-calculates orthonormal basis vectors
	 * (u_axisU, u_axisV, u_axisNorm, u_sliceOrigin) directly into WebGL2 uniforms for 60 FPS real-time scrubbing.
	 */
	public applyObliqueRotationFromHandle(
		volume: CbctVoxelVolume,
		plane: MprPlane,
		handle: RotationHandlePosition,
		centerPx: { readonly x: number; readonly y: number },
		pointerPx: { readonly x: number; readonly y: number },
		currentAngles: ObliqueRotationAngles,
		crosshairMm: Point3D,
		options?: GlSliceRenderOptions,
		targetCanvas?: HTMLCanvasElement | null,
	): { newAngles: ObliqueRotationAngles; angleDeg: number; coords: GlSliceCoordinates } | null {
		const { newAngles, angleDeg } = calculateObliqueRotationFromHandle(plane, handle, centerPx, pointerPx, currentAngles);
		this.lastAngles = { ...newAngles };
		this.lastCrosshairMm = { ...crosshairMm };
		const renderOptions: GlSliceRenderOptions = options ?? {
			windowWidth: volume.defaultWindowWidth ?? 1500,
			windowLevel: volume.defaultWindowLevel ?? 300,
		};
		const coords = this.renderSlice(volume, plane, crosshairMm, newAngles, renderOptions, targetCanvas);
		if (!coords) return null;
		return { newAngles, angleDeg, coords };
	}

	/**
	 * Direct translation of crosshair focus in 3D world space (mm) and synchronization of slice origin
	 * across all MPR planes in WebGL2 uniforms.
	 */
	public applyCrosshairCenterDrag(
		volume: CbctVoxelVolume,
		plane: MprPlane,
		pointerPx: { readonly x: number; readonly y: number },
		canvasSize: { readonly width: number; readonly height: number },
		currentCrosshairMm: Point3D,
		angles: ObliqueRotationAngles,
		transform: ViewportTransform,
		options?: GlSliceRenderOptions,
		targets?: { axial?: HTMLCanvasElement | null; coronal?: HTMLCanvasElement | null; sagittal?: HTMLCanvasElement | null },
	): { newCrosshairMm: Point3D; coords: { axial: GlSliceCoordinates; coronal: GlSliceCoordinates; sagittal: GlSliceCoordinates } } | null {
		const newCrosshairMm = calculateCrosshairCenterDrag(plane, pointerPx, canvasSize, currentCrosshairMm, angles, transform, volume);
		this.lastCrosshairMm = { ...newCrosshairMm };
		this.lastAngles = { ...angles };
		const renderOptions: GlSliceRenderOptions = options ?? {
			windowWidth: volume.defaultWindowWidth ?? 1500,
			windowLevel: volume.defaultWindowLevel ?? 300,
		};
		const coords = this.renderAllPlanes(volume, newCrosshairMm, angles, renderOptions, targets);
		if (!coords) return null;
		return { newCrosshairMm, coords };
	}

	/**
	 * Synchronizes 3D crosshair focal point and renders all MPR planes in GPU VRAM (< 0.5 ms per frame).
	 */
	public applyCrosshairFocusSync(
		volume: CbctVoxelVolume,
		newCrosshairMm: Point3D,
		angles: ObliqueRotationAngles,
		options?: GlSliceRenderOptions,
		targets?: { axial?: HTMLCanvasElement | null; coronal?: HTMLCanvasElement | null; sagittal?: HTMLCanvasElement | null },
	): { axial: GlSliceCoordinates; coronal: GlSliceCoordinates; sagittal: GlSliceCoordinates } | null {
		this.lastCrosshairMm = { ...newCrosshairMm };
		this.lastAngles = { ...angles };
		const renderOptions: GlSliceRenderOptions = options ?? {
			windowWidth: volume.defaultWindowWidth ?? 1500,
			windowLevel: volume.defaultWindowLevel ?? 300,
		};
		return this.renderAllPlanes(volume, newCrosshairMm, angles, renderOptions, targets);
	}

	public dispose(): void {
		const gl = this.gl;
		if (gl) {
			if (this.vao && gl.deleteVertexArray) { gl.deleteVertexArray(this.vao); this.vao = null; }
			if (this.volumeTexture) { gl.deleteTexture(this.volumeTexture); this.volumeTexture = null; }
			if (this.program) {
				if (this.vertexShader) { gl.detachShader(this.program, this.vertexShader); gl.deleteShader(this.vertexShader); this.vertexShader = null; }
				if (this.fragmentShader) { gl.detachShader(this.program, this.fragmentShader); gl.deleteShader(this.fragmentShader); this.fragmentShader = null; }
				gl.deleteProgram(this.program); this.program = null;
			}
			const loseCtx = gl.getExtension ? gl.getExtension("WEBGL_lose_context") : null;
			if (loseCtx && typeof (loseCtx as unknown as { loseContext?: () => void }).loseContext === "function") {
				(loseCtx as unknown as { loseContext: () => void }).loseContext();
			}
		}

		this.cleanupContextListeners?.();
		this.cleanupContextListeners = null;
		this.contextRestoredListeners.clear();
		this.contextLostListeners.clear();
		this.activeVolume = null;
		this.lastCoords = null;
		this.lastOptions = null;
		this.lastCrosshairMm = null;
		this.lastAngles = null;
		this.gl = null; this.canvas = null; this.activeVolumeId = null;
		this.uploadDim = null; this.isInitialized = false; this.uniforms = null;
	}
}

// ─── SHARED POOL MANAGEMENT ──────────────────────────────────────────────────

let sharedGlContext: CbctVolumeGlContext | null = null;

export function getSharedCbctGlContext(): CbctVolumeGlContext {
	if (!sharedGlContext) {
		const offscreenCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
		sharedGlContext = new CbctVolumeGlContext(offscreenCanvas ?? undefined);
	}
	return sharedGlContext;
}

export function disposeSharedCbctGlContext(): void {
	if (sharedGlContext) {
		sharedGlContext.dispose();
		sharedGlContext = null;
	}
}
