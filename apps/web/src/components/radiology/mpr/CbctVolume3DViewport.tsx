/**
 * DENTE CRM — CBCT 3D Volume & Skull Raycasting Viewport
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i, Cybermed OnDemand3D
 *
 * Capabilities:
 * 1. Interactive 3D trackball / orbit camera rotation (LMB), continuous zoom (MMB/Wheel), and pan (RMB).
 * 2. Maxillofacial skull and bone rendering with calibrated HU transfer function presets (HU 150..2000).
 * 3. Quick orthogonal projection angles: Фас (Coronal), Профиль (Sagittal), 3D (Isometric).
 * 4. Hardware WebGL2 raymarching with sub-voxel sampling and phong shading, with robust Canvas2D fallback.
 * 5. Full telemetry HUD showing volume dimensions, voxel spacing, rotation angles and navigation hints.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Compass, Maximize2, Minimize2, RotateCcw, Scissors, Sparkles } from "lucide-react";
import type { CbctVoxelVolume, Point3D } from "../cbctMprMath";
import { downsampleVolumeData } from "../cbctPanoramicReconstructionMath";

export interface Volume3DClippingBox {
	/** Normalized UVW minimum bounds in range [0, 1] [X_min, Y_min, Z_min] */
	clipMin: [number, number, number];
	/** Normalized UVW maximum bounds in range [0, 1] [X_max, Y_max, Z_max] */
	clipMax: [number, number, number];
}

export const DEFAULT_VOLUME_3D_CLIPPING_BOX: Volume3DClippingBox = {
	clipMin: [0.0, 0.0, 0.0],
	clipMax: [1.0, 1.0, 1.0],
};

/**
 * Checks if a normalized point [u, v, w] in [0, 1] is within the clipping box.
 */
export function isPointInsideClippingBox(
	uvw: [number, number, number],
	clipMin: [number, number, number],
	clipMax: [number, number, number],
): boolean {
	return (
		uvw[0] >= clipMin[0] &&
		uvw[0] <= clipMax[0] &&
		uvw[1] >= clipMin[1] &&
		uvw[1] <= clipMax[1] &&
		uvw[2] >= clipMin[2] &&
		uvw[2] <= clipMax[2]
	);
}

/**
 * Clamps device pixel ratio to <= 1.5 to protect fill-rate on 4K / Retina screens
 * and prevent out-of-memory crashes on integrated Intel/AMD GPUs.
 */
export function getSafeDevicePixelRatio(dpr?: number): number {
	const val =
		typeof dpr === "number" && !Number.isNaN(dpr)
			? dpr
			: typeof window !== "undefined"
				? window.devicePixelRatio || 1
				: 1;
	return Math.min(1.5, Math.max(1.0, val));
}

export type Volume3DPresetId = "skull" | "dense_bone" | "soft_tissue" | "mip";

export interface Volume3DPresetSpec {
	id: Volume3DPresetId;
	label: string;
	shortLabel: string;
	description: string;
	huMin: number;
	huMax: number;
	colorRgb: [number, number, number]; // Base bone tint [R, G, B]
}

export const CBCT_VOLUME_3D_PRESETS: readonly Volume3DPresetSpec[] = [
	{
		id: "skull",
		label: "Череп (Кость / Челюсть)",
		shortLabel: "Череп",
		description: "Челюстно-лицевой скелет, нижняя и верхняя челюсти, костные структуры (350+ HU)",
		huMin: 350,
		huMax: 2000,
		colorRgb: [242, 232, 214], // Clean warm bone ivory
	},
	{
		id: "dense_bone",
		label: "Плотная кость / Зубы",
		shortLabel: "Плотная",
		description: "Кортикальная пластинка, зубной ряд, эмаль и дентин (550+ HU)",
		huMin: 550,
		huMax: 3000,
		colorRgb: [255, 252, 240], // High-density cortical ivory
	},
	{
		id: "soft_tissue",
		label: "Ткани + Кость",
		shortLabel: "Ткани",
		description: "Мягкотканный контур лица и подлежащий костный остов (100+ HU)",
		huMin: 100,
		huMax: 1500,
		colorRgb: [220, 180, 160], // Flesh and bone
	},
	{
		id: "mip",
		label: "MIP (Максимум)",
		shortLabel: "MIP",
		description: "Проекция максимальной интенсивности по всей глубине объема (250+ HU)",
		huMin: 250,
		huMax: 3000,
		colorRgb: [220, 240, 255], // Clear radiologic cyan-white
	},
] as const;

export interface CbctVolume3DViewportProps {
	readonly volume: CbctVoxelVolume | null;
	readonly extraClassName?: string;
	readonly isActive?: boolean;
	readonly onPointerDownCapture?: () => void;
	readonly onMouseEnter?: () => void;
	readonly onMouseLeave?: () => void;
	readonly onDoubleClick?: () => void;
	readonly switcherSlot?: React.ReactNode;
	readonly isMaximized?: boolean;
	readonly onToggleMaximize?: () => void;
	readonly initialClipping?: Partial<Volume3DClippingBox>;
	readonly onClippingChange?: (clipping: Volume3DClippingBox) => void;
}

function cleanZero(val: number): number {
	return Math.abs(val) < 1e-9 ? 0 : val;
}

/**
 * Analytical Ray-AABB (Axis-Aligned Bounding Box) Slab Intersection.
 * Determines if a 3D ray intersects the volume bounding box and computes the [tNear, tFar] entry/exit points.
 */
