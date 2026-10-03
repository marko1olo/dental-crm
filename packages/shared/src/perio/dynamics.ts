/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PERIODONTAL VISIT DYNAMICS & HEALING PROGRESS ENGINE ("БЫЛО / СТАЛО")
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Implements objective comparison between periodontal visits / snapshots:
 * - Changes in Full Mouth Bleeding Score (FMBS / BOP %)
 * - Changes in Plaque Score (FMPS %)
 * - Healing of deep pockets (PD >= 5 mm): resolved vs remaining
 * - Clinical Attachment Loss (CAL) progression / stabilization
 * - Standardized clinical summary for Form 043/u and patient motivation.
 */

import type { PerioChartSummary } from "./types.js";

export type PerioTrendStatus = "improved" | "stable" | "worsened" | "baseline";

export interface PerioDynamicsSummary {
	readonly hasComparison: boolean;
	readonly baselineDate: string | null;
	readonly currentDate: string | null;
	readonly bopDiffPercent: number;
	readonly plaqueDiffPercent: number;
	readonly meanPocketDepthDiffMm: number;
	readonly deepPocketsDiffCount: number;
	readonly overallTrend: PerioTrendStatus;
	readonly trendLabelRu: string;
	readonly summaryRu: string;
	readonly form043DynamicsTextRu: string;
}

/**
 * Calculates periodontal dynamics between current examination and previous baseline snapshot.
 */
export function calculatePerioDynamics(
	currentSummary: PerioChartSummary,
	baselineSummary?: PerioChartSummary | null,
	options?: {
		readonly baselineDate?: string | null;
		readonly currentDate?: string | null;
	},
): PerioDynamicsSummary {
	if (!baselineSummary) {
		return {
			hasComparison: false,
			baselineDate: null,
			currentDate: options?.currentDate ?? null,
			bopDiffPercent: 0,
			plaqueDiffPercent: 0,
			meanPocketDepthDiffMm: 0,
			deepPocketsDiffCount: 0,
			overallTrend: "baseline",
			trendLabelRu: "Первичный осмотр (исходная база)",
			summaryRu: "Исходное состояние пародонта зафиксировано как базовая линия.",
			form043DynamicsTextRu: "• Динамика: Первичный пародонтологический осмотр (базовая линия).",
		};
	}

	const bopDiff = Math.round((currentSummary.fmbsPercent - baselineSummary.fmbsPercent) * 10) / 10;
	const plaqueDiff = Math.round((currentSummary.fmpsPercent - baselineSummary.fmpsPercent) * 10) / 10;
	const depthDiff = Math.round((currentSummary.meanPocketDepthMm - baselineSummary.meanPocketDepthMm) * 10) / 10;
	const deepDiff = currentSummary.deepPocketsCount - baselineSummary.deepPocketsCount;

	let overallTrend: PerioTrendStatus = "stable";
	let trendLabelRu = "Стабильное состояние";

	if (bopDiff <= -5 || deepDiff < 0 || depthDiff <= -0.5) {
		overallTrend = "improved";
		trendLabelRu = "Положительная динамика (заживление)";
	} else if (bopDiff >= 10 || deepDiff > 0 || depthDiff >= 0.5) {
		overallTrend = "worsened";
		trendLabelRu = "Отрицательная динамика (прогрессирование воспаления)";
	} else {
		overallTrend = "stable";
		trendLabelRu = "Стабилизация процесса";
	}

	const parts: string[] = [];
	if (bopDiff !== 0) {
		const sign = bopDiff > 0 ? "+" : "";
		parts.push(`BOP ${sign}${bopDiff}% (${baselineSummary.fmbsPercent}% -> ${currentSummary.fmbsPercent}%)`);
	}
	if (deepDiff !== 0) {
		const sign = deepDiff > 0 ? "+" : "";
		parts.push(`Карманы ≥5мм: ${sign}${deepDiff} (${baselineSummary.deepPocketsCount} -> ${currentSummary.deepPocketsCount})`);
	}
	if (depthDiff !== 0) {
		const sign = depthDiff > 0 ? "+" : "";
		parts.push(`Средняя глубина: ${sign}${depthDiff} мм (${baselineSummary.meanPocketDepthMm} -> ${currentSummary.meanPocketDepthMm} мм)`);
	}
	if (plaqueDiff !== 0) {
		const sign = plaqueDiff > 0 ? "+" : "";
		parts.push(`Налет: ${sign}${plaqueDiff}%`);
	}

	const summaryRu = parts.length > 0
		? `${trendLabelRu}: ${parts.join("; ")}.`
		: "Показатели стабильны, значимых отклонений от предыдущего визита не выявлено.";

	const dateStr = options?.baselineDate ? ` от ${options.baselineDate}` : "";
	const form043DynamicsTextRu = [
		`• Динамика пародонта в сравнении с предыдущим осмотром${dateStr}:`,
		`  Статус: ${trendLabelRu}.`,
		`  ${summaryRu}`,
	].join("\n");

	return {
		hasComparison: true,
		baselineDate: options?.baselineDate ?? null,
		currentDate: options?.currentDate ?? null,
		bopDiffPercent: bopDiff,
		plaqueDiffPercent: plaqueDiff,
		meanPocketDepthDiffMm: depthDiff,
		deepPocketsDiffCount: deepDiff,
		overallTrend,
		trendLabelRu,
		summaryRu,
		form043DynamicsTextRu,
	};
}
