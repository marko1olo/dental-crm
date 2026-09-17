/**
 * apps/web/src/components/odontogram/canvasOptimizer.ts
 *
 * High-Performance Canvas Rendering Optimization & Zero-GC Engine for Dental Odontograms.
 * Engineered for weak integrated GPUs (Intel HD Graphics 3000/4000/520/620, UHD, Mesa)
 * to ensure 60 FPS fluid interaction without GC stutter or CPU thermal throttling.
 *
 * Key Pillars:
 * 1. Zero-GC TypedArrayPool: Reusable pre-allocated ArrayBuffers (Uint8Array, Float32Array, Int32Array)
 *    to eliminate V8 heap churn during real-time mouse move, surface highlights, and canal tracing.
 * 2. Dirty Rectangles Engine (Грязные прямоугольники): Repaints ONLY the modified FDI tooth
 *    (e.g., tooth 16 during caries annotation) instead of redrawing all 32 teeth and intricate
 *    anatomical root canal splines every frame.
 * 3. Path2D Caching: Pre-compiles complex SVG paths (crowns, roots, furcations, lesions) into
 *    native GPU-friendly Path2D objects, avoiding expensive SVG path string parsing on hot paths.
 * 4. Canvas & ImageData Pooling: Recycles Offscreen/HTMLCanvas elements and ImageData buffers.
 * 5. CSS Containment & Render Ceilings: Declares `contain: content` and `will-change: transform`
 *    to isolate the odontogram rendering layer and prevent whole-page layout reflows (Zero CLS).
 */

import type React from "react";

// ============================================================================
// 1. TYPED ARRAY OBJECT POOLING (Zero-GC Hot Path)
// ============================================================================

/**
 * Standard power-of-two bucket sizes for array buffers (in elements).
 */
const BUFFER_BUCKETS = [256, 1024, 4096, 16384, 65536, 262144] as const;

function getNextBucketSize(required: number): number {
	for (let i = 0; i < BUFFER_BUCKETS.length; i++) {
		const bucket = BUFFER_BUCKETS[i];
		if (bucket !== undefined && bucket >= required) {
			return bucket;
		}
	}
	// Fallback to exact required size if beyond standard bucket limits
	return required;
}

export class TypedArrayPool {
	private readonly uint8Pool = new Map<number, Uint8Array[]>();
	private readonly float32Pool = new Map<number, Float32Array[]>();
	private readonly int32Pool = new Map<number, Int32Array[]>();

	private totalAllocated = 0;
	private totalPooled = 0;

	/**
	 * Acquires a reusable Uint8Array with at least the requested byte length.
	 */
	public acquireUint8(minBytes: number): Uint8Array {
		const bucketSize = getNextBucketSize(minBytes);
		const bucket = this.uint8Pool.get(bucketSize);

		if (bucket && bucket.length > 0) {
			this.totalPooled--;
			const buf = bucket.pop()!;
			buf.fill(0);
			return buf;
		}

		this.totalAllocated++;
		return new Uint8Array(bucketSize);
	}

	/**
	 * Releases a Uint8Array back to the pool for reuse.
	 */
	public releaseUint8(buffer: Uint8Array): void {
		const size = buffer.length;
		let bucket = this.uint8Pool.get(size);
		if (!bucket) {
			bucket = [];
			this.uint8Pool.set(size, bucket);
		}

		// Keep up to 16 buffers per bucket to cap pool memory footprint
		if (bucket.length < 16) {
			bucket.push(buffer);
			this.totalPooled++;
		}
	}

	/**
	 * Acquires a reusable Float32Array for coordinate transformations and spline vertices.
	 */
	public acquireFloat32(minElements: number): Float32Array {
		const bucketSize = getNextBucketSize(minElements);
		const bucket = this.float32Pool.get(bucketSize);

		if (bucket && bucket.length > 0) {
			this.totalPooled--;
			const buf = bucket.pop()!;
			buf.fill(0);
			return buf;
		}

		this.totalAllocated++;
		return new Float32Array(bucketSize);
	}

	/**
	 * Releases a Float32Array back to the pool for reuse.
	 */
	public releaseFloat32(buffer: Float32Array): void {
		const size = buffer.length;
		let bucket = this.float32Pool.get(size);
		if (!bucket) {
			bucket = [];
			this.float32Pool.set(size, bucket);
		}

		if (bucket.length < 16) {
			bucket.push(buffer);
			this.totalPooled++;
		}
	}

	/**
	 * Acquires a reusable Int32Array for pixel lookups and index maps.
	 */
	public acquireInt32(minElements: number): Int32Array {
		const bucketSize = getNextBucketSize(minElements);
		const bucket = this.int32Pool.get(bucketSize);

		if (bucket && bucket.length > 0) {
			this.totalPooled--;
			const buf = bucket.pop()!;
			buf.fill(0);
			return buf;
		}

		this.totalAllocated++;
		return new Int32Array(bucketSize);
	}

