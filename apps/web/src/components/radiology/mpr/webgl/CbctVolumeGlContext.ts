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
 */

import type {
	CbctVoxelVolume,
	MprPlane,
	Point3D,
	SlabProjectionMode,
} from "../../cbctMprMath";
import {
	worldMmToSlicePx,
	worldMmToSlicePxContinuous,
} from "../../cbctCoordinateMath";
import {
	type ObliqueRotationAngles,
	computeObliquePlaneBasis,
} from "../../cbctObliqueMatrixMath";
import {
	CBCT_MPR_FRAGMENT_SHADER,
	CBCT_MPR_VERTEX_SHADER,
} from "./cbctMprShaders";

export interface GlSliceRenderOptions {
	windowWidth: number;
	windowLevel: number;
	invert?: boolean | undefined;
	slabMode?: SlabProjectionMode | undefined;
	slabThicknessMm?: number | undefined;
	interpolation?: "nearest" | "trilinear" | undefined;
	expandObliqueDiagonal?: boolean | undefined;
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

	const srcW = srcDim.width;
	const srcSlice = srcDim.width * srcDim.height;
	const dstSlice = dstW * dstH;

	for (let dz = 0; dz < dstD; dz++) {
		const sz = dz * step;
		const srcZOffset = sz * srcSlice;
		const dstZOffset = dz * dstSlice;
		for (let dy = 0; dy < dstH; dy++) {
			const sy = dy * step;
			const srcYOffset = srcZOffset + sy * srcW;
			const dstYOffset = dstZOffset + dy * dstW;
			for (let dx = 0; dx < dstW; dx++) {
				const sx = dx * step;
				dstData[dstYOffset + dx] = srcData[srcYOffset + sx] ?? -1000;
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
	const dim = volume.dimensions;
	const sp = volume.spacingMm;
	const origin = volume.originMm;

	let widthPx = 0;
	let heightPx = 0;
	let pixelSpacingX = 0;
	let pixelSpacingY = 0;

	switch (plane) {
		case "axial":
			widthPx = dim.width;
			heightPx = dim.height;
			pixelSpacingX = sp.x;
			pixelSpacingY = sp.y;
			break;
		case "coronal":
			widthPx = dim.width;
			heightPx = Math.max(1, Math.round((dim.depth * sp.z) / (sp.x || 1.0)));
			pixelSpacingX = sp.x;
			pixelSpacingY = (dim.depth * sp.z) / heightPx;
			break;
		case "sagittal":
			widthPx = dim.height;
			heightPx = Math.max(1, Math.round((dim.depth * sp.z) / (sp.y || 1.0)));
			pixelSpacingX = sp.y;
			pixelSpacingY = (dim.depth * sp.z) / heightPx;
			break;
	}

	const basis = computeObliquePlaneBasis(plane, crosshairMm, angles);

	// Check if slice plane is rotated obliquely: expand viewport span to accommodate full 3D diagonal sqrt(W^2 + H^2)
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

	// Use continuous sub-pixel coordinates for pivot to prevent 1-pixel discontinuous phase shudder
	const pivotPx = worldMmToSlicePxContinuous(crosshairMm, plane, volume);

	const maxCoordX = Math.max(1, dim.width - 1);
	const maxCoordY = Math.max(1, dim.height - 1);
	const maxCoordZ = Math.max(1, dim.depth - 1);

	// World coordinate at slice pixel (0, 0)
	const world00X = crosshairMm.x - pivotPx.x * basis.u.x * pixelSpacingX - pivotPx.y * basis.v.x * pixelSpacingY;
	const world00Y = crosshairMm.y - pivotPx.x * basis.u.y * pixelSpacingX - pivotPx.y * basis.v.y * pixelSpacingY;
	const world00Z = crosshairMm.z - pivotPx.x * basis.u.z * pixelSpacingX - pivotPx.y * basis.v.z * pixelSpacingY;

	const vox00X = (world00X - origin.x) / sp.x;
	const vox00Y = (world00Y - origin.y) / sp.y;
	const vox00Z = (world00Z - origin.z) / sp.z;

	const sliceOrigin: [number, number, number] = [
		vox00X / maxCoordX,
		vox00Y / maxCoordY,
		vox00Z / maxCoordZ,
	];

	// Span across slice width (pixels 0 -> widthPx)
	const totalSpanMmX = widthPx * pixelSpacingX;
	const axisU: [number, number, number] = [
		(basis.u.x * totalSpanMmX) / (sp.x * maxCoordX),
		(basis.u.y * totalSpanMmX) / (sp.y * maxCoordY),
		(basis.u.z * totalSpanMmX) / (sp.z * maxCoordZ),
	];

	// Span across slice height (pixels 0 -> heightPx)
	const totalSpanMmY = heightPx * pixelSpacingY;
	const axisV: [number, number, number] = [
		(basis.v.x * totalSpanMmY) / (sp.x * maxCoordX),
		(basis.v.y * totalSpanMmY) / (sp.y * maxCoordY),
		(basis.v.z * totalSpanMmY) / (sp.z * maxCoordZ),
	];

	// Slab thickness stepping along slice normal
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

	return {
		widthPx,
		heightPx,
		pixelSpacingX,
		pixelSpacingY,
		sliceOrigin,
		axisU,
		axisV,
		axisNorm,
		slabModeCode,
		slabSteps,
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
	private isInitialized = false;
	private vao: WebGLVertexArrayObject | null = null;

	// Uniform locations cache
	private uniforms: {
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
	} | null = null;

	constructor(canvas?: HTMLCanvasElement) {
		if (canvas) {
			this.init(canvas);
		}
	}

	public init(canvas: HTMLCanvasElement): boolean {
		this.canvas = canvas;

		try {
			const gl = canvas.getContext("webgl2", {
				alpha: false,
				depth: false,
				stencil: false,
				antialias: false,
				preserveDrawingBuffer: true,
				powerPreference: "high-performance",
			});

			if (!gl) {
				console.warn("[CbctVolumeGlContext] WebGL2 not supported on canvas, using CPU/Worker fallback.");
				this.isInitialized = false;
				return false;
			}

			this.gl = gl;
			const success = this.setupShaders();
			this.isInitialized = success;
			return success;
		} catch (err) {
			console.warn("[CbctVolumeGlContext] WebGL2 initialization failed:", err);
			this.isInitialized = false;
			return false;
		}
	}

	public isAvailable(): boolean {
		return this.isInitialized && this.gl !== null && this.program !== null;
	}

	public getCanvas(): HTMLCanvasElement | null {
		return this.canvas;
	}

	public getGl(): WebGL2RenderingContext | null {
		return this.gl;
	}

	public getActiveVolumeId(): string | null {
		return this.activeVolumeId;
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

		if (!this.vertexShader || !this.fragmentShader) {
			return false;
		}

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
		if (this.vao && gl.bindVertexArray) {
			gl.bindVertexArray(this.vao);
		}

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

	/**
	 * Uploads 16-bit signed CBCT volume data to GPU as a 3D Texture.
	 * If the same volume is already loaded in VRAM, skips redundant re-upload.
	 */
	public uploadVolume(
		volume: CbctVoxelVolume,
		options?: { forceReupload?: boolean },
	): boolean {
		const gl = this.gl;
		if (!gl || !this.isAvailable()) return false;
		if (gl.isContextLost && gl.isContextLost()) return false;
		if (!volume.data || volume.isDisposed) return false;

		// Already in GPU memory
		if (!options?.forceReupload && this.activeVolumeId === volume.id && this.volumeTexture) {
			return true;
		}

		// Delete previous texture if changing volumes or forcing re-upload
		if (this.volumeTexture) {
			gl.deleteTexture(this.volumeTexture);
			this.volumeTexture = null;
			this.activeVolumeId = null;
		}

		const texture = gl.createTexture();
		if (!texture) return false;

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_3D, texture);

		// Clamp to edges for continuous boundary handling
		gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);

		// Integer texture filtering setup:
		// WebGL2 specs mandate NEAREST for integer internal formats (R16I);
		// our GLSL fragment shader performs exact 8-point sub-voxel trilinear filtering in hardware.
		gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

		// Hardware check: Query driver limit for 3D texture dimensions (WebGL2 min guaranteed = 256)
		const max3dSize =
			(typeof gl.getParameter === "function" && gl.MAX_3D_TEXTURE_SIZE !== undefined
				? (gl.getParameter(gl.MAX_3D_TEXTURE_SIZE) as number)
				: 2048) || 2048;
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
			console.warn(
				`[CbctVolumeGlContext] Volume dimensions (${volume.dimensions.width}x${volume.dimensions.height}x${volume.dimensions.depth}) exceed GPU MAX_3D_TEXTURE_SIZE (${max3dSize}). Downsampling ${step}x for low-spec GPU compatibility.`,
			);
			const downsampled = downsampleVolumeData(volume.data, volume.dimensions, step);
			uploadData = downsampled.data;
			uploadWidth = downsampled.width;
			uploadHeight = downsampled.height;
			uploadDepth = downsampled.depth;
		}

		// Upload 16-bit signed integer volume data directly into VRAM
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 2); // 16-bit short alignment
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
		} catch (err) {
			console.error("[CbctVolumeGlContext] gl.texImage3D failed:", err);
			gl.deleteTexture(texture);
			this.volumeTexture = null;
			this.activeVolumeId = null;
			return false;
		}

		this.volumeTexture = texture;
		this.activeVolumeId = volume.id;

		// Update volume dimensions uniform
		if (this.uniforms?.volumeDim) {
			gl.useProgram(this.program);
			gl.uniform3f(this.uniforms.volumeDim, uploadWidth, uploadHeight, uploadDepth);
		}

		return true;
	}

