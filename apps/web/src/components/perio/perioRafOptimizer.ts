/**
 * apps/web/src/components/perio/perioRafOptimizer.ts
 *
 * Легковесный модуль визуализации и скролл-синхронизации карты пародонта.
 * Обеспечивает мгновенный O(1) поиск клинических оттенков глубин пародонтальных карманов,
 * скролл-синхронизацию зубных рядов и CSS-изоляцию перерисовок без процедурных симуляторов.
 */

import type React from "react";
import type { HeatmapTone } from "./perioHeatmap";
import { createRafThrottler, type ThrottledRafFunction } from "../../utils/rafThrottler";

// ============================================================================
// 1. КЛИНИЧЕСКИЕ ШКАЛЫ ГЛУБИНЫ КАРМАНОВ (O(1) LUT)
// ============================================================================

/** Максимальная шкала глубины кармана для быстрого поиска (0..15 мм) */
const MAX_LUT_DEPTH = 15;

/**
 * Базовые клинические цвета глубин:
 * Глубина <= 3 мм: #34d399 (норма, здоровый пародонт)
 * Глубина == 4 мм: #fbbf24 (ранний пародонтит)
 * Глубина 5-6 мм:  #f97316 (умеренный пародонтальный карман)
 * Глубина >= 7 мм: #fb7185 (глубокий патологический карман)
 */
export const PROBING_DEPTH_HEX_LUT: readonly string[] = [
	"#34d399", // 0 мм (норма)
	"#34d399", // 1 мм
	"#34d399", // 2 мм
	"#34d399", // 3 мм (физиологическая норма борозды)
	"#fbbf24", // 4 мм
	"#f97316", // 5 мм
	"#f97316", // 6 мм
	"#fb7185", // 7 мм
	"#fb7185", // 8 мм
	"#fb7185", // 9 мм
	"#fb7185", // 10 мм
	"#fb7185", // 11 мм
	"#fb7185", // 12 мм
	"#fb7185", // 13 мм
	"#fb7185", // 14 мм
	"#fb7185", // 15 мм
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

export const PROBING_DEPTH_RGBA32_LUT: readonly number[] = [
	0xff99d334,
	0xff99d334,
	0xff99d334,
	0xff99d334,
	0xff24bffb,
	0xff1673f9,
	0xff1673f9,
	0xff8571fb,
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
 * Быстрое O(1) определение цвета глубины кармана
 */
export function getFastProbingDepthHex(pd: number | null | undefined): string {
	if (pd === null || pd === undefined || Number.isNaN(pd) || pd < 0) {
		return NEUTRAL_HEX;
	}
	const intPd = Math.min(Math.floor(pd), MAX_LUT_DEPTH);
	return PROBING_DEPTH_HEX_LUT[intPd] ?? "#fb7185";
}

/**
 * Быстрое O(1) определение клинического статуса глубины кармана
 */
export function getFastProbingDepthTone(pd: number | null | undefined): HeatmapTone {
	if (pd === null || pd === undefined || Number.isNaN(pd) || pd < 0) {
		return NEUTRAL_TONE;
	}
	const intPd = Math.min(Math.floor(pd), MAX_LUT_DEPTH);
	return PROBING_DEPTH_TONE_LUT[intPd] ?? "error";
}

/**
 * 4-уровневая клиническая шкала пародонтологических карманов:
 * <= 3 мм: #34d399 (зеленый / норма)
 * 4..5 мм: #fbbf24 (желтый / легкий)
 * 6..7 мм: #f97316 (оранжевый / средний)
 * >= 8 мм: #e11d48 (алый / глубокий костный карман)
 */
export const CLINICAL_PROBING_DEPTH_HEX_LUT: readonly string[] = [
	"#34d399", // 0 мм
	"#34d399", // 1 мм
	"#34d399", // 2 мм
	"#34d399", // 3 мм
	"#fbbf24", // 4 мм
	"#fbbf24", // 5 мм
	"#f97316", // 6 мм
	"#f97316", // 7 мм
	"#e11d48", // 8 мм
	"#e11d48", // 9 мм
	"#e11d48", // 10 мм
	"#e11d48", // 11 мм
	"#e11d48", // 12 мм
	"#e11d48", // 13 мм
	"#e11d48", // 14 мм
	"#e11d48", // 15 мм
] as const;

export const CLINICAL_PROBING_DEPTH_TONE_LUT: readonly HeatmapTone[] = [
	"success", // 0
	"success", // 1
	"success", // 2
	"success", // 3
	"warning-low", // 4
	"warning-low", // 5
	"warning-high", // 6
	"warning-high", // 7
	"critical", // 8
	"critical", // 9
	"critical", // 10
	"critical", // 11
	"critical", // 12
	"critical", // 13
	"critical", // 14
	"critical", // 15
] as const;

export function getFastClinicalProbingDepthHex(
	pd: number | null | undefined,
): string {
	if (pd === null || pd === undefined || Number.isNaN(pd) || pd < 0) {
		return NEUTRAL_HEX;
	}
	const intPd = Math.min(Math.floor(pd), MAX_LUT_DEPTH);
	return CLINICAL_PROBING_DEPTH_HEX_LUT[intPd] ?? "#e11d48";
}

export function getFastClinicalProbingDepthTone(
	pd: number | null | undefined,
): HeatmapTone {
	if (pd === null || pd === undefined || Number.isNaN(pd) || pd < 0) {
		return NEUTRAL_TONE;
	}
	const intPd = Math.min(Math.floor(pd), MAX_LUT_DEPTH);
	return CLINICAL_PROBING_DEPTH_TONE_LUT[intPd] ?? "critical";
}

export function getFastProbingDepthRgba32(pd: number | null | undefined): number {
	if (pd === null || pd === undefined || Number.isNaN(pd) || pd < 0) {
		return NEUTRAL_RGBA32;
	}
	const intPd = Math.min(Math.floor(pd), MAX_LUT_DEPTH);
	return PROBING_DEPTH_RGBA32_LUT[intPd] ?? 0xff8571fb;
}

// ============================================================================
// 2. СКРОЛЛ-СИНХРОНИЗАЦИЯ ЧЕЛЮСТЕЙ
// ============================================================================

export interface PerioScrollSyncController {
	registerContainer: (element: HTMLElement) => () => void;
	scrollToOffset: (scrollLeft: number) => void;
	destroy: () => void;
}

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
// 3. ВИДИМЫЙ ДИАПАЗОН ЗУБОВ В СКРОЛЛЕ
// ============================================================================

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
	const visibleCount = Math.max(0, endIndex - startIndex + 1);

	return {
		startIndex,
		endIndex,
		visibleCount,
	};
}

// ============================================================================
// 4. CSS CONTAINMENT
// ============================================================================

export const PERIO_CONTAINMENT_STYLES: React.CSSProperties = {
	contain: "content",
	willChange: "scroll-position, transform",
	transform: "translateZ(0)",
	backfaceVisibility: "hidden",
};

export const PERIO_SCROLL_CONTAINER_PROPS = {
	style: PERIO_CONTAINMENT_STYLES,
	className: "perio-scroll-viewport overflow-x-auto select-none touch-pan-x",
} as const;
