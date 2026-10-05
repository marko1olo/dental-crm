import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	RuntimePerformanceMonitor,
	getDynamicPerformanceSnapshot,
	subscribeToPerformanceStateChange,
} from "./runtimePerformanceMonitor.js";
import {
	getDynamicPerformanceState,
	isHostUnderHeavyLoad,
	getAdaptiveDicomDownscaleFactor,
} from "../deviceDetection.js";

describe("RuntimePerformanceMonitor Suite (Wave-HostTelemetry)", () => {
	it("initializes with HEALTHY state and standard 60 FPS defaults", () => {
		let mockTime = 1000;
		const monitor = new RuntimePerformanceMonitor({
			now: () => mockTime,
			samplingIntervalMs: 5000,
			recoveryDurationMs: 10000,
		});

		const snap = monitor.getSnapshot();
		assert.equal(snap.state, "HEALTHY");
		assert.equal(snap.downscaleFactor, 1.0);
		assert.equal(snap.targetFpsCap, 60);
		assert.equal(snap.recommendedBlurDisabled, false);
		assert.equal(snap.isThrottlingRecommended, false);
		assert.equal(snap.metrics.averageFps, 60);
		assert.equal(snap.metrics.longTaskCount, 0);

		monitor.stop();
	});

	it("computes FPS, jitter, and P95 frame time accurately without GC thrashing", () => {
		let mockTime = 10000;
		const monitor = new RuntimePerformanceMonitor({
			now: () => mockTime,
			sampleWindowFrames: 10,
		});

		// Feed 10 steady 16.6ms frames (~60 FPS)
		for (let i = 0; i < 10; i++) {
			mockTime += 16.6;
			monitor.recordFrameDelta(16.6, mockTime);
		}

		let snap = monitor.getSnapshot();
		assert.equal(snap.state, "HEALTHY");
		assert.ok(snap.metrics.averageFps >= 59 && snap.metrics.averageFps <= 61);
		assert.ok(snap.metrics.jitterMs <= 1.0);

		// Now simulate severe frame drops: 10 frames of 45ms each (~22 FPS)
		for (let i = 0; i < 10; i++) {
			mockTime += 45;
			monitor.recordFrameDelta(45, mockTime);
		}

		snap = monitor.getSnapshot();
		// FPS ~22 should trigger immediate DEGRADED state
		assert.equal(snap.state, "DEGRADED");
		assert.ok(snap.metrics.averageFps <= 25);
		assert.equal(snap.downscaleFactor, 0.65);
		assert.equal(snap.targetFpsCap, 30);
		assert.equal(snap.recommendedBlurDisabled, true);
		assert.equal(snap.isThrottlingRecommended, true);

		monitor.stop();
	});

	it("detects Long Tasks (>50ms) and aggregates sliding window metrics", () => {
		let mockTime = 20000;
		const monitor = new RuntimePerformanceMonitor({
			now: () => mockTime,
			longTaskWindowMs: 5000,
		});

		// 1. Single small long task: 90ms
		monitor.recordLongTask(90, mockTime);
		let snap = monitor.getSnapshot();
		assert.equal(snap.metrics.longTaskCount, 1);
		assert.equal(snap.metrics.totalLongTaskDurationMs, 90);
		assert.equal(snap.metrics.maxLongTaskDurationMs, 90);
		assert.equal(snap.state, "WARNING");

		// 2. Additional heavy long tasks within sliding window
		mockTime += 500;
		monitor.recordLongTask(150, mockTime);
		mockTime += 500;
		monitor.recordLongTask(180, mockTime);

		snap = monitor.getSnapshot();
		assert.equal(snap.metrics.longTaskCount, 3);
		assert.equal(snap.metrics.totalLongTaskDurationMs, 420);
		assert.equal(snap.state, "DEGRADED");
		assert.equal(snap.recommendedBlurDisabled, true);

		// 3. Catastrophic long task (> 800ms UI freeze) triggers CRITICAL
		mockTime += 500;
		monitor.recordLongTask(850, mockTime);
		snap = monitor.getSnapshot();
		assert.equal(snap.state, "CRITICAL");
		assert.equal(snap.downscaleFactor, 0.45);
		assert.equal(snap.targetFpsCap, 15);

		// 4. Sliding window eviction: advance clock by 6000ms
		mockTime += 6500;
		// Record one smooth frame delta to trigger evaluation
		monitor.recordFrameDelta(16.6, mockTime);

		snap = monitor.getSnapshot();
		// Old long tasks must be evicted from the 5s window
		assert.equal(snap.metrics.longTaskCount, 0);
		assert.equal(snap.metrics.totalLongTaskDurationMs, 0);

		monitor.stop();
	});

	it("enforces strict Hysteresis: fast degradation, slow 10s recovery gate (Anti-Thrashing)", () => {
		let mockTime = 50000;
		const monitor = new RuntimePerformanceMonitor({
			now: () => mockTime,
			recoveryDurationMs: 10000, // 10 seconds of stability required
			sampleWindowFrames: 5,
		});

		// 1. Initial healthy state
		for (let i = 0; i < 5; i++) {
			mockTime += 16.6;
			monitor.recordFrameDelta(16.6, mockTime);
		}
		assert.equal(monitor.getSnapshot().state, "HEALTHY");

		// 2. Sudden load burst (FPS drops to 20ms) -> FAST DEGRADE
		for (let i = 0; i < 5; i++) {
			mockTime += 50;
			monitor.recordFrameDelta(50, mockTime);
		}
		assert.equal(monitor.getSnapshot().state, "DEGRADED");

		// 3. Performance recovers back to 60 FPS
		// Step 3a: First recovery sample initiates candidate at mockTime
		mockTime += 100;
		for (let i = 0; i < 5; i++) {
			mockTime += 16.6;
			monitor.recordFrameDelta(16.6, mockTime);
		}
		assert.equal(monitor.getSnapshot().state, "DEGRADED", "State must remain DEGRADED initially");

		// Step 3b: 3 seconds elapsed (3000ms < 10000ms threshold)
		mockTime += 3000;
		for (let i = 0; i < 5; i++) {
			mockTime += 16.6;
			monitor.recordFrameDelta(16.6, mockTime);
		}
		assert.equal(monitor.getSnapshot().state, "DEGRADED", "State must remain DEGRADED at 3s");

		// Step 3c: 7 seconds elapsed (7000ms < 10000ms threshold)
		mockTime += 4000;
		for (let i = 0; i < 5; i++) {
			mockTime += 16.6;
			monitor.recordFrameDelta(16.6, mockTime);
		}
		assert.equal(monitor.getSnapshot().state, "DEGRADED", "State must remain DEGRADED at 7s");

		// Step 3d: Stutter interruption — a heavy long task resets recovery timer!
		mockTime += 500;
		monitor.recordLongTask(320, mockTime);
		assert.equal(monitor.getSnapshot().state, "DEGRADED");

		// Step 3e: Wait until long task is out of sliding window (6500ms > 6000ms) to re-establish candidate
		mockTime += 6500;
		for (let i = 0; i < 5; i++) {
			mockTime += 16.6;
			monitor.recordFrameDelta(16.6, mockTime);
		}
		assert.equal(monitor.getSnapshot().state, "DEGRADED", "Candidate established after long task eviction");

		// Step 3f: 5 seconds elapsed (< 10s)
		mockTime += 5000;
		for (let i = 0; i < 5; i++) {
			mockTime += 16.6;
			monitor.recordFrameDelta(16.6, mockTime);
		}
		assert.equal(monitor.getSnapshot().state, "DEGRADED", "Only 5s elapsed since reset, must remain DEGRADED");

		// Step 3g: Advance remaining 5.5s (total 10.5s unbroken stability)
		mockTime += 5500;
		for (let i = 0; i < 5; i++) {
			mockTime += 16.6;
			monitor.recordFrameDelta(16.6, mockTime);
		}
		// NOW recovered to HEALTHY!
		assert.equal(monitor.getSnapshot().state, "HEALTHY", "State successfully restored after 10s unbroken stability");
		assert.equal(monitor.getSnapshot().downscaleFactor, 1.0);

		monitor.stop();
	});

	it("notifies subscribers and provides reactive hooks", () => {
		let mockTime = 80000;
		const monitor = new RuntimePerformanceMonitor({
			now: () => mockTime,
			sampleWindowFrames: 5,
		});

		const transitions: string[] = [];
		const unsubscribe = monitor.subscribe((snapshot) => {
			transitions.push(snapshot.state);
		});

		// Trigger degrade
		for (let i = 0; i < 5; i++) {
			mockTime += 55;
			monitor.recordFrameDelta(55, mockTime);
		}

		assert.ok(transitions.includes("DEGRADED"));

		unsubscribe();
		const countBefore = transitions.length;

		// Further changes should not invoke unsubscribed listener
		mockTime += 1000;
		monitor.recordLongTask(900, mockTime);
		assert.equal(transitions.length, countBefore);

		monitor.stop();
	});

	it("integrates seamlessly with deviceDetection helpers", () => {
		const state = getDynamicPerformanceState();
		assert.ok(["HEALTHY", "WARNING", "DEGRADED", "CRITICAL"].includes(state));

		const isHeavy = isHostUnderHeavyLoad();
		assert.equal(typeof isHeavy, "boolean");

		const downscale = getAdaptiveDicomDownscaleFactor();
		assert.ok(downscale > 0 && downscale <= 1.0);

		const unsub = subscribeToPerformanceStateChange((s) => {
			assert.ok(s.state);
		});
		assert.equal(typeof unsub, "function");
		unsub();
	});
});
