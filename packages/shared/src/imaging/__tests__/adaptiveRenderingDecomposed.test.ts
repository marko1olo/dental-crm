import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CBCT_HIBERNATION_POLL_INTERVAL_MS,
	evaluateCbctPerformanceStress,
	shouldHibernateOnVisibility,
	createCbctLifecycleManager,
	CbctRenderLifecycleManager,
} from "../adaptiveRendering/index.js";
import {
	getDowngradedRenderingTier,
	deriveAdaptiveRenderProfile,
	calculateTextureVramMb,
} from "../cbctAdaptiveRendering.js";

describe("Adaptive Rendering Decomposed Architecture & Lifecycle Verification", () => {
	it("1. Facade export parity and backward compatibility", () => {
		assert.equal(getDowngradedRenderingTier("ultra"), "balanced");
		assert.equal(getDowngradedRenderingTier("balanced"), "low");
		assert.equal(getDowngradedRenderingTier("low"), "potato");
		assert.equal(getDowngradedRenderingTier("potato"), "potato");

		const profile = deriveAdaptiveRenderProfile({}, "nominal", "ultra");
		assert.equal(profile.tier, "ultra");
		assert.equal(profile.idleDownsampleFactor, 1.0);

		const vram = calculateTextureVramMb(256, 256, 256, 2);
		assert.equal(vram, 32);
	});

	it("2. evaluateCbctPerformanceStress accurately categorizes frame latency budgets", () => {
		// <= 22ms -> nominal (>= 45 FPS)
		assert.equal(evaluateCbctPerformanceStress(16.6), "nominal");
		assert.equal(evaluateCbctPerformanceStress(22.0), "nominal");

		// 22..45ms -> elevated (22..45 FPS)
		assert.equal(evaluateCbctPerformanceStress(25.0), "elevated");
		assert.equal(evaluateCbctPerformanceStress(45.0), "elevated");

		// > 45ms -> critical (< 22 FPS)
		assert.equal(evaluateCbctPerformanceStress(45.1), "critical");
		assert.equal(evaluateCbctPerformanceStress(80.0), "critical");
	});

	it("3. CbctRenderLifecycleManager handles tab hibernation & visibility transitions", () => {
		const manager = createCbctLifecycleManager();
		assert.equal(manager.getState(), "active");
		assert.equal(manager.isActive(), true);
		assert.equal(manager.isHibernating(), false);
		assert.equal(manager.getHibernationPollIntervalMs(), CBCT_HIBERNATION_POLL_INTERVAL_MS);

		// Visibility helper
		assert.equal(shouldHibernateOnVisibility("hidden"), true);
		assert.equal(shouldHibernateOnVisibility("visible"), false);

		// State transitions with subscriber
		const stateLog: string[] = [];
		const unsubscribe = manager.subscribe((state) => {
			stateLog.push(state);
		});

		manager.setTabVisibility("hidden");
		assert.equal(manager.getState(), "hibernating");
		assert.equal(manager.isHibernating(), true);

		manager.setTabVisibility("visible");
		assert.equal(manager.getState(), "active");
		assert.equal(manager.isActive(), true);

		assert.deepEqual(stateLog, ["hibernating", "active"]);
		unsubscribe();
	});

	it("4. CbctRenderLifecycleManager intercepts WebGL context loss and restores cleanly", () => {
		const manager = new CbctRenderLifecycleManager("active");
		let defaultPrevented = false;

		manager.handleContextLost({
			preventDefault: () => {
				defaultPrevented = true;
			},
		});

		assert.equal(defaultPrevented, true);
		assert.equal(manager.getState(), "context_lost");
		assert.equal(manager.isContextLost(), true);

		// WebGL context restored
		manager.handleContextRestored();
		assert.equal(manager.getState(), "active");
		assert.equal(manager.isActive(), true);
	});

	it("5. CbctRenderLifecycleManager tracks 3D texture VRAM footprint and prevents leaks", () => {
		const manager = createCbctLifecycleManager();

		// Track 512x512x400 texture (200 MB)
		const tex1 = manager.trackTextureAllocation("tex-cbct-axial-01", 512, 512, 400, 2);
		assert.equal(tex1.sizeMb, 200);
		assert.equal(manager.getAllocatedTextureCount(), 1);
		assert.equal(manager.getTotalAllocatedVramMb(), 200);

		// Track 256x256x256 texture (32 MB)
		const tex2 = manager.trackTextureAllocation("tex-cbct-sagittal-02", 256, 256, 256, 2);
		assert.equal(tex2.sizeMb, 32);
		assert.equal(manager.getAllocatedTextureCount(), 2);
		assert.equal(manager.getTotalAllocatedVramMb(), 232);

		// Release first texture
		assert.equal(manager.releaseTextureAllocation("tex-cbct-axial-01"), true);
		assert.equal(manager.getAllocatedTextureCount(), 1);
		assert.equal(manager.getTotalAllocatedVramMb(), 32);

		// Dispose manager frees all
		manager.dispose();
		assert.equal(manager.getState(), "disposed");
		assert.equal(manager.getAllocatedTextureCount(), 0);
		assert.equal(manager.getTotalAllocatedVramMb(), 0);
	});
});
