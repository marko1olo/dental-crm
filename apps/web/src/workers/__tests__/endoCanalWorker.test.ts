/**
 * endoCanalWorker.test.ts — Unit tests for Endodontic Canal Web Worker & Bridge
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEndoCanalWorker, EndoWorkerBridge } from "../index";

describe("Endodontic Canal Web Worker & Bridge Suite", () => {
	it("1. createEndoCanalWorker safely handles SSR/Node.js environment without throwing", () => {
		const worker = createEndoCanalWorker();
		assert.equal(worker, null);
	});

	it("2. EndoWorkerBridge executes calculation via fallback when Worker is unavailable", () => {
		const bridge = new EndoWorkerBridge({ forceFallback: true });
		assert.equal(bridge.isAvailable, false);

		// Synthetic tooth subvolume (10x10x10)
		const dims: [number, number, number] = [10, 10, 10];
		const spacingMm: [number, number, number] = [0.25, 0.25, 0.25];
		const originMm: [number, number, number] = [0, 0, 0];
		const total = 1000;
		const voxelData = new Int16Array(total);
		voxelData.fill(1000); // Dentin

		// Make a vertical canal lumen through the center
		for (let z = 0; z < 10; z++) {
			voxelData[z * 100 + 5 * 10 + 5] = 150; // Pulp
		}

		const result = bridge.calculateSyncFallback({
			toothFdi: 36,
			dimensions: dims,
			spacingMm,
			originMm,
			voxelData,
		});

		assert.equal(result.success, true);
		assert.equal(result.toothFdi, 36);
		assert.ok(result.report);
		assert.ok(Array.isArray(result.canals));
		assert.equal(result.telemetry.isWorker, false);
		assert.ok(result.telemetry.totalMs >= 0);
	});
});