	/**
	 * Releases an Int32Array back to the pool for reuse.
	 */
	public releaseInt32(buffer: Int32Array): void {
		const size = buffer.length;
		let bucket = this.int32Pool.get(size);
		if (!bucket) {
			bucket = [];
			this.int32Pool.set(size, bucket);
		}

		if (bucket.length < 16) {
			bucket.push(buffer);
			this.totalPooled++;
		}
	}

	/**
	 * Returns current telemetry on pooled vs allocated buffer count.
	 */
	public getStats(): { totalAllocated: number; totalPooled: number } {
		return {
			totalAllocated: this.totalAllocated,
			totalPooled: this.totalPooled,
		};
	}

	/**
	 * Purges all pooled memory buffers.
	 */
	public clear(): void {
		this.uint8Pool.clear();
		this.float32Pool.clear();
		this.int32Pool.clear();
		this.totalPooled = 0;
	}
}

/** Global singleton instance of TypedArrayPool */
export const typedArrayPool = new TypedArrayPool();

// ============================================================================
// 2. CANVAS & IMAGE DATA POOLING
// ============================================================================

export class CanvasPool {
	private readonly pool: HTMLCanvasElement[] = [];
	private readonly maxPoolSize = 6;

	/**
	 * Acquires a canvas element of the desired dimensions from the pool.
	 */
	public acquire(width: number, height: number): HTMLCanvasElement {
		if (typeof document === "undefined") {
			// Mock-free fallback for non-DOM / test environments
			return {
				width,
				height,
				getContext: () => null,
			} as unknown as HTMLCanvasElement;
		}

		const canvas = this.pool.pop() ?? document.createElement("canvas");
		if (canvas.width !== width) canvas.width = width;
		if (canvas.height !== height) canvas.height = height;

		// Reset context state
		const ctx = canvas.getContext("2d");
		if (ctx) {
			ctx.clearRect(0, 0, width, height);
			ctx.resetTransform?.();
		}

		return canvas;
	}

	/**
	 * Releases a canvas back into the pool.
	 */
	public release(canvas: HTMLCanvasElement): void {
		if (this.pool.length < this.maxPoolSize) {
			const ctx = canvas.getContext("2d");
			if (ctx) {
				ctx.clearRect(0, 0, canvas.width, canvas.height);
			}
			this.pool.push(canvas);
		}
	}

	public clear(): void {
		this.pool.length = 0;
	}
}

export const canvasPool = new CanvasPool();

// ============================================================================
// 3. DIRTY RECTANGLES ENGINE (Грязные прямоугольники)
// ============================================================================

export interface DirtyRect {
	x: number;
	y: number;
	width: number;
	height: number;
	toothNumber?: number;
}

/**
 * Manages spatial dirty bounds on the Odontogram canvas.
 * Allows redrawing ONLY the modified tooth FDI or region instead of the entire 32-tooth arch.
 */
export class DirtyRectManager {
	private readonly toothBBoxes = new Map<number, DirtyRect>();
	private readonly dirtyRects: DirtyRect[] = [];
	private isAllDirty = true; // Initial render starts with all dirty

	/**
	 * Registers the bounding box coordinates for a specific FDI tooth number.
	 */
	public registerToothBBox(toothNumber: number, bbox: DirtyRect): void {
		this.toothBBoxes.set(toothNumber, {
			...bbox,
			toothNumber,
		});
	}

	/**
	 * Marks a single tooth dirty, requesting repaint of its bounding box.
	 * Optionally applies padding to accommodate hover halos, periapical lesions, or selection rings.
	 */
	public markToothDirty(toothNumber: number, padding = 4): void {
		if (this.isAllDirty) return;

		const bbox = this.toothBBoxes.get(toothNumber);
		if (bbox) {
			this.dirtyRects.push({
				x: Math.max(0, bbox.x - padding),
				y: Math.max(0, bbox.y - padding),
				width: bbox.width + padding * 2,
				height: bbox.height + padding * 2,
				toothNumber,
			});
		} else {
			// If tooth bounding box is unregistered, fallback to full repaint for safety
			this.isAllDirty = true;
		}
	}

	/**
	 * Marks an arbitrary rectangular region as dirty.
	 */
	public markRegionDirty(rect: DirtyRect): void {
		if (this.isAllDirty) return;
		this.dirtyRects.push(rect);
	}

	/**
	 * Forces a full repaint of the entire canvas.
	 */
	public markAllDirty(): void {
		this.isAllDirty = true;
		this.dirtyRects.length = 0;
	}

