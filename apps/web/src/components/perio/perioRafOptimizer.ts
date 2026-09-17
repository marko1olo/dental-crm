/**
 * apps/web/src/components/perio/perioRafOptimizer.ts
 *
 * High-Performance RAF & Zero-GC Rendering Engine for Periodontal Charting (Periodontogram).
 * Specially optimized for weak integrated GPUs (Intel HD 3000/4000/520/620) and low-power laptops.
 *
 * Clinical Context:
 * A full mouth periodontal chart spans 32 teeth (16 upper, 16 lower) with 6 probing sites per tooth
 * = 192 measurement points. Each point tracks Probing Depth (PD), Gingival Margin (GM),
 * Clinical Attachment Loss (CAL), Bleeding on Probing (BOP), and Plaque (PI).
 * Rendering 192 complex DOM/SVG sites while scrolling or fast keyboard entry causes severe
 * GC churn and 100% CPU spikes on weak hardware.
 *
 * Key Optimizations:
 * 1. Zero-GC Precomputed Lookup Tables (LUT): O(1) probing depth color and tone retrieval
 *    without string allocations or condition evaluations during hot-loop renders.
 * 2. Reusable Geometry Buffers (Float32Array): Renders continuous gingival margin curves
 *    and pocket depth polygon fills directly onto Canvas without intermediate object allocations.
 * 3. Coalesced Scroll Synchronization: Prevents scroll jank and sync loops between upper
 *    and lower jaw rows via requestAnimationFrame throttling.
 * 4. Viewport Column Culling: Skips rendering offscreen teeth columns when zoomed or horizontally scrolled.
 * 5. CSS Containment: Applies `contain: content` and `will-change: scroll-position` to eliminate
 *    page-wide reflows and prevent layout shifts (CLS = 0).
 */

import type React from "react";
import type { HeatmapTone } from "./perioHeatmap";
import { createRafThrottler, type ThrottledRafFunction } from "../../utils/rafThrottler";

// ============================================================================
// 1. ZERO-GC PROBING DEPTH LOOKUP TABLES (LUT)
// ============================================================================

/** Maximum standard probing depth index supported by LUT (0..15 mm) */
const MAX_LUT_DEPTH = 15;

/**
 * Pre-computed hex colors for probing depths 0..15 mm.
 * Depth <= 3 mm: #34d399 (emerald-400, healthy sulcus)
 * Depth == 4 mm: #fbbf24 (amber-400, mild pocket)
 * Depth 5-6 mm:  #f97316 (orange-500, moderate pocket)
 * Depth >= 7 mm: #fb7185 (rose-400, deep pocket)
 */
export const PROBING_DEPTH_HEX_LUT: readonly string[] = [
	"#34d399", // 0 mm (healthy)
	"#34d399", // 1 mm
	"#34d399", // 2 mm
	"#34d399", // 3 mm (physiological sulcus limit)
	"#fbbf24", // 4 mm (early periodontitis)
	"#f97316", // 5 mm (moderate pocket)
	"#f97316", // 6 mm (moderate pocket)
	"#fb7185", // 7 mm (severe deep pocket)
	"#fb7185", // 8 mm
	"#fb7185", // 9 mm
	"#fb7185", // 10 mm
	"#fb7185", // 11 mm
	"#fb7185", // 12 mm
	"#fb7185", // 13 mm
	"#fb7185", // 14 mm
	"#fb7185", // 15 mm
] as const;

export const PROBING_DEPTH_TONE_LUT: readonly HeatmapTone[] = [
	"success", // 0
	"success", // 1
	"success", // 2
	"success", // 3
	"warning-low", // 4
	"warning-high", // 5
	"warning-high", // 6
	"error", // 7
	"error", // 8
	"error", // 9
	"error", // 10
	"error", // 11
	"error", // 12
	"error", // 13
	"error", // 14
	"error", // 15
] as const;

/** Pre-computed 32-bit packed ABGR/RGBA colors for fast Canvas pixel operations */
export const PROBING_DEPTH_RGBA32_LUT: readonly number[] = [
	0xff99d334, // 0-3 mm emerald (#34d399) in ABGR format
	0xff99d334,
	0xff99d334,
	0xff99d334,
	0xff24bffb, // 4 mm amber (#fbbf24) in ABGR format
	0xff1673f9, // 5-6 mm orange (#f97316) in ABGR format
	0xff1673f9,
	0xff8571fb, // >=7 mm rose (#fb7185) in ABGR format
	0xff8571fb,
	0xff8571fb,
	0xff8571fb,
	0xff8571fb,
	0xff8571fb,
	0xff8571fb,
	0xff8571fb,
	0xff8571fb,
] as const;

const NEUTRAL_HEX = "#d1d5db";
const NEUTRAL_TONE: HeatmapTone = "neutral";
const NEUTRAL_RGBA32 = 0xffdbd5d1;

/**
 * Fast O(1) probing depth hex color lookup without string allocations.
 */
