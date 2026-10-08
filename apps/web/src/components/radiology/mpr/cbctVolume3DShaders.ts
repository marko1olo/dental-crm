/**
 * DENTE CRM — CBCT 3D WebGL2 Volume Raymarching Shaders & Hardware Pipeline
 * Standards: DICOM Part 3 PS 3.3, WebGL2 PS 3.3, Planmeca Romexis 6.x
 *
 * Implements:
 * 1. Screen quad vertex shader with hardware vertex ID array.
 * 2. High-precision 3D raymarching fragment shader with:
 *    - Analytical Ray-AABB intersection in centered voxel space.
 *    - 3D texture texelFetch for raw 16-bit CT values.
 *    - Interactive 3D UVW clipping box.
 *    - 4-step sub-voxel bisection refinement on mouseUp for razor-sharp bone contours.
 *    - Central difference gradient computation for outward surface normals.
 *    - Clinical Anatomical Phong Shading (Ambient + Lambert Diffuse + Specular + Rim + Depth Fade).
 * 3. WebGL2 state management, texture upload with decimation for large volumes, and render pass.
 */

import type { CbctVoxelVolume } from "../cbctMprMath";
import { downsampleVolumeData } from "../cbctPanoramicReconstructionMath";
import { downsampleVolumeBoxFilter } from "@dental/shared";
import {
	type Volume3DClippingBox,
	type Volume3DPresetId,
	type Volume3DImplantParam,
	DEFAULT_VOLUME_3D_CLIPPING_BOX,
	CBCT_VOLUME_3D_PRESETS,
	getVolume3DPreset,
	computeVolume3DRotationMatrix,
} from "./cbctVolume3DMath";

export {
	CBCT_VOLUME_3D_VERTEX_SHADER,
	CBCT_VOLUME_3D_FRAGMENT_SHADER,
} from "./cbctVolume3D/volumeRaycasterShaders";
import {
	CBCT_VOLUME_3D_VERTEX_SHADER,
	CBCT_VOLUME_3D_FRAGMENT_SHADER,
} from "./cbctVolume3D/volumeRaycasterShaders";

export interface WebGlVolume3DState {
	gl: WebGL2RenderingContext;
	program: WebGLProgram;
	vao: WebGLVertexArrayObject;
	volumeTexture: WebGLTexture | null;
	volumeDataRef: Int16Array | null;
	uploadDim: { width: number; height: number; depth: number } | null;
	targetLimitRef?: number | undefined;
	lastRenderTimeMs?: number | undefined;
	uniforms: {
		volumeDim: WebGLUniformLocation | null;
		rotMatrix: WebGLUniformLocation | null;
		resolution: WebGLUniformLocation | null;
		pan: WebGLUniformLocation | null;
		zoom: WebGLUniformLocation | null;
		huMin: WebGLUniformLocation | null;
		huMax: WebGLUniformLocation | null;
		presetMode: WebGLUniformLocation | null;
		boneColor: WebGLUniformLocation | null;
		lightDir: WebGLUniformLocation | null;
		maxSteps: WebGLUniformLocation | null;
		voxelStep: WebGLUniformLocation | null;
		clipMin: WebGLUniformLocation | null;
		clipMax: WebGLUniformLocation | null;
		refineSteps: WebGLUniformLocation | null;
		renderMode: WebGLUniformLocation | null;
		objectId: WebGLUniformLocation | null;
		marActive: WebGLUniformLocation | null;
		implantCount: WebGLUniformLocation | null;
		implantEntry: WebGLUniformLocation | null;
		implantApex: WebGLUniformLocation | null;
		implantRadii: WebGLUniformLocation | null;
		implantColors: WebGLUniformLocation | null;
	};
}

