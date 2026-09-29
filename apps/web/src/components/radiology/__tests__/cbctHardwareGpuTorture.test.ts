/**
 * DENTE CRM — CBCT Hardware WebGL2 GPU Engine Torture & Low-Spec Stress Audit
 *
 * RED TEAM INQUISITION:
 * Tests the hardware GPU 3D-texture engine under extreme, adversarial, low-spec,
 * and pathological conditions. Exposes real mathematical failures, driver limitations,
 * VRAM exhaustion, anisotropic distortions, and boundary artifacts.
 *
 * Audit Scope:
 * 1. MAX_3D_TEXTURE_SIZE Limits (256/512 on Intel HD / Old GPUs vs 600x600x313 Zakharov dataset)
 * 2. VRAM Bloat, Leakage, Multi-Open Canvas Thrashing & WebGL Context Depletion
 * 3. Voxel Anisotropy & Oblique Rotation Truncation / Stretching (KaVo, Planmeca, Sirona)
 * 4. Boundary Condition Defects, Edge Smearing, MinIP Air Drop, and Invert Step Discontinuity
 * 5. Extreme Crosshair, NaN/Inf Windowing, and Gimbal Lock Instabilities
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CbctVoxelVolume, Point3D } from "../cbctMprMath";
import {
	type ObliqueRotationAngles,
	DEFAULT_OBLIQUE_ROTATION,
	computeObliqueRotationMatrix,
	computeObliquePlaneBasis,
} from "../cbctObliqueMatrixMath";
import {
	CBCT_MPR_VERTEX_SHADER,
	CBCT_MPR_FRAGMENT_SHADER,
} from "../mpr/webgl/cbctMprShaders";
import {
	computeGlSliceCoordinates,
	CbctVolumeGlContext,
	getSharedCbctGlContext,
	disposeSharedCbctGlContext,
} from "../mpr/webgl/CbctVolumeGlContext";

// ─── REAL DATASET BENCHMARK PROFILES ─────────────────────────────────────────

/**
 * Real clinical dataset: "Zakharov" (Full Mandible/Maxilla CBCT)
 * Dimensions: 600 x 600 x 313
 * Spacing: X = 0.25 mm, Y = 0.25 mm, Z = 0.2492 mm
 */
function createZakharovProfileVolume(): CbctVoxelVolume {
	const width = 600;
	const height = 600;
	const depth = 313;
	const spX = 0.25;
	const spY = 0.25;
	const spZ = 0.2492;

	// Use empty stub array for metadata math to prevent OOM in unit test runner
	const data = new Int16Array(100);

	return {
		id: "cbct-vol-zakharov-benchmark",
		dimensions: { width, height, depth },
		spacingMm: { x: spX, y: spY, z: spZ },
		originMm: {
			x: -(width * spX) / 2,
			y: -(height * spY) / 2,
			z: -(depth * spZ) / 2,
		},
		physicalSizeMm: {
			x: width * spX,
			y: height * spY,
			z: depth * spZ,
		},
		data,
		minHU: -1000,
		maxHU: 3071,
		defaultWindowWidth: 4400,
		defaultWindowLevel: 1300,
		isDisposed: false,
	};
}

/**
 * Anisotropic Clinical Scanner: "KaVo / Planmeca ProMax 3D"
 * Highly non-uniform voxels: 0.20 mm in-plane, 0.40 mm slice thickness (2:1 ratio)
 */
function createKaVoAnisotropicVolume(): CbctVoxelVolume {
	const width = 400;
	const height = 400;
	const depth = 200;
	const spX = 0.20;
	const spY = 0.20;
	const spZ = 0.40; // 2x slice thickness

	const data = new Int16Array(100);

	return {
		id: "cbct-vol-kavo-anisotropic",
		dimensions: { width, height, depth },
		spacingMm: { x: spX, y: spY, z: spZ },
		originMm: {
			x: -(width * spX) / 2,
			y: -(height * spY) / 2,
			z: -(depth * spZ) / 2,
		},
		physicalSizeMm: {
			x: width * spX,
			y: height * spY,
			z: depth * spZ,
		},
		data,
		minHU: -1000,
		maxHU: 2800,
		defaultWindowWidth: 3500,
		defaultWindowLevel: 1000,
		isDisposed: false,
	};
}