export function getFastProbingDepthHex(pd: number | null | undefined): string {
	if (pd === null || pd === undefined || Number.isNaN(pd) || pd < 0) {
		return NEUTRAL_HEX;
	}
	const intPd = Math.min(Math.floor(pd), MAX_LUT_DEPTH);
	return PROBING_DEPTH_HEX_LUT[intPd] ?? "#fb7185";
}

/**
 * Fast O(1) probing depth clinical tone lookup without conditionals.
 */
export function getFastProbingDepthTone(pd: number | null | undefined): HeatmapTone {
	if (pd === null || pd === undefined || Number.isNaN(pd) || pd < 0) {
		return NEUTRAL_TONE;
	}
	const intPd = Math.min(Math.floor(pd), MAX_LUT_DEPTH);
	return PROBING_DEPTH_TONE_LUT[intPd] ?? "error";
}

/**
 * Fast O(1) 32-bit packed color lookup for direct Canvas pixel manipulation.
 */
export function getFastProbingDepthRgba32(pd: number | null | undefined): number {
	if (pd === null || pd === undefined || Number.isNaN(pd) || pd < 0) {
		return NEUTRAL_RGBA32;
	}
	const intPd = Math.min(Math.floor(pd), MAX_LUT_DEPTH);
	return PROBING_DEPTH_RGBA32_LUT[intPd] ?? 0xff8571fb;
}

// ============================================================================
// 2. PERIO GEOMETRY BUFFERS (Zero-GC Polygon & Curve Generation)
// ============================================================================

/**
 * Manages reusable Float32Array buffers for plotting gingival contour curves
 * and pocket depth polygons across 96 upper and 96 lower sites.
 */
export class PerioGeometryBufferPool {
	// 192 measurement points * 2 coordinates (x, y) = 384 floats
	// Doubled for closed polygon loops (top contour + bottom baseline)
	private readonly vertexBuffer = new Float32Array(1024);

	/**
	 * Populates contiguous vertex buffer with periodontal contour coordinates.
	 * Returns the number of vertices written.
	 */
	public populateContourVertices(
		values: readonly (number | null | undefined)[],
		originX: number,
		stepX: number,
		baseY: number,
		scaleY: number,
		invertY = false,
	): number {
		const count = values.length;
		let writeIdx = 0;

		for (let i = 0; i < count; i++) {
			const val = values[i] ?? 0;
			const x = originX + i * stepX;
			const y = invertY ? baseY - val * scaleY : baseY + val * scaleY;

			this.vertexBuffer[writeIdx++] = x;
			this.vertexBuffer[writeIdx++] = y;
		}

		return count;
	}

	/**
	 * Populates closed pocket polygon coordinates (upper contour + bottom contour).
	 * Returns the total number of polygon vertices.
	 */
	public populateClosedPolygonVertices(
		gingivalMargin: readonly (number | null | undefined)[],
		probingDepth: readonly (number | null | undefined)[],
		originX: number,
		stepX: number,
		baseY: number,
		scaleY: number,
		isUpperJaw = true,
	): number {
		const count = gingivalMargin.length;
		let writeIdx = 0;

		// 1. Forward pass: Gingival Margin (GM) contour
		for (let i = 0; i < count; i++) {
			const gm = gingivalMargin[i] ?? 0;
			const x = originX + i * stepX;
			const y = isUpperJaw ? baseY + gm * scaleY : baseY - gm * scaleY;

			this.vertexBuffer[writeIdx++] = x;
			this.vertexBuffer[writeIdx++] = y;
		}

		// 2. Reverse pass: Pocket Depth bottom contour (GM + PD)
		for (let i = count - 1; i >= 0; i--) {
			const gm = gingivalMargin[i] ?? 0;
			const pd = probingDepth[i] ?? 0;
			const totalDepth = gm + pd;
			const x = originX + i * stepX;
			const y = isUpperJaw ? baseY + totalDepth * scaleY : baseY - totalDepth * scaleY;

			this.vertexBuffer[writeIdx++] = x;
			this.vertexBuffer[writeIdx++] = y;
		}

		return count * 2;
	}

	/**
	 * Directly renders the buffered contour onto a 2D Canvas context without allocations.
	 */
	public drawBufferedPath(
		ctx: CanvasRenderingContext2D,
		vertexCount: number,
		strokeColor: string,
		lineWidth = 2,
		fillColor?: string,
	): void {
		if (vertexCount < 2) return;

		ctx.save();
		ctx.beginPath();
		ctx.lineWidth = lineWidth;
		ctx.strokeStyle = strokeColor;

		const startX = this.vertexBuffer[0];
		const startY = this.vertexBuffer[1];
		if (startX !== undefined && startY !== undefined) {
			ctx.moveTo(startX, startY);
		}

		for (let i = 1; i < vertexCount; i++) {
			const idx = i * 2;
			const x = this.vertexBuffer[idx];
			const y = this.vertexBuffer[idx + 1];
			if (x !== undefined && y !== undefined) {
				ctx.lineTo(x, y);
			}
		}

		if (fillColor) {
			ctx.closePath();
			ctx.fillStyle = fillColor;
			ctx.fill();
		}

		ctx.stroke();
		ctx.restore();
	}
}

