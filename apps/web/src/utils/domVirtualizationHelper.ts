/**
 * apps/web/src/utils/domVirtualizationHelper.ts
 *
 * DENTE Dental CRM — DOM Virtualization, List Windowing & Memory Guard.
 * Compliance: Mandates 8e, 8k, 8n, 8d (Wave 252-Perf2 / Low-RAM Laptop Protection).
 *
 * Purpose:
 * Prevents browser memory exhaustion and Windows pagefile thrashing (pagefile.sys swap)
 * on low-spec clinic computers (4–8 GB RAM with slow HDD/SATA SSD).
 *
 * Capabilities:
 * - Deterministic list chunk slicing with configurable page bounds (default 50 items).
 * - High-performance virtual window offset & padding calculations.
 * - DOM memory footprint & node density diagnostics.
 * - Non-blocking progressive DOM batch scheduler for main-thread responsiveness.
 */

export const DEFAULT_DOM_PAGE_SIZE = 50;
export const DEFAULT_DOM_CHUNK_STEP = 50;
export const RECOMMENDED_DOM_MAX_NODES = 250;
export const ESTIMATED_DOM_NODE_BYTES = 2048; // ~2 KB per interactive card node (DOM + Fiber + Event Listeners)

export interface DomListSliceResult<T> {
	readonly visibleItems: T[];
	readonly totalCount: number;
	readonly displayedCount: number;
	readonly remainingCount: number;
	readonly hasMore: boolean;
	readonly pageSize: number;
	readonly currentPage: number;
	readonly totalPages: number;
}

/**
 * Safely slice a list for rendering with memory bounds.
 */
export function sliceDomList<T>(
	items: readonly T[],
	limit = DEFAULT_DOM_PAGE_SIZE,
	offset = 0,
): DomListSliceResult<T> {
	const totalCount = items.length;
	const safeLimit = Math.max(1, limit);
	const safeOffset = Math.max(0, Math.min(offset, totalCount));

	const visibleItems = items.slice(safeOffset, safeOffset + safeLimit);
	const displayedCount = visibleItems.length;
	const remainingCount = Math.max(
		0,
		totalCount - (safeOffset + displayedCount),
	);
	const hasMore = safeOffset + displayedCount < totalCount;
	const currentPage = Math.floor(safeOffset / safeLimit) + 1;
	const totalPages = Math.max(1, Math.ceil(totalCount / safeLimit));

	return {
		visibleItems,
		totalCount,
		displayedCount,
		remainingCount,
		hasMore,
		pageSize: safeLimit,
		currentPage,
		totalPages,
	};
}

export interface VirtualWindowParams {
	readonly totalCount: number;
	readonly itemHeightPx: number;
	readonly viewportHeightPx: number;
	readonly scrollTopPx: number;
	readonly overscanCount?: number;
}

export interface VirtualWindowResult {
	readonly startIndex: number;
	readonly endIndex: number;
	readonly visibleCount: number;
	readonly topOffsetPx: number;
	readonly bottomOffsetPx: number;
	readonly totalHeightPx: number;
}

/**
 * Calculate virtual window boundaries for high-performance list scrolling.
 */
