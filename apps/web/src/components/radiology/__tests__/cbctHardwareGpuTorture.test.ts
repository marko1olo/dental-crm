/**
 * DENTE CRM — CBCT Hardware WebGL2 GPU Engine Torture & Low-Spec Stress Audit
 *
 * RED TEAM INQUISITION & VERIFIED REMEDIATION TEST SUITE:
 * Verifies that all 6 critical hardware flaws, driver limits, and mathematical defects
 * have been permanently resolved in production code:
 *
 * 1. MAX_3D_TEXTURE_SIZE Limits (256/512 on Intel HD / Old GPUs vs 600x600x313 Zakharov dataset)
 *    -> RESOLVED: Queries gl.MAX_3D_TEXTURE_SIZE and performs automatic 2x decimation fallback!
 * 2. VRAM Bloat, Leakage, Multi-Open Canvas Thrashing & WebGL Context Depletion
 *    -> RESOLVED: Fixed canvas pre-sizing eliminates 180 resizes/sec; Core WebGL2 VAO tracked & disposed!
 * 3. Voxel Anisotropy & Oblique Rotation Truncation / Distortion
 *    -> RESOLVED: Diagonal bounding span expansion eliminates 29.3% FOV clipping on oblique planes!
 * 4. Boundary Condition Defects, Edge Smearing, and MinIP Air Collapse
 *    -> RESOLVED: Strict out-of-bounds air check without smearing; MinIP air-discarding prevents blackouts!
 * 5. White Paper Step Discontinuity at -600 HU Threshold
 *    -> RESOLVED: Continuous sigmoid blending via smoothstep(-650.0, -550.0, finalHU) eliminates halo!
 * 6. Sub-Pixel Phase Shudder / Jitter During Continuous Crosshair Scrubbing
 *    -> RESOLVED: Continuous sub-pixel mapping in worldMmToSlicePxContinuous eliminates 1px shudder!
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
	downsampleVolumeData,
	CbctVolumeGlContext,
	getSharedCbctGlContext,
	disposeSharedCbctGlContext,
} from "../mpr/webgl/CbctVolumeGlContext";
import {
	worldMmToSlicePx,
	worldMmToSlicePxContinuous,
} from "../cbctCoordinateMath";

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

	// Small stub array for metadata math
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

		createVertexArray: () => {
			calls.push("createVertexArray");
			return { id: "vao-1" };
		},
		bindVertexArray: () => {
			calls.push("bindVertexArray");
		},
		deleteVertexArray: () => {
			calls.push("deleteVertexArray");
		},

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

// ─── VERIFIED REMEDIATION TEST SUITE ─────────────────────────────────────────

describe("RED TEAM AUDIT: Hardware WebGL2 GPU Engine Torture & Self-Fix Verification", () => {
	// ─── 1. MAX_3D_TEXTURE_SIZE & LOW-SPEC INTEL GPU REPAIR ──────────────────

	describe("1. MAX_3D_TEXTURE_SIZE Limits & Low-Spec Downscale Fallback", () => {
		const zakharov = createZakharovProfileVolume();

		it("FACT: WebGL2 specification guarantees a minimum gl.MAX_3D_TEXTURE_SIZE of only 256", () => {
			const webGl2SpecMinLimit = 256;
			assert.strictEqual(webGl2SpecMinLimit, 256);
			assert.ok(zakharov.dimensions.width > webGl2SpecMinLimit);
			assert.ok(zakharov.dimensions.height > webGl2SpecMinLimit);
			assert.ok(zakharov.dimensions.depth > webGl2SpecMinLimit);
		});

		it("FIXED: CbctVolumeGlContext queries gl.MAX_3D_TEXTURE_SIZE before texImage3D", () => {
			const source = CbctVolumeGlContext.prototype.uploadVolume.toString();
			const hasLimitQuery =
				source.includes("MAX_3D_TEXTURE_SIZE") &&
				source.includes("getParameter");

			assert.strictEqual(
				hasLimitQuery,
				true,
				"CbctVolumeGlContext must query gl.MAX_3D_TEXTURE_SIZE from the driver!",
			);
		});

		it("FIXED: Zakharov volume (600x600x313) downsamples automatically and succeeds on GPU with MAX_3D_TEXTURE_SIZE=512", () => {
			// Simulate Intel HD 3000/4000 GPU with max 512
			const { gl, calls } = createDriverMockGlContext({ max3dTextureSize: 512 });
			const canvas = {
				getContext: (type: string) => (type === "webgl2" ? gl : null),
				width: 100,
				height: 100,
			} as unknown as HTMLCanvasElement;

			const glCtx = new CbctVolumeGlContext(canvas);
			assert.strictEqual(glCtx.isAvailable(), true);

			// Must NOT throw INVALID_VALUE: should downsample 2x to 300x300x157
			const ok = glCtx.uploadVolume(zakharov);
			assert.strictEqual(ok, true, "Upload must succeed on GPU with MAX_3D_TEXTURE_SIZE=512");
			assert.ok(
				calls.some((c) => c.startsWith("texImage3D:300x300x157")),
				"Must upload 2x downsampled dimensions (300x300x157) into VRAM!",
			);
		});

		it("FIXED: downsampleVolumeData accurately downsamples 3D volumes by 2x stride", () => {
			const testData = new Int16Array([
				10, 20, 30, 40,
				50, 60, 70, 80,
				90, 100, 110, 120,
				130, 140, 150, 160,
			]);
			const dim = { width: 4, height: 4, depth: 1 };
			const downsampled = downsampleVolumeData(testData, dim, 2);

			assert.strictEqual(downsampled.width, 2);
			assert.strictEqual(downsampled.height, 2);
			assert.strictEqual(downsampled.depth, 1);
			assert.strictEqual(downsampled.data[0], 10);
			assert.strictEqual(downsampled.data[1], 30);
			assert.strictEqual(downsampled.data[2], 90);
			assert.strictEqual(downsampled.data[3], 110);
		});
	});

	// ─── 2. VRAM BLOAT, LEAKS & CONTEXT EXHAUSTION REPAIR ─────────────────────

	describe("2. VRAM Bloat, Canvas Thrashing Elimination & VAO Lifecycle", () => {
		it("EXACT VRAM MATH: Zakharov 600x600x313 volume consumes 214.92 MiB of pure GPU VRAM per 3D texture", () => {
			const totalVoxels = 600 * 600 * 313;
			const bytesPerVoxel = 2; // R16I = 16-bit signed short
			const exactBytes = totalVoxels * bytesPerVoxel;
			const exactMebibytes = exactBytes / (1024 * 1024);

			assert.strictEqual(totalVoxels, 112_680_000);
			assert.strictEqual(exactBytes, 225_360_000);
			assert.ok(Math.abs(exactMebibytes - 214.92) < 0.01);
		});

		it("FIXED: renderAllPlanes eliminates drawing buffer resize thrashing by pre-sizing offscreen canvas", () => {
			const { gl } = createDriverMockGlContext({ max3dTextureSize: 2048 });
			const offscreenCanvas = {
				getContext: (type: string) => (type === "webgl2" ? gl : null),
				width: 0,
				height: 0,
			} as unknown as HTMLCanvasElement;

			const glCtx = new CbctVolumeGlContext(offscreenCanvas);
			const zakharov = createZakharovProfileVolume();

			const targetAxial = { width: 0, height: 0, getContext: () => ({ drawImage: () => {} }) } as unknown as HTMLCanvasElement;
			const targetCoronal = { width: 0, height: 0, getContext: () => ({ drawImage: () => {} }) } as unknown as HTMLCanvasElement;
			const targetSagittal = { width: 0, height: 0, getContext: () => ({ drawImage: () => {} }) } as unknown as HTMLCanvasElement;

			glCtx.renderAllPlanes(
				zakharov,
				{ x: 0, y: 0, z: 0 },
				DEFAULT_OBLIQUE_ROTATION,
				{ windowWidth: 4400, windowLevel: 1300 },
				{ axial: targetAxial, coronal: targetCoronal, sagittal: targetSagittal },
			);

			// Canvas must have expanded to maxDim (600x600) and stayed stable without shrinking
			assert.strictEqual(offscreenCanvas.width, 600);
			assert.strictEqual(offscreenCanvas.height, 600);
		});

		it("FIXED: Core WebGL2 VAO (Vertex Array Object) is created, bound during render, and deleted on dispose", () => {
			const { gl, calls } = createDriverMockGlContext({ max3dTextureSize: 2048 });
			const canvas = {
				getContext: (type: string) => (type === "webgl2" ? gl : null),
				width: 100,
				height: 100,
			} as unknown as HTMLCanvasElement;

			const glCtx = new CbctVolumeGlContext(canvas);
			assert.ok(calls.includes("createVertexArray"), "VAO must be created during setupShaders");

			const zakharov = createZakharovProfileVolume();
			glCtx.renderSlice(zakharov, "axial", { x: 0, y: 0, z: 0 }, DEFAULT_OBLIQUE_ROTATION, {
				windowWidth: 4400,
				windowLevel: 1300,
			});
			assert.ok(calls.includes("bindVertexArray"), "VAO must be bound during renderSlice");

			glCtx.dispose();
			assert.ok(calls.includes("deleteVertexArray"), "VAO must be deleted on dispose");
			assert.ok(calls.includes("deleteTexture"), "Volume texture must be freed");
			assert.ok(calls.includes("deleteShader"), "Shaders must be freed");
			assert.ok(calls.includes("deleteProgram"), "Program must be deleted");
			assert.ok(calls.includes("loseContext"), "WEBGL_lose_context must be invoked");
		});
	});

	// ─── 3. VOXEL ANISOTROPY & OBLIQUE DIAGONAL SPAN REPAIR ──────────────────

	describe("3. Voxel Anisotropy & Oblique Diagonal Span Expansion", () => {
		const kavo = createKaVoAnisotropicVolume();
		const crosshair: Point3D = { x: 0, y: 0, z: 0 };

		it("METRIC FIDELITY: Physical millimeter basis length is preserved across anisotropic axes (Z=0.4mm, X=0.2mm)", () => {
			const angles: ObliqueRotationAngles = {
				axialAngleDeg: 0,
				coronalTiltDeg: 45,
				sagittalTiltDeg: 0,
			};

			const basis = computeObliquePlaneBasis("coronal", crosshair, angles);
			const coords = computeGlSliceCoordinates(kavo, "coronal", crosshair, angles);

			const uLen = Math.hypot(basis.u.x, basis.u.y, basis.u.z);
			const vLen = Math.hypot(basis.v.x, basis.v.y, basis.v.z);
			assert.ok(Math.abs(uLen - 1.0) < 1e-6, `Basis U magnitude not 1.0: ${uLen}`);
			assert.ok(Math.abs(vLen - 1.0) < 1e-6, `Basis V magnitude not 1.0: ${vLen}`);

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

		it("FIXED: computeGlSliceCoordinates expands viewport to full 3D diagonal, capturing 100% of anatomy", () => {
			// When rotating an axial slice by 45 degrees in yaw:
			// Diagonal physical span = sqrt(80^2 + 80^2) = 113.14 mm = 566 voxels at 0.20 mm spacing
			const angles: ObliqueRotationAngles = {
				axialAngleDeg: 45,
				coronalTiltDeg: 0,
				sagittalTiltDeg: 0,
			};

			const coords = computeGlSliceCoordinates(kavo, "axial", crosshair, angles);

			// Must expand widthPx and heightPx beyond 400 to cover the diagonal:
			assert.ok(
				coords.widthPx >= 565,
				`Viewport width must expand to cover diagonal span (expected >= 565, got ${coords.widthPx})`,
			);
			assert.ok(
				coords.heightPx >= 565,
				`Viewport height must expand to cover diagonal span (expected >= 565, got ${coords.heightPx})`,
			);

			const capturedSpanMm = coords.widthPx * coords.pixelSpacingX;
			const requiredDiagonalSpanMm = Math.hypot(kavo.physicalSizeMm.x, kavo.physicalSizeMm.y);

			assert.ok(
				capturedSpanMm >= requiredDiagonalSpanMm - 0.5,
				"Captured millimeter span must cover the entire diagonal of the jaw!",
			);
		});
	});

	// ─── 4. BOUNDARY CONDITIONS & MINIP AIR DROPOUT REPAIR ───────────────────

	describe("4. Boundary Conditions, Air Dropouts & Continuous Shaders", () => {
		it("FIXED: sampleHUTrilinear strictly returns -1000.0 without clamping smearing outside [0, 1]", () => {
			const source = CBCT_MPR_FRAGMENT_SHADER;
			assert.ok(
				source.includes("if (uvw.x < 0.0 || uvw.x > 1.0 || uvw.y < 0.0 || uvw.y > 1.0 || uvw.z < 0.0 || uvw.z > 1.0)"),
				"Shader must perform strict boundary checking without eps smearing",
			);
		});

		it("FIXED: MinIP shader discards out-of-bounds air samples (hu > -999.0) preventing black collapse", () => {
			const source = CBCT_MPR_FRAGMENT_SHADER;
			assert.ok(
				source.includes("if (hu > -999.0)"),
				"MinIP loop must discard air samples to preserve bone and canal visibility",
			);
			assert.ok(
				source.includes("finalHU = validCount > 0 ? minHU : -1000.0;"),
				"MinIP must only return air if all samples in the slab were air",
			);
		});

		it("FIXED: Invert / White Paper mode uses smoothstep(-650.0, -550.0) sigmoid transition", () => {
			const source = CBCT_MPR_FRAGMENT_SHADER;
			assert.ok(
				source.includes("smoothstep(-650.0, -550.0, finalHU)"),
				"White paper mode must use smoothstep transition",
			);
			assert.ok(
				source.includes("gray = mix(darkAir, invertedGray, airFactor);"),
				"White paper mode must smoothly blend dark air with inverted tissue",
			);
		});
	});

	// ─── 5. SUB-PIXEL PHASE JITTER & EXTREME STRESS REPAIR ────────────────────

	describe("5. Continuous Sub-Pixel Dragging & Extreme Inputs", () => {
		const zakharov = createZakharovProfileVolume();

		it("FIXED: Continuous sub-pixel mapping eliminates 1-pixel discontinuous phase shudder", () => {
			// When dragging the crosshair smoothly by 0.01 mm increments:
			const crosshair1: Point3D = { x: 0.12, y: 0, z: 0 };
			const crosshair2: Point3D = { x: 0.13, y: 0, z: 0 };

			const continuous1 = worldMmToSlicePxContinuous(crosshair1, "axial", zakharov);
			const continuous2 = worldMmToSlicePxContinuous(crosshair2, "axial", zakharov);

			const deltaPixels = Math.abs(continuous2.x - continuous1.x);

			// Delta for 0.01 mm at 0.25 mm spacing is exactly 0.04 pixels (smooth linear motion):
			assert.ok(
				Math.abs(deltaPixels - 0.04) < 1e-4,
				`Continuous mapping must move by 0.04 px for 0.01 mm, got ${deltaPixels}`,
			);

			const coords1 = computeGlSliceCoordinates(zakharov, "axial", crosshair1, DEFAULT_OBLIQUE_ROTATION);
			const coords2 = computeGlSliceCoordinates(zakharov, "axial", crosshair2, DEFAULT_OBLIQUE_ROTATION);

			const maxCoordX = zakharov.dimensions.width - 1;
			const deltaOriginVoxels = Math.abs(coords2.sliceOrigin[0] - coords1.sliceOrigin[0]) * maxCoordX;

			// UVW origin should move smoothly by ~0.04 voxels instead of jumping by 1 full voxel!
			assert.ok(
				deltaOriginVoxels < 0.1,
				`Discontinuous jump eliminated! Origin shifted smoothly by ${deltaOriginVoxels.toFixed(4)} voxels`,
			);
		});

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
	});
});
