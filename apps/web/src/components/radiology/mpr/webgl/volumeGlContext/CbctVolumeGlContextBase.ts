import type { CbctVoxelVolume, Point3D } from "../../../cbctMprMath";
import type { ObliqueRotationAngles } from "../../../cbctObliqueMatrixMath";
import type { CbctRenderingTier } from "@dental/shared";
import { type CbctColorMapMode, type GlSliceCoordinates, type GlSliceRenderOptions, resolveColorMapCode } from "../CbctVolumeGlTextures";
import type { GlUniformLocations } from "./types";
import { createCrossSectionShaderProgram, createMprShaderProgram } from "./glShaderPrograms";
import { clearCanvasToBlack } from "./glRenderPipelines";
import { GlResourceTracker } from "./glResourceTracker";
import { GlContextLifecycleManager } from "./glContextLifecycleManager";
import { GlVolumeUploadState } from "./glVolumeUploadState";

export class CbctVolumeGlContextBase {
	protected gl: WebGL2RenderingContext | null = null;
	protected canvas: HTMLCanvasElement | null = null;
	protected program: WebGLProgram | null = null;
	protected vertexShader: WebGLShader | null = null;
	protected fragmentShader: WebGLShader | null = null;
	protected crossSectionProgram: WebGLProgram | null = null;
	protected crossSectionVertexShader: WebGLShader | null = null;
	protected crossSectionFragmentShader: WebGLShader | null = null;
	protected isInitialized = false;
	protected vao: WebGLVertexArrayObject | null = null;
	protected uniforms: GlUniformLocations | null = null;
	protected crossSectionUniforms: GlUniformLocations | null = null;
	protected currentColorMap = 0;
	protected currentSharpenAmount = 0.0;
	protected lastCrosshairMm: Point3D | null = null;
	protected lastAngles: ObliqueRotationAngles | null = null;
	protected lastCoords: GlSliceCoordinates | null = null;
	protected lastOptions: GlSliceRenderOptions | null = null;
	protected cleanupListeners: (() => void) | null = null;

	public readonly tracker = new GlResourceTracker();
	public readonly lifecycle = new GlContextLifecycleManager();
	public readonly volState = new GlVolumeUploadState();

	public getContextLossCount(): number { return this.lifecycle.getContextLossCount(); }
	public resetContextLossCount(): void { this.lifecycle.resetContextLossCount(); }
	public isAvailable(): boolean { return !this.lifecycle.contextLostState && this.isInitialized && !!this.gl && !!this.program && (!this.gl.isContextLost || !this.gl.isContextLost()); }
	public isContextLost(): boolean { return this.lifecycle.contextLostState || !this.gl || (typeof this.gl.isContextLost === "function" && this.gl.isContextLost()); }
	public getCanvas(): HTMLCanvasElement | null { return this.canvas; }
	public getGl(): WebGL2RenderingContext | null { return this.gl; }
	public getActiveVolumeId(): string | null { return this.volState.activeVolumeId; }
	public getActiveVolume(): CbctVoxelVolume | null { return this.volState.activeVolume; }
	public getDownsampleStep(): number { return this.volState.downsampleStep; }
	public getLastCrosshairMm(): Point3D | null { return this.lastCrosshairMm; }
	public getLastObliqueAngles(): ObliqueRotationAngles | null { return this.lastAngles; }
	public getLastSliceCoordinates(): GlSliceCoordinates | null { return this.lastCoords; }
	public getCrossSectionProgram(): WebGLProgram | null { return this.crossSectionProgram; }
	public getRenderingTier(): CbctRenderingTier { return this.volState.activeTier ?? "balanced"; }
	public setRenderingTier(tier: CbctRenderingTier): void { if (this.volState.activeTier !== tier) { this.volState.activeTier = tier; if (this.volState.volumeTexture) this.disposeGlResources({ texturesOnly: true }); } }
	public getTargetMaxDim(): number { return this.volState.targetMaxDim ?? 2048; }
	public setTargetMaxDim(dim: number): void { const c = Math.max(64, Math.min(2048, Math.round(dim))); if (this.volState.targetMaxDim !== c) { this.volState.targetMaxDim = c; if (this.volState.volumeTexture) this.disposeGlResources({ texturesOnly: true }); } }
	public addContextRestoredListener(l: () => void): () => void { return this.lifecycle.addContextRestoredListener(l); }
	public addContextLostListener(l: () => void): () => void { return this.lifecycle.addContextLostListener(l); }
	public setColorMap(mode: CbctColorMapMode | number): void { this.currentColorMap = resolveColorMapCode(mode); }
	public getColorMap(): number { return this.currentColorMap; }
	public setSharpenAmount(amount: number): void { this.currentSharpenAmount = Math.max(0.0, Math.min(1.0, amount)); }
	public getSharpenAmount(): number { return this.currentSharpenAmount; }
	public trackBuffer(b: WebGLBuffer): WebGLBuffer { return this.tracker.trackBuffer(b); }
	public trackFramebuffer(f: WebGLFramebuffer): WebGLFramebuffer { return this.tracker.trackFramebuffer(f); }
	public trackRenderbuffer(r: WebGLRenderbuffer): WebGLRenderbuffer { return this.tracker.trackRenderbuffer(r); }
	public trackTexture(t: WebGLTexture): WebGLTexture { return this.tracker.trackTexture(t); }

	public disposeGlResources(options?: { texturesOnly?: boolean }): void {
		this.tracker.disposeAll(this.gl, this.vao, this.volState.volumeTexture, this.program, this.vertexShader, this.fragmentShader, this.crossSectionProgram, this.crossSectionVertexShader, this.crossSectionFragmentShader, options);
		this.volState.volumeTexture = null;
		if (options?.texturesOnly) { this.volState.reset(); return; }
		this.vao = null; this.program = null; this.vertexShader = null; this.fragmentShader = null;
		this.crossSectionProgram = null; this.crossSectionVertexShader = null; this.crossSectionFragmentShader = null;
		this.uniforms = null; this.crossSectionUniforms = null; this.volState.reset();
	}

	protected setupShaders(): boolean {
		if (!this.gl) return false;
		const mpr = createMprShaderProgram(this.gl);
		if (!mpr) return false;
		this.program = mpr.program; this.vertexShader = mpr.vertexShader; this.fragmentShader = mpr.fragmentShader; this.uniforms = mpr.uniforms;
		this.gl.useProgram(this.program);
		this.vao = this.gl.createVertexArray ? this.gl.createVertexArray() : null;
		if (this.vao && this.gl.bindVertexArray) this.gl.bindVertexArray(this.vao);
		const cs = createCrossSectionShaderProgram(this.gl);
		if (cs) { this.crossSectionProgram = cs.program; this.crossSectionVertexShader = cs.vertexShader; this.crossSectionFragmentShader = cs.fragmentShader; this.crossSectionUniforms = cs.uniforms; }
		return true;
	}
}
