/**
 * DENTE CRM — CBCT GPU VRAM Leak, Multi-Patient Churn & Texture Boundary Torture
 *
 * Dedicated Red Team Stress Test Suite:
 * 1. Multi-Patient VRAM Churn (10 consecutive patient volumes without page reload)
 * 2. Drawing Buffer Framebuffer Allocation Stability (rapid multi-plane switching)
 * 3. Texture Boundary Clamping (CLAMP_TO_EDGE on S, T, R & NPOT UNPACK_ALIGNMENT)
 * 4. Sub-Voxel Trilinear Sampling & Air Edge Clamping Integrity
 * 5. Shared GL Context Singleton Lifecycle & Double-Dispose Idempotency
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CbctVoxelVolume, Point3D } from "../cbctMprMath";
import {
	CbctVolumeGlContext,
	getSharedCbctGlContext,
	disposeSharedCbctGlContext,
	computeGlSliceCoordinates,
} from "../mpr/webgl/CbctVolumeGlContext";
import {
	CBCT_MPR_FRAGMENT_SHADER,
} from "../mpr/webgl/cbctMprShaders";
import { DEFAULT_OBLIQUE_ROTATION } from "../cbctObliqueMatrixMath";

function createMockTrackingGl(): {
	gl: Record<string, unknown>;
	calls: string[];
	texturesCreated: string[];
	texturesDeleted: string[];
} {
	const calls: string[] = [];
	const texturesCreated: string[] = [];
	const texturesDeleted: string[] = [];

	const gl: Record<string, unknown> = {
		VERTEX_SHADER: 0x8b31,
		FRAGMENT_SHADER: 0x8b30,
		COMPILE_STATUS: 0x8b81,
		LINK_STATUS: 0x8b82,
		TEXTURE0: 0x84c0,
		TEXTURE_3D: 0x806f,
		TEXTURE_WRAP_S: 0x2802,
		TEXTURE_WRAP_T: 0x2803,
		TEXTURE_WRAP_R: 0x8072,
		CLAMP_TO_EDGE: 0x812f,
		TEXTURE_MIN_FILTER: 0x2801,
		TEXTURE_MAG_FILTER: 0x2800,
		NEAREST: 0x2600,
		UNPACK_ALIGNMENT: 0x0cf5,
		R16I: 0x8231,
		RED_INTEGER: 0x8d94,
		SHORT: 0x1402,
		TRIANGLE_STRIP: 0x0005,
		MAX_3D_TEXTURE_SIZE: 0x8073,

		getParameter: (p: number) => (p === 0x8073 ? 2048 : null),
		isContextLost: () => false,

		createShader: () => ({ id: Math.random() }),
		shaderSource: () => {},
		compileShader: () => {},
		getShaderParameter: () => true,
		deleteShader: () => {},
		createProgram: () => ({ id: Math.random() }),
		attachShader: () => {},
		linkProgram: () => {},
		getProgramParameter: () => true,
		useProgram: () => {},
		deleteProgram: () => {},
		detachShader: () => {},
		getUniformLocation: () => ({}),
		uniform1i: () => {},
		uniform1f: () => {},
		uniform3f: () => {},
		uniform3fv: () => {},

		createTexture: () => {
			const id = `tex-3d-${Math.random().toString(36).substring(2, 8)}`;
			calls.push("createTexture");
			texturesCreated.push(id);
			return { id };
		},
		activeTexture: () => calls.push("activeTexture"),
		bindTexture: () => calls.push("bindTexture"),
		texParameteri: (target: number, pname: number, param: number) => {
			calls.push(`texParameteri:${pname}:${param}`);
		},
		pixelStorei: (pname: number, param: number) => {
			calls.push(`pixelStorei:${pname}:${param}`);
		},
		texImage3D: () => calls.push("texImage3D"),
		deleteTexture: (tex: { id?: string } | null) => {
			calls.push("deleteTexture");
			if (tex?.id) texturesDeleted.push(tex.id);
		},

		createVertexArray: () => ({ id: "vao-test" }),
		bindVertexArray: () => {},
		deleteVertexArray: () => calls.push("deleteVertexArray"),
		viewport: (x: number, y: number, w: number, h: number) => calls.push(`viewport:${w}x${h}`),
		drawArrays: () => calls.push("drawArrays"),
	};

	return { gl, calls, texturesCreated, texturesDeleted };
}

function makeMockVolume(id: string, width = 16, height = 16, depth = 16): CbctVoxelVolume {
	return {
		id,
		dimensions: { width, height, depth },
		spacingMm: { x: 0.25, y: 0.25, z: 0.25 },
		originMm: { x: -(width * 0.25) / 2, y: -(height * 0.25) / 2, z: -(depth * 0.25) / 2 },
		physicalSizeMm: { x: width * 0.25, y: height * 0.25, z: depth * 0.25 },
		data: new Int16Array(width * height * depth),
		minHU: -1000,
		maxHU: 3071,
		isDisposed: false,
	};
}

describe("CBCT GPU VRAM Leak & Texture Boundary Torture", () => {
	// ─── 1. MULTI-PATIENT VRAM CHURN TORTURE ──────────────────────────────────

	describe("1. Multi-Patient VRAM Churn Torture", () => {
		it("switches through 10 consecutive patient volumes deleting previous texture on every switch", () => {
			const { gl, calls, texturesCreated, texturesDeleted } = createMockTrackingGl();
			const canvas = {
				getContext: (t: string) => (t === "webgl2" ? gl : null),
				width: 200,
				height: 200,
			} as unknown as HTMLCanvasElement;

			const glCtx = new CbctVolumeGlContext(canvas);
			assert.strictEqual(glCtx.isAvailable(), true);

			const patientCount = 10;
			for (let p = 1; p <= patientCount; p++) {
				const vol = makeMockVolume(`patient-case-${p}`, 32, 32, 20);
				const ok = glCtx.uploadVolume(vol);
				assert.strictEqual(ok, true, `Upload of patient ${p} must succeed`);
				assert.strictEqual(glCtx.getActiveVolumeId(), `patient-case-${p}`);
			}

			// Must create exactly 10 textures:
			assert.strictEqual(texturesCreated.length, 10, "Must create 10 textures for 10 distinct volumes");

			// Must delete exactly 9 textures during transitions (1 remains active):
			assert.strictEqual(
				texturesDeleted.length,
				9,
				"Must delete exactly 9 textures across 10 switches to prevent VRAM explosion!",
			);

			// Calling dispose() at end must delete the final 10th texture:
			glCtx.dispose();
			assert.strictEqual(texturesDeleted.length, 10, "All 10 textures must be cleanly freed from GPU memory");
			assert.strictEqual(glCtx.isAvailable(), false);
		});
	});

	// ─── 2. DRAWING BUFFER STABILITY UNDER RAPID VIEWPORT SWITCHING ───────────

	describe("2. Drawing Buffer Stability Under Rapid Viewport Switching", () => {
		it("50 consecutive renderSlice calls across alternating planes maintain offscreen canvas without continuous reallocation", () => {
			const { gl } = createMockTrackingGl();
			const offscreenCanvas = {
				getContext: (t: string) => (t === "webgl2" ? gl : null),
				width: 100,
				height: 100,
			} as unknown as HTMLCanvasElement;

			const glCtx = new CbctVolumeGlContext(offscreenCanvas);
			const vol = makeMockVolume("patient-stress-50", 40, 40, 20);
			glCtx.uploadVolume(vol);

			const planes = ["axial", "coronal", "sagittal"] as const;
			const targetCanvas = {
				getContext: () => ({
					drawImage: () => {},
				}),
				width: 100,
				height: 100,
			} as unknown as HTMLCanvasElement;

			let canvasWidthResizes = 0;
			let canvasHeightResizes = 0;

			// Wrap width/height setters to track reallocation thrashing:
			let currentW = offscreenCanvas.width;
			let currentH = offscreenCanvas.height;
			Object.defineProperty(offscreenCanvas, "width", {
				get: () => currentW,
				set: (val: number) => {
					if (val !== currentW) {
						currentW = val;
						canvasWidthResizes++;
					}
				},
			});
			Object.defineProperty(offscreenCanvas, "height", {
				get: () => currentH,
				set: (val: number) => {
					if (val !== currentH) {
						currentH = val;
						canvasHeightResizes++;
					}
				},
			});

			for (let i = 0; i < 50; i++) {
				const plane = planes[i % 3]!;
				glCtx.renderSlice(
					vol,
					plane,
					{ x: 0, y: 0, z: 0 },
					DEFAULT_OBLIQUE_ROTATION,
					{ windowWidth: 1500, windowLevel: 300 },
					targetCanvas,
				);
			}

			// Pre-sized offscreen canvas must not resize on every frame!
			// Maximum 2 resizes initially to accommodate max dimension, not 50 resizes!
			assert.ok(
				canvasWidthResizes <= 2,
				`Offscreen canvas width resized ${canvasWidthResizes} times during 50 frames (expected <= 2)`,
			);
			assert.ok(
				canvasHeightResizes <= 2,
				`Offscreen canvas height resized ${canvasHeightResizes} times during 50 frames (expected <= 2)`,
			);

			glCtx.dispose();
		});
	});

	// ─── 3. TEXTURE CLAMPING & UNPACK ALIGNMENT INTEGRITY ──────────────────────

	describe("3. Texture Clamping & UNPACK_ALIGNMENT Integrity", () => {
		it("sets CLAMP_TO_EDGE on S, T, and R coordinates and sets UNPACK_ALIGNMENT=2 for 16-bit CT voxels", () => {
			const { gl, calls } = createMockTrackingGl();
			const canvas = {
				getContext: (t: string) => (t === "webgl2" ? gl : null),
				width: 100,
				height: 100,
			} as unknown as HTMLCanvasElement;

			const glCtx = new CbctVolumeGlContext(canvas);
			const npotVolume = makeMockVolume("npot-volume-599", 17, 19, 23); // Non-power-of-two dimensions
			glCtx.uploadVolume(npotVolume);

			// UNPACK_ALIGNMENT must be 2 for 16-bit short integer textures:
			assert.ok(
				calls.includes("pixelStorei:3317:2"), // 3317 = 0x0CF5 (UNPACK_ALIGNMENT)
				"Must configure gl.pixelStorei(gl.UNPACK_ALIGNMENT, 2) for 16-bit voxel rows",
			);

			// All 3 texture wrapping coordinates must be CLAMP_TO_EDGE (0x812F = 33071):
			assert.ok(calls.includes("texParameteri:10242:33071"), "TEXTURE_WRAP_S must be CLAMP_TO_EDGE");
			assert.ok(calls.includes("texParameteri:10243:33071"), "TEXTURE_WRAP_T must be CLAMP_TO_EDGE");
			assert.ok(calls.includes("texParameteri:32882:33071"), "TEXTURE_WRAP_R must be CLAMP_TO_EDGE");

			glCtx.dispose();
		});
	});

	// ─── 4. SUB-VOXEL TRILINEAR SAMPLING & AIR EDGE CLAMPING ──────────────────

	describe("4. Sub-Voxel Trilinear Sampling & Air Edge Clamping", () => {
		it("CBCT_MPR_FRAGMENT_SHADER strictly returns -1000.0 without clamping smearing outside [0, 1]", () => {
			const shader = CBCT_MPR_FRAGMENT_SHADER;
			assert.ok(
				shader.includes("if (uvw.x < 0.0 || uvw.x > 1.0 || uvw.y < 0.0 || uvw.y > 1.0 || uvw.z < 0.0 || uvw.z > 1.0)"),
				"Trilinear sampling function must perform strict boundary check",
			);
			assert.ok(
				shader.includes("return -1000.0;"),
				"Boundary crossing must return ambient air (-1000.0 HU)",
			);
		});

		it("CBCT_MPR_FRAGMENT_SHADER clamps second voxel index i1 to maxCoord preventing out-of-bounds texelFetch", () => {
			const shader = CBCT_MPR_FRAGMENT_SHADER;
			assert.ok(
				shader.includes("ivec3 i1 = min(ivec3(maxCoord), i0 + ivec3(1));"),
				"High trilinear index i1 must clamp to maxCoord to prevent reading unallocated VRAM",
			);
		});
	});

	// ─── 5. SHARED GL CONTEXT POOL & IDEMPOTENT DISPOSE SAFETY ────────────────

	describe("5. Shared GL Context Pool & Idempotent Dispose Safety", () => {
		it("getSharedCbctGlContext returns singleton and disposeSharedCbctGlContext cleanly resets", () => {
			const ctx1 = getSharedCbctGlContext();
			const ctx2 = getSharedCbctGlContext();
			assert.strictEqual(ctx1, ctx2, "getSharedCbctGlContext must return identical singleton instance");

			disposeSharedCbctGlContext();
			const ctx3 = getSharedCbctGlContext();
			assert.notStrictEqual(ctx1, ctx3, "After dispose, getSharedCbctGlContext must create fresh context");
			disposeSharedCbctGlContext();
		});

		it("calling dispose() multiple times is safe, idempotent, and throws no exceptions", () => {
			const { gl } = createMockTrackingGl();
			const canvas = {
				getContext: (t: string) => (t === "webgl2" ? gl : null),
				width: 100,
				height: 100,
			} as unknown as HTMLCanvasElement;

			const glCtx = new CbctVolumeGlContext(canvas);
			assert.doesNotThrow(() => {
				glCtx.dispose();
				glCtx.dispose();
				glCtx.dispose();
			}, "Multiple dispose calls must be cleanly idempotent");
			assert.strictEqual(glCtx.isAvailable(), false);
		});
	});
});