export function intersectRayAABB(
	ox: number,
	oy: number,
	oz: number,
	dx: number,
	dy: number,
	dz: number,
	minX: number,
	maxX: number,
	minY: number,
	maxY: number,
	minZ: number,
	maxZ: number,
	tMinLimit: number,
	tMaxLimit: number,
): { hit: boolean; tNear: number; tFar: number } {
	let tNear = tMinLimit;
	let tFar = tMaxLimit;

	// X slab
	if (Math.abs(dx) > 1e-7) {
		const invD = 1.0 / dx;
		let t1 = (minX - ox) * invD;
		let t2 = (maxX - ox) * invD;
		if (t1 > t2) {
			const tmp = t1;
			t1 = t2;
			t2 = tmp;
		}
		if (t1 > tNear) tNear = t1;
		if (t2 < tFar) tFar = t2;
		if (tNear > tFar) return { hit: false, tNear: 0, tFar: 0 };
	} else if (ox < minX || ox > maxX) {
		return { hit: false, tNear: 0, tFar: 0 };
	}

	// Y slab
	if (Math.abs(dy) > 1e-7) {
		const invD = 1.0 / dy;
		let t1 = (minY - oy) * invD;
		let t2 = (maxY - oy) * invD;
		if (t1 > t2) {
			const tmp = t1;
			t1 = t2;
			t2 = tmp;
		}
		if (t1 > tNear) tNear = t1;
		if (t2 < tFar) tFar = t2;
		if (tNear > tFar) return { hit: false, tNear: 0, tFar: 0 };
	} else if (oy < minY || oy > maxY) {
		return { hit: false, tNear: 0, tFar: 0 };
	}

	// Z slab
	if (Math.abs(dz) > 1e-7) {
		const invD = 1.0 / dz;
		let t1 = (minZ - oz) * invD;
		let t2 = (maxZ - oz) * invD;
		if (t1 > t2) {
			const tmp = t1;
			t1 = t2;
			t2 = tmp;
		}
		if (t1 > tNear) tNear = t1;
		if (t2 < tFar) tFar = t2;
		if (tNear > tFar) return { hit: false, tNear: 0, tFar: 0 };
	} else if (oz < minZ || oz > maxZ) {
		return { hit: false, tNear: 0, tFar: 0 };
	}

	return { hit: true, tNear, tFar };
}

/**
 * Computes 3D rotation matrix for trackball navigation in medical coordinates.
 * Patient space: +X = lateral (right-to-left), +Y = sagittal (anterior-to-posterior), +Z = vertical (inferior-to-superior).
 * At yaw=0, pitch=0: camera faces patient from front (Coronal / Фас).
 * Returns 3 columns: [col0 (Right), col1 (Up), col2 (RayDir)].
 */
