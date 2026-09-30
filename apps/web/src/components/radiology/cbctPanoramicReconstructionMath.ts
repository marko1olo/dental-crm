/**
 * DENTE CRM — CBCT Panoramic (OPG) Reconstruction & 3D Nerve Projection Engine
 * Decomposed from dentalCurveEngine.ts per Mandate 8b.
 * Standards: DICOM Part 3, Misch CE, Buser
 */

import {
	type CbctVoxelVolume,
	get16BitLut,
	sampleVoxelTrilinearHU,
	worldMmToVoxelContinuous,
} from "./cbctMprMath";
import {
	type Point2D,
	type Point3D,
	calculateSplineLength3DMm,
	MANDIBULAR_NERVE_SAFETY_MARGIN_MM,
} from "./cbctCaliperNerveMath";
import {
	type DentalArchCurve,
	calculateArchTangentsAndNormals,
} from "./cbctArchSplineMath";
import { findOcclusalZPlane } from "./cbctAutoArchEngine";

export interface PanoramicReconstructionResult {
	readonly widthPx: number;
	readonly heightPx: number;
	readonly focalThicknessMm: number;
	readonly centerZMm?: number;
	readonly pixelData: Uint8ClampedArray; // RGBA grayscale image
	readonly toothMarkersOnPano: ReadonlyArray<{
		readonly toothFdi: string;
		readonly xPx: number;
		readonly labelRu: string;
	}>;
}

export interface PanoramicReconstructionOptions {
	readonly heightMm?: number;
	readonly heightPx?: number;
	readonly widthPx?: number;
	readonly centerZMm?: number;
	readonly windowWidth?: number;
	readonly windowLevel?: number;
	readonly projectionMode?: "mip" | "average" | "ray_sum" | "raysum" | "minip" | string;
	readonly focalTroughThicknessMm?: number;
	readonly sampleStepMm?: number;
	readonly invert?: boolean;
	readonly coarsePreview?: boolean;
}

/**
 * Resolves the optimal Z height (mm) for the panoramic reconstruction.
 * Prioritizes:
 * 1. Explicit user-provided centerZMm in options
 * 2. Explicit planeZMm or centerZMm in DentalArchCurve
 * 3. Average Z coordinate from 3D anchor points (archCurve.anchors)
 * 4. Analytical detection via findOcclusalZPlane from the CBCT voxel volume density profile
 * 5. Fallback to 0.0 mm
 */
export function resolveOcclusalCenterZ(
	volume: CbctVoxelVolume,
	archCurve: DentalArchCurve,
	userCenterZMm?: number,
): number {
	if (typeof userCenterZMm === "number" && Number.isFinite(userCenterZMm)) {
		return userCenterZMm;
	}
	if (typeof (archCurve as any).planeZMm === "number" && Number.isFinite((archCurve as any).planeZMm)) {
		return (archCurve as any).planeZMm;
	}
	if (typeof (archCurve as any).centerZMm === "number" && Number.isFinite((archCurve as any).centerZMm)) {
		return (archCurve as any).centerZMm;
	}
	if (archCurve.anchors && archCurve.anchors.length > 0) {
		const zList = archCurve.anchors
			.map((a: any) => a.zMm ?? (typeof a.positionMm?.z === "number" ? a.positionMm.z : undefined))
			.filter((z): z is number => typeof z === "number" && Number.isFinite(z));
		if (zList.length > 0) {
			return Number((zList.reduce((sum, val) => sum + val, 0) / zList.length).toFixed(2));
		}
	}
	try {
		return findOcclusalZPlane(volume, archCurve.jawType);
	} catch {
		return 0.0;
	}
}

/**
 * Downsamples 3D voxel volume data by integer factor (e.g. 2x, 4x)
 * to fit strictly within gl.MAX_3D_TEXTURE_SIZE on low-end integrated GPUs (Intel UHD / Iris Xe / Vega).
 */