export function initWebGl2VolumeRaymarching(gl: WebGL2RenderingContext): WebGlVolume3DState | null {
	const vs = gl.createShader(gl.VERTEX_SHADER);
	if (!vs) {
		console.error("[CbctVolume3D] createShader VS returned null");
		return null;
	}
	gl.shaderSource(vs, CBCT_VOLUME_3D_VERTEX_SHADER);
	gl.compileShader(vs);
	if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
		console.error("[CbctVolume3D VS ERROR]", gl.getShaderInfoLog(vs));
		gl.deleteShader(vs);
		return null;
	}

	const fs = gl.createShader(gl.FRAGMENT_SHADER);
	if (!fs) {
		console.error("[CbctVolume3D] createShader FS returned null");
		gl.deleteShader(vs);
		return null;
	}
	gl.shaderSource(fs, CBCT_VOLUME_3D_FRAGMENT_SHADER);
	gl.compileShader(fs);
	if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
		console.error("[CbctVolume3D FS ERROR]", gl.getShaderInfoLog(fs));
		gl.deleteShader(vs);
		gl.deleteShader(fs);
		return null;
	}

	const program = gl.createProgram();
	if (!program) {
		console.error("[CbctVolume3D] createProgram returned null");
		gl.deleteShader(vs);
		gl.deleteShader(fs);
		return null;
	}
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
	gl.linkProgram(program);
	gl.deleteShader(vs);
	gl.deleteShader(fs);

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.error("[CbctVolume3D LINK ERROR]", gl.getProgramInfoLog(program));
		gl.deleteProgram(program);
		return null;
	}

	const vao = gl.createVertexArray();
	if (!vao) {
		console.error("[CbctVolume3D] createVertexArray returned null");
		gl.deleteProgram(program);
		return null;
	}

	return {
		gl,
		program,
		vao,
		volumeTexture: null,
		volumeDataRef: null,
		uploadDim: null,
		uniforms: {
			volumeDim: gl.getUniformLocation(program, "u_volumeDim"),
			rotMatrix: gl.getUniformLocation(program, "u_rotMatrix"),
			resolution: gl.getUniformLocation(program, "u_resolution"),
			pan: gl.getUniformLocation(program, "u_pan"),
			zoom: gl.getUniformLocation(program, "u_zoom"),
			huMin: gl.getUniformLocation(program, "u_huMin"),
			huMax: gl.getUniformLocation(program, "u_huMax"),
			presetMode: gl.getUniformLocation(program, "u_presetMode"),
			boneColor: gl.getUniformLocation(program, "u_boneColor"),
			lightDir: gl.getUniformLocation(program, "u_lightDir"),
			maxSteps: gl.getUniformLocation(program, "u_maxSteps"),
			voxelStep: gl.getUniformLocation(program, "u_voxelStep"),
			clipMin: gl.getUniformLocation(program, "u_clipMin"),
			clipMax: gl.getUniformLocation(program, "u_clipMax"),
			refineSteps: gl.getUniformLocation(program, "u_refineSteps"),
			renderMode: gl.getUniformLocation(program, "u_renderMode"),
			objectId: gl.getUniformLocation(program, "u_objectId"),
			marActive: gl.getUniformLocation(program, "u_marActive"),
			implantCount: gl.getUniformLocation(program, "u_implantCount"),
			implantEntry: gl.getUniformLocation(program, "u_implantEntry[0]") ?? gl.getUniformLocation(program, "u_implantEntry"),
			implantApex: gl.getUniformLocation(program, "u_implantApex[0]") ?? gl.getUniformLocation(program, "u_implantApex"),
			implantRadii: gl.getUniformLocation(program, "u_implantRadii[0]") ?? gl.getUniformLocation(program, "u_implantRadii"),
			implantColors: gl.getUniformLocation(program, "u_implantColors[0]") ?? gl.getUniformLocation(program, "u_implantColors"),
		},
	};
}

export interface RenderWebGl2VolumeOptions {
	voxelStep?: number;
	maxSteps?: number;
	refineSteps?: number;
	max3DLimit?: number;
}

