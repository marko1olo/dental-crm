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
import {
	type Volume3DClippingBox,
	type Volume3DPresetId,
	DEFAULT_VOLUME_3D_CLIPPING_BOX,
	CBCT_VOLUME_3D_PRESETS,
	getVolume3DPreset,
	computeVolume3DRotationMatrix,
} from "./cbctVolume3DMath";

export const CBCT_VOLUME_3D_VERTEX_SHADER = `#version 300 es
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
    v_uv = vec2((pos.x + 1.0) * 0.5, (1.0 - pos.y) * 0.5);
}
`;

export const CBCT_VOLUME_3D_FRAGMENT_SHADER = `#version 300 es
precision highp float;
precision highp isampler3D;

in vec2 v_uv;
out vec4 fragColor;

uniform isampler3D u_volume;
uniform vec3 u_volumeDim;      // (width, height, depth) in voxels
uniform mat3 u_rotMatrix;      // 3x3 camera rotation matrix
uniform vec2 u_resolution;     // (canvas.width, canvas.height)
uniform vec2 u_pan;            // pan.x, pan.y in pixels
uniform float u_zoom;          // zoom factor
uniform float u_huMin;         // preset huMin
uniform float u_huMax;         // preset huMax
uniform int u_presetMode;      // 0 = surface (skull, dense_bone, soft_tissue), 1 = mip
uniform vec3 u_boneColor;      // base bone color (e.g. 240, 225, 200 / 255.0)
uniform vec3 u_lightDir;       // normalized light direction
uniform int u_maxSteps;        // 60-140 steps
uniform vec3 u_clipMin;        // normalized [0, 1] clipping box minimum
uniform vec3 u_clipMax;        // normalized [0, 1] clipping box maximum
uniform int u_refineSteps;     // 0 during interaction, 4 on mouseUp

// Analytical Ray-AABB intersection in centered voxel space
// Box bounds: [-halfDim, halfDim]
vec2 intersectAABB(vec3 rayOrigin, vec3 rayDir, vec3 boxMin, vec3 boxMax) {
    vec3 safeDir = vec3(
        abs(rayDir.x) < 1e-6 ? (rayDir.x < 0.0 ? -1e-6 : 1e-6) : rayDir.x,
        abs(rayDir.y) < 1e-6 ? (rayDir.y < 0.0 ? -1e-6 : 1e-6) : rayDir.y,
        abs(rayDir.z) < 1e-6 ? (rayDir.z < 0.0 ? -1e-6 : 1e-6) : rayDir.z
    );
    vec3 invD = 1.0 / safeDir;
    vec3 t0 = (boxMin - rayOrigin) * invD;
    vec3 t1 = (boxMax - rayOrigin) * invD;
    vec3 tNearVec = min(t0, t1);
    vec3 tFarVec = max(t0, t1);
    float tNear = max(max(tNearVec.x, tNearVec.y), tNearVec.z);
    float tFar = min(min(tFarVec.x, tFarVec.y), tFarVec.z);
    return vec2(tNear, tFar);
}

// 8-point 3D Trilinear Sub-Voxel Continuous Density Sampling
float sampleHUTrilinear(vec3 pos) {
    if (pos.x < 0.0 || pos.x > u_volumeDim.x - 1.0 ||
        pos.y < 0.0 || pos.y > u_volumeDim.y - 1.0 ||
        pos.z < 0.0 || pos.z > u_volumeDim.z - 1.0) {
        return -1000.0;
    }
    vec3 i = floor(pos);
    vec3 f = pos - i;
    ivec3 i0 = ivec3(i);
    ivec3 maxCoord = ivec3(u_volumeDim) - 1;
    ivec3 i1 = min(maxCoord, i0 + 1);

    float c000 = float(texelFetch(u_volume, ivec3(i0.x, i0.y, i0.z), 0).r);
    float c100 = float(texelFetch(u_volume, ivec3(i1.x, i0.y, i0.z), 0).r);
    float c010 = float(texelFetch(u_volume, ivec3(i0.x, i1.y, i0.z), 0).r);
    float c110 = float(texelFetch(u_volume, ivec3(i1.x, i1.y, i0.z), 0).r);
    float c001 = float(texelFetch(u_volume, ivec3(i0.x, i0.y, i1.z), 0).r);
    float c101 = float(texelFetch(u_volume, ivec3(i1.x, i0.y, i1.z), 0).r);
    float c011 = float(texelFetch(u_volume, ivec3(i0.x, i1.y, i1.z), 0).r);
    float c111 = float(texelFetch(u_volume, ivec3(i1.x, i1.y, i1.z), 0).r);

    float c00 = mix(c000, c100, f.x);
    float c10 = mix(c010, c110, f.x);
    float c01 = mix(c001, c101, f.x);
    float c11 = mix(c011, c111, f.x);

    float c0 = mix(c00, c10, f.y);
    float c1 = mix(c01, c11, f.y);

    return mix(c0, c1, f.z);
}

void main() {
    float maxDim = max(1.0, max(u_volumeDim.x, max(u_volumeDim.y, u_volumeDim.z)));
    float safeZoom = max(0.01, u_zoom);
    float scale = max(1e-5, (min(u_resolution.x, u_resolution.y) / maxDim) * safeZoom * 0.95);
    
    vec2 screenPixel = v_uv * u_resolution;
    vec2 center = u_resolution * 0.5 + u_pan;
    
    float viewX = (screenPixel.x - center.x) / scale;
    float viewY = -(screenPixel.y - center.y) / scale;
    
    // Camera ray direction (Column 2 of rotation matrix)
    vec3 rayDir = normalize(u_rotMatrix[2]);
    
    // Ray plane starting point in centered coordinates:
    // Screen X travels along Column 0, Screen Y travels along Column 1
    vec3 planePt = u_rotMatrix[0] * viewX + u_rotMatrix[1] * viewY;
    
    vec3 halfDim = u_volumeDim * 0.5;
    vec2 tHit = intersectAABB(planePt, rayDir, -halfDim, halfDim);
    
    float tNear = max(-maxDim * 1.5, tHit.x);
    float tFar = min(maxDim * 1.5, tHit.y);
    
    // If ray misses skull AABB or is NaN, instant discard (render background #09090b)
    if (isnan(tNear) || isnan(tFar) || tNear >= tFar || tFar <= 0.0) {
        fragColor = vec4(0.035, 0.035, 0.043, 1.0); // #09090b
        return;
    }
    
    tNear = max(0.0, tNear);
    float rayDist = tFar - tNear;
    int safeMaxSteps = clamp(u_maxSteps, 1, 256); // clamp(u_maxSteps, 1, 200) baseline expanded to 256 steps
    float stepSize = max(0.6, rayDist / float(safeMaxSteps));
    int actualSteps = int(clamp(ceil(rayDist / stepSize), 1.0, float(safeMaxSteps)));
    float dt = rayDist / float(actualSteps);
    
    vec3 curPos = planePt + rayDir * tNear + halfDim;
    vec3 stepVec = rayDir * dt;
    
    bool hit = false;
    float maxHU = -1000.0;
    float hitDepth = 0.0;
    vec3 norm = vec3(0.0);
    
    for (int i = 0; i < actualSteps; i++) {
        // Interactive 3D Volume Clipping Box (normalized UVW [0, 1])
        vec3 normPos = curPos / u_volumeDim;
        if (normPos.x < u_clipMin.x || normPos.x > u_clipMax.x ||
            normPos.y < u_clipMin.y || normPos.y > u_clipMax.y ||
            normPos.z < u_clipMin.z || normPos.z > u_clipMax.z) {
            curPos += stepVec;
            continue;
        }

        ivec3 vox = ivec3(floor(curPos));
        if (vox.x >= 0 && vox.x < int(u_volumeDim.x) &&
            vox.y >= 0 && vox.y < int(u_volumeDim.y) &&
            vox.z >= 0 && vox.z < int(u_volumeDim.z)) {
            
            // Continuous density sampling (trilinear in beauty pass, fast texel in interaction)
            float hu = (u_refineSteps > 0)
                ? sampleHUTrilinear(curPos)
                : float(texelFetch(u_volume, vox, 0).r);
            
            if (u_presetMode == 1) { // MIP
                if (hu > maxHU) {
                    maxHU = hu;
                    if (maxHU >= 2500.0 || maxHU >= u_huMax) {
                        break;
                    }
                }
            } else {
                bool isHit = (u_presetMode == 2)
                    ? (hu >= u_huMin && hu <= u_huMax)
                    : (hu >= u_huMin);
                if (isHit) {
                    hit = true;
                    vec3 hitPos = curPos;
                    // Sub-voxel bisection refinement (4 steps) on mouseUp (u_refineSteps > 0)
                    if (u_refineSteps > 0) {
                        vec3 p0 = curPos - stepVec;
                        vec3 p1 = curPos;
                        for (int b = 0; b < 4; b++) {
                            if (b >= u_refineSteps) break;
                            vec3 pm = (p0 + p1) * 0.5;
                            float h = sampleHUTrilinear(pm);
                            bool hHit = (u_presetMode == 2) ? (h >= u_huMin && h <= u_huMax) : (h >= u_huMin);
                            if (hHit) p1 = pm; else p0 = pm;
                        }
                        hitPos = (p0 + p1) * 0.5;
                    }
                    hitDepth = float(i + 1) / float(actualSteps);
                    
                    // Central differences normal computation:
                    // gx = sample(x+1) - sample(x-1) with continuous trilinear filtering
                    vec3 grad;
                    if (u_refineSteps > 0) {
                        float eps = 1.0;
                        float gx = sampleHUTrilinear(hitPos + vec3(eps, 0.0, 0.0)) - sampleHUTrilinear(hitPos - vec3(eps, 0.0, 0.0));
                        float gy = sampleHUTrilinear(hitPos + vec3(0.0, eps, 0.0)) - sampleHUTrilinear(hitPos - vec3(0.0, eps, 0.0));
                        float gz = sampleHUTrilinear(hitPos + vec3(0.0, 0.0, eps)) - sampleHUTrilinear(hitPos - vec3(0.0, 0.0, eps));
                        grad = vec3(gx, gy, gz);
                    } else {
                        ivec3 vHit = clamp(ivec3(floor(hitPos)), ivec3(1), ivec3(u_volumeDim) - 2);
                        float gx = float(texelFetch(u_volume, vHit + ivec3(1, 0, 0), 0).r) - float(texelFetch(u_volume, vHit - ivec3(1, 0, 0), 0).r);
                        float gy = float(texelFetch(u_volume, vHit + ivec3(0, 1, 0), 0).r) - float(texelFetch(u_volume, vHit - ivec3(0, 1, 0), 0).r);
                        float gz = float(texelFetch(u_volume, vHit + ivec3(0, 0, 1), 0).r) - float(texelFetch(u_volume, vHit - ivec3(0, 0, 1), 0).r);
                        grad = vec3(gx, gy, gz);
                    }
                    float gLen = length(grad);
                    // Outward surface normal points toward lower density (from bone into air)
                    // For airway, surface normal points inward toward cavity lumen
                    norm = gLen > 0.001
                        ? (u_presetMode == 2 ? normalize(grad) : -normalize(grad))
                        : -rayDir;
                    // Ensure normal faces toward the camera
                    if (dot(norm, -rayDir) < 0.0) {
                        norm = -norm;
                    }
                    break;
                }
            }
        }
        curPos += stepVec;
    }
    
    if (u_presetMode == 1) { // MIP
        if (maxHU > u_huMin) {
            float huSpan = max(1.0, u_huMax - u_huMin);
            float n = clamp((maxHU - u_huMin) / huSpan, 0.0, 1.0);
            float clinicalPeak = 178.0 / 255.0; // Enamel burnout safeguard ceiling <= 180/255
            fragColor = vec4(u_boneColor * (n * clinicalPeak), 1.0);
        } else {
            fragColor = vec4(0.0, 0.0, 0.0, 1.0);
        }
    } else if (hit) {
        // Clinical Anatomical Blinn-Phong Shading: Ambient + Lambert Diffuse + Specular + Rim
        vec3 viewDir = -rayDir;
        // Directional key light from upper-front-right relative to camera
        vec3 lightDir = normalize(viewDir * 0.82 + u_rotMatrix[0] * 0.35 + u_rotMatrix[1] * 0.45);
        float NdotL = max(0.0, dot(norm, lightDir));
        float ambient = 0.22;
        float diff = NdotL * 0.40;
        vec3 halfVec = normalize(lightDir + viewDir);
        float NdotH = max(0.0, dot(norm, halfVec));
        float spec = pow(NdotH, 32.0) * 0.10;
        float NdotV = max(0.0, dot(norm, viewDir));
        float rim = pow(1.0 - NdotV, 3.0) * 0.08;
        float depthFade = 1.0 - hitDepth * 0.15;
        // Clinical soft-knee highlight ceiling (strictly <= 178/255 to eliminate enamel blinding burnout)
        float clinicalCeiling = 178.0 / 255.0;
        vec3 rawLit = u_boneColor * (ambient + diff * depthFade + rim) + vec3(0.95, 0.92, 0.88) * spec;
        vec3 lit = clamp(min(rawLit, vec3(clinicalCeiling)), 0.0, 1.0);
        fragColor = vec4(lit, 1.0);
    } else {
        fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
}
`;

