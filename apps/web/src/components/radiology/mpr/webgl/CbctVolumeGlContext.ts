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

import type { CbctVoxelVolume, MprPlane, Point3D } from "../../cbctMprMath";
import type { Point2D } from "../../cbctCaliperNerveMath";
import type { ObliqueRotationAngles, ViewportTransform } from "../../cbctObliqueMatrixMath";
import type { RotationHandlePosition } from "../../cbctObliqueMath";
import {
	CBCT_MPR_FRAGMENT_SHADER,
	CBCT_MPR_VERTEX_SHADER,
} from "./cbctMprShaders";
import {
	CBCT_CROSS_SECTION_FRAGMENT_SHADER,
	CBCT_CROSS_SECTION_VERTEX_SHADER,
} from "./cbctCrossSectionShaders";
import {
	type CbctColorMapMode,
	type GlSliceCoordinates,
	type GlSliceRenderOptions,
	applySafeDprToCanvas,
	calculateCrosshairCenterDrag,
	calculateObliqueRotationFromHandle,
	computeGlCrossSectionCoordinates,
	computeGlSliceCoordinates,
	resolveColorMapCode,
	uploadVolumeTo3DTexture,
} from "./CbctVolumeGlTextures";

// 100% transparent re-exports for backward-compatibility with all tests & callers
export * from "./CbctVolumeGlTextures";

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
	colorMap: WebGLUniformLocation | null;
	sharpenAmount: WebGLUniformLocation | null;
	gamma: WebGLUniformLocation | null;
	useSoftKnee: WebGLUniformLocation | null;
	softKneeCeiling: WebGLUniformLocation | null;
	airCutoffHU: WebGLUniformLocation | null;
}

export class CbctVolumeGlContext {
	private gl: WebGL2RenderingContext | null = null;
	private canvas: HTMLCanvasElement | null = null;
	private program: WebGLProgram | null = null;
	private vertexShader: WebGLShader | null = null;
	private fragmentShader: WebGLShader | null = null;
	private crossSectionProgram: WebGLProgram | null = null;
	private crossSectionVertexShader: WebGLShader | null = null;
	private crossSectionFragmentShader: WebGLShader | null = null;
	private volumeTexture: WebGLTexture | null = null;
	private activeVolumeId: string | null = null;
	private activeVolume: CbctVoxelVolume | null = null;
	private isInitialized = false;
	private vao: WebGLVertexArrayObject | null = null;
	private uploadDim: { width: number; height: number; depth: number } | null = null;
	private downsampleStep = 1;
	private cleanupContextListeners: (() => void) | null = null;
	private uniforms: GlUniformLocations | null = null;
	private crossSectionUniforms: GlUniformLocations | null = null;
	private contextRestoredListeners: Set<() => void> = new Set();
	private contextLostListeners: Set<() => void> = new Set();
	private contextLostState = false;
	private currentColorMap = 0;
	private currentSharpenAmount = 0.0;
	private lastCrosshairMm: Point3D | null = null;
	private lastAngles: ObliqueRotationAngles | null = null;
	private lastCoords: GlSliceCoordinates | null = null;
	private lastOptions: GlSliceRenderOptions | null = null;
	private lastRenderTimeMs = 0;
	private lastAllPlanesTimeMs = 0;
	private lastCrossSectionRenderTimeMs = 0;

	constructor(canvas?: HTMLCanvasElement) {
		if (canvas) this.init(canvas);
	}