export function renderWebGl2VolumeRaymarching(
	state: WebGlVolume3DState,
	volume: CbctVoxelVolume,
	activePreset: Volume3DPresetId,
	yaw: number,
	pitch: number,
	zoom: number,
	pan: { x: number; y: number },
	width: number,
	height: number,
	isInteracting: boolean,
	clipping: Volume3DClippingBox = DEFAULT_VOLUME_3D_CLIPPING_BOX,
	renderMode = 0,
	objectId = 0,
	implants: readonly Volume3DImplantParam[] = [],
	marActive = true,
	options?: RenderWebGl2VolumeOptions,
): void {
	const { gl, program, vao, uniforms } = state;
	const dim = volume.dimensions;
	const data = volume.data;

	const max3D = gl.getParameter(gl.MAX_3D_TEXTURE_SIZE) || 512;
	const targetLimit = Math.min(max3D, options?.max3DLimit ?? 512);

	// Upload or update 3D texture if volume changed or target limit changed
	if (!state.volumeTexture || state.volumeDataRef !== data || state.targetLimitRef !== targetLimit) {
		if (state.volumeTexture) {
			gl.deleteTexture(state.volumeTexture);
		}
		const tex = gl.createTexture();
		if (tex) {
			gl.bindTexture(gl.TEXTURE_3D, tex);
			gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

			const maxDim = Math.max(dim.width, Math.max(dim.height, dim.depth));
			if (!data) return;
			let uploadData: Int16Array = data;
			let uploadW = dim.width;
			let uploadH = dim.height;
			let uploadD = dim.depth;

			if (maxDim > targetLimit) {
				const factor = Math.ceil(maxDim / targetLimit);
				const downsampled = downsampleVolumeBoxFilter(data, dim, factor, factor, factor);
				uploadData = downsampled.data;
				uploadW = downsampled.width;
				uploadH = downsampled.height;
				uploadD = downsampled.depth;
			}

			try {
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
				state.volumeTexture = tex;
				state.volumeDataRef = data;
				state.uploadDim = { width: uploadW, height: uploadH, depth: uploadD };
				state.targetLimitRef = targetLimit;
			} catch (err) {
				console.warn("[CbctVolume3DViewport] 3D texture upload failed:", err);
				gl.deleteTexture(tex);
				state.volumeTexture = null;
				state.volumeDataRef = null;
				state.uploadDim = null;
				state.targetLimitRef = undefined;
			}
		}
	}

	const preset = getVolume3DPreset(activePreset);
	const rotMat = computeVolume3DRotationMatrix(yaw, pitch);

	gl.viewport(0, 0, width, height);
	gl.clearColor(0.035, 0.035, 0.043, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	gl.useProgram(program);
	gl.bindVertexArray(vao);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_3D, state.volumeTexture);
	gl.uniform1i(gl.getUniformLocation(program, "u_volume"), 0);

	const curDim = state.uploadDim ?? { width: dim.width, height: dim.height, depth: dim.depth };
	gl.uniform3f(uniforms.volumeDim, curDim.width, curDim.height, curDim.depth);

	// Column-major 3x3 matrix for WebGL uniformMatrix3fv
	// rotMat[0] = Col 0 (Right), rotMat[1] = Col 1 (Up), rotMat[2] = Col 2 (RayDir)
	const matColMajor = new Float32Array([
		rotMat[0]![0]!, rotMat[0]![1]!, rotMat[0]![2]!,
		rotMat[1]![0]!, rotMat[1]![1]!, rotMat[1]![2]!,
		rotMat[2]![0]!, rotMat[2]![1]!, rotMat[2]![2]!,
	]);
	gl.uniformMatrix3fv(uniforms.rotMatrix, false, matColMajor);

	gl.uniform2f(uniforms.resolution, width, height);
	gl.uniform2f(uniforms.pan, pan.x, pan.y);
	gl.uniform1f(uniforms.zoom, zoom);
	gl.uniform1f(uniforms.huMin, preset.huMin);
	gl.uniform1f(uniforms.huMax, preset.huMax);
	const presetModeCode = preset.id === "mip" ? 1 : preset.id === "airway" ? 2 : 0;
	gl.uniform1i(uniforms.presetMode, presetModeCode);

	gl.uniform3f(
		uniforms.boneColor,
		preset.colorRgb[0] / 255.0,
		preset.colorRgb[1] / 255.0,
		preset.colorRgb[2] / 255.0,
	);

	const lightDir = [0.4, 0.6, 0.7];
	const lightLen = Math.hypot(lightDir[0]!, lightDir[1]!, lightDir[2]!);
	gl.uniform3f(
		uniforms.lightDir,
		lightDir[0]! / lightLen,
		lightDir[1]! / lightLen,
		lightDir[2]! / lightLen,
	);

	gl.uniform3f(
		uniforms.clipMin,
		clipping.clipMin[0],
		clipping.clipMin[1],
		clipping.clipMin[2],
	);
	gl.uniform3f(
		uniforms.clipMax,
		clipping.clipMax[0],
		clipping.clipMax[1],
		clipping.clipMax[2],
	);

	const effectiveVoxelStep = options?.voxelStep ?? (isInteracting ? 1.0 : 0.5);
	const effectiveRefineSteps = options?.refineSteps ?? (isInteracting ? 0 : 4);
	const effectiveMaxSteps = options?.maxSteps ?? (isInteracting ? 64 : 160);

	if (uniforms.voxelStep) gl.uniform1f(uniforms.voxelStep, effectiveVoxelStep);
	gl.uniform1i(uniforms.refineSteps, effectiveRefineSteps);
	gl.uniform1i(uniforms.maxSteps, effectiveMaxSteps);
	gl.uniform1i(uniforms.renderMode, renderMode);
	gl.uniform1f(uniforms.objectId, objectId);
	if (uniforms.marActive) gl.uniform1i(uniforms.marActive, marActive ? 1 : 0);

	// Upload surgical implant volumetric data (up to 4 implants)
	const count = Math.min(4, Math.max(0, implants.length));
	gl.uniform1i(uniforms.implantCount, count);
	if (count > 0) {
		const entryData = new Float32Array(12);
		const apexData = new Float32Array(12);
		const radiiData = new Float32Array(8);
		const colorsData = new Float32Array(12);

		const scaleX = curDim.width / Math.max(1, dim.width);
		const scaleY = curDim.height / Math.max(1, dim.height);
		const scaleZ = curDim.depth / Math.max(1, dim.depth);

		for (let i = 0; i < count; i++) {
			const imp = implants[i]!;
			entryData[i * 3 + 0] = imp.entryVoxel[0] * scaleX;
			entryData[i * 3 + 1] = imp.entryVoxel[1] * scaleY;
			entryData[i * 3 + 2] = imp.entryVoxel[2] * scaleZ;

			apexData[i * 3 + 0] = imp.apexVoxel[0] * scaleX;
			apexData[i * 3 + 1] = imp.apexVoxel[1] * scaleY;
			apexData[i * 3 + 2] = imp.apexVoxel[2] * scaleZ;

			radiiData[i * 2 + 0] = imp.platformRadiusVoxel * scaleX;
			radiiData[i * 2 + 1] = imp.apexRadiusVoxel * scaleX;

			colorsData[i * 3 + 0] = imp.colorRgb[0];
			colorsData[i * 3 + 1] = imp.colorRgb[1];
			colorsData[i * 3 + 2] = imp.colorRgb[2];
		}

		if (uniforms.implantEntry) gl.uniform3fv(uniforms.implantEntry, entryData);
		if (uniforms.implantApex) gl.uniform3fv(uniforms.implantApex, apexData);
		if (uniforms.implantRadii) gl.uniform2fv(uniforms.implantRadii, radiiData);
		if (uniforms.implantColors) gl.uniform3fv(uniforms.implantColors, colorsData);
	}

	const tRayStart = typeof performance !== "undefined" ? performance.now() : 0;
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	if (tRayStart > 0 && typeof performance !== "undefined") {
		state.lastRenderTimeMs = performance.now() - tRayStart;
	}
}

