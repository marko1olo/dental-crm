/**
 * DENTE CRM — CBCT Panoramic WebGL2 Hardware Reconstruction Engine
 * Hardware GPU-accelerated panoramic swept volume projection (< 1ms per frame).
 * Standards: DICOM Part 3, WebGL 2.0, OpenGL ES 3.0
 * Decomposed from cbctPanoramicReconstructionMath.ts per Mandate 8b.
 */

import type { CbctVoxelVolume } from "./cbctMprMath";
import {
	type DentalArchCurve,
	calculateArchTangentsAndNormals,
} from "./cbctArchSplineMath";
import {
	CBCT_PANORAMIC_CURVED_VERTEX_SHADER,
	CBCT_PANORAMIC_CURVED_FRAGMENT_SHADER,
	CBCT_PANORAMIC_VERTEX_SHADER,
	CBCT_PANORAMIC_FRAGMENT_SHADER,
} from "./mpr/webgl/cbctMprShaders";
import {
	type PanoramicReconstructionOptions,
	type PanoramicReconstructionResult,
	calculateToothMarkersOnPano,
	downsampleVolumeData,
	resolveOcclusalCenterZ,
} from "./cbctPanoramicReconstructionMath";

export {
	CBCT_PANORAMIC_CURVED_VERTEX_SHADER,
	CBCT_PANORAMIC_CURVED_FRAGMENT_SHADER,
	CBCT_PANORAMIC_VERTEX_SHADER,
	CBCT_PANORAMIC_FRAGMENT_SHADER,
};

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
	const shader = gl.createShader(type);
	if (!shader) return null;
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

function createProgram(gl: WebGL2RenderingContext, vsSrc: string, fsSrc: string): WebGLProgram | null {
	const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
	if (!vs) return null;
	const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
	if (!fs) {
		gl.deleteShader(vs);
		return null;
	}
	const prog = gl.createProgram();
	if (!prog) {
		gl.deleteShader(vs);
		gl.deleteShader(fs);
		return null;
	}
	gl.attachShader(prog, vs);
	gl.attachShader(prog, fs);
	gl.linkProgram(prog);
	gl.deleteShader(vs);
	gl.deleteShader(fs);
	if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
		gl.deleteProgram(prog);
		return null;
	}
	return prog;
}

export class WebGl2PanoramicEngine {
	readonly gl: WebGL2RenderingContext;
	readonly canvas: HTMLCanvasElement;
	private program: WebGLProgram | null = null;
	private vao: WebGLVertexArrayObject | null = null;
	private volumeTexture: WebGLTexture | null = null;
	private volumeDataRef: Int16Array | null = null;
	private splineTexture: WebGLTexture | null = null;
	private splineWidth: number = 0;
	private splineBuffer: Float32Array | null = null;
	private uploadDim: { width: number; height: number; depth: number; factor: number } | null = null;
	private uniforms: {
		volumeDim: WebGLUniformLocation | null;
		originMm: WebGLUniformLocation | null;
		invSpacingMm: WebGLUniformLocation | null;
		zTopMm: WebGLUniformLocation | null;
		zBottomMm: WebGLUniformLocation | null;
		focalRadiusMm: WebGLUniformLocation | null;
		outWidth: WebGLUniformLocation | null;
		numSlabSamples: WebGLUniformLocation | null;
		projectionMode: WebGLUniformLocation | null;
		flipY: WebGLUniformLocation | null;
		windowWidth: WebGLUniformLocation | null;
		windowLevel: WebGLUniformLocation | null;
		invert: WebGLUniformLocation | null;
		volume: WebGLUniformLocation | null;
		archSplineTexture: WebGLUniformLocation | null;
		trilinear: WebGLUniformLocation | null;
		archPolyCoeffs: WebGLUniformLocation | null;
		useAnalyticalPoly: WebGLUniformLocation | null;
		anteriorTroughRatio: WebGLUniformLocation | null;
	} | null = null;