export function calculateVirtualWindow(
	params: VirtualWindowParams,
): VirtualWindowResult {
	const {
		totalCount,
		itemHeightPx,
		viewportHeightPx,
		scrollTopPx,
		overscanCount = 3,
	} = params;

	if (totalCount <= 0 || itemHeightPx <= 0) {
		return {
			startIndex: 0,
			endIndex: 0,
			visibleCount: 0,
			topOffsetPx: 0,
			bottomOffsetPx: 0,
			totalHeightPx: 0,
		};
	}

	const totalHeightPx = totalCount * itemHeightPx;
	const safeScrollTop = Math.max(
		0,
		Math.min(scrollTopPx, Math.max(0, totalHeightPx - viewportHeightPx)),
	);

	const rawStartIndex = Math.floor(safeScrollTop / itemHeightPx);
	const rawEndIndex = Math.min(
		totalCount - 1,
		Math.floor(
			(safeScrollTop + Math.max(itemHeightPx, viewportHeightPx)) / itemHeightPx,
		),
	);

	const startIndex = Math.max(0, rawStartIndex - overscanCount);
	const endIndex = Math.min(totalCount - 1, rawEndIndex + overscanCount);
	const visibleCount = Math.max(0, endIndex - startIndex + 1);

	const topOffsetPx = startIndex * itemHeightPx;
	const bottomOffsetPx = Math.max(
		0,
		(totalCount - 1 - endIndex) * itemHeightPx,
	);

	return {
		startIndex,
		endIndex,
		visibleCount,
		topOffsetPx,
		bottomOffsetPx,
		totalHeightPx,
	};
}

export interface DomMemoryEstimate {
	readonly nodeCount: number;
	readonly estimatedBytes: number;
	readonly estimatedMb: number;
	readonly riskLevel: "safe" | "moderate" | "critical";
	readonly recommendation: string;
}

/**
 * Estimate memory load from DOM element count to prevent pagefile thrashing.
 */
export function estimateDomMemoryLoad(nodeCount: number): DomMemoryEstimate {
	const count = Math.max(0, nodeCount);
	const estimatedBytes = count * ESTIMATED_DOM_NODE_BYTES;
	const estimatedMb = Math.round((estimatedBytes / (1024 * 1024)) * 100) / 100;

	if (count > RECOMMENDED_DOM_MAX_NODES * 2) {
		return {
			nodeCount: count,
			estimatedBytes,
			estimatedMb,
			riskLevel: "critical",
			recommendation:
				"Критическая нагрузка на DOM! Рекомендуется ограничение до 50 записей во избежание своппинга в pagefile.sys.",
		};
	}

	if (count > RECOMMENDED_DOM_MAX_NODES) {
		return {
			nodeCount: count,
			estimatedBytes,
			estimatedMb,
			riskLevel: "moderate",
			recommendation:
				"Умеренная нагрузка на память. Рекомендуется ленивая догрузка с шагом в 50 элементов.",
		};
	}

	return {
		nodeCount: count,
		estimatedBytes,
		estimatedMb,
		riskLevel: "safe",
		recommendation: "Нагрузка в пределах нормы.",
	};
}

export interface ProgressiveBatchSchedulerOptions {
	readonly delayMs?: number;
}

export interface BatchSchedulerProgress {
	readonly rendered: number;
	readonly total: number;
	readonly isDone: boolean;
}

/**
 * Schedule progressive rendering of items in chunks to avoid blocking the main thread.
 * Returns a cancel callback for clean unmounting.
 */
export function scheduleProgressiveDomRender<T>(
	items: readonly T[],
	chunkSize: number,
	onChunk: (chunk: T[], progress: BatchSchedulerProgress) => void,
	options?: ProgressiveBatchSchedulerOptions,
): () => void {
	let cancelled = false;
	let currentIndex = 0;
	let timerId: ReturnType<typeof setTimeout> | null = null;
	const safeChunkSize = Math.max(1, chunkSize);
	const delayMs = options?.delayMs ?? 16; // ~1 frame (60fps)

	function processNextChunk() {
		if (cancelled) return;
		const nextIndex = Math.min(items.length, currentIndex + safeChunkSize);
		const chunk = items.slice(currentIndex, nextIndex);
		currentIndex = nextIndex;

		const isDone = currentIndex >= items.length;
		onChunk(chunk, {
			rendered: currentIndex,
			total: items.length,
			isDone,
		});

		if (!isDone && !cancelled) {
			timerId = setTimeout(processNextChunk, delayMs);
		}
	}

	timerId = setTimeout(processNextChunk, 0);

	return () => {
		cancelled = true;
		if (timerId !== null) {
			clearTimeout(timerId);
			timerId = null;
		}
	};
}