export function downsampleVolumeData(
	data: Int16Array,
	dim: { width: number; height: number; depth: number },
	factor: number,
): { data: Int16Array; width: number; height: number; depth: number; factor: number } {
	if (factor <= 1) {
		return { data, width: dim.width, height: dim.height, depth: dim.depth, factor: 1 };
	}
	const w2 = Math.max(1, Math.floor(dim.width / factor));
	const h2 = Math.max(1, Math.floor(dim.height / factor));
	const d2 = Math.max(1, Math.floor(dim.depth / factor));
	const out = new Int16Array(w2 * h2 * d2);
	const srcSlice = dim.width * dim.height;
	const dstSlice = w2 * h2;

	for (let z = 0; z < d2; z++) {
		const srcZ = z * factor * srcSlice;
		const dstZ = z * dstSlice;
		for (let y = 0; y < h2; y++) {
			const srcY = srcZ + y * factor * dim.width;
			const dstY = dstZ + y * w2;
			for (let x = 0; x < w2; x++) {
				out[dstY + x] = data[srcY + x * factor] ?? -1000;
			}
		}
	}
	return { data: out, width: w2, height: h2, depth: d2, factor };
}

/**
 * Calculates symmetrical tooth marker positions on the panoramic image.
 */
export function calculateToothMarkersOnPano(
	archCurve: DentalArchCurve,
	vectorField: ReadonlyArray<{ point: Point2D; normal: Point2D; tangent: Point2D; distanceAlongArchMm: number }>,
	totalLengthMm: number,
	outW: number,
): Array<{ toothFdi: string; xPx: number; labelRu: string }> {
	const nNodes = vectorField.length;
	return archCurve.anchors.map((anchor) => {
		let minDistance = Infinity;
		let bestArcDistMm = 0;

		for (let i = 0; i < nNodes - 1; i++) {
			const n0 = vectorField[i]!;
			const n1 = vectorField[i + 1]!;
			const segDx = n1.point.x - n0.point.x;
			const segDy = n1.point.y - n0.point.y;
			const segL2 = segDx * segDx + segDy * segDy;
			let t = 0;
			if (segL2 > 1e-6) {
				const pDx = anchor.positionMm.x - n0.point.x;
				const pDy = anchor.positionMm.y - n0.point.y;
				t = Math.max(0, Math.min(1, (pDx * segDx + pDy * segDy) / segL2));
			}
			const projX = n0.point.x + t * segDx;
			const projY = n0.point.y + t * segDy;
			const dist = Math.hypot(anchor.positionMm.x - projX, anchor.positionMm.y - projY);
			if (dist < minDistance) {
				minDistance = dist;
				const segLen = n1.distanceAlongArchMm - n0.distanceAlongArchMm;
				bestArcDistMm = n0.distanceAlongArchMm + t * segLen;
			}
		}

		const ratio = totalLengthMm > 0 ? Math.max(0, Math.min(1, bestArcDistMm / totalLengthMm)) : 0;
		const minMarginPx = 20;
		const availableWidth = Math.max(0, outW - 2 * minMarginPx);
		const mappedCol = Math.round(minMarginPx + ratio * availableWidth);
		const clampedCol = Math.max(minMarginPx, Math.min(outW - minMarginPx, mappedCol));

		return {
			toothFdi: anchor.toothFdi,
			xPx: clampedCol,
			labelRu: anchor.labelRu,
		};
	});
}

export const CBCT_PANORAMIC_VERTEX_SHADER = `#version 300 es
precision highp float;

const vec2 QUAD_POSITIONS[4] = vec2[](
    vec2(-1.0, -1.0),
    vec2( 1.0, -1.0),
    vec2(-1.0,  1.0),
    vec2( 1.0,  1.0)
);

out vec2 v_uv;

void main() {
    vec2 pos = QUAD_POSITIONS[gl_VertexID];
    gl_Position = vec4(pos, 0.0, 1.0);
    v_uv = vec2((pos.x + 1.0) * 0.5, (pos.y + 1.0) * 0.5);
}
`;

