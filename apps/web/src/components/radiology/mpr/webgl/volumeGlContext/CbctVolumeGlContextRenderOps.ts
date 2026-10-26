import type { CbctVoxelVolume, MprPlane, Point3D } from "../../../cbctMprMath";
import type { Point2D } from "../../../cbctCaliperNerveMath";
import type { ObliqueRotationAngles } from "../../../cbctObliqueMatrixMath";
import type { CbctRenderingTier } from "@dental/shared";
import { type GlSliceCoordinates, type GlSliceRenderOptions, computeGlSliceCoordinates } from "../CbctVolumeGlTextures";
import { updateSliceBasisUniformsOnProgram, clearCanvasToBlack } from "./glRenderPipelines";
import { GlSliceRenderManager } from "./glSliceRenderManager";
import { CbctVolumeGlContextBase } from "./CbctVolumeGlContextBase";

export class CbctVolumeGlContextRenderOps extends CbctVolumeGlContextBase {
	public readonly renderMgr = new GlSliceRenderManager();

	public getLastRenderTimeMs(): number { return this.renderMgr.lastRenderTimeMs; }
	public getLastAllPlanesTimeMs(): number { return this.renderMgr.lastAllPlanesTimeMs; }
	public getLastCrossSectionRenderTimeMs(): number { return this.renderMgr.lastCrossSectionRenderTimeMs; }

