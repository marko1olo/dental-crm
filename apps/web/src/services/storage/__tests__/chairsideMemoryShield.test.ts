/**
 * apps/web/src/services/storage/__tests__/chairsideMemoryShield.test.ts
 *
 * DENTE CRM — Chairside Monoblock RAM & VRAM Shield (12-Hour Continuous Shift Protection)
 * Test Suite verifying:
 * 1. Immediate VRAM release (width = 1, height = 1, WEBGL_lose_context).
 * 2. Inactive workspace containment (contain: strict; content-visibility: auto).
 * 3. LRU RVG image eviction and URL.revokeObjectURL lifecycle.
 * 4. Multi-patient tab churn & emergency manual purge idempotency.
 * 5. Reactive metric telemetry and subscription listeners.
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { chairsideMemoryShield, type MemoryShieldMetrics } from "../chairsideMemoryShield.js";

// Mock helper to create synthetic Canvas elements
function createMockCanvas(width = 800, height = 600, isWebGL = false): {
	canvas: HTMLCanvasElement;
	loseContextCalled: boolean;
	clearRectCalled: boolean;
} {
	let loseContextCalled = false;
	let clearRectCalled = false;

	const mockGl = {
		getExtension: (ext: string) => {
			if (ext === "WEBGL_lose_context") {
				return {
					loseContext: () => {
						loseContextCalled = true;
					},
				};
			}
			return null;
		},
	};

	const mock2d = {
		clearRect: () => {
			clearRectCalled = true;
		},
	};

	const canvasObj = {
		width,
		height,
		getContext: (type: string) => {
			if (isWebGL && (type === "webgl" || type === "webgl2")) return mockGl;
			if (!isWebGL && type === "2d") return mock2d;
			return null;
		},
	} as unknown as HTMLCanvasElement;

	return {
		canvas: canvasObj,
		get loseContextCalled() {
			return loseContextCalled;
		},
		get clearRectCalled() {
			return clearRectCalled;
		},
	};
}

// Mock helper to create synthetic DOM elements
function createMockElement(): HTMLElement {
	const classList = new Set<string>();
	const attributes = new Map<string, string>();

	return {
		classList: {
			add: (cls: string) => classList.add(cls),
			remove: (cls: string) => classList.delete(cls),
			contains: (cls: string) => classList.has(cls),
		},
		setAttribute: (key: string, val: string) => attributes.set(key, val),
		getAttribute: (key: string) => attributes.get(key) || null,
		removeAttribute: (key: string) => attributes.delete(key),
	} as unknown as HTMLElement;
}

describe("chairsideMemoryShield — 12-Hour Chairside Shift Protection Suite", () => {
	beforeEach(() => {
		chairsideMemoryShield.destroy();
		chairsideMemoryShield.initialize();
	});

	afterEach(() => {
		chairsideMemoryShield.destroy();
	});

	describe("1. Canvas VRAM Purge & Hardware Deallocation", () => {
		it("purges WebGL canvas by triggering WEBGL_lose_context and shrinking to 1x1", () => {
			const mockWebGl = createMockCanvas(1920, 1080, true);
			assert.strictEqual(mockWebGl.canvas.width, 1920);
			assert.strictEqual(mockWebGl.canvas.height, 1080);

			chairsideMemoryShield.registerCanvas("webgl-mpr-slice", mockWebGl.canvas, {
				ownerModule: "cbct",
				isWebGL: true,
			});

			const metricsBefore = chairsideMemoryShield.getMetrics();
			assert.strictEqual(metricsBefore.registeredCanvasCount, 1);

			const ok = chairsideMemoryShield.purgeCanvasVram(mockWebGl.canvas);
			assert.strictEqual(ok, true);
			assert.strictEqual(mockWebGl.canvas.width, 1, "VRAM backbuffer must be collapsed to 1px");
			assert.strictEqual(mockWebGl.canvas.height, 1, "VRAM backbuffer must be collapsed to 1px");
			assert.strictEqual(mockWebGl.loseContextCalled, true, "WEBGL_lose_context must be invoked");

			const metricsAfter = chairsideMemoryShield.getMetrics();
			assert.strictEqual(metricsAfter.totalVramPurges, 1);
			assert.ok(metricsAfter.lastPurgeAt !== null);
		});

		it("purges 2D canvas by clearing rect and collapsing dimensions", () => {
			const mock2d = createMockCanvas(1024, 768, false);
			chairsideMemoryShield.registerCanvas("rvg-2d-canvas", mock2d.canvas, { ownerModule: "rvg" });

			const ok = chairsideMemoryShield.purgeCanvasVram(mock2d.canvas);
			assert.strictEqual(ok, true);
			assert.strictEqual(mock2d.canvas.width, 1);
			assert.strictEqual(mock2d.canvas.height, 1);
			assert.strictEqual(mock2d.clearRectCalled, true);
		});

		it("purgeAllCanvases purges registered canvases and filters by ownerModule", () => {
			const canvas1 = createMockCanvas(500, 500, false);
			const canvas2 = createMockCanvas(600, 600, true);

			chairsideMemoryShield.registerCanvas("c1", canvas1.canvas, { ownerModule: "rvg" });
			chairsideMemoryShield.registerCanvas("c2", canvas2.canvas, { ownerModule: "cbct" });

			// Filter only rvg
			const purgedCount = chairsideMemoryShield.purgeAllCanvases("rvg");
			assert.strictEqual(purgedCount, 1);
			assert.strictEqual(canvas1.canvas.width, 1);
			assert.strictEqual(canvas2.canvas.width, 600, "Unfiltered cbct canvas must remain untouched");

			// Purge all
			const totalPurged = chairsideMemoryShield.purgeAllCanvases();
			assert.strictEqual(totalPurged, 2);
			assert.strictEqual(canvas2.canvas.width, 1);
		});
	});

	describe("2. Heavy DOM Tree Containment & Hibernation", () => {
		it("hibernates and wakes heavy containers via CSS classes and data attributes", () => {
			const el = createMockElement();
			chairsideMemoryShield.registerHeavyContainer("tab-odontogram", el, {
				ownerModule: "odontogram",
			});

			const metrics = chairsideMemoryShield.getMetrics();
			assert.strictEqual(metrics.registeredContainerCount, 1);

			// Hibernate
			chairsideMemoryShield.hibernateContainer("tab-odontogram");
			assert.strictEqual(el.classList.contains("dente-vram-shield-inactive"), true);
			assert.strictEqual(el.getAttribute("data-vram-shield-state"), "inactive");

			// Wake
			chairsideMemoryShield.wakeContainer("tab-odontogram");
			assert.strictEqual(el.classList.contains("dente-vram-shield-inactive"), false);
			assert.strictEqual(el.getAttribute("data-vram-shield-state"), "active");
		});

		it("onPatientSwitched purges canvases and hibernates background modules", () => {
			const canvas = createMockCanvas(800, 600, false);
			chairsideMemoryShield.registerCanvas("active-rvg", canvas.canvas, { ownerModule: "rvg" });

			const elBg = createMockElement();
			const elActive = createMockElement();
			chairsideMemoryShield.registerHeavyContainer("emk-view", elBg, { ownerModule: "emk" });
			chairsideMemoryShield.registerHeavyContainer("schedule-view", elActive, {
				ownerModule: "schedule",
			});

			// Patient switch to schedule
			chairsideMemoryShield.onPatientSwitched("schedule");

			// Canvas must be purged
			assert.strictEqual(canvas.canvas.width, 1);

			// Background EMK must be hibernated
			assert.strictEqual(elBg.classList.contains("dente-vram-shield-inactive"), true);
			assert.strictEqual(elBg.getAttribute("data-vram-shield-state"), "inactive");

			// Active schedule must remain active
			assert.strictEqual(elActive.classList.contains("dente-vram-shield-inactive"), false);
			assert.strictEqual(elActive.getAttribute("data-vram-shield-state"), "active");
		});
	});

	describe("3. LRU RVG / X-Ray Cache & Heap Release", () => {
		it("enforces max items limit by evicting oldest item first", () => {
			chairsideMemoryShield.configure({ maxRvgCacheItems: 3 });

			chairsideMemoryShield.cacheRvgImage("study-1", { byteSize: 1000 });
			chairsideMemoryShield.cacheRvgImage("study-2", { byteSize: 1000 });
			chairsideMemoryShield.cacheRvgImage("study-3", { byteSize: 1000 });

			assert.strictEqual(chairsideMemoryShield.getMetrics().rvgCacheItemCount, 3);
			assert.strictEqual(chairsideMemoryShield.hasRvgImage("study-1"), true);

			// Access study-1 so study-2 becomes the oldest
			chairsideMemoryShield.getRvgImage("study-1");

			// Add study-4 -> triggers eviction of study-2
			chairsideMemoryShield.cacheRvgImage("study-4", { byteSize: 1000 });

			assert.strictEqual(chairsideMemoryShield.getMetrics().rvgCacheItemCount, 3);
			assert.strictEqual(chairsideMemoryShield.hasRvgImage("study-2"), false, "Oldest study-2 must be evicted");
			assert.strictEqual(chairsideMemoryShield.hasRvgImage("study-1"), true, "Accessed study-1 must be kept");
			assert.strictEqual(chairsideMemoryShield.hasRvgImage("study-3"), true);
			assert.strictEqual(chairsideMemoryShield.hasRvgImage("study-4"), true);
		});

		it("enforces byte size quota and calls URL.revokeObjectURL on eviction", () => {
			let revokedUrl: string | null = null;
			const originalRevoke = typeof URL !== "undefined" ? URL.revokeObjectURL : undefined;
			if (typeof URL !== "undefined") {
				URL.revokeObjectURL = (url: string) => {
					revokedUrl = url;
				};
			}

			try {
				// Set quota to 5000 bytes
				chairsideMemoryShield.configure({ maxRvgCacheBytes: 5000, maxRvgCacheItems: 10 });

				chairsideMemoryShield.cacheRvgImage("rvg-tooth-16", {
					byteSize: 3000,
					objectUrl: "blob:dente/tooth-16",
				});
				assert.strictEqual(chairsideMemoryShield.getMetrics().rvgCacheSizeBytes, 3000);

				// Add another 3000 bytes -> total 6000 > 5000 limit -> evicts first
				chairsideMemoryShield.cacheRvgImage("rvg-tooth-26", {
					byteSize: 3000,
					objectUrl: "blob:dente/tooth-26",
				});

				assert.strictEqual(chairsideMemoryShield.getMetrics().rvgCacheItemCount, 1);
				assert.strictEqual(chairsideMemoryShield.hasRvgImage("rvg-tooth-16"), false);
				assert.strictEqual(chairsideMemoryShield.hasRvgImage("rvg-tooth-26"), true);
				assert.strictEqual(revokedUrl, "blob:dente/tooth-16", "Object URL must be revoked on eviction");
			} finally {
				if (typeof URL !== "undefined" && originalRevoke) {
					URL.revokeObjectURL = originalRevoke;
				}
			}
		});

		it("clearRvgCache flushes all cached images and resets byte count to 0", () => {
			chairsideMemoryShield.cacheRvgImage("s1", { byteSize: 2000 });
			chairsideMemoryShield.cacheRvgImage("s2", { byteSize: 3000 });
			assert.strictEqual(chairsideMemoryShield.getMetrics().rvgCacheSizeBytes, 5000);

			chairsideMemoryShield.clearRvgCache();
			assert.strictEqual(chairsideMemoryShield.getMetrics().rvgCacheItemCount, 0);
			assert.strictEqual(chairsideMemoryShield.getMetrics().rvgCacheSizeBytes, 0);
		});
	});

	describe("4. Emergency Purge & Reactive Telemetry", () => {
		it("purgeAllVramAndCache performs complete flush and reports freed counts", () => {
			const c1 = createMockCanvas(400, 400);
			chairsideMemoryShield.registerCanvas("c1", c1.canvas);
			chairsideMemoryShield.cacheRvgImage("img-1", { byteSize: 1024 * 1024 });

			const result = chairsideMemoryShield.purgeAllVramAndCache();
			assert.strictEqual(result.freedCanvases, 1);
			assert.strictEqual(result.freedRvgItems, 1);
			assert.strictEqual(result.freedBytes, 1024 * 1024);
			assert.strictEqual(c1.canvas.width, 1);
			assert.strictEqual(chairsideMemoryShield.getMetrics().rvgCacheItemCount, 0);
		});

		it("subscribers receive live metric updates on cache additions and canvas registrations", () => {
			const metricSnapshots: MemoryShieldMetrics[] = [];
			const unsubscribe = chairsideMemoryShield.subscribe((m) => {
				metricSnapshots.push({ ...m });
			});

			const c1 = createMockCanvas(300, 300);
			chairsideMemoryShield.registerCanvas("c1", c1.canvas);
			chairsideMemoryShield.cacheRvgImage("study-metric", { byteSize: 500 });

			unsubscribe();
			chairsideMemoryShield.cacheRvgImage("study-ignored", { byteSize: 500 });

			assert.ok(metricSnapshots.length >= 3, "Subscriber must receive initial and mutation events");
			const latest = metricSnapshots[metricSnapshots.length - 1]!;
			assert.strictEqual(latest.registeredCanvasCount, 1);
			assert.strictEqual(latest.rvgCacheItemCount, 1);
		});
	});
});