	constructor(gl: WebGL2RenderingContext) {
		this.gl = gl;
		this.canvas = gl.canvas as HTMLCanvasElement;
		this.init();
	}

	private init(): boolean {
		const gl = this.gl;
		const prog = createProgram(gl, CBCT_PANORAMIC_VERTEX_SHADER, CBCT_PANORAMIC_FRAGMENT_SHADER);
		if (!prog) return false;
		this.program = prog;

		const vao = gl.createVertexArray();
		if (!vao) {
			gl.deleteProgram(prog);
			this.program = null;
			return false;
		}
		this.vao = vao;

		this.uniforms = {
			volumeDim: gl.getUniformLocation(prog, "u_volumeDim"),
			originMm: gl.getUniformLocation(prog, "u_originMm"),
			invSpacingMm: gl.getUniformLocation(prog, "u_invSpacingMm"),
			zTopMm: gl.getUniformLocation(prog, "u_zTopMm"),
			zBottomMm: gl.getUniformLocation(prog, "u_zBottomMm"),
			focalRadiusMm: gl.getUniformLocation(prog, "u_focalRadiusMm"),
			outWidth: gl.getUniformLocation(prog, "u_outWidth"),
			numSlabSamples: gl.getUniformLocation(prog, "u_numSlabSamples"),
			projectionMode: gl.getUniformLocation(prog, "u_projectionMode"),
			flipY: gl.getUniformLocation(prog, "u_flipY"),
			windowWidth: gl.getUniformLocation(prog, "u_windowWidth"),
			windowLevel: gl.getUniformLocation(prog, "u_windowLevel"),
			invert: gl.getUniformLocation(prog, "u_invert"),
			volume: gl.getUniformLocation(prog, "u_volume"),
			archSplineTexture: gl.getUniformLocation(prog, "u_archSplineTexture"),
			trilinear: gl.getUniformLocation(prog, "u_trilinear"),
			archPolyCoeffs: gl.getUniformLocation(prog, "u_archPolyCoeffs"),
			useAnalyticalPoly: gl.getUniformLocation(prog, "u_useAnalyticalPoly"),
			anteriorTroughRatio: gl.getUniformLocation(prog, "u_anteriorTroughRatio"),
		};
		return true;
	}

