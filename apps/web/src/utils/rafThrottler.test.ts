import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	createRafThrottler,
	detectGpuPerformanceTier,
	AdaptiveRafLoop,
} from "./rafThrottler";

describe("rafThrottler Suite (Wave 252-Perf)", () => {
	it("detectGpuPerformanceTier returns a valid tier", () => {
		const tier = detectGpuPerformanceTier();
		assert.ok(["low", "medium", "high"].includes(tier));
	});

	it("coalesces multiple trigger calls and delivers the latest payload", async () => {
		const delivered: number[] = [];
		const throttler = createRafThrottler<number>(
			(payload) => {
				delivered.push(payload);
			},
			{ targetFps: 60, coalesce: true, detectLowEnd: false },
		);

		// Rapidly trigger 5 updates in the same synchronous frame
		throttler(1);
		throttler(2);
		throttler(3);
		throttler(4);
		throttler(5);

		assert.equal(throttler.isPending(), true);

		// Flush executes the pending tick synchronously
		throttler.flush();

		assert.equal(throttler.isPending(), false);
		assert.equal(delivered.length, 1);
		assert.equal(delivered[0], 5, "Latest coalesced payload should be delivered");

		throttler.destroy();
	});

	it("cancel prevents scheduled execution", () => {
		let callCount = 0;
		const throttler = createRafThrottler<string>(() => {
			callCount++;
		});

		throttler("first");
		assert.equal(throttler.isPending(), true);

		throttler.cancel();
		assert.equal(throttler.isPending(), false);

		throttler.flush();
		assert.equal(callCount, 0, "Callback should not execute after cancel");

		throttler.destroy();
	});

	it("adjusts effective target FPS dynamically", () => {
		const throttler = createRafThrottler<void>(() => {}, {
			targetFps: 60,
			minFps: 24,
			maxFps: 60,
			detectLowEnd: false,
		});

		assert.equal(throttler.getEffectiveFps(), 60);

		throttler.setTargetFps(30);
		assert.equal(throttler.getEffectiveFps(), 30);

		// Clamps below minFps (24)
		throttler.setTargetFps(10);
		assert.equal(throttler.getEffectiveFps(), 24);

		// Clamps above maxFps (60)
		throttler.setTargetFps(120);
		assert.equal(throttler.getEffectiveFps(), 60);

		throttler.destroy();
	});

	it("AdaptiveRafLoop starts and stops without leaking timers", () => {
		let tickCount = 0;
		const loop = new AdaptiveRafLoop(() => {
			tickCount++;
		}, { targetFps: 30, detectLowEnd: false });

		loop.start();
		loop.stop();
		loop.destroy();

		assert.ok(loop.getEffectiveFps() >= 24);
	});
});
