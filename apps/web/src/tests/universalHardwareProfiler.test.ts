/**
 * universalHardwareProfiler.test.ts — Unit & Integration Tests for Canonical Universal Hardware Profiler
 *
 * Verifies:
 * 1. GPU architecture classification (Apple Silicon, Discrete RTX/Radeon, Integrated Intel HD/UHD, Software SwiftShader).
 * 2. Safe WebGL context teardown (WEBGL_lose_context invocation in finally block to prevent context exhaustion).
 * 3. Micro-benchmark fillrate execution and timing scoring.
 * 4. Composite hardware capability scoring (0..100) & tier mapping: potato, low, balanced, ultra.
 * 5. Battery saving, Save-Data, slow network, slow mechanical HDD penalties.
 * 6. URL query parameters and localStorage manual overrides (?perf_tier=..., ?lowspec=...).
 * 7. DOM root attribute & CSS classes synchronization (data-hardware-tier, data-low-spec, .low-spec-mode).
 * 8. Dynamic performance states (healthy <-> degraded) and CT 3D scan activation.
 * 9. Adaptive settings calibration across all 4 tiers (blur, debounces, CT batching, downscaling).
 * 10. Device detection utilities delegation (@dental/shared + deviceDetection.ts).
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
	getHardwareAdaptiveSettings,
	type HardwareTier,
	type HardwareProfile,
} from "@dental/shared";
import {
	classifyGpuArchitecture,
	detectGpuDetails,
	runFillrateMicroBenchmark,
	evaluateHardwareProfile,
	getHardwareProfile,
	getHardwareTierOverride,
	setHardwareTierOverride,
	applyHardwareProfileToRoot,
	isLowSpecDevice,
	isUltraWorkstation,
	getPerfState,
	setDynamicPerfState,
	onPerfStateChange,
	getCtScanActive,
	setCtScanActive,
	onCtActiveChange,
	onHardwareProfileChange,
	_resetHardwareProfileCacheForTests,
	_setCachedGpuDetailsForTests,
	_setCachedFillrateScoreForTests,
	HARDWARE_TIER_OVERRIDE_KEY,
	LOW_SPEC_STORAGE_KEY,
} from "../lib/hardwareCapabilities";
import {
	isLowSpecHardware,
	getHardwareResourceTier,
	isHighPerformanceWorkstation,
	getAdaptiveDicomDownscaleFactor,
} from "../utils/deviceDetection";
import {
	clearInMemoryStorageCache,
	safeLocalStorageSetItem,
	safeLocalStorageRemoveItem,
} from "../lib/safeLocalStorage";

// Helper to create a lightweight mock HTML element for DOM attribute testing
function createMockHtmlElement(): HTMLElement {
	const attrs = new Map<string, string>();
	const classes = new Set<string>();

	return {
		setAttribute(name: string, val: string) {
			attrs.set(name, String(val));
		},
		getAttribute(name: string): string | null {
			return attrs.get(name) ?? null;
		},
		removeAttribute(name: string) {
			attrs.delete(name);
		},
		hasAttribute(name: string): boolean {
			return attrs.has(name);
		},
		classList: {
			add(...tokens: string[]) {
				tokens.forEach((t) => classes.add(t));
			},
			remove(...tokens: string[]) {
				tokens.forEach((t) => classes.delete(t));
			},
			contains(token: string): boolean {
				return classes.has(token);
			},
		},
		style: {},
	} as unknown as HTMLElement;
}

const originalNavigatorDesc = Object.getOwnPropertyDescriptor(globalThis, "navigator");

function setMockNavigator(mock: any) {
	Object.defineProperty(globalThis, "navigator", {
		value: mock,
		configurable: true,
		writable: true,
		enumerable: true,
	});
}

function restoreNavigator() {
	if (originalNavigatorDesc) {
		Object.defineProperty(globalThis, "navigator", originalNavigatorDesc);
	} else {
		delete (globalThis as any).navigator;
	}
}

function setMockWindow(mock: any) {
	(globalThis as any).window = mock;
}

function restoreWindow() {
	delete (globalThis as any).window;
}

function setMockDocument(mock: any) {
	(globalThis as any).document = mock;
}

function restoreDocument() {
	delete (globalThis as any).document;
}

describe("Universal Hardware Profiler — Inquisitor Unit Test Suite", () => {
	beforeEach(() => {
		_resetHardwareProfileCacheForTests();
		clearInMemoryStorageCache();
		restoreNavigator();
		restoreWindow();
		restoreDocument();
	});

	afterEach(() => {
		_resetHardwareProfileCacheForTests();
		clearInMemoryStorageCache();
		restoreNavigator();
		restoreWindow();
		restoreDocument();
	});

	// =========================================================================
	// 1. GPU ARCHITECTURE CLASSIFICATION
	// =========================================================================
	describe("1. GPU Architecture Classification", () => {
		it("detects discrete NVIDIA, AMD Radeon, and Intel Arc GPUs", () => {
			assert.equal(
				classifyGpuArchitecture("ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 Direct3D11 vs_5_0 ps_5_0)", "Google Inc. (NVIDIA)"),
				"discrete",
			);
			assert.equal(
				classifyGpuArchitecture("NVIDIA GeForce GTX 1650/PCIe/SSE2", "NVIDIA Corporation"),
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
				classifyGpuArchitecture("Quadro RTX 4000/PCIe/SSE2", "NVIDIA Corporation"),
				"discrete",
			);
		});

		it("detects Apple Silicon (M1/M2/M3/M4 / Apple GPU)", () => {
			assert.equal(
				classifyGpuArchitecture("Apple M2 Pro", "Apple"),
				"apple_silicon",
			);
			assert.equal(
				classifyGpuArchitecture("ANGLE (Apple, Apple M1, OpenGL 4.1)", "Apple"),
				"apple_silicon",
			);
			assert.equal(
				classifyGpuArchitecture("Apple M3 Max", "Apple Inc."),
				"apple_silicon",
			);
			assert.equal(
				classifyGpuArchitecture("Apple GPU", "Apple Inc."),
				"apple_silicon",
			);
		});

		it("detects integrated GPUs (Intel HD / UHD / Iris, AMD APU, Mobile GPUs)", () => {
			assert.equal(
				classifyGpuArchitecture("Intel(R) HD Graphics 520", "Intel Open Source Technology Center"),
				"integrated",
			);
			assert.equal(
				classifyGpuArchitecture("Intel(R) UHD Graphics 630", "Intel Corporation"),
				"integrated",
			);
			assert.equal(
				classifyGpuArchitecture("Intel(R) Iris(R) Xe Graphics", "Intel"),
				"integrated",
			);
			assert.equal(
				classifyGpuArchitecture("Adreno (TM) 660", "Qualcomm"),
				"integrated",
			);
			assert.equal(
				classifyGpuArchitecture("Mali-G78 MP14", "ARM"),
				"integrated",
			);
		});

		it("detects software rasterizers (SwiftShader, llvmpipe, softpipe, Microsoft Basic)", () => {
			assert.equal(
				classifyGpuArchitecture("Google SwiftShader", "Google Inc."),
				"software",
			);
			assert.equal(
				classifyGpuArchitecture("llvmpipe (LLVM 14.0.0, 256 bits)", "Mesa/X.org"),
				"software",
			);
			assert.equal(
				classifyGpuArchitecture("Microsoft Basic Render Driver", "Microsoft"),
				"software",
			);
		});

		it("falls back to unknown for unrecognized or empty strings", () => {
			assert.equal(classifyGpuArchitecture(null, null), "unknown");
			assert.equal(classifyGpuArchitecture("", ""), "unknown");
			assert.equal(classifyGpuArchitecture("Unknown Virtual Disp", "Generic"), "unknown");
		});
	});

	// =========================================================================
	// 2. SAFE WEBGL CONTEXT TEARDOWN (CONTEXT EXHAUSTION SAFETY)
	// =========================================================================
	describe("2. Safe WebGL Context Teardown", () => {
		it("calls loseContext on WEBGL_lose_context extension in finally block", () => {
			let loseContextCalled = false;

			const mockGl = {
				getExtension(name: string) {
					if (name === "WEBGL_debug_renderer_info") {
						return {
							UNMASKED_RENDERER_WEBGL: 0x9246,
							UNMASKED_VENDOR_WEBGL: 0x9245,
						};
					}
					if (name === "WEBGL_lose_context") {
						return {
							loseContext() {
								loseContextCalled = true;
							},
						};
					}
					return null;
				},
				getParameter(pname: number) {
					if (pname === 0x9246) return "NVIDIA GeForce RTX 3070";
					if (pname === 0x9245) return "NVIDIA Corporation";
					if (pname === 0x0d33) return 16384; // MAX_TEXTURE_SIZE
					return null;
				},
			};

			const mockCanvas = {
				getContext(type: string) {
					if (type === "webgl2" || type === "webgl") {
						return mockGl;
					}
					return null;
				},
			};

			setMockDocument({
				createElement(tag: string) {
					if (tag === "canvas") return mockCanvas;
					return {};
				},
			});

			try {
				const details = detectGpuDetails();
				assert.equal(details.gpuType, "discrete");
				assert.equal(details.renderer, "NVIDIA GeForce RTX 3070");
				assert.equal(loseContextCalled, true, "loseContext MUST be called to prevent context exhaustion");
			} finally {
				restoreDocument();
			}
		});

		it("runs fillrate micro-benchmark and safely tears down WebGL context", () => {
			let loseContextCalled = false;
			let clearCalls = 0;

			const mockGl = {
				viewport() {},
				clearColor() {},
				clear() {
					clearCalls++;
				},
				finish() {},
				getExtension(name: string) {
					if (name === "WEBGL_lose_context") {
						return {
							loseContext() {
								loseContextCalled = true;
							},
						};
					}
					return null;
				},
			};

			const mockCanvas = {
				getContext(type: string) {
					if (type === "webgl" || type === "experimental-webgl") {
						return mockGl;
					}
					return null;
				},
			};

			setMockDocument({
				createElement(tag: string) {
					if (tag === "canvas") return mockCanvas;
					return {};
				},
			});

			try {
				const score = runFillrateMicroBenchmark();
				assert.ok(typeof score === "number" && score >= 10 && score <= 100);
				assert.equal(clearCalls, 3);
				assert.equal(loseContextCalled, true);
			} finally {
				restoreDocument();
			}
		});
	});

	// =========================================================================
	// 3. COMPOSITE SCORING & TIER MAPPING MATRIX
	// =========================================================================
	describe("3. Composite Scoring & Hardware Tier Mapping", () => {
		it("Scenario A: Potato tier (Celeron 2-core / 4GB RAM / Intel HD Graphics)", () => {
			setMockNavigator({
				hardwareConcurrency: 2,
				deviceMemory: 4,
			});

			_setCachedGpuDetailsForTests({
				renderer: "Intel(R) HD Graphics 400",
				vendor: "Intel",
				gpuType: "integrated",
				webgl2Supported: false,
				maxTextureSize: 4096,
				max3dTextureSize: null,
			});
			_setCachedFillrateScoreForTests(10); // very slow fillrate

			const profile = evaluateHardwareProfile({ forceFresh: true });

			assert.equal(profile.tier, "potato", "Celeron 2-core with 4GB RAM must resolve to potato tier");
			assert.ok(profile.score <= 25, `Potato score should be <= 25, got ${profile.score}`);
			assert.equal(profile.cpuCores, 2);
			assert.equal(profile.deviceMemoryGb, 4);
			assert.equal(profile.gpuType, "integrated");

			const settings = getHardwareAdaptiveSettings(profile.tier);
			assert.equal(settings.disableBackdropBlur, true);
			assert.equal(settings.simplifyShadows, true);
			assert.equal(settings.ctDownsampleFactor, 4, "CT 3D downsample factor must be 4 on potato");
			assert.equal(settings.ctSliceBatchSize, 8);
			assert.equal(settings.autosaveDebounceMs, 2000);
			assert.equal(settings.pollingIntervalMultiplier, 2.5);
		});

		it("Scenario B: Low tier (Office laptop 4-core / 6GB RAM / Intel UHD Graphics)", () => {
			setMockNavigator({
				hardwareConcurrency: 4,
				deviceMemory: 6,
			});

			_setCachedGpuDetailsForTests({
				renderer: "Intel(R) UHD Graphics 620",
				vendor: "Intel",
				gpuType: "integrated",
				webgl2Supported: true,
				maxTextureSize: 8192,
				max3dTextureSize: 2048,
			});
			_setCachedFillrateScoreForTests(50);

			const profile = evaluateHardwareProfile({ forceFresh: true });

			assert.equal(profile.tier, "low", "Office laptop 4-core must resolve to low tier");
			assert.ok(profile.score >= 26 && profile.score <= 50, `Low score should be 26..50, got ${profile.score}`);

			const settings = getHardwareAdaptiveSettings(profile.tier);
			assert.equal(settings.disableBackdropBlur, true);
			assert.equal(settings.ctDownsampleFactor, 2);
			assert.equal(settings.ctSliceBatchSize, 16);
			assert.equal(settings.autosaveDebounceMs, 1500);
		});

		it("Scenario C: Balanced tier (Standard Clinic PC 6-core / 16GB RAM / GTX 1650)", () => {
			setMockNavigator({
				hardwareConcurrency: 6,
				deviceMemory: 8, // Privacy capped at 8GB in Chromium
			});

			_setCachedGpuDetailsForTests({
				renderer: "NVIDIA GeForce GTX 1650",
				vendor: "NVIDIA Corporation",
				gpuType: "discrete",
				webgl2Supported: true,
				maxTextureSize: 16384,
				max3dTextureSize: 4096,
			});
			_setCachedFillrateScoreForTests(80);

			const profile = evaluateHardwareProfile({ forceFresh: true });

			assert.equal(profile.tier, "balanced", "6-core GTX 1650 must resolve to balanced tier");
			assert.ok(profile.score >= 51 && profile.score <= 75, `Balanced score should be 51..75, got ${profile.score}`);

			const settings = getHardwareAdaptiveSettings(profile.tier);
			assert.equal(settings.disableBackdropBlur, false);
			assert.equal(settings.simplifyShadows, false);
			assert.equal(settings.ctDownsampleFactor, 1, "Full CT fidelity on balanced tier");
			assert.equal(settings.ctSliceBatchSize, 48);
			assert.equal(settings.autosaveDebounceMs, 800);
		});

		it("Scenario D: Ultra tier (High-end Workstation 16-core / 32GB RAM / RTX 4080)", () => {
			setMockNavigator({
				hardwareConcurrency: 16,
				deviceMemory: 8, // Clamped
			});

			_setCachedGpuDetailsForTests({
				renderer: "NVIDIA GeForce RTX 4080",
				vendor: "NVIDIA Corporation",
				gpuType: "discrete",
				webgl2Supported: true,
				maxTextureSize: 32768,
				max3dTextureSize: 8192,
			});
			_setCachedFillrateScoreForTests(100);

			const profile = evaluateHardwareProfile({ forceFresh: true });

			assert.equal(profile.tier, "ultra", "16-core RTX 4080 workstation must resolve to ultra tier");
			assert.ok(profile.score >= 76, `Ultra score should be >= 76, got ${profile.score}`);

			const settings = getHardwareAdaptiveSettings(profile.tier);
			assert.equal(settings.disableBackdropBlur, false);
			assert.equal(settings.ctDownsampleFactor, 1);
			assert.equal(settings.ctSliceBatchSize, 128);
			assert.equal(settings.autosaveDebounceMs, 600);
			assert.equal(settings.pollingIntervalMultiplier, 1.0);
		});

		it("Scenario E: Apple Silicon Mac (M2 Pro 12-core / 16GB RAM)", () => {
			setMockNavigator({
				hardwareConcurrency: 12,
				deviceMemory: 8,
			});

			_setCachedGpuDetailsForTests({
				renderer: "Apple M2 Pro",
				vendor: "Apple",
				gpuType: "apple_silicon",
				webgl2Supported: true,
				maxTextureSize: 16384,
				max3dTextureSize: 4096,
			});
			_setCachedFillrateScoreForTests(100);

			const profile = evaluateHardwareProfile({ forceFresh: true });

			assert.equal(profile.gpuType, "apple_silicon");
			assert.equal(profile.tier, "ultra");
			assert.ok(isUltraWorkstation());
		});
	});

	// =========================================================================
	// 4. PENALTY SYSTEM & DEGRADATIONS
	// =========================================================================
	describe("4. Penalty System & Telemetry Degradations", () => {
		it("applies battery saving penalty (-20 pts) when <= 20% discharging", () => {
			setMockNavigator({
				hardwareConcurrency: 8,
				deviceMemory: 8,
			});

			_setCachedGpuDetailsForTests({
				renderer: "Intel Iris Xe",
				vendor: "Intel",
				gpuType: "integrated",
				webgl2Supported: true,
				maxTextureSize: 8192,
				max3dTextureSize: 2048,
			});
			_setCachedFillrateScoreForTests(80);

			const normalProfile = evaluateHardwareProfile({ forceFresh: true });

			const batterySavingProfile = evaluateHardwareProfile({
				forceFresh: true,
				batteryState: { charging: false, level: 0.15 },
			});

			assert.equal(batterySavingProfile.isBatterySaving, true);
			assert.ok(
				batterySavingProfile.score <= normalProfile.score - 18,
				`Score should drop by 20 on low battery (${normalProfile.score} -> ${batterySavingProfile.score})`,
			);
			assert.ok(batterySavingProfile.reasons.some((r) => r.includes("battery-saving")));
		});

		it("applies slow mechanical HDD penalty (-15 pts)", () => {
			setMockNavigator({
				hardwareConcurrency: 6,
				deviceMemory: 6,
			});

			_setCachedGpuDetailsForTests({
				renderer: "Intel UHD Graphics",
				vendor: "Intel",
				gpuType: "integrated",
				webgl2Supported: true,
				maxTextureSize: 8192,
				max3dTextureSize: 2048,
			});

			const normalProfile = evaluateHardwareProfile({ forceFresh: true });
			const hddProfile = evaluateHardwareProfile({ forceFresh: true, isSlowDisk: true });

			assert.equal(hddProfile.isSlowDisk, true);
			assert.ok(
				hddProfile.score <= normalProfile.score - 14,
				`Score should drop by 15 on slow HDD (${normalProfile.score} -> ${hddProfile.score})`,
			);
			assert.ok(hddProfile.reasons.some((r) => r.includes("slow-hdd")));
		});

		it("applies Save-Data (-10 pts) and 2G network (-15 pts) penalties", () => {
			setMockNavigator({
				hardwareConcurrency: 8,
				deviceMemory: 8,
				connection: {
					saveData: true,
					effectiveType: "2g",
				},
			});

			_setCachedGpuDetailsForTests({
				renderer: "AMD Radeon RX 580",
				vendor: "AMD",
				gpuType: "discrete",
				webgl2Supported: true,
				maxTextureSize: 16384,
				max3dTextureSize: 4096,
			});

			const profile = evaluateHardwareProfile({ forceFresh: true });

			assert.equal(profile.isSaveDataActive, true);
			assert.equal(profile.effectiveConnectionType, "2g");
			assert.ok(profile.reasons.some((r) => r.includes("save-data-active")));
			assert.ok(profile.reasons.some((r) => r.includes("slow-network:2g")));
		});
	});

	// =========================================================================
	// 5. URL & LOCAL STORAGE MANUAL OVERRIDES
	// =========================================================================
	describe("5. URL and LocalStorage Manual Overrides", () => {
		it("overrides tier via URL ?perf_tier=potato and ?perf_tier=ultra", () => {
			setMockWindow({
				location: { search: "?perf_tier=potato" },
			});

			assert.equal(getHardwareTierOverride(), "potato");
			const potatoProfile = evaluateHardwareProfile({ forceFresh: true });
			assert.equal(potatoProfile.tier, "potato");
			assert.equal(potatoProfile.score, 15);

			setMockWindow({
				location: { search: "?perf_tier=ultra" },
			});
			assert.equal(getHardwareTierOverride(), "ultra");
			const ultraProfile = evaluateHardwareProfile({ forceFresh: true });
			assert.equal(ultraProfile.tier, "ultra");
			assert.equal(ultraProfile.score, 95);
		});

		it("overrides tier via legacy ?lowspec=1 (potato) and ?lowspec=0 (balanced)", () => {
			setMockWindow({
				location: { search: "?lowspec=1" },
			});
			assert.equal(getHardwareTierOverride(), "potato");

			setMockWindow({
				location: { search: "?lowspec=0" },
			});
			assert.equal(getHardwareTierOverride(), "balanced");
		});

		it("persists manual override via setHardwareTierOverride and restores via getHardwareTierOverride", () => {
			setMockWindow({
				location: { search: "" },
			});

			setHardwareTierOverride("low");
			assert.equal(getHardwareTierOverride(), "low");

			const profile = getHardwareProfile();
			assert.equal(profile.tier, "low");

			// Clear override
			setHardwareTierOverride(null);
			assert.equal(getHardwareTierOverride(), null);
		});
	});

	// =========================================================================
	// 6. DOM ROOT ATTRIBUTES & CSS SYNCHRONIZATION
	// =========================================================================
	describe("6. DOM Root Attributes & CSS Classes Synchronization", () => {
		it("applies low-spec attributes and CSS classes for potato profile", () => {
			const mockRoot = createMockHtmlElement();

			const profile: HardwareProfile = {
				tier: "potato",
				score: 18,
				deviceMemoryGb: 4,
				cpuCores: 2,
				gpuType: "integrated",
				gpuRenderer: "Intel HD",
				gpuVendor: "Intel",
				webgl2Supported: false,
				webgpuSupported: false,
				maxTextureSize: 4096,
				max3dTextureSize: null,
				fillrateScore: 20,
				isBatterySaving: false,
				isSaveDataActive: false,
				effectiveConnectionType: null,
				prefersReducedMotion: false,
				reasons: ["ram:4GB (+10)"],
				detectedAt: Date.now(),
				version: 1,
			};

			applyHardwareProfileToRoot(profile, mockRoot);

			assert.equal(mockRoot.getAttribute("data-hardware-tier"), "potato");
			assert.equal(mockRoot.getAttribute("data-perf-tier"), "potato");
			assert.equal(mockRoot.getAttribute("data-hardware-score"), "18");
			assert.equal(mockRoot.getAttribute("data-gpu-type"), "integrated");
			assert.equal(mockRoot.getAttribute("data-low-spec"), "true");
			assert.equal(mockRoot.getAttribute("data-perf"), "low");
			assert.equal(mockRoot.classList.contains("low-spec-mode"), true);
			assert.equal(mockRoot.classList.contains("low-spec-perf"), true);
		});

		it("removes low-spec classes and attributes for ultra profile", () => {
			const mockRoot = createMockHtmlElement();
			mockRoot.setAttribute("data-low-spec", "true");
			mockRoot.classList.add("low-spec-mode", "low-spec-perf");

			const profile: HardwareProfile = {
				tier: "ultra",
				score: 92,
				deviceMemoryGb: 16,
				cpuCores: 16,
				gpuType: "discrete",
				gpuRenderer: "NVIDIA RTX 4080",
				gpuVendor: "NVIDIA",
				webgl2Supported: true,
				webgpuSupported: true,
				maxTextureSize: 32768,
				max3dTextureSize: 8192,
				fillrateScore: 100,
				isBatterySaving: false,
				isSaveDataActive: false,
				effectiveConnectionType: null,
				prefersReducedMotion: false,
				reasons: ["ram:16GB+ (+25)", "cores:16 (+25)", "gpu:discrete (+35)"],
				detectedAt: Date.now(),
				version: 1,
			};

			applyHardwareProfileToRoot(profile, mockRoot);

			assert.equal(mockRoot.getAttribute("data-hardware-tier"), "ultra");
			assert.equal(mockRoot.getAttribute("data-perf"), "ultra");
			assert.equal(mockRoot.getAttribute("data-low-spec"), null);
			assert.equal(mockRoot.classList.contains("low-spec-mode"), false);
			assert.equal(mockRoot.classList.contains("low-spec-perf"), false);
		});
	});

	// =========================================================================
	// 7. DYNAMIC TELEMETRY STATES & LISTENERS
	// =========================================================================
	describe("7. Dynamic Telemetry States & Reactive Listeners", () => {
		it("transitions between healthy and degraded performance states", () => {
			let notifiedState: string | null = null;
			const unsubscribe = onPerfStateChange((state) => {
				notifiedState = state;
			});

			setDynamicPerfState("degraded");
			assert.equal(getPerfState(), "degraded");
			assert.equal(notifiedState, "degraded");

			setDynamicPerfState("healthy");
			assert.equal(getPerfState(), "healthy");
			assert.equal(notifiedState, "healthy");

			unsubscribe();
		});

		it("tracks CT 3D scan activation and notifies subscribers", () => {
			let notifiedCtActive: boolean | null = null;
			const unsubscribe = onCtActiveChange((active) => {
				notifiedCtActive = active;
			});

			setCtScanActive(true);
			assert.equal(getCtScanActive(), true);
			assert.equal(notifiedCtActive, true);

			setCtScanActive(false);
			assert.equal(getCtScanActive(), false);
			assert.equal(notifiedCtActive, false);

			unsubscribe();
		});

		it("dispatches profile updates via onHardwareProfileChange", () => {
			let receivedProfile: HardwareProfile | null = null;
			const unsubscribe = onHardwareProfileChange((p) => {
				receivedProfile = p;
			});

			setHardwareTierOverride("potato");
			assert.ok(receivedProfile !== null);
			assert.equal((receivedProfile as HardwareProfile | null)?.tier, "potato");

			unsubscribe();
		});
	});

	// =========================================================================
	// 8. DEVICE DETECTION UTILITIES DELEGATION
	// =========================================================================
	describe("8. deviceDetection.ts Integration & Delegation", () => {
		it("isLowSpecHardware() returns true when low-spec mode is active", () => {
			setHardwareTierOverride("potato");
			assert.equal(isLowSpecHardware(), true);

			setHardwareTierOverride("ultra");
			assert.equal(isLowSpecHardware(), false);
		});

		it("getHardwareResourceTier() maps potato/low to low, balanced to medium, ultra to high", () => {
			setHardwareTierOverride("potato");
			assert.equal(getHardwareResourceTier(), "low");

			setHardwareTierOverride("low");
			assert.equal(getHardwareResourceTier(), "low");

			setHardwareTierOverride("balanced");
			assert.equal(getHardwareResourceTier(), "medium");

			setHardwareTierOverride("ultra");
			assert.equal(getHardwareResourceTier(), "high");
			assert.equal(isHighPerformanceWorkstation(), true);
		});

		it("getAdaptiveDicomDownscaleFactor() downscales according to active tier", () => {
			setHardwareTierOverride("potato");
			assert.equal(getAdaptiveDicomDownscaleFactor(), 0.5);

			setHardwareTierOverride("low");
			assert.equal(getAdaptiveDicomDownscaleFactor(), 0.75);

			setHardwareTierOverride("balanced");
			assert.equal(getAdaptiveDicomDownscaleFactor(), 1.0);

			setHardwareTierOverride("ultra");
			assert.equal(getAdaptiveDicomDownscaleFactor(), 1.0);
		});
	});
});