	reconstruct(
		volume: CbctVoxelVolume,
		archCurve: DentalArchCurve,
		options: PanoramicReconstructionOptions = {},
	): PanoramicReconstructionResult | null {
		if (!this.program || !this.vao || !this.uniforms) {
			if (!this.init()) return null;
		}
		const gl = this.gl;
		const {
			heightMm = 38.0,
			heightPx = 220,
			widthPx,
			windowWidth = 3500,
			windowLevel = 800,
			projectionMode = "mip",
			centerZMm: userCenterZMm,
			invert = false,
			coarsePreview = false,
		} = options;

		const effectiveThickness = options.focalTroughThicknessMm ?? archCurve?.focalTroughThicknessMm ?? 14.0;
		const outH = heightPx;
		const outW = widthPx ?? Math.max(500, Math.round(archCurve.totalArcLengthMm / (volume.spacingMm?.x || 0.35)));

		const centerZMm = resolveOcclusalCenterZ(volume, archCurve, userCenterZMm);
		const splinePoints = archCurve.splinePointsMm;
		const vectorField = calculateArchTangentsAndNormals(splinePoints);
		const nNodes = vectorField.length;
		const totalLengthMm = archCurve.totalArcLengthMm || 100;

		// Adaptive slab sampling
		const focalRadiusMm = effectiveThickness / 2.0;
		const sampleStepMm = options.sampleStepMm ?? (coarsePreview ? 0.8 : 0.4);
		const slabSamples = Math.max(2, Math.round(focalRadiusMm / sampleStepMm));
		const numSlab = 2 * slabSamples + 1;

		// Precompute spline 2D positions, normal vectors, and tangent vectors for 2-row texture (outW x 2)
		const denomW = Math.max(1, outW - 1);
		const requiredSplineLen = outW * 8;
		if (!this.splineBuffer || this.splineBuffer.length < requiredSplineLen) {
			this.splineBuffer = new Float32Array(requiredSplineLen);
		}
		const splineBuf = this.splineBuffer;

		let currNode = 0;
		for (let col = 0; col < outW; col++) {
			const targetDistMm = (col / denomW) * totalLengthMm;
			while (currNode < nNodes - 2 && vectorField[currNode + 1]!.distanceAlongArchMm < targetDistMm) {
				currNode++;
			}
			const n0 = vectorField[currNode]!;
			const n1 = vectorField[currNode + 1] || n0;
			const d0 = n0.distanceAlongArchMm;
			const d1 = n1.distanceAlongArchMm;
			const segLen = d1 - d0;
			const frac = segLen > 0.0001 ? Math.max(0, Math.min(1, (targetDistMm - d0) / segLen)) : 0;

			const ptX = n0.point.x + (n1.point.x - n0.point.x) * frac;
			const ptY = n0.point.y + (n1.point.y - n0.point.y) * frac;
			const rawNormX = n0.normal.x + (n1.normal.x - n0.normal.x) * frac;
			const rawNormY = n0.normal.y + (n1.normal.y - n0.normal.y) * frac;
			const normLen = Math.hypot(rawNormX, rawNormY) || 1.0;

			const rawTanX = n0.tangent.x + (n1.tangent.x - n0.tangent.x) * frac;
			const rawTanY = n0.tangent.y + (n1.tangent.y - n0.tangent.y) * frac;
			const tanLen = Math.hypot(rawTanX, rawTanY) || 1.0;

			const curv = (n0.curvature ?? 0.0) + ((n1.curvature ?? 0.0) - (n0.curvature ?? 0.0)) * frac;

			// Row 0: Point + Normal (RGBA32F)
			const idx0 = col * 4;
			splineBuf[idx0 + 0] = ptX;
			splineBuf[idx0 + 1] = ptY;
			splineBuf[idx0 + 2] = rawNormX / normLen;
			splineBuf[idx0 + 3] = rawNormY / normLen;

			// Row 1: Tangent + Curvature + ArcDistance (RGBA32F)
			const idx1 = (outW + col) * 4;
			splineBuf[idx1 + 0] = rawTanX / tanLen;
			splineBuf[idx1 + 1] = rawTanY / tanLen;
			splineBuf[idx1 + 2] = curv;
			splineBuf[idx1 + 3] = targetDistMm;
		}

		// Upload or reuse 3D volume texture with gl.MAX_3D_TEXTURE_SIZE protection
		const dim = volume.dimensions;
		if (!volume.data) return null;
		if (!this.volumeTexture || this.volumeDataRef !== volume.data) {
			if (this.volumeTexture) {
				gl.deleteTexture(this.volumeTexture);
			}
			const tex = gl.createTexture();
			if (!tex) return null;
			gl.bindTexture(gl.TEXTURE_3D, tex);
			gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

			const max3D = gl.getParameter(gl.MAX_3D_TEXTURE_SIZE) || 512;
			const maxDim = Math.max(dim.width, Math.max(dim.height, dim.depth));
			let uploadData: Int16Array = volume.data;
			let uploadW = dim.width;
			let uploadH = dim.height;
			let uploadD = dim.depth;
			let factor = 1;

			if (maxDim > max3D) {
				factor = Math.ceil(maxDim / max3D);
				const downsampled = downsampleVolumeData(volume.data, dim, factor);
				uploadData = downsampled.data;
				uploadW = downsampled.width;
				uploadH = downsampled.height;
				uploadD = downsampled.depth;
			}

			gl.texImage3D(
				gl.TEXTURE_3D,
				0,
				gl.R16I,
				uploadW,
				uploadH,
				uploadD,
				0,
				gl.RED_INTEGER,
				gl.SHORT,
				uploadData,
			);
			this.volumeTexture = tex;
			this.volumeDataRef = volume.data;
			this.uploadDim = { width: uploadW, height: uploadH, depth: uploadD, factor };
		}

		// Upload or update 2D spline texture (outW x 2)
		if (!this.splineTexture || this.splineWidth !== outW) {
			if (this.splineTexture) gl.deleteTexture(this.splineTexture);
			const sTex = gl.createTexture();
			if (!sTex) return null;
			gl.bindTexture(gl.TEXTURE_2D, sTex);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texImage2D(
				gl.TEXTURE_2D,
				0,
				gl.RGBA32F,
				outW,
				2,
				0,
				gl.RGBA,
				gl.FLOAT,
				splineBuf.subarray(0, requiredSplineLen),
			);
			this.splineTexture = sTex;
			this.splineWidth = outW;
		} else {
			gl.bindTexture(gl.TEXTURE_2D, this.splineTexture);
			gl.texSubImage2D(
				gl.TEXTURE_2D,
				0,
				0,
				0,
				outW,
				2,
				gl.RGBA,
				gl.FLOAT,
				splineBuf.subarray(0, requiredSplineLen),
			);
		}

		// Resize offscreen canvas
		if (this.canvas.width !== outW || this.canvas.height !== outH) {
			this.canvas.width = outW;
			this.canvas.height = outH;
		}

		gl.viewport(0, 0, outW, outH);
		gl.useProgram(this.program);
		gl.bindVertexArray(this.vao);

		// Bind textures
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_3D, this.volumeTexture);
		gl.uniform1i(this.uniforms!.volume, 0);

		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this.splineTexture);
		gl.uniform1i(this.uniforms!.archSplineTexture, 1);

		// Set uniforms
		const curUpload = this.uploadDim ?? {
			width: volume.dimensions.width,
			height: volume.dimensions.height,
			depth: volume.dimensions.depth,
			factor: 1,
		};
		gl.uniform3f(this.uniforms!.volumeDim, curUpload.width, curUpload.height, curUpload.depth);
		gl.uniform3f(
			this.uniforms!.originMm,
			volume.originMm?.x ?? 0.0,
			volume.originMm?.y ?? 0.0,
			volume.originMm?.z ?? 0.0,
		);
		const effSpX = Math.max(0.001, (volume.spacingMm?.x || 0.2) * curUpload.factor);
		const effSpY = Math.max(0.001, (volume.spacingMm?.y || 0.2) * curUpload.factor);
		const effSpZ = Math.max(0.001, (volume.spacingMm?.z || 0.2) * curUpload.factor);
		gl.uniform3f(
			this.uniforms!.invSpacingMm,
			1.0 / effSpX,
			1.0 / effSpY,
			1.0 / effSpZ,
		);

		const zTopMm = centerZMm + heightMm / 2.0;
		const zBottomMm = centerZMm - heightMm / 2.0;
		gl.uniform1f(this.uniforms!.zTopMm, zTopMm);
		gl.uniform1f(this.uniforms!.zBottomMm, zBottomMm);
		gl.uniform1f(this.uniforms!.focalRadiusMm, focalRadiusMm);
		gl.uniform1f(this.uniforms!.outWidth, outW);
		gl.uniform1i(this.uniforms!.numSlabSamples, numSlab);

		let modeInt = 0;
		if (projectionMode === "ray_sum" || projectionMode === "raysum") modeInt = 1;
		else if (projectionMode === "minip") modeInt = 2;
		else if (projectionMode === "average") modeInt = 3;
		gl.uniform1i(this.uniforms!.projectionMode, modeInt);

		gl.uniform1i(this.uniforms!.flipY, 0); // readPixels alignment: row 0 is zTopMm

		const effectiveWW = windowWidth ?? (volume.defaultWindowWidth && volume.defaultWindowWidth <= 3800 ? volume.defaultWindowWidth : 3500);
		const effectiveWL = windowLevel ?? (volume.defaultWindowLevel && volume.defaultWindowLevel <= 1000 && volume.defaultWindowLevel >= 500 ? volume.defaultWindowLevel : 800);
		gl.uniform1f(this.uniforms!.windowWidth, effectiveWW);
		gl.uniform1f(this.uniforms!.windowLevel, effectiveWL);
		gl.uniform1i(this.uniforms!.invert, invert ? 1 : 0);

		gl.uniform1i(
			this.uniforms!.trilinear,
			options.trilinear !== undefined ? (options.trilinear ? 1 : 0) : coarsePreview ? 0 : 1,
		);
		gl.uniform1i(this.uniforms!.useAnalyticalPoly, options.useAnalyticalPoly ? 1 : 0);
		const poly = options.archPolyCoeffs ?? [0.035, 0.0, -56.5, 0.0];
		gl.uniform4f(this.uniforms!.archPolyCoeffs, poly[0], poly[1], poly[2], poly[3]);
		const effAnteriorRatio = options.anteriorTroughRatio !== undefined
			? Math.max(0.1, Math.min(1.0, options.anteriorTroughRatio))
			: 0.65;
		gl.uniform1f(this.uniforms!.anteriorTroughRatio, effAnteriorRatio);

		// Draw quad
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		// Read back pixel data
		const u8 = new Uint8Array(outW * outH * 4);
		gl.readPixels(0, 0, outW, outH, gl.RGBA, gl.UNSIGNED_BYTE, u8);
		const pixelData = new Uint8ClampedArray(u8.buffer);

		// Calculate tooth markers on panorama
		const toothMarkersOnPano = calculateToothMarkersOnPano(archCurve, vectorField, totalLengthMm, outW);

		return {
			widthPx: outW,
			heightPx: outH,
			focalThicknessMm: effectiveThickness,
			centerZMm,
			pixelData,
			toothMarkersOnPano,
		};
	}

	dispose(): void {
		const gl = this.gl;
		if (this.volumeTexture) {
			gl.deleteTexture(this.volumeTexture);
			this.volumeTexture = null;
		}
		if (this.splineTexture) {
			gl.deleteTexture(this.splineTexture);
			this.splineTexture = null;
		}
		if (this.program) {
			gl.deleteProgram(this.program);
			this.program = null;
		}
		if (this.vao) {
			gl.deleteVertexArray(this.vao);
			this.vao = null;
		}
		this.volumeDataRef = null;
		this.splineBuffer = null;
	}
}