	public init(canvas: HTMLCanvasElement): boolean {
		this.cleanupContextListeners?.();
		this.cleanupContextListeners = null;
		this.cleanupGlObjects();
		this.canvas = canvas;
		this.contextLostState = false;

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
			// Immediately clear buffer to pure medical black (#000000) to eliminate white flashes
			if (typeof gl.clearColor === "function") {
				gl.clearColor(0.0, 0.0, 0.0, 1.0);
			}
			if (typeof gl.clear === "function" && typeof gl.COLOR_BUFFER_BIT === "number") {
				gl.clear(gl.COLOR_BUFFER_BIT);
			}
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
				this.crossSectionProgram = null;
				this.vao = null;
				this.uniforms = null;
				this.crossSectionUniforms = null;
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
	public getLastRenderTimeMs(): number { return this.lastRenderTimeMs; }
	public getLastAllPlanesTimeMs(): number { return this.lastAllPlanesTimeMs; }
	public getLastCrossSectionRenderTimeMs(): number { return this.lastCrossSectionRenderTimeMs; }
	public getCrossSectionProgram(): WebGLProgram | null { return this.crossSectionProgram; }

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

	public setColorMap(mode: CbctColorMapMode | number): void {
		this.currentColorMap = resolveColorMapCode(mode);
	}

	public getColorMap(): number {
		return this.currentColorMap;
	}

	public setSharpenAmount(amount: number): void {
		this.currentSharpenAmount = Math.max(0.0, Math.min(1.0, amount));
	}

	public getSharpenAmount(): number {
		return this.currentSharpenAmount;
	}

	private cleanupGlObjects(): void {
		const gl = this.gl;
		if (!gl) return;
		if (this.vao && gl.deleteVertexArray) { gl.deleteVertexArray(this.vao); this.vao = null; }
		if (this.volumeTexture) { gl.deleteTexture(this.volumeTexture); this.volumeTexture = null; }
		if (this.program) {
			if (this.vertexShader) { gl.detachShader(this.program, this.vertexShader); gl.deleteShader(this.vertexShader); this.vertexShader = null; }
			if (this.fragmentShader) { gl.detachShader(this.program, this.fragmentShader); gl.deleteShader(this.fragmentShader); this.fragmentShader = null; }
			gl.deleteProgram(this.program);
			this.program = null;
		}
		if (this.crossSectionProgram) {
			if (this.crossSectionVertexShader) { gl.detachShader(this.crossSectionProgram, this.crossSectionVertexShader); gl.deleteShader(this.crossSectionVertexShader); this.crossSectionVertexShader = null; }
			if (this.crossSectionFragmentShader) { gl.detachShader(this.crossSectionProgram, this.crossSectionFragmentShader); gl.deleteShader(this.crossSectionFragmentShader); this.crossSectionFragmentShader = null; }
			gl.deleteProgram(this.crossSectionProgram);
			this.crossSectionProgram = null;
		}
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
			if (this.vertexShader) { gl.deleteShader(this.vertexShader); this.vertexShader = null; }
			if (this.fragmentShader) { gl.deleteShader(this.fragmentShader); this.fragmentShader = null; }
			gl.deleteProgram(program);
			return false;
		}

		this.program = program;
		gl.useProgram(program);
		this.vao = gl.createVertexArray ? gl.createVertexArray() : null;
		if (this.vao && gl.bindVertexArray) gl.bindVertexArray(this.vao);

		this.uniforms = this.extractUniformLocations(program);

		// Setup specialized transverse cross-section shader program
		this.crossSectionVertexShader = compileShader(CBCT_CROSS_SECTION_VERTEX_SHADER, gl.VERTEX_SHADER);
		this.crossSectionFragmentShader = compileShader(CBCT_CROSS_SECTION_FRAGMENT_SHADER, gl.FRAGMENT_SHADER);
		if (this.crossSectionVertexShader && this.crossSectionFragmentShader) {
			const csProg = gl.createProgram();
			if (csProg) {
				gl.attachShader(csProg, this.crossSectionVertexShader);
				gl.attachShader(csProg, this.crossSectionFragmentShader);
				gl.linkProgram(csProg);
				if (gl.getProgramParameter(csProg, gl.LINK_STATUS)) {
					this.crossSectionProgram = csProg;
					this.crossSectionUniforms = this.extractUniformLocations(csProg);
				} else {
					console.warn("[CbctVolumeGlContext] Cross-section shader link failed:", gl.getProgramInfoLog(csProg));
					if (this.crossSectionVertexShader) { gl.deleteShader(this.crossSectionVertexShader); this.crossSectionVertexShader = null; }
					if (this.crossSectionFragmentShader) { gl.deleteShader(this.crossSectionFragmentShader); this.crossSectionFragmentShader = null; }
					gl.deleteProgram(csProg);
				}
			}
		}

		return true;
	}

