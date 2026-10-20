/**
 * apps/web/src/utils/useDynamicVirtualizer.ts
 *
 * DENTE Dental CRM — Zero-Dependency Dynamic Virtualized Windowing Engine.
 * Compliance: Mandates 8c, 8e, 8k, 8n (Low-Spec Celeron / 4GB RAM Memory Shield & Zero CLS).
 *
 * Architecture:
 * 1. Zero external dependencies: pure React 19 + TypeScript.
 * 2. Dynamic height measurement: ResizeObserver measures rendered cards and updates prefix offsets.
 * 3. Zero Layout Shift (CLS = 0): Scroll anchoring guard shifts scrollTop when above-viewport cards resize.
 * 4. High-performance binary search: O(log N) window slicing for hundreds of items.
 * 5. Minimal DOM footprint: only 8–12 cards + 2 overscan nodes exist in the DOM at any time.
 * 6. Low-end Celeron optimization: CPU throttling protection via requestAnimationFrame debouncing.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

export interface VirtualItem {
	readonly index: number;
	readonly key: string | number;
	readonly start: number;
	readonly size: number;
	readonly measureRef: (node: HTMLElement | null) => void;
}

export interface UseDynamicVirtualizerOptions {
	/** Total count of items in the list */
	readonly count: number;
	/** Estimated height of one card in pixels before real DOM measurement */
	readonly estimateHeight: number;
	/** Number of buffer items rendered above and below the viewport (default: 2) */
	readonly overscan?: number | undefined;
	/** Optional function to get unique stable key for each item */
	readonly getItemKey?: ((index: number) => string | number) | undefined;
	/** Optional ref to external scrollable container. If omitted, internal container or parent is used */
	readonly scrollContainerRef?: React.RefObject<HTMLElement | null> | undefined;
	/** Minimum items count threshold to activate virtualization (default: 8) */
	readonly threshold?: number | undefined;
	/** Optional fixed viewport height override (useful for testing or fixed boxes) */
	readonly viewportHeightOverride?: number | undefined;
	/** Optional initial scroll top for SSR or testing */
	readonly initialScrollTop?: number | undefined;
}

export interface UseDynamicVirtualizerResult {
	/** Array of visible items to mount in the DOM */
	readonly virtualItems: VirtualItem[];
	/** Total calculated height of the entire list (measured + estimated) */
	readonly totalHeight: number;
	/** Height of top spacer element */
	readonly topSpacerHeight: number;
	/** Height of bottom spacer element */
	readonly bottomSpacerHeight: number;
	/** First visible index in the virtual window */
	readonly startIndex: number;
	/** Last visible index in the virtual window */
	readonly endIndex: number;
	/** Whether virtualization is actively windowing the DOM (false if count <= threshold) */
	readonly isVirtualizing: boolean;
	/** Container ref to attach to the root wrapping DOM element */
	readonly containerRef: React.RefObject<HTMLDivElement | null>;
	/** Programmatic scroll to specific item index */
	readonly scrollToIndex: (
		index: number,
		align?: "start" | "center" | "end" | "auto",
	) => void;
	/** Current observed viewport height */
	readonly viewportHeight: number;
	/** Current observed scrollTop */
	readonly scrollTop: number;
}

// SSR-safe layout effect
const useIsomorphicLayoutEffect =
	typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Binary search to find the nearest index whose end offset is greater than target offset.
 */
function findNearestIndex(offsets: number[], target: number): number {
	let low = 0;
	let high = offsets.length - 2;

	while (low <= high) {
		const mid = Math.floor((low + high) / 2);
		const start = offsets[mid] ?? 0;
		const end = offsets[mid + 1] ?? 0;

		if (end <= target) {
			low = mid + 1;
		} else if (start > target) {
			high = mid - 1;
		} else {
			return mid;
		}
	}

	return Math.max(0, Math.min(low, offsets.length - 2));
}

