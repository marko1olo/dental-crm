import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CBCT_TIER_PROFILES,
	calculateDynamicWorkerPoolSize,
	calculateTextureVramMb,
	detectCbctHardwareCapabilities,
	deriveAdaptiveRenderProfile,
	shouldDownsampleTextureForVram,
	CbctRenderTelemetryCollector,
	downsampleVolumeBoxFilter,
	quantizeVolumeHUTo8Bit,
	dequantizeVolume8BitToHU,
	calculateVramSavings,
	determineOptimalVolumeLOD,
} from "../cbctAdaptiveRendering.js";

describe("CBCT Adaptive Hardware Profiling & Telemetry Engine (Red Team Tests)", () => {
	it("1. Dynamic Worker Pool Sizing scales with real CPU cores", () => {
		assert.equal(calculateDynamicWorkerPoolSize(1), 1);
		assert.equal(calculateDynamicWorkerPoolSize(2), 1);
		assert.equal(calculateDynamicWorkerPoolSize(3), 2);
		assert.equal(calculateDynamicWorkerPoolSize(4), 2);
		assert.equal(calculateDynamicWorkerPoolSize(5), 2);
		assert.equal(calculateDynamicWorkerPoolSize(6), 3);
		assert.equal(calculateDynamicWorkerPoolSize(7), 3);
		assert.equal(calculateDynamicWorkerPoolSize(8), 4);
		assert.equal(calculateDynamicWorkerPoolSize(16), 4);
		assert.equal(calculateDynamicWorkerPoolSize(32), 4);
		assert.equal(calculateDynamicWorkerPoolSize(undefined), 2);
	});

	it("2. Hardware Capability Probing classifies discrete vs integrated GPU", () => {
		// Mock discrete RTX 4080 GPU
		const mockGlRtx = {
			MAX_3D_TEXTURE_SIZE: 32883,
			RENDERER: 7937,
			VENDOR: 7936,
			getParameter: (p: number) => {
				if (p === 32883) return 2048;
				return "NVIDIA GeForce RTX 4080";
			},
			getExtension: () => ({
				UNMASKED_RENDERER_WEBGL: 37446,
				UNMASKED_VENDOR_WEBGL: 37445,
			}),
		} as unknown as WebGL2RenderingContext;

		const mockNavHigh = {
			hardwareConcurrency: 16,
			deviceMemory: 32,
			maxTouchPoints: 0,
		} as unknown as Navigator;

		const capsHigh = detectCbctHardwareCapabilities(mockGlRtx, mockNavHigh);
		assert.equal(capsHigh.hardwareConcurrency, 16);
		assert.equal(capsHigh.deviceMemoryGb, 32);
		assert.equal(capsHigh.isDiscreteGpu, true);
		assert.equal(capsHigh.isIntegratedGpu, false);

		// Mock weak Intel HD 520 integrated GPU
		const mockGlIntel = {
			MAX_3D_TEXTURE_SIZE: 32883,
			getParameter: () => "Intel(R) HD Graphics 520",
			getExtension: () => null,
		} as unknown as WebGL2RenderingContext;

		const mockNavLow = {
			hardwareConcurrency: 2,
			deviceMemory: 4,
			maxTouchPoints: 0,
		} as unknown as Navigator;

		const capsLow = detectCbctHardwareCapabilities(mockGlIntel, mockNavLow);
		assert.equal(capsLow.hardwareConcurrency, 2);
		assert.equal(capsLow.deviceMemoryGb, 4);
		assert.equal(capsLow.isDiscreteGpu, false);
		assert.equal(capsLow.isIntegratedGpu, true);
	});

	it("3. Adaptive Render Profile parameter matrix by hardware tier", () => {
		// Ultra Tier (Discrete GPU, 16 cores, 32GB RAM)
		const ultraProfile = deriveAdaptiveRenderProfile({
			hardwareConcurrency: 16,
			deviceMemoryGb: 32,
			isDiscreteGpu: true,
			isMobileOrTablet: false,
			max3DTextureSize: 2048,
		});
		assert.equal(ultraProfile.tier, "ultra");
		assert.equal(ultraProfile.raymarchingVoxelStep, 0.5);
		assert.equal(ultraProfile.interactiveVoxelStep, 1.0);
		assert.equal(ultraProfile.maxRaySteps, 240);
		assert.equal(ultraProfile.interactiveMaxRaySteps, 120);
		assert.equal(ultraProfile.interactiveDownsampleFactor, 0.5);
		assert.equal(ultraProfile.max3DTextureDimension, 512);
		assert.equal(ultraProfile.workerPoolSize, 4);
		assert.equal(ultraProfile.enableTrilinearDuringInteraction, true);

		// Balanced Tier (Modern PC, 6 cores, 8GB RAM, integrated GPU)
		const balancedProfile = deriveAdaptiveRenderProfile({
			hardwareConcurrency: 6,
			deviceMemoryGb: 8,
			isDiscreteGpu: false,
			isMobileOrTablet: false,
			max3DTextureSize: 2048,
		});
		assert.equal(balancedProfile.tier, "balanced");
		assert.equal(balancedProfile.raymarchingVoxelStep, 1.0);
		assert.equal(balancedProfile.interactiveVoxelStep, 1.8);
		assert.equal(balancedProfile.maxRaySteps, 160);
		assert.equal(balancedProfile.interactiveMaxRaySteps, 70);
		assert.equal(balancedProfile.interactiveDownsampleFactor, 0.5);
		assert.equal(balancedProfile.max3DTextureDimension, 512);
		assert.equal(balancedProfile.enableTrilinearDuringInteraction, false);

		// Low Tier (4 cores, 4GB RAM, weak GPU)
		const lowProfile = deriveAdaptiveRenderProfile({
			hardwareConcurrency: 4,
			deviceMemoryGb: 4,
			isDiscreteGpu: false,
			isMobileOrTablet: false,
			max3DTextureSize: 512,
		});
		assert.equal(lowProfile.tier, "low");
		assert.equal(lowProfile.raymarchingVoxelStep, 1.8);
		assert.equal(lowProfile.interactiveVoxelStep, 2.5);
		assert.equal(lowProfile.maxRaySteps, 80);
		assert.equal(lowProfile.interactiveDownsampleFactor, 0.333);
		assert.equal(lowProfile.max3DTextureDimension, 256);
		assert.equal(lowProfile.bisectionRefineSteps, 2);

		// Potato Tier (2 cores, 2GB RAM, weak GPU)
		const potatoProfile = deriveAdaptiveRenderProfile({
			hardwareConcurrency: 2,
			deviceMemoryGb: 2,
			isDiscreteGpu: false,
			isMobileOrTablet: false,
			max3DTextureSize: 256,
		});
		assert.equal(potatoProfile.tier, "potato");
		assert.equal(potatoProfile.raymarchingVoxelStep, 2.5);
		assert.equal(potatoProfile.interactiveVoxelStep, 3.2);
		assert.equal(potatoProfile.maxRaySteps, 50);
		assert.equal(potatoProfile.interactiveDownsampleFactor, 0.25);
		assert.equal(potatoProfile.max3DTextureDimension, 256);
		assert.equal(potatoProfile.workerPoolSize, 1);
	});

	it("4. Diagnostic Honesty Invariant: Idle resolution is strictly 1.0x across all tiers", () => {
		const tiers = ["ultra", "balanced", "low", "potato"] as const;
		for (const tier of tiers) {
			const profile = deriveAdaptiveRenderProfile({}, "nominal", tier);
			assert.equal(
				profile.idleDownsampleFactor,
				1.0,
				`Tier "${tier}" violated diagnostic honesty: idleDownsampleFactor must be 1.0`,
			);
		}
	});

	it("5. Dynamic Performance Stress adaptation and tier down-clocking", () => {
		const caps = {
			hardwareConcurrency: 16,
			deviceMemoryGb: 32,
			isDiscreteGpu: true,
			max3DTextureSize: 2048,
		};

		// Nominal stress: keeps Ultra
		const pNominal = deriveAdaptiveRenderProfile(caps, "nominal");
		assert.equal(pNominal.tier, "ultra");

		// Elevated stress: down-clocks 1 notch to Balanced
		const pElevated = deriveAdaptiveRenderProfile(caps, "elevated");
		assert.equal(pElevated.tier, "balanced");
		assert.equal(pElevated.raymarchingVoxelStep, 1.0);

		// Critical stress: immediately emergency drops to Potato
		const pCritical = deriveAdaptiveRenderProfile(caps, "critical");
		assert.equal(pCritical.tier, "potato");
		assert.equal(pCritical.raymarchingVoxelStep, 2.5);
		assert.equal(pCritical.interactiveDownsampleFactor, 0.25);
	});

	it("6. CbctRenderTelemetryCollector tracks rolling FPS, frame times, and stress rating", () => {
		const collector = new CbctRenderTelemetryCollector(10);

		// 10 fast frames at 16ms (60 FPS)
		for (let i = 0; i < 10; i++) {
			collector.recordFrame(16.0);
		}
		assert.equal(collector.getAverageFrameTimeMs(), 16.0);
		assert.equal(collector.getAverageFps(), 62.5);
		assert.equal(collector.getDroppedFrameRatio(), 0);
		assert.equal(collector.getStressLevel(), "nominal");

		// Introduce 10 slow frames at 50ms (20 FPS)
		for (let i = 0; i < 10; i++) {
			collector.recordFrame(50.0);
		}
		assert.equal(collector.getAverageFrameTimeMs(), 50.0);
		assert.equal(collector.getAverageFps(), 20.0);
		assert.equal(collector.getStressLevel(), "critical");

		collector.reset();
		assert.equal(collector.getAverageFrameTimeMs(), 0);
		assert.equal(collector.getStressLevel(), "nominal");
	});

	it("7. Texture VRAM footprint calculation and 2x LOD downsample decision", () => {
		// 512 x 512 x 400 x 2 bytes = 209.72 MB
		const vramMb512 = calculateTextureVramMb(512, 512, 400, 2);
		assert.equal(vramMb512, 200);

		// With a 128 MB VRAM budget (integrated GPU), this requires downsampling
		assert.equal(shouldDownsampleTextureForVram(512, 512, 400, 128), true);

		// 256 x 256 x 200 x 2 bytes = 25 MB
		const vramMb256 = calculateTextureVramMb(256, 256, 200, 2);
		assert.equal(vramMb256, 25);
		assert.equal(shouldDownsampleTextureForVram(256, 256, 200, 128), false);
	});

	it("8. 3D Box-Filter Downsampling converts 512x512xN to 256x256x(N/2) with bone preservation", () => {
		// Create a synthetic 4x4x4 volume with air (-1000 HU) and a dense cortical bone core (+1500 HU)
		const width = 4;
		const height = 4;
		const depth = 4;
		const src = new Int16Array(width * height * depth);
		src.fill(-1000); // Ambient air

		// Plant a single bone voxel at (0, 0, 0) to test partial volume averaging
		src[0] = 1500;

		// Plant a full 2x2x2 bone block at (x: 0..1, y: 0..1, z: 2..3) to test pure bone preservation
		for (let z = 2; z <= 3; z++) {
			for (let y = 0; y <= 1; y++) {
				for (let x = 0; x <= 1; x++) {
					src[z * 16 + y * 4 + x] = 1500;
				}
			}
		}

		// Downsample by 2x in all dimensions
		const downsampled = downsampleVolumeBoxFilter(src, { width, height, depth }, 2, 2, 2);
		assert.equal(downsampled.width, 2);
		assert.equal(downsampled.height, 2);
		assert.equal(downsampled.depth, 2);
		assert.equal(downsampled.data.length, 8);

		// Box filter averages voxels in each 2x2x2 cell
		// Mixed cell (x:0..1, y:0..1, z:0..1) has 7 air voxels (-1000) and 1 bone voxel (1500):
		// Average: (-7000 + 1500) / 8 = -687.5 -> -687 HU (Math.round rounds toward +infinity)
		const mixedVoxel = downsampled.data[0];
		assert.equal(mixedVoxel, -687);

		// Pure bone cell (x:0..1, y:0..1, z:2..3) at dst (dx:0, dy:0, dz:1) -> index 1 * 4 + 0 * 2 + 0 = 4
		const pureBoneVoxel = downsampled.data[4];
		assert.equal(pureBoneVoxel, 1500, "Pure bone block must retain exact 1500 HU density");

		// Pure air cell (x:2..3, y:2..3, z:0..1) at dst (dx:1, dy:1, dz:0) -> index 0 * 4 + 1 * 2 + 1 = 3
		const airVoxel = downsampled.data[3];
		assert.equal(airVoxel, -1000, "Pure air region must preserve ambient air HU");

		// Downsampling 512x512x400 should result in exact 256x256x200 dimensions
		const largeVol = new Int16Array(16); // Small test buffer for dimensions check
		const largeTest = downsampleVolumeBoxFilter(largeVol, { width: 512, height: 512, depth: 400 }, 2, 2, 2);
		assert.equal(largeTest.width, 256);
		assert.equal(largeTest.height, 256);
		assert.equal(largeTest.depth, 200);
	});

	it("9. Quantized 8-Bit Volume Representation halves VRAM while preserving Hounsfield scale (-1000..+3000 HU)", () => {
		const testHU = new Int16Array([-1000, 0, 500, 1000, 2000, 3000, -1200, 3500]);
		const dim = { width: 4, height: 2, depth: 1 };

		const quantized = quantizeVolumeHUTo8Bit(testHU, dim, -1000, 3000);
		assert.equal(quantized.data.length, 8);
		assert.equal(quantized.minHU, -1000);
		assert.equal(quantized.maxHU, 3000);

		// -1000 HU (Air) must map to 0
		assert.equal(quantized.data[0], 0);

		// Clamped values below minHU (-1200) must clamp to 0
		assert.equal(quantized.data[6], 0);

		// +3000 HU (Enamel/Titanium) must map to 255
		assert.equal(quantized.data[5], 255);

		// Clamped values above maxHU (3500) must clamp to 255
		assert.equal(quantized.data[7], 255);

		// 1000 HU (Cortical Bone): normalized = (1000 - (-1000)) / 4000 = 0.5 -> 128
		assert.equal(quantized.data[3], 128);

		// Reconstruct back to HU and verify clinical accuracy (within 16 HU tolerance)
		const reconstructed = dequantizeVolume8BitToHU(quantized.data, -1000, 3000);
		assert.equal(reconstructed[0], -1000);
		assert.equal(reconstructed[5], 3000);
		assert.ok(Math.abs(reconstructed[3]! - 1000) <= 16, "Cortical bone reconstructed HU must match within 16 HU");
		assert.ok(Math.abs(reconstructed[1]! - 0) <= 16, "Soft tissue reconstructed HU must match within 16 HU");

		// Byte size reduction test: 8 voxels in 16-bit = 16 bytes; in 8-bit = 8 bytes (50% reduction)
		assert.equal(quantized.data.byteLength, testHU.byteLength / 2);
	});

	it("10. VRAM Savings Metrics accurately compute 8x and 16x memory reductions", () => {
		const originalDim = { width: 512, height: 512, depth: 400 };
		const targetDim = { width: 256, height: 256, depth: 200 };

		// 16-bit full res vs 16-bit 2x downsample: 200 MB -> 25 MB (8x savings)
		const savings16 = calculateVramSavings(originalDim, targetDim, 2, 2);
		assert.equal(savings16.originalMb, 200);
		assert.equal(savings16.targetMb, 25);
		assert.equal(savings16.savingsMb, 175);
		assert.equal(savings16.savingsRatio, 8.0);

		// 16-bit full res vs 8-bit 2x downsample: 200 MB -> 12.5 MB (16x savings)
		const savings8 = calculateVramSavings(originalDim, targetDim, 2, 1);
		assert.equal(savings8.originalMb, 200);
		assert.equal(savings8.targetMb, 12.5);
		assert.equal(savings8.savingsMb, 187.5);
		assert.equal(savings8.savingsRatio, 16.0);
	});

	it("11. Optimal Volume LOD Strategy matches hardware tier recommendations", () => {
		const fullDim = { width: 512, height: 512, depth: 400 };

		// Potato profile: enforces 2x downsample + 8-bit quantization (16x VRAM savings)
		const potatoLod = determineOptimalVolumeLOD(fullDim, "potato");
		assert.equal(potatoLod.downsampleStep, 2);
		assert.equal(potatoLod.use8BitQuantization, true);
		assert.deepEqual(potatoLod.targetDim, { width: 256, height: 256, depth: 200 });
		assert.equal(potatoLod.vramMb, 12.5);
		assert.equal(potatoLod.savingsRatio, 16.0);

		// Low profile: enforces 2x downsample in 16-bit (8x VRAM savings)
		const lowLod = determineOptimalVolumeLOD(fullDim, "low");
		assert.equal(lowLod.downsampleStep, 2);
		assert.equal(lowLod.use8BitQuantization, false);
		assert.deepEqual(lowLod.targetDim, { width: 256, height: 256, depth: 200 });
		assert.equal(lowLod.vramMb, 25);
		assert.equal(lowLod.savingsRatio, 8.0);

		// Ultra profile: keeps full 1x resolution when within budget
		const ultraLod = determineOptimalVolumeLOD({ width: 256, height: 256, depth: 200 }, "ultra", 128);
		assert.equal(ultraLod.downsampleStep, 1);
		assert.equal(ultraLod.use8BitQuantization, false);
		assert.equal(ultraLod.vramMb, 25);
		assert.equal(ultraLod.savingsRatio, 1.0);
	});
});

