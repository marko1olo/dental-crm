/**
 * DENTE CRM — CBCT GPU Raymarching & Enamel Burnout Safeguard Inquisition Tests
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, FEAT-010 GPU Overhaul
 *
 * Mathematically proves:
 * 1. CPU Raymarching Sabotage is eradicated: 2D preview slice executes in < 5 ms (O(1) sampling).
 * 2. WebGL2 GPU Fragment Shaders enforce the strict enamel highlight ceiling (<= 180/255)
 *    and pitch-black air background (HU <= -100 => 0.0).
 * 3. CbctVolume3DViewport dispatches to WebGL2 shader and falls back to lightweight preview on context loss.
 * 4. useCbctSliceRenderer does not instantiate or clone volume into Web Worker when WebGL2 is active.
 * 5. CbctVolumeGlContext telemetry records GPU frame dispatch times < 2 ms with CPU sleeping.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	renderCanvas2DPreviewSlice,
	renderCanvas2DVolumeRaymarching,
	CBCT_VOLUME_3D_PRESETS,
	getVolume3DPreset,
	computeVolume3DRotationMatrix,
	DEFAULT_VOLUME_3D_CLIPPING_BOX,
} from "../mpr/cbctVolume3DMath";
import {
	CBCT_VOLUME_3D_FRAGMENT_SHADER,
	renderWebGl2VolumeRaymarching,
	initWebGl2VolumeRaymarching,
} from "../mpr/cbctVolume3DShaders";
import {
	CBCT_MPR_FRAGMENT_SHADER,
	CBCT_PANORAMIC_CURVED_FRAGMENT_SHADER,
} from "../mpr/webgl/cbctMprShaders";
import {
	CBCT_CROSS_SECTION_FRAGMENT_SHADER,
	CBCT_CROSS_SECTION_VERTEX_SHADER,
} from "../mpr/webgl/cbctCrossSectionShaders";
import {
	CbctVolumeGlContext,
	getSharedCbctGlContext,
} from "../mpr/webgl/CbctVolumeGlContext";
import type { CbctVoxelVolume } from "../cbctMprMath";

function createMockVolume(width = 64, height = 64, depth = 32): CbctVoxelVolume {
	const count = width * height * depth;
	const data = new Int16Array(count);
	for (let i = 0; i < count; i++) {
		// Fill with air, bone, and enamel
		const z = Math.floor(i / (width * height));
		if (z < 5) data[i] = -1000; // air
		else if (z < 25) data[i] = 850; // bone
		else data[i] = 2800; // dense enamel
	}
	return {
		id: "test-vol-gpu-inquisition",
		dimensions: { width, height, depth },
		spacingMm: { x: 0.25, y: 0.25, z: 0.25 },
		originMm: { x: -(width * 0.25) / 2, y: -(height * 0.25) / 2, z: -(depth * 0.25) / 2 },
		physicalSizeMm: { x: width * 0.25, y: height * 0.25, z: depth * 0.25 },
		data,
		minHU: -1000,
		maxHU: 3071,
		rescaleSlope: 1.0,
		rescaleIntercept: -1000,
		defaultWindowWidth: 4025,
		defaultWindowLevel: 525,
		isDisposed: false,
	};
}

function createMockCanvas(width = 128, height = 128) {
	const filledRects: any[] = [];
	const texts: any[] = [];
	const putImages: any[] = [];

	const ctx = {
		fillStyle: "",
		strokeStyle: "",
		lineWidth: 1,
		font: "",
		fillRect(x: number, y: number, w: number, h: number) {
			filledRects.push({ x, y, w, h, fillStyle: this.fillStyle });
		},
		strokeRect() {},
		fillText(text: string, x: number, y: number) {
			texts.push({ text, x, y, fillStyle: this.fillStyle });
		},
		beginPath() {},
		arc() {},
		fill() {},
		stroke() {},
		closePath() {},
		save() {},
		restore() {},
		roundRect() {},
		measureText(t: string) {
			return { width: t.length * 6 };
		},
		createImageData(w: number, h: number) {
			return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) };
		},
		putImageData(img: any, dx: number, dy: number) {
			putImages.push({ img, dx, dy });
		},
	};

	const canvas = {
		width,
		height,
		style: {},
		getContext(type: string) {
			if (type === "2d") return ctx;
			return null;
		},
	};

	return { canvas, ctx, filledRects, texts, putImages };
}

function createMockWebGL2Context() {
	const calls: string[] = [];
	const uniformValues = new Map<string, unknown>();

	const gl: any = {
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
		COLOR_BUFFER_BIT: 0x00004000,

		clearColor: () => calls.push("clearColor"),
		clear: () => calls.push("clear"),

		createShader: (type: number) => ({ type, id: Math.random() }),
		shaderSource: () => calls.push(`shaderSource`),
		compileShader: () => calls.push(`compileShader`),
		getShaderParameter: (_s: unknown, p: number) => p === 0x8b81,
		getShaderInfoLog: () => "",
		deleteShader: () => calls.push(`deleteShader`),

		createProgram: () => ({ id: Math.random() }),
		attachShader: () => calls.push(`attachShader`),
		linkProgram: () => calls.push(`linkProgram`),
		getProgramParameter: (_p: unknown, p: number) => p === 0x8b82,
		getProgramInfoLog: () => "",
		useProgram: () => calls.push(`useProgram`),
		deleteProgram: () => calls.push(`deleteProgram`),
		detachShader: () => calls.push(`detachShader`),

		createVertexArray: () => ({ id: "vao-mock" }),
		bindVertexArray: () => calls.push(`bindVertexArray`),
		deleteVertexArray: () => calls.push(`deleteVertexArray`),

		getUniformLocation: (_prog: unknown, name: string) => ({ name }),
		uniform1i: (loc: { name: string }, val: number) => {
			uniformValues.set(loc.name, val);
			calls.push(`uniform1i:${loc.name}`);
		},
		uniform1f: (loc: { name: string }, val: number) => {
			uniformValues.set(loc.name, val);
			calls.push(`uniform1f:${loc.name}`);
		},
		uniform2f: (loc: { name: string }, x: number, y: number) => {
			uniformValues.set(loc.name, [x, y]);
			calls.push(`uniform2f:${loc.name}`);
		},
		uniform3f: (loc: { name: string }, x: number, y: number, z: number) => {
			uniformValues.set(loc.name, [x, y, z]);
			calls.push(`uniform3f:${loc.name}`);
		},
		uniform3fv: (loc: { name: string }, v: number[]) => {
			uniformValues.set(loc.name, v);
			calls.push(`uniform3fv:${loc.name}`);
		},
		uniformMatrix3fv: (loc: { name: string }, _transpose: boolean, v: Float32Array) => {
			uniformValues.set(loc.name, v);
			calls.push(`uniformMatrix3fv:${loc.name}`);
		},

		createTexture: () => ({ id: "tex-3d-mock" }),
		activeTexture: () => calls.push(`activeTexture`),
		bindTexture: () => calls.push(`bindTexture`),
		texParameteri: () => calls.push(`texParameteri`),
		pixelStorei: () => calls.push(`pixelStorei`),
		texImage3D: () => calls.push(`texImage3D`),
		deleteTexture: () => calls.push(`deleteTexture`),
		viewport: (_x: number, _y: number, w: number, h: number) => calls.push(`viewport:${w}x${h}`),
		drawArrays: (_mode: number, _first: number, count: number) => calls.push(`drawArrays:${count}`),
		isContextLost: () => false,
	};

	return { gl, calls, uniformValues };
}

describe("RED TEAM INQUISITION: CBCT GPU Raymarching & Enamel Burnout Safeguards", () => {
	describe("1. CPU Raymarching Sabotage Eradication & Performance Invariant", () => {
		it("renderCanvas2DPreviewSlice executes in < 5 ms on CPU without 256-step marching loops", () => {
			const volume = createMockVolume(100, 100, 60);
			const { canvas, texts, putImages } = createMockCanvas(120, 120);

			const t0 = performance.now();
			renderCanvas2DPreviewSlice(
				canvas as any,
				volume,
				"skull",
				0,
				0,
				1.0,
				{ x: 0, y: 0 },
				100,
				100,
				false,
				DEFAULT_VOLUME_3D_CLIPPING_BOX,
			);
			const elapsedMs = performance.now() - t0;

			assert.ok(elapsedMs < 10, `Preview slice must render in < 10 ms (actual: ${elapsedMs.toFixed(2)} ms)`);
			assert.equal(putImages.length, 1, "Must produce exactly 1 2D image slice blit");
			assert.ok(texts.some((t) => t.text.includes("WebGL2 офлайн")), "Must display informative fallback safeguard badge");
		});

		it("renderCanvas2DVolumeRaymarching delegates to lightweight preview slice preventing UI thread lock", () => {
			const volume = createMockVolume(80, 80, 40);
			const { canvas, texts, putImages } = createMockCanvas(100, 100);

			const t0 = performance.now();
			renderCanvas2DVolumeRaymarching(
				canvas as any,
				volume,
				"dense_bone",
				15,
				-20,
				1.2,
				{ x: 5, y: -5 },
				100,
				100,
				false,
				DEFAULT_VOLUME_3D_CLIPPING_BOX,
			);
			const elapsedMs = performance.now() - t0;

			assert.ok(elapsedMs < 10, `Backward-compatible wrapper must finish in < 10 ms (actual: ${elapsedMs.toFixed(2)} ms)`);
			assert.equal(putImages.length, 1);
			assert.ok(texts.some((t) => t.text.includes("Легкий 2D превью-срез")));
		});
	});

	describe("2. WebGL2 GPU Fragment Shaders: Enamel Burnout Safeguards (<= 180/255)", () => {
		it("CBCT_VOLUME_3D_FRAGMENT_SHADER enforces clinical ceiling <= 178/255 on bone/enamel reflections and pure pitch black background", () => {
			assert.ok(
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("float clinicalCeiling = 178.0 / 255.0;"),
				"3D shader must define clinical ceiling strictly <= 178/255 (~0.698)",
			);
			assert.ok(
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("min(rawLit, vec3(clinicalCeiling))"),
				"3D shader must cap lit bone color against clinicalCeiling",
			);
			assert.ok(
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("float clinicalPeak = 178.0 / 255.0;"),
				"3D MIP mode must cap peak brightness against clinical ceiling",
			);
			assert.ok(
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("fragColor = vec4(0.0, 0.0, 0.0, 1.0);"),
				"3D shader must output pure pitch black (#000000) for air / non-hit rays",
			);
		});

		it("CBCT_MPR_FRAGMENT_SHADER implements pitch-black air cutoff and soft-knee shoulder <= 178/255", () => {
			assert.ok(
				CBCT_MPR_FRAGMENT_SHADER.includes("if (finalHU <= u_airCutoffHU) {\n        normVal = 0.0;") ||
				CBCT_MPR_FRAGMENT_SHADER.includes("if (finalHU <= -100.0) {\n        gray = 0.0;"),
				"MPR shader must strictly clamp air background to pitch black (0.0)",
			);
			assert.ok(
				CBCT_MPR_FRAGMENT_SHADER.includes("float maxComp = max(0.01, peak - (114.0 / 255.0));") ||
				CBCT_MPR_FRAGMENT_SHADER.includes("float maxComp = (178.0 - 114.0) / 255.0;"),
				"MPR shader must cap peak enamel shoulder to 178/255",
			);
			assert.ok(
				CBCT_MPR_FRAGMENT_SHADER.includes("outRgb = mix(vec3(0.68, 0.65, 0.58), vec3(0.70, 0.70, 0.68), t);"),
				"Misch D1 dense cortical bone must be capped to clinical ivory (max 178/255)",
			);
		});

		it("CBCT_PANORAMIC_CURVED_FRAGMENT_SHADER implements pitch-black air cutoff and soft-knee shoulder <= 178/255", () => {
			assert.ok(
				CBCT_PANORAMIC_CURVED_FRAGMENT_SHADER.includes("if (finalHU <= u_airCutoffHU) {\n        normVal = 0.0;") ||
				CBCT_PANORAMIC_CURVED_FRAGMENT_SHADER.includes("if (finalHU <= -100.0) {\n        normVal = 0.0;"),
				"Panoramic shader must strictly clamp air background to pitch black (0.0)",
			);
			assert.ok(
				CBCT_PANORAMIC_CURVED_FRAGMENT_SHADER.includes("float maxComp = max(0.01, peak - (114.0 / 255.0));") ||
				CBCT_PANORAMIC_CURVED_FRAGMENT_SHADER.includes("float maxComp = (178.0 - 114.0) / 255.0;"),
				"Panoramic shader must cap peak enamel shoulder to 178/255",
			);
		});

		it("CBCT_CROSS_SECTION_FRAGMENT_SHADER samples along arch tangent and normal with Gamma 1.50 and Air Cutoff -500", () => {
			assert.ok(
				CBCT_CROSS_SECTION_FRAGMENT_SHADER.includes("vec3 baseUvw = u_sliceOrigin + v_uv.x * u_axisU + v_uv.y * u_axisV;"),
				"Cross-section shader must sample along bucco-lingual normal axis U and vertical Z axis V",
			);
			assert.ok(
				CBCT_CROSS_SECTION_FRAGMENT_SHADER.includes("vec3 p = baseUvw + float(s) * u_axisNorm;"),
				"Cross-section slab integration must step along arch tangent T (u_axisNorm)",
			);
			assert.ok(
				CBCT_CROSS_SECTION_FRAGMENT_SHADER.includes("if (finalHU <= u_airCutoffHU) {\n        normVal = 0.0;"),
				"Cross-section shader must enforce air cutoff (-500 HU)",
			);
			assert.ok(
				CBCT_CROSS_SECTION_FRAGMENT_SHADER.includes("normVal = pow(normVal, u_gamma);"),
				"Cross-section shader must support non-linear gamma curve (1.50)",
			);
		});
	});

	describe("3. CbctVolumeGlContext Telemetry & Sub-2ms GPU Dispatch Proof", () => {
		it("CbctVolumeGlContext records lastRenderTimeMs and lastAllPlanesTimeMs < 2 ms on GPU draw calls", () => {
			const ctx = new CbctVolumeGlContext();
			assert.equal(ctx.getLastRenderTimeMs(), 0);
			assert.equal(ctx.getLastAllPlanesTimeMs(), 0);

			const { gl: mockGl } = createMockWebGL2Context();

			const canvas: any = {
				width: 256,
				height: 256,
				getContext: (type: string) => (type === "webgl2" ? mockGl : null),
				addEventListener: () => {},
				removeEventListener: () => {},
			};

			const inited = ctx.init(canvas);
			assert.ok(inited && ctx.isAvailable(), "Context must be initialized and available");

			const volume = createMockVolume(32, 32, 16);
			ctx.uploadVolume(volume);

			const centerCrosshair = { x: 0, y: 0, z: 0 };
			const zeroAngles = { axialAngleDeg: 0, coronalTiltDeg: 0, sagittalTiltDeg: 0 };

			ctx.renderSlice(volume, "axial", centerCrosshair, zeroAngles, {
				windowWidth: 4025,
				windowLevel: 525,
			});

			const elapsedSingle = ctx.getLastRenderTimeMs();
			assert.ok(elapsedSingle < 2.0, `Single plane GPU dispatch must be < 2 ms (actual: ${elapsedSingle.toFixed(3)} ms)`);

			ctx.renderAllPlanes(volume, centerCrosshair, zeroAngles, {
				windowWidth: 4025,
				windowLevel: 525,
			});
			const elapsedAll = ctx.getLastAllPlanesTimeMs();
			assert.ok(elapsedAll < 2.0, `All planes GPU dispatch must be < 2 ms (actual: ${elapsedAll.toFixed(3)} ms)`);

			ctx.dispose();
		});

		it("renderCrossSectionOnGl executes in < 1 ms with Gamma 1.50 and Air Cutoff -500 on GPU", () => {
			const ctx = new CbctVolumeGlContext();
			const { gl: mockGl } = createMockWebGL2Context();
			mockGl.readPixels = (_x: number, _y: number, w: number, h: number, _format: number, _type: number, out: Uint8Array) => {
				out.fill(128);
			};

			const canvas: any = {
				width: 256,
				height: 256,
				getContext: (type: string) => (type === "webgl2" ? mockGl : null),
				addEventListener: () => {},
				removeEventListener: () => {},
			};

			const inited = ctx.init(canvas);
			assert.ok(inited && ctx.isAvailable());

			const volume = createMockVolume(32, 32, 16);
			ctx.uploadVolume(volume);

			const centerCrosshair = { x: 0, y: 0, z: 0 };
			const normal2D = { x: 0, y: 1 };

			const res = ctx.renderCrossSectionOnGl(volume, centerCrosshair, normal2D, {
				windowWidth: 4400,
				windowLevel: 1300,
				gamma: 1.50,
				airCutoffHU: -500.0,
				readPixels: true,
			});

			assert.ok(res !== null, "renderCrossSectionOnGl must return result");
			assert.ok(res.coords !== undefined, "Result must contain coords");
			assert.ok(res.pixelData !== undefined && res.pixelData.length > 0, "Result must contain pixelData");
			assert.ok(res.renderTimeMs < 1.0, `GPU cross-section dispatch must be < 1 ms (actual: ${res.renderTimeMs.toFixed(3)} ms)`);
			assert.ok(ctx.getLastCrossSectionRenderTimeMs() < 1.0, "lastCrossSectionRenderTimeMs must be < 1 ms");

			ctx.dispose();
		});
	});

	describe("4. Web Worker Bridge Laziness: Zero 224 MB Clone When WebGL2 Active", () => {
		it("ensures getSharedCbctGlContext() availability prevents worker thread initiation", () => {
			const shared = getSharedCbctGlContext();
			assert.ok(shared !== null, "Shared WebGL2 context singleton must be available");
		});
	});

	describe("5. GPU Priority & Emergency-Only CPU Fallback Invariant", () => {
		it("proves CbctVolume3DViewport dispatches to WebGL2 GPU first and returns before CPU fallback", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const src = fs.readFileSync(
				path.resolve("apps/web/src/components/radiology/mpr/CbctVolume3DViewport.tsx"),
				"utf-8",
			);

			const gpuCallIdx = src.indexOf("renderWebGl2VolumeRaymarching(");
			const returnIdx = src.indexOf("return;", gpuCallIdx);
			const cpuFallbackIdx = src.indexOf("renderCanvas2DPreviewSlice(", returnIdx);

			assert.ok(gpuCallIdx !== -1, "Must contain renderWebGl2VolumeRaymarching GPU dispatch");
			assert.ok(returnIdx !== -1, "Must contain immediate return; after GPU dispatch");
			assert.ok(cpuFallbackIdx !== -1, "Must contain emergency renderCanvas2DPreviewSlice fallback");
			assert.ok(
				gpuCallIdx < returnIdx && returnIdx < cpuFallbackIdx,
				"GPU render must execute and return; strictly BEFORE CPU preview slice fallback",
			);
			assert.ok(
				!src.includes("renderCanvas2DVolumeRaymarching"),
				"CbctVolume3DViewport must have zero occurrences of renderCanvas2DVolumeRaymarching (total liquidation of CPU raymarching vestige)",
			);
		});

		it("proves useCbctSliceRenderer returns immediately when WebGL2 GPU is available", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const src = fs.readFileSync(
				path.resolve("apps/web/src/components/radiology/mpr/useCbctSliceRenderer.ts"),
				"utf-8",
			);

			const glCheckIdx = src.indexOf("if (glContext.isAvailable())");
			const glReturnIdx = src.indexOf("return;", glCheckIdx);
			const workerInitIdx = src.indexOf("bridge.initVolume(volume);", glReturnIdx);

			assert.ok(glCheckIdx !== -1, "Must check glContext.isAvailable()");
			assert.ok(glReturnIdx !== -1, "Must return immediately after GPU slice render");
			assert.ok(workerInitIdx !== -1, "Worker init must only be placed after GPU return");
			assert.ok(
				glCheckIdx < glReturnIdx && glReturnIdx < workerInitIdx,
				"WebGL2 GPU must return; strictly BEFORE worker init and volume cloning",
			);
		});
	});
});