export function useDynamicVirtualizer({
	count,
	estimateHeight,
	overscan = 2,
	getItemKey,
	scrollContainerRef,
	threshold = 8,
	viewportHeightOverride,
	initialScrollTop = 0,
}: UseDynamicVirtualizerOptions): UseDynamicVirtualizerResult {
	const containerRef = useRef<HTMLDivElement | null>(null);

	// Cache of measured heights: key -> measured height in px
	const sizeCacheRef = useRef<Map<string | number, number>>(new Map());
	const nodeMapRef = useRef<Map<string | number, HTMLElement>>(new Map());

	// Scroll position and viewport dimensions
	const [scrollTop, setScrollTop] = useState<number>(initialScrollTop);
	const [viewportHeight, setViewportHeight] = useState<number>(
		viewportHeightOverride ?? 600,
	);
	// Counter to trigger re-renders when measured heights change
	const [, setMeasurementsVersion] = useState<number>(0);

	const isVirtualizing = count > threshold;

	// Calculate stable item key
	const getKey = useCallback(
		(index: number): string | number => {
			if (getItemKey) return getItemKey(index);
			return index;
		},
		[getItemKey],
	);

	// Compute prefix sum offsets and total height
	const { offsets, totalHeight } = useMemo(() => {
		const offs = new Array<number>(count + 1);
		offs[0] = 0;
		const safeEstimate = Math.max(10, estimateHeight);

		for (let i = 0; i < count; i++) {
			const key = getKey(i);
			const measured = sizeCacheRef.current.get(key);
			const height = measured ?? safeEstimate;
			offs[i + 1] = (offs[i] ?? 0) + height;
		}

		return {
			offsets: offs,
			totalHeight: offs[count] || 0,
		};
	}, [count, estimateHeight, getKey]);

	// Resolve the active scroll element
	const getScrollElement = useCallback((): HTMLElement | Window | null => {
		if (typeof window === "undefined") return null;
		if (scrollContainerRef?.current) return scrollContainerRef.current;
		if (containerRef.current) {
			// Find nearest scrollable parent
			let parent = containerRef.current.parentElement;
			while (parent) {
				const style = window.getComputedStyle(parent);
				const overflowY = style.overflowY;
				if (
					(overflowY === "auto" || overflowY === "scroll") &&
					parent.scrollHeight > parent.clientHeight
				) {
					return parent;
				}
				parent = parent.parentElement;
			}
		}
		return window;
	}, [scrollContainerRef]);

	// Update scroll and viewport on scroll / resize
	useEffect(() => {
		if (typeof window === "undefined") return;

		let rafId: number | null = null;

		const handleScroll = () => {
			if (rafId !== null) return;
			rafId = window.requestAnimationFrame(() => {
				rafId = null;
				const scrollEl = getScrollElement();
				if (!scrollEl) return;

				if (scrollEl === window) {
					setScrollTop(window.scrollY || document.documentElement.scrollTop || 0);
					if (!viewportHeightOverride) {
						setViewportHeight(window.innerHeight || 600);
					}
				} else {
					const el = scrollEl as HTMLElement;
					// Calculate relative scrollTop if container is nested
					if (containerRef.current && scrollEl !== containerRef.current) {
						const containerRect = containerRef.current.getBoundingClientRect();
						const scrollElRect = el.getBoundingClientRect();
						const offsetFromScrollTop = containerRect.top - scrollElRect.top;
						const relativeScrollTop = Math.max(0, -offsetFromScrollTop);
						setScrollTop(relativeScrollTop);
					} else {
						setScrollTop(el.scrollTop);
					}
					if (!viewportHeightOverride) {
						setViewportHeight(el.clientHeight || 600);
					}
				}
			});
		};

		const scrollEl = getScrollElement();
		if (!scrollEl) return;

		scrollEl.addEventListener("scroll", handleScroll, { passive: true });
		window.addEventListener("resize", handleScroll, { passive: true });
		handleScroll();

		return () => {
			if (rafId !== null) window.cancelAnimationFrame(rafId);
			if (scrollEl) scrollEl.removeEventListener("scroll", handleScroll);
			window.removeEventListener("resize", handleScroll);
		};
	}, [getScrollElement, viewportHeightOverride]);

	// Calculate visible window boundaries
	const { startIndex, endIndex } = useMemo(() => {
		if (!isVirtualizing || count === 0) {
			return { startIndex: 0, endIndex: Math.max(0, count - 1) };
		}

		const effectiveViewport = viewportHeightOverride ?? viewportHeight;
		const minTarget = Math.max(0, scrollTop - overscan * estimateHeight);
		const maxTarget = scrollTop + effectiveViewport + overscan * estimateHeight;

		const rawStart = findNearestIndex(offsets, minTarget);
		const rawEnd = findNearestIndex(offsets, maxTarget);

		const start = Math.max(0, rawStart - overscan);
		const end = Math.min(count - 1, rawEnd + overscan);

		return { startIndex: start, endIndex: end };
	}, [
		isVirtualizing,
		count,
		viewportHeightOverride,
		viewportHeight,
		scrollTop,
		overscan,
		estimateHeight,
		offsets,
	]);

	// Setup ResizeObserver for dynamic height measurement
	const resizeObserverRef = useRef<ResizeObserver | null>(null);

	useIsomorphicLayoutEffect(() => {
		if (typeof window === "undefined" || typeof ResizeObserver === "undefined") {
			return;
		}

		let pendingDelta = 0;
		let pendingRaf: number | null = null;

		resizeObserverRef.current = new ResizeObserver((entries) => {
			let hasChanges = false;

			for (const entry of entries) {
				const target = entry.target as HTMLElement;
				const keyAttr = target.getAttribute("data-virtual-key");
				if (!keyAttr) continue;

				const height =
					entry.borderBoxSize?.[0]?.blockSize ??
					entry.contentRect?.height ??
					target.offsetHeight;

				if (height > 0) {
					const oldHeight = sizeCacheRef.current.get(keyAttr) ?? estimateHeight;
					const diff = height - oldHeight;

					if (Math.abs(diff) > 0.5) {
						sizeCacheRef.current.set(keyAttr, height);
						hasChanges = true;

						// Scroll Anchoring Guard: if card is above current viewport top, adjust scroll to prevent jump
						const indexAttr = Number(target.getAttribute("data-virtual-index"));
						const itemOffset = offsets[indexAttr];
						if (!Number.isNaN(indexAttr) && itemOffset !== undefined && itemOffset < scrollTop) {
							pendingDelta += diff;
						}
					}
				}
			}

			if (hasChanges) {
				if (pendingRaf === null) {
					pendingRaf = window.requestAnimationFrame(() => {
						pendingRaf = null;

						// Apply scroll anchoring delta if needed
						if (Math.abs(pendingDelta) > 0.5) {
							const scrollEl = getScrollElement();
							if (scrollEl && scrollEl !== window) {
								(scrollEl as HTMLElement).scrollTop += pendingDelta;
							} else if (scrollEl === window) {
								window.scrollBy(0, pendingDelta);
							}
							pendingDelta = 0;
						}

						setMeasurementsVersion((v) => v + 1);
					});
				}
			}
		});

		// Re-observe all active nodes
		nodeMapRef.current.forEach((node) => {
			resizeObserverRef.current?.observe(node);
		});

		return () => {
			if (pendingRaf !== null) window.cancelAnimationFrame(pendingRaf);
			resizeObserverRef.current?.disconnect();
			resizeObserverRef.current = null;
		};
	}, [estimateHeight, getScrollElement, offsets, scrollTop]);

	// Create measureRef for virtual items
	const createMeasureRef = useCallback(
		(key: string | number, index: number) => {
			return (node: HTMLElement | null) => {
				const oldNode = nodeMapRef.current.get(key);
				if (oldNode && oldNode !== node) {
					resizeObserverRef.current?.unobserve(oldNode);
					nodeMapRef.current.delete(key);
				}

				if (node) {
					node.setAttribute("data-virtual-key", String(key));
					node.setAttribute("data-virtual-index", String(index));
					nodeMapRef.current.set(key, node);
					resizeObserverRef.current?.observe(node);
				}
			};
		},
		[],
	);

	// Construct virtual items array
	const virtualItems = useMemo(() => {
		if (count === 0) return [];

		if (!isVirtualizing) {
			// Below threshold: render all items without virtual windowing
			const items: VirtualItem[] = [];
			for (let i = 0; i < count; i++) {
				const key = getKey(i);
				const start = offsets[i] ?? 0;
				const nextOffset = offsets[i + 1];
				const size =
					sizeCacheRef.current.get(key) ??
					(nextOffset !== undefined ? nextOffset - start : estimateHeight);
				items.push({
					index: i,
					key,
					start,
					size,
					measureRef: createMeasureRef(key, i),
				});
			}
			return items;
		}

		const items: VirtualItem[] = [];
		for (let i = startIndex; i <= endIndex; i++) {
			const key = getKey(i);
			const start = offsets[i] ?? 0;
			const nextOffset = offsets[i + 1];
			const size =
				sizeCacheRef.current.get(key) ??
				(nextOffset !== undefined ? nextOffset - start : estimateHeight);

			items.push({
				index: i,
				key,
				start,
				size,
				measureRef: createMeasureRef(key, i),
			});
		}

		return items;
	}, [
		count,
		isVirtualizing,
		startIndex,
		endIndex,
		getKey,
		offsets,
		estimateHeight,
		createMeasureRef,
	]);

	// Calculate spacer heights
	const topSpacerHeight = useMemo(() => {
		if (!isVirtualizing || virtualItems.length === 0) return 0;
		return offsets[startIndex] || 0;
	}, [isVirtualizing, virtualItems.length, offsets, startIndex]);

	const bottomSpacerHeight = useMemo(() => {
		if (!isVirtualizing || virtualItems.length === 0) return 0;
		const lastRenderedEnd = offsets[endIndex + 1] || totalHeight;
		return Math.max(0, totalHeight - lastRenderedEnd);
	}, [isVirtualizing, virtualItems.length, offsets, endIndex, totalHeight]);

	// Programmatic scroll to index
	const scrollToIndex = useCallback(
		(index: number, align: "start" | "center" | "end" | "auto" = "auto") => {
			if (index < 0 || index >= count) return;
			const targetStart = offsets[index] ?? 0;
			const nextOffset = offsets[index + 1];
			const targetHeight =
				(nextOffset !== undefined ? nextOffset : targetStart + estimateHeight) - targetStart;
			const effViewport = viewportHeightOverride ?? viewportHeight;

			let nextScrollTop = targetStart;

			if (align === "center") {
				nextScrollTop = Math.max(0, targetStart - (effViewport - targetHeight) / 2);
			} else if (align === "end") {
				nextScrollTop = Math.max(0, targetStart - effViewport + targetHeight);
			} else if (align === "auto") {
				if (targetStart < scrollTop) {
					nextScrollTop = targetStart;
				} else if (targetStart + targetHeight > scrollTop + effViewport) {
					nextScrollTop = targetStart + targetHeight - effViewport;
				} else {
					return; // Already in view
				}
			}

			const scrollEl = getScrollElement();
			if (scrollEl === window) {
				window.scrollTo({ top: nextScrollTop, behavior: "smooth" });
			} else if (scrollEl) {
				(scrollEl as HTMLElement).scrollTo({
					top: nextScrollTop,
					behavior: "smooth",
				});
			}
		},
		[
			count,
			offsets,
			estimateHeight,
			viewportHeightOverride,
			viewportHeight,
			scrollTop,
			getScrollElement,
		],
	);

	return {
		virtualItems,
		totalHeight,
		topSpacerHeight,
		bottomSpacerHeight,
		startIndex,
		endIndex,
		isVirtualizing,
		containerRef,
		scrollToIndex,
		viewportHeight: viewportHeightOverride ?? viewportHeight,
		scrollTop,
	};
}