	private extractUniformLocations(program: WebGLProgram): GlUniformLocations {
		const gl = this.gl!;
		return {
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
			colorMap: gl.getUniformLocation(program, "u_colorMap"),
			sharpenAmount: gl.getUniformLocation(program, "u_sharpenAmount"),
			gamma: gl.getUniformLocation(program, "u_gamma"),
			useSoftKnee: gl.getUniformLocation(program, "u_useSoftKnee"),
			softKneeCeiling: gl.getUniformLocation(program, "u_softKneeCeiling"),
			airCutoffHU: gl.getUniformLocation(program, "u_airCutoffHU"),
		};
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

		const result = uploadVolumeTo3DTexture(gl, volume, max3dSize);
		if (!result) {
			this.volumeTexture = null;
			this.activeVolumeId = null;
			this.activeVolume = null;
			this.uploadDim = null;
			this.downsampleStep = 1;
			return false;
		}

		this.downsampleStep = result.downsampleStep;
		this.volumeTexture = result.texture;
		this.activeVolumeId = volume.id;
		this.activeVolume = volume;
		this.uploadDim = result.uploadDim;

		if (this.uniforms?.volumeDim) {
			gl.useProgram(this.program);
			gl.uniform3f(this.uniforms.volumeDim, result.uploadDim.width, result.uploadDim.height, result.uploadDim.depth);
		}
		if (this.crossSectionProgram && this.crossSectionUniforms?.volumeDim) {
			gl.useProgram(this.crossSectionProgram);
			gl.uniform3f(this.crossSectionUniforms.volumeDim, result.uploadDim.width, result.uploadDim.height, result.uploadDim.depth);
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

	private dispatchSliceDraw(
		prog: WebGLProgram,
		uniforms: GlUniformLocations,
		coords: GlSliceCoordinates,
		options: GlSliceRenderOptions,
		targetCanvas?: HTMLCanvasElement | null | undefined,
		readPixels?: boolean | undefined,
	): { coords: GlSliceCoordinates; pixelData?: Uint8ClampedArray | undefined; renderTimeMs: number } | null {
		const gl = this.gl;
		const canvas = this.canvas;
		if (!gl || !canvas) return null;

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
		gl.useProgram(prog);
		if (this.vao && gl.bindVertexArray) gl.bindVertexArray(this.vao);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_3D, this.volumeTexture);
		if (uniforms.volume) gl.uniform1i(uniforms.volume, 0);

		if (uniforms.volumeDim && this.uploadDim) {
			gl.uniform3f(uniforms.volumeDim, this.uploadDim.width, this.uploadDim.height, this.uploadDim.depth);
		}

		if (uniforms.sliceOrigin) gl.uniform3fv(uniforms.sliceOrigin, coords.sliceOrigin);
		if (uniforms.axisU) gl.uniform3fv(uniforms.axisU, coords.axisU);
		if (uniforms.axisV) gl.uniform3fv(uniforms.axisV, coords.axisV);
		if (uniforms.axisNorm) gl.uniform3fv(uniforms.axisNorm, coords.axisNorm);
		if (uniforms.windowWidth) gl.uniform1f(uniforms.windowWidth, options.windowWidth);
		if (uniforms.windowLevel) gl.uniform1f(uniforms.windowLevel, options.windowLevel);
		if (uniforms.invert) gl.uniform1i(uniforms.invert, options.invert ? 1 : 0);
		if (uniforms.slabMode) gl.uniform1i(uniforms.slabMode, coords.slabModeCode);
		if (uniforms.slabSteps) gl.uniform1i(uniforms.slabSteps, coords.slabSteps);
		if (uniforms.trilinear) gl.uniform1i(uniforms.trilinear, options.interpolation !== "nearest" ? 1 : 0);

		const colorMapCode = options.colorMap !== undefined ? resolveColorMapCode(options.colorMap) : this.currentColorMap;
		const sharpenAmount = options.sharpenAmount !== undefined
			? Math.max(0.0, Math.min(1.0, options.sharpenAmount))
			: this.currentSharpenAmount;

		if (uniforms.colorMap) gl.uniform1i(uniforms.colorMap, colorMapCode);
		if (uniforms.sharpenAmount) gl.uniform1f(uniforms.sharpenAmount, sharpenAmount);
		if (uniforms.gamma) gl.uniform1f(uniforms.gamma, options.gamma ?? 1.50);
		if (uniforms.useSoftKnee) gl.uniform1i(uniforms.useSoftKnee, options.useSoftKnee ? 1 : 0);
		if (uniforms.softKneeCeiling) gl.uniform1f(uniforms.softKneeCeiling, options.softKneeCeiling ?? 215.0);
		if (uniforms.airCutoffHU) gl.uniform1f(uniforms.airCutoffHU, options.airCutoffHU ?? -500.0);

		const tDrawStart = typeof performance !== "undefined" ? performance.now() : 0;
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		const elapsed = tDrawStart > 0 && typeof performance !== "undefined" ? performance.now() - tDrawStart : 0.05;
		this.lastRenderTimeMs = elapsed;

		let pixelData: Uint8ClampedArray | undefined;
		if (readPixels) {
			const raw = new Uint8Array(coords.widthPx * coords.heightPx * 4);
			gl.readPixels(0, 0, coords.widthPx, coords.heightPx, gl.RGBA, gl.UNSIGNED_BYTE, raw);
			pixelData = new Uint8ClampedArray(coords.widthPx * coords.heightPx * 4);
			const rowBytes = coords.widthPx * 4;
			for (let y = 0; y < coords.heightPx; y++) {
				const srcY = coords.heightPx - 1 - y;
				pixelData.set(raw.subarray(srcY * rowBytes, (srcY + 1) * rowBytes), y * rowBytes);
			}
		}

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

		return { coords, pixelData, renderTimeMs: elapsed };
	}

	public renderFromCoordinates(
		volume: CbctVoxelVolume,
		coords: GlSliceCoordinates,
		options: GlSliceRenderOptions,
		targetCanvas?: HTMLCanvasElement | null,
	): GlSliceCoordinates | null {
		if (!this.gl || !this.isAvailable() || !this.program || !this.uniforms) return null;
		if (!this.uploadVolume(volume)) return null;

		this.lastCoords = coords;
		this.lastOptions = options;

		const res = this.dispatchSliceDraw(this.program, this.uniforms, coords, options, targetCanvas);
		return res ? res.coords : null;
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

	public renderCrossSectionOnGl(
		volume: CbctVoxelVolume,
		centerMm: Point3D,
		normal2D: Point2D,
		options?: (GlSliceRenderOptions & {
			widthMm?: number | undefined;
			heightMm?: number | undefined;
			pixelSpacingMm?: number | undefined;
			slabThicknessMm?: number | undefined;
			readPixels?: boolean | undefined;
		}) | undefined,
		targetCanvas?: HTMLCanvasElement | null | undefined,
	): { coords: GlSliceCoordinates; pixelData?: Uint8ClampedArray | undefined; renderTimeMs: number } | null {
		if (!this.gl || !this.isAvailable()) return null;
		if (!this.uploadVolume(volume)) return null;

		const coords = computeGlCrossSectionCoordinates(volume, centerMm, normal2D, options);
		const prog = this.crossSectionProgram ?? this.program;
		const uniforms = this.crossSectionUniforms ?? this.uniforms;
		if (!prog || !uniforms) return null;

		this.lastCrosshairMm = { ...centerMm };
		this.lastCoords = coords;
		this.lastOptions = options ?? null;

		const renderOpts: GlSliceRenderOptions = {
			windowWidth: options?.windowWidth ?? volume.defaultWindowWidth ?? 4025,
			windowLevel: options?.windowLevel ?? volume.defaultWindowLevel ?? 525,
			gamma: options?.gamma ?? 1.50,
			airCutoffHU: options?.airCutoffHU ?? -500.0,
			useSoftKnee: options?.useSoftKnee ?? false,
			softKneeCeiling: options?.softKneeCeiling ?? 178.0,
			invert: options?.invert ?? false,
			interpolation: options?.interpolation ?? "trilinear",
			colorMap: options?.colorMap,
			sharpenAmount: options?.sharpenAmount,
			clampDpr: options?.clampDpr,
			safeDpr: options?.safeDpr,
		};

		const res = this.dispatchSliceDraw(prog, uniforms, coords, renderOpts, targetCanvas, options?.readPixels);
		if (res) {
			this.lastCrossSectionRenderTimeMs = res.renderTimeMs;
		}
		return res;
	}

	public renderCrossSection(
		volume: CbctVoxelVolume,
		centerMm: Point3D,
		normal2D: Point2D,
		options: GlSliceRenderOptions & {
			widthMm?: number | undefined;
			heightMm?: number | undefined;
			pixelSpacingMm?: number | undefined;
			slabThicknessMm?: number | undefined;
		},
		targetCanvas?: HTMLCanvasElement | null | undefined,
	): GlSliceCoordinates | null {
		const result = this.renderCrossSectionOnGl(volume, centerMm, normal2D, options, targetCanvas);
		return result ? result.coords : null;
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

		const tAllStart = typeof performance !== "undefined" ? performance.now() : 0;
		const axial = this.renderSlice(volume, "axial", crosshairMm, angles, options, targets?.axial);
		if (!axial) return null;
		const coronal = this.renderSlice(volume, "coronal", crosshairMm, angles, options, targets?.coronal);
		if (!coronal) return null;
		const sagittal = this.renderSlice(volume, "sagittal", crosshairMm, angles, options, targets?.sagittal);
		if (!sagittal) return null;

		if (tAllStart > 0 && typeof performance !== "undefined") {
			this.lastAllPlanesTimeMs = performance.now() - tAllStart;
		}

		return { axial, coronal, sagittal };
	}

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
			windowWidth: volume.defaultWindowWidth ?? 4025,
			windowLevel: volume.defaultWindowLevel ?? 525,
		};
		const coords = this.renderSlice(volume, plane, crosshairMm, newAngles, renderOptions, targetCanvas);
		if (!coords) return null;
		return { newAngles, angleDeg, coords };
	}

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
			windowWidth: volume.defaultWindowWidth ?? 4025,
			windowLevel: volume.defaultWindowLevel ?? 525,
		};
		const coords = this.renderAllPlanes(volume, newCrosshairMm, angles, renderOptions, targets);
		if (!coords) return null;
		return { newCrosshairMm, coords };
	}

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
			windowWidth: volume.defaultWindowWidth ?? 4025,
			windowLevel: volume.defaultWindowLevel ?? 525,
		};
		return this.renderAllPlanes(volume, newCrosshairMm, angles, renderOptions, targets);
	}

	public dispose(): void {
		const gl = this.gl;
		if (gl) {
			this.cleanupGlObjects();
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
		this.currentColorMap = 0;
		this.currentSharpenAmount = 0.0;
		this.gl = null;
		this.canvas = null;
		this.activeVolumeId = null;
		this.uploadDim = null;
		this.isInitialized = false;
		this.uniforms = null;
		this.crossSectionUniforms = null;
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
