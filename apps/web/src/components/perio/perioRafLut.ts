/**
 * perioRafLut.ts — O(1) LUT таблицы цветов и тонов клинической глубины карманов.
 * Архитектурный слой Layer 0: LUT Constants (Мандат 8b, <= 120 строк).
 */

import type { HeatmapTone } from "./perioHeatmap";

export const MAX_LUT_DEPTH = 15;

export const PROBING_DEPTH_HEX_LUT: readonly string[] = [
	"#34d399", "#34d399", "#34d399", "#34d399", // 0..3 мм
	"#fbbf24", "#f97316", "#f97316",             // 4..6 мм
	"#fb7185", "#fb7185", "#fb7185", "#fb7185", // 7..10 мм
	"#fb7185", "#fb7185", "#fb7185", "#fb7185", "#fb7185", // 11..15 мм
] as const;

export const PROBING_DEPTH_TONE_LUT: readonly HeatmapTone[] = [
	"success", "success", "success", "success",
	"warning-low", "warning-high", "warning-high",
	"error", "error", "error", "error", "error", "error", "error", "error", "error",
] as const;

export const PROBING_DEPTH_RGBA32_LUT: readonly number[] = [
	0xff99d334, 0xff99d334, 0xff99d334, 0xff99d334,
	0xff24bffb, 0xff1673f9, 0xff1673f9,
	0xff8571fb, 0xff8571fb, 0xff8571fb, 0xff8571fb, 0xff8571fb, 0xff8571fb, 0xff8571fb, 0xff8571fb, 0xff8571fb,
] as const;

export const CLINICAL_PROBING_DEPTH_HEX_LUT: readonly string[] = [
	"#34d399", "#34d399", "#34d399", "#34d399",
	"#fbbf24", "#fbbf24", "#f97316", "#f97316",
	"#e11d48", "#e11d48", "#e11d48", "#e11d48", "#e11d48", "#e11d48", "#e11d48", "#e11d48",
] as const;

export const CLINICAL_PROBING_DEPTH_TONE_LUT: readonly HeatmapTone[] = [
	"success", "success", "success", "success",
	"warning-low", "warning-low", "warning-high", "warning-high",
	"critical", "critical", "critical", "critical", "critical", "critical", "critical", "critical",
] as const;

const NEUTRAL_HEX = "#d1d5db";
const NEUTRAL_TONE: HeatmapTone = "neutral";
const NEUTRAL_RGBA32 = 0xffdbd5d1;

export function getFastProbingDepthHex(pd: number | null | undefined): string {
	if (pd === null || pd === undefined || Number.isNaN(pd) || pd < 0) return NEUTRAL_HEX;
	const intPd = Math.min(Math.floor(pd), MAX_LUT_DEPTH);
	return PROBING_DEPTH_HEX_LUT[intPd] ?? "#fb7185";
}

export function getFastProbingDepthTone(pd: number | null | undefined): HeatmapTone {
	if (pd === null || pd === undefined || Number.isNaN(pd) || pd < 0) return NEUTRAL_TONE;
	const intPd = Math.min(Math.floor(pd), MAX_LUT_DEPTH);
	return PROBING_DEPTH_TONE_LUT[intPd] ?? "error";
}

export function getFastClinicalProbingDepthHex(pd: number | null | undefined): string {
	if (pd === null || pd === undefined || Number.isNaN(pd) || pd < 0) return NEUTRAL_HEX;
	const intPd = Math.min(Math.floor(pd), MAX_LUT_DEPTH);
	return CLINICAL_PROBING_DEPTH_HEX_LUT[intPd] ?? "#e11d48";
}

export function getFastClinicalProbingDepthTone(pd: number | null | undefined): HeatmapTone {
	if (pd === null || pd === undefined || Number.isNaN(pd) || pd < 0) return NEUTRAL_TONE;
	const intPd = Math.min(Math.floor(pd), MAX_LUT_DEPTH);
	return CLINICAL_PROBING_DEPTH_TONE_LUT[intPd] ?? "critical";
}

export function getFastProbingDepthRgba32(pd: number | null | undefined): number {
	if (pd === null || pd === undefined || Number.isNaN(pd) || pd < 0) return NEUTRAL_RGBA32;
	const intPd = Math.min(Math.floor(pd), MAX_LUT_DEPTH);
	return PROBING_DEPTH_RGBA32_LUT[intPd] ?? 0xff8571fb;
}

export const fastGetClinicalToneHex = getFastClinicalProbingDepthHex;
export const fastGetProbingDepthTone = getFastProbingDepthTone;
export const FAST_CLINICAL_HEX_LUT = CLINICAL_PROBING_DEPTH_HEX_LUT;
export const FAST_DEPTH_TONE_LUT = PROBING_DEPTH_TONE_LUT;