let globalWebGl2Engine: WebGl2PanoramicEngine | null = null;

export function getGlobalWebGl2PanoramicEngine(): WebGl2PanoramicEngine | null {
	if (globalWebGl2Engine) return globalWebGl2Engine;
	if (typeof document === "undefined") return null;

	try {
		const canvas = document.createElement("canvas");
		const gl = canvas.getContext("webgl2", {
			alpha: false,
			antialias: false,
			depth: false,
			stencil: false,
			preserveDrawingBuffer: false,
			powerPreference: "high-performance",
		});
		if (!gl) return null;
		globalWebGl2Engine = new WebGl2PanoramicEngine(gl);
		canvas.addEventListener("webglcontextlost", (e) => {
			e.preventDefault();
			if (globalWebGl2Engine) {
				globalWebGl2Engine.dispose();
				globalWebGl2Engine = null;
			}
		});
		canvas.addEventListener("webglcontextrestored", () => {
			if (globalWebGl2Engine) {
				globalWebGl2Engine.dispose();
				globalWebGl2Engine = null;
			}
		});
		return globalWebGl2Engine;
	} catch {
		return null;
	}
}

/**
 * Reconstructs a full panoramic radiograph (OPG) using hardware GPU WebGL2 acceleration.
 * Falls back to null if WebGL2 is not available.
 */
export function reconstructPanoramicViewWebGl2(
	volume: CbctVoxelVolume,
	archCurve: DentalArchCurve,
	options: PanoramicReconstructionOptions = {},
): PanoramicReconstructionResult | null {
	const engine = getGlobalWebGl2PanoramicEngine();
	if (!engine) return null;
	try {
		return engine.reconstruct(volume, archCurve, options);
	} catch {
		return null;
	}
}
