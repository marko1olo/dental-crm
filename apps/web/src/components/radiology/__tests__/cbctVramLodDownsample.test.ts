/**
 * DENTE CRM — CBCT VRAM Hardware LOD Downsample & GPU Inquisitor Tests
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 * Mandate 8e: Doctor Autonomy — Zero Page Crashes on Weak GPUs (Intel HD / Iris Xe / Mobile)
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import type { CbctVoxelVolume } from "../cbctMprMath";
import {
	CbctVolumeGlContext,
	downsampleVolumeData,
	downsampleVolumeBoxFilter,
	getTargetMaxDimForTier,
	calculateTextureVramMb,
	uploadVolumeTo3DTexture,
	type CbctRenderingTier,
} from "../mpr/webgl/CbctVolumeGlContext";

// Factory for synthetic CBCT volumes with realistic dental CT anatomy (air, soft tissue, bone, enamel)
function createSyntheticDentalVolume(
	width = 512,
	height = 512,
	depth = 300,
): CbctVoxelVolume {
	const totalVoxels = width * height * depth;
	const data = new Int16Array(totalVoxels);

	// Fill with baseline air (-1000 HU)
	data.fill(-1000);

	// Inject a central cylindrical jawbone block with trabecular (+500 HU) and cortical bone (+1500 HU)
	const cx = Math.floor(width / 2);
	const cy = Math.floor(height / 2);
	const radius = Math.floor(Math.min(width, height) / 4);

	for (let z = 0; z < depth; z++) {
		const zSlice = z * width * height;
		for (let y = cy - radius; y <= cy + radius; y++) {
			for (let x = cx - radius; x <= cx + radius; x++) {
				const distSq = (x - cx) ** 2 + (y - cy) ** 2;
				if (distSq <= radius ** 2) {
					const idx = zSlice + y * width + x;
					// Cortical bone ring on perimeter, trabecular inside
					if (distSq > (radius * 0.8) ** 2) {
						data[idx] = 1500; // Cortical bone
					} else {
						data[idx] = 500;  // Trabecular bone
					}
				}
			}
		}
	}

	return {
		id: `synth-vol-${width}x${height}x${depth}`,
		data,
		dimensions: { width, height, depth },
		spacingMm: { x: 0.2, y: 0.2, z: 0.2 },
		physicalSizeMm: { x: width * 0.2, y: height * 0.2, z: depth * 0.2 },
		originMm: { x: 0, y: 0, z: 0 },
		minHU: -1000,
		maxHU: 3000,
		defaultWindowWidth: 4025,
		defaultWindowLevel: 525,
		isDisposed: false,
	};
}

// Lightweight WebGL2 mock for headless driver verification
function createMockGl(max3dSize = 2048) {
	const calls: string[] = [];
	const deletedTextures: any[] = [];

	const gl = {
		MAX_3D_TEXTURE_SIZE: 0x8073,
		TEXTURE_3D: 0x806f,
		TEXTURE0: 0x84c0,
		CLAMP_TO_EDGE: 0x812f,
		NEAREST: 0x2600,
		TEXTURE_WRAP_S: 0x2802,
		TEXTURE_WRAP_T: 0x2803,
		TEXTURE_WRAP_R: 0x8072,
		TEXTURE_MIN_FILTER: 0x2801,
		TEXTURE_MAG_FILTER: 0x2800,
		R16I: 0x8231,
		RED_INTEGER: 0x8d94,
		SHORT: 0x1402,
		UNPACK_ROW_LENGTH: 0x0cf2,
		UNPACK_IMAGE_HEIGHT: 0x0cf4,
		UNPACK_ALIGNMENT: 0x0cf5,

		getParameter: (p: number) => {
			if (p === 0x8073) return max3dSize;
			return null;
		},
		createTexture: () => {
			const tex = { id: `tex-${calls.length + 1}` };
			return tex;
		},
		deleteTexture: (t: any) => {
			deletedTextures.push(t);
			calls.push(`deleteTexture:${t?.id}`);
		},
		activeTexture: (slot: number) => calls.push(`activeTexture:${slot}`),
		bindTexture: (target: number, t: any) => calls.push(`bindTexture:${t?.id}`),
		texParameteri: (target: number, pname: number, param: number) =>
			calls.push(`texParameteri:${pname}=${param}`),
		pixelStorei: (pname: number, param: number) =>
			calls.push(`pixelStorei:${pname}=${param}`),
		texImage3D: (
			target: number,
			level: number,
			internalformat: number,
			w: number,
			h: number,
			d: number,
			border: number,
			format: number,
			type: number,
			pixels: any,
		) => {
			calls.push(`texImage3D:${w}x${h}x${d}`);
		},
		useProgram: () => {},
		uniform3f: () => {},
		isContextLost: () => false,
		deleteFramebuffer: () => {},
		deleteRenderbuffer: () => {},
		deleteBuffer: () => {},
		deleteVertexArray: () => {},
		detachShader: () => {},
		deleteShader: () => {},
		deleteProgram: () => {},
		createShader: () => ({}),
		shaderSource: () => {},
		compileShader: () => {},
		getShaderParameter: () => true,
		createProgram: () => ({}),
		attachShader: () => {},
		linkProgram: () => {},
		getProgramParameter: () => true,
		getUniformLocation: () => ({}),
		createVertexArray: () => ({}),
		bindVertexArray: () => {},
		createBuffer: () => ({}),
		bindBuffer: () => {},
		bufferData: () => {},
		enableVertexAttribArray: () => {},
		vertexAttribPointer: () => {},
	} as unknown as WebGL2RenderingContext;

	const canvas = {
		getContext: (type: string) => (type === "webgl2" ? gl : null),
		width: 100,
		height: 100,
	} as unknown as HTMLCanvasElement;

	return { gl, canvas, calls, deletedTextures };
}

describe("CBCT VRAM Hardware LOD Downsample & GPU Inquisitor (CT-VRAM-LOD-Core)", () => {
	it("1. getTargetMaxDimForTier returns strict hardware ceilings for all profiles", () => {
		assert.strictEqual(getTargetMaxDimForTier("potato"), 128, "Potato must cap at 128^3");
		assert.strictEqual(getTargetMaxDimForTier("low"), 256, "Low must cap at 256^3");
		assert.strictEqual(getTargetMaxDimForTier("balanced"), 256, "Balanced must cap at 256^3");
		assert.strictEqual(getTargetMaxDimForTier("ultra"), 512, "Ultra must cap at 512^3");
	});

	it("2. downsampleVolumeData reduces 512x512x300 volume by 64x for Potato tier (128^3)", () => {
		const vol = createSyntheticDentalVolume(512, 512, 300);
		const initialVram = calculateTextureVramMb(512, 512, 300, 2);
		assert.strictEqual(initialVram, 150, "512x512x300 @ 16-bit is exactly 150 MiB");

		const result = downsampleVolumeData(vol.data!, vol.dimensions, 128);
		assert.strictEqual(result.step, 4, "512 -> 128 requires step 4x");
		assert.strictEqual(result.width, 128);
		assert.strictEqual(result.height, 128);
		assert.strictEqual(result.depth, 75);

		// VRAM reduced from 150 MiB to ~2.34 MiB
		assert.strictEqual(result.vramMb, 2.34);
		assert.ok(result.vramMb < 3.0, "Potato tier VRAM must be < 3 MiB");
	});

	it("3. downsampleVolumeData reduces 512x512x300 volume by 8x for Low/Balanced tier (256^3)", () => {
		const vol = createSyntheticDentalVolume(512, 512, 300);
		const result = downsampleVolumeData(vol.data!, vol.dimensions, 256);

		assert.strictEqual(result.step, 2, "512 -> 256 requires step 2x");
		assert.strictEqual(result.width, 256);
		assert.strictEqual(result.height, 256);
		assert.strictEqual(result.depth, 150);

		// VRAM reduced from 150 MiB to ~18.75 MiB
		assert.strictEqual(result.vramMb, 18.75);
		assert.ok(result.vramMb < 25.0, "Balanced tier VRAM must be < 25 MiB");
	});

	it("4. downsampleVolumeBoxFilter preserves cortical bone (+1500 HU) without NaN", () => {
		const vol = createSyntheticDentalVolume(64, 64, 32);
		const filtered = downsampleVolumeBoxFilter(vol.data!, vol.dimensions, 2, 2, 2);

		assert.strictEqual(filtered.width, 32);
		assert.strictEqual(filtered.height, 32);
		assert.strictEqual(filtered.depth, 16);
		assert.strictEqual(filtered.minHU, -1000);
		assert.strictEqual(filtered.maxHU, 1500);

		// Verify no NaN or infinite values
		for (let i = 0; i < filtered.data.length; i++) {
			assert.ok(Number.isFinite(filtered.data[i]), "All voxels must be finite");
		}
	});

	it("5. uploadVolumeTo3DTexture clamps texture upload to Potato tier (128^3) ceiling", () => {
		const { gl, calls } = createMockGl(2048);
		const vol = createSyntheticDentalVolume(512, 512, 300);

		const uploadRes = uploadVolumeTo3DTexture(gl, vol, {
			max3dSize: 2048,
			tier: "potato",
		});

		assert.ok(uploadRes, "Upload must succeed");
		assert.strictEqual(uploadRes.downsampleStep, 4, "Must downsample 4x for potato tier");
		assert.deepStrictEqual(uploadRes.uploadDim, { width: 128, height: 128, depth: 75 });
		assert.ok(
			calls.some((c) => c === "texImage3D:128x128x75"),
			"Must call texImage3D with 128x128x75",
		);
	});

	it("6. uploadVolumeTo3DTexture clamps texture upload to Balanced tier (256^3) ceiling", () => {
		const { gl, calls } = createMockGl(2048);
		const vol = createSyntheticDentalVolume(512, 512, 300);

		const uploadRes = uploadVolumeTo3DTexture(gl, vol, {
			max3dSize: 2048,
			tier: "balanced",
		});

		assert.ok(uploadRes, "Upload must succeed");
		assert.strictEqual(uploadRes.downsampleStep, 2, "Must downsample 2x for balanced tier");
		assert.deepStrictEqual(uploadRes.uploadDim, { width: 256, height: 256, depth: 150 });
		assert.ok(
			calls.some((c) => c === "texImage3D:256x256x150"),
			"Must call texImage3D with 256x256x150",
		);
	});

	it("7. CbctVolumeGlContext allows dynamic setRenderingTier and re-uploads with appropriate LOD", () => {
		const { canvas, calls } = createMockGl(2048);
		const ctx = new CbctVolumeGlContext(canvas);
		const vol = createSyntheticDentalVolume(512, 512, 300);

		// Step A: Upload on Potato tier
		ctx.setRenderingTier("potato");
		assert.strictEqual(ctx.getRenderingTier(), "potato");
		const okPotato = ctx.uploadVolume(vol);
		assert.strictEqual(okPotato, true);
		assert.strictEqual(ctx.getDownsampleStep(), 4);
		assert.ok(calls.some((c) => c === "texImage3D:128x128x75"));

		// Step B: Re-upload with same tier should skip upload (cached)
		const callsBeforeCached = calls.length;
		const okCached = ctx.uploadVolume(vol);
		assert.strictEqual(okCached, true);
		assert.strictEqual(calls.length, callsBeforeCached, "Cached upload must not issue WebGL commands");

		// Step C: Switch tier to Balanced (256)
		ctx.setRenderingTier("balanced");
		assert.strictEqual(ctx.getRenderingTier(), "balanced");
		const okBalanced = ctx.uploadVolume(vol);
		assert.strictEqual(okBalanced, true);
		assert.strictEqual(ctx.getDownsampleStep(), 2);
		assert.ok(calls.some((c) => c === "texImage3D:256x256x150"));

		ctx.disposeGlResources();
	});

	it("8. CbctVolumeGlContext allows explicit setTargetMaxDim override", () => {
		const { canvas, calls } = createMockGl(2048);
		const ctx = new CbctVolumeGlContext(canvas);
		const vol = createSyntheticDentalVolume(512, 512, 300);

		ctx.setTargetMaxDim(128);
		assert.strictEqual(ctx.getTargetMaxDim(), 128);

		const ok = ctx.uploadVolume(vol);
		assert.strictEqual(ok, true);
		assert.strictEqual(ctx.getDownsampleStep(), 4);
		assert.ok(calls.some((c) => c === "texImage3D:128x128x75"));

		ctx.disposeGlResources();
	});

	it("9. disposeGlResources cleanly purges 3D texture and resets LOD cache", () => {
		const { canvas, deletedTextures } = createMockGl(2048);
		const ctx = new CbctVolumeGlContext(canvas);
		const vol = createSyntheticDentalVolume(128, 128, 64);

		ctx.uploadVolume(vol);
		assert.strictEqual(ctx.getActiveVolumeId(), vol.id);

		// Dispose textures only
		ctx.disposeGlResources({ texturesOnly: true });
		assert.strictEqual(ctx.getActiveVolumeId(), null);
		assert.strictEqual(ctx.getActiveVolume(), null);
		assert.strictEqual(deletedTextures.length, 1, "Texture must be deleted from GPU");

		// Full disposal
		ctx.disposeGlResources();
	});
});
