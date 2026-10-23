/**
 * perioScrollSync.ts — Скролл-синхронизация челюстей и виртуальный диапазон видимости зубов.
 * Архитектурный слой Layer 2: Viewport Engine (Мандат 8b, <= 120 строк).
 */

import type React from "react";
import { createRafThrottler } from "../../utils/rafThrottler";

export interface PerioScrollSyncController {
	registerContainer: (element: HTMLElement) => () => void;
	scrollToOffset: (scrollLeft: number) => void;
	destroy: () => void;
}

export function createPerioScrollSyncController(containers: (HTMLElement | null)[]): PerioScrollSyncController {
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
		{ targetFps: 60, minFps: 30, detectLowEnd: true },
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
			for (const cleanup of cleanupHandlers) cleanup();
			activeElements.clear();
		},
	};
}

export interface VisibleTeethRange {
	startIndex: number;
	endIndex: number;
	visibleCount: number;
}

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
	return { startIndex, endIndex, visibleCount: Math.max(0, endIndex - startIndex + 1) };
}

export const PERIO_CONTAINMENT_STYLES: React.CSSProperties = {
	contain: "content",
	willChange: "scroll-position, transform",
	transform: "translateZ(0)",
	backfaceVisibility: "hidden",
};

export const PERIO_OPTIMIZER_CONTAINMENT_STYLE = PERIO_CONTAINMENT_STYLES;

export const PERIO_SCROLL_CONTAINER_PROPS = {
	style: PERIO_CONTAINMENT_STYLES,
	className: "perio-scroll-viewport overflow-x-auto select-none touch-pan-x",
} as const;