export const CBCT_PANORAMIC_FRAGMENT_SHADER = `#version 300 es
precision highp float;
precision highp isampler3D;

in vec2 v_uv;
out vec4 fragColor;

uniform isampler3D u_volume;
uniform sampler2D u_archSplineTexture; // RGBA32F: R=ptX, G=ptY, B=normX, A=normY in mm

uniform vec3 u_volumeDim;      // width, height, depth in voxels
uniform vec3 u_originMm;       // volume origin in mm
uniform vec3 u_invSpacingMm;   // 1.0 / spacing in mm

uniform float u_zTopMm;
uniform float u_zBottomMm;
uniform float u_focalRadiusMm; // e.g. 7.0 mm (thickness / 2)
uniform float u_outWidth;      // widthPx
uniform int u_numSlabSamples;  // (2 * slabSamples + 1)
uniform int u_projectionMode;  // 0 = mip, 1 = ray_sum, 2 = minip, 3 = average
uniform int u_flipY;           // 0 = readPixels order (v_uv.y=0 is zTopMm), 1 = screen order

uniform float u_windowWidth;
uniform float u_windowLevel;
uniform int u_invert;

void main() {
    // 1. Fetch dental arch curve point and normal at current horizontal column
    int maxCol = max(0, int(u_outWidth) - 1);
    ivec2 splineCoord = ivec2(clamp(int(gl_FragCoord.x), 0, maxCol), 0);
    vec4 splineData = texelFetch(u_archSplineTexture, splineCoord, 0);
    vec2 ptMm = splineData.rg;
    vec2 norm = splineData.ba;
    
    // 2. Compute Z height in mm for this vertical row
    float vY = (u_flipY == 1) ? (1.0 - v_uv.y) : v_uv.y;
    float zMm = mix(u_zTopMm, u_zBottomMm, vY);
    float vz = (zMm - u_originMm.z) * u_invSpacingMm.z;
    int ivz = int(round(vz));
    
    // If vertical slice is outside volume depth, render dark background
    if (ivz < 0 || ivz >= int(u_volumeDim.z)) {
        fragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }
    
    float minVal = 32767.0;
    float maxVal = -32768.0;
    float sumVal = 0.0;
    int validCount = 0;
    
    int safeSlabSamples = clamp(u_numSlabSamples, 1, 128);
    // 3. Step along focal trough normal (MIP slab raymarching)
    for (int i = 0; i < safeSlabSamples; i++) {
        float factor = (safeSlabSamples <= 1) ? 0.0 : (float(i) / float(safeSlabSamples - 1) * 2.0 - 1.0);
        float t = factor * u_focalRadiusMm;
        vec2 sampleMm = ptMm + norm * t;
        
        float vx = (sampleMm.x - u_originMm.x) * u_invSpacingMm.x;
        float vy = (sampleMm.y - u_originMm.y) * u_invSpacingMm.y;
        
        ivec3 vox = ivec3(int(round(vx)), int(round(vy)), ivz);
        if (vox.x >= 0 && vox.x < int(u_volumeDim.x) &&
            vox.y >= 0 && vox.y < int(u_volumeDim.y)) {
            
            float hu = float(texelFetch(u_volume, vox, 0).r);
            if (hu > maxVal) maxVal = hu;
            if (hu < minVal) minVal = hu;
            sumVal += hu;
            validCount++;
        }
    }
    
    if (validCount == 0) {
        fragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }
    
    float finalHU = maxVal;
    if (u_projectionMode == 1) { // ray_sum (clinical weighted blend)
        float avgHU = sumVal / float(validCount);
        finalHU = 0.7 * maxVal + 0.3 * max(0.0, avgHU);
    } else if (u_projectionMode == 2) { // minip
        finalHU = minVal;
    } else if (u_projectionMode == 3) { // average
        finalHU = sumVal / float(validCount);
    } else { // 0 = mip
        finalHU = maxVal;
    }
    
    // 4. Contrast Window/Level transfer function
    float safeWW = max(1.0, u_windowWidth);
    float low = u_windowLevel - safeWW * 0.5;
    float normVal = clamp((finalHU - low) / safeWW, 0.0, 1.0);
    if (u_invert == 1) {
        normVal = 1.0 - normVal;
    }
    
    fragColor = vec4(normVal, normVal, normVal, 1.0);
}
`;

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

		// Precompute spline 2D positions and normal vectors for texture
		const denomW = Math.max(1, outW - 1);
		if (!this.splineBuffer || this.splineBuffer.length < outW * 4) {
			this.splineBuffer = new Float32Array(outW * 4);
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

			const idx = col * 4;
			splineBuf[idx + 0] = ptX;
			splineBuf[idx + 1] = ptY;
			splineBuf[idx + 2] = rawNormX / normLen;
			splineBuf[idx + 3] = rawNormY / normLen;
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

		// Upload or update 2D spline texture (outW x 1)
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
				1,
				0,
				gl.RGBA,
				gl.FLOAT,
				splineBuf.subarray(0, outW * 4),
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
				1,
				gl.RGBA,
				gl.FLOAT,
				splineBuf.subarray(0, outW * 4),
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
		const effSpX = (volume.spacingMm?.x || 0.2) * curUpload.factor;
		const effSpY = (volume.spacingMm?.y || 0.2) * curUpload.factor;
		const effSpZ = (volume.spacingMm?.z || 0.2) * curUpload.factor;
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

/**
 * Reconstructs a full panoramic radiograph (OPG) by sweeping along the dental spline.
 * Default projectionMode is clinical "mip" for crisp, high-contrast bone and enamel visualization.
 * GPU-accelerated on WebGL2 (< 1ms per frame) with instant fallback to high-speed CPU path.
 */
export function reconstructPanoramicView(
	volume: CbctVoxelVolume,
	archCurve: DentalArchCurve,
	options: PanoramicReconstructionOptions = {},
): PanoramicReconstructionResult {
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

	if (!volume || !volume.data || volume.isDisposed || !archCurve || !archCurve.splinePointsMm || archCurve.splinePointsMm.length === 0) {
		const safeW = widthPx ?? 500;
		return {
			widthPx: safeW,
			heightPx: outH,
			focalThicknessMm: effectiveThickness,
			centerZMm: userCenterZMm ?? 0.0,
			pixelData: new Uint8ClampedArray(safeW * outH * 4),
			toothMarkersOnPano: [],
		};
	}

	// Try GPU WebGL2 hardware acceleration first if in browser environment
	if (typeof document !== "undefined") {
		try {
			const engine = getGlobalWebGl2PanoramicEngine();
			if (engine) {
				const gpuResult = engine.reconstruct(volume, archCurve, options);
				if (gpuResult) return gpuResult;
			}
		} catch {
			// Fallback transparently to high-speed CPU path
		}
	}

	const centerZMm = resolveOcclusalCenterZ(volume, archCurve, userCenterZMm);

	const splinePoints = archCurve.splinePointsMm;
	const vectorField = calculateArchTangentsAndNormals(splinePoints);
	const outW = widthPx ?? Math.max(500, Math.round(archCurve.totalArcLengthMm / (volume.spacingMm?.x || 0.35)));
	const pixelBuffer = new Uint8ClampedArray(outW * outH * 4);

	// Adaptive focal trough slab sampling (default 12-16 mm, dense sampling step 0.35 - 0.4 mm, or 0.8 mm for coarse preview)
	const focalRadiusMm = effectiveThickness / 2.0;
	const sampleStepMm = options.sampleStepMm ?? (coarsePreview ? 0.8 : 0.4);
	const slabSamples = Math.max(2, Math.round(focalRadiusMm / sampleStepMm));
	const numSlab = 2 * slabSamples + 1;

	// Precompute slab offsets along focal trough normal
	const slabOffsets = new Float64Array(numSlab);
	for (let s = -slabSamples; s <= slabSamples; s++) {
		slabOffsets[s + slabSamples] = (s / slabSamples) * focalRadiusMm;
	}

	const zTopMm = centerZMm + heightMm / 2.0;
	const zBottomMm = centerZMm - heightMm / 2.0;
	const zStepMm = (zTopMm - zBottomMm) / outH;
	const nNodes = vectorField.length;
	const totalLengthMm = archCurve.totalArcLengthMm || 100;

	// Volume voxel spacing and origins for direct zero-allocation transformation
	const originX = volume.originMm?.x ?? 0;
	const originY = volume.originMm?.y ?? 0;
	const originZ = volume.originMm?.z ?? 0;
	const spX = volume.spacingMm?.x || 0.2;
	const spY = volume.spacingMm?.y || 0.2;
	const spZ = volume.spacingMm?.z || 0.2;
	const invSpX = 1.0 / spX;
	const invSpY = 1.0 / spY;
	const invSpZ = 1.0 / spZ;

	// Precompute Z voxel positions for all rows
	const rowVoxZ = new Float64Array(outH);
	for (let row = 0; row < outH; row++) {
		const zMm = zTopMm - row * zStepMm;
		rowVoxZ[row] = (zMm - originZ) * invSpZ;
	}

	// Precompute 2D positions and normalized normals along the dental spline for all columns
	const denomW = Math.max(1, outW - 1);
	const colPtX = new Float64Array(outW);
	const colPtY = new Float64Array(outW);
	const colNormX = new Float64Array(outW);
	const colNormY = new Float64Array(outW);

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

		colPtX[col] = ptX;
		colPtY[col] = ptY;
		colNormX[col] = rawNormX / normLen;
		colNormY[col] = rawNormY / normLen;
	}

	// Enhanced clinical OPG contrast LUT: maps bone/enamel range cleanly
	const effectiveWW = windowWidth ?? (volume.defaultWindowWidth && volume.defaultWindowWidth <= 3800 ? volume.defaultWindowWidth : 3500);
	const effectiveWL = windowLevel ?? (volume.defaultWindowLevel && volume.defaultWindowLevel <= 1000 && volume.defaultWindowLevel >= 500 ? volume.defaultWindowLevel : 800);
	const lut = get16BitLut(effectiveWW, effectiveWL, invert);

	// Zero-allocation sample voxel buffers per column
	const sampleVx = new Float64Array(numSlab);
	const sampleVy = new Float64Array(numSlab);

	const colStep = coarsePreview ? 2 : 1;

	// Sweep along the spline with constant physical arc-length distance
	for (let col = 0; col < outW; col += colStep) {
		const ptX = colPtX[col]!;
		const ptY = colPtY[col]!;
		const normX = colNormX[col]!;
		const normY = colNormY[col]!;

		// Precompute voxel X, Y for all slab samples in this column (invariant across rows)
		for (let s = 0; s < numSlab; s++) {
			const off = slabOffsets[s]!;
			sampleVx[s] = (ptX + normX * off - originX) * invSpX;
			sampleVy[s] = (ptY + normY * off - originY) * invSpY;
		}

		for (let row = 0; row < outH; row++) {
			const vz = rowVoxZ[row]!;

			let maxHU = -32768;
			let minHU = 32767;
			let sumHU = 0;

			// Direct trilinear sampling without object allocations
			for (let s = 0; s < numSlab; s++) {
				const vx = sampleVx[s]!;
				const vy = sampleVy[s]!;
				const hu = sampleVoxelTrilinearHU(vx, vy, vz, volume);
				if (hu > maxHU) maxHU = hu;
				if (hu < minHU) minHU = hu;
				sumHU += hu;
			}

			let finalHU = maxHU;
			if (projectionMode === "minip") {
				finalHU = minHU;
			} else if (projectionMode === "average") {
				finalHU = Math.round(sumHU / numSlab);
			} else if (projectionMode === "ray_sum" || projectionMode === "raysum") {
				// Clinical weighted ray-sum: blends 70% MIP sharpness with 30% soft tissue average
				const avgHU = sumHU / numSlab;
				finalHU = Math.round(0.7 * maxHU + 0.3 * Math.max(0, avgHU));
			} else {
				// Default: clinical MIP (Maximum Intensity Projection)
				finalHU = maxHU;
			}

			const gray = lut[(finalHU + 32768) & 0xffff]!;
			const idx = (row * outW + col) * 4;
			pixelBuffer[idx] = gray;
			pixelBuffer[idx + 1] = gray;
			pixelBuffer[idx + 2] = gray;
			pixelBuffer[idx + 3] = 255;

			if (coarsePreview && col + 1 < outW) {
				const nextIdx = (row * outW + col + 1) * 4;
				pixelBuffer[nextIdx] = gray;
				pixelBuffer[nextIdx + 1] = gray;
				pixelBuffer[nextIdx + 2] = gray;
				pixelBuffer[nextIdx + 3] = 255;
			}
		}
	}

	// Calculate tooth marker positions on the panoramic image based on exact arc distance & symmetric margins >= 20px
	const toothMarkers = calculateToothMarkersOnPano(archCurve, vectorField, totalLengthMm, outW);

	return {
		widthPx: outW,
		heightPx: outH,
		focalThicknessMm: effectiveThickness,
		centerZMm,
		pixelData: pixelBuffer,
		toothMarkersOnPano: toothMarkers,
	};
}