	/**
	 * Explicitly marks a volume ID (or active volume) as evicted from GPU cache,
	 * releasing its 3D texture backing store to prevent VRAM memory bloat upon patient change.
	 */
	public invalidateVolume(volumeId?: string): void {
		if (!volumeId || this.activeVolumeId === volumeId) {
			if (this.gl && this.volumeTexture) {
				this.gl.deleteTexture(this.volumeTexture);
				this.volumeTexture = null;
			}
			this.activeVolumeId = null;
		}
	}

	/**
	 * Hardware-accelerated slice extraction and display on target canvas.
	 * Executes in < 0.5 ms at 60+ FPS on modern GPU.
	 * If targetCanvas is supplied, the rendered frame is copied to targetCanvas.
	 */
	public renderSlice(
		volume: CbctVoxelVolume,
		plane: MprPlane,
		crosshairMm: Point3D,
		angles: ObliqueRotationAngles,
		options: GlSliceRenderOptions,
		targetCanvas?: HTMLCanvasElement | null,
	): GlSliceCoordinates | null {
		const gl = this.gl;
		const canvas = this.canvas;
		if (!gl || !canvas || !this.isAvailable() || !this.program || !this.uniforms) {
			return null;
		}

		if (!this.uploadVolume(volume)) {
			return null;
		}

		const coords = computeGlSliceCoordinates(volume, plane, crosshairMm, angles, options);

		// Avoid shrinking canvas to prevent continuous WebGL framebuffer reallocation thrashing
		if (targetCanvas) {
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

		if (this.vao && gl.bindVertexArray) {
			gl.bindVertexArray(this.vao);
		}

		// Bind 3D texture to unit 0
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_3D, this.volumeTexture);
		gl.uniform1i(this.uniforms.volume, 0);

		// Set slice coordinate uniforms
		gl.uniform3fv(this.uniforms.sliceOrigin, coords.sliceOrigin);
		gl.uniform3fv(this.uniforms.axisU, coords.axisU);
		gl.uniform3fv(this.uniforms.axisV, coords.axisV);
		gl.uniform3fv(this.uniforms.axisNorm, coords.axisNorm);

		// Set clinical window/level uniforms
		gl.uniform1f(this.uniforms.windowWidth, options.windowWidth);
		gl.uniform1f(this.uniforms.windowLevel, options.windowLevel);
		gl.uniform1i(this.uniforms.invert, options.invert ? 1 : 0);
		gl.uniform1i(this.uniforms.slabMode, coords.slabModeCode);
		gl.uniform1i(this.uniforms.slabSteps, coords.slabSteps);
		gl.uniform1i(this.uniforms.trilinear, options.interpolation !== "nearest" ? 1 : 0);

		// Fullscreen quad draw call (< 0.2 ms on modern GPU)
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		if (targetCanvas) {
			if (targetCanvas.width !== coords.widthPx || targetCanvas.height !== coords.heightPx) {
				targetCanvas.width = coords.widthPx;
				targetCanvas.height = coords.heightPx;
			}
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
					coords.widthPx,
					coords.heightPx,
				);
			}
		}

		return coords;
	}

	/**
	 * Renders all 3 MPR planes (Axial, Coronal, Sagittal) in hardware GPU pipeline.
	 * Dispatches batch draw calls and optionally blits results into destination canvases.
	 */
	public renderAllPlanes(
		volume: CbctVoxelVolume,
		crosshairMm: Point3D,
		angles: ObliqueRotationAngles,
		options: GlSliceRenderOptions,
		targets?: {
			axial?: HTMLCanvasElement | null;
			coronal?: HTMLCanvasElement | null;
			sagittal?: HTMLCanvasElement | null;
		},
	): {
		axial: GlSliceCoordinates;
		coronal: GlSliceCoordinates;
		sagittal: GlSliceCoordinates;
	} | null {
		// Pre-size offscreen canvas to maximum dimension across all 3 planes once to prevent framebuffer reallocation thrashing
		if (this.canvas) {
			const maxDim = Math.max(
				volume.dimensions.width,
				Math.max(volume.dimensions.height, volume.dimensions.depth),
			);
			if (this.canvas.width < maxDim || this.canvas.height < maxDim) {
				this.canvas.width = Math.max(this.canvas.width, maxDim);
				this.canvas.height = Math.max(this.canvas.height, maxDim);
			}
		}

		const axialCoords = this.renderSlice(volume, "axial", crosshairMm, angles, options, targets?.axial);
		if (!axialCoords) return null;

		const coronalCoords = this.renderSlice(volume, "coronal", crosshairMm, angles, options, targets?.coronal);
		if (!coronalCoords) return null;

		const sagittalCoords = this.renderSlice(volume, "sagittal", crosshairMm, angles, options, targets?.sagittal);
		if (!sagittalCoords) return null;

		return {
			axial: axialCoords,
			coronal: coronalCoords,
			sagittal: sagittalCoords,
		};
	}

	/**
	 * Releases all GPU memory backing stores (textures, shaders, programs)
	 * preventing VRAM leaks upon unmount or modal close.
	 */
	public dispose(): void {
		const gl = this.gl;
		if (gl) {
			if (this.vao && gl.deleteVertexArray) {
				gl.deleteVertexArray(this.vao);
				this.vao = null;
			}
			if (this.volumeTexture) {
				gl.deleteTexture(this.volumeTexture);
				this.volumeTexture = null;
			}
			if (this.program) {
				if (this.vertexShader) {
					gl.detachShader(this.program, this.vertexShader);
					gl.deleteShader(this.vertexShader);
					this.vertexShader = null;
				}
				if (this.fragmentShader) {
					gl.detachShader(this.program, this.fragmentShader);
					gl.deleteShader(this.fragmentShader);
					this.fragmentShader = null;
				}
				gl.deleteProgram(this.program);
				this.program = null;
			}
			const loseCtx = gl.getExtension ? gl.getExtension("WEBGL_lose_context") : null;
			if (loseCtx && typeof (loseCtx as unknown as { loseContext?: () => void }).loseContext === "function") {
				(loseCtx as unknown as { loseContext: () => void }).loseContext();
			}
		}

		this.gl = null;
		this.canvas = null;
		this.activeVolumeId = null;
		this.isInitialized = false;
		this.uniforms = null;
	}
}

// ─── SHARED POOL MANAGEMENT ──────────────────────────────────────────────────

let sharedGlContext: CbctVolumeGlContext | null = null;

export function getSharedCbctGlContext(): CbctVolumeGlContext {
	if (!sharedGlContext) {
		const offscreenCanvas =
			typeof document !== "undefined" ? document.createElement("canvas") : null;
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

