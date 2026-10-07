/**
 * apps/web/src/lib/hardwareCapabilities.test.ts
 *
 * Dedicated Test Suite for:
 * 1. Hybrid Graphics Detection (NVIDIA Optimus / dGPU auto-awakening via WebGPU DXGI).
 * 2. GPU Architecture Classification across discrete, integrated, Apple Silicon, and software.
 * 3. CBCT 2D Slice Interpolation Methods (6 clinical kernels: Nearest, Bilinear, Catmull-Rom, B-Spline, Lanczos-3, Bilateral).
 * 4. Shader uniform interpolation code mapping (0..5).
 * 5. Doctor CBCT defaults persistence with interpolation method, event dispatch, and canonical reset.
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
	classifyGpuArchitecture,
	classifyWebGpuAdapter,
	detectHybridGpuStatus,
	evaluateHardwareProfile,
	_resetHardwareProfileCacheForTests,
	_setCachedGpuDetailsForTests,
	_setCachedWebGpuInfoForTests,
	_setCachedFillrateScoreForTests,
	type WebGpuAdapterInfo,
} from "./hardwareCapabilities";
import {
	CBCT_INTERPOLATION_METHODS,
	VALID_CBCT_INTERPOLATION_METHODS,
	isValidInterpolationMethod,
	loadDoctorCbctSettings,
	saveDoctorCbctSettings,
	resetDoctorCbctSettings,
	CANONICAL_CBCT_SETTINGS,
	DOCTOR_CBCT_SETTINGS_STORAGE_KEY,
	type CbctInterpolationMethod,
} from "../components/radiology/cbctLutMath";
import {
	CBCT_INTERPOLATION_CODES,
	resolveInterpolationCode,
} from "../components/radiology/mpr/webgl/CbctVolumeGlTextures";

// Mock localStorage and window environment for Node.js test runner
const mockStorage = new Map<string, string>();
let lastDispatchedEvent: Event | CustomEvent | null = null;

const mockWindow = {
	localStorage: {
		getItem: (key: string) => mockStorage.get(key) ?? null,
		setItem: (key: string, value: string) => mockStorage.set(key, String(value)),
		removeItem: (key: string) => mockStorage.delete(key),
		clear: () => mockStorage.clear(),
	},
	dispatchEvent: (event: Event | CustomEvent) => {
		lastDispatchedEvent = event;
		return true;
	},
	addEventListener: () => {},
	removeEventListener: () => {},
};

beforeEach(() => {
	mockStorage.clear();
	lastDispatchedEvent = null;
	_resetHardwareProfileCacheForTests();
	// @ts-expect-error Mocking global window for Node test runner
	globalThis.window = mockWindow;
});

afterEach(() => {
	_resetHardwareProfileCacheForTests();
	mockStorage.clear();
});

describe("GPU Architecture & WebGPU Classification", () => {
	it("correctly classifies discrete GPUs (NVIDIA, AMD RX, Intel Arc)", () => {
		assert.equal(
			classifyGpuArchitecture("NVIDIA GeForce RTX 3060 Laptop GPU", "NVIDIA Corporation"),
			"discrete",
		);
		assert.equal(
			classifyGpuArchitecture("ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 Ti Direct3D11 vs_5_0 ps_5_0)", "Google Inc."),
			"discrete",
		);
		assert.equal(
			classifyGpuArchitecture("AMD Radeon RX 6700 XT", "Advanced Micro Devices, Inc."),
			"discrete",
		);
		assert.equal(
			classifyGpuArchitecture("Intel(R) Arc(TM) A770 Graphics", "Intel"),
			"discrete",
		);
		assert.equal(
			classifyGpuArchitecture("Intel(R) Iris(R) Xe MAX Graphics", "Intel"),
			"discrete",
		);
	});

	it("correctly classifies integrated GPUs (Intel UHD/Iris, AMD APU, Mobile GPUs)", () => {
		assert.equal(
			classifyGpuArchitecture("Intel(R) UHD Graphics 630", "Intel Open Source Technology Center"),
			"integrated",
		);
		assert.equal(
			classifyGpuArchitecture("Intel(R) Iris(R) Xe Graphics", "Intel"),
			"integrated",
		);
		assert.equal(
			classifyGpuArchitecture("AMD Radeon(TM) Graphics", "AMD"),
			"integrated",
		);
		assert.equal(
			classifyGpuArchitecture("Adreno (TM) 640", "Qualcomm"),
			"integrated",
		);
		assert.equal(
			classifyGpuArchitecture("Mali-G78", "ARM"),
			"integrated",
		);
	});

	it("correctly classifies Apple Silicon GPUs", () => {
		assert.equal(
			classifyGpuArchitecture("Apple M2 Pro", "Apple"),
			"apple_silicon",
		);
		assert.equal(
			classifyGpuArchitecture("Apple M3 Max GPU", "Apple Inc."),
			"apple_silicon",
		);
		assert.equal(
			classifyGpuArchitecture("Apple GPU", "Apple"),
			"apple_silicon",
		);
	});

	it("correctly classifies software rasterizers", () => {
		assert.equal(
			classifyGpuArchitecture("Google SwiftShader", "Google Inc."),
			"software",
		);
		assert.equal(
			classifyGpuArchitecture("llvmpipe (LLVM 15.0.7, 256 bits)", "Mesa"),
			"software",
		);
		assert.equal(
			classifyGpuArchitecture("Microsoft Basic Render Driver", "Microsoft"),
			"software",
		);
	});

	it("classifies WebGPU discrete adapters accurately via classifyWebGpuAdapter", () => {
		assert.equal(
			classifyWebGpuAdapter({
				vendor: "nvidia",
				architecture: "ampere",
				device: "RTX 3060",
				description: "NVIDIA GeForce RTX 3060 Laptop GPU",
			}),
			true,
		);
		assert.equal(
			classifyWebGpuAdapter({
				vendor: "amd",
				description: "Radeon RX 6800 XT (discrete)",
			}),
			true,
		);
		assert.equal(
			classifyWebGpuAdapter({
				vendor: "intel",
				description: "Intel(R) Arc(TM) Graphics A770",
			}),
			true,
		);
		// Integrated should be false
		assert.equal(
			classifyWebGpuAdapter({
				vendor: "intel",
				description: "Intel UHD Graphics 620",
			}),
			false,
		);
		assert.equal(classifyWebGpuAdapter(null), false);
		assert.equal(classifyWebGpuAdapter(undefined), false);
	});
});

describe("Hybrid Dual-GPU (NVIDIA Optimus) Detection & Awakening", () => {
	it("detects hybrid topology when WebGL runs on iGPU and WebGPU reveals dGPU", () => {
		const webgpuAdapter: WebGpuAdapterInfo = {
			vendor: "nvidia",
			architecture: "ampere",
			device: "GA106M",
			description: "NVIDIA GeForce RTX 3060 Laptop GPU",
			isDiscrete: true,
		};

		const result = detectHybridGpuStatus(
			"ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0)",
			"Google Inc. (Intel)",
			webgpuAdapter,
		);

		assert.equal(result.isHybridGraphics, true, "Should identify hybrid dual-GPU setup");
		assert.equal(result.shouldPromoteToDiscrete, true, "Should promote to discrete GPU profile");
		assert.equal(result.discreteGpuRenderer, "NVIDIA GeForce RTX 3060 Laptop GPU");
		assert.ok(
			result.hybridGraphicsNotice?.includes("NVIDIA GeForce RTX 3060 Laptop GPU"),
			"Notice must state discovered discrete accelerator",
		);
	});

	it("returns isHybridGraphics=false when WebGL is already running on discrete GPU", () => {
		const result = detectHybridGpuStatus(
			"NVIDIA GeForce RTX 3060 Laptop GPU",
			"NVIDIA Corporation",
			null,
		);

		assert.equal(result.isHybridGraphics, false);
		assert.equal(result.shouldPromoteToDiscrete, false);
		assert.equal(result.discreteGpuRenderer, "NVIDIA GeForce RTX 3060 Laptop GPU");
		assert.equal(result.hybridGraphicsNotice, null);
	});

	it("returns advice notice when running on pure integrated GPU without discrete adapter", () => {
		const result = detectHybridGpuStatus(
			"Intel(R) UHD Graphics 630",
			"Intel",
			null,
		);

		assert.equal(result.isHybridGraphics, false);
		assert.equal(result.shouldPromoteToDiscrete, false);
		assert.equal(result.discreteGpuRenderer, null);
		assert.ok(
			result.hybridGraphicsNotice?.includes("Intel iGPU"),
			"Must advise how to switch to high performance in Windows",
		);
	});

	it("evaluates hardware profile with hybrid auto-awakening to discrete GPU tier", () => {
		_setCachedGpuDetailsForTests({
			renderer: "Intel(R) UHD Graphics 630",
			vendor: "Intel",
			gpuType: "integrated",
			webgl2Supported: true,
			maxTextureSize: 16384,
			max3dTextureSize: 2048,
		});

		_setCachedWebGpuInfoForTests({
			vendor: "nvidia",
			architecture: "ampere",
			device: "GA106M",
			description: "NVIDIA GeForce RTX 3060 Laptop GPU",
			isDiscrete: true,
		});

		_setCachedFillrateScoreForTests(85);

		const profile = evaluateHardwareProfile({ forceFresh: true });

		assert.equal(profile.isHybridGraphics, true, "Profile must reflect hybrid graphics");
		assert.equal(profile.gpuType, "discrete", "gpuType must be promoted to discrete");
		assert.equal(profile.discreteGpuRenderer, "NVIDIA GeForce RTX 3060 Laptop GPU");
		assert.ok(
			profile.tier === "ultra" || profile.tier === "balanced",
			`Promoted tier should be high performance, got: ${profile.tier}`,
		);
	});
});

describe("CBCT 2D Slice Interpolation Methods & Shaders Mapping", () => {
	it("provides canonical clinical interpolation methods (Catmull-Rom, B-Spline, Bilinear)", () => {
		assert.equal(CBCT_INTERPOLATION_METHODS.length, 3, "Must define exactly 3 clinical interpolation methods in UI");
		assert.deepEqual(VALID_CBCT_INTERPOLATION_METHODS, [
			"catmull_rom",
			"b_spline",
			"bilinear",
			"nearest",
		]);

		for (const method of CBCT_INTERPOLATION_METHODS) {
			assert.ok(method.id, "Method must have an id");
			assert.ok(method.labelRu.length > 0, "Method must have Russian label");
			assert.ok(method.shortLabel.length > 0, "Method must have short label");
			assert.ok(method.descriptionRu.length > 0, "Method must have clinical description");
			assert.ok(method.recommendedFor.length > 0, "Method must specify clinical indication");
			assert.equal(method.isHardwareAccelerated, true, "All methods are GPU shader accelerated");
		}
	});

	it("validates method strings using isValidInterpolationMethod", () => {
		assert.equal(isValidInterpolationMethod("catmull_rom"), true);
		assert.equal(isValidInterpolationMethod("b_spline"), true);
		assert.equal(isValidInterpolationMethod("bilinear"), true);
		assert.equal(isValidInterpolationMethod("nearest"), true);

		// Removed / Invalid values
		assert.equal(isValidInterpolationMethod("lanczos3"), false);
		assert.equal(isValidInterpolationMethod("bilateral"), false);
		assert.equal(isValidInterpolationMethod("bicubic"), false);
		assert.equal(isValidInterpolationMethod("trilinear"), false); // trilinear is internal alias, not Doctor choice
		assert.equal(isValidInterpolationMethod(""), false);
		assert.equal(isValidInterpolationMethod(null), false);
		assert.equal(isValidInterpolationMethod(undefined), false);
		assert.equal(isValidInterpolationMethod(123), false);
	});

	it("maps interpolation methods to integer shader uniform codes", () => {
		assert.equal(resolveInterpolationCode("nearest"), CBCT_INTERPOLATION_CODES.NEAREST); // 0
		assert.equal(resolveInterpolationCode("bilinear"), CBCT_INTERPOLATION_CODES.BILINEAR); // 1
		assert.equal(resolveInterpolationCode("trilinear"), CBCT_INTERPOLATION_CODES.BILINEAR); // 1
		assert.equal(resolveInterpolationCode("catmull_rom"), CBCT_INTERPOLATION_CODES.CATMULL_ROM); // 2
		assert.equal(resolveInterpolationCode("b_spline"), CBCT_INTERPOLATION_CODES.B_SPLINE); // 3

		// Default fallback is Bilinear (1)
		assert.equal(resolveInterpolationCode(undefined), 1);
		assert.equal(resolveInterpolationCode("unknown_filter"), 1);
	});
});

describe("Doctor CBCT Settings Persistence & Event Synchronization", () => {
	it("initializes with canonical default interpolation method ('catmull_rom')", () => {
		const settings = loadDoctorCbctSettings();
		assert.equal(settings.interpolationMethod, "catmull_rom");
		assert.equal(settings.windowWidth, CANONICAL_CBCT_SETTINGS.windowWidth);
		assert.equal(settings.windowLevel, CANONICAL_CBCT_SETTINGS.windowLevel);
		assert.equal(settings.gamma, CANONICAL_CBCT_SETTINGS.gamma);
	});

	it("persists chosen interpolation method and dispatches 'dente:cbct-defaults-updated'", () => {
		const testMethods: CbctInterpolationMethod[] = [
			"catmull_rom",
			"b_spline",
			"bilinear",
			"nearest",
		];

		for (const method of testMethods) {
			lastDispatchedEvent = null;
			const updated = saveDoctorCbctSettings({ interpolationMethod: method });

			assert.equal(updated.interpolationMethod, method);
			const loaded = loadDoctorCbctSettings();
			assert.equal(loaded.interpolationMethod, method);

			// Verify DOM event dispatch
			assert.ok(lastDispatchedEvent, "Must dispatch CustomEvent upon saving settings");
			assert.equal((lastDispatchedEvent as CustomEvent).type, "dente:cbct-defaults-updated");
			assert.equal(
				(lastDispatchedEvent as CustomEvent<any>).detail?.interpolationMethod,
				method,
			);
		}
	});

	it("sanitizes invalid stored interpolation values to canonical 'catmull_rom'", () => {
		mockStorage.set(
			DOCTOR_CBCT_SETTINGS_STORAGE_KEY,
			JSON.stringify({
				windowWidth: 4025,
				windowLevel: 525,
				interpolationMethod: "non_existent_algorithm",
			}),
		);

		const loaded = loadDoctorCbctSettings();
		assert.equal(
			loaded.interpolationMethod,
			"catmull_rom",
			"Corrupt or invalid method must safely fall back to canonical 'catmull_rom'",
		);
	});

	it("restores canonical interpolation method ('catmull_rom') upon resetDoctorCbctSettings", () => {
		saveDoctorCbctSettings({ interpolationMethod: "b_spline" });
		assert.equal(loadDoctorCbctSettings().interpolationMethod, "b_spline");

		const reset = resetDoctorCbctSettings();
		assert.equal(reset.interpolationMethod, "catmull_rom");
		assert.equal(loadDoctorCbctSettings().interpolationMethod, "catmull_rom");
		assert.equal(mockStorage.has(DOCTOR_CBCT_SETTINGS_STORAGE_KEY), false);
	});
});