export const reconstructPanoramicOpg = reconstructPanoramicView;

export interface Projected3DNervePoint {
	readonly x: number; // Horizontal column (px) on panorama
	readonly y: number; // Vertical row (px) on panorama
	readonly zMm: number; // Original Z coordinate in physical mm
	readonly distanceAlongArchMm: number; // Arc length (mm) along dental spline
	readonly lateralDistanceMm: number; // Perpendicular distance (mm) to dental arch spline
	readonly isInsideFocalTrough: boolean; // True if within focal trough thickness
}

export interface Projected3DNerveResult {
	readonly projectedPoints: readonly Projected3DNervePoint[];
	readonly safetyCorridorUpper: readonly Point2D[];
	readonly safetyCorridorLower: readonly Point2D[];
	readonly safetyCorridorPolygon: readonly Point2D[];
	readonly safetyMarginMm: number; // 2.0 mm
	readonly canalDiameterMm: number; // 2.8 mm
	readonly safetyBufferPx: number; // Vertical safety corridor buffer in pixels
	readonly isVisibleOnPanorama: boolean;
	readonly totalLengthMm: number; // 3D length of the nerve in mm
}

export interface Project3DNerveOptions {
	readonly heightMm?: number; // Panoramic vertical field of view in mm (default 38.0 mm)
	readonly centerZMm?: number; // Center of panoramic vertical field of view in mm (default 0 or archCurve.planeZMm)
	readonly safetyMarginMm?: number; // Safety buffer in mm (default 2.0 mm)
	readonly canalDiameterMm?: number; // Canal diameter in mm (default 2.8 mm)
}

