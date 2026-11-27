/**
 * apps/web/src/tests/perfAdaptivityInquisition.test.ts
 *
 * Red Team Inquisitor Test Suite:
 * Automatic Performance & UI Adaptivity under Hardware Constraints & CT 3D Rendering.
 *
 * Mandates 8c, 8e, 8k, 8n, 8v, 8t.
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
	applyHardwareProfileToRoot,
	getCtScanActive,
	getPerfState,
	isLowSpecDevice as isLowSpecFromCaps,
	setCtScanActive,
	setDynamicPerfState,
	_resetHardwareProfileCacheForTests,
} from "../lib/hardwareCapabilities";
import {
	isLowSpecDevice as isLowSpecFromPreload,
	scheduleClinicalHotModulesWarmup,
	scheduleIdleWorkspacePreload,
} from "../workspacePreload";
import { isLowSpecHardware as isLowSpecFromLazy } from "../lib/lazyWithRetry";
import { isLowSpecHardware as isLowSpecFromDevice } from "../utils/deviceDetection";
import { useUiSurfaceStore, CT_STUDIO_MODAL_IDS } from "../store/uiSurfaceStore";
import { RuntimePerformanceMonitor } from "../utils/telemetry/runtimePerformanceMonitor";

// Mock minimal DOM document & element
function createMockDocument() {
	const attrs = new Map<string, string>();
	const classes = new Set<string>();

	const docEl = {
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
	};

	return {
		documentElement: docEl,
		visibilityState: "visible",
		addEventListener: () => {},
		removeEventListener: () => {},
	};
}

describe("Red Team Adaptivity Inquisitor — Comprehensive Verification", () => {
	const originalDocument = globalThis.document;
	const originalWindow = globalThis.window;
	let mockDoc: ReturnType<typeof createMockDocument>;

	beforeEach(() => {
		mockDoc = createMockDocument();
		(globalThis as unknown as { document: unknown }).document = mockDoc;
		_resetHardwareProfileCacheForTests();
	});

	afterEach(() => {
		(globalThis as unknown as { document: unknown }).document = originalDocument;
		(globalThis as unknown as { window: unknown }).window = originalWindow;
	});

	describe("1. Root DOM Attribute Synchronization", () => {
		it("applyHardwareProfileToRoot sets data-perf-tier, data-perf-state, and data-ct-active", () => {
			setDynamicPerfState("healthy");
			setCtScanActive(false);

			applyHardwareProfileToRoot({
				tier: "potato",
				score: 15,
				deviceMemoryGb: 2,
				cpuCores: 2,
				gpuType: "integrated",
				gpuRenderer: "Intel HD Graphics",
				gpuVendor: "Intel",
				webgl2Supported: false,
				webgpuSupported: false,
				maxTextureSize: 2048,
				max3dTextureSize: null,
				fillrateScore: 10,
				isBatterySaving: false,
				isSaveDataActive: false,
				effectiveConnectionType: "4g",
				prefersReducedMotion: false,
				isSlowDisk: false,
				reasons: [],
				detectedAt: Date.now(),
				version: 1,
			});

			const root = mockDoc.documentElement;
			assert.equal(root.getAttribute("data-perf-tier"), "potato");
			assert.equal(root.getAttribute("data-hardware-tier"), "potato");
			assert.equal(root.getAttribute("data-perf-state"), "healthy");
			assert.equal(root.getAttribute("data-ct-active"), "false");
			assert.equal(root.getAttribute("data-low-spec"), "true");
			assert.equal(root.getAttribute("data-perf"), "low");
		});

		it("dynamically toggles data-perf-state between healthy and degraded", () => {
			setDynamicPerfState("degraded");
			assert.equal(getPerfState(), "degraded");
			assert.equal(mockDoc.documentElement.getAttribute("data-perf-state"), "degraded");

			setDynamicPerfState("healthy");
			assert.equal(getPerfState(), "healthy");
			assert.equal(mockDoc.documentElement.getAttribute("data-perf-state"), "healthy");
		});

		it("dynamically toggles data-ct-active and notifies state", () => {
			setCtScanActive(true);
			assert.equal(getCtScanActive(), true);
			assert.equal(mockDoc.documentElement.getAttribute("data-ct-active"), "true");

			setCtScanActive(false);
			assert.equal(getCtScanActive(), false);
			assert.equal(mockDoc.documentElement.getAttribute("data-ct-active"), "false");
		});
	});

	describe("2. UI Surface Store CT Modal Integration", () => {
		it("recognizes all canonical CT Studio modal IDs", () => {
			assert.ok(CT_STUDIO_MODAL_IDS.has("cbct_implant_studio"));
			assert.ok(CT_STUDIO_MODAL_IDS.has("dicom_viewer"));
			assert.ok(CT_STUDIO_MODAL_IDS.has("cephalometric_trg"));
		});

		it("opening cbct_implant_studio activates data-ct-active on root DOM", () => {
			const store = useUiSurfaceStore.getState();
			store.closeAllSurfaces();
			assert.equal(mockDoc.documentElement.getAttribute("data-ct-active"), "false");
			assert.equal(store.isCtRunning(), false);

			store.openPrimaryModal("cbct_implant_studio");
			assert.equal(mockDoc.documentElement.getAttribute("data-ct-active"), "true");
			assert.equal(useUiSurfaceStore.getState().isCtRunning(), true);

			store.closePrimaryModal("cbct_implant_studio");
			assert.equal(mockDoc.documentElement.getAttribute("data-ct-active"), "false");
			assert.equal(useUiSurfaceStore.getState().isCtRunning(), false);
		});
	});

	describe("3. Workspace Preload Throttling under Low Hardware / Active CT", () => {
		it("isLowSpecDevice recognizes data-perf-tier potato and low", () => {
			mockDoc.documentElement.setAttribute("data-perf-tier", "potato");
			assert.equal(isLowSpecFromPreload(), true);
			assert.equal(isLowSpecFromCaps(), true);
			assert.equal(isLowSpecFromLazy(), true);
			assert.equal(isLowSpecFromDevice(), true);

			mockDoc.documentElement.setAttribute("data-perf-tier", "balanced");
			mockDoc.documentElement.removeAttribute("data-low-spec");
			assert.equal(isLowSpecFromPreload(), false);
		});

		it("isLowSpecDevice recognizes data-perf-state degraded", () => {
			mockDoc.documentElement.setAttribute("data-perf-tier", "balanced");
			mockDoc.documentElement.setAttribute("data-perf-state", "degraded");
			assert.equal(isLowSpecFromPreload(), true);
			assert.equal(isLowSpecFromCaps(), true);
			assert.equal(isLowSpecFromLazy(), true);
			assert.equal(isLowSpecFromDevice(), true);
		});

		it("isLowSpecDevice recognizes data-ct-active true", () => {
			mockDoc.documentElement.setAttribute("data-perf-tier", "balanced");
			mockDoc.documentElement.setAttribute("data-perf-state", "healthy");
			mockDoc.documentElement.setAttribute("data-ct-active", "true");
			assert.equal(isLowSpecFromPreload(), true);
			assert.equal(isLowSpecFromCaps(), true);
			assert.equal(isLowSpecFromLazy(), true);
			assert.equal(isLowSpecFromDevice(), true);
		});

		it("scheduleIdleWorkspacePreload returns undefined immediately when CT is active", () => {
			mockDoc.documentElement.setAttribute("data-ct-active", "true");
			const cancel = scheduleIdleWorkspacePreload("schedule");
			assert.equal(cancel, undefined, "Idle preload must be aborted when CT scan is active");
		});

		it("scheduleIdleWorkspacePreload returns undefined immediately when tier is potato", () => {
			mockDoc.documentElement.setAttribute("data-ct-active", "false");
			mockDoc.documentElement.setAttribute("data-perf-tier", "potato");
			const cancel = scheduleIdleWorkspacePreload("schedule");
			assert.equal(cancel, undefined, "Idle preload must be aborted on potato hardware");
		});

		it("scheduleClinicalHotModulesWarmup returns undefined immediately when CT is active", () => {
			mockDoc.documentElement.setAttribute("data-ct-active", "true");
			const cancel = scheduleClinicalHotModulesWarmup();
			assert.equal(cancel, undefined, "Hot modules warmup must be aborted when CT scan is active");
		});
	});

	describe("4. Runtime Performance Monitor Telemetry Synchronization", () => {
		it("synchronizes data-perf-state attribute during dynamic load transitions", () => {
			const monitor = new RuntimePerformanceMonitor({
				samplingIntervalMs: 5000,
				enableLongTasks: false,
				enableMemory: false,
				syncDomAttributes: true,
			});

			monitor.start();

			// Simulate catastrophic frame delay (> 120ms jitter) -> CRITICAL
			monitor.recordFrameDelta(150, 1000);
			assert.equal(mockDoc.documentElement.getAttribute("data-perf-state"), "degraded");
			assert.equal(mockDoc.documentElement.getAttribute("data-blur-disabled"), "true");

			monitor.stop();
		});
	});

	describe("5. Hardware Tier & Runtime Degradation Attribute Enforcement", () => {
		it("marks root element low-spec and potato tier for 2GB/2-core hardware", () => {
			setDynamicPerfState("healthy");
			setCtScanActive(false);

			applyHardwareProfileToRoot({
				tier: "potato",
				score: 10,
				deviceMemoryGb: 2,
				cpuCores: 2,
				gpuType: "integrated",
				gpuRenderer: "Intel UHD",
				gpuVendor: "Intel",
				webgl2Supported: false,
				webgpuSupported: false,
				maxTextureSize: 2048,
				max3dTextureSize: null,
				fillrateScore: 5,
				isBatterySaving: true,
				isSaveDataActive: true,
				effectiveConnectionType: "3g",
				prefersReducedMotion: true,
				isSlowDisk: true,
				reasons: ["low_memory"],
				detectedAt: Date.now(),
				version: 1,
			});

			const root = mockDoc.documentElement;
			assert.equal(root.getAttribute("data-perf-tier"), "potato");
			assert.equal(root.getAttribute("data-low-spec"), "true");
			assert.equal(root.getAttribute("data-perf"), "low");
			assert.equal(root.classList.contains("low-spec-mode"), true);
			assert.equal(isLowSpecFromCaps(), true);
		});

		it("activates CT mode & degraded perf state attributes simultaneously without overwriting hardware tier", () => {
			setCtScanActive(true);
			setDynamicPerfState("degraded");

			const root = mockDoc.documentElement;
			assert.equal(getCtScanActive(), true);
			assert.equal(getPerfState(), "degraded");
			assert.equal(root.getAttribute("data-ct-active"), "true");
			assert.equal(root.getAttribute("data-perf-state"), "degraded");

			setCtScanActive(false);
			setDynamicPerfState("healthy");
			assert.equal(root.getAttribute("data-ct-active"), "false");
			assert.equal(root.getAttribute("data-perf-state"), "healthy");
		});
	});
});