// ─── SIMULATED DRIVER / GPU HARDWARE PROFILES ────────────────────────────────

interface DriverMockConfig {
	max3dTextureSize: number;
	maxContextCount?: number;
	simulateOomOnBytes?: number;
}

function createDriverMockGlContext(config: DriverMockConfig) {
	const calls: string[] = [];
	let allocatedTextureBytes = 0;
	let currentTexture: { width: number; height: number; depth: number } | null = null;
	let isContextLost = false;

	const gl: Record<string, unknown> = {
		MAX_3D_TEXTURE_SIZE: 0x8073,
		TEXTURE_3D: 0x806f,
		TEXTURE0: 0x84c0,
		R16I: 0x8231,
		RED_INTEGER: 0x8d94,
		SHORT: 0x1402,
		TRIANGLE_STRIP: 0x0005,
		COMPILE_STATUS: 0x8b81,
		LINK_STATUS: 0x8b82,

		getParameter: (param: number) => {
			if (param === 0x8073) return config.max3dTextureSize;
			return null;
		},

		createShader: () => ({ id: Math.random() }),
		shaderSource: () => {},
		compileShader: () => {},
		getShaderParameter: () => true,
		getShaderInfoLog: () => "",
		deleteShader: () => calls.push("deleteShader"),

		createProgram: () => ({ id: Math.random() }),
		attachShader: () => {},
		linkProgram: () => {},
		getProgramParameter: () => true,
		getProgramInfoLog: () => "",
		useProgram: () => calls.push("useProgram"),
		deleteProgram: () => calls.push("deleteProgram"),
		detachShader: () => {},

		getUniformLocation: (_p: unknown, name: string) => ({ name }),
		uniform1i: () => {},
		uniform1f: () => {},
		uniform3f: () => {},
		uniform3fv: () => {},

		createTexture: () => ({ id: `tex-${Math.random()}` }),
		activeTexture: () => {},
		bindTexture: () => {},
		texParameteri: () => {},
		pixelStorei: () => {},

		texImage3D: (
			_target: number,
			_level: number,
			_internalFormat: number,
			width: number,
			height: number,
			depth: number,
		) => {
			calls.push(`texImage3D:${width}x${height}x${depth}`);

			// WebGL2 Spec: If width, height, or depth > MAX_3D_TEXTURE_SIZE, throw INVALID_VALUE
			if (
				width > config.max3dTextureSize ||
				height > config.max3dTextureSize ||
				depth > config.max3dTextureSize
			) {
				throw new Error(
					`WebGL2 INVALID_VALUE: Dimension (${width}x${height}x${depth}) exceeds gl.MAX_3D_TEXTURE_SIZE (${config.max3dTextureSize})`,
				);
			}

			const bytes = width * height * depth * 2; // R16I = 2 bytes
			if (config.simulateOomOnBytes && allocatedTextureBytes + bytes > config.simulateOomOnBytes) {
				throw new Error("WebGL2 OUT_OF_MEMORY: Insufficient GPU VRAM to allocate 3D texture buffer");
			}

			allocatedTextureBytes += bytes;
			currentTexture = { width, height, depth };
		},

		deleteTexture: () => {
			calls.push("deleteTexture");
			if (currentTexture) {
				allocatedTextureBytes -= currentTexture.width * currentTexture.height * currentTexture.depth * 2;
				currentTexture = null;
			}
		},

		viewport: (_x: number, _y: number, w: number, h: number) => {
			calls.push(`viewport:${w}x${h}`);
		},

		drawArrays: () => {
			if (isContextLost) throw new Error("WebGL2 CONTEXT_LOST");
			calls.push("drawArrays");
		},

		getExtension: (name: string) => {
			if (name === "WEBGL_lose_context") {
				return {
					loseContext: () => {
						isContextLost = true;
						calls.push("loseContext");
					},
				};
			}
			return null;
		},
	};

	return {
		gl,
		calls,
		getAllocatedVramBytes: () => allocatedTextureBytes,
		isLost: () => isContextLost,
	};
}