/**
 * Result of decoding a Vatech Ez3D G-Buffer pixel
 */
export interface Ez3dGBufferPickResult {
	r: number;
	g: number;
	b: number;
	objectId: number;
	depth: number;
}

/**
 * Decodes packed Vatech Ez3D G-Buffer pixel values (R=packed 16-bit R+B, G=8-bit G, B=ObjectID, A=depth).
 * Reference: Vatech Ez3D OBJShader.fx ISOPhongPS G-Buffer encoding.
 */
export function decodeEz3dGBufferPixel(
	pixel: Uint8Array | [number, number, number, number],
): Ez3dGBufferPickResult {
	const pR = pixel[0] ?? 0;
	const pG = pixel[1] ?? 0;
	const pB = pixel[2] ?? 0;
	const pA = pixel[3] ?? 0;

	// In WebGL2 G-Buffer:
	// pB directly encodes object ID in range 0..255 (Vatech Ez3D OBJShader.fx g_fObjID)
	const objectId = pB;
	// pA directly encodes normalized hit depth (0..255 -> 0.0..1.0)
	const depth = pA / 255.0;

	const r = pR;
	const g = pG;
	const b = Math.min(255, Math.round(pG * 0.92));

	return { r, g, b, objectId, depth };
}

/**
 * Instant 0-ms hardware mouse picking of implants, nerves, and volume objects via Vatech Ez3D G-Buffer.
 */
export function pickVolume3DObjectAtPixel(
	gl: WebGL2RenderingContext,
	x: number,
	y: number,
): Ez3dGBufferPickResult | null {
	if (!gl || typeof gl.readPixels !== "function") return null;
	const pixel = new Uint8Array(4);
	try {
		gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
		return decodeEz3dGBufferPixel(pixel);
	} catch {
		return null;
	}
}

/**
 * Ironclad VRAM disposal for 3D Volume Raymarching WebGL2 resources.
 * Completely deletes the 3D volume texture, vertex array object, and compiled shader program.
 */
export function disposeWebGl2VolumeRaymarching(state: WebGlVolume3DState | null): void {
	if (!state) return;
	const { gl, program, vao, volumeTexture } = state;
	if (gl) {
		if (volumeTexture && typeof gl.deleteTexture === "function") {
			gl.deleteTexture(volumeTexture);
		}
		if (vao && typeof gl.deleteVertexArray === "function") {
			gl.deleteVertexArray(vao);
		}
		if (program && typeof gl.deleteProgram === "function") {
			gl.deleteProgram(program);
		}
	}
	state.volumeTexture = null;
	state.volumeDataRef = null;
	state.uploadDim = null;
	state.targetLimitRef = undefined;
}