	/**
	 * Returns true if the tooth or region is currently flagged for repaint.
	 */
	public isToothDirty(toothNumber: number): boolean {
		if (this.isAllDirty) return true;
		for (let i = 0; i < this.dirtyRects.length; i++) {
			const rect = this.dirtyRects[i];
			if (rect && rect.toothNumber === toothNumber) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Returns true if there are any pending repaints.
	 */
	public hasDirty(): boolean {
		return this.isAllDirty || this.dirtyRects.length > 0;
	}

	/**
	 * Returns the list of individual dirty rectangles.
	 */
	public getDirtyRects(): readonly DirtyRect[] {
		return this.dirtyRects;
	}

	/**
	 * Computes the unified bounding box covering all current dirty rectangles.
	 * Returns null if no areas are dirty and isAllDirty is false.
	 */
	public getUnionDirtyRect(): DirtyRect | null {
		if (this.dirtyRects.length === 0) {
			return null;
		}

		let minX = Number.POSITIVE_INFINITY;
		let minY = Number.POSITIVE_INFINITY;
		let maxX = Number.NEGATIVE_INFINITY;
		let maxY = Number.NEGATIVE_INFINITY;

		for (let i = 0; i < this.dirtyRects.length; i++) {
			const r = this.dirtyRects[i];
			if (!r) continue;
			if (r.x < minX) minX = r.x;
			if (r.y < minY) minY = r.y;
			const rRight = r.x + r.width;
			const rBottom = r.y + r.height;
			if (rRight > maxX) maxX = rRight;
			if (rBottom > maxY) maxY = rBottom;
		}

		if (!Number.isFinite(minX)) {
			return null;
		}

		return {
			x: minX,
			y: minY,
			width: maxX - minX,
			height: maxY - minY,
		};
	}

	/**
	 * Applies clipping to the 2D canvas context based on the current dirty rectangles.
	 * Returns true if dirty clipping was successfully applied, or false if full repaint is required.
	 */
	public applyClip(ctx: CanvasRenderingContext2D, clearRegion = true): boolean {
		if (this.isAllDirty) {
			return false;
		}

		const union = this.getUnionDirtyRect();
		if (!union) {
			return false;
		}

		ctx.save();
		ctx.beginPath();

		for (let i = 0; i < this.dirtyRects.length; i++) {
			const r = this.dirtyRects[i];
			if (r) {
				ctx.rect(r.x, r.y, r.width, r.height);
			}
		}

		ctx.clip();

		if (clearRegion) {
			for (let i = 0; i < this.dirtyRects.length; i++) {
				const r = this.dirtyRects[i];
				if (r) {
					ctx.clearRect(r.x, r.y, r.width, r.height);
				}
			}
		}

		return true;
	}

	/**
	 * Restores the canvas context clipping state saved in applyClip.
	 */
	public restoreClip(ctx: CanvasRenderingContext2D): void {
		if (!this.isAllDirty) {
			ctx.restore();
		}
	}

	/**
	 * Resets all dirty flags after a successful frame paint.
	 */
	public clear(): void {
		this.isAllDirty = false;
		this.dirtyRects.length = 0;
	}
}

// ============================================================================
// 4. PATH2D GEOMETRY CACHE
// ============================================================================

/**
 * Caches Path2D instances for intricate tooth contours and surfaces.
 * Parsing SVG path data strings ("M 10 20 C ...") on every frame causes heavy CPU overhead.
 * By caching Path2D objects, `ctx.fill(cachedPath)` executes directly on the GPU pipeline.
 */
export class ToothPath2DCache {
	private readonly cache = new Map<string, Path2D>();
	private readonly maxEntries = 512;

	/**
	 * Retrieves an existing Path2D or creates and stores a new one from the SVG path string.
	 * Returns null if Path2D is unsupported in the current browser/test environment.
	 */
	public getOrCreate(key: string, svgPath: string): Path2D | null {
		if (typeof Path2D === "undefined") {
			return null;
		}

		let path = this.cache.get(key);
		if (!path) {
			try {
				path = new Path2D(svgPath);
				if (this.cache.size >= this.maxEntries) {
					// Drop oldest entry to avoid unbounded growth
					const firstKey = this.cache.keys().next().value;
					if (firstKey !== undefined) {
						this.cache.delete(firstKey);
					}
				}
				this.cache.set(key, path);
			} catch {
				return null;
			}
		}

		return path;
	}

	public clear(): void {
		this.cache.clear();
	}
}

export const toothPath2DCache = new ToothPath2DCache();

// ============================================================================
// 5. CSS CONTAINMENT & RENDER CEILINGS
// ============================================================================

/**
 * CSS containment styles for odontogram containers.
 * - `contain: content` tells the browser layout engine that the subtree is completely
 *   independent from the surrounding DOM tree. Style modifications or repaints inside
 *   the odontogram do not cause layout reflow across the patient card, visit timeline,
 *   or main navigation bar (Zero CLS / Reflow protection).
 * - `willChange: "transform"` promotes the canvas to an independent GPU composite layer,
 *   reducing rasterization overhead on Intel HD Graphics.
 */
export const ODONTOGRAM_CONTAINMENT_STYLES: React.CSSProperties = {
	contain: "content",
	willChange: "transform",
	transform: "translateZ(0)",
	backfaceVisibility: "hidden",
	overflow: "hidden",
};

/**
 * Reusable HTML attribute helper for Odontogram canvas layers.
 */
export const ODONTOGRAM_CANVAS_PROPS = {
	tabIndex: -1,
	role: "img",
	style: ODONTOGRAM_CONTAINMENT_STYLES,
	className: "odontogram-canvas-layer select-none pointer-events-auto",
} as const;
