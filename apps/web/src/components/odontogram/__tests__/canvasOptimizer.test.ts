import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	TypedArrayPool,
	DirtyRectManager,
	ToothPath2DCache,
	ODONTOGRAM_CONTAINMENT_STYLES,
	ODONTOGRAM_CANVAS_PROPS,
} from "../canvasOptimizer";

describe("canvasOptimizer Suite (Zero-GC & Dirty Rects Wave 252-Perf)", () => {
	describe("1. TypedArrayPool (Zero-GC Hot Path)", () => {
		it("allocates and reuses Uint8Array buffers cleanly", () => {
			const pool = new TypedArrayPool();

			const buf1 = pool.acquireUint8(100);
			assert.ok(buf1 instanceof Uint8Array);
			assert.ok(buf1.length >= 100);

			buf1[0] = 42;
			buf1[1] = 99;

			pool.releaseUint8(buf1);
			const stats = pool.getStats();
			assert.equal(stats.totalPooled, 1);

			// Reacquire: should get back the pooled buffer zero-filled
			const buf2 = pool.acquireUint8(100);
			assert.equal(buf2, buf1, "Should reuse the released instance");
			assert.equal(buf2[0], 0, "Pooled buffer should be zeroed");
			assert.equal(buf2[1], 0, "Pooled buffer should be zeroed");

			pool.clear();
		});

		it("allocates and reuses Float32Array buffers cleanly", () => {
			const pool = new TypedArrayPool();

			const fBuf1 = pool.acquireFloat32(500);
			assert.ok(fBuf1 instanceof Float32Array);
			assert.ok(fBuf1.length >= 500);

			fBuf1[10] = 3.14159;
			pool.releaseFloat32(fBuf1);

			const fBuf2 = pool.acquireFloat32(500);
			assert.equal(fBuf2, fBuf1);
			assert.equal(fBuf2[10], 0);

			pool.clear();
		});

		it("allocates and reuses Int32Array buffers cleanly", () => {
			const pool = new TypedArrayPool();

			const iBuf1 = pool.acquireInt32(200);
			assert.ok(iBuf1 instanceof Int32Array);
			assert.ok(iBuf1.length >= 200);

			iBuf1[5] = 123456;
			pool.releaseInt32(iBuf1);

			const iBuf2 = pool.acquireInt32(200);
			assert.equal(iBuf2, iBuf1);
			assert.equal(iBuf2[5], 0);

			pool.clear();
		});
	});

	describe("2. DirtyRectManager (Грязные прямоугольники)", () => {
		it("registers tooth bounding boxes and tracks dirty state accurately", () => {
			const manager = new DirtyRectManager();
			manager.clear(); // Clear initial all-dirty flag

			assert.equal(manager.hasDirty(), false);

			// Register FDI tooth 16 (upper right 1st molar)
			manager.registerToothBBox(16, { x: 100, y: 50, width: 40, height: 60 });
			// Register FDI tooth 26 (upper left 1st molar)
			manager.registerToothBBox(26, { x: 300, y: 50, width: 40, height: 60 });

			// Mark tooth 16 dirty with 4px padding
			manager.markToothDirty(16, 4);

			assert.equal(manager.hasDirty(), true);
			assert.equal(manager.isToothDirty(16), true);
			assert.equal(manager.isToothDirty(26), false, "Tooth 26 must remain clean");

			const rects = manager.getDirtyRects();
			assert.equal(rects.length, 1);
			assert.deepEqual(rects[0], {
				x: 96,
				y: 46,
				width: 48,
				height: 68,
				toothNumber: 16,
			});

			// Compute union bounding box
			const union = manager.getUnionDirtyRect();
			assert.ok(union !== null);
			assert.equal(union?.x, 96);
			assert.equal(union?.y, 46);
			assert.equal(union?.width, 48);
			assert.equal(union?.height, 68);

			// Clear dirty flags
			manager.clear();
			assert.equal(manager.hasDirty(), false);
			assert.equal(manager.isToothDirty(16), false);
		});

		it("correctly computes union bounding box across multiple dirty teeth", () => {
			const manager = new DirtyRectManager();
			manager.clear();

			manager.registerToothBBox(11, { x: 180, y: 100, width: 30, height: 50 });
			manager.registerToothBBox(21, { x: 220, y: 100, width: 30, height: 50 });

			manager.markToothDirty(11, 0);
			manager.markToothDirty(21, 0);

			const union = manager.getUnionDirtyRect();
			assert.ok(union !== null);
			assert.equal(union?.x, 180);
			assert.equal(union?.y, 100);
			// 180 to 250 (220+30) = 70
			assert.equal(union?.width, 70);
			assert.equal(union?.height, 50);
		});

		it("falls back to full repaint if an unregistered tooth is marked dirty", () => {
			const manager = new DirtyRectManager();
			manager.clear();

			manager.markToothDirty(99); // Unregistered tooth
			assert.equal(manager.isToothDirty(16), true);
			assert.equal(manager.hasDirty(), true);
		});
	});

	describe("3. ToothPath2DCache", () => {
		it("manages path caching safely across environments", () => {
			const cache = new ToothPath2DCache();
			// In Node environment, Path2D may or may not be defined
			const path = cache.getOrCreate("crown_16", "M 0 0 L 10 10 Z");
			if (typeof Path2D !== "undefined") {
				assert.ok(path instanceof Path2D);
			} else {
				assert.equal(path, null);
			}
			cache.clear();
		});
	});

	describe("4. CSS Containment & Render Ceilings", () => {
		it("provides standard CSS containment properties", () => {
			assert.equal(ODONTOGRAM_CONTAINMENT_STYLES.contain, "content");
			assert.equal(ODONTOGRAM_CONTAINMENT_STYLES.willChange, "transform");
			assert.equal(ODONTOGRAM_CONTAINMENT_STYLES.transform, "translateZ(0)");
			assert.equal(ODONTOGRAM_CONTAINMENT_STYLES.backfaceVisibility, "hidden");

			assert.equal(ODONTOGRAM_CANVAS_PROPS.role, "img");
			assert.equal(ODONTOGRAM_CANVAS_PROPS.tabIndex, -1);
		});
	});
});