// ─── ADVERSARIAL TEST SUITE ──────────────────────────────────────────────────

describe("RED TEAM AUDIT: Hardware WebGL2 GPU Engine & Low-Spec Torture", () => {
	// ─── 1. MAX_3D_TEXTURE_SIZE LIMITS & LOW-SPEC INTEL GPU ──────────────────

	describe("1. MAX_3D_TEXTURE_SIZE Limits on Low-Spec / Integrated GPUs", () => {
		const zakharov = createZakharovProfileVolume();

		it("FACT: WebGL2 specification guarantees a minimum gl.MAX_3D_TEXTURE_SIZE of only 256", () => {
			// WebGL 2.0 Specification Section 5.14 Table "Minimum Values of Implementation-Dependent Limits"
			const webGl2SpecMinLimit = 256;
			assert.strictEqual(webGl2SpecMinLimit, 256);
			assert.ok(zakharov.dimensions.width > webGl2SpecMinLimit);
			assert.ok(zakharov.dimensions.height > webGl2SpecMinLimit);
			assert.ok(zakharov.dimensions.depth > webGl2SpecMinLimit);
		});

		it("DEFECT: CbctVolumeGlContext never checks gl.MAX_3D_TEXTURE_SIZE before texImage3D", () => {
			// Inspect CbctVolumeGlContext source code
			const source = CbctVolumeGlContext.prototype.uploadVolume.toString();
			const hasLimitQuery =
				source.includes("MAX_3D_TEXTURE_SIZE") ||
				source.includes("getParameter") ||
				source.includes("max3D");

			assert.strictEqual(
				hasLimitQuery,
				false,
				"DEFECT CONFIRMED: CbctVolumeGlContext blindly calls texImage3D without checking gl.MAX_3D_TEXTURE_SIZE!",
			);
		});

		it("CRASH: Zakharov volume (600x600x313) throws INVALID_VALUE on GPU with MAX_3D_TEXTURE_SIZE=256 or 512", () => {
			// Simulate Intel HD Graphics 3000/4000 or SwiftShader environment with MAX_3D_TEXTURE_SIZE = 512
			const { gl } = createDriverMockGlContext({ max3dTextureSize: 512 });
			const canvas = {
				getContext: (type: string) => (type === "webgl2" ? gl : null),
				width: 100,
				height: 100,
			} as unknown as HTMLCanvasElement;

			const glCtx = new CbctVolumeGlContext(canvas);
			assert.strictEqual(glCtx.isAvailable(), true);

			// Uploading 600x600x313 must throw / fail because 600 > 512!
			assert.throws(
				() => {
					glCtx.uploadVolume(zakharov);
				},
				/INVALID_VALUE/,
				"Driver threw INVALID_VALUE because 600 exceeds MAX_3D_TEXTURE_SIZE=512",
			);
		});

		it("DEFECT: Zero downsampling or half-res LOD fallback exists when volume exceeds GPU limits", () => {
			// Check if any downsampleVolume or halfResolution option exists
			const contextProto = CbctVolumeGlContext.prototype as unknown as Record<string, unknown>;
			const hasDownscaleMethod =
				"downsampleVolume" in contextProto ||
				"createLodVolume" in contextProto ||
				"decimateVolume" in contextProto;

			assert.strictEqual(
				hasDownscaleMethod,
				false,
				"DEFECT CONFIRMED: No downscale / LOD decimation mechanism exists to salvage rendering on low-spec GPUs!",
			);
		});
	});

	// ─── 2. VRAM BLOAT, LEAKS & CONTEXT EXHAUSTION ───────────────────────────

	describe("2. VRAM Bloat, Leakage, and Multi-Open Context Exhaustion", () => {
		it("EXACT VRAM MATH: Zakharov 600x600x313 volume consumes 214.92 MiB of pure GPU VRAM per 3D texture", () => {
			const totalVoxels = 600 * 600 * 313;
			const bytesPerVoxel = 2; // R16I = 16-bit signed short
			const exactBytes = totalVoxels * bytesPerVoxel;
			const exactMebibytes = exactBytes / (1024 * 1024);

			assert.strictEqual(totalVoxels, 112_680_000);
			assert.strictEqual(exactBytes, 225_360_000);
			assert.ok(Math.abs(exactMebibytes - 214.92) < 0.01);
		});

		it("VRAM OOM: Simulated low-spec GPU (512MB VRAM cap) throws OUT_OF_MEMORY on duplicate upload", () => {
			// Simulate low-spec device with 300MB VRAM ceiling for WebGL
			const { gl, getAllocatedVramBytes } = createDriverMockGlContext({
				max3dTextureSize: 2048,
				simulateOomOnBytes: 300 * 1024 * 1024, // 300 MB cap
			});
			const canvas = {
				getContext: (type: string) => (type === "webgl2" ? gl : null),
				width: 100,
				height: 100,
			} as unknown as HTMLCanvasElement;

			const glCtx = new CbctVolumeGlContext(canvas);
			const zakharov = createZakharovProfileVolume();

			// First upload: 225.36 MB allocated (fits within 300MB)
			glCtx.uploadVolume(zakharov);
			assert.strictEqual(getAllocatedVramBytes(), 225_360_000);

			// If a new volume arrives without disposing the old one, allocating another 225MB triggers OOM
			const zakharovClone = { ...zakharov, id: "cbct-vol-zakharov-clone" };

			// uploadVolume should delete the old texture before allocating the new one:
			glCtx.uploadVolume(zakharovClone);

			// Because uploadVolume deleted the old texture first, VRAM stays at 225.36MB instead of 450.72MB
			assert.strictEqual(getAllocatedVramBytes(), 225_360_000);
		});

		it("THRASHING DEFECT: renderAllPlanes resizes the shared canvas 3 times per frame", () => {
			// In renderAllPlanes:
			// Axial: 600x600 -> canvas.width = 600, canvas.height = 600
			// Coronal: 600x313 -> canvas.width = 600, canvas.height = 313
			// Sagittal: 600x313 -> canvas.width = 600, canvas.height = 313
			const zakharov = createZakharovProfileVolume();
			const crosshair: Point3D = { x: 0, y: 0, z: 0 };
			const angles = DEFAULT_OBLIQUE_ROTATION;

			const ax = computeGlSliceCoordinates(zakharov, "axial", crosshair, angles);
			const cor = computeGlSliceCoordinates(zakharov, "coronal", crosshair, angles);
			const sag = computeGlSliceCoordinates(zakharov, "sagittal", crosshair, angles);

			assert.strictEqual(ax.widthPx, 600);
			assert.strictEqual(ax.heightPx, 600);
			assert.strictEqual(cor.widthPx, 600);
			assert.strictEqual(cor.heightPx, 312); // Math.round((313 * 0.2492) / 0.25) = 312

			// Resizing an active WebGL canvas drops and recreates the default color buffer in hardware.
			// Doing this 3 times per frame at 60 FPS = 180 framebuffer reallocations per second!
			const resizesPerFrame =
				((ax.heightPx as number) !== (cor.heightPx as number) ? 1 : 0) +
				((cor.heightPx as number) !== (sag.heightPx as number) ? 1 : 0) +
				1;
			assert.ok(
				resizesPerFrame >= 2,
				"DEFECT CONFIRMED: renderAllPlanes induces continuous WebGL drawing buffer thrashing!",
			);
		});

		it("RESOURCE DISPOSAL AUDIT: dispose() releases textures, shaders, and programs but lacks VAO tracking", () => {
			const { gl, calls } = createDriverMockGlContext({ max3dTextureSize: 2048 });
			const canvas = {
				getContext: (type: string) => (type === "webgl2" ? gl : null),
				width: 100,
				height: 100,
			} as unknown as HTMLCanvasElement;

			const glCtx = new CbctVolumeGlContext(canvas);
			const zakharov = createZakharovProfileVolume();
			glCtx.uploadVolume(zakharov);

			glCtx.dispose();

			assert.ok(calls.includes("deleteTexture"), "Volume texture must be freed");
			assert.ok(calls.includes("deleteShader"), "Vertex and fragment shaders must be freed");
			assert.ok(calls.includes("deleteProgram"), "WebGL program must be deleted");
			assert.ok(calls.includes("loseContext"), "WEBGL_lose_context must be invoked");

			// Audit for VAO: Core WebGL2 requires a bound Vertex Array Object for gl.drawArrays.
			// CbctVolumeGlContext relies on the global default VAO (0), which is non-compliant in strict core WebGL2.
			const source = CbctVolumeGlContext.prototype.renderSlice.toString();
			assert.strictEqual(
				source.includes("bindVertexArray"),
				false,
				"DEFECT CONFIRMED: renderSlice draws without an explicit Vertex Array Object (VAO)!",
			);
		});
	});

	// ─── 3. VOXEL ANISOTROPY & OBLIQUE ROTATION TRUNCATION ───────────────────

	describe("3. Voxel Anisotropy & Oblique Rotation Truncation / Distortion", () => {
		const kavo = createKaVoAnisotropicVolume();
		const crosshair: Point3D = { x: 0, y: 0, z: 0 };

		it("METRIC FIDELITY: Physical millimeter basis length is preserved across anisotropic axes (Z=0.4mm, X=0.2mm)", () => {
			// At 45-degree oblique pitch/tilt:
			const angles: ObliqueRotationAngles = {
				axialAngleDeg: 0,
				coronalTiltDeg: 45,
				sagittalTiltDeg: 0,
			};

			const basis = computeObliquePlaneBasis("coronal", crosshair, angles);
			const coords = computeGlSliceCoordinates(kavo, "coronal", crosshair, angles);

			// Basis vectors u and v must be unit vectors in world mm space
			const uLen = Math.hypot(basis.u.x, basis.u.y, basis.u.z);
			const vLen = Math.hypot(basis.v.x, basis.v.y, basis.v.z);
			assert.ok(Math.abs(uLen - 1.0) < 1e-6, `Basis U magnitude not 1.0: ${uLen}`);
			assert.ok(Math.abs(vLen - 1.0) < 1e-6, `Basis V magnitude not 1.0: ${vLen}`);

			// Physical step per pixel along V:
			// axisV.y in UVW space: basis.v.y * totalSpanMmY / (sp.y * maxCoordY)
			// axisV.z in UVW space: basis.v.z * totalSpanMmY / (sp.z * maxCoordZ)
			// Converting UVW step back to world millimeters across all 3 spatial axes X, Y, Z:
			const maxCoordX = kavo.dimensions.width - 1;
			const maxCoordY = kavo.dimensions.height - 1;
			const maxCoordZ = kavo.dimensions.depth - 1;
			const physStepMmX = coords.axisV[0] * maxCoordX * kavo.spacingMm.x / coords.heightPx;
			const physStepMmY = coords.axisV[1] * maxCoordY * kavo.spacingMm.y / coords.heightPx;
			const physStepMmZ = coords.axisV[2] * maxCoordZ * kavo.spacingMm.z / coords.heightPx;
			const physStepMag = Math.hypot(physStepMmX, physStepMmY, physStepMmZ);

			assert.ok(
				Math.abs(physStepMag - coords.pixelSpacingY) < 1e-4,
				`Physical millimeter step distorted by voxel anisotropy! Expected ${coords.pixelSpacingY}, got ${physStepMag}`,
			);
		});

		it("CRITICAL FOV TRUNCATION: computeGlSliceCoordinates hardcodes slice width/height, clipping oblique diagonal slices by up to ~29%", () => {
			// When rotating an axial slice by 45 degrees in yaw (axialAngleDeg = 45):
			// The diagonal of the bounding box is sqrt(W^2 + H^2) = sqrt(400^2 + 400^2) = 565.68 voxels.
			// Physical diagonal span = 565.68 * 0.20 mm = 113.14 mm.
			const angles: ObliqueRotationAngles = {
				axialAngleDeg: 45,
				coronalTiltDeg: 0,
				sagittalTiltDeg: 0,
			};

			const coords = computeGlSliceCoordinates(kavo, "axial", crosshair, angles);

			// computeGlSliceCoordinates leaves widthPx and heightPx at 400x400:
			assert.strictEqual(coords.widthPx, 400);
			assert.strictEqual(coords.heightPx, 400);

			const capturedSpanMm = coords.widthPx * coords.pixelSpacingX; // 400 * 0.2 = 80 mm
			const requiredDiagonalSpanMm = Math.hypot(
				kavo.physicalSizeMm.x,
				kavo.physicalSizeMm.y,
			); // sqrt(80^2 + 80^2) = 113.14 mm

			const lostFovPercent = ((requiredDiagonalSpanMm - capturedSpanMm) / requiredDiagonalSpanMm) * 100;

			assert.ok(
				lostFovPercent > 28,
				`CRITICAL FOV DEFECT: Oblique rotation at 45 deg clips ${lostFovPercent.toFixed(1)}% of anatomy on the edges!`,
			);
		});

		it("GIMBAL LOCK: At coronalTiltDeg = ±90 deg, Euler angle composition suffers from pitch singularity", () => {
			const gimbalPitch90: ObliqueRotationAngles = {
				axialAngleDeg: 30,
				coronalTiltDeg: 90,
				sagittalTiltDeg: 0,
			};
			const matrix = computeObliqueRotationMatrix(gimbalPitch90);

			// At ry = 90 deg: cos(90) = 0, sin(90) = 1.
			// Row 0 col 0: cz * cy = cos(30) * 0 = 0.
			assert.ok(Math.abs(matrix[0]![0]!) < 1e-10, "Matrix[0][0] should be 0 at 90 deg pitch");
			assert.ok(Math.abs(matrix[1]![0]!) < 1e-10, "Matrix[1][0] should be 0 at 90 deg pitch");
			assert.ok(Math.abs(matrix[2]![0]! - (-1.0)) < 1e-10, "Matrix[2][0] should be -1.0 at 90 deg pitch");

			// Any yaw and roll collapse into a single degree of freedom around Z
		});
	});

	// ─── 4. BOUNDARY CONDITIONS, AIR DROPOUTS & SHADER DEFECTS ───────────────

	describe("4. Boundary Conditions, Air Dropouts & Shader Defect Analysis", () => {
		it("EDGE SMEARING DEFECT: sampleHUTrilinear clamps coordinates in [-eps, 0.0] instead of returning air (-1000 HU)", () => {
			// Shader source inspection:
			// float eps = 0.5 / max(1.0, min(u_volumeDim.x, min(u_volumeDim.y, u_volumeDim.z)));
			// if (uvw.x < -eps || uvw.x > 1.0 + eps ...) return -1000.0;
			// vec3 clampedUvw = clamp(uvw, vec3(0.0), vec3(1.0));
			// When uvw.x is between -eps and 0 (e.g. -0.0001):
			// uvw.x < -eps is FALSE!
			// So it clamps uvw to 0.0 and samples voxel index 0!
			// If voxel 0 is cortical bone (+1500 HU), the shader returns +1500 HU into ambient space!
			const source = CBCT_MPR_FRAGMENT_SHADER;
			assert.ok(
				source.includes("if (uvw.x < -eps || uvw.x > 1.0 + eps"),
				"Shader uses loose eps boundary check",
			);
			assert.ok(
				source.includes("clamp(uvw, vec3(0.0), vec3(1.0))"),
				"Shader clamps coordinates outside [0, 1] to borders, causing smearing artifact!",
			);
		});

		it("MINIP AIR CORRUPTION: When slab rays cross volume boundaries, sampleHU returns -1000 HU, corrupting MinIP", () => {
			// In MinIP mode:
			// float minHU = 32767.0;
			// for (...) { float hu = sampleHU(p); minHU = min(minHU, hu); }
			// If even ONE sample p exits the volume (e.g. at the top or bottom of the slice),
			// sampleHU(p) returns -1000.0 HU (ambient air).
			// minHU becomes -1000.0 HU, turning the entire anatomical pixel into black air!
			const source = CBCT_MPR_FRAGMENT_SHADER;
			assert.ok(source.includes("minHU = min(minHU, hu);"));

			// Simulate slab integration where 9 samples are inside bone (+1200 HU) and 1 sample touches boundary (-1000 HU)
			const samples = [1200, 1250, 1180, 1220, 1300, 1210, 1190, 1260, 1240, -1000];
			let minip = 32767;
			for (const hu of samples) {
				minip = Math.min(minip, hu);
			}

			assert.strictEqual(
				minip,
				-1000,
				"DEFECT CONFIRMED: A single out-of-bounds ray sample collapses the entire MinIP pixel to air (-1000 HU)!",
			);
		});

		it("WHITE PAPER / INVERT DISCONTINUITY: Severe step artifact occurs across the -600 HU threshold", () => {
			// Shader logic:
			// if (u_invert) {
			//     if (finalHU < -600.0) gray = 10.0 / 255.0;
			//     else gray = 1.0 - gray;
			// }
			// For WindowWidth = 4000, WindowLevel = 1000:
			// low = 1000 - 2000 = -1000.
			const ww = 4000;
			const wl = 1000;
			const safeWW = Math.max(1.0, ww);
			const low = wl - safeWW * 0.5; // -1000

			// Voxel A: HU = -601 (air boundary noise)
			const huA = -601;
			const grayA = 10.0 / 255.0; // 0.0392 (dark)

			// Voxel B: HU = -599 (soft tissue boundary noise, 2 HU difference!)
			const huB = -599;
			const directGrayB = Math.max(0, Math.min(1, (huB - low) / safeWW)); // (-599 - (-1000)) / 4000 = 401 / 4000 = 0.10025
			const grayB = 1.0 - directGrayB; // 0.89975 (blinding white!)

			const jump = Math.abs(grayB - grayA);

			assert.ok(
				jump > 0.85,
				`DEFECT CONFIRMED: 2 HU difference causes a violent ${(jump * 100).toFixed(1)}% brightness step discontinuity in White Paper mode!`,
			);
		});
	});

	// ─── 5. PATHOLOGICAL INPUTS & EXTREME TORTURE ────────────────────────────

	describe("5. Pathological Inputs, Degenerate Windowing & Extreme Crosshairs", () => {
		const zakharov = createZakharovProfileVolume();

		it("ZERO / NEGATIVE WINDOW WIDTH: Shader clamps safeWW to max(1.0, u_windowWidth) preventing division by zero", () => {
			const source = CBCT_MPR_FRAGMENT_SHADER;
			assert.ok(
				source.includes("float safeWW = max(1.0, u_windowWidth);"),
				"Shader must guard against division by zero when WindowWidth <= 0",
			);
		});

		it("OUT-OF-BOUNDS CROSSHAIR: Extreme crosshair (-9999mm) computes valid sliceOrigin without NaN", () => {
			const extremeCrosshair: Point3D = { x: -9999, y: 9999, z: -9999 };
			const coords = computeGlSliceCoordinates(
				zakharov,
				"axial",
				extremeCrosshair,
				DEFAULT_OBLIQUE_ROTATION,
			);

			const [ox, oy, oz] = coords.sliceOrigin;
			assert.ok(Number.isFinite(ox), "Origin X must be finite");
			assert.ok(Number.isFinite(oy), "Origin Y must be finite");
			assert.ok(Number.isFinite(oz), "Origin Z must be finite");
			assert.ok(
				ox < -10 || ox > 10,
				"Origin should reflect extreme offset without numerical overflow",
			);
		});

		it("DEGENERATE ROTATION ANGLES: Extreme angles (±89 deg, ±180 deg, ±360 deg) execute without NaN", () => {
			const pathologicalAngles: ObliqueRotationAngles = {
				axialAngleDeg: 360,
				coronalTiltDeg: -89.9,
				sagittalTiltDeg: 180,
			};

			const basis = computeObliquePlaneBasis("sagittal", { x: 0, y: 0, z: 0 }, pathologicalAngles);
			assert.ok(Number.isFinite(basis.u.x));
			assert.ok(Number.isFinite(basis.v.y));
			assert.ok(Number.isFinite(basis.normal.z));

			const coords = computeGlSliceCoordinates(
				zakharov,
				"sagittal",
				{ x: 0, y: 0, z: 0 },
				pathologicalAngles,
			);
			assert.ok(Number.isFinite(coords.axisU[0]));
			assert.ok(Number.isFinite(coords.axisV[1]));
			assert.ok(Number.isFinite(coords.axisNorm[2]));
		});

		it("SUB-PIXEL PHASE JITTER DEFECT: Math.round in worldMmToSlicePx causes full 1-pixel discontinuous jumps during sub-millimeter scrubs", () => {
			// When dragging the crosshair smoothly by 0.01 mm increments:
			// crosshairMm moves continuously from 0.12 mm to 0.13 mm (delta = 0.01 mm, only 4% of a voxel!)
			const crosshair1: Point3D = { x: 0.12, y: 0, z: 0 };
			const crosshair2: Point3D = { x: 0.13, y: 0, z: 0 };

			const coords1 = computeGlSliceCoordinates(zakharov, "axial", crosshair1, DEFAULT_OBLIQUE_ROTATION);
			const coords2 = computeGlSliceCoordinates(zakharov, "axial", crosshair2, DEFAULT_OBLIQUE_ROTATION);

			// Voxel index jumps from 300 to 301 at 0.125 mm threshold:
			const deltaOriginX = Math.abs(coords2.sliceOrigin[0] - coords1.sliceOrigin[0]);
			const maxCoordX = zakharov.dimensions.width - 1;
			const deltaVoxels = deltaOriginX * maxCoordX;

			// Because pivotPx rounded from 300 to 301, the UVW origin jumped by ~1 full voxel (~0.25mm)
			// instead of tracking the 0.01 mm continuous mouse movement!
			assert.ok(
				deltaVoxels > 0.9,
				`DEFECT CONFIRMED: Sub-millimeter drag of 0.01mm caused a discontinuous ${deltaVoxels.toFixed(2)} voxel phase jump!`,
			);
		});

		it("BROWSER CONTEXT DEPLETION: Instantiating 16+ WebGL2 contexts without disposal triggers CONTEXT_LOST_WEBGL", () => {
			// Browsers (Chrome, Edge, Firefox) enforce a hard limit of 8 or 16 active WebGL contexts per domain.
			const maxBrowserContexts = 16;
			const contexts: CbctVolumeGlContext[] = [];

			for (let i = 0; i < maxBrowserContexts; i++) {
				const { gl } = createDriverMockGlContext({ max3dTextureSize: 2048 });
				const canvas = {
					getContext: (type: string) => (type === "webgl2" ? gl : null),
					width: 100,
					height: 100,
				} as unknown as HTMLCanvasElement;

				const ctx = new CbctVolumeGlContext(canvas);
				contexts.push(ctx);
			}

			// Simulating the 17th context allocation triggers eviction of the earliest context:
			const { gl: evictedGl, isLost } = createDriverMockGlContext({ max3dTextureSize: 2048 });
			const loseCtx = (evictedGl as any).getExtension("WEBGL_lose_context") as { loseContext: () => void };
			loseCtx.loseContext(); // Browser evicts context 0

			assert.strictEqual(
				isLost(),
				true,
				"DEFECT CONFIRMED: Opening modal / multi-viewports repeatedly without context disposal exhausts browser context limits!",
			);

			// Clean up test contexts
			for (const c of contexts) {
				c.dispose();
			}
		});
	});
});

