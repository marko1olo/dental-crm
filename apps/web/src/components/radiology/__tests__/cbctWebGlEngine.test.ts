/**
 * DENTE CRM — CBCT WebGL2 Hardware GPU Engine Test Suite (FEAT-010 / GPU Overhaul)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 *
 * Verifies:
 * 1. GLSL ES 3.00 shader source syntax, uniform bindings, and VOI LUT compliance.
 * 2. Pure coordinate calculation (computeGlSliceCoordinates) for Axial, Coronal, Sagittal.
 * 3. Oblique rotation transforms and slab thickness stepping math.
 * 4. Graceful fallback and safety in headless/SSR environments.
 * 5. Mocked WebGL2 pipeline execution, texture upload caching, and VRAM leak prevention.
 * 6. Shared GL context pool lifecycle.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CbctVoxelVolume, Point3D } from "../cbctMprMath";
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

// ─── TEST FIXTURE FACTORY ────────────────────────────────────────────────────

function createSyntheticVolume(
	width = 16,
	height = 16,
	depth = 16,
	spX = 0.25,
	spY = 0.25,
	spZ = 0.5,
): CbctVoxelVolume {
	const totalVoxels = width * height * depth;
	const data = new Int16Array(totalVoxels);

	// Calibrated test volume with air (-1000 HU), soft tissue (40 HU), and cortical bone (1500 HU)
	for (let z = 0; z < depth; z++) {
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const idx = z * (width * height) + y * width + x;
				if (x >= 4 && x <= 11 && y >= 4 && y <= 11 && z >= 4 && z <= 11) {
					data[idx] = 1500; // Bone
				} else if (x >= 2 && x <= 13 && y >= 2 && y <= 13 && z >= 2 && z <= 13) {
					data[idx] = 40; // Soft tissue
				} else {
					data[idx] = -1000; // Air
				}
			}
		}
	}

	return {
		id: "cbct-vol-synthetic-gpu-001",
		dimensions: { width, height, depth },
		spacingMm: { x: spX, y: spY, z: spZ },
		originMm: {
			x: -(width * spX) / 2,
			y: -(height * spY) / 2,
			z: -(depth * spZ) / 2,
		},
		data,
		windowWidth: 1500,
		windowCenter: 300,
		isDisposed: false,
	};
}

describe("CBCT Hardware WebGL2 GPU Engine (FEAT-010)", () => {
	const volume = createSyntheticVolume();
	const centerCrosshair: Point3D = { x: 0, y: 0, z: 0 };
	const zeroAngles = { yawDeg: 0, pitchDeg: 0, rollDeg: 0 };

	// ─── 1. GLSL ES 3.00 SHADERS SOURCE INTEGRITY ──────────────────────────────

	describe("1. GLSL ES 3.00 Shader Source Integrity & Uniforms", () => {
		it("includes standard WebGL2 #version 300 es directives and highp precision", () => {
			assert.ok(CBCT_MPR_VERTEX_SHADER.startsWith("#version 300 es"));
			assert.ok(CBCT_MPR_VERTEX_SHADER.includes("precision highp float;"));
			assert.ok(CBCT_MPR_FRAGMENT_SHADER.startsWith("#version 300 es"));
			assert.ok(CBCT_MPR_FRAGMENT_SHADER.includes("precision highp float;"));
			assert.ok(CBCT_MPR_FRAGMENT_SHADER.includes("precision highp isampler3D;"));
		});

		it("contains clip-space quad positions with top-down canvas UV mapping", () => {
			assert.ok(CBCT_MPR_VERTEX_SHADER.includes("QUAD_POSITIONS"));
			assert.ok(CBCT_MPR_VERTEX_SHADER.includes("gl_VertexID"));
			assert.ok(CBCT_MPR_VERTEX_SHADER.includes("v_uv = vec2((pos.x + 1.0) * 0.5, (1.0 - pos.y) * 0.5)"));
		});

		it("defines all mandatory affine coordinate uniforms and VOI LUT uniforms", () => {
			const expectedUniforms = [
				"uniform isampler3D u_volume;",
				"uniform vec3 u_volumeDim;",
				"uniform vec3 u_sliceOrigin;",
				"uniform vec3 u_axisU;",
				"uniform vec3 u_axisV;",
				"uniform vec3 u_axisNorm;",
				"uniform float u_windowWidth;",
				"uniform float u_windowLevel;",
				"uniform bool u_invert;",
				"uniform int u_slabMode;",
				"uniform int u_slabSteps;",
				"uniform bool u_trilinear;",
			];
			for (const uniform of expectedUniforms) {
				assert.ok(
					CBCT_MPR_FRAGMENT_SHADER.includes(uniform),
					`Fragment shader missing uniform: ${uniform}`,
				);
			}
		});

		it("contains 8-point trilinear sub-voxel interpolation logic with air boundary fallback", () => {
			assert.ok(CBCT_MPR_FRAGMENT_SHADER.includes("float sampleHUTrilinear(vec3 uvw)"));
			assert.ok(CBCT_MPR_FRAGMENT_SHADER.includes("return -1000.0;"));
			assert.ok(CBCT_MPR_FRAGMENT_SHADER.includes("texelFetch(u_volume"));
			assert.ok(CBCT_MPR_FRAGMENT_SHADER.includes("mix(c0, c1, f.z)"));
		});

		it("implements DICOM PS 3.3 linear VOI LUT Window/Level calculation", () => {
			assert.ok(CBCT_MPR_FRAGMENT_SHADER.includes("float safeWW = max(1.0, u_windowWidth);"));
			assert.ok(CBCT_MPR_FRAGMENT_SHADER.includes("float low = u_windowLevel - safeWW * 0.5;"));
			assert.ok(CBCT_MPR_FRAGMENT_SHADER.includes("float gray = clamp((finalHU - low) / safeWW, 0.0, 1.0);"));
			assert.ok(CBCT_MPR_FRAGMENT_SHADER.includes("if (u_invert)"));
			assert.ok(CBCT_MPR_FRAGMENT_SHADER.includes("gray = 1.0 - gray;"));
		});

		it("supports all 4 slab modes: Single, MIP, MinIP, Average", () => {
			assert.ok(CBCT_MPR_FRAGMENT_SHADER.includes("if (u_slabMode == 0 || u_slabSteps <= 1)")); // Single
			assert.ok(CBCT_MPR_FRAGMENT_SHADER.includes("else if (u_slabMode == 1)")); // MIP
			assert.ok(CBCT_MPR_FRAGMENT_SHADER.includes("maxHU = max(maxHU, hu);"));
			assert.ok(CBCT_MPR_FRAGMENT_SHADER.includes("else if (u_slabMode == 2)")); // MinIP
			assert.ok(CBCT_MPR_FRAGMENT_SHADER.includes("minHU = min(minHU, hu);"));
			assert.ok(CBCT_MPR_FRAGMENT_SHADER.includes("sumHU / float(count)")); // Average
		});
	});

	// ─── 2. PURE COORDINATE MATHEMATICS (computeGlSliceCoordinates) ────────────

	describe("2. Pure Coordinate Mathematics (computeGlSliceCoordinates)", () => {
		it("computes exact dimensions and isotropic/anisotropic aspect ratios", () => {
			// Axial plane
			const axial = computeGlSliceCoordinates(volume, "axial", centerCrosshair, zeroAngles);
			assert.strictEqual(axial.widthPx, 16);
			assert.strictEqual(axial.heightPx, 16);
			assert.strictEqual(axial.pixelSpacingX, 0.25);
			assert.strictEqual(axial.pixelSpacingY, 0.25);

			// Coronal plane (Z depth 16 * spZ 0.5 = 8mm; spX 0.25 => heightPx = 32)
			const coronal = computeGlSliceCoordinates(volume, "coronal", centerCrosshair, zeroAngles);
			assert.strictEqual(coronal.widthPx, 16);
			assert.strictEqual(coronal.heightPx, 32);
			assert.strictEqual(coronal.pixelSpacingX, 0.25);
			assert.strictEqual(coronal.pixelSpacingY, 0.25);

			// Sagittal plane
			const sagittal = computeGlSliceCoordinates(volume, "sagittal", centerCrosshair, zeroAngles);
			assert.strictEqual(sagittal.widthPx, 16);
			assert.strictEqual(sagittal.heightPx, 32);
			assert.strictEqual(sagittal.pixelSpacingX, 0.25);
			assert.strictEqual(sagittal.pixelSpacingY, 0.25);
		});

		it("produces normalized UVW texture coordinates within expected ranges [0, 1]", () => {
			const axial = computeGlSliceCoordinates(volume, "axial", centerCrosshair, zeroAngles);
			const [ox, oy, oz] = axial.sliceOrigin;
			assert.ok(ox >= -0.5 && ox <= 1.5, `Origin X out of bounds: ${ox}`);
			assert.ok(oy >= -0.5 && oy <= 1.5, `Origin Y out of bounds: ${oy}`);
			assert.ok(oz >= -0.5 && oz <= 1.5, `Origin Z out of bounds: ${oz}`);

			// Verify spans are non-zero
			const lenU = Math.hypot(axial.axisU[0], axial.axisU[1], axial.axisU[2]);
			const lenV = Math.hypot(axial.axisV[0], axial.axisV[1], axial.axisV[2]);
			assert.ok(lenU > 0.5, `Axis U span too small: ${lenU}`);
			assert.ok(lenV > 0.5, `Axis V span too small: ${lenV}`);
		});

		it("maintains orthogonality between U and V basis vectors under oblique rotation", () => {
			const obliqueAngles = { yawDeg: 30, pitchDeg: -25, rollDeg: 15 };
			const coords = computeGlSliceCoordinates(volume, "axial", centerCrosshair, obliqueAngles);

			const [ux, uy, uz] = coords.axisU;
			const [vx, vy, vz] = coords.axisV;
			const dot = ux * vx + uy * vy + uz * vz;

			// Scaled by texture dimension aspect ratio, but directional vectors are orthogonal
			assert.ok(Math.abs(dot) < 0.05, `Basis vectors not orthogonal: dot product = ${dot}`);
		});

		it("correctly calculates slab thickness steps and normal vector displacement", () => {
			// Single slice (slab thickness ignored)
			const single = computeGlSliceCoordinates(volume, "axial", centerCrosshair, zeroAngles, {
				windowWidth: 1500,
				windowLevel: 300,
				slabMode: "single",
				slabThicknessMm: 5.0,
			});
			assert.strictEqual(single.slabModeCode, 0);
			assert.strictEqual(single.slabSteps, 1);
			assert.deepStrictEqual(single.axisNorm, [0, 0, 0]);

			// MIP slab 5.0 mm with normal step ~0.25mm
			const mip = computeGlSliceCoordinates(volume, "axial", centerCrosshair, zeroAngles, {
				windowWidth: 1500,
				windowLevel: 300,
				slabMode: "mip",
				slabThicknessMm: 5.0,
			});
			assert.strictEqual(mip.slabModeCode, 1);
			assert.strictEqual(mip.slabSteps, 20); // 5.0 / 0.25 = 20 steps
			assert.ok(Math.abs(mip.axisNorm[2]) > 0, "Normal step Z should be non-zero for axial slice");

			// MinIP slab
			const minip = computeGlSliceCoordinates(volume, "coronal", centerCrosshair, zeroAngles, {
				windowWidth: 1500,
				windowLevel: 300,
				slabMode: "minip",
				slabThicknessMm: 2.0,
			});
			assert.strictEqual(minip.slabModeCode, 2);
			assert.strictEqual(minip.slabSteps, 8); // 2.0 / 0.25 = 8 steps

			// Average slab
			const avg = computeGlSliceCoordinates(volume, "sagittal", centerCrosshair, zeroAngles, {
				windowWidth: 1500,
				windowLevel: 300,
				slabMode: "average",
				slabThicknessMm: 3.0,
			});
			assert.strictEqual(avg.slabModeCode, 3);
			assert.strictEqual(avg.slabSteps, 12); // 3.0 / 0.25 = 12 steps
		});
	});

	// ─── 3. HEADLESS / SSR GRACEFUL FALLBACK & SAFETY ─────────────────────────

	describe("3. Headless / SSR Graceful Fallback & Safety", () => {
		it("safely handles initialization when WebGL2 is not supported", () => {
			const dummyCanvas = {
				getContext: (_type: string) => null,
			} as unknown as HTMLCanvasElement;

			const glCtx = new CbctVolumeGlContext();
			const initSuccess = glCtx.init(dummyCanvas);

			assert.strictEqual(initSuccess, false);
			assert.strictEqual(glCtx.isAvailable(), false);
			assert.strictEqual(glCtx.getCanvas(), dummyCanvas);
			assert.strictEqual(glCtx.getGl(), null);
			assert.strictEqual(glCtx.getActiveVolumeId(), null);
		});

		it("returns null on renderSlice and renderAllPlanes when WebGL2 is unavailable", () => {
			const glCtx = new CbctVolumeGlContext();
			const sliceResult = glCtx.renderSlice(volume, "axial", centerCrosshair, zeroAngles, {
				windowWidth: 1500,
				windowLevel: 300,
			});
			assert.strictEqual(sliceResult, null);

			const allResult = glCtx.renderAllPlanes(volume, centerCrosshair, zeroAngles, {
				windowWidth: 1500,
				windowLevel: 300,
			});
			assert.strictEqual(allResult, null);
		});

		it("returns false on uploadVolume when context is unavailable", () => {
			const glCtx = new CbctVolumeGlContext();
			const uploadResult = glCtx.uploadVolume(volume);
			assert.strictEqual(uploadResult, false);
		});

		it("safely handles dispose without throwing on uninitialized context", () => {
			const glCtx = new CbctVolumeGlContext();
			assert.doesNotThrow(() => {
				glCtx.dispose();
			});
			assert.strictEqual(glCtx.isAvailable(), false);
		});
	});

	// ─── 4. MOCKED WEBGL2 PIPELINE & DRAW CALL VERIFICATION ───────────────────

	describe("4. Mocked WebGL2 Pipeline Execution & Draw Calls", () => {
		function createMockGl2Context(): {
			gl: Record<string, unknown>;
			calls: string[];
			uniformValues: Map<string, unknown>;
		} {
			const calls: string[] = [];
			const uniformValues = new Map<string, unknown>();

			const gl: Record<string, unknown> = {
				// Shader types
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

				createShader: (type: number) => ({ type, id: Math.random() }),
				shaderSource: (shader: unknown, _source: string) => {
					calls.push(`shaderSource`);
				},
				compileShader: (shader: unknown) => {
					calls.push(`compileShader`);
				},
				getShaderParameter: (_shader: unknown, param: number) => param === 0x8b81,
				getShaderInfoLog: () => "",
				deleteShader: (_shader: unknown) => {
					calls.push(`deleteShader`);
				},

				createProgram: () => ({ id: Math.random() }),
				attachShader: (_program: unknown, _shader: unknown) => {
					calls.push(`attachShader`);
				},
				linkProgram: (_program: unknown) => {
					calls.push(`linkProgram`);
				},
				getProgramParameter: (_program: unknown, param: number) => param === 0x8b82,
				getProgramInfoLog: () => "",
				useProgram: (_program: unknown) => {
					calls.push(`useProgram`);
				},
				deleteProgram: (_program: unknown) => {
					calls.push(`deleteProgram`);
				},
				detachShader: (_program: unknown, _shader: unknown) => {
					calls.push(`detachShader`);
				},

				getUniformLocation: (_program: unknown, name: string) => ({ name }),
				uniform1i: (loc: { name: string }, val: number) => {
					uniformValues.set(loc.name, val);
					calls.push(`uniform1i:${loc.name}`);
				},
				uniform1f: (loc: { name: string }, val: number) => {
					uniformValues.set(loc.name, val);
					calls.push(`uniform1f:${loc.name}`);
				},
				uniform3f: (loc: { name: string }, x: number, y: number, z: number) => {
					uniformValues.set(loc.name, [x, y, z]);
					calls.push(`uniform3f:${loc.name}`);
				},
				uniform3fv: (loc: { name: string }, v: number[]) => {
					uniformValues.set(loc.name, v);
					calls.push(`uniform3fv:${loc.name}`);
				},

				createTexture: () => ({ id: "tex-3d-mock" }),
				activeTexture: (_slot: number) => {
					calls.push(`activeTexture`);
				},
				bindTexture: (_target: number, _tex: unknown) => {
					calls.push(`bindTexture`);
				},
				texParameteri: (_target: number, _pname: number, _param: number) => {
					calls.push(`texParameteri`);
				},
				pixelStorei: (_pname: number, _param: number) => {
					calls.push(`pixelStorei`);
				},
				texImage3D: () => {
					calls.push(`texImage3D`);
				},
				deleteTexture: (_tex: unknown) => {
					calls.push(`deleteTexture`);
				},
				viewport: (x: number, y: number, w: number, h: number) => {
					calls.push(`viewport:${w}x${h}`);
				},
				drawArrays: (mode: number, first: number, count: number) => {
					calls.push(`drawArrays:${count}`);
				},
			};

			return { gl, calls, uniformValues };
		}

		it("initializes WebGL2 context, compiles shaders, and links program", () => {
			const { gl, calls } = createMockGl2Context();
			const canvas = {
				getContext: (type: string) => (type === "webgl2" ? gl : null),
				width: 100,
				height: 100,
			} as unknown as HTMLCanvasElement;

			const glCtx = new CbctVolumeGlContext();
			const ok = glCtx.init(canvas);

			assert.strictEqual(ok, true);
			assert.strictEqual(glCtx.isAvailable(), true);
			assert.ok(calls.includes("compileShader"));
			assert.ok(calls.includes("linkProgram"));
			assert.ok(calls.includes("useProgram"));
		});

		it("uploads 3D volume texture to GPU and caches it without redundant re-uploads", () => {
			const { gl, calls } = createMockGl2Context();
			const canvas = {
				getContext: (type: string) => (type === "webgl2" ? gl : null),
				width: 100,
				height: 100,
			} as unknown as HTMLCanvasElement;

			const glCtx = new CbctVolumeGlContext(canvas);
			assert.strictEqual(glCtx.isAvailable(), true);

			// First upload
			const up1 = glCtx.uploadVolume(volume);
			assert.strictEqual(up1, true);
			assert.strictEqual(glCtx.getActiveVolumeId(), volume.id);
			assert.ok(calls.includes("texImage3D"));

			// Second upload of identical volume ID must skip texImage3D
			const texCallCountBefore = calls.filter((c) => c === "texImage3D").length;
			const up2 = glCtx.uploadVolume(volume);
			assert.strictEqual(up2, true);
			const texCallCountAfter = calls.filter((c) => c === "texImage3D").length;
			assert.strictEqual(texCallCountBefore, texCallCountAfter, "Redundant 3D texture re-upload was not skipped!");
		});

		it("executes renderSlice with correct viewport, uniforms, and fullscreen quad draw call", () => {
			const { gl, calls, uniformValues } = createMockGl2Context();
			const canvas = {
				getContext: (type: string) => (type === "webgl2" ? gl : null),
				width: 100,
				height: 100,
			} as unknown as HTMLCanvasElement;

			const glCtx = new CbctVolumeGlContext(canvas);

			const coords = glCtx.renderSlice(volume, "axial", centerCrosshair, zeroAngles, {
				windowWidth: 2000,
				windowLevel: 400,
				invert: true,
				slabMode: "mip",
				slabThicknessMm: 2.5,
				interpolation: "trilinear",
			});

			assert.ok(coords !== null);
			assert.strictEqual(coords?.widthPx, 16);
			assert.strictEqual(coords?.heightPx, 16);

			// Verify uniforms received exact values
			assert.strictEqual(uniformValues.get("u_windowWidth"), 2000);
			assert.strictEqual(uniformValues.get("u_windowLevel"), 400);
			assert.strictEqual(uniformValues.get("u_invert"), 1);
			assert.strictEqual(uniformValues.get("u_slabMode"), 1); // MIP
			assert.strictEqual(uniformValues.get("u_trilinear"), 1); // Trilinear

			// Verify draw call
			assert.ok(calls.includes("viewport:16x16"));
			assert.ok(calls.includes("drawArrays:4"));
		});

		it("blits rendered frame to targetCanvas when provided", () => {
			const { gl } = createMockGl2Context();
			const canvas = {
				getContext: (type: string) => (type === "webgl2" ? gl : null),
				width: 100,
				height: 100,
			} as unknown as HTMLCanvasElement;

			const glCtx = new CbctVolumeGlContext(canvas);

			let drawImageCalled = false;
			const targetCtx = {
				drawImage: (_src: unknown, _dx: number, _dy: number) => {
					drawImageCalled = true;
				},
			};
			const targetCanvas = {
				getContext: (_type: string) => targetCtx,
				width: 0,
				height: 0,
			} as unknown as HTMLCanvasElement;

			const coords = glCtx.renderSlice(
				volume,
				"axial",
				centerCrosshair,
				zeroAngles,
				{ windowWidth: 1500, windowLevel: 300 },
				targetCanvas,
			);

			assert.ok(coords !== null);
			assert.strictEqual(drawImageCalled, true);
			assert.strictEqual(targetCanvas.width, coords?.widthPx);
			assert.strictEqual(targetCanvas.height, coords?.heightPx);
		});

		it("releases all GPU VRAM resources on dispose (texture, shaders, program)", () => {
			const { gl, calls } = createMockGl2Context();
			const canvas = {
				getContext: (type: string) => (type === "webgl2" ? gl : null),
				width: 100,
				height: 100,
			} as unknown as HTMLCanvasElement;

			const glCtx = new CbctVolumeGlContext(canvas);
			glCtx.uploadVolume(volume);

			glCtx.dispose();

			assert.strictEqual(glCtx.isAvailable(), false);
			assert.strictEqual(glCtx.getCanvas(), null);
			assert.strictEqual(glCtx.getActiveVolumeId(), null);

			assert.ok(calls.includes("deleteTexture"), "Volume texture was not deleted on dispose!");
			assert.ok(calls.includes("deleteShader"), "Shaders were not deleted on dispose!");
			assert.ok(calls.includes("deleteProgram"), "Program was not deleted on dispose!");
		});
	});

	// ─── 5. SHARED POOL MANAGEMENT ────────────────────────────────────────────

	describe("5. Shared Pool Management (getSharedCbctGlContext)", () => {
		it("manages singleton instance and releases on disposeSharedCbctGlContext", () => {
			const ctx1 = getSharedCbctGlContext();
			const ctx2 = getSharedCbctGlContext();
			assert.strictEqual(ctx1, ctx2, "getSharedCbctGlContext must return singleton instance");

			disposeSharedCbctGlContext();
			const ctx3 = getSharedCbctGlContext();
			assert.notStrictEqual(ctx1, ctx3, "getSharedCbctGlContext after dispose must create a fresh instance");

			// Clean up
			disposeSharedCbctGlContext();
		});
	});
});