export function computeVolume3DRotationMatrix(yawDeg: number, pitchDeg: number): [number, number, number][] {
	const yawRad = (yawDeg * Math.PI) / 180;
	const pitchRad = (pitchDeg * Math.PI) / 180;

	const cosY = cleanZero(Math.cos(yawRad));
	const sinY = cleanZero(Math.sin(yawRad));
	const cosP = cleanZero(Math.cos(pitchRad));
	const sinP = cleanZero(Math.sin(pitchRad));

	// Column 0: Camera Right (screen X axis -> patient lateral)
	const col0: [number, number, number] = [cosY, sinY, 0];
	// Column 1: Camera Up (screen Y axis -> patient vertical +Z is UP)
	const col1: [number, number, number] = [
		cleanZero(-sinY * sinP),
		cleanZero(cosY * sinP),
		cosP,
	];
	// Column 2: Ray Direction (marching into face -> patient anterior-to-posterior)
	const col2: [number, number, number] = [
		cleanZero(-sinY * cosP),
		cleanZero(cosY * cosP),
		cleanZero(-sinP),
	];

	return [col0, col1, col2];
}

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
    int safeMaxSteps = clamp(u_maxSteps, 1, 200);
    float stepSize = max(0.8, rayDist / float(safeMaxSteps));
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
            
            float hu = float(texelFetch(u_volume, vox, 0).r);
            
            if (u_presetMode == 1) { // MIP
                if (hu > maxHU) {
                    maxHU = hu;
                    if (maxHU >= 2500.0 || maxHU >= u_huMax) {
                        break;
                    }
                }
            } else {
                if (hu >= u_huMin) {
                    hit = true;
                    vec3 hitPos = curPos;
                    // Sub-voxel bisection refinement (4 steps) on mouseUp (u_refineSteps > 0)
                    if (u_refineSteps > 0) {
                        vec3 p0 = curPos - stepVec;
                        vec3 p1 = curPos;
                        for (int b = 0; b < 4; b++) {
                            if (b >= u_refineSteps) break;
                            vec3 pm = (p0 + p1) * 0.5;
                            ivec3 v = clamp(ivec3(floor(pm)), ivec3(0), ivec3(u_volumeDim) - 1);
                            float h = float(texelFetch(u_volume, v, 0).r);
                            if (h >= u_huMin) p1 = pm; else p0 = pm;
                        }
                        hitPos = (p0 + p1) * 0.5;
                    }
                    hitDepth = float(i + 1) / float(actualSteps);
                    
                    // Central differences with 2-voxel baseline for smooth anatomical gradients
                    ivec3 vHit = clamp(ivec3(floor(hitPos)), ivec3(2), ivec3(u_volumeDim) - 3);
                    float gx = float(texelFetch(u_volume, vHit + ivec3(2, 0, 0), 0).r) - float(texelFetch(u_volume, vHit - ivec3(2, 0, 0), 0).r);
                    float gy = float(texelFetch(u_volume, vHit + ivec3(0, 2, 0), 0).r) - float(texelFetch(u_volume, vHit - ivec3(0, 2, 0), 0).r);
                    float gz = float(texelFetch(u_volume, vHit + ivec3(0, 0, 2), 0).r) - float(texelFetch(u_volume, vHit - ivec3(0, 0, 2), 0).r);
                    
                    vec3 grad = vec3(gx, gy, gz);
                    float gLen = length(grad);
                    // Outward surface normal points toward lower density (from bone into air)
                    norm = gLen > 0.001 ? -normalize(grad) : -rayDir;
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
            fragColor = vec4(u_boneColor * n, 1.0);
        } else {
            fragColor = vec4(0.035, 0.035, 0.043, 1.0);
        }
    } else if (hit) {
        // Clinical Anatomical Phong Shading: Ambient + Lambert Diffuse + Enamel Specular + Rim
        vec3 viewDir = -rayDir;
        // Directional key light from upper-front-right relative to camera
        vec3 lightDir = normalize(viewDir * 0.82 + u_rotMatrix[0] * 0.35 + u_rotMatrix[1] * 0.45);
        float NdotL = max(0.0, dot(norm, lightDir));
        float ambient = 0.32;
        float diff = NdotL * 0.68;
        vec3 halfVec = normalize(lightDir + viewDir);
        float spec = pow(max(0.0, dot(norm, halfVec)), 32.0) * 0.35;
        float rim = pow(1.0 - max(0.0, dot(norm, viewDir)), 3.0) * 0.18;
        float depthFade = 1.0 - hitDepth * 0.15;
        vec3 lit = clamp(u_boneColor * (ambient + diff * depthFade + rim) + vec3(1.0, 0.98, 0.92) * spec, 0.0, 1.0);
        fragColor = vec4(lit, 1.0);
    } else {
        fragColor = vec4(0.035, 0.035, 0.043, 1.0);
    }
}
`;

interface WebGlVolume3DState {
	gl: WebGL2RenderingContext;
	program: WebGLProgram;
	vao: WebGLVertexArrayObject;
	volumeTexture: WebGLTexture | null;
	volumeDataRef: Int16Array | null;
	uploadDim: { width: number; height: number; depth: number } | null;
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

function initWebGl2VolumeRaymarching(gl: WebGL2RenderingContext): WebGlVolume3DState | null {
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

function renderWebGl2VolumeRaymarching(
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
) {
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
			const maxDim = Math.max(dim.width, Math.max(dim.height, dim.depth));
			if (!data) return;
			let uploadData: Int16Array = data;
			let uploadW = dim.width;
			let uploadH = dim.height;
			let uploadD = dim.depth;

			if (maxDim > max3D) {
				const factor = Math.ceil(maxDim / max3D);
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

	const preset = CBCT_VOLUME_3D_PRESETS.find((p) => p.id === activePreset) ?? CBCT_VOLUME_3D_PRESETS[0]!;
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
	gl.uniform1i(uniforms.presetMode, preset.id === "mip" ? 1 : 0);

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
	gl.uniform1i(uniforms.maxSteps, isInteracting ? 45 : 160);

	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

export const CbctVolume3DViewport: React.FC<CbctVolume3DViewportProps> = ({
	volume,
	extraClassName = "flex-1 flex flex-col",
	isActive = false,
	onPointerDownCapture,
	onMouseEnter,
	onMouseLeave,
	onDoubleClick,
	switcherSlot,
	isMaximized = false,
	onToggleMaximize,
	initialClipping,
	onClippingChange,
}) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const glStateRef = useRef<WebGlVolume3DState | null>(null);
	const [activePreset, setActivePreset] = useState<Volume3DPresetId>("skull");
	const [yaw, setYaw] = useState<number>(30); // 30° canonical dental 3/4 view
	const [pitch, setPitch] = useState<number>(12); // 12° occlusal tilt
	const [zoom, setZoom] = useState<number>(1.0);
	const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
	const [isInteracting, setIsInteracting] = useState<boolean>(false);
	const [clipping, setClipping] = useState<Volume3DClippingBox>({
		clipMin: initialClipping?.clipMin
			? [initialClipping.clipMin[0], initialClipping.clipMin[1], initialClipping.clipMin[2]]
			: [0.0, 0.0, 0.0],
		clipMax: initialClipping?.clipMax
			? [initialClipping.clipMax[0], initialClipping.clipMax[1], initialClipping.clipMax[2]]
			: [1.0, 1.0, 1.0],
	});
	const [isClippingOpen, setIsClippingOpen] = useState<boolean>(false);

	const hasActiveClipping =
		clipping.clipMin[0] > 0.001 ||
		clipping.clipMin[1] > 0.001 ||
		clipping.clipMin[2] > 0.001 ||
		clipping.clipMax[0] < 0.999 ||
		clipping.clipMax[1] < 0.999 ||
		clipping.clipMax[2] < 0.999;

	const handleClipChange = useCallback(
		(axis: "xMin" | "xMax" | "yMin" | "yMax" | "zMin" | "zMax", val: number) => {
			setClipping((prev) => {
				const nextMin: [number, number, number] = [...prev.clipMin];
				const nextMax: [number, number, number] = [...prev.clipMax];
				if (axis === "xMin") nextMin[0] = Math.max(0, Math.min(nextMax[0] - 0.05, val));
				if (axis === "xMax") nextMax[0] = Math.min(1, Math.max(nextMin[0] + 0.05, val));
				if (axis === "yMin") nextMin[1] = Math.max(0, Math.min(nextMax[1] - 0.05, val));
				if (axis === "yMax") nextMax[1] = Math.min(1, Math.max(nextMin[1] + 0.05, val));
				if (axis === "zMin") nextMin[2] = Math.max(0, Math.min(nextMax[2] - 0.05, val));
				if (axis === "zMax") nextMax[2] = Math.min(1, Math.max(nextMin[2] + 0.05, val));
				const next = { clipMin: nextMin, clipMax: nextMax };
				onClippingChange?.(next);
				return next;
			});
		},
		[onClippingChange],
	);

	const handleResetClipping = useCallback(() => {
		const next: Volume3DClippingBox = {
			clipMin: [0.0, 0.0, 0.0],
			clipMax: [1.0, 1.0, 1.0],
		};
		setClipping(next);
		onClippingChange?.(next);
	}, [onClippingChange]);

	const handleQuickClipSpine = useCallback(() => {
		setClipping((prev) => {
			const next: Volume3DClippingBox = {
				clipMin: [prev.clipMin[0], prev.clipMin[1], 0.28], // Cuts cervical spine
				clipMax: [...prev.clipMax],
			};
			onClippingChange?.(next);
			return next;
		});
	}, [onClippingChange]);

	const handleQuickClipOcciput = useCallback(() => {
		setClipping((prev) => {
			const next: Volume3DClippingBox = {
				clipMin: [...prev.clipMin],
				clipMax: [prev.clipMax[0], 0.72, prev.clipMax[2]], // Cuts occipital bone
			};
			onClippingChange?.(next);
			return next;
		});
	}, [onClippingChange]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const handleContextLost = (e: Event) => {
			e.preventDefault(); // Prevents browser from abandoning WebGL context permanently
			if (glStateRef.current) {
				glStateRef.current = null;
			}
		};

		const handleContextRestored = () => {
			try {
				const gl = canvas.getContext("webgl2", {
					alpha: false,
					antialias: false,
					depth: false,
					preserveDrawingBuffer: true,
					powerPreference: "high-performance",
				});
				if (gl) {
					glStateRef.current = initWebGl2VolumeRaymarching(gl);
				}
			} catch {
				glStateRef.current = null;
			}
		};

		canvas.addEventListener("webglcontextlost", handleContextLost);
		canvas.addEventListener("webglcontextrestored", handleContextRestored);

		return () => {
			canvas.removeEventListener("webglcontextlost", handleContextLost);
			canvas.removeEventListener("webglcontextrestored", handleContextRestored);
			if (glStateRef.current) {
				const { gl, program, vao, volumeTexture } = glStateRef.current;
				if (volumeTexture) gl.deleteTexture(volumeTexture);
				if (program) gl.deleteProgram(program);
				if (vao) gl.deleteVertexArray(vao);
				glStateRef.current = null;
			}
		};
	}, []);

	const isDraggingRef = useRef<boolean>(false);
	const dragButtonRef = useRef<number>(0);
	const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
	const dragStartAnglesRef = useRef<{ yaw: number; pitch: number }>({ yaw: 30, pitch: 12 });
	const dragStartPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
	const targetAnglesRef = useRef<{ yaw: number; pitch: number }>({ yaw: 30, pitch: 12 });
	const targetPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
	const rafIdRef = useRef<number | null>(null);

	// Touch interaction handlers for mobile/tablets
	const touchStartDistRef = useRef<number | null>(null);
	const touchStartZoomRef = useRef<number>(1.0);

	// Observe container resize to auto-update canvas dimensions
	const [canvasDims, setCanvasDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || typeof ResizeObserver === "undefined") return;

		const ro = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				if (width > 0 && height > 0) {
					setCanvasDims({ width: Math.floor(width), height: Math.floor(height) });
				}
			}
		});

		ro.observe(canvas);
		return () => ro.disconnect();
	}, []);

	// Cancel any active RAF on unmount
	useEffect(() => {
		return () => {
			if (rafIdRef.current !== null) {
				cancelAnimationFrame(rafIdRef.current);
			}
		};
	}, []);

	// Quick camera orientation shortcuts
	const handleSetOrientation = useCallback((orientation: "coronal" | "sagittal" | "isometric") => {
		if (orientation === "coronal") {
			setYaw(0);
			setPitch(0);
		} else if (orientation === "sagittal") {
			setYaw(90);
			setPitch(0);
		} else {
			setYaw(30);
			setPitch(12);
		}
		setPan({ x: 0, y: 0 });
	}, []);

	const handleResetCamera = useCallback(() => {
		setYaw(30);
		setPitch(12);
		setZoom(1.0);
		setPan({ x: 0, y: 0 });
	}, []);

	// Mouse interaction handlers for 3D trackball rotation, pan & zoom
	const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
		e.preventDefault();
		isDraggingRef.current = true;
		setIsInteracting(true);
		dragButtonRef.current = e.button;
		dragStartPosRef.current = { x: e.clientX, y: e.clientY };
		dragStartAnglesRef.current = { yaw, pitch };
		dragStartPanRef.current = { ...pan };
		targetAnglesRef.current = { yaw, pitch };
		targetPanRef.current = { ...pan };
	}, [yaw, pitch, pan]);

	const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
		if (!isDraggingRef.current) return;
		const dx = e.clientX - dragStartPosRef.current.x;
		const dy = e.clientY - dragStartPosRef.current.y;

		if (dragButtonRef.current === 0) {
			// Left click drag: trackball orbit rotation
			targetAnglesRef.current = {
				yaw: (dragStartAnglesRef.current.yaw + dx * 0.6) % 360,
				pitch: Math.max(-85, Math.min(85, dragStartAnglesRef.current.pitch + dy * 0.6)),
			};
		} else if (dragButtonRef.current === 2 || dragButtonRef.current === 1) {
			// Right click or middle click drag: pan
			targetPanRef.current = {
				x: dragStartPanRef.current.x + dx,
				y: dragStartPanRef.current.y + dy,
			};
		}

		// Throttle React state updates to screen refresh rate via requestAnimationFrame
		if (rafIdRef.current === null) {
			rafIdRef.current = requestAnimationFrame(() => {
				rafIdRef.current = null;
				setYaw(targetAnglesRef.current.yaw);
				setPitch(targetAnglesRef.current.pitch);
				setPan(targetPanRef.current);
			});
		}
	}, []);

	const handleMouseUp = useCallback(() => {
		if (!isDraggingRef.current) return;
		isDraggingRef.current = false;
		if (rafIdRef.current !== null) {
			cancelAnimationFrame(rafIdRef.current);
			rafIdRef.current = null;
		}
		setYaw(targetAnglesRef.current.yaw);
		setPitch(targetAnglesRef.current.pitch);
		setPan(targetPanRef.current);
		setIsInteracting(false);
	}, []);

	const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
		e.preventDefault();
		const zoomDelta = e.deltaY < 0 ? 1.1 : 0.91;
		setZoom((prev) => Math.max(0.4, Math.min(5.0, prev * zoomDelta)));
	}, []);

	// Touch interaction handlers for mobile/tablets
	const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
		if (e.touches.length === 1) {
			const touch = e.touches[0]!;
			isDraggingRef.current = true;
			setIsInteracting(true);
			dragButtonRef.current = 0;
			dragStartPosRef.current = { x: touch.clientX, y: touch.clientY };
			dragStartAnglesRef.current = { yaw, pitch };
			targetAnglesRef.current = { yaw, pitch };
			touchStartDistRef.current = null;
		} else if (e.touches.length === 2) {
			isDraggingRef.current = false;
			setIsInteracting(true);
			const t1 = e.touches[0]!;
			const t2 = e.touches[1]!;
			touchStartDistRef.current = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
			touchStartZoomRef.current = zoom;
		}
	}, [yaw, pitch, zoom]);

	const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
		if (e.touches.length === 1 && isDraggingRef.current) {
			const touch = e.touches[0]!;
			const dx = touch.clientX - dragStartPosRef.current.x;
			const dy = touch.clientY - dragStartPosRef.current.y;
			targetAnglesRef.current = {
				yaw: (dragStartAnglesRef.current.yaw + dx * 0.6) % 360,
				pitch: Math.max(-85, Math.min(85, dragStartAnglesRef.current.pitch + dy * 0.6)),
			};
			if (rafIdRef.current === null) {
				rafIdRef.current = requestAnimationFrame(() => {
					rafIdRef.current = null;
					setYaw(targetAnglesRef.current.yaw);
					setPitch(targetAnglesRef.current.pitch);
				});
			}
		} else if (e.touches.length === 2 && touchStartDistRef.current !== null) {
			const t1 = e.touches[0]!;
			const t2 = e.touches[1]!;
			const curDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
			if (curDist > 10 && touchStartDistRef.current > 10) {
				const factor = curDist / touchStartDistRef.current;
				setZoom(Math.max(0.4, Math.min(5.0, touchStartZoomRef.current * factor)));
			}
		}
	}, []);

	const handleTouchEnd = useCallback(() => {
		isDraggingRef.current = false;
		touchStartDistRef.current = null;
		if (rafIdRef.current !== null) {
			cancelAnimationFrame(rafIdRef.current);
			rafIdRef.current = null;
		}
		setYaw(targetAnglesRef.current.yaw);
		setPitch(targetAnglesRef.current.pitch);
		setIsInteracting(false);
	}, []);

	// Render Volume Raycasting on canvas
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		// Fill-rate protection for 4K / Retina screens and weak integrated GPUs (Intel UHD / Iris Xe / Vega)
		// Adaptive interactive LOD: during drag rotation, reduce internal resolution by subSample factor (3..4)
		// for rock-solid 60 FPS on weak GPUs (Intel UHD / Iris Xe / Vega).
		// Upon mouseUp, immediately restore beauty pass (subSample = 1 or 2).
		const safeDpr = getSafeDevicePixelRatio();
		const rawWidth = Math.max(64, Math.floor((rect.width || 320) * safeDpr));
		const rawHeight = Math.max(64, Math.floor((rect.height || 280) * safeDpr));
		const subSample = isInteracting ? (rawWidth > 600 ? 4 : 3) : (rawWidth > 800 ? 2 : 1);
		const width = Math.max(64, Math.floor(rawWidth / subSample));
		const height = Math.max(64, Math.floor(rawHeight / subSample));

		if (canvas.width !== width || canvas.height !== height) {
			canvas.width = width;
			canvas.height = height;
		}

		// Attempt hardware WebGL2 raymarching first
		if (!glStateRef.current || glStateRef.current.gl.canvas !== canvas) {
			try {
				const gl = canvas.getContext("webgl2", {
					alpha: false,
					antialias: false,
					depth: false,
					preserveDrawingBuffer: true,
					powerPreference: "high-performance",
				});
				if (gl) {
					glStateRef.current = initWebGl2VolumeRaymarching(gl);
				} else {
					console.error("[CbctVolume3D] canvas.getContext('webgl2') returned null!");
				}
			} catch (e) {
				console.error("[CbctVolume3D] getContext threw exception:", e);
				glStateRef.current = null;
			}
		}

		if (glStateRef.current) {
			if (!volume || !volume.data) {
				const gl = glStateRef.current.gl;
				gl.viewport(0, 0, width, height);
				gl.clearColor(0.035, 0.035, 0.043, 1.0);
				gl.clear(gl.COLOR_BUFFER_BIT);
				return;
			}
			if (!volume.isDisposed) {
				renderWebGl2VolumeRaymarching(
					glStateRef.current,
					volume,
					activePreset,
					yaw,
					pitch,
					zoom,
					pan,
					width,
					height,
					isInteracting,
					clipping,
				);
				return;
			}
		}

		// Fallback to Canvas2D software raymarching (used in headless test environments like jsdom/node test)
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		if (!volume || !volume.data) {
			// Empty volume indicator
			ctx.fillStyle = "#09090b";
			ctx.fillRect(0, 0, width, height);
			ctx.fillStyle = "#52525b";
			ctx.font = "12px sans-serif";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText("Загрузите КЛКТ для 3D-реконструкции черепа", width / 2, height / 2);
			return;
		}

		const preset = CBCT_VOLUME_3D_PRESETS.find((p) => p.id === activePreset) ?? CBCT_VOLUME_3D_PRESETS[0]!;
		const rotMat = computeVolume3DRotationMatrix(yaw, pitch);

		// Render authentic 3D raycasting of voxel volume
		const dim = volume.dimensions;
		const data = volume.data;
		const huMin = preset.huMin;
		const huMax = preset.huMax;

		// Render raycast projection with surface normal shading
		const imgData = ctx.createImageData(width, height);
		// Pre-fill canvas with deep medical dark background (#09090b) in single fast typed array call
		// Little-endian RGBA: R=0x09, G=0x09, B=0x0b, A=0xff -> 0xff0b0909
		const u32 = new Uint32Array(imgData.data.buffer);
		u32.fill(0xff0b0909);

		const centerX = width / 2 + pan.x;
		const centerY = height / 2 + pan.y;
		const maxDim = Math.max(dim.width, Math.max(dim.height, dim.depth));
		const scale = (Math.min(width, height) / maxDim) * zoom * 0.9;
		const invScale = 1.0 / scale;

		const halfW = dim.width / 2;
		const halfH = dim.height / 2;
		const halfD = dim.depth / 2;
		const sliceSize = dim.width * dim.height;
		const dimW = dim.width;
		const dimH = dim.height;
		const dimD = dim.depth;

		// Ray origin and direction rotated by view matrix (constant for all rays)
		const rayDirX = rotMat[0]![2]!;
		const rayDirY = rotMat[1]![2]!;
		const rayDirZ = rotMat[2]![2]!;

		// Adaptive interactive sampling: during mouse/touch drag, render fast 60 FPS sub-sampled pass.
		// When idle/released, render razor-sharp beauty pass.
		const canvas2dSubSample = isInteracting ? (width > 500 ? 4 : 3) : (width > 400 ? 2 : 1);
		const maxSteps = isInteracting ? 55 : 160;
		const nominalStepSize = isInteracting ? Math.max(2.5, maxDim / 55) : Math.max(1.2, maxDim / 160);

		const lightDir = [0.4, 0.6, 0.7]; // Directional light from front-top-right
		const lightLen = Math.hypot(lightDir[0]!, lightDir[1]!, lightDir[2]!);
		const lx = lightDir[0]! / lightLen;
		const ly = lightDir[1]! / lightLen;
		const lz = lightDir[2]! / lightLen;

		const baseR = preset.colorRgb[0];
		const baseG = preset.colorRgb[1];
		const baseB = preset.colorRgb[2];

		const tMinLimit = -maxDim * 0.8;
		const tMaxLimit = maxDim * 0.8;

		// Cache matrix coefficients for fast ray-plane origin computation
		const m00 = rotMat[0]![0]!;
		const m01 = rotMat[0]![1]!;
		const m10 = rotMat[1]![0]!;
		const m11 = rotMat[1]![1]!;
		const m20 = rotMat[2]![0]!;
		const m21 = rotMat[2]![1]!;

		for (let py = 0; py < height; py += canvas2dSubSample) {
			const viewY = -(py - centerY) * invScale;
			const r01_vY = m01 * viewY;
			const r11_vY = m11 * viewY;
			const r21_vY = m21 * viewY;

			for (let px = 0; px < width; px += canvas2dSubSample) {
				const viewX = (px - centerX) * invScale;

				// Ray plane starting point in centered coordinates
				const planeX = m00 * viewX + r01_vY;
				const planeY = m10 * viewX + r11_vY;
				const planeZ = m20 * viewX + r21_vY;

				// Slab AABB bounding box intersection test:
				// If ray completely misses the skull box [-halfW..halfW, -halfH..halfH, -halfD..halfD],
				// instantly skip with ZERO steps!
				const aabb = intersectRayAABB(
					planeX,
					planeY,
					planeZ,
					rayDirX,
					rayDirY,
					rayDirZ,
					-halfW,
					halfW,
					-halfH,
					halfH,
					-halfD,
					halfD,
					tMinLimit,
					tMaxLimit,
				);

				if (!aabb.hit || aabb.tNear >= aabb.tFar) {
					// Ray misses skull volume entirely -> stays background color (#09090b)
					continue;
				}

				const tNear = aabb.tNear;
				const tFar = aabb.tFar;
				const rayDist = tFar - tNear;
				const numSteps = Math.max(1, Math.min(maxSteps, Math.ceil(rayDist / nominalStepSize)));
				const dt = rayDist / numSteps;

				let curX = planeX + rayDirX * tNear + halfW;
				let curY = planeY + rayDirY * tNear + halfH;
				let curZ = planeZ + rayDirZ * tNear + halfD;
				const dX = rayDirX * dt;
				const dY = rayDirY * dt;
				const dZ = rayDirZ * dt;

				let hit = false;
				let maxHU = -1000;
				let hitDepth = 0;
				let nx = 0;
				let ny = 0;
				let nz = 0;

				for (let step = 0; step < numSteps; step++) {
					// 3D Volume Clipping Box check (normalized UVW [0, 1])
					const normX = curX / dimW;
					const normY = curY / dimH;
					const normZ = curZ / dimD;
					if (
						normX < clipping.clipMin[0] || normX > clipping.clipMax[0] ||
						normY < clipping.clipMin[1] || normY > clipping.clipMax[1] ||
						normZ < clipping.clipMin[2] || normZ > clipping.clipMax[2]
					) {
						curX += dX;
						curY += dY;
						curZ += dZ;
						continue;
					}

					const vx = curX | 0;
					const vy = curY | 0;
					const vz = curZ | 0;

					if (vx >= 0 && vx < dimW && vy >= 0 && vy < dimH && vz >= 0 && vz < dimD) {
						const idx = vz * sliceSize + vy * dimW + vx;
						const hu = data[idx] ?? -1000;

						if (preset.id === "mip") {
							if (hu > maxHU) {
								maxHU = hu;
								// Early ray termination: maximum enamel/metal threshold reached (> 2500 HU)
								if (maxHU >= 2500 || maxHU >= huMax) {
									break;
								}
							}
						} else if (hu >= huMin) {
							// Hit skull bone surface: early ray termination with bisection refinement
							hit = true;
							hitDepth = (step + 1) / numSteps;

							let hitX = curX;
							let hitY = curY;
							let hitZ = curZ;

							if (!isInteracting) {
								let p0X = curX - dX;
								let p0Y = curY - dY;
								let p0Z = curZ - dZ;
								let p1X = curX;
								let p1Y = curY;
								let p1Z = curZ;

								for (let b = 0; b < 4; b++) {
									const pmX = (p0X + p1X) * 0.5;
									const pmY = (p0Y + p1Y) * 0.5;
									const pmZ = (p0Z + p1Z) * 0.5;
									const bvx = Math.max(0, Math.min(dimW - 1, pmX | 0));
									const bvy = Math.max(0, Math.min(dimH - 1, pmY | 0));
									const bvz = Math.max(0, Math.min(dimD - 1, pmZ | 0));
									const bhu = data[bvz * sliceSize + bvy * dimW + bvx] ?? -1000;
									if (bhu >= huMin) {
										p1X = pmX; p1Y = pmY; p1Z = pmZ;
									} else {
										p0X = pmX; p0Y = pmY; p0Z = pmZ;
									}
								}
								hitX = (p0X + p1X) * 0.5;
								hitY = (p0Y + p1Y) * 0.5;
								hitZ = (p0Z + p1Z) * 0.5;
							}

							const vxP = Math.min(dimW - 1, (hitX | 0) + 2);
							const vxM = Math.max(0, (hitX | 0) - 2);
							const vyP = Math.min(dimH - 1, (hitY | 0) + 2);
							const vyM = Math.max(0, (hitY | 0) - 2);
							const vzP = Math.min(dimD - 1, (hitZ | 0) + 2);
							const vzM = Math.max(0, (hitZ | 0) - 2);

							const hvy = (hitY | 0);
							const hvz = (hitZ | 0);
							const hvx = (hitX | 0);
							const zOff = hvz * sliceSize;
							const yOff = hvy * dimW;

							const gx = (data[zOff + yOff + vxP] ?? hu) - (data[zOff + yOff + vxM] ?? hu);
							const gy = (data[zOff + vyP * dimW + hvx] ?? hu) - (data[zOff + vyM * dimW + hvx] ?? hu);
							const gz = (data[vzP * sliceSize + yOff + hvx] ?? hu) - (data[vzM * sliceSize + yOff + hvx] ?? hu);

							const gLen = Math.hypot(gx, gy, gz) || 1;
							// Outward surface normal points toward lower density (-grad)
							nx = -gx / gLen;
							ny = -gy / gLen;
							nz = -gz / gLen;
							// Ensure normal faces camera
							if (nx * (-rayDirX) + ny * (-rayDirY) + nz * (-rayDirZ) < 0) {
								nx = -nx;
								ny = -ny;
								nz = -nz;
							}
							break;
						}
					}

					curX += dX;
					curY += dY;
					curZ += dZ;
				}

				let r = 0;
				let g = 0;
				let b = 0;
				let a = 0;

				if (preset.id === "mip") {
					if (maxHU > huMin) {
						const norm = Math.max(0, Math.min(1, (maxHU - huMin) / (huMax - huMin)));
						r = (baseR * norm) | 0;
						g = (baseG * norm) | 0;
						b = (baseB * norm) | 0;
						a = 255;
					}
				} else if (hit) {
					// Clinical Anatomical Phong Shading: Ambient + Lambert Diffuse + Enamel Specular + Rim
					const viewDirX = -rayDirX;
					const viewDirY = -rayDirY;
					const viewDirZ = -rayDirZ;

					const lVecX = viewDirX * 0.82 + m00 * 0.35 + m01 * 0.45;
					const lVecY = viewDirY * 0.82 + m10 * 0.35 + m11 * 0.45;
					const lVecZ = viewDirZ * 0.82 + m20 * 0.35 + m21 * 0.45;
					const lLen = Math.hypot(lVecX, lVecY, lVecZ) || 1;
					const nlx = lVecX / lLen;
					const nly = lVecY / lLen;
					const nlz = lVecZ / lLen;

					const NdotL = Math.max(0, nx * nlx + ny * nly + nz * nlz);
					const ambient = 0.32;
					const diff = NdotL * 0.68;
					const depthFade = 1.0 - hitDepth * 0.15;

					const hx = nlx + viewDirX;
					const hy = nly + viewDirY;
					const hz = nlz + viewDirZ;
					const hLen = Math.hypot(hx, hy, hz) || 1;
					const NdotH = Math.max(0, nx * (hx / hLen) + ny * (hy / hLen) + nz * (hz / hLen));
					const spec = Math.pow(NdotH, 32.0) * 0.35;

					const NdotV = Math.max(0, nx * viewDirX + ny * viewDirY + nz * viewDirZ);
					const rim = Math.pow(1.0 - NdotV, 3.0) * 0.18;

					const shade = ambient + diff * depthFade + rim;
					r = Math.min(255, Math.max(0, (baseR * shade + 255 * spec) | 0));
					g = Math.min(255, Math.max(0, (baseG * shade + 250 * spec) | 0));
					b = Math.min(255, Math.max(0, (baseB * shade + 235 * spec) | 0));
					a = 255;
				}

				if (a > 0) {
					const colorU32 = (a << 24) | (b << 16) | (g << 8) | r;
					if (canvas2dSubSample === 1) {
						u32[py * width + px] = colorU32;
					} else {
						for (let sy = 0; sy < canvas2dSubSample && py + sy < height; sy++) {
							const rowOffset = (py + sy) * width;
							for (let sx = 0; sx < canvas2dSubSample && px + sx < width; sx++) {
								u32[rowOffset + px + sx] = colorU32;
							}
						}
					}
				}
			}
		}

		ctx.putImageData(imgData, 0, 0);
	}, [volume, activePreset, yaw, pitch, zoom, pan, canvasDims, isInteracting, clipping]);

	const activePresetSpec = CBCT_VOLUME_3D_PRESETS.find((p) => p.id === activePreset) ?? CBCT_VOLUME_3D_PRESETS[0]!;

	return (
		<div
			onDoubleClick={onDoubleClick}
			onPointerDownCapture={onPointerDownCapture}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			className={`relative bg-black rounded-md overflow-hidden transition-all min-h-0 w-full h-full select-none ${
				isActive
					? "ring-1 ring-cyan-500/50 border border-cyan-500/80 shadow-cyan-950/30"
					: "border border-cyan-500/30 hover:border-cyan-500/60"
			} ${extraClassName}`}
			data-testid="cbct-viewport-container-volume3d"
		>
			{/* TOP HEADER CONTROLS */}
			<div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-auto z-20 gap-2">
				{/* Left: Switcher slot (3D Объем vs Панорама ОПТГ) */}
				{switcherSlot}

				{/* Right: Presets, Angles & Reset */}
				<div className="flex items-center gap-1 bg-zinc-950/80 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-zinc-800 shadow-md">
					{/* Preset Selector Chips */}
					<div className="flex items-center gap-1">
						{CBCT_VOLUME_3D_PRESETS.map((p) => {
							const isSelected = p.id === activePreset;
							return (
								<button
									key={p.id}
									type="button"
									onClick={() => setActivePreset(p.id)}
									title={`${p.label}: ${p.description} (${p.huMin}..${p.huMax} HU)`}
									className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
										isSelected
											? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold"
											: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
									}`}
									data-testid={`cbct-preset-chip-${p.id}`}
								>
									{p.shortLabel}
								</button>
							);
						})}
					</div>

					<div className="w-[1px] h-3.5 bg-zinc-800 mx-0.5" />

					{/* Orthogonal Angle Shortcuts */}
					<button
						type="button"
						onClick={() => handleSetOrientation("coronal")}
						title="Фронтальная проекция (Фас / Coronal)"
						className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
						data-testid="cbct-btn-orientation-coronal"
					>
						Фас
					</button>
					<button
						type="button"
						onClick={() => handleSetOrientation("sagittal")}
						title="Сагиттальная проекция (Профиль / Sagittal)"
						className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
						data-testid="cbct-btn-orientation-sagittal"
					>
						Профиль
					</button>
					<button
						type="button"
						onClick={() => handleSetOrientation("isometric")}
						title="Ракурс 3/4 (Изометрия челюсти)"
						className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
						data-testid="cbct-btn-orientation-isometric"
					>
						3/4
					</button>

					<div className="w-[1px] h-3.5 bg-zinc-800 mx-0.5" />

					{/* Clipping Box Toggle Button */}
					<button
						type="button"
						onClick={() => setIsClippingOpen((prev) => !prev)}
						title="Отсечение 3D объема черепа (шейные позвонки, затылок, корональный срез)"
						className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
							isClippingOpen || hasActiveClipping
								? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold"
								: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
						}`}
						data-testid="cbct-btn-toggle-clipping"
						aria-label="Срезы черепа"
					>
						<Scissors className="w-3 h-3" />
						<span>Срезы</span>
						{hasActiveClipping && (
							<span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
						)}
					</button>

					<div className="w-[1px] h-3.5 bg-zinc-800 mx-0.5" />

					{/* Reset 3D Camera Button */}
					<button
						type="button"
						onClick={handleResetCamera}
						title="Сбросить положение камеры 3D объема"
						className="p-1 rounded text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800 transition-colors cursor-pointer"
						data-testid="cbct-btn-reset-3d-camera"
						aria-label="Сброс камеры 3D"
					>
						<RotateCcw className="w-3 h-3" />
					</button>

					{/* Maximize / Restore Button */}
					{onToggleMaximize && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onToggleMaximize();
							}}
							title={isMaximized ? "Свернуть в сетку (Esc)" : "Развернуть 3D объем на весь экран"}
							className="p-1 rounded text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800 transition-colors cursor-pointer"
							data-testid="cbct-btn-toggle-maximize-3d"
							aria-label={isMaximized ? "Свернуть 3D" : "Развернуть 3D"}
						>
							{isMaximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
						</button>
					)}
				</div>
			</div>

			{/* INTERACTIVE CLIPPING BOX CONTROLS PANEL */}
			{isClippingOpen && (
				<div
					className="absolute top-10 right-2 z-30 bg-zinc-950/95 backdrop-blur-md p-2.5 rounded-md border border-zinc-800/90 shadow-2xl text-[11px] w-64 flex flex-col gap-2.5 select-none pointer-events-auto"
					data-testid="cbct-clipping-box-panel"
				>
					<div className="flex items-center justify-between pb-1 border-b border-zinc-800/80">
						<span className="font-semibold text-zinc-200 flex items-center gap-1 text-[11px]">
							<Scissors className="w-3 h-3 text-cyan-400" />
							Отсечение 3D черепа
						</span>
						<button
							type="button"
							onClick={handleResetClipping}
							title="Сбросить все срезы черепа"
							className="text-[10px] text-zinc-400 hover:text-cyan-300 underline cursor-pointer"
							data-testid="cbct-btn-reset-clipping"
						>
							Сброс срезов
						</button>
					</div>

					{/* Quick Preset Buttons */}
					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={handleQuickClipSpine}
							title="Срез позвонков: срез шейного отдела позвоночника (Z-min = 28%)"
							className={`flex-1 px-1.5 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer border text-center ${
								clipping.clipMin[2] >= 0.2
									? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold"
									: "bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800 hover:text-white"
							}`}
							data-testid="cbct-btn-clip-spine"
						>
							Срез позвонков
						</button>
						<button
							type="button"
							onClick={handleQuickClipOcciput}
							title="Срез затылка: отсечение затылочной кости (Y-max = 72%)"
							className={`flex-1 px-1.5 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer border text-center ${
								clipping.clipMax[1] <= 0.8
									? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold"
									: "bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800 hover:text-white"
							}`}
							data-testid="cbct-btn-clip-occiput"
						>
							Срез затылка
						</button>
					</div>

					{/* Slider 1: Срез позвонков (Z-min) */}
					<div className="flex flex-col gap-1">
						<div className="flex justify-between items-center text-[10px]">
							<span className="text-zinc-300 font-medium">Срез позвонков (Z-min)</span>
							<span className="font-mono text-cyan-300">{Math.round(clipping.clipMin[2] * 100)}%</span>
						</div>
						<input
							type="range"
							min={0}
							max={70}
							step={1}
							value={Math.round(clipping.clipMin[2] * 100)}
							onPointerDown={() => setIsInteracting(true)}
							onPointerUp={() => setIsInteracting(false)}
							onChange={(e) => handleClipChange("zMin", Number(e.target.value) / 100)}
							className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
							data-testid="cbct-clip-slider-z-min"
							aria-label="Срез позвонков (Z-min)"
						/>
					</div>

					{/* Slider 2: Срез затылка (Y-max) */}
					<div className="flex flex-col gap-1">
						<div className="flex justify-between items-center text-[10px]">
							<span className="text-zinc-300 font-medium">Срез затылка (Y-max)</span>
							<span className="font-mono text-cyan-300">{Math.round(clipping.clipMax[1] * 100)}%</span>
						</div>
						<input
							type="range"
							min={30}
							max={100}
							step={1}
							value={Math.round(clipping.clipMax[1] * 100)}
							onPointerDown={() => setIsInteracting(true)}
							onPointerUp={() => setIsInteracting(false)}
							onChange={(e) => handleClipChange("yMax", Number(e.target.value) / 100)}
							className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
							data-testid="cbct-clip-slider-y-max"
							aria-label="Срез затылка (Y-max)"
						/>
					</div>

					{/* Slider 3: Корональный срез (X) */}
					<div className="flex flex-col gap-1">
						<div className="flex justify-between items-center text-[10px]">
							<span className="text-zinc-300 font-medium">Корональный срез (X)</span>
							<span className="font-mono text-cyan-300">{Math.round(clipping.clipMax[0] * 100)}%</span>
						</div>
						<input
							type="range"
							min={20}
							max={100}
							step={1}
							value={Math.round(clipping.clipMax[0] * 100)}
							onPointerDown={() => setIsInteracting(true)}
							onPointerUp={() => setIsInteracting(false)}
							onChange={(e) => handleClipChange("xMax", Number(e.target.value) / 100)}
							className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
							data-testid="cbct-clip-slider-x"
							aria-label="Корональный срез (X)"
						/>
					</div>
				</div>
			)}

			{/* INTERACTIVE 3D SKULL CANVAS */}
			<div className="flex-1 flex items-center justify-center min-h-0 relative w-full h-full">
				<canvas
					ref={canvasRef}
					onMouseDown={handleMouseDown}
					onMouseMove={handleMouseMove}
					onMouseUp={handleMouseUp}
					onMouseLeave={handleMouseUp}
					onWheel={handleWheel}
					onTouchStart={handleTouchStart}
					onTouchMove={handleTouchMove}
					onTouchEnd={handleTouchEnd}
					onTouchCancel={handleTouchEnd}
					onContextMenu={(e) => e.preventDefault()}
					className="absolute inset-0 w-full h-full object-contain cursor-grab active:cursor-grabbing z-0"
					data-testid="cbct-volume-3d-canvas"
				/>
			</div>

			{/* BOTTOM TELEMETRY HUD BAR */}
			<div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-zinc-400 bg-zinc-950/75 backdrop-blur-md px-2.5 py-1 rounded-md border border-zinc-800/80 pointer-events-none z-20">
				<div className="flex items-center gap-2">
					<span className="flex items-center gap-1 text-cyan-400 font-bold">
						<Compass className="w-3 h-3" />
						<span>3D Объем: {activePresetSpec.label}</span>
					</span>
					{volume && (
						<span className="hidden sm:inline text-zinc-400 font-mono">
							({volume.dimensions.width}×{volume.dimensions.height}×{volume.dimensions.depth} • {volume.spacingMm.x.toFixed(2)} мм)
						</span>
					)}
				</div>

				<div className="flex items-center gap-3">
					<span className="hidden md:inline text-zinc-400 font-mono">
						Yaw: {Math.round(yaw)}° • Pitch: {Math.round(pitch)}° • Зум: {zoom.toFixed(1)}x
					</span>
					<span className="hidden lg:inline text-zinc-400">
						Вращение: ЛКМ • Зум: Колесико • Панорама: ПКМ
					</span>
					{hasActiveClipping && (
						<span
							className="text-amber-400 font-semibold font-mono flex items-center gap-1"
							title="Активно 3D отсечение объема черепа"
							data-testid="cbct-hud-clipping-indicator"
						>
							<Scissors className="w-2.5 h-2.5" />
							<span>Срез</span>
						</span>
					)}
					<span className="text-cyan-300 font-bold font-mono">
						HU {activePresetSpec.huMin}..{activePresetSpec.huMax}
					</span>
				</div>
			</div>
		</div>
	);
};
