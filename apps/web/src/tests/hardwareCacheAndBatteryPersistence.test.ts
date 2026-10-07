/**
 * apps/web/src/tests/hardwareCacheAndBatteryPersistence.test.ts
 *
 * RED TEAM INQUISITOR SPECIFICATION:
 * 1. Hardware Profile Persistence:
 *    - Canonical key: "dente_hardware_profile_v1"
 *    - TTL: 7 days (604,800,000 ms)
 *    - Hardware Fingerprint: vendor + renderer + CPU cores
 *    - 0ms overhead on F5: skips fillrate benchmark when fingerprint matches
 *    - Automatic invalidation on GPU/hardware change or TTL expiry
 * 2. Battery & Thermal Throttling:
 *    - Low battery condition: discharging and level <= 20%
 *    - Adaptive limits: target FPS capped to 30, raymarching step multiplier 1.8x,
 *      CT 3D downsample factor >= 2, blur disabled
 *    - Root DOM attribute data-battery-saving="true"
 * 3. Doctor Autonomy (Mandate 8e):
 *    - Zero blocking popups, full autonomy maintained
 *    - Manual re-evaluation trigger for doctor settings
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
	getHardwareAdaptiveSettings,
	type HardwareTier,
	type HardwareProfile,
} from "@dental/shared";
import {
	HARDWARE_PROFILE_STORAGE_KEY,
	HARDWARE_PROFILE_LEGACY_KEY,
	HARDWARE_PROFILE_CACHE_TTL_MS,
	HARDWARE_PROFILE_SCHEMA_VERSION,
	computeHardwareFingerprint,
	evaluateHardwareProfile,
	getHardwareProfile,
	clearHardwareProfileCache,
	reevaluateHardwareProfile,
	applyHardwareProfileToRoot,
	_resetHardwareProfileCacheForTests,
	_setCachedGpuDetailsForTests,
	_setCachedFillrateScoreForTests,
} from "../lib/hardwareCapabilities";
import {
	RuntimePerformanceMonitor,
} from "../utils/telemetry/runtimePerformanceMonitor";
import {
	clearInMemoryStorageCache,
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
	safeLocalStorageRemoveItem,
} from "../lib/safeLocalStorage";

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

function restoreOriginalNavigator() {
	if (originalNavigatorDesc) {
		Object.defineProperty(globalThis, "navigator", originalNavigatorDesc);
	}
}

describe("Hardware Profile Persistence & 7-Day TTL", () => {
	beforeEach(() => {
		_resetHardwareProfileCacheForTests();
		clearInMemoryStorageCache();
		safeLocalStorageRemoveItem(HARDWARE_PROFILE_STORAGE_KEY);
		safeLocalStorageRemoveItem(HARDWARE_PROFILE_LEGACY_KEY);
	});

	afterEach(() => {
		_resetHardwareProfileCacheForTests();
		clearInMemoryStorageCache();
		restoreOriginalNavigator();
	});

	it("verifies canonical cache constants: dente_hardware_profile_v1 and 7-day TTL", () => {
		assert.equal(
			HARDWARE_PROFILE_STORAGE_KEY,
			"dente_hardware_profile_v1",
			"Must match canonical storage key specification",
		);
		const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
		assert.equal(
			HARDWARE_PROFILE_CACHE_TTL_MS,
			SEVEN_DAYS_MS,
			"Cache TTL must be exactly 7 days (604,800,000 ms)",
		);
	});

	it("computes deterministic hardware fingerprint string", () => {
		const fp1 = computeHardwareFingerprint("NVIDIA Corporation", "NVIDIA GeForce RTX 4080", 16);
		assert.equal(fp1, "nvidia corporation|nvidia geforce rtx 4080|16");

		const fpNull = computeHardwareFingerprint(null, null, null);
		assert.equal(fpNull, "unknown|unknown|unknown");
	});

	it("saves valid profile with fingerprint to localStorage upon evaluation", () => {
		setMockNavigator({
			hardwareConcurrency: 8,
			deviceMemory: 16,
		});

		_setCachedGpuDetailsForTests({
			renderer: "Apple M2 Pro",
			vendor: "Apple",
			gpuType: "apple_silicon",
			webgl2Supported: true,
			maxTextureSize: 16384,
			max3dTextureSize: 4096,
		});
		_setCachedFillrateScoreForTests(85);

		const profile = evaluateHardwareProfile({ forceFresh: true });
		assert.equal(profile.tier, "ultra");

		const rawSaved = safeLocalStorageGetItem(HARDWARE_PROFILE_STORAGE_KEY);
		assert.ok(rawSaved, "Must write to localStorage under dente_hardware_profile_v1");

		const parsed = JSON.parse(rawSaved);
		assert.equal(parsed.version, HARDWARE_PROFILE_SCHEMA_VERSION);
		assert.equal(parsed.fingerprint, "apple|apple m2 pro|8");
		assert.equal(parsed.profile.tier, "ultra");
		assert.ok(typeof parsed.cachedAt === "number");
	});

	it("skips micro-benchmark and returns cached profile (0ms overhead) when fingerprint matches within 7 days", () => {
		setMockNavigator({
			hardwareConcurrency: 8,
			deviceMemory: 16,
		});

		_setCachedGpuDetailsForTests({
			renderer: "Apple M2 Pro",
			vendor: "Apple",
			gpuType: "apple_silicon",
			webgl2Supported: true,
			maxTextureSize: 16384,
			max3dTextureSize: 4096,
		});

		// Seed cache
		const now = Date.now();
		const cachedProfile: HardwareProfile = {
			tier: "ultra",
			score: 95,
			deviceMemoryGb: 16,
			cpuCores: 8,
			gpuType: "apple_silicon",
			gpuRenderer: "Apple M2 Pro",
			gpuVendor: "Apple",
			webgl2Supported: true,
			webgpuSupported: false,
			maxTextureSize: 16384,
			max3dTextureSize: 4096,
			fillrateScore: 92,
			isBatterySaving: false,
			isSaveDataActive: false,
			effectiveConnectionType: null,
			prefersReducedMotion: false,
			reasons: ["cached-test"],
			detectedAt: now - 1000 * 60 * 60 * 24 * 2, // 2 days old
			version: HARDWARE_PROFILE_SCHEMA_VERSION,
		};

		safeLocalStorageSetItem(
			HARDWARE_PROFILE_STORAGE_KEY,
			JSON.stringify({
				version: HARDWARE_PROFILE_SCHEMA_VERSION,
				cachedAt: now - 1000 * 60 * 60 * 24 * 2, // 2 days old
				fingerprint: "apple|apple m2 pro|8",
				profile: cachedProfile,
			}),
		);

		// Now reset in-memory state to simulate fresh page load (F5)
		_resetHardwareProfileCacheForTests();
		_setCachedGpuDetailsForTests({
			renderer: "Apple M2 Pro",
			vendor: "Apple",
			gpuType: "apple_silicon",
			webgl2Supported: true,
			maxTextureSize: 16384,
			max3dTextureSize: 4096,
		});
		// Note: no fillrate benchmark injected — cache must supply it!

		const loaded = evaluateHardwareProfile();
		assert.equal(loaded.tier, "ultra");
		assert.equal(loaded.score, 95);
		assert.equal(loaded.fillrateScore, 92);
		assert.deepEqual(loaded.reasons, ["cached-test"]);
	});

	it("invalidates cache when hardware fingerprint changes (GPU switch from iGPU to dGPU)", () => {
		setMockNavigator({
			hardwareConcurrency: 8,
			deviceMemory: 16,
		});

		// Previous cache with old integrated GPU
		const now = Date.now();
		safeLocalStorageSetItem(
			HARDWARE_PROFILE_STORAGE_KEY,
			JSON.stringify({
				version: HARDWARE_PROFILE_SCHEMA_VERSION,
				cachedAt: now - 1000 * 60 * 60, // 1 hour old
				fingerprint: "intel|intel uhd graphics 630|8",
				profile: {
					tier: "low",
					score: 42,
					deviceMemoryGb: 16,
					cpuCores: 8,
					gpuType: "integrated",
					gpuRenderer: "Intel UHD Graphics 630",
					gpuVendor: "Intel",
					webgl2Supported: true,
					webgpuSupported: false,
					maxTextureSize: 8192,
					max3dTextureSize: 2048,
					fillrateScore: 35,
					isBatterySaving: false,
					isSaveDataActive: false,
					effectiveConnectionType: null,
					prefersReducedMotion: false,
					reasons: ["old-gpu"],
					detectedAt: now - 1000 * 60 * 60,
					version: HARDWARE_PROFILE_SCHEMA_VERSION,
				},
			}),
		);

		_resetHardwareProfileCacheForTests();

		// New active GPU is NVIDIA RTX 4070
		_setCachedGpuDetailsForTests({
			renderer: "NVIDIA GeForce RTX 4070",
			vendor: "NVIDIA Corporation",
			gpuType: "discrete",
			webgl2Supported: true,
			maxTextureSize: 32768,
			max3dTextureSize: 8192,
		});
		_setCachedFillrateScoreForTests(96);

		const updated = evaluateHardwareProfile();
		assert.equal(updated.tier, "ultra", "Must evaluate fresh tier after GPU switch");
		assert.equal(updated.gpuRenderer, "NVIDIA GeForce RTX 4070");

		// Stale cache should be replaced with new fingerprint
		const rawUpdated = safeLocalStorageGetItem(HARDWARE_PROFILE_STORAGE_KEY);
		assert.ok(rawUpdated);
		const parsedUpdated = JSON.parse(rawUpdated);
		assert.equal(parsedUpdated.fingerprint, "nvidia corporation|nvidia geforce rtx 4070|8");
	});

	it("invalidates cache when TTL expires (> 7 days)", () => {
		setMockNavigator({
			hardwareConcurrency: 8,
			deviceMemory: 16,
		});

		const now = Date.now();
		const EIGHT_DAYS_AGO = now - 8 * 24 * 60 * 60 * 1000;

		safeLocalStorageSetItem(
			HARDWARE_PROFILE_STORAGE_KEY,
			JSON.stringify({
				version: HARDWARE_PROFILE_SCHEMA_VERSION,
				cachedAt: EIGHT_DAYS_AGO, // 8 days old
				fingerprint: "apple|apple m2 pro|8",
				profile: {
					tier: "low", // stale tier
					score: 30,
					deviceMemoryGb: 16,
					cpuCores: 8,
					gpuType: "apple_silicon",
					gpuRenderer: "Apple M2 Pro",
					gpuVendor: "Apple",
					webgl2Supported: true,
					webgpuSupported: false,
					maxTextureSize: 16384,
					max3dTextureSize: 4096,
					fillrateScore: 40,
					isBatterySaving: false,
					isSaveDataActive: false,
					effectiveConnectionType: null,
					prefersReducedMotion: false,
					reasons: ["stale"],
					detectedAt: EIGHT_DAYS_AGO,
					version: HARDWARE_PROFILE_SCHEMA_VERSION,
				},
			}),
		);

		_resetHardwareProfileCacheForTests();
		_setCachedGpuDetailsForTests({
			renderer: "Apple M2 Pro",
			vendor: "Apple",
			gpuType: "apple_silicon",
			webgl2Supported: true,
			maxTextureSize: 16384,
			max3dTextureSize: 4096,
		});
		_setCachedFillrateScoreForTests(90);

		const fresh = evaluateHardwareProfile();
		assert.equal(fresh.tier, "ultra", "Must perform fresh benchmark after 7-day TTL expiry");
	});

	it("supports manual doctor re-evaluation (reevaluateHardwareProfile / clearHardwareProfileCache)", () => {
		setMockNavigator({
			hardwareConcurrency: 8,
			deviceMemory: 8,
		});
		_setCachedGpuDetailsForTests({
			renderer: "Intel Iris Xe",
			vendor: "Intel",
			gpuType: "integrated",
			webgl2Supported: true,
			maxTextureSize: 16384,
			max3dTextureSize: 2048,
		});
		_setCachedFillrateScoreForTests(60);

		evaluateHardwareProfile();
		assert.ok(safeLocalStorageGetItem(HARDWARE_PROFILE_STORAGE_KEY));

		clearHardwareProfileCache();
		assert.equal(safeLocalStorageGetItem(HARDWARE_PROFILE_STORAGE_KEY), null);

		const reevaluated = reevaluateHardwareProfile();
		assert.equal(reevaluated.tier, "balanced");
		assert.ok(safeLocalStorageGetItem(HARDWARE_PROFILE_STORAGE_KEY));
	});
});

describe("Battery & Thermal Throttling Integration", () => {
	beforeEach(() => {
		_resetHardwareProfileCacheForTests();
		clearInMemoryStorageCache();
	});

	afterEach(() => {
		_resetHardwareProfileCacheForTests();
		clearInMemoryStorageCache();
		restoreOriginalNavigator();
	});

	it("activates isBatterySaving when discharging and battery level <= 20%", () => {
		setMockNavigator({
			hardwareConcurrency: 8,
			deviceMemory: 16,
		});
		_setCachedGpuDetailsForTests({
			renderer: "Apple M3 Max",
			vendor: "Apple",
			gpuType: "apple_silicon",
			webgl2Supported: true,
			maxTextureSize: 16384,
			max3dTextureSize: 4096,
		});
		_setCachedFillrateScoreForTests(95);

		// Battery discharging at 15%
		const profileLowBattery = evaluateHardwareProfile({
			forceFresh: true,
			batteryState: { charging: false, level: 0.15 },
		});
		assert.equal(profileLowBattery.isBatterySaving, true);
		assert.ok(profileLowBattery.reasons.some((r) => r.includes("battery-saving")));

		// Battery charging at 15% -> not battery saving
		const profileCharging = evaluateHardwareProfile({
			forceFresh: true,
			batteryState: { charging: true, level: 0.15 },
		});
		assert.equal(profileCharging.isBatterySaving, false);

		// Battery discharging at 80% -> not battery saving
		const profileHighBattery = evaluateHardwareProfile({
			forceFresh: true,
			batteryState: { charging: false, level: 0.80 },
		});
		assert.equal(profileHighBattery.isBatterySaving, false);
	});

	it("updates root DOM element with data-battery-saving attribute", () => {
		const mockRoot = createMockHtmlElement();

		const lowBatteryProfile: HardwareProfile = {
			tier: "ultra",
			score: 80,
			deviceMemoryGb: 16,
			cpuCores: 8,
			gpuType: "apple_silicon",
			gpuRenderer: "Apple M2 Pro",
			gpuVendor: "Apple",
			webgl2Supported: true,
			webgpuSupported: false,
			maxTextureSize: 16384,
			max3dTextureSize: 4096,
			fillrateScore: 90,
			isBatterySaving: true,
			isSaveDataActive: false,
			effectiveConnectionType: null,
			prefersReducedMotion: false,
			reasons: [],
			detectedAt: Date.now(),
			version: HARDWARE_PROFILE_SCHEMA_VERSION,
		};

		applyHardwareProfileToRoot(lowBatteryProfile, mockRoot);
		assert.equal(mockRoot.getAttribute("data-battery-saving"), "true");

		const normalBatteryProfile = { ...lowBatteryProfile, isBatterySaving: false };
		applyHardwareProfileToRoot(normalBatteryProfile, mockRoot);
		assert.equal(mockRoot.getAttribute("data-battery-saving"), null);
	});

	it("configures HardwareAdaptiveSettings for battery saving (30 FPS cap, 1.8x raymarching step, ctDownsampleFactor >= 2)", () => {
		const ultraNormal = getHardwareAdaptiveSettings("ultra", { isBatterySaving: false });
		assert.equal(ultraNormal.targetFpsCap, 60);
		assert.equal(ultraNormal.raymarchingStepMultiplier, 1.0);
		assert.equal(ultraNormal.ctDownsampleFactor, 1);
		assert.equal(ultraNormal.disableBackdropBlur, false);

		const ultraBatterySaving = getHardwareAdaptiveSettings("ultra", { isBatterySaving: true });
		assert.equal(ultraBatterySaving.targetFpsCap, 30, "Target FPS cap must be 30 on battery saving");
		assert.equal(ultraBatterySaving.raymarchingStepMultiplier, 1.8, "Raymarching step multiplier must be 1.8x");
		assert.ok(ultraBatterySaving.ctDownsampleFactor >= 2, "CT Downsample factor must be >= 2");
		assert.equal(ultraBatterySaving.disableBackdropBlur, true, "Backdrop blur must be disabled");

		// Even potato/low maintain cap 30
		const potatoBatterySaving = getHardwareAdaptiveSettings("potato", { isBatterySaving: true });
		assert.equal(potatoBatterySaving.targetFpsCap, 30);
		assert.equal(potatoBatterySaving.disableBackdropBlur, true);
	});

	it("integrates with RuntimePerformanceMonitor: setBatteryThrottling sets 30 FPS cap and data-battery-saving", () => {
		let mockTime = 1000;
		const monitor = new RuntimePerformanceMonitor({
			now: () => mockTime,
			samplingIntervalMs: 5000,
			syncDomAttributes: false,
		});

		const initialSnapshot = monitor.getSnapshot();
		assert.equal(initialSnapshot.targetFpsCap, 60);
		assert.equal(initialSnapshot.isBatteryThrottling, false);

		// Activate battery throttling
		monitor.setBatteryThrottling(true);
		const throttledSnapshot = monitor.getSnapshot();
		assert.equal(throttledSnapshot.isBatteryThrottling, true);
		assert.equal(throttledSnapshot.targetFpsCap, 30, "Target FPS cap must be clamped to 30");
		assert.equal(throttledSnapshot.recommendedBlurDisabled, true);
		assert.ok(throttledSnapshot.downscaleFactor <= 0.75);

		// Deactivate battery throttling
		monitor.setBatteryThrottling(false);
		const restoredSnapshot = monitor.getSnapshot();
		assert.equal(restoredSnapshot.isBatteryThrottling, false);
		assert.equal(restoredSnapshot.targetFpsCap, 60);
	});

	it("upholds Doctor Autonomy (Mandate 8e): battery saving never locks UI or blocks dental procedures", () => {
		// Even in battery-saving mode, all essential settings remain functional:
		const settings = getHardwareAdaptiveSettings("balanced", { isBatterySaving: true });
		// Autosave debounce is reasonable and functional (<= 1000ms, doctor never loses draft)
		assert.ok(settings.autosaveDebounceMs <= 1000);
		// Virtualization flag is valid boolean
		assert.equal(typeof settings.aggressiveVirtualization, "boolean");
		// No NaN or negative numbers
		assert.ok(settings.ctDownsampleFactor > 0);
		assert.ok(settings.ctSliceBatchSize > 0);
	});
});