/**
 * Projects a 3D mandibular nerve (IAN) spline onto panoramic unfolded radiograph coordinates
 * with an exact 2.0 mm safety buffer corridor envelope.
 */
export function project3DNerveToPanorama(
	interpolatedNerve3D: readonly Point3D[],
	archCurve: DentalArchCurve,
	panoWidthPx = 500,
	panoHeightPx = 220,
	options: Project3DNerveOptions = {},
): Projected3DNerveResult {
	const heightMm = options.heightMm ?? 38.0;
	const centerZMm = options.centerZMm ?? (archCurve.planeZMm ?? 0.0);
	const safetyMarginMm = options.safetyMarginMm ?? MANDIBULAR_NERVE_SAFETY_MARGIN_MM;
	const canalDiameterMm = options.canalDiameterMm ?? 2.8;

	if (interpolatedNerve3D.length === 0 || archCurve.splinePointsMm.length === 0 || panoWidthPx <= 0 || panoHeightPx <= 0) {
		return {
			projectedPoints: [],
			safetyCorridorUpper: [],
			safetyCorridorLower: [],
			safetyCorridorPolygon: [],
			safetyMarginMm,
			canalDiameterMm,
			safetyBufferPx: 0,
			isVisibleOnPanorama: false,
			totalLengthMm: 0,
		};
	}

	const vectorField = calculateArchTangentsAndNormals(archCurve.splinePointsMm);
	const totalLengthMm = archCurve.totalArcLengthMm || 100.0;
	const denomW = Math.max(1, panoWidthPx - 1);
	const zTopMm = centerZMm + heightMm / 2.0;
	const pxPerMmY = panoHeightPx / heightMm;
	const pxPerMmX = denomW / totalLengthMm;
	const safetyBufferPx = Number((safetyMarginMm * pxPerMmY).toFixed(2));
	const halfFocalTroughMm = (archCurve.focalTroughThicknessMm ?? 12.0) / 2.0;

	const projectedPoints: Projected3DNervePoint[] = [];

	for (const pt of interpolatedNerve3D) {
		let minDistance = Infinity;
		let bestArcDistMm = 0;

		for (let i = 0; i < vectorField.length - 1; i++) {
			const n0 = vectorField[i]!;
			const n1 = vectorField[i + 1]!;

			const segDx = n1.point.x - n0.point.x;
			const segDy = n1.point.y - n0.point.y;
			const segL2 = segDx * segDx + segDy * segDy;

			let t = 0;
			if (segL2 > 1e-6) {
				const pDx = pt.x - n0.point.x;
				const pDy = pt.y - n0.point.y;
				t = Math.max(0, Math.min(1, (pDx * segDx + pDy * segDy) / segL2));
			}

			const projX = n0.point.x + t * segDx;
			const projY = n0.point.y + t * segDy;
			const dist = Math.hypot(pt.x - projX, pt.y - projY);

			if (dist < minDistance) {
				minDistance = dist;
				const segLen = n1.distanceAlongArchMm - n0.distanceAlongArchMm;
				bestArcDistMm = n0.distanceAlongArchMm + t * segLen;
			}
		}

		const ratio = Math.max(0, Math.min(1, bestArcDistMm / totalLengthMm));
		const panoX = Number((ratio * denomW).toFixed(2));
		const panoY = Number((((zTopMm - pt.z) / heightMm) * panoHeightPx).toFixed(2));

		projectedPoints.push({
			x: panoX,
			y: panoY,
			zMm: pt.z,
			distanceAlongArchMm: Number(bestArcDistMm.toFixed(2)),
			lateralDistanceMm: Number(minDistance.toFixed(2)),
			isInsideFocalTrough: minDistance <= halfFocalTroughMm,
		});
	}

	const safetyCorridorUpper: Point2D[] = [];
	const safetyCorridorLower: Point2D[] = [];
	const nPts = projectedPoints.length;

	for (let i = 0; i < nPts; i++) {
		const cur = projectedPoints[i]!;
		let tx = 0;
		let ty = 0;

		if (nPts === 1) {
			tx = 1;
			ty = 0;
		} else if (i === 0) {
			const next = projectedPoints[1]!;
			tx = next.x - cur.x;
			ty = next.y - cur.y;
		} else if (i === nPts - 1) {
			const prev = projectedPoints[i - 1]!;
			tx = cur.x - prev.x;
			ty = cur.y - prev.y;
		} else {
			const prev = projectedPoints[i - 1]!;
			const next = projectedPoints[i + 1]!;
			tx = next.x - prev.x;
			ty = next.y - prev.y;
		}

		const len = Math.hypot(tx, ty) || 1.0;
		const nx = -ty / len;
		const ny = tx / len;

		const offX = nx * (safetyMarginMm * pxPerMmX);
		const offY = ny * (safetyMarginMm * pxPerMmY);

		safetyCorridorUpper.push({
			x: Number((cur.x + offX).toFixed(2)),
			y: Number((cur.y + offY).toFixed(2)),
		});
		safetyCorridorLower.push({
			x: Number((cur.x - offX).toFixed(2)),
			y: Number((cur.y - offY).toFixed(2)),
		});
	}

	const safetyCorridorPolygon: Point2D[] = [
		...safetyCorridorUpper,
		...safetyCorridorLower.slice().reverse(),
	];

	const total3DLength = calculateSplineLength3DMm(interpolatedNerve3D as Point3D[]);

	return {
		projectedPoints,
		safetyCorridorUpper,
		safetyCorridorLower,
		safetyCorridorPolygon,
		safetyMarginMm,
		canalDiameterMm,
		safetyBufferPx,
		isVisibleOnPanorama: projectedPoints.some((p) => p.isInsideFocalTrough),
		totalLengthMm: total3DLength,
	};
}