export const perioGeometryBuffers = new PerioGeometryBufferPool();

// ============================================================================
// 3. COALESCED SCROLL SYNCHRONIZATION
// ============================================================================

export interface PerioScrollSyncController {
	/** Attaches scroll listener to a source container */
	registerContainer: (element: HTMLElement) => () => void;
	/** Programmatically synchronizes scroll position to target offset */
	scrollToOffset: (scrollLeft: number) => void;
	/** Disposes all event listeners and scheduled RAF timers */
	destroy: () => void;
}

/**
 * Creates a coalescing scroll synchronization controller between upper and lower arches.
 * Throttles scroll propagation via RAF to prevent dropped frames on weak CPUs.
 */
export function createPerioScrollSyncController(
	containers: (HTMLElement | null)[],
): PerioScrollSyncController {
	const activeElements = new Set<HTMLElement>();
	let isSyncing = false;
	let targetScrollLeft = 0;

	for (const el of containers) {
		if (el) activeElements.add(el);
	}

	const throttledSync = createRafThrottler<number>(
		(scrollLeft) => {
			isSyncing = true;
			for (const el of activeElements) {
				if (Math.abs(el.scrollLeft - scrollLeft) > 1) {
					el.scrollLeft = scrollLeft;
				}
			}
			isSyncing = false;
		},
		{
			targetFps: 60,
			minFps: 30,
			detectLowEnd: true,
		},
	);

	const handleScroll = (e: Event) => {
		if (isSyncing) return;
		const source = e.currentTarget as HTMLElement | null;
		if (!source) return;

		targetScrollLeft = source.scrollLeft;
		throttledSync(targetScrollLeft);
	};

	const cleanupHandlers: (() => void)[] = [];

	for (const el of activeElements) {
		el.addEventListener("scroll", handleScroll, { passive: true });
		cleanupHandlers.push(() => el.removeEventListener("scroll", handleScroll));
	}

	return {
		registerContainer: (element: HTMLElement) => {
			activeElements.add(element);
			element.addEventListener("scroll", handleScroll, { passive: true });
			return () => {
				activeElements.delete(element);
				element.removeEventListener("scroll", handleScroll);
			};
		},
		scrollToOffset: (scrollLeft: number) => {
			targetScrollLeft = scrollLeft;
			throttledSync(scrollLeft);
		},
		destroy: () => {
			throttledSync.destroy();
			for (const cleanup of cleanupHandlers) {
				cleanup();
			}
			activeElements.clear();
		},
	};
}

// ============================================================================
// 4. VIEWPORT COLUMN CULLING (Weak Device Optimization)
// ============================================================================

export interface VisibleTeethRange {
	startIndex: number;
	endIndex: number;
	visibleCount: number;
}

/**
 * Computes the visible range of tooth columns given horizontal scroll offset.
 * Applies 2-column overscan buffer to guarantee smooth scrolling without visual pops.
 */
export function getVisiblePerioTeethRange(
	scrollLeft: number,
	viewportWidth: number,
	toothColumnWidth: number,
	totalTeeth: number,
	overscanColumns = 2,
): VisibleTeethRange {
	if (toothColumnWidth <= 0 || totalTeeth <= 0) {
		return { startIndex: 0, endIndex: Math.max(0, totalTeeth - 1), visibleCount: totalTeeth };
	}

	const rawStart = Math.floor(scrollLeft / toothColumnWidth);
	const rawEnd = Math.ceil((scrollLeft + viewportWidth) / toothColumnWidth);

	const startIndex = Math.max(0, rawStart - overscanColumns);
	const endIndex = Math.min(totalTeeth - 1, rawEnd + overscanColumns);
	const visibleCount = Math.max(0, endIndex - startIndex + 1);

	return {
		startIndex,
		endIndex,
		visibleCount,
	};
}

// ============================================================================
// 5. CSS CONTAINMENT & PERFORMANCE STYLES
// ============================================================================

/**
 * Periodontogram Container Layout Containment Styles.
 * - `contain: content`: Isolates the periodontogram DOM tree from the rest of the application.
 *   Changes to probing numbers, bleeding dots, or furcation markers stay strictly within the chart
 *   and do not trigger recalculations of the global header, sidebar, or visit notes.
 * - `willChange: "scroll-position, transform"`: Tells the browser compositor to isolate the scroll layer,
 *   reducing paint operations on weak Intel HD Graphics.
 */
export const PERIO_CONTAINMENT_STYLES: React.CSSProperties = {
	contain: "content",
	willChange: "scroll-position, transform",
	transform: "translateZ(0)",
	backfaceVisibility: "hidden",
};

/**
 * Props helper for periodontogram viewport scroll containers.
 */
export const PERIO_SCROLL_CONTAINER_PROPS = {
	style: PERIO_CONTAINMENT_STYLES,
	className: "perio-scroll-viewport overflow-x-auto select-none touch-pan-x",
} as const;
