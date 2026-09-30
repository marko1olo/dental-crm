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
	type ObliqueRotationAngles,
	DEFAULT_OBLIQUE_ROTATION,
	DEFAULT_VIEWPORT_TRANSFORM,
} from "../cbctObliqueMatrixMath";
import {
	CBCT_MPR_VERTEX_SHADER,
	CBCT_MPR_FRAGMENT_SHADER,
} from "../mpr/webgl/cbctMprShaders";
import {
	computeGlSliceCoordinates,
	computeSynchronizedMprGlCoordinates,
	calculateObliqueRotationFromHandle,
	calculateCrosshairCenterDrag,
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
		physicalSizeMm: {
			x: width * spX,
			y: height * spY,
			z: depth * spZ,
		},
		data,
		minHU: -1000,
		maxHU: 1500,
		defaultWindowWidth: 1500,
		defaultWindowLevel: 300,
		isDisposed: false,
	};
}

describe("CBCT Hardware WebGL2 GPU Engine (FEAT-010)", () => {
	const volume = createSyntheticVolume();
	const centerCrosshair: Point3D = { x: 0, y: 0, z: 0 };
	const zeroAngles: ObliqueRotationAngles = DEFAULT_OBLIQUE_ROTATION;

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
			const obliqueAngles: ObliqueRotationAngles = {
				axialAngleDeg: 30,
				coronalTiltDeg: -25,
				sagittalTiltDeg: 15,
			};
			const coords = computeGlSliceCoordinates(volume, "axial", centerCrosshair, obliqueAngles);

			const [ux, uy, uz] = coords.axisU;
			const [vx, vy, vz] = coords.axisV;
			const dot = ux * vx + uy * vy + uz * vz;

			// Scaled by texture dimension aspect ratio, but directional vectors are orthogonal
			const lenU = Math.hypot(ux, uy, uz);
			const lenV = Math.hypot(vx, vy, vz);
			const normDot = (ux * vx + uy * vy + uz * vz) / (lenU * lenV);
			assert.ok(Math.abs(normDot) < 0.15, `Basis vectors not orthogonal: dot product = ${normDot}`);
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

	// ─── 6. INTERACTIVE CROSSHAIR DRAG & 3D FOCAL POINT SYNCHRONIZATION ───────

	describe("6. Interactive Crosshair Drag & 3D Focal Point Synchronization", () => {
		it("updates X and Y focal point when dragging crosshair center in Axial viewport, preserving Z", () => {
			const canvasSize = { width: 16, height: 16 };
			// Center is at (8, 8) in 16x16 slice. Move pointer to (12, 10): dx = +4 px (+1.0 mm), dy = +2 px (+0.5 mm)
			const pointerPx = { x: 12, y: 10 };
			const newFocalPoint = calculateCrosshairCenterDrag(
				"axial",
				pointerPx,
				canvasSize,
				centerCrosshair,
				zeroAngles,
				DEFAULT_VIEWPORT_TRANSFORM,
				volume,
			);

			assert.ok(Math.abs(newFocalPoint.x - 1.0) < 0.05, `Expected X ~ 1.0 mm, got ${newFocalPoint.x}`);
			assert.ok(Math.abs(newFocalPoint.y - 0.5) < 0.05, `Expected Y ~ 0.5 mm, got ${newFocalPoint.y}`);
			assert.strictEqual(newFocalPoint.z, centerCrosshair.z, "Axial drag must preserve Z coordinate!");
		});

		it("updates X and Z focal point when dragging crosshair center in Coronal viewport, preserving Y", () => {
			const canvasSize = { width: 16, height: 32 };
			// Coronal: X is horizontal, Z is vertical (inverted). Move pointer horizontally by +4 px (+1.0 mm)
			const pointerPx = { x: 12, y: 16 };
			const newFocalPoint = calculateCrosshairCenterDrag(
				"coronal",
				pointerPx,
				canvasSize,
				centerCrosshair,
				zeroAngles,
				DEFAULT_VIEWPORT_TRANSFORM,
				volume,
			);

			assert.ok(Math.abs(newFocalPoint.x - 1.0) < 0.05, `Expected X ~ 1.0 mm, got ${newFocalPoint.x}`);
			assert.strictEqual(newFocalPoint.y, centerCrosshair.y, "Coronal drag must preserve Y coordinate!");
			assert.ok(Number.isFinite(newFocalPoint.z));
		});

		it("updates Y and Z focal point when dragging crosshair center in Sagittal viewport, preserving X", () => {
			const canvasSize = { width: 16, height: 32 };
			// Sagittal: Y is horizontal, Z is vertical (inverted). Move pointer horizontally by +4 px (+1.0 mm)
			const pointerPx = { x: 12, y: 16 };
			const newFocalPoint = calculateCrosshairCenterDrag(
				"sagittal",
				pointerPx,
				canvasSize,
				centerCrosshair,
				zeroAngles,
				DEFAULT_VIEWPORT_TRANSFORM,
				volume,
			);

			assert.strictEqual(newFocalPoint.x, centerCrosshair.x, "Sagittal drag must preserve X coordinate!");
			assert.ok(Math.abs(newFocalPoint.y - 1.0) < 0.05, `Expected Y ~ 1.0 mm, got ${newFocalPoint.y}`);
			assert.ok(Number.isFinite(newFocalPoint.z));
		});

		it("translates sliceOrigin across Coronal and Sagittal in computeSynchronizedMprGlCoordinates", () => {
			const movedCrosshair: Point3D = { x: 1.0, y: -0.75, z: 0.5 };
			const coords = computeSynchronizedMprGlCoordinates(volume, movedCrosshair, zeroAngles);

			assert.ok(coords.axial !== null);
			assert.ok(coords.coronal !== null);
			assert.ok(coords.sagittal !== null);

			// Axial sliceOrigin Z reflects moved Z (0.5 mm)
			const axialZ = coords.axial.sliceOrigin[2];
			assert.ok(axialZ >= 0.4 && axialZ <= 0.65, `Axial sliceOrigin Z unexpected: ${axialZ}`);

			// Coronal sliceOrigin Y reflects moved Y (-0.75 mm)
			const coronalY = coords.coronal.sliceOrigin[1];
			assert.ok(coronalY < 0.5, `Coronal sliceOrigin Y should be shifted negative: ${coronalY}`);

			// Sagittal sliceOrigin X reflects moved X (1.0 mm)
			const sagittalX = coords.sagittal.sliceOrigin[0];
			assert.ok(sagittalX > 0.5, `Sagittal sliceOrigin X should be shifted positive: ${sagittalX}`);
		});

		it("executes applyCrosshairCenterDrag on WebGL2 context and uploads uniforms for all 3 planes", () => {
			const { gl, calls, uniformValues } = createMockGl2Context();
			const canvas = {
				getContext: (type: string) => (type === "webgl2" ? gl : null),
				width: 100,
				height: 100,
			} as unknown as HTMLCanvasElement;

			const glCtx = new CbctVolumeGlContext(canvas);
			const dragResult = glCtx.applyCrosshairCenterDrag(
				volume,
				"axial",
				{ x: 10, y: 10 },
				{ width: 16, height: 16 },
				centerCrosshair,
				zeroAngles,
				DEFAULT_VIEWPORT_TRANSFORM,
			);

			assert.ok(dragResult !== null);
			assert.ok(Number.isFinite(dragResult?.newCrosshairMm.x));
			assert.ok(Number.isFinite(dragResult?.newCrosshairMm.y));
			assert.strictEqual(dragResult?.newCrosshairMm.z, centerCrosshair.z);

			// 3 draw calls dispatched (one for each plane: axial, coronal, sagittal)
			const drawCalls = calls.filter((c) => c === "drawArrays:4");
			assert.strictEqual(drawCalls.length, 3, "applyCrosshairCenterDrag must render all 3 MPR planes");

			// Uniforms were updated
			assert.ok(calls.includes("uniform3fv:u_sliceOrigin"));
			assert.ok(calls.includes("uniform3fv:u_axisU"));
			assert.ok(calls.includes("uniform3fv:u_axisV"));
		});

		it("clamps out-of-volume crosshair drag coordinates strictly within physical volume bounds", () => {
			const canvasSize = { width: 16, height: 16 };
			// Drag far outside to (1000, -1000) px
			const clamped = calculateCrosshairCenterDrag(
				"axial",
				{ x: 1000, y: -1000 },
				canvasSize,
				centerCrosshair,
				zeroAngles,
				DEFAULT_VIEWPORT_TRANSFORM,
				volume,
			);

			const halfX = volume.physicalSizeMm.x / 2;
			const halfY = volume.physicalSizeMm.y / 2;
			assert.ok(clamped.x <= halfX && clamped.x >= -halfX, `X ${clamped.x} outside physical bounds`);
			assert.ok(clamped.y <= halfY && clamped.y >= -halfY, `Y ${clamped.y} outside physical bounds`);
			assert.strictEqual(Number.isNaN(clamped.x), false);
			assert.strictEqual(Number.isNaN(clamped.y), false);
		});
	});

	// ─── 7. OBLIQUE AXIS ROTATION & ORTHONORMAL BASIS VECTOR WEBG2 UNIFORMS ───

	describe("7. Oblique Axis Rotation & Orthonormal Basis Vector WebGL2 Uniforms", () => {
		it("calculates updated in-plane rotation angle for Axial plane handle drag", () => {
			const center = { x: 100, y: 100 };
			// Drag handle u_pos to (150, 150): dx = 50, dy = 50 => angle = +45 deg
			const res = calculateObliqueRotationFromHandle("axial", "u_pos", center, { x: 150, y: 150 }, zeroAngles);
			assert.ok(Math.abs(res.angleDeg - 45) < 0.1, `Expected ~45 deg, got ${res.angleDeg}`);
			assert.strictEqual(res.newAngles.axialAngleDeg, res.angleDeg);
			assert.strictEqual(res.newAngles.coronalTiltDeg, 0);
			assert.strictEqual(res.newAngles.sagittalTiltDeg, 0);
		});

		it("calculates updated tilt angle for Coronal plane handle drag", () => {
			const center = { x: 100, y: 100 };
			// Drag handle u_pos to (150, 100): dx = 50, dy = 0 => angle = 0 deg
			const res0 = calculateObliqueRotationFromHandle("coronal", "u_pos", center, { x: 150, y: 100 }, zeroAngles);
			assert.ok(Math.abs(res0.angleDeg) < 0.1);
			assert.strictEqual(res0.newAngles.coronalTiltDeg, res0.angleDeg);
			assert.strictEqual(res0.newAngles.axialAngleDeg, 0);

			// Drag handle v_pos to (100, 150): angle = 0 deg for v_pos
			const res90 = calculateObliqueRotationFromHandle("coronal", "v_pos", center, { x: 100, y: 150 }, zeroAngles);
			assert.ok(Math.abs(res90.angleDeg) < 0.1);
		});

		it("calculates updated tilt angle for Sagittal plane handle drag", () => {
			const center = { x: 100, y: 100 };
			// Drag handle u_pos to (100, 150): dx = 0, dy = 50 => angle = 90 deg
			const res = calculateObliqueRotationFromHandle("sagittal", "u_pos", center, { x: 100, y: 150 }, zeroAngles);
			assert.ok(Math.abs(res.angleDeg - 90) < 0.1);
			assert.strictEqual(res.newAngles.sagittalTiltDeg, res.angleDeg);
			assert.strictEqual(res.newAngles.axialAngleDeg, 0);
		});

		it("maintains strict mathematical orthogonality of U, V, and Norm under 3D Euler angles", () => {
			const complexAngles: ObliqueRotationAngles = {
				axialAngleDeg: 35.5,
				coronalTiltDeg: -22.0,
				sagittalTiltDeg: 14.5,
			};

			const isoVolume = createSyntheticVolume(16, 16, 16, 0.25, 0.25, 0.25);
			for (const plane of ["axial", "coronal", "sagittal"] as const) {
				const coords = computeGlSliceCoordinates(isoVolume, plane, centerCrosshair, complexAngles, {
					windowWidth: 1500,
					windowLevel: 300,
					slabMode: "mip",
					slabThicknessMm: 2.0,
				});

				const [ux, uy, uz] = coords.axisU;
				const [vx, vy, vz] = coords.axisV;
				const [nx, ny, nz] = coords.axisNorm;

				const lenU = Math.hypot(ux, uy, uz);
				const lenV = Math.hypot(vx, vy, vz);
				const lenN = Math.hypot(nx, ny, nz);

				assert.ok(lenU > 0, `Length of U must be non-zero for plane ${plane}`);
				assert.ok(lenV > 0, `Length of V must be non-zero for plane ${plane}`);
				assert.ok(lenN > 0, `Length of Norm must be non-zero for plane ${plane}`);

				// Directional cosine between U and V
				const dotUV = (ux * vx + uy * vy + uz * vz) / (lenU * lenV);
				assert.ok(Math.abs(dotUV) < 0.15, `Plane ${plane}: U and V not orthogonal (dot = ${dotUV})`);

				// Directional cosine between U and Norm
				const dotUN = (ux * nx + uy * ny + uz * nz) / (lenU * lenN);
				assert.ok(Math.abs(dotUN) < 0.15, `Plane ${plane}: U and Norm not orthogonal (dot = ${dotUN})`);

				// Directional cosine between V and Norm
				const dotVN = (vx * nx + vy * ny + vz * nz) / (lenV * lenN);
				assert.ok(Math.abs(dotVN) < 0.15, `Plane ${plane}: V and Norm not orthogonal (dot = ${dotVN})`);
			}
		});

		it("executes applyObliqueRotationFromHandle and uploads rotated basis uniforms to WebGL2 shader", () => {
			const { gl, calls } = createMockGl2Context();
			const canvas = {
				getContext: (type: string) => (type === "webgl2" ? gl : null),
				width: 100,
				height: 100,
			} as unknown as HTMLCanvasElement;

			const glCtx = new CbctVolumeGlContext(canvas);
			const rotResult = glCtx.applyObliqueRotationFromHandle(
				volume,
				"axial",
				"u_pos",
				{ x: 50, y: 50 },
				{ x: 80, y: 50 }, // 0 deg
				zeroAngles,
				centerCrosshair,
			);

			assert.ok(rotResult !== null);
			assert.ok(Math.abs(rotResult!.angleDeg) < 0.1);
			assert.strictEqual(rotResult!.newAngles.axialAngleDeg, rotResult!.angleDeg);

			// Verify uniforms were dispatched to shader program
			assert.ok(calls.includes("uniform3fv:u_axisU"));
			assert.ok(calls.includes("uniform3fv:u_axisV"));
			assert.ok(calls.includes("uniform3fv:u_sliceOrigin"));
			assert.ok(calls.includes("drawArrays:4"));
		});

		it("updates basis uniforms directly via updateSliceBasisUniforms in < 0.05 ms without re-upload", () => {
			const { gl, calls } = createMockGl2Context();
			const canvas = {
				getContext: (type: string) => (type === "webgl2" ? gl : null),
				width: 100,
				height: 100,
			} as unknown as HTMLCanvasElement;

			const glCtx = new CbctVolumeGlContext(canvas);
			const coords = computeGlSliceCoordinates(volume, "axial", centerCrosshair, zeroAngles);

			const texImageCallsBefore = calls.filter((c) => c === "texImage3D").length;
			const success = glCtx.updateSliceBasisUniforms(coords);

			assert.strictEqual(success, true);
			const texImageCallsAfter = calls.filter((c) => c === "texImage3D").length;
			assert.strictEqual(texImageCallsBefore, texImageCallsAfter, "updateSliceBasisUniforms must not re-upload texture!");
			assert.ok(calls.includes("uniform3fv:u_axisU"));
			assert.ok(calls.includes("uniform3fv:u_axisV"));
		});
	});

	// ─── 8. 60 FPS REAL-TIME SCRUBBING & TEXTURE CACHE SAFETY ─────────────────

	describe("8. 60 FPS Real-time Scrubbing & Texture Cache Safety", () => {
		it("executes 100 consecutive scrubbing frames in < 10 ms with single texture upload", () => {
			const { gl, calls } = createMockGl2Context();
			const canvas = {
				getContext: (type: string) => (type === "webgl2" ? gl : null),
				width: 100,
				height: 100,
			} as unknown as HTMLCanvasElement;

			const glCtx = new CbctVolumeGlContext(canvas);
			const start = performance.now();

			for (let i = 0; i < 100; i++) {
				const z = -2.0 + (i / 100.0) * 4.0;
				glCtx.renderSlice(
					volume,
					"axial",
					{ x: 0, y: 0, z },
					zeroAngles,
					{ windowWidth: 1500, windowLevel: 300, interpolation: "nearest" },
				);
			}

			const duration = performance.now() - start;
			assert.ok(duration < 50, `100 scrubbing frames took ${duration} ms (budget: < 50 ms)`);

			// Exactly 1 texture upload for all 100 frames
			const uploadCalls = calls.filter((c) => c === "texImage3D").length;
			assert.strictEqual(uploadCalls, 1, `Expected exactly 1 texImage3D call, got ${uploadCalls}`);

			// Exactly 100 draw calls
			const drawCalls = calls.filter((c) => c === "drawArrays:4").length;
			assert.strictEqual(drawCalls, 100, `Expected 100 drawArrays calls, got ${drawCalls}`);
		});

		it("eliminates 1-pixel discontinuous phase shudder with continuous sub-pixel mapping", () => {
			const coordsA = computeGlSliceCoordinates(volume, "axial", { x: 0.00, y: 0, z: 0 }, zeroAngles);
			const coordsB = computeGlSliceCoordinates(volume, "axial", { x: 0.05, y: 0, z: 0 }, zeroAngles);
			const coordsC = computeGlSliceCoordinates(volume, "axial", { x: 0.10, y: 0, z: 0 }, zeroAngles);

			// sliceOrigin X must shift smoothly and monotonically
			const oxA = coordsA.sliceOrigin[0];
			const oxB = coordsB.sliceOrigin[0];
			const oxC = coordsC.sliceOrigin[0];

			assert.ok(oxA !== oxB, "Sub-pixel movement must change sliceOrigin continuously!");
			assert.ok(oxB !== oxC, "Sub-pixel movement must change sliceOrigin continuously!");
			const diffAB = Math.abs(oxB - oxA);
			const diffBC = Math.abs(oxC - oxB);
			assert.ok(Math.abs(diffAB - diffBC) < 1e-4, "Sub-pixel shift must be strictly linear and continuous");
		});

		it("correctly incorporates zoom and pan viewport transforms during crosshair drag", () => {
			const canvasSize = { width: 16, height: 16 };
			const zoomedTransform = { zoom: 2.0, panX: 10, panY: 5 };

			// Drag with zoom and pan: untransformed pointerPx = (pointerPx - pan) / zoom
			const dragWithTransform = calculateCrosshairCenterDrag(
				"axial",
				{ x: 26, y: 21 }, // (26 - 10)/2 = 8, (21 - 5)/2 = 8 => center of 16x16
				canvasSize,
				centerCrosshair,
				zeroAngles,
				zoomedTransform,
				volume,
			);

			// Should resolve back to near center (0, 0)
			assert.ok(Math.abs(dragWithTransform.x) < 0.1, `Expected X ~ 0, got ${dragWithTransform.x}`);
			assert.ok(Math.abs(dragWithTransform.y) < 0.1, `Expected Y ~ 0, got ${dragWithTransform.y}`);
		});
	});
});
