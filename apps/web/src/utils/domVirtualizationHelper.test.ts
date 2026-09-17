/**
 * apps/web/src/utils/domVirtualizationHelper.test.ts
 *
 * DENTE Dental CRM — Test Suite for DOM Virtualization & Memory Leak Guard
 * Wave 252-Perf2: Low-RAM Laptop Protection & DOM Memory Safety
 * Compliance: Mandates 8e, 8k, 8n, 8d
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateVirtualWindow,
	DEFAULT_DOM_CHUNK_STEP,
	DEFAULT_DOM_PAGE_SIZE,
	estimateDomMemoryLoad,
	RECOMMENDED_DOM_MAX_NODES,
	scheduleProgressiveDomRender,
	sliceDomList,
} from "./domVirtualizationHelper.js";

describe("Wave 252-Perf2: domVirtualizationHelper Unit Tests", () => {
	describe("1. sliceDomList & Constants", () => {
		const items = Array.from({ length: 135 }, (_, i) => ({
			id: `item-${i + 1}`,
			value: i + 1,
		}));

		it("exports standard clinical constants", () => {
			assert.equal(DEFAULT_DOM_PAGE_SIZE, 50);
			assert.equal(DEFAULT_DOM_CHUNK_STEP, 50);
			assert.equal(RECOMMENDED_DOM_MAX_NODES, 250);
		});

		it("correctly slices first page with default limit 50", () => {
			const res = sliceDomList(items, DEFAULT_DOM_PAGE_SIZE, 0);
			assert.equal(res.visibleItems.length, 50);
			assert.equal(res.visibleItems[0]?.id, "item-1");
			assert.equal(res.visibleItems[49]?.id, "item-50");
			assert.equal(res.totalCount, 135);
			assert.equal(res.displayedCount, 50);
			assert.equal(res.remainingCount, 85);
			assert.equal(res.hasMore, true);
			assert.equal(res.currentPage, 1);
			assert.equal(res.totalPages, 3);
		});

		it("correctly slices subsequent chunk with offset", () => {
			const res = sliceDomList(items, 50, 50);
			assert.equal(res.visibleItems.length, 50);
			assert.equal(res.visibleItems[0]?.id, "item-51");
			assert.equal(res.visibleItems[49]?.id, "item-100");
			assert.equal(res.remainingCount, 35);
			assert.equal(res.hasMore, true);
			assert.equal(res.currentPage, 2);
		});

		it("correctly handles last page without overflow", () => {
			const res = sliceDomList(items, 50, 100);
			assert.equal(res.visibleItems.length, 35);
			assert.equal(res.visibleItems[0]?.id, "item-101");
			assert.equal(res.visibleItems[34]?.id, "item-135");
			assert.equal(res.remainingCount, 0);
			assert.equal(res.hasMore, false);
			assert.equal(res.currentPage, 3);
		});

		it("handles empty array safely", () => {
			const res = sliceDomList([], 50, 0);
			assert.equal(res.visibleItems.length, 0);
			assert.equal(res.totalCount, 0);
			assert.equal(res.displayedCount, 0);
			assert.equal(res.remainingCount, 0);
			assert.equal(res.hasMore, false);
			assert.equal(res.currentPage, 1);
			assert.equal(res.totalPages, 1);
		});

		it("handles negative or zero limits safely", () => {
			const res = sliceDomList(items, 0, 0);
			assert.equal(res.visibleItems.length, 1); // safeLimit = Math.max(1, limit)
			assert.equal(res.pageSize, 1);
		});
	});

	describe("2. calculateVirtualWindow", () => {
		it("returns empty bounds when totalCount is zero", () => {
			const res = calculateVirtualWindow({
				totalCount: 0,
				itemHeightPx: 40,
				viewportHeightPx: 400,
				scrollTopPx: 0,
			});
			assert.equal(res.visibleCount, 0);
			assert.equal(res.totalHeightPx, 0);
			assert.equal(res.startIndex, 0);
			assert.equal(res.endIndex, 0);
		});

		it("calculates window with overscan for top of list", () => {
			const res = calculateVirtualWindow({
				totalCount: 100,
				itemHeightPx: 50,
				viewportHeightPx: 500, // 10 visible items
				scrollTopPx: 0,
				overscanCount: 2,
			});
			assert.equal(res.totalHeightPx, 5000);
			assert.equal(res.startIndex, 0);
			// rawEndIndex = floor(500/50) = 10; with overscan +2 = 12
			assert.equal(res.endIndex, 12);
			assert.equal(res.visibleCount, 13);
			assert.equal(res.topOffsetPx, 0);
			assert.equal(res.bottomOffsetPx, (100 - 1 - 12) * 50);
		});

		it("calculates window correctly when scrolled halfway", () => {
			const res = calculateVirtualWindow({
				totalCount: 100,
				itemHeightPx: 50,
				viewportHeightPx: 500,
				scrollTopPx: 1000, // item index 20
				overscanCount: 2,
			});
			assert.equal(res.startIndex, 18); // 20 - 2
			assert.equal(res.endIndex, 32); // (1000 + 500)/50 = 30; 30 + 2 = 32
			assert.equal(res.topOffsetPx, 18 * 50);
		});
	});

	describe("3. estimateDomMemoryLoad", () => {
		it("estimates safe load under 250 nodes", () => {
			const est = estimateDomMemoryLoad(50);
			assert.equal(est.riskLevel, "safe");
			assert.equal(est.nodeCount, 50);
			assert.ok(est.estimatedMb >= 0);
		});

		it("identifies moderate risk between 250 and 500 nodes", () => {
			const est = estimateDomMemoryLoad(350);
			assert.equal(est.riskLevel, "moderate");
			assert.ok(est.recommendation.includes("Умеренная нагрузка"));
		});

		it("flags critical risk when node count exceeds 500 nodes", () => {
			const est = estimateDomMemoryLoad(1000);
			assert.equal(est.riskLevel, "critical");
			assert.ok(est.recommendation.includes("Критическая нагрузка"));
			assert.ok(est.recommendation.includes("pagefile.sys"));
		});
	});

	describe("4. scheduleProgressiveDomRender", () => {
		it("chunks progressive batch rendering and completes asynchronously", async () => {
			const items = Array.from({ length: 30 }, (_, i) => i);
			const chunks: number[][] = [];

			await new Promise<void>((resolve) => {
				const cancel = scheduleProgressiveDomRender(
					items,
					10,
					(chunk, progress) => {
						chunks.push(chunk);
						if (progress.isDone) {
							resolve();
						}
					},
					{ delayMs: 1 },
				);
				assert.equal(typeof cancel, "function");
			});

			assert.equal(chunks.length, 3);
			assert.equal(chunks[0]?.length, 10);
			assert.equal(chunks[1]?.length, 10);
			assert.equal(chunks[2]?.length, 10);
		});

		it("supports cancellation before completion", async () => {
			const items = Array.from({ length: 100 }, (_, i) => i);
			let chunksReceived = 0;

			await new Promise<void>((resolve) => {
				const cancel = scheduleProgressiveDomRender(
					items,
					5,
					() => {
						chunksReceived++;
						if (chunksReceived === 1) {
							cancel();
							setTimeout(resolve, 50);
						}
					},
					{ delayMs: 10 },
				);
			});

			assert.equal(chunksReceived, 1);
		});
	});
});