export interface WebGlVolume3DState {
	gl: WebGL2RenderingContext;
	program: WebGLProgram;
	vao: WebGLVertexArrayObject;
	volumeTexture: WebGLTexture | null;
	volumeDataRef: Int16Array | null;
	uploadDim: { width: number; height: number; depth: number } | null;
	lastRenderTimeMs?: number;
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
		clipMin: WebGLUniformLocation | null;
		clipMax: WebGLUniformLocation | null;
		refineSteps: WebGLUniformLocation | null;
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
			clipMin: gl.getUniformLocation(program, "u_clipMin"),
			clipMax: gl.getUniformLocation(program, "u_clipMax"),
			refineSteps: gl.getUniformLocation(program, "u_refineSteps"),
		},
	};
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
): void {
	const { gl, program, vao, uniforms } = state;
	const dim = volume.dimensions;
	const data = volume.data;

	// Upload or update 3D texture if volume changed
	if (!state.volumeTexture || state.volumeDataRef !== data) {
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

			const max3D = gl.getParameter(gl.MAX_3D_TEXTURE_SIZE) || 512;
			const targetLimit = Math.min(max3D, 512);
			const maxDim = Math.max(dim.width, Math.max(dim.height, dim.depth));
			if (!data) return;
			let uploadData: Int16Array = data;
			let uploadW = dim.width;
			let uploadH = dim.height;
			let uploadD = dim.depth;

			if (maxDim > targetLimit) {
				const factor = Math.ceil(maxDim / targetLimit);
				const downsampled = downsampleVolumeData(data, dim, factor);
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
			} catch (err) {
				console.warn("[CbctVolume3DViewport] 3D texture upload failed:", err);
				gl.deleteTexture(tex);
				state.volumeTexture = null;
				state.volumeDataRef = null;
				state.uploadDim = null;
			}
		}
	}

	const preset = getVolume3DPreset(activePreset);
	const rotMat = computeVolume3DRotationMatrix(yaw, pitch);

	gl.viewport(0, 0, width, height);
	gl.useProgram(program);
	gl.bindVertexArray(vao);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_3D, state.volumeTexture);
	gl.uniform1i(gl.getUniformLocation(program, "u_volume"), 0);

	const curDim = state.uploadDim ?? { width: dim.width, height: dim.height, depth: dim.depth };
	gl.uniform3f(uniforms.volumeDim, curDim.width, curDim.height, curDim.depth);

	// Column-major 3x3 matrix for WebGL uniformMatrix3fv
	const matColMajor = new Float32Array([
		rotMat[0]![0]!, rotMat[1]![0]!, rotMat[2]![0]!,
		rotMat[0]![1]!, rotMat[1]![1]!, rotMat[2]![1]!,
		rotMat[0]![2]!, rotMat[1]![2]!, rotMat[2]![2]!,
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
	gl.uniform1i(uniforms.refineSteps, isInteracting ? 0 : 4);
	gl.uniform1i(uniforms.maxSteps, isInteracting ? 64 : 256);

	const tRayStart = typeof performance !== "undefined" ? performance.now() : 0;
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	if (tRayStart > 0 && typeof performance !== "undefined") {
		state.lastRenderTimeMs = performance.now() - tRayStart;
	}
}