	public init(canvas: HTMLCanvasElement): boolean {
		this.cleanupListeners?.(); this.cleanupListeners = null;
		this.disposeGlResources(); this.canvas = canvas; this.lifecycle.contextLostState = false;
		try {
			const gl = canvas.getContext("webgl2", { alpha: false, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance", desynchronized: false });
			if (!gl) { this.isInitialized = false; return false; }
			this.gl = gl; clearCanvasToBlack(gl);
			const success = this.setupShaders(); this.isInitialized = success;
			const onLost = (e: Event) => { if (typeof e.preventDefault === "function") e.preventDefault(); this.handleContextLostDirect(); };
			const onRestored = () => { this.handleContextRestoredDirect(); };
			if (typeof canvas.addEventListener === "function") {
				canvas.addEventListener("webglcontextlost", onLost); canvas.addEventListener("webglcontextrestored", onRestored);
				this.cleanupListeners = () => { canvas.removeEventListener("webglcontextlost", onLost); canvas.removeEventListener("webglcontextrestored", onRestored); };
			}
			return success;
		} catch { this.isInitialized = false; return false; }
	}

	public handleContextLostDirect(): void {
		this.isInitialized = false; this.program = null; this.crossSectionProgram = null; this.vao = null; this.uniforms = null; this.crossSectionUniforms = null;
		this.volState.resetTextureOnly(); this.lifecycle.notifyContextLost();
	}

	public handleContextRestoredDirect(): void {
		if (this.canvas) {
			const targetVolume = this.volState.activeVolume; const targetCoords = this.lastCoords;
			const restored = this.init(this.canvas);
			if (restored && targetVolume && !targetVolume.isDisposed) {
				this.uploadVolume(targetVolume, { forceReupload: true });
				if (targetCoords) this.updateSliceBasisUniforms(targetCoords);
			}
			this.lifecycle.notifyContextRestored();
		}
	}

	public simulateContextLost(): void { this.lifecycle.simulateContextLost(this.canvas, () => this.handleContextLostDirect()); }
	public simulateContextRestored(): void { this.lifecycle.simulateContextRestored(this.canvas, () => this.handleContextRestoredDirect()); }

	public uploadVolume(volume: CbctVoxelVolume, options?: { forceReupload?: boolean; targetMaxDim?: number; tier?: CbctRenderingTier }): boolean {
		if (!this.gl || !this.isAvailable() || !volume.data || volume.isDisposed) return false;
		const ok = this.volState.upload(this.gl, volume, this.lifecycle.contextLossCount, options);
		if (ok && this.uniforms?.volumeDim && this.volState.uploadDim) {
			this.gl.useProgram(this.program);
			this.gl.uniform3f(this.uniforms.volumeDim, this.volState.uploadDim.width, this.volState.uploadDim.height, this.volState.uploadDim.depth);
		}
		if (ok && this.crossSectionProgram && this.crossSectionUniforms?.volumeDim && this.volState.uploadDim) {
			this.gl.useProgram(this.crossSectionProgram);
			this.gl.uniform3f(this.crossSectionUniforms.volumeDim, this.volState.uploadDim.width, this.volState.uploadDim.height, this.volState.uploadDim.depth);
		}
		return ok;
	}

	public invalidateVolume(volumeId?: string): void {
		if (!volumeId || this.volState.activeVolumeId === volumeId) this.disposeGlResources({ texturesOnly: true });
	}

	public updateSliceBasisUniforms(coords: GlSliceCoordinates): boolean {
		if (!this.gl || !this.isAvailable() || !this.program || !this.uniforms) return false;
		return updateSliceBasisUniformsOnProgram(this.gl, this.program, this.uniforms, coords);
	}

	public renderFromCoordinates(volume: CbctVoxelVolume, coords: GlSliceCoordinates, options: GlSliceRenderOptions, targetCanvas?: HTMLCanvasElement | null): GlSliceCoordinates | null {
		if (!this.gl || !this.canvas || !this.isAvailable() || !this.program || !this.uniforms) return null;
		if (!this.uploadVolume(volume)) return null;
		this.lastCoords = coords; this.lastOptions = options;
		const res = this.renderMgr.dispatchSliceDraw(this.gl, this.canvas, this.vao, this.volState.volumeTexture, this.volState.uploadDim, this.program, this.uniforms, coords, options, this.currentColorMap, this.currentSharpenAmount, targetCanvas);
		return res ? res.coords : null;
	}

	public renderSlice(volume: CbctVoxelVolume, plane: MprPlane, crosshairMm: Point3D, angles: ObliqueRotationAngles, options: GlSliceRenderOptions, targetCanvas?: HTMLCanvasElement | null): GlSliceCoordinates | null {
		this.lastCrosshairMm = { ...crosshairMm }; this.lastAngles = { ...angles }; this.lastOptions = options;
		const coords = computeGlSliceCoordinates(volume, plane, crosshairMm, angles, options);
		return this.renderFromCoordinates(volume, coords, options, targetCanvas);
	}

	public renderCrossSectionOnGl(volume: CbctVoxelVolume, centerMm: Point3D, normal2D: Point2D, options?: (GlSliceRenderOptions & { widthMm?: number | undefined; heightMm?: number | undefined; pixelSpacingMm?: number | undefined; slabThicknessMm?: number | undefined; readPixels?: boolean | undefined }) | undefined, targetCanvas?: HTMLCanvasElement | null | undefined): { coords: GlSliceCoordinates; pixelData?: Uint8ClampedArray | undefined; renderTimeMs: number } | null {
		if (!this.gl || !this.canvas || !this.isAvailable()) return null;
		if (!this.uploadVolume(volume)) return null;
		const prog = this.crossSectionProgram ?? this.program; const unifs = this.crossSectionUniforms ?? this.uniforms;
		if (!prog || !unifs) return null;
		this.lastCrosshairMm = { ...centerMm }; this.lastOptions = options ?? null;
		return this.renderMgr.renderCrossSectionOnGl(this.gl, this.canvas, this.vao, this.volState.volumeTexture, this.volState.uploadDim, prog, unifs, volume, centerMm, normal2D, options, targetCanvas, this.currentColorMap, this.currentSharpenAmount);
	}

	public renderCrossSection(volume: CbctVoxelVolume, centerMm: Point3D, normal2D: Point2D, options: GlSliceRenderOptions & { widthMm?: number | undefined; heightMm?: number | undefined; pixelSpacingMm?: number | undefined; slabThicknessMm?: number | undefined }, targetCanvas?: HTMLCanvasElement | null | undefined): GlSliceCoordinates | null {
		const res = this.renderCrossSectionOnGl(volume, centerMm, normal2D, options, targetCanvas);
		return res ? res.coords : null;
	}

	public renderAllPlanes(volume: CbctVoxelVolume, crosshairMm: Point3D, angles: ObliqueRotationAngles, options: GlSliceRenderOptions, targets?: { axial?: HTMLCanvasElement | null; coronal?: HTMLCanvasElement | null; sagittal?: HTMLCanvasElement | null }): { axial: GlSliceCoordinates; coronal: GlSliceCoordinates; sagittal: GlSliceCoordinates } | null {
		this.lastCrosshairMm = { ...crosshairMm }; this.lastAngles = { ...angles }; this.lastOptions = options;
		if (this.canvas) {
			const maxDim = Math.max(volume.dimensions.width, Math.max(volume.dimensions.height, volume.dimensions.depth));
			if (this.canvas.width < maxDim || this.canvas.height < maxDim) { this.canvas.width = Math.max(this.canvas.width, maxDim); this.canvas.height = Math.max(this.canvas.height, maxDim); }
		}
		const tStart = typeof performance !== "undefined" ? performance.now() : 0;
		const axial = this.renderSlice(volume, "axial", crosshairMm, angles, options, targets?.axial); if (!axial) return null;
		const coronal = this.renderSlice(volume, "coronal", crosshairMm, angles, options, targets?.coronal); if (!coronal) return null;
		const sagittal = this.renderSlice(volume, "sagittal", crosshairMm, angles, options, targets?.sagittal); if (!sagittal) return null;
		if (tStart > 0 && typeof performance !== "undefined") this.renderMgr.lastAllPlanesTimeMs = performance.now() - tStart;
		return { axial, coronal, sagittal };
	}
}
